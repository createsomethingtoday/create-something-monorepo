# Workflow Compiler production plan

## Current state

- Goal status: active
- Active phase: 1
- Active Linear issue: CRE-1834
- Worktree: `/private/var/folders/5v/bcpy60z558b1y2jctfx6108m0000gq/T/cre-1834-agent-worktree`
- Branch: `codex/CRE-1834-agent-worktree`
- Base: `origin/main` at `54ecda947286773fb08d77fb60da3580d95fc548`

## Phases

### 0. Establish governed delivery state — complete

- [x] Audit the prototype, downstream proof chain, registry state, and dirty root.
- [x] Create Linear map CRE-1831 and six bounded delivery issues.
- [x] Claim CRE-1834 and create an issue worktree from exact `origin/main`.
- [x] Bootstrap the worktree.
- [x] Write the durable goal and plan.
- [x] Activate the Ultragoal runtime.
- [x] Record baseline package verification from the clean worktree.

### 1. Stabilize schemas and CLI contract — in progress

- [x] Read and apply the test-first vertical-slice skill.
- [x] Add failing public-boundary tests for malformed workflow and replay inputs.
- [x] Implement explicit versioned runtime parsers and stable structured diagnostics.
- [x] Fail closed on unknown schema versions until an explicit migration is introduced.
- [x] Harden output ownership and root-path checks; replace complete artifact directories through a staged atomic rename.
- [x] Define and test stable CLI exit semantics for success, invalid input, governance stop, and unexpected operational failure. Adapter-level pass, wait, and stop remains in phase 3.
- [x] Run package, acceptance, exports, and direct downstream compatibility gates.
- [ ] Commit, push, open the review boundary, and record CRE-1834 evidence.

### 2. Add attestable bundles and security verification — pending

- [ ] Claim CRE-1832 in an exact-main issue worktree.
- [ ] Define the local attestation trust model and verification receipt.
- [ ] Add independent tamper verification through public exports and CLI.
- [ ] Add property or fuzz coverage, path/adversarial cases, performance bounds, dependency audit, and threat model.
- [ ] Promote through review and record CRE-1832 evidence.

### 3. Prove a second vertical and builder adapters — pending

- [ ] Claim CRE-1837 in an exact-main issue worktree.
- [ ] Add a non-Webflow workflow example with a distinct evidence and approval shape.
- [ ] Read official OpenAI guidance before implementing the OpenAI/Codex adapter.
- [ ] Add provider-neutral MCP and primary OpenAI/Codex adapter contracts.
- [ ] Prove pass, wait, and stop outcomes without network or external mutation.
- [ ] Promote through review and record CRE-1837 evidence.

### 4. Ship CI, docs, and release gates — pending

- [ ] Claim CRE-1833 in an exact-main issue worktree.
- [ ] Add five-minute quickstart, API reference, examples, compatibility policy, and upgrade policy.
- [ ] Add supported Node matrix, real CI entrypoint, npm metadata, package inventory, and clean-tarball consumers.
- [ ] Add trusted-publication workflow using the established staged approval and provenance pattern.
- [ ] Prove the release candidate and promote through review with CRE-1833 evidence.

### 5. Publish and independently verify npm — pending

- [ ] Claim CRE-1836 and rebase release preparation on exact protected `main`.
- [ ] Verify staged artifact, version, tag, changelog, license, repository metadata, and rollback plan.
- [ ] Run the approved trusted publication path; surface human passkey/security-key confirmation if npm requires it.
- [ ] Independently read back registry metadata, dist-tag, provenance, and trusted-publisher state.
- [ ] Install and execute the registry version in disposable supported-Node consumers.
- [ ] Record each receipt separately and close CRE-1836 only after registry proof.

### 6. Publish the fixed-scope integration offer — pending

- [ ] Claim CRE-1835 in an exact-main issue worktree.
- [ ] Read and apply the public-surface and browser verification skills.
- [ ] Fit the offer into the existing agency information architecture and conversion path.
- [ ] Implement the narrow page or section with accurate local/CI positioning and no hosted-control-plane implication.
- [ ] Run package checks, review, merge, deploy, and verify representative production desktop/mobile routes.
- [ ] Record deployment, rollback, browser evidence, and worktree disposition in CRE-1835.

### 7. Close the map and goal — pending

- [ ] Re-run the primary verifier from registry and production surfaces.
- [ ] Confirm every child issue has evidence and an explicit worktree disposition.
- [ ] Comment the consolidated receipt index on CRE-1831 and mark the map complete.
- [ ] Mark the Ultragoal complete only when every completion-proof item in `goal.md` is satisfied.

## Evidence log

- 2026-08-22: `pnpm linear:ready` succeeded through the repository Linear wrapper.
- 2026-08-22: Linear map CRE-1831 created with children CRE-1832 through CRE-1837.
- 2026-08-22: CRE-1834 claimed; issue worktree created from `origin/main` at `54ecda947286773fb08d77fb60da3580d95fc548`.
- 2026-08-22: `pnpm bootstrap:worktree` completed. Missing prebuild bin-link warnings were observed during install; bootstrap itself completed successfully.
- 2026-08-22: Baseline `pnpm --filter @create-something/workflow-compiler check`, `test`, and `test:acceptance` passed: 16 tests, deterministic 18-artifact acceptance, five replay cases, and complete pass/approval-required/blocked coverage.
- 2026-08-22: Production contract verification passed: 25 package tests, deterministic 18-artifact acceptance, TypeScript check, public export lookup, Prettier, and `git diff --check`.
- 2026-08-22: Direct downstream tests passed for evidence extraction (6), historical context (2), observation reconciliation (3), receipt reconciliation (5), and Interaction Atlas MCP (73) after its declared prerequisite build. Interaction Atlas build also passed.
- 2026-08-22: Workflow Shadow Pilot ran 11 tests with 8 passing and 3 failing on the pre-existing Atlas source-hash pin. `git diff --exit-code origin/main -- packages/workflow-shadow-pilot packages/database-layer/data/create-something-internal-operating-topology.atlas-session.json` proved the failing inputs are unchanged by CRE-1834.
- 2026-08-22: PR #1491 automated review identified mode drift during atomic directory replacement. A failing public CLI test reproduced `0700` becoming `0755`; the repair now carries the existing output mode onto the staging directory before promotion.
- 2026-08-22: Fresh review of the permission repair identified read-only mode timing and unstructured replay workflow-ID mismatches. Public CLI tests reproduced both; staging now applies the preserved mode only after writes and makes the old backup removable, while replay mismatches return `ReplayInputValidationError` with exit code 2.
