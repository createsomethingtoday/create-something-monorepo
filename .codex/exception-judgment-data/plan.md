# Exception judgment data plan

Goal: [goal.md](goal.md). Linear: CRE-2061.
Current phase: 1. Activation deferred: primary human-reviewed verifier unavailable. No business-effectiveness claim. Root preserved; worktree /private/tmp/cre-2061-judgment-data.

## Phase 1: Durable offline foundation
Status: in progress
Implementation
- [x] Reconcile CRE-2022, CRE-2060, CRE-2055 and CRE-2057 through live Linear and GitHub.
- [x] Claim isolated worktree and preserve dirty root.
- [ ] Implement versioned evidence/question/policy/judgment contracts and offline replay.
- [ ] Document reviewer intake and provider integration seam.
Verification
- [ ] Fresh-process CLI reconstruction and negative-path tests pass.
- [ ] Package build/typecheck and relevant regression checks pass.
Exit criteria
- [ ] Review-ready committed/pushed PR, exact evidence in Linear, retained worktree.

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
