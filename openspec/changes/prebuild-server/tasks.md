## 1. Server build script

- [x] 1.1 Add `esbuild` to `apps/server/devDependencies` (via `pnpm --filter @dnd-weekend/server add -D esbuild`)
- [x] 1.2 Add `"build": "esbuild src/index.ts --bundle --platform=node --format=esm --outfile=dist/index.js"` to `apps/server/package.json` scripts
- [x] 1.3 Change `"start"` in `apps/server/package.json` from `tsx src/index.ts` to `node dist/index.js`
- [x] 1.4 Verify `pnpm --filter @dnd-weekend/server build` produces `apps/server/dist/index.js` that starts with `pnpm --filter @dnd-weekend/server start` locally

## 2. Connection pool reduction

- [x] 2.1 Change `postgres(connectionString, { max: 10 })` to `{ max: 3 }` in `apps/server/src/db.ts`

## 3. Bundled migration entry point

- [x] 3.1 Create `apps/server/src/migrate.ts` using `drizzle-orm/postgres-js/migrator`'s `migrate()` function, reading migrations from `../migrations/` relative to the bundled file
- [x] 3.2 Update `apps/server/package.json` `build` script to bundle both `index.ts` and `migrate.ts` (two esbuild commands or a single command with multiple entry points)
- [x] 3.3 Verify `node --env-file=../../.env dist/migrate.js` runs migrations successfully locally

## 4. Co-locate drizzle config and migrations

- [x] 4.1 Move `drizzle/migrations/` to `apps/server/migrations/`
- [x] 4.2 Move `drizzle.config.ts` to `apps/server/drizzle.config.ts` with adjusted paths (`schema: "../../packages/api/src/db/schema.ts"`, `out: "./migrations"`)
- [x] 4.3 Remove root `drizzle/` directory and root `drizzle.config.ts`
- [x] 4.4 Move `drizzle-kit` from root `devDependencies` to `apps/server/devDependencies`
- [x] 4.5 Remove `db:*` scripts from root `package.json`, add `db:generate`/`db:push`/`db:studio` scripts to `apps/server/package.json` (using `drizzle-kit --config drizzle.config.ts`)
- [x] 4.6 Verify `pnpm --filter @dnd-weekend/server db:generate` creates new migrations in `apps/server/migrations/`

## 5. Dockerfile changes

- [x] 5.1 Add `RUN pnpm --filter @dnd-weekend/server build` to the builder stage (after the web build step)
- [x] 5.2 Update runtime stage: remove `pnpm install`, `pnpm rebuild esbuild`, and all `COPY` of `package.json`/`lockfile` — no `node_modules` needed
- [x] 5.3 Update runtime stage: copy `apps/server/dist/` and `apps/server/migrations/` from builder only
- [x] 5.4 Remove `COPY drizzle/`, `COPY drizzle.config.ts`, `COPY tsconfig.json` from runtime stage
- [x] 5.5 Change `CMD` to `["node", "apps/server/dist/index.js"]` (no pnpm wrapper)
- [x] 5.6 Verify the Docker image builds locally with `docker build --build-arg VITE_SUPABASE_URL=... --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=... .`

## 6. Fly config changes

- [x] 6.1 Update `fly.test.toml` `release_command` to `node apps/server/dist/migrate.js`
- [x] 6.2 Update `fly.prod.toml` `release_command` to `node apps/server/dist/migrate.js`

## 7. Branch and PR

- [x] 7.1 Create a branch `feat/prebuild-server` from main
- [x] 7.2 Commit all changes with a descriptive message
- [x] 7.3 Push the branch and create a PR to main
- [x] 7.4 Verify CI (lint, typecheck, tests) passes on the PR

## 8. Deploy to test and verify

- [x] 8.1 Trigger the deploy-test GitHub Action on the PR branch
- [x] 8.2 Verify the test Fly machine stays alive without OOM kills for at least 5 minutes (`fly logs -a dnd-weekend-test`)
- [x] 8.3 Verify `/healthz` responds 200 consistently over a 2-minute window
- [x] 8.4 Verify authenticated `character.list` returns 200 with data (using a temp Supabase user or the existing test user)
- [x] 8.5 Verify the characters list loads in the browser at `https://dnd-weekend-test.fly.dev/characters`
- [x] 8.6 Re-deploy and re-verify after the migration entry point and Dockerfile changes (tasks 3-6)
