## 1. Monorepo scaffold and tooling

- [x] 1.1 Initialize pnpm workspace (`pnpm-workspace.yaml`) with `apps/*` and `packages/*`
- [x] 1.2 Create `apps/web` — Vite + React + TypeScript 7 RC, configure Vite dev server proxy for `/api` → `localhost:3000`
- [x] 1.3 Create `apps/server` — Hono + `@hono/node-server` + TypeScript 7 RC
- [x] 1.4 Create `packages/api` — shared tRPC router definition package (type-only export for client)
- [x] 1.5 Configure root `tsconfig.json` (strict mode) and per-workspace `tsconfig.json` extending it
- [x] 1.6 Install and configure oxlint (`.oxlintrc.json` or equivalent)
- [x] 1.7 Install and configure oxfmt
- [x] 1.8 Install and configure vitest
- [x] 1.9 Set up precommit hooks (lint-staged or equivalent: oxlint + oxfmt on staged files)
- [x] 1.10 Create `.editorconfig`
- [x] 1.11 Create `.gitignore` (node_modules, dist, .env, .env.local)
- [x] 1.12 Create `.env.example` documenting all required environment variables (Supabase URL, publishable key, secret key, database URL, etc.)
- [x] 1.13 Verify the dev setup runs: Vite on :5173, Hono on :3000, proxy works

## 2. Database layer (Drizzle + Supabase Postgres)

- [x] 2.1 Create Supabase projects: test and prod (via Supabase dashboard)
- [x] 2.2 Define Drizzle schema for `characters` table (id, user_id, content jsonb, created_at, updated_at, deleted_at) with partial index on `(user_id) where deleted_at is null`
- [x] 2.3 Configure `drizzle.config.ts` with database connection from env
- [x] 2.4 Generate initial migration via `drizzle-kit generate`
- [x] 2.5 Run migration against test Supabase project
- [x] 2.6 Verify schema in Supabase dashboard (test)

## 3. Google OAuth setup (Supabase + Google Cloud Console)

- [x] 3.1 Create Google OAuth credentials in Google Cloud Console (for test env)
- [x] 3.2 Configure redirect URIs in Google Cloud Console for test Supabase project
- [x] 3.3 Enable Google auth provider in Supabase dashboard (test) with Google client ID/secret
- [x] 3.4 Repeat 3.1–3.3 for prod env (separate Google OAuth credentials or same with prod redirect URIs)
- [x] 3.5 Verify Google sign-in works via Supabase dashboard auth preview

## 4. Server: auth middleware and tRPC setup

- [x] 4.1 Install `@trpc/server`, `@trpc/tanstack-react-query` adapter packages, and `zod`
- [x] 4.2 Create tRPC context that extracts user from Supabase JWT
- [x] 4.3 Implement JWT verification via JWKS (using `jose` library or Hono JWKS plugin) — fetch and cache Supabase public keys, verify signature locally, extract user id
- [x] 4.4 Create tRPC router in `packages/api` with auth procedure (placeholder) and character procedures (create, list, soft-delete)
- [x] 4.5 Mount tRPC endpoint on Hono server at `/api`
- [x] 4.6 Add CORS middleware (enabled in dev only, same-origin in prod)
- [x] 4.7 Add `/healthz` endpoint returning `{ "ok": true }` with 200 status
- [x] 4.8 Add error handling middleware (catch-all returning JSON, no stack traces in prod)

## 5. Server: character CRUD procedures

- [x] 5.1 Implement `character.create` procedure — validates content is a JSON object (`z.record(z.unknown())`), defaults to `{}`, sets `user_id` from context, inserts via Drizzle
- [x] 5.2 Implement `character.list` procedure — queries all characters where `user_id` = ctx.user.id and `deleted_at` is null, no pagination
- [x] 5.3 Implement `character.softDelete` procedure — sets `deleted_at` to now() where `id` matches and `user_id` = ctx.user.id and `deleted_at` is null; returns 404 if not found or not owned
- [x] 5.4 Ensure `updated_at` is set by app (Drizzle) on every update operation
- [x] 5.5 Write unit tests for character procedures (vitest)

## 6. Client: auth flow

- [x] 6.1 Install `@supabase/supabase-js`, `@trpc/client`, `@trpc/tanstack-react-query`, `@tanstack/react-query`, `@tanstack/react-router`
- [x] 6.2 Configure Supabase client with env vars (URL, publishable key)
- [x] 6.3 Configure tRPC client with `httpBatchLink` pointing to `/api`
- [x] 6.4 Configure TanStack Query provider and tRPC client integration
- [x] 6.5 Configure TanStack Router with a sign-in route and a protected app route
- [x] 6.6 Implement sign-in page with "Sign in with Google" button (Supabase OAuth redirect)
- [x] 6.7 Implement auth guard: redirect to sign-in if unauthenticated, redirect to app if authenticated on sign-in page
- [x] 6.8 Implement sign-out action (clear Supabase session, clear local state, redirect to sign-in)
- [x] 6.9 Handle OAuth redirect callback (Supabase `getSessionFromUrl` or equivalent)

## 7. Client: character UI (basic)

- [x] 7.1 Create character list page — fetches via tRPC `character.list`, displays characters
- [x] 7.2 Create "New character" form — submits via tRPC `character.create`, invalidates list query
- [x] 7.3 Create "Delete" button per character — calls tRPC `character.softDelete`, invalidates list query
- [x] 7.4 Handle loading and error states on list and create/delete
- [x] 7.5 Minimal styling via CSS Modules

## 8. Docker and fly.io setup

- [x] 8.1 Create multi-stage `Dockerfile` (stage 1: install deps + build client and server; stage 2: runtime with only dist/ and server bundle)
- [x] 8.2 Create `.dockerignore` (node_modules, .env, .git, dist, etc.)
- [x] 8.3 Create `fly.test.toml` for test app (dnd-weekend-test) with health check on `/healthz` and `[deploy] release_command = "pnpm db:migrate"`
- [x] 8.4 Create `fly.prod.toml` for prod app (dnd-weekend-prod) with health check on `/healthz` and `[deploy] release_command = "pnpm db:migrate"`
- [x] 8.5 Create fly apps: `dnd-weekend-test` and `dnd-weekend-prod` via `fly apps create`
- [x] 8.6 Set fly secrets for both apps (Supabase URL, keys, database URL, NODE_ENV)
- [x] 8.7 Verify Hono serves the built React app from `dist/` in production mode locally (docker build + run)

## 9. GitHub Actions: CI

- [x] 9.1 Create `.github/workflows/ci.yml` — triggers on PR and push to main
- [x] 9.2 Add pnpm setup + caching (`pnpm/action-setup` + `actions/setup-node` with cache)
- [x] 9.3 Add lint step (oxlint)
- [x] 9.4 Add typecheck step (`tsc --noEmit` across workspaces)
- [x] 9.5 Add test step (vitest)
- [x] 9.6 Verify CI runs and passes on a PR

## 10. GitHub Actions: deploy-test (auto)

- [x] 10.1 Create `.github/workflows/deploy-test.yml` — triggers on push to main (after CI passes, via `workflow_run` or job dependency)
- [x] 10.2 Add Docker build step (multi-stage build from Dockerfile)
- [x] 10.3 Tag image with commit SHA, push to `registry.fly.io/dnd-weekend-test`
- [x] 10.4 Deploy to fly: `fly deploy --image registry.fly.io/dnd-weekend-test:<sha> --app dnd-weekend-test`
- [x] 10.5 Verify test env auto-deploys on a push to main

## 11. GitHub Actions: deploy-prod (manual)

- [x] 11.1 Create `.github/workflows/deploy-prod.yml` — triggers via `workflow_dispatch` with optional input for commit SHA
- [x] 11.2 Add Docker build step from specified commit (or checkout specific SHA)
- [x] 11.3 Tag image with commit SHA, push to `registry.fly.io/dnd-weekend-prod`
- [x] 11.4 Deploy to fly: `fly deploy --image registry.fly.io/dnd-weekend-prod:<sha> --app dnd-weekend-prod`
- [ ] 11.5 Verify manual prod deploy works and prod app is healthy
