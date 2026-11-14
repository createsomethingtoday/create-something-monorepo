---
name: apply-reviewer-decisions
kind: function
version: 0.1.0
---

# Apply Reviewer Decisions

> The only path from a staged verdict to a creator-facing or publishing
> write. It runs in an interactive session after the reviewer replies to a
> digest, and it is never called by the scheduled run. The headless runner
> also blocks its write tools, so the boundary does not rest on this file
> alone.

### Parameters

- `digest_path`: the digest the reviewer is answering.
- `decisions`: the reviewer's reply, for example
  `approve 1 3 5; cr 2 4; hold 6; edit 2: <replacement line>`.

### Returns

- `results`: per version `{ n, version_id, action, status, receipt }`
  where `status` is one of `done`, `failed`, `held`.
- if a number in `decisions` is not in the digest, or one version gets two
  actions: nothing runs and the error names the conflict.

### Invariants

- The reviewer's message is the explicit approval for exactly the listed
  actions. A version that is not named is held.
- Before any write: re-run `template_review_get_review_context` and confirm
  the capability flag for the action. If the version's status or
  `last_published` changed since the digest, hold it and say why.
- Approve order: `template_review_create_admin_template` (skipped when an
  Admin record exists) → `template_review_complete_admin_template` →
  `template_review_set_checklist_items` with the digest's verified items and
  the publishing checklist → `template_review_approve_version`. A 🚨 error
  after approve is cleared by approving again once.
- Request changes uses `template_review_request_changes` with the staged
  draft, after any `edit` lines are applied, so the creator gets the text the
  reviewer saw.
- Results are appended to the digest file under a dated "Applied" heading.

### Shape

- `self`: parse decisions, re-check context, run writes in the fixed order,
  record receipts.
- `prohibited`: actions the reviewer did not name; rejecting; delisting;
  ticket replies beyond the request-changes email; featured writes.

### Errors

- `capability_denied`: the context flags do not allow the action.
- `stale_digest`: the version changed after the digest was written.
