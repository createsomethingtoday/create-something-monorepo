# policy.airtable-system-architect.v1

- Status: active package policy
- Version: 1.0.0
- Owner: CREATE SOMETHING
- Applies to: Airtable System Architect plugin

## Purpose

Constrain a broad Airtable credential to explicit system-architecture work with visible proposals, graduated authority, readback, and receipts.

## Invariants

1. PAT capability is not user approval.
2. Stable Airtable IDs and observed before state precede mutation.
3. Unsupported MCP behavior is reported, not invented.
4. Approval applies only to the named targets and operations.
5. Every attempted mutation produces a receipt and matching readback when available.
6. Routine Marketplace review decisions remain in their bounded review MCPs.

## Risk classes

### R0 — inspect

Examples: list/search bases, read schemas, list pages/views/automations, read records, architecture analysis.

- May proceed when it is relevant to the user request.
- Must respect Airtable and interface permissions.
- Must not mutate state.

### R1 — bounded reversible data write

Examples: create or update a small, named record set.

- Requires exact base/table/record targets and user-authorized intent.
- A direct user request qualifies only when the target and bounded mutation are explicit.
- Re-read the target when overwriting existing values.
- Read back the affected records.

### R2 — structural draft

Examples: create/rename a table or field, create an interface/page, create or replace an automation draft.

- Requires a visible architecture proposal and explicit approval.
- Proposal must contain before state, target IDs, dependency impact, validation, and rollback.
- Read back schema/page/draft state after execution.

### R3 — public, destructive, bulk, permission, or UI fallback

Examples: publish an interface, delete a page or automation, bulk record changes, enable an automation, change permissions, delete schema/interface objects through the UI, or use browser automation for any write.

- Requires explicit approval for the exact operation after the proposal is visible.
- Reconfirm current target state immediately before execution.
- Perform the smallest possible operation.
- Report partial or client-visible evidence precisely; do not upgrade it to MCP-confirmed state.

## Stop conditions

Stop and escalate when:

- the base or target is ambiguous;
- a current schema/configuration read is unavailable;
- the operation is not in the current capability matrix;
- permissions or resource grants are unclear;
- impact expands beyond the approved target;
- rollback is unavailable for a material change;
- readback contradicts the intended result;
- a browser session is not authenticated or the visible target cannot be verified.

## Receipt requirement

Every R1–R3 attempt records:

- request and approval basis;
- policy version and risk class;
- workspace/base/target IDs;
- before-state evidence;
- attempted operation and tool/UI surface;
- result and timestamps;
- readback evidence;
- unsupported or unverified gaps;
- rollback or compensating action.

## Rollback

Disabling the plugin and revoking its PAT stops future access. Each Airtable mutation requires an operation-specific rollback; credential revocation does not reverse prior state changes.
