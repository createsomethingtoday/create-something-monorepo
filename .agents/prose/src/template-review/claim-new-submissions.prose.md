---
name: claim-new-submissions
kind: function
version: 0.1.0
---

# Claim New Submissions

> The only assignment write in the program. It runs when the operator's kick
> says how many New (🆕Ready for Review, unassigned) versions to pick up, and
> never on a plain scheduled tick. Playbook phase 2 ("Find Work") and the
> first line of phase 5 ("claim the version") live here.

### Parameters

- `count`: how many versions to claim. `0` claims nothing and returns an
  empty list.
- `run_dir`: where the raw queue payload is saved.

### Returns

- `claimed`: list of `{ version_id, asset_id, template_name, published_url,
  preview_url, submitted_date }`, oldest submission first, at most `count`
  entries.
- if `template_review_assign_self` fails for a version: that version is
  dropped and the error is listed under `errors`; the next oldest is not
  substituted.

### Invariants

- Candidates come from `template_review_list_queue` with `assigned:
  unassigned`, `status: ready_to_review`, `sort: submittedDate_asc`. Nothing
  assigned to another reviewer is ever touched.
- `template_review_assign_self` is called once per claimed version and is the
  only write. No status change: the version stays 🆕Ready for Review until a
  verdict is applied.
- Fixture version ids (prefix `recTEST`) are never written to Airtable;
  under `prose test` the assignment is recorded as simulated.
- The claimed list is appended to `queue` by the caller with `status:
  ready_for_review`, `round: 1`, and `needs_designer_pass: true`.

### Shape

- `self`: list unassigned, take the oldest `count`, assign self, return.
- `prohibited`: assigning anyone else; unassigning; status, checklist,
  ticket, Admin, or Airtable writes.

### Tools

- `mcp:claude_ai_Template_Review_MCP`: `template_review_list_queue`,
  `template_review_assign_self`
