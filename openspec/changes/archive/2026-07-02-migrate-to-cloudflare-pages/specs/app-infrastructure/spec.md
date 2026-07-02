## MODIFIED Requirements

### Requirement: pnpm monorepo structure

The project SHALL be a pnpm monorepo with workspaces. It SHALL contain `apps/web` (Vite + React client + Worker API) and `packages/api` (tRPC router definition and Drizzle schema shared between client and Worker). The Worker entry point SHALL live at `apps/web/worker/index.ts`. The client SHALL import the router as a type-only import to avoid leaking server runtime code into the client bundle.

#### Scenario: Developer runs the project locally
- **WHEN** a developer runs the dev startup command
- **THEN** the Vite dev server SHALL start with HMR
- **AND** the Workers runtime SHALL run locally via workerd
- **AND** the Worker API SHALL be served on the same origin as the Vite dev server
- **AND** no CORS configuration SHALL be needed in development

### Requirement: Test environment deploys via manual dispatch

The project SHALL have a deploy-test GitHub Actions workflow that triggers via manual `workflow_dispatch`. The workflow SHALL first run database migrations against the test Supabase Postgres using `drizzle-kit migrate` (Node.js + `postgres-js` over the Supavisor session pooler, which provides IPv4 connectivity). If migrations fail, the workflow SHALL exit and the deploy SHALL NOT proceed. If migrations succeed, the workflow SHALL run `CLOUDFLARE_ENV=test vite build` (flattening the `env.test` block) and then `wrangler deploy` to deploy the test Cloudflare Worker (`dnd-weekend-test`). The `DATABASE_URL` GitHub secret SHALL contain the Supavisor session pooler connection string (IPv4), not the direct connection string (IPv6-only).

#### Scenario: Manual test deploy with migration gate
- **WHEN** a user manually triggers the deploy-test workflow
- **THEN** the workflow SHALL run `drizzle-kit migrate` against the test Supabase database using `DATABASE_URL` from GitHub secrets (Supavisor session pooler, IPv4)
- **AND** if migrations fail, the workflow SHALL exit without deploying
- **AND** if migrations succeed, the workflow SHALL run `CLOUDFLARE_ENV=test vite build` and `wrangler deploy --config <path> --name dnd-weekend-test` to deploy the dnd-weekend-test Worker

### Requirement: Production environment deploys via manual dispatch

The project SHALL have a deploy-prod GitHub Actions workflow that triggers via manual `workflow_dispatch` with an optional commit SHA input. The workflow SHALL check out the specified commit (or latest main). The workflow SHALL first run database migrations against the prod Supabase Postgres using `drizzle-kit migrate` (Node.js + `postgres-js` over the Supavisor session pooler, which provides IPv4 connectivity). If migrations fail, the workflow SHALL exit and the deploy SHALL NOT proceed. If migrations succeed, the workflow SHALL run `CLOUDFLARE_ENV=prod vite build` (the Vite plugin flattens the `env.prod` block into the output config) and then `wrangler deploy` to deploy the prod Cloudflare Worker (`dnd-weekend`). The `DATABASE_URL` GitHub secret SHALL contain the Supavisor session pooler connection string (IPv4), not the direct connection string (IPv6-only).

#### Scenario: Manual production deploy with migration gate
- **WHEN** a user manually triggers the deploy-prod workflow
- **THEN** the workflow SHALL check out the specified commit (or latest main)
- **AND** the workflow SHALL run `drizzle-kit migrate` against the prod Supabase database using `DATABASE_URL` from GitHub secrets (Supavisor session pooler, IPv4)
- **AND** if migrations fail, the workflow SHALL exit without deploying
- **AND** if migrations succeed, the workflow SHALL run `CLOUDFLARE_ENV=prod vite build` and `wrangler deploy --config <path> --name dnd-weekend` to deploy the dnd-weekend Worker

### Requirement: Two deployment environments

The project SHALL have two deployment environments: test and prod. Each environment SHALL have its own Supabase project (auth, postgres, storage), its own Cloudflare Worker, and its own Hyperdrive config pointing at the environment's Supabase Postgres. All non-secret per-environment configuration (Worker name, Hyperdrive ID, Supabase URL, Supabase publishable key) SHALL live in a single `wrangler.jsonc` using named wrangler environments — `env.test` and `env.prod`. The top level SHALL contain only shared config (`main`, `compatibility_date`, `compatibility_flags`, `assets`, `observability`). Secrets SHALL be injected via `wrangler secret put` in the deploy workflow or via the Cloudflare dashboard, never in config files. Each Worker SHALL serve on a free `*.<account-subdomain>.workers.dev` subdomain with HTTPS, where `<account-subdomain>` is the account's workers.dev subdomain (currently `escaton`).

#### Scenario: Test environment configuration
- **WHEN** the test Worker is built and deployed
- **THEN** the workflow SHALL run `CLOUDFLARE_ENV=test vite build` (flattening the `env.test` block)
- **AND** the Worker SHALL connect to the test Supabase Postgres via the test Hyperdrive binding
- **AND** non-secret vars (SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) SHALL come from the `env.test.vars` block in `wrangler.jsonc`

#### Scenario: Production environment configuration
- **WHEN** the prod Worker is built and deployed
- **THEN** the workflow SHALL run `CLOUDFLARE_ENV=prod vite build` (flattening the `env.prod` block)
- **AND** the Worker SHALL connect to the prod Supabase Postgres via the prod Hyperdrive binding
- **AND** non-secret vars (SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) SHALL come from the `env.prod.vars` block in `wrangler.jsonc`
- **AND** secrets SHALL be injected via `wrangler secret put` in the workflow, not from config files

#### Scenario: Local development configuration
- **WHEN** a developer runs the project locally
- **THEN** the Worker SHALL connect to the test Supabase Postgres via Hyperdrive local mode
- **AND** local secrets SHALL be read from a `.dev.vars` file
- **AND** the `.dev.vars` file SHALL be gitignored
- **AND** a `.env.example` file SHALL be checked in documenting all required environment variables
- **AND** `DATABASE_URL` SHALL NOT be required at runtime (Hyperdrive manages the connection); it SHALL only be used by the migration runner in CI

## REMOVED Requirements

### Requirement: Docker image built by fly.io

**Reason**: The project no longer uses Docker or Fly.io. Static assets are served by Cloudflare's CDN and the API runs as a Worker.
**Migration**: Build and deploy are now handled by Vite + wrangler. The `Dockerfile`, `fly.prod.toml`, and `fly.test.toml` files are deleted.

### Requirement: Health check endpoint

**Reason**: Cloudflare Workers does not require a custom health check endpoint. The platform handles availability monitoring.
**Migration**: The `/healthz` endpoint is removed. No replacement is needed.

### Requirement: Server prebuilt for production

**Reason**: There is no separate Node.js server. The API runs as a Cloudflare Worker, built by Vite + wrangler, not esbuild.
**Migration**: See the ADDED requirement "Worker build for production" for the new build process.

### Requirement: Database connection pool sized for small VMs

**Reason**: Hyperdrive manages connection pooling. The application no longer configures pool sizes.
**Migration**: See the ADDED requirement "Database connection via Hyperdrive" for the new connection mechanism.

### Requirement: Rollback via flyctl

**Reason**: Fly.io is no longer the deployment platform. Rollback is handled by Cloudflare.
**Migration**: See the ADDED requirement "Rollback via Cloudflare" for the new rollback mechanism.

## ADDED Requirements

### Requirement: Worker build for production

The Worker API SHALL be built by Vite with `@cloudflare/vite-plugin` as part of the `apps/web` build. The build SHALL produce static assets in the Vite output directory and a Worker bundle handled by wrangler. The `@dnd-weekend/api` package source SHALL be bundled into the Worker at build time. No TypeScript transpiler SHALL be loaded at runtime — the Worker runs prebuilt JavaScript. The dev workflow SHALL use Vite's dev server with the Workers runtime (workerd) for local development with HMR.

#### Scenario: Production build
- **WHEN** the build command runs
- **THEN** Vite SHALL build the React client to static assets
- **AND** the Vite plugin SHALL bundle the Worker entry at `apps/web/worker/index.ts` with all dependencies (including `@dnd-weekend/api` source) into a Worker bundle
- **AND** wrangler SHALL use the generated output configuration for deployment

#### Scenario: Development server startup
- **WHEN** a developer runs the dev command
- **THEN** Vite SHALL start with the Workers runtime via workerd
- **AND** HMR SHALL reload both the client and the Worker on file changes

### Requirement: Database connection via Hyperdrive

The Worker SHALL connect to Supabase Postgres via a Hyperdrive binding (`env.HYPERDRIVE`). Hyperdrive SHALL manage connection pooling and query caching. The Drizzle ORM SHALL use `drizzle-orm/postgres-js` with the connection from `env.HYPERDRIVE.connect()`. No `DATABASE_URL` environment variable SHALL be required at Worker runtime — the connection is managed by the Hyperdrive binding configured per Worker. Migrations SHALL bypass Hyperdrive and connect directly to Postgres using `DATABASE_URL` via `postgres-js` over TCP from a Node.js environment (GitHub Actions).

#### Scenario: Worker database connection
- **WHEN** the Worker handles a request requiring database access
- **THEN** it SHALL obtain a connection from `env.HYPERDRIVE.connect()`
- **AND** Drizzle SHALL use the connection for queries
- **AND** Hyperdrive SHALL manage pooling and caching

#### Scenario: Migration database connection
- **WHEN** the migration runner executes in CI
- **THEN** it SHALL connect to Supabase Postgres directly using `DATABASE_URL` via `postgres-js` over TCP
- **AND** it SHALL NOT use Hyperdrive
- **AND** `DATABASE_URL` SHALL be provided as a GitHub secret scoped to the deploy environment

### Requirement: Rollback via Cloudflare

The system SHALL support rollback via Cloudflare Workers versions rollback. A rollback reverts the Worker to a previous version. Rollback SHALL be performed via `wrangler rollback` or the Cloudflare dashboard. No image registry or manual SHA tagging is required.

#### Scenario: Rollback to a previous version
- **WHEN** a user runs `wrangler rollback`
- **THEN** the Worker SHALL revert to the previous version
- **AND** the site SHALL serve the previous version

### Requirement: Runtime injection of Supabase client config

The Supabase URL and publishable key SHALL be provided to the client at request time by the Worker, not baked into the client bundle at build time. The Worker SHALL run first for all routes except hashed assets (`run_worker_first: ["/*", "!/assets/*"]`). API routes (`/api/*`) SHALL be handled by the tRPC handler. All other requests SHALL be fetched via the `ASSETS` binding. The Worker SHALL use `HTMLRewriter` to inject `window.__SUPABASE__ = { url, key }` from `env.SUPABASE_URL` and `env.SUPABASE_PUBLISHABLE_KEY` into the `<head>` element of HTML responses. Non-HTML responses (served directly from assets, bypassing the Worker) SHALL pass through unmodified. The client SHALL read Supabase configuration from `window.__SUPABASE__`, not from `import.meta.env.VITE_SUPABASE_*`. The build artifact SHALL be environment-agnostic — the same build SHALL deploy to test and prod without rebuilding. `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` SHALL NOT be required at build time. Local dev works via the Vite plugin's workerd runtime, which runs the Worker (including `HTMLRewriter` injection) in development mode.

#### Scenario: Client receives Supabase config at runtime
- **WHEN** a browser requests any path (including client-side routes like `/characters`)
- **THEN** the Worker SHALL fetch the response via the `ASSETS` binding
- **AND** the Worker SHALL use `HTMLRewriter` to inject `window.__SUPABASE__` from `env.SUPABASE_URL` and `env.SUPABASE_PUBLISHABLE_KEY` into the `<head>` element
- **AND** hashed assets under `/assets/*` SHALL bypass the Worker and be served directly
- **AND** the client SHALL initialize the Supabase client from `window.__SUPABASE__`

#### Scenario: Environment-agnostic build
- **WHEN** the build command runs
- **THEN** the client bundle SHALL NOT contain a hardcoded Supabase URL or publishable key
- **AND** the same build output SHALL be deployable to both test and prod without rebuilding
- **AND** the Worker SHALL supply per-environment values from its bindings at request time
