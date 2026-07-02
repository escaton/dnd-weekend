## Why

The app currently runs on Fly.io as a single Docker image serving static assets and a Hono API server. Cloudflare Pages with Workers offers a free tier (including Hyperdrive free quota of 100k queries/day), global CDN edge serving, and simpler build/deploy without Docker. Migrating reduces infrastructure cost and complexity while keeping Drizzle ORM, tRPC, and Supabase Auth intact.

## What Changes

- **BREAKING**: Replace Fly.io deployment with Cloudflare Pages + Workers (static assets + Worker API). Two Pages projects (test and prod) replace two Fly apps.
- **BREAKING**: Remove `apps/server` package. Worker entry point, context, auth, and db modules move into `apps/web/worker/`. The `apps/web` package becomes the single deployable.
- **BREAKING**: Remove Hono and `@hono/node-server`. tRPC runs directly via `fetchRequestHandler` (fetch adapter) on the Workers runtime.
- **BREAKING**: Replace direct `postgres-js` TCP connection with Hyperdrive. Drizzle ORM stays; `db.ts` uses `env.HYPERDRIVE.connect()` instead of `DATABASE_URL`.
- **BREAKING**: Replace esbuild server bundling with Vite + `@cloudflare/vite-plugin`. Local dev runs as a single `vite dev` command (Workers runtime via workerd) instead of separate Vite + Hono processes.
- **BREAKING**: Remove Docker, `Dockerfile`, `fly.toml` configs, and the `serve()`-based Node server.
- Move `migrations/` and `drizzle.config.ts` from `apps/server/` to `packages/api/` (migrations belong with schema).
- Run database migrations via GitHub Actions (Node.js + `postgres-js`) as a pre-deploy gate. Deploy fails if migrations fail. Two workflows (`deploy-test`, `deploy-prod`) both triggered manually via `workflow_dispatch`.
- Remove `/healthz` endpoint (no Fly health checks on Cloudflare).
- Free `*.pages.dev` domains replace `*.fly.dev` domains.
- Cloudflare dashboard vars and secrets replace Fly secrets. Hyperdrive binding configured per Pages project.

## Capabilities

### New Capabilities

_None_ — no new capabilities are introduced. The migration restructures existing infrastructure.

### Modified Capabilities

- `app-infrastructure`: Deployment target, build pipeline, local development workflow, database connection mechanism, server entry point, and deployment environments all change. Requirements about pnpm monorepo, TypeScript strict mode, oxlint, oxfmt, vitest, and CI pipeline remain unchanged.

## Impact

- **Code**: `apps/server/` deleted; logic moves to `apps/web/worker/`. `apps/server/src/index.ts` rewritten as Worker fetch handler. `apps/server/src/db.ts` rewritten for Hyperdrive. `apps/server/src/context.ts` updated to receive `env` binding. `apps/web/vite.config.ts` gains `@cloudflare/vite-plugin`. `apps/web/package.json` gains Worker dependencies (drizzle-orm, postgres, jose, @trpc/server). `packages/api/package.json` gains drizzle-kit and tsx. `drizzle.config.ts` and `migrations/` move to `packages/api/`.
- **Dependencies removed**: hono, @hono/node-server, esbuild (as dev dep), @types/node.
- **Dependencies added**: @cloudflare/vite-plugin, wrangler.
- **Dependencies moved**: drizzle-orm, postgres, jose, @trpc/server move from apps/server to apps/web; drizzle-kit, tsx move from apps/server to packages/api.
- **Config files deleted**: Dockerfile, fly.prod.toml, fly.test.toml.
- **Config files added**: `apps/web/wrangler.jsonc`.
- **GitHub workflows**: deploy-test.yml and deploy-prod.yml rewritten to run migrations (Node.js) then `wrangler pages deploy`. CI workflow (ci.yml) stays the same.
- **Infrastructure**: Two Cloudflare Pages projects created (dnd-weekend-test, dnd-weekend). Two Hyperdrive configs created (one per environment, pointing at test/prod Supabase). Fly.io apps decommissioned.
- **Domains**: `dnd-weekend-test.pages.dev` and `dnd-weekend.pages.dev` replace Fly domains.
- **Existing specs**: `user-auth` and `character-management` behavior unchanged — only the runtime executing them changes.
