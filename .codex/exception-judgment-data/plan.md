# Exception judgment data plan

Goal: [goal.md](goal.md). Linear: CRE-2061.
Current phase: 2 (blocked on independent review input). Activation deferred: primary human-reviewed verifier unavailable. No business-effectiveness claim. Root preserved; worktree /private/tmp/cre-2061-judgment-data.

## Phase 1: Durable offline foundation
Status: complete
Implementation
- [x] Reconcile CRE-2022, CRE-2060, CRE-2055 and CRE-2057 through live Linear and GitHub.
- [x] Claim isolated worktree and preserve dirty root.
- [x] Implement versioned evidence/question/policy/judgment contracts and offline replay.
- [x] Document reviewer intake and provider integration seam.
Verification
- [x] Fresh-process CLI reconstruction and negative-path tests pass.
- [x] Package build/typecheck and relevant regression checks pass.
Exit criteria
- [x] Review-ready committed/pushed draft PR 1748; retained worktree. Linear checkpoint 804da159 recorded.

## Phase 2: Independent evaluation
Status: blocked
Implementation
- [ ] Obtain independent labels, certified pre-decision snapshots, resolved source identities and frozen thresholds from Micah/App Review policy owner.
- [ ] Reconcile shared Jev adapter review status; freeze candidate and baseline.
Verification
- [ ] Run held-out paired comparison on original immutable inputs; audit receipts independently.
Exit criteria
- [ ] Business acceptance against predeclared criteria; activate runtime goal only once required verifier is available.

## Phase 3: Scoped adoption
Status: pending
Implementation
- [ ] Promote through owning review/production boundaries only after evaluation; preserve fallback and rollback.
Verification
- [ ] Verify actual deployed caller, readback and fallback behavior if production adoption is warranted and authorized.
Exit criteria
- [ ] Record measured outcome and exact adoption scope; do not imply broad monorepo completion.

Latest evidence: [result.md](evidence/result.md), [offline-audit.json](evidence/offline-audit.json).
Draft PR: https://github.com/createsomethingtoday/create-something-monorepo/pull/1748
Foundation commit: 6c12f1259. Build/typecheck pass; 195 tests pass.
User asked asynchronously for reviewer-validated cases or the adjudicating policy owner.
Git push used the already-signed-in createsomethingtoday account per process; global account unchanged.
Runtime remains unactivated, with primary verifier preserved. No scheduled continuation.
