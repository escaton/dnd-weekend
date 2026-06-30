## Why

The test environment (dnd-weekend-test) crashes every ~50 seconds with OOM kills on its 256 MB Fly VM. The server runs via `tsx src/index.ts` in production, which transpiles TypeScript on the fly at runtime — pulling esbuild into memory and loading every import through the JIT. The kernel OOM-kills the process within a minute of boot, causing an infinite restart loop. Users see "Error loading characters" because requests land during dead/restart windows. The app logic, auth, and database are all confirmed working — the process simply never stays alive long enough to serve.

## What Changes

- Add a `build` script to `apps/server` that bundles the server to a single ESM JavaScript file using esbuild
- The build bundles `@dnd-weekend/api` source into the server output (the api package's `exports` point to `.ts` source, so tsc alone cannot produce runnable JS without also rebuilding the api package)
- Add a second esbuild entry point — `migrate.ts` — that runs DB migrations via `drizzle-orm`'s migrator directly, replacing `drizzle-kit migrate`
- Move `drizzle/migrations/` and `drizzle.config.ts` into `apps/server/` — co-locating DB concerns with the server app
- Move `drizzle-kit` from root to `apps/server/devDependencies` (still needed for `generate`/`push`/`studio`, not for running migrations)
- Update the Dockerfile to build both entry points in the builder stage; runtime stage drops `pnpm install`, `node_modules`, and `drizzle-kit` entirely — only two JS bundles + migration SQL files
- Change the production start command from `tsx src/index.ts` to `node dist/index.js`
- Change `fly.toml` release command from `pnpm db:migrate` to `node apps/server/dist/migrate.js`
- Dev workflow remains unchanged — `tsx watch` with on-the-fly transpilation for hot reload
- Local migrations run via `node --env-file=../../.env dist/migrate.js` (after build) or `tsx --env-file=../../.env src/migrate.ts` (without build)
- Reduce the postgres connection pool from 10 to 3 to further lower memory pressure on small VMs

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `app-infrastructure`: Server production build changes from runtime tsx transpilation to prebuilt esbuild bundle; Dockerfile runtime stage drops `node_modules` entirely (no `pnpm install`); migrations run via bundled `migrate.js` instead of `drizzle-kit`; start command changes to `node dist/index.js`; drizzle config and migrations co-located in `apps/server/`

## Impact

- **`apps/server/package.json`**: Add `build` script (esbuild, two entry points), change `start` to `node dist/index.js`, add `db:generate`/`db:push`/`db:studio` scripts (using `drizzle-kit --config`), add esbuild + drizzle-kit as devDependencies
- **`apps/server/src/migrate.ts`**: New entry point — uses `drizzle-orm/postgres-js/migrator` to run migrations from `../migrations/`
- **`apps/server/src/db.ts`**: Reduce `postgres()` connection pool max from 10 to 3
- **`apps/server/drizzle.config.ts`**: Moved from root, `schema` path adjusted to `../../packages/api/src/db/schema.ts`, `out` to `./migrations`
- **`apps/server/migrations/`**: Moved from `drizzle/migrations/` (SQL + meta files)
- **`Dockerfile`**: Builder stage builds both `index.js` and `migrate.js`; runtime stage copies `dist/` and `migrations/` only — no `pnpm install`, no `node_modules`, no `drizzle.config.ts`, no `tsconfig.json`
- **`fly.test.toml` / `fly.prod.toml`**: `release_command` changes to `node apps/server/dist/migrate.js`
- **Root `package.json`**: Remove `db:*` scripts and `drizzle-kit` devDependency (moved to server)
- **Root `drizzle/` and `drizzle.config.ts`**: Removed (moved to `apps/server/`)
- **`packages/api/`**: No changes — esbuild bundles the `.ts` source at build time
- **Dev workflow**: Unchanged — `pnpm dev` still uses `tsx watch`; local migrations use `tsx --env-file=../../.env src/migrate.ts`
- **Fly VMs**: 256 MB test VM should now stay alive; image size drops from ~705MB to ~50MB (no `node_modules` in runtime)
