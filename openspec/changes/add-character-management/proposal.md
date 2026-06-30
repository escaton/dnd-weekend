## Why

We need the foundation of a web app to play DnD with friends: Google sign-in, character storage, and the full toolchain to build, test, and deploy it. This establishes the project skeleton — repo structure, auth, data layer, CI/CD, and deployment — so that future features (rich character UI, file uploads) build on a solid base.

## What Changes

- **New monorepo** with pnpm workspaces: `apps/web` (Vite + React CSR), `apps/server` (Hono + Drizzle), `packages/api` (tRPC router definition, shared as type to client)
- **Google auth via Supabase** — combined sign-in/login: if no account exists, one is created on first Google sign-in
- **Character management** — create, list, and soft-delete characters. Each character is a loose jsonb `content` field for now; rich UI comes later
- **Database** — Supabase Postgres with Drizzle ORM, versioned migrations via `drizzle-kit`, `updated_at` managed by app (Drizzle)
- **CI** — GitHub Actions running lint (oxlint), unit tests (vitest), and typecheck on PRs and pushes to main
- **CD** — Docker image built by fly.io from source, deployed via `flyctl deploy`. Both test and prod deploys are manual `workflow_dispatch`. No runtime secrets in GitHub (only `FLY_API_TOKEN`). Two fly apps (test + prod) mapping to two Supabase projects (test + prod)
- **Server serves client** — single Docker image per env, Hono serves built React from `dist/` in prod. No CORS in prod (same origin); CORS enabled in dev only
- **Tooling** — TypeScript 7 RC, oxlint, oxfmt, precommit hooks, vitest

## Capabilities

### New Capabilities
- `user-auth`: Google sign-in/login via Supabase OAuth, JWT verification on server, combined account creation on first sign-in
- `character-management`: CRUD for characters (create, list, soft-delete) scoped to the authenticated user; character content is a loose jsonb field
- `app-infrastructure`: monorepo structure, build pipeline, CI/CD, Docker image, fly.io deployment, environments (test/prod)

### Modified Capabilities
<!-- None — this is a greenfield project. -->

## Impact

- **New code**: entire monorepo (`apps/web`, `apps/server`, `packages/api`, `drizzle/`)
- **External services**: Supabase (auth, postgres, storage/S3) × 2 envs, fly.io × 2 apps
- **Dependencies**: React, Vite, TanStack Router + Query, tRPC v11, Hono, Drizzle ORM, drizzle-kit, @supabase/supabase-js, zod, vitest, oxlint, oxfmt
- **CI/CD**: GitHub Actions workflows (ci, deploy-test, deploy-prod), Dockerfile (multi-stage), fly.toml (test + prod)
- **Auth**: server-only authz with Supabase secret key (no RLS); JWT verified via JWKS (asymmetric signing keys); `user_id` FK directly to `auth.users` (no mirror table)
