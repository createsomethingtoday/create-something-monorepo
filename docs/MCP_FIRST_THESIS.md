# The MCP-First Thesis

> Research conducted: February 4, 2026
> Updated: July 16, 2026 (Map -> Build -> Control public packaging)
> Context: Strategic pivot for WORKWAY and CREATE SOMETHING

## Executive Summary

**The entry point to automation is connectivity, not intelligence.**

The 20-year CREATE SOMETHING category is **Delegated Work Control**: the control
plane for what delegated workers can do, what waits for approval, what must
stop, who owns the decision, and what evidence proves the work. MCP is the
connectivity and authority substrate inside that category, not the whole
category by itself.

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
| **Reference kits** | Hundreds of reference implementations | Low |

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

Scaffolding tools have *started* to lower the barrier, but they still require:
- CLI/terminal proficiency
- TypeScript or Python knowledge
- Understanding of MCP protocol (JSON-RPC 2.0, stdio/SSE transports)
- Packaging knowledge for distribution

### Strategic Implication

The value is not in **commodity scaffolds** but in **creation expertise** applied
to specific domains. Within Delegated Work Control, custom MCP creation is the
technical moat because it turns tool access into governed workflow boundaries:

```
OLD: Scaffolds → Learning → Services (scaffolds as entry point)
NEW: MCP Servers → Connectivity → Intelligence Layer (creation as entry point)
```

The longer-lived claim is broader than MCP:

```
Delegated Work Control → Map / Build / Control → Policy OS and Atlas contracts → MCP/Skills/runtime artifacts
```

The simplest operating language for that hierarchy is:

```text
Signal → Decision → Proof
```

- **Signal**: a change, request, exception, tool result, message, schema diff,
  or workflow event that may matter.
- **Decision**: the routed judgment by a human, agent, policy, or automation:
  ignore, approve, update docs, request changes, escalate, block, or run.
- **Proof**: the durable record of the evidence, policy, owner, action,
  outcome, and rollback or follow-up path.

This language is the visitor-facing and operator-facing explanation. The
technical architecture still uses Delegated Work Control, Policy OS, Atlas,
MCP, Skills, and runtime artifacts underneath.

### Packaging Rule (Codex Vector)

The go-to-market sequence is explicit:

1. **Standalone definition**: `CREATE SOMETHING Map` on a monthly or yearly cadence.
2. **Implementation bridge**: `CREATE SOMETHING Build` for an approved Map.
3. **Standalone operation**: `CREATE SOMETHING Control`, including Map, with Policy OS as the internal governed contract.
4. **Technical wedge**: `MCP-only` for discovery and compliance-constrained cases.
5. **Vector**: Codex-first setup and demos, with MCP/policy artifacts portable to Claude and Cursor.
6. **Category**: Delegated Work Control.

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

The horizontal category is **Delegated Work Control**. CREATE SOMETHING should
not be positioned as a generic AI agency, prompt engineering shop, model
reseller, or Webflow implementation shop. The durable value is the operating
boundary around delegated work: objects, owners, authority, run/wait/stop
states, receipts, and recovery paths.

For humans in the loop, the product should read as an operating loop:

> Signals come from the tools. Decisions route to the right human or agent.
> Proof records what happened.

The interface language that supports this loop is:

| Surface | Job |
| --- | --- |
| **Inbox** | Shows decisions waiting for action. |
| **Map** | Shows where the decision sits in the workflow and which systems it touches. |
| **Proof** | Shows the evidence, policy, owner, outcome, and receipt trail. |

Atlas is the preferred context surface for the Map, but the operator does not
need to start from a blank canvas. The daily surface should feel like a governed
inbox backed by Atlas context and Proof records.

### Ona as Communication Reference

Ona is the right communication reference for CREATE SOMETHING's public and
operator-facing surfaces: calm hierarchy, sparse claims, visible proof,
compact controls, and an interface that treats AI work as supervised
operations rather than generic chat.

CREATE SOMETHING should not become an Ona-shaped brand. It should stand on the
mapping and implementation side:

| Reference | Center of gravity |
|-----------|-------------------|
| **Ona** | How supervised autonomy should feel to an operator |
| **CREATE SOMETHING** | How supervised autonomy gets mapped, integrated, governed, shipped, and improved |

The product language should borrow Ona's clarity without copying its category.
CREATE SOMETHING speaks through evidence: system maps, MCP boundaries, policy
artifacts, implementation contracts, live workflow surfaces, validation gates,
and delivery proof.

For visitors, this means the public page should be legible before it is
technical: name the category, state the operator outcome, show the proof object,
then reveal the stack. Avoid borrowed market-stat claims or internal
implementation language unless the page also shows the owned evidence behind
the claim.

The operating claim:

> CREATE SOMETHING makes delegated work trustworthy.

The implementation claim remains:

> CREATE SOMETHING turns AI ambition into operational systems.

### Property Roles (Post-Pivot)

Templates are no longer the entry point. **Delegated Work Control** is the
category; **MCP creation expertise** is one of the hard-to-copy capabilities
inside it.

| Property | Old Focus | New Focus (Delegated Work Control) |
|----------|-----------|---------------------------|
| **.ltd** | Philosophy of creation | Philosophy of controlled delegation and automation infrastructure |
| **.io** | Research, tools, docs | MCP, SDK, policy, and proof patterns for builders |
| **.space** | Practice via experiments | **The Workbench** for maps, checks, code execution, and proof tools |
| **.agency** | Client services | Map, Build, and Control for delegated work |

### .agency Service Offerings

| Service | Description | Value |
|---------|-------------|-------|
| **CREATE SOMETHING Map** | Standalone living workflow definition | Workflow, owner, action, stop, and receipt clarity |
| **CREATE SOMETHING Build** | Implementation of an approved Map | Connected owned system, tests, runbook, and handoff |
| **CREATE SOMETHING Control** | Standalone governed execution; includes Map | Managed Signal, Decision, Proof, approvals, and recovery |
| **MCP-only (Discovery/Compliance)** | Limited-scope or read-only connectivity for teams operating agents internally | Fast trust setup with lower autonomy risk |
| **Ongoing Support** | Auth updates, policy tuning, golden-task regressions, new capabilities | Recurring relationship |

**Positioning shift**: From "We build websites/apps with modern stacks" to "We
make delegated work trustworthy." In technical proof surfaces, that becomes "we
build the connectivity and control layer between tools and AI."

### The Hermeneutic Circle

```
.ltd (Philosophy) → articulates "creation > consumption" →
.io (Research) → documents validated patterns for builders →
.space (Workbench) → live tools for building and testing →
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

## Supplier Strategy: Build vs. Delegate

> Updated: February 2026 (Composio evaluation)

Not every integration justifies custom development. The creation moat is in *deep* integrations and the Intelligence Layer — commodity CRUD integrations can be delegated to managed platforms as invisible infrastructure.

### The Decision Matrix

| Client Ask | Build Strategy | Rationale |
|-----------|---------------|-----------|
| Deep domain workflow (QuickBooks GL mapping, scheduling with conflict detection) | **Custom** | Domain logic, Three-Tier alignment, the moat |
| Standard CRUD integration (Slack notifications, HubSpot contacts, Jira tickets) | **Composio** | Managed auth + tool calling, ~90% margin at $29/mo |
| Two-way data synchronization (Notion ↔ HubSpot sync) | **Nango** | Bidirectional sync, webhooks, API unification at $500/mo |
| Vertical-specific (Procore, construction) | **Custom** | Deep vertical = creation moat |

### Classification Heuristic

Ask in order:

1. Does it need **domain-specific logic** beyond CRUD? → **Custom**
2. Does it need **Three-Tier alignment** (Resources + Prompts, not just Tools)? → **Custom**
3. Does it need **two-way data sync** between systems? → **Nango**
4. Is it standard CRUD with managed OAuth? → **Composio**

### The Wrap Pattern

Composio and Nango are **invisible infrastructure**. Clients see CREATE SOMETHING MCP servers. The supplier is plumbing underneath.

```
Client Request → CREATE SOMETHING MCP Server (mcp-core)
                    ├── Intelligence Layer (Skills, Agents) ← Our code, our margin
                    ├── Three-Tier alignment ← Our framework
                    └── Composio/Nango SDK (internal) ← Swappable plumbing
```

**Invariants**:
- Client never knows the supplier exists
- mcp-core is always the server framework
- Intelligence Layer is always custom
- Control is the public governed product; Policy OS remains its internal package contract
- Supplier is swappable (MIT-licensed SDK, wrapper pattern = contained blast radius)

### Supplier Comparison

| Dimension | Composio ($29-229/mo) | Nango ($50-500/mo) | Custom ($0 vendor) |
|-----------|-----------------------|--------------------|--------------------|
| **Use case** | AI agent tool calling | Data synchronization | Deep domain workflows |
| **Auth** | Managed OAuth for 500+ apps | Managed OAuth + sync | Own OAuth patterns |
| **MCP primitives** | Tools only | Tools + sync layer | All three (Resources, Tools, Prompts) |
| **Depth** | Shallow CRUD | Medium (sync logic) | Deep (domain logic) |
| **Edge deployment** | Workers-compatible (TBD) | Cloud-hosted | Native Workers |
| **Margin impact** | ~90% on standard integrations | ~80% on sync integrations | ~60-70% but higher absolute |

### Red Lines

- **Never** list suppliers as partners on .agency site
- **Never** expose supplier SDK directly to clients
- **Never** use suppliers for core moat integrations (QuickBooks, scheduling, substrate, Procore)
- **Never** depend on supplier uptime for client SLAs on critical paths

### Implementation

The `@create-something/composio-bridge` package provides the wrap pattern adapter. See `docs/internal/COMPOSIO_EVALUATION.md` for the full vendor evaluation and `packages/composio-bridge/` for the implementation.

---

## Positioning Statements

**WORKWAY**:
> "The Automation Layer for Construction. Connect Procore to AI. Get outcomes while you sleep."

**CREATE SOMETHING**:
> "We build the connectivity and outcome layers between your tools and AI."

**The Creation Moat** (internal):
> "MCP consumption is commoditized. MCP creation is not. We create."

### Property Taglines (Updated)

| Property | Old | New |
|----------|-----|-----|
| **.ltd** | Philosophy of creation | The philosophy of automation infrastructure |
| **.io** | Research and tools | MCP patterns for builders |
| **.space** | Practice and experiments | The Workbench — live tools |
| **.agency** | Client services | Custom MCP development |

---

## Next Steps

### WORKWAY (Vertical)
1. [ ] Build deep Procore MCP server (beyond data retrieval)
2. [ ] Develop construction-specific Skills
3. [ ] Identify pilot construction companies for validation

### CREATE SOMETHING (Horizontal - Creation Moat)
1. [ ] Update .io content: focus on MCP *creation* patterns, not consumption
2. [x] Redefine .space as The Workbench — live tools, not articles
3. [x] Define .agency product family: Map, Build, and Control; retain MCP-only and Policy OS as technical contracts
4. [ ] Publish client contract templates: `mcp_contract.yaml`, `agent_contract.yaml`, `outcome_contract.md`
5. [ ] Build reference MCPs for common integration patterns (CRM, project management, etc.)
6. [ ] Document the creation moat thesis on .ltd

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

## The Three-Tier Framework

The MCP-First Thesis describes the *go-to-market* model: MCP servers as entry point (trust), Intelligence Layer as upsell (outcomes). The **Three-Tier Framework** provides the *architectural* depth underlying this thesis.

The framework identifies three tiers that map directly to MCP's primitives:

| Tier | MCP Primitive | Control Model | Role |
|------|---------------|---------------|------|
| **Database** | Resources | Application-controlled | What exists — state, content, record |
| **Automation** | Tools | Model-controlled | What happens — agent execution, skills |
| **Judgment** | Prompts | User-controlled | What should happen — policy, oversight |

**Key insight**: MCP's control model distinctions (application/model/user-controlled) naturally produce the tier separations. The *who decides* and the *what kind of work* converge.

**The recursive property**: MCP's sampling mechanism allows Tools to request LLM access back through the Client. Automation can invoke Judgment, creating a feedback loop that mirrors embodied cognition.

**Policy as artifact**: System prompts, constraints, and behavioral rules are not external scaffolding — they are artifacts that flow through the tiers, enabling versioned constraints, context-driven policy selection, and reflexive self-modification under human oversight.

The Two-Layer Model remains valid as a go-to-market abstraction. The Three-Tier Framework reveals the structural model underneath.

See `docs/THREE_TIER_FRAMEWORK.md` for the full treatment (v1.3, February 2026).

---

## Sources

- OpenAI Codex App announcement (February 2, 2026)
- Anthropic Claude Cowork announcement (January 12, 2026)
- Anthropic MCP announcement (November 2024)
- Agent Skills specification (agentskills.io)
- AI Interaction Atlas (quietloudlab)
- Procore API documentation
- Construction industry AI adoption research (multiple sources)
