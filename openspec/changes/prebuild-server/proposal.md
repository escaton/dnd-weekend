## Why

The test environment (dnd-weekend-test) crashes every ~50 seconds with OOM kills on its 256 MB Fly VM. The server runs via `tsx src/index.ts` in production, which transpiles TypeScript on the fly at runtime — pulling esbuild into memory and loading every import through the JIT. The kernel OOM-kills the process within a minute of boot, causing an infinite restart loop. Users see "Error loading characters" because requests land during dead/restart windows. The app logic, auth, and database are all confirmed working — the process simply never stays alive long enough to serve.

## What Changes

- Add a `build` script to `apps/server` that bundles the server to a single ESM JavaScript file using esbuild
- The build bundles `@dnd-weekend/api` source into the server output (the api package's `exports` point to `.ts` source, so tsc alone cannot produce runnable JS without also rebuilding the api package)
- Update the Dockerfile to run the server build in the builder stage and copy `dist/` to the runtime stage
- Change the production start command from `tsx src/index.ts` to `node dist/index.js`
- Dev workflow remains unchanged — `tsx watch` with on-the-fly transpilation for hot reload
- Reduce the postgres connection pool from 10 to 3 to further lower memory pressure on small VMs

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `app-infrastructure`: Server production build changes from runtime tsx transpilation to prebuilt esbuild bundle; Dockerfile adds a server build stage; start command changes to `node dist/index.js`

## Impact

- **`apps/server/package.json`**: Add `build` script (esbuild), change `start` to `node dist/index.js`, add esbuild as devDependency
- **`apps/server/src/db.ts`**: Reduce `postgres()` connection pool max from 10 to 3
- **`Dockerfile`**: Add server build step in builder stage, copy `dist/` to runtime, remove TS source copy for server
- **`packages/api/`**: No changes — esbuild bundles the `.ts` source at build time; runtime no longer touches api package source
- **Dev workflow**: Unchanged — `pnpm dev` still uses `tsx watch`
- **Fly VMs**: 256 MB test VM should now stay alive; memory usage drops significantly without runtime transpiler overhead
