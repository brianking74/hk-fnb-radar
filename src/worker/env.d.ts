// Cloudflare bindings for HK F&B RADAR (mirrors wrangler.jsonc).
declare interface Env {
  DB: D1Database;
  RAW: R2Bucket;
  ASSETS: Fetcher;
  INGEST_SECRET: string;
  PLATFORM_LAUNCHED_AT: string;
  /** Google Places (New) API key — set via `wrangler secret put`. */
  GOOGLE_PLACES_API_KEY?: string;
  /** Dev-only tier preview via .dev.vars — never set in production. */
  TIER_OVERRIDE?: 'free' | 'professional' | 'business';
}
