# Workflow Infrastructure Operator Checklist

**Purpose:** one internal checklist for running the full CREATE SOMETHING `.agency` workflow from discovery to release readiness

---

## 1. Before first contact

- Review the client context and likely workflow category
- Review [discovery-policy.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/content/sales/discovery-policy.md)
- Review [discovery-runbook.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/content/sales/discovery-runbook.md)
- Send or prepare [policy-os-buyer-brief-ops-revops.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/content/sales/policy-os-buyer-brief-ops-revops.md)
- Enter the call with a workflow hypothesis, not an integration prescription

---

## 2. Discovery call

- Run [discovery-call-script.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/content/sales/discovery-call-script.md) as the branching guide
- Identify the business objective for the next 30 days
- Identify the workflow candidate
- Quantify current failure cost
- Identify systems in scope
- Identify workflow owner and decision owner
- Classify the workflow across `Database`, `Automation`, and `Judgment`
- Define the policy boundary:
  - `auto-allow`
  - `approval-required`
  - `block`
- Determine whether the correct route is:
  - `Workflow Mapping Session`
  - `MCP-only wedge`
  - `Park`
  - `Refer`

Exit rule:

- Do not end discovery without a named owner and a dated next step or explicit re-entry condition

---

## 3. Post-call capture

- Complete [discovery-note-template.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/content/templates/sales/discovery-note-template.md)
- Use [discovery-note-example.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/content/templates/sales/discovery-note-example.md) if specificity is weak
- Confirm fit level: `high`, `medium`, or `low`
- Confirm recommended package tier
- Confirm whether Braintrust is relevant only as observability/evals

---

## 4. Commercial handoff

- Complete [policy-os-proposal-input-template.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/content/templates/sales/policy-os-proposal-input-template.md)
- Use [pricing-framework.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/content/templates/sales/pricing-framework.md) for pricing posture
- Confirm monthly recurring revenue, gross margin floor, owner-compensation fit, and operator-load budget before sending a Policy OS proposal
- Send [policy-os-follow-up-sequence.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/content/templates/sales/policy-os-follow-up-sequence.md) based on fit level

For high-fit work:

- Send [workflow-mapping-session-agenda.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/content/templates/sales/workflow-mapping-session-agenda.md)
- Lock stakeholders, owner, and date

---

## 5. Workflow Mapping Session

- Confirm the pilot workflow scope
- Confirm workflow boundary and out-of-scope areas
- Confirm policy boundary with explicit `auto-allow`, `approval-required`, and `block` classes
- Confirm fallback/manual path
- Confirm release-gate expectations
- Confirm the operator-load budget and expansion triggers
- Confirm 30-day implementation plan

Exit rule:

- Do not mark the session complete without:
  - pilot scope
  - policy boundary
  - 30-day plan

---

## 6. Delivery artifact drafting

- Review [templates/delivery/README.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/content/templates/delivery/README.md)
- Draft [mcp_contract.yaml](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/content/templates/delivery/mcp_contract.yaml)
- Draft [agent_contract.yaml](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/content/templates/delivery/agent_contract.yaml)
- Draft [outcome_contract.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/content/templates/delivery/outcome_contract.md)
- Draft [golden_tasks.yaml](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/content/templates/delivery/golden_tasks.yaml)
- Draft [runbook.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/content/templates/delivery/runbook.md)

Reference example set:

- [exampleco-mcp_contract.yaml](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/content/templates/delivery/examples/exampleco-mcp_contract.yaml)
- [exampleco-agent_contract.yaml](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/content/templates/delivery/examples/exampleco-agent_contract.yaml)
- [exampleco-outcome_contract.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/content/templates/delivery/examples/exampleco-outcome_contract.md)
- [golden_tasks.yaml](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/content/templates/delivery/golden_tasks.yaml)
- [exampleco-runbook.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/content/templates/delivery/examples/exampleco-runbook.md)

---

## 7. Release readiness review

- Confirm all five delivery artifacts are drafted
- Confirm policy owner, workflow owner, and technical owner are named
- Confirm monthly recurring revenue, gross margin floor, owner-compensation fit, and operator-load budget are captured in the artifact bundle
- Confirm blocked actions are explicitly listed
- Confirm approval-required actions have a real inbox or owner
- Confirm manual fallback is documented
- Confirm golden-task scenarios cover:
  - happy path
  - approval-required path
  - blocked action
  - mismatch/ambiguity path
  - manual fallback path
- Confirm Braintrust, if used, is only described as observability/evals

---

## 8. Implementation handoff

- Hand off the full artifact set together
- Do not hand off `mcp_contract.yaml` without `agent_contract.yaml`
- Do not hand off build scope without `outcome_contract.md`
- Do not approve production rollout without golden-task checks and runbook

If the audience is the internal Half Dozen team:

- use [halfdozen-mcp-onboarding-pack.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/content/templates/delivery/halfdozen-mcp-onboarding-pack.md)
- use [halfdozen-mcp-onboarding-checklist.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/content/templates/delivery/halfdozen-mcp-onboarding-checklist.md)
- review [halfdozen-mcp-onboarding-example.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/content/templates/delivery/examples/halfdozen-mcp-onboarding-example.md)

---

## 9. Final discipline

- No discovery without workflow and policy boundary
- No proposal without approval boundaries
- No implementation without artifact set
- No production without gates, fallback, and runbook
