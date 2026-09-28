# CRE-2162: bounded Forge Scheduler pilot

## Revisions and scope

- Scheduler source: `b54ae7133a4a9d55497a8beffef25d7100f74734` (this checkout's starting `HEAD`).
- Forge source: `cfe397c296a5e6d9fce01eb335ed805821e5547c` (`cloudflare/forge`, detached checkout).
- Fern TypeScript generator: `3.80.1`; pulled image digest `sha256:e806e9ff27d619caf84f9d5e52c9bc1f89e355dfd76d75faf1260b1115e1e192` before Forge wrapped it locally.
- [openapi.readonly.json](openapi.readonly.json) is projected from `src/http/openapi.ts` by [project-readonly.mjs](project-readonly.mjs). It has exactly `GET /api/v1/links/createsomething/together` and `GET /api/v1/availability`, and only the `Link`, `Availability`, `Slot`, and `Error` schemas. It has no security schemes or booking, room, operator, or credential paths.
- Projection size: 6,034 bytes; SHA-256 `0c372cd605552a21acc6b64613a96cfa6135ccda749b5f213db08e08be651a43`.

## Reproduction on this macOS Docker Desktop host

Run from the repository root. The run scratch directory is removed by Paperclip after the run, so recreate the Forge checkout for a future run. The environment adjustments below make Docker's bundled CLI visible to Forge's Bash subprocesses, keep Docker Buildx state in scratch, and direct bare `mktemp -d` calls into the run scratch directory.

```bash
node apps/create-something-scheduler/forge-pilot/project-readonly.mjs
scratch="${PAPERCLIP_RUN_SCRATCH_DIR:?}"
git clone --no-checkout https://github.com/cloudflare/forge.git "$scratch/forge-src"
git -C "$scratch/forge-src" checkout --detach cfe397c296a5e6d9fce01eb335ed805821e5547c
(cd "$scratch/forge-src" && COREPACK_HOME="$scratch/corepack" pnpm install --frozen-lockfile)
mkdir -p "$scratch/forge-src/packages/cloudflare-fern-config/fern" "$scratch/docker-config"
cp apps/create-something-scheduler/forge-pilot/openapi.readonly.json "$scratch/forge-src/packages/cloudflare-fern-config/fern/openapi.json"
cp apps/create-something-scheduler/forge-pilot/openapi.readonly.json "$scratch/forge-src/openapi.json"
(cd "$scratch/forge-src" && node --import tsx packages/cloudflare-forge-transformer-sdk-ts/scripts/build-package.ts)
cat > "$scratch/forge-bash-env" <<'EOF'
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
mktemp() {
  if [ "$#" -eq 1 ] && [ "$1" = '-d' ]; then
    command mktemp -d "$PAPERCLIP_RUN_SCRATCH_DIR/forge.XXXXXXXX"
  else
    command mktemp "$@"
  fi
}
EOF
BASH_ENV="$scratch/forge-bash-env" \
PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH" \
TMPDIR="$scratch" DOCKER_CONFIG="$scratch/docker-config" \
DOCKER_HOST="unix:///Users/micahjohnson/.docker/run/docker.sock" \
FERN_TYPESCRIPT_SHARD_COUNT=1 \
node "$scratch/forge-src/packages/cloudflare-forge-transformer-sdk-ts/dist/cli.js" \
  apps/create-something-scheduler/forge-pilot/openapi.readonly.json \
  --out apps/create-something-scheduler/forge-pilot/generated
```

Forge's repository omits the two Cloudflare OpenAPI input files expected by its packaging script; the two `cp` commands supply this pilot's bundled projection solely as build metadata. The first `pnpm --filter @cloudflare/forge-transformer-sdk-ts build` attempt also failed because `tsx` tried to create a Unix IPC socket under the long run scratch path (`listen EINVAL`). `node --import tsx` built the same package without that CLI socket.

## Unmodified generation outcome

Both unchanged generation runs returned exit code **1**. Docker ran the pinned Fern image and reported successful canonical IR capture and one finished TypeScript shard. Forge then failed in `merge-fern-typescript-shards.mjs:90`:

```text
Error: ENOENT: no such file or directory, open '.../sdk/api/resources/index.ts'
```

The merge script unconditionally writes that barrel without creating its parent directory. [generation-repeat.log](generation-repeat.log) contains the second run's full output; it confirms the same failure after reusing the cached image wrapper. The CLI removes its temporary generation tree on failure, so the **unmodified** generator produced 0 files and 0 bytes. No hand-written client was substituted.

## Board-directed scratch repair and patched output

A later issue comment directed a narrow repair **only in the pinned Forge scratch checkout**, retaining the unmodified failure as evidence. [forge-merge.patch](forge-merge.patch) adds two parent-directory creation calls before aggregate barrel writes. Patch SHA-256: `d88a570dc26fc9693081fda6bdeb17cbbbacbb2bb0996d833f9db8a09ee42a10`. The Forge `HEAD` remains `cfe397c296a5e6d9fce01eb335ed805821e5547c`; this patch is not upstream Forge behavior.

```bash
git -C "$scratch/forge-src" apply "$PWD/apps/create-something-scheduler/forge-pilot/forge-merge.patch"
(cd "$scratch/forge-src" && node --import tsx packages/cloudflare-forge-transformer-sdk-ts/scripts/build-package.ts)
# Run the generation command above, then save its output and repeat it unchanged.
cp -R apps/create-something-scheduler/forge-pilot/generated "$scratch/generated-first"
diff -qr "$scratch/generated-first" apps/create-something-scheduler/forge-pilot/generated
node --import tsx apps/create-something-scheduler/forge-pilot/verify-local.mjs
```

The patched runs both returned exit 0; [first log](generation-patched.log) and [repeat log](generation-patched-repeat.log) record `generated 2 operations`, 2 `sdk-map` entries, and no unmatched generated methods or unresolved spec operations. The [generated artifact](generated/) has **62 files, 100,717 file bytes**. `diff -qr` of the saved first output and regenerated output returned exit 0 with no output. The generated `sdk-map.json` SHA-256 is `c5e18d027a50bb043777af5018532b37b9f808dcf5e39bb9bee7961ba8f10680`.

Generated methods: `getLink()` and `listAvailability({ from, to, timezone, durationMinutes? })`, both `GET`; responses are `Link` and `Availability`. The generated SDK includes a generic `fetch(input, init)` passthrough that can issue arbitrary HTTP methods, so the projection limits **named methods**, not this generic capability. No booking, room, operator, or credential operation appears in the map.

[verify-local.mjs](verify-local.mjs) started a loopback HTTP server around the actual Scheduler `handleApiRequest` with a deterministic service double; [local-verification.json](local-verification.json) records the result. The generated client made three requests: GET link, GET availability with the expected four query parameters, and GET availability returning HTTP 503. Deep comparisons passed for the two 200 bodies and the 503 body; all observed requests were GETs and carried no Authorization header. This is local handler verification, not a provider-backed Scheduler integration test.

Type limits: Forge widened the source `Link.durationMinutes: const 30` to `number`, its `[30,60]` enums to `number[]` or `number`, and optional `durationMinutes` request enum `[30,60]` to `number`. The generated 503 exception is typed with `Error_`, while the current Scheduler handler returns an `Availability` body with `status: retryable`; runtime behavior passed because Forge skips response validation. The generated client also retains Cloudflare-specific class names and envelope handling. These costs matter for adopting a client for just two public reads.

## Independent checks

| Command | Actual result |
| --- | --- |
| `node apps/create-something-scheduler/forge-pilot/project-readonly.mjs` | exit 0; exactly the two intended GETs and four schemas |
| `cmp -s "$scratch/openapi.before.json" apps/create-something-scheduler/forge-pilot/openapi.readonly.json` | exit 0; projection bytes unchanged |
| `pnpm --filter @create-something/create-something-scheduler check` | exit 0 (`tsc --noEmit`) |
| `pnpm --filter @create-something/create-something-scheduler exec vitest run src/http/openapi.test.ts src/http/api.test.ts` | exit 0; 2 files, 5 tests passed |
| `pnpm exec tsc --noEmit --module NodeNext --moduleResolution NodeNext --target es2022 --lib es2022,dom,dom.iterable --typeRoots "$scratch/forge-src/node_modules/@types" --types node --skipLibCheck --strict forge-pilot/generated/sdk/index.ts` (from Scheduler app) | exit 0; generated source typecheck with Forge's Node types |
| `node --import tsx apps/create-something-scheduler/forge-pilot/verify-local.mjs` | exit 0; local HTTP request/response assertions passed |
| `diff -qr "$scratch/generated-first" apps/create-something-scheduler/forge-pilot/generated` | exit 0; no changed files |

The Fern CLI also printed `All checks passed` for the projected OpenAPI before generator execution. This establishes parser acceptance, not generated-client correctness.

## Decision and unblock

**Defer production adoption pending independent review and an upstream Forge merge fix.** The scratch patch proves local generation and handler fidelity are possible, but the pinned unmodified Forge run fails. The next smallest step is to land or identify a reviewed upstream merge fix, then repeat unmodified generation twice and inspect the type widening, 503 response contract, and generic passthrough. This pilot contains no SDK publication, deployment, identity change, review approval, or merge.
