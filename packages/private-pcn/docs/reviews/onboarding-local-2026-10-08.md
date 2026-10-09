# PCN onboarding — local review, 2026-10-08

Status: implemented and tested locally; not released. Worktree disposition:
preserved at `/Users/createsomething/Documents/Codex/2026-10-08/task-4/pcn-onboarding`,
branch `codex/pcn-guided-onboarding`, base `cb77c111e`. Concurrent Agency, Ground
and Draw checkouts were not edited. Existing package gate: CRE-2030. Linear read
failed because `LINEAR_API_KEY` is unavailable; no coordination record changed.

## Ownership and journey findings

PCN (`packages/private-pcn`) owns network-scoped video lessons, ordered paths,
membership and account progress. Its Identity audience is `agency`, but PCN
access remains separate from Agency commercial entitlement. `packages/lms`
serves `learn.createsomething.space`, original/reference courses and a public
foundation service; it is not PCN's progress or membership backend. No LMS or
Identity files changed.

Viewer: discovery → public preparation or library → invited-account sign-in →
authorized lesson/path → saved position in the same network. “Learn & Build”
previously opened acquired assets. It now opens the library; collection remains
secondary. Progress distinguishes loading, failure/retry, empty and saved lessons.
Empty paths offer sessions or, for an eligible creator without lessons, the studio.

Creator: account → dashboard → approval/application if needed → network → studio
→ private video draft → readiness → lesson review → audience publication → path
sequence. Returning creators now enter Dashboard rather than Apply. Dashboard
includes learning paths. A native disclosure anchors into studio controls and
explains the publishing sequence, uncertain uploads and immediate visibility of
saved lesson text on already-published sessions. The ChatGPT brief is manual
text drafting, explicitly not an account connection or publication integration.

Uploads retain useful success wording after readiness refresh. Transfer success
followed by readiness failure explains that the existing draft should be checked
before re-uploading. No compulsory tour, fake completion, upload cancellation or
cross-navigation transfer-resumption promise was introduced.

Existing-account login now returns to bounded local lesson/path routes, retaining
approved sequence/search parameters. Tests reject external URLs, traversal,
fragments, duplicate/unsupported query parameters and controls. This is navigation,
not an access grant: destination loaders and APIs still enforce current access.
Enrollment/recovery use the unchanged synchronized allowlist and still fall back
to `/start` for these learning routes. No auth/tenant/role/billing policies changed.

Chrome found that skip links scrolled without focusing the destination. Main
landmarks on onboarding/learning surfaces now have `tabindex="-1"`. Keyboard tests
verify actual focus transfer. All existing visible focus styles remain intact.

The public `/courses/from-template-to-system` remains preparation only. Read-only
HTTP 200/HTML inspection confirmed “Recording is next,” unreleased lessons and no
playback offer. No course content, recordings, enrollment or progress were created.

## Design and independent review

Applied canon-design-review using repository contracts and actual PRIVATE
components. Preserved dark Performance tokens, Human Ink artwork, SerifPhrase,
Icon, type and layout. Guidance uses native details, ordered steps, fluid measures,
minimum summary target height and visible focus. Inline guide links were simplified
after mobile inspection to avoid orphan punctuation. No palette/font replacement.

An independent agent reviewed the journey, final source, return helper, isolated
fixture and desktop/mobile screenshots. No production security or product-design
blocker found. Visible mobile entry choices, creator guidance and resume were
approved for synthetic local review. It detected corrupt stitched screenshots;
these were replaced with viewport frames. The final desktop creator guide was
recaptured in a fresh 1440×820 Chrome context and visually checked by the implementer.
Mobbin was unavailable; no comparative product-research claim is made.

## Local fixture and Chrome evidence

`tests/acceptance/README.md` documents the reproducible opt-in loopback fixture.
It renders actual route/layout components and uses actual content handlers with
transient SQLite, using the same schema bootstrap as `tests/api.test.ts`. It does
not apply a migration to any persistent local or remote database. No production
bindings, service credentials, user accounts or production-data tests are used.
Fixture roles, login success, media transfer and readiness are explicit test mocks.
The standard installed Google Chrome runs headlessly in a disposable profile;
non-loopback browser traffic is blocked. This is not native ChatGPT acceptance.

13 Chrome scenarios passed:

1. Viewer/creator/collection entry destinations remain distinct.
2. Keyboard skip-link focus and mobile menu Escape/focus restoration.
3. Saved-progress loading → failure → successful retry.
4. Saved-position display after reload and library filter return.
5. Blocked viewers receive no private lesson or resume data.
6. Member/anonymous creator denial, including actual content API 403.
7. Existing-account lesson sign-in returns with path/search context.
8. Existing-account path sign-in returns to that path.
9. Empty viewer/creator path next actions.
10. Creator disclosure keyboard open/close, anchor focus and mobile layout.
11. Transfer success/readiness failure retains existing-draft recovery guidance.
12. Interrupted upload reservation survives leaving and returning to the studio.
13. No uncaught browser errors.

Mobile is 390×844; desktop behavior was checked at 1440×1000, with final creator
capture at 1440×820. Reduced motion enabled. Relevant mobile/desktop overflow
assertions passed. No recording exists in the fixture; real media playback,
15-second provider-backed position writes and actual TUS cancellation/resumption
are not proven. Simulated successful login proves navigation only, not Identity.
No assistive-technology/screen-reader or native ChatGPT acceptance was performed.

## Final checks

- Vitest: 23 files / 243 tests passed (including 19 added return-destination cases).
- Svelte check: 0 errors / 0 warnings.
- Production build with Cloudflare adapter: passed. No deploy command run.
- Retired Identity provider guard: passed (14,219 tracked files).
- `git diff --check`: passed.
- Existing synthetic suite covers tenant ownership, blocked/member/admin roles,
  invalid Identity, revoked access, draft/readiness/publication rules and progress
  separation. It is supporting proof, not real provider acceptance.

Bootstrap initially hit missing pnpm/network and shared-cache restrictions.
Checks reused pinned Node 22.21.1/pnpm 9.15.0 and existing dependencies with local
Vite caches. No shared package build or dependency installation was needed.

## Preview and screenshot handoff

- Built public layout: `http://127.0.0.1:5184/start` (local assets only, no DB).
  Confirmed `/start` 200, `/admin` 403, `/dashboard` 303.
- Synthetic interactive fixture: `http://127.0.0.1:5185/start`. Its role/data
  changes only through explicit test setup; see the fixture README to reproduce.
- Screenshot directory: `/Users/createsomething/Documents/Codex/2026-10-08/task-4/preview/`.
  `start-desktop.png`, `start-mobile.png`, `start-mobile-choices.png`,
  `viewer-resume-mobile.png`, `creator-guide-mobile.png`,
  `creator-guide-desktop.png`, `creator-upload-recovery.png`.
- Machine-readable scenario evidence: `preview/acceptance-results.json`.

The supported browser connector still returned `Browser is not available: chrome`;
its inventory returned `Sky Computer Use native pipe startup failed`. Standard
Chrome acceptance above was explicitly requested and used a separate test profile.
To use native browser tools, reconnect/enable Chrome in the parent local task and
restore its native computer-use connection. That connection was not fabricated.

Library upload completed after direct user approval in this task. All seven
synthetic screenshots received successful Library file receipts, saved locally in
`preview/library-upload-receipt.json`. The required helper was attempted first but
reported that `prepare_uploads` was unavailable before any upload; the available
batch upload tool completed the approved delivery. Earlier automatic approval
rejections did not constitute uploads.

## Release checkpoint

Publication approval was subsequently confirmed by Micah through the parent task.
The release branch `codex/pcn-onboarding-release` starts at main
`58d5ed035d936725d292e37ef38abf1ba3236b7c` and applies the reviewed PCN patch,
excluding an unrelated inherited template-search commit. Normal hooks remain
active. A hook failure exposed `git show` pattern handling of `[id]` route paths;
the coverage reader now uses exact `git cat-file blob` reads. Its regression test
also verifies uncovered MCP packages remain rejected.

Pre-deploy Cloudflare reads identify current deployment
`9885bee7-97ba-4348-9aa4-3d090eefe724`, rollback version
`c7317be8-061b-4324-892c-c123af1a502a`, and prior source
`62d7a20d4787fe54589a3a3fdc2a19b5d67fd18f`. No deployment has occurred.
The in-app browser became available for anonymous live inspection: the library
shows no public sessions and offers invited-account sign-in. There is no active
approved test identity or public media for current real Identity/Stream acceptance.
Package CRE-2030 acceptance remains an external release gate; the synthetic
fixtures and historical acceptance documentation do not close that gate.

No grants, account creation, content publication, migration/deploy or production
data writes. Review and authorized provider acceptance remain required before release.
