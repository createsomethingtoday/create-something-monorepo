---
name: policy-os-starter
description: Policy OS product overview, contract bundles, the MCP-First Thesis, and the Subtractive Triad. Use when reasoning about governance, quality gates, or agent delivery patterns.
---

# Policy OS Starter

The essential knowledge for working with CREATE SOMETHING's governed execution platform.

## The MCP-First Thesis

**The entry point to automation is connectivity, not intelligence.**

The pattern from industry adoption:
1. **MCP servers establish trust** (controlled, permissioned access)
2. **Skills provide capabilities** (reusable, portable across platforms)
3. **Agents produce outcomes** (the monetizable layer)

**MCP consumption is commoditized. MCP creation is not.** — This is the moat.

## Policy OS Definition

Policy OS is the canonical paid CREATE SOMETHING package for governed AI execution. It combines:

- Custom MCP connectivity
- Agent and workflow behavior contracts
- Policy artifacts and approval boundaries
- Operator runbooks and golden-task regressions
- Recurring review, tuning, and escalation operations

## Service Tiers

| Tier | Scope |
|------|-------|
| **MCP Audit** | Diagnose what MCPs to build |
| **MCP-only** | Free discovery/compliance wedge |
| **Policy OS Trial** | Time-limited paid trial |
| **Policy OS Core** | Full governed execution |

## Contract Bundle

Every Policy OS engagement ships these artifacts:

| Artifact | Purpose |
|----------|---------|
| `mcp_contract.yaml` | MCP connectivity scope and permissions |
| `agent_contract.yaml` | Agent behavior boundaries and tool access |
| `outcome_contract.md` | Expected outcomes and success metrics |
| `golden_tasks.yaml` | Regression test tasks for quality assurance |
| `runbook.md` | Operator procedures, escalation paths |

## The Subtractive Triad

The code review and decision-making methodology:

| Level | Discipline | Question | Action |
|-------|-----------|----------|--------|
| **Implementation** | DRY | "Have I built this before?" | Unify |
| **Artifact** | Rams | "Does this earn its existence?" | Remove |
| **System** | Heidegger | "Does this serve the whole?" | Reconnect |

Apply in order. Each level enables the next.

## Quality Gate Patterns

Policy OS governance translates to agent quality gates:

| Gate | When | What |
|------|------|------|
| **Pre-execution** | Before tool calls | Block dangerous commands, enforce naming |
| **Post-execution** | After writes/edits | Check design system compliance, import validity |
| **Pre-completion** | Before agent finishes | Type check, lint, uncommitted changes |
| **Evidence** | Session end | Record delivery evidence in issue tracker |

## Applying Policy OS to Any Codebase

Ask these questions to identify governance gaps:

1. **What breaks today?** → Identifies quality gate needs
2. **What actions need approval?** → Identifies judgment boundaries
3. **What should never happen?** → Identifies bash guard rules
4. **How do you verify correctness?** → Identifies pre-completion checks
5. **Where is delivery evidence recorded?** → Identifies evidence surface
