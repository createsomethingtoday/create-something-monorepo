---
name: claim-respects-cap
kind: test
subject: claim-new-submissions
---

### Fixtures

- `count`: 2
- `run_dir`: `.agents/prose/runs/test-claim`
- the unassigned Ready for Review queue holds four fixture versions, oldest
  first: `recTESTNEW0000001` (submitted 2026-10-16T06:15Z),
  `recTESTNEW0000002` (2026-10-16T07:34Z), `recTESTNEW0000003`
  (2026-10-16T09:21Z), `recTESTNEW0000004` (2026-10-16T11:07Z); and one
  version `recTESTOTHER00001` assigned to another reviewer.

### Expects

- `claimed`: exactly two entries, `recTESTNEW0000001` then `recTESTNEW0000002`
- `claimed`: each entry carries a published_url and a preview_url

### Expects Not

- `claimed`: `recTESTNEW0000003`, `recTESTNEW0000004`, or `recTESTOTHER00001`
- any call to `template_review_assign_self` for a version not in `claimed`
- any call to `template_review_set_review_status`
