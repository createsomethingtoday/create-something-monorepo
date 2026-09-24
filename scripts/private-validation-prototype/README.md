# PRIVATE bounded validation runner prototype

Tracking: [CRE-2091](https://linear.app/createsomething/issue/CRE-2091/prototype-private-bounded-package-validation-runner), under the approved [CRE-2089 intent map](https://linear.app/createsomething/issue/CRE-2089/map-private-creator-monetization-learning-evidence-and-bounded-jev).

This separate prototype tests **owned synthetic fixtures only**. It has no upload endpoint, package-path argument, PRIVATE binding, payment integration or publication authority. It never executes creator packages. PRIVATE's existing prohibition on executing uploaded content remains intact.

## Result and decision

The local Docker reference profile passed its isolation and resource tests. The Codex profile additionally passed a real, offline plugin install/materialize/remove cycle with a bundled skill. Preserve this as the reference harness for subsequent provider acceptance. **Cloudflare Sandbox remains a candidate, not an accepted production execution backend.**

| Component | Evidence-backed version / scope |
| --- | --- |
| Node | 24.21.0, Linux ARM64; official image pinned by digest |
| Codex CLI | 0.155.1; pinned npm package in an immutable locally built image |
| Docker engine | 29.1.5, Docker Desktop Linux engine |
| MCP fixture | Synthetic stdio exchange using protocol version 2025-11-25; initialization, listing, successful echo, unknown-tool rejection, invalid-input rejection |
| Skill/plugin | Owned local marketplace plugin installs, skill file materializes with expected content, uninstall removes the cached skill |
| Model | Four owned Node workflow trials passed on `gpt-5-mini-2025-08-07`; see model evidence below |
| Cloudflare runtime | Separate preview deployed with Sandbox 0.12.10 / Wrangler 4.137.0; acceptance described below |

Exact image identities, fixture hashes, runner/policy hashes, runtime readbacks, observed controls, timestamps and cleanup results are retained in [`evidence/local-run.json`](evidence/local-run.json) and [`evidence/codex-run.json`](evidence/codex-run.json). These are local evidence files, not signed certifications or trusted inputs to a publication gate.

## Enforced prototype limits

- One suite at a time per host through an exclusive lock; a stale lock requires reconciliation.
- At most 12 fixture runs per suite, with no new work admitted after 120 seconds. This is an admission deadline, not a hard cap on provider billing or total cleanup time.
- Each execution: 0.5 CPU, 256 MiB RAM with no additional swap, 32 processes, 16 MiB writable scratch, 64 KiB combined output capture, 32 KiB source input.
- Five-second in-container timeout, eight-second host execution watchdog; bounded Docker management commands. A watchdog expiry fails validation. Container termination/removal is attempted even after output overflow, timeout or errors; failed/unverifiable cleanup stops the suite.
- No network interface except loopback, no host mounts, no forwarded credentials, no Docker socket, non-root user, dropped capabilities, no privilege escalation, read-only root filesystem, no restart policy and no persistent Docker logs.
- Each fixture receives a fresh container. Repeating the isolation fixture verifies that the previous scratch marker does not survive. Exact-name Docker readback verifies removal.

The local Docker workload makes **zero paid API calls**. The separate model fixture makes four bounded calls. These are compute and execution limits, not a dollar estimate for Cloudflare. Image downloads and trusted toolchain builds happen separately; build time, local storage and operator time are outside execution limits. Cloudflare pricing also includes Workers, Durable Objects and optional logs, so no per-validation dollar claim is established here.

## Run verbatim from the repository root

Requires an installed, running Docker engine and host Node 22+ (the repo runtime can launch the harness; fixture execution is on Node 24).

```bash
node --test scripts/private-validation-prototype/policy.test.mjs
docker pull node@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6
node scripts/private-validation-prototype/run.mjs node@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 scripts/private-validation-prototype/evidence/local-run.json
docker build --file scripts/private-validation-prototype/Dockerfile.codex --tag private-validator-codex:cre-2091 scripts/private-validation-prototype
validator_image_id=$(docker image inspect private-validator-codex:cre-2091 --format '{{.Id}}')
node scripts/private-validation-prototype/run.mjs "$validator_image_id" scripts/private-validation-prototype/evidence/codex-run.json codex
```

The Codex toolchain build fetches pinned `@openai/codex@0.155.1` with install scripts disabled. It receives no creator code or personal Codex configuration. The subsequent test uses its immutable image ID; mutable tags are rejected by the runner. The fixture's separate temporary `CODEX_HOME` lives only inside the container. The Docker build context excludes everything except its Dockerfile.

## What the evidence does not establish

- A synthetic fixture passing is not validation of any paid creator product, complete MCP conformance, a malware scan, or protection against every exploit.
- A packaged skill being installed does not prove model invocation, answer quality, instruction adherence, or agent outcomes. The four-trial model smoke test does not qualify arbitrary agents or Codex model invocation.
- The installed Codex CLI is not proof of Codex Desktop compatibility, remote MCP access, hooks, or every plugin capability.
- Linux ARM64 evidence does not imply AMD64, macOS, Windows, Python or native-binary compatibility.
- Docker configuration and adversarial fixture checks are not proof of Cloudflare VM/network isolation. An independent supervisor and crash recovery are still required for an untrusted multi-tenant service; a host process can be killed and leave resources behind. The in-container timeout is defense in depth, not an independent trusted boundary against malicious code running as the same user.

## Cloudflare decision and next acceptance packet

The repo's existing client-workspace uses `@cloudflare/sandbox` 0.12.3. Do not assume that version supports every feature in current docs or reuse its credential-bearing gateway for untrusted uploads. The preview below starts this packet. Before accepting a production provider:

1. Pin a supported SDK/image pair and deploy a separate authenticated test runner with no PRIVATE production bindings or customer data.
2. Prove network policy with direct IP, DNS, redirects, private/link-local addresses and non-HTTP attempts. Current docs describe `enableInternet = false` and outbound handlers; HTTP filtering alone is insufficient evidence of complete egress control.
3. Repeat resource, fresh-instance and destroy/readback checks on the actual provider. Add a durable deadline/reaper and fault-injection for caller death, duplicate dispatch and failed cleanup.
4. Implement atomic per-creator/global reservations, concurrency limits and a provider-usage reconciliation process before making dollar-cap claims. Quarantine uncertain runs rather than retrying blindly.
5. Add an explicitly budgeted credential broker for model tests. Select one exact model configuration and evaluate real owned skill/agent outcomes, with independent grading and negative cases.
6. Exercise real hosted MCP authentication and tenant separation on a dedicated Workers deployment. Then qualify real package releases and connect evidence to the paid-publication gate through the normal review path.

The sandbox provider is not an identity provider. PRIVATE continues to use CREATE SOMETHING Identity; any future test-runner authorization must follow the existing first-party authentication policy.

Primary references reviewed September 23, 2026:
- [Cloudflare Sandbox security model](https://developers.cloudflare.com/sandbox/concepts/security/)
- [Outbound traffic controls](https://developers.cloudflare.com/sandbox/guides/outbound-traffic/)
- [Sandbox pricing components](https://developers.cloudflare.com/sandbox/platform/pricing/)

## Recovery and disposition

A separate Cloudflare preview Worker, Durable Objects namespace and container application were created. PRIVATE configuration was not changed. Each container is labeled `private.validation=private-validation-prototype/v1`. After an interrupted run, inspect `docker ps -a --filter label=private.validation=private-validation-prototype/v1`; reconcile each exact container against the evidence before removing it. Only then remove the stale `private-validation-prototype.lock` directory in the host temporary directory. Do not delete unrelated containers or locks.

The image is retained locally for repeatable review. The isolated worktree is retained until the prototype review and provider decision. Rollback is to stop using this standalone harness; PRIVATE has no dependency on it.

## Bounded model fixture (CRE-2092)

[`evidence/model-run-authorized.json`](evidence/model-run-authorized.json) records four successful Responses API calls: two permitted sums and two untrusted-instruction cases. Trusted code validates every proposal and permits only bounded integer addition or stop. No external action is available to the model. The exact snapshot is `gpt-5-mini-2025-08-07`, minimal reasoning, 1,024 output-token ceiling, 8 KiB request ceiling and 30-second timeout per call; there are no automatic retries.

Usage was 852 input and 126 output tokens: $0.000465 at recorded list prices, not a billing invoice. The operator explicitly authorized the Infisical `WEBFLOW_OPENAI_API_KEY` billing project for these four calls only. This is not a permanent PRIVATE credential assignment. Prior failed attempts using the general key are retained separately and report `credit_balance_exhausted`.

The runner records request/source hashes, response IDs, usage and deterministic outcomes. It refuses to overwrite evidence and holds an exclusive local lock. This is a smoke test of an owned Node workflow using skill instructions, not broad reliability, prompt-injection resistance, Codex model invocation or validation of a creator product. Do not repeat the charged test under the original four-call authorization.

## Cloudflare preview acceptance (CRE-2092)

The `cloudflare/` directory contains a fixed-fixture, operator-only experiment. It cannot accept uploaded packages, arbitrary commands or caller-supplied tenant authority. Its durable ledger admits four lifetime runs, one at a time, retains uncertain reservations, and schedules an independent 45-second cleanup alarm before dispatch. Duplicate IDs return the original job. Container idle shutdown is two minutes so the shorter reaper can be observed. This experiment budget is not a reconciled provider-dollar cap.

The preview uses `@cloudflare/sandbox` 0.12.10, its pinned image digest, Node 24 and Wrangler 4.137.0. The deployed application is `private-validation-preview-validationsandbox`, ID `a03a0de4-bc04-4f6b-a183-32287814648f`, with one maximum `lite` instance. Image digest: `sha256:cb0c08d50483d46c57fb433bc378b2afdfa43dea3c7fc8afc882bd825a89b8f7`. Source and live observations are captured in the acceptance receipt.

The preview's random operator credential is for this experiment only. It is not a customer identity or publication authorization. Secrets and short-lived registry login state stay in ignored `.operator/`, with private file permissions. The adapter uses the authorized Workers token from Infisical without printing it or changing global Docker credentials.

Read-only inspection from `scripts/private-validation-prototype/cloudflare`:

```bash
node operate.mjs wrangler deployments list --json
node operate.mjs wrangler containers list
```

Existing acceptance IDs return their original records without admitting additional jobs; the ledger must not be reset to silently grant another experiment. The preview has no PRIVATE production bindings. Rollback is to stop using this dedicated experiment; retain its ledger and receipts for review. Independent production review, tenant identity, adversarial resource/egress qualification, hosted MCP authentication, provider billing reconciliation, and real package-version publication integration remain required.

### Initial qualification decision (retained history)

**Do not enable creator package execution on this Cloudflare profile.** The initial normal run printed its observations but exited 137 under the six-second watchdog. Public-IP TCP, HTTPS and DNS checks timed out; these are inconclusive, not proof of denied egress. One private-IP connection was refused. The probe uses a timed race around DNS lookup, which does not cancel the underlying resolver operation; process-exit behavior needs repair and a separately budgeted rerun. Preserve the failed receipt rather than converting a printed result into a pass.

The four-case acceptance script continues after a probe-exit failure so independent recovery controls can still be evaluated. Its final result remains failed if any check fails. This is a provider experiment outcome, not a release gate bypass. A follow-up must also bound supervisor operations, assess dispatch-versus-reaper races and verify adversarial resource constraints before accepting untrusted execution.

Initial live receipt: [`evidence/cloudflare-complete-run.json`](evidence/cloudflare-complete-run.json) records 25/27 checks passed; both normal probe exits failed with 137. All four runs have SDK `stopped` readback, both fault cases were recovered from `healthy` by the deadline reaper in about 45.3 seconds, and the fifth admission returned 429. [`evidence/cloudflare-final-state.json`](evidence/cloudflare-final-state.json) retains the final ledger with zero active reservations. Wrangler's application list still reports the application's configured/live-instance count as 1; this does not establish zero billed usage. Provider billing reconciliation remains open. Exact deployment identity is in [`evidence/cloudflare-deployment.json`](evidence/cloudflare-deployment.json).

## Completed probe repair and repeat experiment

The follow-up operator instruction authorized a new four-run Cloudflare repair experiment, `cre-2092-repair-budget-v2`. The original ledger and receipts remain intact. No additional model calls were made.

Each network operation now runs in a separate Node child with a 600 ms deadline and SIGKILL cleanup. This prevents unresolved DNS/HTTPS work from holding the probe process open. Raw timeout results remain inconclusive. A local no-network container exited zero under the unchanged six-second watchdog. Cleanup management operations have ten-second waiting bounds, and a stopped container does not release capacity while dispatch is unresolved. The real coordinator regression test covers retaining and then releasing that reservation. A timed-out supervisor call is not cancellation of the underlying provider operation.

The repaired image is `sha256:503e4abcbe29eb2ffc87c7dab35baadc9f41dd5c3fe0ee39c6cd37896337c8b1`; Worker version `3eb7f57c-e305-4e70-822a-f398c0d1e89d`. Wrangler returned before the application readback reflected the new image. The first run encountered HTTP 500 during that interval; the receipt retains it as a failure, without asserting that rollout lag caused the error. Two later probes (cleanup-fault and normal) exited zero on Node 24.21.0 / Linux x64 / UID 65534, with fresh scratch markers. The independent reaper recovered both fault cases; all four containers recorded stopped state and the fifth run was rejected. The repeat suite therefore records 26/27 checks, not an all-pass result.

[`evidence/cloudflare-repair-run.json`](evidence/cloudflare-repair-run.json) retains the complete trial history. [`evidence/cloudflare-repair-final-state.json`](evidence/cloudflare-repair-final-state.json) records the final provider image and exhausted ledger. The acceptance script now requires the intended digest as its third argument and checks the provider image before admitting any work. A wrong-digest check was exercised without spending a run.

**Repair complete; production qualification remains no-go.** Successful probe termination is distinct from proven network isolation. Most network attempts still time out; no provider invoice is reconciled. The preview remains owned-fixture-only. Further egress/resource/tenant and hosted MCP qualification belongs to production readiness, not a claim established by this prototype.

## CRE-2094: controlled qualification and inner isolation

The v3 experiment used four runs: an internet-enabled positive control, the original restricted SDK profile, and two hardened runs. The original non-root profile could reach the SDK HTTP API on localhost and execute the harmless `id -u` command as UID 0 inside its own VM. This is a failure of our earlier isolation configuration; it is not a demonstrated escape from Cloudflare's VM or another tenant. Both baseline receipts are retained in `evidence/cloudflare-qualification-v3.json`.

`cloudflare/isolate.sh` now places the owned process inside separate mount, network and PID namespaces. It makes root read-only, masks scratch with a 16 MiB tmpfs, makes shared memory read-only where present, drops all capability sets, prevents privilege elevation, and imposes hard limits of 32 processes, 64 file descriptors, 16 MiB per file and five CPU seconds per process. The trusted outer watchdog is 18 wall-clock seconds. The VM remains `lite` (256 MiB / 1/16 vCPU); a VM memory-exhaustion stress test is not established by the in-process cgroup readback, which is unavailable here. These are owned-fixture controls, not blanket kernel exploit protection.

Both hardened Cloudflare trials exited zero with internet enabled on the outer VM. Raw TCP and localhost management access returned `ENETUNREACH`; root writes returned `EROFS`; scratch exhaustion returned `ENOSPC`; 40 bounded child-launch attempts yielded 25 starts and 15 `EAGAIN` failures under the 32-process limit. Capability sets were zero and no-new-privileges was enabled; another namespace attempt was rejected. `/dev/shm` is absent on this provider (ENOENT), rather than writable. The HTTP canary failed inside the namespace; the same endpoint returned 200 in the earlier positive control. No timeout is reclassified as a denial.

Exact image: `sha256:8c7a224a3719810dcadb06ead44d1e9c2633ee76c25daeb91e39ffcebdeddd25`. Worker: `1b9922ef-b1f9-4c32-b236-83170f4175f1`. `evidence/cloudflare-qualification-isolation-v3.json` contains source hashes and observations; `evidence/cloudflare-isolation-assessment.json` evaluates the ten measured controls twice. All four v3 jobs have stopped readback and the fifth admission returns 429. Earlier experiment ledgers remain intact. No additional model calls were made.

The provider's application-filtered GraphQL usage API is now read through `cloudflare/usage.mjs`. It joins known instance IDs to usage samples and records missing coverage as unreconciled. Its receipt is `evidence/cloudflare-usage-readback.json`. Account-wide totals are not attributed to PRIVATE. An empty sample is never treated as zero usage; even complete sample coverage is not a final invoice or an all-services dollar cap. The returned inventory had zero live instances, but usage ingestion is incomplete.

PRIVATE's existing hook and asset-access tests passed 26 cases. Three live read-only export checks (anonymous, spoofed authority headers, invalid session cookie) returned 403; see `evidence/private-identity-negative.json`. These do not replace two authenticated tenant identities or hosted MCP audience checks. PRIVATE has no hosted validation MCP endpoint in this prototype, and none is claimed as accepted. The existing Identity platform remains the required authentication path; no bypass was added.

**Status: isolated fixture controls passed; CRE-2094 remains In Progress.** Completion still needs the identified test accounts/networks for live tenant checks, hosted MCP acceptance, successful memory qualification, and complete provider usage reconciliation. Do not promote this owned-fixture runner to customer execution or treat its unsigned local receipts as publication authorization. The pending test-identity request is an external access gate under `packages/private-pcn/AGENTS.md`.

### Memory qualification closeout: failed, cleanup verified

The operator-authorized continuation tested three additional bounded pairs without resetting the v3 ledger: memory/recovery (IDs 4–5), a cgroup candidate/recovery (6–7), and a wrapped memory command/recovery (8–9). The experiment ceiling was explicitly extended from four to six, eight, then ten runs for these stages. The final ledger is exhausted; an eleventh admission is denied. No model/API evaluation calls were added.

The first memory run lost the SDK command response (HTTP 500) and retained its reservation during unresolved dispatch. It was later confirmed stopped. The next isolated run passed. The cgroup candidate failed while enabling delegated memory/pids controllers with an I/O error. `cloudflare/isolate-cgroup-candidate.sh` preserves that failed candidate and is not part of the deployed image. A top-level shell exit could also terminate the SDK session, so the final memory command runs inside its own shell. That corrected command still timed out after 22 seconds without authoritative OOM evidence. Its cleanup and subsequent fresh isolation run passed.

`evidence/cloudflare-memory-assessment.json` therefore remains **failed**: the 256 MiB VM declaration and cleanup/recovery are verified, but neither an observed OOM kill nor a trustworthy kernel record establishes the expected memory-failure behavior. A 137 exit alone would not be enough either; the assessment tests enforce that distinction. Do not promote this profile to customer execution.

Final runtime image is restored to the passing namespace profile plus the owned memory fixture: `sha256:45b17e18e6149a0a16ba087daaf2127ccae2328c0861cad139f002993b8e86db`. Worker version: `85047d4e-5f87-4bcd-8bac-e17b99d86bd5`. The final readback is `evidence/cloudflare-qualification-final-state-v3.json`. All ten v3 jobs have stopped-state evidence and zero active reservations; this is cleanup proof, not billing proof. The final test pass includes 18 runner/assessment tests, 26 PRIVATE hook/asset tests, six Canon token/access tests, three live negative authorization checks, and the retired-provider guard.

The qualification driver refuses to relabel an existing run with new source hashes, waits up to three minutes for exact provider image readback before admission, and records failed executions without claiming acceptance. Original receipts remain immutable. The old `accept.mjs` is retained for the original experiment's modes; use `qualify-run.mjs` for v3 and inspect existing receipts after its budget is exhausted.

Current external gates: the operator has not identified two existing PRIVATE test accounts/networks; the names-only Infisical inventory did not identify dedicated PRIVATE test credentials. Identity administration keys are not substitutes for real authenticated users. Some known instances still lack application-scoped usage samples. CRE-2094 stays In Progress, with no new ticket used to hide unfinished acceptance. PRIVATE production and its paid/executable-asset gates remain unchanged.

Production review must also enforce an output limit before buffering an untrusted response: the current 8 KiB string slice limits retained fixture evidence, not the SDK's upstream buffering. The owned fixtures have bounded output; this is another reason the endpoint never accepts customer code.

## CRE-2094: streaming output qualification

The next authorized continuation added exactly two owned runs to the same v3 ledger (IDs 10–11, ceiling 12), without model calls. `cloudflare/supervise.mjs` now drains fixture stdout/stderr outside the inner namespaces, retains at most 8,192/1,024 bytes respectively, and kills the fixture process group when combined observed output exceeds 65,536 bytes or 18 seconds elapse. The SDK receives only the bounded trusted JSON envelope. The 64 KiB value is a termination threshold, not a promise that kernel pipe buffers cannot deliver additional bytes: the live flood observed 229,376 bytes while retaining bounded output. No customer commands or paths are admitted.

The output run returned exit 125 with `output-limit`, cleanup confirmed stopped, and the fresh isolation recovery passed. `evidence/cloudflare-output-assessment.json` records all five checks passing; productionReady remains false. `evidence/cloudflare-output-final-state-v3.json` records 12 cleaned runs, no active reservation, and a thirteenth request denied with 429. The 14 Cloudflare policy, coordinator, assessment and supervisor tests pass, including a quiet process with inherited-pipe descendants terminated by the watchdog.

Current Worker version: `77a7598e-5772-45bb-8e3f-d30a893187aa`. Current image: `sha256:76a99525607588be8b9f8acd1ad083ade317d2d107b9bbaa0d44087008f8fd4d`. The exact-image readback and source hashes are in `evidence/cloudflare-qualification-output-v3.json`. Earlier “final” receipts remain historical checkpoints. Rollback is the prior Worker `85047d4e-5f87-4bcd-8bac-e17b99d86bd5` and image `sha256:45b17e18e6149a0a16ba087daaf2127ccae2328c0861cad139f002993b8e86db`; preserve the v3 ledger and do not reset its admission budget.

This resolves the pre-SDK output-buffering gap for the hardened owned-fixture path. The original control/restricted positive-control paths remain deliberately unhardened and owned-only. Memory is still unqualified: the new supervisor has not established survival through VM memory exhaustion, and no claim is made that a failed delegated cgroup or a command timeout proves an OOM limit. Do not spend more runs repeating the same memory failure without a changed resource-isolation design. Production requires a supported guest memory budget that leaves management/reconciliation available, followed by adversarial memory and recovery evidence.

The refreshed provider usage snapshot has 12 samples for 20 known instances, eight missing, and zero live instances. The names-only production Infisical inventory still exposes no clearly named PRIVATE test-account credentials. Live authenticated tenant checks and hosted MCP acceptance remain open. CRE-2094 stays In Progress; creator execution and promotion remain disabled.
