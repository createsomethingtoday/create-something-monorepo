# PRIVATE bounded validation runner prototype

Tracking: [CRE-2091](https://linear.app/createsomething/issue/CRE-2091/prototype-private-bounded-package-validation-runner), under the approved [CRE-2089 intent map](https://linear.app/createsomething/issue/CRE-2089/map-private-creator-monetization-learning-evidence-and-bounded-jev).

This separate, local runner tests **owned synthetic fixtures only**. It has no upload endpoint, package-path argument, PRIVATE binding, payment integration, model credentials or publication authority. It never executes creator packages. PRIVATE's existing prohibition on executing uploaded content remains intact.

## Result and decision

The local Docker reference profile passed its isolation and resource tests. The Codex profile additionally passed a real, offline plugin install/materialize/remove cycle with a bundled skill. Preserve this as the reference harness for subsequent provider acceptance. **Cloudflare Sandbox remains a candidate, not an accepted production execution backend.**

| Component | Evidence-backed version / scope |
| --- | --- |
| Node | 24.21.0, Linux ARM64; official image pinned by digest |
| Codex CLI | 0.155.1; pinned npm package in an immutable locally built image |
| Docker engine | 29.1.5, Docker Desktop Linux engine |
| MCP fixture | Synthetic stdio exchange using protocol version 2025-11-25; initialization, listing, successful echo, unknown-tool rejection, invalid-input rejection |
| Skill/plugin | Owned local marketplace plugin installs, skill file materializes with expected content, uninstall removes the cached skill |
| Model | None; zero API/model calls |
| Cloudflare runtime | Not deployed or tested by this prototype |

Exact image identities, fixture hashes, runner/policy hashes, runtime readbacks, observed controls, timestamps and cleanup results are retained in [`evidence/local-run.json`](evidence/local-run.json) and [`evidence/codex-run.json`](evidence/codex-run.json). These are local evidence files, not signed certifications or trusted inputs to a publication gate.

## Enforced prototype limits

- One suite at a time per host through an exclusive lock; a stale lock requires reconciliation.
- At most 12 fixture runs per suite, with no new work admitted after 120 seconds. This is an admission deadline, not a hard cap on provider billing or total cleanup time.
- Each execution: 0.5 CPU, 256 MiB RAM with no additional swap, 32 processes, 16 MiB writable scratch, 64 KiB combined output capture, 32 KiB source input.
- Five-second in-container timeout, eight-second host execution watchdog; bounded Docker management commands. A watchdog expiry fails validation. Container termination/removal is attempted even after output overflow, timeout or errors; failed/unverifiable cleanup stops the suite.
- No network interface except loopback, no host mounts, no forwarded credentials, no Docker socket, non-root user, dropped capabilities, no privilege escalation, read-only root filesystem, no restart policy and no persistent Docker logs.
- Each fixture receives a fresh container. Repeating the isolation fixture verifies that the previous scratch marker does not survive. Exact-name Docker readback verifies removal.

The workload makes **zero paid API calls**. These are compute and execution limits, not a dollar estimate for Cloudflare. Image downloads and trusted toolchain builds happen separately; build time, local storage and operator time are outside execution limits. Cloudflare pricing also includes Workers, Durable Objects and optional logs, so no per-validation dollar claim is established here.

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
- A packaged skill being installed does not prove model invocation, answer quality, instruction adherence, or agent outcomes. No model configuration is qualified yet.
- The installed Codex CLI is not proof of Codex Desktop compatibility, remote MCP access, hooks, or every plugin capability.
- Linux ARM64 evidence does not imply AMD64, macOS, Windows, Python or native-binary compatibility.
- Docker configuration and adversarial fixture checks are not proof of Cloudflare VM/network isolation. An independent supervisor and crash recovery are still required for an untrusted multi-tenant service; a host process can be killed and leave resources behind. The in-container timeout is defense in depth, not an independent trusted boundary against malicious code running as the same user.

## Cloudflare decision and next acceptance packet

The repo's existing client-workspace uses `@cloudflare/sandbox` 0.12.3. Do not assume that version supports every feature in current docs or reuse its credential-bearing gateway for untrusted uploads. Before selecting a provider version:

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

No cloud resources or PRIVATE configuration were changed. Each container is labeled `private.validation=private-validation-prototype/v1`. After an interrupted run, inspect `docker ps -a --filter label=private.validation=private-validation-prototype/v1`; reconcile each exact container against the evidence before removing it. Only then remove the stale `private-validation-prototype.lock` directory in the host temporary directory. Do not delete unrelated containers or locks.

The image is retained locally for repeatable review. The isolated worktree is retained until the prototype review and provider decision. Rollback is to stop using this standalone harness; PRIVATE has no dependency on it.
