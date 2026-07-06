# Workflow Mapping Session Agenda

**Audience:** client stakeholders  
**Duration:** 60 minutes  
**Purpose:** define one pilot workflow, its trust boundary, and the 30-day implementation path

---

## What we will do

During this session we will:

1. Review any public Atlas canvas the client created before booking
2. Select the workflow to scope
3. Map the systems, actions, and approvals involved in internal Atlas Studio
4. Define the policy boundary for automation
5. Confirm what should be automated, reviewed, or blocked
6. Align on the implementation path for the next 30 days

---

## What we need from your team

Please bring:

- the workflow owner
- one operational stakeholder closest to the work
- one technical stakeholder if systems or auth complexity is expected
- examples of current failure cases or manual workarounds
- the public Atlas canvas summary if you used it before booking

Do not put credentials, tokens, passwords, API keys, or private record exports in the public Atlas canvas or booking notes. The public mapping agent can only edit the prospect canvas; it cannot run production tools, read private systems, or approve implementation work.

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

If a public Atlas canvas exists, use it as the first draft. The live session can then move into internal Atlas Studio for deeper mapping, operator judgment, and approval-gated handoff planning.

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

- Is this an `MCP-only wedge`, `Workflow Infrastructure`, or `Policy OS` engagement?
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
- Reviewed Atlas map or handoff summary
- Policy boundary recommendation
- 30-day implementation plan
- Proposal-ready summary for implementation artifacts

---

## Notes on observability

If tracing or evals are part of the plan, we may recommend Langfuse for runtime visibility.

Langfuse is used for observability and tuning, not as the enforcement mechanism for workflow policy.
