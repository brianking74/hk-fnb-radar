import { Hono } from 'hono';
import { apiApp } from './routes';
import { ingestAll } from './ingest/ingest';

const app = new Hono<{ Bindings: Env }>();
app.route('/api', apiApp);

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      return app.fetch(request, env, ctx);
    }
    // Static SPA (built by Vite into dist/client); non-asset paths fall back
    // to index.html via `not_found_handling: "single-page-application"`.
    return env.ASSETS.fetch(request);
  },

  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      ingestAll(env)
        .then((results) => console.log('[cron] ingest complete:', JSON.stringify(results)))
        .catch((err) => console.error('[cron] ingest FAILED:', err instanceof Error ? err.stack : String(err)))
    );
  }
} satisfies ExportedHandler<Env>;
