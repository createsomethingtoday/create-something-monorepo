# Outcome Contract

**Status:** Example  
**Client:** `ExampleCo`  
**Workflow:** `quote_to_confirmation`  
**Date:** `2026-03-07`

---

## 1. Pilot scope

Commercial guardrails:

- service tier: `policy_os_trial`
- monthly recurring revenue: `$12,500`
- gross margin floor percent: `70`
- owner compensation fit: `fits`
- operator-load budget: `1` live review meeting per month, weekly async review, `1` workflow, `3` downstream systems, pilot-bounded policy tuning
- expansion triggers: new workflow, extra downstream system, custom UI, higher meeting cadence

### In scope

- quote marked ready for confirmation in CRM
- state comparison across HubSpot, internal order database, and Stripe
- draft confirmation generation for internal review
- approval-gated confirmation send

### Out of scope

- refunds
- destructive data cleanup
- workflow redesign for unrelated CRM or billing processes

---

## 2. Business objective

The purpose of this pilot is to:

- reduce order-confirmation errors caused by cross-system drift
- improve speed and governance in the confirmation workflow
- establish a production-safe path for customer confirmation sends

Target outcome in 30 days:

- reduce manual reconciliation time and prevent unreviewed confirmation sends

---

## 3. Success criteria

The pilot is successful if:

- risky actions are not executed without the required approval
- the workflow owner accepts the governed workflow path
- manual cleanup is reduced by at least 50 percent
- required audit fields are visible for approval and block decisions
- golden-task checks pass at the agreed threshold

Primary KPI:

- unreviewed risky actions prevented

Secondary KPIs:

- approval turnaround time
- incident rate trend

---

## 4. Workflow boundary

### Systems in scope

- HubSpot
- Internal Order Database
- Stripe
- Gmail

### Trust boundary

- auto-allow: source-state comparison and draft generation
- approval-required: pricing exception creation and confirmation send
- block: refunds, record deletion, and pricing overwrite without explicit review

### Ownership boundary

- workflow owner: `RevOps Director`
- technical owner: `Engineering Manager`
- approval owner: `RevOps Director`

---

## 5. Fallback and manual path

If the governed workflow cannot complete safely:

1. stop the workflow at the mismatch or blocked-action boundary
2. send the exception to the shared ops inbox
3. ops lead completes source corrections and customer communication manually
4. record the exception and resolution for audit review

Fallback is considered acceptable if:

- no incorrect confirmation is sent
- the customer receives the correct approved communication

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
- RevOps Director and Engineering Manager sign off

---

## 8. Risks and assumptions

### Risks

- source systems may remain inconsistent longer than expected
- client security review may delay production write scopes

### Assumptions

- order database remains the final source of truth for send readiness
- RevOps team can operate a shared approval inbox during pilot rollout

---

## 9. Decision record

### Approved next step

- run the Workflow Mapping Session and prepare the pilot implementation recommendation

### Decision owner

- `Jordan Lee`

### Target date

- `2026-03-12`
