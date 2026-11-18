// Parser for the FEHB / Liquor Licensing Board XML licence files.
// Pure module (no Cloudflare APIs) so it is directly unit-testable.

import { XMLParser } from 'fast-xml-parser';
import type { SourceId } from '../../shared/types';

export interface RawRecord {
  licno: string;
  /** FEHB files: licence type code (e.g. 'RL'), resolved via TYPE_CODE table. */
  type_code: string | null;
  /** Liquor file: licence type as text (e.g. 'Liquor Licence'). */
  lic_type_text: string | null;
  /** FEHB files: district code (e.g. '18'), resolved via DIST_CODE table. */
  district_code: string | null;
  /** Liquor file: district as text (e.g. 'Yau Tsim'). */
  district_text: string | null;
  name: string | null;
  address: string | null;
  info_codes: string[];
  conditions: string | null;
  serno: string | null;
  expiry_date: string | null;
}

export interface ParsedFile {
  lang: 'en' | 'tc';
  generation_date: string | null;
  type_codes: Record<string, string>;
  dist_codes: Record<string, string>;
  info_codes: Record<string, string>;
  records: RawRecord[];
  skipped: number;
}

export interface EntityRecord {
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
}

export interface MergeResult {
  records: EntityRecord[];
  generation_date: string | null;
  duplicates: number;
  skipped: number;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  processEntities: true,
  isArray: (name) => name === 'CODE' || name === 'LP' || name === 'LLP'
});

function ensureArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function str(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'string') return v.trim() === '' ? null : v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>;
    if ('#text' in obj) return str(obj['#text']);
    return null;
  }
  return null;
}

function codeTable(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  const wrapper = v as { CODE?: unknown } | undefined;
  for (const code of ensureArray<{ '@_ID'?: string; '#text'?: unknown }>(
    wrapper?.CODE as { '@_ID'?: string; '#text'?: unknown } | undefined
  )) {
    const id = code?.['@_ID'];
    const label = str(code?.['#text']);
    if (id && label) out[id] = label;
  }
  return out;
}

/** Collapse \r\n and runs of spaces/tabs; trim; empty -> null. */
function clean(v: string | null): string | null {
  if (v == null) return null;
  const s = v.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').trim();
  return s === '' ? null : s;
}

/** For multi-line condition text (ALC): keep line structure, normalise noise. */
function cleanMultiline(v: string | null): string | null {
  if (v == null) return null;
  const s = v
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return s === '' ? null : s;
}

export function parseFile(xml: string, source: SourceId, lang: 'en' | 'tc'): ParsedFile {
  const doc = parser.parse(xml) as Record<string, unknown>;
  const data = doc?.['DATA'] as Record<string, unknown> | undefined;
  if (!data) throw new Error(`parse(${source}/${lang}): missing <DATA> root`);

  const isLiquor = source === 'liquor';
  const container = (isLiquor ? data['LLPS'] : data['LPS']) as Record<string, unknown> | undefined;
  const rawNodes = ensureArray<Record<string, unknown>>(
    (isLiquor ? container?.['LLP'] : container?.['LP']) as Record<string, unknown> | undefined
  );

  const records: RawRecord[] = [];
  let skipped = 0;
  for (const n of rawNodes) {
    const licno = str(n['LICNO']);
    if (!licno) {
      skipped++;
      continue;
    }
    const infoRaw = str(n['INFO']);
    const info_codes = infoRaw ? (infoRaw.match(/#[^\s#]/g) ?? []) : [];
    records.push({
      licno,
      type_code: isLiquor ? null : str(n['TYPE']),
      lic_type_text: isLiquor ? str(n['LICTYPE']) : null,
      district_code: isLiquor ? null : str(n['DIST']),
      district_text: isLiquor ? str(n['DIST']) : null,
      name: str(n['SS']),
      address: str(n['ADR']),
      info_codes,
      conditions: isLiquor ? cleanMultiline(str(n['ALC'])) : null,
      serno: isLiquor ? str(n['SERNO']) : null,
      expiry_date: str(isLiquor ? n['LVU'] : n['EXPDATE'])
    });
  }

  return {
    lang,
    generation_date: str(data['GENERATION_DATE']),
    type_codes: codeTable(data['TYPE_CODE']),
    dist_codes: codeTable(data['DIST_CODE']),
    info_codes: codeTable(data['INFO_CODE']),
    records,
    skipped
  };
}

function side(
  rec: RawRecord | undefined,
  file: ParsedFile,
  lang: 'en' | 'tc',
  source: SourceId
): Pick<EntityRecord, 'name_en' | 'name_tc' | 'address_en' | 'address_tc' | 'lic_type_en' | 'lic_type_tc' | 'district_en' | 'district_tc' | 'info_en' | 'info_tc'> {
  const suffix = lang; // 'en' | 'tc'
  const has = rec !== undefined;
  const name = clean(rec?.name ?? null);
  const address = clean(rec?.address ?? null);
  let licType: string | null = null;
  let district: string | null = null;
  let info: string | null = null;
  if (has && rec) {
    if (source === 'liquor') {
      licType = clean(rec.lic_type_text);
      district = clean(rec.district_text);
    } else {
      licType = rec.type_code ? file.type_codes[rec.type_code] ?? rec.type_code : null;
      district = rec.district_code ? file.dist_codes[rec.district_code] ?? rec.district_code : null;
      const labels = rec.info_codes.map((c) => file.info_codes[c] ?? c);
      info = labels.length ? labels.join('; ') : null;
    }
  }
  return {
    [`name_${suffix}`]: name,
    [`address_${suffix}`]: address,
    [`lic_type_${suffix}`]: licType,
    [`district_${suffix}`]: district,
    [`info_${suffix}`]: info
  } as Pick<
    EntityRecord,
    'name_en' | 'name_tc' | 'address_en' | 'address_tc' | 'lic_type_en' | 'lic_type_tc' | 'district_en' | 'district_tc' | 'info_en' | 'info_tc'
  >;
}

/**
 * Merge the EN and TC parses of one dataset into bilingual entity records,
 * joined on licence number. TC-only or EN-only records are kept with the
 * missing language null — nothing is dropped and nothing is invented.
 */
export function mergeBilingual(source: SourceId, enFile: ParsedFile, tcFile: ParsedFile): MergeResult {
  const enByLic = new Map<string, RawRecord>();
  let duplicates = 0;
  for (const r of enFile.records) {
    if (enByLic.has(r.licno)) duplicates++;
    enByLic.set(r.licno, r);
  }
  const tcByLic = new Map<string, RawRecord>();
  for (const r of tcFile.records) {
    if (tcByLic.has(r.licno)) duplicates++;
    tcByLic.set(r.licno, r);
  }

  const records: EntityRecord[] = [];

  for (const en of enFile.records) {
    const tc = tcByLic.get(en.licno);
    const liquorEn = source === 'liquor' ? en : undefined;
    const liquorTc = source === 'liquor' ? tc : undefined;
    records.push({
      licno: en.licno,
      ...side(en, enFile, 'en', source),
      ...side(tc, tcFile, 'tc', source),
      conditions: liquorEn?.conditions ?? liquorTc?.conditions ?? null,
      serno: liquorEn?.serno ?? liquorTc?.serno ?? null,
      expiry_date: en.expiry_date ?? tc?.expiry_date ?? null
    });
  }
  for (const tc of tcFile.records) {
    if (enByLic.has(tc.licno)) continue; // already emitted, joined with its EN side
    records.push({
      licno: tc.licno,
      ...side(undefined, enFile, 'en', source),
      ...side(tc, tcFile, 'tc', source),
      conditions: source === 'liquor' ? tc.conditions : null,
      serno: source === 'liquor' ? tc.serno : null,
      expiry_date: tc.expiry_date
    });
  }

  // De-duplicate by licence number within the merged set (last write wins).
  const byLic = new Map(records.map((r) => [r.licno, r]));
  duplicates += records.length - byLic.size;

  const generation_date =
    [enFile.generation_date, tcFile.generation_date].filter((d): d is string => !!d).sort().pop() ?? null;

  return { records: [...byLic.values()], generation_date, duplicates, skipped: enFile.skipped + tcFile.skipped };
}
