# Independent Sol 6.1 rebuilt-artifact re-test

Source HEAD independently checked: `9cc6800c5dca846c0aa1b3a0cfc0de773f0e0b48`. Exact reviewed native artifact: `/private/tmp/cre-2365-release-0223/responsive/GiGi.app` (0.2.23). Prior failing screenshot directly inspected before testing. Scope serves Automation with workspace-scoped Database reads and the existing unsaved-edit Judgment guard.

| Gate | Result | Evidence and limits |
| --- | --- | --- |
| Functional correctness | Passed | 345/345 desktop tests against this exact signed app companion, 27/27 selected source/search/keyboard/error/stale/timeout regressions, Rust search integration 1/1, actual native behavior below. Offline tests do not simulate a native provider outage or OS IME session. |
| Perceptual/product quality | Passed within measured scope | Directly viewed Studio/Paper/Midnight native header and search. Complete Appearance & views header now includes Search, Customize and Settings with no horizontal scrolling. Search input/footer stay visible and results scroll. Actual screenshots are 1762x1242 at2x =881x621; exact880x620 remains untested after bounded unsuccessful resize attempts. Settings has approximately20px right clearance, and source has no880/881 breakpoint; both use the same<=1000 compact rule. Parent explicitly accepted this measurement limit. |
| Release readiness | Untested for distribution | Independent `codesign --verify --deep --strict` passed and scoped diff from prior artifact source is only the compact search CSS restoration. Parent owns exact embedded revision qualification, notarization, DMG/installer, promotion and live verification. This report does not establish public distribution or production completion. |

## Actual native acceptance

- Launched only the full-path synthetic wrapper and full-path exact responsive app. Confirmed Today has9 synthetic Micah tasks. No real account, sign-in, `/Applications` app, provider or real record opened.
- Search button, Command-F and Control-F opened without navigating the underlying page/editor. Accessible name is Search workspace; input receives focus.
- Micah returned People1, Gigs1, Finances1, Tasks9. Six task rows initially, Shift-Tab reached Show more tasks, Enter appended6-8, removed More and recovered input focus. Other three groups remained.
- Result list scrolled while input/footer remained contained. Shift-Tab wrapped input to final result/control; Tab wrapped back to input. Down moved input to first result, Up returned to input. Enter on input opened saved Micah Johnson.
- Exact other-workspace exclusion query `OTHER WORKSPACE MUST NOT APPEAR` returned the clear no-results state.
- Escape returned focus to Search workspace. Modal accessibility tree exposed only search controls.
- Edited only the supplied synthetic contact draft, typed `Unsaved independent retest`, selected a Gig search result and received Keep your changes. Keep editing retained the exact typed draft. Repeating then Discard changes opened Event with Micah Phillips. No record saved. People, Finances and Tasks result destinations independently opened their matching saved detail.
- Directly viewed Studio, Paper and Midnight header/search at measured881x621. Repaired header remains fully visible on Appearance & views, the previous failing page.

## Evidence

- `desktop-tests.log`:345 pass,0 fail/skip; `GIGI_INSTALLED_MCP=/private/tmp/cre-2365-release-0223/responsive/GiGi.app/Contents/Resources/gigi-mcp`.
- `selected-regressions.log`:27 pass,0 fail/skip across workspace-search, app, bridge and source-center tests. Read the actual retention and error/timeout regression assertions.
- `rust-search.log`:owned-collection grouping, isolation, pagination, bounded payload/input regression1/1 pass.
- `async-refresh.log`:independently re-ran the existing app-entrypoint harness holding the actual overview read; asynchronous completion preserved input ancestor, active focus and unfinished composition text. This is an offline fixture, not an OS IME test.
- `studio-header-881x621.png`, `paper-header-native.png`, `midnight-header-native.png`:repaired header proof.
- `studio-search-881x621.png`, `paper-search-native.png`, `midnight-search-native.png`:contained grouped search; `studio-more-focus.png`:visible pagination focus and scrolled results.
- Source diff from`f3c4e1e7750bc5ddd827b903c89c2816325891e3`to current HEAD is1CSS insertion/1deletion. Existing compact trigger is30px; keyboard hint is now hidden<=1000. No breakpoint between880 and881.

## Final state and boundaries

Returned synthetic workspace to Today in Studio, Search closed, no dirty editor. Quit via native GiGi menu. Subsequent `cua.listApps()` showed no running GiGi; no app AX call after quit. CUA completion summary emitted exactly once. No source, signature, account, publish or production mutations. Only disposable synthetic preferences/draft state changed through native UI.

Worktree disposition: preserved at `/private/tmp/cre-2365-gigi-global-search` (parent owned). Evidence preserved at `/private/tmp/cre-2365-final-sol-retest`.
