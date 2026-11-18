# HK F&B RADAR

Public, freemium B2B intelligence platform for suppliers to Hong Kong's food,
beverage and hospitality industries — built on Hong Kong Government open data
(restaurant licences, licensed liquor premises, other food-business licences),
refreshed daily.

- **Stack**: Cloudflare Workers (API + static assets), Cloudflare D1, Cloudflare R2,
  Cron Triggers; React + Vite + TypeScript frontend; GitHub Actions CI/CD; Stripe
  (Release 2).
- **Releases**: R1 = free public platform (browse/search/signals + Wine & Spirits
  view) → R2 = Stripe subscriptions (FREE / PROFESSIONAL HK$149 / BUSINESS HK$299)
  → R3 = advanced commercial intelligence.
- **Honesty rules**: signals are phrased as observations ("newly observed",
  "no longer appearing in the source dataset") — never as confirmed
  openings/closures. Contact enrichment is only ever sourced + attributed,
  never fabricated.

## Commands

```bash
npm install
npm run check        # typecheck worker + client
npm test             # vitest (parser, diff, entitlements)
npm run build        # typecheck client + vite build -> dist/client
npm run db:migrate:local
npx wrangler dev     # worker + SPA on :8787 (assets served from dist/client)
npm run dev          # Vite dev server on :5173, proxies /api to :8787
```

## Deployment

1. `npx wrangler login` (or `CLOUDFLARE_API_TOKEN`)
2. `npx wrangler d1 create hkfbradar` → put the UUID in `wrangler.jsonc`
3. `npx wrangler r2 bucket create hkfbradar-raw`
4. `npx wrangler d1 migrations apply hkfbradar --remote`
5. `npx wrangler secret put INGEST_SECRET`
6. `npm run deploy`
7. Seed data: `curl -X POST https://<worker>/api/admin/ingest -H "x-ingest-secret: ..."`
   (Cron then runs daily at 09:30 HKT.)

Note: the daily ingest parses ~13 MB of XML in one invocation — a Workers Paid
plan (30 s CPU) is required; the free plan's 10 ms CPU limit is not enough.
