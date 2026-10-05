# Canon artifact room — review candidate

Tracked work: [CRE-2227](https://linear.app/createsomething/issue/CRE-2227/canon-workshop-build-a-practice-stack-through-inspectable-world).
Branch: `codex/pcn-artifact-room`. Base: verified remote main `cc7f043cf0c2b422054db61f19ddcc752e3891f5`.
Publication is held until Micah reviews this interaction.

The room now leads the setup experience. Tap the starter crate and unpack a project, carry it to GitHub to prepare a private repository plan, carry that to Codex, approve the exact practice change, carry it to the Infisical vault, review a Cloudflare destination, and bring it to the deployment beacon for a simulated health receipt. Six physical objects expose their status, source revision, next action and recovery. The destination pad is highlighted while carrying. Native world buttons support keyboard activation; a semantic object list and explicit Pick up / Place actions support the same graph without 3D. Motion is paused while reading; reduced-motion rendering remains available. Optional dragging was not added.

Persistent browser-local state is separate from request lessons and setup self-reports. Fresh storage is read under a Web Lock; epoch/version checks reject stale authority actions. A source revision cancels its approval and invalidates every descendant. Destination changes invalidate the beacon. Stale receipts remain inspectable, repeated placement creates no extra receipt, and interrupted carry/errors survive reload. Malformed saved objects block mutation until an explicit room-only recovery reset. The reset validates fresh storage so an old error tab cannot erase another tab's repaired progress.

This serves Automation and Judgment teaching through explicit practice artifacts. Prepared objects, practice approval, self-reported guide checks and provider evidence remain distinct. No real repository, Codex session, secret project/value, account or deployment is created or verified here. The starter remains an educational health Worker without D1/R2/OpenAI/Infisical integration. Real onboarding through these objects still needs reviewed server-side provider adapters, identity/ownership and least-privilege consent flows, secret references, exact action approvals, unknown-outcome reconciliation and verifiable receipts. Those integrations and any paid resources are outside this slice. Existing official-provider links, full walkthrough, request lessons and accessible paths remain available through the handoff.

Validation:

- 44 workshop/starter test groups pass, including eight new artifact groups covering graph order, exact approval, transitive invalidation, same-source idempotence, reload, stale actions/reset, corrupt saved evidence and fresh recovery reset.
- Strict artifact TypeScript and full LMS Svelte check pass with zero errors/warnings.
- Actual component and full LMS desktop1440x1000 / phone390x844 acceptance pass six-object tap journeys, approval rejection/approval, interrupted carry, reload, stale source evidence, honest completion, native keyboard/list completion, repeated receipt placement, delayed concurrent intents and held-lock recovery reset. Zero page errors and no horizontal overflow.
- Preserved walkthrough desktop/phone checks pass navigation/focus, all copy commands, reload/resume/restart, self-report checks, archive download, delayed concurrent checks, clipboard failure and damaged simulation storage. The source/archive contract remains unchanged.
- Independent review found a recovery-reset race and a proposal formatting issue. Both were corrected; re-review has no remaining findings. No provider actions were exercised.

Full-app preview: http://127.0.0.1:4175/workshop. Actual component preview: http://127.0.0.1:4174/workshop (neutral theme, no application layout). Existing dependencies were reused; no installs or heavy build. Disk reserve was19GiB at start and21GiB during verification. Local linked fonts can fall back in the preview; no shared dependency checkout was changed.

Evidence: ignored `output/playwright/artifact-result.json`, `artifact-tests.tap`, `artifact-svelte-check.log`, desktop/phone complete/stale screenshots, keyboard screenshot and preserved walkthrough results. Screenshots are delivered through Library.

Worktree disposition: preserved at /Users/micahjohnson/Documents/Codex/2026-10-05/task-4/isolated-repo on codex/pcn-artifact-room until interaction review. Original checkout untouched. Published walkthrough remains at its prior released commit.
