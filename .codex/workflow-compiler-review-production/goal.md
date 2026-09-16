# Workflow Compiler review recommendations to production

Linear: CRE-1960. Review: CRE-1959.
Companion route: [plan.md](./plan.md).

## Outcome
Complete all four recommendations from the September 7 review: reject unknown closed-record fields, publish the runtime-manifest APIs under a fresh npm version, make adapter readiness legible, and prove one authenticated read-only integration through the existing Workflow Runtime and its owning host.

## Baseline
Public @createsomething/workflow-compiler is 0.4.1 (77 files); current main has runtime-manifest APIs but still declares 0.4.1 (81 files). Source passed 172 tests and actual npm passed 50 selected regressions. Both accept unknown fields inside approval/transition records. Console and CLI work, but simulation pass does not explain missing adapter contracts. Existing runtime is zero-write; Control has an unregistered Template Review count-only seam with source-owner/projection and activation gates. Root is dirty and preserved. Isolated branch starts from origin/main 13ed8944c0babce358a08a70cd92347c8e78f830.

## Primary verifiers and proof
1. Install the exact new version from npm in disposable Node 22/24 consumers, run both starters and public API negative cases, signed compile/verify/tamper checks and runtime-manifest exports; verify dist-tag, integrity, signature/provenance and exact merged release.
2. Open the registry-generated console in Codex Browser on localhost; check readiness on permitted/missing-contract/wait/stop cases and after reload, with no captured browser errors. Terminal, GitHub CLI and CUA browser are available and were exercised in this task.
3. Through a reviewed terminal-operated GitHub commit-read integration in the owning host package (unless user selects Marketplace), bind a trusted compiled artifact to an authenticated read-only source result, receipt and durable checkpoint. Prove duplicate delivery/restart and authority/evidence/wait/stop negatives. Live source and ledger readbacks must agree. Existing Template Review lane has no accepted source projection or verified current activation; discover the owner contract before enabling it. If credentials/owner acceptance are unavailable, retain an explicit incomplete gate and exact owner handoff, never replace the live verifier with mocks.

## Constraints and authority
User explicitly requested production completion: implementation, isolated worktree, commits, PRs, normal protected merge, staging/release and scoped read-only production verification are authorized. Preserve staged npm publishing; human-only 2FA/passkey interaction must be completed by the maintainer at the concrete candidate. Do not bypass npm controls or protected review. No third-party writes, auto-approval, broader access, arbitrary executor, paid model workload, or unrelated website work. Core runtime remains deterministic and executor: never; authenticated transport belongs in the owning host. Source owner acceptance and exact activation/identity contracts must be established where required before any live source gateway is enabled.

## Loop and anti-cheating
Read goal and plan after steering/material evidence. Add a failing public-interface test, repair one slice, rerun, then broaden to downstream and release checks. Maintain one active phase. Preserve failures and exact SHAs. Never weaken fixtures, governance, schema versions, tests, or live evidence to pass. Review new field rejection for compatibility across downstream consumers. Use a new semantic release; do not relabel immutable 0.4.1.

## Completion and blocker criteria
All phases complete; PR review and required CI green; merged source; actual public npm receipt/consumer proof; rendered readiness proof; authenticated read-only integration and restart proof; Linear evidence and worktree disposition. A staged release alone is incomplete. An external gate blocks only when no independent useful work remains and the same constraint recurs for three consecutive goal turns. Report the exact needed maintainer/source-owner action. Difficulty or failing tests are repair work.

## Read-only proof scope refinement
The default source is one exact commit in createsomethingtoday/create-something-monorepo, via the already authenticated GitHub CLI. A terminal verifier in owned-agent-runtime uses the existing runtime core, signed source artifact, durable local checkpoint and independent restart/readback. It must state terminal/local-ledger scope and never claim hosted Control, Agency customer activation, Identity approval, or Marketplace A3 completion. No credentials are issued or printed. Existing Control/Marketplace goals and gates remain intact.
