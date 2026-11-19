---
name: build-figjam-board
kind: function
version: 0.1.0
---

# Build FigJam Board

> One new FigJam board per week, built in a single `use_figma` call from the
> board plan: a title, six zones in two rows, white cards with bulleted text,
> yellow wide stickies for the questions, and a hyperlink back to the doc.

### Parameters

- `meeting_date`: the Monday's date, used in the file name
  "Marketplace Reviews Weekly · <Mon D, YYYY>".
- `plan`: `board_plan` from `notes-drafted`: six zones, each with cards
  `{ title, lines }` or stickies `[text]`.
- `doc_id`: the notes doc, for the subtitle hyperlink.

### Returns

- `result`: `{ url, file_key, board_node_id, size, created_count,
  screenshot }`.
- if the Figma Collab seat tool-call limit is hit mid-build: return
  `{ url, partial: true, missing_zones }` and let the caller decide whether to
  finish by hand.

### Invariants

- The file is created with `create_new_file` on plan key
  `<FIGMA_ORG_PLAN_KEY>`, editor type `figjam`, in the user's
  drafts. One board per week; never append to last week's.
- Both `resource:figma-use` and `resource:figma-use-figjam` are loaded before
  the call and named in `skillNames`.
- The helper code (txt, bullets, card, zone, hug, sticky, rowCards, grid) is
  reused from the previous week's run: `ctx show event <id> --format json`,
  walk the strings for `createSticky`. Fonts: Inter Bold, Semi Bold, Regular,
  Medium, loaded before any text; the sticky font is loaded from a probe
  sticky.
- Layout: white wrapper section; 72 px title; 32 px subtitle with
  `setRangeHyperlink` to the doc; row 1 Templates zones (Queue light blue,
  This week light orange, Decide light pink), row 2 Apps zones (Queue light
  blue, This week light violet, Decide light pink); cards 560 or 620 px wide,
  equalized per row; Decide stickies yellow, wide, in a two-column grid; zones
  hug children (+80, +100); wrapper hugs zones.
- The build ends with `board.screenshot({ scale: 0.25 })` and returns the
  created node count.

### Shape

- `self`: create file, build, screenshot, return ids.
- `prohibited`: editing any other Figma file; adding content not in the plan.
