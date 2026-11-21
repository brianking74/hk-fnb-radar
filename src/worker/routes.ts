// Public API for HK F&B RADAR. All entitlement limits are enforced here,
// server-side, from the resolved subscription tier (FREE in Release 1).

import { Hono } from 'hono';
import type {
  EntitiesResponse,
  EntityDetailResponse,
  Entity,
  EntityAttribute,
  ContactRecord,
  CuisineFacet,
  ExpiryItem,
  FieldChange,
  MetaResponse,
  Paginated,
  SignalDetail,
  SignalListItem,
  SignalsResponse,
  SignalType,
  SnapshotInfo,
  SourceId,
  WineSpiritsStats
} from '../shared/types';
import { SOURCES, SOURCE_IDS, isSourceId } from '../shared/sources';
import { resolveTier } from './entitlements';
import { searchPlacesForEntity } from './enrich/places';
import { addDaysISO, daysBetween, hktToday } from './util/dates';
import { ingestAll } from './ingest/ingest';

const ENTITY_COLS =
  'id, source, licno, name_en, name_tc, address_en, address_tc, lic_type_en, lic_type_tc, ' +
  'district_en, district_tc, info_en, info_tc, conditions, serno, expiry_date, status, first_seen_at, last_seen_at';

const ENTITY_SUMMARY_COLS = 'id, source, licno, name_en, name_tc, district_en, district_tc, lic_type_en, expiry_date, status';

const SIGNAL_TYPES: SignalType[] = ['new_record', 'licence_changed', 'expiring_soon', 'no_longer_appearing'];

const apiApp = new Hono<{ Bindings: Env }>();

apiApp.use('*', async (c, next) => {
  await next();
  c.res.headers.set('X-Content-Type-Options', 'nosniff');
  c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
});

apiApp.onError((err, c) => {
  console.error('[api]', err instanceof Error ? err.stack : String(err));
  return c.json({ error: 'internal_error' }, 500);
});

apiApp.notFound((c) => c.json({ error: 'not_found' }, 404));

apiApp.get('/health', (c) => c.json({ ok: true, time: new Date().toISOString() }));

// ---------------------------------------------------------------- helpers

function escapeLike(q: string): string {
  return q.replace(/[\\%_]/g, (m) => `\\${m}`);
}

function intParam(c: { req: { query(name: string): string | undefined } }, name: string, def: number): number {
  const raw = c.req.query(name);
  const n = raw === undefined ? NaN : Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 ? n : def;
}

interface EntityRow extends Record<string, unknown> {
  id: number;
  source: SourceId;
  licno: string;
  name_en: string | null;
  name_tc: string | null;
  address_en: string | null;
  address_tc: string | null;
  lic_type_en: string | null;
  lic_type_tc: string | null;
  district_en: string | null;
  district_tc: string | null;
  info_en: string | null;
  info_tc: string | null;
  conditions: string | null;
  serno: string | null;
  expiry_date: string | null;
  status: string;
  first_seen_at: string;
  last_seen_at: string;
}

function entityFromRow(r: EntityRow): Entity {
  return {
    id: r.id,
    source: r.source,
    licno: r.licno,
    name_en: r.name_en,
    name_tc: r.name_tc,
    address_en: r.address_en,
    address_tc: r.address_tc,
    lic_type_en: r.lic_type_en,
    lic_type_tc: r.lic_type_tc,
    district_en: r.district_en,
    district_tc: r.district_tc,
    info_en: r.info_en,
    info_tc: r.info_tc,
    conditions: r.conditions,
    serno: r.serno,
    expiry_date: r.expiry_date,
    status: r.status === 'absent' ? 'absent' : 'active',
    first_seen_at: r.first_seen_at,
    last_seen_at: r.last_seen_at
  };
}

function detailFromRow(v: unknown): SignalDetail | null {
  if (typeof v !== 'string' || v === '') return null;
  try {
    return JSON.parse(v) as SignalDetail;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------- meta

apiApp.get('/meta', async (c) => {
  const { DB, PLATFORM_LAUNCHED_AT } = c.env;

  const [totalsRows, signalRows, snapRows, maxCap] = await Promise.all([
    DB.prepare(
      `SELECT source, COUNT(*) AS n FROM entities WHERE status = 'active' GROUP BY source`
    ).all<{ source: SourceId; n: number }>(),
    DB.prepare(
      `SELECT type, COUNT(*) AS n FROM signals WHERE detected_at >= ? GROUP BY type`
    )
      .bind(new Date(Date.now() - 7 * 86_400_000).toISOString())
      .all<{ type: SignalType; n: number }>(),
    DB.prepare(
      `SELECT s.source, s.generation_date, s.captured_at, s.record_count, s.is_baseline
       FROM snapshots s
       JOIN (SELECT source, MAX(id) AS id FROM snapshots GROUP BY source) latest ON latest.id = s.id
       ORDER BY s.source`
    ).all<{ source: SourceId; generation_date: string | null; captured_at: string; record_count: number; is_baseline: number }>(),
    DB.prepare(`SELECT MAX(captured_at) AS t FROM snapshots`).first<{ t: string | null }>()
  ]);

  const totals: MetaResponse['totals'] = { restaurants: 0, liquor: 0, other_food: 0, all: 0 };
  for (const row of totalsRows.results) {
    if (row.source in totals) totals[row.source] = row.n;
  }
  totals.all = totals.restaurants + totals.liquor + totals.other_food;

  const signals_last7d: MetaResponse['signals_last7d'] = {
    new_record: 0,
    licence_changed: 0,
    expiring_soon: 0,
    no_longer_appearing: 0
  };
  for (const row of signalRows.results) {
    if (row.type in signals_last7d) signals_last7d[row.type] = row.n;
  }

  const snapshots: SnapshotInfo[] = snapRows.results.map((r) => ({
    source: r.source,
    generation_date: r.generation_date,
    captured_at: r.captured_at,
    record_count: r.record_count,
    is_baseline: r.is_baseline === 1
  }));

  const body: MetaResponse = {
    totals,
    signals_last7d,
    snapshots,
    platform: { launched_at: PLATFORM_LAUNCHED_AT, data_updated_at: maxCap?.t ?? null }
  };
  return c.json(body);
});

// --------------------------------------------------------------- entities

apiApp.get('/entities', async (c) => {
  const { DB } = c.env;
  const q = (c.req.query('q') ?? '').trim();
  const source = c.req.query('source');
  const district = (c.req.query('district') ?? '').trim();
  const licType = (c.req.query('lic_type') ?? '').trim();
  const cuisine = (c.req.query('cuisine') ?? '').trim();
  const includeAbsent = c.req.query('include_absent') === '1';
  const page = intParam(c, 'page', 1);
  const pageSize = Math.min(50, Math.max(1, intParam(c, 'page_size', 25)));

  const where: string[] = [];
  const params: unknown[] = [];
  const bind = (value: unknown): string => `?${params.push(value)}`;
  if (!includeAbsent) where.push(`status = 'active'`);
  if (isSourceId(source)) {
    where.push(`source = ${bind(source)}`);
  }
  if (district) {
    where.push(`district_en = ${bind(district)}`);
  }
  if (licType) {
    where.push(`lic_type_en = ${bind(licType)}`);
  }
  if (cuisine && (await enrichmentReady(DB))) {
    const p = bind(cuisine);
    where.push(
      `EXISTS (SELECT 1 FROM entity_attributes ea WHERE ea.entity_id = entities.id AND ea.kind = 'cuisine' AND ea.value = ${p})`
    );
  }
  if (q) {
    const like = `%${escapeLike(q)}%`;
    const p = bind(like); // single value reused by all four columns
    where.push(
      `(name_en LIKE ${p} ESCAPE '\\' OR name_tc LIKE ${p} ESCAPE '\\' OR address_en LIKE ${p} ESCAPE '\\' OR address_tc LIKE ${p} ESCAPE '\\')`
    );
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [totalRow, listRows, districtRows] = await Promise.all([
    DB.prepare(`SELECT COUNT(*) AS n FROM entities ${whereSql}`)
      .bind(...params)
      .first<{ n: number }>(),
    DB.prepare(
      `SELECT ${ENTITY_COLS} FROM entities ${whereSql}
       ORDER BY name_en COLLATE NOCASE LIMIT ? OFFSET ?`
    )
      .bind(...params, pageSize, (page - 1) * pageSize)
      .all<EntityRow>(),
    DB.prepare(
      `SELECT district_en AS en, MAX(district_tc) AS tc, COUNT(*) AS count
       FROM entities
       WHERE status = 'active' AND district_en IS NOT NULL ${isSourceId(source) ? 'AND source = ?1' : ''}
       GROUP BY district_en ORDER BY COUNT(*) DESC, district_en`
    )
      .bind(...(isSourceId(source) ? [source] : []))
      .all<{ en: string; tc: string | null; count: number }>()
  ]);

  const body: EntitiesResponse = {
    total: totalRow?.n ?? 0,
    page,
    page_size: pageSize,
    items: listRows.results.map(entityFromRow),
    districts: districtRows.results
  };
  return c.json(body);
});

apiApp.get('/entities/:id', async (c) => {
  const { DB } = c.env;
  const { limits } = await resolveTier(c.env);
  const id = Number.parseInt(c.req.param('id'), 10);
  if (!Number.isFinite(id)) return c.json({ error: 'invalid_id' }, 400);

  const row = await DB.prepare(`SELECT ${ENTITY_COLS} FROM entities WHERE id = ?1`)
    .bind(id)
    .first<EntityRow>();
  if (!row) return c.json({ error: 'not_found' }, 404);

  const signalRows = await DB.prepare(
    `SELECT s.id, s.entity_id, s.source, s.type, s.detected_at, s.detail_json
     FROM signals s WHERE s.entity_id = ?1 ORDER BY s.detected_at DESC, s.id DESC LIMIT 50`
  )
    .bind(id)
    .all<{ id: number; entity_id: number; source: SourceId; type: SignalType; detected_at: string; detail_json: string | null }>();

  // Enrichment (cuisine + contacts) is a PROFESSIONAL/BUSINESS entitlement,
  // enforced here server-side: the data is simply not sent to free tiers.
  const entitled = limits.view_enrichment && (await enrichmentReady(DB));
  let contacts: ContactRecord[] = [];
  let attributes: EntityAttribute[] = [];
  if (entitled) {
    const [contactRes, attributeRes] = await Promise.all([
      DB.prepare(
        `SELECT kind, value, source_name, source_url, retrieved_at FROM entity_contacts WHERE entity_id = ?1 ORDER BY kind, value`
      )
        .bind(id)
        .all<ContactRecord>(),
      DB.prepare(
        `SELECT kind, value, source_name, source_url, retrieved_at FROM entity_attributes WHERE entity_id = ?1 ORDER BY kind, value`
      )
        .bind(id)
        .all<EntityAttribute>()
    ]);
    contacts = contactRes.results;
    attributes = attributeRes.results;
  }

  const def = SOURCES[row.source];
  const body: EntityDetailResponse = {
    entity: entityFromRow(row),
    signals: signalRows.results.map((s) => ({
      id: s.id,
      entity_id: s.entity_id,
      source: s.source,
      type: s.type,
      detected_at: s.detected_at,
      detail: detailFromRow(s.detail_json),
      entity: {
        id: row.id,
        source: row.source,
        licno: row.licno,
        name_en: row.name_en,
        name_tc: row.name_tc,
        district_en: row.district_en,
        district_tc: row.district_tc,
        lic_type_en: row.lic_type_en,
        expiry_date: row.expiry_date,
        status: row.status === 'absent' ? 'absent' : 'active'
      }
    })),
    contacts,
    attributes,
    enrichment_entitled: entitled,
    attribution: [
      {
        dataset: def.label_en,
        provider: def.provider,
        dataset_url: def.dataset_url,
        file: def.files.en,
        licence_note: def.licence_note
      }
    ]
  };
  return c.json(body);
});

// ---------------------------------------------------------------- signals

apiApp.get('/signals', async (c) => {
  return listSignals(c, null);
});

// ------------------------------------------------------------ wine & spirits

apiApp.get('/wine-spirits/stats', async (c) => {
  const { DB } = c.env;
  const { limits } = await resolveTier(c.env);
  const today = hktToday();
  const horizon = addDaysISO(today, limits.expiry_window_days);

  const [totals, clubCount, expiring] = await Promise.all([
    DB.prepare(`SELECT COUNT(*) AS n FROM entities WHERE source = 'liquor' AND status = 'active'`).first<{ n: number }>(),
    DB.prepare(
      `SELECT COUNT(*) AS n FROM entities WHERE source = 'liquor' AND status = 'active' AND lic_type_en = 'Club Liquor Licence'`
    ).first<{ n: number }>(),
    DB.prepare(
      `SELECT COUNT(*) AS n FROM entities
       WHERE source = 'liquor' AND status = 'active'
         AND expiry_date IS NOT NULL AND expiry_date >= ?1 AND expiry_date <= ?2`
    )
      .bind(today, horizon)
      .first<{ n: number }>()
  ]);

  const total = totals?.n ?? 0;
  const body: WineSpiritsStats = {
    total_liquor: total,
    club_licences: clubCount?.n ?? 0,
    liquor_licences: total - (clubCount?.n ?? 0),
    expiring_in_window: expiring?.n ?? 0,
    window_days: limits.expiry_window_days
  };
  return c.json(body);
});

apiApp.get('/wine-spirits/signals', async (c) => {
  return listSignals(c, 'liquor');
});

apiApp.get('/wine-spirits/expiry', async (c) => {
  const { DB } = c.env;
  const { limits } = await resolveTier(c.env);
  const today = hktToday();
  const requested = Number.parseInt(c.req.query('window') ?? '', 10);
  const windowDays = Number.isFinite(requested) && requested >= 1 ? Math.min(requested, limits.expiry_window_days) : limits.expiry_window_days;
  const horizon = addDaysISO(today, windowDays);
  const district = (c.req.query('district') ?? '').trim();
  const page = intParam(c, 'page', 1);
  const pageSize = Math.min(limits.max_page_size, Math.max(1, intParam(c, 'page_size', 25)));

  const where: string[] = [
    `source = 'liquor'`,
    `status = 'active'`,
    `expiry_date IS NOT NULL`,
    `expiry_date >= ?1`,
    `expiry_date <= ?2`
  ];
  const params: unknown[] = [today, horizon];
  if (district) {
    where.push('district_en = ?3');
    params.push(district);
  }

  const [totalRow, rows] = await Promise.all([
    DB.prepare(`SELECT COUNT(*) AS n FROM entities WHERE ${where.join(' AND ')}`)
      .bind(...params)
      .first<{ n: number }>(),
    DB.prepare(
      `SELECT ${ENTITY_COLS} FROM entities WHERE ${where.join(' AND ')} ORDER BY expiry_date, name_en COLLATE NOCASE LIMIT ? OFFSET ?`
    )
      .bind(...params, pageSize, (page - 1) * pageSize)
      .all<EntityRow>()
  ]);

  const items: ExpiryItem[] = rows.results.map((r) => ({
    ...entityFromRow(r),
    days_left: r.expiry_date ? daysBetween(today, r.expiry_date) : 0
  }));

  const body: Paginated<ExpiryItem> = {
    total: totalRow?.n ?? 0,
    page,
    page_size: pageSize,
    items
  };
  return c.json(body);
});

apiApp.get('/wine-spirits/directory', async (c) => {
  const { DB } = c.env;
  const q = (c.req.query('q') ?? '').trim();
  const district = (c.req.query('district') ?? '').trim();
  const licType = (c.req.query('lic_type') ?? '').trim();
  const page = intParam(c, 'page', 1);
  const pageSize = Math.min(50, Math.max(1, intParam(c, 'page_size', 25)));

  const where: string[] = [`source = 'liquor'`, `status = 'active'`];
  const params: unknown[] = [];
  if (district) {
    where.push(`district_en = ?${params.length + 1}`);
    params.push(district);
  }
  if (licType) {
    where.push(`lic_type_en = ?${params.length + 1}`);
    params.push(licType);
  }
  if (q) {
    const p = `?${params.length + 1}`;
    where.push(
      `(name_en LIKE ${p} ESCAPE '\\' OR name_tc LIKE ${p} ESCAPE '\\' OR address_en LIKE ${p} ESCAPE '\\' OR address_tc LIKE ${p} ESCAPE '\\')`
    );
    params.push(`%${escapeLike(q)}%`);
  }

  const [totalRow, rows] = await Promise.all([
    DB.prepare(`SELECT COUNT(*) AS n FROM entities WHERE ${where.join(' AND ')}`)
      .bind(...params)
      .first<{ n: number }>(),
    DB.prepare(
      `SELECT ${ENTITY_COLS} FROM entities WHERE ${where.join(' AND ')} ORDER BY name_en COLLATE NOCASE LIMIT ? OFFSET ?`
    )
      .bind(...params, pageSize, (page - 1) * pageSize)
      .all<EntityRow>()
  ]);

  const body: Paginated<Entity> = {
    total: totalRow?.n ?? 0,
    page,
    page_size: pageSize,
    items: rows.results.map(entityFromRow)
  };
  return c.json(body);
});

// ------------------------------------------------------------------ admin
// Ops endpoints, gated by the INGEST_SECRET header: trigger/verify
// ingestion, and inspect/repair snapshot keysets (also used to rehearse
// drift scenarios against a controlled keyset before real drift arrives).

function ingestAuthorized(env: Env, headerValue: string | undefined): boolean {
  return !!env.INGEST_SECRET && headerValue === env.INGEST_SECRET;
}

apiApp.get('/admin/keyset', async (c) => {
  if (!ingestAuthorized(c.env, c.req.header('x-ingest-secret'))) return c.json({ error: 'unauthorized' }, 401);
  const source = c.req.query('source');
  if (!isSourceId(source)) return c.json({ error: 'invalid_source' }, 400);

  let key: string;
  const date = c.req.query('date');
  if (date) {
    key = `snap/${source}/${date}/keyset.json`;
    if (!(await c.env.RAW.head(key))) return c.json({ error: 'not_found' }, 404);
  } else {
    const list = await c.env.RAW.list({ prefix: `snap/${source}/` });
    const keys = list.objects.map((o) => o.key).filter((k) => k.endsWith('/keyset.json')).sort();
    const newest = keys[keys.length - 1];
    if (!newest) return c.json({ error: 'not_found' }, 404);
    key = newest;
  }
  const obj = await c.env.RAW.get(key);
  if (!obj) return c.json({ error: 'not_found' }, 404);
  const data = await obj.json<Record<string, string>>();
  return c.json({ key, count: Object.keys(data).length, data });
});

apiApp.put('/admin/keyset', async (c) => {
  if (!ingestAuthorized(c.env, c.req.header('x-ingest-secret'))) return c.json({ error: 'unauthorized' }, 401);
  const body = await c.req
    .json<{ source?: string; date?: string; data?: Record<string, string> }>()
    .catch(() => null);
  if (!body || !isSourceId(body.source) || !body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return c.json({ error: 'bad_request' }, 400);
  }
  if (!body.data || typeof body.data !== 'object') return c.json({ error: 'bad_request' }, 400);
  const key = `snap/${body.source}/${body.date}/keyset.json`;
  await c.env.RAW.put(key, JSON.stringify(body.data));
  return c.json({ ok: true, key, count: Object.keys(body.data).length });
});

apiApp.delete('/admin/keyset', async (c) => {
  if (!ingestAuthorized(c.env, c.req.header('x-ingest-secret'))) return c.json({ error: 'unauthorized' }, 401);
  const source = c.req.query('source');
  const date = c.req.query('date');
  if (!isSourceId(source) || !date) return c.json({ error: 'bad_request' }, 400);
  await c.env.RAW.delete(`snap/${source}/${date}/keyset.json`);
  return c.json({ ok: true, deleted: `snap/${source}/${date}/keyset.json` });
});

// The enrichment tables may lag the deployed code (migration applied after
// deploy, or free-tier D1 quota exhausted). Degrade to empty rather than 500.
async function enrichmentReady(db: D1Database): Promise<boolean> {
  try {
    const row = await db
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'entity_attributes'`)
      .first<{ name: string }>();
    return !!row;
  } catch {
    return false;
  }
}

// Enrichment facets: distinct cuisine values across active entities.
apiApp.get('/attributes/cuisines', async (c) => {
  if (!(await enrichmentReady(c.env.DB))) return c.json({ cuisines: [] } satisfies { cuisines: CuisineFacet[] });
  const rows = await c.env.DB.prepare(
    `SELECT a.value AS value, COUNT(*) AS count
     FROM entity_attributes a JOIN entities e ON e.id = a.entity_id
     WHERE a.kind = 'cuisine' AND e.status = 'active'
     GROUP BY a.value ORDER BY COUNT(*) DESC, a.value LIMIT 60`
  ).all<CuisineFacet>();
  return c.json({ cuisines: rows.results } satisfies { cuisines: CuisineFacet[] });
});

// Admin: ingest verified enrichment. Every item must carry source attribution;
// items without an attributable, existing licence are rejected, never guessed.
interface AttributeInput {
  source?: string;
  licno?: string;
  kind?: string;
  value?: string;
  source_name?: string;
  source_url?: string | null;
  retrieved_at?: string;
}

async function resolveEntityIds(
  db: D1Database,
  groups: Map<SourceId, string[]>
): Promise<Map<string, number>> {
  const idByLic = new Map<string, number>();
  for (const [source, licnos] of groups) {
    const unique = [...new Set(licnos)];
    for (let i = 0; i < unique.length; i += 80) {
      const chunk = unique.slice(i, i + 80);
      const placeholders = chunk.map((_, j) => `?${j + 2}`).join(', ');
      const res = await db
        .prepare(`SELECT id, licno FROM entities WHERE source = ?1 AND licno IN (${placeholders})`)
        .bind(source, ...chunk)
        .all<{ id: number; licno: string }>();
      for (const r of res.results) idByLic.set(`${source}:${r.licno}`, r.id);
    }
  }
  return idByLic;
}

apiApp.post('/admin/attributes', async (c) => {
  if (!ingestAuthorized(c.env, c.req.header('x-ingest-secret'))) return c.json({ error: 'unauthorized' }, 401);
  if (!(await enrichmentReady(c.env.DB))) return c.json({ error: 'enrichment_not_migrated' }, 503);
  const body = await c.req.json<{ items?: AttributeInput[] }>().catch(() => null);
  const items = Array.isArray(body?.items) ? body!.items : [];
  if (items.length === 0 || items.length > 500) return c.json({ error: 'items must number 1..500' }, 400);

  const valid: { source: SourceId; licno: string; kind: EntityAttribute['kind']; value: string; source_name: string; source_url: string | null; retrieved_at: string }[] = [];
  const rejected: number[] = [];
  items.forEach((it, i) => {
    const kind = it?.kind;
    if (
      !isSourceId(it?.source) ||
      !it?.licno?.trim() ||
      (kind !== 'cuisine' && kind !== 'category' && kind !== 'other') ||
      !it?.value?.trim() ||
      !it?.source_name?.trim()
    ) {
      rejected.push(i);
      return;
    }
    valid.push({
      source: it.source!,
      licno: it.licno!.trim(),
      kind,
      value: it.value!.trim(),
      source_name: it.source_name!.trim(),
      source_url: it.source_url ?? null,
      retrieved_at: it.retrieved_at ?? new Date().toISOString()
    });
  });

  const groups = new Map<SourceId, string[]>();
  for (const v of valid) {
    const list = groups.get(v.source) ?? [];
    list.push(v.licno);
    groups.set(v.source, list);
  }
  const idByLic = await resolveEntityIds(c.env.DB, groups);

  const matched = valid.filter((v) => idByLic.has(`${v.source}:${v.licno}`));
  const statements = matched.map((v) =>
    c.env.DB
      .prepare(
        `INSERT OR IGNORE INTO entity_attributes (entity_id, kind, value, source_name, source_url, retrieved_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
      )
      .bind(idByLic.get(`${v.source}:${v.licno}`), v.kind, v.value, v.source_name, v.source_url, v.retrieved_at)
  );
  let inserted = 0;
  for (let i = 0; i < statements.length; i += 100) {
    const results = await c.env.DB.batch(statements.slice(i, i + 100));
    for (const r of results) inserted += r.meta?.changes ?? 0;
  }

  return c.json({
    ok: true,
    received: items.length,
    valid: valid.length,
    inserted,
    duplicates_ignored: matched.length - inserted,
    unmatched_licno: valid.length - matched.length,
    rejected
  });
});

// Admin: ingest verified contact records (website / phone / social) with attribution.
apiApp.post('/admin/contacts', async (c) => {
  if (!ingestAuthorized(c.env, c.req.header('x-ingest-secret'))) return c.json({ error: 'unauthorized' }, 401);
  const body = await c.req.json<{ items?: AttributeInput[] }>().catch(() => null);
  const items = Array.isArray(body?.items) ? body!.items : [];
  if (items.length === 0 || items.length > 500) return c.json({ error: 'items must number 1..500' }, 400);

  const valid: { source: SourceId; licno: string; kind: ContactRecord['kind']; value: string; source_name: string; source_url: string | null; retrieved_at: string }[] = [];
  const rejected: number[] = [];
  items.forEach((it, i) => {
    const kind = it?.kind;
    if (
      !isSourceId(it?.source) ||
      !it?.licno?.trim() ||
      (kind !== 'website' && kind !== 'phone' && kind !== 'social') ||
      !it?.value?.trim() ||
      !it?.source_name?.trim()
    ) {
      rejected.push(i);
      return;
    }
    valid.push({
      source: it.source!,
      licno: it.licno!.trim(),
      kind,
      value: it.value!.trim(),
      source_name: it.source_name!.trim(),
      source_url: it.source_url ?? null,
      retrieved_at: it.retrieved_at ?? new Date().toISOString()
    });
  });

  const groups = new Map<SourceId, string[]>();
  for (const v of valid) {
    const list = groups.get(v.source) ?? [];
    list.push(v.licno);
    groups.set(v.source, list);
  }
  const idByLic = await resolveEntityIds(c.env.DB, groups);

  const matched = valid.filter((v) => idByLic.has(`${v.source}:${v.licno}`));
  const statements = matched.map((v) =>
    c.env.DB
      .prepare(
        `INSERT OR IGNORE INTO entity_contacts (entity_id, kind, value, source_name, source_url, retrieved_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
      )
      .bind(idByLic.get(`${v.source}:${v.licno}`), v.kind, v.value, v.source_name, v.source_url, v.retrieved_at)
  );
  let inserted = 0;
  for (let i = 0; i < statements.length; i += 100) {
    const results = await c.env.DB.batch(statements.slice(i, i + 100));
    for (const r of results) inserted += r.meta?.changes ?? 0;
  }

  return c.json({
    ok: true,
    received: items.length,
    valid: valid.length,
    inserted,
    duplicates_ignored: matched.length - inserted,
    unmatched_licno: valid.length - matched.length,
    rejected
  });
});

// Admin: Google Places (New) enrichment, in resumable batches. Each call
// processes up to `limit` (max 25 — subrequest budget) entities of one source
// that have no Google Places enrichment yet, matches conservatively, and
// stores cuisine + website/phone contacts with full attribution. A processed
// marker attribute prevents re-querying records that produced no cuisine.
apiApp.post('/admin/enrich-places', async (c) => {
  if (!ingestAuthorized(c.env, c.req.header('x-ingest-secret'))) return c.json({ error: 'unauthorized' }, 401);
  if (!(await enrichmentReady(c.env.DB))) return c.json({ error: 'enrichment_not_migrated' }, 503);
  const apiKey = c.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return c.json({ error: 'places_key_not_configured' }, 503);

  const body = await c.req
    .json<{ source?: string; limit?: number; dry_run?: boolean }>()
    .catch(() => null);
  const source = isSourceId(body?.source) ? body.source : 'restaurants';
  const limit = Math.min(25, Math.max(1, Number.parseInt(String(body?.limit ?? 20), 10) || 20));
  const dryRun = body?.dry_run === true;

  const rows = await c.env.DB.prepare(
    `SELECT ${ENTITY_COLS.replace(/\b(\w+)\b/g, 'e.$1')} FROM entities e
     WHERE e.source = ?1 AND e.status = 'active'
       AND NOT EXISTS (
         SELECT 1 FROM entity_attributes a
         WHERE a.entity_id = e.id AND a.source_name = 'Google Places'
       )
     ORDER BY e.id LIMIT ?2`
  )
    .bind(source, limit)
    .all<EntityRow>();

  const results: Record<string, unknown>[] = [];
  let enriched = 0;
  let no_match = 0;
  let errors = 0;
  let googleCalls = 0;
  const CALL_CEILING = limit; // hard ceiling: at most `limit` Google calls per invocation

  for (const row of rows.results) {
    if (googleCalls >= CALL_CEILING) {
      results.push({ licno: row.licno, status: 'skipped_call_ceiling' });
      continue;
    }
    try {
      googleCalls++;
      const match = await searchPlacesForEntity(apiKey, entityFromRow(row));
      if (!match) {
        results.push({ licno: row.licno, status: 'no_match' });
        no_match++;
        continue;
      }
      if (dryRun) {
        results.push({
          licno: row.licno,
          status: 'matched_dry_run',
          cuisine: match.cuisine,
          matched_name: match.matchedName,
          address: match.address
        });
        continue;
      }
      const statements = [];
      if (match.cuisine) {
        statements.push(
          c.env.DB
            .prepare(
              `INSERT OR IGNORE INTO entity_attributes (entity_id, kind, value, source_name, source_url, retrieved_at)
               VALUES (?1, 'cuisine', ?2, 'Google Places', ?3, ?4)`
            )
            .bind(row.id, match.cuisine, match.mapsUri, new Date().toISOString())
        );
      }
      for (const contact of [
        match.website ? ({ kind: 'website' as const, value: match.website }) : null,
        match.phone ? ({ kind: 'phone' as const, value: match.phone }) : null
      ]) {
        if (!contact) continue;
        statements.push(
          c.env.DB
            .prepare(
              `INSERT OR IGNORE INTO entity_contacts (entity_id, kind, value, source_name, source_url, retrieved_at)
               VALUES (?1, ?2, ?3, 'Google Places', ?4, ?5)`
            )
            .bind(row.id, contact.kind, contact.value, match.mapsUri, new Date().toISOString())
        );
      }
      // Processed marker: prevents this entity being re-queried even when
      // Google returned no usable cuisine.
      statements.push(
        c.env.DB
          .prepare(
            `INSERT OR IGNORE INTO entity_attributes (entity_id, kind, value, source_name, source_url, retrieved_at)
             VALUES (?1, 'other', ?2, 'Google Places', ?3, ?4)`
          )
          .bind(row.id, `places_checked:${match.matchedName}`, match.mapsUri, new Date().toISOString())
      );
      if (statements.length > 0) await c.env.DB.batch(statements);
      enriched++;
      results.push({
        licno: row.licno,
        status: 'enriched',
        cuisine: match.cuisine,
        matched_name: match.matchedName,
        contacts_added: statements.length - (match.cuisine ? 1 : 0) - 1
      });
    } catch (err) {
      errors++;
      results.push({
        licno: row.licno,
        status: 'error',
        error: err instanceof Error ? err.message.slice(0, 160) : String(err).slice(0, 160)
      });
    }
  }

  const remainingRow = await c.env.DB.prepare(
    `SELECT COUNT(*) AS n FROM entities e
     WHERE e.source = ?1 AND e.status = 'active'
       AND NOT EXISTS (
         SELECT 1 FROM entity_attributes a
         WHERE a.entity_id = e.id AND a.source_name = 'Google Places'
       )`
  )
    .bind(source)
    .first<{ n: number }>();

  return c.json({
    ok: true,
    source,
    processed: rows.results.length,
    google_calls: googleCalls,
    call_ceiling: CALL_CEILING,
    enriched,
    no_match,
    errors,
    dry_run: dryRun,
    remaining: remainingRow?.n ?? 0,
    results
  });
});

apiApp.post('/admin/ingest', async (c) => {
  const secret = c.env.INGEST_SECRET;
  if (!secret) return c.json({ error: 'ingest_secret_not_configured' }, 503);
  if (c.req.header('x-ingest-secret') !== secret) return c.json({ error: 'unauthorized' }, 401);
  const results = await ingestAll(c.env);
  return c.json({ ok: true, results });
});

// -------------------------------------------------- shared signal listing

async function listSignals(
  c: { env: Env; req: { query(name: string): string | undefined }; json: (body: SignalsResponse, status?: number) => Response },
  forcedSource: SourceId | null
): Promise<Response> {
  const { DB } = c.env;
  const { limits } = await resolveTier(c.env);

  const typeParam = c.req.query('type');
  const sourceParam = forcedSource ?? c.req.query('source');
  const district = (c.req.query('district') ?? '').trim();
  const page = intParam(c, 'page', 1);
  const pageSize = Math.min(limits.max_page_size, Math.max(1, intParam(c, 'page_size', 25)));

  const since = new Date(Date.now() - limits.signals_lookback_days * 86_400_000).toISOString();

  const where: string[] = ['s.detected_at >= ?1'];
  const params: unknown[] = [since];
  let p = 2;
  if (typeParam && (SIGNAL_TYPES as string[]).includes(typeParam)) {
    where.push(`s.type = ?${p++}`);
    params.push(typeParam);
  }
  if (isSourceId(sourceParam)) {
    where.push(`s.source = ?${p++}`);
    params.push(sourceParam);
  }
  if (district) {
    where.push(`e.district_en = ?${p++}`);
    params.push(district);
  }

  const [totalRow, rows] = await Promise.all([
    DB.prepare(`SELECT COUNT(*) AS n FROM signals s JOIN entities e ON e.id = s.entity_id WHERE ${where.join(' AND ')}`)
      .bind(...params)
      .first<{ n: number }>(),
    DB.prepare(
      `SELECT s.id AS sig_id, s.entity_id, s.source, s.type, s.detected_at, s.detail_json, ${ENTITY_SUMMARY_COLS
        .split(', ')
        .map((col) => `e.${col} AS e_${col}`)
        .join(', ')}
       FROM signals s JOIN entities e ON e.id = s.entity_id
       WHERE ${where.join(' AND ')}
       ORDER BY s.detected_at DESC, s.id DESC LIMIT ? OFFSET ?`
    )
      .bind(...params, pageSize, (page - 1) * pageSize)
      .all<Record<string, unknown>>()
  ]);

  const items: SignalListItem[] = rows.results.map((r) => ({
    id: r['sig_id'] as number,
    entity_id: r['entity_id'] as number,
    source: r['source'] as SourceId,
    type: r['type'] as SignalType,
    detected_at: r['detected_at'] as string,
    detail: detailFromRow(r['detail_json']),
    entity: {
      id: r['e_id'] as number,
      source: r['e_source'] as SourceId,
      licno: r['e_licno'] as string,
      name_en: (r['e_name_en'] as string | null) ?? null,
      name_tc: (r['e_name_tc'] as string | null) ?? null,
      district_en: (r['e_district_en'] as string | null) ?? null,
      district_tc: (r['e_district_tc'] as string | null) ?? null,
      lic_type_en: (r['e_lic_type_en'] as string | null) ?? null,
      expiry_date: (r['e_expiry_date'] as string | null) ?? null,
      status: (r['e_status'] as string) === 'absent' ? 'absent' : 'active'
    }
  }));

  const body: SignalsResponse = {
    total: totalRow?.n ?? 0,
    page,
    page_size: pageSize,
    items
  };
  return c.json(body);
}

export { apiApp };
