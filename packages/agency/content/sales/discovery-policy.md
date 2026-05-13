# Discovery Policy And Standards

**Scope:** all CREATE SOMETHING `.agency` discovery, qualification, and workflow mapping work  
**Applies to:** discovery calls, async qualification, MCP-only wedge scoping, and Workflow Mapping Sessions

---

## Purpose

Ensure discovery produces a decision-ready workflow map, not just an integration request list.

Discovery must determine:

1. The business workflow to improve
2. The systems and data required
3. The trust boundary for autonomous action
4. The policy boundary for `auto-allow`, `approval-required`, and `block`
5. The correct engagement path: `MCP-only wedge`, `Workflow Infrastructure`, `Policy OS`, or `Enterprise Extension`

---

## Core standard

Discovery is successful only when the workflow, risk boundary, and next-step package are clear.

The thesis is:

> "A connected agent is not a trusted workflow."

The question is not:

> "What do you want to connect?"

The primary question is:

> "What business workflow needs to become safe, fast, and governable?"

Integration requests are inputs to workflow discovery, not the end product.

---

## Required outputs

Every discovery must produce these minimum outputs:

1. `workflow candidate`
2. `business objective`
3. `current failure cost`
4. `systems in scope`
5. `human gate boundaries`
6. `policy boundary`
7. `recommended tier`
8. `named owner`
9. `next step and date`

If these are incomplete, discovery is incomplete.

---

## Mandatory classification

Every qualified workflow must be mapped across the Three-Tier Framework:

- `Database`: systems of record, data dependencies, freshness, and state ownership
- `Automation`: actions, tool paths, handoffs, retries, and deterministic workflow steps
- `Judgment`: approvals, escalation triggers, disallowed actions, and policy selection

Do not recommend implementation before all three are addressed.

---

## Policy boundary standard

Every discovery must classify actions into these buckets:

1. `auto-allow`
Safe read or low-risk actions that can execute without human review

2. `approval-required`
Actions that can be automated but require explicit human gate or inbox review

3. `block`
Actions that must not execute in the proposed system

The policy boundary must also define:

- escalation triggers
- fallback/manual path
- ownership boundary
- release-gate conditions for production rollout

If a workflow cannot be described in these terms, it is not ready for Policy OS.

---

## Package routing rules

### Route to `MCP-only wedge` when:

- the client primarily needs trusted connectivity
- the workflow is read-only or compliance-constrained
- autonomy risk is intentionally low
- the next step is validation rather than governed execution

### Route to `Workflow Infrastructure` when:

- the workflow requires deterministic execution paths
- multiple systems must stay in sync
- current failure cost is operational, financial, or customer-visible

### Add `Policy OS` when:

- write actions or approvals matter
- risky actions need gating
- auditability or incident loops are required
- the client wants production-safe autonomous behavior

### Add `Enterprise Extension` when:

- the workflow is regulated, compliance-heavy, or high-stakes
- cross-system orchestration is deep
- custom trust boundaries are required

---

## Braintrust standard

Braintrust is an observability and eval layer.

It is not the policy control plane.

Use Braintrust for:

- decision traces
- evals
- runtime observation
- regression visibility

Do not describe Braintrust as the mechanism that enforces `allow`, `approval-required`, or `block`.
Those belong in policy artifacts, workflow controls, and runtime enforcement paths.

---

## Prohibited discovery shortcuts

Do not:

- reduce discovery to app enumeration alone
- promise governed automation before policy boundaries are defined
- position onboarding as the same thing as discovery
- describe MCP setup as the final deliverable when the real need is governed workflow execution
- skip quantified failure cost
- skip named decision owner

---

## Exit criteria

Discovery can close only in one of these states:

1. `Advance`
Paid Workflow Mapping Session or approved scoped wedge with owner and date

2. `Park`
Explicit re-entry condition and timing window

3. `Refer`
The need is primarily system implementation, internal enablement, or onboarding outside `.agency` scope

No discovery should end with vague intent and no owner.
