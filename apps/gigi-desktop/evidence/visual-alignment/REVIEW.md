# GiGi slate studio preview — local, not released

Based on main `855a7c967` (published download page), including released 0.2.3 search fix `a882646e3`. Branch: `codex/gigi-studio-alignment`. This supersedes the olive study on `codex/gigi-grantbot-visual-preview` (`9073f2aad`), which remains recoverable.

## Reference evidence and correction

Read-only GitHub API on October 20 confirms gigi-team/grantbot's default branch `migration/grantbot-complete-handoff-2026-08-25` still points to `e7b4fe6b2017b0807becd418cd080b9b3f355991` (September 30). Inspected committed source, not the unrelated local modifications; ran no reference scripts or backend.

- Current [DesktopStudioStyle.swift](https://github.com/gigi-team/grantbot/blob/e7b4fe6b2017b0807becd418cd080b9b3f355991/current/native-desktop-mobile/Sources/GiGiDesktop/DesktopStudioStyle.swift) explicitly uses olive dark ground `#151613`, surface `#1e201b`, system 32px/medium headings, 14px/medium controls, 44px action height and 8px corner radius. This explains the earlier olive inference, but it does not establish the desired earlier look.
- The studio palette appeared in `6b668961` (September 8). Before it, [DesktopWorkspaceRoot.swift](https://github.com/gigi-team/grantbot/blob/ecbcdb25d47e8fe655c55041ef788e0df5dbb204/current/native-desktop-mobile/Sources/GiGiDesktop/DesktopWorkspaceRoot.swift) used system SwiftUI type, GroupBox, Divider, secondary foreground and standard bordered controls, without a fixed olive background. These system surfaces depend on macOS appearance; there is no proven exact slate hex palette here.
- Current [DesktopCloudWorkspaceView.swift](https://github.com/gigi-team/grantbot/blob/e7b4fe6b2017b0807becd418cd080b9b3f355991/current/native-desktop-mobile/Sources/GiGiDesktop/DesktopCloudWorkspaceView.swift) still contains a native NavigationSplitView/List shell. The repository has multiple surface lineages, not a single universal desktop treatment.
- [DesktopPresentationPreferences.swift](https://github.com/gigi-team/grantbot/blob/e7b4fe6b2017b0807becd418cd080b9b3f355991/current/native-desktop-mobile/Sources/GiGiDesktop/DesktopPresentationPreferences.swift) has System/Light/Dark modes, compact 48px versus comfortable 56px header, 16/20px top inset, and green/blue/purple/orange accent options. Those modes do not prove a separate fixed slate theme.
- [DesktopAdaptiveNavigation.swift](https://github.com/gigi-team/grantbot/blob/e7b4fe6b2017b0807becd418cd080b9b3f355991/current/native-desktop-mobile/Sources/GiGiDesktop/DesktopAdaptiveNavigation.swift) uses adaptive top tabs and More overflow. GiGi retains its current sidebar; copying this would be a separate interaction change.
- [DesktopConversationMessageCard.swift](https://github.com/gigi-team/grantbot/blob/e7b4fe6b2017b0807becd418cd080b9b3f355991/current/native-desktop-mobile/Sources/GiGiDesktop/DesktopConversationMessageCard.swift) uses 15/17px messages, 10/14px padding and a 720px maximum card width. We adopt readable type without inventing its source/channel metadata.
- The older vnext web styles are warm charcoal (`#10100f`, `#191918`) with acid green, not an exact slate match. The committed image inventory contains branding and mobile artwork/concepts; no current desktop screenshot was found. Exact historical appearance remains unverified.

Micah explicitly corrected the direction to slate/grey. The preview therefore uses neutral slate surfaces `#17191c`, `#22252a`, `#2d3238`, with neutral text/borders and restrained green actions/focus. These are an adaptation to that direction, not asserted original reference values. Semantic review/error colors remain distinct.

## Implemented scope

One presentation stylesheet, loaded after existing styles: system 32/28px page titles, 22px section titles, 15px conversation text, 12px labels, 8px card/control radii, 36px ordinary targets and 44px primary actions. Existing compact spacing and 52px topbar stay intact. Overview's touching action buttons now have wrapping gaps. Fields have stronger borders than decorative separators. Native select semantics/popups are retained, with CSS-drawn chevrons so WebKit does not collapse the Music filter height. No JS, Rust, schema, navigation, data, approval or receipt logic changes.

`before.html` and `after.html` remain simple synthetic styling studies. After loads the same actual `web/studio.css` as the app. Neither has scripts or network access. Native screenshots in the task's `release-evidence/studio-preview` are stronger evidence than these studies.

## Validation / coverage

- Desktop suite: **209 passed, zero skipped**, including the actual local bundle's MCP companion against disposable profiles. Native ad-hoc bundle build passed. No Apple submission or public distribution for this visual pass.
- Real native UI at 1280×840 and 880×620: first-run setup, Settings, People empty/list/search/detail/editor, Music empty, Instagram disconnected/new/saved draft/editor, Overview and disconnected chat. Synthetic contact save and middle-name search passed; Tab focus on Clear, Return reset/focus return and Escape chat close/focus return passed. The final Music dropdown opened the native menu and accepted Down/Return to select Audio. Two configured native window sizes were inspected; a drag-resize attempt did not change the window, so that attempt is not counted as resize acceptance.
- Native window Zoom expanded the final slate Instagram editor to the available desktop and restored the compact window without losing the saved draft; the expanded editor/preview and top header were inspected and captured. Continuous drag resizing and assistive-technology operation remain unverified.
- Final slate comparison screenshots use the 880×620 window; the earlier 1280×840 captures used the superseded olive colors and establish layout only. Native before/after People screenshots use the same synthetic contact and query at 880×620. No user contact dataset or provider data was accessed. The installed GiGi remains untouched; preview has identifier `agency.createsomething.gigi.studio-preview` and its own disposable workspace.
- Native navigation also checked empty Gigs, Schedule, Tasks, Money and Companies plus Profile and History. Shared style/source review covers library records, confirmations and receipts. Full populated/error permutations have not been repeated for this presentation-only preview. Connected chat, real Instagram publication and account setup are not accepted by this work.
- Final slate contrast: text/panel 13.82:1; muted/panel 7.69:1; primary text/button 11.59:1; control border/raised 3.55:1; focus/panel 8.73:1. Disabled controls remain deliberately subdued. Reduced-motion rule is unchanged.

## Decisions deferred / release boundary

No new top-tab navigation, light-mode preference, split-pane interaction or user density settings. At minimum height the existing sidebar scrolls; its lower destinations need scrolling. A navigation redesign would need separate review.

This is a reviewable local preview. Micah authorized review, polish and publication of this bounded design pass. Independent review of a1dfb93d6 found no blocking findings in the cascade, focus styling, invalid-field precedence, asset inclusion or saved native screenshots. Release qualification is in progress for 0.2.4; no new installer has been published. The production release remains 0.2.3. Worktree disposition: retained on `codex/gigi-studio-alignment` for preview review.
