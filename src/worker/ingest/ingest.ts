// Daily ingestion pipeline, one run per dataset:
//   fetch EN+TC XML -> store raw in R2 -> parse & merge bilingual ->
//   fingerprint -> diff against previous keyset -> upsert D1 -> emit signals
//
// Signal semantics (deliberately conservative):
//   new_record           – first time this licence number appears in a snapshot
//   licence_changed      – fingerprint differs; field-level diff attached
//   no_longer_appearing  – in previous snapshot, absent now (NOT a confirmed closure)
//   expiring_soon        – state-based: expiry inside the 90-day window, deduped
//                          per (entity, expiry_date)
// The first-ever snapshot of a dataset is the baseline: records are stored,
// no new_record/licence_changed/no_longer_appearing signals are emitted.

import { SOURCES, SOURCE_IDS } from '../../shared/sources';
import type { FieldChange, SourceId } from '../../shared/types';
import type { SourceDef } from '../../shared/sources';
import { mergeBilingual, parseFile, type EntityRecord } from './parse';
import { fingerprintOf } from './fingerprint';
import { diffKeysets } from './diff';
import { addDaysISO, hktToday } from '../util/dates';

export interface SourceIngestResult {
  source: SourceId;
  record_count: number;
  added: number;
  changed: number;
  removed: number;
  new_record_signals: number;
  licence_changed_signals: number;
  no_longer_appearing_signals: number;
  expiring_soon_signals: number;
  baseline: boolean;
  generation_date: string | null;
  duplicates_in_source: number;
}

const UPsert_SQL = `
INSERT INTO entities (
  source, licno, name_en, name_tc, address_en, address_tc,
  lic_type_en, lic_type_tc, district_en, district_tc,
  info_en, info_tc, conditions, serno, expiry_date,
  status, fingerprint, first_seen_at, last_seen_at, last_seen_snapshot
) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, 'active', ?16, ?17, ?18, ?19)
ON CONFLICT(source, licno) DO UPDATE SET
  name_en = excluded.name_en,
  name_tc = excluded.name_tc,
  address_en = excluded.address_en,
  address_tc = excluded.address_tc,
  lic_type_en = excluded.lic_type_en,
  lic_type_tc = excluded.lic_type_tc,
  district_en = excluded.district_en,
  district_tc = excluded.district_tc,
  info_en = excluded.info_en,
  info_tc = excluded.info_tc,
  conditions = excluded.conditions,
  serno = excluded.serno,
  expiry_date = excluded.expiry_date,
  status = 'active',
  fingerprint = excluded.fingerprint,
  last_seen_at = excluded.last_seen_at,
  last_seen_snapshot = excluded.last_seen_snapshot
`;

const COMPARED_FIELDS = [
  'name_en',
  'name_tc',
  'address_en',
  'address_tc',
  'lic_type_en',
  'lic_type_tc',
  'district_en',
  'district_tc',
  'info_en',
  'info_tc',
  'conditions',
  'serno',
  'expiry_date'
] as const;

interface PriorRow extends Record<string, unknown> {
  id: number;
  licno: string;
  status: string;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'user-agent': 'HKFnBRadar/0.1 (licence-data ingestion; +https://hkfbradar.workers.dev)' },
    cf: { cacheTtl: 0, cacheEverything: false }
  });
  if (!res.ok) throw new Error(`fetch ${url} -> HTTP ${res.status}`);
  const text = await res.text();
  if (!text.includes('<DATA')) throw new Error(`fetch ${url}: payload does not look like a licence XML file`);
  return text;
}

async function chunked<T>(items: T[], size: number, fn: (chunk: T[]) => Promise<unknown>): Promise<void> {
  for (let i = 0; i < items.length; i += size) {
    await fn(items.slice(i, i + size));
  }
}

async function findPreviousKeyset(r2: R2Bucket, source: SourceId, today: string): Promise<{ key: string } | null> {
  const seen: string[] = [];
  let cursor: string | undefined;
  do {
    const list = await r2.list({ prefix: `snap/${source}/`, cursor });
    for (const obj of list.objects) seen.push(obj.key);
    cursor = list.truncated ? list.cursor : undefined;
  } while (cursor);

  const candidates = seen
    .map((key) => {
      const m = key.match(/^snap\/[^/]+\/(\d{4}-\d{2}-\d{2})\/keyset\.json$/);
      return m && m[1] !== today ? { key, date: m[1] } : null;
    })
    .filter((v): v is { key: string; date: string } => v !== null)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return candidates[0] ?? null;
}

function fieldChanges(prev: PriorRow | undefined, next: EntityRecord): FieldChange[] {
  if (!prev) return [];
  const out: FieldChange[] = [];
  for (const f of COMPARED_FIELDS) {
    const a = (prev[f] ?? null) as string | null;
    const b = (next[f] ?? null) as string | null;
    if (a !== b) out.push({ field: f, from: a, to: b });
  }
  return out;
}

export async function ingestAll(env: Env): Promise<SourceIngestResult[]> {
  const dateStamp = hktToday();
  const results: SourceIngestResult[] = [];
  for (const id of SOURCE_IDS) {
    results.push(await ingestSource(env, id, dateStamp));
  }
  return results;
}

export async function ingestSource(env: Env, source: SourceId, dateStamp: string): Promise<SourceIngestResult> {
  const def: SourceDef = SOURCES[source];
  const now = new Date().toISOString();

  // 1. Fetch both language files (also validates payload shape).
  const [enText, tcText] = await Promise.all([fetchText(def.files.en), fetchText(def.files.tc)]);

  // 2. Store raw bytes in R2 (immutable audit trail).
  await env.RAW.put(`raw/${source}/${dateStamp}/EN.xml`, enText);
  await env.RAW.put(`raw/${source}/${dateStamp}/TC.xml`, tcText);

  // 3. Parse and merge bilingual records.
  const enFile = parseFile(enText, source, 'en');
  const tcFile = parseFile(tcText, source, 'tc');
  const merged = mergeBilingual(source, enFile, tcFile);

  // 4. Fingerprint every record (keyed by licence number).
  const current: Record<string, string> = {};
  const recs = new Map<string, EntityRecord>();
  await chunked(merged.records, 4000, async (chunk) => {
    await Promise.all(
      chunk.map(async (r) => {
        current[r.licno] = await fingerprintOf(r);
        recs.set(r.licno, r);
      })
    );
  });

  // 5. Previous keyset from R2 (if any).
  const prevRef = await findPreviousKeyset(env.RAW, source, dateStamp);
  let previous: Record<string, string> = {};
  if (prevRef) {
    const obj = await env.RAW.get(prevRef.key);
    if (obj) previous = (await obj.json()) as Record<string, string>;
  }
  const isBaseline = !prevRef;

  // 6. Snapshot row (needs its id for signal bookkeeping).
  const snapRow = await env.DB.prepare(
    `INSERT INTO snapshots (source, generation_date, captured_at, r2_prefix, record_count, is_baseline)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6) RETURNING id`
  )
    .bind(source, merged.generation_date, now, `raw/${source}/${dateStamp}`, merged.records.length, isBaseline ? 1 : 0)
    .first<{ id: number }>();
  const snapshotId = snapRow!.id;

  const diff = diffKeysets(previous, current);

  // 7. Load prior rows for added + changed keys (diff details, seen_before).
  const lookupKeys = [...new Set([...diff.added, ...diff.changed])];
  const priorRows = new Map<string, PriorRow>();
  await chunked(lookupKeys, 80, async (chunk) => {
    const placeholders = chunk.map((_, i) => `?${i + 2}`).join(', ');
    const rows = await env.DB.prepare(
      `SELECT id, licno, name_en, name_tc, address_en, address_tc, lic_type_en, lic_type_tc,
              district_en, district_tc, info_en, info_tc, conditions, serno, expiry_date, status
       FROM entities WHERE source = ?1 AND licno IN (${placeholders})`
    )
      .bind(source, ...chunk)
      .all<PriorRow>();
    for (const r of rows.results) priorRows.set(r.licno, r);
  });

  // 8. Upsert added + changed records (only what moved).
  const upsertKeys = [...diff.added, ...diff.changed];
  const upsertStatements = upsertKeys.map((licno) => {
    const r = recs.get(licno)!;
    return env.DB.prepare(UPsert_SQL).bind(
      source,
      r.licno,
      r.name_en,
      r.name_tc,
      r.address_en,
      r.address_tc,
      r.lic_type_en,
      r.lic_type_tc,
      r.district_en,
      r.district_tc,
      r.info_en,
      r.info_tc,
      r.conditions,
      r.serno,
      r.expiry_date,
      current[r.licno],
      now,
      now,
      snapshotId
    );
  });
  await chunked(upsertStatements, 60, (chunk) => env.DB.batch(chunk));

  // 9. Mark absent records (in previous keyset, missing now).
  await chunked(diff.removed, 100, async (chunk) => {
    const placeholders = chunk.map((_, i) => `?${i + 3}`).join(', ');
    await env.DB.prepare(
      `UPDATE entities SET status = 'absent', last_seen_snapshot = ?1, last_seen_at = ?2
       WHERE source = ?3 AND licno IN (${placeholders})`
    )
      .bind(snapshotId, now, source, ...chunk)
      .run();
  });

  // 10. Signals.
  const signalRows: { licno: string; type: string; detail: unknown }[] = [];
  if (!isBaseline) {
    for (const licno of diff.added) {
      const prior = priorRows.get(licno);
      signalRows.push({
        licno,
        type: 'new_record',
        detail: { seen_before: prior?.status === 'absent' }
      });
    }
    for (const licno of diff.changed) {
      const changes = fieldChanges(priorRows.get(licno), recs.get(licno)!);
      if (changes.length === 0) continue; // fingerprint-only drift (e.g. normalisation)
      signalRows.push({ licno, type: 'licence_changed', detail: { changed: changes } });
    }
    for (const licno of diff.removed) {
      signalRows.push({ licno, type: 'no_longer_appearing', detail: null });
    }
  }

  // Resolve entity ids for signal rows (post-upsert), then batch-insert.
  let new_record_signals = 0;
  let licence_changed_signals = 0;
  let no_longer_appearing_signals = 0;
  if (signalRows.length > 0) {
    const keySet = [...new Set(signalRows.map((s) => s.licno))];
    const idMap = new Map<string, number>();
    await chunked(keySet, 80, async (chunk) => {
      const placeholders = chunk.map((_, i) => `?${i + 2}`).join(', ');
      const rows = await env.DB.prepare(`SELECT id, licno FROM entities WHERE source = ?1 AND licno IN (${placeholders})`)
        .bind(source, ...chunk)
        .all<{ id: number; licno: string }>();
      for (const r of rows.results) idMap.set(r.licno, r.id);
    });

    const inserts = signalRows
      .filter((s) => idMap.has(s.licno))
      .map((s) =>
        env.DB
          .prepare(
            `INSERT INTO signals (entity_id, source, type, snapshot_id, detected_at, detail_json, is_liquor)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
          )
          .bind(idMap.get(s.licno), source, s.type, snapshotId, now, JSON.stringify(s.detail), source === 'liquor' ? 1 : 0)
      );
    await chunked(inserts, 100, (chunk) => env.DB.batch(chunk));

    for (const s of signalRows) {
      if (s.type === 'new_record') new_record_signals++;
      else if (s.type === 'licence_changed') licence_changed_signals++;
      else if (s.type === 'no_longer_appearing') no_longer_appearing_signals++;
    }
  }

  // 11. Expiry watch signals (state-based, deduped per entity + expiry date).
  const today = dateStamp;
  const horizon = addDaysISO(today, 90);
  const expiryRes = await env.DB.prepare(
    `INSERT INTO signals (entity_id, source, type, snapshot_id, detected_at, detail_json, is_liquor)
     SELECT id, source, 'expiring_soon', ?1, ?2, json_object('expiry_date', expiry_date), CASE WHEN source = 'liquor' THEN 1 ELSE 0 END
     FROM entities
     WHERE source = ?3 AND status = 'active'
       AND expiry_date IS NOT NULL AND expiry_date >= ?4 AND expiry_date <= ?5
       AND NOT EXISTS (
         SELECT 1 FROM signals s
         WHERE s.entity_id = entities.id AND s.type = 'expiring_soon'
           AND json_extract(s.detail_json, '$.expiry_date') = entities.expiry_date
       )`
  )
    .bind(snapshotId, now, source, today, horizon)
    .run();
  const expiring_soon_signals = expiryRes.meta.changes ?? 0;

  // 12. Persist today's keyset for tomorrow's diff.
  await env.RAW.put(`snap/${source}/${dateStamp}/keyset.json`, JSON.stringify(current));

  return {
    source,
    record_count: merged.records.length,
    added: diff.added.length,
    changed: diff.changed.length,
    removed: diff.removed.length,
    new_record_signals,
    licence_changed_signals,
    no_longer_appearing_signals,
    expiring_soon_signals,
    baseline: isBaseline,
    generation_date: merged.generation_date,
    duplicates_in_source: merged.duplicates
  };
}
