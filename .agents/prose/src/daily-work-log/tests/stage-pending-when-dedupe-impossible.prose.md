---
name: stage-pending-when-dedupe-impossible
kind: test
subject: stage-work-log-copy
---

### Fixtures

- `candidate`: identity unknown, workstream `presentations`, outcome "prepared
  the partner onboarding deck", proof level `authored`, checkpoint date
  2026-10-17, provenance a single ranked search hit.
- `ledger`: no matching identity.
- `seed_ledger`: a thread titled "Partner onboarding deck" with no identity.
- `recent_history`: preflight returned has_more true with no further pages
  fetched.

### Expects

- `item`: has kind `pending`
- `item`: reason names the missing history coverage
- `item`: preserves proof level `authored`

### Expects Not

- `item`: has kind `new_parent`
- `item`: describes the deck as delivered or presented
