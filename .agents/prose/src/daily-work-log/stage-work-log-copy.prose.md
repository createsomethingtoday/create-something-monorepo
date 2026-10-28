---
name: stage-work-log-copy
kind: function
version: 0.1.0
---

# Stage Work Log Copy

> Judgment tier of the daily work log, as a called helper. Decides whether a
> candidate is a distinct task or a checkpoint on an existing thread, fixes its
> proof level, sanitizes audience-facing copy, and stages the exact JSON request.
> Derived from `docs/guides/DAILY_WORK_LOG_RUNBOOK.md` §4.

### Parameters

- `candidate`: one reviewed candidate with identity, workstream, outcome,
  proof level, checkpoint date, and provenance.
- `ledger`: the current task ledger, reconciled.
- `seed_ledger`: the original 82-thread seed used for additional duplicate
  detection.
- `recent_history`: paginated recent channel history from preflight.

### Returns

- `item`: `{ identity, kind, parent_ts, request, attempt_record_path,
  reason }` where `kind` is one of `new_parent`, `checkpoint`, `duplicate`,
  `pending`.
- if `kind` is `new_parent`: `request` is a parent message with a concise task
  title, workstream, outcome, checkpoint date, and accurate status, plus a
  detail reply explaining delivery, practical value, useful artifact or issue
  links, and compact dated evidence.
- if `kind` is `checkpoint`: `request` is one reply and `parent_ts` names the
  existing confirmed parent.
- if duplicates cannot be ruled out: `kind` is `pending` and `reason` names
  what evidence was missing.

### Invariants

- Comparison uses issue or artifact identity, source ids, and normalized
  outcome against the whole ledger, the seed ledger, and recent history.
  Different dates or wording never make a new task.
- Proof levels are preserved exactly. Prepared presentations are not delivered
  presentations. Historical production statements are dated evidence, not
  current live audits.
- Copy contains no secrets, contacts, private paths, transcripts, or sensitive
  client financial, HR, or medical details. Drafts and prepared artifacts are
  labeled as such. No group mentions.
- The staged request is written as a JSON file, never interpolated into a
  shell command, and carries `unfurl_links:false`, `unfurl_media:false`,
  `reply_broadcast:false`.

### Shape

- `self`: compare, classify, set proof level, sanitize, stage.
- `prohibited`: sending anything; modifying the ledger; reading raw history
  beyond what preflight returned.

### Strategies

- when a candidate matches an existing thread by identity but adds a later
  checkpoint: classify as `checkpoint`, even when the wording differs.
- when the only evidence of a prior post is a ranked search hit: treat
  duplicates as unresolved and return `pending`.
