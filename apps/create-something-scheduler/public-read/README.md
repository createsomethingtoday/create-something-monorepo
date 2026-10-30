# Scheduler public read client

This private workspace facade serves the Automation tier. The OpenAPI projection
and generator receipts are Database artifacts; the two-GET allowlist and upstream
promotion gate implement the Judgment boundary. `BookingService` still owns all
scheduling behavior.

**Staged, not production-qualified.** The facade currently uses the unchanged,
patched pilot snapshot in `./generated`. Its generated 503 error
annotation predates the corrected source contract. The facade decodes the actual
body as `unknown` and validates it, rather than trusting that annotation. Nothing
in generated output was edited to hide drift. The upstream Forge fix and fresh
generation belong to [Paperclip CRE-186](https://paperclip.createsomething.agency/CRE/issues/CRE-186)
on the `create-something` instance. Linear CRE-2165 remains the parent scope.

## Consumer contract

```ts
import {
  createSchedulerReadClient, AvailabilityUnavailableError
} from '@create-something/create-something-scheduler/public-read';

const scheduler = createSchedulerReadClient();
const link = await scheduler.getLink();
try {
  const availability = await scheduler.listAvailability({
    from: '2026-10-01T00:00:00Z', to: '2026-10-02T00:00:00Z',
    timezone: 'America/Chicago', durationMinutes: 60
  });
} catch (error) {
  if (error instanceof AvailabilityUnavailableError) {
    // Show temporary unavailability; error.body preserves the lifecycle receipt.
    // Do not interpret it as available time or as a successful empty slot list.
  } else {
    throw error;
  }
}
```

Only this subpath is exported by the private app package. It is TypeScript source
for workspace consumers using TypeScript/tsx/a bundler, not a published npm SDK.
`getLink` returns the declared duration fields; undeclared policy fields are
stripped. `listAvailability` returns validated `available` results and throws
`AvailabilityUnavailableError` for a validated retryable 503 with no slots.
Input and output durations are `30 | 60`; the link default is exactly `30`.

The frozen client has only two methods. There are no request overrides, header,
credential, custom fetch, generic fetch, logging, retry, or write options. The
only constructor option is an HTTPS origin; loopback HTTP supports local tests.
An internal transport rechecks method, origin, path, query keys and credential
headers, emits only `Accept: application/json`, omits browser credentials, and
rejects redirects. Requests use the generated client's 15-second timeout with
zero retries. The recurring consumer boundary uses pinned `effect@3.22.2` for
typed request and decoding failures, following the repo's Effect integration
guide and [Effect v3 expected errors](https://effect.website/docs/v3/error-management/expected-errors).
The public methods remain Promises, and Zod still validates inputs and outputs.
`SchedulerReadError` distinguishes `transport`, `http`, and `decode` failures,
names the operation, and retains the original cause (including the generated
HTTP status/error chain). The validated 503 remains `AvailabilityUnavailableError`
with its lifecycle body and original generated error as cause. Effect failures
are unwrapped at the Promise boundary so callers receive these errors directly.

This client owns no persistent resources. The generated SDK continues to own
the 15-second request timer and abort signal; tests prove timeout abort and timer
cleanup. No retry schedule is installed: the attempt budget is exactly one,
including transient failures and Calendar's retryable 503. Retry exhaustion is
therefore the original single failure, never a synthesized available result.
The generator and generated snapshot do not depend on this runtime change.

## Local verification

Run the repo's `pnpm bootstrap:worktree` first with Node 22.21.1/pnpm 9.15.0.
All commands below run from the repo root:

```sh
pnpm --filter @create-something/create-something-scheduler project:public-read
pnpm --filter @create-something/create-something-scheduler check:public-read
pnpm --filter @create-something/create-something-scheduler test:public-read
pnpm --filter @create-something/create-something-scheduler verify:public-read
pnpm --filter @create-something/create-something-scheduler check
pnpm --filter @create-something/create-something-scheduler test
pnpm --filter @create-something/create-something-scheduler build
git diff --check origin/main...HEAD
```

The committed-range diff check currently reports the raw pilot snapshot's extra
final blank line in `generated/sdk/sdk-operation-types.ts`. It must pass after
official Forge regeneration; a clean working-tree check alone is insufficient.

The typecheck includes every generated `.ts` file and negative consumer type
checks. Tests cover unsupported durations/options, malformed success/503 bodies,
permanent failure, cause preservation, timeout abort/cleanup, no retry, and
simulated generated transport escape attempts.
`verify:public-read` uses a real loopback HTTP server, `handleApiRequest`, and
`BookingService` with a controlled Calendar adapter. It asserts 200/200/503,
eleven safe 60-minute slots, exact lifecycle error bytes after JSON parsing,
unauthenticated GET requests, two Calendar reads and zero writes. It also checks
that Node refuses package imports of generated internals.

`smoke:public-read` uses the same exported client against the live public origin.
It performs exactly two reads with no credentials and fails on a 503. Optional
`SCHEDULER_READ_ORIGIN`, `SCHEDULER_READ_FROM`, and `SCHEDULER_READ_TO` select an
origin and ISO instant window. It prints status, duration and slot counts only.
This is public-read evidence, not deployment revision or user acceptance proof.
Do not induce a provider outage in production; test 503 locally.

## Generation and CI handoff

`generator-lock.json` deliberately has `status: blocked_upstream` and no release
revision. `generate:public-read --check` fails before network or generation until
a reviewed fix is reachable in the official Forge repository. The CI `generation`
job runs this gate and therefore stays red while blocked; it is never skipped or
allowed to pass using the old pilot. The separate `boundary` job runs local checks.

The upstream handoff owner must:

1. Record the reviewed official Forge commit in `revision` and change `status`
   to `reviewed_upstream`; retain upstream review/merge evidence in Linear.
2. Verify the pinned Fern CLI, generator, image digest and platform in a clean
   Docker-backed runner. The generation script resolves upstream's image-tag
   pull to the pinned digest through a Docker command shim; it does not patch
   Forge source. Forge's own Fern wrapper remains upstream-owned.
3. Run `generate:public-read --write` with `FORGE_SCRATCH_DIR` set outside
   Paperclip/CI. The script clones the exact official revision, installs frozen
   dependencies, builds from the source projection, creates two clean output
   directories, compares every path/byte hash (including dotfiles), verifies
   exactly the two GET operations, and checks the generator's tracked source is
   unchanged. It saves logs and full manifests in the reported scratch directory.
4. Review the regenerated snapshot diff, update provenance labels, rerun the
   facade/source checks and `generate:public-read --check`, and upload the saved
   manifests/receipts as durable issue artifacts before scratch cleanup.
5. Obtain independent exact-revision review through
   [CRE-188](https://paperclip.createsomething.agency/CRE/issues/CRE-188). The parent
   owner controls repo PR, merge, deployment, live revision readback and rollback.

The script's post-gate Docker path is staged until this upstream handoff; a
successful fail-closed gate test is not a successful generation run. No release
or deployment workflow is changed here. Rollback before adoption is removal of
the facade export and this additive CI workflow; the source-only 503 correction
does not change handler behavior. Production rollback remains the existing
reviewed Scheduler Worker release workflow and retained Worker version.
