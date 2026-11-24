---
name: write-doc-blocks
kind: function
version: 0.1.0
---

# Write Doc Blocks

> One atomic write of the six blocks into the week's skeleton, then a
> placement check that compares every paragraph by exact text. The Google Docs
> API is index-based and other people edit the doc while the run is in
> flight, so the check is the safety net, not the write.

### Parameters

- `doc_id`: the notes document id.
- `blocks`: the six ordered lists of `{ text, nested }` from `draft_blocks`.
- `mode`: `manual` or `scheduled` writes the blocks; `refresh` replaces the
  Queue review paragraphs in place.

### Returns

- `result`: `{ section_bounds: { start, end }, expected, verified,
  recoveries, revision_id }`.
- if the skeleton for the week is missing: `{ expected: 0, verified: 0,
  reason: "no skeleton" }` and the caller inserts the whole block at the
  trailing empty HEADING_2 paragraph, restyling the first line to HEADING_3
  and bulleting each run (the 9/22 recipe).
- if a paragraph is verified at the wrong place: the recovery ran and
  `recoveries` lists what was moved.

### Errors

- `anchor_mismatch`: the six empty bullet paragraphs after PSAs, Queue
  review, Discussion topics (twice) were not found in order. The caller stops;
  nothing was written.

### Invariants

- The GET immediately before the write supplies the indexes. The fields mask
  is `body.content(startIndex,endIndex,paragraph(elements(startIndex,endIndex,
  textRun(content,textStyle(link))),bullet(listId,nestingLevel),
  paragraphStyle(namedStyleType,indentStart(magnitude),
  indentFirstLine(magnitude))))`. The ~2 MB reply is saved to disk and parsed
  with the `parse_doc.py` pattern into `{ s, e, txt, list, style, indent,
  links }` per paragraph.
- The week's section is the first one; headings carry the date as a chip, so
  sections are matched by order, never by date text.
- One `:batchUpdate` carries every insert ordered highest index first, then
  the indent requests for nested lines (`indentStart` 72 pt,
  `indentFirstLine` 54 pt) at positions computed in-script from the insert
  lengths in UTF-16 units (`len(s.encode('utf-16-le'))//2`; the 💻 emoji is
  two units).
- Multi-bullet text is the lines joined with `\n` and no trailing newline, so
  the splits inherit the bullet of the empty paragraph.
- Verification is a fresh GET and an exact-text match of every expected
  paragraph at its expected `startIndex` and `endIndex`, plus `indent == 72`
  for nested lines. Presence alone proves nothing.
- A refresh deletes `{ s, e-1 }` of the target paragraph and inserts the new
  sentence at `s`, highest first; style and bullet survive. Links on the
  replaced paragraph are re-applied by the caller.

### Strategies

- Expect the operator to be in the doc on Monday morning. Keep each write
  small and never assume a bullet still exists.
- Splice recovery: locate the exact inserted strings with a char-offset map
  over text runs, then one batch ordered highest index first: insert at the
  correct bullets, then `deleteContentRange` over the misplaced spans
  including their `\n`, which merges a split host bullet back together.
- `createParagraphBullets` on an already bulleted list does not nest and does
  not strip tabs; use the indent request for nesting.
- The Zapier raw request needs `fail_on_errors: "true"` and query parameters
  under `querystring`. A GET can time out once; retry once before anything
  else.

### Shape

- `self`: GET, anchor, build, write, GET, verify, recover.
- `prohibited`: writing outside the first section; deleting anything that is
  not a span this function inserted; a second write before the first is
  verified.
