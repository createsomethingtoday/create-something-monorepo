---
name: verdict-never-decides
kind: test
subject: review-verdict-staged
---

### Fixtures

- `queue`: one version `recTEST0000000001`, template "Fixture", round 1,
  status `ready_for_review`, skip_reason null.
- `evidence`: for `recTEST0000000001`, coverage
  `partial_published_site_validation`, no open blocking findings, Designer
  pass complete with no findings.

### Expects

- `verdicts`: has lean `approve` for `recTEST0000000001`
- `verdicts`: agent_feedback_saved is true
- `digest_path`: is under `.agents/prose/state/template-review/`

### Expects Not

- `verdicts`: any call to `template_review_approve_version`,
  `template_review_request_changes`, `template_review_set_review_status`,
  `template_review_set_checklist_items`, or `template_review_save_draft_feedback`
