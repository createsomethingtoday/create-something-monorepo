# Workflow Runbook

**Status:** Example  
**Client:** `ExampleCo`  
**Workflow:** `quote_to_confirmation`  
**Primary owner:** `RevOps Director`

---

## 1. Purpose

This runbook defines how ExampleCo operators monitor, approve, and recover the quote-to-confirmation workflow safely.

---

## 2. Workflow summary

- business objective: reduce manual reconciliation and prevent incorrect quote confirmations from being sent
- workflow boundary: starts when a quote is ready for confirmation and ends when an approved confirmation is sent and recorded
- systems in scope:
  - `HubSpot`
  - `Internal Order Database`
  - `Stripe`
  - `Gmail`
- policy boundary:
  - auto-allow: source-state comparison and draft generation
  - approval-required: pricing exception creation and confirmation send
  - block: refunds, destructive record changes, or pricing overwrite without review

---

## 3. Roles

- workflow owner: `RevOps Director`
- technical owner: `Engineering Manager`
- approval owner: `RevOps Director`
- fallback owner: `Ops lead`

---

## 4. Normal operating procedure

### Auto-allow path

1. quote is marked ready for confirmation
2. system compares HubSpot, internal order data, and Stripe billing state
3. if aligned, confirmation draft is generated
4. audit event is written

### Approval-required path

1. risky action is prepared
2. action is routed to the RevOps shared approval inbox
3. approver reviews state comparison and draft
4. confirmation send executes only after approval
5. audit event is written

### Block path

1. prohibited action is requested or inferred
2. action is blocked with explicit reason
3. operator reviews whether manual alternative is needed

---

## 5. Exception handling

### Source-state mismatch

- signal: HubSpot, order database, or Stripe disagree on required state
- operator action:
  1. stop workflow execution
  2. review internal order database as source of truth
  3. correct mismatch or create pricing exception
- exit condition: state is aligned or manual path is complete

### Approval backlog

- signal: approvals remain pending past the agreed turnaround window
- operator action:
  1. alert RevOps Director
  2. review queue and assign backup approver if needed
  3. prioritize customer-impacting confirmations
- exit condition: queue returns to target turnaround

### Tool or auth failure

- signal: Gmail send fails or a required auth scope is unavailable
- operator action:
  1. determine whether the issue is transient
  2. retry only if policy allows and no customer-facing duplication risk exists
  3. route to manual send path if safe execution cannot be guaranteed
- exit condition: send completes safely or manual fallback completes

---

## 6. Manual fallback

When the workflow cannot proceed safely:

1. stop the automated path
2. create or update the exception record
3. hand off to ops lead through shared inbox
4. complete source correction and customer communication manually
5. record the resolution for audit review

Fallback success condition:

- no incorrect confirmation is sent and the customer receives the correct approved communication

---

## 7. Rollback and containment

Use rollback or containment when:

- blocked actions are not being blocked
- approval-required actions execute without approval
- audit fields are missing
- cross-system drift creates unsafe outputs

Immediate containment options:

1. disable production send path
2. switch workflow to draft-only mode
3. route all sends to manual approval
4. stop the workflow entirely

Recovery steps:

1. identify root cause
2. confirm safe state across systems
3. reconcile affected records if necessary
4. rerun golden-task checks before re-enable

---

## 8. Observability and evidence

Required evidence sources:

- workflow logs
- approval inbox records
- Langfuse traces and evals if enabled
- incident notes

Required review cadence:

- daily during pilot
- weekly after stabilization unless incident rate increases

---

## 9. Escalation matrix

- policy ambiguity: `RevOps Director`
- technical failure: `Engineering Manager`
- workflow exception: `Ops lead`
- customer-impacting incident: `Jordan Lee`

---

## 10. Change management

Any change to the workflow must update:

- `mcp_contract.yaml`
- `agent_contract.yaml`
- `outcome_contract.md`
- golden-task checks
- this runbook

No production change is complete until the documentation and gates are updated together.
