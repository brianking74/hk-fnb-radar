// Cloudflare bindings for HK F&B RADAR (mirrors wrangler.jsonc).
declare interface Env {
  DB: D1Database;
  RAW: R2Bucket;
  ASSETS: Fetcher;
  INGEST_SECRET: string;
  PLATFORM_LAUNCHED_AT: string;
}
