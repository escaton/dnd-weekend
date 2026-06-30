## MODIFIED Requirements

### Requirement: Formatting with oxfmt

The project SHALL use oxfmt for code formatting. Formatting SHALL be enforced via a precommit hook that formats staged files, and SHALL be verified in CI so that unformatted code cannot be merged even when local hooks are bypassed. The CI format check SHALL run `oxfmt --check .` (read-only) and SHALL fail the CI run on any unformatted file. oxfmt SHALL ignore non-source docs (`openspec/**` and `.opencode/**`) via `.oxfmtrc.json` `ignorePatterns`, mirroring the oxlint ignore patterns.

#### Scenario: Developer commits unformatted code
- **WHEN** a developer stages and commits files that are not formatted per oxfmt
- **THEN** the precommit hook SHALL format the staged files before the commit completes

#### Scenario: Format check runs in CI
- **WHEN** CI runs the format check command on a pull request or push to `main`
- **THEN** oxfmt SHALL check all source files in `--check` mode
- **AND** any unformatted file SHALL fail the CI run
