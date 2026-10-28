# Acceptance checkpoints

> Source snapshot range (UTC): 2026-10-01T00:00:00.000Z to 2026-10-01T00:00:00.000Z.

## Preview readiness

A preview demonstrates rendering only. Production readiness additionally requires approved scope, acceptance evidence, and a rollback plan. Reachable is not accepted.

## Failed acceptance

A failed test leaves the workflow on hold. Preserve the failure receipt and name the unresolved condition. Do not replace missing evidence with activity counts.

## Recovery checkpoint

Recovery requires a successful retry with the same operation identity and a ledger check for duplicates. A timeout leaves the outcome uncertain until inspected.

