## Context

Greenfield project — a web app for playing DnD with friends. No existing code, no existing specs. This change establishes the entire foundation: repo structure, auth, data layer, CI/CD, and deployment. The decisions captured here emerged from an exploration session and represent the agreed-upon architecture before any code is written.

Tech stack: Node.js 24, React, TypeScript 7 RC, Supabase (auth, postgres, S3 storage), Drizzle ORM, tRPC v11, Hono, Vite, TanStack Router + Query, pnpm, oxlint, oxfmt, vitest, GitHub Actions, fly.io (Docker). Server runs TypeScript directly via tsx (no build/bundle step).

## Goals / Non-Goals

**Goals:**
- Establish a pnpm monorepo with clean separation between client, server, and shared API contract
- Implement Google sign-in via Supabase with combined login/signup (no separate registration flow)
- Implement character CRUD (create, list, soft-delete) with loose jsonb content
- Set up CI (lint, test, typecheck) on PRs and pushes to main
- Set up CD: fly.io builds Docker image from source, deploys to two fly apps (both manual dispatch)
- Configure tooling: TypeScript 7 RC, oxlint, oxfmt, precommit hooks, vitest

**Non-Goals:**
- Rich character UI (text/fields beyond a loose jsonb blob) — future change
- File uploads (S3 storage configured but not used yet) — future change
- RLS-based authz (decision deferred — see Open Questions)
- Pagination for character list (no pagination — YAGNI for now)
- Local Supabase via Docker — local dev connects to test env via `.env` creds

## Decisions

### 1. Monorepo with pnpm workspaces

**Choice**: `apps/web`, `apps/server`, `packages/api` in a single repo.

**Rationale**: Shared types between client and server for free (tRPC router type). One CI, one deploy, one Docker image. The `packages/api` package holds the tRPC router definition; the server imports it as runtime, the client imports it as type-only (`import type { AppRouter }`).

**Alternatives considered**:
- Single app with server serving built client (no workspace split) — simpler but couples client and server code, harder to share types cleanly
- Two separate repos — more CI/deploy complexity, no shared types

### 2. tRPC v11 for client↔server contract

**Choice**: tRPC v11 with `@trpc/tanstack-react-query` integration.

**Rationale**: Mature, huge ecosystem, best documentation. End-to-end type inference from server router to client calls. The `@trpc/tanstack-react-query` package glues tRPC to TanStack Query, giving cache management, loading states, and mutations out of the box.

**Alternatives considered**:
- oRPC — newer, web-standards-first, built-in OpenAPI. Rejected for this project: fewer examples, more edge cases, and we don't need an OpenAPI surface for a weekend DnD app
- Plain REST + Zod — loses end-to-end type inference; client and server types can drift

### 3. Hono as server framework

**Choice**: Hono.

**Rationale**: TypeScript-first, fetch-based, strict types on path params and query params. Lean — no heavy plugin ecosystem to learn. Pairs cleanly with Drizzle and tRPC (official tRPC adapter exists). Runs on Node via `@hono/node-server`.

**Alternatives considered**:
- Fastify — mature, fast, but more verbose for the same type strictness; plugin ecosystem is heavier than needed
- Express — types are an afterthought; doesn't meet the strict-typechecking goal
- TanStack Start — would unify frontend and backend into one framework, but couples the API to the frontend (no standalone reusable API). Rejected because the project framing is "client and server" as separate concerns

### 4. Separate Vite + TanStack Router + Query (CSR), not TanStack Start

**Choice**: Vite builds a CSR React app. TanStack Router for client routing, TanStack Query for server state. Server is a standalone Hono API.

**Rationale**: Clean API boundary — the server is a real API that could serve a mobile app, CLI, or script later. Matches the "client and server" framing. TanStack Start is still in beta; adding a third experimental piece (alongside TS7 RC and oxfmt) adds risk.

**Alternatives considered**:
- TanStack Start (unified fullstack) — fewer moving parts but couples API to frontend. Still beta.

### 5. Server serves client (single Docker image per env)

**Choice**: Hono serves the built React app from `dist/` as static files in production. One Docker image per env.

**Rationale**: Simplest deployment model — one image, one fly app, no separate static host. No CORS in prod (same origin). CORS enabled in dev only (Vite dev server proxies `/api` to Hono).

**Alternatives considered**:
- Separate static hosting (e.g., fly.io for API, Cloudflare Pages for client) — two deploys per env, more moving parts, not needed for a weekend project

### 6. fly.io builds images, GitHub only triggers deploy

**Choice**: GitHub Actions runs `flyctl deploy --config fly.toml` which triggers fly.io to build the Docker image from source remotely. No Docker build in CI, no image registry, no runtime secrets in GitHub.

**Rationale**: Simpler CI — no Docker buildx, no registry auth, no image push. Only `FLY_API_TOKEN` lives in GitHub secrets (a deploy credential, not a runtime secret). VITE build args (publishable keys, safe in repo) are passed via `fly.toml` `[build] args`. Runtime secrets (Supabase URL, secret key, database URL) live in fly secrets, set via `flyctl secrets set`.

Both test and prod deploys are manual `workflow_dispatch` — triggered from the GitHub Actions UI or `gh workflow run`.

**Rollback**: `flyctl deploy --rollback` reverts to the previous release.

**Alternatives considered**:
- GitHub Actions builds, pushes to fly registry — more CI complexity, image artifacts to manage, runtime secrets in GitHub
- GitHub Actions → GHCR — images in GitHub Container Registry, more discoverable, but unnecessary for this project
- fly.io builds from source with test auto-deploy on push to main — considered, but manual control preferred for now

### 7. Two environments: test and prod

**Choice**: Two Supabase projects (test, prod) and two fly apps (dnd-weekend-test, dnd-weekend-prod). Local dev connects to test env via `.env` creds.

**Rationale**: Test env is mutable playground; prod is sacred. Local dev hitting test is acceptable for a solo weekend project — no need for a third "dev" Supabase project or local Docker Supabase.

### 8. Database schema: loose jsonb content, soft delete, app-managed updated_at

**Choice**:
```
characters
  id          uuid        pk default gen_random_uuid()
  user_id     uuid        not null
  content     jsonb       not null default '{}'::jsonb
  created_at  timestamptz not null default now()
  updated_at  timestamptz not null default now()   -- set by app on update
  deleted_at  timestamptz                          -- soft delete; null = active

  index: (user_id) where deleted_at is null
```

**Rationale**:
- **jsonb over json**: indexable (GIN), faster reads, key reordering acceptable. We'll likely query inside content eventually (e.g., "characters with class: 'rogue'"). json would paint us into a corner.
- **Loose shape (`{}`)**: no enforced structure yet. Rich UI arrives later without a migration. No Zod validation on content itself — just `z.record(z.unknown())` to accept any JSON object.
- **Soft delete (`deleted_at`)**: cheaper than hard delete for "undo" UX later; list query filters `WHERE deleted_at IS NULL`.
- **App-managed `updated_at`**: Drizzle sets `updatedAt: new Date()` on every update call. Simpler than a Postgres trigger, visible in code. Trade-off: raw SQL updates bypass it (acceptable — all updates go through Drizzle).
- **No pagination**: YAGNI for a personal DnD tool with a small number of characters per user.

### 9. Dev server architecture

**Choice**: Vite dev server (`:5173`) with proxy for `/api` → Hono (`:3000`). Separate origins in dev, CORS middleware on Hono in dev only.

**Rationale**: HMR and fast refresh on the client. Server runs independently with its own restart-on-save. Proxy avoids CORS in dev for same-origin API calls from the Vite-served client.

## Risks / Trade-offs

- **TypeScript 7 RC is pre-release** → Drizzle, Vite, oxlint all claim compat, but edge cases may surface. Mitigation: pin exact versions, watch for type errors that don't match expected behavior, fall back to TS 5.x if blocking.
- **oxfmt is young** → may have formatting gaps for non-TS files (JSON, YAML). Mitigation: if gaps appear, use prettier for non-JS files as a hybrid.
- **fly.io builds from source** → no image artifact retained; rollback via `flyctl deploy --rollback`. Acceptable for a weekend project.
- **Local dev mutates test env** → local development connects to the test Supabase project, so dev changes affect shared test data. Mitigation: acceptable for solo weekend work; if a second developer joins, add a local Supabase via Docker or a third "dev" project.
- **App-managed `updated_at`** → raw SQL updates bypass the timestamp. Mitigation: all updates go through Drizzle; if raw SQL is needed later, add a Postgres trigger then.
- **Loose jsonb content** → no validation on content shape, so client could send malformed data. Mitigation: server validates that content is a JSON object (`z.record(z.unknown())`); structure validation deferred to when rich UI is designed.

## Migration Plan

1. **Initial setup**: create monorepo, install dependencies, configure tooling (oxlint, oxfmt, tsconfig, precommit hooks)
2. **Database**: create Supabase projects (test, prod), define Drizzle schema, generate initial migration, run against test env
3. **Auth**: configure Google OAuth in Supabase + Google Cloud Console for both envs, implement sign-in flow
4. **API**: implement tRPC router (character CRUD), Hono server with tRPC adapter, JWT verification middleware
5. **Client**: implement Vite + React + TanStack Router + Query, tRPC client, sign-in page, character list + create + delete UI (basic)
6. **CI**: GitHub Actions workflow for lint/test/typecheck
7. **CD**: Dockerfile, fly.toml (test + prod), deploy workflows (both manual dispatch)
8. **Rollback**: `flyctl deploy --rollback --config fly.toml`

## Resolved Decisions (previously open questions)

### 10. Auth pattern: server-only (secret key), no RLS

**Choice**: Server-only with secret key. No RLS policies.

**Rationale**: Less magic. The server verifies the JWT via JWKS, extracts the user identity, and scopes every Drizzle query with `WHERE user_id = ctx.user.id`. RLS is redundant when the server is the API — adding it would mean maintaining two authz layers for one app. The secret key (`sb_secret_...`) bypasses RLS entirely; all authorization lives in application code. Uses Supabase's new API key model (publishable key for client auth, secret key for server DB access) and asymmetric JWT signing keys (verified via JWKS endpoint, no shared JWT secret).

### 11. JWT verification: JWKS (asymmetric signing keys)

**Choice**: Verify Supabase JWT via JWKS (JSON Web Key Set). Server fetches and caches Supabase's public keys from `https://<project>.supabase.co/auth/v1/.well-known/jwks.json`, verifies JWT signatures locally.

**Rationale**: Standard OAuth/OIDC approach. No per-request network call (keys cached). Faster than calling `auth.getUser()` on every request. Uses Supabase's new asymmetric JWT signing keys (RSA/EC) instead of the legacy shared JWT secret — enables key rotation without downtime and local verification without the Auth server in the hot path. Uses the `jose` library's `createRemoteJWKSet` for JWKS caching.

### 12. User table: FK directly to `auth.users`, no mirror

**Choice**: `characters.user_id` is a foreign key directly to `auth.users(id)`. No `public.users` mirror table.

**Rationale**: The app is character-centric; users are secondary. Email (available in the JWT payload) is enough for now. Future "party" features can add a mirror table later if display_name or avatar is needed — YAGNI today. Avoids sync logic and an extra table to maintain.

### 13. `fly.toml`: two files (test + prod)

**Choice**: `fly.test.toml` and `fly.prod.toml`, each self-contained with its own `app` name.

**Rationale**: No `--app` flag ambiguity. Each file is self-contained. Shared config (health check, internal port) is duplicated but minimal (3 lines).

### 14. Migration execution: fly release command

**Choice**: `fly.toml` `[deploy] release_command = "pnpm db:migrate"`. Migrations run before new instances take traffic.

**Rationale**: Automatic — no forgotten migrations. Safe — if migration fails, deploy aborts and old version keeps running. Standard fly.io pattern. Single instance per env means no race condition. DB connection string available to release command via fly secrets.

### 15. Styling: CSS Modules

**Choice**: CSS Modules (built into Vite, zero extra dependencies).

**Rationale**: Scoped styles, no naming collisions, no build step, no framework to learn. Sufficient for basic UI to test mechanics. Can swap to Tailwind later if utility-first becomes valuable.

### 16. Server runtime: tsx (no build step)

**Choice**: Server runs TypeScript directly via `tsx` — no bundler (no tsup, no esbuild for server). Docker image runs `pnpm --filter @dnd-weekend/server start` which invokes `tsx src/index.ts`.

**Rationale**: Node 24 has native TypeScript support but it requires `.js` extensions in imports and doesn't resolve `.js` → `.ts` automatically in all cases. `tsx` handles this transparently with zero config. The server doesn't need a build step — it's not shipped to a CDN or browser. One less build step, one less thing to break. Vite still bundles the client (needed for browser).
