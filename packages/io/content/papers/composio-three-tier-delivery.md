---
title: "Composio in the MCP Delivery System"
subtitle: "Wrap pattern implementation and Three-Tier alignment"
authors: ["CREATE SOMETHING"]
category: "Research"
abstract: "This paper documents the recent inclusion of Composio in CREATE SOMETHING's MCP delivery system. The inclusion is scoped to commodity app connectivity and implemented through the wrap pattern: clients see CREATE SOMETHING MCP servers while Composio remains internal infrastructure. The analysis maps bridge components to the Three-Tier Framework control models (Database, Automation, Judgment), clarifies packaging alignment (MCP-only wedge vs Agent Outcome Stack default), and records current governance status as of February 21, 2026: conditional adopt pending pilot closure."
keywords: ["Composio", "MCP", "Three-Tier Framework", "Wrap Pattern", "Agent Outcome Stack", "Automation Infrastructure"]
publishedAt: "2026-03-04"
readingTime: 12
difficulty: "intermediate"
published: true
---

## Why Composio Was Included

The inclusion is pragmatic, not positional.

Our thesis remains unchanged: **MCP consumption is commoditized; MCP creation is not**. Composio reduces commodity integration effort (Gmail, Notion, Slack, HubSpot, etc.) so engineering time stays focused on custom MCP creation, domain logic, and policy operations.

In practice, this means:

- Use Composio first for generic CRUD + managed OAuth connectivity.
- Use custom integrations for deep domain workflows, client-specific SLAs, or strategic control boundaries.
- Keep CREATE SOMETHING as the client-facing surface.

## The Wrap Pattern in Delivery

The delivery pattern is explicit across repo docs:

1. Client requests integration outcome.
2. CREATE SOMETHING MCP server remains the visible interface.
3. `@create-something/composio-bridge` handles internal auth/tool plumbing.
4. Intelligence Layer and policy decisions remain in our stack.

This preserves commercial and architectural clarity:

- `MCP-only` remains a narrow discovery/compliance wedge.
- `Agent Outcome Stack` remains the default paid delivery.
- Composio is internal infrastructure, not external positioning.

## Three-Tier Alignment

Composio does not replace the framework; it slots into it.

| Tier | Control Model | Composio Bridge Mapping | Role |
|------|---------------|-------------------------|------|
| **Database** | Application-controlled | `ComposioAccount`, `ComposioTokenProvider` | Stores and resolves connected-account/token state |
| **Automation** | Model-controlled | `ComposioToolFactory`, `ComposioClient` | Registers and executes commodity tools |
| **Judgment** | User-controlled | `ComposioAuthProvider` + policy resolution | Applies account-scoped access and auth policy |

The key architectural point: Composio handles commodity connectivity mechanics while control-model boundaries stay intact.

## Delivery System Implications

### What gets faster

- Time-to-first-integration for long-tail app connectivity.
- OAuth setup and account-link flow consistency.
- Standard tool discovery and execution across many SaaS apps.

### What does not change

- Policy design remains a CREATE SOMETHING responsibility.
- Judgment loop (prompts/constraints/approval paths) remains user-controlled.
- Deep domain MCPs remain custom because that is where the moat lives.

## Governance Status (Concrete Dates)

As of **March 4, 2026**, the canonical status is:

- **2026-02-10**: technical evaluation artifacts report `29/29` passing checks in `packages/composio-bridge/eval-report.json`.
- **2026-02-21**: decision record sets **CONDITIONAL ADOPT** in `docs/internal/COMPOSIO_EVALUATION.md`.
- **Current open item**: Phase 2 client pilot closure is still required before full completion.

This distinction matters: technical readiness is high; program completion is still conditional.

## Use/No-Use Heuristic

Use Composio when the ask is commodity connectivity.

Use custom MCP implementation when any of these are true:

- Domain-specific logic is core to the outcome.
- SLA, governance, or uptime risk requires direct control.
- Integration depth exceeds generic CRUD semantics.

Use hybrid only when separation is clean: commodity operations via bridge, differentiated logic in custom tools.

## Policy as Artifact

Composio inclusion reinforces a broader policy stance: policy remains an artifact we control.

- The bridge changes **how tools connect**.
- It does not change **who decides constraints**.
- It does not change **where judgment lives**.

That keeps the Three-Tier model stable under vendor substitution and maintains portability across client environments.

## Conclusion

Composio is now part of the delivery system as a scoped infrastructure choice:

- Yes to commodity integration acceleration.
- No to outsourcing framework control or client-facing identity.
- Conditional adopt until pilot evidence closes the loop.

The architecture remains coherent with the creation moat: connectivity is accelerated, while differentiation remains in custom MCP creation, policy design, and outcome delivery.
