# Observation window and browser qualification — CRE-2308

Review4433826655: acceptance is to preserve the original eight-minute scheduled observation budget while polling every250ms, stop boundedly afterward, and resume on session reopen. A fake-scheduler controller regression failed at120000ms before the fix. Poll count is now derived from eight minutes divided by the shared interval (1920polls). The test passes through the full budget, checks cadence, bounded pause/no queued timer and reopen recovery. It does not wait eight wall-clock minutes or issue provider calls.

Review4433826663: the committed browser qualifier was stale after split preference storage. Its exact script reproduced undefined instead of compact. It now checks gigi:chat-preferences:v1 for chatDensity and separately verifies that the rollback v1 core has no chat keys. Full committed browser qualifier passes12theme/window/width combinations and keyboard/scroll/selection/draft/completion/reduced-motion checks.

Functional: passed locally,332desktop tests with2packaged-companion checks skipped until rebuild. Both regressions have failing-before/passing-after logs. Perceptual/product: passed within offline actual app/DOM/CSS scope; parent directly viewed Paper880wide, layout unchanged. Synthetic screenshots/metrics /private/tmp/cre-2308-qualification-green. Native/provider long-turn behavior is not claimed from fake time. Release readiness: untested for current source; new exact signed/notarized artifact and packaged acceptance still required. Agency remains pinned to published0.2.18 until replacement qualification/upload/independent readback.

Worktree disposition:preserved at /Users/createsomething/.t3/worktrees/create-something-monorepo/t3-5b278f6e (t3/gigi-chat-polish).
