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

The project SHALL have a deploy-test GitHub Actions workflow that triggers via manual `workflow_dispatch`. The workflow SHALL first run database migrations against the test Supabase Postgres using `drizzle-kit migrate` (Node.js + `postgres-js` over the Supavisor session pooler, which provides IPv4 connectivity). If migrations fail, the workflow SHALL exit and the deploy SHALL NOT proceed. If migrations succeed, the workflow SHALL run `wrangler deploy` to deploy to the test Cloudflare Pages project (`dnd-weekend-test`). The `DATABASE_URL` GitHub secret SHALL contain the Supavisor session pooler connection string (IPv4), not the direct connection string (IPv6-only).

#### Scenario: Manual test deploy with migration gate
- **WHEN** a user manually triggers the deploy-test workflow
- **THEN** the workflow SHALL run `drizzle-kit migrate` against the test Supabase database using `DATABASE_URL` from GitHub secrets (Supavisor session pooler, IPv4)
- **AND** if migrations fail, the workflow SHALL exit without deploying
- **AND** if migrations succeed, the workflow SHALL run `wrangler deploy` to deploy to the dnd-weekend-test Pages project

### Requirement: Production environment deploys via manual dispatch

The project SHALL have a deploy-prod GitHub Actions workflow that triggers via manual `workflow_dispatch` with an optional commit SHA input. The workflow SHALL check out the specified commit (or latest main). The workflow SHALL first run database migrations against the prod Supabase Postgres using `drizzle-kit migrate` (Node.js + `postgres-js` over the Supavisor session pooler, which provides IPv4 connectivity). If migrations fail, the workflow SHALL exit and the deploy SHALL NOT proceed. If migrations succeed, the workflow SHALL run `wrangler deploy` to deploy to the prod Cloudflare Pages project (`dnd-weekend`). The `DATABASE_URL` GitHub secret SHALL contain the Supavisor session pooler connection string (IPv4), not the direct connection string (IPv6-only).

### Requirement: Two deployment environments

The project SHALL have two deployment environments: test and prod. Each environment SHALL have its own Supabase project (auth, postgres, storage), its own Cloudflare Pages project, and its own Hyperdrive config pointing at the environment's Supabase Postgres. Environment-specific configuration SHALL be provided via Cloudflare dashboard vars and secrets (non-secret vars and bindings) and via `.dev.vars` files locally. Each Pages project SHALL serve on a free `*.pages.dev` subdomain with HTTPS.

#### Scenario: Test environment configuration
- **WHEN** the test Pages project runs
- **THEN** it SHALL connect to the test Supabase Postgres via the test Hyperdrive binding
- **AND** non-secret vars (SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) SHALL be set via the Cloudflare dashboard
- **AND** secret vars (SUPABASE_SECRET_KEY) SHALL be set via the Cloudflare dashboard

#### Scenario: Production environment configuration
- **WHEN** the prod Pages project runs
- **THEN** it SHALL connect to the prod Supabase Postgres via the prod Hyperdrive binding
- **AND** non-secret vars (SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) SHALL be set via the Cloudflare dashboard
- **AND** secret vars (SUPABASE_SECRET_KEY) SHALL be set via the Cloudflare dashboard

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

**Reason**: Cloudflare Pages does not require a custom health check endpoint. The platform handles availability monitoring.
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

The Worker SHALL connect to Supabase Postgres via a Hyperdrive binding (`env.HYPERDRIVE`). Hyperdrive SHALL manage connection pooling and query caching. The Drizzle ORM SHALL use `drizzle-orm/postgres-js` with the connection from `env.HYPERDRIVE.connect()`. No `DATABASE_URL` environment variable SHALL be required at Worker runtime — the connection is managed by the Hyperdrive binding configured per Pages project. Migrations SHALL bypass Hyperdrive and connect directly to Postgres using `DATABASE_URL` via `postgres-js` over TCP from a Node.js environment (GitHub Actions).

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

The system SHALL support rollback via Cloudflare Pages deployment rollback. A rollback reverts the Pages project to the previous deployment. Rollback SHALL be performed via `wrangler pages deployment rollback` or the Cloudflare dashboard. No image registry or manual SHA tagging is required.

#### Scenario: Rollback to a previous deployment
- **WHEN** a user runs `wrangler pages deployment rollback`
- **THEN** the Pages project SHALL revert to the previous deployment
- **AND** the site SHALL serve the previous version
