## Why

The app currently runs on Fly.io as a single Docker image serving static assets and a Hono API server. Cloudflare Workers + Static Assets offers a free tier (including Hyperdrive free quota of 100k queries/day), global CDN edge serving, and simpler build/deploy without Docker. Migrating reduces infrastructure cost and complexity while keeping Drizzle ORM, tRPC, and Supabase Auth intact.

## What Changes

- **BREAKING**: Replace Fly.io deployment with Cloudflare Workers + Static Assets (static assets + Worker API in one deployment). Two Workers (test and prod) replace two Fly apps.
- **BREAKING**: Remove `apps/server` package. Worker entry point, context, auth, and db modules move into `apps/web/worker/`. The `apps/web` package becomes the single deployable.
- **BREAKING**: Remove Hono and `@hono/node-server`. tRPC runs directly via `fetchRequestHandler` (fetch adapter) on the Workers runtime.
- **BREAKING**: Replace direct `postgres-js` TCP connection with Hyperdrive. Drizzle ORM stays; `db.ts` uses `env.HYPERDRIVE.connect()` instead of `DATABASE_URL`.
- **BREAKING**: Replace esbuild server bundling with Vite + `@cloudflare/vite-plugin`. Local dev runs as a single `vite dev` command (Workers runtime via workerd) instead of separate Vite + Hono processes.
- **BREAKING**: Remove Docker, `Dockerfile`, `fly.toml` configs, and the `serve()`-based Node server.
- Move `migrations/` and `drizzle.config.ts` from `apps/server/` to `packages/api/` (migrations belong with schema).
- Run database migrations via GitHub Actions (Node.js + `postgres-js`) as a pre-deploy gate. Deploy fails if migrations fail. Two workflows (`deploy-test`, `deploy-prod`) both triggered manually via `workflow_dispatch`.
- Remove `/healthz` endpoint (no Fly health checks on Cloudflare).
- Free `*.<account-subdomain>.workers.dev` domains replace `*.fly.dev` domains. The account subdomain is set once per Cloudflare account (currently `escaton`); each Worker serves at `<worker-name>.<account-subdomain>.workers.dev`.
- Cloudflare dashboard vars and secrets replace Fly secrets. Hyperdrive binding configured per Worker.
- **BREAKING**: Use wrangler environments (`env.prod` block in `wrangler.jsonc`) for per-environment config. All non-secret values (Worker name, Hyperdrive ID, Supabase URL, Supabase publishable key) live in one `wrangler.jsonc` — test at top level, prod under `env.prod`. The prod deploy workflow sets `CLOUDFLARE_ENV=prod` at build time so the Vite plugin flattens `env.prod` into the output config. This eliminates the inline `node -e` config mutation previously used in `deploy-prod.yml`. Secrets are injected via `wrangler secret put` in the workflow, never in config files.
- **BREAKING**: Inject Supabase URL and publishable key into the client at runtime (Worker reads `env.SUPABASE_URL`/`env.SUPABASE_PUBLISHABLE_KEY` and writes them into `index.html` before serving), not at build time. The client no longer reads `import.meta.env.VITE_SUPABASE_*`; it reads `window.__SUPABASE__`. This makes the build artifact environment-agnostic — the same build deploys to test and prod without rebuilding, fixing a latent bug where the client bundle bakes in whatever Supabase project was in `.env` at build time. `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are removed from `.env.example` and CI. Local dev injection is handled separately (out of scope for this change; tracked as an open question).

## Capabilities

### New Capabilities

_None_ — no new capabilities are introduced. The migration restructures existing infrastructure.

### Modified Capabilities

- `app-infrastructure`: Deployment target, build pipeline, local development workflow, database connection mechanism, server entry point, and deployment environments all change. Requirements about pnpm monorepo, TypeScript strict mode, oxlint, oxfmt, vitest, and CI pipeline remain unchanged.

## Impact

- **Code**: `apps/server/` deleted; logic moves to `apps/web/worker/`. `apps/server/src/index.ts` rewritten as Worker fetch handler. `apps/server/src/db.ts` rewritten for Hyperdrive. `apps/server/src/context.ts` updated to receive `env` binding. `apps/web/vite.config.ts` gains `@cloudflare/vite-plugin`. `apps/web/package.json` gains Worker dependencies (drizzle-orm, postgres, jose, @trpc/server). `packages/api/package.json` gains drizzle-kit and tsx. `drizzle.config.ts` and `migrations/` move to `packages/api/`. `apps/web/worker/index.ts` intercepts `/` and `/index.html` to inject `window.__SUPABASE__` from `env` bindings before serving. `apps/web/src/lib/supabase.ts` reads `window.__SUPABASE__` instead of `import.meta.env.VITE_SUPABASE_*`.
- **Dependencies removed**: hono, @hono/node-server, esbuild (as dev dep), @types/node.
- **Dependencies added**: @cloudflare/vite-plugin, wrangler.
- **Dependencies moved**: drizzle-orm, postgres, jose, @trpc/server move from apps/server to apps/web; drizzle-kit, tsx move from apps/server to packages/api.
- **Config files deleted**: Dockerfile, fly.prod.toml, fly.test.toml.
- **Config files added**: `apps/web/wrangler.jsonc` (with `env.prod` block for prod overrides).
- **GitHub workflows**: deploy-test.yml and deploy-prod.yml rewritten to run migrations (Node.js) then `wrangler deploy`. Prod workflow sets `CLOUDFLARE_ENV=prod` at build time and deploys from the flattened prod config. The inline `node -e` config mutation is removed. CI workflow (ci.yml) stays the same.
- **Infrastructure**: Two Cloudflare Workers created (dnd-weekend-test, dnd-weekend). Two Hyperdrive configs created (one per environment, pointing at test/prod Supabase). Fly.io apps decommissioned.
- **Domains**: `dnd-weekend-test.<account-subdomain>.workers.dev` and `dnd-weekend.<account-subdomain>.workers.dev` replace Fly domains.
- **Existing specs**: `user-auth` and `character-management` behavior unchanged — only the runtime executing them changes.
