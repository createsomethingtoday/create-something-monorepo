# Loom Release Workflow

This runbook defines the exact sequence for shipping Loom release assets so that:

- `pnpm loom:local:bootstrap` can download a prebuilt repo-owned binary
- `@createsomething/loom-mcp` can publish to npm
- the installer URL pattern in `packages/loom/npm/install.js` resolves correctly

## Release contract

- Git tag format: `loom-v<version>`
- Version source of truth must match in:
  - `packages/loom/Cargo.toml`
  - `packages/loom/npm/package.json`
- Release asset names must be:
  - `loom-darwin-arm64.tar.gz`
  - `loom-linux-x64.tar.gz`
  - `loom-linux-arm64.tar.gz`
  - `loom-win32-x64.zip`

Each asset bundle must contain both `lm` and `loom-mcp`.

## Prerequisites

- `NPM_TOKEN` is configured in GitHub Actions if npm publish should happen automatically
- the current branch contains the Loom bootstrap and release workflow changes
- local validation passes for the version being released

## 1. Verify versions before tagging

Check that Cargo and npm versions match:

```bash
node <<'NODE'
const fs = require('fs');
const cargo = fs.readFileSync('packages/loom/Cargo.toml', 'utf8');
const pkg = JSON.parse(fs.readFileSync('packages/loom/npm/package.json', 'utf8'));
const cargoMatch = cargo.match(/^version = "([^"]+)"/m);
if (!cargoMatch) throw new Error('Could not read Cargo version');
if (cargoMatch[1] !== pkg.version) {
  throw new Error(`Version mismatch: Cargo=${cargoMatch[1]} npm=${pkg.version}`);
}
console.log(pkg.version);
NODE
```

Treat the printed version as `X.Y.Z` below.

## 2. Validate the local bootstrap path

From the repo root:

```bash
pnpm loom:preflight --json
pnpm loom:local ready
pnpm loom:local:bootstrap
pnpm loom:preflight --json
```

Expected result:

- `pnpm loom:local ready` succeeds
- after bootstrap, `pnpm loom:preflight --json` reports `local.runner.mode = "repo-bootstrap"`

## 3. Stage and commit

Stage the Loom release/bootstrap changes:

```bash
git add \
  .github/workflows/loom-release.yml \
  AGENTS.md \
  docs/guides/CODING_AGENT_HARNESS_PATTERN.md \
  docs/guides/LOOM_RELEASE_WORKFLOW.md \
  package.json \
  packages/loom/README.md \
  packages/loom/npm/bin/.gitignore \
  packages/loom/npm/install.js \
  scripts/loom/bootstrap-local.mjs \
  scripts/loom/local.mjs \
  scripts/loom/preflight.mjs
```

Commit with a release/bootstrap message of your choice.

## 4. Create the release tag

Create the tag for the version validated above:

```bash
git tag loom-vX.Y.Z
```

## 5. Push branch and tag

```bash
git push origin <branch-name>
git push origin loom-vX.Y.Z
```

Pushing the tag triggers `.github/workflows/loom-release.yml`.

## 6. Verify the GitHub release

After the workflow finishes, confirm:

- the release exists at tag `loom-vX.Y.Z`
- all four platform assets are attached
- the asset filenames match the installer contract exactly

The release workflow also conditionally publishes `@createsomething/loom-mcp` if `NPM_TOKEN` is configured.

## 7. Smoke test the published asset path

In a clean environment, or after removing the cached repo-owned Loom binaries, run:

```bash
pnpm loom:local:bootstrap
pnpm loom:preflight --json
pnpm loom:local ready
```

Expected result:

- bootstrap downloads the prebuilt release asset rather than falling back to cargo
- `local.runner.mode` remains `repo-bootstrap`
- `pnpm loom:local ready` succeeds without compilation

## 8. If npm publish was skipped

If the workflow logs `NPM_TOKEN is not configured; skipping npm publish.`, either:

- add `NPM_TOKEN` and rerun the workflow with the same tag, or
- publish manually from `packages/loom/npm` after validating package contents

## 9. Rollback and recovery

If the tag was created before the workflow was correct:

1. fix the workflow or installer mismatch on a branch
2. create a new version in both version files
3. tag the corrected release as `loom-v<new-version>`

Do not reuse a broken version tag once assets or npm publication have diverged from the installer contract.
