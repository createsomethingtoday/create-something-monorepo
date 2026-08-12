# Agent Commercial Infrastructure Production Rollback

Status: active fail-closed runbook. Charging and settlement are disabled.

## Fixed controls

- `charging`: `disabled`
- paid requests per minute: `0`
- maximum per-request spend: `$0`
- maximum daily spend: `$0`
- automatic payment retry: `false`

These controls may change only through a separate, explicit production approval
that also approves the price and public copy. The Managed AI Operations monthly
price is not an agent-audit per-call price.

## Rollback triggers

Rollback the Worker if readiness reports an unexpected charging state, if the
D1 binding or receipt schema is unavailable after deployment, if a public write
route appears, or if the deployed contract differs from the reviewed artifact.

## Procedure

1. Use the Cloudflare deployment history for `create-something-database-layer`
   to restore the previous known-good Worker version.
2. Do not delete the D1 database or its additive receipt table during Worker
   rollback. Preserving receipts is part of the commercial contract.
3. Verify the readiness route no longer exposes the failed version, and verify
   existing database-layer read-only routes remain healthy.
4. Keep the x402 adapter, paid capability, and settlement path inactive until a
   new reviewed promotion is explicitly approved.

## Successful state

The readiness route reports `charging: disabled`, all paid caps remain zero,
price remains unset, x402 remains `approval_required`, and no unauthenticated
receipt-write endpoint exists.
