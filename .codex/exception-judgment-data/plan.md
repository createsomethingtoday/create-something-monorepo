# Exception judgment data plan

Goal: [goal.md](goal.md). Linear: CRE-2061.
Current phase: 1b complete. Technical correction milestone verified and published; PR 1748 is ready for review. Runtime completion follows final remote checkpoint. Original business goal is preserved in business-goal.md. No business-effectiveness claim. Root preserved; worktree /private/tmp/cre-2061-judgment-data.

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

## Phase 1b: Align shared contracts with TypeSafe primitives
Status: complete
Implementation
- [x] Preserve raw Noul/Choice/Score outputs separately from application decisions.
- [x] Separate evidence/question/inference identity from decision-policy identity.
- [x] Compile explicit structured TypeSafe requests and preserve exact response/usage.
- [x] Distinguish measurement, action eligibility, label provenance and evaluation lanes.
Verification
- [x] Raw response round-trip; changed-policy recomposition without inference; actual request-shape validation.
- [x] Keep strict exception effectiveness gate while permitting clearly labeled development data.
Exit criteria
- [x] Review findings in evidence/typesafe-docs-review.md resolved before shared adoption.

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
Historical foundation checkpoint: original business goal was not activated because its independent verifier was unavailable. The technical correction goal was subsequently activated; no scheduled continuation.

2026-09-22 docs review: earlier offline implementation remains tested, but its sufficiency as a general Jev contract is superseded by the findings in [typesafe-docs-review.md](evidence/typesafe-docs-review.md). No runtime code changed. Human labels block effectiveness proof, not the technical corrections in phase 1b.

2026-09-22 execution steering: complete the documented shared-contract corrections. Completion of the activated technical milestone does not close phases 2/3 or CRE-2061 business effectiveness work.

Technical checks: 218 package tests, 39 judgment tests, build/typecheck and frozen lockfile pass. Independent Python audit verifies seven sealed artifacts, raw response preservation and two policy outcomes sharing one inference. Evidence: [v2/independent-audit.json](evidence/v2/independent-audit.json). Next: commit/push this checkpoint to PR 1748, read back CI and mark PR ready for review. External target authorized: existing codex/cre-2061-judgment-data branch and PR 1748; no merge or deploy claim.

Final technical checkpoint: implementation commit 0dd2eac59 pushed; PR body read back and draft=false confirmed. CI at that SHA is in progress (immutable-action check passed, publishing jobs skipped); no green-CI/merge/deploy claim. Phase 2 and Phase 3 belong to business-goal.md and remain outside the completed technical milestone. Worktree disposition: preserved at /private/tmp/cre-2061-judgment-data on codex/cre-2061-judgment-data through review.
