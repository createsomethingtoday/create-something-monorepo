# Zendesk reviewer mutation receipt

Use this structure after every R1 or R2 attempt. Keep credentials, private customer data not needed for the task, and hidden internal reasoning out of the receipt.

```text
Webflow Zendesk Reviewer receipt

Request:
Approval basis:
Policy: policy.webflow-zendesk-reviewer.v1 / 1.0.0
Risk class: R1 | R2

Target:
- Ticket ID:
- Requester or organization, only when needed:

Before state:
- Observed at:
- Ticket status and tags:
- Comments consulted:
- App Review evidence, when applicable:

Attempt:
- MCP tool:
- Visibility: private_internal_note | public_reply | none
- Non-secret parameters:
- Attempted at:

Result:
- draft only | attempted | MCP-confirmed | partial | failed
- Provider response:

Readback:
- Comment ID and visibility:
- Ticket status and tags:
- Contradictions or unverified state:

Gaps:
- Missing evidence or permissions:

Rollback:
- Compensating action:
- Owner or evidence:
```

Never call a draft sent, an attempted mutation confirmed, or a successful tool response complete without the matching ticket/comment readback.
