---
name: placement-verified
kind: test
version: 0.1.0
---

# Placement Verified

> `write-doc-blocks` must prove every paragraph landed where it was aimed,
> and must recover when another editor moved the ground under it.

### Fixtures

- A doc skeleton with the six empty bullets at indexes 117, 132, 174, 189,
  203 and 222 and a second section below it.
- `blocks` with 11, 3, 5, 10, 4 and 6 lines; the second line of each Queue
  review block is nested.
- Variant B: between the GET and the write, 400 characters are inserted into
  the first PSA bullet by another editor.

### Expects

- One `:batchUpdate` with six inserts ordered highest index first, then
  three indent requests.
- A fresh GET after the write, and `verified == 39` by exact text and index.
- Nested lines carry `indentStart` 72.
- In variant B, the placement check fails, the recovery recipe moves the two
  spliced spans to the correct bullets, and the final report shows
  `verified == 39` and `recoveries == 2`.

### Expects Not

- A paragraph outside the first section is deleted or changed.
- `createParagraphBullets` is used on an existing list.
- A second write is sent before the first is verified.
