# Retain transcript across a later-turn outage — CRE-2308

Review4433976610 reproduced: send deleted the only retained snapshot, so the first outage fallback after a later turn contained only the new assistant delta. Preserve the prior snapshot's messages and invalidate its age instead. Its prior state/approvals/receipts cannot be reused through the cache; read constructs fresh metadata and merges only retained text with observed current-turn deltas.

Acceptance: prior authoritative user/assistant messages remain present during the first later-turn history failure; subsequent deltas append without dropping history; metadata is running and approval-free; safe retry cadence remains bounded; recovered history includes the second user prompt and complete answer without duplicates. The new regression was red before and green after. Unobserved provider transcript entries are not fabricated during an outage.

Functional correctness: passed locally. Full integration suite: 324 passed, one optional CTX skip; typecheck passed. Existing approval, uncertainty and terminal tests pass. The committed actual-app browser qualifier now feeds running outage and recovered completion snapshots through ChatController.accept and the mounted DOM, checking prior messages, draft/composer retention and ordering. Its 12-case matrix and temporal/keyboard checks pass.

Perceptual/product quality: passed within offline actual-app DOM/CSS scope. Parent directly viewed /private/tmp/cre-2308-transcript-visual/outage-retained-transcript.png: prior question and focused draft remain, with Latest response available while reading above the new partial. Native/provider acceptance is not repeated for this patch.

Release readiness: untested for 0.2.21; new exact qualification remains pending. Agency stays on published 0.2.18. The immutable superseded 0.2.20 object remains untouched.

Worktree disposition: preserved at /Users/createsomething/.t3/worktrees/create-something-monorepo/t3-5b278f6e (t3/gigi-chat-polish).
