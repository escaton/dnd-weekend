## Context

The server currently runs in production via `tsx src/index.ts`, which transpiles TypeScript at runtime. On a 256 MB Fly VM this causes OOM kills every ~50 seconds — the process boots, passes health checks, then the kernel kills it as memory grows from the JIT transpiler (esbuild) loading and transpiling every import on the fly. The app enters an infinite restart loop.

The project is a pnpm monorepo:
- `apps/web` — Vite + React client (already prebuilt via `vite build`)
- `apps/server` — Hono + tRPC server (runs TS source via tsx in prod)
- `packages/api` — tRPC router shared between client and server

The `@dnd-weekend/api` package's `package.json` `exports` field points to `.ts` source files (`./src/index.ts`, `./src/db/schema.ts`). This works with tsx (runtime transpilation) but means `node` cannot resolve the package at runtime without a build step that either compiles the api package separately or bundles it into the server.

## Goals / Non-Goals

**Goals:**
- Eliminate OOM kills on the 256 MB test VM by removing the runtime transpiler
- Produce compiled JavaScript that `node` can run directly in production
- Keep the dev workflow identical (`tsx watch` with HMR)
- Single build command, minimal Dockerfile changes

**Non-Goals:**
- Changing the dev workflow or dev tooling
- Changing the api package's `exports` (it stays pointing at `.ts` for dev type resolution)
- Switching to CJS (project uses `"type": "module"` everywhere)
- Bumping VM memory (the goal is to fix the root cause, not band-aid it)
- Adding a build step for the api package as a separate artifact

## Decisions

### 1. esbuild `--bundle` over tsc

**Decision:** Use `esbuild --bundle --platform=node --format=esm` to produce a single `dist/index.js`.

**Rationale:** The `@dnd-weekend/api` package `exports` point to `.ts` source. With tsc, the emitted server JS would `import { appRouter } from "@dnd-weekend/api"` and Node would resolve to `.ts` files it cannot run. We'd need to also build the api package and update its `exports` to point to `dist/` — two builds plus package.json changes. esbuild `--bundle` follows the export, transpiles and inlines the api source into the server output. One build, one file, no api changes.

**Alternatives considered:**
- **tsc emit for both packages**: Correct but requires building api separately, updating its `exports` to conditionally point to `dist/` in production, and coordinating two build steps in the Dockerfile. More moving parts for no benefit.
- **vite SSR build**: Vite is already a dependency, but its SSR/lib mode adds config complexity (separate vite.config, externals handling) for what esbuild does in one CLI flag.
- **Bump VM to 512 MB**: Band-aid; the root cause (running a dev tool in prod) persists.

### 2. ESM output format

**Decision:** `--format=esm` matching the project's `"type": "module"`.

**Rationale:** The project uses ESM throughout (`"type": "module"` in all package.json files, `verbatimModuleSyntax` in tsconfig). esbuild's ESM output preserves `import`/`export` syntax and handles `.js` extension imports correctly. Node's `--experimental-specifier-resolution` is not needed since the code already uses explicit `.js` extensions in imports (e.g., `./context.js`).

### 3. Single file, no splitting

**Decision:** `--bundle` without `--splitting` — one self-contained `dist/index.js`.

**Rationale:** The server has no dynamic imports and no code-splitting needs. A single file is simpler to copy, deploy, and debug. Dynamic `import()` is not used anywhere in the server or api codebase.

### 4. esbuild as devDependency of `apps/server`

**Decision:** Add `esbuild` to `apps/server/devDependencies`.

**Rationale:** Although esbuild is already in the lockfile (transitively via vite), declaring it explicitly avoids relying on transitive resolution. The `build` script calls esbuild directly via CLI.

### 5. Connection pool reduction (10 → 3)

**Decision:** Reduce `postgres(connectionString, { max: 10 })` to `{ max: 3 }` in `apps/server/src/db.ts`.

**Rationale:** 10 pooled connections is excessive for a single-machine app on a 256 MB VM. Each connection holds a TCP socket and buffer memory. 3 connections is sufficient for the concurrency limits in `fly.test.toml` (soft 200, hard 250 requests) since most requests are sub-100ms DB queries. This is a secondary memory optimization that complements the primary fix (removing tsx).

### 6. Dockerfile: build in builder stage, copy dist to runtime

**Decision:** Add `pnpm --filter @dnd-weekend/server build` to the builder stage (after web build), copy `apps/server/dist/` to the runtime stage, and change the CMD to `node dist/index.js`.

**Rationale:** The builder stage already has all source and devDependencies installed. esbuild runs in the builder, produces `dist/index.js`, and the runtime stage only needs the compiled output plus runtime dependencies. The runtime stage no longer needs `apps/server/src/` (TS source) or `tsx` as a dependency. The runtime still needs `packages/api/src/` if anything references it at runtime, but with bundling the api source is inlined — so we can skip copying it.

## Risks / Trade-offs

- **[esbuild ESM edge cases]** Node builtins (`fs`, `path`, `url`) are correctly externalized with `--platform=node`, but if the server later adds dynamic imports or top-level await, the single-file bundle may need `--splitting`. → Mitigation: No dynamic imports exist today; revisit if added.
- **[Source maps in production]** esbuild can generate source maps (`--sourcemap`), but they add file size. → Mitigation: Skip initially; add if debugging production errors becomes hard.
- **[Dev/prod divergence]** Dev uses tsx (transpiles per-file, no bundling); prod uses esbuild (bundles everything). Subtle differences in how each handles edge cases (e.g., `__dirname` polyfills, JSON imports). → Mitigation: Both target ESM; the code already avoids CJS-isms. The `fileURLToPath(import.meta.url)` pattern works in both.
- **[api package not independently built]** The api package has no `build` step. If a second consumer (besides server and web-type-import) is added later, it would need its own build. → Mitigation: Only two consumers exist; web imports types only, server bundles source. Revisit if a third consumer appears.
- **[Connection pool too low]** Reducing to 3 could bottleneck under high concurrency. → Mitigation: Fly concurrency limits cap at 250 requests; 3 pooled connections with sub-100ms queries handles this. Monitor and adjust if needed.
