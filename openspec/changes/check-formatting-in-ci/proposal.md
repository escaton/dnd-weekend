## Why

Formatting is currently enforced only by a local pre-commit hook (`oxfmt` via lint-staged). The CI workflow runs lint, typecheck, and tests but never verifies formatting. A PR containing unformatted code — committed with `--no-verify`, from an editor that bypasses hooks, or from a contributor without husky set up — passes CI silently, allowing style drift onto `main`. Checking formatting in CI closes that gap and keeps the repo consistently formatted without relying solely on developer-side tooling.

## What Changes

- Add a `pnpm format:check` step to the GitHub Actions CI workflow (`ci.yml`), running `oxfmt --check .`
- Run the format check alongside the existing lint, typecheck, and test steps on every pull request and push to `main`
- A formatting violation SHALL fail the CI run, the same way lint and typecheck failures already do
- Add `.oxfmtrc.json` with `ignorePatterns` for `openspec/**` and `.opencode/**`, mirroring the existing `.oxlintrc.json` ignore patterns so oxfmt and oxlint treat non-source docs consistently (neither reformats tracked planning/config docs)
- No new dependencies — `oxfmt` and the `format:check` script already exist in `package.json`

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-infrastructure`: The "Formatting with oxfmt" requirement is extended so formatting is verified in CI (not only via the precommit hook). A formatting check SHALL run in CI and fail the run on unformatted files.

## Impact

- **CI workflow**: `.github/workflows/ci.yml` gains a new `pnpm format:check` step
- **Formatter config**: new `.oxfmtrc.json` with `ignorePatterns` mirroring `.oxlintrc.json` so oxfmt skips `openspec/**` and `.opencode/**` (non-source docs)
- **Specs**: `openspec/specs/app-infrastructure/spec.md` "Formatting with oxfmt" requirement gains a CI-enforcement scenario
- **No application code changes**: existing `format:check` script and `oxfmt` dependency are reused as-is
- **No runtime or deploy impact**: formatting check is a build-time-only concern
