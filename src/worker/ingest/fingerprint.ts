// Stable fingerprint of the watched licence fields, used for change detection
// between daily snapshots. Field order is fixed so the hash is deterministic.

import type { EntityRecord } from './parse';

const FINGERPRINT_FIELDS = [
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

export async function fingerprintOf(record: EntityRecord): Promise<string> {
  const values = FINGERPRINT_FIELDS.map((f) => record[f] ?? null);
  const data = new TextEncoder().encode(JSON.stringify(values));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
