# GiGi 0.2.20 review corrections — CRE-2308

Supersedes immutable but unpromoted 0.2.19. Existing independent Sol reviews and rendered/native/provider evidence for unchanged formatting, layout, controls, selection and streaming UI remain in ../chat-0219.

Two GitHub P2 findings reproduced red: rapid polls before the first assistant delta made9 history reads instead of1; after approve/reject and transient history failure, poll resurrected the cached approval. Parent repaired these small findings directly. Cache eligibility now requires its own running, approval-free, error-free, non-cancelling/non-recovering snapshot and excludes unknown receipts; live deltas are optional. Existing current session/workspace/terminal fences remain.

Three new regressions now pass: bounded pre-delta and caught-up hydration cadence with3-second refresh, approved decision through transient history failure, rejected decision through the same failure. Tests verify receipts, no repeated write and terminal recovery. Full integration suite304 passed/1 optionalCTXskip; typecheck passed. No UI/layout changes beyond owned version fields; Cargo.lock only changes gigi_desktop. Exact20 artifact, packaged provider acceptance and promotion receipts follow.

Rollback remains0.2.18. No production record/auth/source/approval policy changes. Worktree disposition: retained at /Users/createsomething/.t3/worktrees/create-something-monorepo/t3-5b278f6e (t3/gigi-chat-polish) until release and rollback closeout.
