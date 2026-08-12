# Agent Commercial Contract v1

Status: active contract; payment activation remains approval-gated.

Schema identifier: `create-something.agent-commercial.v1`

## Purpose

This contract is the commercial policy layer over CREATE SOMETHING's agent-facing
infrastructure. It gives MCP, HTTP, and internal callers one provider-neutral
decision surface:

`evaluate(capability, principal, entitlement, payment, approval) -> allow | deny | payment_required | approval_required`

Runtime adapters use the receipt-bearing interface before execution:

`authorize(contract, request, decision identity, receipt store) -> decision + committed receipt`

Cloudflare Workers, Identity, D1, and x402 are adapters behind that interface.
They do not own the commercial policy. PostgreSQL is not required by this
contract.

The evaluator accepts normalized facts from trusted adapters. Raw agent input
must never be allowed to self-assert authentication, an entitlement, a verified
payment, a private grant, or an approval receipt.

The existing Managed AI Operations contract remains authoritative for service
pricing, billing units, usage review, and checkout. This contract classifies
individual machine-facing capabilities beneath that offer.

## Access classes

| Class      | Meaning                                                                                   |
| ---------- | ----------------------------------------------------------------------------------------- |
| `free`     | Public, read-only discovery or education.                                                 |
| `entitled` | Included in an active client or product entitlement; no per-call charge is implied.       |
| `paid`     | A separately priced bounded result requiring a verified payment receipt before execution. |
| `private`  | Explicitly authorized client/operator access. Payment can never grant private access.     |

Uncataloged capabilities fail closed. Every decision requires a receipt,
including denials and payment requirements.

## Tier ownership

| Tier       | Ownership                                                                                |
| ---------- | ---------------------------------------------------------------------------------------- |
| Database   | Catalog, provenance, freshness, entitlements, payment and approval references, receipts. |
| Automation | Pure evaluator plus runtime, identity, entitlement, payment, and receipt adapters.       |
| Judgment   | Classification, price approval, production promotion, exceptions, and rollback.          |

## Cloudflare boundary

- Workers and Agents run the tool or resource.
- CREATE SOMETHING Identity identifies the principal.
- D1 supplies entitlements and stores governed receipts.
- x402 may satisfy a `paid` policy only after its price and production activation are approved.
- Payment never bypasses entitlement, private grant, side-effect approval, or status checks.

The current x402 adapter and agent-readiness audit are intentionally inactive.
Activating them requires the requirements recorded in the payment policy plus a
normal production promotion path.

## Files

- `schema.json` — closed JSON Schema for the contract.
- `authorization-receipt.schema.json` — closed schema for committed allow and block receipts.
- `create-something.json` — canonical CREATE SOMETHING capability catalog.
- `scripts/verify-agent-commercial-contract.mjs` — schema and semantic verifier.
- `src/agent-commercial-contract.ts` — provider-neutral decision and receipt-bearing authorization functions.

`authorizeAgentCommercialAccess` requires a store adapter with an atomic `commit`
operation. A retry with identical facts replays the existing receipt. Reusing a
decision ID for different facts throws `AgentCommercialReceiptConflictError`.
Provider execution starts only after an `allow` decision and a committed receipt.
The contract does not activate x402 or a production D1 sink.

Run:

```bash
pnpm --filter @create-something/database-layer agent-commercial:contract:check
```
