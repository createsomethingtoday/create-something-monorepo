# Workflow Mapping Session Agenda

**Audience:** client stakeholders  
**Duration:** 60 minutes  
**Purpose:** define one pilot workflow, its trust boundary, and the 30-day implementation path

---

## What we will do

During this session we will:

1. Select the workflow to scope
2. Map the systems, actions, and approvals involved
3. Define the policy boundary for automation
4. Confirm what should be automated, reviewed, or blocked
5. Align on the implementation path for the next 30 days

---

## What we need from your team

Please bring:

- the workflow owner
- one operational stakeholder closest to the work
- one technical stakeholder if systems or auth complexity is expected
- examples of current failure cases or manual workarounds

---

## Agenda

### 1. Workflow selection and business objective

- What outcome matters most right now?
- Which workflow is the best pilot candidate?
- What makes it expensive or risky today?

### 2. Current-state workflow map

- Trigger
- Systems in scope
- Sequence of actions
- Handoffs and failure points
- Existing human review steps

### 3. Trust and policy boundary

We will classify actions into:

- `auto-allow`
- `approval-required`
- `block`

We will also define:

- escalation triggers
- fallback/manual path
- ownership boundaries

### 4. Delivery path

- Is this an `MCP-only wedge`, `Workflow Infrastructure`, or `Reliability and Control Layer` engagement?
- What must ship first?
- What does success look like in 30 days?

### 5. Close and next actions

- Confirm pilot scope
- Confirm stakeholders
- Confirm decision owner
- Confirm implementation next step and date

---

## What you receive after the session

- Pilot workflow scope
- Policy boundary recommendation
- 30-day implementation plan
- Proposal-ready summary for implementation artifacts

---

## Notes on observability

If tracing or evals are part of the plan, we may recommend Braintrust for runtime visibility.

Braintrust is used for observability and tuning, not as the enforcement mechanism for workflow policy.
