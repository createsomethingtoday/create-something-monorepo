# Workflow Runbook

**Status:** Draft  
**Client:** `CLIENT_NAME`  
**Workflow:** `PRIMARY_WORKFLOW_NAME`  
**Primary owner:** `ROLE_OR_NAME`  
**Package:** `Policy OS`

---

## 1. Policy OS metadata

- approved workflows:
  - `WORKFLOW_NAME`
- approval mode: `none|human-in-the-loop|hybrid`
- escalation policy: `POLICY_ID_OR_RUNBOOK_SECTION`
- review cadence: `weekly review + monthly tuning`
- billing and entitlement assumptions:
  - service tier: `mcp_only|policy_os_trial|policy_os_core`
  - monthly recurring revenue: `AMOUNT`
  - gross margin floor percent: `70`
  - owner compensation fit: `fits|watch|does_not_fit`
  - service entitled: `true|false`
  - policy accepted: `true|false`
  - contract active: `true|false`
  - billing active: `true|false`
- operator-load budget:
  - max live review meetings per month: `1`
  - async review frequency: `weekly`
  - covered workflow count: `1`
  - covered downstream systems: `3`
  - monthly policy tuning limit: `LIMIT`
  - expansion triggers: `new workflow`, `extra downstream system`, `custom UI`, `higher meeting cadence`

## 2. Purpose

This runbook defines how operators monitor, intervene in, and recover the workflow safely.

Use it for:

- approval handling
- exception response
- blocked-action review
- fallback/manual execution
- rollback and containment

## 3. Workflow summary

- business objective: `BUSINESS_OBJECTIVE`
- workflow boundary: `START TO END OF THE PILOT WORKFLOW`
- systems in scope:
  - `SYSTEM_NAME`
  - `SYSTEM_NAME`
- policy boundary:
  - auto-allow: `LOW-RISK ACTIONS`
  - approval-required: `RISKY ACTIONS`
  - block: `DISALLOWED ACTIONS`

## 4. Roles

- workflow owner: `ROLE_OR_NAME`
- technical owner: `ROLE_OR_NAME`
- approval owner: `ROLE_OR_NAME`
- fallback owner: `ROLE_OR_NAME`

## 5. Normal operating procedure

### Auto-allow path

1. `LOW-RISK ACTION IS TRIGGERED`
2. `SYSTEM VALIDATES INPUTS`
3. `ACTION EXECUTES`
4. `AUDIT EVENT IS WRITTEN`

### Approval-required path

1. `RISKY ACTION IS PREPARED`
2. `ACTION IS ROUTED TO APPROVAL INBOX`
3. `APPROVER REVIEWS CONTEXT`
4. `ACTION EXECUTES ONLY AFTER APPROVAL`
5. `AUDIT EVENT IS WRITTEN`

### Block path

1. `DISALLOWED ACTION IS DETECTED`
2. `ACTION IS BLOCKED`
3. `REASON IS RETURNED`
4. `OPERATOR REVIEWS WHETHER MANUAL ALTERNATIVE IS NEEDED`

## 6. Exception handling

### Source-state mismatch

- signal: `SYSTEMS DO NOT AGREE ON REQUIRED STATE`
- operator action:
  1. stop workflow execution
  2. review source-of-truth system
  3. correct mismatch or route to fallback
- exit condition: `SOURCE STATE IS ALIGNED OR MANUAL PATH IS COMPLETE`

### Approval backlog

- signal: `ACTIONS WAITING TOO LONG FOR HUMAN REVIEW`
- operator action:
  1. alert approval owner
  2. review queue health
  3. reroute or reprioritize approvals
- exit condition: `QUEUE RETURNS TO ACCEPTABLE TURNAROUND`

### Tool or auth failure

- signal: `TOOL CALL FAILS OR ACCESS EXPIRES`
- operator action:
  1. confirm whether failure is transient or configuration-related
  2. retry only if policy allows
  3. switch to fallback/manual path if risk boundary would be crossed
- exit condition: `ACTION COMPLETES SAFELY OR MANUAL PATH COMPLETES`

## 7. Manual fallback

When the workflow cannot proceed safely:

1. `STOP THE AUTOMATED PATH`
2. `OPEN OR UPDATE THE EXCEPTION RECORD`
3. `HAND OFF TO FALLBACK OWNER`
4. `COMPLETE THE TASK MANUALLY`
5. `RECORD THE RESOLUTION`

Fallback success condition:

- `WORKFLOW OUTCOME IS COMPLETED WITHOUT BREACHING POLICY BOUNDARY`

## 8. Rollback and containment

Use rollback or containment when:

- blocked actions are not being blocked
- approval-required actions execute without approval
- audit fields are missing
- system drift creates unsafe outputs

Immediate containment options:

1. disable production write paths
2. switch workflow to read-only mode
3. route all actions to manual approval
4. stop the workflow entirely

Recovery steps:

1. identify root cause
2. confirm safe state
3. replay or reconcile affected records if required
4. rerun golden-task checks before re-enable

## 9. Observability and evidence

Required evidence sources:

- workflow logs
- approval inbox records
- trace/eval tooling such as Braintrust
- incident notes

Required review cadence:

- daily during pilot
- weekly after stabilization, unless risk profile requires more
- monthly tuning review for ongoing Policy OS engagements

## 10. Escalation matrix

- policy ambiguity: `POLICY_OWNER`
- technical failure: `TECHNICAL_OWNER`
- workflow exception: `WORKFLOW_OWNER`
- customer-impacting incident: `DECISION_OWNER`

## 11. Change management

Any change to the workflow must update:

- `mcp_contract.yaml`
- `agent_contract.yaml`
- `outcome_contract.md`
- `golden_tasks.yaml`
- this runbook

No production change is complete until the documentation and gates are updated together.
