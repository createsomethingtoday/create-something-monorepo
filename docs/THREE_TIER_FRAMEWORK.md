# The Three-Tier Framework: Database, Automation, Judgment

**A structural model for agent systems, realized through Model Context Protocol**

> Version 1.3 — February 2026
> With contributions from Joey (Senior System Architect, Anthropic)
> WORKWAY · CREATE SOMETHING · Half Dozen Solutions

---

## Abstract

This framework proposes a hierarchical ontology for understanding and building agent systems. It identifies three distinct tiers—Database, Automation, and Judgment—connected by typed Artifacts and spanning four cross-cutting concerns: Touchpoints, Artifacts, Orchestration, and Insight.

The Model Context Protocol (MCP) encapsulates this structure naturally: its three primitives (Resources, Tools, Prompts) map directly to the three tiers. More precisely, MCP's **control model distinctions**—application-controlled, model-controlled, user-controlled—produce the tier separations. The *who decides* and the *what kind of work* converge.

Critically, the framework is not a simple stack. MCP's **sampling** mechanism reveals a recursive property: Automation can request Judgment, creating a feedback loop. This mirrors embodied cognition—the body doesn't just execute commands; it participates in thinking by encountering the world and asking for judgment.

The framework's most significant implication: **policy itself is an artifact**. System prompts, constraints, and behavioral rules flow through the same tiers as any other data—stored in Database, transformed by Automation, evaluated by Judgment. This enables versioned constraints, context-driven policy selection, and reflexive self-modification under human oversight.

---

## The Framework

![Three-Tier Framework](designs/three-tier-framework-main.png)

---

## Definitions

### Database Layer

**What exists.** The substrate of state, content, and record. This layer contains everything that can be touched, queried, or persisted: databases, applications, payment systems, websites, files, API endpoints exposing data.

**Control model: Application-controlled.** The client application (not the model, not the user) decides when to fetch data and inject it into context. This is infrastructure-level decision-making.

In MCP terms, this is the **Resources** primitive—content and data that agents can read and reference.

### Automation Layer

**What happens.** The agentic layer where LLM-driven functions execute. This includes tools, skills, and the harness that constrains agent behavior. Automation is specifically *model-controlled*—the LLM decides when to invoke tools during its reasoning process.

The "harness" and "ethos" of an agent belong here—not as external observation, but as constitutive rules that define what the agent can and cannot do.

**Control model: Model-controlled.** The LLM decides when to invoke tools during its reasoning process. The agent is in the driver's seat for action selection. This distinguishes Automation from Orchestration (procedural, application-controlled flow).

In MCP terms, this is the **Tools** primitive—functions that agents can invoke to take action.

### Judgment Layer

**What should happen.** The policy layer where constraints, weights, and human oversight determine quality and priority. This is where decisions get made about correctness, relevance, and appropriate action.

Human judgment and algorithmic evaluation occupy the same functional role here. Both are asking: given this input, what is the right output? Policy defines the boundaries; the Insight concern (cross-cutting) makes the application of that policy legible.

**Control model: User-controlled.** The human explicitly selects templates, constraints, and guidance. This is not automatic—it requires intentional choice about how the system should behave.

In MCP terms, this is the **Prompts** primitive—templates and constraints that shape how agents reason and respond.

### Artifacts

**What flows between layers.** Typed payloads that move through the system: RFI objects, submittal payloads, log summaries, decision records. Artifacts are the boundary contracts between tiers—they can be versioned, validated at transitions, and observed in flight.

### Touchpoints

**Where interaction happens.** The MCP server surface that spans all tiers. Every URI, webhook endpoint, embedded interface, and API surface is a touchpoint. This is not a layer but a cross-cutting concern—the membrane through which external systems (and humans) interact with the framework.

### Orchestration

**How execution flows.** The procedural coordination that connects tiers and sequences operations. This includes workflows, triggers, cron jobs, webhook handlers—anything that follows predetermined paths without requiring LLM reasoning.

Orchestration is application-controlled (like Database) but distinct in function: Database stores, Orchestration sequences. In MCP terms, this is the **Client** role—the coordinator that manages connections to servers, decides what to fetch, and routes artifacts between tiers.

This distinguishes procedural automation (deterministic, testable with traditional tools) from agentic automation (probabilistic, model-controlled). Both live in the system; only the agentic portion maps to MCP Tools.

### Insight

**How the system perceives itself.** The perceptual membrane that makes execution legible: observability, human-in-the-loop approval, audit trails, confidence scores, reasoning traces.

Insight is not a processing tier—it doesn't do work the way tiers do. It watches work being done. It's the reflexive loop that enables the system to observe its own operation and surface understanding to humans.

Without Insight, policy modification is blind mutation. With Insight, every policy selection is traced, every constraint change is logged, and the system perceives itself choosing constraints.

---

## MCP as Encapsulation

The Model Context Protocol defines three server primitives, each with a distinct **control model**—who decides when the primitive is used:

| MCP Primitive | Control Model | Description |
|---------------|---------------|-------------|
| **Resources** | Application-controlled | The client application decides when to fetch and inject data into context |
| **Tools** | Model-controlled | The LLM decides when to invoke functions during reasoning |
| **Prompts** | User-controlled | The human explicitly selects templates to guide interaction |

MCP also defines **Sampling**—a mechanism that allows Tools to request LLM access back through the Client. This creates the feedback loop where Automation can invoke Judgment.

This control model distinction is the key. MCP's designers separated primitives by *who decides*. The framework separates tiers by *what kind of work* they do. They converge because the **who** and the **what** are correlated:

| MCP Primitive | Control Model | Framework Tier | Rationale |
|---------------|---------------|----------------|-----------|
| **Resources** | Application-controlled | Database | Data decisions are infrastructure concerns—what exists and when to surface it |
| **Tools** | Model-controlled | Automation | Action decisions are agent reasoning—what happens and when to execute |
| **Prompts** | User-controlled | Judgment | Policy and guidance decisions are human oversight—what should happen and why |

The mapping is not accidental. MCP's control model distinctions naturally produce the tier separations:

![Control Models](designs/three-tier-control-models.png)

When building on MCP, you are instantiating this framework directly:

- Workers exposing **Resources** → Database Layer (application-controlled data)
- Workers exposing **Tools** → Automation Layer (model-controlled actions)
- **Prompts** and skill definitions → Judgment Layer (user-controlled guidance)
- **Sampling** requests → Feedback loop (Automation requesting Judgment)
- MCP server endpoints → Touchpoints
- JSON schemas and structured outputs → Artifacts

The framework is not an abstraction imposed on MCP—it is the structure that MCP's control model distinctions already assume.

---

## The Control Model Hierarchy

The control models form a hierarchy of decision-making authority:

![Control Model Hierarchy](designs/three-tier-hierarchy.png)

This hierarchy explains why the tiers exist:

1. **Users set boundaries** — Through prompt selection, users define the operating constraints. This is the Judgment layer: policy, ethics, acceptable outcomes.

2. **Models act within boundaries** — The agent reasons and selects tools, but only within the space the user has defined. This is the Automation layer: execution, skill invocation, agentic work.

3. **Applications provide substrate** — The infrastructure makes data available (or not), independent of what the model wants. This is the Database layer: state, records, content that exists.

The hierarchy also explains failure modes:

- **Judgment failures**: Wrong prompt selected, poor constraints, misaligned ethos → agent acts correctly but produces wrong outcomes
- **Automation failures**: Tool errors, skill bugs, agent mistakes → agent has right constraints but execution fails
- **Database failures**: Missing data, stale state, unavailable resources → agent can't act because substrate is broken

Debugging follows the hierarchy: check Database first (is data there?), then Automation (did execution work?), then Judgment (was policy correct?).

---

## The Recursive Property: Sampling as Feedback Loop

The framework is not a simple stack. MCP's **sampling** mechanism reveals that the hierarchy is actually a cycle with directional flow.

### What Sampling Does

Sampling allows a Tool (MCP server) to request LLM access back through the Client. The tool says: "I need judgment to complete my work." The client proxies that request up to the LLM and returns the result.

![Sampling Feedback Loop](designs/three-tier-sampling-loop.png)

### The Flow

1. **User** selects prompts, constraints (Judgment layer)
2. **Agent** reasons and decides to call a tool (Automation layer)
3. **Tool** executes, but needs LLM judgment to complete its work
4. **Tool** sends sampling request back to client
5. **Client** proxies request to LLM (Judgment layer)
6. **LLM** returns result to client
7. **Client** forwards result to tool
8. **Tool** completes and returns to agent

The tool doesn't need its own LLM configuration—it piggybacks on the client's. This is why Samuel Colvin (Pydantic) calls it "extremely powerful": you can build MCP servers that perform agentic work without each server needing independent LLM access.

### Why This Matters Architecturally

Without sampling, every tool that needs judgment must:
- Configure its own LLM access
- Manage its own API keys and rate limits
- Bear its own inference costs
- Duplicate context that the main agent already has

With sampling, the tool delegates judgment back to the system that called it. The client becomes a shared resource for reasoning.

### Embodied Cognition Parallel

This recursive property mirrors what phenomenologists observed about human cognition:

**Heidegger**: Cognition isn't a separate layer commanding the body—it's enacted through embodied action. The body isn't just executing; it's informing cognition through its encounters with the world.

**Merleau-Ponty**: Perception shapes thought as much as thought shapes action. The sensorimotor system doesn't just receive commands; it participates in cognition.

**The parallel**: In the three-tier framework, Automation (the body/tools) doesn't just execute commands from Judgment. Through sampling, Automation can request Judgment. The tool encounters something in the world (Database) and needs judgment to proceed—so it asks.

This is why the intuition that "something is above Judgment" is both right and wrong:
- **Wrong** because there's no fourth layer
- **Right** because the system is recursive—Judgment sits "above" itself through the feedback loop

### Implications for Design

**Context window management**: Colvin's example shows a research agent that calls a BigQuery tool. The tool has its own system prompt with SQL schema details. If that context lived in the main agent, it would bloat every request. By isolating it in the tool and using sampling, the main agent stays lean.

**Cost distribution**: The main client bears LLM costs, but tools can contribute specialized context. This is more efficient than each tool paying for its own inference.

**Trust boundaries**: The client controls what sampling requests it honors. A tool can ask for LLM access, but the client decides whether to grant it. This maintains the user-controlled property of Judgment while allowing Automation to participate.

---

## Policy as Artifact

The framework's most significant implication: **policy is not external to the system—it is an artifact that flows through the tiers.**

### The Conventional View

Most agent architectures treat policy (system prompts, constraints, ethos) as fixed scaffolding—written once, applied always. Policy sits outside the system. It constrains but does not participate. A "harness" is one implementation of this: fixed rules that bound agent behavior.

### The Artifact View

In the three-tier framework, policy is data that flows through the same tiers as any other artifact:

![Policy as Artifact](designs/three-tier-policy-artifact.png)

The tiers operate on policy just as they operate on any artifact:

| Tier | Policy Operation |
|------|------------------|
| **Database** | Stores policy versions (prompts, constraints, ethos as versioned data) |
| **Automation** | Transforms/requests policy (tool asks "give me the strict constraints" via sampling) |
| **Judgment** | Evaluates which policy to apply (selects constraints appropriate to context) |

### What This Enables

**Policy versioning**: Multiple constraint sets coexist as stored artifacts. A financial compliance policy. A creative exploration policy. A debugging policy. Version-controlled, auditable, selectable at runtime.

**Context-driven selection**: A tool encountering sensitive data can request (via sampling) the appropriate policy. "I'm about to handle PII—give me the strict constraints." The client evaluates and returns the right policy for the moment.

**Graduated trust**: Different operations invoke different constraint levels. Read operations get permissive policy. Write operations get restrictive policy. Delete operations require human approval policy. Policy isn't uniform—it's contextual.

**Self-modification through the loop**: The system can observe its own policy, request modifications through sampling, and apply new constraints. This isn't unconstrained self-modification—the Judgment layer (user-controlled) still decides what modifications to honor.

### Multi-Agent Coordination

When multiple agents coordinate (via systems like Beads, Loom, or Agent Mail), they're not just passing task artifacts—they're passing policy artifacts.

**Agent A** (financial analysis) → passes policy artifact: "PII handling required" → **Agent B** (data processing) → applies received constraints, processes under financial compliance policy → **Agent C** (reporting)

The coordination layer isn't a fourth tier above Judgment. It's artifact-passing at the Judgment level. Agents share:

- **Task artifacts**: what to do
- **Context artifacts**: what's known
- **Policy artifacts**: how to behave

This is why coordination systems like Beads (Yegge) work: they give agents shared memory that includes behavioral constraints, not just task state. Policy propagates through the agent graph as data.

### Insight as Self-Perception

If policy is an artifact the system can modify, the Insight concern becomes essential—not as an MCP primitive, but as the perceptual loop that makes self-modification legible.

Without Insight:
- Policy changes are blind mutations
- No audit trail of constraint evolution
- No ability to diagnose behavioral drift

With Insight:
- Every policy selection is traced
- Constraint changes are logged with context
- The system perceives itself modifying itself

This is the reflexive loop that embodied cognition predicts: the body (Automation) doesn't just act—it perceives its own acting. The system doesn't just apply constraints—it watches itself choosing constraints.

### The Risk

Self-modifying policy introduces risk. A system that can request looser constraints might game itself into unsafe behavior.

Mitigations:

1. **User-controlled ceiling**: Judgment layer (Prompts) remains user-controlled. The system can request policy changes, but humans define what's requestable.

2. **Policy immutability tiers**: Some constraints are mutable (formatting preferences), some are immutable (safety boundaries). Store them differently in Database.

3. **Insight as governance**: Every policy modification is logged. Anomaly detection on constraint drift. The perceptual loop becomes the audit trail.

The framework doesn't solve this risk—it names it and provides the vocabulary to reason about it.

---

## Properties

### Causality

The framework captures dependency: Database feeds Automation feeds Judgment. You cannot have judgment without process, cannot have process without substrate. This is not just organization—it's a debugging heuristic.

When a system fails, ask:
1. Did the Database layer fail to provide data?
2. Did Automation execute incorrectly?
3. Did Judgment apply wrong policy?

### Blurriness

The boundaries between tiers are elastic, not rigid. An agent with tools and skills running in the background is already making judgments—the policy is embedded in how it decides which tool to call. The three tiers are a spectrum, with boundaries getting blurry as agents get more capable.

This blurriness is a feature, not a bug. It reflects the reality that sophisticated automation contains embedded judgment, and that judgment requires automation to act. The sampling mechanism makes this explicit: a tool can request judgment, collapsing the boundary between Automation and Judgment for that moment.

### Brittleness vs. Variety

A deep, type-safe monorepo where all three tiers share a unified stack (e.g., Cloudflare Workers, TypeScript end-to-end) gives speed and correctness guarantees, but creates a single point of conceptual failure.

A polyglot stack with more variety is more resilient (different failure modes don't cascade the same way) but introduces translation costs at every Artifact boundary.

The framework does not prescribe which approach to take—it provides the vocabulary to reason about the tradeoff.

---

## Implementation: Cloudflare-First Architecture

For a unified stack approach using Cloudflare:

| Framework Element | Cloudflare Service |
|-------------------|-------------------|
| Database Layer | D1, KV, R2, Durable Objects |
| Automation Layer | Workers, Workflows, Queues |
| Judgment Layer | Workers AI, External LLM APIs |
| Touchpoints | Worker endpoints, MCP servers |
| Orchestration | Workers (procedural), Workflows |
| Insight | Logpush, Analytics, custom tracing |
| Artifacts | JSON schemas, structured outputs |

This provides type-safety from Database through Judgment, with MCP servers as the Touchpoint surface.

---

## Relationship to Existing Taxonomies

### AI Interaction Atlas (quietloudlab)

The Atlas provides six co-equal dimensions: AI Tasks, Human Tasks, System Tasks, Data Artifacts, Constraints, Touchpoints. This gives vocabulary but not reasoning structure.

This framework absorbs two contributions from the Atlas:
1. **Touchpoints as cross-cutting concern** — explicitly named, not implicit
2. **Artifacts as boundary contracts** — the connective tissue between layers

The Atlas should move toward hierarchical structure; the framework should absorb the Atlas's naming precision.

### NIST AI Use Taxonomy

NIST's taxonomy focuses on human-AI activities from a usability perspective. This framework complements it by providing the structural model underneath—what enables those activities.

---

## Applications

### Workflow Automation (WORKWAY)

- Database: Procore projects, RFIs, daily logs, submittals
- Automation: AI skills (draft RFI, summarize logs, review submittals)
- Judgment: Policy definitions, human approval gates, trust boundaries
- Orchestration: Workflow triggers, webhook handlers, notification dispatchers
- Insight: Execution traces, approval audit logs, confidence scores
- Touchpoints: MCP server endpoints for Procore, Slack, email
- Artifacts: RFI objects, summary reports, compliance flags

### Custom MCP Development (CREATE SOMETHING)

- Database: Client systems (Salesforce, HubSpot, internal tools)
- Automation: Custom MCP servers connecting systems to agents
- Judgment: Agent policy, skill constraints, trust boundaries
- Orchestration: Connection flows, OAuth handlers, request routing
- Insight: Agent observability, decision traces, HITL surfaces
- Touchpoints: MCP server URIs, OAuth surfaces
- Artifacts: Integration payloads, structured responses

---

## Conclusion

The three-tier framework—Database, Automation, Judgment—provides a structural model for reasoning about agent systems. MCP encapsulates it naturally through its primitives (Resources, Tools, Prompts) and control model distinctions (application-controlled, model-controlled, user-controlled).

Four cross-cutting concerns span the tiers: Touchpoints (interface surface), Artifacts (boundary contracts), Orchestration (procedural flow), and Insight (perceptual membrane). These are not tiers—they don't do work the way tiers do—but they are essential to how the system operates.

The framework is not a simple hierarchy. MCP's sampling mechanism reveals the recursive property: Automation can request Judgment, closing the loop. The tool encounters the world and asks for judgment. This mirrors embodied cognition—the body doesn't just execute; it participates in thinking.

The policy-as-artifact insight extends this further: the constraints that govern agent behavior are not external scaffolding but data flowing through the tiers. Policy can be versioned, selected contextually, and modified reflexively—always under human oversight at the Judgment layer. Multi-agent coordination becomes policy-passing: agents share not just tasks but behavioral constraints.

Artifacts flow between tiers as typed boundary contracts. Touchpoints span all tiers as the interaction surface. Orchestration sequences procedural work. Insight makes the system legible to itself and to humans. Sampling allows lower tiers to reach back up when they need judgment. And policy itself participates in this flow.

This is not an abstraction imposed on systems—it is the shape that MCP already assumes. The framework names it.
