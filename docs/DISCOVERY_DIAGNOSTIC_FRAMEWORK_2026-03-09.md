# Discovery Diagnostic Framework

> Prepared: March 9, 2026
> Scope: operator-facing framework for qualifying buyers into the correct CREATE SOMETHING package lane

## Purpose

This framework turns discovery into a routing decision instead of an open-ended sales conversation.

Use it to:

- diagnose workflow risk
- capture the policy boundary
- assign the correct package lane
- reduce fuzzy proposals

## One-Sentence Standard

Discovery is complete only when the buyer’s workflow, risk boundary, and next package are explicit.

## Payment Boundary

Use this default commercial rule during routing:

- `MCP-only` is free
- paid product begins at `Policy OS Trial`

That means discovery should never treat `MCP-only` as the main paid destination. It is a wedge.

Rationale:

- many buyers still need Codex and MCP onboarding before they are ready to buy the governed operating layer
- the free wedge reduces adoption friction and creates the conditions for a paid `Policy OS Trial`

## Core Questions

Ask these in order:

1. What workflow matters most in the next 30-90 days?
2. What breaks today, and what does that failure cost?
3. Which systems must stay in sync?
4. Which actions can auto-run, which need approval, and which must be blocked?
5. Does the buyer need setup only or an ongoing operating layer?

## Qualification Scorecard

Score each axis as `low`, `medium`, or `high`.

### Workflow criticality

- `low`: helpful but not urgent
- `medium`: important but not existential
- `high`: operationally or commercially painful when broken

### Permission depth

- `low`: read-only
- `medium`: write actions exist but can stay approval-gated
- `high`: autonomous or near-autonomous writes are in view

### Compliance sensitivity

- `low`: limited exposure
- `medium`: customer-visible or contract-sensitive
- `high`: regulated, audited, or high-trust domain

### Approval complexity

- `low`: few or no gates
- `medium`: gates exist but are manageable
- `high`: multiple approvals, escalations, or exception paths matter

### Optimization horizon

- `low`: one-time setup mentality
- `medium`: open to review and iteration
- `high`: wants a recurring governance and tuning partner

## Package Routing Matrix

### Route to `MCP Audit`

Default when:

- workflow criticality is unclear
- there is no named workflow owner
- multiple candidate workflows exist
- the buyer needs diagnosis more than delivery

### Route to `MCP-only`

Default when:

- permission depth is `low`
- compliance sensitivity is `low` or `medium`
- approval complexity is `low`
- optimization horizon is `low`
- the free wedge is sufficient to prove connectivity and create a path into governed delivery

### Route to `Policy OS Trial`

Default when:

- workflow criticality is `medium` or `high`
- permission depth is `medium` or `high`
- approval complexity is `medium` or `high`
- a bounded 30-90 day pilot is realistic

Commercial meaning:

- this is the first paid product lane

### Route to `Policy OS Core`

Default when:

- the client already accepts recurring governance ownership
- optimization horizon is `high`
- policy, escalation, and review cadence are recurring needs

## Red Flags

Slow down or park the deal when:

- no one owns the workflow
- failure cost cannot be named
- the buyer wants autonomy but cannot define any approvals
- the workflow is clearly regulated but the buyer wants to skip governance design
- the conversation stays stuck at "connect these apps"

## Required Discovery Outputs

Every qualified discovery note must include:

1. `workflow_candidate`
2. `business_objective`
3. `failure_cost`
4. `systems_in_scope`
5. `database_constraints`
6. `automation_constraints`
7. `judgment_constraints`
8. `auto_allow_actions`
9. `approval_required_actions`
10. `blocked_actions`
11. `recommended_package`
12. `named_owner`
13. `next_step`
14. `next_step_date`

## Recommended Discovery Close

### High-fit close

Use when:

- one workflow is clearly painful
- governance matters
- there is budget and owner signal

Close to:

- `Policy OS Trial`
- or a paid mapping session that leads directly into it

### Medium-fit close

Use when:

- value is likely
- but risk posture or authority is still emerging

Close to:

- `MCP Audit`
- or `MCP-only` with explicit conversion triggers

### Low-fit close

Use when:

- the need is vague
- ownership is weak
- urgency is too low

Close to:

- `Park`
- with a re-entry condition

## Suggested Conversion Triggers

Use these triggers to move buyers up the ladder:

### From `MCP-only` to `Policy OS Trial`

- write actions are requested
- approval rules become necessary
- incident cleanup becomes visible
- the buyer asks for measurable outcomes rather than access
- the free wedge has done its job and the client is ready for the operating layer

## Strategic Exception Handling

Named exceptions are allowed when a free `MCP-only` wedge is used intentionally to open a larger paid relationship.

Use an exception only when:

- the wedge account or client is strategically important
- the scope is bounded
- the intended graduation path is already identified

Paid exceptions are also allowed, but only when setup or advisory effort is unusually heavy for what would otherwise be a narrow wedge.

Example:

- Outerfields MCP delivered free as an introduction to the Half Dozen system team, with expected graduation into `Policy OS Trial`

Required note fields for exceptions:

1. `exception_reason`
2. `target_paid_lane`
3. `conversion_trigger`
4. `scope_boundary`

### From `Policy OS Trial` to `Policy OS Core`

- the pilot proves workflow value
- the client wants CREATE SOMETHING to own monthly review
- policy changes and escalation tuning become recurring

## Final Rule

Do not let discovery end with:

- "interesting conversation"
- "we should probably do something"
- "send me a proposal"

Let it end with one of:

- `MCP Audit`
- `MCP-only`
- `Policy OS Trial`
- `Policy OS Core`
- `Park`

## Source Anchors

- [FUNNEL_AND_DISCOVERY_STRATEGY_2026-03-09.md](./FUNNEL_AND_DISCOVERY_STRATEGY_2026-03-09.md)
- [packages/agency/content/sales/discovery-call-script.md](./../packages/agency/content/sales/discovery-call-script.md)
- [packages/agency/content/sales/discovery-policy.md](./../packages/agency/content/sales/discovery-policy.md)
- [packages/agency/content/sales/discovery-runbook.md](./../packages/agency/content/sales/discovery-runbook.md)
