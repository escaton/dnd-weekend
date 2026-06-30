## 1. Server build script

- [x] 1.1 Add `esbuild` to `apps/server/devDependencies` (via `pnpm --filter @dnd-weekend/server add -D esbuild`)
- [x] 1.2 Add `"build": "esbuild src/index.ts --bundle --platform=node --format=esm --outfile=dist/index.js"` to `apps/server/package.json` scripts
- [x] 1.3 Change `"start"` in `apps/server/package.json` from `tsx src/index.ts` to `node dist/index.js`
- [x] 1.4 Verify `pnpm --filter @dnd-weekend/server build` produces `apps/server/dist/index.js` that starts with `pnpm --filter @dnd-weekend/server start` locally

## 2. Connection pool reduction

- [x] 2.1 Change `postgres(connectionString, { max: 10 })` to `{ max: 3 }` in `apps/server/src/db.ts`

## 3. Dockerfile changes

- [x] 3.1 Add `RUN pnpm --filter @dnd-weekend/server build` to the builder stage (after the web build step)
- [x] 3.2 Replace `COPY apps/server/src apps/server/src` with `COPY --from=builder /app/apps/server/dist apps/server/dist` in the runtime stage
- [x] 3.3 Remove `COPY packages/api/src packages/api/src` and `COPY packages/api/tsconfig.json packages/api/tsconfig.json` from the runtime stage (api source is bundled into server dist)
- [x] 3.4 Remove `COPY apps/server/tsconfig.json apps/server/tsconfig.json` from the runtime stage (no longer typechecking at runtime)
- [x] 3.5 Verify the Docker image builds locally with `docker build --build-arg VITE_SUPABASE_URL=... --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=... .`

## 4. Branch and PR

- [ ] 4.1 Create a branch `feat/prebuild-server` from main
- [ ] 4.2 Commit all changes with a descriptive message
- [ ] 4.3 Push the branch and create a PR to main
- [ ] 4.4 Verify CI (lint, typecheck, tests) passes on the PR

## 5. Deploy to test and verify

- [ ] 5.1 Trigger the deploy-test GitHub Action on the PR branch (`gh workflow run deploy-test.yml --ref feat/prebuild-server` or merge then dispatch)
- [ ] 5.2 Verify the test Fly machine stays alive without OOM kills for at least 5 minutes (`fly logs -a dnd-weekend-test`)
- [ ] 5.3 Verify `/healthz` responds 200 consistently over a 2-minute window
- [ ] 5.4 Verify authenticated `character.list` returns 200 with data (using a temp Supabase user or the existing test user)
- [ ] 5.5 Verify the characters list loads in the browser at `https://dnd-weekend-test.fly.dev/characters`
