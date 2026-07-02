## Context

The app is a pnpm monorepo with three workspaces: `apps/web` (Vite + React SPA), `apps/server` (Hono + Drizzle + tRPC), and `packages/api` (shared tRPC router + Drizzle schema). It deploys as a single Docker image to Fly.io, which serves static assets and the Hono API from one Node.js process. Supabase provides Postgres + Auth (JWT/JWKS). Two Fly apps (test + prod) each point at their own Supabase project. Migrations run as a Fly `release_command`.

The tRPC fetch adapter and `jose` JWT verification are already runtime-agnostic (Request/Response). Hono is used for CORS, static serving, SPA fallback, and routing — all of which Cloudflare's platform handles natively.

## Goals / Non-Goals

**Goals:**
- Move from Fly.io + Docker to Cloudflare Pages + Workers (static assets + Worker API)
- Keep Drizzle ORM, tRPC, Supabase Auth — only the runtime and connection mechanism change
- Use Hyperdrive (free tier, 100k queries/day) for Postgres connection pooling
- Use `@cloudflare/vite-plugin` for local dev (single `vite dev`, workerd runtime, no CORS)
- Two Pages projects (test + prod), each with its own Hyperdrive config and Supabase project
- Migrations run in GitHub Actions as a pre-deploy gate (fail deploy if migrations fail)
- Free `*.pages.dev` domains, HTTPS, global CDN

**Non-Goals:**
- Migrating away from Supabase (Postgres + Auth stay)
- Migrating away from Drizzle ORM
- Using preview deployments as the test environment (two separate Pages projects instead)
- Using PostgREST/HTTP driver (keeping `postgres-js` via Hyperdrive TCP)
- Adding a custom domain (using free `*.pages.dev` subdomains)

## Decisions

### 1. Workers + Static Assets (not Pages Functions `functions/` directory)

**Choice**: Use a Worker with an `assets` binding, built via `@cloudflare/vite-plugin`. The Worker entry point lives at `apps/web/worker/index.ts`. Static assets from the Vite build are served by Cloudflare's CDN. The Worker handles `/api/*` requests; everything else falls through to static assets with SPA fallback (`not_found_handling: "single-page-application"`).

**Alternatives considered**:
- *Pages Functions (`functions/api/[[route]].ts`)*: Uses file-based routing in a `functions/` directory. More ceremony, Hono Pages adapter needed, separate routing concept from the Worker. The Vite plugin targets the Workers + Assets model, which is the newer recommended path.
- *Separate Worker + Pages project*: Deploy the API as a standalone Worker and the frontend as a Pages project. Requires CORS between origins. More moving parts.

**Why**: The Vite plugin (GA since April 2025) natively supports Workers + Assets. Single build, single deploy, single origin. No CORS, no `functions/` directory, no Hono Pages adapter. The `assets` binding handles SPA routing identically to the current Hono fallback.

### 2. Drop Hono — tRPC fetch adapter directly

**Choice**: Remove Hono and `@hono/node-server`. The Worker entry point calls `fetchRequestHandler` from `@trpc/server/adapters/fetch` directly in the `fetch()` handler.

**Why**: Hono's roles are all replaced by the platform:
- CORS in dev → same origin via Vite plugin (single port)
- Static serving → `assets` binding
- SPA fallback → `not_found_handling: "single-page-application"`
- `/healthz` → no health check needed on Cloudflare
- Error handling → tRPC has its own

**Alternatives considered**: Keep Hono for middleware extensibility. But there's no middleware to add — CORS is gone, static serving is gone, routing is just `fetchRequestHandler`. Hono adds a dependency and indirection for zero benefit.

### 3. Hyperdrive for Postgres (free tier)

**Choice**: Use Hyperdrive with the Workers Free plan (100k queries/day, 20 origin connections). Drizzle connects via `env.HYPERDRIVE.connect()`, which returns a `postgres-js`-compatible connection. The `postgres-js` driver remains, but the connection string is managed by Hyperdrive — no `DATABASE_URL` at runtime.

**Alternatives considered**:
- *Direct TCP via `cloudflare:sockets`*: No pooling, cold start penalty, manual connection management. Less battle-tested.
- *PostgREST (HTTP)*: Would require dropping Drizzle or using the Drizzle HTTP driver (limited query support). Changes the data layer fundamentally.
- *Workers Paid plan ($5/mo)*: Unnecessary — free tier quota exceeds expected usage for a personal D&D tool.

**Why**: Hyperdrive keeps Drizzle and `postgres-js` unchanged (only the connection factory changes), provides connection pooling and query caching for free, and is the recommended Cloudflare pattern for Postgres.

### 4. Absorb `apps/server` into `apps/web/worker/`

**Choice**: Delete `apps/server`. Move `index.ts` (Worker entry), `context.ts`, `auth.ts`, `db.ts` into `apps/web/worker/`. The `apps/web` package becomes the single deployable — it contains both the React client (`src/`) and the Worker API (`worker/`).

**Why**: The Vite plugin expects the Worker entry and the Vite config in the same package. Having `apps/server` as a separate workspace adds import indirection for no benefit — the Worker is thin (just the fetch adapter + context + auth + db). `packages/api` remains the shared home for the tRPC router and Drizzle schema.

**Alternatives considered**:
- *Keep `apps/server` as a separate package*: The Vite plugin would need to import from it, adding workspace resolution complexity. The server package would have no independent build or deploy target anymore.
- *Worker at root*: A `wrangler.jsonc` at the repo root. Conflicts with the monorepo structure and makes the Vite plugin harder to configure.

### 5. Migrations run manually by the developer

**Choice**: The developer runs `pnpm --filter @dnd-weekend/api db:migrate` locally (using `DATABASE_URL` from `.env`) before triggering a deploy. Both `deploy-test.yml` and `deploy-prod.yml` workflows build and deploy only — they do not run migrations.

**Why**: GitHub Actions runners cannot reach Supabase Postgres over IPv6-only direct connection strings, and the Supabase connection pooler requires tenant configuration not yet available for this project. Running migrations locally from the developer's machine (which has IPv6 connectivity) is the pragmatic path. Migrations remain additive and backward-compatible, so the code and DB can be updated independently without downtime. The `DATABASE_URL_TEST` and `DATABASE_URL_PROD` GitHub secrets are no longer needed by the deploy workflows.

**Alternatives considered**:
- *Migrations as a pre-deploy gate in GitHub Actions*: The original design. Blocked by GitHub Actions runners lacking IPv6 connectivity to Supabase's direct connection hostname. Could be revisited later by configuring the Supabase connection pooler (IPv4) or a tunnel.
- *Migration Worker*: Run migrations inside a Worker endpoint. Requires Hyperdrive or HTTP driver, adds complexity, and running DDL from an edge Worker is an anti-pattern.
- *`drizzle-kit push`*: Schema-to-DB diff without migration files. Loses migration history and auditability.

### 6. Two Pages projects, two manual workflows

**Choice**: Create two Cloudflare Pages projects (`dnd-weekend-test`, `dnd-weekend`). Two GitHub Actions workflows (`deploy-test`, `deploy-prod`), both `workflow_dispatch`. Each runs migrations against its environment's Supabase DB, then deploys to its Pages project via `wrangler pages deploy`. Each Pages project has its own Hyperdrive binding (pointing at test/prod Supabase) and its own dashboard vars/secrets.

**Why**: Mirrors the current Fly setup (two apps, two manual workflows). Provides stable, predictable URLs (`dnd-weekend-test.pages.dev`, `dnd-weekend.pages.dev`). No ambiguity about which environment a deployment targets.

**Alternatives considered**:
- *Preview deployments as test env*: Simpler but no stable test URL. Each PR gets a unique hash-based URL. Not suitable for a shared test environment.
- *Production branch git-ops*: Push to `main` → test, merge to `production` → prod. Less control over deploy timing.

### 7. Move migrations and drizzle config to `packages/api`

**Choice**: Move `migrations/` and `drizzle.config.ts` from `apps/server/` to `packages/api/`. The schema already lives in `packages/api/src/db/schema.ts`. Migrations belong with the schema they're derived from. CI runs `drizzle-kit migrate --config packages/api/drizzle.config.ts` using `DATABASE_URL` from GitHub secrets.

**Why**: Co-locating schema and migrations in the shared package keeps the data layer cohesive. Both `apps/web/worker` (runtime Drizzle) and CI (migration runner) import from `packages/api`.

## Risks / Trade-offs

- **[Hyperdrive free tier quota]** → 100k queries/day. If exceeded, DB operations fail with an error. **Mitigation**: Monitor usage in Cloudflare dashboard. For a personal D&D tool, expected usage is far below the limit. If needed later, upgrade to Workers Paid ($5/mo) for unlimited queries.
- **[Worker CPU time limits]** → Workers Free plan has 10ms CPU time per request. tRPC + Drizzle + JWT verification should fit, but complex queries or slow Supabase responses could approach limits. **Mitigation**: CPU time is compute, not wall clock — waiting on Hyperdrive/Supabase doesn't count. Monitor via Cloudflare analytics.
- **[Vite plugin monorepo edge cases]** → `@cloudflare/vite-plugin` is GA but relatively new. Workspace imports (`@dnd-weekend/api`) in the Worker bundle may need validation. **Mitigation**: Spike during implementation — if workspace resolution fails, configure the plugin's `wrangler.jsonc` `main` path explicitly.
- **[Hyperdrive cold starts]** → First request after idle may be slower as Hyperdrive establishes connections. **Mitigation**: Hyperdrive caches connections; subsequent requests are fast. Acceptable for a personal tool.
- **[No release_command equivalent]** → Migrations are decoupled from the deploy. A failed migration leaves the old site running (safe), but a successful migration followed by a failed deploy leaves the DB ahead of the code. **Mitigation**: Migrations are additive (Drizzle generates forward-only SQL). Write migrations to be backward-compatible with the previous code version.
- **[Two secrets sets for migrations]** → GitHub needs `DATABASE_URL` for both environments (test/prod Supabase direct connection). These are separate from the Hyperdrive binding used at runtime. **Mitigation**: Document clearly in `.env.example` and workflow files. Use GitHub environment-scoped secrets.

## Migration Plan

1. **Create Cloudflare resources**: Two Pages projects, two Hyperdrive configs (test/prod), dashboard vars/secrets.
2. **Restructure monorepo**: Move `apps/server/src/*` → `apps/web/worker/*`. Move `migrations/` + `drizzle.config.ts` → `packages/api/`. Update `package.json` dependencies across workspaces.
3. **Rewrite Worker entry**: `apps/web/worker/index.ts` uses `fetchRequestHandler` directly. `db.ts` uses `env.HYPERDRIVE.connect()`. `context.ts` receives `env` binding.
4. **Configure Vite plugin**: Add `@cloudflare/vite-plugin` to `apps/web/vite.config.ts`. Create `apps/web/wrangler.jsonc` with assets config, Hyperdrive binding, and vars.
5. **Update local dev**: `.dev.vars` for local secrets. Single `vite dev` command. Verify Hyperdrive local mode connects to test Supabase.
6. **Update GitHub workflows**: Rewrite `deploy-test.yml` and `deploy-prod.yml` to run migrations (Node.js step) then `wrangler pages deploy`. Add `DATABASE_URL`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` as GitHub secrets.
7. **Delete old infrastructure**: Remove `Dockerfile`, `fly.prod.toml`, `fly.test.toml`, `apps/server/`.
8. **Decommission Fly apps**: After verifying Cloudflare deploys work, delete Fly apps.
9. **Update `.env.example`**: Document new local dev variables (`.dev.vars` format, no `DATABASE_URL` at runtime, no `PORT`).

**Rollback strategy**: If the Cloudflare migration fails mid-way, Fly apps remain running on the old infrastructure. Git changes can be reverted. No destructive database changes are needed — the schema is unchanged. Fly apps are decommissioned only after Cloudflare is verified.

## Open Questions

- **Hyperdrive local mode**: Does `wrangler dev` proxy Hyperdrive to the remote Supabase, or does it need a local connection string? Need to verify during implementation — `wrangler dev` supports Hyperdrive local mode with `localConnectionString` in `wrangler.jsonc`.
- **Vite plugin workspace imports**: Does `@cloudflare/vite-plugin` correctly bundle `@dnd-weekend/api` workspace dependency into the Worker? May need `optimizeDeps` or `ssr.noExternal` configuration. Spike during implementation.
- **Hyperdrive + `postgres-js` compatibility**: Hyperdrive's `.connect()` returns a connection that works with `postgres-js`. Need to confirm Drizzle's `drizzle-orm/postgres-js` accepts it without changes. Expected to work, but verify.
