# Preflight Submission Artifact Receipts Plan

Goal: `/Users/micahjohnson/Code/create-something-monorepo/.agent-goals/preflight-submission-artifact-receipts/goal.md`

Linear: CRE-1619

## Phase 1: Reconcile Source, Ownership, And Worktree
Status: complete

Implementation
- [x] Create CRE-1619 with the receipt, canonical-form, and live-verifier contract.
- [x] Record root, candidate branch, scanner, and approval baselines.
- [x] Claim and bootstrap an isolated CRE-1619 worktree.
- [x] Reconcile the stale CRE-1264 candidate with current `origin/main` without importing unrelated pilot history.

Verification
- [x] Confirm the root remains untouched except for these goal artifacts and the nested isolated checkout.
- [x] Record the CRE-1619 base SHA and exact candidate files/commits adopted.

Exit criteria
- [x] A clean, owned, bootstrapped worktree contains the smallest current-base implementation surface.

## Phase 2: Define The Public Artifact-Set Contract In Tests
Status: complete

Implementation
- [x] Add failing tests for bundle plus source-map upload.
- [x] Add failing tests for conditional map requirements and meaningful association.
- [x] Add failing tests for immutable receipt fields and exact hash reconciliation.
- [x] Add failing compatibility tests for bundle-only history and receipt-optional rollout.

Verification
- [x] Capture expected RED failures before implementation.

Exit criteria
- [x] Tests express public behavior without private implementation coupling.

## Phase 3: Implement Private Artifact Storage, Validation, And Receipts
Status: complete

Implementation
- [x] Add an additive artifact-set schema for one bundle and one private map container holding one or more maps per artifact-set version.
- [x] Harden validation so empty/non-meaningful mappings cannot satisfy the gate and association is deterministic.
- [x] Compute server-owned SHA-256 identities and persist policy/scan metadata.
- [x] Issue access-controlled receipts without raw maps, secrets, or public storage coordinates.
- [x] Preserve bundle-only review compatibility.

Verification
- [x] Phase 2 focused tests pass.
- [x] Migration and access-control focused tests pass.

Exit criteria
- [x] The Worker owns artifact identity and issues trustworthy receipts.

## Phase 4: Add Canonical Submission Reconciliation
Status: complete

Implementation
- [x] Add the optional receipt/hash adapter contract.
- [x] Reconcile exact bundle and source-map hashes.
- [x] Keep missing receipts fail-open and visibly unverified during rollout.
- [x] Reject or flag supplied receipts whose artifacts differ.
- [x] Document the approval-gated external form change.

Verification
- [x] Matching, missing, unknown, and mismatched cases pass focused tests; receipts do not expire in the v1 contract.

Exit criteria
- [x] The form stays canonical without losing provenance or silently accepting drift.

## Phase 5: Complete The Designer Extension Reviewer Flow
Status: complete

Implementation
- [x] Support bundle and required private-map selection.
- [x] Explain conditional requirements and privacy.
- [x] Display receipt, hashes, scan, and reconciliation state without map contents.
- [x] Preserve runtime checks and tie observed identity to the reviewed bundle hash within the artifact set.

Verification
- [x] Component/API tests cover success, validation failure surfaced by the server, existing auth failure behavior, and revision retry.
- [x] Extension tests and typecheck pass.

Exit criteria
- [x] Developers and reviewers can distinguish inspected, submitted, and published bytes.

## Phase 6: Package And Integration Verification
Status: in_progress

Implementation
- [ ] Run Worker, extension, scanner, migration, and contract tests.
- [ ] Run available type, lint, build, and repo integration checks.
- [ ] Inspect for secrets, public maps, unrelated churn, and stale generated bundles.
- [ ] Prepare rollback and deployment notes.

Verification
- [ ] Record exact commands and results in Evidence.

Exit criteria
- [ ] The branch is reviewable and remaining work is only approval-gated promotion.

## Phase 7: Approval-Gated Promotion And Primary Verification
Status: pending

Implementation
- [ ] Obtain explicit approval for required production/external mutations.
- [ ] Deploy through owning promotion paths and record immutable IDs.
- [ ] Run two authenticated matching Designer-to-canonical submissions.
- [ ] Run mismatch and published-runtime identity cases.
- [ ] Record rollback and fail-open state.

Verification
- [ ] The Primary Verifier passes with receipt, hash, runtime, and UI evidence.

Exit criteria
- [ ] Completion-state Slack copy is factually supportable.

## Phase 8: Closeout
Status: pending

Implementation
- [ ] Update CRE-1619 with commits, PR, checks, deploy IDs, live proof, rollback, and worktree disposition.
- [ ] Mark the durable goal complete only when no required work remains.

Verification
- [ ] Goal, plan, Linear, and production agree.

Exit criteria
- [ ] Completion messaging can be shared.

## Evidence

- 2026-08-05: CRE-1619 created.
- Baseline: candidate branch `codex/CRE-1264-app-review-companion-production-pilot` at `0f8fd9f4e`; package absent from local `origin/main`; divergence is 365 origin-main-only and 25 branch-only commits.
- Baseline: candidate extension uploads only `bundle`; migration stores singular bundle artifact fields.
- Baseline: shared scanner accepts a fixture with empty `mappings`; validation must be hardened before gating.
- Phase 1: isolated clone `/Users/micahjohnson/Code/create-something-monorepo/.agent-worktrees/cre-1619` on `codex/CRE-1619-preflight-artifact-receipts`, based exactly on local `origin/main` SHA `3a170ff8a71b38d2f6c3555ed49100457e102bec`.
- Phase 1: transplanted only the final `packages/webflow-app-review-preflight` tree from the CRE-1264 candidate; no stale commit history or unrelated companion/dispatcher/template package changes were adopted.
- Phase 1 integration repair: added the missing `packages/*/runner` workspace pattern and made Preflight build/test build its declared `bundle-scanner-core` dependency first.
- Phase 1 baseline: core tests passed 5/5, extension 10/10, runner 12/12, and Worker 33/33 after a clean bootstrap and lockfile reconciliation.
- Phase 2 RED: core rejected the intended artifact-set assertions; the Worker returned 400 for receipt creation, the wrong error for missing maps, and 401 for the reconciliation route; the extension omitted source maps and receipt UI.
- Phase 3-4 focused GREEN: core source-map policy and receipt tests passed 5/5; Worker receipt, required-map, and reconciliation tests passed 3/3 before the current sandbox stopped allowing the Cloudflare pool's loopback listener.
- Phase 5 GREEN: extension API/component suite passed 13/13 and extension TypeScript check passed.
- Contract correction: both paths hash one original private source-map artifact container (preferred ZIP, fallback `.map`); extracted maps are validation input only. This makes exact form/Preflight reconciliation stable while supporting multiple `.map` files.
- Worker TypeScript check passes after receipt/reconciliation implementation. A later full Worker rerun is currently environment-limited by `listen EPERM 127.0.0.1`, not a test assertion; full verification remains in Phase 6.
- Phase 6 package matrix: bundle scanner 54/54 tests plus build; Preflight core 8/8 tests, typecheck, and build; Designer Extension 13/13 tests, typecheck, production build, production-config verification, and a 180,365-byte Webflow `bundle.zip`; runtime runner 12/12 tests, typecheck, and build.
- Phase 6 Worker checks: TypeScript and Wrangler dry-run build pass. All eight migrations replay cleanly into a fresh SQLite database with no foreign-key violations. The current sandbox prevents the Cloudflare Vitest pool from binding `127.0.0.1`, so the full 35-test Worker suite must run in CI or an unrestricted local shell.
- Phase 6 integration hygiene: `pnpm install --lockfile-only --frozen-lockfile` passes; lockfile additions are limited to the new workspace importers and their missing test dependencies; generated `public/bundle.js`, `bundle.zip`, and build output are ignored; `git diff --check` and bounded secret/storage-coordinate scans are clean.
- Phase 6 CI integration: registered the Preflight core, extension, runner, and Worker in the `services` workspace lane so root `pnpm check` and `pnpm test` workflows execute them. JSON validation and both lane dry-runs resolve all four packages.
- Publication: commit `6d5657b36` and the follow-up CI-lane commit are pushed on `codex/CRE-1619-preflight-artifact-receipts`; draft PR #1266 is open at `https://github.com/createsomethingtoday/create-something-monorepo/pull/1266`.
- Worktree wrapper note: `pnpm agent:claim-worktree -- --issue CRE-1619` could not update protected root `.git/FETCH_HEAD`; the exact-base isolated clone is the non-destructive sandbox fallback.
- Approval boundary: no production deploy, remote migration, Webflow install/publication, external form mutation, or external completion communication is authorized.
- State-path fallback: repo `.codex` is read-only in this sandbox, so durable Ultragoal state is stored under `.agent-goals`.

## Next Action

Use PR #1266 CI to complete the unrestricted Worker test gate, repair any branch-owned failures, then request explicit approval for Phase 7 production/external mutations and live authenticated verification.
