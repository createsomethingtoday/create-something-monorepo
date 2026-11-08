# Full React / Astryx rewrite

[CRE-2373](https://linear.app/createsomething/issue/CRE-2373/gigi-adopt-astryx-design-foundations)
and [PR #2216](https://github.com/createsomethingtoday/create-something-monorepo/pull/2216).
Implemented and reviewed 2026-11-08. This supersedes the initial CSS adaptation
at `becc48d8e23f3ef68c90e9dcfb52f663eea98995`.

Tauri now packages a Vite-built React 19 application using actual Astryx Core
0.7.11 components and themes. The production entry includes every application
surface: onboarding, shell/navigation, Today/attention, all records, edits,
relations, agenda, history, settings/source consent and import, backups,
diagnostics, appearance, chat/search/approvals, Music/artwork and Instagram.

The existing native API and protected transaction logic are retained. The old
HTML renderer is not the shipped entry or an HTML parser inside React. Pure
models remain shared. See `../../DESIGN_FOUNDATION.md` for source ownership,
dependency pins, theme generation, CSP and older-WebKit fallback details.

Current native and distribution status is maintained in the
[0.3.1 release receipt](../../../../docs/internal/gigi-astryx-031/REVIEW.md).
The source-review checkpoint below predates native qualification.

## Initial source-review gates

| Gate | Result | Evidence and boundary |
| --- | --- | --- |
| Functional correctness | Passed in synthetic scope | Vite build; 344 baseline/domain tests passed, 2 installed-artifact tests skipped; actual React browser harness passed 19 routes and 12 appearance combinations. Real component create/edit, expected-record snapshot, draft guard, mixed-agenda navigation, search/focus, theme persistence, chat, inert provider HTML, actual larger text and local font loading verified. |
| Perceptual/product quality | Passed in reviewed scope | Parent and independent Sol 6.1 reviewer directly viewed Studio Today, Paper Appearance, Midnight compact and populated chat; source/creator component states were also rendered and exercised. Actual Astryx hierarchy, controls and theme treatment are coherent. |
| Release readiness | Untested for native distribution | Built frontend is reviewable and Tauri points to it. Native WebKit/platform floor, real profiles/providers, pickers/codecs/media, exact signed/notarized app/installer and installed-app acceptance remain unverified. No production installer was replaced. |

The baseline Node tests still include legacy-controller fixtures and are not
presented as React validation. `scripts/astryx-rewrite-browser.mjs` exercises the
actual new entry and controller. Its development backend never invokes native or
provider tools and is excluded from the production bundle. The harness verifies
the bundle excludes that backend and the old `insertAdjacentHTML` renderer.

The matrix covers Studio/Paper/Midnight × comfortable/compact × 880×620/1280×840.
The 19 route pass includes every record collection, settings, appearance,
history, Music and Instagram. It checks no horizontal overflow and uncaught
errors. Empty/disconnected fixture states do not prove live source consent,
publishing, a real agent response or native media behavior.

Independent Sol 6.1 review reran the build, Node suite and new browser harness;
compared protected controller operations with the original; directly exercised
Keep editing and Discard changes without unintended saves; and inspected the
production bundle. It found a larger-chat-text regression. The parent corrected
the actual response text styles; the reviewer independently observed 14px→17px.

The parent then caught mixed Today agenda records opening under the Schedule
entity. A public UI regression failed with `schedule !== gigs`, passed after
preserving each record's entity, and remains in the browser harness. It also
retains the actual Larger selector assertion and checks the local Figtree font
loads with zero external requests.

Creator-specific synthetic component checks cover Music organization revisions,
unsaved navigation, import request identity and lost-response receipt recovery;
Instagram saved drafts, verified image/account binding, cancel-without-publish,
exact confirmed publication/readback and unchanged-payload retry identity.
Those tests use fake operations, not provider acknowledgments.
They are retained in `scripts/astryx-creators-browser.mjs` (`pnpm test:creators`),
including lost-response import recovery and unchanged-payload retry regressions.

## Tooling and scope

- Frozen scoped dependency install passed. Only GiGi's lockfile importer changed;
  other workspaces' importer resolutions were independently compared and retained.
- Astryx doctor: 19 pass, 0 fail, 2 warnings, 11 info. The warnings concern font
  proof through the generated package's external-font reference. Vite aliases
  that stylesheet to the bundled Figtree; actual local font load and absence of
  external requests passed the browser check.
- The GitHub GiGi regression workflow now builds and exercises the React frontend.
- No SQLite schema, saved preference version, credentials or native record API
  changed. Existing unrelated checkout work was kept separate.

## Retained visual proof

- [Studio Today, minimum window](studio-880-comfortable.png)
- [Midnight compact, minimum window](midnight-880-compact.png)
- [Actual theme previews and settings](route-appearance.png)
- [Setup and source consent surface](route-settings.png)
- [Populated chat with Larger text](chat.png)
- [Browser result](result.json)

These are synthetic owned app captures. No third-party reference screenshots are
included. AppShell scrolls its content; a capture shows the visible state, not a
claim that every state of a long route fits in one window.

Reproduce with `pnpm build:web`, `pnpm test`, `pnpm test:rewrite`, and
`pnpm astryx doctor --built dist` from the app after repository bootstrap.
`--regressions` runs just the behavioral cases when iterating on a finding.

Native release qualification is the next promotion gate. Rollback restores the
previous frontendDist/build command and source; there is no data migration.

Worktree disposition: preserved at `/tmp/cre-2373-gigi-astryx`, branch
`codex/cre-2373-gigi-astryx`, until source review and native release qualification.
