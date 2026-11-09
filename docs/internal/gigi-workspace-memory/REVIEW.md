# GiGi workspace-owned curated memory — CRE-2382

Release-candidate preparation is authorized for 0.3.5. Parent owns integration
and promotion. No merge, upload/publication, deploy, Slack/email, installed-app
mutation, host-memory import or Linq work is authorized in this lane. Worktree disposition: preserved at
`/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-0597f042`, branch
`t3/gigi-workspace-agent-memory`, until parent integration.

## Baseline and ownership

Started from a clean isolated T3 checkout, fetched upstream, and advanced it to
PR #2220 published head `681f4fe31888def247e3112c85931a2d7865547d`. The reviewed
UI/runtime is `fa37fb904a47b29476bc7a7089bd9438e3a3f781`. Danny's
Work/Admin/Network/Platform navigation, weekly Today, Calm Tasks/Gigs, green
palette and saved preferences remain the baseline. Active receipt-recovery work
in `web/setup-imports.*`, `ui/dev-quest.jsx`, and
`scripts/dev-astryx-quest-browser.mjs` was not edited or imported. Reconcile its
published commit during parent integration. Never copy an active release tree.

Database: workspace-owned SQLite memory and review requests. Automation:
bounded memory retrieval and proposal tools shared by desktop, stdio MCP, and
embedded Codex. Judgment: explicit native review, revision fencing, advisory
context and honest forget boundaries. `ui/controller.mjs` owns the new model;
React only presents fields and invokes the controller's actions.

## Observable acceptance

| Criterion | Evidence | Limit |
| --- | --- | --- |
| Durable preference/decision/relationship/lesson, source, timestamps, workspace scope, explicit confidence | Native public `domain::dispatch` lifecycle tests; real React/native bridge | Source reference is human-reviewed provenance, not independent source verification |
| Create, review, reject, correct, replace, forget | Actual Astryx UI harness and native lifecycle tests | Native WebKit and screen-reader session untested |
| Restart persistence | Native test reopens SQLite on every dispatch; browser reload and a fresh native process for every UI call | No newly packaged desktop installer restart |
| Relevant bounded cited retrieval | `memory.search`: literal substring in active text, limit 1–5, revision URI + source; `memory.list`: 50/page | No semantic relevance ranking or automatic history ingestion |
| Embedded Codex and external MCP | Adapter tool-routing test; actual stdio MCP process shares app database, cannot approve requests | Embedded live provider turn and an installed external host connection untested |
| Stale updates and workspace isolation | Native stale-proposal approval, bad revisions, unknown foreign ids/workspaces; embedded foreign tool call denied | Local privileged filesystem access is outside the MCP capability boundary |
| Explicit approval, idempotency, readback | MCP can stage only; native review is atomic; hashed exact request reuse; content-free receipts; lost-response controller test fails before recovery fix and passes after | User must refresh Platform / Memory to discover external requests |
| Forget excluded from retrieval | Native search/get and actual UI flow; live entry payload purged; relevant pending payloads invalidated | Already-present conversations, backups, SQLite/WAL remnants are not securely erased |
| 880×620, normal width, themes, keyboard, draft guard | Screenshots + actual React/native flow; no horizontal overflow; create/Enter/focus and guarded navigation | Browser evidence is Chromium, not macOS platform-floor acceptance |

## Design evidence

Initial approach: a Platform memory page with readable rows, explicit confidence,
source, revision and timestamps; exact proposal review separate from saved entries.
Keep Astryx controls and Danny's frame. No new theme or motion.

Read-only Mobbin standard search returned and directly displayed three references:

- [Base44 memory](https://mobbin.com/screens/9128eb56-60e7-42e2-a406-fc289c4781a1): supports distinguishing conversation history from saved memory. No daily history calendar or ingestion was adopted.
- [hilos workspace memory](https://mobbin.com/screens/20238342-99a7-443d-a266-11487fe6f32d): supports workspace ownership and a dedicated management surface. No workspace-brief authority was adopted.
- [Gumloop agent settings](https://mobbin.com/screens/cc9cb33d-1469-4389-bbfa-cef25b63d3b0): counterexample; agent-specific instructions/self-updates would conflict with GiGi ownership and approval requirements.

No reference assets were copied. The actual page/editor, request review, and
Studio/Paper/Midnight output were directly viewed in synthetic Chromium.

## Validation and limits

- Repository bootstrap passed through the pinned launcher; existing T3 checkout registered to CRE-2382 against the published release branch.
- Desktop JS suite: 412 passed, 2 installed-artifact tests skipped.
- Integration suite including embedded memory contract: 341 passed, 1 live CTX test skipped; typecheck passed.
- Rust owning crate: 193 passed, including real stdio MCP memory test.
- `build:web` passed; production bundle excludes the synthetic backend.
- `test:rewrite` passed: 19 routes, 24 appearance combinations and keyboard navigation contract.
- New `scripts/workspace-memory-browser.mjs` passed create/correct/readback, external pending review/approve, forget, reload, theme widths, keyboard and dirty-navigation checks against isolated real native domain calls.
- Astryx doctor: 20 pass, 0 fail, 2 existing theme/font-proof warnings. Bundled local Figtree remains the approved baseline.

Functional gate: passed for local native domain, real stdio and synthetic
provider adapter evidence. Perceptual gate: passed for directly viewed actual
React/Astryx Chromium output. Release gate: held/untested pending parent integration, live provider and exact
native artifact qualification. Independent Sol 6.1 review passed after the
workspace-isolation finding was fixed and independently re-tested.

## Operation and rollback

Open Platform → Memory. Create a memory with its source and confidence. Correct
updates an existing id/revision; Replace creates a new id and excludes the old
entry; Forget removes live content/provenance and excludes future retrieval.
External agents can only search/get and request a change. A pending request is
not saved memory. Refresh, inspect the exact before/after/source/confidence, then
approve or reject. A stale request must be rejected and replaced after a fresh read.

Memory never grants permission, overrides policy or rewrites canonical records.
The app's isolated CTX history remains separate. No operator Codex/CTX store is
read or imported. Full transcript ingestion is absent. The shipped skill and
embedded chat instructions require citations and preserve inferred uncertainty.

SQLite tables are additive to the current database. Existing backups include
them; restoring an older backup can discard curated memory or restore forgotten
text, so review backup age/content. Forget is logical removal, not secure erase
or retroactive model unlearning. Existing conversations may repeat context already
received; start a new conversation after sensitive forget operations.

Parent release path: integrate this scoped source after PR #2220's final reviewed
runtime; preserve its receipt-recovery patch; rerun owning checks and UI flow;
verify actual embedded provider + external host; qualify native WebKit at 880×620,
then produce a new versioned signed artifact through the normal release gate.
Rollback: revert the memory source change. Older app versions ignore the additive
memory tables; retain a backup rather than dropping data. Never restore an old
backup merely to roll back UI because that may resurrect forgotten memory.


## Independent review and correction

A single independent Sol 6.1 reviewer ran the focused domain/stdio/controller and
embedded adapter tests, exercised the actual React/native-domain harness, and
viewed fresh screenshots. Initial review identified retained UI state during a
failed workspace transition. The builder reproduced a failing A→B regression,
then partitioned controllers by workspace, captured operation/recovery scope,
and cleared public-model state before a new-workspace read. The regression then
passed. Independent re-test also injected a late A recovery response after a
failed B read: no A rows/requests/receipts appeared in B and no subsequent A
entry read ran. The actual rendered harness adds a failed workspace transition
check. Reviewer reported no remaining blocker; functional and perceptual passed
within tested scope, shipping readiness untested.

## Parent integration verification

The parent integrated the release lane's frozen receipt-recovery correction
`9860f06169540aafa0c7b437ce16cb62e49099de` as `c786df796` on top of the
memory implementation. The correction retains its release-owned paths and
version declarations; no memory-bearing 0.3.4 installer has been published.
The release lane's existing 0.3.4 artifact does not contain memory.

On this combined tree, the parent reran the desktop Node suite and web build,
the actual React/native-domain memory lifecycle harness, all 13 guided-setup
browser outcomes, and Rust workspace-memory + real stdio protocol tests. All
passed; installed-artifact tests remain skipped. Fresh memory output at
880 and 1280 pixels passed all three themes with no page errors; the parent
viewed the rendered editor. A fresh independent integrated-source re-test
was requested after this integration.

Native WebKit, a live embedded provider turn, installed external host and a
new signed memory-bearing installer remain untested. Keep promotion held until
those gates and the stacked source review are resolved. Use a distinct next
release identity; do not reuse the qualified 0.3.4 artifact or immutable keys.
Worktree disposition: preserved at the path and branch above until promotion.

## PR review corrections

Both automated P2 findings on `5c879e2fc` reproduced before correction:

- Reopening Platform → Memory before editing disposed the navigation guard
  while React retained the component. The actual browser regression then lost
  the draft on Today navigation. Memory now uses the existing same-page creator
  preservation path; the exact repeated-navigation regression passes.
- `Élodie` search returned zero matches because SQLite lowercases ASCII while
  Rust lowercases Unicode. Search now streams active, workspace-scoped rows and
  applies Rust Unicode lowercase to stored text as well as queries. It retains
  at most limit + 1 matching ids and paginates matches. Existing entries need
  no migration. Native copied/lower/uppercase accented queries and two-page
  matching-id regression fail before and pass after.

After correction: 415 desktop tests pass (2 installed-artifact skips), web build
passes, actual React/native-domain memory browser flow passes, and Rust lifecycle
(3) plus real stdio MCP (1) tests pass. Search remains literal substring matching;
it does not add accent folding, semantic matching or full Unicode case folding.
Release/native/live-provider limits above still apply.

Independent Sol 6.1 re-test found no blocker in either review fix. It reran the
Rust and actual React/native-domain flows, directly viewed fresh editor output,
and additionally checked pagination across nonmatches, workspace/forgotten-status
exclusion and list pagination. Functional and Chromium perceptual gates passed;
release readiness remains held within the documented limits.


## 0.3.5 candidate checkpoint (2026-11-09)

The memory branch synchronized PR #2220 published head
`a4c3500bc3ad5be0ca5d1dbbe56e765e52c081cc` while #2220 remained OPEN.
This preserves its published receipt correction and release evidence without
mutating the active release branch or its memory-free 0.3.4 installers.
The package, Tauri, Rust lock/package, agent plugin and reconciliation identity
are coordinated at 0.3.5. Production bundle ID remains
`agency.createsomething.gigi`; do not install over the operator's public/DEV app.
No Agency download metadata is changed to 0.3.5 in this lane.

[Sanitized native qualification](NATIVE-QUALIFICATION.md) establishes actual
WebKit lifecycle and a live embedded provider at clean `99dbc201c`, using a
separate debug/ad-hoc QA app. It does not qualify a signed release installer.
External-host connection/search passed; proposal was blocked before execution:
“MCP tool call requires approval, but approval policy is never”. No installed
policy/config was weakened. Installed-host proposal acceptance remains open.

The new source head requires its own exact-head review. Native/perceptual and
provider receipts are bounded to the recorded QA source; final signed-candidate
runtime acceptance remains a parent gate. See [release and DEV handoff](RELEASE-035.md).
