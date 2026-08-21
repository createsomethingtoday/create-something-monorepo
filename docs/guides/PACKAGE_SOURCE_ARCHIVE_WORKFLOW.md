# Package Source Archive Workflow

Use package source archives only when a receiving system requires source files.
Normal deployment should use the package's existing build and deploy command so
the deployment client uploads the framework-owned output directly.

## Preferred delivery path

| Surface                       | Preferred artifact or command                               |
| ----------------------------- | ----------------------------------------------------------- |
| SvelteKit on Cloudflare Pages | Package `deploy` script uploading `.svelte-kit/cloudflare`  |
| OpenNext on Cloudflare        | Package `deploy` script building and uploading `.open-next` |
| Cloudflare Worker             | Package-local `wrangler deploy` command                     |
| Tauri desktop application     | Signed `.app` or `.dmg` produced by the package build       |

Do not copy the repository to manufacture any of these artifacts. A source
archive is a handoff format, not a deployment prerequisite.

## Create one source archive

Run the command from a clean, isolated checkout when the archive will be used
for review or promotion:

```bash
pnpm archive:package -- \
  --package @create-something/ltd \
  --output /path/with/headroom/ltd-source.tar.gz
```

The command:

1. requires one exact pnpm workspace project;
2. resolves its local dependency closure with the pnpm workspace graph;
3. includes root package, lockfile, workspace, and TypeScript manifests
   when present;
4. includes tracked changes and non-ignored untracked files from the current
   working tree;
5. excludes generated directories even if an old generated file remains
   tracked;
6. fails closed on environment files, private-key formats, and common credential
   manifests;
7. refuses concurrent archive runs for the same repository;
8. checks worst-case archive growth while preserving 5 GiB of free space by
   default;
9. streams files directly into one temporary archive without a staging copy;
10. verifies the archive listing and confirms source hashes did not change
    during creation; and
11. publishes a manifest and SHA-256 receipt beside the archive.

The output set is:

```text
ltd-source.tar.gz
ltd-source.tar.gz.manifest.json
ltd-source.tar.gz.sha256
```

The manifest is the exact content receipt. Inspect it before transferring or
extracting the archive.

## Additional source paths

Some packages invoke a repository-owned helper outside their workspace
dependency closure. Include only the exact required path:

```bash
pnpm archive:package -- \
  --package @create-something/agency \
  --include scripts/run-wrangler.mjs \
  --output /path/with/headroom/agency-source.tar.gz
```

`--include` cannot select the repository root, leave the repository, or add a
generated directory.

## Generated paths

Source archives exclude these directory segments:

```text
.build .cache .next .open-next .svelte-kit .turbo .vite .wrangler
build coverage dist node_modules out output playwright-report target test-results
```

If one of those directories is the desired deploy artifact, archive that
finished artifact through its owning package workflow instead of weakening the
source-archive boundary.

## Disk-pressure behavior

The default 5 GiB reserve is intentionally conservative. The command fails
before creating an output directory or archive when projected tar growth plus
the reserve exceeds current filesystem headroom.

`--reserve-bytes` exists for controlled environments with a different explicit
budget. Do not lower it to force progress on a pressured operator machine.

Only one archive may run per repository. A failed run removes its uniquely
named partial archive and its own lock. It does not delete existing archives,
build outputs, caches, worktrees, or another process's lock.

## Proof boundary

A successful source archive proves its listed working-tree files were packaged
and hashed. It does not prove that the source was committed, reviewed, built,
deployed, or live. Record the commit SHA separately and use the owning promotion
workflow for production.
