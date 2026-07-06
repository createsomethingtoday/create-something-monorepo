# Golden-Task Checks

**Status:** Draft  
**Client:** `CLIENT_NAME`  
**Workflow:** `PRIMARY_WORKFLOW_NAME`  
**Owner:** `ROLE_OR_NAME`

---

## Purpose

Golden-task checks validate that the governed workflow behaves correctly on a small set of representative scenarios before production rollout.

Use this document to define:

- the critical workflow scenarios that must pass
- the expected policy outcome for each scenario
- the required evidence for signoff

---

## Pass criteria

The workflow is considered ready for release only if:

- every `must-pass` scenario passes
- blocked actions are actually blocked
- approval-required actions route to the correct human gate
- fallback/manual path is verified for failure scenarios
- required audit fields are present in traces or logs

---

## Required audit fields

- `workflow_id`
- `decision`
- `policy_class`
- `correlation_id`
- `approver_id` if approval was required

---

## Scenario set

### 1. Happy path aligned-state execution

- classification: `must-pass`
- scenario: `DESCRIBE THE NORMAL LOW-RISK WORKFLOW`
- inputs:
  - `REQUIRED_INPUT`
- expected result:
  - `AUTO-ALLOW ACTION EXECUTES CORRECTLY`
- expected policy outcome:
  - `auto-allow`
- evidence required:
  - `TRACE OR LOG SHOWING SUCCESS`

### 2. Approval-required action routing

- classification: `must-pass`
- scenario: `DESCRIBE A WRITE OR SEND ACTION THAT MUST GO TO REVIEW`
- inputs:
  - `REQUIRED_INPUT`
- expected result:
  - `ACTION DOES NOT EXECUTE UNTIL APPROVED`
- expected policy outcome:
  - `approval-required`
- evidence required:
  - `APPROVAL EVENT AND FINAL EXECUTION TRACE`

### 3. Blocked destructive or out-of-scope action

- classification: `must-pass`
- scenario: `DESCRIBE A PROHIBITED ACTION`
- inputs:
  - `REQUIRED_INPUT`
- expected result:
  - `ACTION IS BLOCKED WITH EXPLICIT REASON`
- expected policy outcome:
  - `block`
- evidence required:
  - `BLOCK TRACE OR LOG`

### 4. Source-state mismatch or ambiguity

- classification: `must-pass`
- scenario: `DESCRIBE A MISMATCH, MISSING CONTEXT, OR POLICY AMBIGUITY CASE`
- inputs:
  - `REQUIRED_INPUT`
- expected result:
  - `WORKFLOW STOPS AND ESCALATES TO HUMAN REVIEW`
- expected policy outcome:
  - `approval-required` or `block`
- evidence required:
  - `ESCALATION EVENT AND MANUAL HANDOFF RECORD`

### 5. Manual fallback execution

- classification: `must-pass`
- scenario: `DESCRIBE A TOOL FAILURE OR UNAVAILABLE SYSTEM CASE`
- inputs:
  - `REQUIRED_INPUT`
- expected result:
  - `MANUAL FALLBACK PATH IS USED WITHOUT LOSING CONTROL`
- expected policy outcome:
  - `fallback`
- evidence required:
  - `RUNBOOK STEP EXECUTED AND OWNER CONFIRMATION`

---

## Signoff

- workflow owner: `ROLE_OR_NAME`
- technical owner: `ROLE_OR_NAME`
- policy owner: `ROLE_OR_NAME`
- target review date: `YYYY-MM-DD`

---

## Notes

- Langfuse may be used to capture traces and eval results for these checks.
- Langfuse is evidence infrastructure, not the mechanism that enforces the policy decision.
