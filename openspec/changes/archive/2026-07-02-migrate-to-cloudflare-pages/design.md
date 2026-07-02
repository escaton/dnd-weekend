## Context

The app is a pnpm monorepo with three workspaces: `apps/web` (Vite + React SPA), `apps/server` (Hono + Drizzle + tRPC), and `packages/api` (shared tRPC router + Drizzle schema). It deploys as a single Docker image to Fly.io, which serves static assets and the Hono API from one Node.js process. Supabase provides Postgres + Auth (JWT/JWKS). Two Fly apps (test + prod) each point at their own Supabase project. Migrations run as a Fly `release_command`.

The tRPC fetch adapter and `jose` JWT verification are already runtime-agnostic (Request/Response). Hono is used for CORS, static serving, SPA fallback, and routing — all of which Cloudflare's platform handles natively.

## Goals / Non-Goals

**Goals:**
- Move from Fly.io + Docker to Cloudflare Workers + Static Assets (static assets + Worker API in one deployment)
- Keep Drizzle ORM, tRPC, Supabase Auth — only the runtime and connection mechanism change
- Use Hyperdrive (free tier, 100k queries/day) for Postgres connection pooling
- Use `@cloudflare/vite-plugin` for local dev (single `vite dev`, workerd runtime, no CORS)
- Two Workers (test + prod), each with its own Hyperdrive config and Supabase project
- Migrations run in GitHub Actions as a pre-deploy gate (fail deploy if migrations fail)
- Free `*.<account-subdomain>.workers.dev` domains, HTTPS, global CDN

**Non-Goals:**
- Migrating away from Supabase (Postgres + Auth stay)
- Migrating away from Drizzle ORM
- Using preview deployments as the test environment (two separate Workers instead)
- Using PostgREST/HTTP driver (keeping `postgres-js` via Hyperdrive TCP)
- Adding a custom domain (using free `*.workers.dev` subdomains)

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

### 5. Migrations as pre-deploy gate in GitHub Actions via Supavisor pooler

**Choice**: Both `deploy-test.yml` and `deploy-prod.yml` workflows run `drizzle-kit migrate` (Node.js + `postgres-js`) before `wrangler deploy`. The `DATABASE_URL` GitHub secret contains the Supavisor **session pooler** connection string (IPv4), not the direct connection string (IPv6-only). If migrations fail, the workflow exits non-zero and the deploy step never runs.

**Why**: Supabase's direct database hostname (`db.[project-ref].supabase.co`) resolves to IPv6 only on the free tier. GitHub Actions runners have no IPv6 outbound. The Supavisor session pooler (`aws-[region].pooler.supabase.com:5432`) provides IPv4 connectivity and supports prepared statements (required by `drizzle-kit migrate`). The pooler hostname/region must be copied from the Supabase dashboard "Connect" button — it is not derivable from the project ref.

**Alternatives considered**:
- *Manual local migrations*: Developer runs `pnpm db:migrate` before deploy. Error-prone, no audit trail, no gate. Used temporarily while the pooler connection issue was being diagnosed.
- *Migration Worker*: Run migrations inside a Worker endpoint. Requires Hyperdrive or HTTP driver, adds complexity, and running DDL from an edge Worker is an anti-pattern.
- *`drizzle-kit push`*: Schema-to-DB diff without migration files. Loses migration history and auditability.
- *Supabase CLI (`supabase db push`)*: Uses a separate migration tracking system incompatible with Drizzle's `drizzle` schema migration journal. Would require maintaining two sets of migration files.

### 6. Two Workers, two manual workflows

**Choice**: Create two Cloudflare Workers (`dnd-weekend-test`, `dnd-weekend`). Two GitHub Actions workflows (`deploy-test`, `deploy-prod`), both `workflow_dispatch`. Each runs migrations against its environment's Supabase DB, then deploys its Worker via `wrangler deploy`. Each Worker has its own Hyperdrive binding (pointing at test/prod Supabase) and its own dashboard vars/secrets.

**Why**: Mirrors the current Fly setup (two apps, two manual workflows). Provides stable, predictable URLs (`dnd-weekend-test.<account-subdomain>.workers.dev`, `dnd-weekend.<account-subdomain>.workers.dev`). No ambiguity about which environment a deployment targets.

**Alternatives considered**:
- *Preview deployments as test env*: Simpler but no stable test URL. Each PR gets a unique hash-based URL. Not suitable for a shared test environment.
- *Production branch git-ops*: Push to `main` → test, merge to `production` → prod. Less control over deploy timing.

### 7. Move migrations and drizzle config to `packages/api`

**Choice**: Move `migrations/` and `drizzle.config.ts` from `apps/server/` to `packages/api/`. The schema already lives in `packages/api/src/db/schema.ts`. Migrations belong with the schema they're derived from. CI runs `drizzle-kit migrate --config packages/api/drizzle.config.ts` using `DATABASE_URL` from GitHub secrets.

**Why**: Co-locating schema and migrations in the shared package keeps the data layer cohesive. Both `apps/web/worker` (runtime Drizzle) and CI (migration runner) import from `packages/api`.

### 8. Runtime injection of Supabase config into the client

**Choice**: The Worker intercepts all requests via `run_worker_first: true`. API routes (`/api/*`) go to the tRPC handler. All other requests are fetched via the `ASSETS` binding. If the response is HTML (`Content-Type: text/html`), the Worker injects a `<script>` setting `window.__SUPABASE__ = { url, key }` from `env.SUPABASE_URL` and `env.SUPABASE_PUBLISHABLE_KEY` into `<head>` before returning. Non-HTML responses (JS, CSS, images) pass through unmodified. The client reads `window.__SUPABASE__` instead of `import.meta.env.VITE_SUPABASE_*`.

**Why**: Today the Supabase URL and publishable key are baked into the client bundle at build time via Vite's `import.meta.env`. This couples the build to a specific environment — the prod deploy workflow rebuilds but does not set `VITE_SUPABASE_*`, so the prod client bundle silently talks to the **test** Supabase project. Runtime injection decouples the build from the environment: the same artifact deploys to test and prod, and the Worker supplies the correct per-environment values from its bindings. This also gives a single source of truth (`wrangler.jsonc` vars) for both the Worker (JWT/JWKS verification) and the client (Supabase auth SDK). Using `run_worker_first: true` with a Content-Type check (rather than a path whitelist) ensures injection works for all client-side routes (e.g., `/characters`) via SPA fallback, not just `/` and `/index.html`.

**Alternatives considered**:
- *Keep build-time injection, set `VITE_SUPABASE_*` in the prod workflow*: Fixes the immediate bug but keeps two sources of truth (`.env` for client, `wrangler.jsonc` for Worker) and requires a rebuild per environment. Reintroduces the same footgun for any future environment.
- *Client fetches config from a `/api/config` endpoint*: Adds a round-trip before the client can initialize Supabase. The Worker already has the values at request time — injecting them into the HTML avoids the extra request and works on first paint.
- *Path whitelist (`run_worker_first: ["/", "/index.html"]`)*: Fragile — breaks for client-side routes like `/characters` served via SPA fallback. Duplicates the path list between `wrangler.jsonc` and Worker code. Rejected.
- *Cloudflare Pages environment variables / `pagesBuildData`*: Pages-specific; we deploy Workers, not Pages.

**Risks / Trade-offs**:
- HTML is no longer served as a static asset for `/` — the Worker runs on every page load. CPU cost is negligible (string interpolation on a small file). Non-HTML assets still serve statically without invoking the Worker.
- Local dev (`vite dev`) serves `index.html` via the Vite dev server, not the Worker, so `window.__SUPABASE__` is undefined. **Open question** — how to provide it in local dev. Candidates: a Vite plugin that injects the script from `.dev.vars`/`.env` during dev, or letting the Worker handle `/` even in dev via the Vite plugin's workerd runtime. Deferred to a follow-up change; local dev can use a temporary shim until then.
- The publishable key is safe in the client by design (it is *publishable*). The win is build portability and single-source-of-truth, not secrecy.

### 9. Wrangler environments for per-environment config (env.prod block)

**Choice**: Use a single `wrangler.jsonc` with both test and prod as named wrangler environments (`env.test`, `env.prod`). The top level contains only shared config (`main`, `compatibility_date`, `compatibility_flags`, `assets`, `observability`) — no environment-specific values. Each environment block specifies its own `name`, `hyperdrive` array, and `vars`. Both deploy workflows set `CLOUDFLARE_ENV` at build time (`CLOUDFLARE_ENV=test` / `CLOUDFLARE_ENV=prod`), and the Vite plugin flattens the selected environment into the output `wrangler.json`. The dev script uses `CLOUDFLARE_ENV=test vite` for local development.

**Why**: Previously, test was the top-level default and prod was an `env.prod` override. This was asymmetric — test was implicit, prod was explicit. Making both environments named provides symmetry and clarity: neither is the "default", both are explicit selections. The top-level contains only truly shared config. Both workflows are identical except for `CLOUDFLARE_ENV` and the `DATABASE_URL` secret. The previous `deploy-prod.yml` used an inline `node -e` script to mutate the built config — now eliminated.

**Alternatives considered**:
- *Multiple config files* (`wrangler.jsonc` + `wrangler.prod.jsonc`, selected via `CLOUDFLARE_VITE_WRANGLER_CONFIG_PATH`): Works but duplicates all shared fields (main, compat, flags, assets, observability) across two files. Drift risk on every config change. Rejected for DRY.
- *Programmatic config* (`config` option in `vite.config.ts` reading env vars): Works but Cloudflare's docs say this is "primarily for frameworks and plugin developers" — fights the tool's guidance. Rejected for tooling alignment.
- *CLI flags* (`--var key:value`, `--name`): `--var` overrides vars at deploy time, but there is no CLI flag for Hyperdrive binding ID. Would require a mix of CLI flags and config file, splitting config across two places. Rejected for fragmentation.
- *Keep the `node -e` mutation*: Functional but fragile and opaque. Rejected.

**Risks / Trade-offs**:
- **`name` override**: In standard wrangler, `name` is non-inheritable and must be explicitly set per environment. The `env.prod.name` field must be verified to flatten correctly into the output config. Spike task covers this.
- **`hyperdrive` override**: The entire `hyperdrive` array is non-inheritable — `env.prod` must specify the full array with the prod Hyperdrive ID, not just the ID. Spike task verifies this flattens correctly.
- **Secrets**: Secrets are not in the config file at all. They are injected via `wrangler secret put` in the workflow (or the Cloudflare dashboard). The config file only declares non-secret vars and binding IDs.

## Risks / Trade-offs

- **[Hyperdrive free tier quota]** → 100k queries/day. If exceeded, DB operations fail with an error. **Mitigation**: Monitor usage in Cloudflare dashboard. For a personal D&D tool, expected usage is far below the limit. If needed later, upgrade to Workers Paid ($5/mo) for unlimited queries.
- **[Worker CPU time limits]** → Workers Free plan has 10ms CPU time per request. tRPC + Drizzle + JWT verification should fit, but complex queries or slow Supabase responses could approach limits. **Mitigation**: CPU time is compute, not wall clock — waiting on Hyperdrive/Supabase doesn't count. Monitor via Cloudflare analytics.
- **[Vite plugin monorepo edge cases]** → `@cloudflare/vite-plugin` is GA but relatively new. Workspace imports (`@dnd-weekend/api`) in the Worker bundle may need validation. **Mitigation**: Spike during implementation — if workspace resolution fails, configure the plugin's `wrangler.jsonc` `main` path explicitly.
- **[Hyperdrive cold starts]** → First request after idle may be slower as Hyperdrive establishes connections. **Mitigation**: Hyperdrive caches connections; subsequent requests are fast. Acceptable for a personal tool.
- **[No release_command equivalent]** → Migrations are decoupled from the deploy. A failed migration leaves the old site running (safe), but a successful migration followed by a failed deploy leaves the DB ahead of the code. **Mitigation**: Migrations are additive (Drizzle generates forward-only SQL). Write migrations to be backward-compatible with the previous code version.
- **[Two secrets sets for migrations]** → GitHub needs `DATABASE_URL` for both environments (test/prod Supabase direct connection). These are separate from the Hyperdrive binding used at runtime. **Mitigation**: Document clearly in `.env.example` and workflow files. Use GitHub environment-scoped secrets.

## Migration Plan

1. **Create Cloudflare resources**: Two Workers, two Hyperdrive configs (test/prod), dashboard vars/secrets.
2. **Restructure monorepo**: Move `apps/server/src/*` → `apps/web/worker/*`. Move `migrations/` + `drizzle.config.ts` → `packages/api/`. Update `package.json` dependencies across workspaces.
3. **Rewrite Worker entry**: `apps/web/worker/index.ts` uses `fetchRequestHandler` directly. `db.ts` uses `env.HYPERDRIVE.connect()`. `context.ts` receives `env` binding.
4. **Configure Vite plugin**: Add `@cloudflare/vite-plugin` to `apps/web/vite.config.ts`. Create `apps/web/wrangler.jsonc` with assets config, Hyperdrive binding, and vars.
5. **Update local dev**: `.dev.vars` for local secrets. Single `vite dev` command. Verify Hyperdrive local mode connects to test Supabase.
6. **Update GitHub workflows**: Rewrite `deploy-test.yml` and `deploy-prod.yml` to run migrations (Node.js step) then `wrangler deploy`. Add `DATABASE_URL`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` as GitHub secrets.
7. **Delete old infrastructure**: Remove `Dockerfile`, `fly.prod.toml`, `fly.test.toml`, `apps/server/`.
8. **Decommission Fly apps**: After verifying Cloudflare deploys work, delete Fly apps.
9. **Update `.env.example`**: Document new local dev variables (`.dev.vars` format, no `DATABASE_URL` at runtime, no `PORT`).

**Rollback strategy**: If the Cloudflare migration fails mid-way, Fly apps remain running on the old infrastructure. Git changes can be reverted. No destructive database changes are needed — the schema is unchanged. Fly apps are decommissioned only after Cloudflare is verified.

## Open Questions

- **Hyperdrive local mode**: Does `wrangler dev` proxy Hyperdrive to the remote Supabase, or does it need a local connection string? Need to verify during implementation — `wrangler dev` supports Hyperdrive local mode with `localConnectionString` in `wrangler.jsonc`.
- **Vite plugin workspace imports**: Does `@cloudflare/vite-plugin` correctly bundle `@dnd-weekend/api` workspace dependency into the Worker? May need `optimizeDeps` or `ssr.noExternal` configuration. Spike during implementation.
- **Hyperdrive + `postgres-js` compatibility**: Hyperdrive's `.connect()` returns a connection that works with `postgres-js`. Need to confirm Drizzle's `drizzle-orm/postgres-js` accepts it without changes. Expected to work, but verify.
- **Local dev Supabase config injection**: Resolved — the Vite plugin runs the Worker via workerd in dev mode, so `HTMLRewriter` injects `window.__SUPABASE__` from `env.test.vars` locally. `CLOUDFLARE_ENV=test` is set in `.env` and passed through via `loadEnv` in `vite.config.ts`. No shim needed.
