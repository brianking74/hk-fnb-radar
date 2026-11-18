// Rebuilds R2 keyset files (licno -> fingerprint) from downloaded source XMLs,
// using the exact same parse + fingerprint code the Worker cron runs.
// Usage: node --experimental-strip-types scripts/build-keysets.ts <xmlDir> <outDir> <date>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseFile, mergeBilingual } from '../src/worker/ingest/parse.ts';
import { fingerprintOf } from '../src/worker/ingest/fingerprint.ts';

const xmlDir = process.argv[2] ?? '.';
const outDir = process.argv[3] ?? './keysets';
const date = process.argv[4] ?? '1970-01-01';

const FILES: Record<string, { en: string; tc: string }> = {
  restaurants: { en: 'LP_Restaurants_EN.XML', tc: 'LP_Restaurants_TC.XML' },
  liquor: { en: 'edatabase_liquor.xml', tc: 'database_liquor.xml' },
  other_food: { en: 'LP_OtherFood_EN.XML', tc: 'LP_OtherFood_TC.XML' }
};

for (const [source, files] of Object.entries(FILES)) {
  const en = parseFile(readFileSync(join(xmlDir, files.en), 'utf8'), source as 'restaurants', 'en');
  const tc = parseFile(readFileSync(join(xmlDir, files.tc), 'utf8'), source as 'restaurants', 'tc');
  const merged = mergeBilingual(source as 'restaurants', en, tc);
  const keyset: Record<string, string> = {};
  for (const rec of merged.records) {
    keyset[rec.licno] = await fingerprintOf(rec);
  }
  mkdirSync(join(outDir, source), { recursive: true });
  const out = join(outDir, source, 'keyset.json');
  writeFileSync(out, JSON.stringify(keyset));
  console.log(`${source}: ${Object.keys(keyset).length} fingerprints -> ${out}`);
}
void date;
