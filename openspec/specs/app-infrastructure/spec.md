

### Requirement: pnpm monorepo structure

The project SHALL be a pnpm monorepo with workspaces. It SHALL contain `apps/web` (Vite + React client), `apps/server` (Hono + Drizzle + tRPC server), and `packages/api` (tRPC router definition shared between client and server). The client SHALL import the router as a type-only import to avoid leaking server runtime code into the client bundle.

#### Scenario: Developer runs the project locally
- **WHEN** a developer runs the dev startup command
- **THEN** the Vite dev server SHALL start on port 5173 with HMR
- **AND** the Hono server SHALL start on port 3000
- **AND** API calls from the Vite dev server SHALL be proxied to the Hono server

### Requirement: TypeScript strict mode

The project SHALL use TypeScript 7 RC with strict mode enabled across all workspaces. All packages SHALL share a common `tsconfig` base with strict settings.

#### Scenario: Typecheck runs in CI
- **WHEN** CI runs the typecheck command
- **THEN** all workspaces SHALL be typechecked with strict mode
- **AND** any type error SHALL fail the CI run

### Requirement: Linting with oxlint

The project SHALL use oxlint for linting across all workspaces. Linting SHALL run in CI and as a precommit hook.

#### Scenario: Lint runs in CI
- **WHEN** CI runs the lint command
- **THEN** oxlint SHALL check all source files
- **AND** any lint error SHALL fail the CI run

### Requirement: Formatting with oxfmt

The project SHALL use oxfmt for code formatting. Formatting SHALL be enforced via a precommit hook that formats staged files, and SHALL be verified in CI so that unformatted code cannot be merged even when local hooks are bypassed. The CI format check SHALL run `oxfmt --check .` (read-only) and SHALL fail the CI run on any unformatted file. oxfmt SHALL ignore non-source docs (`openspec/**` and `.opencode/**`) via `.oxfmtrc.json` `ignorePatterns`, mirroring the oxlint ignore patterns.

#### Scenario: Developer commits unformatted code
- **WHEN** a developer stages and commits files that are not formatted per oxfmt
- **THEN** the precommit hook SHALL format the staged files before the commit completes

#### Scenario: Format check runs in CI
- **WHEN** CI runs the format check command on a pull request or push to `main`
- **THEN** oxfmt SHALL check all source files in `--check` mode
- **AND** any unformatted file SHALL fail the CI run

### Requirement: Unit tests with vitest

The project SHALL use vitest for unit tests. Tests SHALL run in CI on PRs and pushes to main.

#### Scenario: Tests run in CI
- **WHEN** CI runs the test command
- **THEN** vitest SHALL execute all unit tests
- **AND** any failing test SHALL fail the CI run

### Requirement: CI pipeline on GitHub Actions

The project SHALL have a GitHub Actions CI workflow that runs lint, typecheck, and unit tests. The workflow SHALL trigger on pull requests and on pushes to the main branch.

#### Scenario: Pull request opened
- **WHEN** a pull request is opened or updated
- **THEN** the CI workflow SHALL run lint, typecheck, and unit tests

#### Scenario: Push to main
- **WHEN** a commit is pushed to the main branch
- **THEN** the CI workflow SHALL run lint, typecheck, and unit tests

### Requirement: Docker image built by fly.io

The project SHALL have a multi-stage Dockerfile that builds the client and server into a single image. The builder stage SHALL prebuild the client (via `vite build`) and the server (via esbuild bundle to a single ESM file). The runtime stage SHALL run the server with `node dist/index.js` — not `tsx`. VITE build arguments (publishable keys, safe for client) SHALL be passed via `fly.toml` `[build] args`. No runtime secrets SHALL be stored in GitHub — only `FLY_API_TOKEN` (a deploy credential).

#### Scenario: Image built by fly.io during deploy
- **WHEN** the deploy workflow runs `flyctl deploy --config fly.toml`
- **THEN** fly.io SHALL build the Docker image from source using the Dockerfile
- **AND** the builder stage SHALL prebuild the web client via `vite build`
- **AND** the builder stage SHALL prebuild the server via esbuild to `dist/index.js`
- **AND** the runtime stage SHALL start the server with `node dist/index.js`
- **AND** VITE build arguments SHALL be passed from `fly.toml` `[build] args`
- **AND** runtime secrets SHALL be provided via fly secrets (not GitHub secrets)

### Requirement: Test environment deploys via manual dispatch

The project SHALL have a deploy-test GitHub Actions workflow that triggers via manual `workflow_dispatch`. It SHALL run `flyctl deploy --config fly.test.toml` which builds the image on fly.io and deploys to the test fly app.

#### Scenario: Manual test deploy
- **WHEN** a user manually triggers the deploy-test workflow
- **THEN** the workflow SHALL run `flyctl deploy --config fly.test.toml`
- **AND** fly.io SHALL build the image from source and deploy to the dnd-weekend-test fly app

### Requirement: Production environment deploys via manual dispatch

The project SHALL have a deploy-prod GitHub Actions workflow that triggers via manual `workflow_dispatch` with an optional commit SHA input. It SHALL run `flyctl deploy --config fly.prod.toml` which builds the image on fly.io and deploys to the prod fly app.

#### Scenario: Manual production deploy
- **WHEN** a user manually triggers the deploy-prod workflow
- **THEN** the workflow SHALL check out the specified commit (or latest main)
- **AND** SHALL run `flyctl deploy --config fly.prod.toml`
- **AND** fly.io SHALL build the image from source and deploy to the dnd-weekend-prod fly app

### Requirement: Rollback via flyctl

The system SHALL support rollback by running `flyctl deploy --rollback --config fly.toml` which reverts to the previous release. No image registry or manual SHA tagging is required.

#### Scenario: Rollback to a previous version
- **WHEN** a user runs `flyctl deploy --rollback --config fly.toml`
- **THEN** the fly app SHALL revert to the previous release
- **AND** the app SHALL serve the previous version

### Requirement: Health check endpoint

The server SHALL expose a `/healthz` endpoint that returns a 200 status with a JSON body `{ "ok": true }`. This endpoint SHALL be used by fly.io for health checks.

#### Scenario: Health check request
- **WHEN** a request is made to `/healthz`
- **THEN** the server SHALL respond with 200 and `{ "ok": true }`

### Requirement: Two deployment environments

The project SHALL have two deployment environments: test and prod. Each environment SHALL have its own Supabase project (auth, postgres, storage) and its own fly.io app. Environment-specific configuration SHALL be provided via environment variables on fly.io and via `.env` files locally.

#### Scenario: Test environment configuration
- **WHEN** the test fly app runs
- **THEN** it SHALL connect to the test Supabase project using environment variables provided by fly secrets

#### Scenario: Production environment configuration
- **WHEN** the prod fly app runs
- **THEN** it SHALL connect to the prod Supabase project using environment variables provided by fly secrets

#### Scenario: Local development configuration
- **WHEN** a developer runs the project locally
- **THEN** the server SHALL connect to the test Supabase project using credentials from a `.env` file
- **AND** the `.env` file SHALL be gitignored
- **AND** a `.env.example` file SHALL be checked in documenting all required environment variables

### Requirement: Server prebuilt for production

The server SHALL be prebuilt to compiled JavaScript before deployment. In production, the server SHALL run via `node dist/index.js` using a single ESM bundle produced by esbuild. The `@dnd-weekend/api` package source SHALL be inlined into the server bundle at build time. The dev workflow SHALL remain unchanged — `tsx watch` with runtime transpilation and HMR.

#### Scenario: Production server startup
- **WHEN** the server starts in production
- **THEN** it SHALL run via `node dist/index.js`
- **AND** no TypeScript transpiler SHALL be loaded at runtime
- **AND** the server SHALL serve requests without the memory overhead of a JIT transpiler

#### Scenario: Development server startup
- **WHEN** a developer runs the dev command
- **THEN** the server SHALL run via `tsx watch` with runtime transpilation
- **AND** HMR SHALL reload the server on file changes

#### Scenario: Server build command
- **WHEN** the server build command is run
- **THEN** esbuild SHALL bundle `apps/server/src/index.ts` and all dependencies (including `@dnd-weekend/api` source) into a single ESM file at `apps/server/dist/index.js`
- **AND** the bundle SHALL target `--platform=node` so Node builtins are externalized
- **AND** the bundle SHALL use `--format=esm` matching the project's module system

### Requirement: Database connection pool sized for small VMs

The server's Postgres connection pool SHALL be sized conservatively for small VM environments. The pool max SHALL be 3 connections, sufficient for the fly.io concurrency limits without excessive memory overhead.

#### Scenario: Connection pool configuration
- **WHEN** the server creates a Postgres connection pool
- **THEN** the pool SHALL have a maximum of 3 connections
- **AND** the pool SHALL not exceed the memory budget of a 256 MB VM

### Requirement: Verification uses spec-defined debug user

Verification tasks and automated tests that require authentication SHALL use the debug user credentials documented in the `user-auth` spec (`debug@dnd-weekend.local` / `111111`). Verification SHALL NOT create temporary users via the Supabase admin API.

#### Scenario: Authenticated API verification
- **WHEN** a verification task needs to test an authenticated API endpoint
- **THEN** it SHALL sign in using the debug user credentials from the spec
- **AND** it SHALL NOT create a temporary user via the Supabase admin API

#### Scenario: Browser-based verification
- **WHEN** a verification task needs to test the app in a browser
- **THEN** it SHALL use `window.__debugLogin` with the debug user credentials
- **AND** it SHALL NOT create a temporary user via the Supabase admin API
