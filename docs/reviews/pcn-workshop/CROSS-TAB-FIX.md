# Cross-tab intake fix

Base: PR #1911 head `6c0044ecd3b0542978d0f075e94cbe85f437e6b1`, verified remotely at task start. Isolated checkout/branch: `task-4/isolated-repo`, `codex/pcn-cross-tab-fix`. Original checkout and PR branch left unchanged.

The old page captured a complete intake snapshot before acquiring its Web Lock. Applying the snapshot after reloading fresh storage erased another tab's earlier field change. A deterministic reproduction on the original reducer lost the destination when a second stale snapshot changed quantity.

All three intake controls now send typed field intents. The reducer merges only that field into the state loaded under the lock. Distinct fields survive; same-field updates use the last lock-holder value. Every accepted edit still invalidates proposal/approval and resets revision-specific execution state, and unknown receipts remain protected.

Other queued transitions require the request identity, input revision, proposal, approval and outcome the operator saw. Changed authority produces a review-and-retry message. Restart and next mission allocate UUID request identities, preventing old queued edits from applying to a new request even when revisions coincide. Existing saved states remain compatible.

Validation:

- Original loss reproduced: expected `Receipt shelf`, actual empty destination after second serialized stale snapshot.
- All 14 workshop test groups passed, including six added regression groups covering all input fields, both distinct-field orders, same-field policy, approval invalidation, cancellation, restart/mission identity rejection, reload and unknown receipt reconciliation.
- Strict targeted TypeScript check of state and intent modules passed.
- Actual Svelte route compiled and mounted in existing headless Chromium. Five browser scenarios passed with real held Web Locks and actual select/button handlers: distinct edits, same-field order, stale approval, restart versus queued edit, reload persistence. Zero page errors. Three.js World was substituted for semantic station QA; renderer acceptance is not claimed.
- `git diff --check` passed. Independent source review found no correctness blockers.

Browser harness and screenshot remain local under `output/playwright/`. No install or application build was run. Disk reserve was 3.6 GiB, below the mandated 5 GiB. Full LMS check/build and remote CI remain release gates. Parent subsequently assigned release integration ownership. Per-command network approval resolved the earlier GitGuardian DNS failure: the normal pre-commit hook scanned exactly the five fix files and found no secrets. Fix commit `03856a76` was integrated with verified main `df0a8dcc` in merge `cae52fbd`; only five unrelated agency files changed in the main merge. Independent final integration review found no code blockers. All 21 workshop and starter test groups, targeted strict TypeScript checks, and the actual-page browser harness passed after integration. No hook or security gate was bypassed. Remote CI and normal merge/deploy/live verification follow this source checkpoint.

Worktree disposition: preserved at `/Users/micahjohnson/Documents/Codex/2026-10-05/task-4/isolated-repo`, branch `codex/pcn-cross-tab-fix`, for parent integration and release checks.
