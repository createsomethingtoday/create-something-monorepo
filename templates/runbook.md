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
  - service entitled: `true|false`
  - policy accepted: `true|false`
  - contract active: `true|false`
  - billing active: `true|false`

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
  - auto-allow: `LOW_RISK_ACTIONS`
  - approval-required: `RISKY_ACTIONS`
  - block: `DISALLOWED_ACTIONS`

## 4. Roles

- workflow owner: `ROLE_OR_NAME`
- technical owner: `ROLE_OR_NAME`
- approval owner: `ROLE_OR_NAME`
- fallback owner: `ROLE_OR_NAME`

## 5. Normal operating procedure

### Auto-allow path

1. `LOW_RISK_ACTION_IS_TRIGGERED`
2. `SYSTEM_VALIDATES_INPUTS`
3. `ACTION_EXECUTES`
4. `AUDIT_EVENT_IS_WRITTEN`

### Approval-required path

1. `RISKY_ACTION_IS_PREPARED`
2. `ACTION_IS_ROUTED_TO_APPROVAL_INBOX`
3. `APPROVER_REVIEWS_CONTEXT`
4. `ACTION_EXECUTES_ONLY_AFTER_APPROVAL`
5. `AUDIT_EVENT_IS_WRITTEN`

### Block path

1. `DISALLOWED_ACTION_IS_DETECTED`
2. `ACTION_IS_BLOCKED`
3. `REASON_IS_RETURNED`
4. `OPERATOR_REVIEWS_WHETHER_MANUAL_ALTERNATIVE_IS_NEEDED`

## 6. Exception handling

### Source-state mismatch

- signal: `SYSTEMS_DO_NOT_AGREE_ON_REQUIRED_STATE`
- operator action:
  1. stop workflow execution
  2. review source-of-truth system
  3. correct mismatch or route to fallback
- exit condition: `SOURCE_STATE_IS_ALIGNED_OR_MANUAL_PATH_IS_COMPLETE`

### Approval backlog

- signal: `ACTIONS_WAITING_TOO_LONG_FOR_HUMAN_REVIEW`
- operator action:
  1. alert approval owner
  2. review queue health
  3. reroute or reprioritize approvals
- exit condition: `QUEUE_RETURNS_TO_ACCEPTABLE_TURNAROUND`

### Tool or auth failure

- signal: `TOOL_CALL_FAILS_OR_ACCESS_EXPIRES`
- operator action:
  1. confirm whether failure is transient or configuration-related
  2. retry only if policy allows
  3. switch to fallback/manual path if risk boundary would be crossed
- exit condition: `ACTION_COMPLETES_SAFELY_OR_MANUAL_PATH_COMPLETES`

## 7. Manual fallback

When the workflow cannot proceed safely:

1. `STOP_THE_AUTOMATED_PATH`
2. `OPEN_OR_UPDATE_THE_EXCEPTION_RECORD`
3. `HAND_OFF_TO_FALLBACK_OWNER`
4. `COMPLETE_THE_TASK_MANUALLY`
5. `RECORD_THE_RESOLUTION`

Fallback success condition:

- `WORKFLOW_OUTCOME_IS_COMPLETED_WITHOUT_BREACHING_POLICY_BOUNDARY`

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
