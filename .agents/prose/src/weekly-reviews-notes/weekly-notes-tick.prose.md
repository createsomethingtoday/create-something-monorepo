---
name: weekly-notes-tick
kind: gateway
version: 0.1.0
---

# Weekly Notes Tick

> Ingress for the Monday "Marketplace Reviews Weekly" notes. Documents the
> trigger so the collection responsibility has one declared wake source. No
> schedule is created by this file; the operator kicks it from chat today.

### Continuity

external-driven

### Schedule

- `30 7 * * 1` in `America/Chicago` is the intended cadence (the meeting is
  Monday morning; the skeleton for the week often exists by Sunday evening).
  Not enabled; `prose serve` is off for this package.

### Receives

- Manual kick: the operator asks to complete this week's notes and gives the
  doc link. Optional emphasis, for example "the last few meetings felt
  systems-centric, highlight reviewer-centric details".
- Refresh kick: the operator asks to refresh queue numbers on the morning of
  the meeting after the section was already written.
- Follow-up kick: the operator asks which open items can be resolved now.

### Maintains

- `run_request`: `{ run_started_at, mode, meeting_date, last_meeting_date,
  window_start, emphasis, doc_id }` where `mode` is one of `scheduled`,
  `manual`, `refresh`, `followup`; `window_start` is the last meeting's date at
  noon Central; `emphasis` is one of `reviewer`, `systems`, `balanced` and
  defaults to `reviewer`.

**Canonicalization spec**: `run_started_at`, `mode`, `meeting_date` and
`emphasis` are material. Chat wording and request ids are immaterial.

### Emits

- review-week-collected
