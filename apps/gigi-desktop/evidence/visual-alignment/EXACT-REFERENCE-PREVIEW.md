# Exact-reference layout preview

Review-only branch: `codex/gigi-reference-layout-preview`, based on production page merge `aae9f6207b14ded67140813155964c5f51c2a3d3`. No release/version change, migration, backend, MCP or provider implementation change.

## Reference evidence

The accessible original is [grantbot at 3f39f6468a98e3941aa118916c99c79a328464fc](https://github.com/gigi-team/grantbot/tree/3f39f6468a98e3941aa118916c99c79a328464fc/current/native-desktop-mobile/Sources/GiGiDesktop), branch `codex/today-layout-20260920`.

- `DesktopStudioStyle.swift`: ground #151613, surface #1e201b, ink #eeeee5, muted #b1b4a7, rule #363a30; system typography and tinted controls. This exact source is olive-neutral, not slate/grey. The preview follows the latest fidelity request; no historical slate palette is claimed.
- `DesktopWorkspaceStrip.swift` and `DesktopAdaptiveNavigation.swift`: compact horizontal brand/search/navigation/chat/settings strip with overflow destinations and history controls.
- `DesktopTodayReadingSession.swift`: 48-point header and 16-point top inset.
- `DesktopCloudDecisionToday.swift`: centered board, maximum width 1220, horizontal padding 32, two columns at content width 900, gap 22.
- `DesktopCloudDecisionCard.swift`: 23-point medium title, 18-point compact padding, 12-point corners, metadata footer.

These source files were read directly without executing grantbot scripts. No reference binary or exact-reference screenshot was available; source-to-render comparison is not a pixel-perfect original-render comparison.

## Implemented and deliberate gaps

The preview replaces the sidebar with a compact top strip, preserves every destination under primary navigation or More, adds guarded workspace back/forward, centers the Today board and applies the reference palette/type/cards/controls. Current local queries, sorting, pagination, SQLite schema and record detail/edit behavior remain in place.

| Reference affordance | Functionally honest adaptation / remaining gap |
| --- | --- |
| Global Search GiGi | Find people opens existing local contact search; it does not imply global search. Command-F focuses it. |
| Signed decision feed, freshness and recommendations | Existing local upcoming gigs, open saved tasks and unpaid financial records. No invented decisions, freshness claims or suggested actions. |
| Messages primary tab | People primary tab; all existing workspaces remain accessible through More. No new inbox. |
| Adjustable/draggable adaptive tabs | Fixed primary tabs plus More. Narrow native window verified at 880px; no drag personalization added. |
| 620×680 chat sheet | Existing chat side panel retained, including approvals and receipts. |
| System/light/dark and density choices | Current dark presentation only. No unimplemented theme control shown. |
| Rich decision cards with evidence and next actions | Saved-record cards with actual title/status/date and record-opening action. Existing record data is not rewritten. |

## Verification

- Final source: 213 desktop tests, **211 pass, 0 fail, 2 opt-in installed-companion tests skipped**. The latter require `GIGI_INSTALLED_MCP`; this preview neither changes nor qualifies a distributed companion. No claim of fresh installed-host MCP acceptance.
- Final isolated debug application build succeeded; ad-hoc signature, distinct bundle ID `agency.createsomething.gigi.studio-preview`. Not notarized or distributed.
- Native synthetic profile: 880×620 and expanded window, top navigation and More routing, saved gig/task visible on Today, existing Instagram draft and unverified connection state, Music workspace, Command-F focus, middle-name contact search and Escape reset.
- Final-build Command-F from a partly entered record opens the existing unsaved-change dialog. Keep editing restores the input; automated regression also covers back/forward protection.
- Text/panel contrast 14.09:1; muted/panel 7.79:1; accent/panel 9.33:1; control border/panel 4.12:1. Existing focus styling retained. This is a targeted check, not a full accessibility certification.
- No real records, account grants, external posts or provider calls were used for native acceptance. Production 0.2.4 remains unchanged.

Local review artifacts: `release-evidence/reference-preview/review.html`, `today-compact.png`, `today-expanded.png`, `people-search.png`, `music.png`, `instagram.png`, `unsaved-protection.png`, `contrast.json`, `tests.log`, `build.log`. The gallery places original source evidence beside actual native screenshots and explicitly labels the missing original render.

Before any production release: review this preview and the explicit functional adaptations, then run release CI/installed-companion qualification against the approved exact candidate. No release approval is assumed for this branch.

## Follow-up polish, 2026-10-21

Removed inherited panel margins that doubled the reference's 22px section rhythm; standardized Music/Instagram 32px headings; centered and tightened the Music empty state; kept visible focus rings inside the compact header and 36px overflow-menu targets; explicitly suppressed preview transitions under reduced motion. No JavaScript or backend changes in this follow-up.

Rebuilt the isolated native application successfully. Rechecked compact and expanded Today, Music empty state, Escape closing More and restoring focus to its summary, and Command-[ returning from Music to Today with forward navigation available. Updated the gallery screenshots. The prior 211-pass behavioral suite remains applicable because this follow-up changes only CSS; two installed-companion checks remain opt-in and unexecuted. Reduced-motion behavior is source-verified, not a claim of changing or testing the user's OS preference.
