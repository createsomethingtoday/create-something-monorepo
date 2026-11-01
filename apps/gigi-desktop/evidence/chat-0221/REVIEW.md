# GiGi 0.2.21 shutdown recovery — CRE-2308

Acceptance: app shutdown must interrupt pending companion acknowledgement/reply waits within the existing two-second assertion, even if the reply reader never receives EOF. Existing timeout, process-group cleanup, protocol limits, reply matching and shutdown relaunch guards must remain intact. Keep Agency on published 0.2.18 until the replacement installer is qualified, uploaded and independently verified.

CI run 41259232886/job 124708836709 failed the original shutdown timing assertion. The timeout test then failed on the poisoned shared test mutex; that is secondary. The original log does not establish the exact cause of slow shutdown. Source review showed that cancel_all killed process groups but then waited for the protocol mutex while the request used one full-duration channel wait. An inherited descriptor can keep the reader open independently of the killed process.

A controlled public-dispatch regression models the stalled reader by retaining its reply-channel sender after killing the actual companion. Before repair, shutdown waited 4.800106 seconds and failed the unchanged two-second bound. Channel waits now inspect the existing CLOSING flag in intervals capped at 50 milliseconds while preserving the original overall deadline. Both delivery acknowledgement and reply waits use that helper. No production timing assertion or timeout limit was relaxed. The test uses an offline held channel; it is not proof of the exact Linux CI root cause.

Functional correctness: passed locally. The new regression passes; the full Rust suite passes 174 checks. Eight repeated runs of both shutdown tests passed. Desktop suite: 332 passed, two packaged checks pending the new build. All 25 restored release-page tests pass. Existing descendant cleanup and relaunch guards still pass. TypeScript adapter and UI layout code are unchanged.

Perceptual/product quality: not-applicable to this shutdown-only change. Earlier independent UI evidence remains bounded to its recorded scope.

Release readiness: untested for 0.2.21. Runtime changed, so the immutable uploaded 0.2.20 installer is superseded before page promotion and will not be overwritten. Version fields are advanced to 0.2.21; Agency identity, copy and tests are restored to published 0.2.18. New exact build, signing, notarization, independent final acceptance, packaged-provider flow, immutable upload/readback and final CI/review are required before repinning and deployment.

Worktree disposition: preserved at /Users/createsomething/.t3/worktrees/create-something-monorepo/t3-5b278f6e (t3/gigi-chat-polish).
