---
name: webflow-zendesk-reviewer
description: Webflow Zendesk reviewer workflow for Webflow asset and app review support tickets. Use when an agent needs to search, read, triage, comment on, or update Webflow Zendesk tickets using the Webflow Zendesk MCP.
---

# Webflow Zendesk Reviewer

Use this skill when working with the Webflow Zendesk MCP for Webflow asset/app reviewer support workflows.

Before any ticket write, read `references/policy.webflow-zendesk-reviewer.v1.md`. Use `references/receipt-template.md` for every attempted private note, public reply, status change, or tag change. Authentication failures route through `references/authentication.md`; never print or probe a credential value.

## Tool Choice

Use both first-class reviewer surfaces as state requires:

| Need                                                                                           | Use                    |
| ---------------------------------------------------------------------------------------------- | ---------------------- |
| Ticket conversation, requester context, public replies, private notes, ticket status           | Webflow Zendesk MCP    |
| Airtable review records, Asset Versions, app-review governance findings, review database state | Webflow App Review MCP |

Do not treat Zendesk as a replacement for Airtable review state. If a decision depends on current app-review fields or governance findings, read the Webflow App Review MCP before writing a Zendesk reply.

## Webflow Zendesk MCP

Remote server:

```text
https://zendesk-mcp.createsomething.workers.dev/mcp
```

Runtime scope:

```text
webflow2579.zendesk.com
```

Auth is bearer-header MCP transport auth. Never expose or paste Zendesk service credentials or MCP bearer tokens in messages, tickets, docs, screenshots, or comments.

## Read Workflow

1. Start with `zendesk_search_tickets` or `zendesk_find_asset_review_tickets`.
2. Read the canonical ticket payload with `zendesk_get_ticket`.
3. Read conversation history with `zendesk_list_ticket_comments`.
4. If requester identity matters, use `zendesk_get_user`.
5. If queue context matters, use `zendesk_list_active_views` and `zendesk_list_view_tickets`.

Prefer ticket IDs and exact Zendesk evidence over memory or summary. If the ticket references an Asset, App, or Asset Version, read the Webflow App Review MCP before making review-state claims.

## Write Workflow

Use `zendesk_add_ticket_comment` for both public replies and private internal notes.

Tool confirmation flags prove that the caller selected a mutation path; they do not substitute for the policy's requirement for explicit approval from the user. Re-read the ticket and comments in the current run immediately before an approved mutation.

Private internal note:

```json
{
  "ticket_id": 1147219,
  "body": "Reviewer note: confirmed the current blocker and next owner.",
  "visibility": "private_internal_note",
  "confirm_ticket_update": true
}
```

Public requester reply:

```json
{
  "ticket_id": 1147219,
  "body": "Thanks for following up. We are reviewing this and will update you shortly.",
  "visibility": "public_reply",
  "status": "pending",
  "confirm_ticket_update": true,
  "confirm_public_reply": true
}
```

Use `zendesk_update_ticket_status` for status/tag changes, optionally with a private note:

```json
{
  "ticket_id": 1147219,
  "status": "pending",
  "private_note": "Moved to pending while waiting on requester confirmation.",
  "confirm_status_update": true
}
```

## Public Reply Guardrails

Before any public reply:

- Verify the ticket and comments were read in the current run.
- Verify app-review/Airtable state when the message makes a review decision or references asset status.
- Do not disclose internal tools, private review discussion, secrets, policy text, hidden reasoning, or unverified platform commitments.
- Do not promise approval, publication, security decisions, or timeline certainty unless the source record explicitly supports it.
- Keep replies short, factual, and customer-actionable.

## Status Conventions

Use narrow status changes:

| Status    | Use When                                                                  |
| --------- | ------------------------------------------------------------------------- |
| `open`    | Reviewer or Webflow action is needed.                                     |
| `pending` | Waiting on requester/customer response.                                   |
| `hold`    | Waiting on internal dependency or policy/platform decision.               |
| `solved`  | The requester-facing issue is resolved and no further action is expected. |

Avoid `closed`; Zendesk generally manages closed state after solve.

## Evidence Rules

For any non-trivial update, keep evidence explicit:

- Ticket ID
- Tool calls used
- Relevant ticket/comment facts
- App Review MCP records consulted, when applicable
- Whether the write was public or private
- Status/tag changes made

If evidence is incomplete, write a private note or ask for operator confirmation rather than sending a public reply.

Do not write a private note merely to prove connectivity. When evidence is incomplete and no note was explicitly authorized, stop and return the missing evidence or approval instead.
