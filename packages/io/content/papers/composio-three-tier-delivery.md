---
title: "Composio in the MCP Delivery System"
subtitle: "A decision-grade policy for wrap pattern adoption, control boundaries, and brand alignment"
authors: ["CREATE SOMETHING"]
category: "Research"
abstract: "This paper defines the CREATE SOMETHING policy for including Composio in our framework and MCP delivery system. The inclusion is scoped to commodity app connectivity and implemented through a strict wrap pattern: clients experience CREATE SOMETHING MCP servers while Composio remains internal infrastructure. We map bridge components to the Three-Tier Framework control models, preserve the MCP-only wedge versus Agent Outcome Stack default, and define governance gates (red lines, SLOs, and pilot graduation criteria). As of March 4, 2026, technical evaluation reports 29/29 checks passed (run date: 2026-02-10), while canonical status remains conditional adopt (decision date: 2026-02-21) pending client pilot closure."
keywords: ["Composio", "MCP", "Three-Tier Framework", "Wrap Pattern", "Agent Outcome Stack", "Policy as Artifact", "Automation Infrastructure"]
publishedAt: "2026-03-04"
readingTime: 22
difficulty: "intermediate"
published: true
---

## Release Thesis

Composio should be used as an internal commodity-connectivity substrate, not as the CREATE SOMETHING product surface. The operator decision this paper enables is where to draw the line between reusable integration plumbing and differentiated MCP creation: use Composio when the value is access to ordinary SaaS actions, and move to custom MCP when the value is domain judgment, policy enforcement, or reliability responsibility.

## Evidence Snapshot

| Claim | Evidence | Status | Reusable Artifact |
|-------|----------|--------|-------------------|
| Commodity connectivity should not consume delivery attention | OAuth, token state, and CRUD scaffolding repeat across long-tail SaaS requests | Validated by delivery pattern | Wrap-pattern inclusion rule |
| Brand and policy control must remain CREATE SOMETHING-owned | Client-facing surface remains CREATE SOMETHING MCP while Composio stays behind the adapter boundary | Proposed operating invariant | Client visibility boundary |
| Adoption is not complete until pilot evidence closes | Technical evaluation passed 29/29 checks on 2026-02-10, but 2026-02-21 decision remains conditional adopt | Partial | Phase 2 pilot gate |
| The Three-Tier Framework still governs integration choice | Database, Automation, and Judgment ownership can be mapped before implementation | Validated by architecture review | Composio/custom/hybrid rubric |

## What This Improves

This moves the Composio decision out of taste, enthusiasm, or blanket rejection. It gives delivery teams a rubric: accelerate what is commoditized, protect what carries policy, margin, or accountability, and keep vendor substitution possible through a strict wrapper.

## Evaluation Surface

| Surface | Measurement | Result | Status |
|---------|-------------|--------|--------|
| Technical readiness | Internal evaluation checks | 29/29 passing checks on 2026-02-10 | pass |
| Adoption governance | Canonical decision status | Conditional adopt on 2026-02-21 | partial |
| Brand boundary | Client-facing MCP surface | CREATE SOMETHING remains visible surface | proposed |
| Pilot evidence | Client pilot closure | Still required before full adoption | open |

## Next Decision

Run the Phase 2 pilot through this rubric and decide whether Composio remains a narrow commodity bridge, graduates to a broader default for low-risk connectivity, or is constrained further because reliability or policy integrity fails under real delivery pressure.

## Executive Thesis

Composio belongs in our stack as **infrastructure for commodity connectivity**, not as product identity.

That is the entire policy in one sentence.

The strategic logic remains unchanged:

- **MCP consumption is commoditized.**
- **MCP creation is not.**

Composio reduces undifferentiated integration effort (OAuth and standard CRUD across long-tail SaaS apps), so CREATE SOMETHING can concentrate on differentiated work: domain-specific MCP design, policy operations, judgment loops, and outcome delivery.

## Strategic Context: What Must Not Be Lost

CREATE SOMETHING has two valid views of the system, at different altitudes:

1. **Go-to-market view (Two-Layer Model)**
   - Automation Layer (MCP connectivity) is the wedge.
   - Intelligence Layer (agents, skills, policy operations) is the margin.
2. **Architectural view (Three-Tier Framework)**
   - Database = what exists.
   - Automation = what happens.
   - Judgment = what should happen.

Composio inclusion is acceptable only if both views remain intact:

- It cannot collapse our packaging into "tool plumbing resale."
- It cannot collapse control models by leaking judgment into a vendor black box.

## Problem Statement

Without a commodity connectivity substrate, teams repeatedly rebuild the same integration mechanics:

- OAuth link flows
- token/state bookkeeping
- repetitive CRUD tool scaffolding
- app-by-app edge-case handling for low-differentiation outcomes

That repetition burns delivery bandwidth where no moat exists.

The question is not "Is Composio good?" The question is:

**Does Composio increase delivery velocity while preserving CREATE SOMETHING's control of policy, brand, and differentiated outcome logic?**

## Design Goals and Non-Goals

### Goals

- Accelerate long-tail integration delivery for commodity apps.
- Keep clients on CREATE SOMETHING-facing MCP surfaces.
- Preserve the Three-Tier control boundary model.
- Keep the Agent Outcome Stack as the default paid offer.
- Maintain swap-ability if vendor conditions change.

### Non-goals

- Reposition CREATE SOMETHING as a Composio implementation shop.
- Expose Composio as a client-facing brand dependency.
- Delegate core policy and judgment control to external infrastructure.
- Use Composio for deep domain or SLA-critical integrations by default.

## The Wrap Pattern: Boundary of Visibility

The wrap pattern is the decisive architectural move.

```text
Client Request
   "Connect Tool X to our workflow"
        ↓
CREATE SOMETHING MCP Server (visible, contractual surface)
   ├── Custom tools (domain logic, differentiators)
   ├── Policy artifacts (prompts, constraints, approvals)
   └── Composio bridge (internal plumbing)
         ├── managed auth/connect links
         ├── commodity tool discovery
         └── commodity tool execution
```

Invariant:

- **Client sees CREATE SOMETHING.**
- **Composio remains implementation detail.**

This preserves both trust and substitution optionality.

## Three-Tier Alignment (Control-Model Exact)

Composio does not alter the framework. It occupies specific roles within it.

| Tier | Control Model | Bridge Components | Controlled Outcome |
|------|---------------|-------------------|--------------------|
| **Database** | Application-controlled | `ComposioAccount`, `ComposioTokenProvider` | Connected-account and token state resolution |
| **Automation** | Model-controlled | `ComposioToolFactory`, `ComposioClient` | Tool registration, invocation, and execution path |
| **Judgment** | User-controlled | `ComposioAuthProvider` + policy resolution in our harness | Constraint selection, approval semantics, permission boundaries |

### Why this matters

Many integrations fail not at API mechanics, but at boundary confusion. If a vendor starts deciding behavior that should be user-controlled, Judgment degrades. If agents act without policy visibility, Automation becomes unsafe.

The wrap pattern prevents that collapse by pinning control authority where it belongs.

## Delivery Model Alignment: Offer Architecture

Composio inclusion does not change commercial packaging:

- **MCP-only** remains discovery/compliance-constrained wedge.
- **Agent Outcome Stack** remains default paid delivery.

The distinction is structural:

- MCP-only sells bounded connectivity.
- Outcome Stack sells connectivity + policy + judgment operations + measurable business outcomes.

Composio can accelerate the first layer. It does not replace the second.

## Decision Rubric: Composio vs Custom vs Hybrid

Use this rubric per integration request.

| Criterion | Weight | Composio Path | Custom Path |
|-----------|--------|---------------|-------------|
| Domain-specific logic depth | High | Low depth (CRUD-oriented) | High depth (workflow semantics) |
| SLA criticality | High | Non-critical or tolerable fallback | Critical path / strict guarantees |
| Policy complexity | High | Standardized access semantics | Complex approval/governance rules |
| Time-to-delivery pressure | Medium | Fastest for commodity apps | Slower, but full control |
| Vendor substitution risk | Medium | Acceptable with wrapper containment | Required to minimize vendor dependency |
| Differentiation potential | High | Low differentiation | High differentiation |

### Default decision rule

- If outcome value comes from connectivity itself: Composio is likely sufficient.
- If outcome value comes from interpretation, orchestration, or domain judgment: custom wins.
- If split is clean: hybrid (commodity via Composio, differentiator via custom tools).

## Operational Sequence in Real Delivery

1. **Classify request**: commodity, deep domain, or hybrid.
2. **Choose path**: Composio/custom/hybrid via rubric.
3. **Define policy artifacts**: prompts, constraints, approval thresholds.
4. **Implement**:
   - Composio bridge for commodity tools.
   - custom MCP tools for differentiated logic.
5. **Instrument**: latency, failure class, resolution outcomes.
6. **Review against red lines**: if breached, route to custom path.

## Governance Status (With Concrete Dates)

As of **March 4, 2026**, evidence is:

- **2026-02-10**: `packages/composio-bridge/eval-report.json` reports **29/29 passing technical checks**.
- **2026-02-21**: canonical decision in `docs/internal/COMPOSIO_EVALUATION.md` is **CONDITIONAL ADOPT**.
- **Open gate**: Phase 2 client pilot closure remains required for full completion.

Interpretation:

- Technical suitability is strong.
- Program-level adoption remains intentionally gated.

## Red Lines (Brand and Architecture)

Composio usage is out of policy when any of the following occurs:

- Client-facing positioning implies Composio is the product.
- Core workflow correctness depends on vendor behavior we cannot govern.
- Judgment-layer constraints cannot be expressed or enforced in our harness.
- SLA-critical domains are delegated without fallback strategy.
- Domain differentiation is reduced to commodity CRUD abstractions.

If a red line is hit, default to custom MCP implementation.

## SLO and Reliability Envelope

For integrations kept on the Composio path, define and monitor:

- tool discovery latency budget
- execution success rate by toolkit
- auth-connect completion rate
- fallback activation rate
- incident class mapping (vendor, network, policy, application)

Policy rule:

- If reliability indicators violate agreed SLO envelopes for a client-critical flow, promote that flow to custom.

## Economics: Where Margin Actually Comes From

Composio lowers cost of commodity integration mechanics. That is useful, but not the business.

Margin remains in:

- workflow-specific tool semantics
- policy selection and enforcement
- judgment-loop instrumentation and operations
- continuous improvement of outcomes, not just connection count

A high-volume integration catalog with low policy quality is operational debt, not strategic advantage.

## Failure Modes and Mitigations

| Failure Mode | Typical Cause | Mitigation |
|-------------|---------------|------------|
| Moat erosion | Treating integration count as value | Enforce custom path for domain-differentiated workflows |
| Policy drift | Hidden auth/behavior assumptions | Keep policy artifacts explicit and versioned in our system |
| Vendor lock concern | Direct coupling at product boundary | Keep wrap pattern strict; preserve swappable adapter boundary |
| Tool sprawl | Uncurated long-tail capability growth | Curate allowed tool sets per client context |
| Reliability surprises | Unmonitored third-party variance | SLO instrumentation + fallback playbooks |

## Pilot Design to Graduate from Conditional Adopt

To move from conditional to full adopt, Phase 2 pilot should produce evidence in four dimensions:

1. **Delivery velocity**
   - Time from request to production-ready connectivity
   - Comparison against equivalent custom path estimate
2. **Outcome quality**
   - Whether agent outcomes improved, not just connection establishment
3. **Operational stability**
   - Incident rate, fallback frequency, and support burden
4. **Policy integrity**
   - Proof that judgment controls remained visible and enforceable

Graduation rule:

- If velocity improves and policy integrity remains uncompromised within SLO bounds, retain conditional adopt and expand scope deliberately.
- If policy integrity or reliability is compromised in critical flows, narrow scope and move affected paths to custom.

## Brand Alignment Test: Subtractive Triad

Composio policy should pass all three tests.

| Triad Level | Test | Pass Condition |
|-------------|------|----------------|
| **DRY (Implementation)** | Are we removing duplicated integration mechanics? | Commodity plumbing is reused, not rebuilt per client |
| **Rams (Artifact)** | Does each integration choice earn its existence? | Composio used only when it materially improves delivery without reducing quality |
| **Hermeneutic (System)** | Does this keep work connected to the whole strategy? | Packaging, tier boundaries, and policy ownership remain coherent |

If any test fails, the implementation is misaligned even if it "works" technically.

## Policy as Artifact: Practical Implication

Composio changes connection plumbing. It does not own behavioral policy.

- Prompts and constraints remain ours.
- Approval semantics remain ours.
- Judgment visibility remains ours.

This keeps policy portable across client contexts and protects the ability to swap infrastructure without rewriting system behavior.

## Conclusion

A high-grade CREATE SOMETHING position on Composio is not enthusiastic adoption or blanket rejection.

It is disciplined scope:

- Use Composio where value is commodity connectivity.
- Use custom MCP where value is domain judgment and differentiated outcomes.
- Keep the wrap boundary strict so brand, policy, and control remain ours.

That is the practical form of the creation moat in delivery operations: accelerate what is commoditized; protect what is not.

## Sources (Internal)

- `docs/COMPOSIO_PATTERNS.md`
- `docs/internal/COMPOSIO_EVALUATION.md`
- `docs/HUB_COMPOSIO_READINESS_ASSESSMENT_2026-02-21.md`
- `docs/MCP_FIRST_THESIS.md`
- `docs/THREE_TIER_FRAMEWORK.md`
- `CLAUDE.md`
