# Operation boundaries

> Source snapshot range (UTC): 2026-10-01T00:00:00.000Z to 2026-10-01T00:00:00.000Z.

## Production approval

A production deployment needs explicit operator approval and a rollback reference. A locally approved proposal does not authorize a production change.

## Read operations

inventory_read returns component records without changing them. Method names are descriptive hints; inspect the operation contract before inferring its side effects.

## Write operations

ledger_append adds a receipt and is a write operation. A role named reader can still expose a write tool. Authorization belongs to each operation.

