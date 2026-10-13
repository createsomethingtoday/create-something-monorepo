# Signed-in onboarding polish — local review

Base: 8046e4507a6a960c911c45fda0ab9fa3f4af681a, PR #1943. This follow-up is local and uncommitted. It has not replaced the deployed preview version 52cedf88-b500-488f-ad0e-1a033ef6adff. Production unchanged.

## Changes

- Library waits for successful, nonempty catalog availability before offering saved learning. Catalog failures remain explicit failures; existing progress failure/retry remains visible when lessons are available.
- Shared NetworkContext carries current network identity and draft/suspended status into studio and paths. Library retains its network title and now explains inactive status.
- Studio uses a compact task heading and wrapping navigation with separate 44px link targets. Invitation guidance sits beside member controls. Native guide remains optional.
- Upload fieldset reflects the existing server rejection for inactive networks. Paused upload explanation and publishing-desk empty state point to status/settings rather than unavailable upload.
- New path editor waits for selectable lessons. Empty creators get preparation guidance when active and status recovery when inactive; viewers get a neutral return to library. Existing path editor/repair is preserved.
- No server authorization, tenant selection, billing, publication or membership policy changed. No accounts, grants, content or media created.

## Validation

Package suite: 250 tests across 24 files, including seven new server-rendered UI regressions. Svelte check: zero errors and warnings. Production build: passed. Diff whitespace check: passed.

Manual CUA browser validation uses only the loopback fixture and synthetic roles: empty member library has no choose/resume claim; empty paths return to library; empty active creator gets preparation; suspended creator has identity/status, disabled upload with reason and recovery destination; member cannot open creator studio; catalog failure displays retry instead of empty success; progress failure recovers to synthetic resume at 0:42.

Independent reviewer inspected source plus desktop 1440×1000 and mobile 390×844. Separated/wrapping links, status, keyboard Enter disclosure toggle and no horizontal overflow on inspected studio/library views verified. Final source review found no remaining blocker after correcting the paused publishing-desk CTA. Active mobile studio first input measured approximately y628 including a 59px fixture banner. Suspended state deliberately prioritizes the access explanation; no above-the-fold form claim is made. Viewport overrides restored.

The old 13-scenario Chrome runner was not rerun this turn; its empty-path expectation was updated to the neutral label. Test controls added to the existing opt-in fixture for reproducible manual state selection. Fixture settings navigation is not implemented and cannot prove activation. No live Identity/Stream or screen-reader, contrast-ratio, comprehensive reduced-motion or interrupted-upload acceptance is claimed for this follow-up.

## Preview and remaining gate

Local fixture: http://127.0.0.1:5185/admin (explicit SYNTHETIC LOCAL FIXTURE banner). Test controls can select roles and scenarios; reset affects transient process data only. No deployed preview promotion performed in this polish pass.

Real acceptance still requires an approved active preview network, designated non-sensitive ready/published signed video of at least 125 seconds, existing independent member/creator/denied identities, and permission for normal preview playback receipts/progress. Fresh upload/publication/revocation acceptance needs its own bounded disposable-data authorization. The existing real acceptance lab remains suspended and empty; no bypass, unsuspend, grants or production-data tests were performed.

Worktree disposition: preserved at /Users/createsomething/Documents/Codex/2026-10-08/task-4/pcn-onboarding, branch codex/pcn-onboarding-release, pending local review and preview promotion.
