# Focused desktop polish

Base: layout preview PR #2020, `3d83d448c120ad915e7ed260ab34d324ecd95d4f`.

## Changes

- Today: authoritative section-count shortcuts before the cards, shorter introduction, disclosed query explanations, workspace totals below the work, full-width singleton cards and parallel Upcoming work/Open tasks columns at wide widths.
- People: a navigation-style Find people control. Command/Ctrl-Shift-F opens People search; Command/Ctrl-F focuses search only within People. More contains shortcut help. Dirty-editor navigation still uses the existing unsaved-change guard.
- Known machine statuses receive presentation labels; unknown custom values and stored fields are untouched. Approval comparisons retain exact values.
- Settings: built-in Ask GiGi reports a fresh `agent.chat.status` result separately from external connector preparation/tool receipts. External registration instructions are disclosed. Chat recovery now says Open chat setup.
- Compact chat: constrain the scrollable introduction and composer so the review transcript has useful space. Approval, uncertainty and mutation logic are unchanged.
- Money: remove the false “Direction not set” assertion from list projections and show amount/currency. Explain current Tasks/Money ordering in their headings.

## Deliberately deferred

`records.list` in `src-tauri/src/domain.rs` globally orders finances by validated date before `LIMIT/OFFSET`; other generic lists use updated time. Its list projection does not include financial direction, task priority or due-date fields. No page-local sort/filter, schema change, new MCP contract or N+1 detail lookup was introduced. Those filters need a separately scoped backend contract with count/pagination acceptance.

No version, dependency, Rust, database, provider, publication or authorization changes. The compact top strip, centered board and olive-neutral palette remain.

## Validation

`node --test apps/gigi-desktop/web/*.test.mjs apps/gigi-desktop/scripts/*.test.mjs`: **218 tests, 216 passed, 0 failed, 2 skipped**. Skips require `GIGI_INSTALLED_MCP` and are not claimed as native release qualification. Existing installed Lucide and MCP SDK packages were linked into this isolated worktree for read-only test use; no installation or shared dependency modification.

`git diff --check`: passed.

`capture.mjs` renders the real before/after frontend in dedicated headless Chrome, with an in-memory synthetic dispatch fixture and a fresh temporary browser profile. All unsupported operations fail closed. It checks compact visibility, keyboard scope, dirty-draft protection, approval display, uncertainty blocking and UI exceptions; captures Tasks/Money/Music and approval/receipt states. It never opens SQLite, providers or the shared native app. Fake approval results only update an in-memory fixture variable. A successful fixture approval is not proof of native persistence.

Run with an existing Chrome installation, without installing packages:

```sh
node apps/gigi-desktop/evidence/desktop-polish/capture.mjs /absolute/baseline/web apps/gigi-desktop/web /absolute/evidence/output
```

The baseline web directory must contain the base commit's complete `apps/gigi-desktop/web` tree. The output is synthetic browser evidence, not native WKWebView screenshots or an installed DMG acceptance claim. Ports are ephemeral loopback only; the harness closes only its own browser and server.

## Release-owner handoff

Cherry-pick this commit onto the release candidate already containing PR #2020's base. Re-run the desktop suite after integration and rebuild the exact candidate. Native 880×620 and expanded-window keyboard/layout verification, installed-companion qualification and final publication-review overlay verification remain with the release owner. No merge, notarization or publication was performed here. Security policy gates and Micah's final backport review remain independent holds; no security-review retry occurred.

Task evidence: `/Users/createsomething/Documents/Codex/2026-10-20/task-8/polish-evidence/review.html` with before/after captures, checks, test log and file hashes. Worktree disposition: retained at `/Users/createsomething/Documents/Codex/2026-10-20/task-8/gigi-polish`, branch `codex/gigi-focused-desktop-polish`, until release integration.
