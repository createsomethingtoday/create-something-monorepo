# Outcome Contract

**Status:** Draft  
**Client:** `CLIENT_NAME`  
**Workflow:** `PRIMARY_WORKFLOW_NAME`  
**Date:** `YYYY-MM-DD`

---

## 1. Pilot scope

### In scope

- `SPECIFIC_WORKFLOW_START`
- `PRIMARY_AUTOMATION_OR_ASSISTIVE_PATH`
- `APPROVAL OR HUMAN GATE STEP`
- `SPECIFIC_WORKFLOW_END`

### Out of scope

- `OUT_OF_SCOPE_ITEM`
- `OUT_OF_SCOPE_ITEM`

---

## 2. Business objective

The purpose of this pilot is to:

- reduce `CURRENT_FAILURE_PATTERN`
- improve `SPEED|ACCURACY|GOVERNANCE`
- establish a production-safe path for `TARGET_WORKFLOW`

Target outcome in 30 days:

- `MEASURABLE_RESULT`

---

## 3. Success criteria

The pilot is successful if:

- risky actions are not executed without the required approval
- the workflow owner accepts the new workflow path
- manual cleanup is reduced by `TARGET_AMOUNT`
- required audit fields are visible for key actions
- golden-task checks pass at the agreed threshold

Primary KPI:

- `PRIMARY_RELIABILITY_KPI`

Secondary KPIs:

- `SECONDARY_KPI`
- `SECONDARY_KPI`

---

## 4. Workflow boundary

### Systems in scope

- `SYSTEM_NAME`
- `SYSTEM_NAME`

### Trust boundary

- `WHAT CAN BE AUTO-ALLOWED`
- `WHAT REQUIRES APPROVAL`
- `WHAT MUST BE BLOCKED`

### Ownership boundary

- workflow owner: `ROLE_OR_NAME`
- technical owner: `ROLE_OR_NAME`
- approval owner: `ROLE_OR_NAME`

---

## 5. Fallback and manual path

If the governed workflow cannot complete safely:

1. `STOP_CONDITION`
2. `MANUAL_HANDOFF_STEP`
3. `OWNER_COMPLETES_REMAINING_WORK`
4. `AUDIT_NOTE_OR_EXCEPTION_LOG`

Fallback is considered acceptable if:

- `FALLBACK_SUCCESS_CONDITION`

---

## 6. Delivery artifacts

This pilot produces:

- `mcp_contract.yaml`
- `agent_contract.yaml`
- `outcome_contract.md`
- golden-task checks
- runbook

If observability is included, it may also include Braintrust tracing and eval coverage.

---

## 7. Release gates

The workflow does not move to production until:

- pilot workflow scope is approved
- policy boundary is approved
- golden-task checks pass
- manual fallback is rehearsed
- required stakeholders sign off

---

## 8. Risks and assumptions

### Risks

- `RISK_ITEM`
- `RISK_ITEM`

### Assumptions

- `ASSUMPTION_ITEM`
- `ASSUMPTION_ITEM`

---

## 9. Decision record

### Approved next step

- `NEXT_STEP`

### Decision owner

- `ROLE_OR_NAME`

### Target date

- `YYYY-MM-DD`
