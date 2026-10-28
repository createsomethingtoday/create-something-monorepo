---
name: stage-checkpoint
kind: test
subject: stage-work-log-copy
---

### Fixtures

- `candidate`: identity `CRE-2252`, workstream `daily-work-log`, outcome
  "recovery backfill verified against the approved source profile", proof
  level `live-verified`, checkpoint date 2026-10-09.
- `ledger`: contains a thread for `CRE-2252` with parent `1759960000.000100`
  titled "CTX recovery and source profile approval", one prior checkpoint
  dated 2026-10-08.
- `seed_ledger`: empty.
- `recent_history`: the same parent appears with reply_count 1.

### Expects

- `item`: has kind `checkpoint`
- `item`: names parent_ts `1759960000.000100`
- `item`: request carries `reply_broadcast:false` and `unfurl_links:false`

### Expects Not

- `item`: has kind `new_parent`
- `item`: request contains a group mention or a private filesystem path
