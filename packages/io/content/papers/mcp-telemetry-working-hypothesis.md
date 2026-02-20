---
title: "Telemetry as a Control Surface for MCP Systems"
subtitle: "A working hypothesis from CREATE SOMETHING's production infrastructure and a research path to adaptive operations"
authors: ["CREATE SOMETHING"]
category: "Research"
abstract: "CREATE SOMETHING already operates production telemetry primitives for MCP systems: per-tool invocation logs, health resources, fleet telemetry MCPs, and tenant-aware policy scorecards. This paper proposes a working hypothesis: MCP teams improve faster when telemetry is not only descriptive (what happened) but operational (what should change next), expressed directly as MCP resources and tools for both agents and humans. We map the current stack, identify failure modes, and define a concrete research program for moving from passive observability to bounded control loops."
keywords: ["MCP", "telemetry", "observability", "D1", "Cloudflare Workers", "agent systems", "three-tier framework"]
publishedAt: "2026-02-20"
readingTime: 16
difficulty: "intermediate"
published: false
---

## Abstract

Telemetry in MCP ecosystems is often treated as post-hoc monitoring: logs, dashboards, and trend charts after execution. CREATE SOMETHING's current infrastructure suggests a stronger architecture: telemetry as a first-class MCP capability.

The production baseline already exists. `@create-something/mcp-core` can automatically instrument tool handlers and persist invocation telemetry. Fleet telemetry MCPs expose that state through MCP resources and tools. Tenant-aware scorecards and budget checks connect reliability and cost in the same surface. The open question is no longer whether telemetry exists; it is whether telemetry is integrated tightly enough to drive runtime adaptation.

This paper frames a testable hypothesis and an execution program: telemetry becomes strategically compounding when it closes the loop between data capture, automated intervention, and policy evolution.

## I. Research Question and Working Hypothesis

### I.1 Research question

How should MCP telemetry be structured so it does not stop at observation, but reliably improves operational outcomes (reliability, cost efficiency, and policy quality) over repeated execution?

### I.2 Working hypothesis

> MCP systems improve faster when telemetry is modeled as a control surface, not an audit trail.

More concretely:

1. If invocation, session, and tenant-policy telemetry are normalized with shared identifiers.
2. And if those signals are exposed through MCP-native interfaces (resources and tools), not only dashboards.
3. Then agents and humans can execute closed-loop adaptation:
   - detect degradation earlier,
   - reroute traffic or fallback paths with bounded risk,
   - evolve prompt and policy constraints with evidence,
   - and reduce cost per successful outcome over time.

### I.3 Evaluation criteria

This hypothesis is considered validated only if we can show measurable improvements in:

1. Mean time to detect and resolve incidents.
2. Cost per successful task (with quality constraints).
3. Policy-change cycle time from signal to approved rollout.
4. Tenant self-service rate for reliability and cost questions.

## II. Production Baseline: Current Telemetry Infrastructure

### II.1 Mapping by Three-Tier model

| Tier | Current implementation | What it gives us now |
|------|------------------------|----------------------|
| Database (what exists) | `mcp_tool_invocations`, `mcp_run_counts`, `agentic_sessions`, `agentic_iterations`, `agentic_events`, `gateway_requests`, `gateway_alerts`, `gateway_daily_rollups` | Multi-granularity visibility across execution, cost, and tenant behavior |
| Automation (what happens) | `enableTelemetry(...)`, telemetry resources (`telemetry://usage`, `telemetry://health`, `telemetry://activity`), operator tools (`query_health`, `query_usage`, `query_activity`) | MCP-native telemetry that agents can query and act on |
| Judgment (what should happen) | `query_budget_burn` decisions (`allow`, `warn`, `block`), decision scorecards, threshold-based health states | Operational policy signals, but mostly analysis-time rather than runtime adaptation |

### II.2 Architectural position

The key advantage of the current stack is protocol alignment: telemetry is already represented in MCP interfaces, not only in external observability tools. That makes telemetry available where decisions happen.

## III. Structural Strengths in the Current Stack

### III.1 Low-friction instrumentation

`server.tool(...)` wrapping reduces telemetry adoption failure by making capture default behavior, not optional behavior.

### III.2 MCP-native telemetry surface

Resources and tools make telemetry conversational and composable inside agent workflows, instead of forcing a context switch to dashboards.

### III.3 Cross-fleet observability

`cs-telemetry-mcp` can operate across CREATE SOMETHING and WORKWAY scopes, supporting shared reliability operations.

### III.4 Cost and reliability in one decision plane

Tenant scorecards and budget checks combine technical and financial signals, reducing split-brain operational decisions.

### III.5 Tenant-scoped access model

Runtime-key tenant resolution provides a strong foundation for secure client-facing telemetry slices.

## IV. Open Gaps and Failure Modes

### IV.1 Correlation fidelity gap

End-to-end linkage across invocation, gateway request, session iteration, and user-visible outcome is still inconsistent.

Without a mandatory correlation contract, causality reconstruction remains expensive and slow.

### IV.2 Outcome-quality signal gap

Success or failure flags are insufficient. We still need durable quality signals such as:

- correction and retry rates,
- downstream human override rates,
- user satisfaction proxies,
- task completion quality grades.

### IV.3 Telemetry-to-action latency gap

Most operations remain operator-query driven. The next step is policy-triggered interventions with bounded blast radius.

### IV.4 Policy evolution discipline gap

Scorecards exist, but the path from scorecard insight to versioned policy change is not yet first-class and fully auditable.

### IV.5 Privacy-aware observability gap

As fidelity increases, we need stronger controls for redaction, retention, and tenant-boundary enforcement.

## V. Research Program: Next Experiments

### V.1 Experiment A: Unified correlation contract

Define and enforce shared IDs across all telemetry paths:

- `correlation_id` (request lineage),
- `session_id` (agent lifecycle),
- `tenant_id` (scope),
- `tool_name` (action surface),
- `policy_version` (judgment context).

**Success metric:** incident root-cause time decreases materially in postmortems.

### V.2 Experiment B: Reliability control loop

Introduce an MCP tool that proposes or applies temporary routing interventions on health degradation:

- reduce traffic to high-error tools,
- increase fallback usage,
- emit structured intervention events.

**Success metric:** lower incident duration and fewer repeated failures in 24-hour windows.

### V.3 Experiment C: Cost-quality frontier

Track cost per successful task and quality proxies together (not separately), then build per-tool and per-workflow frontiers.

**Success metric:** measurable frontier shift toward better quality at equal or lower cost.

### V.4 Experiment D: Policy-as-artifact telemetry loop

When scorecards imply policy change, generate explicit policy proposals with:

- trigger evidence,
- expected effect,
- risk bounds,
- rollback conditions.

**Success metric:** reduced ambiguity and faster, safer policy updates.

### V.5 Experiment E: Tenant-visible telemetry products

Package tenant-safe telemetry views as MCP resources for clients.

**Success metric:** clients self-serve reliability and cost answers without operator mediation.

## VI. Practical 90-Day Plan

### VI.1 Days 0-30: Instrumentation hardening

- Standardize correlation IDs across telemetry tables and tools.
- Add schema checks for required telemetry fields in critical MCP servers.
- Document canonical telemetry dimensions for all MCP maintainers.

### VI.2 Days 31-60: Bounded automated interventions

- Ship one bounded reliability control loop (degrade to reroute or fallback).
- Add intervention logging and post-intervention review artifacts.

### VI.3 Days 61-90: Policy and tenant layer

- Implement policy proposal artifacts from scorecard shifts.
- Pilot tenant-facing telemetry resource bundles with at least one client workflow.

## VII. How to Apply This Pattern

For teams building MCP systems now, the practical order of operations is:

1. Instrument first, but define IDs before scale.
2. Expose telemetry in MCP surfaces that agents already use.
3. Add one bounded intervention loop before adding many.
4. Version policy changes and require rollback conditions.
5. Ship tenant-safe visibility early to reduce operator bottlenecks.

This preserves the Three-Tier separation:

- Database: reliable, queryable state.
- Automation: bounded interventions and routing actions.
- Judgment: explicit policy approval and evolution.

## VIII. Conclusion

CREATE SOMETHING does not need to invent telemetry from zero. The strategic work is to connect existing telemetry into adaptive loops where runtime behavior and policy artifacts evolve from evidence.

The hypothesis is testable: if MCP-native telemetry loops reduce incident time, improve quality-adjusted cost, and accelerate policy evolution, telemetry shifts from observability overhead to operational leverage.

The moat is not collecting more data. The moat is making telemetry executable for both agents and humans in the same protocol surface.

## References

- [The Three-Tier Framework](https://createsomething.io/papers/three-tier-framework)
- `docs/THREE_TIER_FRAMEWORK.md`
- `docs/MCP_FIRST_THESIS.md`
- `docs/COMPOSIO_PATTERNS.md`
