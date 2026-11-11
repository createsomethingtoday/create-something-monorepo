---
name: notes-published
kind: responsibility
version: 0.1.0
---

# Notes Published

> Automation tier of the weekly notes. Puts the draft into the Google Doc
> without disturbing anything else in it, links every anchor, builds the FigJam
> board, attaches the evidence screenshots, and proves placement before it
> signs. Other people edit this doc while the run is in flight; placement is
> verified, not assumed.

### Goal

The week's section in the notes doc matches `draft_blocks` paragraph for
paragraph, every anchor is a working link, the Visual summary line points at
this week's board, and the evidence screenshots sit with the items they prove.

### Requires

- `draft_blocks`: the six blocks, anchors and board plan from `notes-drafted`.
- `run_request`: doc id, meeting date, mode.

### Maintains

- `publication`: `{ doc_revision_id, paragraphs_expected, paragraphs_verified,
  links_expected, links_verified, board_url, screenshots: [{ file, caption,
  placed_in: doc|board|both }], splice_recoveries }`.

**Canonicalization spec**: the verified counts, board url and screenshot
captions are material. Revision ids and run timestamps are immaterial.

**Postconditions**:

- `paragraphs_verified == paragraphs_expected` by exact text match on a fresh
  GET after the write, and every nested line has `indentStart` 72.
- `links_verified == links_expected` by exact run match: each linked text run
  equals its anchor and carries its url.
- The Visual summary line in this week's section links to `board_url`, and
  the board has six zones with the titles in the board plan.
- Each screenshot has a caption naming what it proves and the date it was
  taken, and is placed under the bullet it supports or in the matching board
  zone.

### Continuity

- **input-driven**: a `notes-drafted` receipt whose `draft_blocks` fingerprint
  moved. A `run_request` with `mode: refresh` re-renders only the Queue review
  paragraphs in place.

### Tools

- `mcp:zapier`: Google Docs raw GET and `:batchUpdate` as <operator email>,
  connection `<ZAPIER_GDOCS_CONNECTION_ID>`
- `mcp:figma`: `create_new_file` and `use_figma` on the Webflow organization
- `cli:ego-browser`: screenshots and the Google Docs image upload

### Invariants

- The GET immediately before the write is the one the indexes come from.
  When the doc changed between GET and write, the placement check fails and
  the recovery recipe runs; the run never leaves a spliced bullet in place.
- Writes to the doc are additive inside the week's section. Paragraphs
  outside the section are never deleted. A refresh replaces a Queue review
  paragraph in place (delete the range, insert at the same index, restyle).
- Text-style updates (links) never move indexes, so they are sent after the
  content is verified.
- Screenshots never contain a creator's or developer's personal email. When a
  record view would show one, the capture is cropped or the field hidden.

### Execution

```prose
let placed = call write-doc-blocks
  doc_id: run_request.doc_id
  blocks: draft_blocks
  mode: run_request.mode

let linked = call link-doc-anchors
  doc_id: run_request.doc_id
  anchors: draft_blocks.anchors
  section: placed.section_bounds

let board = call build-figjam-board
  meeting_date: run_request.meeting_date
  plan: draft_blocks.board_plan
  doc_id: run_request.doc_id

let repointed = call link-doc-anchors
  doc_id: run_request.doc_id
  anchors: [{ text: "Visual summary: FigJam board for today's notes", url: board.url }]
  section: placed.section_bounds

let evidence = call capture-evidence-screenshots
  items: draft_blocks.evidence_requests
  doc_id: run_request.doc_id
  board_url: board.url

return {
  doc_revision_id: linked.revision_id,
  paragraphs_expected: placed.expected,
  paragraphs_verified: placed.verified,
  links_expected: linked.expected + repointed.expected,
  links_verified: linked.verified + repointed.verified,
  board_url: board.url,
  screenshots: evidence.placed,
  splice_recoveries: placed.recoveries
}
```

### Shape

- `self`: sequence the four functions, hold the verification counts, sign.
- `delegates`: `write-doc-blocks`, `link-doc-anchors`, `build-figjam-board`,
  `capture-evidence-screenshots`.
- `prohibited`: sending anything to a creator, developer or shared Slack
  channel; editing paragraphs outside the week's section; publishing a board
  outside the Webflow organization drafts.
