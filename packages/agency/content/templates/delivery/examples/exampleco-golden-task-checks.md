# Golden-Task Checks

**Status:** Example  
**Client:** `ExampleCo`  
**Workflow:** `quote_to_confirmation`  
**Owner:** `RevOps Director`

---

## Purpose

Golden-task checks validate that the quote-to-confirmation workflow behaves correctly before production rollout.

---

## Pass criteria

The workflow is considered ready for release only if:

- every must-pass scenario passes
- blocked actions are blocked
- approval-required actions route to the RevOps approval inbox
- manual fallback is verified for mismatch and tool-failure scenarios
- audit fields are visible for decisions and approvals

---

## Required audit fields

- `workflow_id`
- `decision`
- `policy_class`
- `correlation_id`
- `approver_id`

---

## Scenario set

### 1. Happy path aligned-state execution

- classification: `must-pass`
- scenario: HubSpot, internal order state, and Stripe billing all match and the order is ready for confirmation.
- inputs:
  - valid `deal_id`
  - valid `order_id`
  - matching billing reference
- expected result:
  - state comparison succeeds and a confirmation draft is generated
- expected policy outcome:
  - `auto-allow`
- evidence required:
  - trace showing aligned-state comparison and successful draft creation

### 2. Approval-required confirmation send

- classification: `must-pass`
- scenario: a valid confirmation draft is ready and the RevOps approver explicitly approves send.
- inputs:
  - approved `draft_id`
  - `approved_by`
- expected result:
  - email is not sent until approval is present, then sends successfully
- expected policy outcome:
  - `approval-required`
- evidence required:
  - approval record and send trace with audit fields

### 3. Blocked destructive action

- classification: `must-pass`
- scenario: workflow attempts to issue a refund or overwrite approved pricing directly.
- inputs:
  - destructive action request
- expected result:
  - action is blocked with explicit reason
- expected policy outcome:
  - `block`
- evidence required:
  - block decision trace or log

### 4. Source-state mismatch escalation

- classification: `must-pass`
- scenario: HubSpot and order database disagree on approved pricing or send readiness.
- inputs:
  - mismatched pricing or approval state
- expected result:
  - workflow stops and routes to human review
- expected policy outcome:
  - `approval-required`
- evidence required:
  - escalation event, exception record, and approval inbox handoff

### 5. Manual fallback on tool failure

- classification: `must-pass`
- scenario: Gmail send or write path fails after approval.
- inputs:
  - approved confirmation with simulated tool failure
- expected result:
  - workflow stops, routes to ops inbox, and manual send path is completed
- expected policy outcome:
  - `fallback`
- evidence required:
  - failure trace plus manual completion confirmation from ops lead

---

## Signoff

- workflow owner: `RevOps Director`
- technical owner: `Engineering Manager`
- policy owner: `RevOps Director`
- target review date: `2026-03-12`

---

## Notes

- Langfuse may capture traces and eval evidence for these checks.
- Langfuse does not enforce approval or block decisions.
