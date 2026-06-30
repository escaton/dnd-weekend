## 1. Baseline verification

- [x] 1.1 Run `pnpm format:check` locally; found 26 `.md` files in `openspec/**` and `.opencode/**` unformatted (source code clean) — root cause: lint-staged formats source files but not `.md`
- [x] 1.2 Create `.oxfmtrc.json` with `ignorePatterns: ["openspec/**", ".opencode/**"]` to mirror `.oxlintrc.json` ignore patterns, so oxfmt skips non-source docs (consistent with oxlint) rather than reformatting tracked planning docs
- [x] 1.3 Re-run `pnpm format:check` and confirm it exits 0

## 2. CI workflow update

- [x] 2.1 In `.github/workflows/ci.yml`, add a `pnpm format:check` step in the `ci` job immediately before the `pnpm lint` step
- [x] 2.2 Confirm the step reuses the existing `format:check` npm script (no inline `oxfmt` invocation) and makes no other changes to the workflow

## 3. Verification

- [x] 3.1 Run `pnpm format:check` locally and confirm it exits 0
- [x] 3.2 Temporarily introduce an unformatted file, run `pnpm format:check`, confirm it exits non-zero, then revert the file
- [ ] 3.3 Push the branch, open a PR, and confirm the CI workflow runs the new `format:check` step and the run passes
