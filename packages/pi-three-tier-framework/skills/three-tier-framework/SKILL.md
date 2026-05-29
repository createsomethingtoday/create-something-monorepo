---
name: three-tier-framework
description: The Three-Tier Framework (Database, Automation, Judgment) for understanding and building agent systems. Use when classifying components, debugging failures, designing MCP servers, or reviewing architecture.
---

# Three-Tier Framework

A structural model for agent systems, realized through Model Context Protocol.

## The Three Tiers

| Tier | Definition | MCP Primitive | Control Model | Debug Question |
|------|-----------|---------------|---------------|----------------|
| **Database** | What exists — state, content, records, APIs exposing data | Resources | Application-controlled | Is the data there and correct? |
| **Automation** | What happens — tools, skills, harnesses, execution | Tools | Model-controlled | Did execution succeed? |
| **Judgment** | What should happen — policy, oversight, constraints | Prompts | User-controlled | Was the right policy applied? |

## Cross-Cutting Concerns

Four concerns span all tiers:

| Concern | Definition | Role |
|---------|-----------|------|
| **Touchpoints** | Where interaction happens | The interface surface (MCP is the chassis) |
| **Artifacts** | Typed boundary contracts | What flows between tiers |
| **Orchestration** | Procedural flow | Application-controlled sequencing |
| **Insight** | Observability and audit | Making tier operations legible |

## Key Properties

### Causality Chain
Database feeds Automation feeds Judgment. Always debug in this order. Lower-tier failures cascade upward.

### Blurriness
Boundaries between tiers are elastic, not rigid. Sophisticated automation contains embedded judgment. A caching layer is Database but deciding *what* to cache is Judgment.

### The Recursive Property
MCP's sampling mechanism allows Tools to request LLM access back through the Client. This means Automation can invoke Judgment, creating a feedback loop. This mirrors embodied cognition — the body encounters the world and asks for policy guidance.

### Policy as Artifact
System prompts, constraints, and behavioral rules are not external scaffolding — they are data flowing through the tiers:
- **Database** stores policy artifacts (versioned, queryable)
- **Automation** transforms policy (applies rules, routes decisions)
- **Judgment** evaluates policy (human oversight, approval gates)

This enables: versioned constraints, context-driven policy selection, reflexive self-modification under human oversight.

## MCP Mapping

| MCP Primitive | Control Model | Framework Tier | Rationale |
|---------------|---------------|----------------|-----------|
| **Resources** | Application-controlled | Database | Client decides when to inject data |
| **Tools** | Model-controlled | Automation | LLM decides when to invoke |
| **Prompts** | User-controlled | Judgment | Human selects guidance |

## The Automotive Framework (Explanatory Metaphor)

| Vehicle Part | Technology | Function | Tier |
|-------------|-----------|----------|------|
| **Chassis** | MCP Servers | Connectivity frame | Touchpoints |
| **Engine** | Workers | Execution | Automation |
| **Transmission** | Durable Objects | State coordination | Orchestration |
| **Fuel Tank** | D1 | Data persistence | Database |
| **Turbocharger** | LLMs | Intelligence boost | Judgment |
| **Cockpit** | Glass UI | User control | Judgment |

## Debugging Heuristic

When a system fails, check tiers in order:

1. **Database** — Is the data there? Is it correct? Can it be queried?
   - *Failure mode*: Missing data, stale cache, broken schema, API timeout
2. **Automation** — Did execution work? Did the tool succeed?
   - *Failure mode*: Tool error, wrong tool selected, execution timeout, permission denied
3. **Judgment** — Was the right policy applied? Was oversight correct?
   - *Failure mode*: Wrong policy selected, missing approval gate, insufficient escalation

## Classification Guide

To classify a component:

1. Ask: "Who decides when this runs?"
   - Application decides → **Database**
   - Model decides → **Automation**
   - User decides → **Judgment**
2. Ask: "What kind of work is this?"
   - State/content/record → **Database**
   - Action/execution/transformation → **Automation**
   - Constraint/policy/oversight → **Judgment**
3. Assign confidence scores to each tier
4. Note cross-cutting concerns (Touchpoints, Artifacts, Orchestration, Insight)

## Example Classifications

| Component | Primary Tier | Rationale |
|-----------|-------------|-----------|
| D1 database | Database | Stores state |
| KV namespace | Database | Key-value persistence |
| MCP Tool handler | Automation | Model invokes during reasoning |
| Approval gate | Judgment | Human decides yes/no |
| Cloudflare Worker | Automation | Execution environment |
| System prompt | Judgment | User-selected guidance |
| Telemetry logs | Insight (cross-cutting) | Observability across tiers |
| API route | Touchpoints (cross-cutting) | Interaction surface |

## Further Reading

- Full paper: `docs/THREE_TIER_FRAMEWORK.md`
- MCP server version: `packages/three-tier-framework-mcp/`
- Policy OS product: `docs/POLICY_OS_PRODUCT_DEFINITION.md`
