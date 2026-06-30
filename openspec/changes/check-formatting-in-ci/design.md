## Context

The repo already enforces formatting locally: `oxfmt` is pinned in `package.json` devDependencies, a `format` script (`oxfmt .`) and a `format:check` script (`oxfmt --check .`) exist, and a husky `pre-commit` hook runs lint-staged which formats staged `.{ts,tsx,js,jsx,json,yaml,yml,toml}` files. The CI workflow (`.github/workflows/ci.yml`) runs `pnpm lint`, `pnpm typecheck`, and `pnpm test --run` on PRs and pushes to `main`, but does not run any formatting check. The gap is that hooks can be bypassed (`--no-verify`, editors without husky, incomplete local setup), letting unformatted code reach `main`. The `app-infrastructure` spec currently scopes the "Formatting with oxfmt" requirement to the precommit hook only.

## Goals / Non-Goals

**Goals:**
- Fail CI when unformatted code is introduced, regardless of whether local hooks ran
- Reuse the existing `format:check` script and `oxfmt` dependency — no new tooling
- Keep the CI step consistent in style with the existing `pnpm lint` / `pnpm typecheck` / `pnpm test` steps

**Non-Goals:**
- Auto-formatting files in CI (the check is read-only; fixing stays a local action)
- Changing the oxfmt formatting style, `.editorconfig`, or how oxfmt formats source files
- Adding formatting checks for file types oxfmt does not handle
- Modifying the pre-commit hook behavior

## Decisions

**0. Exclude non-source docs from oxfmt via `.oxfmtrc.json`, mirroring `.oxlintrc.json`.**
Rationale: the baseline `pnpm format:check` failed on 26 `.md` files under `openspec/**` and `.opencode/**` (tracked planning docs and opencode config) — not on application source. `lint-staged` formats `*.{ts,tsx,js,jsx,json,yaml,yml,toml}` but not `*.md`, so these docs drifted. `.oxlintrc.json` already ignores `openspec/**` for linting; adding `.oxfmtrc.json` with `ignorePatterns: ["openspec/**", ".opencode/**"]` makes oxfmt consistent (both tools skip non-source docs) and avoids churning tracked docs in a formatting-fix commit. Alternative considered: running `pnpm format` to fix all 26 docs — rejected because it mixes a large unrelated docs change into this change and would re-format opencode-managed skill/ command files on every tooling update.

**1. Invoke `pnpm format:check` rather than calling `oxfmt --check .` directly.**
Rationale: the other CI steps already go through npm scripts (`pnpm lint`, `pnpm typecheck`, `pnpm test`), so `pnpm format:check` keeps a single source of truth for the exact command and arguments. If the script changes, CI tracks it automatically. Alternative considered: inlining `npx oxfmt --check .` — rejected because it duplicates the script and can drift if `format:check` is ever updated.

**2. Place the format check immediately before `pnpm lint`.**
Rationale: formatting is a fast, read-only check; running it first fails the build early on the cheapest violation, before the slower typecheck and test steps. Grouping it next to lint keeps the two style-gate steps together. Alternative considered: appending it after tests — rejected because it delays a quick failure signal.

**3. Run the check in the existing `ci` job, not a separate job.**
Rationale: all current steps share one job and one installed environment; adding a second job would duplicate checkout/setup/install for a sub-second command. Alternative considered: a dedicated `format` job for parallelism — rejected as unnecessary overhead for this repo size.

**4. Use `--check` (exit non-zero on diff, do not write).**
Rationale: CI must not mutate files; it should only gate. The `format:check` script already encapsulates `oxfmt --check .`.

## Risks / Trade-offs

- **[Risk] CI fails on pre-existing unformatted files in the repo** → Mitigation: run `pnpm format` locally and commit the result before enabling the check. Verify `pnpm format:check` passes on `main` first.
- **[Risk] oxfmt version drift between local and CI** → Mitigation: `oxfmt` is pinned in `package.json` and installed in CI via `pnpm install --frozen-lockfile`, so local and CI versions match by the lockfile.
- **[Trade-off] `--check` reports but does not fix** → Contributors must run `pnpm format` locally. Acceptable: the pre-commit hook already formats staged files, and the CI failure message points at oxfmt.
- **[Trade-off] Format step runs on every PR/push** → negligible cost; oxfmt on this repo completes in well under a second.
