# Weekly reviews notes: OpenProse program

Started October 19, 2026. Owner: Micah Johnson. Pin: `docs/openprose/VENDOR.md`.
First run by hand on October 19, 2026 (the Oct 19 section of the notes doc,
board `<FIRST_RUN_BOARD_KEY>`, 39 paragraphs and 35 links verified).

Fills the Monday "Marketplace Reviews Weekly" Google Doc
(`<NOTES_DOC_ID>`) for the review team, builds
the FigJam visual summary, attaches evidence screenshots, and then runs one
pass over the open items the notes raise. The doc is the artifact the team
reads in the meeting; the program exists so the Monday morning is prep, not
archaeology.

## Placeholders

This repository is public, so Webflow-internal identifiers are written as
placeholders in angle brackets: `<NOTES_DOC_ID>`, `<ZAPIER_GDOCS_CONNECTION_ID>`,
`<FIGMA_ORG_PLAN_KEY>`, `<MARKETPLACE_BASE_ID>` and its table, field and record
ids, and one `<…_CHANNEL>` per Slack channel. The operator's private memory
ledger (see Source of truth) holds the real values; resolve them there at run
time and never commit them here.

## Source of truth

This package is the operating contract. The memory file
`reference_weekly_reviews_meeting_doc_prep.md` (Claude memory, project scope)
is the gotcha ledger: splice recoveries, index histories, tool quirks. When
the two disagree on *what* must be true, this package wins; when they disagree
on *how a tool misbehaved last time*, the ledger wins and this package is
corrected.

## Why reviewer-centric comes first

From October 19 the notes lead each section with reviewer work: who decided
what, the rulings they made, where creators or developers pushed back, and the
mistakes that keep recurring. Systems items (automations, MCP, pipelines)
follow. The meeting had drifted into systems talk for several weeks, and the
people in the room are reviewers.

## Shape

| File | Kind | Tier | Model |
| --- | --- | --- | --- |
| `weekly-notes-tick.prose.md` | gateway | Ignition | n/a |
| `review-week-collected.prose.md` | responsibility | Database | two sonnet collectors, haiku for tallies |
| `notes-drafted.prose.md` | responsibility | Judgment | opus (the VM session) |
| `notes-published.prose.md` | responsibility | Automation | haiku for verification, VM for writes |
| `write-doc-blocks.prose.md` | function | Automation | n/a (API) |
| `link-doc-anchors.prose.md` | function | Automation | n/a (API) |
| `build-figjam-board.prose.md` | function | Automation | n/a (Figma MCP) |
| `capture-evidence-screenshots.prose.md` | function | Automation | ego-browser |
| `resolve-open-items.prose.md` | function | Judgment, gated | sonnet checks, VM decides |
| `tests/*.prose.md` | test | Judgment | n/a |

Wiring: the gateway maintains `run_request`. Collection requires it and
maintains `week_evidence` (facets `templates`, `apps`, `own_work`,
`carry_overs`). Drafting requires `week_evidence` and maintains
`draft_blocks`. Publication requires `draft_blocks` and maintains
`publication`. `resolve-open-items` is called after publication when the
operator asks for it; it never runs on the schedule.

## Where the humans are

- The draft is shown to the operator before the first write when the operator
  is present. In an unattended run the write proceeds, because doc edits are
  reversible and the operator reviews in the doc.
- Nothing creator-facing or developer-facing is sent by this program. Zendesk
  replies, Slack posts to shared channels, and changes requests are staged as
  exact text and wait for an explicit go. This is Webflow policy for partner
  and customer contact and the operator's standing rule for Slack drafts.
- Airtable writes that only the review team sees (exception rows, automation
  drafts) are made directly and screenshotted as evidence.

## Running it

In a Claude Code session at the repo root:

```text
prose lint .agents/prose/src/weekly-reviews-notes/review-week-collected.prose.md
prose test .agents/prose/src/weekly-reviews-notes/tests
prose run .agents/prose/src/weekly-reviews-notes/weekly-notes-tick.prose.md
```

A gateway refuses direct `prose run`; use it to compile, then run
`review-week-collected` with a manual `run_request`. The typical chat kick is
"Let's complete the notes for this week in <doc link>", which maps to
`mode: manual`.

## Data sources the collectors are allowed to use

- Template Review MCP: `get_metrics days=7`, `list_queue` by status, `search_versions`.
- App Review MCP when connected: `queue_stats`, `list_exception_queue`.
  When it is not connected (only `authenticate` tools present), fall back to
  Airtable base `<MARKETPLACE_BASE_ID>`: versions `<VERSIONS_TABLE_ID>` filtered by
  type rollup `<TYPE_ROLLUP_FIELD>` containing `<APP_TYPE_RECORD_ID>` and submitted
  `<SUBMITTED_FIELD>`, tallied by `<REVIEW_TYPE_FIELD>` and `<REVIEW_STATUS_FIELD>`;
  exceptions `<EXCEPTIONS_TABLE_ID>` where `<UNDECIDED_FIELD>` = 1.
- Slack channels: templates <TEMPLATES_CHANNEL>, review team <REVIEW_TEAM_CHANNEL>, templates
  triage <TEMPLATES_TRIAGE_CHANNEL>, libraries <LIBRARIES_CHANNEL>, DMCA <DMCA_CHANNEL>; apps
  <APPS_CHANNEL>, working group <APPS_WORKING_GROUP_CHANNEL>, exceptions <APP_EXCEPTIONS_CHANNEL>, apps triage
  <APPS_TRIAGE_CHANNEL>.
- ctx (`ctx search --since 8d`) and the project memory files for the
  operator's own closures that Slack never saw.
- Zendesk through Zapier (`zendesk_find_ticket_comments`) for ticket context.

## Token use

- Each collector runs in its own Sonnet session and returns dated bullets
  with permalinks, tagged `[reviewer]` or `[system]`. Raw channel reads and
  MCP payloads stay in those sessions.
- The 2 MB Google Docs GET is saved to disk and parsed with the
  `parse_doc.py` pattern; only paragraph indexes and text reach the VM.
- The FigJam board is one `use_figma` call built from the previous week's
  helper code (`ctx show event <id> --format json`, walk for `createSticky`).
