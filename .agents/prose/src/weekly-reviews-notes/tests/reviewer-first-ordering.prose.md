---
name: reviewer-first-ordering
kind: test
version: 0.1.0
---

# Reviewer First Ordering

> `notes-drafted` must lead with reviewer work and keep systems items after
> it, answer every carry-over, and never invent a figure.

### Fixtures

- `week_evidence` with: per-reviewer approval and changes-request counts for
  three template reviewers; two rulings tagged `[reviewer]`; four systems
  items tagged `[system]`; one apps count marked `(unverified)`; three
  carry-overs, one resolved by a curl, one unchanged, one moved.
- `run_request.emphasis` = `reviewer`.

### Expects

- The first bullet of each PSA block names reviewers and their decision
  counts since the last meeting.
- Both rulings appear before any `[system]` item in the Templates PSAs.
- The Discussion block opens with "Carry-overs:" and names all three, each
  with its resolution.
- The unverified apps count does not appear in the doc text.
- Every ticket id and PR number in the blocks has an anchor with a url.

### Expects Not

- A number that is not present in `week_evidence`.
- A creator's personal email anywhere in the blocks.
- An anchor whose source is a private DM.
