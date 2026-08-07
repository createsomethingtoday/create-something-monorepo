# Mutation receipt template

Use this structure after every R1–R3 attempt. Keep secrets and sensitive record values out of the receipt unless the user explicitly needs them and the destination is appropriate.

```text
Airtable System Architect receipt

Request:
Approval basis:
Policy: policy.airtable-system-architect.v1 / 1.0.0
Risk class: R1 | R2 | R3

Targets:
- Workspace ID:
- Base ID:
- Table/field/interface/page/automation/record IDs:

Before state:
- Observed at:
- Evidence:

Attempt:
- MCP tool or browser surface:
- Parameters, excluding credentials and unnecessary sensitive values:
- Attempted at:

Result:
- requested | attempted | confirmed | partial | failed
- Provider response or visible client result:

Readback:
- MCP-confirmed state:
- Browser-visible state:
- Unverified client action:

Gaps:
- Unsupported operations:
- Unverified claims:

Rollback:
- Compensating action:
- Rollback evidence or owner:
```

## Evidence language

- **MCP-confirmed:** the official server returned the changed object and a follow-up read matches.
- **Browser-visible:** the authenticated Airtable UI visibly shows the state after the action.
- **Client action snapshot:** a click or submission occurred, but authoritative state was not read back.
- **Attempted:** the action was invoked without sufficient outcome evidence.

Never collapse those proof levels into “done.”
