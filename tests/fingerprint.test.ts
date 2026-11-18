import { describe, expect, it } from 'vitest';
import { fingerprintOf } from '../src/worker/ingest/fingerprint';
import type { EntityRecord } from '../src/worker/ingest/parse';

function record(overrides: Partial<EntityRecord> = {}): EntityRecord {
  return {
    licno: '2218805644',
    name_en: 'Libra & Co',
    name_tc: '利寶會館',
    address_en: '4/F, CENTURY SQUARE, CENTRAL',
    address_tc: '香港中環德己立街1-13號世紀廣場4樓',
    lic_type_en: 'General Restaurant Licence',
    lic_type_tc: '普通食肆牌照',
    district_en: 'Central/Western',
    district_tc: '中西區',
    info_en: null,
    info_tc: null,
    conditions: null,
    serno: null,
    expiry_date: '2027-06-17',
    ...overrides
  };
}

describe('fingerprintOf', () => {
  it('is deterministic for identical records', async () => {
    expect(await fingerprintOf(record())).toBe(await fingerprintOf(record()));
  });

  it('changes when any watched field changes', async () => {
    const base = await fingerprintOf(record());
    expect(await fingerprintOf(record({ name_en: 'Libra & Co Ltd' }))).not.toBe(base);
    expect(await fingerprintOf(record({ expiry_date: '2027-06-18' }))).not.toBe(base);
    expect(await fingerprintOf(record({ name_tc: '利寶會館二號' }))).not.toBe(base);
    expect(await fingerprintOf(record({ address_tc: '新地址' }))).not.toBe(base);
  });

  it('treats undefined and null identically', async () => {
    const a = await fingerprintOf(record({ conditions: null }));
    const b = await fingerprintOf({ ...record(), conditions: undefined } as unknown as EntityRecord);
    expect(a).toBe(b);
  });
});
