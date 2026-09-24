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

### Qualification decision

**Do not enable creator package execution on this Cloudflare profile.** The initial normal run printed its observations but exited 137 under the six-second watchdog. Public-IP TCP, HTTPS and DNS checks timed out; these are inconclusive, not proof of denied egress. One private-IP connection was refused. The probe uses a timed race around DNS lookup, which does not cancel the underlying resolver operation; process-exit behavior needs repair and a separately budgeted rerun. Preserve the failed receipt rather than converting a printed result into a pass.

The four-case acceptance script continues after a probe-exit failure so independent recovery controls can still be evaluated. Its final result remains failed if any check fails. This is a provider experiment outcome, not a release gate bypass. A follow-up must also bound supervisor operations, assess dispatch-versus-reaper races and verify adversarial resource constraints before accepting untrusted execution.

Final live receipt: [`evidence/cloudflare-complete-run.json`](evidence/cloudflare-complete-run.json) records 25/27 checks passed; both normal probe exits failed with 137. All four runs have SDK `stopped` readback, both fault cases were recovered from `healthy` by the deadline reaper in about 45.3 seconds, and the fifth admission returned 429. [`evidence/cloudflare-final-state.json`](evidence/cloudflare-final-state.json) retains the final ledger with zero active reservations. Wrangler's application list still reports the application's configured/live-instance count as 1; this does not establish zero billed usage. Provider billing reconciliation remains open. Exact deployment identity is in [`evidence/cloudflare-deployment.json`](evidence/cloudflare-deployment.json).
