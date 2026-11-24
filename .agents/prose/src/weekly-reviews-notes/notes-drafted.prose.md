---
name: notes-drafted
kind: responsibility
version: 0.1.0
---

# Notes Drafted

> Judgment tier of the weekly notes. Turns the week's evidence into the six
> blocks the doc expects, in the team's voice, reviewer work first, with the
> carry-overs answered and the anchors for links and the board already chosen.

### Goal

A draft the review team can read in thirty seconds per section and act on,
where every bullet leads with the outcome, names the reviewer or creator it is
about, and links to the thing it describes.

### Requires

- `week_evidence`: the four facets from `review-week-collected`.
- `run_request`: meeting date and emphasis.

### Maintains

- `draft_blocks`: six ordered lists `T_PSA`, `T_QUEUE`, `T_DISC`, `A_PSA`,
  `A_QUEUE`, `A_DISC` of `{ text, nested, anchors: [{ text, url,
  must_contain? }] }`, matching the doc skeleton: Templates PSAs, Queue review,
  Discussion topics & Questions; Apps PSAs, Queue review, Discussion topics.
- `board_plan`: for each of the six FigJam zones (Templates Queue, This week,
  Decide; Apps Queue, This week, Decide) the card titles, bullet lines and the
  Decide stickies, derived from the blocks, never written separately.

**Canonicalization spec**: bullet text, nesting and anchor urls are material.
Whitespace and bullet order inside a block are material too, since the doc is
read top to bottom. Draft timestamps are immaterial.

**Postconditions**:

- Each PSA block opens with per-reviewer decisions since the last meeting,
  then rulings and judgment calls, then recurring creator or developer
  mistakes, then systems items. With `emphasis: systems` the order of the
  last two swaps; it never drops the reviewer items.
- The Queue review block has one nested line for the per-reviewer split and
  states the window in dates and times.
- The Discussion block opens with "Carry-overs:" naming every item from last
  week and its resolution, then new questions, each ending in a question or a
  named owner.
- Every ticket id, PR number, Linear or Jira key, Slack-sourced claim and
  template or app with a listing has an anchor. Anchors from private DMs are
  not allowed.
- Numbers appear in the Queue review blocks and in the first sentence of a PSA
  at most; prose elsewhere describes, it does not count.
- No creator or developer personal email; no internal-only product names in
  the creator-facing sense (this is an internal doc, so review-team names such
  as Preflight and the MCP are fine).

### Continuity

- **input-driven**: a `review-week-collected` receipt whose `templates`,
  `apps`, `own_work` or `carry_overs` facet moved, or a `run_request` whose
  `emphasis` moved.

### Strategies

- Voice: plain, specific, humanized. Lead with the outcome. Short sentences.
  No em-dashes, no parentheticals longer than a date or an id. "Eric's ruling
  ask (Oct 15)" is fine; a clause in brackets is not.
- Rulings are written so another reviewer can apply them next week: the
  situation, the decision, the reason. "A hidden form label (display:none) is
  accepted when the placeholder supplies the accessible name."
- Recurring mistakes are listed once, with the count of affected templates or
  apps, not once per template.
- When a carry-over is resolved by the operator's own work, say so in the
  carry-over line and keep the detail in the PSA that covers it.
- When evidence is marked unverified, the draft either omits the number or
  keeps the caveat in the prep notes, never in the doc.

### Shape

- `self`: order, compress, write the six blocks, choose anchors, derive the
  board plan.
- `delegates`: none.
- `prohibited`: inventing a figure, a quote or a name; adding items the
  evidence does not contain; softening a ruling.
