# The MCP-First Thesis

> Research conducted: February 4, 2026
> Updated: February 4, 2026 (Creation Moat pivot)
> Context: Strategic pivot for WORKWAY and CREATE SOMETHING

## Executive Summary

**The entry point to automation is connectivity, not intelligence.**

MCP (Model Context Protocol) has emerged as the universal connector layer for AI. The pattern from Claude Cowork, Codex App, and industry adoption (100M+ monthly downloads) is clear:

1. **MCP servers establish trust** (controlled, permissioned access)
2. **Skills provide capabilities** (reusable, portable across platforms)
3. **Agents produce outcomes** (the monetizable layer)

This inverts the common assumption that you build an AI agent first, then add integrations.

---

## The Creation Moat

**MCP consumption is commoditized. MCP creation is not.**

### What's Commoditized (Low Value)

| Capability | Tools Available | Barrier |
|------------|-----------------|---------|
| **Installing** MCP servers | Desktop Extensions (`.mcpb`), one-click install | None |
| **Using** MCP servers | Claude Desktop, Codex, Cursor, VS Code | None |
| **Scaffolding** MCP projects | `create-mcp-server`, `mcp-forge`, `mcptools`, `mcp-generator-cli` | Low |
| **Templates** | Hundreds of reference implementations | Low |

### What's Not Commoditized (High Value)

| Capability | Why It's Hard | Who Can Do It |
|------------|---------------|---------------|
| **Understanding** *what* MCP to build | Requires domain expertise + MCP knowledge | Few |
| **Custom MCP development** | Protocol knowledge, auth integration, error handling | Developers |
| **Integration** with existing systems | Data mapping, security boundaries, API quirks | Experienced teams |
| **Intelligence Layer** (Skills/Agents) | Prompt engineering, workflow design, testing | Specialists |

### The Key Insight

Neither Claude Desktop, Claude Cowork, nor Codex can **create** MCP servers from within the app. Users can *use* MCPs, *install* MCPs, but not *build* them without leaving the AI interface and entering a development environment.

**This is the moat.**

Templates and scaffolding tools have *started* to lower the barrier, but they still require:
- CLI/terminal proficiency
- TypeScript or Python knowledge
- Understanding of MCP protocol (JSON-RPC 2.0, stdio/SSE transports)
- Packaging knowledge for distribution

### Strategic Implication

The value is not in **templates** (commoditized) but in **creation expertise** applied to specific domains. CREATE SOMETHING pivots all properties toward this:

```
OLD: Templates → Learning → Services (templates as entry point)
NEW: MCP Servers → Connectivity → Intelligence Layer (creation as entry point)
```

---

## The Two-Layer Model

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
```

### Alignment with AI Interaction Atlas

This model aligns with the [AI Interaction Atlas](https://github.com/quietloudlab/ai-interaction-atlas) from [quietloudlab](https://quietloudlab.com/)—an open-source taxonomy for AI interaction design created by Brandon Harwood.

The Atlas provides vocabulary for reasoning about AI systems "beyond 'User → Model → Output'":

| Atlas Dimension | MCP-First Mapping |
|-----------------|-------------------|
| **Touchpoints** | MCP Servers — *where interactions happen* |
| **System Tasks** | MCP infrastructure — *routing, logging, state* |
| **AI Tasks** | Skills — *classify, generate, verify, transform* |
| **Human Tasks** | Intelligence Layer oversight — *review, approve, edit* |
| **Data Artifacts** | What flows through MCP — *Procore data, RFIs, daily logs* |
| **Constraints** | Trust boundaries — *permissions, latency, cost, privacy* |

**Potential Partnership**: quietloudlab (Dallas, TX) and CREATE SOMETHING (DFW area) share a thesis: AI interaction design is an emerging discipline that needs shared vocabulary and open standards. The Atlas provides vocabulary; MCP provides protocol; Agent Skills provides capability spec. There may be opportunity for collaboration—quietloudlab on design/vocabulary, CREATE SOMETHING on implementation/infrastructure.

### Why MCP is the Entry Point

| Reason | Explanation |
|--------|-------------|
| **Trust before intelligence** | Users grant folder/API access first. They control what AI sees. |
| **Open = adoption velocity** | MCP is open-source, low friction. 100M monthly downloads. |
| **Lock-in through connectivity** | Own the data graph, own the relationship. |
| **Intelligence is the upsell** | Skills and Agents are the monetizable premium layer. |

---

## Market Validation (February 2026)

### Recent Announcements

**Codex macOS App (February 2, 2026)** - OpenAI's "command center" for coding agents:
- Multi-agent parallel execution with worktree isolation
- Skills framework for reusable capabilities
- MCP integration with "smart approvals enabled by default"
- Automations for scheduled background workflows

**Claude Cowork (January 12, 2026)** - "Claude Code without the code":
- Built on the Claude Agent SDK
- Folder-based permission model for non-technical users
- Uses MCP for native connections to enterprise tools
- Built by Anthropic in ~10 days using Claude Code itself

### Universal MCP Adoption

| Platform | MCP Status |
|----------|------------|
| OpenAI Codex | MCP integration with explicit approval prompts |
| Claude Desktop/Cowork | Native MCP support |
| Microsoft VS Code | Agent Skills integration |
| GitHub Copilot | Skills support via MCP |
| Cursor | MCP tool loading |
| Amp, OpenCode, Letta | Compatible skill loading |

**Agent Skills** (agentskills.io) is now the open standard for modular AI capabilities.

---

## WORKWAY: The Automation Layer for Construction

### Why Construction

| Metric | Data |
|--------|------|
| Projects with delays/overruns | **98%** |
| Average cost increase over budget | **80%** |
| Worker time lost to non-productive tasks | **35%** |
| Weekly hours wasted on manual data entry | **20-40 hours** |
| Annual US construction inefficiency cost | **$30-40 billion** |
| Construction companies using AI | **4%** (vs 12% manufacturing) |

### Why Procore

- Dominant construction management platform
- 500+ integrations (but users report "integration nightmares")
- Open API, ready for MCP connectivity
- Existing basic MCP servers are shallow (just data retrieval)

### The WORKWAY Play

```
┌─────────────────────────────────────────────────────────────┐
│                    THE AUTOMATION LAYER                     │
│                      for Construction                       │
├─────────────────────────────────────────────────────────────┤
│  ENTRY POINT: Open-Source Procore MCP Server               │
│  ├── RFI workflows, submittal tracking                      │
│  ├── Change order processing                                │
│  ├── Daily log synthesis                                    │
│  └── Pay application automation                             │
├─────────────────────────────────────────────────────────────┤
│  UPSELL: Intelligence Layer (Skills + Agents)               │
│  ├── Skills: Draft RFIs, generate daily reports            │
│  ├── Agents: Flag compliance issues, predict delays        │
│  └── Automations: Follow-ups that happen while you sleep   │
└─────────────────────────────────────────────────────────────┘
```

### Construction-Specific Skills

| Skill | What It Does | Pain Addressed |
|-------|--------------|----------------|
| `draft-rfi` | Generate RFIs from specs + conversation | Hours spent writing requests |
| `daily-log-summary` | Synthesize daily logs into exec reports | 35% time on non-productive tasks |
| `change-order-impact` | Analyze CO impact on schedule + budget | 80% cost overruns |
| `submittal-review` | Flag non-compliant submittals | Rework cycles |
| `pay-app-prep` | Draft pay applications from progress | 89% late payment friction |

---

## CREATE SOMETHING: Philosophy and R&D

CREATE SOMETHING stays **horizontal** (the MCP-first thesis applies to any vertical).
WORKWAY goes **vertical** (construction via Procore).

### Property Roles (Post-Pivot)

Templates are no longer the entry point. **MCP creation expertise** is.

| Property | Old Focus | New Focus (Creation Moat) |
|----------|-----------|---------------------------|
| **.ltd** | Philosophy of creation | Philosophy of *automation infrastructure*—articulate why creation > consumption |
| **.io** | Research, tools, docs | MCP patterns, SDK research, reference implementations for *builders* |
| **.space** | Practice via templates | MCP server experiments, integration patterns—*not* template tutorials |
| **.agency** | Client services (templates) | **Custom MCP development**—the creation moat as a service |

### .agency Service Offerings

| Service | Description | Value |
|---------|-------------|-------|
| **MCP Audit** | What MCPs would unlock value for your business? | Strategic clarity |
| **Custom MCP Development** | Build the server, package as `.mcpb` | The creation moat |
| **Intelligence Layer** | Skills and Agents on top of your MCPs | The margin |
| **Ongoing Support** | Auth updates, API changes, new capabilities | Recurring relationship |

**Positioning shift**: From "We build websites/apps with modern templates" to "We build the connectivity layer between your tools and AI."

### The Hermeneutic Circle

```
.ltd (Philosophy) → articulates "creation > consumption" →
.io (Research) → validates with real MCP server development →
.space (Practice) → experiments with MCP patterns (not template tutorials) →
.agency (Services) → delivers custom MCPs to clients →
.ltd (Philosophy) → refined by what creation work actually reveals
```

---

## The Automotive Framework (Extended)

MCP is the **chassis**—the structural frame that holds everything together.

| Vehicle Part | Technology | Function |
|--------------|------------|----------|
| **Chassis** | MCP Servers | The frame that connects everything |
| **Engine** | Workers | Where execution happens |
| **Transmission** | Durable Objects | State coordination |
| **Fuel Tank** | D1 | Data persistence |
| **Turbocharger** | Workers AI / LLMs | Intelligence boost |
| **Cockpit** | Glass UI | Driver controls |
| **Ignition** | Triggers | What starts the engine |

**The Chassis Principle**: Without the chassis, you have a pile of parts. Without MCP, you have disconnected tools. The chassis is invisible when driving, but essential.

---

## Competitive Landscape

### MCP Creation Tools (Commoditizing Layer)

| Tool | Language | What It Does |
|------|----------|--------------|
| **mcptools** (`mcp` CLI) | TypeScript | Swiss Army Knife: scaffold, test, mock, manage configs |
| **create-mcp-server** | TypeScript | Official scaffolding fork |
| **mcp-forge** | Python | Full Python project scaffolding |
| **mcp-generator-cli** | Any | Scans existing APIs → generates MCP server |
| **generator-mcp** (Yeoman) | TypeScript | VS Code debugging included |
| **Desktop Extensions** (`.mcpb`) | Any | One-click installation packaging |

**Implication**: Scaffolding is table stakes. The moat is not *starting* an MCP server—it's *understanding what to build* and *integrating deeply*.

### Horizontal Players (MCP Infrastructure)
- WORKWAY/CREATE SOMETHING (creation expertise + vertical depth)
- viaSocket, Appy Pie (low-depth integrations)
- LangChain Agent Builder (framework, not creation services)

### Vertical Players (Deep Domain Agents)
- **Auctor** — Enterprise implementations (YC S25)
- **Construction AI** — Visual aid for Procore drawings
- Various startups per vertical

### The Opportunity

1. **Scaffolding tools lower the floor** but don't raise the ceiling
2. **Existing Procore MCP servers are shallow**—data retrieval only
3. **No-code MCP builders don't exist** in Claude Desktop, Cowork, or Codex
4. **Creation expertise + domain knowledge** is the defensible position

The gap: Deep, workflow-aware MCP servers + Intelligence Layer, built by teams who understand both MCP protocol *and* the domain.

---

## Positioning Statements

**WORKWAY**:
> "The Automation Layer for Construction. Connect Procore to AI. Get outcomes while you sleep."

**CREATE SOMETHING**:
> "We build the connectivity layer between your tools and AI."

**The Creation Moat** (internal):
> "MCP consumption is commoditized. MCP creation is not. We create."

### Property Taglines (Updated)

| Property | Old | New |
|----------|-----|-----|
| **.ltd** | Philosophy of creation | The philosophy of automation infrastructure |
| **.io** | Research and tools | MCP patterns for builders |
| **.space** | Practice and experiments | MCP integration experiments |
| **.agency** | Client services | Custom MCP development |

---

## Next Steps

### WORKWAY (Vertical)
1. [ ] Build deep Procore MCP server (beyond data retrieval)
2. [ ] Develop construction-specific Skills
3. [ ] Identify pilot construction companies for validation

### CREATE SOMETHING (Horizontal - Creation Moat)
1. [ ] Update .io content: focus on MCP *creation* patterns, not consumption
2. [ ] Deprecate .space template tutorials; replace with MCP integration experiments
3. [ ] Define .agency service packages: MCP Audit, Custom MCP Dev, Intelligence Layer
4. [ ] Build reference MCPs for common integration patterns (CRM, project management, etc.)
5. [ ] Document the creation moat thesis on .ltd

### Positioning
1. [ ] Update all property taglines to reflect "creation > consumption"
2. [ ] Create case studies around custom MCP development (when available)
3. [ ] Explore partnership with quietloudlab (Atlas vocabulary + our implementation)

---

---

## The Open Standards Ecosystem

We're not building in isolation. The industry is converging on open standards:

| Layer | Open Standard | Owner | Status |
|-------|---------------|-------|--------|
| **Vocabulary** | AI Interaction Atlas | quietloudlab | Open-source, Apache 2.0 |
| **Protocol** | Model Context Protocol (MCP) | Anthropic | Open-source, 100M+ downloads |
| **Capabilities** | Agent Skills | Anthropic + community | Open-source, adopted by OpenAI, Microsoft, Cursor |
| **Runtime** | Cloudflare Workers | Cloudflare | Edge infrastructure |

### Why Open Standards Matter

1. **Portability**: Skills built for Claude work with Codex, Cursor, etc.
2. **Trust**: Open protocols are auditable—enterprises can verify what AI accesses
3. **Network effects**: More adopters → more tools → more value
4. **Defensibility**: We compete on implementation quality, not protocol lock-in

### Partnership Opportunity: quietloudlab

[Brandon Harwood](https://quietloudlab.com/) created the AI Interaction Atlas to provide "a shared language for designing and communicating AI experiences." He's based in Dallas, TX.

**quietloudlab's thesis** (from their site):

> *"AI systems are designed at the wrong level of abstraction. Teams say 'add an agent' or 'use an LLM' instead of asking what matters: What's probabilistic vs. deterministic? Where does human judgment remain essential? What constraints govern safety and trust?"*

This is the MCP-first thesis in different words. Both reject "User → Model → Output" thinking.

**quietloudlab Areas of Practice**:

| Area | Their Framing | Our Alignment |
|------|---------------|---------------|
| **Legible Systems** | "A system cannot be governed if it cannot be seen" | MCP makes AI access visible and auditable |
| **Human–AI Co-Creativity** | "Human-in-the-loop by default" | Intelligence Layer with human oversight |
| **Constraints as Design Material** | "Friction is often a feature" | Trust boundaries, permissions in MCP |
| **Tools for Thoughtful Work** | "Sensemaking over raw speed" | Zuhandenheit—tools that recede |

**The complementarity**:

| quietloudlab | CREATE SOMETHING / WORKWAY |
|--------------|---------------------------|
| Strategy work (before/during build) | Implementation (the actual build) |
| Vocabulary + frameworks (Atlas) | Protocol + infrastructure (MCP + Workers) |
| "Make assumptions visible" | "Make outcomes automatic" |
| Consulting model (engagements) | Product model (MCP servers + Skills) |
| Any industry (horizontal) | Construction via Procore (vertical) |

**Handoff scenario**:
```
quietloudlab "Before the Build" engagement
  → Map the AI system, identify constraints, use Atlas vocabulary
              ↓
CREATE SOMETHING / WORKWAY
  → Build MCP servers and Skills based on that map
              ↓
Client outcome
  → Legible, auditable AI automation that works while you sleep
```

**Potential collaboration vectors**:
- Atlas-informed MCP server design (naming, interaction patterns)
- Shared content (Atlas → .io research, .space tutorials)
- Joint positioning on the "AI interaction design" category
- DFW-based AI infrastructure partnership
- quietloudlab strategy → CREATE SOMETHING implementation pipeline

---

## Sources

- OpenAI Codex App announcement (February 2, 2026)
- Anthropic Claude Cowork announcement (January 12, 2026)
- Anthropic MCP announcement (November 2024)
- Agent Skills specification (agentskills.io)
- AI Interaction Atlas (quietloudlab)
- Procore API documentation
- Construction industry AI adoption research (multiple sources)
