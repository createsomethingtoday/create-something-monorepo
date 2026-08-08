# policy.webflow-zendesk-reviewer.v1

- Status: active package policy
- Version: 1.0.0
- Owner: CREATE SOMETHING
- Applies to: Webflow Zendesk Reviewer personal Codex plugin

## Purpose

Keep Webflow Marketplace support work grounded in current Zendesk evidence while preventing a transport credential or tool confirmation flag from becoming ambient authority to contact requesters or change ticket state.

## Invariants

1. MCP capability is not user approval.
2. Read the exact ticket and current comments before any mutation.
3. Zendesk ticket state does not replace Airtable-backed App Review state.
4. Approval applies only to the named ticket and operation.
5. Every attempted mutation requires readback and a receipt.
6. Missing evidence produces a stop or draft, not an invented commitment.
7. A connectivity test must remain read-only.

## Risk classes

### R0 — inspect and draft

Examples: health check, ticket search/read, comment history, requester/view lookup, cross-system reconciliation, and drafting a reply without sending it.

- May proceed when relevant to the user's request.
- Must not mutate Zendesk or another external system.
- Drafts must be labeled unsent.

### R1 — private internal note

- Requires an exact ticket ID, current ticket/comment readback, a bounded note body, and explicit user authorization to add that private note.
- Use `visibility: private_internal_note` and `confirm_ticket_update: true`.
- Read back the ticket comments and record the new comment ID and visibility.

### R2 — requester-visible or workflow-state mutation

Examples: public reply, status change, tag change, or a compound update.

- Requires the exact ticket, proposed content or state change, current Zendesk evidence, affected App Review evidence when relevant, and explicit user approval for that operation.
- Public replies require both `confirm_ticket_update: true` and `confirm_public_reply: true`.
- Status/tag changes require `confirm_status_update: true`.
- Read back ticket status, tags, and the resulting comment when applicable.

## Stop conditions

Stop and escalate when:

- the ticket or requester is ambiguous;
- the current ticket or comments cannot be read;
- the user asked only for review, diagnosis, drafting, or reporting;
- a claim depends on App Review state that has not been freshly checked;
- permissions, visibility, or transport authentication are unclear;
- the proposed response promises approval, publication, security outcomes, or timing without authoritative evidence;
- the requested operation expands beyond the approved ticket or mutation;
- post-write readback is unavailable or contradicts the intended result.

## Evidence and receipts

Every R1 or R2 attempt records the request, approval basis, policy version, risk class, ticket ID, before state, current comments consulted, App Review evidence when applicable, tool and non-secret parameters, result, readback, visibility, status/tag changes, gaps, and rollback or compensating action.

Use these proof levels precisely:

- **MCP-confirmed:** the write tool returned success and a follow-up Zendesk read matches.
- **Attempted:** the write was invoked but authoritative readback is missing.
- **Draft only:** content was prepared and never sent.

Do not collapse attempted or draft-only work into complete.

## Rollback

Plugin removal and token revocation stop future access but do not reverse ticket updates. A private note generally cannot be made unseen; a public reply may require a correcting reply; status and tags require an explicitly approved compensating update. Record the appropriate rollback before each R1 or R2 mutation.
