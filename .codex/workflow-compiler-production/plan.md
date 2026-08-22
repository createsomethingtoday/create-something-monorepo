# Workflow Compiler production plan

## Current state

- Goal status: active
- Active phase: 2
- Active Linear issue: CRE-1832
- Worktree: `/private/var/folders/5v/bcpy60z558b1y2jctfx6108m0000gq/T/cre-1832-agent-worktree`
- Branch: `codex/CRE-1832-agent-worktree`
- Base: `origin/main` at `a85ea46e2ebf31e100e346760a44e5eb79ac2098`

## Phases

### 0. Establish governed delivery state — complete

- [x] Audit the prototype, downstream proof chain, registry state, and dirty root.
- [x] Create Linear map CRE-1831 and six bounded delivery issues.
- [x] Claim CRE-1834 and create an issue worktree from exact `origin/main`.
- [x] Bootstrap the worktree.
- [x] Write the durable goal and plan.
- [x] Activate the Ultragoal runtime.
- [x] Record baseline package verification from the clean worktree.

### 1. Stabilize schemas and CLI contract — complete

- [x] Read and apply the test-first vertical-slice skill.
- [x] Add failing public-boundary tests for malformed workflow and replay inputs.
- [x] Implement explicit versioned runtime parsers and stable structured diagnostics.
- [x] Fail closed on unknown schema versions until an explicit migration is introduced.
- [x] Harden output ownership and root-path checks; publish immutable revisions through one atomic managed-pointer rename.
- [x] Define and test stable CLI exit semantics for success, invalid input, governance stop, and unexpected operational failure. Adapter-level pass, wait, and stop remains in phase 3.
- [x] Run package, acceptance, exports, and direct downstream compatibility gates.
- [x] Commit, push, open the review boundary, and record CRE-1834 evidence.

### 2. Add attestable bundles and security verification — in progress

- [x] Claim CRE-1832 in an exact-main issue worktree.
- [x] Define the local attestation trust model and verification receipt.
- [x] Add independent tamper verification through public exports and CLI.
- [x] Add property or fuzz coverage, path/adversarial cases, performance bounds, dependency audit, and threat model.
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
- 2026-08-22: Latest review identified output group ownership drift. A POSIX alternate-group test reproduced the change; atomic promotion now reapplies UID, GID, and mode before rename, fails before replacement when the OS denies ownership, and rejects symlink output paths rather than silently replacing the link.
- 2026-08-22: Follow-up review identified descendant file group drift. The alternate-group test now checks the manifest and compiled artifact; staging applies the target GID and private setgid mode before writes, then recursively reapplies UID/GID before final mode and promotion.
- 2026-08-22: Exact-commit review identified duplicate action and replay-case identifiers plus a crash window between two directory renames. Public parser tests now reject both duplicate classes. Artifact publication now stages an immutable sibling revision and atomically advances one compiler-owned symlink, retaining the previous revision and rejecting unsafe or legacy direct-directory migration.
- 2026-08-22: Managed-pointer access checks now prove the hidden control and revision directories preserve the published output's group traversal and GID boundary, while retaining owner write access needed for safe future revisions. The package suite passes 34 tests and the repository legibility verifier passes all 35 opted-in packages.
- 2026-08-22: Exact-commit review identified a concurrent-publisher pruning race and duplicate IDs outside actions. Automatic revision garbage collection was removed so no portable cross-process race can delete the winning pointer target; cleanup is now an explicit quiescent-output responsibility. Every ID-bearing workflow collection and replay case set now fails closed on duplicates. The package suite passes 43 tests.
- 2026-08-22: Exact-commit review identified inherited non-owner write authority on compiler control directories and an unused replay actor boundary. Control paths now retain read/traversal access while stripping group/world writes. Replay blocks unknown and unauthorized actors before policy/evidence evaluation and records the observed actor in both report results and receipts. The marketplace fixtures now name the owning authority for reviewer actions; the package suite passes 46 tests.
- 2026-08-22: Exact-commit review identified unmarked control-directory adoption and artifact mode drift across umasks or operator adjustments. The compiler now requires an owner-only versioned marker bound to the resolved output path, assigns deterministic `0644`/`0755` defaults, and carries deliberate per-path modes into the next immutable revision. The package suite passes 49 tests; deterministic acceptance, package typecheck, diff hygiene, and repository legibility all pass.
- 2026-08-22: Review of the marker repair identified the immediate pre-marker upgrade boundary. One explicit migration now initializes the marker only when the existing public symlink, real revisions directory, direct revision target, and valid workflow artifact manifest prove prior compiler ownership; unrelated unmarked control directories remain fail-closed. The package suite passes 50 tests.
- 2026-08-22: Exact review tightened pre-marker adoption from a schema-version check to complete evidence verification. Migration now requires the exact manifest shape, sorted unique canonical paths, every base artifact, every listed SHA-256 content hash, regular files, and agreement between manifest and compiled-bundle identity. Incomplete and hash-tampered migration tests fail before marker creation; the package suite passes 52 tests.
- 2026-08-22: PR #1491 received a clean exact review on `9b680b6b716117b7aacc61114d4dff3443006581`; Public Distribution GA, Philosophical Code Review, MCP quality, package legibility, and both Socket checks passed. The PR merged to protected `main` as `a85ea46e2ebf31e100e346760a44e5eb79ac2098`.
- 2026-08-22: CRE-1832 was claimed and bootstrapped in a new issue worktree based on exact `origin/main` merge `a85ea46e2ebf31e100e346760a44e5eb79ac2098`.
- 2026-08-22: Phase-2 public verification now separates SHA-256 manifest integrity from optional Ed25519 signer attestation. Identical bundles and keys produce deterministic sidecars and receipts; receipt states distinguish unsigned, present-but-unverified, and trusted-key verified outcomes. Wrong keys, missing attestations under a trust requirement, and invalid signatures stop with structured diagnostics.
- 2026-08-22: Adversarial verification covers normalized paths, NUL/backslash/absolute/dot-segment escapes, undeclared files and directories, internal symlinks, malformed attestation property families, 512-file and byte-size limits, zero runtime dependencies, and a 100-verification local CI performance bound. `THREAT_MODEL.md` records trust statements, residual risks, and non-goals.
- 2026-08-22: Phase-2 validation passes 60/60 package tests, deterministic 18-artifact acceptance, package typecheck, 88-export discovery, diff hygiene, and direct downstream suites for evidence extraction (6), historical context (2), observation reconciliation (3), and receipt reconciliation (5). Attestation signatures bind key identity metadata as well as the canonical manifest hash; top-level receipts reserve `verified` for trusted-key success and report `integrity_verified` otherwise.
- 2026-08-22: Exact PR review identified an allocation-before-limit check and runtime key-ID coercion. A permission-denied sparse oversized-artifact regression proves metadata limits stop before content reads, and public signing tests cover undefined, null, numeric, and boolean key IDs. The verifier now performs per-file and aggregate stat bounds before allocation while retaining post-read byte checks; the package suite passes 62 tests.
