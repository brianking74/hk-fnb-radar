import { describe, expect, it } from 'vitest';
import { mergeBilingual, parseFile } from '../src/worker/ingest/parse';

const RESTAURANTS_EN = `<DATA xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <DEPARTMENT>Food and Environmental Hygiene Department</DEPARTMENT>
  <GENERATION_DATE>2026-11-18</GENERATION_DATE>
  <LINK>http://www.fehd.gov.hk</LINK>
  <TYPE_CODE>
    <CODE ID="RL">General Restaurant Licence</CODE>
    <CODE ID="RR">Light Refreshment Restaurant Licence</CODE>
    <CODE ID="MR">Marine Restaurant Licence</CODE>
  </TYPE_CODE>
  <DIST_CODE>
    <CODE ID="18">Central/Western</CODE>
    <CODE ID="15">Southern</CODE>
  </DIST_CODE>
  <INFO_CODE>
    <CODE ID="#G">Licensed restaurant approved to sell sashimi for consumption on the premises</CODE>
    <CODE ID="#H">Licensed restaurant approved to sell sushi for consumption on the premises</CODE>
  </INFO_CODE>
  <LPS>
    <LP>
      <TYPE>RL</TYPE>
      <DIST>18</DIST>
      <LICNO>2218805644</LICNO>
      <SS>Libra &amp; Co</SS>
      <ADR>4/F, CENTURY SQUARE, 1-13 D'AGUILAR STREET, CENTRAL, HONG KONG</ADR>
      <INFO>#G#H</INFO>
      <EXPDATE>2027-06-17</EXPDATE>
    </LP>
    <LP>
      <TYPE>MR</TYPE>
      <DIST>15</DIST>
      <LICNO>3715038328</LICNO>
      <SS>Tai Pak Floating Restaurant</SS>
      <ADR>TAI PAK FLOATING RESTAURANT, SHUM WAN, ABERDEEN</ADR>
      <INFO></INFO>
      <EXPDATE>2027-06-30</EXPDATE>
    </LP>
  </LPS>
</DATA>`;

const RESTAURANTS_TC = `<DATA xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <DEPARTMENT>食物環境衞生署</DEPARTMENT>
  <GENERATION_DATE>2026-11-18</GENERATION_DATE>
  <TYPE_CODE>
    <CODE ID="RL">普通食肆牌照</CODE>
    <CODE ID="MR">水上食肆牌照</CODE>
  </TYPE_CODE>
  <DIST_CODE>
    <CODE ID="18">中西區</CODE>
    <CODE ID="15">南區</CODE>
  </DIST_CODE>
  <INFO_CODE>
    <CODE ID="#G">獲批准出售刺身</CODE>
    <CODE ID="#H">獲批准出售壽司</CODE>
  </INFO_CODE>
  <LPS>
    <LP>
      <TYPE>RL</TYPE>
      <DIST>18</DIST>
      <LICNO>2218805644</LICNO>
      <SS>利寶會館</SS>
      <ADR>香港中環德己立街1-13號世紀廣場4樓</ADR>
      <INFO></INFO>
      <EXPDATE>2027-06-17</EXPDATE>
    </LP>
  </LPS>
</DATA>`;

const LIQUOR_EN = `<?xml version="1.0" encoding="UTF-8"?>
<DATA><DEPARTMENT>Liquor Licensing Board</DEPARTMENT><GENERATION_DATE>2026-11-17</GENERATION_DATE><LLPS><LLP><LICTYPE>Club Liquor Licence</LICTYPE><DIST>Yau Tsim</DIST><LICNO>5361800625</LICNO><SS>Joe's Billiards &amp; Bar</SS><ADR>11/F - 12/F, ONE KNUTSFORD, 1 KNUTSFORD TERRACE, TSIM SHA TSUI, KOWLOON</ADR><LVU>2027-01-13</LVU><ALC>a.) Not more than(180)persons, including staff, shall be permitted on the premises at any one time.
b.) The Licensee shall attend and complete a seminar for liquor licensing organized by the Liquor Licensing Board.</ALC><SERNO>L183143</SERNO></LLP><LLP><LICTYPE>Liquor Licence</LICTYPE><DIST>Wan Chai</DIST><LICNO>5212801319</LICNO><SS>Meat Cuisine Hiro</SS><ADR>2/F., JARDINE CENTRE, 50 JARDINE'S BAZAAR, CAUSEWAY BAY, HONG KONG</ADR><LVU>2026-12-04</LVU><ALC>N.A.</ALC><SERNO>L181350</SERNO></LLP></LLPS></DATA>`;

const LIQUOR_TC = `<?xml version="1.0" encoding="UTF-8"?>
<DATA><DEPARTMENT>酒牌局</DEPARTMENT><GENERATION_DATE>2026-11-17</GENERATION_DATE><LLPS><LLP><LICTYPE>會社酒牌</LICTYPE><DIST>油尖區</DIST><LICNO>5361800625</LICNO><SS>喬治桌球會</SS><ADR>九龍尖沙咀諾士佛臺1號諾士佛大廈11樓-12樓</ADR><LVU>2027-01-13</LVU><ALC>N.A.</ALC><SERNO>L183143</SERNO></LLP></LLPS></DATA>`;

const OTHERFOOD_EN = `<DATA>
  <GENERATION_DATE>2026-11-18</GENERATION_DATE>
  <TYPE_CODE>
    <CODE ID="FB">Bakery Licence</CODE>
    <CODE ID="FP">Fresh Provision Shop Licence</CODE>
  </TYPE_CODE>
  <DIST_CODE>
    <CODE ID="97">Sha Tin</CODE>
  </DIST_CODE>
  <INFO_CODE>
    <CODE ID="#D">Licensed food premises that are recognized by FEHD for the revised inspection regime</CODE>
  </INFO_CODE>
  <LPS>
    <LP>
      <TYPE>FB</TYPE>
      <DIST>97</DIST>
      <LICNO>9999999999</LICNO>
      <SS>Test Bakery</SS>
      <ADR>1 TEST STREET, SHA TIN</ADR>
      <INFO>#D</INFO>
      <EXPDATE>2027-02-01</EXPDATE>
    </LP>
  </LPS>
</DATA>`;

describe('parseFile — restaurants (FEHB shape)', () => {
  const file = parseFile(RESTAURANTS_EN, 'restaurants', 'en');

  it('extracts the generation date', () => {
    expect(file.generation_date).toBe('2026-11-18');
  });

  it('keeps licence numbers as strings', () => {
    expect(file.records.map((r) => r.licno)).toEqual(['2218805644', '3715038328']);
  });

  it('resolves licence type and district via the code tables', () => {
    expect(file.records[0]?.type_code).toBe('RL');
    expect(file.type_codes['RL']).toBe('General Restaurant Licence');
    expect(file.dist_codes['18']).toBe('Central/Western');
  });

  it('decodes INFO endorsement codes', () => {
    expect(file.records[0]?.info_codes).toEqual(['#G', '#H']);
    expect(file.records[0]?.info_codes.map((c) => file.info_codes[c])).toEqual([
      'Licensed restaurant approved to sell sashimi for consumption on the premises',
      'Licensed restaurant approved to sell sushi for consumption on the premises'
    ]);
  });

  it('handles empty INFO tags', () => {
    expect(file.records[1]?.info_codes).toEqual([]);
  });

  it('decodes XML entities in names', () => {
    expect(file.records[0]?.name).toBe('Libra & Co');
  });

  it('keeps EXPDATE', () => {
    expect(file.records[0]?.expiry_date).toBe('2027-06-17');
  });
});

describe('parseFile — liquor (LLB shape)', () => {
  const file = parseFile(LIQUOR_EN, 'liquor', 'en');

  it('reads licence type and district as text', () => {
    expect(file.records[0]?.lic_type_text).toBe('Club Liquor Licence');
    expect(file.records[0]?.district_text).toBe('Yau Tsim');
  });

  it('reads expiry (LVU), serial (SERNO) and conditions (ALC)', () => {
    expect(file.records[0]?.expiry_date).toBe('2027-01-13');
    expect(file.records[0]?.serno).toBe('L183143');
    expect(file.records[0]?.conditions).toContain('Not more than(180)persons');
    expect(file.records[0]?.conditions).toContain('\nb.)');
  });

  it('parses the compact single-line XML variant', () => {
    expect(file.records).toHaveLength(2);
  });
});

describe('mergeBilingual', () => {
  it('joins EN and TC restaurant records on licence number', () => {
    const en = parseFile(RESTAURANTS_EN, 'restaurants', 'en');
    const tc = parseFile(RESTAURANTS_TC, 'restaurants', 'tc');
    const merged = mergeBilingual('restaurants', en, tc);

    // 2 EN records, 1 TC record; the pair joins, the EN-only record is kept.
    expect(merged.records).toHaveLength(2);
    expect(merged.duplicates).toBe(0);
  });

  it('fills TC fields from the TC file and keeps TC-only records', () => {
    const en = parseFile(RESTAURANTS_EN, 'restaurants', 'en');
    const tc = parseFile(RESTAURANTS_TC, 'restaurants', 'tc');
    const merged = mergeBilingual('restaurants', en, tc);

    const joined = merged.records.find((r) => r.licno === '2218805644');
    expect(joined?.name_en).toBe('Libra & Co');
    expect(joined?.name_tc).toBe('利寶會館');
    expect(joined?.address_tc).toBe('香港中環德己立街1-13號世紀廣場4樓');
    expect(joined?.lic_type_tc).toBe('普通食肆牌照');
    expect(joined?.district_tc).toBe('中西區');

    // 3715038328 exists in EN only in this fixture -> kept, TC fields null
    const enOnly = merged.records.find((r) => r.licno === '3715038328');
    expect(enOnly).toBeDefined();
    expect(enOnly?.name_tc).toBeNull();
  });

  it('joins liquor records bilingual and keeps EN conditions', () => {
    const en = parseFile(LIQUOR_EN, 'liquor', 'en');
    const tc = parseFile(LIQUOR_TC, 'liquor', 'tc');
    const merged = mergeBilingual('liquor', en, tc);

    const joined = merged.records.find((r) => r.licno === '5361800625');
    expect(joined?.name_tc).toBe('喬治桌球會');
    expect(joined?.lic_type_en).toBe('Club Liquor Licence');
    expect(joined?.lic_type_tc).toBe('會社酒牌');
    expect(joined?.district_en).toBe('Yau Tsim');
    expect(joined?.district_tc).toBe('油尖區');
    expect(joined?.conditions).toContain('Not more than(180)persons');
    expect(joined?.serno).toBe('L183143');
  });

  it('resolves FEHB labels from each language file during merge', () => {
    const en = parseFile(OTHERFOOD_EN, 'other_food', 'en');
    const merged = mergeBilingual('other_food', en, parseFile('<DATA><LPS></LPS></DATA>', 'other_food', 'tc'));
    const rec = merged.records[0];
    expect(rec?.lic_type_en).toBe('Bakery Licence');
    expect(rec?.district_en).toBe('Sha Tin');
    expect(rec?.info_en).toBe('Licensed food premises that are recognized by FEHD for the revised inspection regime');
  });

  it('takes the later generation date of the two files', () => {
    const en = parseFile(RESTAURANTS_EN, 'restaurants', 'en');
    const tc = parseFile(RESTAURANTS_TC, 'restaurants', 'tc');
    expect(mergeBilingual('restaurants', en, tc).generation_date).toBe('2026-11-18');
  });
});
