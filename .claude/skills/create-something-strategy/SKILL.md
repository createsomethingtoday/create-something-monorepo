---
name: create-something-strategy
description: CREATE SOMETHING and WORKWAY strategy and shared vocabulary - the Three-Tier Framework, MCP-first thesis, WORKWAY vertical, creation moat, AI Interaction Atlas mapping, Automotive Framework, and owned terms. Use when writing or reviewing copy, papers, positioning, or architecture docs for .ltd, .io, .space, .agency, or WORKWAY.
---

# CREATE SOMETHING Strategy

## The Life's Work: Automation Infrastructure

**Automation Infrastructure** is the layer between human intention and system execution. It's what makes outcomes possible while you sleep—not automation that fills every gap (Gestell), but automation that enables dwelling (Gelassenheit).

### The Two-Layer Model

```
┌─────────────────────────────────────────────────────────────┐
│                   INTELLIGENCE LAYER                        │
│        Skills, Agents, Automations (the upsell)            │
│   "Draft this RFI" · "Summarize daily logs" · "Flag risk"  │
├─────────────────────────────────────────────────────────────┤
│                    AUTOMATION LAYER                         │
│              MCP Servers (the entry point)                  │
│        Connect your tools to AI with trust boundaries       │
└─────────────────────────────────────────────────────────────┘
                            ↓
                   Edge Infrastructure
                  (Cloudflare Workers)
                            ↓
                 Outcomes While You Sleep
```

### The Three-Tier Framework

The structural model underlying all CREATE SOMETHING agent systems. Three tiers map to MCP's three primitives via their control models:

| Tier | Definition | MCP Primitive | Control Model |
|------|-----------|---------------|---------------|
| **Database** | What exists (state, content, record) | Resources | Application-controlled |
| **Automation** | What happens (tools, skills, harness) | Tools | Model-controlled |
| **Judgment** | What should happen (policy, oversight) | Prompts | User-controlled |

Four cross-cutting concerns span all tiers: **Touchpoints** (interaction surface), **Artifacts** (typed boundary contracts), **Orchestration** (procedural flow), **Insight** (observability/audit).

**The recursive property**: MCP's sampling mechanism allows Automation to request Judgment, creating a feedback loop. Tools can encounter the world and ask for judgment—mirroring embodied cognition.

**Policy as artifact**: Constraints and behavioral rules are not external scaffolding but data flowing through the tiers—stored in Database, transformed by Automation, evaluated by Judgment. This enables versioned constraints, context-driven policy selection, and reflexive self-modification under human oversight.

**The Two-Layer Model** (above) is the *go-to-market* view: MCP as entry point, Intelligence as upsell. **The Three-Tier Framework** is the *architectural* view: how the system actually works. Both are valid at different altitudes.

**Debugging heuristic**: When a system fails, check tiers in order: (1) Database—is data there? (2) Automation—did execution work? (3) Judgment—was policy correct?

See `docs/THREE_TIER_FRAMEWORK.md` for full treatment including sampling feedback loops, policy-as-artifact implications, and the embodied cognition parallel.

**The MCP-First Thesis**: The entry point to automation is *connectivity*, not intelligence. Users grant folder/API access to an MCP server first. Trust is established. Then intelligence layers on top.

This inverts the common assumption that you build an AI agent first, then add integrations. The pattern emerging from Claude Cowork, Codex App, and industry adoption (100M+ monthly MCP downloads) is:

1. **MCP servers establish trust** (controlled, permissioned access)
2. **Skills provide capabilities** (reusable, portable across platforms)
3. **Agents produce outcomes** (the monetizable layer)

**Packaging rule**: `Map` is the entry wedge; `Build` is the paid implementation; `Control` is the recurring governed control plane. MCP/policy artifacts stay portable across clients and agent platforms. See `packages/agency/src/lib/data/productFamily.ts` for the authoritative definitions.

### WORKWAY

[WORKWAY](https://workway.co) is where this philosophy becomes code—**The Automation Layer for Construction**.

| Layer | What It Is | WORKWAY Implementation |
|-------|------------|------------------------|
| **Automation Layer** | MCP servers that connect tools to AI | Open-source Procore MCP Server |
| **Intelligence Layer** | Skills + Agents that produce outcomes | Premium construction Skills (RFI drafting, daily log synthesis, compliance checks) |

**Why Construction**: 98% of projects face delays/overruns. 35% of worker time lost to non-productive tasks. $30-40B annual US inefficiency. Only 4% of construction companies use AI. The pain is massive, the adoption is early, and Procore is the dominant platform.

**Key principle**: Users don't want "workflow automation"—they want outcomes. RFIs that draft themselves. Daily logs that synthesize themselves. The tool should disappear.

### The Creation Moat

**MCP consumption is commoditized. MCP creation is not.**

Templates and scaffolding tools (`create-mcp-server`, `mcp-forge`, `mcptools`) have lowered the barrier to *starting* an MCP server. Desktop Extensions (`.mcpb`) have simplified *installation*. But neither Claude Desktop, Claude Cowork, nor Codex can *create* MCP servers from within the app.

**The moat is in creation:**
- Understanding *what* MCP to build (domain expertise)
- Building custom MCPs for specific workflows (technical expertise)
- Integrating MCPs with existing systems (auth, data mapping, security)
- The Intelligence Layer on top (Skills, Agents—the margin)

This is where CREATE SOMETHING operates.

### How CREATE SOMETHING Supports WORKWAY

| Property | Old Focus | New Focus (MCP-First) |
|----------|-----------|----------------------|
| **.ltd** | Philosophy of creation | Philosophy of *automation infrastructure*—MCP as chassis |
| **.io** | Research, tools, docs | MCP patterns, reference implementations, SDK research |
| **.space** | Practice, experiments | **The Workbench**—live tools for code execution, motion analysis, data dashboards |
| **.agency** | Client services | **Map → Build → Control**—the creation moat applied to making client workflows safe to delegate |

The hermeneutic circle: Philosophy informs research. Research validates practice. Practice serves clients. Client outcomes test and evolve the philosophy.

**CREATE SOMETHING stays horizontal** (the MCP-first thesis applies to any vertical). **WORKWAY goes vertical** (construction via Procore).


### Shared Vocabulary: AI Interaction Atlas

We adopt the [AI Interaction Atlas](https://github.com/quietloudlab/ai-interaction-atlas) from [quietloudlab](https://quietloudlab.com/) as shared vocabulary for AI interaction design. The Atlas provides six dimensions that map to our architecture:

| Atlas Dimension | Our Implementation |
|-----------------|-------------------|
| **Touchpoints** | MCP Servers |
| **System Tasks** | Cloudflare Workers infrastructure |
| **AI Tasks** | Skills |
| **Human Tasks** | Intelligence Layer oversight |
| **Data Artifacts** | What flows through MCP |
| **Constraints** | Trust boundaries, permissions |

See `docs/MCP_FIRST_THESIS.md` for full strategic context and partnership opportunity.

### The Automotive Framework

**The automation layer = the automotive layer.**

The automotive layer consists of the parts of a vehicle: engine, transmission, fuel tank. Assembled together, they create motion.

The automation layer consists of Cloudflare products + MCP: Workers, Durable Objects, D1, MCP servers. Assembled together, they create outcomes.

| Vehicle Part | Technology | Function | Framework Tier |
|--------------|------------|----------|----------------|
| **Chassis** | MCP Servers | The frame that connects everything | Touchpoints (cross-cutting) |
| **Engine** | Workers | Where execution happens | Automation |
| **Transmission** | Durable Objects | State coordination | Orchestration (cross-cutting) |
| **Fuel Tank** | D1 | Data persistence | Database |
| **Turbocharger** | Workers AI / LLMs | Intelligence boost | Judgment |
| **Cockpit** | Glass UI | Where the driver controls the machine | Judgment (user-controlled) |
| **Instrument Cluster** | Analytics/Logs | At-a-glance telemetry | Insight (cross-cutting) |
| **Ignition** | Triggers | What starts the engine | Orchestration (cross-cutting) |

**The Chassis Principle**: MCP is the chassis—the structural frame that holds everything together. Without the chassis, you have a pile of parts. Without MCP, you have disconnected tools. The chassis is invisible when driving, but essential. That's MCP: the connectivity layer that recedes into transparent use.

**The Cockpit Principle**: The 930's cockpit is driver-centric—tachometer center-mounted, controls angled toward you, minimal decoration. Our Glass design system follows the same philosophy: the interface recedes, and you focus on your destination. That's Zuhandenheit applied to UI.

**"The Parts, Assembled"**: Every workflow is a vehicle built from precision parts. The outcome is motion toward the destination.

### Cornering the Terms

CREATE SOMETHING and WORKWAY together establish ownership of:
- **The Three-Tier Framework** — Database, Automation, Judgment as structural model for agent systems
- **The Automation Layer** — MCP servers that connect tools to AI
- **The Intelligence Layer** — Skills and Agents that produce outcomes
- **The Automotive Framework** — the explanatory metaphor (MCP as chassis)

This is the life's work: building systems that work while you sleep.
