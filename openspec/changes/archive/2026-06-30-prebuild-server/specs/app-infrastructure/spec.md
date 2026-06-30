## MODIFIED Requirements

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

## ADDED Requirements

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
