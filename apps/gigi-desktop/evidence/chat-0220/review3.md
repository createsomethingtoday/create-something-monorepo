# Review and CI recovery — CRE-2308

Acceptance: error-output fixtures consume both protocol requests before exiting; active assistant items retain their full prefix across authoritative history refreshes and subsequent deltas; cache cadence and safety fences remain intact.

The superseded 9b72fd4 CI run failed the connector probe error assertion. Its original output does not identify the actual error. Sixteen ordinary local baseline runs passed. A temporary test-only 1000ms delay after spawn reproduced `Connector input failed` instead of `invalid or oversized`: the fixture exited without reading stdin. All three fixtures now read both request lines before producing their intended malformed/timeout/oversized behavior. The same controlled timing passes; diagnostic delay removed. Production preflight source remains byte-identical to a8cd0914 before its test module. Sixteen fixed focused runs (four concurrent) passed; full Rust suite173 passed.

Review thread4433731243: active history reconciliation deleted a fully caught-up live entry, so subsequent deltas were treated as a new complete answer. Preserve the authoritative text as the accumulated base while that turn remains running. Both equal and longer authoritative-prefix regressions failed before and pass after. Checks exercise short/long suffixes, repeated refreshes, transient history failure, bounded poll requests and terminal readback.

Functional: passed locally,314 integration tests plus one optional CTX skip; typecheck passed;173 Rust checks passed. Existing UI assets are unchanged by this patch. Perceptual/product: prior native and rendered UI evidence applies to unchanged layout; rebuilt packaged streaming acceptance remains pending. Release readiness: untested for this source revision; the prior R3 app/DMG and committed qualification describe a superseded private candidate. Rebuild/sign/notarize and re-pin checksum/size before promotion. No0.2.20 upload or download-page deployment has occurred.

Worktree disposition: preserved at /Users/createsomething/.t3/worktrees/create-something-monorepo/t3-5b278f6e, branch t3/gigi-chat-polish.
