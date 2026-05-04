# Funnel And Discovery Strategy

> Prepared: March 9, 2026
> Scope: canonical funnel progression, discovery logic, and package routing for CREATE SOMETHING commercial work

> Superseded note (March 13, 2026): This memo preserves the March 9 funnel framing. Current canonical packaging uses `Policy OS` as the paid package name. See [POLICY_OS_PRODUCT_DEFINITION.md](./POLICY_OS_PRODUCT_DEFINITION.md).

> Margin correction (May 4, 2026): Funnel routing must now check owner-compensation fit before proposals go out. See [OWNER_COMPENSATION_MARGIN_MODEL_2026-05-04.md](./OWNER_COMPENSATION_MARGIN_MODEL_2026-05-04.md).

## Executive Summary

The funnel should stop asking buyers to understand protocol categories before they understand their own workflow risk.

The correct front-door sequence is:

1. diagnose the workflow
2. classify the trust and policy boundary
3. route the buyer into the right package

The commercial ladder should be:

1. `MCP Audit`
2. `MCP-only`
3. `Policy OS Trial`
4. `Policy OS Core`

This keeps `MCP-only` as a narrow wedge, preserves `Agent Outcome Stack` as the default paid family, and gives `Policy OS` a clean recurring subscription path.

The margin-safe revenue path is fewer higher-value accounts:

- `Policy OS Trial`: `$12,500-$15,000/month`
- `Policy OS Core`: `$18,000-$30,000/month`
- preferred Core planning default: `$22,000/month`
- `$1M ARR` should be modeled around `3-5` Core or Enterprise accounts, not many low-priced support lanes

## Payment Boundary

The default commercial rule is:

- `MCP-only` is free
- paid product begins at `Policy OS Trial`

This means `MCP-only` should be treated as a wedge, not as a disguised services engagement.

Primary rationale:

- most clients still need onboarding and education to become fluent with Codex and MCP usage
- the free wedge absorbs that adoption friction before CREATE SOMETHING takes on the real governed operating burden

`MCP-only` should only remain free when all of the following are true:

- scope is narrow
- access is read-only or tightly constrained
- governance is intentionally minimal
- there is no recurring support expectation
- the work is explicitly intended to open the path into `Policy OS Trial`

If those conditions are not true, the work is no longer `MCP-only` in the free wedge sense and should be re-routed into paid governed delivery.

Paid exceptions are allowed, but should be rare.

Use a paid `MCP-only` exception only when:

- setup or advisory load is unusually heavy
- the work is materially beyond a narrow education-and-trust wedge
- the buyer is asking for more than introductory adoption support without yet moving into governed execution

## Primary Rule

The funnel must lead with:

- workflow economics
- failure cost
- approval and escalation needs
- governance requirements

The funnel must not lead with:

- app enumeration
- protocol education
- connector catalogs
- seat-style assistant comparison

## Canonical Offer Ladder

### 1. `MCP Audit`

Use when:

- the buyer is early
- the workflow is not yet clearly scoped
- the team needs strategic clarity before implementation

Goal:

- identify the best workflow wedge
- estimate trust boundary and failure cost
- determine whether the next step is `MCP-only` or governed delivery

### 2. `MCP-only`

Use when:

- the buyer needs trusted connectivity first
- read-only or compliance-constrained access is the main ask
- governance is intentionally narrow

Goal:

- prove trust and connectivity
- establish the substrate
- define explicit triggers for advancing into governed execution

Commercial rule:

- free by default
- never positioned as the final paid product
- must include a defined conversion path into `Policy OS Trial`
- paid exceptions only for unusually heavy setup or advisory

### 3. `Policy OS Trial`

Use when:

- one workflow is clear enough to scope
- write actions, approvals, or escalation matter
- the client wants governed automation, not just access

Goal:

- prove one governed workflow
- ship the operating artifacts
- create a clean subscription bridge into ongoing service

### 4. `Policy OS Core`

Use when:

- the client wants recurring governance ownership
- the workflow is live or near-live
- monthly tuning, review cadence, and policy lifecycle management matter

Goal:

- become the recurring operating layer
- own governance, review, and iteration
- expand from one workflow to a governed workflow portfolio over time

## Package Relationship

Use these terms consistently:

- `Agent Outcome Stack`
  - the canonical paid package family in current repo strategy
- `Policy OS Trial`
  - the governed pilot subscription inside that family
- `Policy OS Core`
  - the recurring operating subscription after a successful trial

Short rule:

- `Agent Outcome Stack` is the family
- `Policy OS` is the recurring operating layer inside the family
- `MCP-only` is the free entry wedge by default

## Discovery Objectives

Every discovery must answer five things:

1. What workflow matters most right now?
2. What does failure cost?
3. Which actions are safe, reviewable, or prohibited?
4. Which systems must stay in sync?
5. Which package lane is correct next?

If one of those remains unclear, discovery is incomplete.

## The Five Qualification Axes

Route every buyer against these axes:

### 1. Workflow criticality

Question:

- how important is this workflow to revenue, operations, or customer experience?

Signal:

- low criticality leans toward `MCP Audit` or `MCP-only`
- high criticality increases the case for `Policy OS Trial`

### 2. Permission posture

Question:

- is this workflow read-only, approval-gated write, or autonomous write?

Signal:

- read-only often fits `MCP-only`
- write actions move the buyer toward governed delivery

### 3. Compliance sensitivity

Question:

- is the workflow regulated, audited, contract-sensitive, or reputation-sensitive?

Signal:

- high sensitivity increases the need for explicit policy and runbooks

### 4. Approval and escalation depth

Question:

- where are human gates required, and where are they missing today?

Signal:

- if approvals matter, `MCP-only` is usually not enough

### 5. Optimization horizon

Question:

- does the client want setup only, or ongoing tuning and operating review?

Signal:

- setup-only supports wedge offers
- recurring review and tuning supports `Policy OS Core`

### 6. Margin and operator-load fit

Question:

- can the account support the owner-compensation model after direct delivery cost, tooling, review cadence, and support expectations?

Signal:

- low-margin or high-touch accounts should be scoped down, repriced, or parked
- weekly live meetings, extra systems, custom UI, or multiple workflows require Core expansion or Enterprise Extension
- the proposal must name the operator-load budget and expansion triggers

## Package Decision Rules

### Route to `MCP Audit` when:

- no workflow owner is clear
- the failure cost is still fuzzy
- multiple possible workflows compete for attention
- the buyer needs strategic diagnosis first

### Route to `MCP-only` when:

- the workflow is read-only or constrained
- connectivity proof is the immediate need
- the client is not yet ready to adopt governed execution
- a free wedge is commercially acceptable because the real target is `Policy OS Trial`

### Route to `Policy OS Trial` when:

- one workflow is high-cost and clear
- the workflow includes write or decision-bearing actions
- approval or escalation behavior is part of the ask
- the buyer expects a real operating result inside 30-90 days
- the pilot can support `$12,500-$15,000/month` without hidden custom-labor subsidy

### Route to `Policy OS Core` when:

- the workflow is moving into production or already live
- the client wants monthly governance and tuning
- the client needs recurring ownership for policy, review, and incident loops
- the account can support `$18,000-$30,000/month` or a clearly priced expansion path

## Funnel Stages

Use this funnel progression:

1. `Awareness`
   - buyer sees workflow-risk framing, not connector framing
2. `Diagnostic`
   - buyer enters discovery with one likely workflow
3. `Qualification`
   - five qualification axes are answered
4. `Routing`
   - buyer is assigned to one package lane
5. `Proposal`
   - commercial shape reflects the assigned lane
6. `Pilot or Wedge`
   - first engagement starts
7. `Conversion`
   - successful wedge or trial converts to recurring layer where appropriate

## Messaging Rules

### Operator-facing and sales-facing

Use:

- `Skills + MCP`
- `governed workflow`
- `policy-backed execution`
- `approval and escalation`
- `monthly tuning`

### Technical proof surfaces

Use:

- `MCP + Skills`
- `auth, trust boundaries, portability, governance`

### Avoid leading with

- `chatbot`
- `AI agent seat`
- `automation package`
- `Composio`

Those are either too low-level or too commodity-coded for the intended positioning.

## Discovery Output Standard

Every discovery should produce:

1. workflow candidate
2. business objective
3. failure cost
4. systems in scope
5. action classification:
   - `auto-allow`
   - `approval-required`
   - `block`
6. recommended package lane
7. named owner
8. dated next step
9. operator-load budget
10. owner-compensation fit assessment

## Conversion Logic

### `MCP Audit` -> `MCP-only`

Convert when:

- a narrow low-risk use case is identified
- trust setup is the immediate blocker

### `MCP-only` -> `Policy OS Trial`

Convert when:

- writes, approvals, or incidents enter scope
- the buyer wants outcomes, not just access
- failure cost is now clear enough to justify governed execution
- the client confirms that CREATE SOMETHING should own the policy and operating layer

## Exception Rule

The default remains:

- free `MCP-only`
- paid `Policy OS Trial`

Strategic exceptions are allowed when a named wedge is intentionally delivered free to open a larger system relationship.

Requirements for an exception:

1. the exception must be deliberate, not accidental scope drift
2. the target paid lane must already be identified as `Policy OS Trial`
3. the wedge scope must remain bounded
4. the conversion intent must be explicit in internal notes and proposal language

Current example:

- the Outerfields MCP can be delivered free as an introduction to the Half Dozen system team, with the explicit goal of graduating that relationship into `Policy OS Trial`

Important guardrail:

- an exception does not mean "free custom work forever"
- it means "free wedge with a named paid graduation path"
- an exception must not create standing operator load without a paid conversion date

### `Policy OS Trial` -> `Policy OS Core`

Convert when:

- the workflow proves value
- recurring governance and tuning are wanted
- the client wants CREATE SOMETHING to own the operating loop

## Implications For `.agency`

`.agency` should reflect this ladder explicitly in:

- services copy
- discovery forms or scripts
- lead qualification notes
- proposal inputs
- package and pricing pages

Important mismatch today:

- `.agency` still uses older packaging language around `Workflow Infrastructure`, `Reliability and Control Layer`, and `Enterprise Extension`
- the newer strategy and pricing work now points toward:
  - `MCP Audit`
  - `MCP-only`
  - `Policy OS Trial`
  - `Policy OS Core`

That taxonomy should be reconciled rather than left as parallel systems.

## Immediate Next Steps

1. update `.agency` services and discovery copy to reflect the canonical ladder
2. add discovery note fields for the five qualification axes
3. standardize proposal routing from discovery outputs
4. make `Policy OS Trial` and `Policy OS Core` explicit in commercial materials
5. add owner-compensation fit and operator-load budget to proposal inputs

## Final Rule

The funnel is healthy only if a buyer can move from:

- "our workflow keeps breaking"

to:

- "we know which package lane we belong in and why"

without needing a long protocol lesson.

## Source Anchors

- [MCP_FIRST_THESIS.md](./MCP_FIRST_THESIS.md)
- [AGENCY_CODEX_VECTOR_STRATEGY.md](./AGENCY_CODEX_VECTOR_STRATEGY.md)
- [POLICY_OS_TRIAL_PACKAGING_MEMO_2026-03-09.md](./POLICY_OS_TRIAL_PACKAGING_MEMO_2026-03-09.md)
- [POLICY_OS_GRADUATION_CHECKLIST_2026-03-09.md](./POLICY_OS_GRADUATION_CHECKLIST_2026-03-09.md)
- [OWNER_COMPENSATION_MARGIN_MODEL_2026-05-04.md](./OWNER_COMPENSATION_MARGIN_MODEL_2026-05-04.md)
- [packages/agency/content/sales/discovery-policy.md](./../packages/agency/content/sales/discovery-policy.md)
