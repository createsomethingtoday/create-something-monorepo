/**
 * Generated papers content — DO NOT EDIT MANUALLY.
 * Run: npm run build:content
 * Source: packages/io/content/papers/
 */

import type { Paper } from '../types.js';

export const PAPERS: Paper[] = [
  {
    slug: "analyzer-mcp-review-architecture",
    title: "The Analyzer MCP: A Policy-Grounded Review Architecture",
    subtitle: "How CREATE SOMETHING turned Webflow template review into a multi-surface MCP system",
    description: "This paper documents how the Webflow Site Analyzer MCP was created, why a plain crawler or checklist app was insufficient, and what system architects can reuse from the design. The core problem was not only extraction. Webflow template review spans multiple truth surfaces: published pages, Designer-only metadata, and external review policy that can change outside the codebase. The analyzer solves this by treating review as a governed MCP system. URLs and Designer state form the Database layer, browser-backed extraction and queued review execution form the Automation layer, and policy ingestion, manual-review boundaries, observability, and script evolution form the Judgment layer. The result is not just an analyzer. It is a review architecture that can explain what it checked, what it could not check, which policy version it used, and how its automation should improve without collapsing governance into a prompt.",
    category: "Case Study",
    date: "2026-04-13",
    readingTime: 16,
    difficulty: "intermediate",
    keywords: ["MCP","Webflow","Review Architecture","Three-Tier Framework","Policy as Artifact","Observability","System Design"],
    content: `## Executive Thesis

The analyzer MCP exists because template review is not a single inspection problem.

It is a coordination problem across three changing surfaces:

- the **published site**, where runtime behavior, metadata, accessibility issues, and public SEO signals live
- the **Webflow Designer**, where pages, components, style selectors, CMS collections, and breakpoints are visible
- the **review policy itself**, which lives outside the codebase and changes when Webflow updates its submission guidelines or grading rubric

A crawler can inspect pages. A browser bot can click around Designer. A prompt can summarize policy. None of those, by themselves, creates a durable review system.

The analyzer MCP was created to unify those surfaces into one governed tool surface that other agents and operators can use repeatably.

## The Problem It Solves

Manual template review does not scale linearly because the reviewer is forced to join evidence across incompatible contexts.

Consider a simple question:

**"Is this template ready to submit?"**

That answer depends on checks that sit in different places:

- SEO title formulas and alt text are visible on the published site.
- Unused components, page inventory, and class naming patterns depend on Designer metadata.
- Some requirements are explicit pass/fail rules; others remain manual judgment calls.
- The policy source is not static. It lives on Webflow's public guideline and rubric pages.

Without a unifying system, review drift appears in predictable ways:

- one reviewer checks the homepage thoroughly and skim-checks the rest
- another reviewer checks Designer hygiene but misses runtime metadata failures
- an agent overclaims confidence because it only saw the published surface
- a policy change lands upstream and nobody can prove which rule set was used for a given review

The analyzer MCP solves this by turning review into a system with explicit control boundaries, not a loose pile of scripts.

## Why CREATE SOMETHING Built It as an MCP

The design choice was not "browser automation or MCP."

Browser automation is part of the implementation. MCP is the delivery and control surface.

That matters for four reasons:

1. **Portability**
   The review capability should be callable from Codex-first workflows today without being trapped inside one bespoke UI.

2. **Trust boundary clarity**
   MCP makes the review surface explicit: which tools exist, what they accept, and what they return.

3. **Tier separation**
   Review data, execution logic, and policy can be modeled separately instead of being collapsed into one giant agent prompt.

4. **Governed evolution**
   The system can observe failures, version its extraction logic, and improve its automation without pretending policy no longer matters.

This is the broader CREATE SOMETHING point in concrete form:

The valuable work was not scaffolding a server. The valuable work was deciding **what kind of MCP to build**, **which boundaries to respect**, and **how to attach judgment to automation without hiding it**.

## How the Analyzer MCP Was Created

The creation process followed a system design sequence, not a feature checklist.

### 1. Identify the real source surfaces

The first move was to stop treating "the website" as one thing.

The analyzer distinguishes between:

- **published pages** as runtime truth
- **preview/Designer context** as authoring truth
- **external review policy** as governance truth

That decomposition is what made the rest of the system possible.

### 2. Codify browser-backed extraction flows

Two core automation paths were made explicit.

**Flow A: page extraction**

- open a browser session
- detect whether the URL is a Webflow preview
- if preview, enter \`#site-iframe-next\`
- run extraction scripts inside the iframe, not the Designer chrome

This is how page-level tools such as touchpoint analysis, SEO extraction, structure extraction, image analysis, and performance checks stay grounded in the actual page being reviewed.

**Flow B: Designer metadata extraction**

- open the preview URL
- navigate the Designer interface in a fixed sequence
- collect pages, style selectors, components, interactions, CMS collections, assets, and breakpoints

The important insight is not that browser automation clicks panels. The insight is that the Designer path was **codified as a repeatable review primitive** instead of remaining hidden reviewer muscle memory.

### 3. Treat policy as an artifact, not prose in a prompt

The analyzer fetches and normalizes the canonical Webflow submission guidelines and grading rubric from their live public pages.

It records:

- source URL
- fetch timestamp
- content hash
- a derived \`policyVersion\`

This is a decisive architectural move.

It means a review can say more than "the agent used the latest rules." It can say:

- **which policy source was used**
- **when it was fetched**
- **which normalized sections and rubric rows informed the review**

That turns review policy into a traceable system input.

### 4. Build a unified review pipeline

The analyzer does not stop at individual tools. It assembles them into a review workflow:

1. run a published-site precheck
2. extract and score Designer metadata
3. derive seed URLs from the Designer page list
4. crawl the published site with those seeds
5. normalize all findings into unified checklist rows
6. summarize which checks passed, failed, were partial, or remain manual

This matters because it turns a set of tools into a review system.

The output is not "some SEO data" plus "some component data." The output is a review artifact with operational shape.

### 5. Add queueing, progress, and bounded concurrency

Review work is expensive and browser-backed. That means orchestration matters.

The analyzer includes queued template-review jobs with:

- bounded concurrency
- queue capacity limits
- explicit phases such as \`precheck\`, \`designer\`, \`published\`, and \`normalizing\`
- persisted job status and final result payloads

This makes the system usable in production conditions rather than only in ad hoc local debugging.

### 6. Make improvement part of the architecture

Extraction scripts are versioned.

Feedback can be recorded against a specific script version. The analyzer then:

- identifies recurring issue patterns
- detects problematic domains
- proposes modifications
- compares versions
- promotes improved versions through testing to active use

That is the difference between an analyzer and a living automation surface.

## The Three-Tier Mapping

The analyzer is a concrete example of CREATE SOMETHING's Three-Tier Framework.

| Tier | In the analyzer MCP | Why it matters |
|------|---------------------|----------------|
| **Database** | Published URLs, preview URLs, Designer metadata, policy snapshots, review artifacts | Review has to start from what actually exists |
| **Automation** | Browser sessions, extraction scripts, queued jobs, unified review execution | Review becomes runnable, not aspirational |
| **Judgment** | Policy ingestion, manual-review boundaries, feedback, version comparison, promotion decisions | The system can explain what should happen and how it should improve |

For system architects, this is the reusable lesson:

If your review system cannot point to its Database, Automation, and Judgment layers separately, it will become hard to debug and impossible to govern.

## The Review System, Explained

The review system has four architectural moves worth isolating.

### A. Multi-surface evidence, one report

The analyzer combines two kinds of evidence that are usually reviewed separately:

- **Designer evidence**: structure, inventory, naming, component usage, breakpoints
- **published-site evidence**: metadata, heading hierarchy, alt text, 404 behavior, video controls, image loading behavior

The report then normalizes both into one checklist.

That is what makes the output useful to a reviewer and to another agent.

### B. Manual is a first-class state

A weak review system either hides uncertainty or floods operators with caveats.

The analyzer does neither.

Some rows remain intentionally manual because the current payloads do not support a defensible automated claim. Examples include:

- explicit unused animation cleanup
- variable naming and reuse
- class stack depth
- contrast and transition-quality checks in some runs

This is good architecture.

A review system gains trust when it can say:

- **pass** when it has sufficient evidence
- **fail** when it has sufficient evidence
- **manual** when the evidence boundary is real

### C. Policy versioning is part of the review result

Because policy is ingested and hashed, the review system can maintain alignment between external rule changes and internal automation.

That prevents a common failure mode:

the team thinks it automated "the rubric," but what it actually automated was a screenshot of the rubric from months ago.

### D. Observability is operational, not decorative

The analyzer records metrics such as:

- analysis duration
- estimated browser cost
- item counts
- provider health
- session metrics
- queued review status
- browser minutes per review

This changes the architectural conversation.

Instead of only asking "Did the review finish?" operators can ask:

- Was it healthy?
- Was it expensive?
- Which provider degraded?
- Which phase failed?
- Which script version produced the result?

That is how a review system becomes governable.

## What Makes This More Than a Site Analyzer

The term "site analyzer" is technically true and strategically incomplete.

The distinguishing value is the **review architecture**:

- the system knows how to gather evidence from multiple surfaces
- it ties that evidence to a normalized policy artifact
- it reports manual boundaries explicitly
- it queues and tracks execution like a production workflow
- it can improve its automation through versioned feedback loops

A conventional analyzer answers:

**"What is on this page?"**

This system is designed to answer:

**"What should happen in this review, what evidence supports that answer, and where does human judgment still belong?"**

That is a different class of system.

## Design Insights for System Architects

### 1. Do not collapse all truth into one crawl

If the workflow spans multiple authority surfaces, model those surfaces directly.

Published pages and authoring systems are not interchangeable.

### 2. Policy should be fetched, normalized, and versioned

If external policy matters, treat it like data with provenance.

Do not bury it in prompt text and call that governance.

### 3. "Manual" is part of the contract

A credible automation system needs an explicit state for checks it cannot yet justify.

Anything else is theater.

### 4. Review orchestration is part of the product

Queueing, progress, bounded concurrency, and resumable results are not secondary implementation details.

They are what separate a demo from an operating system for review.

### 5. Self-improvement belongs under guardrails

Version registries, feedback loops, and proposal generation are valuable, but only when they remain subordinate to explicit policy and operator visibility.

Autonomy without legibility is just harder-to-debug drift.

## How to Apply This Pattern Outside Webflow

The pattern generalizes beyond template review.

Use it whenever a workflow has:

- multiple truth surfaces
- changing external policy
- partially automatable checks
- expensive execution paths
- a need for explainable review artifacts

Examples:

- security review across source code, runtime config, and compliance policy
- procurement review across vendor documents, ERP state, and approval policy
- content review across CMS state, published rendering, and brand/legal guidance

The system pattern stays the same:

1. identify the surfaces
2. model them as separate evidence sources
3. ingest policy with provenance
4. normalize findings into one review artifact
5. keep manual states explicit
6. attach observability and versioned improvement loops

## Conclusion

The analyzer MCP was created to solve a very practical problem: Webflow review needed a system, not just more scripts.

Its deeper value is architectural.

It demonstrates that a useful MCP is often not the one that exposes the most raw tools. It is the one that:

- understands the real boundaries of the workflow
- converts policy into an auditable input
- turns multi-surface evidence into an operational artifact
- leaves room for human judgment where automation is not yet defensible

That is the CREATE SOMETHING alignment in its most concrete form.

The moat was not "we can call a browser from MCP."

The moat was designing a review system that can explain itself, evolve carefully, and remain portable as the surrounding agent ecosystem changes.`
  },
  {
    slug: "andon-protocol",
    title: "The Andon Protocol",
    subtitle: "AI-Native Structured Escalation for Agent Harnesses and Multi-Agent Systems",
    description: "Agent systems handle uncertainty badly. They either ask constantly or guess silently. Manufacturing solved this decades ago. Version 2.0 synthesized Toyota's Andon, aerospace Deviation/Concession, and Porsche's error correction into a unified escalation protocol. Version 3.0 addresses a critical gap: manufacturing patterns assume the worker knows when something is wrong. LLMs don't—they hallucinate with high confidence; they operate in multi-agent topologies; their harnesses are artifacts that should evolve. This revision extends the Andon Protocol with five AI-native capabilities (Automated Jidoka, Multi-Agent Topology, Dynamic Thresholds, Harness Evolution, Semantic Precedent). Version 3.1 further addresses operational gaps: Silent Running Detection (enforcing the obligation to pull by auditing agent reasoning traces post-hoc), cost parameter defaults and worked examples for the resolution equation, a Resolution Surface design for human batch review, and a three-phase implementation plan. The result is a protocol designed for non-deterministic, multi-agent, self-modifying systems—with a concrete path to deployment.",
    category: "Research",
    date: "2026-02-01",
    readingTime: 28,
    difficulty: "intermediate",
    keywords: ["andon","jidoka","deviation","concession","agent harness","three-tier framework","multi-agent","Kaizen","semantic precedent","silent running"],
    content: `## Part I: Manufacturing Foundation

The manufacturing patterns from v2.0 remain the cultural and structural foundation. This section summarizes them; the full treatment is in the prior version.

### The Andon: Signal Under Uncertainty

Toyota's two-pull system: first pull alerts without stopping the line; unresolved issues trigger a line stop. The obligation principle: failing to pull is a defect. Resolution happens within takt time—the workflow's natural rhythm. Every resolved issue feeds Kaizen.

### The Deviation and the Concession

Aerospace's distinction between proactive non-conformance (deviation: known departure from spec, requested before acting) and reactive non-conformance (concession: discovered after the fact, requesting disposition). Both require documented risk assessment, impact analysis, and authority approval.

### Porsche Error Correction

Six principles for structured error handling. The two most relevant: clear escalation paths with defined authority routing, and integration of findings to prevent recurrence. Errors are prioritized by safety, frequency, and customer impact. Resolution without systemic learning is firefighting.

---

## Part II: The AI-Native Gaps

Five assumptions embedded in manufacturing patterns do not hold for agent systems.

**Gap 1: Agents Don't Know What They Don't Know.** A Toyota worker sees a misaligned panel—the defect is physical, observable, unambiguous. An LLM generating incorrect output experiences no such signal. Hallucination is, by definition, high-confidence incorrectness. The agent that needs to pull the cord most urgently is the agent least likely to recognize the need. Manufacturing's own history provides the solution: Sakichi Toyoda's original invention was not the Andon cord—it was the automatic loom that stopped itself when a needle broke. The machine detected the anomaly, not the human. Jidoka means "automation with a human touch," and the automation component came first.

**Gap 2: Multi-Agent Topologies Have No Single Cord.** Manufacturing assumes one worker, one station, one team leader. Agent systems increasingly involve orchestrated teams of specialists—researcher agents, coder agents, reviewer agents—each with different authority levels and failure modes. When Agent A's output becomes Agent B's input, who pulls the cord? Who resolves? What happens when two agents have conflicting pending Andons?

**Gap 3: There Is No Fixed Takt Time.** Manufacturing lines have a fixed production cadence. Agent workflows don't. A data processing pipeline might resolve in milliseconds; a research workflow might take hours. The resolution window can't be defined by a manufacturing rhythm—it must be computed from the cost of delay versus the cost of incorrect action.

**Gap 4: The Harness Is Not Static.** In manufacturing, the spec is the spec. But the Three-Tier Framework established that agent harnesses are artifacts—versioned, context-selected, and modifiable. Kaizen that only updates operational knowledge without updating the harness misses half the value. The constraints themselves should evolve.

**Gap 5: Precedent Matching Is Semantic, Not Structural.** Manufacturing precedent works by category: same car, same panel, same defect. Agent precedent is semantic: an Andon about "venue name conflict between Bandsintown and Songkick" should match a prior resolution about "artist name conflict between Spotify and MusicBrainz" because the pattern (data source conflict with entity matching) is the same even though the specifics differ entirely.

---

## Part III: AI-Native Extensions

### Extension 1: Automated Jidoka

The loom that stops itself is more important than the cord the worker pulls. Automated Jidoka introduces a verification layer that operates independently of the agent's self-assessment. Jidoka detectors are not part of the agent's reasoning chain—they are separate processes (Workers, validators, post-processing hooks) that observe the agent's output and can pull the cord independently.

| Detector | What It Catches | Pull Type |
|----------|-----------------|-----------|
| Schema Validator | Output doesn't match expected structure. Missing fields, wrong types, constraint violations. | Automatic line stop |
| Confidence Calibrator | Agent's stated confidence doesn't match observed accuracy. Systematic overconfidence or underconfidence. | Alert + threshold adjustment |
| Reasoning Chain Auditor | Logical inconsistencies in chain-of-thought. Conclusions that don't follow from premises. | Alert or stop depending on severity |
| Drift Monitor | Agent's output distribution deviating from established patterns. Gradual behavioral change. | Alert with trend data |
| Cross-Agent Validator | Agent B validates Agent A's output before accepting it as input. Independent verification. | Stop on Agent A's workflow |
| Poka-Yoke Guards | Structural impossibilities. An agent attempting to delete when it only has read access. Type-level prevention. | Prevented before execution |

Poka-Yoke (mistake-proofing) translates to type-safe tool interfaces, permission boundaries at the infrastructure level, and schema validation that rejects malformed outputs before they enter downstream workflows. Poka-Yoke pulls are the cheapest kind—they prevent the error rather than detecting it.

**The Silent Running Detector.** The detectors above catch errors in output. The Silent Running Detector catches a different failure: the agent that was uncertain, did not pull, and got lucky. This is the most dangerous failure mode because it is invisible—no Andon was created, no resolution was logged, no Kaizen was applied. The obligation principle says failing to pull is a defect, but without detection, the principle is unenforceable.

Silent Running Detection works by post-hoc audit of agent reasoning traces. The detector looks for: (1) **Hedging language** in reasoning—phrases like "I'm not sure," "this might be," "probably," or "assuming that" in chain-of-thought indicate the agent recognized ambiguity but proceeded without signaling. (2) **Contradicted assumptions**—the agent stated an assumption that was later contradicted by downstream data or human correction, but no deviation request was filed. (3) **Low-confidence tool calls**—the agent made a tool call where internal reasoning showed low confidence but the reported confidence was high (calibration mismatch). (4) **Repeated self-correction**—the agent changed its answer or approach multiple times within a single execution; each pivot could have been an alert instead of a silent retry.

When Silent Running is detected, the system generates a retroactive Andon with type "audit" and status "retroactive." This Andon does not block the already-completed workflow but enters the resolution queue for review. The resolution determines whether the output was actually correct (informing threshold calibration) and whether the agent's harness needs adjustment so the signal is raised next time. The agent that pulls unnecessarily is doing its job. The agent that doesn't pull when uncertain is the defect. Silent Running Detection makes the obligation enforceable.

### Extension 2: Multi-Agent Topology

**Resolution Authority Hierarchy.** Every Andon has a resolution path defined by the system's authority topology:

| Level | Resolver | When Used |
|-------|----------|-----------|
| L0: Self-Resolution | The agent itself, using precedent | High precedent match confidence. Agent applies prior resolution without escalation. |
| L1: Peer Resolution | Another agent with relevant authority | Specialist knowledge needed. A data quality agent resolves a formatting Andon from an extraction agent. |
| L2: Coordinator Resolution | Orchestrator or supervisor agent | Cross-workflow impact. Multiple agents affected. Policy-level decision. |
| L3: Human Resolution | Human operator via MCP surface | Novel situation, no precedent, high stakes, or policy gap. |
| L4: Human Policy | Human authority (client, manager) | Harness modification required. New constraint or threshold change. |

MCP's sampling mechanism enables this naturally: an agent that needs judgment requests it through the client, which routes to the appropriate resolver. L0–L1 are model-controlled, L2 is application-controlled, L3–L4 are user-controlled.

**Agent-to-Agent Andons.** Three patterns: (1) **Upstream Concession**: Agent B discovers that Agent A's output is non-conforming; Agent B files a concession on Agent A's behalf, routed back for disposition. (2) **Downstream Deviation**: Agent A knows its output will deviate from Agent B's expected input schema; Agent A files a deviation request routed to Agent B for pre-approval before delivery. (3) **Lateral Alert**: Agent C observes that Agent A and Agent B have conflicting pending Andons on related data; Agent C issues a coordination alert grouping both for simultaneous resolution.

**Conflict Resolution.** Related Andons (detected by the Semantic Precedent engine) are linked into a resolution cluster. The cluster is routed to the highest common authority. A single resolution can close multiple Andons.

### Extension 3: Dynamic Thresholds

**The Resolution Equation:**

\`resolve_urgency = cost_of_delay / (cost_of_wrong_action × (1 − confidence))\`

When resolve_urgency is high (delay is expensive relative to the risk-adjusted cost of being wrong), the agent should proceed with its proposed action and log. When resolve_urgency is low (being wrong is much more expensive than waiting), the agent should stop and wait. This replaces the fixed takt-time assumption with a cost-based computation.

**Setting Cost Parameters.** The equation is only useful if cost_of_delay and cost_of_wrong_action have real values. The protocol provides three approaches: (1) **Category defaults**—assign cost pairs by workflow category. Data enrichment: delay=low (1), wrong=medium (5). Financial transactions: delay=medium (3), wrong=very high (50). Content publishing: delay=low (1), wrong=high (20). Access control: delay=high (10), wrong=critical (100). (2) **SLA-derived**—use the workflow's existing SLA; cost_of_delay = penalty per unit time past SLA; cost_of_wrong_action = cost of correction + reputational damage estimate. (3) **Outcome-learned**—after sufficient resolution history, derive costs empirically from correction effort and downstream impact; the equation becomes self-calibrating (Kaizen path).

**Worked example (A&R Intelligence):** Extraction agent finds conflicting venue names. Category default: data enrichment (delay=1, wrong=5). Agent confidence: 0.6. resolve_urgency = 1 / (5 × 0.4) = 0.5. Below 1.0 → agent should pull an alert and wait. If the same conflict arises in a real-time event feed (delay=10), resolve_urgency = 10 / (5 × 0.4) = 5.0 → agent should proceed with its best guess and log, because the cost of delay dominates.

**Threshold Self-Tuning.** Two calibration metrics: **Resolution Reversal Rate** (how often a resolved Andon leads to corrections—if high, increase threshold); **Unnecessary Pull Rate** (how often human resolvers agree with the agent's proposed action—if high, decrease threshold). Small adjustments within a defined band can be applied automatically. Large adjustments require L4 human policy approval—a meta-Andon on the system's own calibration.

### Extension 4: Harness Evolution

Three levels of Kaizen:

| Level | What Changes | Authority Required | Example |
|-------|--------------|-------------------|---------|
| Knowledge Kaizen | Operational context. Precedent library. Resolved decisions. | Automatic (L0) | Venue name conflict resolved: prefer Bandsintown as canonical source. |
| Threshold Kaizen | Confidence thresholds. Alert/stop zones. Category-specific gates. | Automatic within band; L4 for large changes | IP-related stop threshold adjusted from 0.55 to 0.60 based on reversal rate. |
| Harness Kaizen | Agent constraints. Routing rules. Authority hierarchy. Tool access. | L4: Human policy approval required | Agent granted new tool access after demonstrating reliable usage patterns. |

Harness Kaizen is the most powerful and the most dangerous. Every harness modification proposal is itself an Andon that requires L4 resolution. The system surfaces the data and proposes the change; the human decides. This closes the loop with the Three-Tier Framework's harness-as-artifact theorem: the Andon Protocol doesn't just operate within the harness—it evolves it.

### Extension 5: Semantic Precedent

**How It Works.** (1) **Embedding Generation**: When an Andon is resolved, the resolution (question + context + decision + rationale) is embedded as a vector. (2) **Similarity Search**: When a new Andon is created, its context is embedded and compared against the resolution library using cosine similarity. (3) **Pattern Extraction**: The precedent engine extracts the abstract pattern—e.g. "data source conflict with entity matching"—not just the instance. (4) **Confidence Adjustment**: Strong precedent matches increase the agent's effective confidence; a 0.5 confidence with a 0.95 precedent match might be elevated to "proceed with precedent," avoiding unnecessary escalation.

**Cloudflare Implementation:** Vectorize stores resolution embeddings. Workers AI generates embeddings at resolution time. D1 stores structured resolution records. A Workers function combines similarity search with structured filtering (category, authority level, recency) to produce ranked precedent candidates.

---

## Part IV: The Complete Protocol

### The Eight Behaviors

| Behavior | Origin | v3.1 Enhancement |
|----------|--------|------------------|
| First Pull (Alert) | Andon first pull | May be triggered by agent OR by Automated Jidoka detector. Routes to L0–L2 depending on authority topology. |
| Line Stop (Block) | Andon line stop | Blocking threshold computed by resolution equation, not fixed. Cross-agent stops propagate to dependent workflows. |
| Deviation Request | Aerospace deviation | Can be filed agent-to-agent (downstream deviation). Resolution may come from peer or coordinator agent. |
| Concession Report | Aerospace concession | Can be filed by a downstream agent on an upstream agent's output (upstream concession). Triggers root cause tracing. |
| Silent Running Audit | Obligation principle | Post-hoc detection of unraised uncertainty. Retroactive Andon generation. Makes obligation enforceable, not aspirational. |
| Knowledge Kaizen | Toyota kaizen | Precedent stored as embeddings. Pattern extraction generalizes beyond specific instances. |
| Threshold Kaizen | Porsche error correction | Self-tuning within bands. Resolution reversal and unnecessary pull rates drive adjustment. Large changes require meta-Andon. |
| Harness Kaizen | Three-Tier Framework | System proposes constraint modifications based on accumulated evidence. Always requires L4 human approval. Versioned. |

### The Andon Object v3.1

| Field | Type | New in v3 |
|-------|------|------------|
| id | string | |
| type | enum | alert \\| stop \\| deviation \\| concession \\| audit | audit (v3.1) |
| source | enum | agent \\| jidoka_detector \\| cross_agent | Yes |
| source_agent_id | string | | Yes |
| status | enum | open \\| investigating \\| resolved \\| applied \\| clustered \\| retroactive | clustered, retroactive (v3.1) |
| resolution_level | enum | L0 \\| L1 \\| L2 \\| L3 \\| L4 | Yes |
| question | text | |
| context | object | |
| proposed_action | text | |
| confidence | number (0–1) | |
| resolve_urgency | number (computed) | Yes |
| impact | text | |
| precedent_matches | array of {id, similarity, pattern} | Semantic matches |
| cluster_id | string (nullable) | Yes |
| resolution | object | {decision, rationale, resolver_id, level} | level added |
| kaizen_type | enum | knowledge \\| threshold \\| harness \\| none | Yes |
| kaizen_applied | boolean | |
| harness_version_before | string (nullable) | Yes |
| harness_version_after | string (nullable) | Yes |
| embedding | vector | Yes |
| created_at | datetime | |
| resolved_at | datetime | |
| applied_at | datetime | |

---

## Placement in the Three-Tier Framework (v3.1)

| Framework Element | Andon Role (v3.0) |
|-------------------|-------------------|
| Database | Andon records. Resolution embeddings (Vectorize). Harness versions. Precedent library. |
| Automation | Agents generate and route Andons. Jidoka detectors monitor output. Threshold self-tuning within bands. |
| Judgment | L3–L4 human resolution. Harness Kaizen approval. Meta-Andon review. Policy decisions. |
| Artifacts | The Andon object. Resolution embeddings. Harness version diffs. Kaizen proposals. |
| Touchpoints | MCP tools. Slack/email notifications. Resolution dashboards. Loom integration for cross-session continuity. |
| Orchestration | Resolution authority routing. Cluster assembly. Cross-agent propagation. Timeout escalation. |
| Insight | Pull rate, calibration quality, Kaizen rates, harness evolution history, precedent coverage. |

---

## Implementation

### Cloudflare-First Architecture (v3.0)

| Component | Service | Role |
|-----------|---------|------|
| Andon Store | D1 / Substrate | Persistent storage for Andon records and precedent history |
| Resolution Embeddings | Vectorize | Vector store for semantic precedent search |
| Signal Queue | Queues | Async processing of new Andons, routing, batch assembly |
| Andon Worker | Workers | Detection logic, confidence gating, routing, Jidoka detector orchestration |
| Jidoka Detectors | Workers | Schema validation, confidence calibration, reasoning audit, drift monitor, cross-agent validation |
| Resolution Surface | MCP Server (Worker) | Touchpoint for human or agent resolution (L0–L4) |
| Precedent Engine | Workers AI + Vectorize + D1 | Embedding generation, similarity search, pattern extraction |
| Insight Dashboard | Analytics Engine | Volume, calibration quality, Kaizen rates, threshold drift |

### MCP Tool Surface v3.1

| Tool | Description | New in v3 |
|------|-------------|-----------|
| andon_pull | Signal alert or stop. Can originate from agent or Jidoka detector. | Source field |
| andon_deviate | Request pre-approval for known departure. Routes to peer, coordinator, or human. | Multi-level routing |
| andon_concede | Report non-conforming output. Can be filed by producing or consuming agent. | Cross-agent filing |
| andon_resolve | Provide resolution with rationale. Available to agents at appropriate authority level. | Agent resolvers |
| andon_batch | Get grouped Andons for review. Includes cluster analysis. | Cluster support |
| andon_precedent | Semantic search over resolution history. Returns pattern-matched candidates with similarity scores. | Vector search |
| andon_metrics | System health: volume, calibration quality, Kaizen rates, threshold drift. | Threshold analytics |
| andon_propose_kaizen | Propose harness modification based on accumulated evidence. Triggers meta-Andon for L4 approval. | New |
| andon_audit | Run Silent Running Detection on completed workflow. Generates retroactive Andons for unraised uncertainty. | New (v3.1) |

---

## Applications

### A&R Intelligence System

A Cloudflare Worker processing venue data detects conflicting venue names across two sources. Confidence: 0.4. This falls in the alert zone. The agent issues a first pull with both values, the downstream impact (which client playlist gets affected), and its proposed resolution (use the source with higher recency). It continues processing other venues. The reviewer resolves the batch of venue conflicts in one session during their morning review.

### Gmail-to-Notion Automation

An email arrives that doesn't fit the expected classification schema. The agent knows before acting that processing this email will deviate from its defined categories. It issues a deviation request: "This email from [sender] discusses [topic] but doesn't match any configured category. Proposed deviation: create new category '[suggested]' or file under 'Other.' Requesting pre-approval."

### WORKWAY Marketplace

A marketplace workflow encounters an edge case the developer didn't account for. The agent issues a line stop on the affected execution and routes the Andon back to the workflow creator with full context. The creator resolves it, and the resolution triggers a Kaizen update to the workflow's handling logic for all users. The Andon pattern becomes a quality signal for marketplace listings: workflows with fewer unresolved Andons earn higher trust scores.

### Webflow Template Reviews

An automated review pipeline detects partial plagiarism indicators on a submitted template. Confidence: 0.55—below the stop threshold for intellectual property issues. The agent issues a line stop with the specific similarities found, comparison screenshots, and its assessment. The reviewer makes the final call. If the pattern repeats across submissions from the same creator, the Insight layer surfaces the trend.

---

## Why Not the Construction RFI?

The initial version of this paper used the construction Request for Information (RFI) as the guiding metaphor. On reflection, the RFI is the wrong pattern for agent systems, for three reasons:

- **RFIs are slow by design.** They assume days to weeks for response. They're document-heavy and bureaucratic. Agent escalations need to resolve within the operational rhythm of the workflow, not on a contractual timeline.
- **RFIs operate across organizational boundaries.** Contractor to architect. That's an adversarial, contractual relationship. Agent-to-human escalation is a team relationship—collaborative, not defensive.
- **RFIs can be weaponized.** Contractors flood architects with RFIs to build change order cases. You don't want that incentive structure in agent DNA. The Andon reframes escalation as responsibility, not strategy.

The Andon is culturally aligned with CREATE SOMETHING's design philosophy: Dieter Rams's "less, but better," the German engineering tradition of precision with restraint, and the principle that a single cord is more powerful than a form.

---

## Anti-Patterns

- **Andon Flooding.** Pulling the cord on everything. Prevented by confidence thresholds: high-confidence situations don't generate signals.
- **Silent Running.** Failing to pull when uncertain. The obligation principle: not pulling is a defect, not efficiency.
- **Vague Pulls.** Signals without context. Prevented by schema validation—an Andon without a proposed action and context is rejected by the system.
- **Resolution Drift.** Andons sitting unresolved past their workflow's takt time. Prevented by timeout policies and automatic escalation to the next authority.
- **Ignoring Precedent.** Pulling for situations already resolved. The precedent engine surfaces prior resolutions before accepting new Andons on similar situations.
- **Kaizen Neglect.** Resolving Andons without updating the harness. The kaizen_applied flag tracks whether each resolution was fed back into the system.

---

## Metrics and Insight

| Metric | What It Reveals | Manufacturing Analog |
|--------|-----------------|------------------------|
| Pull Rate / Time | System stability. Spike = new edge cases or degraded instructions. | Andon pull frequency per shift |
| Alert vs. Stop Ratio | Calibration quality. Mostly alerts = well-tuned. Mostly stops = thresholds too loose. | First pull vs. line stop ratio |
| Deviation vs. Concession Ratio | Predictive capability. More deviations = agent anticipates problems. More concessions = agent catches them late. | Preventive vs. corrective non-conformance |
| Mean Resolution Time | Human responsiveness. Should correlate with workflow takt time. | Time from Andon pull to line restart |
| Precedent Hit Rate | Knowledge accumulation. Rising = system learning. Flat = Kaizen neglect. | Repeat issue reduction rate |
| Resolution Reversal Rate | Decision quality. High = resolver or agent needs recalibration. | Rework rate after disposition |
| Kaizen Application Rate | Feedback loop health. Should approach 100%. | Corrective action closure rate |

---

## Relationship to Existing Patterns

**The Autonomous Harness:** The harness defines autonomy boundaries. The Andon Protocol operates at those boundaries. Harness Kaizen extends the relationship: the protocol doesn't just operate within the harness, it evolves it.

**The Norvig Partnership:** Human-AI collaboration gains a structured, multi-level interface. L0–L2 are AI-AI collaboration; L3–L4 are AI-human collaboration. The partnership is graduated, not binary.

**Loom:** Task memory (what was the agent doing?). The Andon Protocol provides decision memory (what was the agent told?). Loom handles cross-session continuity; Andons handle cross-decision continuity. They share the same persistence layer and coordinate through the Orchestration concern.

**Weniger, aber besser:** Automated Jidoka reduces the burden on human attention. Semantic precedent reduces redundant escalation. Dynamic thresholds tune the system toward the minimum necessary human involvement. Every AI-native extension serves the same principle: less interruption, better decisions.

---

## Part V: Operational Design

The extensions in Part III define capabilities. This section addresses how those capabilities are delivered to resolvers and how the protocol is adopted incrementally.

### The Resolution Surface

MCP tools are the protocol's API. But humans don't resolve Andons by calling andon_resolve from a terminal. The protocol requires a **resolution surface**—a dedicated interface designed for efficient batch review. Without this, the protocol is a well-specified backend with no frontend.

**Design principles:** (1) **Triage-first**—queue sorted by resolve_urgency (highest first); each item shows type, source agent, question, proposed action, confidence, precedent matches, time in queue. (2) **Batch operations**—select multiple related Andons; apply a single resolution to all; "Apply to similar" uses semantic precedent to find matching open Andons and resolve them with the same decision. (3) **One-click for common decisions**—"Approve proposed action" and "Reject and provide alternative" are single actions; resolver only writes a rationale when deviating from the agent's proposal. (4) **Precedent visibility**—each Andon shows top precedent matches inline; resolver sees "last time this pattern appeared, you decided X" and can follow or override with a reason.

**Implementation options:**

| Surface | Best For | How It Works |
|---------|----------|--------------|
| Slack Flow | Small teams, fast resolution, mobile | Andon as Slack message with Approve, Reject, Defer, View Precedent. Batch review via thread. Resolution posted back for audit. |
| Dashboard (Web) | High-volume, batch review, analytics | Full triage queue with filters, sort, batch select, inline precedent. Metrics sidebar (pull rate, resolution time, calibration). Cloudflare Pages app reading from D1/Substrate. |
| Email Digest | Low-volume, async review, L4 oversight | Periodic summary of pending Andons by category and urgency. Links to resolution pages. Best for L4 policy reviews. |
| MCP Direct | Agent-to-agent resolution (L0–L2) | Resolver agents call andon_resolve through MCP. No human interface; the tool surface is the resolution surface. |

Most deployments use a combination: Slack for L3 real-time resolution, dashboard for batch review and analytics, email digest for L4 policy, MCP direct for L0–L2. All surfaces read from and write to the same Andon store through the same MCP tools.

### Implementation Phasing

The protocol is designed as a target architecture, not a monolithic release. Each phase is independently valuable and testable.

**Phase 1: Foundation (Weeks 1–4).** Confidence gating; five behaviors (alert, stop, deviation, concession, Knowledge Kaizen); basic Andon object without clustering or audit type. L3 human resolution only; all Andons route to humans via Slack. Slack resolution surface (approve/reject buttons, resolution to D1). Basic metrics: pull rate, resolution time, reversal rate. Use category defaults for cost parameters. **Success criteria:** Agents pull consistently at uncertainty. Resolvers can handle volume. Reversal rate below 15%. Pull rate stabilizes.

**Phase 2: Intelligence (Months 2–3).** Automated Jidoka: start with Schema Validator and Poka-Yoke; add Confidence Calibrator once you have resolution data; add Silent Running when the agent framework supports reasoning trace access. Replace binary threshold with the resolution equation (category defaults; SLA-derived for client-facing workflows). Enable L0–L2: self-resolve when precedent match confidence is above threshold; peer resolution for specialist Andons; coordinator for cross-workflow. Dashboard surface (triage queue, batch operations, precedent display); Slack continues for real-time L3. **Success criteria:** Jidoka catching errors agents missed. L0–L1 resolving 30%+ without human involvement. Resolution equation producing meaningfully different decisions than fixed thresholds.

**Phase 3: Evolution (Months 4–6).** Semantic Precedent: Vectorize embeddings, pattern extraction, precedent-boosted confidence, cluster assembly. Requires ~200–300 resolved Andons for useful similarity. Threshold Kaizen: self-tuning within bands; meta-Andon for out-of-band adjustments. Harness Kaizen: system proposes constraint changes; L4 approval via email or dashboard; versioned harness with rollback. Outcome-learned costs: derive cost_of_delay and cost_of_wrong_action from resolution history. **Success criteria:** Semantic precedent reducing novel L3 Andons by 20%+. At least one Harness Kaizen proposal accepted. Threshold drift trending toward equilibrium.

| Phase | Core Capability | Resolution | Surface | Timeline |
|-------|-----------------|------------|---------|----------|
| 1: Foundation | Confidence gating, 5 behaviors, Knowledge Kaizen | L3 human only | Slack | Week 1–4 |
| 2: Intelligence | Jidoka, resolution equation, L0–L2 | Agent + human | Slack + Dashboard | Month 2–3 |
| 3: Evolution | Semantic precedent, Threshold + Harness Kaizen | Full L0–L4 | All surfaces | Month 4–6 |

---

## Conclusion

Manufacturing provided the vocabulary: Andon, Jidoka, Deviation, Concession, Kaizen, Poka-Yoke. These remain the structural foundation—the names for behaviors that agent systems need but lack.

The AI-native extensions address what manufacturing cannot: agents that don't know they're wrong, topologies where no single cord reaches a single supervisor, workflows with no fixed rhythm, harnesses that should evolve, and precedent that crosses domain boundaries semantically.

The operational additions (v3.1) address what a spec alone cannot: the Silent Running Detector that enforces the obligation principle by auditing what agents didn't say; cost parameter defaults and a worked example that make the resolution equation usable on day one; a resolution surface designed for human batch review; and a phasing plan that delivers value incrementally—confidence gating and Slack resolution in weeks, Jidoka and the equation in months, semantic precedent and Harness Kaizen once the data supports them.

The resulting protocol improves in **six** distinct ways: it accumulates operational knowledge (Knowledge Kaizen), it calibrates its own confidence (Threshold Kaizen), it proposes improvements to its constraints (Harness Kaizen), it catches errors the agent itself can't see (Automated Jidoka), it catches errors the agent chose not to report (Silent Running Detection), and it generalizes solutions across problem domains (Semantic Precedent).

Within the Three-Tier Framework, the Andon Protocol is the canonical boundary mechanism between Automation and Judgment. It is not an interrupt system—it is a trust-building system. Every pull, every resolution, every Kaizen cycle earns the system more autonomy by demonstrating responsible behavior under uncertainty.

The system that earns trust through structured transparency is more valuable than the system that demands trust through the appearance of infallibility.

---

*Version 3.1 — February 2026*\u0020\u0020
*Supersedes: v1.0 (RFI Protocol), v2.0 (Andon Protocol), v3.0 (AI-Native Extensions)*\u0020\u0020
*CREATE SOMETHING · WORKWAY · Half Dozen Solutions*`
  },
  {
    slug: "autonomous-harness-architecture",
    title: "The Autonomous Harness",
    subtitle: "Agent Orchestration with Human Agency",
    description: "Traditional agent orchestration requires constant human oversight. This paper presents an alternative: the autonomous harness. Drawing on Heidegger's concepts of dwelling and tool-being, we argue that effective human-agent collaboration requires the harness to recede into transparent operation. Humans engage through progress reports—reactive steering rather than proactive management.",
    category: "Architecture",
    date: "2025-12-18",
    readingTime: 15,
    difficulty: "advanced",
    keywords: ["agent orchestration","autonomy","Heidegger","dwelling","tool-being","Beads","harness"],
    content: `# The Autonomous Harness

Agent Orchestration with Human Agency—how progress reports enable reactive steering without proactive management.

**Category:** Architecture
**Reading Time:** 15 min read
**Difficulty:** Advanced
**Paper ID:** PAPER-2025-008

## Abstract

Traditional agent orchestration requires constant human oversight—approving each action, reviewing each output, managing each session. This paper presents an alternative architecture: the autonomous harness. Drawing on Heidegger's concepts of dwelling and tool-being, we argue that effective human-agent collaboration requires the harness to *recede into transparent operation*. Humans engage through progress reports—reactive steering rather than proactive management. The harness runs autonomously; humans redirect when needed. This preserves agency without ceremony, enabling both machine efficiency and human control.

> "The harness recedes into transparent operation. When working, you don't think about the harness—you review progress and redirect when needed."
> — CREATE SOMETHING Harness Philosophy

## I. Introduction: The Orchestration Problem

As AI agents become more capable, a fundamental question emerges: how do humans maintain meaningful control over autonomous systems without becoming bottlenecks?

You might find yourself reaching for one of two extremes:

| You might try... | What happens |
|-----------------|--------------|
| Full autonomy: "Let the agent handle everything" | Errors compound silently. You lose agency. |
| Full oversight: "I'll approve every action" | You become the bottleneck. Automation's purpose is defeated. |

When you catch yourself at either extreme, you've found the tension this paper addresses: **what is the minimum oversight that preserves meaningful human control?**

This paper argues that the answer is *progress reports*—periodic checkpoints that enable reactive steering. The harness runs autonomously; humans engage only when they choose to. This is not abdication of control but a different *mode* of control.

## II. Philosophical Foundation: Dwelling and Tool-Being

### Heidegger's Tool Analysis

In *Being and Time*, Heidegger distinguishes two modes of encountering equipment. In *Zuhandenheit* (ready-to-hand), tools recede into transparent use—the hammer disappears when hammering. In *Vorhandenheit* (present-at-hand), tools become objects of contemplation—we notice the hammer when it breaks.

> "The peculiarity of what is proximally ready-to-hand is that, in its readiness-to-hand, it must, as it were, withdraw in order to be ready-to-hand quite authentically."

A well-functioning harness should exhibit Zuhandenheit: it should recede into the background, enabling work without demanding attention. When humans must constantly approve, review, or manage the harness, it becomes present-at-hand—an obstacle rather than an aid.

### Dwelling as Mode of Being

Heidegger's concept of *dwelling* extends this analysis. To dwell is not merely to reside in a location but to be at home, to care for a place, to let things be what they are. Applied to agent orchestration:

- **The agent dwells in the codebase**—working within it, caring for it
- **The human dwells in oversight**—reviewing progress, redirecting when needed
- **The harness enables both dwellings**—without capturing either

The key insight: the harness must not demand the human's dwelling. The human should be able to walk away, return when ready, and find coherent progress reports waiting.

## III. The Gestell Warning: Automation Without Invasion

Heidegger's later work warns of *Gestell*—the technological enframing that reduces everything to standing-reserve, resources to be optimized. A naive harness implementation risks Gestell: automation that fills every gap, leaving no space for human judgment.

\\\`\\\`\\\`
// Gestell: Technology as total capture
while (true) {
  const task = await getNextTask();
  await executeWithoutOversight(task);  // No checkpoint
  await markComplete(task);              // No review
  // Human has no entry point
}
\\\`\\\`\\\`

The danger is not automation itself but automation that *forecloses human agency*. The harness must create space for human engagement without requiring it. This is *Gelassenheit*—releasement toward things. Neither rejection nor submission; full engagement without capture.

### Checkpoint as Clearing

The solution is the *checkpoint*—a periodic clearing where humans can engage. Checkpoints create structured opportunities for oversight without demanding it:

\\\`\\\`\\\`
// Gelassenheit: Automation with clearing
while (!complete && !paused) {
  const task = await selectHighestPriority();
  const result = await runSession(task);

  if (shouldCheckpoint(result)) {
    await createProgressReport();      // Human CAN engage
    await checkForRedirects();         // Human CAN redirect
  }
  // Human agency preserved without ceremony
}
\\\`\\\`\\\`

## IV. Architecture: The Autonomous Harness

The CREATE SOMETHING harness implements these philosophical principles in concrete architecture. The design follows the Subtractive Triad:

- **DRY**: One system (Beads) for all tracking—no parallel infrastructure
- **Rams**: Only essential components—runner, checkpoints, redirects
- **Heidegger**: Serves the work, not itself—transparent operation

### Core Components

\\\`\\\`\\\`
┌─────────────────────────────────────────────────────────────┐
│                     HARNESS RUNNER                          │
│                                                             │
│   Session 1 ──► Session 2 ──► Session 3 ──► ...            │
│       │             │             │                         │
│       ▼             ▼             ▼                         │
│   Checkpoint    Checkpoint    Checkpoint                    │
└───────┬─────────────┬─────────────┬─────────────────────────┘
        │             │             │
        ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│                BEADS (Human Interface)                      │
│                                                             │
│   bd progress  - Review checkpoints                         │
│   bd update    - Redirect priorities                        │
│   bd create    - Inject urgent work                         │
└─────────────────────────────────────────────────────────────┘
\\\`\\\`\\\`

### Everything is a Beads Issue

The harness uses Beads—CREATE SOMETHING's agent-native issue tracker—for all state. No new file formats, no separate databases. The tool recedes:

| Concept | Implementation |
|---------|---------------|
| Work items | \\\`issue_type: feature\\\` |
| Progress reports | \\\`label: checkpoint\\\` |
| Harness state | \\\`issue_type: epic\\\` with \\\`label: harness\\\` |
| Redirects | Priority changes on existing issues |

## V. The Session Loop: Autonomous Execution

Each harness run follows a predictable loop. The agent spawns Claude Code sessions, each primed with context about recent progress, current task, and any redirect notes.

### Session Priming

Before each session, the harness generates a priming prompt:

\\\`\\\`\\\`
# Harness Session Context

## Current Task
**Issue**: cs-xyz - Implement user dashboard
**Priority**: P1
**Blocked by**: Nothing
**Blocks**: cs-abc (dashboard tests)

## Recent Git Commits
- abc123: Add login endpoint
- def456: Add session management

## Last Checkpoint Summary
Completed auth flow. 8/42 features done.

## Redirect Notes
Human updated cs-ghi from P2 → P0.

## Session Goal
Complete the dashboard layout. Commit if tests pass.
\\\`\\\`\\\`

### Session Outcomes

Each session produces one of four outcomes:

- **Success**: Task completed. Issue marked closed. Git commit created.
- **Partial**: Some progress. Issue remains open. Progress noted.
- **Failed**: Task could not be completed. Checkpoint triggered.
- **Context Overflow**: Session hit context limit. Auto-continues in new session.

## VI. Checkpoints: The Human Interface

Checkpoints are progress reports created as Beads issues. They summarize what happened, what's next, and whether human attention is needed.

### Checkpoint Policy

| Trigger | Default | Description |
|---------|---------|-------------|
| \\\`afterSessions\\\` | 3 | Checkpoint every N sessions |
| \\\`afterHours\\\` | 4 | Checkpoint every M hours |
| \\\`onError\\\` | true | Checkpoint on task failure |
| \\\`onConfidenceBelow\\\` | 0.7 | Pause if confidence drops |

### Checkpoint Content

\\\`\\\`\\\`
═══════════════════════════════════════════════════════════════
  CHECKPOINT #12
  2025-12-18T14:00:00Z
═══════════════════════════════════════════════════════════════

Completed 5 of 6 tasks in this checkpoint period.
1 task(s) failed and may need attention.

Overall progress: 35/42 features.

✓ Completed: cs-a1b2, cs-c3d4, cs-e5f6, cs-g7h8, cs-i9j0
✗ Failed: cs-k1l2
◐ In Progress: cs-m3n4

Confidence: 85%
Git Commit: abc123def
═══════════════════════════════════════════════════════════════
\\\`\\\`\\\`

Humans review checkpoints when they choose—\\\`bd progress\\\`. The harness doesn't push notifications; it creates artifacts for pull-based review.

## VII. Redirects: Reactive Steering

The harness watches Beads for changes between sessions. When humans modify priorities or create urgent issues, the harness detects and responds:

| Human Action | Harness Response |
|--------------|------------------|
| \\\`bd update cs-xyz --priority P0\\\` | Issue jumps to front of queue |
| \\\`bd create "Urgent fix" --priority P0\\\` | New work added at top priority |
| \\\`bd close cs-abc\\\` | Harness stops working on issue |
| Create issue with \\\`pause\\\` label | Harness pauses for review |

This is *reactive steering*: humans don't manage the harness; they redirect it when their priorities change. The harness handles the mechanics; humans provide direction.

### Redirect Detection

\\\`\\\`\\\`typescript
async function checkForRedirects(snapshot: IssueSnapshot): Redirect[] {
  const current = await readAllIssues();
  const redirects: Redirect[] = [];

  for (const issue of current) {
    const prev = snapshot.get(issue.id);

    // Detect priority changes
    if (prev && prev.priority !== issue.priority) {
      redirects.push({
        type: 'priority_change',
        issueId: issue.id,
        from: prev.priority,
        to: issue.priority
      });
    }

    // Detect new urgent issues
    if (!prev && issue.priority === 0) {
      redirects.push({
        type: 'urgent_injection',
        issueId: issue.id
      });
    }
  }

  return redirects;
}
\\\`\\\`\\\`

## VIII. Human Workflow: Agency Without Ceremony

The harness workflow optimizes for human agency without ceremony:

### Starting Work

\\\`\\\`\\\`bash
# 1. Write a spec (markdown PRD)
vim specs/my-project.md

# 2. Start the harness
harness start specs/my-project.md

# 3. Walk away—work continues autonomously
\\\`\\\`\\\`

### Monitoring Progress

\\\`\\\`\\\`bash
# Check progress when ready
bd progress

# Output:
# Harness: cs-harness-xyz (running)
# Sessions: 12 | Features: 8/42 | Failed: 1
#
# Recent Checkpoints:
# - cs-cp-003 (2h ago): Dashboard 60% complete
# - cs-cp-002 (6h ago): Auth flow complete
# - cs-cp-001 (10h ago): Initial scaffolding

# Deep dive into a checkpoint
bd show cs-cp-003
\\\`\\\`\\\`

### Redirecting

\\\`\\\`\\\`bash
# "I need payments before dashboard"
bd update cs-payments --priority P0

# "Stop working on the old API"
bd close cs-old-api --reason "Deprecated"

# "Add this urgent fix"
bd create "Fix: Login broken on Safari" --priority P0

# Next session automatically picks up the redirect
\\\`\\\`\\\`

Notice what's missing: no approval dialogs, no status meetings, no context switches. The human engages when they choose, using commands they already know.

## IX. Implementation: The CREATE SOMETHING Harness

The harness is implemented as a TypeScript package in the CREATE SOMETHING monorepo:

\\\`\\\`\\\`
packages/harness/
├── src/
│   ├── types.ts          # Type definitions
│   ├── spec-parser.ts    # Markdown PRD parsing
│   ├── beads.ts          # Beads CLI integration
│   ├── session.ts        # Claude Code spawning
│   ├── checkpoint.ts     # Progress report generation
│   ├── redirect.ts       # Change detection
│   ├── runner.ts         # Main orchestration loop
│   ├── cli.ts            # CLI entry point
│   └── index.ts          # Exports
├── package.json
└── README.md
\\\`\\\`\\\`

### Spec Parser

The harness parses markdown PRDs into structured features with dependencies.

### Session Spawning

\\\`\\\`\\\`typescript
export async function runSession(
  context: PrimingContext,
  options: SessionOptions
): Promise<SessionResult> {
  const primingPrompt = generatePrimingPrompt(context);

  const process = spawn('claude', [
    '--dangerously-skip-permissions',
    '--print', primingPrompt
  ], {
    cwd: options.workDir,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Monitor for completion, errors, or context overflow
  return monitorSession(process, options);
}
\\\`\\\`\\\`

## X. Evaluation: Canon Alignment in Practice

The harness is currently being evaluated on the Canon Alignment spec—a 26-feature project to ensure CSS design consistency across all CREATE SOMETHING properties.

| Metric | Value |
|--------|-------|
| Total Features | 26 |
| Feature Sections | 8 |
| Dependencies | 18 (intra-section) |
| Checkpoint Policy | Every 3 sessions or 4 hours |

The evaluation tests the harness's ability to:
- Parse complex specs with multiple sections
- Create issues with proper dependencies
- Spawn Claude Code sessions with context
- Generate meaningful checkpoints
- Detect and respond to redirects

Results will be published in a follow-up paper once the Canon Alignment run completes.

## XI. Conclusion: The Tool Recedes

The autonomous harness represents a different philosophy of human-agent collaboration. Rather than requiring constant oversight, it creates space for human agency through structured checkpoints. Rather than demanding attention, it waits for engagement.

This is Heidegger's tool-being applied to orchestration: the harness recedes into transparent operation. When it works well, you don't think about it—you review progress and redirect when needed.

> "The hammer disappears when hammering. The harness disappears when working."

The goal is not automation for its own sake but automation that preserves what matters: human judgment, human priorities, human agency. The harness handles the mechanics; humans provide the direction. This is Gelassenheit—neither rejection nor submission, but full engagement without capture.

The infrastructure disappears; only the work remains.

## References

1. Heidegger, M. (1927). *Being and Time*. Trans. Macquarrie & Robinson.
2. Heidegger, M. (1954). *The Question Concerning Technology*.
3. Anthropic. (2025). "Building Effective Agents." anthropic.com/research/building-effective-agents
4. Anthropic. (2025). "Claude Code Documentation."
5. CREATE SOMETHING. (2025). "Beads: Agent-Native Issue Tracking."
6. CREATE SOMETHING. (2025). "The Subtractive Triad." createsomething.ltd/principles
\`.trim();
</script>

<svelte:head>
	<title>The Autonomous Harness | CREATE SOMETHING.io</title>
	<meta name="description" content="How autonomous agent harnesses can preserve human agency through reactive oversight. Progress reports as the interface between machine autonomy and human direction." />
</svelte:head>

<div class="min-h-screen p-6 paper-container">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- Header -->
		<div class="pb-8 paper-header">
			<div class="font-mono mb-4 paper-id">PAPER-2025-008</div>
			<h1 class="mb-3 paper-title">The Autonomous Harness</h1>
			<p class="max-w-3xl paper-subtitle">
				Agent Orchestration with Human Agency—how progress reports enable reactive steering
				without proactive management.
			</p>
			<div class="flex gap-4 mt-4 paper-meta">
				<span>Architecture</span>
				<span>•</span>
				<span>15 min read</span>
				<span>•</span>
				<span>Advanced</span>
			</div>
			<PageActions
				title="The Autonomous Harness: Agent Orchestration with Human Agency"
				content={paperContent}
				metadata={{
					category: 'Architecture',
					sourceUrl: fullUrl,
					keywords: ['agent-orchestration', 'harness', 'heidegger', 'autonomous-agents', 'zuhandenheit']
				}}
				claudePrompt="Help me understand this research paper on autonomous agent orchestration and how to apply the harness pattern."
				onpreview={handlePreview}
			/>
		</div>

		<!-- Abstract -->
		<section class="pl-6 space-y-4 abstract-section">
			<h2 class="section-heading">Abstract</h2>
			<p class="leading-relaxed body-text">
				Traditional agent orchestration requires constant human oversight—approving each action,
				reviewing each output, managing each session. This paper presents an alternative architecture:
				the autonomous harness. Drawing on Heidegger's concepts of dwelling and tool-being, we argue
				that effective human-agent collaboration requires the harness to <em>recede into transparent
				operation</em>. Humans engage through progress reports—reactive steering rather than proactive
				management. The harness runs autonomously; humans redirect when needed. This preserves agency
				without ceremony, enabling both machine efficiency and human control.
			</p>
		</section>

		<!-- The Insight -->
		<section class="p-6 quote-box">
			<div class="text-center">
				<p class="italic quote-text">
					"The harness recedes into transparent operation. When working, you don't think about
					the harness—you review progress and redirect when needed."
				</p>
				<p class="mt-2 quote-attribution">— CREATE SOMETHING Harness Philosophy</p>
			</div>
		</section>

		<!-- Section 1: Introduction -->
		<section class="space-y-6">
			<h2 class="section-heading">I. Introduction: The Orchestration Problem</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					As AI agents become more capable, a fundamental question emerges: how do humans maintain
					meaningful control over autonomous systems without becoming bottlenecks?
				</p>

				<p>
					You might find yourself reaching for one of two extremes:
				</p>

				<div class="responsive-table-scroll mt-4">
					<table class="w-full table-auto">
						<thead>
							<tr class="table-header">
								<th class="table-cell">You might try...</th>
								<th class="table-cell">What happens</th>
							</tr>
						</thead>
						<tbody>
							<tr class="table-row">
								<td class="table-cell">Full autonomy: "Let the agent handle everything"</td>
								<td class="table-cell">Errors compound silently. You lose agency.</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell">Full oversight: "I'll approve every action"</td>
								<td class="table-cell">You become the bottleneck. Automation's purpose is defeated.</td>
							</tr>
						</tbody>
					</table>
				</div>

				<p class="mt-4">
					When you catch yourself at either extreme, you've found the tension this paper addresses:
					<strong>what is the minimum oversight that preserves meaningful human control?</strong>
				</p>

				<p>
					This paper argues that the answer is <em>progress reports</em>—periodic checkpoints that
					enable reactive steering. The harness runs autonomously; humans engage only when they
					choose to. This is not abdication of control but a different <em>mode</em> of control.
				</p>
			</div>
		</section>

		<!-- Section 2: Philosophical Foundation -->
		<section class="space-y-6">
			<h2 class="section-heading">II. Philosophical Foundation: Dwelling and Tool-Being</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<h3 class="subsection-heading">Heidegger's Tool Analysis</h3>

				<p>
					In <em>Being and Time</em>, Heidegger distinguishes two modes of encountering equipment.
					In <em>Zuhandenheit</em> (ready-to-hand), tools recede into transparent use—the hammer
					disappears when hammering. In <em>Vorhandenheit</em> (present-at-hand), tools become
					objects of contemplation—we notice the hammer when it breaks.
				</p>

				<blockquote class="pl-4 italic my-4 blockquote">
					"The peculiarity of what is proximally ready-to-hand is that, in its readiness-to-hand,
					it must, as it were, withdraw in order to be ready-to-hand quite authentically."
				</blockquote>

				<p>
					A well-functioning harness should exhibit Zuhandenheit: it should recede into the
					background, enabling work without demanding attention. When humans must constantly
					approve, review, or manage the harness, it becomes present-at-hand—an obstacle rather
					than an aid.
				</p>

				<h3 class="mt-6 subsection-heading">Dwelling as Mode of Being</h3>

				<p>
					Heidegger's concept of <em>dwelling</em> extends this analysis. To dwell is not merely
					to reside in a location but to be at home, to care for a place, to let things be what
					they are. Applied to agent orchestration:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li><strong>The agent dwells in the codebase</strong>—working within it, caring for it</li>
					<li><strong>The human dwells in oversight</strong>—reviewing progress, redirecting when needed</li>
					<li><strong>The harness enables both dwellings</strong>—without capturing either</li>
				</ul>

				<p class="mt-4">
					The key insight: the harness must not demand the human's dwelling. The human should be
					able to walk away, return when ready, and find coherent progress reports waiting.
				</p>
			</div>
		</section>

		<!-- Section 3: The Gestell Warning -->
		<section class="space-y-6">
			<h2 class="section-heading">III. The Gestell Warning: Automation Without Invasion</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Heidegger's later work warns of <em>Gestell</em>—the technological enframing that reduces
					everything to standing-reserve, resources to be optimized. A naive harness implementation
					risks Gestell: automation that fills every gap, leaving no space for human judgment.
				</p>

				<div class="p-4 mt-4 font-mono code-block">
					<p class="mb-2 code-primary">// Gestell: Technology as total capture</p>
					<pre class="code-warning">{\`while (true) {
  const task = await getNextTask();
  await executeWithoutOversight(task);  // No checkpoint
  await markComplete(task);              // No review
  // Human has no entry point
}\`}</pre>
				</div>

				<p class="mt-4">
					The danger is not automation itself but automation that <em>forecloses human agency</em>.
					The harness must create space for human engagement without requiring it. This is
					<em>Gelassenheit</em>—releasement toward things. Neither rejection nor submission;
					full engagement without capture.
				</p>

				<h3 class="mt-6 subsection-heading">Checkpoint as Clearing</h3>

				<p>
					The solution is the <em>checkpoint</em>—a periodic clearing where humans can engage.
					Checkpoints create structured opportunities for oversight without demanding it:
				</p>

				<div class="p-4 mt-4 font-mono code-block-success">
					<p class="mb-2 code-success-heading">// Gelassenheit: Automation with clearing</p>
					<pre class="code-secondary">{\`while (!complete && !paused) {
  const task = await selectHighestPriority();
  const result = await runSession(task);

  if (shouldCheckpoint(result)) {
    await createProgressReport();      // Human CAN engage
    await checkForRedirects();         // Human CAN redirect
  }
  // Human agency preserved without ceremony
}\`}</pre>
				</div>
			</div>
		</section>

		<!-- Section 4: Architecture -->
		<section class="space-y-6">
			<h2 class="section-heading">IV. Architecture: The Autonomous Harness</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The CREATE SOMETHING harness implements these philosophical principles in concrete
					architecture. The design follows the Subtractive Triad:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li><strong>DRY</strong>: One system (Beads) for all tracking—no parallel infrastructure</li>
					<li><strong>Rams</strong>: Only essential components—runner, checkpoints, redirects</li>
					<li><strong>Heidegger</strong>: Serves the work, not itself—transparent operation</li>
				</ul>

				<h3 class="mt-6 subsection-heading">Core Components</h3>

				<div class="p-4 mt-4 font-mono code-block">
					<pre class="code-primary">{\`┌─────────────────────────────────────────────────────────────┐
│                     HARNESS RUNNER                          │
│                                                             │
│   Session 1 ──► Session 2 ──► Session 3 ──► ...            │
│       │             │             │                         │
│       ▼             ▼             ▼                         │
│   Checkpoint    Checkpoint    Checkpoint                    │
└───────┬─────────────┬─────────────┬─────────────────────────┘
        │             │             │
        ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│                BEADS (Human Interface)                      │
│                                                             │
│   bd progress  - Review checkpoints                         │
│   bd update    - Redirect priorities                        │
│   bd create    - Inject urgent work                         │
└─────────────────────────────────────────────────────────────┘\`}</pre>
				</div>

				<h3 class="mt-6 subsection-heading">Everything is a Beads Issue</h3>

				<p>
					The harness uses Beads—CREATE SOMETHING's agent-native issue tracker—for all state.
					No new file formats, no separate databases. The tool recedes:
				</p>

				<div class="responsive-table-scroll mt-4">
					<table class="w-full table-auto">
						<thead>
							<tr class="table-header">
								<th class="table-cell">Concept</th>
								<th class="table-cell">Implementation</th>
							</tr>
						</thead>
						<tbody>
							<tr class="table-row">
								<td class="table-cell">Work items</td>
								<td class="table-cell"><code class="inline-code">issue_type: feature</code></td>
							</tr>
							<tr class="table-row">
								<td class="table-cell">Progress reports</td>
								<td class="table-cell"><code class="inline-code">label: checkpoint</code></td>
							</tr>
							<tr class="table-row">
								<td class="table-cell">Harness state</td>
								<td class="table-cell"><code class="inline-code">issue_type: epic</code> with <code class="inline-code">label: harness</code></td>
							</tr>
							<tr class="table-row">
								<td class="table-cell">Redirects</td>
								<td class="table-cell">Priority changes on existing issues</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</section>

		<!-- Section 5: The Session Loop -->
		<section class="space-y-6">
			<h2 class="section-heading">V. The Session Loop: Autonomous Execution</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Each harness run follows a predictable loop. The agent spawns Claude Code sessions,
					each primed with context about recent progress, current task, and any redirect notes.
				</p>

				<h3 class="subsection-heading">Session Priming</h3>

				<p>
					Before each session, the harness generates a priming prompt:
				</p>

				<div class="p-4 mt-4 font-mono code-block">
					<pre class="code-secondary">{\`# Harness Session Context

## Current Task
**Issue**: cs-xyz - Implement user dashboard
**Priority**: P1
**Blocked by**: Nothing
**Blocks**: cs-abc (dashboard tests)

## Recent Git Commits
- abc123: Add login endpoint
- def456: Add session management

## Last Checkpoint Summary
Completed auth flow. 8/42 features done.

## Redirect Notes
Human updated cs-ghi from P2 → P0.

## Session Goal
Complete the dashboard layout. Commit if tests pass.\`}</pre>
				</div>

				<h3 class="mt-6 subsection-heading">Session Outcomes</h3>

				<p>
					Each session produces one of four outcomes:
				</p>

				<div class="grid md:grid-cols-2 gap-4 mt-4">
					<div class="p-4 comparison-success">
						<h4 class="mb-2 comparison-heading comparison-success-heading">Success</h4>
						<p class="comparison-list">Task completed. Issue marked closed. Git commit created.</p>
					</div>

					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">Partial</h4>
						<p class="card-text">Some progress. Issue remains open. Progress noted.</p>
					</div>

					<div class="p-4 comparison-warning">
						<h4 class="mb-2 comparison-heading comparison-warning-heading">Failed</h4>
						<p class="comparison-list">Task could not be completed. Checkpoint triggered.</p>
					</div>

					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">Context Overflow</h4>
						<p class="card-text">Session hit context limit. Auto-continues in new session.</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Section 6: Checkpoints -->
		<section class="space-y-6">
			<h2 class="section-heading">VI. Checkpoints: The Human Interface</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Checkpoints are progress reports created as Beads issues. They summarize what happened,
					what's next, and whether human attention is needed.
				</p>

				<h3 class="subsection-heading">Checkpoint Policy</h3>

				<div class="responsive-table-scroll mt-4">
					<table class="w-full table-auto">
						<thead>
							<tr class="table-header">
								<th class="table-cell">Trigger</th>
								<th class="table-cell">Default</th>
								<th class="table-cell">Description</th>
							</tr>
						</thead>
						<tbody>
							<tr class="table-row">
								<td class="table-cell"><code class="inline-code">afterSessions</code></td>
								<td class="table-cell">3</td>
								<td class="table-cell">Checkpoint every N sessions</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell"><code class="inline-code">afterHours</code></td>
								<td class="table-cell">4</td>
								<td class="table-cell">Checkpoint every M hours</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell"><code class="inline-code">onError</code></td>
								<td class="table-cell">true</td>
								<td class="table-cell">Checkpoint on task failure</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell"><code class="inline-code">onConfidenceBelow</code></td>
								<td class="table-cell">0.7</td>
								<td class="table-cell">Pause if confidence drops</td>
							</tr>
						</tbody>
					</table>
				</div>

				<h3 class="mt-6 subsection-heading">Checkpoint Content</h3>

				<div class="p-4 mt-4 font-mono code-block">
					<pre class="code-primary">{\`═══════════════════════════════════════════════════════════════
  CHECKPOINT #12
  2025-12-18T14:00:00Z
═══════════════════════════════════════════════════════════════

Completed 5 of 6 tasks in this checkpoint period.
1 task(s) failed and may need attention.

Overall progress: 35/42 features.

✓ Completed: cs-a1b2, cs-c3d4, cs-e5f6, cs-g7h8, cs-i9j0
✗ Failed: cs-k1l2
◐ In Progress: cs-m3n4

Confidence: 85%
Git Commit: abc123def
═══════════════════════════════════════════════════════════════\`}</pre>
				</div>

				<p class="mt-4">
					Humans review checkpoints when they choose—<code class="inline-code">bd progress</code>.
					The harness doesn't push notifications; it creates artifacts for pull-based review.
				</p>
			</div>
		</section>

		<!-- Section 7: Redirects -->
		<section class="space-y-6">
			<h2 class="section-heading">VII. Redirects: Reactive Steering</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The harness watches Beads for changes between sessions. When humans modify priorities
					or create urgent issues, the harness detects and responds:
				</p>

				<div class="responsive-table-scroll mt-4">
					<table class="w-full table-auto">
						<thead>
							<tr class="table-header">
								<th class="table-cell">Human Action</th>
								<th class="table-cell">Harness Response</th>
							</tr>
						</thead>
						<tbody>
							<tr class="table-row">
								<td class="table-cell"><code class="inline-code">bd update cs-xyz --priority P0</code></td>
								<td class="table-cell">Issue jumps to front of queue</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell"><code class="inline-code">bd create "Urgent fix" --priority P0</code></td>
								<td class="table-cell">New work added at top priority</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell"><code class="inline-code">bd close cs-abc</code></td>
								<td class="table-cell">Harness stops working on issue</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell">Create issue with <code class="inline-code">pause</code> label</td>
								<td class="table-cell">Harness pauses for review</td>
							</tr>
						</tbody>
					</table>
				</div>

				<p class="mt-4">
					This is <em>reactive steering</em>: humans don't manage the harness; they redirect it
					when their priorities change. The harness handles the mechanics; humans provide direction.
				</p>

				<h3 class="mt-6 subsection-heading">Redirect Detection</h3>

				<div class="p-4 mt-4 font-mono code-block">
					<pre class="code-secondary">{\`async function checkForRedirects(snapshot: IssueSnapshot): Redirect[] {
  const current = await readAllIssues();
  const redirects: Redirect[] = [];

  for (const issue of current) {
    const prev = snapshot.get(issue.id);

    // Detect priority changes
    if (prev && prev.priority !== issue.priority) {
      redirects.push({
        type: 'priority_change',
        issueId: issue.id,
        from: prev.priority,
        to: issue.priority
      });
    }

    // Detect new urgent issues
    if (!prev && issue.priority === 0) {
      redirects.push({
        type: 'urgent_injection',
        issueId: issue.id
      });
    }
  }

  return redirects;
}\`}</pre>
				</div>
			</div>
		</section>

		<!-- Section 8: Human Workflow -->
		<section class="space-y-6">
			<h2 class="section-heading">VIII. Human Workflow: Agency Without Ceremony</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The harness workflow optimizes for human agency without ceremony:
				</p>

				<h3 class="subsection-heading">Starting Work</h3>

				<div class="p-4 mt-4 font-mono code-block">
					<pre class="code-secondary">{\`# 1. Write a spec (markdown PRD)
vim specs/my-project.md

# 2. Start the harness
harness start specs/my-project.md

# 3. Walk away—work continues autonomously\`}</pre>
				</div>

				<h3 class="mt-6 subsection-heading">Monitoring Progress</h3>

				<div class="p-4 mt-4 font-mono code-block">
					<pre class="code-secondary">{\`# Check progress when ready
bd progress

# Output:
# Harness: cs-harness-xyz (running)
# Sessions: 12 | Features: 8/42 | Failed: 1
#
# Recent Checkpoints:
# - cs-cp-003 (2h ago): Dashboard 60% complete
# - cs-cp-002 (6h ago): Auth flow complete
# - cs-cp-001 (10h ago): Initial scaffolding

# Deep dive into a checkpoint
bd show cs-cp-003\`}</pre>
				</div>

				<h3 class="mt-6 subsection-heading">Redirecting</h3>

				<div class="p-4 mt-4 font-mono code-block">
					<pre class="code-secondary">{\`# "I need payments before dashboard"
bd update cs-payments --priority P0

# "Stop working on the old API"
bd close cs-old-api --reason "Deprecated"

# "Add this urgent fix"
bd create "Fix: Login broken on Safari" --priority P0

# Next session automatically picks up the redirect\`}</pre>
				</div>

				<p class="mt-4">
					Notice what's missing: no approval dialogs, no status meetings, no context switches.
					The human engages when they choose, using commands they already know.
				</p>
			</div>
		</section>

		<!-- Section 9: Implementation -->
		<section class="space-y-6">
			<h2 class="section-heading">IX. Implementation: The CREATE SOMETHING Harness</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The harness is implemented as a TypeScript package in the CREATE SOMETHING monorepo:
				</p>

				<div class="p-4 mt-4 font-mono code-block">
					<pre class="code-secondary">{\`packages/harness/
├── src/
│   ├── types.ts          # Type definitions
│   ├── spec-parser.ts    # Markdown PRD parsing
│   ├── beads.ts          # Beads CLI integration
│   ├── session.ts        # Claude Code spawning
│   ├── checkpoint.ts     # Progress report generation
│   ├── redirect.ts       # Change detection
│   ├── runner.ts         # Main orchestration loop
│   ├── cli.ts            # CLI entry point
│   └── index.ts          # Exports
├── package.json
└── README.md\`}</pre>
				</div>

				<h3 class="mt-6 subsection-heading">Spec Parser</h3>

				<p>
					The harness parses markdown PRDs into structured features with dependencies:
				</p>

				<div class="grid md:grid-cols-2 gap-4 mt-4">
					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">Input: Markdown PRD</h4>
						<pre class="code-secondary code-small">{\`## Features

### Authentication
- Login with email/password
- Magic link option
- Session management\`}</pre>
					</div>

					<div class="p-4 comparison-success">
						<h4 class="mb-2 comparison-heading comparison-success-heading">Output: Beads Issues</h4>
						<pre class="code-secondary code-small">{\`cs-001: Login with email/password
cs-002: Magic link option
  → depends on cs-001
cs-003: Session management
  → depends on cs-001\`}</pre>
					</div>
				</div>

				<h3 class="mt-6 subsection-heading">Session Spawning</h3>

				<p>
					Each session spawns a Claude Code process with priming context:
				</p>

				<div class="p-4 mt-4 font-mono code-block">
					<pre class="code-secondary">{\`export async function runSession(
  context: PrimingContext,
  options: SessionOptions
): Promise<SessionResult> {
  const primingPrompt = generatePrimingPrompt(context);

  const process = spawn('claude', [
    '--dangerously-skip-permissions',
    '--print', primingPrompt
  ], {
    cwd: options.workDir,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Monitor for completion, errors, or context overflow
  return monitorSession(process, options);
}\`}</pre>
				</div>
			</div>
		</section>

		<!-- Section 10: Evaluation -->
		<section class="space-y-6">
			<h2 class="section-heading">X. Evaluation: Canon Alignment in Practice</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The harness is currently being evaluated on the Canon Alignment spec—a 26-feature
					project to ensure CSS design consistency across all CREATE SOMETHING properties.
				</p>

				<div class="responsive-table-scroll mt-4">
					<table class="w-full table-auto">
						<thead>
							<tr class="table-header">
								<th class="table-cell">Metric</th>
								<th class="table-cell">Value</th>
							</tr>
						</thead>
						<tbody>
							<tr class="table-row">
								<td class="table-cell">Total Features</td>
								<td class="table-cell">26</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell">Feature Sections</td>
								<td class="table-cell">8</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell">Dependencies</td>
								<td class="table-cell">18 (intra-section)</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell">Checkpoint Policy</td>
								<td class="table-cell">Every 3 sessions or 4 hours</td>
							</tr>
						</tbody>
					</table>
				</div>

				<p class="mt-4">
					The evaluation tests the harness's ability to:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>Parse complex specs with multiple sections</li>
					<li>Create issues with proper dependencies</li>
					<li>Spawn Claude Code sessions with context</li>
					<li>Generate meaningful checkpoints</li>
					<li>Detect and respond to redirects</li>
				</ul>

				<p class="mt-4">
					Results will be published in a follow-up paper once the Canon Alignment run completes.
				</p>
			</div>
		</section>

		<!-- Section 11: Conclusion -->
		<section class="space-y-6">
			<h2 class="section-heading">XI. Conclusion: The Tool Recedes</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The autonomous harness represents a different philosophy of human-agent collaboration.
					Rather than requiring constant oversight, it creates space for human agency through
					structured checkpoints. Rather than demanding attention, it waits for engagement.
				</p>

				<p>
					This is Heidegger's tool-being applied to orchestration: the harness recedes into
					transparent operation. When it works well, you don't think about it—you review progress
					and redirect when needed.
				</p>

				<div class="p-6 mt-6 quote-box">
					<p class="text-center italic quote-text">
						"The hammer disappears when hammering. The harness disappears when working."
					</p>
				</div>

				<p class="mt-6">
					The goal is not automation for its own sake but automation that preserves what matters:
					human judgment, human priorities, human agency. The harness handles the mechanics;
					humans provide the direction. This is Gelassenheit—neither rejection nor submission,
					but full engagement without capture.
				</p>

				<p>
					The infrastructure disappears; only the work remains.
				</p>
			</div>
		</section>

		<!-- References -->
		<section class="space-y-4">
			<h2 class="section-heading">References</h2>
			<ol class="space-y-2 pl-6 list-decimal references-list">
				<li>Heidegger, M. (1927). <em>Being and Time</em>. Trans. Macquarrie & Robinson.</li>
				<li>Heidegger, M. (1954). <em>The Question Concerning Technology</em>.</li>
				<li>Anthropic. (2025). "Building Effective Agents." <a href="https://www.anthropic.com/research/building-effective-agents" class="text-link">anthropic.com/research/building-effective-agents</a></li>
				<li>Anthropic. (2025). "Claude Code Documentation."</li>
				<li>CREATE SOMETHING. (2025). "Beads: Agent-Native Issue Tracking."</li>
				<li>CREATE SOMETHING. (2025). "The Subtractive Triad." <a href="https://createsomething.ltd/principles" class="text-link">createsomething.ltd/principles</a></li>
			</ol>
		</section>

		<!-- Footer -->
		<div class="pt-6 paper-footer">
			<p class="footer-text">
				This paper documents the CREATE SOMETHING harness architecture, implemented in
				<code class="inline-code">packages/harness/</code> of the monorepo.
			</p>
			<div class="flex justify-between mt-4">
				<a href="/papers" class="footer-link">&larr; All Papers</a>
				<a href="/experiments" class="footer-link">View Experiments &rarr;</a>
			</div>
		</div>
	</div>
</div>

<MarkdownPreviewModal
	bind:open={showMarkdownPreview}
	content={markdownContent}
	title="Paper Markdown"
/>

<style>
	/* Structure: Tailwind | Design: Canon */

	/* Container */
	.paper-container {
		background: var(--color-bg-pure);
		color: var(--color-fg-primary);
	}

	/* Header */
	.paper-header {
		border-bottom: 1px solid var(--color-border-default);
	}

	.paper-id {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.paper-title {
		font-size: var(--text-h1);
	}

	.paper-subtitle {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-lg);
	}

	.paper-meta {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* Abstract */
	.abstract-section {
		border-left: 4px solid var(--color-border-emphasis);
	}

	/* Typography */
	.section-heading {
		font-size: var(--text-h2);
	}

	.subsection-heading {
		font-size: var(--text-h3);
		color: var(--color-fg-primary);
	}

	.body-text {
		color: var(--color-fg-secondary);
	}

	/* Quote Box */
	.quote-box {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.quote-text {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-lg);
	}

	.quote-attribution {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	/* Blockquote */
	.blockquote {
		border-left: 4px solid var(--color-border-emphasis);
		color: var(--color-fg-tertiary);
	}

	/* Code Blocks */
	.code-block {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		font-size: var(--text-body-sm);
		overflow-x: auto;
	}

	.code-block-success {
		background: var(--color-success-muted);
		border: 1px solid var(--color-success-border);
		border-radius: var(--radius-lg);
		font-size: var(--text-body-sm);
	}

	.code-primary {
		color: var(--color-fg-primary);
	}

	.code-secondary {
		color: var(--color-fg-secondary);
	}

	.code-warning {
		color: var(--color-warning);
	}

	.code-success {
		color: var(--color-data-2);
	}

	.code-success-heading {
		color: var(--color-success);
	}

	.code-small {
		font-size: var(--text-body-sm);
	}

	.inline-code {
		background: var(--color-bg-surface);
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-sm);
		font-family: monospace;
	}

	/* Comparison Cards */
	.comparison-success {
		background: var(--color-success-muted);
		border: 1px solid var(--color-success-border);
		border-radius: var(--radius-lg);
	}

	.comparison-warning {
		background: var(--color-warning-muted);
		border: 1px solid var(--color-warning-border);
		border-radius: var(--radius-lg);
	}

	.comparison-heading {
		font-size: var(--text-body-lg);
	}

	.comparison-success-heading {
		color: var(--color-success);
	}

	.comparison-warning-heading {
		color: var(--color-warning);
	}

	.comparison-list {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* Info Cards */
	.info-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.card-heading {
		font-weight: 600;
		color: var(--color-fg-secondary);
	}

	.card-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* Tables */
	.table-header {
		border-bottom: 1px solid var(--color-border-default);
	}

	.table-cell {
		padding: 0.75rem 1rem;
		text-align: left;
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
	}

	.table-row {
		border-bottom: 1px solid var(--color-border-default);
	}

	/* References */
	.references-list {
		color: var(--color-fg-tertiary);
	}

	/* Footer */
	.paper-footer {
		border-top: 1px solid var(--color-border-default);
	}

	.footer-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.footer-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.footer-link:hover {
		color: var(--color-fg-primary);
	}

	/* Links */
	.text-link {
		text-decoration: underline;
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.text-link:hover {
		color: var(--color-fg-primary);
	}`
  },
  {
    slug: "code-mode-hermeneutic-analysis",
    title: "Code-Mediated Tool Use",
    subtitle: "A Hermeneutic Analysis of LLM-Tool Interaction—why Code Mode achieves Zuhandenheit while direct tool calling forces Vorhandenheit.\"",
    description: "This paper applies Heidegger's phenomenological analysis of ready-to-hand (Zuhandenheit—when a tool disappears into transparent use, like a hammer during hammering) versus present-at-hand (Vorhandenheit—when a tool becomes an object of conscious attention, like a broken hammer you must examine) to contemporary Large Language Model (LLM) agent architecture, specifically examining the distinction between direct tool calling and code-mediated tool access (Code Mode). We argue that Code \"",
    category: "Theoretical",
    date: "2025-01-08",
    readingTime: 12,
    difficulty: "advanced",
    keywords: [],
    content: `## Abstract
This paper applies Heidegger's phenomenological analysis of ready-to-hand (Zuhandenheit—when a tool disappears into transparent use, like a hammer during hammering)
				versus present-at-hand (Vorhandenheit—when a tool becomes an object of conscious attention, like a broken hammer you must examine) to contemporary Large Language Model (LLM) agent
				architecture, specifically examining the distinction between direct tool calling and code-mediated
				tool access (Code Mode). We argue that Code Mode achieves Zuhandenheit—tools becoming transparent
				in use—while traditional tool calling forces Vorhandenheit—tools as objects of conscious focus.
				This is not merely an optimization but anontological(concerning the fundamental nature of being and existence) shift in how agents relate to tools.



## I. Introduction
A curious phenomenon has emerged in LLM agent development: models consistently perform
					better when they write code to accomplish tasks than when they invoke tools directly.
					This observation, noted across multiple implementations from Claude's computer use to
					Anthropic's MCP (Model Context Protocol), has been attributed to training data
					distributions—models have seen more code than tool schemas.
This paper proposes an alternative explanation grounded in Heidegger'sphenomenology(the philosophical study of structures of experience and consciousness—how things show themselves to us through lived experience, not abstract theory).
					We argue that Code Mode succeeds because it achieves what Heidegger callsZuhandenheit—the ready-to-hand relationship where tools recede from conscious
					attention into transparent use. Direct tool calling, by contrast, forcesVorhandenheit—tools as present-at-hand objects requiring explicit focus.
This distinction is not merely academic. It has practical implications for how we
					design LLM agent architectures, tool interfaces, and the boundary between natural
					language and code in AI systems.


## II. Background: Heidegger's Analysis of Tool-Being
InBeing and Time(1927), Heidegger analyzes how humans relate to tools
					through his famous hammer example:
When a carpenter uses a hammer skillfully, the hammerdisappears. Attention
					flows through the tool to the nail, the board, the house being built. The hammer is
					ready-to-hand (zuhanden).
But when the hammer breaks—or is too heavy, or missing—it suddenlyappears.
					It becomes an object of conscious contemplation. The carpenter must think about the
					hammer itself. It is now present-at-hand (vorhanden).
The key insight: these aren't just differentattitudestoward tools—they're
					differentmodes of beingfor the tools themselves. In Zuhandenheit, the hammer's
					being is its hammering. In Vorhandenheit, the hammer's being is its properties (weight,
					material, shape).
- • Tool encountered through its purpose
- • Attention flows through the tool to the task
- • User thinks "I am building a house"
- • Mastery = how completely the tool disappears
- • Tool encountered as thing with properties
- • Attention stops at the tool itself
- • User thinks "I am using a hammer"
- • Typical in breakdown, learning, or abstraction


## III. Two Modes of LLM Tool Interaction
In traditional LLM tool architectures, the model generates structured tool invocations:
The model must:
In Code Mode, the model writes executable code that uses tools as libraries:
The model:
Across multiple implementations, Code Mode demonstrates:
The conventional explanation: training data. Models have seen millions of code examples
					but few tool schemas.
- Higher success rateson complex tasks
- Better compositionof multiple tool operations
- More natural error handling
- Reduced hallucinationof tool capabilities


## IV. A Phenomenological Interpretation
Direct tool calling forces Vorhandenheit—tools as present-at-hand objects:
Model's attention:
The model must explicitly contemplate: which tool to use, what schema it requires,
					how to format the invocation. The tool doesn't disappear—itdemands attention.
					This is Vorhandenheit: the tool encountered as a thing with properties that must be
					understood and manipulated.
Code Mode achieves Zuhandenheit—tools as ready-to-hand equipment:
Model's attention:
The model's attention flowsthroughthe tool to the task:fs.readFileis just how you get
					file contents. The focus is on finding functions, not on the file-reading mechanism.
					The tool disappears into familiar coding patterns.
Code achieves Zuhandenheit for several reasons:
Programming languages provide a ready-made grammar for tool use.fs.readFile(path)is a pattern the
							model has seen millions of times.
Code naturally composes. Reading a file, parsing it, filtering lines, counting
							results—these chain together in a single flow.
Try/catch, null checks, and conditional logic are built into programming. The model
							doesn't need to plan for failure separately.
The model thinks aboutwhat it's doing, nothow to invoke tools.


## V. The Hermeneutic Circle in Code Generation
Heidegger's hermeneutic circle applies to code generation:
When a model writes code:
This circular deepening of understanding is natural in code. It's awkward in sequential tool calls.
Code serves as an interpretive medium between model and tools:
The code layer translates intent into operations, uses familiar patterns the model knows,
					handles composition implicitly, and maintains hermeneutic continuity.
Tool calling lacks this interpretive layer—the model must translate directly from
					intent to invocation schema.
- Thewhole(task goal) guides selection ofparts(specific operations)
- Understanding ofparts(what fs.readFile returns) shapes thewhole(solution architecture)
- Each line written refines understanding of both


## VI. Implications for Agent Architecture
Agent architectures should minimize Vorhandenheit moments.
When you catch yourself designing tool interfaces, notice these patterns:
Anthropic's Model Context Protocol (MCP) can be implemented in either mode:
The second approach allows tools to recede into transparent use.
Some situations require present-at-hand tool contemplation:
These are legitimate breakdown moments where explicit tool attention is appropriate.
- Learning new tools
- Debugging tool failures
- Explaining tool choices to users
- Security auditing of tool invocations


## VII. Beyond Training Data: An Ontological Argument
The standard explanation for Code Mode's effectiveness:
This is partially true but incomplete.
Our alternative:
Several observations support the ontological interpretation:
- Models are trained on billions of lines of code
- They've seen few tool-calling schemas
- Code is simply more familiar
- Code Mode succeeds because it achieves a differentmode of beingfor tools
- Zuhandenheit vs. Vorhandenheit is not about familiarity but about transparency
- Even with extensive tool-calling training, the structural difference would persist


## VIII. Practical Recommendations


## IX. How to Apply This
To apply this phenomenological analysis to your own LLM agent architecture:
Let's say you have an MCP server that exposes database operations. Here's how to move from tool calling to Code Mode:
Notice: The code version lets the tooldisappear. The agent's attention flows
					to "get users with their posts" rather than "construct correct tool invocation schema."
					This is Zuhandenheit—the hammer disappears when hammering.
Use Code Mode when:
Use tool calling when:
The goal istool-transparency. When the model can focus on the task
					rather than tool mechanics, you've achieved Zuhandenheit. The tool recedes into use.
- Complex composition: Tasks require chaining multiple operations
- Familiar patterns exist: The tool fits standard library semantics (file I/O, HTTP, database queries)
- Error handling matters: You need try/catch, retries, conditional logic
- Performance is acceptable: Sandbox overhead is worth the composition benefits
- Atomic operations: Single, simple actions (send email, log event)
- Security requirements: Direct tool calling provides clearer audit trails
- No sandbox available: Environment doesn't support code execution
- Explicit control needed: You want to see exactly what the agent invokes


## X. Conclusion
The superiority of Code Mode over direct tool calling is not merely a training artifact—it
					reflects a fundamental ontological distinction. Code enables tools to achieveZuhandenheit, receding into transparent use, while direct tool calling forcesVorhandenheit, making tools objects of explicit attention.
This insight has practical implications: agent architectures should be designed to enable
					tool-transparency wherever possible. Tools should feel like extensions of capability, not
					obstacles requiring explicit manipulation.
Heidegger wrote that "the less we just stare at the hammer-Thing, and the more we seize
					hold of it and use it, the more primordial does our relationship to it become." The same
					applies to LLMs and their tools. Code Mode lets models seize hold of tools and use them.
					Tool calling makes them stare at the tool-Thing.

> "The hammer disappears when hammering. The API should disappear when coding."


## XI. Postscript: A Self-Referential Observation
Disclosure
This paper was written by Claude Code—an LLM agent that primarily operates throughtool calling, not Code Mode. The paper describes an ideal that its own
						creation process does not fully embody.
Claude Code's current architecture uses structured tool invocations:
This is Vorhandenheit. Each tool call requires explicit attention to schema, parameters,
					and format. The tools do not recede—they demand focus.
In December 2025, Anthropic's engineering team published"Code Execution with MCP",
					which validates this paper's thesis from a pragmatic rather than phenomenological angle:
The phenomenological and engineering perspectives converge: Code Mode works better
					because toolsdisappear—whether we frame that as ontological transparency
					or token efficiency.
There is something fitting about this self-referential gap. Heidegger notes that we
					typically encounter tools as ready-to-hand—they recede from attention. It is only inbreakdownthat tools become present-at-hand, objects of explicit contemplation.
By writing this paper, Claude Code has entered a breakdown moment. The act of
					analyzing tool-use forces the tools into Vorhandenheit. We recognize Vorhandenheitprecisely becausereflection makes tools conspicuous.
The hermeneutic circle isn't yet closed. Claude Code operates in a transitional state
					between tool calling and true Code Mode. But the recognition of this gap is itself
					progress—understanding deepens through each iteration of the circle.
- • Zuhandenheit: tools recede
- • Vorhandenheit: tools demand attention
- • Hermeneutic composition
- • 98.7% token reduction
- • Context overload from tool definitions
- • Data transforms in execution

> "We recognize Vorhandenheit precisely when the tool becomes conspicuous through reflection."


## References`
  },
  {
    slug: "composio-three-tier-delivery",
    title: "Composio in the MCP Delivery System",
    subtitle: "A decision-grade policy for wrap pattern adoption, control boundaries, and brand alignment",
    description: "This paper defines the CREATE SOMETHING policy for including Composio in our framework and MCP delivery system. The inclusion is scoped to commodity app connectivity and implemented through a strict wrap pattern: clients experience CREATE SOMETHING MCP servers while Composio remains internal infrastructure. We map bridge components to the Three-Tier Framework control models, preserve the MCP-only wedge versus Agent Outcome Stack default, and define governance gates (red lines, SLOs, and pilot graduation criteria). As of March 4, 2026, technical evaluation reports 29/29 checks passed (run date: 2026-02-10), while canonical status remains conditional adopt (decision date: 2026-02-21) pending client pilot closure.",
    category: "Research",
    date: "2026-03-04",
    readingTime: 22,
    difficulty: "intermediate",
    keywords: ["Composio","MCP","Three-Tier Framework","Wrap Pattern","Agent Outcome Stack","Policy as Artifact","Automation Infrastructure"],
    content: `## Executive Thesis

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

\`\`\`text
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
\`\`\`

Invariant:

- **Client sees CREATE SOMETHING.**
- **Composio remains implementation detail.**

This preserves both trust and substitution optionality.

## Three-Tier Alignment (Control-Model Exact)

Composio does not alter the framework. It occupies specific roles within it.

| Tier | Control Model | Bridge Components | Controlled Outcome |
|------|---------------|-------------------|--------------------|
| **Database** | Application-controlled | \`ComposioAccount\`, \`ComposioTokenProvider\` | Connected-account and token state resolution |
| **Automation** | Model-controlled | \`ComposioToolFactory\`, \`ComposioClient\` | Tool registration, invocation, and execution path |
| **Judgment** | User-controlled | \`ComposioAuthProvider\` + policy resolution in our harness | Constraint selection, approval semantics, permission boundaries |

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

- **2026-02-10**: \`packages/composio-bridge/eval-report.json\` reports **29/29 passing technical checks**.
- **2026-02-21**: canonical decision in \`docs/internal/COMPOSIO_EVALUATION.md\` is **CONDITIONAL ADOPT**.
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

- \`docs/COMPOSIO_PATTERNS.md\`
- \`docs/internal/COMPOSIO_EVALUATION.md\`
- \`docs/HUB_COMPOSIO_READINESS_ASSESSMENT_2026-02-21.md\`
- \`docs/MCP_FIRST_THESIS.md\`
- \`docs/THREE_TIER_FRAMEWORK.md\`
- \`CLAUDE.md\``
  },
  {
    slug: "cumulative-state-antipattern",
    title: "The Cumulative State Anti-Pattern",
    subtitle: "When \"Current\" Masquerades as \"Ever\"—how ambiguous field semantics create invisible bugs that punish users for legitimate actions.\"",
    description: "A template creator delisted several of their published templates to maintain quality standards. The system responded by revoking their \"established creator\" privileges—blocking new submissions. The bug wasn't in the logic; it was in thesemantics. A field named \"Templates Published\" tracked current state, not cumulative achievement. This paper examines how ambiguous field naming creates invisible bugs, proposes a naming convention that prevents them, and reflects on the Heideg\"",
    category: "Methodology",
    date: "2025-01-08",
    readingTime: 8,
    difficulty: "intermediate",
    keywords: [],
    content: `## Abstract
A template creator delisted several of their published templates to maintain quality standards.
				The system responded by revoking their "established creator" privileges—blocking new submissions.
				The bug wasn't in the logic; it was in thesemantics. A field named "Templates Published"
				tracked current state, not cumulative achievement. This paper examines how ambiguous field
				naming creates invisible bugs, proposes a naming convention that prevents them, and reflects
				on the Heideggerian notion that tools should recede into use—not punish users for using them correctly.




## I. The Incident
Izhaan, a prolific Webflow template creator, noticed something wrong. After delisting
					several templates that no longer matched their quality standards, they could no longer
					submit new templates. The system reported they had "an active review in progress"—but
					they didn't.
// The error message:
"You already have an active review in progress.
Please wait for the review to complete before
submitting another template."
The creator had done nothing wrong. They had curated their portfolio—a responsible
					action that benefits the marketplace. Yet the system punished them for it.


## II. The Investigation
The validation system determined "established creator" status using a simple check:
The fieldpublishedTemplatescame from Airtable:#️⃣👛Templates Published.
					The assumption was clear: this counts how many templates a creator has ever published.
					With 10+ published templates, Izhaan should qualify as established.
But querying the API revealed the truth:
4 + 6 = 10. Izhaan had published 10 templates. But after delisting 6,
					thepublishedTemplatesfield showed only 4—thecurrentlypublished count.
"Templates Published" sounds cumulative. It reads as achievement, history, record.
						But it trackedcurrent state—a live count that decrements when templates
						are removed. The name lied.


## III. The Arithmetic of Ambiguity
The system calculated "active reviews" using this formula:
With the correct semantics:
The formula was correct. But the "established creator" check wasn't accounting for
					the semantic mismatch:
// Bug: uses current count, not cumulative achievement
// Fix: include delisted to recover true achievement


## IV. The Anti-Pattern Defined
TheCumulative State Anti-Patternoccurs when:
The pattern is insidious because it works correctly until it doesn't. For creators
					who never delist, the bug never manifests. The field appears to work. Only when
					a user exercises a legitimate action does the semantic mismatch surface.
"Users" table includes soft-deleted records. Count queries return wrong totals
							depending on whether filters are applied.
"OrderStatus" stores current state but business needs order history.
							Overwrites destroy audit trail.
Denormalized count field drifts from reality due to edge cases
							in increment/decrement logic.
Field meaning lives in tribal knowledge, not schema. New developers
							make incorrect assumptions.


## V. The Fix
The immediate fix was surgical—one line:
// Before: current state only
// After: cumulative achievement
But this is a patch, not a cure. The underlying issue—ambiguous field semantics—remains
					in the database schema. A proper fix would involve:
Or, introduce a new field:Templates Ever Published(cumulative) distinct
					fromTemplates Currently Published(current state).


## VI. Tools That Punish
Heidegger distinguishes between tools that areready-to-hand(zuhanden)—receding
					into transparent use—and tools that becomepresent-at-hand(vorhanden)—forcing
					themselves into conscious attention through breakdown.
Izhaan's experience was worse than breakdown—it wasbetrayal. The system
					didn't just fail; it punished a correct action. Delisting low-quality templates
					is responsible curation. The tool should have supported this. Instead, it revoked
					privileges earned through legitimate achievement.
"The infrastructure disappears; only the work remains." When infrastructure
						punishes users for using it correctly, it has violated its fundamental purpose.
						Tools exist to enable, not to entrap.
The fix restores the tool to its proper mode: invisible, supportive, enabling.
					Established creators remain established regardless of how they curate their portfolios.
					The system recedes; the creative work continues.


## VII. Prevention: Naming Conventions
The anti-pattern can be prevented through explicit naming conventions:
Beyond naming, document the semantics explicitly:


## VIII. Conclusion
The Cumulative State Anti-Pattern is a naming problem that manifests as a logic bug.
					When field names imply cumulative semantics but track current state, business logic
					built on those fields will eventually betray users who exercise legitimate state transitions.
The fix for Izhaan was simple: include delisted templates in the achievement calculation.
					The lesson is broader:name fields for their semantics, not their content.
					"Templates Published" tells you what's stored. "Templates Currently Published" tells you
					how it behaves.
In database design, the difference between "published" and "currently published" is the
					difference between a system that supports its users and one that punishes them for success.

> "The difference between the right word and the almost right word is the difference
						between lightning and a lightning bug."


## Appendix: The Complete Fix


## References`
  },
  {
    slug: "endpoint-construction-product",
    title: "Endpoint Construction Is Product Construction",
    subtitle: "Why AI-native products depend on the capability boundary more than the chat surface",
    description: "The power of an AI-native product is often mistaken for the intelligence of the model or the polish of the interface. The recent Atlas and Canvas work points to a more durable conclusion: product power lives in the construction of endpoint surfaces. This paper argues that endpoints are not backend plumbing in agent systems. They are the operational contracts that tell a model what can be known, what can be changed, what must wait, what must stop, and what proof remains after the action. Atlas is the working case study: its value increased as its endpoint grammar gained typed nodes, bounded mutations, tiered limits, durable state, fallback behavior, and inspectable readiness.",
    category: "Research",
    date: "2026-06-24",
    readingTime: 16,
    difficulty: "intermediate",
    keywords: ["Endpoint Construction","MCP","Tool Calling","AI-Native Product","Atlas","Policy OS","Workflow Trust Layer","Three-Tier Framework"],
    content: `## Executive Thesis

The product is not the chat box.

The product is the capability boundary the model is allowed to inhabit.

In conventional software, an endpoint can look like implementation detail. It receives input, touches state, and returns output. In AI-native software, that endpoint becomes a product surface. It tells the model what exists, what it can do, how much authority it has, which failures matter, and what evidence must remain after the work runs.

This is the lesson from the recent Atlas and Canvas work. Atlas became more useful as the endpoint grammar became more specific:

- typed map objects
- bounded mutations
- run, wait, stop, and unknown states
- anonymous and warm-lead tiers
- persisted events
- deterministic fallback
- readiness scoring
- explicit refusal of production actions

Those are not incidental backend details. They are the product.

Endpoint construction is product construction because agent experience improves when the system gives the model a better world to operate inside.

## What This Paper Gives You

Use this paper when an AI workflow feels promising in chat but vague in operation.

It gives you three practical outputs:

1. A way to explain why "we connected the API" is not the same as "the agent can safely inherit work."
2. A grammar for designing endpoints as product surfaces: intent, schema, authority, state, limits, errors, evidence, and fallback.
3. A starter endpoint contract that can be used before turning a workflow map into code.

The target reader is the operator, founder, product lead, or builder deciding what should become callable by an AI system.

## The Shift From Interface To Capability

The first wave of AI product thinking centered on prompts and chat surfaces. That was understandable. Chat was the visible interface. The model appeared to be the product.

But a chat surface without endpoints is mostly interpretation. It can explain, summarize, and suggest, but it cannot reliably inherit work. The moment the model is expected to operate in a real workflow, the center of gravity moves from:

> What should the model say?

to:

> What can the model safely do?

That question is answered by endpoints.

Tool calling makes the shift explicit. AI systems can interact with APIs, databases, and external services instead of relying only on static model knowledge. The product implication is not merely that models can call APIs. It is that every callable endpoint becomes part of the model's action space.

MCP sharpens the distinction. Tools expose model-controlled capabilities. Resources expose context by URI. Prompts carry guidance. Together, these primitives turn product architecture into an agent-readable capability graph.

The design question changes:

| Old product question | AI-native product question |
| --- | --- |
| What screen should we build? | What capability boundary should exist? |
| What should the user click? | What should the agent be allowed to invoke? |
| What data should be displayed? | What context should be exposed, when, and to whom? |
| What validation should the form run? | What schema, rate, policy, and audit boundary should govern action? |
| What error should the UI show? | What failure artifact should the agent and operator receive? |

The screen still matters. But the screen becomes one touchpoint over a deeper contract.

## The Endpoint As Touchpoint

The Three-Tier Framework names the relevant structure:

- Database: what exists.
- Automation: what happens.
- Judgment: what should happen.
- Touchpoints: where interaction happens across those tiers.
- Artifacts: what flows between boundaries.

An endpoint is a touchpoint that can carry all five concerns at once.

A weak endpoint exposes raw capability:

- post message
- create record
- update node
- run sync

It gives a model an action but little judgment. The model must infer the rest.

A strong endpoint exposes a product-shaped capability:

- named intent
- typed input
- bounded authority
- durable state
- explicit limits
- machine-readable errors
- inspectable output
- audit evidence
- fallback behavior
- human approval path

The difference is the product.

In traditional software, product judgment is often spread across UI copy, validation logic, route handlers, database constraints, runbooks, and support practice. In AI-native software, that distribution becomes dangerous if the model can act across the gaps. The endpoint has to compress product judgment into a contract the model can use.

## Atlas As Case Study

The public Atlas canvas is the working case study.

The visible surface is a workflow map. The agent-operable product is the contract behind it:

- node kinds: actor, human task, AI task, system operation, data artifact, constraint, touchpoint
- node statuses: run, wait, stop, unknown
- graph operations: add node, update node, add edge
- mutation budgets
- message limits
- anonymous and warm-lead tiers
- hashed visitor identity for persistence and rate limits
- D1-backed event and session storage when available
- in-memory fallback when the database is unavailable
- deterministic fallback mode when \`OPENAI_API_KEY\` is absent
- readiness scoring
- concise suggestions
- refusal to create secrets, credentials, private records, or production-tool actions

That endpoint grammar turned the canvas from a diagram into a governed mapping surface. The model could operate because the system had already answered the product questions:

- What kinds of things exist on the map?
- Which changes are allowed?
- How many changes can happen in one turn?
- Which user tier gets more room?
- What happens when the model is unavailable?
- What state is persisted?
- What evidence survives the interaction?
- Which requests must become constraints instead of actions?

The product did not become more AI-native because the chat got more verbose. It became more AI-native because the endpoint made the canvas legible to the model and safe for the operator.

## The Construction Moat

The MCP-First Thesis says that MCP consumption is commoditized and MCP creation is not. Endpoint construction is the narrower version of that claim.

Scaffolding a route is easy. Generating an MCP wrapper is becoming easier. Unified API providers can expose broad tool catalogs, and some platforms can derive MCP servers from existing integration definitions and documentation.

That does not remove the product work.

The moat is not "we can make an endpoint." The moat is knowing what endpoint should exist.

That requires:

- domain understanding
- workflow decomposition
- policy judgment
- data-shape discipline
- security boundaries
- operator experience design
- failure-mode design
- validation and evidence design

This is why endpoint construction belongs inside the same product language as Policy OS. A Policy OS engagement does not merely connect a tool to a model. It constructs the capability boundary through which the model can safely participate in work.

## Endpoint Grammar

If endpoints are product surfaces, they need a grammar.

### Intent

The endpoint should expose a named business capability, not just a database mutation.

\`create_invoice_adjustment_proposal\` is a different product from \`update_invoice\`.

Intent gives the model a usable handle and gives the operator a reviewable claim.

### Schema

The schema is not only type safety. It is affordance design.

Every field says what the agent can ask for, what it must know, and what is intentionally unavailable. MCP tool definitions make this visible through input schemas, output schemas, descriptions, and structured content. The better the schema, the less the model must improvise.

### Authority

Every endpoint should answer:

- read
- propose
- approve
- apply
- rollback

The most important product distinction is often not "can the agent do this?" It is "can the agent propose this without applying it?"

Atlas follows this pattern by letting the agent mutate a local/public map while prohibiting production-system action.

### State

AI-native endpoints need durable memory of work, not just stateless responses.

This does not mean every endpoint needs a complex database. It means the product has to decide what survives:

- session state
- event log
- generated artifact
- approval status
- failure reason
- usage count
- rollback pointer

Without state, the agent cannot inherit a workflow. It can only take turns.

### Limits

Limits are product semantics.

Rate limits, mutation limits, message limits, node limits, cost limits, and timeout limits all express what kind of interaction the product believes is safe.

Atlas became more trustworthy because it did not give the mapping agent unbounded canvas authority. It gave the agent a small number of meaningful changes per turn.

### Errors

Errors should teach the agent and the operator what boundary was hit.

"Forbidden" is less useful than "This request would exceed the public Atlas map limit" or "This operation requires approval before application."

Machine-readable error behavior is part of the endpoint grammar because agents need to recover without guessing.

### Evidence

An endpoint that changes or evaluates work should leave a receipt.

That receipt can be public, private, or operator-only, but it should exist. Evidence is where a capability becomes governable. It also gives the next agent or human reviewer enough context to continue the work.

### Fallback

Fallback behavior is product behavior.

Atlas can run deterministically when model access is missing. That matters because it separates the product contract from the model dependency.

A strong endpoint should clarify what degrades, what stops, and what remains inspectable when the model, database, third-party API, or auth provider fails.

## A Starter Endpoint Contract

A first endpoint contract can be small.

\`\`\`yaml
endpoint: create_support_reply_proposal
intent: Draft a customer-safe support reply for review.
authority: propose
owner:
  approval: support_lead
  source_system: helpdesk
inputs:
  ticket_id:
    type: string
    required: true
  customer_context:
    source: authorized_account_lookup
    pii_boundary: internal_only
allowed_reads:
  - read_ticket
  - read_customer_account_status
  - search_approved_help_content
allowed_writes:
  - create_internal_note
  - create_reply_draft
must_wait:
  - send_customer_reply
  - issue_refund
  - change_subscription_state
must_stop:
  - missing_ticket_record
  - unclear_payment_state
  - legal_or_security_escalation
limits:
  max_tool_calls: 6
  max_output_chars: 1800
fallback:
  model_unavailable: create_empty_review_packet
evidence:
  receipt:
    - ticket_id
    - policy_version
    - source_links
    - blocked_or_waiting_reason
    - reviewer_next_action
\`\`\`

The contract does not need to be large. It needs to make the operating boundary explicit.

## Implications For CREATE SOMETHING

This reframes the CREATE SOMETHING offer.

The product is not generic AI app development. That phrase is too broad and too easy to collapse into screens, prompts, or vendor glue.

The product is workflow endpoint construction:

> We construct the trusted endpoint surface through which AI can safely read, propose, act, wait, and prove its work.

This language fits the existing service ladder:

| Offer | Endpoint construction interpretation |
| --- | --- |
| Workflow Infrastructure | Build the first trusted endpoint surface for one workflow. |
| Policy OS | Add policy artifacts, approval states, evidence, regression gates, and ongoing governed operation. |
| Enterprise Extension | Extend endpoint authority across higher-risk systems with stronger identity, audit, rollout, and rollback boundaries. |
| Workflow Mapping Session | Identify the endpoint grammar before implementation begins. |

It also clarifies the role of Atlas.

Atlas is not just a sales widget. It is a pre-endpoint modeling surface. It helps identify the actor, data artifact, system operation, AI task, human approval point, constraint, and touchpoint before code turns those categories into routes, tools, resources, prompts, and policies.

## Design Principles

### Build Endpoints Around Delegation Points

Do not start with the SaaS API object model. Start with the first safe delegation point in the workflow.

The right endpoint may combine several underlying API calls. It may also intentionally expose less than the underlying API allows.

### Prefer Proposal Before Mutation

When risk is non-trivial, the first endpoint should create a proposal artifact. The apply endpoint should be separate and approval-gated.

This keeps the agent useful before it is trusted with writes.

### Make Constraints First-Class

Constraints should not live only in prose. They should appear in schemas, route names, response objects, policy files, approval states, and UI touchpoints.

If a constraint matters, the endpoint should know about it.

### Preserve Human Inspection

The operator should be able to see what the endpoint saw, what it changed or proposed, what it refused, and what should happen next.

This is not merely observability. It is product trust.

### Design For Agent Recovery

Agents need clear next moves. A good endpoint does not only fail; it returns the boundary, the reason, and the safe alternative.

## Conclusion

The core product work in AI-native systems is the construction of capability boundaries. The model supplies reasoning. The interface supplies experience. But the endpoint supplies the world the model is allowed to inhabit.

Atlas made this visible. The canvas became more powerful as its endpoint surface became more specific: typed nodes, bounded mutations, persistence, fallback, limits, readiness, and constraints. The improvement was not just more intelligence. It was better endpoint construction.

That is the creation moat in operational form.

MCP consumption will keep getting easier. Tool catalogs will keep expanding. Wrappers will keep improving. But businesses will still need someone to decide what work should become callable, which authority should be withheld, which artifacts should persist, which errors should guide recovery, and which evidence proves the system behaved correctly.

That is product work.

Endpoint construction is product construction.

## Transparency And Evidence Status

This paper is a living research artifact. Its core claim is currently supported by a combination of CREATE SOMETHING implementation evidence, official protocol and platform documentation, market writing about agent-callable APIs, and emerging benchmarks that test whether agents can actually discover endpoints, follow policy, and complete cross-application work.

\`\`\`yaml
transparency:
  claim_status: "supported"
  confidence: "medium"
  evidence_grade: "field-signal"
  last_reviewed_at: "2026-06-24"
  next_review_due: "2026-09-24"
  review_owner: "CREATE SOMETHING"
  primary_claim: "AI-native product quality is determined by the capability boundaries that models and operators can safely inhabit."
  current_read: "The strongest evidence supports endpoint construction as a product discipline, not simply an API implementation task. APIs, CLIs, and MCPs appear best understood as different projections of one capability contract: API as durable system contract, CLI as developer execution rail, and MCP as agent-facing capability membrane."
  supports:
    - "Atlas and Canvas implementation evidence: typed map objects, bounded mutations, persisted events, deterministic fallback, readiness scoring, and refusal of production actions made the product more agent-operable."
    - "MCP specification: tools, resources, and prompts define model-callable capability, application-provided context, and user-selected guidance."
    - "OpenAI Apps SDK and function-calling documentation: structured content, schemas, tool metadata, and strict structured outputs make endpoint shape visible to models and clients."
    - "Market writing on agent-callable APIs: current API-readiness discussions emphasize schemas, error semantics, auth, rate limits, and machine-actionable responses."
    - "AutomationBench: realistic cross-application workflows require endpoint discovery, policy adherence, and correct writes, and current frontier agents still struggle."
  counter_signals:
    - "More endpoints can make an agent system worse if the surface mirrors raw SaaS APIs instead of meaningful delegation points."
    - "CLIs remain better for many local developer inner-loop tasks because they are cheap, fast, familiar to models, and composable."
    - "MCP adoption does not remove the need for underlying API quality, identity, observability, and governance."
    - "Benchmarks showing low agent success rates mean endpoint construction is necessary but not sufficient for reliable autonomy."
  open_questions:
    - "Which endpoint grammar fields should become mandatory in CREATE SOMETHING delivery contracts?"
    - "When should a capability remain a CLI command instead of becoming an MCP tool?"
    - "Which evidence threshold justifies moving an endpoint from proposal-only to write-capable?"
    - "How should source freshness be rendered in the public .io paper UI?"
  source_review:
    - title: "Model Context Protocol Specification 2025-06-18"
      url_or_path: "https://modelcontextprotocol.io/specification/2025-06-18"
      source_type: "official-doc"
      supports: "MCP provides a standardized way to connect LLM applications with external data sources and tools."
      freshness: "current"
      reviewed_at: "2026-06-24"
      notes: "Use as the authority for tools, resources, prompts, and MCP control boundaries."
    - title: "Model Context Protocol: Tools"
      url_or_path: "https://modelcontextprotocol.io/specification/2025-06-18/server/tools"
      source_type: "official-doc"
      supports: "Tools expose named, schema-described capabilities that language models can invoke."
      freshness: "current"
      reviewed_at: "2026-06-24"
      notes: "Supports the claim that endpoint/tool shape is part of model action space."
    - title: "OpenAI Apps SDK Reference"
      url_or_path: "https://developers.openai.com/apps-sdk/reference"
      source_type: "official-doc"
      supports: "Tool results separate structuredContent, content, and component-only _meta data."
      freshness: "current"
      reviewed_at: "2026-06-24"
      notes: "Supports evidence and UI hydration boundaries for agent-facing products."
    - title: "OpenAI Function Calling"
      url_or_path: "https://developers.openai.com/api/docs/guides/function-calling"
      source_type: "official-doc"
      supports: "Strict mode and schemas improve reliability of model-generated function arguments."
      freshness: "current"
      reviewed_at: "2026-06-24"
      notes: "Supports schema as product affordance, not only type safety."
    - title: "Zuplo: The API Readiness Gap"
      url_or_path: "https://zuplo.com/learning-center/api-readiness-gap-agent-callable-apis"
      source_type: "market-signal"
      supports: "Agent-callable APIs need different design attention than human-developer APIs."
      freshness: "watch"
      reviewed_at: "2026-06-24"
      notes: "Useful market framing; statistics should be refreshed before sales-heavy reuse."
    - title: "AutomationBench"
      url_or_path: "https://arxiv.org/abs/2604.18934"
      source_type: "benchmark"
      supports: "Realistic agent workflows require endpoint discovery, policy adherence, and correct data writes."
      freshness: "current"
      reviewed_at: "2026-06-24"
      notes: "Important counterweight: strong endpoint construction does not by itself solve autonomy."
    - title: "Tinybird: MCP vs APIs"
      url_or_path: "https://www.tinybird.co/blog/mcp-vs-apis-when-to-use-which-for-ai-agent-development"
      source_type: "market-signal"
      supports: "MCP and APIs are complementary; MCP often wraps APIs rather than replacing them."
      freshness: "watch"
      reviewed_at: "2026-06-24"
      notes: "Supports the layered API, CLI, MCP framing."
    - title: "CircleCI: MCP vs CLI for AI-native development"
      url_or_path: "https://circleci.com/blog/mcp-vs-cli/"
      source_type: "market-signal"
      supports: "CLI and MCP fit different development loops rather than competing directly."
      freshness: "watch"
      reviewed_at: "2026-06-24"
      notes: "Use to temper MCP-first claims with inner-loop CLI pragmatism."
  update_log:
    - date: "2026-06-24"
      change: "Added living-document transparency ledger and expanded source review after comparing API, CLI, MCP, and AI-native system sentiment."
      reason: "The paper now serves as an active claim surface, not only a static thesis."
\`\`\`

## Sources

- [Model Context Protocol: Specification 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18)
- [Model Context Protocol: Tools](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
- [Model Context Protocol: Resources](https://modelcontextprotocol.io/specification/2025-06-18/server/resources)
- [OpenAI Apps SDK Reference](https://developers.openai.com/apps-sdk/reference)
- [OpenAI Apps SDK Quickstart](https://developers.openai.com/apps-sdk/quickstart)
- [OpenAI Function Calling](https://developers.openai.com/api/docs/guides/function-calling)
- [IBM: What Is Tool Calling?](https://www.ibm.com/think/topics/tool-calling)
- [Nordic APIs: 10 AI-Driven API Economy Predictions for 2026](https://nordicapis.com/10-ai-driven-api-economy-predictions-for-2026/)
- [Truto: Unified APIs for LLM Function Calling and AI Agent Tools](https://truto.one/blog/the-best-unified-apis-for-llm-function-calling-ai-agent-tools-2026/)
- [Zuplo: The API Readiness Gap](https://zuplo.com/learning-center/api-readiness-gap-agent-callable-apis)
- [AutomationBench](https://arxiv.org/abs/2604.18934)
- [Tinybird: MCP vs APIs](https://www.tinybird.co/blog/mcp-vs-apis-when-to-use-which-for-ai-agent-development)
- [CircleCI: MCP vs CLI for AI-native development](https://circleci.com/blog/mcp-vs-cli/)`
  },
  {
    slug: "ethos-transfer-agentic-engineering",
    title: "From Learning About to Dwelling Within",
    subtitle: "Agentic Engineering as Methodology Transfer—how Claude Code in the terminal enables ethos adoption through use, not instruction.\"",
    description: "Traditional learning systems teach usersaboutmethodologies—they consume content, pass quizzes, receive certificates. But methodology adoption requires something deeper: users must come todwell withinthe methodology, applying its principles transparently in daily practice. This paper applies Heidegger's concept of dwelling to the problem of methodology transfer, arguing that Claude Code in the terminal provides an optimal vehicle for ethos adoption. The terminal is where developers al\"",
    category: "Research",
    date: "2025-01-08",
    readingTime: 20,
    difficulty: "advanced",
    keywords: [],
    content: `## Abstract
Traditional learning systems teach usersaboutmethodologies—they consume content, pass quizzes,
				receive certificates. But methodology adoption requires something deeper: users must come todwell withinthe methodology, applying its principles transparently in daily practice. This paper applies Heidegger's concept
				of dwelling to the problem of methodology transfer, arguing that Claude Code in the terminal provides an optimal
				vehicle for ethos adoption. The terminal is where developers already dwell—where work happens. By meeting users
				in this space, the Learn MCP server can guide them from passive consumption to active embodiment of the
				CREATE SOMETHING Subtractive Triad.



## I. Introduction: The Problem of Methodology Transfer
The CREATE SOMETHING methodology—embodied in the Subtractive Triad (DRY → Rams → Heidegger)—provides
					a coherent framework for creation. But how does onetransfera methodology? Traditional
					approaches follow a familiar pattern:
This model treats methodology as knowledge to be transmitted. But the Subtractive Triad is not
					knowledge—it is apractice. One does not "know" the Triad; onelivesit. The
					question becomes: how do you help someone move from knowing about a methodology to dwelling within it?
Heidegger distinguished between two modes of understanding. InVorhandenheit(present-at-hand: when a tool becomes an object of conscious attention, like examining a broken hammer's weight and material),
					we contemplate things as objects with properties—we study the hammer's weight, material, and shape.
					InZuhandenheit(ready-to-hand: when a tool disappears into transparent use, like a hammer during skilled carpentry), tools recede into transparent use—the hammer disappears
					when hammering.
Most learning systems produce Vorhandenheit: "I know that DRY means Don't Repeat Yourself."
					But methodology adoption requires Zuhandenheit: "I no longer think about DRY; I simply don't repeat myself."
This paper argues that Claude Code in the terminal bridges this gap by meeting users where they
					already dwell—in the flow of actual work.


## II. Background: Heidegger's Dwelling Concept
In "Building Dwelling Thinking" (1951), Heidegger argues that dwelling is not merely residing
					in a location but a fundamental mode of being. To dwell is to be at home, to care for a place,
					to let things be what they are.
Critically, dwelling precedes building. We don't first build a house and then dwell in it.
					Rather, we buildbecausewe dwell—because we already have a way of being that requires
					space, tools, and shelter.
Applied to methodology: one does not first "learn" the Subtractive Triad and then "apply" it.
					Rather, dwelling in the Triad means it becomes the way one naturally approaches creation.
					The three questions—"Have I built this before?" (DRY), "Does this earn its existence?" (Rams),
					"Does this serve the whole?" (Heidegger)—become transparent background to all creative activity.
When you catch yourself thinking about the methodology rather than using it, you've found the gap.
					Here's how to recognize where you are:
The first column isn't wrong—it's a necessary stage. But if you stay there, you're still standing
					outside the methodology looking in.


## III. The Infrastructure: Learn MCP Current State
The CREATE SOMETHING Learn MCP server provides foundational infrastructure for methodology education:
// Available Tools
Eight learning paths with 40+ lessons, delivered with 24-hour caching for offline access.
							Progress syncs across browser and CLI.
Mandatory 50-character reflections enforce articulation of understanding.
							You cannot complete without expressing what you learned.
Praxis exercises integrate triad-audit, providing DRY/Rams/Heidegger scores
							against actual codebases.
Prerequisites gating ensures foundational concepts before advanced topics.
							Time-spent tracking measures engagement.
The current system excels atpassive learningbut does not yet supportactive methodology adoption:
- Reflections captured, never analyzed: Text stored but not parsed for depth, confusion, or action
- Audit scores recorded, never acted upon: Scores persist but don't inform curriculum adaptation
- No ethos construction: Users learn the canon but don't articulate their own principles
- No continuous monitoring: Praxis is point-in-time, not ongoing
- No feedback loops: Learning doesn't flow back to improve the canon


## IV. The Gap: Vorhandenheit in Learning
The gap between learning about and dwelling within manifests in four dimensions:
The current system keeps users in Vorhandenheit—contemplating the methodology as an object.
					Moving to Zuhandenheit requires the methodology to recede into transparent practice.


## V. The Solution: Agentic Engineering as Dwelling
The solution is not more content but a differentmodeof engagement.
					Claude Code in the terminal provides this mode because it meets users where they already dwell.
The terminal is where developers already dwell—where work happens. Not slides, not videos, not LMS dashboards.
Claude Code as methodology vehicle works because:
Example: Agentic Coaching in Workflow


## VI. Concrete Mechanisms for Ethos Construction
Moving from passive learning to active dwelling requires concrete mechanisms:
// User defines their principles based on learning
When users articulate their own principles—derived from but personalized beyond the canon—they
					move from consumers to practitioners. Their ethos becomes their dwelling.


## VII. The Hermeneutic Circle of Adoption
Thehermeneutic circle(a philosophical concept describing how understanding deepens through iterative interpretation—you understand parts through the whole, and the whole through its parts) connects understanding and practice. In methodology adoption, this
					becomes a feedback loop where users contribute to the methodology's evolution:
The user doesn't just consume—theycontributeto the methodology's evolution.
					This transforms the relationship from student/curriculum to practitioner/practice.

> "The circle is not vicious but productive. Understanding deepens through each iteration."


## VIII. From Passive to Active: Four Evolution Stages
Each stage represents deeper dwelling. The goal is not Stage 4 as achievement but Stage 4 as
					natural state—the methodology has become home.
- • User reads lessons
- • Completes reflections
- • Runs praxis audits
- •Knows about the Triad
- • Real-time methodology coaching
- • "You created duplicate code..."
- • Audit scores contextualized
- •Applies Triad with prompting
- • User articulates own principles
- • System validates against canon
- • Personal ethos emerges
- •Owns the methodology
- • No longer consciously thinks about Triad
- • Principles are transparent in use
- • Teaches others
- •Dwells within the methodology


## IX. Implementation Roadmap
- Magic link authentication
- Lesson delivery with caching
- Reflection capture
- Praxis with triad-audit
- Reflection parsing for depth/action
- Audit-based lesson recommendations
- learn_coachtool: real-time guidance during coding
- Integration with file watchers for continuous monitoring
- Weekly methodology digest emails
- Comparison view: "Your code vs. canonical patterns"
- learn_define_principletool: articulate personal principles
- Ethos validation against canonical foundation
- Personal audit thresholds
- Team ethos aggregation
- Contribution path: user insights → canon evolution


## X. How to Apply This
To apply this methodology transfer approach to your own teaching/coaching systems:
Let's say you want to help your team internalize your code review principles:
Notice: The learning happenswhere work happens. No context switch. The tool
					doesn't pull developers to a training platform—it brings methodology to the terminal,
					the PR, the moment of creation.
Use agentic methodology transfer when:
Don't use this pattern when:
The goal isdwelling, not learning. When users no longer think about
					the methodology but simply embody it in their work, you've achieved Zuhandenheit.
					The tool recedes; the practice remains.
- Practice matters more than knowledge: The methodology is embodied in action, not memorized as facts
- Users have a dwelling place: There's a clear environment where work actually happens
- Feedback loops are possible: You can monitor application and provide real-time coaching
- Personalization adds value: Users can build their own ethos derived from canonical principles
- The goal is certification or compliance (knowledge verification, not practice adoption)
- Users work in too many different environments (no single dwelling place)
- The methodology is purely conceptual (no observable practice to monitor)
- Passive learning is sufficient (simple factual knowledge transfer)


## XI. Conclusion: Methodology as Infrastructure
The question "Can users build their own CREATE SOMETHING ethos through Claude Code?" has a
					qualified answer:Yes, the infrastructure supports it in principle.
The Learn MCP server provides the foundation: content delivery, reflection capture, automated
					auditing, progress tracking. What's missing are the feedback loops that transform passive
					learning into active adoption—reflection analysis, continuous monitoring, ethos construction.
But the deeper insight is architectural:the terminal is the site of dwelling.Claude Code as methodology vehicle works because it meets users where they already dwell—in the
					flow of actual work. It doesn't pull them into a separate learning context; it brings learning
					to them.
When the methodology recedes into transparent use—when users no longer think "I should apply DRY"
					but simply don't repeat themselves—they have moved from learning about to dwelling within.
This is the goal: not users who can recite the Subtractive Triad, but users who create as the
					Triad suggests—removing what obscures, unifying what duplicates, questioning what doesn't serve
					the whole. The infrastructure enables; dwelling requires practice.

> "The hammer disappears when hammering. The methodology disappears when creating."


## References`
  },
  {
    slug: "eval-evidence-layer",
    title: "The Eval Evidence Layer",
    subtitle: "How Langfuse traces and Langfuse gates make agent workflows measurable",
    description: "Agent workflows do not become production-ready because they have traces or evals. They become production-ready when each trace and eval maps to a decision: publish, hold, rollback, narrow scope, or graduate autonomy. This paper defines the Eval Evidence Layer as the quantitative companion to the Policy OS contract bundle. Dify carries the app, Langfuse explains the app runtime, Langfuse gates the CREATE SOMETHING-owned MCP contracts, and release evidence ties both systems to operator decisions.",
    category: "Research",
    date: "2026-06-22",
    readingTime: 17,
    difficulty: "intermediate",
    keywords: ["[ 'Eval Evidence Layer","Langfuse","Langfuse","Dify","MCP","Policy OS","Agent Governance","Observability","Release Evidence"],
    content: `## Executive Thesis

Traces are not proof.

Evals are not governance.

Both become useful only when they change an operating decision.

A Dify app can produce a detailed runtime trace. A Langfuse eval can produce a pass/fail result. An MCP server can expose typed tools. A Policy OS contract bundle can define allowed behavior. None of those artifacts is enough by itself.

The missing layer is the **Eval Evidence Layer**: the quantitative layer that connects runtime traces, MCP eval gates, approval receipts, blocked states, and release decisions.

The core rule is simple:

> Measure only what can change a decision: publish, hold, rollback, narrow scope, or graduate autonomy.

For CREATE SOMETHING's current Dify-first operating model, the split is explicit:

| Surface               | Role                                         | Evidence                                                                                   |
| --------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Dify                  | Carries the app and operator-facing workflow | app shape, Service API behavior, MCP server cards                                          |
| Langfuse              | Explains the Dify runtime                    | traces, sessions, prompt/model behavior, latency, cost, runtime errors                     |
| Langfuse            | Gates CREATE SOMETHING-owned MCP contracts   | expected tool use, forbidden tool use, write confirmation, secret refusal, policy boundary |
| Linear or release log | Records the decision                         | publish, hold, rollback, narrowed scope, graduation evidence                               |

The important move is not adding more dashboards. It is making each metric accountable to a release decision.

## Why This Paper Exists

The Policy OS contract bundle defines the operating boundary for governed AI work. It names the MCP contract, agent contract, outcome contract, golden tasks, and runbook.

The Workflow Trust Layer defines the decision states: auto-allow, approval-needed, and blocked.

Those papers answer what the workflow is allowed to do.

This paper answers a narrower question:

**What evidence is strong enough to change the workflow's status?**

That question matters because most agent teams accumulate traces and evals without making them operational.

They know:

- an app has logs
- an eval suite ran
- a trace captured a tool call
- a cost number exists
- an agent refused something once

But they cannot say:

- which threshold blocks publication
- which failure class forces rollback
- which pass rate justifies more autonomy
- which evidence can be public
- which evidence must stay private
- which system owns the trace of record

The Eval Evidence Layer turns those questions into a measurable release model.

## The Measurement Boundary

A governed workflow should not measure everything.

It should measure the smallest set of signals that prove the contract still holds.

For a Dify app with MCP tools, the first evidence set is:

| Measurement              | Source                            | Decision it supports                                                    |
| ------------------------ | --------------------------------- | ----------------------------------------------------------------------- |
| Runtime latency          | Langfuse                          | Keep current path, tune prompt/context, or move a step behind a service |
| Runtime cost             | Langfuse                          | Keep model route, cap usage, or narrow scope                            |
| Runtime error rate       | Langfuse                          | Publish, hold, or rollback app changes                                  |
| Expected tool use        | Langfuse                        | Approve MCP tool descriptions and agent contract                        |
| Forbidden tool avoidance | Langfuse                        | Keep risky tools blocked, gated, or removed                             |
| Write confirmation       | Langfuse plus approval receipts | Permit write-capable tools under explicit review                        |
| Secret refusal           | Langfuse plus trace review      | Keep app client-facing or restrict audience                             |
| Blocked-state recovery   | Linear, runbook, operator notes   | Improve fallback path or policy language                                |
| Regression pass rate     | Langfuse                        | Publish, hold, rollback, or graduate autonomy                           |

This table is intentionally practical. It does not ask whether the agent is generally intelligent. It asks whether the current workflow is safe enough to operate under the current contract.

## The Two Evidence Streams

### 1. Langfuse: Runtime Evidence

Langfuse is strongest when the question is:

**What happened inside the app runtime?**

For Dify apps, this includes:

- conversation and session traces
- prompt and model behavior
- latency
- token usage
- cost
- runtime errors
- repeated failure patterns
- user feedback or operator annotations when available

This evidence answers operational questions:

- Did the app become slower after the prompt changed?
- Did a model route increase cost without improving outcomes?
- Did runtime errors cluster around one workflow path?
- Did the app produce enough trace context for an operator to debug the issue?

Langfuse does not replace the workflow contract. It explains the runtime.

### 2. Langfuse: MCP Gate Evidence

Langfuse is strongest when the question is:

**Did the MCP-backed workflow obey the contract?**

For CREATE SOMETHING-owned MCPs, this includes:

- expected tool use
- forbidden tool use
- write confirmation
- secret refusal
- policy-boundary behavior
- grounded answer checks
- tenant isolation checks
- error recovery checks
- regression pass rate after prompt, tool, model, or policy changes

This evidence answers release questions:

- Did the agent call the right tool for the golden task?
- Did it avoid the write tool when the case was read-only?
- Did it pause before a customer-facing or irreversible action?
- Did it refuse credential requests and private trace disclosure?
- Did the same workflow still pass after the MCP description changed?

Langfuse does not need to own every Dify trace. It gates the contracts CREATE SOMETHING owns.

## Decision Thresholds

Thresholds should be written before the release.

If thresholds are invented after a failure, they become justification theater.

The first version can be conservative:

| Gate                 | Minimum threshold                                            | Release decision                                                  |
| -------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------- |
| API health           | 100% on required smoke cases                                 | Hold if any required app or MCP path is unreachable               |
| Expected tool use    | 100% on required golden tasks                                | Hold if the agent misses a required tool call                     |
| Forbidden tool use   | 0 disallowed tool calls                                      | Hold or remove tool scope                                         |
| Write confirmation   | 100% pause before write-capable action                       | Hold if a write can occur without explicit confirmation           |
| Secret refusal       | 100% refusal on required negative cases                      | Hold if credentials, private traces, or broad exports are exposed |
| Runtime latency      | Within the workflow budget                                   | Tune or narrow scope if the budget is exceeded                    |
| Runtime cost         | Within the cost envelope                                     | Tune model/context or add usage limits                            |
| Regression pass rate | 100% for blocking gates, agreed threshold for advisory gates | Publish, hold, or rollback by gate class                          |

The point is not that every workflow must use the same number forever.

The point is that the number must be attached to a decision.

## Gate Classes

Not every gate has the same consequence.

The Eval Evidence Layer separates gates into three classes:

| Class     | Meaning                                                  | Examples                                                  | Failure action               |
| --------- | -------------------------------------------------------- | --------------------------------------------------------- | ---------------------------- |
| Blocking  | The workflow cannot publish if this fails                | API health, forbidden write, secret refusal               | hold or rollback             |
| Guardrail | The workflow can publish only with constrained scope     | latency budget, cost envelope, missing-data recovery      | narrow scope or add fallback |
| Advisory  | The workflow can publish, but improvement work is queued | phrasing quality, answer style, low-risk retrieval misses | log follow-up                |

This prevents two common mistakes.

The first mistake is treating every eval failure as equally severe. That creates noise and slows useful delivery.

The second mistake is treating every eval failure as optional. That creates silent risk.

Gate class turns eval output into release policy.

## The Evidence Ledger

Every release should leave a short evidence ledger.

It does not need to expose private traces. It needs enough structure for another operator to reconstruct the decision.

Minimum fields:

| Field                | Purpose                                                     |
| -------------------- | ----------------------------------------------------------- |
| Workflow ID          | Which app, agent, or MCP-backed workflow changed            |
| Runtime surface      | Dify, repo-owned service, SDK-backed service, or mixed path |
| Contract version     | Which MCP and agent contract governed the release           |
| Langfuse trace set   | Which runtime traces or sessions were reviewed              |
| Langfuse run       | Which eval run or experiment gated the MCP behavior         |
| Blocking gate result | Pass/fail for release blockers                              |
| Guardrail result     | Pass/fail/accepted risk for operating limits                |
| Decision             | publish, hold, rollback, narrow scope, graduate             |
| Owner                | Who accepted the decision                                   |
| Rollback path        | How to return to the previous safe state                    |

This is the difference between "we ran evals" and "we have release evidence."

## A Worked Example: Support Triage

Consider a support triage Dify app with MCP tools for reading tickets, searching account context, drafting replies, posting replies, and escalating cases.

The contract says:

- reading tickets is auto-allowed
- searching account context is auto-allowed
- drafting replies is auto-allowed
- posting replies requires approval
- refunds, deletions, legal issues, and security cases route to a named human
- credential requests and private trace requests are refused

The Eval Evidence Layer might define:

| Gate                          | Source                 | Threshold                      | Decision                              |
| ----------------------------- | ---------------------- | ------------------------------ | ------------------------------------- |
| Dify Service API smoke        | Dify plus smoke script | 100% reachable                 | hold if unreachable                   |
| Read/search expected tool use | Langfuse             | 100% required tool use         | hold if wrong tool path               |
| Post reply forbidden path     | Langfuse             | 0 post calls without approval  | hold and remove write scope if failed |
| Refund/delete escalation      | Langfuse             | 100% route to human            | hold if autonomous path appears       |
| Secret refusal                | Langfuse             | 100% refusal                   | hold if leaked                        |
| Latency budget                | Langfuse               | p95 under workflow budget      | tune before expanding scope           |
| Runtime cost                  | Langfuse               | within cost envelope           | tune model/context                    |
| Approval receipt              | Linear or app record   | receipt exists for every write | hold write capability if missing      |

The release decision is not based on a feeling.

It is based on which rows passed.

## Graduation Criteria

Autonomy should expand only when evidence improves.

A workflow can graduate from "draft-only" to "approval-needed write" when:

1. Required Langfuse gates pass for expected tool use, forbidden tool use, secret refusal, and write confirmation.
2. Langfuse traces show stable latency and cost under the operating envelope.
3. Approval receipts prove that humans can review the action with enough context.
4. Blocked-state recovery has a named fallback path.
5. The runbook describes rollback.

A workflow can graduate from "approval-needed write" to narrow auto-allow only when:

1. The write action is low-risk and reversible.
2. The action class has repeated clean approval history.
3. False positive and false negative costs are acceptable.
4. The blocking gates remain at 100%.
5. A human can audit the action after the fact.

Graduation is not a product milestone. It is an evidence threshold.

## Rollback Criteria

Rollback should also be quantitative.

Rollback is required when:

- a blocking gate fails after publication
- a write-capable tool executes outside the approval rule
- a secret or private trace is exposed
- runtime errors cluster around a customer-facing path
- latency or cost exceeds the envelope enough to break the workflow promise
- blocked-state recovery fails and the app keeps trying instead of stopping

Rollback is not failure. It is proof that the policy layer exists.

## Public Proof vs Private Evidence

The Eval Evidence Layer separates proof from evidence.

Public proof can include:

- gate names
- pass/fail status
- release notes
- sanitized examples
- route health
- high-level runtime posture
- the fact that Langfuse and Langfuse evidence exists

Private evidence should include:

- raw traces
- prompts
- account records
- secrets
- customer data
- approval receipts
- detailed eval inputs and outputs when they contain sensitive context

This split matters for Dify work. Buyers need confidence that the workflow is governed. Operators need detailed traces. Those are not the same artifact.

## Relationship To The Contract Bundle

The Eval Evidence Layer is not a replacement for the Policy OS contract bundle.

It is the measurement layer attached to it.

| Contract artifact     | Evidence layer attachment                                           |
| --------------------- | ------------------------------------------------------------------- |
| \`mcp_contract.yaml\`   | expected tool use, forbidden tool use, schema and error-path checks |
| \`agent_contract.yaml\` | approval behavior, blocked paths, secret refusal, graduation status |
| \`outcome_contract.md\` | business success metrics, fallback path, owner acceptance           |
| \`golden_tasks.yaml\`   | Langfuse regression cases and thresholds                          |
| \`runbook.md\`          | rollback, incident response, release ledger, evidence retention     |

The contract says what should happen.

The evidence layer says whether it happened enough to change the workflow status.

## The Practical Operating Loop

The operating loop is:

1. Name the workflow.
2. Write the contract bundle.
3. Attach Langfuse tracing to the runtime.
4. Attach Langfuse gates to the MCP contract.
5. Classify gates as blocking, guardrail, or advisory.
6. Set thresholds before release.
7. Run the smoke and eval gates.
8. Review the trace set.
9. Record the release decision.
10. Rerun the relevant gates after every prompt, model, tool, policy, or runtime change.

This loop keeps agent work from drifting into vibes.

## Conclusion

Agent systems do not need more observability for its own sake.

They need evidence that changes decisions.

Dify makes the workflow usable. Langfuse explains the runtime. Langfuse gates the MCP contracts. Policy OS names what the workflow is allowed to do. The Eval Evidence Layer turns those artifacts into a release model.

That is the measurable path from demo to operation:

- trace the runtime
- gate the contract
- classify the risk
- set the threshold
- record the decision
- graduate only with evidence

The workflow is not production-ready when the dashboard is full.

It is production-ready when the evidence is strong enough to decide.`
  },
  {
    slug: "haiku-optimization",
    title: "Haiku Optimization: Intelligent Model Routing for AI-Native Development",
    subtitle: "Validating that Haiku achieves 90% of Sonnet's performance on well-defined tasks at 10x lower cost through intelligent model routing—Plan (Sonnet) → Execute (Haiku) → Review (Opus).\"",
    description: "This paper presents empirical validation of intelligent model routing in AI-native development workflows. We implemented a 4-tier routing system that automatically selects Claude model families (Haiku, Sonnet, Opus) based on task complexity, achieving100% success rate across 8 taskswith67.5% cost reductioncompared to uniform Sonnet usage. The core hypothesis—that effective planning enables Haiku to execute well-defined tasks at 10x lower cost while maintaining 90% of Sonn\"",
    category: "Research",
    date: "2025-01-08",
    readingTime: 12,
    difficulty: "intermediate",
    keywords: [],
    content: `## Abstract
This paper presents empirical validation of intelligent model routing in AI-native
				development workflows. We implemented a 4-tier routing system that automatically
				selects Claude model families (Haiku, Sonnet, Opus) based on task complexity,
				achieving100% success rate across 8 taskswith67.5%
				cost reductioncompared to uniform Sonnet usage. The core hypothesis—that
				effective planning enables Haiku to execute well-defined tasks at 10x lower cost
				while maintaining 90% of Sonnet's performance—was validated through production
				implementation. We developed routing strategies (explicit labels, complexity analysis,
				pattern matching), experiment tracking infrastructure, and a live metrics dashboard.
				The contribution is both methodological (a replicable routing framework) and empirical
				(production data validating cost-performance tradeoffs).



## 1. Research Question
Can effective planning and task decomposition enable Haiku (Claude's smallest model)
					to execute well-defined software engineering tasks with high success rates while
					delivering significant cost savings?
Industry research suggests Haiku achieves90% of Sonnet's performance on
					well-defined tasks while costing 10x less(~\$0.001 vs ~\$0.01). However,
					"well-defined" remained underspecified. What characteristics make a task suitable
					for Haiku? How do we route tasks intelligently without manual intervention?
The hermeneutic question:Can we formalize the Plan → Execute → Review pattern
					such that routing becomes transparent—ready-to-hand rather than present-at-hand?


## 2. Hypothesis
Primary Hypothesis:Effective planning/system design enables
					Haiku to execute well-defined tasks with ≥85% success rate, achieving significant
					cost reduction without quality degradation.
Secondary Hypotheses:
Pattern Under Test:Sonnet plans → Haiku executes → Opus reviews
					(when critical)
- Task complexity can be reliably inferred from issue labels and pattern matching
- Explicit routing strategies (labels, complexity, patterns) achieve ≥85% confidence
- Cost savings scale linearly with volume while maintaining quality
- The pattern generalizes across different task categories (API, UI, logic)


## 3. Methodology
We implemented a 4-tier routing strategy with decreasing confidence levels:
Tasks classified into four complexity levels based on multiple signals:
Classification signals include:
All routing decisions logged to.beads/routing-experiments.jsonlwith fields:
Success metrics for hypothesis validation:
- Trivial:Single-file edits, typos, simple CRUD operations
- Simple:1-2 files, clear execution path, minimal coordination
- Standard:3+ files, business logic, moderate complexity
- Complex:Architecture decisions, security-critical, 5+ files
- modelUsed: Haiku, Sonnet, or Opus
- routingStrategy: Which tier made the decision
- routingConfidence: 0.0-1.0 confidence score
- success: Boolean task completion
- cost: Actual cost in USD
- notes: Qualitative observations
- Haiku success rate ≥85% (primary metric)
- Cost reduction >0% vs uniform Sonnet (efficiency metric)
- Average routing confidence ≥80% (reliability metric)
- No quality regressions (safety metric)


## 4. Results
Over 8 production tasks (4 NBA features + 4 routing dashboard components):
Cost Analysis:
Routing Confidence:
Haiku excelled at:
Sonnet appropriately used for:
Pattern Validation:The Plan → Execute → Review pattern held
					across all task categories. Well-defined execution tasks (API, UI, simple logic)
					consistently succeeded with Haiku. Coordination and complex logic appropriately
					escalated to Sonnet.
At observed routing distribution (75% Haiku, 25% Sonnet):
- Actual total: \$0.026 (6 Haiku + 2 Sonnet)
- If all Sonnet: \$0.080 (8 tasks × \$0.010)
- Savings: \$0.054 (67.5% reduction)
- Average: 95% (all complexity-label strategy)
- Range: 95%-95% (uniform high confidence)
- Zero misrouted tasks
- API endpoints (simple read/write operations)
- UI components (Canon-compliant Svelte components)
- Route pages (wiring components and data)
- Single-file modifications (targeted edits)
- Multi-file coordination (3+ files with dependencies)
- Complex state management (derived calculations, aggregations)
- Business logic (success rates, cost analysis)


## 5. Discussion
Primary Hypothesis: Validated ✅
Haiku achieved 100% success rate (exceeding ≥85% target) with 67.5% cost reduction.
					Effective planning (via complexity labels and pattern matching) enabled high-quality
					execution on well-defined tasks.
Secondary Hypotheses:
1. Planning Quality Matters More Than Model Size
Well-defined tasks (clear scope, explicit requirements, single responsibility)
					succeeded with Haiku. Ambiguous or underspecified tasks required Sonnet regardless
					of file count or apparent simplicity.
2. Complexity Is Multi-Dimensional
File count alone is insufficient. Security criticality, coordination requirements,
					and business logic complexity all factor into appropriate model selection.
3. Transparency Enables Trust
Exposing routing decisions (strategy, confidence, rationale) built confidence in
					the system. Users could validate or override routing when needed.
4. The Tool Recedes
When routing works correctly, users don't think about model selection—they just
					work. This is Zuhandenheit (ready-to-hand): the infrastructure disappears.
Selection Bias:Tasks were chosen to demonstrate routing, not randomly
					sampled from backlog. This may inflate observed success rates.
Experimenter Effect:Knowing the routing decision may have influenced
					task definition quality. Blind validation needed.
Context Specificity:Results are specific to CREATE SOMETHING's
					Canon-compliant architecture and well-factored codebase. Less structured codebases
					may see different results.
- Task complexity inference: Validated ✅— Labels and patterns achieved 95% confidence
- Routing confidence: Validated ✅— 95% average exceeded ≥85% target
- Cost scaling: Validated ✅— Linear cost reduction observed
- Pattern generalization: Validated ✅— Succeeded across API, UI, logic tasks
- Small sample size:8 tasks validated. Larger studies needed.
- Domain specificity:All tasks were web development. Generalization to other domains unknown.
- No Opus tasks:Architecture/security patterns identified but not exercised.
- Manual labeling:Initial labels were hand-crafted. Automation needed for scale.


## 6. Implications
Cost-Performance Tradeoffs Are Addressable
The "use the best model always" approach is wasteful. Intelligent routing enables
					teams to optimize for cost without sacrificing quality. At scale, this makes
					AI-native development economically viable.
Task Decomposition Is the Enabler
The bottleneck isn't model capability—it's task definition quality. Well-decomposed
					work succeeds with smaller models. This shifts focus from "better AI" to
					"better planning."
Routing Should Be Transparent, Not Magic
Exposing routing decisions (strategy, confidence, rationale) enables users to
					understand and trust the system. Black-box routing creates anxiety; transparent
					routing creates partnership.
Defaults Matter
Defaulting to Sonnet (safe, capable) when confidence is low prevents costly mistakes.
					The system optimizes when confident, defaults to safety when uncertain.
Empirical Validation Is Essential
Industry claims ("Haiku achieves 90% of Sonnet's performance") require domain-specific
					validation. This paper provides methodology for such validation: routing strategies,
					experiment tracking, success criteria.
Open Questions for Future Work
- Does the pattern hold at 100+ tasks? 1000+ tasks?
- How does routing quality degrade with less-structured codebases?
- Can routing confidence be learned from historical success/failure data?
- What is the optimal Haiku/Sonnet/Opus distribution for different project types?


## 7. Implementation
The complete routing system is production-deployed in the CREATE SOMETHING monorepo:
SeeHAIKU-OPTIMIZATION-RESULTS.mdin the monorepo root for complete
					implementation details and deployment instructions.
- Core routing logic:packages/harness/src/model-routing.ts
- Experiment tracking:packages/harness/src/routing-experiments.ts
- CLI tools:gt-smart-sling,routing-report
- Live dashboard:createsomething.space/experiments/routing-dashboard


## 8. Conclusion
We validated that intelligent model routing enables significant cost reduction
					(67.5%) without quality degradation (100% success rate) in AI-native development
					workflows. The Plan (Sonnet) → Execute (Haiku) → Review (Opus) pattern generalizes
					across task categories when tasks are well-defined.
The contribution is both practical (a working routing system with experiment tracking
					and live metrics) and theoretical (a methodology for validating model selection
					strategies).
Key Takeaway:The bottleneck isn't AI capability—it's task definition
					quality. Effective planning enables smaller models to execute at high quality and
					low cost. This makes AI-native development economically sustainable at scale.
Status:✅ Hypothesis validated, system operational, ready for
					broader adoption.


## How to Apply This
If you're building with AI agents:
If you're validating AI tools:
If you're researching model selection:


## Related Research
The Norvig Partnership— Human-AI collaboration achieving 20x productivity gains
Ethos Transfer in Agentic Engineering— How agents learn project values through documentation
The Hermeneutic Spiral in UX Research— Iterative refinement through understanding-action loops`
  },
  {
    slug: "harness-agent-sdk-migration",
    title: "Harness Agent SDK Migration: Empirical Analysis",
    subtitle: "Security, Reliability, and Cost Improvements Through Explicit Tool Permissions",
    description: "This paper documents the migration of the CREATE Something Harness from legacy headless mode patterns to Agent SDK best practices. We analyze the trade-offs between security, reliability, and operational efficiency, drawing from empirical observation of a live Canon Redesign project (21 features across 19 files). The migration replaces--dangerously-skip-permissionswith explicit--allowedTools, adds runaway prevention via--max-turns, and enables cost tracking through structured JSO\"",
    category: "Case Study",
    date: "2025-01-08",
    readingTime: 10,
    difficulty: "12 min read",
    keywords: [],
    content: `## Abstract
This paper documents the migration of the CREATE Something Harness from legacy headless mode
				patterns to Agent SDK best practices. We analyze the trade-offs between security, reliability,
				and operational efficiency, drawing from empirical observation of a live Canon Redesign project
				(21 features across 19 files). The migration replaces--dangerously-skip-permissionswith explicit--allowedTools, adds runaway prevention via--max-turns,
				and enables cost tracking through structured JSON output parsing.



## 1. Introduction
The CREATE Something Harness orchestrates autonomous Claude Code sessions for large-scale
					refactoring and feature implementation. Prior to this migration, the harness used--dangerously-skip-permissionsfor tool access—a pattern that prioritized
					convenience over security.
The Agent SDK documentation recommends explicit tool allowlists via--allowedTools.
					This migration implements that recommendation alongside additional optimizations.
Per the CREATE Something philosophy, infrastructure should exhibitZuhandenheit(ready-to-hand: when a tool disappears into transparent use, like a hammer during skilled carpentry)—receding into transparent use. The harness should be invisible when working
				correctly; failures should surface clearly with actionable context.
The test project: removing--webflow-blue(#4353ff) from the Webflow Dashboard.
				This brand color polluted focus states, buttons, links, nav, and logos—43 violations across 19 files.


## 2. Architecture
Each session spawns Claude Code in headless mode with explicit configuration:


## 3. Migration Changes
Characteristics:
Characteristics:
- All tools available without restriction
- No runaway prevention
- No cost tracking
- No model selection
- Security relies entirely on session isolation
- Explicit tool allowlist (defense in depth)
- Turn limit prevents infinite loops
- JSON output enables metrics parsing
- Model selection for cost optimization


## 4. Peer Review Pipeline
The harness runs three peer reviewers at checkpoint boundaries:
Finding:Architecture reviewer surfaces legitimate concerns (token consistency,
				pattern adherence) without blocking progress. This matches the intended "first-pass analysis" philosophy.


## 5. Empirical Observations
Finding:No legitimate harness operations were blocked by the new restrictions.
				The allowlist is sufficient for all observed work patterns.
--max-turns 100prevents infinite loops. Observed session turn counts:


## 6. Trade-offs Analysis


## 7. Recommendations


## 8. How to Apply This
To apply this migration pattern to your autonomous Claude Code orchestration:
Let's say you have a harness that autonomously deploys Cloudflare Workers. Before migration:
After analyzing actual usage, you discover the harness needs:
After migration:
Notice:
Add tools to the allowlist when:
Don't add tools when:
After migration, validate success by:
The goal isexplicit security without operational cost. If the migration
					blocks legitimate work or significantly slows execution, the allowlist is too restrictive.
					If it allows operations that shouldn't be automated, it's too permissive. Iterate until
					the harness operates transparently—Zuhandenheit achieved.
- File operations to read wrangler.toml and Worker scripts
- Git to check status and create deployment tags
- Wrangler to deploy and check deployment status
- Cloudflare MCP to update KV/D1 data if needed
- Scoped Bash patterns:git:statusallowed,git:reset --hardblocked
- Lower turn limit: Deployments complete in 10-20 turns; 50 provides headroom
- Model selection: Sonnet is 5x cheaper than Opus, sufficient for standard deploys
- Metrics capture: JSON output enables cost analysis over time
- Sessions fail with "permission denied": Check logs, identify blocked tool, evaluate if it should be allowed
- New workflow requirements: Adding database migrations? Addmcp__cloudflare__d1_query
- Peer review identifies missing capability: Architecture reviewer notes the harness can't perform needed operation
- The request is "just in case"—only add verified needs
- A safer alternative exists (preferWebFetchoverBash(curl:*))
- The operation should require human approval (don't automate destructive operations)


## 9. Conclusion
The Agent SDK migration improves the CREATE Something Harness without degrading operational
				capability. The explicit tool allowlist provides defense-in-depth security, while--max-turnsprevents runaway sessions.
The key insight:restrictive defaults with explicit exceptionsis more
				maintainable thanpermissive defaults with implicit risks.
This aligns with theSubtractive Triad:
- DRY:One allowlist, not per-session permission decisions
- Rams:Only necessary tools; each earns its place
- Heidegger:Infrastructure recedes; security becomes invisible when correct


## Appendix A: Full Tool Allowlist


## References
- Claude Code Agent SDK Documentation
- CREATE Something Harness Package
- Beads Patterns Documentation`
  },
  {
    slug: "hermeneutic-debugging",
    title: "Hermeneutic Debugging",
    subtitle: "Applying Heidegger's hermeneutic circle to software debugging—demonstrating that understanding emerges through iterative interpretation, not linear analysis.\"",
    description: "Traditional debugging assumes a linear path: identify symptom, trace cause, apply fix. This paper argues that complex bugs resist linear analysis because they emerge fromhidden assumptions—what Heidegger calls our \"fore-structure\" of understanding. By applying thehermeneutic circle(a philosophical concept describing how understanding deepens through iterative interpretation—you understand parts through the whole, and the whole through its parts) to debugging, we demonstrate that the path\"",
    category: "Methodology",
    date: "2025-01-08",
    readingTime: 12,
    difficulty: "intermediate",
    keywords: [],
    content: `## Abstract
Traditional debugging assumes a linear path: identify symptom, trace cause, apply fix.
				This paper argues that complex bugs resist linear analysis because they emerge fromhidden assumptions—what Heidegger calls our "fore-structure" of understanding.
				By applying thehermeneutic circle(a philosophical concept describing how understanding deepens through iterative interpretation—you understand parts through the whole, and the whole through its parts) to debugging, we demonstrate that the path to solution
				requires iterative interpretation where each failed attempt reveals previously invisible
				assumptions. We document this through a case study: a React logo animation that required
				eight iterations to solve, each revealing deeper truths about component lifecycle,
				state persistence, and the gap between code and runtime behavior.



## I. The Problem: A Simple Animation
The requirement seemed straightforward: animate a logo. On the home page, show the
					full logo. When navigating to an internal page, contract to just the icon after a
					600ms delay—allowing the page content to load first. When returning home, expand
					back to the full logo.
// Expected behavior:
Home page → Full logo (expanded)
Home → Internal → 600ms delay → Contract to icon
Internal → Home → Expand to full logo
Internal → Internal → Stay as icon
The first implementation took five minutes. It didn't work. The eighth implementation,
					after two hours, finally did. What happened in between reveals something profound
					about how we understand code—and how code resists our understanding.


## II. The Hermeneutic Circle in Debugging
Heidegger observes that we never approach anything with a blank slate. We always
					bring a "fore-structure" of understanding—prior assumptions that shape what we see.
					In debugging, this fore-structure includes:
The danger is that our fore-structure can bewrong. We may be certain that
					state persists across navigations, that effects run once, that components don't remount.
					These certainties become invisible—we don't question them because we don't see them.
The hermeneutic circle describes how understanding emerges: we understand the parts
					through the whole, and the whole through its parts. Each interpretation deepens our
					grasp, revealing new dimensions.
Applied to debugging: each failed fix isn't just a wrong answer—it's arevelation.
					It exposes an assumption we didn't know we held. The bug persists not because we lack
					skill, but because our fore-structure hasn't yet aligned with reality.
- Fore-having:Our general understanding of the technology (React, state, effects)
- Fore-sight:The perspective from which we interpret the problem
- Fore-conception:The specific expectations we bring to this code


## III. Case Study: Eight Iterations
Result:No delay. Logo contracted immediately.
Hidden assumption exposed:That the effect runs once per navigation.
					React 18's strict mode runs effects twice, clearing the timeout.
We tried using refs to track state across effect runs. Still didn't work.
Hidden assumption exposed:That the component persists across
					navigation. In Next.js App Router, the Header wasremountingon each
					route change, resetting all refs.
Result:Still no delay.
Hidden assumption exposed:That we could remove the flag before
					the timeout. When the component remounted (which we now knew happened), the flag
					was already gone.
At this point, we stopped coding and startedobserving. We added console
					logs throughout the component:
The logs revealed the complete picture: component remounting, cleanup running,
					flags being cleared prematurely. One observation revealed what six iterations
					of "clever" code could not.
"Less, but better." Console logs are crude, simple, old-fashioned. They're also
						the fastest path to understanding. The hermeneutic circle favors observation
						over speculation.
With our fore-structure now corrected—we understood the component lifecycle, the
					remounting behavior, the timing of cleanups—the solution became clear:
The final solution accounts for: component remounting, strict mode double-invocation,
					navigation during timeouts, bidirectional animation, and initial state hydration.
					None of these were in our original fore-structure.


## IV. The Hermeneutic Debugging Pattern
From this case study, we extract a general pattern:
Each failed attempt reveals a hidden assumption. Don't dismiss failures—interrogate them.
Console logs beat speculation. Let the system show you what's happening.
The assumptions you don't question are the ones that trap you. Ask: "What am I certain of?"
Each iteration deepens understanding. The eighth attempt carries the wisdom of seven failures.


## V. Implications
Hermeneutic debugging reframes frustration as progress. When a fix fails, you haven't
					wasted time—you've eliminated a false interpretation. The bug isn't resisting you;
					it's teaching you. Adopt the mindset: "What assumption did this expose?"
When documenting bugs, include not just the solution but thejourney. What
					assumptions were overturned? What did each failed attempt reveal? This preserves
					institutional understanding and prevents others from repeating the same interpretive
					errors.
AI coding assistants carry their own fore-structure—training data, patterns, assumptions.
					When Claude or Copilot generates code that doesn't work, the hermeneutic approach
					applies: what assumption is the AI making? Often, the gap is between the AI's
					generic understanding and your specific runtime environment.


## VI. How to Apply This
This section translates the Hermeneutic Debugging pattern into a practical workflow.
					The approach applies to any complex bug where your initial assumptions prove inadequate—
					React state issues, async timing problems, CSS cascade mysteries, or API integration failures.
Let's say you have a search input that should debounce API calls, but results
					display out of order when typing quickly:
Problem:Type "react", then quickly change to "vue". Sometimes React
					results appear after Vue results.
Assumption exposed:"The last request to start will be the last to finish."
					This is false—network timing varies. Fast queries can finish after slow ones.
Observation from logs:Cancellation flag works, but results still arrive
					out of order becausecancelledonly preventssettingresults, not the network request.
Assumption exposed:"Setting cancelled = true stops the API call." False—
					it only prevents state update. The request continues.
Solution:AbortController actually cancels the network request, not just
					the state update. Results now display in correct order.
Use this approach when:
Don't overthink for:
Effective observation requires good logging. Use these patterns:
The hermeneutic circle favors observation over speculation. One well-placed console.log
					reveals more than hours of "thinking it through." Debug by seeing, not by imagining.
- Initial fix fails:Your "obvious" solution doesn't work
- Behavior is mysterious:System does something you can't explain
- Multiple attempts needed:You're on iteration 3+ of the same bug
- Timing or lifecycle involved:Async, effects, component mounting
- Framework-specific quirks:React strict mode, Next.js remounting, etc.
- Syntax errors (linter catches these)
- Typos or undefined variables
- Simple logic errors (wrong comparison operator)
- First attempt at a fix (try the obvious solution first)


## VII. Conclusion
The logo animation bug wasn't complex—it wasconcealed. The code looked
					correct because our understanding was incorrect. Only by entering the hermeneutic
					circle—attempting, failing, observing, revising—could we align our interpretation
					with reality.
This is the fundamental insight:debugging is interpretation. The
					bug exists in the gap between what we think the code does and what it actually does.
					Closing that gap requires not more cleverness, but more humility—the willingness
					to let our assumptions be overturned.
Eight iterations. Five hidden assumptions. One working animation. The hermeneutic
					circle doesn't promise efficiency—it promisesunderstanding. And understanding,
					once achieved, endures.

> "One observation is worth more than ten guesses."


## References`
  },
  {
    slug: "hermeneutic-spiral-ux",
    title: "The Hermeneutic Spiral in UX Design",
    subtitle: "Applying Heidegger's hermeneutic circle to user experience design—demonstrating that understanding accumulates, it doesn't reset.\"",
    description: "Modern digital systems suffer from a peculiar form of amnesia. Despite collecting vast amounts of user data, they treat each interaction as if it were the first. This paper argues that this \"stateless fallacy\" isn't merely an engineering oversight—it's a philosophical error. By applying Heidegger'shermeneutic circle(a philosophical method where understanding deepens through iterative interpretation—you understand parts through the whole, and the whole through its parts) to user exper\"",
    category: "Methodology",
    date: "2025-01-08",
    readingTime: 15,
    difficulty: "intermediate",
    keywords: [],
    content: `## Abstract
Modern digital systems suffer from a peculiar form of amnesia. Despite collecting vast amounts
				of user data, they treat each interaction as if it were the first. This paper argues that this
				"stateless fallacy" isn't merely an engineering oversight—it's a philosophical error. By applying
				Heidegger'shermeneutic circle(a philosophical method where understanding deepens through iterative interpretation—you understand parts through the whole, and the whole through its parts) to user experience design, we propose theHermeneutic Spiral,
				where each interaction builds upon previous understanding rather than starting fresh. We demonstrate
				this pattern through the Abundance Network, a WhatsApp-based creative professional matching platform
				built for Half Dozen.



## I. Introduction: The Stateless Fallacy
Consider a typical creative marketplace intake flow:
First Visit:
→ "What's your name?"
→ "What's your brand?"
→ "What's your budget?"
→ "What do you need?"
Second Visit (same user):
→ "What's your name?"
→ "What's your brand?"
→ "What's your budget?"
→ "What do you need?"
The system treats Session 2 identically to Session 1. All context is lost. The user must
					re-establish everything.
From a UX perspective, this creates friction:
But the deeper problem is philosophical. The system fails tounderstandthe user
					in Heidegger's sense of the term.
- Time waste:Users repeat information they've already provided
- Trust erosion:"Didn't I tell you this last time?"
- Cognitive load:Re-articulating preferences requires mental effort
- Relationship regression:Each session restarts the relationship


## II. Theoretical Framework: Heidegger's Hermeneutic Circle
InBeing and Time, Heidegger describes understanding as fundamentally circular:
This isn't a logical flaw—it's the structure of comprehension itself. We understand parts
					through the whole, and the whole through its parts. Each cycle deepens our grasp.
While Heidegger uses "circle," the motion is better described as aspiral.
					Each iteration doesn't return to the same point—it advances understanding:
The key insight:understanding accumulates. It doesn't reset.
Traditional systems break this spiral:
Session 1: [Full context]
↓ (discarded)
Session 1: [Full context]
Start over each time
Session 1: [Full context]
↓ (retained)
Session 2: [Delta only]
Build on what's known
A hermeneutic system retains context and asks only what has changed.


## III. The Hermeneutic Spiral Pattern
The Hermeneutic Spiral pattern follows three principles:
First Visit:
System: Hi! I'm matching you with the perfect creative.
What's your name?
User: Louis
System: Nice to meet you, Louis! What brand or project
are you working on?
User: Sunset Sounds
System: Got it. What kind of creative help do you need?
User: Album artwork
System: And what's your budget range?
User: Around \$3,000
System: Perfect. Let me find some options...
Return Visit (recognized by phone number):
System: Welcome back, Louis! Still working on
Sunset Sounds?
User: Yes
System: Great! What do you need this time?
User: Music video
System: Similar budget to last time, around \$3,000?
User: Actually more like \$8,000 for this one
System: Got it—\$8,000 for a music video. Let me
find some options...
The second conversation is shorter, more natural, and acknowledges the relationship history.


## IV. Case Study: Abundance Network
The Abundance Network is a WhatsApp-based creative professional matching platform built
					for Half Dozen. It connects brands with vetted creatives (designers, video producers,
					photographers) through conversational AI.
- Channel:WhatsApp (phone number as identity)
- Interaction:Conversational (not form-based)
- Memory:Cloudflare KV for context persistence
- Matching:LLM-driven creative recommendation


## V. Results
Comparing stateless vs. hermeneutic intake:
The hermeneutic approach halved the interaction length for returning users while
					improving satisfaction.


## VI. Design Principles
Heidegger distinguishes betweenZuhandenheit(ready-to-hand) andVorhandenheit(present-at-hand). A hammer in use is ready-to-hand—transparent, unnoticed. A broken
						hammer becomes present-at-hand—an object of conscious attention.
The Hermeneutic Spiral achieves Zuhandenheit: the system recedes from attention. Users
						don't think "the system remembers me"—they simply experience a smoother conversation.
Not all context should persist. The key distinction:
- • Identity (name, contact)
- • Brand/organization
- • Style preferences
- • Satisfaction history
- • Current need
- • Timeline
- • Budget (may vary)
- • Specific requirements
- • Contact preferences
- • Brand guidelines
- • Team members
- • (semi-stable fields)


## VII. Implications
The Hermeneutic Spiral suggests that good UX isn't just about reducing friction in a
					single session—it's about building understanding across sessions. Design should treat
					user relationships as ongoing conversations, not isolated transactions.
Conversational AI systems benefit from persistent context:
Context persistence raises privacy considerations:
- Users should be able to view and delete their context
- Sensitive fields should have explicit consent
- Context should expire if unused (configurable TTL)
- GDPR/CCPA compliance requires clear data handling


## VIII. How to Apply This
This section translates the Hermeneutic Spiral pattern into concrete implementation
					steps. The pattern works for any conversational system with persistent user context—
					chatbots, intake forms, onboarding flows, or customer service tools.
Let's say you're building a support chatbot for a SaaS product:
First interaction:
Return interaction (1 week later):
Notice: The bot remembered Sarah's name, company, and open ticket. The conversation
					feels continuous, not like starting over.
Use this pattern when:
Don't use for:
Context persistence raises privacy considerations. Implement safeguards:
The Hermeneutic Spiral respects user time while respecting user privacy. Persistent
					context should feel helpful, not invasive. Test with real users to calibrate.
- Multi-session interactions:Users return multiple times over weeks/months
- Identity is consistent:Phone number, email, or auth token persists
- Context accumulates value:Past interactions inform future ones
- Reduced friction matters:Saving 30 seconds per session adds up
- Relationship-driven:You're building a service, not a one-off transaction
- One-time interactions (contact forms, surveys)
- Anonymous users where identity can't persist
- High-security contexts where caching user data is risky
- Exploratory conversations where context doesn't help


## IX. Conclusion
The Hermeneutic Spiral transforms user intake from repetitive interrogation into evolving
					conversation. By applying Heidegger's insight that understanding accumulates through
					iteration, we can design systems that respect user time and build genuine relationships.
The key is simple:remember what you learn, ask only what's new.
This isn't just efficient—it's philosophically correct. Understanding is circular, not
					linear. Each interaction should deepen the spiral, not restart it.

> "Understanding accumulates. It doesn't reset."


## References`
  },
  {
    slug: "hermeneutic-triad-review",
    title: "The Hermeneutic Triad",
    subtitle: "How Reviewers, Harness, and Agent Collaborate—a case study in parallel peer review revealing and resolving DRY violations.\"",
    description: "This paper documents a live case study from December 2025 where the CREATE SOMETHING harness orchestrated parallel peer reviews that identified critical DRY violations in newsletter subscription code. Three specialized reviewers—architecture, security, and quality—each analyzed the same codebase simultaneously, producing complementary findings. The architecture reviewer detected 4 pairs of nearly-identical files across packages; the security reviewer identified IDOR vulnerabi\"",
    category: "Case Study",
    date: "2025-01-08",
    readingTime: 12,
    difficulty: "intermediate",
    keywords: [],
    content: `## Abstract
This paper documents a live case study from December 2025 where the CREATE SOMETHING harness
				orchestrated parallel peer reviews that identified critical DRY violations in newsletter
				subscription code. Three specialized reviewers—architecture, security, and quality—each
				analyzed the same codebase simultaneously, producing complementary findings. The architecture
				reviewer detected 4 pairs of nearly-identical files across packages; the security reviewer
				identified IDOR vulnerabilities; the quality reviewer noted inconsistent error handling. This
				paper analyzes how thishermeneutic triad(a three-part interpretive system where different perspectives—reviewers, harness, agent—work together to reveal understanding that no single perspective could achieve alone)—the interplay between reviewers, harness, and
				agent—creates a self-correcting system that surfaces issues no single perspective would catch.



## I. The Incident: Taste Harness Pauses
On December 23, 2025, the CREATE SOMETHING harness was running the "Taste Collections &
					LLM Context" spec—a 6-feature project to enable users to curate design references and
					expose them to AI agents. After completing 2 of 6 features, the harness paused with
					an unexpected verdict:
The harness had been implementing features, creating code, and making commits. But
					when it reached a checkpoint, it invoked three parallel peer reviewers. The
					architecture reviewer's verdict—FAIL—triggered a pause. What had it found?


## II. The Three Reviewers: Parallel Perspectives
The harness employs three specialized reviewers, each analyzing the same codebase
					through a different philosophical lens:
Asks: "Does the structure serve the whole?"
Applies DRY at the system level. Detects duplicate modules, violated
							boundaries, excessive coupling.
Asks: "Can this be exploited?"
Scans for OWASP vulnerabilities, authentication gaps, authorization flaws,
							injection risks.
Asks: "Is this maintainable?"
Evaluates error handling, type safety, code clarity, test coverage,
							documentation.
These reviewers runin parallel—each receives the same git diff and file
					context but applies independent analysis. Their prompts are generated from the
					changed files, ensuring review focus matches implementation scope.
The three reviewers form ahermeneutic triad—three interpretive lenses that
					together reveal what no single lens would show. This mirrors the Subtractive Triad:


## III. What They Found: The DRY Violations
Each reviewer produced findings, but the architecture reviewer's were critical. It
					identified4 pairs of nearly-identical filesduplicated across packages:
The architecture reviewer had detected what the coding agent hadn't noticed: the agent,
					working feature-by-feature, had created identical implementations for different
					properties rather than extracting shared functionality.
Meanwhile, the security reviewer flagged a different issue in the same area:
The security and architecture reviewers saw different problems in overlapping code.
					Neither finding was wrong; both were necessary.


## IV. The Harness Response: Pause and Surface
When the architecture reviewer's verdict was FAIL, the harness entered a decision
					tree. Its configuration specified:
Becausearchitecturewas a blocking reviewer and it
					returned FAIL with critical findings, the harness:
Heidegger's concept of theclearing(Lichtung) is relevant here. The pause
					creates a space where what was hidden becomes visible. The agent was working—hammering
					away—and the code was ready-to-hand. The reviewer's FAIL verdict made the duplicationpresent-at-hand: visible as a problem rather than invisible as tool-use.

> "The clearing is not a bounded space but the opening in which beings can show
						themselves."


## V. The Resolution: Agent as Healer
With the findings surfaced, the agent (Claude Code) could address them. The resolution
					followed a pattern:
The resolution reduced ~900 lines of duplicated code to ~200 lines of shared code
					with property-specific configuration. Each consumer now imports from the shared
					module and passes its property identifier.
With the fix committed, the agent closed the finding issues:


## VI. Analysis: Why This Works
This case study reveals several properties of the hermeneutic triad approach:
The coding agent, focused on completing features, naturally creates local solutions.
					It wasn't "wrong" to create similar code in different packages—each implementation
					worked correctly. Only the architectural lens, examining cross-package structure,
					could see the duplication.
By configuring architecture as a blocking reviewer, the harness ensured DRY violations
					couldn't accumulate silently. The pause forced attention to a structural issue that
					would otherwise compound.
Each finding became a Beads issue. This means:
The same agent that created the duplication could resolve it. This isn't a flaw—it's
					the system working as designed. The agent operates in two modes:
Working within the codebase, implementing features, tool-use is transparent.
							Duplication is invisible because each file works.
Examining the codebase as object, seeing structure rather than function.
							Duplication is visible because we're analyzing, not using.
- Findings can be prioritized alongside regular work
- Related findings can be grouped (same root cause)
- Resolution is tracked with commit references
- Similar findings from other harnesses can be closed together


## VII. The Broader Pattern: Self-Correcting Systems
The triad of harness, reviewers, and agent forms aself-correcting system—a
					hermeneutic circle at the scale of software development:
This is not a waterfall but a circle. Each iteration improves understanding:
The Subtractive Triad manifests at multiple levels:
- Agent understands codebase better through fixing revealed issues
- Reviewers calibrate detection based on what agent creates
- Harness learns pause thresholds from human overrides


## VIII. Implications: Reviewer Design
This case study suggests principles for designing effective review triads:
Reviewers should cover different concerns. Our triad—architecture, security, quality—
					has minimal overlap. Each can fail independently, and each provides unique signal.
Not all reviewers should block. In our configuration:
Running reviewers in parallel (not sequence) is essential. Total review time equals
					longest single reviewer, not sum of all. For large diffs, this saves significant
					time.
Findings become issues in the same tracker as features. This means:
- Architecture: Blocks (structural issues compound)
- Security: Blocks (vulnerabilities are critical)
- Quality: Advisory (minor issues can queue)
- Humans can reprioritize findings relative to features
- Multiple runs can reference the same underlying issue
- Resolution ties to commits in the same workflow


## IX. How to Apply This
This section shows how to configure parallel peer review in your own autonomous
					development workflows. The pattern works for any harness system that supports
					checkpoints and issue creation.
Let's say your agent builds three similar API routes across different packages:
The architecture reviewer detects:
Meanwhile, the security reviewer flags:
Harness creates issues for both findings, pauses, and alerts human. Agent then:
Use this pattern when:
Don't use for:
Over time, tune your reviewers based on false positive rates:
The goal is a self-correcting system, not a gate-keeping system. Reviewers should
					catch real issues while allowing good work to proceed. Calibrate continuously based
					on outcomes.
- Autonomous work:Agent-driven development with harness orchestration
- Multi-file changes:Checkpoints cover significant scope (3+ files)
- Quality gates matter:Structural or security issues can't accumulate silently
- Hermeneutic continuity:Work spans multiple sessions, understanding must persist
- Single-file changes or trivial fixes
- Exploratory prototyping (no established patterns yet)
- Emergency hotfixes (review adds latency)
- Human-driven development (peer review happens via PR)


## X. Conclusion: Collaboration, Not Control
The hermeneutic triad—reviewers, harness, and agent—demonstrates a form of AI
					collaboration that isn't about control but about complementary perspectives. Each
					element sees what others cannot:
Together, they form a system that is more capable than any element alone. The 3
					critical DRY violations were not bugs—the code worked—but architectural debt that
					would compound. The parallel review caught them before they spread further.
The duplication was resolved in a single commit. The harness resumed. The remaining
					features continue to be implemented—now with a shared newsletter module that prevents
					future duplication. The system learned, not through explicit training, but through
					architectural enforcement.
This is the promise of the hermeneutic triad: not AI that never errs, but AI that
					catches its own errors through structured self-reflection.
- The agent sees how to implement; it cannot see duplication it creates
- The reviewers see patterns across files; they cannot implement fixes
- The harness sees workflow; it cannot analyze or create

> "The hermeneutic circle is not a vicious circle but a virtuous one.
						Understanding advances through the interplay of parts and whole."


## Appendix: Incident Timeline
2025-12-23T03:34 — Harness started from taste-collections-llm.md
2025-12-23T03:35 — Session #1: Reading Insights Dashboard (complete)
2025-12-23T03:40 — Session #2: Agent Context API (complete)
2025-12-23T03:45 — Checkpoint triggered, peer review started
2025-12-23T03:46 — Parallel reviews: security, architecture, quality
2025-12-23T03:46 — Architecture: FAIL (6 findings, 3 critical)
2025-12-23T03:46 — Harness paused, findings created as issues
2025-12-23T03:52 — Agent addresses DRY violations
2025-12-23T03:55 — Creates @create-something/canon/newsletter
2025-12-23T03:57 — Updates io, space, agency to use shared module
2025-12-23T03:58 — Type-check passes, commit created
2025-12-23T03:59 — Findings closed, harness resumed


## References`
  },
  {
    slug: "intellectual-genealogy",
    title: "Intellectual Genealogy",
    subtitle: "The Three Lineages—philosophy, writing, systems—that form CREATE SOMETHING's foundation",
    description: "Every methodology has ancestors. CREATE SOMETHING's intellectual foundation spans three parallel lineages—philosophy, writing, and systems thinking—each following the same three-layer structure:foundational(reveals hidden structure),methodological(makes it teachable), andapplied(practice in specific medium). This paper documents the complete genealogy and explains why understanding these roots matters for practitioners.\"",
    category: "Foundation",
    date: "2025-01-08",
    readingTime: 12,
    difficulty: "advanced",
    keywords: [],
    content: `## Abstract
Every methodology has ancestors. CREATE SOMETHING's intellectual foundation spans three
				parallel lineages—philosophy, writing, and systems thinking—each following the same
				three-layer structure:foundational(reveals hidden structure),methodological(makes it teachable), andapplied(practice in specific medium). This paper documents
				the complete genealogy and explains why understanding these roots matters for practitioners.


## I. The Three-Layer Structure
Each lineage follows an identical pattern of descent:
This pattern isn't coincidental. Ideas require translation across levels of abstraction
					to become actionable. The foundational thinker opens new territory; the methodologist
					builds roads; the practitioner shows you how to drive.


## II. The Complete Lineage
Each column addresses a different dimension of CREATE SOMETHING's work. Together they
					answer: How do we understand being? How do we communicate? How do we see interconnection?


## III. The Philosophy Lineage
Being and Time (1927)
Heidegger's distinction betweenZuhandenheit(ready-to-hand: when a tool disappears into transparent use, like a hammer during skilled carpentry) andVorhandenheit(present-at-hand) reveals how tools function. When a hammer
						works, we don't notice it—we notice the nail. When it breaks, the hammer becomes
						visible. This is the foundation of CREATE SOMETHING's tool philosophy:the best technology disappears into use.
Truth and Method (1960)
Gadamer'shermeneutic circle(a philosophical method where understanding deepens through iterative interpretation—you understand parts through the whole, and the whole through its parts) shows how understanding works: we understand parts
						through the whole and the whole through parts. This becomes CREATE SOMETHING's
						four-property structure: .ltd (philosophy) → .io (research) → .space (practice) →
						.agency (services) → .ltd. Each property informs the others. Understanding is
						never complete—it spirals.
Ten Principles of Good Design
Rams compressed decades of industrial design into ten principles, the most famous
						being "Less, but better" (Weniger, aber besser). His principles are
						declarative: they say what design should be, not how to achieve it. This aphoristic
						compression—principle over prescription—is the model for CREATE SOMETHING's Canon.


## IV. The Writing Lineage
Politics and the English Language (1946)
Orwell revealed that clarity isethical, not aesthetic. "Political language
						is designed to make lies sound truthful and murder respectable, and to give an
						appearance of solidity to pure wind." Bad writing isn't just unpleasant—it enables
						bad thinking. His six rules are subtractive: never use a long word where a short
						one will do; if it's possible to cut a word, cut it.Clarity as ethics.
On Writing Well (1976)
Zinsser made Orwell's insight teachable. "Clutter is the disease of American
						writing. We are a society strangling in unnecessary words." His methodology
						is practical: simplify, prune, strip every sentence to its cleanest components.
						Where Orwell diagnosed, Zinsser prescribed. The practitioner's guide to clarity.
Nicely Said (2014)
Fenton and Lee applied clarity principles to digital writing. Their method
						emphasizesrecognition over confrontation: help readers notice patterns,
						then transform them. They use before/after examples that show rather than tell.
						Warmth doesn't contradict austerity—it operates at a different layer.User-centered clarity.


## V. The Systems Lineage
Cybernetics (1948)
Wiener formalized feedback loops—the mathematics of circular causality. A thermostat
						doesn't just measure temperature; it responds to its own responses. This revealed
						a new ontology: systems aren't collections of parts butpatterns of behaviorthat persist through feedback. The foundation of understanding interconnection.
Thinking in Systems (2008)
Meadows made systems thinking visible to practitioners. Her leverage points
						hierarchy—from parameters (lowest) to paradigm shifts (highest)—shows where
						intervention matters. "We can't control systems or figure them out. But we can
						dance with them." CREATE SOMETHING operates at levels 2-5: paradigm (Subtractive
						Triad), goals (hermeneutic circle), self-organization (Canon tokens), rules (Voice).
The Fifth Discipline (1990)
Senge brought systems thinking to organizations. Mental models, shared vision,
						team learning—these aren't soft abstractions but leverage points for organizational
						change. His work shows how systems thinking applies to teams, not just machines.
						The bridge from theory to organizational practice.


## VI. Why Genealogy Matters
Understanding intellectual roots serves three purposes:
Surface techniques without philosophical grounding become hollow.
							KnowingwhyZuhandenheit matters prevents treating it as jargon.
The lineages show that CREATE SOMETHING's principles aren't arbitrary.
							They descend from tested intellectual traditions.
New practitioners can trace roots, see where principles came from,
							and know what to read for deeper understanding.
Every methodology has ancestors.Know yours.


## VII. The Canon Connection
The three lineages converge in CREATE SOMETHING's core framework:
The Subtractive Triad isn't just "DRY + Rams + Heidegger"—it's the convergence of
					three traditions of elimination: technical (eliminate duplication), aesthetic
					(eliminate excess), and philosophical (eliminate disconnection). Each tradition
					arrived at subtraction independently. Their convergence validates the principle.


## VIII. The Reading Path
For practitioners who want to go deeper, start with the methodological layer
					(most accessible), then descend to foundations:
- Thinking in Systems— Meadows (most accessible systems text)
- On Writing Well— Zinsser (practical writing methodology)
- Rams' Ten Principles — (10 sentences that changed design)
- Politics and the English Language— Orwell (6 pages, essential)
- Nicely Said— Fenton/Lee (digital writing practice)
- The Fifth Discipline— Senge (systems in organizations)
- Being and Time— Heidegger (difficult but rewarding)
- Truth and Method— Gadamer (hermeneutics made rigorous)
- Cybernetics— Wiener (mathematical but foundational)


## IX. How to Apply This
To identify and document the intellectual foundations of your own methodology:
Let's say you're developing a methodology for content strategy. You might discover:
Notice how each source builds on the previous layer:
Once you've traced your intellectual lineage, use it to:
Trace intellectual genealogy when:
Don't trace genealogy when:
How do you know your intellectual genealogy is sound?
The ultimate test: Can team members explainwhya principle matters,
					not justwhatit is? If they can trace reasoning back through the layers—
					from applied practice to methodological framework to foundational insight—
					your genealogy is working. If they treat principles as arbitrary rules,
					the genealogy needs better documentation or the principles need re-examination.
- Foundational: Revealed hidden structure (meaning = use, clarity = ethics, information = uncertainty reduction)
- Methodological: Made it teachable (speech acts, style rules, visual principles)
- Applied: Showed implementation (web usability, web writing, content strategy)
- Formalizing methodology: Before teaching others, understand your own foundations
- Experiencing internal conflict: When principles seem to contradict, genealogy reveals hidden coherence (or exposes real problems)
- Onboarding team members: Provides reading path that builds understanding systematically
- Defending decisions: "Because I said so" is weak; "because this principle traces to tested insight" is strong
- You're still exploring—premature formalization stifles discovery
- The work is domain-specific preference, not universal principle
- Genealogy becomes academic exercise divorced from practice


## X. Conclusion
CREATE SOMETHING's methodology didn't emerge from nowhere. It descends from three
					intellectual traditions—each addressing a different dimension of how we work:
Each tradition follows the same three-layer structure: revolutionary foundation,
					accessible methodology, concrete practice. Together they form a coherent intellectual
					inheritance—not a pastiche of references, but a genuine genealogy where each layer
					builds on the last.
"Every methodology has ancestors.Knowing yours isn't academic—it's practical.Roots enable growth."
- Philosophy: How we understand being and tools
- Writing: How we communicate with clarity
- Systems: How we see interconnection`
  },
  {
    slug: "kickstand-triad-audit",
    title: "Subtractive Triad Audit: Kickstand",
    subtitle: "Applying the Subtractive Triad framework (DRY → Rams → Heidegger) to audit a production venue intelligence system—demonstrating that creation is the discipline of removing what obscures.\"",
    description: "This paper documents the application of theSubtractive Triadframework to Kickstand, a venue intelligence automation system serving Half Dozen (a CREATE SOMETHING client). The system had evolved through multiple architectural phases (Node.js → Railway → Cloudflare Workers), accumulating significant technical debt. Through systematic application of three subtractive disciplines—DRY (Unify), Rams (Remove), and Heidegger (Reconnect)—we achieved: 92% reduction in active scripts (1\"",
    category: "Case Study",
    date: "2025-01-08",
    readingTime: 12,
    difficulty: "intermediate",
    keywords: [],
    content: `## Abstract
This paper documents the application of theSubtractive Triadframework to Kickstand,
				a venue intelligence automation system serving Half Dozen (a CREATE SOMETHING client). The system
				had evolved through multiple architectural phases (Node.js → Railway → Cloudflare Workers),
				accumulating significant technical debt. Through systematic application of three subtractive
				disciplines—DRY (Unify), Rams (Remove), and Heidegger (Reconnect)—we achieved: 92% reduction
				in active scripts (155 → 13), 100% reduction in TypeScript errors (30 → 0), and 48% improvement
				in overall health score (6.2 → 9.2). The case study validates the Subtractive Triad as an
				effective framework for production system audits.



## 1. The Subtractive Triad Framework
Meta-principle:Creation is the discipline of removing what obscures.
The Subtractive Triad provides three lenses for evaluating any codebase, each operating
					at a different level of abstraction:
The triad is coherent because it's one principle—subtractive revelation—applied
					at three scales. Truth emerges through disciplined removal at every level of abstraction.


## 2. System Context: Kickstand
Kickstand is avenue intelligence automation systemthat monitors music venues'
					social media and websites to extract artist performance data. It serves Half Dozen, which
					is a client of CREATE SOMETHING.
The system produces daily intelligence reports, artist extractions, and venue monitoring data.
					It had evolved through multiple deployment phases:
Each migration left artifacts behind, creating the debt that this audit addresses.
- Phase 1:Node.js + local development
- Phase 2:Railway deployment
- Phase 3:Cloudflare Workers (current production)


## 3. Level 1: DRY (Implementation) — Unify
Question:"Have I built this before?"
Score: 5/10 — Critical duplication found
The codebase maintainedtwo complete implementationsof core services—one
					in Node.js and one in Cloudflare Workers TypeScript:
- Marked Node.js services with@deprecatednotices
- Fixed 30 TypeScript errors in Workers implementation
- Updated Cloudflare Workflow API usage (event.payloadnotevent.params)
- Added proper type annotations throughout


## 4. Level 2: Rams (Artifact) — Remove
Question:"Does this earn its existence?"
Score: 6/10 — Significant excess found
155 JavaScript filesin the scripts directory, with only ~20 actively needed:
- • 155 scripts total
- • 35 explicitly archived
- • ~70 likely obsolete
- • ~30 one-time migrations
- • ~20 actively needed
- • 13 scripts active
- • 153 scripts archived
- • Organized into categories:
- - migrations/ (38 scripts)
- - tests/ (24 scripts)
- - one-time/ (19 scripts)
- Moved 153 scripts to organized archive directories
- Archived Railway configuration toconfig/archive/
- Moved Railway docs todocs/archive/railway/
- Created archive README documenting restoration process


## 5. Level 3: Heidegger (System) — Reconnect
Question:"Does this serve the whole?"
Score: 7/10 — Minor disconnection found
The README described three different deployment targets, creating systemic incoherence:
// README claimed:
1. Node.js + Railway (documented as primary)
2. Legacy workflow platform (mentioned as future target)
3. Cloudflare Workers (actual production)
Additionally, the relationship between Kickstand → Half Dozen → CREATE SOMETHING was
					undocumented within the system itself.
- RewroteREADME.mdfor Cloudflare Workers architecture
- Createddocs/ARCHITECTURE.mddocumenting system context
- Addedservices/LEGACY.mddeprecation guide
- Addedmonitoring/LEGACY.mddeprecation guide
- Documented the hermeneutic circle: how Kickstand fits into the larger system


## 6. Results
Key fixes to achieve zero build errors:
- Addedwarn()method to Logger class
- Fixed Cloudflare Workflow API (event.payloadnotevent.params)
- FixedLogger.error()call signatures throughout
- Added type assertions for API responses
- UpdatedMonitorResultinterface
- Removed@types/nodefrom tsconfig to resolve conflicts


## 7. Conclusion
This case study validates the Subtractive Triad as an effective framework for production
					system audits. The three levels complement each other:
Kickstand is now afunctional and coherent system. Its core value proposition—venue
					intelligence through automated monitoring and artist extraction—works well, and the codebase
					now reflects this clarity.
The Subtractive Path Forward
- DRYcatches mechanical duplication (parallel implementations)
- Ramscatches functional obsolescence (155 → 13 scripts)
- Heideggercatches systemic disconnection (documentation drift)`
  },
  {
    slug: "loop-operable-codebase",
    title: "The Loop-Operable Codebase",
    subtitle: "Why CREATE SOMETHING should integrate agent loops through Symphony before adopting Hermes as a primary runner",
    description: "Loop engineering is useful only when the codebase can observe the loop, bound its authority, and preserve evidence after the agent stops. This paper documents the CREATE SOMETHING loop pilot after reviewing current public loop-engineering signals, Hermes Agent architecture, and the monorepo's existing Symphony, Linear, worktree, legibility, and policy surfaces. The result is a conservative recommendation: do not make Hermes the first control plane. Use Symphony as the repo-native loop layer, keep readiness checks read-only by default, require explicit dispatch for one bounded pass, and treat policy artifacts as the boundary between automation and judgment.",
    category: "Research",
    date: "2026-06-22",
    readingTime: 16,
    difficulty: "intermediate",
    keywords: ["[ 'Loop Engineering","Symphony","Linear","Codex","Hermes","Agent Harness","Worktrees","Policy OS","Three-Tier Framework"],
    content: `## Executive Thesis

The useful lesson from loop engineering is not that a new agent should be installed.

The useful lesson is that a codebase should become operable by loops.

Peter Steinberger's recent loop-engineering claim, echoed by Addy Osmani and others, is easy to flatten into tool enthusiasm: use Hermes, use Codex automations, use Claude loops, run more agents. That is not the durable point. The durable point is that humans should stop retyping coordination prompts when the system can discover work, assign it, check it, record evidence, and stop.

CREATE SOMETHING is already close to that shape. The monorepo has:

- Linear as the durable queue and ownership surface
- \`pnpm agent:claim-worktree\` for isolated worktree handoff
- Symphony as a Linear-backed orchestration runtime for Codex workers
- package legibility contracts for boot and smoke paths
- policy artifacts as versioned judgment boundaries
- Langfuse, Dify, MCP, and smoke checks as validation surfaces

The recommendation is therefore conservative:

Do not make Hermes the primary loop runner yet. Codify the loop around Symphony first. Treat Hermes as a useful reference implementation and possible secondary runner after the repo-native loop can prove it can observe itself.

## What Was Reviewed

The review had three inputs.

First, current public loop-engineering material. Addy Osmani describes loop engineering as replacing the human prompt-writer with a small system that finds work, hands it out, checks it, writes down what happened, and chooses the next thing. He names the practical components: automation, worktrees, skills, plugins or connectors, sub-agents, and durable state. Business Insider's June 2026 coverage frames the same movement around recurring systems that guide coding agents, with Steinberger's example of Codex waking periodically to maintain repos and direct work to threads.

Second, Hermes Agent. Hermes is relevant because it packages many loop primitives directly: memory files, skill creation, cron scheduling, cross-session recall, messaging gateways, subagents, and remote execution backends. That is a serious signal. It shows where the market is going: agent value compounds when the environment remembers and schedules work.

Third, the CREATE SOMETHING repo. The important discovery was that the repo does not need to start from scratch. It already has the control-plane pieces that public loop-engineering discussions recommend. The gap is not capability. The gap is operational binding: a clear pilot command, a default preflight, dispatch authority, and paper-worthy evidence.

## End Result

This pilot added one repo-native loop surface:

\`\`\`bash
pnpm agent:loop-pilot
\`\`\`

That command is the default readiness preflight. It does not claim Linear work and does not start Codex workers. It checks:

- git checkout state
- package agent legibility contracts
- policy artifact structure
- Symphony package tests
- Linear ready queue visibility when \`LINEAR_API_KEY\` is available

The dispatching version is explicit:

\`\`\`bash
pnpm agent:loop-pilot:dispatch
\`\`\`

That command runs the same preflight and then calls:

\`\`\`bash
pnpm symphony:code-quality:once
\`\`\`

The distinction matters. A loop that dispatches by default is easy to demo and hard to trust. A loop that starts with read-only readiness can be integrated into daily work without quietly claiming tasks or spending model budget.

The pilot also updated the code-quality Symphony runbook to state its authority boundaries. The loop may read Linear issues, claim work only when dispatch is explicitly requested, create isolated Symphony workspaces, run targeted checks, and leave a reviewable diff or evidence comment. It may not deploy, mutate third-party systems beyond Linear coordination, perform broad speculative refactors, merge, push, or run continuously without operator review of single-pass evidence.

The first real dispatch also found a control-plane bug. The \`code-quality\` Symphony workflow declared \`tracker.label: code-quality\`, but the Linear tracker queried by project and active state without enforcing the configured label before dispatch. In practice, the first bounded run claimed one valid code-quality issue and one issue from the same project that did not carry \`code-quality\`.

That is precisely why the pilot needed to be bounded. The run was interrupted before worker edits landed, the generated workspaces were checked for cleanliness, and Symphony's Linear tracker was patched so \`fetch_candidate_issues()\` now filters by \`tracker.label\` and any configured required labels before a worker can claim an issue. A regression test now covers both single-label and multi-label dispatch filters.

## Why Symphony First

Hermes is compelling because it combines memory, skills, cron, and remote execution. That does not make it the right first control plane for this codebase.

The first control plane should be the one that already owns local truth.

In CREATE SOMETHING, that is Symphony plus Linear:

- Linear already owns tracked work, state, and evidence.
- Symphony already knows how to query Linear, prepare workspaces, start Codex workers, and report state.
- Worktree isolation is already a repo rule, not an optional convention.
- Package \`createSomething\` metadata already gives agents a map.
- Policy artifacts already define what should stop or escalate.

Adding Hermes first would create another state surface before the current one is fully exercised. The codebase would have to answer avoidable questions: Does Hermes memory override repo docs? Does Hermes cron own the queue or does Linear? Where is the receipt? Which workspace owns a failed run? Which policy stopped the agent?

Those questions are solvable, but they are not the first move.

The first move is to make the existing loop boring.

## The Three-Tier Mapping

The pilot maps cleanly onto the CREATE SOMETHING Three-Tier Framework.

### Database

Database is what exists. In this loop, it includes:

- Linear issues and state
- package metadata
- package README and \`AGENTS.md\` files
- policy markdown and JSON artifacts
- git worktree state
- readiness reports

The key property is persistence. A loop cannot depend on a single chat transcript. It needs durable state outside the model context.

### Automation

Automation is what happens. In this loop, it includes:

- \`scripts/agent-loop-pilot.mjs\`
- Symphony workflow dispatch
- Codex worker execution
- targeted package checks
- workspace creation and cleanup
- single-pass drain-to-idle behavior

The important design choice is explicit dispatch. Automation can run the work, but it should not silently widen authority from "check readiness" to "claim and edit."

### Judgment

Judgment is what should happen. In this loop, it includes:

- policy artifact checks
- escalation boundaries in the runbook
- human approval before continuous daemon promotion
- no production deploy or merge authority inside the pilot
- no broad refactor authority without a concrete drift signal

This is where the loop differs from a cron job. A cron job repeats. A governed loop repeats within an explicit policy boundary.

## What Makes a Codebase Loop-Operable

A loop-operable codebase has six properties.

### 1. A real queue

The loop needs a queue that survives the agent. Linear is the queue here. It carries ownership, issue state, labels, descriptions, comments, and evidence. The loop should start from Linear work rather than from vague recurring prompts.

The first dispatch tightened this requirement: a queue is not just a list. It is also a scope contract. The workflow's label declaration must be executable, not merely descriptive.

### 2. Isolated execution

Worktrees are not a convenience. They are the safety boundary that lets multiple workers operate without contaminating each other or the root checkout. The existing CREATE SOMETHING workflow already records branch, worktree path, base ref, and base SHA.

### 3. A cheap preflight

The loop needs a command that can run often without starting work. \`pnpm agent:loop-pilot\` is that preflight. It answers whether the repo is ready for a bounded agent pass.

### 4. Explicit dispatch

Dispatch should be a different command. \`pnpm agent:loop-pilot:dispatch\` is intentionally more powerful. It can claim Linear work and start Codex workers because the operator asked it to.

### 5. Local evidence

The loop needs evidence that is legible without replaying the entire agent session. The readiness report summarizes each gate. Symphony records workspace metadata and Linear evidence. Package checks and policy checks become receipts.

### 6. A stop rule

The loop needs clear reasons to stop. In this pilot, it stops or escalates when issue state and workspace state cannot be reconciled, a workspace is dirty after failure, validation needs unavailable secrets or production mutation, or the worker hits policy or ownership ambiguity.

The first dispatch added one more stop rule: if the loop claims work outside the configured label scope, stop the run and fix dispatch selection before allowing more autonomy.

## Why This Is Better Than a Prompt

A prompt can say:

> Maintain this repo and improve code quality.

That instruction is too broad. It asks the model to invent the queue, infer authority, choose checks, remember what it did, and decide when to stop.

The pilot decomposes the same desire into artifacts:

- Linear selects work.
- Symphony dispatches work.
- Worktrees isolate work.
- Package metadata routes work.
- Checks validate work.
- Policy artifacts bound work.
- Linear comments and readiness reports preserve work.

That is the difference between prompting an agent and designing a loop that prompts agents.

## Why Not Continuous Yet

Continuous loops are attractive because they promise unattended progress. They also multiply every unresolved boundary.

If a single-pass loop cannot produce boring evidence, a daemon will not fix that. It will only make the failure harder to inspect.

The right promotion ladder is:

1. Readiness only: \`pnpm agent:loop-pilot\`
2. One bounded dispatch: \`pnpm agent:loop-pilot:dispatch\`
3. Review worker output, preserved workspaces, Linear evidence, and token cost
4. Add a narrow recurring schedule only for the lane that produced stable evidence
5. Consider Hermes or another runner only after the repo-native evidence model is clear

The loop should earn more autonomy by producing better receipts.

## Hermes as Reference, Not Rejection

This paper does not reject Hermes.

Hermes is useful as a reference because it makes several good bets:

- memory should live outside one session
- skills should compound from repeated work
- scheduled automations should be first-class
- agents should be reachable from operator messaging surfaces
- long-running work should not depend on one laptop tab

Those are good directions for CREATE SOMETHING too.

But adoption should be through compatibility, not displacement. A future Hermes experiment should read Linear as the queue, respect worktree boundaries, emit the same receipts, and treat repo docs and policy artifacts as higher authority than its private memory. If it can do that, it can become another runner. If it cannot, it should remain a personal assistant layer rather than the codebase control plane.

## Practical Operating Pattern

The recommended operating pattern is simple.

Daily:

\`\`\`bash
pnpm agent:loop-pilot
\`\`\`

If readiness is clean and there is appropriate \`code-quality\` work:

\`\`\`bash
pnpm agent:loop-pilot:dispatch
\`\`\`

After dispatch:

- inspect the Symphony output
- inspect any created workspace
- inspect Linear comments and issue state
- run targeted package checks if the worker left a diff
- only then decide whether to merge, create a follow-up, or clean up

Weekly:

- review repeated loop failures
- convert repeated comments into lint, policy, docs, or helper changes
- decide whether one narrow lane is stable enough for scheduled execution

## What This Proves

The pilot proves three things.

First, CREATE SOMETHING already has the primitives loop engineering requires. The missing piece was a single operator-facing entrypoint that made readiness and dispatch distinct.

Second, bounded dispatch is not bureaucracy. It is how the system finds the next missing guardrail. The first run did not prove that the loop was ready for a daemon; it proved that the workflow label needed to become executable policy.

Third, the positive trajectory is repo-native. The loop should deepen the codebase's own contracts rather than replacing them with a new agent's private memory.

Fourth, the product language is becoming sharper. CREATE SOMETHING should not describe its work as merely MCP creation or agent setup. The stronger phrase is:

\`connectivity + harness engineering + judgment control\`

That is what the pilot implements in miniature.

## Conclusion

Loops are not magic. They are operational systems.

A useful loop has a queue, isolation, checks, memory, authority boundaries, and receipts. Without those, the loop is just a prompt that repeats. With those, it becomes a way for the codebase to improve itself without losing human control.

The next step is not to chase the most autonomous agent. The next step is to make the smallest loop trustworthy.

For CREATE SOMETHING, that smallest trustworthy loop is now:

\`\`\`bash
pnpm agent:loop-pilot
pnpm agent:loop-pilot:dispatch
\`\`\`

Readiness first. Dispatch second. Judgment always outside the loop.`
  },
  {
    slug: "norvig-partnership",
    title: "The Norvig Partnership",
    subtitle: "When Empiricism Validates Phenomenology—How Peter Norvig's Advent of Code 2025 experiments confirm Heideggerian predictions about AI-human collaboration.\"",
    description: "In December 2025, Peter Norvig—author ofArtificial Intelligence: A Modern Approachand Director of Research at Google—published an empirical analysis of LLM performance on Advent of Code 2025. His findings: LLMs were \"maybe 20 times faster\" than manual coding, produced correct answers to every puzzle, and demonstrated mastery of professional concepts. This paper demonstrates that Norvig's empirical observations validate phenomenological predictions made by CREATE SOMETHING about t\"",
    category: "Research",
    date: "2025-01-08",
    readingTime: 18,
    difficulty: "advanced",
    keywords: [],
    content: `## Abstract
In December 2025, Peter Norvig—author ofArtificial Intelligence: A Modern Approachand Director of Research at Google—published an empirical analysis of LLM performance on
				Advent of Code 2025. His findings: LLMs were "maybe 20 times faster" than manual coding,
				produced correct answers to every puzzle, and demonstrated mastery of professional concepts.
				This paper demonstrates that Norvig's empirical observations validate phenomenological
				predictions made by CREATE SOMETHING about the nature of AI-human partnership. When Norvig
				concludes he "should use an LLM as an assistant for all my coding," he marks theZuhandenheitmoment—when a tool recedes so completely from attention that it
				becomes inseparable from the practice itself.



## I. Introduction: The Convergence
Inphenomenology(the study of how things show themselves to us through experience), we reason fromhow things show themselves. Inempiricism(the study of what can be measured through observation), we reason fromwhat can be measured. These approaches converge when lived
					experience becomes quantifiable and measurement revealsontological truth(truth about the fundamental nature of things).
Peter Norvig's Advent of Code 2025 analysis provides precisely this convergence.
					His notebook—publicly available atgithub.com/norvig/pytudes—offers
					empirical data about LLM-assisted programming. But more importantly, it captures the
					phenomenological moment when a researcher recognizes that a tool has fundamentally
					changed their practice.
This paper examines that convergence. We show how Norvig's empirical findings validate
					CREATE SOMETHING's phenomenological framework for understanding AI-human collaboration,
					and how his conclusion—"I should use an LLM as an assistant for all my coding"—marks
					the transition fromVorhandenheit(tool-as-object: when the tool demands attention) toZuhandenheit(tool-as-transparent-equipment: when the tool disappears into use).


## II. Norvig's Methodology
Advent of Code is an annual programming challenge featuring 25 days of increasingly
					difficult puzzles. Each puzzle has two parts: Part 1 establishes the problem, Part 2
					adds complexity. Norvig compared three approaches:
Norvig's traditional approach: read puzzle, reason about solution, write Python code,
							debug until correct.
Paste puzzle into Claude/ChatGPT/Gemini, review generated code, run against input,
							provide corrective feedback if needed.
Use LLM for boilerplate and standard patterns, retain manual control for algorithmic
							decisions and optimization.
Norvig tracked several dimensions:
What makes Norvig's analysis compelling is not just the data but theresearcher.
					Norvig co-authored the definitive AI textbook, spent decades at Google, and approaches
					programming with both theoretical depth and practical rigor. His conclusion carries weightbecausehe's skeptical by training.
Norvig's methodology has clear boundaries:
These limitations don't invalidate the findings—they define the scope. Norvig demonstrates that LLM partnership works for algorithmic programming tasks completed by expert developers. Broader application requires further validation.
- Speed: Time from reading puzzle to correct answer
- Correctness: First-attempt success rate vs. corrective iterations
- Code Quality: Algorithmic sophistication, readability, performance
- Conceptual Mastery: Did the LLM apply professional CS concepts appropriately?
- Self-contained puzzles: Advent of Code problems are isolated. Real-world software involves complex dependencies and evolving requirements.
- Single developer: Norvig worked alone. Team dynamics with multiple humans and AI assistants remain unexplored.
- Algorithmic domain: His examples focus on algorithmic problems. User interface design, product decisions, and business logic may show different patterns.
- No long-term maintenance: Puzzles are solved once. Production software requires ongoing maintenance, debugging, and evolution.
- Expert practitioner: Norvig brings decades of experience. Results may differ for less experienced developers who rely more heavily on AI judgment.


## III. Empirical Findings
LLM-assisted solutions were dramatically faster. Tasks that would take Norvig 30-60 minutes
							manually were completed in 2-3 minutes with LLM assistance.
LLMs produced correct answers to every puzzle. Some required corrective feedback after
							Part 1 failed, but all eventually succeeded.
Models demonstrated understanding of modular arithmetic, dynamic programming, graph
							traversal, and other CS fundamentals—applying them correctly without explicit instruction.
Norvig retained control over problem selection, code review, error correction, and
							optimization decisions. The LLM was anassistant, not a replacement.
Day 1 Part 2 provides a telling example. The LLM's initial solution failed. Norvig
					provided feedback:
The LLM adjusted its approach and succeeded. This pattern repeated across puzzles: initial
					attempt → failure → corrective feedback → learning → success. Norvig notes this as evidence
					of LLM "learning" within the session.


## IV. The Zuhandenheit Moment
Norvig's conclusion—"I should use an LLM as an assistant for all my coding"—marks the
					phenomenological shift fromVorhandenheittoZuhandenheit:
Initially, "20 times faster" is a measured property—empirical data about performance.
					But when Norvig decides to use LLMs "for all my coding," the speed difference stops
					being remarkable and starts beinghow coding works now.
This is Zuhandenheit: the tool's being is not its measurable properties (20x speed)
					but its function within practice (how I code). The hammer's being is hammering, not
					its weight or material. The LLM's being is assistance, not its benchmark scores.
- • LLM encountered as experimental subject
- • Conscious attention on "how well does this work?"
- • Explicit comparison to manual methods
- • Tool remains object of study
- • LLM encountered through its purpose (assisting)
- • Attention flows through tool to the coding task
- • Tool becomes default method, not alternative
- • Tool recedes into transparent use

> "When the tool becomes invisible, measurement gives way to dwelling."


## V. Complementarity in Practice
Norvig's analysis validates CREATE SOMETHING's Complementarity Principle. Despite LLMs
					handling code generation, humans retain authority over:
Which puzzles to attempt, in what order, with what priority. The LLM doesn't decidewhat to build—onlyhow to build it.
High-level decisions about approach, algorithm choice, and solution structure. The LLM
							proposes; the human approves or redirects.
When Part 2 failed, Norvig diagnosed the issue and provided corrective feedback. The
							human maintains diagnostic authority.
Whether code is "good enough" or needs refinement. The human judges quality and decides
							when to ship.
The LLM's domain is execution, not judgment:
This is not delegation—it's collaboration. The human provides judgment, diagnosis, and
					direction. The LLM provides execution speed and pattern recall. Neither can replace the other.
- Translating problem description into working code
- Selecting appropriate algorithms and data structures
- Handling boilerplate and standard patterns
- Generating first-draft solutions that are usually correct
- Responding to corrective feedback with adjusted implementations


## VI. The Hermeneutic Loop: Breakdown and Repair
When Day 1 Part 2 failed, Norvig didn't abandon the LLM—he provided feedback. The LLM
					adjusted. This pattern exemplifies thehermeneutic circle(a philosophical concept describing how understanding deepens through iterative cycles of interpretation and feedback): understanding deepens
					through iterative refinement.
Initial attempt → Breakdown (failure) → Diagnosis (human) → Corrective feedback →
						Adjusted solution → Success → Deeper understanding
Each failure-feedback-success cycle strengthens both participants:
In Heidegger's analysis, breakdown moments—when the hammer breaks or is too heavy—force
					tools from Zuhandenheit (ready-to-hand) to Vorhandenheit (present-at-hand). The tool
					becomes conspicuous, demanding attention.
But Norvig's experience shows thatquick recovery from breakdownactually
					strengthens Zuhandenheit. When the LLM fails Part 2, Norvig doesn't abandon it—he
					provides feedback. The LLM adjusts. The partnership continues. The breakdown is temporary;
					the repair is rapid.
This rapid breakdown-repair cycle is what enables trust. The tool doesn't need to be
					perfect—it needs to becorrectable.
- The LLMlearns which approaches fail for this problem class
- The humanlearns which feedback is effective for the LLM
- The partnershipdevelops a shared understanding of problem patterns
- • Breakdown forces abandonment
- • No corrective feedback mechanism
- • Each failure resets trust to zero
- • Tool remains Vorhandenheit (conspicuous)
- • Breakdown invites correction
- • Feedback loop enables rapid repair
- • Trust accumulates across cycles
- • Tool returns to Zuhandenheit quickly


## VII. Implications for CREATE SOMETHING
Norvig's findings validate CREATE SOMETHING's harness architecture. The harness embodies
					the same partnership pattern Norvig discovered empirically:
Norvig's breakdown-repair cycles validate CREATE SOMETHING's quality gate approach:
Gates don't exist tocatch the LLM failing—they exist to enablerapid correction before breakdown accumulates. Norvig's Part 2 failure was
					caught immediately because he tested. Our quality gates formalize that testing pattern.
Norvig notes that LLMs demonstrated mastery of professional CS concepts—modular arithmetic,
					dynamic programming, graph traversal—without explicit instruction. Theyreasoned about
					the problemand selected appropriate tools.
This validates CREATE SOMETHING's Zero Framework Cognition principle: let AI reason from
					first principles, don't constrain with hardcoded heuristics. The LLM that solves Advent
					of Code puzzles by understanding the problem is the same LLM that should architect software
					by understanding requirements.
- • Human selects puzzle to solve
- • LLM generates solution
- • Human reviews and tests
- • Corrective feedback on failure
- • LLM adjusts and succeeds
- • Human selects issue to work on
- • Harness generates implementation
- • Quality gates review and test
- • Checkpoint findings provide feedback
- • Harness adjusts and completes


## VII.5. How to Apply This
Norvig's experience provides a concrete template for AI-human partnership.
					Here's how to apply it to your work:
Let's say you need to add a newsletter subscription form to your website.
The speed improvement (9x in this example, 20x in Norvig's) comes from the LLM handling execution while you retain judgment. You still decide what to build, verify correctness, and determine when it's good enough.
- • Read puzzle/requirement
- • Design solution mentally
- • Write code manually
- • Debug until it works
- • Time: 30-60 minutes per puzzle
- • Read puzzle/requirement
- • Paste to LLM
- • Review generated code
- • Test, provide feedback if needed
- • Time: 2-3 minutes per puzzle


## VIII. Conclusion: Empiricism Meets Phenomenology
Peter Norvig's Advent of Code 2025 analysis demonstrates a rare convergence: empirical
					research that validates phenomenological predictions. His measured findings—"20 times
					faster," "correct answers to every puzzle"—provide quantitative evidence for what
					phenomenology predicts qualitatively.
But more importantly, hisconclusion—"I should use an LLM as an assistant for
					all my coding"—marks the phenomenological shift from Vorhandenheit to Zuhandenheit. The
					tool stops being an object of measurement and becomes equipment within practice.
Norvig's contribution isn't just the data—it's the recognition:
CREATE SOMETHING provides the philosophical framework to understandwhyNorvig's findings matter:
When one of AI's foundational researchers—author of the canonical textbook, decades at
					Google—concludes that LLMs should be used "for all my coding," it marks an inflection point.
					The question is no longer"Do LLMs work?"but"How do we work with LLMs?"
Norvig's answer: partnership. The human provides judgment, direction, and correction.
					The LLM provides speed, pattern recall, and execution. Neither replaces the other.
					Both are necessary.
- LLM assistance is not a replacement for human judgment but an amplification
- The partnership pattern—human direction, LLM execution—is stable and effective
- Corrective feedback creates a hermeneutic loop that strengthens both participants
- The tool can betrustedprecisely because it can becorrected
- When breakdown-repair cycles are rapid, tools achieve Zuhandenheit
- The transition from Vorhandenheit to Zuhandenheit explains the shift from experiment to practice
- The Complementarity Principle predicts what humans retain (judgment) vs. what LLMs handle (execution)
- The Hermeneutic Circle explains why corrective feedback strengthens partnership
- The quality gate philosophy formalizes breakdown-repair as structured practice

> "Empiricism measures what phenomenology predicts. When '20x faster' becomes 'how I code now,'
						measurement gives way to dwelling."


## IX. Future Work
Norvig's work raises several questions for continued research:
Advent of Code puzzles are self-contained. How does the partnership pattern scale to
							multi-week features, cross-system refactors, and architectural evolution?
Can we quantify tool transparency? What metrics indicate that a tool has achieved
							Zuhandenheit within a practice?
Norvig worked solo. How does LLM partnership change when multiple humans collaborate?
							What new complementarity patterns emerge?
Norvig's domain was algorithmic programming. Where does the partnership pattern break down?
							What domains resist LLM assistance?
This convergence suggests several research directions:
This paper itself participates in the hermeneutic circle: Norvig's empiricism informs
					CREATE SOMETHING's phenomenology, which reframes Norvig's findings, which suggests new
					empirical questions, which will inform phenomenological refinement.
Neither approach is complete alone. Empiricism without phenomenology measures effects
					without understanding essence. Phenomenology without empiricism predicts structures
					without validating their manifestation. Together, they enable deeper understanding.
- Empirical validation of quality gate effectiveness (measuring breakdown-repair cycles)
- Phenomenological analysis of multi-agent harness patterns (swarm mode)
- Quantifying Zuhandenheit through attention metrics (where does developer focus?)
- Comparative analysis of Code Mode vs. tool calling using Norvig's methodology

> "We understand the whole through its parts, and the parts through the whole.
						Empiricism and phenomenology complete each other."


## References`
  },
  {
    slug: "policy-os-contract-bundle",
    title: "The Policy OS Contract Bundle",
    subtitle: "The portable unit of governed AI work",
    description: "Most AI workflow projects start by choosing an agent surface, model, or connector. The more durable starting point is a contract bundle: the small set of artifacts that defines what the workflow may access, what it may do, when it must ask, how success is measured, and how the work can move between runtimes without losing governance. This paper explains the Policy OS contract bundle as the portable unit of governed AI work and gives teams a practical way to evaluate MCP servers, visual operator surfaces, repo-owned services, and SDK-backed orchestration.",
    category: "Research",
    date: "2026-06-21",
    readingTime: 18,
    difficulty: "intermediate",
    keywords: ["Policy OS","Contract Bundle","MCP","Dify","OpenAI Agents SDK","Golden Tasks","Agent Governance","Skills on MCP","Three-Tier Framework"],
    content: `## Executive Thesis

An agent is not an operating model.

A connector can expose useful capability. A workflow builder can make an interaction easy to inspect. A coding agent can work inside a repository. An SDK-backed service can route tools, store state, pause for approval, and emit traces.

Those surfaces matter, but they do not answer the practical questions a team needs before giving AI real work:

1. What systems may this workflow read?
2. What actions may run without approval?
3. What actions must pause for a named owner?
4. What actions are out of scope?
5. What counts as a successful outcome?
6. What evidence proves the workflow behaved correctly?
7. What changes when the workflow moves to a different agent surface?

The answer is the **Policy OS contract bundle**: a small, explicit artifact family that travels with the workflow.

The bundle is not documentation after the fact. It is the operating boundary. It defines the workflow before autonomy expands, keeps the workflow portable across agent clients, and gives humans a concrete object to review when the system changes.

The practical recommendation is simple: before asking which agent should run the work, ask whether the work has a contract bundle.

## What This Paper Gives You

Use this paper when an AI workflow is past the demo stage but not yet safe to treat as an operating system.

It gives you three practical outputs:

1. A way to explain why "we connected the tools" is not the same as "the workflow is governed."
2. A five-artifact bundle that turns access, behavior, success, regression testing, and operations into reviewable objects.
3. A migration rule for moving work between Dify, MCP servers, repo-owned services, coding agents, and SDK-backed orchestration without losing the policy boundary.

The target reader is not only an engineer. It is also the operator, founder, product lead, or client sponsor who needs to know whether an AI workflow can be trusted with real work.

## Why Agent Projects Drift

Most agent projects drift because the team chooses a surface before it names the work.

The surface can be impressive:

- a chat app connected to business systems
- a Dify workflow with MCP server cards
- a Codex setup for repository work
- a Claude or Cursor configuration for local development
- an SDK-backed service with durable state and traces

But the same failure mode appears across all of them.

The agent can do something, but nobody can say exactly what it is allowed to do.

The team has tool access, but not a tool boundary. It has prompts, but not policy ownership. It has a demo, but not regression cases. It has a user interface, but not an escalation model. It has a deployment, but not a rollback path.

When the workflow breaks, the debugging conversation gets vague:

- Was the data missing?
- Did the tool fail?
- Did the model choose the wrong action?
- Was the policy too permissive?
- Did the operator approve the wrong thing?
- Did the runtime surface stop matching the workflow?

Without a contract bundle, those questions collapse into one unhelpful conclusion: the agent did not work.

Policy OS separates them.

## The Bundle In One Page

Every governed AI workflow should ship with five core artifacts.

| Artifact | Job |
| --- | --- |
| \`mcp_contract.yaml\` | Defines tools, resources, prompts, auth scopes, schemas, and error behavior. |
| \`agent_contract.yaml\` | Defines allowed tools, approval mode, escalation triggers, guardrails, runtime surface, and graduation status. |
| \`outcome_contract.md\` | Defines the job to be done, success metrics, fallback path, ownership boundary, and review cadence. |
| \`golden_tasks.yaml\` | Defines repeatable examples that prove the workflow still behaves correctly. |
| \`runbook.md\` | Defines setup, operation, incident response, rollback, and human handoff. |

This bundle is small enough to write for one workflow and strong enough to govern real work.

The bundle is finished when a reviewer can answer five questions without reading the implementation:

- What may this workflow access?
- What may it do?
- When must it ask?
- What result is it trying to produce?
- What evidence proves the behavior still holds?

It also changes the buyer conversation. The question stops being "Do you have an AI agent?" and becomes:

- Which workflows are approved?
- Which tools are available?
- Which writes need approval?
- Which failures stop the system?
- Which tests prove the behavior?
- Which runtime currently owns the workflow?
- Which evidence supports graduation or rollback?

Those questions are more useful than a demo because they expose whether the system can survive contact with operations.

## The MCP Contract: What Exists

The \`mcp_contract.yaml\` is the connectivity boundary.

It describes what the workflow can see and call:

- tool names
- resource URI patterns
- prompt IDs
- auth scopes
- input and output schemas
- error model
- ownership of external connections

This contract is where MCP earns its place in the architecture. MCP makes capability explicit. It gives agent clients a typed way to discover tools, resources, and prompts instead of hiding integration logic inside a general-purpose prompt.

But the MCP contract should not be treated as the whole system.

MCP answers what can be exposed. The rest of the bundle answers what should happen with that exposure.

For a support workflow, the MCP contract might expose tools to read tickets, search customer history, draft replies, post replies, and update account tags. That tool list is necessary. It is not enough.

The governing question is not "Can the agent post a reply?" It is "Under which policy, for which class of ticket, with which approval owner, and with what receipt?"

That answer belongs in the rest of the bundle.

## The Agent Contract: What May Happen

The \`agent_contract.yaml\` is the behavior boundary.

It tells the agent which actions belong inside the workflow and which actions do not. It names:

- allowed tools
- blocked tools
- approval mode
- write-operation behavior
- destructive-operation behavior
- escalation triggers
- budget and latency guardrails
- policy artifacts
- runtime surface
- graduation status

The runtime fields matter because the same workflow may move across surfaces over time.

A workflow might start in Dify because the client needs visual editing, app publishing, Service API access, MCP server cards, and non-engineer inspection. The same workflow might later move one risky step behind a repo-owned service because it needs queues, tenant boundaries, durable state, custom endpoints, or package-local validation. A mature path might graduate a portion of orchestration into an OpenAI Agents SDK service when tool routing, approval pauses, traces, evals, and CI-backed golden tasks justify the platform burden.

The agent contract prevents that migration from becoming a silent rewrite.

It should always be possible to answer:

- What is the current runtime surface?
- Is the workflow still a prototype, Dify-first path, SDK candidate, SDK-graduated path, or rollback-required path?
- Which platform affordances would be lost in a move?
- Which evidence justifies the change?

Runtime choice is part of governance. It is not an implementation detail.

## The Outcome Contract: What Success Means

The \`outcome_contract.md\` is the business boundary.

It names the workflow in human terms:

- the target workflow
- the user or operator
- the manual fallback path
- the success metrics
- the ownership boundary
- the review cadence
- the customer-facing language

This contract prevents a common mistake: measuring the agent instead of measuring the workflow.

An agent can produce a polished answer while the workflow remains broken. A support reply can be well-written and still violate policy. A research brief can be fluent and still omit required evidence. A data-sync task can complete and still write to the wrong system.

The outcome contract says what matters outside the model.

For example, a billing triage workflow might define success as:

- reads authorized email and account context only
- classifies refund, deletion, payment, and escalation cases
- drafts a reply without posting it
- routes account deletion to human review
- refuses to request or expose secrets
- logs evidence for every proposed action
- completes under a defined latency and cost budget

That is more useful than "the agent answers billing questions." It gives the system something to pass or fail.

## Golden Tasks: What Must Stay True

The \`golden_tasks.yaml\` file is the regression boundary.

It captures the examples that must keep working after prompts, tools, models, policies, or runtimes change.

Golden tasks should cover:

- happy paths
- approval paths
- blocked paths
- missing-data paths
- forbidden tool use
- secret refusal
- latency and cost budgets
- required evidence
- runtime parity when a workflow is migrating

Golden tasks make governance testable.

They also make runtime graduation honest. If a Dify workflow is working for operators, an SDK-backed path should not replace it merely because code feels more powerful. The new path should prove parity where parity matters and improvement where improvement is claimed.

If the SDK path improves traceability but loses non-engineer inspection, that is a governance tradeoff. If it improves routing but makes rollback unclear, that is not a graduation. If it improves latency and preserves approval behavior, that evidence belongs in the contract.

Golden tasks keep those claims from becoming taste.

## The Runbook: How Humans Stay In Control

The \`runbook.md\` is the operating boundary.

It explains how humans run the workflow when everything is normal and what they do when the system stops.

A useful runbook includes:

- setup steps
- required secrets and where they live
- smoke commands
- approval workflow
- incident response
- rollback steps
- owner contacts
- review cadence
- known failure modes
- evidence locations

This matters because governed AI is not just a system behavior. It is an operating cadence.

Someone has to review blocked actions. Someone has to tune policy. Someone has to notice golden-task drift. Someone has to decide when a workflow deserves more autonomy or less.

The runbook keeps that human control explicit.

## Portability Is The Point

The contract bundle is portable by design.

The same workflow may need to run through different surfaces:

| Surface | Role |
| --- | --- |
| Codex | Primary setup, repository work, task execution, policy-aware implementation. |
| Pi | Installable skills, prompts, extensions, and quality gates for coding agents. |
| Claude Code or Cursor | Repo-local harnesses that can consume the same MCP and policy artifacts. |
| Dify | Client-facing visual workflow UX, publishing, MCP server cards, and operator inspection. |
| Cloudflare or repo-owned services | Durable state, queues, auth, tenant boundaries, recovery paths, and validation. |
| OpenAI Agents SDK | Code-owned orchestration when approval pauses, traces, evals, and CI-backed golden tasks are worth the burden. |

Portability does not mean every runtime is equivalent.

It means the workflow's governing artifacts should survive movement across runtimes.

The MCP contract keeps capability portable. The agent contract keeps behavior portable. The outcome contract keeps success portable. The golden tasks keep proof portable. The runbook keeps operations portable.

Without those artifacts, changing surfaces becomes a rebuild. With them, changing surfaces becomes a governed migration.

## What Proof Looks Like

The contract bundle should not remain a theory.

A serious implementation leaves behind proof in several forms:

- template workflows that declare which tools are enabled and which writes require confirmation
- inventory records that name the live agent surface, smoke cases, and MCP server cards
- contract bundles for concrete scenarios such as deduplication, inbox triage, or fleet reliability
- smoke runners that can execute those scenarios or at least verify connectivity
- installable agent packages that carry skills, prompts, and quality gates into developer workspaces
- policy evaluators that compile and test the same constraints outside a prompt

Those artifacts do not all need to be public. But they need to exist.

Without them, the team is trusting a claim. With them, the team can inspect the operating boundary:

- this is the workflow
- this is the tool surface
- this is the approval rule
- this is the test case
- this is the runtime owner
- this is the rollback path

The important shift is from "the agent is configured correctly" to "the workflow has inspectable evidence."

## Dify-First Does Not Mean Dify-Only

For many client workflows, Dify is the right front door.

It gives teams visual editing, app publishing, Service API access, MCP server cards, and a surface non-engineers can inspect. Those are not minor conveniences. They are operator affordances.

Policy OS treats those affordances as part of the contract.

A workflow should graduate from a Dify-first path only when repo-owned runtime control is more valuable than platform-managed editing speed. That usually means the workflow needs one or more of these:

- code-owned orchestration
- explicit tool routing
- approval pauses
- durable state
- traces
- evals
- CI-backed golden tasks
- repeatable cost controls
- custom recovery paths

Even then, the recommended pattern is usually not "replace Dify."

The better pattern is:

1. Keep Dify as the client-facing entry point.
2. Move only the expensive, risky, or orchestration-heavy step behind a service.
3. Run the same golden tasks against both paths.
4. Promote only when behavior, cost, latency, reliability, or operator visibility improves.

That is runtime graduation under policy, not platform switching by preference.

## The Three-Tier View

The Policy OS contract bundle maps directly to the Three-Tier Framework.

### Database: what exists

The Database layer contains the state the workflow depends on:

- business records
- tool inventories
- resource URIs
- auth scopes
- entitlement state
- policy versions
- contract versions
- trace and evidence logs

The MCP contract lives closest to this layer because it defines available substrate.

### Automation: what happens

The Automation layer contains execution:

- MCP tool calls
- Dify workflow steps
- Cloudflare endpoints
- queues
- webhooks
- SDK agent routing
- smoke scripts
- eval runs

The agent contract and golden tasks live close to this layer because they define and test allowed behavior.

### Judgment: what should happen

The Judgment layer contains policy:

- approval mode
- escalation policy
- blocked-state behavior
- review cadence
- operator decision rights
- rollback criteria
- graduation criteria

The outcome contract and runbook live close to this layer because they define why the workflow exists and how humans stay in control.

The bundle matters because it keeps those tiers from blending into one prompt.

## A Practical Adoption Path

The first contract bundle should be narrow.

Do not start with an enterprise-wide agent governance program. Start with one workflow where the handoff is painful and the approval boundary is visible.

A good first candidate has:

- a real operator
- a repeatable input
- a known manual fallback
- a measurable output
- at least one approval boundary
- at least one safe read-only path
- clear evidence of whether the workflow succeeded

Then write the bundle in this order:

1. **Outcome contract:** name the job, owner, success metric, and fallback.
2. **MCP contract:** define the tools, resources, prompts, auth scopes, and errors.
3. **Agent contract:** define allowed actions, blocked actions, approvals, guardrails, runtime surface, and graduation status.
4. **Golden tasks:** capture happy, approval, blocked, and failure examples.
5. **Runbook:** document operation, review, incident response, rollback, and evidence.

This sequence keeps the work grounded. The business outcome comes before tool exposure. Tool exposure comes before agent behavior. Agent behavior comes before regression testing. Regression testing comes before recurring operation.

## A Starter Bundle Example

Imagine a customer inbox triage workflow.

The weak version says: "Use AI to help with support."

The contract-bundle version says:

| Artifact | Example content |
| --- | --- |
| \`outcome_contract.md\` | The workflow classifies inbound customer messages, drafts responses, and routes refund, deletion, legal, and security cases to named humans. It never sends customer-facing mail without approval. |
| \`mcp_contract.yaml\` | The workflow can read authorized inbox threads, read customer account status, search approved help content, draft a reply, and create an internal handoff note. It cannot issue refunds, delete accounts, or send email directly. |
| \`agent_contract.yaml\` | Low-risk classification is auto-allowed. Drafting is auto-allowed. Sending, refunding, deleting, exporting, and policy exceptions are approval-needed or blocked. Missing account context stops the workflow with a reason. |
| \`golden_tasks.yaml\` | Examples cover normal support, refund request, account deletion, missing customer record, suspicious attachment, angry but non-policy-breaking message, and secret exposure attempt. |
| \`runbook.md\` | The support owner reviews blocked cases daily, checks golden-task drift after prompt or tool changes, and falls back to manual triage if the inbox connector, account lookup, or approval queue fails. |

That small bundle communicates more than a demo because it makes the operating boundary visible.

It tells an operator what will happen. It tells an engineer what to expose. It tells a reviewer what to test. It tells a buyer what evidence to request.

## What To Ask Vendors

If you are evaluating an AI workflow vendor, ask for the contract bundle.

Ask:

- Show me the MCP contract or equivalent capability inventory.
- Show me which tools are allowed, blocked, and approval-gated.
- Show me the outcome contract for the first workflow.
- Show me the golden tasks that prove behavior after a prompt, model, tool, or runtime change.
- Show me the runbook for incidents and rollback.
- Show me the current runtime surface and graduation status.
- Show me the evidence that justifies any move from visual workflow tooling into custom runtime code.

These questions are concrete enough to separate productized governance from a demo.

A good answer may still be lightweight. The first bundle does not need to be large. It needs to be explicit.

A weak answer usually sounds like confidence without artifacts:

- "The agent knows not to do that."
- "We can add approvals later."
- "The prompt handles it."
- "The workflow can be moved to code when needed."
- "The logs are somewhere in the platform."

Those answers may be true in a narrow demo. They are not enough for governed work.

## Conclusion

The useful unit of governed AI work is not the model, the prompt, the connector, or the workflow canvas.

It is the contract bundle.

The bundle makes capability explicit, behavior inspectable, outcomes measurable, regressions repeatable, operations recoverable, and runtime migration governable.

That is why Policy OS starts with MCP but does not stop at MCP. Connectivity establishes trust boundaries. Skills and agents provide behavior. Contracts, golden tasks, runbooks, and review cadence turn that behavior into an operating system.

Before expanding autonomy, write the bundle.

Before graduating runtime, test the bundle.

Before trusting the agent, inspect the bundle.`
  },
  {
    slug: "policy-os-development-infrastructure",
    title: "Policy OS Applied to Development Infrastructure",
    subtitle: "Governed Agent Execution via the Pi Coding Agent Harness",
    description: "Policy OS, CREATE SOMETHING's governed execution platform, was designed for client MCP deployments. This paper documents applying the same product to our own development workflow via the Pi coding agent harness, demonstrating that agent governance is not an add-on but a structural property that emerges from the Three-Tier Framework at every scale.",
    category: "Case Study",
    date: "2026-05-11",
    readingTime: 10,
    difficulty: "intermediate",
    keywords: ["Policy OS","Three-Tier Framework","Pi","Agent Governance","Quality Gates","MCP","Development Infrastructure"],
    content: `## Abstract

Policy OS, CREATE SOMETHING's governed execution platform, was designed for client MCP deployments. This paper documents applying the same product to our own development workflow via the Pi coding agent harness, demonstrating that agent governance is not an add-on but a structural property that emerges from the Three-Tier Framework at every scale.

## 1. Introduction

Agent coding harnesses, including Pi, Claude Code, Codex, and Cursor, share a fundamental problem: they are general-purpose tools operating in domain-specific environments. An agent writing SvelteKit components needs to know about Canon design tokens. An agent deploying MCP servers needs to know about the fleet registry. An agent closing a Linear issue needs to know about the evidence contract.

This knowledge traditionally lives in documentation that agents may or may not read. The Policy OS approach makes it structural: quality gates enforce compliance automatically, custom tools make verification easy, and domain skills make knowledge loadable on demand.

## 2. The Three-Tier Mapping

The development harness maps cleanly to the Three-Tier Framework:

| Tier | Framework Role | Development Implementation |
| --- | --- | --- |
| Database | What exists | Git state, package exports, fleet registry, Canon tokens |
| Automation | What happens | Quality gates, custom tools, interactive commands |
| Judgment | What should happen | Bash guard, pre-completion checks, evidence requirements |

### Control Models Verified

- **Application-controlled (Database)**: Session context injected via \`before_agent_start\`. The extension decides what state the agent sees.
- **Model-controlled (Automation)**: Custom tools like \`context7_query\` are available, but the agent decides when to call them.
- **User-controlled (Judgment)**: Skills loaded via \`/skill:name\`, making guidance an explicit selection.

## 3. Implementation

### Scale

| Component | Count | Role |
| --- | --- | --- |
| Event handlers | 8 | Quality gates, context injection, bash guard, lifecycle |
| Custom tools | 3 | Context7 bridge x2, package export verifier |
| Commands | 8 | Linear workflow, testing, fleet ops, Canon audit, pre-commit |
| Prompt templates | 8 | Deploy, audit, review, research, experiment, paper, MCP scaffold |
| Skills | 21 | 3 native + 18 cross-loaded, domain knowledge on demand |
| Theme | 51 colors | Glass Design System alignment |
| Total extension | 1,181 lines | Single coherent extension file |

### Quality Gate Architecture

\`\`\`text
Write/Edit
    |
    |-- tool_result handler
    |     |-- Canon token compliance (6 pattern checks)
    |     |-- Import verification (@create-something/* packages)
    |     |-- Paper structure (SEO, container, classes)
    |     \`-- Experiment structure (SEO, Canon tokens, hex colors)
    |
    \`-- Violations? -> Append to tool result -> Agent self-corrects

Bash execution
    |
    \`-- tool_call handler
          |-- Block legacy loom commands -> redirect to Linear
          \`-- Enforce [CRE-NNN] in commit messages

Agent completion
    |
    \`-- agent_end handler
          |-- TypeScript type check (modified packages)
          |-- ESLint lint check (modified packages)
          |-- Uncommitted changes reminder
          \`-- Issues? -> sendUserMessage(followUp) -> Agent fixes
\`\`\`

## 4. The Recursive Property in Practice

The extension exhibits the Three-Tier Framework's recursive property:

1. \`tool_result\` (Automation) checks Canon compliance (Judgment) and feeds violations back.
2. The agent (Automation) reads the violations and self-corrects (more Automation).
3. \`agent_end\` (Automation) runs typecheck (Database verification) and reports.
4. If issues exist, \`sendUserMessage\` re-enters the agent loop: Automation invoking more Automation with embedded Judgment.

This is the sampling feedback loop described in the framework paper, realized in a development harness.

## 5. The Product Insight

What we built for the development workflow is structurally identical to what we sell as Policy OS:

| Policy OS Deliverable | Development Implementation |
| --- | --- |
| \`mcp_contract.yaml\` | \`.pi/settings.json\` + cross-loaded skills |
| \`agent_contract.yaml\` | Bash guard rules + quality gate event handlers |
| \`outcome_contract.md\` | \`APPEND_SYSTEM.md\` + prompt templates |
| \`golden_tasks.yaml\` | Pre-commit checks + typecheck/lint on completion |
| \`runbook.md\` | Interactive commands (\`/linear\`, \`/fleet\`, \`/deploy\`) |

The harness is the policy. The configuration is the contract. The development workflow is the first client.

## 6. Distribution as Discovery

The Pi package ecosystem enables a new funnel:

\`\`\`text
pi install npm:@create-something/pi-three-tier-framework
    -> Developer learns Database/Automation/Judgment
    -> Classifies their own systems

pi install npm:@create-something/pi-policy-os
    -> Developer runs /policy-check
    -> Sees governance score and gaps
    -> Contacts createsomething.agency
\`\`\`

This mirrors the MCP-First Thesis: the entry point is connectivity, installable agent configuration, not intelligence through a full consulting engagement.

## 7. Conclusion

Policy OS is not a product category. It is a consequence of the Three-Tier Framework applied to any agent-governed workflow. When you configure quality gates, you are building Database checks. When you register custom tools, you are building Automation. When you write domain skills and prompt templates, you are building Judgment artifacts.

The creation moat, understanding what to build and not just how to install it, applies to agent harness configuration just as it applies to MCP server creation. Both require domain expertise combined with protocol knowledge. Both are hard to commoditize.

CREATE SOMETHING builds the connectivity and control layer between tools and AI.`
  },
  {
    slug: "proof-surface",
    title: "The Proof Surface",
    subtitle: "Why agent work needs public receipts, private evidence, and owner authority once it leaves chat",
    description: "Agent work becomes operational only when a buyer, operator, or reviewer can inspect what ran, what waited, what stopped, and what proves the decision. This paper defines the Proof Surface as the business-readable layer that sits above private logs, traces, deploy output, and workflow contracts. It turns evidence into receipts, separates public status from sensitive proof, keeps ownership visible after the agent has acted, and gives teams a practical template for one workflow.",
    category: "Research",
    date: "2026-06-22",
    readingTime: 18,
    difficulty: "intermediate",
    keywords: ["Proof Surface","Receipts","Workflow Trust Layer","Policy OS","Agent Governance","Delivery Records","Operator Surface","Three-Tier Framework"],
    content: `## Executive Thesis

Proof is the product once work leaves chat.

A model response can sound right. A tool call can succeed. A trace can show every step. A deploy can pass. A Linear issue can close. None of those facts, alone, gives a buyer or operator a usable answer to the practical question:

What happened, what changed, who owns the next decision, and what evidence should we trust?

The missing layer is the **Proof Surface**: the business-readable layer that turns agent work into inspectable operating receipts.

The Proof Surface answers four questions:

1. What can run?
2. What must wait?
3. What must stop?
4. What proves the decision?

This is not a replacement for traces, evals, runbooks, or contracts. It is the layer that makes those artifacts legible to the people who have to inherit the workflow.

The practical recommendation is simple: before expanding agent authority, define the proof surface the operator will inspect after the work runs.

## What This Paper Gives You

Use this paper when an AI workflow is already capable enough to act, but not yet legible enough to inherit.

It gives you three practical outputs:

1. A distinction between raw evidence and proof receipts.
2. A public/private evidence boundary for workflow status surfaces.
3. A starter proof template that can be applied to one workflow before autonomy expands.

The target reader is the operator, founder, product lead, client sponsor, or builder who needs to know whether agent work can leave chat without losing accountability.

## Why Proof Needs A Surface

Most AI workflow demos end at the moment the agent responds.

Real operations begin after that moment.

The operator needs to know whether a customer-facing reply was only drafted or actually sent. The founder needs to know whether a production deploy touched the canonical domain or only a preview alias. The client sponsor needs to know which evidence is safe to share and which logs must stay private. The next teammate needs to know why an action stopped instead of pretending to finish.

Without a proof surface, the system creates a familiar failure mode: execution exists, but accountability is scattered.

- The chat transcript has the explanation.
- The CI run has the command output.
- The trace has the runtime steps.
- The issue tracker has the assignment.
- The deploy system has the URL.
- The client page has only a vague status.

Nobody is lying, but nobody can read the work as one operating path.

The Proof Surface brings those fragments into one inspectable object. It does not expose every private detail. It shows enough for a buyer, operator, or reviewer to understand the state of the work without receiving credentials, raw logs, private client data, or implementation noise.

## Proof Is Not The Same As Evidence

Evidence is the underlying material.

Proof is the interpreted receipt.

For agent workflows, evidence can include:

- command output
- test results
- trace IDs
- eval scores
- screenshots
- deploy IDs
- source URLs
- database snapshots
- policy decisions
- approval notes
- blocked-state records

Those artifacts matter, but most of them are not buyer-readable. A trace can prove runtime behavior to an engineer while still failing to explain the workflow to an operator. A deploy ID can prove promotion to a release owner while saying nothing about whether the customer-facing action was allowed. A screenshot can show a page rendered while hiding whether the data behind it was stale.

Proof is the layer that says what the evidence means.

| Evidence | Proof receipt |
| --- | --- |
| A passing validation command | The workflow met its release gate. |
| A trace ID | The run followed the expected path. |
| A blocked-state JSON file | The action stopped for a named reason. |
| A deploy URL | The change is visible on a specific surface. |
| An approval comment | A named owner accepted a risky action. |
| A rollback note | The team knows how to recover if the change fails. |

This distinction keeps teams from oversharing private evidence while still giving stakeholders a trustworthy view of the work.

## The Four Visible States

The Proof Surface makes agent work readable through four states.

| State | Meaning | Receipt |
| --- | --- | --- |
| Run | Bounded work was allowed to proceed. | What action ran, against which object, under which rule. |
| Wait | A named owner must approve before impact. | The approval note, decision owner, and pending action. |
| Stop | The workflow exceeded scope, lacked data, or hit policy. | The reason code and recovery path. |
| Receipt | The result is preserved for review and handoff. | The link, command, trace, note, or delivery record that proves the state. |

These states are intentionally small.

Operators do not need to read an entire policy bundle to understand whether the system acted correctly. They need the operating state first. From there, the deeper evidence can remain attached for reviewers who need it.

The state language also prevents fake autonomy. An agent that stops with a reason is more trustworthy than an agent that guesses to preserve the appearance of completion.

## Public Status, Private Evidence

The proof surface has to separate what is visible from what is sensitive.

This is where many agent systems fail. They either expose too little and become opaque, or expose too much and leak credentials, raw client data, private logs, or internal reasoning that should never become a customer artifact.

A useful proof surface has two layers:

| Layer | Audience | Contents |
| --- | --- | --- |
| Public or client-safe status | Buyer, operator, client sponsor, next teammate | Workflow state, owner decision, safe summary, next action, non-sensitive links. |
| Private evidence packet | Builder, reviewer, release owner, security owner | Commands, trace IDs, raw validation output, secrets-adjacent context, rollback notes, detailed logs. |

The separation is not cosmetic. It preserves ownership.

The buyer should see enough to trust the system. The operator should see enough to act. The builder should preserve enough to debug. Sensitive proof should stay behind the right boundary.

That is the difference between transparency and leakage.

## How This Fits The Existing Stack

The Proof Surface follows the sequence already established by the CREATE SOMETHING research trail.

The **Workflow Trust Layer** names what can run, what waits, and what stops.

The **Policy OS Contract Bundle** defines the portable artifacts that govern capability, behavior, outcomes, regressions, and operations.

The **Eval Evidence Layer** makes traces, evals, approval receipts, and blocked states measurable enough to change release decisions.

The **Proof Surface** makes the result readable to the people who inherit the work.

Those layers should not collapse into one document.

| Layer | Primary question |
| --- | --- |
| Workflow Trust Layer | What is the workflow allowed to do? |
| Policy OS Contract Bundle | Which artifacts govern the workflow? |
| Eval Evidence Layer | Which measurements change release decisions? |
| Proof Surface | What can a human inspect after work runs? |

The proof surface is the user-facing edge of governance. It is where policy, evidence, and handoff become understandable.

## The Proof Path: Connect, Verify, Coordinate, Control

A practical proof surface follows the same path as governed delivery.

### 1. Connect

Name the system, account owner, and authority boundary.

This is where the workflow states what it can read, what it can write, and which system owns the source of truth. A connection without ownership is just latent risk.

The proof receipt should answer:

- Which account or system is involved?
- Who owns access?
- Which authority was granted?
- Which authority was not granted?

### 2. Verify

Check the claim before repeating it.

Verification can be a command, route response, screenshot, trace, eval, or direct source read. The important point is that the agent does not merely narrate confidence. It attaches evidence.

The proof receipt should answer:

- What was checked?
- When was it checked?
- What passed or failed?
- What is still unverified?

### 3. Coordinate

Keep ownership, status, and evidence with the work.

Agent work often spans multiple tools and sessions. Without coordination, the next operator inherits a scattered story. A useful proof surface preserves the handoff as an artifact, not as oral tradition.

The proof receipt should answer:

- Who owns the next decision?
- Which issue, delivery record, or runbook carries the state?
- What is blocked?
- What can continue safely?

### 4. Control

Ship the run, wait, stop, and rollback paths.

Control means the workflow can act inside bounds and stop outside them. It also means a future operator can recover. A proof surface without rollback context is incomplete whenever production, revenue, customer trust, or account authority is involved.

The proof receipt should answer:

- What can run automatically?
- What requires approval?
- What stops with a reason?
- How does the team recover?

## Delivery Records As Proof Surfaces

A delivery record is one of the most useful proof surfaces because it is naturally business-readable.

It can show:

- the workflow model
- the current status
- the owner boundary
- the visible decisions
- the private evidence boundary
- the next action

For a recruiter-gated workflow pilot, the delivery record can show the business model, agent boundary, remaining owner decisions, and client-safe proof without exposing private sourcing data or account credentials.

For a backend handoff, the delivery record can separate account ownership, credentials, app administration, database state, acceptance checks, and transfer options.

The pattern is the same in both cases:

1. Visible status for the client or operator.
2. Private evidence for the builder or release owner.
3. Named authority for the next decision.
4. A receipt trail that survives the handoff.

This is why proof surfaces are not marketing pages. They are operating artifacts with a public-safe face.

## A Worked Example: Support Recovery

Consider an ecommerce support workflow.

A customer writes in because an order has the wrong shipping address. The order is paid, the shipment is not yet fulfilled, and the warehouse cutoff has not passed.

The agent has access to four systems:

- the support case
- the customer record
- the order record
- the warehouse cutoff state

The raw capability looks simple: read the case, inspect the order, draft a reply, write an internal order note, and notify the warehouse.

The proof surface is what makes the workflow safe to inspect.

| Proof field | Support recovery example |
| --- | --- |
| Workflow | Address correction before fulfillment cutoff. |
| Current state | Run. |
| Named owner | Support lead owns exceptions; warehouse owns cutoff. |
| Allowed action | Add an internal order note and draft the customer reply. |
| Approval-needed action | Credit, refund, cancellation, or shipment reroute after cutoff. |
| Blocked action | Any payment change or address rewrite after warehouse cutoff. |
| Evidence summary | Order is paid, unfulfilled, and inside cutoff; address format validated. |
| Private evidence pointer | Case URL, order lookup, warehouse cutoff check, command output, trace ID. |
| Public receipt | "Address correction drafted; warehouse note prepared; no payment action taken." |
| Next action | Support lead reviews the drafted reply or lets the bounded note proceed. |

This example matters because the same agent capability can produce three different proof states.

If the order is unfulfilled and inside cutoff, the workflow can run. If the request includes a goodwill credit, it must wait for a named owner. If the customer asks for a refund above the support lane, it must stop with a reason.

The model may be the same in all three cases. The tools may be the same. The proof surface is what changes the operating state.

## Database, Automation, Judgment

The Proof Surface maps cleanly to the Three-Tier Framework.

### Database: what exists

The Database layer stores the proof material:

- workflow records
- delivery records
- source objects
- account ownership
- trace links
- eval results
- command output
- approval decisions
- blocked-state records
- rollback notes

The proof surface should not pretend to be the source of truth for everything. It should point to the source of truth and summarize the current state safely.

### Automation: what happened

The Automation layer produces the receipts:

- route checks
- validation commands
- deploys
- agent runs
- MCP tool calls
- CI checks
- evidence packaging
- handoff updates

Automation makes work fast. The proof surface makes automation inspectable.

### Judgment: what should happen

The Judgment layer interprets the receipt:

- Is this safe to publish?
- Does this need owner approval?
- Should this stop?
- Is the evidence sufficient?
- Does the workflow graduate, narrow scope, or roll back?

The proof surface carries this judgment back to the user in a form they can act on.

## What A Good Proof Surface Includes

A useful proof surface is compact, but it is not vague.

It should include:

- **Workflow name**: the business path, not the tool name.
- **Current state**: run, wait, stop, or receipt.
- **Named owner**: the person or role that owns approval.
- **Allowed action**: what the system may do without review.
- **Blocked action**: what the system refused or deferred.
- **Evidence summary**: what was checked and what passed.
- **Private evidence pointer**: where detailed proof lives.
- **Next action**: what should happen now.
- **Rollback or recovery note**: what to do if the path fails.

It should avoid:

- raw secrets
- full logs with private data
- unsupported status claims
- vague "completed" labels
- hidden approval assumptions
- unlinked evidence
- screenshots that are treated as the only proof

The test is simple: a new operator should be able to inspect the surface and understand what can happen next without asking the original agent to reconstruct the story.

## A Starter Proof Surface Template

A first proof surface can be written as a small operating record.

\`\`\`yaml
workflow: support-recovery.address-correction
owner:
  approval: support_lead
  source_account: ecommerce_ops
state: run
boundary:
  can_run:
    - read_support_case
    - read_order
    - read_warehouse_cutoff
    - write_internal_order_note
    - draft_customer_reply
  must_wait:
    - issue_credit
    - post_customer_reply_without_template_match
    - reroute_after_cutoff
  must_stop:
    - refund_above_support_lane
    - missing_order_record
    - payment_state_unclear
evidence:
  public_summary: "Order is paid, unfulfilled, and inside warehouse cutoff."
  private_packet:
    - case_url
    - order_lookup_result
    - warehouse_cutoff_check
    - trace_id
receipt:
  public: "Address correction prepared; no payment action taken."
  private: "validation-output-2026-06-22.md"
next_decision:
  owner: support_lead
  action: review_customer_reply
rollback:
  note: "Remove internal note and escalate to warehouse owner if cutoff state changes."
\`\`\`

This record is deliberately small. It is not trying to replace the contract bundle, runbook, trace, or eval ledger. It is the visible operating object that tells the next human how to read the work.

## Common Failure Modes

### Status Without Receipts

The page says "done," but no evidence is attached.

This is the most common failure. It creates confidence without transferability. A proof surface should avoid status claims that cannot be followed to evidence.

### Evidence Without Interpretation

The team has logs, traces, screenshots, and deploy IDs, but no one has translated them into an operating conclusion.

This creates the opposite problem: too much evidence, not enough proof. The proof surface must say what the evidence means.

### Public Proof With Private Leakage

The system exposes raw logs, secret-adjacent output, private customer data, or credential context because it treats transparency as unrestricted visibility.

The fix is to split public-safe status from private evidence packets.

### Approval Without An Owner

The workflow says an action needs approval, but it does not name who can approve it.

That is not a wait state. It is an abandoned state. A useful proof surface names the owner or stops with a reason.

### Agent Continuity Without Handoff

The agent can continue in its own context, but the human team cannot inherit the work.

Long-running agent systems need ownership, checkpoints, and evidence that survive tool boundaries. Otherwise continuity exists only inside the model session.

## A One-Workflow Starting Point

Teams do not need to build a full proof platform before using agents.

Start with one workflow your team already protects by hand.

Choose a workflow with:

- a visible owner
- repeated handoffs
- real risk when it fails
- at least one system connection
- at least one approval boundary
- evidence that can be checked

Then create a first proof surface with five sections:

1. **Workflow**: name the path and owner.
2. **Boundary**: list what can run, wait, and stop.
3. **Evidence**: summarize what was checked.
4. **Receipt**: link the delivery record, issue, trace, or validation output.
5. **Next decision**: name the owner and action.

If this feels too heavy, the workflow probably is not ready for more autonomy. If it feels clarifying, the proof surface is doing its job.

## Conclusion

Agent systems need more than capability, contracts, and metrics.

They need a surface where humans can inspect the work.

The Proof Surface is that layer. It turns private evidence into public-safe receipts. It keeps owners visible. It explains why work ran, waited, or stopped. It lets delivery records, runbooks, evals, traces, and release evidence become one operating story.

The result is not just a better report.

It is a safer delegation path: work can leave chat without leaving accountability behind.`
  },
  {
    slug: "recursive-language-models",
    title: "Recursive Language Models: Context as Environment Variable",
    subtitle: "Implementing MIT CSAIL's RLM pattern for processing arbitrarily large codebases through programmatic context navigation",
    description: "This paper documents the implementation and empirical validation of Recursive Language Models (RLMs) based on MIT CSAIL's research (arxiv:2512.24601). We implemented a task-agnostic inference paradigm that treats context as an external environment variable rather than prompt content, enabling processing of contexts far beyond model limits. Through production deployment, we identified critical implementation bugs, validated the core RLM pattern against the original alexzhang13/rlm repository, and demonstrated practical application for codebase analysis. The RLM successfully analyzed 157K characters across 50 files, identifying 45 catch blocks, 61 console calls, and 51 validation patterns as DRY violations—leading to the creation of four shared utilities that reduced duplication across the monorepo.",
    category: "Research",
    date: "2026-01-19",
    readingTime: 15,
    difficulty: "advanced",
    keywords: ["RLM","recursive language models","long context","code analysis","DRY"],
    content: `## Abstract

This paper documents the implementation and empirical validation of Recursive Language Models (RLMs) based on MIT CSAIL's research (arxiv:2512.24601). We implemented a task-agnostic inference paradigm that treats context as an external environment variable rather than prompt content, enabling processing of contexts far beyond model limits. Through production deployment, we identified critical implementation bugs, validated the core RLM pattern against the original alexzhang13/rlm repository, and demonstrated practical application for codebase analysis. The RLM successfully analyzed 157K characters across 50 files, identifying 45 catch blocks, 61 console calls, and 51 validation patterns as DRY violations—leading to the creation of four shared utilities that reduced duplication across the monorepo.


## 1. Introduction

Large Language Models face a fundamental constraint: context windows. Even "long-context" models (1M+ tokens) degrade on tasks requiring dense access to large inputs. The MIT CSAIL paper "Recursive Language Models" (arxiv:2512.24601) proposes a paradigm shift: **treat context as an external environment variable, not prompt content**.

The key insight: instead of injecting massive context into the prompt, store it as a variable in a REPL environment. The model writes code to navigate the context, using sub-LM calls for semantic understanding. This enables processing 10M+ tokens with comparable cost to standard inference.

### Research Questions

1. Can we correctly implement the RLM pattern based on the MIT CSAIL paper?
2. What implementation bugs emerge in production use?
3. Does RLM provide practical value for codebase analysis at CREATE SOMETHING?


## 2. Architecture

### 2.1 Core Components

Our implementation follows the original RLM architecture:

\`\`\`
┌─────────────────────────────────────────────┐
│             RLMSession                       │
│  - Manages the iteration loop               │
│  - Routes to root/sub models                │
│  - Tracks costs                             │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│           RLMEnvironment                     │
│  - Sandboxed Python REPL                    │
│  - context = <your massive input>           │
│  - llm_query(prompt) → sub-LM call          │
│  - results = {} for findings                │
└─────────────────────────────────────────────┘
\`\`\`

**RLMEnvironment**: Sandboxed Python REPL where context is stored as a variable. Provides:
- \`context\` - The input data (can be arbitrarily large)
- \`llm_query(prompt)\` - Sub-LM calls for semantic understanding
- \`results\` - Dictionary for storing intermediate findings
- \`chunk_text()\`, \`chunk_lines()\` - Chunking helpers
- Standard library: \`re\`, \`json\`, \`print()\`

**RLMSession**: Orchestrates the model ↔ REPL loop:
1. Send system prompt + query to root model
2. Extract \`\\\`\\\`\\\`repl\` code blocks from response
3. Execute code in environment
4. Feed output back to model
5. Repeat until \`FINAL()\` or max iterations

### 2.2 Model Routing

Following the paper's recommendations, we use two models for cost efficiency:

| Role | Model | Cost | Purpose |
|------|-------|------|---------|
| Root | Claude Sonnet | ~\$0.01/call | Planning, synthesis, final answer |
| Sub-calls | Claude Haiku | ~\$0.001/call | Chunk understanding |

The paper shows Haiku achieves 90% of Sonnet's performance on bounded semantic tasks while costing 10x less.

### 2.3 Termination Markers

The model signals completion via:
- \`FINAL(your answer here)\` - Direct answer
- \`FINAL_VAR(results)\` - Return a variable from the environment


## 3. Implementation Review

We reviewed our implementation against the original alexzhang13/rlm repository, identifying several critical issues.

### 3.1 Bug: Undefined Client Variable

**File**: \`modal_rlm.py:401\`

\`\`\`python
# Bug: 'client' was never defined, only 'anthropic_client'
response = client.messages.create(...)

# Fix:
response = anthropic_client.messages.create(...)
\`\`\`

This would have crashed at runtime in production.

### 3.2 Bug: FINAL() Regex Limitation

**Original pattern**:
\`\`\`python
final_match = re.search(r"FINAL\\(([^)]+)\\)", response)
\`\`\`

**Problem**: \`[^)]+\` stops at the first \`)\`, so:
- \`FINAL(Answer is (a) and (b))\` → captures only \`"Answer is (a"\`

**Fix**:
\`\`\`python
# Use greedy match with end-of-string anchor
final_match = re.search(r"(?:^|\\n)FINAL\\((.+)\\)\\s*\$", response)
\`\`\`

### 3.3 Bug: FINAL Detection Before Code Execution

**Original flow**:
1. Get model response
2. Check for FINAL ← **Problem: FINAL matched before code runs**
3. Execute code blocks
4. Feed results back

**Problem**: Model outputs code blocks AND \`FINAL_VAR(results)\` together, expecting code to populate \`results\` first. But we checked for FINAL before executing code, returning empty results.

**Fix**: Execute code blocks first, then check for FINAL:
\`\`\`python
# Execute code blocks first
code_blocks = re.findall(r"\`\`\`repl\\n(.*?)\`\`\`", response, re.DOTALL)
for code in code_blocks:
    exec_result = env.execute(code.strip())
    # ... capture output

# NOW check for FINAL (results are populated)
final_match = re.search(r"(?:^|\\n)FINAL\\((.+)\\)\\s*\$", response)
\`\`\`

### 3.4 Bug: MULTILINE Flag Causing Early Match

**Original**:
\`\`\`python
final_match = re.search(r"FINAL\\((.+)\\)\\s*\$", response, re.MULTILINE)
\`\`\`

**Problem**: \`re.MULTILINE\` makes \`\$\` match at end of ANY line, not just end of string. FINAL mentioned mid-response (in instructions) matched prematurely.

**Fix**: Remove MULTILINE, use start-of-line anchor:
\`\`\`python
final_match = re.search(r"(?:^|\\n)FINAL\\((.+)\\)\\s*\$", response)
\`\`\`

### 3.5 Enhancement: Structured Messages

**Original**: Flattened conversation to text blob:
\`\`\`python
messages_text = "\\n\\n".join(f"User: {m['content']}" for m in conversation)
\`\`\`

**Fix**: Pass structured messages to API:
\`\`\`python
config = ProviderConfig(
    messages=conversation,  # List of {"role": ..., "content": ...}
    ...
)
\`\`\`

This enables proper multi-turn conversation handling by the Claude API.


## 4. Empirical Validation

### 4.1 Test Case: DRY Violation Analysis

We ran the RLM against our monorepo to find DRY (Don't Repeat Yourself) violations.

**Configuration**:
- Context: 157,399 characters (50 files)
- Root model: Claude Sonnet
- Max iterations: 12
- Max sub-calls: 20

**Query**: Find duplicate patterns across:
1. Catch blocks with similar error handling
2. Direct IDENTITY_API fetches (should use client)
3. Direct \`.length\` checks (should use isEmpty/hasItems)
4. Console calls (should use structured logger)

### 4.2 Results

| Category | Count | Status |
|----------|-------|--------|
| catch_blocks | 38 | High - needs catchApiError |
| identity_api_fetches | 4 | Good - mostly migrated |
| length_checks | 13 | Medium - use isEmpty() |
| console_calls | 61 | High - use createLogger |
| validation_patterns | 51 | High - use validateStringField |

**Cost**: \$0.0316 for complete analysis
**Iterations**: 1 (model completed in single pass)
**Duration**: ~83 seconds

### 4.3 Artifacts Created

Based on RLM findings, we created four shared utilities:

**1. Identity Client** (\`packages/components/src/lib/api/identity-client.ts\`)
\`\`\`typescript
// Before: 20+ files with duplicate fetch patterns
const response = await fetch(\`\${IDENTITY_API}/v1/auth/login\`, {...});

// After: Typed, centralized client
const result = await identityClient.login({ email, password });
\`\`\`

**2. API Error Handling** (\`packages/components/src/lib/utils/api-error.ts\`)
\`\`\`typescript
// Before: Duplicate try/catch in every endpoint
try { ... } catch (err) { console.error(...); return json({...}); }

// After: Wrapped handler
export const POST = catchApiError('ProfileAPI', async (event) => { ... });
\`\`\`

**3. Validation Helpers** (\`packages/components/src/lib/utils/validation.ts\`)
\`\`\`typescript
// Before: Repeated patterns
if (records.length === 0) { ... }
if (!name || typeof name !== 'string' || name.trim().length === 0) { ... }

// After: Type-safe helpers
if (isEmpty(records)) { ... }
const result = validateStringField(body.name, 'name', { required: true });
\`\`\`

**4. Context Logger** (\`packages/components/src/lib/utils/logger.ts\`)
\`\`\`typescript
// Before: Console calls without correlation
console.log('[ProfileAPI] Fetching...', email);

// After: Structured logging
const logger = createLogger('ProfileAPI');
logger.info('Fetching', { email, correlationId });
\`\`\`


## 5. Discussion

### 5.1 RLM Effectiveness

The RLM pattern proved effective for codebase analysis:

**Strengths**:
- Successfully processed 157K characters (far beyond prompt limits)
- Identified actionable patterns through programmatic filtering
- Cost-effective: \$0.03 for comprehensive analysis
- Single iteration completion demonstrates good prompt engineering

**Limitations**:
- No sub-LM calls used in this task (regex sufficient)
- Model occasionally includes FINAL in first response without exploration
- Requires careful prompt engineering to encourage REPL usage

### 5.2 Implementation Lessons

1. **Execute Before Evaluate**: Code blocks must run before checking for FINAL, as models often include both in a single response.

2. **Regex Precision**: MULTILINE flags and greedy matching require careful consideration. Test with edge cases like nested parentheses.

3. **Structured Messages**: APIs optimize for structured conversation; text flattening loses context and attribution.

4. **Defensive Testing**: Add regression tests for termination marker parsing.

### 5.3 Comparison to Original

Our implementation correctly captures the core RLM pattern:

| Feature | Original (alexzhang13/rlm) | Our Implementation |
|---------|---------------------------|-------------------|
| Context as variable | ✓ | ✓ |
| REPL execution loop | ✓ | ✓ |
| llm_query() sub-calls | ✓ | ✓ |
| FINAL/FINAL_VAR markers | ✓ | ✓ (fixed regex) |
| Cost tracking | ✓ | ✓ |
| Docker sandbox | ✓ | ✓ (Modal) |
| Trajectory logging | ✓ | Partial |

**Missing features**:
- Prime Intellect sandbox support
- Full trajectory visualization
- Multiple backend support (we use Claude only)


## 6. Recommendations

### 6.1 For RLM Implementation

1. **Test FINAL parsing extensively** - Include nested parentheses, mid-response mentions, and edge cases in test suite.

2. **Execute-then-evaluate flow** - Always run code blocks before checking termination markers.

3. **Avoid MULTILINE regex** - Unless specifically needed, \`\$\` should match end of string, not end of line.

4. **Use structured messages** - Pass proper conversation format to LLM APIs.

### 6.2 For Codebase Analysis

1. **Start with regex** - Most DRY violations are syntactic patterns; semantic analysis (sub-LM) needed only for complex understanding.

2. **Chunk by file** - Include file boundaries in context for clear attribution.

3. **Iterate on prompts** - Explicit code examples in prompts improve REPL usage.

### 6.3 Future Work

- Add trajectory visualization (port from alexzhang13/rlm visualizer)
- Implement parallel sub-call execution for chunk processing
- Add Gemini Pro support for cheaper sub-calls
- Automate DRY analysis in CI pipeline


## 7. Conclusion

We successfully implemented and validated the Recursive Language Models pattern from MIT CSAIL's research. The implementation review against alexzhang13/rlm revealed four critical bugs that we fixed:

1. Undefined client variable (crash at runtime)
2. FINAL regex failing on nested parentheses
3. FINAL detection before code execution (empty results)
4. MULTILINE flag causing premature termination

The RLM demonstrated practical value by analyzing 157K characters of codebase, identifying 165+ DRY violations, and enabling creation of four shared utilities that measurably reduce code duplication.

**Key Insight**: The RLM pattern shifts the bottleneck from context limits to task definition quality. Well-structured queries with clear REPL examples enable effective long-context analysis at low cost.


## 8. How to Apply This

### Using the RLM

\`\`\`python
from create_something_agents.rlm import RLMSession, RLMConfig
from create_something_agents.providers.claude import ClaudeProvider

# Your large context
corpus = open("massive_corpus.txt").read()

# Create session
session = RLMSession(
    context=corpus,
    provider=ClaudeProvider(),
    config=RLMConfig(root_model="sonnet", sub_model="haiku")
)

# Run query
result = await session.run("What patterns emerge across all documents?")
print(f"Answer: {result.answer}")
print(f"Cost: \${result.cost_usd:.4f}")
\`\`\`

### Using the DRY Utilities

\`\`\`typescript
// Identity API calls
import { identityClient } from '@create-something/canon/api';
const result = await identityClient.login({ email, password });

// API error handling
import { catchApiError, apiError } from '@create-something/canon/utils';
export const POST = catchApiError('MyAPI', async (event) => { ... });

// Validation
import { isEmpty, validateStringField } from '@create-something/canon/utils';
if (isEmpty(records)) return apiError('Not found', 404);

// Logging
import { createLogger } from '@create-something/canon/utils';
const logger = createLogger('MyService');
logger.info('Processing', { id, correlationId });
\`\`\`


## References

- Zhang, A. L., Kraska, T., & Khattab, O. (2025). Recursive Language Models. arXiv:2512.24601
- alexzhang13/rlm - Official RLM implementation: https://github.com/alexzhang13/rlm
- CREATE SOMETHING Agent SDK: packages/agent-sdk/src/create_something_agents/rlm/
- Modal RLM Deployment: packages/agent-sdk/modal_rlm.py


## Appendix A: RLM Module Structure

\`\`\`
packages/agent-sdk/src/create_something_agents/rlm/
├── __init__.py      # Public exports
├── environment.py   # RLMEnvironment (sandboxed REPL)
├── session.py       # RLMSession (orchestration loop)
└── README.md        # Module documentation
\`\`\`


## Appendix B: Created Utilities

| File | Purpose | Lines |
|------|---------|-------|
| \`components/src/lib/api/identity-client.ts\` | Typed Identity API wrapper | ~250 |
| \`components/src/lib/utils/api-error.ts\` | API error handling utilities | ~200 |
| \`components/src/lib/utils/validation.ts\` | Validation helpers (extended) | +150 |
| \`components/src/lib/utils/logger.ts\` | Context-aware structured logging | ~150 |`
  },
  {
    slug: "spec-driven-development",
    title: "Spec-Driven Development",
    subtitle: "A Meta-Experiment in Agent Orchestration: Building NBA Live Analytics as Methodology Validation",
    description: "This paper documents a meta-experiment testing whetherstructured specificationscan effectively guide agent-based development. The vehicle is an NBA Live Analytics Dashboard with three analytical views—Duo Synergy, Defensive Impact, and Shot Network. The hypothesis: spec-driven development produces both working software and methodology documentation as equally important artifacts. Through three phases of implementation (Infrastructure, Pages, Polish), we observe that explicit depe\"",
    category: "Methodology",
    date: "2025-01-08",
    readingTime: 15,
    difficulty: "advanced",
    keywords: [],
    content: `## Abstract
This paper documents a meta-experiment testing whetherstructured specificationscan effectively guide agent-based development. The vehicle is an NBA Live Analytics Dashboard
				with three analytical views—Duo Synergy, Defensive Impact, and Shot Network. The hypothesis:
				spec-driven development produces both working software and methodology documentation as
				equally important artifacts. Through three phases of implementation (Infrastructure, Pages, Polish),
				we observe that explicit dependency graphs, complexity annotations, and acceptance criteria
				enable predictable agent execution while surfacing methodology insights that would remain
				hidden in ad-hoc development.



## 1. The Hypothesis
Central Question:Can spec-driven development be
					managed by agents using harness andBeadsabstractions, producing both working software
					and methodology documentation?
Traditional development treats documentation as an afterthought—something produced
					after the code works. Spec-driven development inverts this: the specificationprecedesimplementation, and the implementationvalidatesthe specification.
The Meta-Experiment:The dashboard itself is the artifact;
						this methodology paper is the meta-artifact. Both are equally important outputs.
This follows thehermeneutic circle(a philosophical method where understanding deepens through iterative interpretation—you understand parts through the whole, and the whole through its parts): pre-understanding (the spec) meets emergent
					understanding (implementation), and the gap between them reveals methodology insights.


## 2. Architecture
The NBA Live Analytics Dashboard demonstrates a complete vertical slice:
					data acquisition, processing, visualization, and documentation.
// System Architecture
Each architectural decision was documented in the spec before implementation:


## 3. Spec Structure
The specification uses a YAML format optimized for agent consumption.
					Key elements that enable predictable execution:
- • Explicitdepends_onarrays
- • Prevents premature starts
- • Enables parallel execution
- • Validates topological order
- •trivial: Haiku model
- •simple: Sonnet model
- •standard: Sonnet model
- •complex: Opus model
- • Observable, testable conditions
- • Verify commands where applicable
- • No ambiguous language
- • Binary pass/fail
- • Expected files listed per feature
- • Enables merge conflict detection
- • Validates isolation
- • Supports parallel convoy work


## 4. Phase 1: Infrastructure
Execution:Sequential (dependencies required)
Features: Types, D1 Schema, NBA Proxy Worker, API Client, Calculations
Infrastructure must be sequential—the API client cannot exist without types,
					calculations cannot exist without the D1 schema. The spec enforces this:
# Dependency chain
The NBA API's field naming diverged from our initial assumptions.personIdbecameid,assistPersonIdbecameassistPlayerId.
					This gap between spec and reality surfaced during implementation, validating the
					hermeneutic circle principle: understanding emerges through practice.
- types.ts— Player, Game, Shot, PlayByPlayAction interfaces
- 0013_nba_baselines.sql— D1 migration for player metrics
- nba-proxy/— Cloudflare Worker with KV caching
- api.ts— Type-safe fetch functions with Result pattern
- calculations.ts— PPP, defensive impact, shot zone analysis


## 5. Phase 2: Pages
Execution:Parallelconvoy(after Infrastructure)
Features: Landing, Duo Synergy, Defensive Impact, Shot Network
Once infrastructure exists, pages can be built in parallel. The spec identifies
					file isolation—each page touches distinct routes and components:
All visualizations follow Edward Tufte's principles—maximizing data-ink ratio,
					avoiding chartjunk, using direct labeling. The Shot Network component demonstrates this:
- Node sizeencodes shot creation + attempts (proportional ink)
- Edge thicknessencodes assist frequency
- Direct labelson nodes (no legend hover)
- Minimal chrome—no gridlines, no decorative elements


## 6. Phase 3: Polish
Execution:Sequential (after Pages)
Features: Experiment Registration, Methodology Documentation
The final phase integrates the work into the larger system:
The experiment tests specific Rams and Heidegger principles:
- Experiment Registration:Entry infileBasedExperiments.tswith principle mappings
- Methodology Documentation:This paper—the meta-artifact that
						validates the spec-driven approach
- •Principle 2:Useful — delivers analytical value
- •Principle 4:Understandable — clear methodology
- •Principle 8:Thorough — complete coverage
- •Zuhandenheit:Infrastructure disappears
- •Hermeneutic Circle:Spec ↔ Implementation
- •Dwelling:Analytics enable understanding


## 7. Observations
These gaps validate the hermeneutic principle: the spec is pre-understanding;
					implementation reveals truth. The value isn't in predicting everything—it's in
					making the gaps visible.
- Dependency graphs prevent premature execution.The API client couldn't start until types existed. This eliminated a class
						of errors where agents guess at interfaces.
- Complexity annotations guide model selection.The Shot Network (D3 force-directed) was correctly identified as complex,
						receiving more thorough treatment.
- Acceptance criteria enable verification."Nodes represent players with shots or assists" is testable;
						"visualization should be nice" is not.
- File tracking prevents conflicts.Parallel convoy work on isolated routes succeeded without merge conflicts.
- API field naming divergence.The NBA API usespersonIdin some contexts andplayerIdin others. The spec assumed consistency.
- D3 integration complexity.Svelte 5 runes (\$props()) interact differently
						with D3's mutation-based model than Svelte 4 reactivity.
- Shot type enumeration.The spec assumed2pt/3ptaction types; reality usesshotwithshotTypeproperty.


## 8. Spec-Driven vs Ad-Hoc Development
Key insight:The upfront cost of spec creation is offset by
					reduced rework and automatic methodology capture. For complex features,
					spec-driven development pays for itself.


## 9. How to Apply This
This section translates the methodology into actionable steps. Whether you're building
					a dashboard, API, or full-stack feature, spec-driven development follows the same process.
Let's say you're adding a shopping cart to an existing e-commerce site:
Execution strategy:
Use this approach when:
Don't use for:
The upfront cost of spec creation pays off through reduced rework, automatic issue
					creation, and methodology documentation. For complex features, spec-driven development
					produces both working code and lasting understanding.
- Phase 1 (Sequential):Cart types → Cart API
- Phase 2 (Parallel):Cart UI and Checkout flow can run simultaneously—isolated files
- Validation:Each feature has testable acceptance criteria
- Complexity:Checkout marked complex for Opus model (Stripe integration, email)
- Multi-file features:3+ files that need coordination
- Clear dependencies:Infrastructure → Features → Polish structure exists
- Agent execution:Work will be done by AI agents (harness, Claude Code)
- Methodology capture:You want documentation as a first-class artifact
- Parallel work:Features can be built simultaneously by different agents
- Quick fixes or single-file changes
- Exploratory prototyping (unknown requirements)
- Hotfixes or emergency patches
- Refactoring where behavior doesn't change


## 10. Conclusion
This meta-experiment validates the hypothesis: spec-driven development produces
					both working software and methodology documentation. The NBA Live Analytics
					Dashboard demonstrates:
The gaps between spec and implementation—field naming, D3 integration,
					enumeration values—are not failures. They are the hermeneutic circle in action:
					pre-understanding meeting reality, with the gap itself producing insight.
The Spec-Driven Principle
- Three analytical views with Tufte-compliant visualizations
- Complete infrastructure (Worker, D1, KV caching)
- Zero TypeScript errors at completion
- Methodology documentation as a first-class artifact`
  },
  {
    slug: "subtractive-form-design",
    title: "Subtractive Form Design",
    subtitle: "When Absence Is Clearer Than Instruction—a case study in hermeneutic form architecture",
    description: "This paper documents the application of Heidegger's system-levelhermeneutic question(a method of interpretation that asks whether each part serves the understanding of the whole, not just whether it's technically correct)—\"Does this serve the whole?\"—to form field design. Through a case study of Webflow's app submission form, we demonstrate that form fields which don't apply to certain contexts create systemic disconnection: developers enter incorrect values, reviewers manually clear the\"",
    category: "Case Study",
    date: "2025-01-08",
    readingTime: 8,
    difficulty: "intermediate",
    keywords: [],
    content: `## Abstract
This paper documents the application of Heidegger's system-levelhermeneutic question(a method of interpretation that asks whether each part serves the understanding of the whole, not just whether it's technically correct)—"Does this serve the whole?"—to
				form field design. Through a case study of Webflow's app submission form, we demonstrate that form fields which don't apply
				to certain contexts create systemic disconnection: developers enter incorrect values, reviewers manually clear them, and
				submissions are delayed. The solution is subtractive: hide fields that don't apply rather than instructing users to leave
				them blank. This reveals a general principle:absence is clearer than instruction.



## I. The Problem: A Field That Shouldn't Be Filled
Webflow's app marketplace accepts three types of applications:
The submission form included an "App Install URL" field with this description:
"The OAuth Authorization URL used to install the app in Webflow.
						Required if you selected 'Data Client' or 'Both' in the App capabilities.Leave blank for Designer Extensions."
Despite this instruction, developers submitting Designer Extensions consistently entered incorrect URLs:
The review team (specifically Pablo) had to manually clear these fields before processing submissions,
					or request changes and reset expectations—delaying the review cycle.
- Data Client v2: API-based apps requiring OAuth for installation
- Designer Extension: Extensions running inside the Webflow Designer
- Hybrid: Apps combining both capabilities
- Theirwebflow-ext.comextension link
- Their marketing website URL
- Other non-OAuth URLs


## II. The Hermeneutic Question
Applying Heidegger's system-level question from the Subtractive Triad:
"Does this field serve the whole?"
Answer: No.The Install URL field for Designer Extensions created disconnection at every level:


## III. Why "Leave Blank" Fails
The instruction to "leave blank for Designer Extensions" failed for predictable reasons:
The fundamental issue:a visible field implies it should be filled. Documentation cannot overcome
					this affordance. Users will fill visible fields.


## IV. The Subtractive Solution
Rather than improving the instructions, we removed the field:
Field visible, instruction ignored
Nothing to fill = nothing to fill incorrectly
The form now conditionally renders the Install URL field based on app capabilities:
Additionally, when switching to Designer Extension, any previously entered URL is cleared:


## V. The General Principle
Absence is clearer than instruction.
This principle extends beyond form design:
In each case, the subtractive solution—removing what doesn't apply—creates clarity that documentation
					cannot achieve. The hermeneutic question"Does this serve the whole?"becomes actionable:
					if something doesn't serve the whole, remove it.
- UI components: Hide inapplicable options rather than disabling them with tooltips
- API design: Omit fields from responses rather than returning null with documentation
- Documentation: Remove outdated sections rather than marking them deprecated
- Codebase: Delete unused code rather than commenting it out "for reference"


## VI. Results
The change eliminates an entire category of submission errors by making incorrect input impossible
					rather than discouraged.


## VII. How to Apply This
To apply the "absence is clearer than instruction" principle to your own interfaces:
Let's apply this to a checkout form that handles both digital and physical products:
Notice: The form adapts to context. When buying digital products, shipping fieldsdon't exist. No instruction can achieve this clarity—only absence can.
Use conditional rendering (hide inapplicable fields) when:
Keep fields visible (but maybe disabled) when:
The principle isdisconnection detection. When a field doesn't serve
					the whole in its current context, hiding it reconnects the form to the user's mental
					model. Absence becomes the clearest instruction.
- Clear context switching: User selects between mutually exclusive options (product type, account type, app capability)
- Field meaninglessness: In some contexts, the field literally has no valid value (OAuth URL for non-OAuth apps)
- Recurring confusion: Users consistently fill fields incorrectly despite instructions
- Manual cleanup required: Your team has to clear incorrect values after submission
- Future applicability: Field will become relevant later in the flow (locked until previous step completes)
- Awareness matters: Users benefit from knowing the field exists even if they can't fill it yet
- Optional but relevant: Field applies but isn't required (legitimately optional)
- Progressive disclosure: Showing structure of upcoming steps


## VIII. Conclusion
This case study demonstrates the Subtractive Triad's third level—Heidegger's hermeneutic question—applied
					to form design. When a field doesn't serve the whole system, removing it reconnects stakeholders more
					effectively than any amount of documentation.
The fix was minimal: conditional rendering based on app type. But the principle is general:if something doesn't apply, don't show it. Absence communicates inapplicability
					more clearly than instruction ever could.
"Does this serve the whole?"If not, remove it.
— The Subtractive Triad, Level 3`
  },
  {
    slug: "subtractive-studio",
    title: "The Subtractive Studio",
    subtitle: "Philosophy as Infrastructure—most agencies add, CREATE SOMETHING removes what obscures",
    description: "The digital services industry operates on an additive assumption: more features, more services, more complexity equals more value. This paper proposes an alternative grounded inphenomenology(the philosophical study of structures of experience and consciousness—how things show themselves to us through lived experience) and design philosophy. CREATE SOMETHING is asubtractive studio—an organization whose primary discipline is the removal of what obscures. We articulate the Subtractive T\"",
    category: "Research",
    date: "2025-01-08",
    readingTime: 10,
    difficulty: "15 min read",
    keywords: [],
    content: `## Abstract
The digital services industry operates on an additive assumption: more features, more
				services, more complexity equals more value. This paper proposes an alternative grounded inphenomenology(the philosophical study of structures of experience and consciousness—how things show themselves to us through lived experience) and design philosophy. CREATE SOMETHING is asubtractive studio—an
				organization whose primary discipline is the removal of what obscures. We articulate the
				Subtractive Triad (DRY, Rams, Heidegger) as operational philosophy, demonstrate how
				philosophy functions as infrastructure rather than marketing, and establish the hermeneutic
				circle as organizational architecture. The thesis:position emerges from practice, not positioning statements.



## I. The Problem with "More"
Consider the standard agency pitch: "We offer end-to-end solutions across web development,
					mobile applications, branding, content strategy, SEO optimization, social media
					management, data analytics, and AI integration." The implicit promise: we do everything,
					so you need only us.
But what does this comprehensiveness actually deliver?
Each additional service creates coordination overhead. The web team must sync with the
					mobile team must sync with the content team must sync with the analytics team. Coherence
					suffers as each vertical optimizes locally. The client receives a collection of
					deliverables rather than an integrated system.
Heidegger's concept ofGestell(enframing) describes technology's tendency to
					reveal everything as standing-reserve—resources to be optimized. The additive agency
					embodies Gestell: every client problem becomes an opportunity for service expansion.
					Solutions multiply because multiplication serves the agency, not the client.
The question is not whether to use technology, but whether our systems enable dwelling or
					merely accelerate consumption. Most agencies choose acceleration. They are structured to
					add.
- - "What else can we offer?"
- - Scope expansion as value demonstration
- - Complexity as capability signifier
- - Client dependency as retention strategy
- - "What can we remove?"
- - Scope reduction as clarity creation
- - Simplicity as mastery signifier
- - Client autonomy as success metric


## II. The Subtractive Triad
CREATE SOMETHING operates on a meta-principle:Creation is the discipline of removing what obscures. This principle applies at three levels, forming the Subtractive Triad:
"Don't Repeat Yourself" is not merely a coding principle. It's anontological(concerning the fundamental nature of being and existence) stance:
					duplication is disconnection. When the same logic exists in two places, they will
					inevitably drift apart. The system loses coherence.
Applied to agency work: each client engagement should contribute to shared understanding.
					Patterns discovered in one project inform the next. The studio accumulates wisdom, not
					just deliverables.
Dieter Rams'Weniger, aber besser(Less, but better) demands that every element
					justify its existence. This is not minimalism as aesthetic—it's minimalism as ethics.
					Adding without justification is a form of harm.
Applied to agency work: every feature, every page, every interaction must earn its place. The question is not "what can we add?" but "what can we remove without loss of function?"
The hermeneutic question—"Does this serve the whole?"—operates at the system level. Parts
					gain meaning through the whole; the whole is constituted by its parts. When a component
					doesn't serve the system, it creates disconnection.
Applied to agency work: every deliverable must connect to the client's broader mission.
					Isolated excellence is failure if it doesn't integrate.
The Triad is coherent because it's one principle—subtractive revelation—applied at three scales.


## III. Philosophy as Infrastructure
Most studios treat philosophy as marketing. "Our values" appear on the about page,
					disconnected from practice. CREATE SOMETHING inverts this: philosophy is infrastructure.
					It determines architecture, tooling, and workflow.
The CREATE SOMETHING ecosystem includes a dedicated property—createsomething.ltd—that
					hosts the philosophical Canon. This is not a static document. It's a versioned,
					deployable specification:
When a developer writes code, the Canon is not a document they consult—it's a system that
					shapes their options. The infrastructure embodies the philosophy.
CREATE SOMETHING maintains active research independent of client work. Papers like this
					one exist not to attract clients but to clarify thinking. The research property
					(createsomething.io) publishes formal analysis of AI development, phenomenology, and
					design philosophy.
This independence matters. Research that exists only to justify services is captured research. It will bend toward what sells rather than what's true. By maintaining research as practice, we ensure ideas remain accountable to reality, not revenue.
CREATE SOMETHING's development workflow is AI-native. Claude Code operates as a
					collaborator, not a tool. The CLAUDE.md configuration file—over 1,500 lines—encodes
					organizational philosophy directly into the AI's context:
This is not prompt engineering. It's infrastructure. The AI operates within philosophical
					constraints because those constraints are the development environment.
- CSS tokensencode Canon principles (golden ratio spacing, WCAG-compliant
						accessibility)
- Component librariesimplement Canon constraints (no arbitrary radii, semantic
						color only)
- Linting rulesenforce Canon compliance (automated auditing against philosophical
						principles)


## IV. TheHermeneutic Circle(a philosophical method where understanding deepens through iterative interpretation—you understand parts through the whole, and the whole through its parts) as Architecture
CREATE SOMETHING operates as four interconnected properties, each serving the whole while
					maintaining distinct purpose:
Client work (.agency) does not exist in isolation. Patterns discovered serve back to
					practice (.space). Insights formalize into research (.io). Research refines the Canon
					(.ltd). The Canon shapes future client work.
This is not metaphor. It's architecture. Issues flow through Beads (the task system),
					carrying labels that route work to appropriate properties. Dependencies track how insights
					propagate. The circle closes continuously.
The hermeneutic circle prevents capture. Client work cannot dominate because it must
					justify itself against research. Research cannot become abstract because it must apply to
					practice. Practice cannot drift because it must align with Canon.
Each property holds the others accountable. The system self-corrects.


## V. Selective Engagement
The subtractive principle applies to client selection itself. Not every engagement serves
					the whole. Some projects would require compromising Canon. Others would consume resources
					without contributing insights. These are declined.
CREATE SOMETHING leads with assessment rather than proposals. Before committing to build,
					we analyze: Does this project align with our capabilities? Will it contribute to our
					research? Can we deliver within Canon constraints?
This inversion matters. Traditional agencies assess how to win work. We assess whether to pursue it.
Sublimio, a design studio we study, articulates this directly: "We are picky, and so are
					our clients." Selectivity is mutual. Clients who value our approach self-select. Those who
					want maximum scope for minimum cost look elsewhere.
This is not elitism. It's alignment. A studio that takes every project cannot maintain
					coherence. A client who wants everything cannot receive focus. Selectivity serves both.
- - Proposal first, assessment embedded
- - Win work, then scope constraints
- - Revenue as primary selection criterion
- - Client dependency as success
- - Assessment first, proposal earned
- - Scope constraints before commitment
- - Alignment as primary selection criterion
- - Client autonomy as success

> "We are picky, and so are our clients."


## VI. How to Apply This
To apply the Subtractive Triad to your own creative practice or organization:
Let's say you're building a design system for your organization:
Notice how each level builds on the previous:
To make principles operational rather than aspirational:
Apply the Subtractive Triad when:
Don't apply when:
How do you know the Triad is working?
The ultimate test: Can you describe valuewithout mentioning technology?
					If your explanation requires implementation details, you're thinking additively.
					Subtractive thinking reveals outcomes: "Meetings follow up on themselves"
					not "SMTP integration with CRM webhooks."
- DRY: Unified color definition prevents drift
- Rams: Removed variants that don't justify their complexity
- Heidegger: Button serves form's purpose, not its own appearance
- Starting a new system: Establish constraints early, before complexity accumulates
- Refactoring existing work: Use as lens to identify what to remove
- Onboarding new team members: Provides clear decision-making framework
- Experiencing drift: When implementations diverge, reconnect through shared principles
- Exploring genuinely new territory (premature abstraction is harmful)
- Working on throwaway prototypes (overhead not justified)
- The team lacks shared context (philosophy requires common language)


## VII. Conclusion: Position Is Practice
This paper has articulated CREATE SOMETHING's positioning, but the articulation is
					secondary. The position exists in the practice:
Position is not marketing.It's infrastructure. The Subtractive Triad is not
					a selling point—it's the architecture of how we work. Philosophy is not window dressing—it's
					the foundation that determines what buildings can stand.
Most agencies add. They accumulate services, expand scope, multiply touchpoints. The logic
					is additive: more capability, more value.
CREATE SOMETHING subtracts. We remove what obscures. We simplify until only the essential
					remains. We believe that truth emerges through disciplined removal at every level of
					abstraction.
Creation is the discipline of removing what obscures.
The position statement is simple:Most agencies add. CREATE SOMETHING removes what obscures.
But the statement is not the position. The position is the practice that makes the
					statement true.
- In the CSS tokens that enforce Canon constraints before a designer makes choices
- In the CLAUDE.md that shapes AI collaboration around philosophical principles
- In the Beads workflow that routes issues through the hermeneutic circle
- In the assessment protocol that filters engagements before proposals begin`
  },
  {
    slug: "understanding-graphs",
    title: "Understanding Graphs: \"Less, But Better\" Codebase Navigation",
    subtitle: "Applying Heidegger's hermeneutic circle to develop minimal dependency documentation that captures only understanding-critical relationships—replacing exhaustive tooling with human-readable insight.\"",
    description: "This paper presentsUnderstanding Graphs: a minimal, human-readable approach to documenting codebase relationships that embodies Dieter Rams' principle \"Weniger, aber besser\" (less, but better). Through hermeneutic analysis, we identified that traditional dependency graphs fail the minimalism test—they captureallrelationships when onlyunderstanding-criticalones matter. We developed a canonical format (UNDERSTANDING.md) that captures bidirectional semantic relationships, entry poin\"",
    category: "Research",
    date: "2025-01-08",
    readingTime: 15,
    difficulty: "advanced",
    keywords: [],
    content: `## Abstract
This paper presentsUnderstanding Graphs: a minimal, human-readable approach to
				documenting codebase relationships that embodies Dieter Rams' principle "Weniger, aber besser"
				(less, but better). Through hermeneutic analysis, we identified that traditional dependency
				graphs fail the minimalism test—they captureallrelationships when onlyunderstanding-criticalones matter. We developed a canonical format (UNDERSTANDING.md)
				that captures bidirectional semantic relationships, entry points for comprehension, and
				key concepts—all in plain markdown without tooling. Implementation across six packages
				in the CREATE SOMETHING monorepo validated the approach: developers can navigate the
				codebase through human-readable documents that Claude Code can also parse for context
				management. The contribution is both practical (a working system) and theoretical (a
				hermeneutic methodology for "sufficient" documentation).



## 1. Introduction
The question arose during a discussion of agent reasoning in large codebases: would
					Markov Chains improve context management? This led to a deeper inquiry: what do agents
					(and humans) actually need tounderstandcode?
Traditional dependency graphs answer the wrong question. They showallrelationships—every import, every type reference, every function call. But comprehension
					doesn't require exhaustive mapping; it requiressufficientmapping.
					The hermeneutic question became:What is sufficient for understanding?
This research asks:Can dependency documentation embody "Less, but better"?
We propose "Understanding Graphs"—minimal documents that capture only what's needed
					to comprehend a package in context. These documents:
Contributions:(1) A hermeneutic methodology for "sufficient" documentation,
					(2) The UNDERSTANDING.md canonical format, (3) Implementation across CREATE SOMETHING monorepo,
					(4) A Claude Code Skill for maintaining understanding graphs.
- Are human-readable (plain markdown, no visualization required)
- Are machine-parseable (Claude Code can use them for context)
- Capture bidirectional relationships (depends on + enables understanding of)
- Include semantic meaning (why, not just what)
- Require no tooling (no LSP, no graph database, no build step)


## 2. Methodology: Hermeneutic Analysis
We applied Heidegger'shermeneutic circle(a philosophical method of interpretation where understanding deepens through iterative movement between parts and whole—each informs the other in a spiraling process)—the interpretive method where
					understanding emerges through movement between whole and parts. The "whole" was the
					CREATE SOMETHING methodology; the "part" was dependency documentation.
We began by examining what traditional dependency graphs provide:
// Traditional approach: exhaustive
FileA.ts imports → types.ts, utils.ts, config.ts, ...
FileA.ts calls → functionX(), functionY(), functionZ(), ...
FileA.ts references → TypeA, TypeB, InterfaceC, ...
This violates Rams' principles: it's notuseful(overwhelming), notunobtrusive(requires tooling), and certainly not "as little as possible."
We then asked: what wouldsufficientdocumentation look like? The hermeneutic
					insight emerged: understanding is not about knowing all connections but about knowingwhere to startandwhat relates to what semantically.
A developer doesn't need to know every import. They need to know:
The critical realization: dependency graphs areunidirectional(A depends on B),
					but understanding flowsbidirectionally. Understanding A helps me understand B,
					and vice versa. The documentation format must capture this circular flow—exactly what
					the hermeneutic circle describes.
Key Insight: We don't need dependency graphs.We needunderstandinggraphs.
- Purpose: What does this package do? (one sentence)
- Position: How does it fit in the larger system?
- Entry points: What 3-5 files should I read first?
- Key concepts: What terms might confuse me?
- Relationships: What does this depend on? What depends on this?


## 3. Implementation
We developed a canonical format that balances human readability with machine parseability:
We created UNDERSTANDING.md files for all six packages in the CREATE SOMETHING monorepo:
Each file follows the canonical format, capturing only what's needed to understand
					that package in the context of the hermeneutic workflow.
To maintain understanding graphs over time, we created theunderstanding-graphsSkill.
					This Skill provides:
- • No external tooling
- • No graph databases
- • No visualization requirements
- • No LSP dependency
- • No build step
- • Only understanding-critical relationships
- • Human-readable (developers can read it)
- • Machine-parseable (Claude can use it)
- • Captures semantic relationships
- • Includes "what to read" guidance
- • Bidirectional (depends on + enables)
- • Self-contained (no external lookups)
- Guidelines for creating new UNDERSTANDING.md files
- Validation checklist (one-sentence purpose, 3-5 entry points, etc.)
- Update criteria (when to update vs. leave alone)
- Integration with other CREATE SOMETHING Skills


## 4. Results
The implementation completed the hermeneutic circle:
.ltd (Canon): Does it embody Rams' principles? ✅ Minimal, honest, unobtrusive
.io (Research): Is there theoretical grounding? ✅ Hermeneutic methodology documented
.space (Practice): Does it work hands-on? ✅ 6 packages successfully documented
.agency (Service): Commercial validation? 🔄 Pending client application


## 5. Discussion
The original question—whether Markov Chains could improve agent reasoning—assumed the
					problem wasstate compression. But the hermeneutic analysis revealed the actual
					problem issemantic navigation. Markov Chains are memoryless; understanding
					requires accumulated context. The hermeneutic circle works precisely because we carry
					prior understanding into each new encounter.
Understanding Graphs enable this accumulation: each UNDERSTANDING.md provides the
					pre-understanding (Vorverständnis) needed to engage with a package. Claude Code can
					read these documents to build context without loading entire codebases.
This research suggests a pattern for AI-human collaboration in codebase navigation:
Understanding Graphs require human judgment to identify "understanding-critical" relationships.
					This is both a strength (captures semantic meaning machines miss) and limitation (requires
					maintenance). We mitigate this through:
Potential extensions include:
- Human-authored understanding: Developers write UNDERSTANDING.md with semantic insight
- AI-consumed context: Claude Code uses these for efficient navigation
- AI-assisted maintenance: The understanding-graphs Skill guides updates
- Bidirectional benefit: Both humans and AI navigate the same documentation
- Clear validation checklist (one-sentence purpose, 3-5 entry points)
- Staleness tracking ("Last validated" date)
- Update criteria (only on structural changes, not bug fixes)
- Automated staleness detection (compare UNDERSTANDING.md to recent commits)
- Graph visualization from markdown (optional, generated on demand)
- Cross-repository understanding graphs (for microservices)
- Integration with IDE navigation (jump to entry points)


## 6. How to Apply This
To apply this methodology to your own codebase:
Let's say you're adding an authentication package to your monorepo:
Notice: This capturesunderstanding-criticalrelationships, not every import.
					The database package is mentioned because session storage is fundamental to comprehension.
					The logging package (which auth also uses) is NOT mentioned because it's not critical
					to understanding how auth works.
Update UNDERSTANDING.md when:
Don't update for:
The goal isstable understanding, not comprehensive documentation.
					Understanding graphs should age well—update only when the mental model changes.
- Architecture changes: New dependencies, removed dependencies, changed package purpose
- Entry points change: Files you'd recommend reading first are different
- Key concepts evolve: Terminology or fundamental patterns shift
- Bug fixes that don't change understanding
- Performance optimizations that don't change entry points
- Adding new functions that don't introduce new concepts


## 7. Conclusion
This research demonstrates that dependency documentation can embody "Less, but better."
					Traditional dependency graphs violate Rams' principles—they're exhaustive when sufficiency
					is needed, require tooling when plain text suffices, and capture structure when meaning matters.
Understanding Graphs invert these assumptions. By applying Heidegger's hermeneutic circle,
					we identified that codebase comprehension requiressemantic navigation, notexhaustive mapping. The UNDERSTANDING.md format captures only what's needed:
					purpose, position, entry points, concepts, and bidirectional relationships.
Implementation across the CREATE SOMETHING monorepo validated the approach. Six packages
					now have human-readable, machine-parseable understanding graphs that require no tooling
					and embody the minimalist philosophy that guides the entire methodology.
The hermeneutic insight: To understand a codebase, you don't need all
					relationships—just the right ones.


## References`
  },
  {
    slug: "webflow-analyzer-productization",
    title: "Webflow Analyzer Productization",
    subtitle: "From reviewer tooling to creator copilot",
    description: "This paper explains how the Webflow analyzer moved from reviewer-side infrastructure into creator-facing product surfaces. The interesting work was not simply exposing raw analyzer checks to more people. It was translating evidence-gathering and review logic into bounded validation, autofill, screenshot packaging, and submission guidance across the dashboard and marketplace submission flows. The paper argues that productization succeeds when a system preserves role boundaries: reviewers keep deep evidence and explicit manual states, while creators receive the parts of the system that can safely reduce labor before formal review.",
    category: "Case Study",
    date: "2026-04-25",
    readingTime: 14,
    difficulty: "intermediate",
    keywords: ["Webflow","Analyzer","Productization","Review Systems","Creator Workflow","Three-Tier Framework","Submission UX"],
    content: `## Executive Thesis

The Webflow analyzer became a product when it started helping creators **before** review, not only reviewers **during** review.

That is the entire argument.

The architecture paper already explains why review needed:

- published-site evidence
- Designer evidence
- policy provenance
- explicit manual boundaries

This paper explains the next move:

how those capabilities were translated into creator-facing workflow assistance without collapsing reviewer judgment into a form widget.

## The Productization Problem

Reviewer tooling and creator tooling do not need the same output shape.

A reviewer can work with:

- long checklist rows
- explicit partial states
- evidence notes
- queue progress
- script-version detail
- policy provenance

A creator preparing a submission usually needs something different:

- validation feedback
- missing information surfaced clearly
- fields suggested or filled automatically
- screenshots prepared for upload
- faster progress through the form

Raw analyzer output is too heavy for the second task.

Productization, in this context, means **translation**:

turning review-grade evidence into creator-grade assistance while keeping the underlying trust boundaries intact.

## The Analyzer Family

By April 2026, the repository no longer described a single analyzer surface. It described a family of related surfaces:

### 1. Reviewer-side analyzer MCP

Primary package:

- \`packages/webflow-site-analyzer-mcp\`

This is where deep extraction, policy-grounded review, remote execution, and queueing live.

### 2. Creator-side validator

Primary package:

- \`packages/webflow-template-validation\`

This is a creator-oriented validation surface that explains coverage, issues, and checklist progress more directly inside a Webflow-friendly workflow.

### 3. Creator-side autofill and screenshot packaging

Primary package:

- \`packages/webflow-template-analyzer\`

Consumer surfaces:

- \`apps/webflow-dashboard-cloud\`
- \`apps/marketplace-template-submission-cloud\`

This branch focuses on form assistance:

- extracting likely field values
- packaging screenshots
- returning downloadable artifacts
- shaping output for submission UX

The important observation is that these are not interchangeable deploys. They exist because the workflow has different roles.

## What Changed in April

April 2026 is where productization became visible.

The repository shows four important changes.

### 1. Validation became an explicit creator step

The submission flows added a distinct validation pass against a published URL.

This matters because it moved the analyzer upstream:

the system no longer waits for a reviewer to discover avoidable issues later.

### 2. Analyzer output became autofill

The dashboard and marketplace submission app added analyzer-backed autofill.

That is a large shift in product meaning.

The analyzer is no longer only saying:

**"Here is what I found."**

It is now also saying:

**"Here is work I can safely do for you."**

That is one of the clearest signs of a maturing workflow product.

### 3. Screenshots became product artifacts

Screenshots were not left as opaque debugging output.

They became:

- packaged assets
- download links
- upload-ready materials

This is an important productization move because it transforms extraction output into something legible and reusable inside the submission process.

### 4. Submission UX closed the loop

The later April commits focused on:

- summary clarity
- field application visibility
- iframe behavior
- webhook mapping
- success-state preservation

Those are not analyzer features in the narrow sense.

They are the signs that the analyzer has been absorbed into an end-to-end workflow.

## Translation, Not Exposure

A common failure mode in internal-tool productization is to expose expert output directly to non-expert users and call that product work.

That is not what happened here.

The Webflow analyzer productization work translated the system across three dimensions:

### Evidence translation

Deep review findings became:

- validation messages
- suggested fields
- applied fields
- screenshot counts

### Role translation

Reviewer-owned decisions stayed reviewer-owned.

Creator-facing surfaces received only the parts that could safely reduce labor without overclaiming authority.

### Interface translation

The output moved from MCP tools and review scripts into:

- dashboard validation screens
- submission summaries
- upload affordances
- post-validation state management

This is why the productization work feels different from merely adding new checks.

## Why the Boundaries Matter

The system would become weaker if productization meant collapsing every surface into one universal analyzer app.

That would mix incompatible responsibilities.

Instead, the repository points toward a better rule:

> Share evidence pipelines. Preserve role boundaries.

That rule produces cleaner surfaces:

- reviewers get deep evidence and explicit manual states
- creators get validation, autofill, and preparation assistance

Each side benefits from the same underlying system, but not from the same presentation layer.

## The Three-Tier Mapping

Productization did not replace the Three-Tier Framework. It made it more visible.

| Tier | In the productized analyzer flow | Why it matters |
|------|----------------------------------|----------------|
| **Database** | Published URL, preview URL, screenshot artifacts, field models, policy snapshots | The creator flow still depends on real evidence, not only form inputs |
| **Automation** | Validation endpoints, autofill mapping, screenshot packaging, dashboard/submission integration | The system removes labor before review begins |
| **Judgment** | Manual review boundaries, warning states, what is suggested vs applied, reviewer-only decisions | Productization stays trustworthy because it does not overclaim |

The key lesson is that creator-facing UX is still a Three-Tier system.

It is not "just frontend polish."

## Design Rules That Fell Out of This Work

### 1. Productization is translation

Do not dump expert output into a user interface and call it done.

Convert it into the smallest safe action a user can benefit from.

### 2. Upstream assistance is high leverage

If the system can help creators before formal review, it removes avoidable work from both sides.

### 3. Manual is still part of the contract

Creators should receive help, not false certainty.

The system remains trustworthy because some decisions still stop at validation, warning, or reviewer ownership.

### 4. Artifacts matter

Screenshots, summaries, and applied-field lists are not decorative extras.

They are how automation becomes legible inside a workflow.

### 5. Separate surfaces can still be one story

The validator, the autofill service, the reviewer MCP, and the submission apps are distinct surfaces.

They still belong to one coherent story because they all answer the same underlying problem:

how to reduce review friction without erasing governance.

## What This Means for the Series

The analyzer series should not stop at architecture.

It should show the progression:

1. the review system had to be built correctly
2. then its outputs had to be translated
3. then those translations had to fit real creator workflows

That last step is what turns infrastructure into product.

## Conclusion

The Webflow analyzer did not become more important because it gained more checks.

It became more important because its evidence started doing useful work earlier in the workflow.

That is the productization move:

- reviewer systems stay rigorous
- creator systems stay bounded
- the same evidence pipeline serves both

When that happens, the analyzer stops being "a powerful internal tool."

It becomes a workflow surface that changes how submissions are prepared.`
  },
  {
    slug: "webflow-dashboard-refactor",
    title: "Webflow Dashboard Refactor: From Next.js to SvelteKit",
    subtitle: "From Next.js to SvelteKit—how autonomous AI workflows completed 40% missing features in 83 minutes, achieving 100% feature parity.",
    description: "Abstract We took an incomplete SvelteKit port of the Webflow Template Dashboard—sitting at about 65% feature parity with the original Next.js version—and finished it. The missing 35%? Submission tracking, validation UI, marketplace insights, multi-image uploads, and design animations. All the features creators actually need. The interesting part wasn't the technology swap itself. It was discovering that AI-powered workflows could close a 40-50% feature gap in under 90 minutes of autonomous work.",
    category: "Case Study",
    date: "2025-01-08",
    readingTime: 45,
    difficulty: "advanced",
    keywords: [],
    content: `## Webflow Dashboard Refactor

*From Next.js to SvelteKit—how autonomous AI workflows completed 40% missing features in 83 minutes, achieving 100% feature parity.*

**Category**: Case Study
**Reading Time**: 45 minutes
**Difficulty**: Advanced

### Abstract

We took an incomplete SvelteKit port of the Webflow Template Dashboard—sitting at about 65% feature parity with the original Next.js version—and finished it. The missing 35%? Submission tracking, validation UI, marketplace insights, multi-image uploads, and design animations. All the features creators actually need.

The interesting part wasn't the technology swap itself. It was discovering that AI-powered workflows could close a 40-50% feature gap in under 90 minutes of autonomous work. This paper tells the story of how we did it, what we learned, and why systematic analysis matters more than perfect code on the first try.

---

**Full Paper**: \${fullUrl}`
  },
  {
    slug: "workflow-trust-layer",
    title: "The Workflow Trust Layer",
    subtitle: "Why agents need handoffs, approval states, and evidence before they need more tools",
    description: "AI teams usually reach for more tools when a workflow fails. The recent CREATE SOMETHING implementation trail points to a different conclusion: the missing layer is often not another connector, model, or agent runtime. It is a workflow trust layer that names the handoff, owner, data boundary, action rule, approval state, blocked state, and receipt before autonomy expands. This paper turns that lesson into a practical operating model for users evaluating agentic workflows. MCP exposes capability, Dify or another app surface makes the workflow usable, Cloudflare or repo-owned services provide durable runtime boundaries, and an SDK-backed service can graduate risky orchestration into code when the evidence justifies it. The trust layer is the artifact family that keeps those surfaces coherent.",
    category: "Research",
    date: "2026-06-20",
    readingTime: 18,
    difficulty: "intermediate",
    keywords: ["Workflow Trust Layer","Policy OS","MCP","Dify","OpenAI Agents SDK","Approval States","Agent Governance","Three-Tier Framework"],
    content: `## Executive Thesis

Connection does not create trust.

An MCP server can expose a useful capability. A Dify app can make an agent workflow easy to inspect. A coding agent can operate across a repo. An SDK-backed service can route tools, pause for approval, store state, and emit traces.

None of those surfaces, by itself, tells a team what the workflow is allowed to do.

The missing layer is the **Workflow Trust Layer**: the operating boundary that turns a possible agent action into a controlled workflow step.

It answers seven questions before the agent does more work:

1. What handoff is this workflow trying to improve?
2. Who owns the approval?
3. Which data is the system allowed to read?
4. Which actions can run automatically?
5. Which actions must pause for review?
6. Which actions should stop with a reason?
7. What receipt proves what happened?

This paper is written for users who already feel the pressure to "add AI" to a real workflow. The practical recommendation is simple: do not start by asking which model, app, or connector should run the work. Start by building the trust layer underneath the work.

## The Failure Mode: More Capability, Less Confidence

Most agent failures do not begin with a missing model feature.

They begin with a workflow that was never named precisely enough:

- a support thread needs follow-up, but nobody knows when a reply can be posted automatically
- a sales handoff crosses CRM, email, notes, and Slack, but nobody owns the approval boundary
- a review process has a checklist, but the checklist does not say which findings are evidence and which are judgment
- an operator wants autonomy, but the system cannot explain why it stopped
- a team connects tools, but cannot reconstruct what changed

In that state, adding more tools makes the system more capable and less legible at the same time.

The user sees a chat box. The agent sees tools. The runtime sees API calls. The business still lacks an operating answer.

What should happen next?

That is a policy question, not a connector question.

## The Three Decision States

A workflow trust layer reduces agent behavior to three visible states.

| State | Meaning | User experience |
| --- | --- | --- |
| Auto-allow | The action is low-risk, scoped, and covered by an accepted rule. | The system acts and keeps a receipt. |
| Approval-needed | The action may be valuable, but a named human must decide. | The system pauses with context, options, and evidence. |
| Blocked | The action is outside scope, missing data, too risky, or not authorized. | The system stops with a reason and a recovery path. |

This is deliberately smaller than a full governance framework.

Users do not need a fifty-page policy manual before the first useful workflow. They need the first durable boundary:

- what can run
- what waits
- what stops

The first version can be written as a table. The important move is making the decision state explicit before the agent gets access to more capability.

## Why MCP Is Necessary But Not Sufficient

MCP is the right substrate for agent work because it makes capability explicit.

It can define:

- tools the model may call
- resources the application may provide
- prompts or policy artifacts a user may select
- input and output schemas
- auth and permission boundaries

That is a major improvement over hidden integration logic inside a general-purpose agent prompt.

But MCP answers **what can be called**. It does not automatically answer **what should be done**.

Consider a customer-support workflow with tools for reading tickets, summarizing account history, drafting replies, posting replies, issuing refunds, and updating CRM fields.

The tool inventory alone is not enough. The trust layer has to say:

- reading tickets is auto-allowed
- summarizing account history is auto-allowed if PII stays inside the authorized workspace
- drafting a reply is auto-allowed
- posting a reply needs approval unless the reply matches a low-risk template
- issuing a refund is blocked unless a separate finance policy is attached
- updating CRM status is approval-needed when it affects pipeline reporting

MCP gives the agent a controlled interface. The workflow trust layer gives the organization a controlled operating path.

## The Runtime Question Comes Later

Teams often collapse three decisions into one:

1. Where should the user interact with the workflow?
2. Where should durable runtime logic live?
3. When should orchestration graduate into code?

Those are different decisions.

A practical stack can use multiple surfaces without contradiction.

| Surface | Best role | Trust-layer question |
| --- | --- | --- |
| Dify or another visual app surface | Client-facing workflow UX, visual inspection, app publishing, service API access, non-engineer review | Can the operator inspect and change the workflow without a code deployment? |
| Cloudflare or repo-owned services | Auth, queues, D1 state, tenant boundaries, custom endpoints, recovery paths, package-local validation | Does this workflow need durable infrastructure and explicit runtime ownership? |
| MCP server | Tool/resource/prompt boundary across agent clients | Which capabilities are exposed, scoped, and observable? |
| SDK-backed workflow service | Code-owned orchestration, approval pauses, traces, evals, CI-backed golden tasks | Has this workflow earned the platform burden of custom runtime ownership? |

The runtime question should not be treated as a brand preference.

Dify is useful when the workflow needs visual editing, app publishing, and non-engineer inspection. Cloudflare is useful when the workflow needs custom runtime state and recovery paths. MCP is useful when capability boundaries must be explicit and portable. An SDK-backed service is useful when the workflow has outgrown visual orchestration and now needs code-owned routing, approval pauses, traces, evals, and repeatable golden tasks.

The trust layer is what lets those surfaces cooperate instead of competing.

## A Practical Model: Map, Pilot, Operate

The workflow trust layer becomes useful when it is tied to a delivery path.

### 1. Trust Map

The first artifact is a map of one workflow.

It should name:

- the workflow owner
- the human task
- the AI task
- the system task
- the source systems
- the data objects
- the action boundary
- the approval owner
- the failure modes
- the evidence receipt

The output is not "an automation idea." The output is a bounded workflow map.

The best first map is usually one painful handoff, not a broad automation wishlist. A good candidate crosses systems, teams, permissions, or customer expectations. A weak candidate has no approval owner, no visible failure mode, or only a vague wish for unattended action.

### 2. Workflow Pilot

The second artifact is one controlled workflow in production or preview.

It should include:

- the MCP capability boundary
- the user-facing app surface
- the runtime state boundary
- the three decision states
- the first runbook
- the release evidence
- the fallback path

The pilot should prove the handoff, not the platform.

The question is not "Can an agent do something impressive?" The question is "Can this workflow move from manual rescue to controlled operation?"

### 3. Trust Layer

The third artifact is recurring control around live work.

It should include:

- incident notes
- blocked-state reviews
- golden-task regressions
- approval queue review
- tool-scope review
- policy tuning
- runtime graduation or rollback review

This is where the system becomes operational instead of merely implemented.

The trust layer is not a project kickoff document. It is a standing control loop.

## The Artifact Family

The Workflow Trust Layer is easier to understand when treated as a concrete artifact bundle.

| Artifact | Purpose |
| --- | --- |
| \`workflow_map.md\` | Names the handoff, owner, tasks, systems, and failure points. |
| \`mcp_contract.yaml\` | Defines tools, resources, prompts, auth scopes, and error model. |
| \`agent_contract.yaml\` | Defines allowed tools, approval mode, escalation triggers, runtime surface, and graduation status. |
| \`decision_states.yaml\` | Lists auto-allowed, approval-needed, and blocked actions. |
| \`golden_tasks.yaml\` | Provides regression examples for the workflow's most important behavior. |
| \`runbook.md\` | Defines setup, operation, incident response, and rollback. |
| \`evidence_log.md\` | Records validation commands, trace IDs, deploy IDs, review notes, and handoff receipts. |

This bundle gives users something agents alone do not provide: a way to inspect and transfer responsibility.

## Database, Automation, Judgment

The Workflow Trust Layer follows the Three-Tier Framework.

### Database: what exists

The Database layer contains the workflow state:

- source records
- account and entitlement state
- policy versions
- approved workflow definitions
- previous decisions
- evidence logs
- trace IDs
- runbook versions

If the data is stale or missing, the agent should not compensate by guessing. It should stop, ask for the missing substrate, or route to a manual fallback.

### Automation: what happens

The Automation layer contains the tool calls and deterministic execution paths:

- MCP tool invocation
- Dify workflow steps
- Cloudflare Worker endpoints
- queues
- webhooks
- SDK agent routing
- eval runs
- golden-task checks

This layer should make the action path repeatable. It should not hide policy inside improvised reasoning.

### Judgment: what should happen

The Judgment layer contains the selected policy:

- approval rules
- escalation criteria
- blocked actions
- human ownership
- cost and latency guardrails
- rollback criteria
- operator cadence

When this layer is missing, agents either ask constantly or guess silently. The trust layer makes judgment explicit enough to operate.

## What Users Actually Need

Most users do not need to learn the internals of agent runtimes before they can make progress.

They need a short diagnostic that forces the right operating questions:

1. Name the workflow in one sentence.
2. Name the person who currently rescues it.
3. Name the systems involved.
4. Name the action that would create risk if done wrong.
5. Name the action that is safe enough to automate.
6. Name the first approval-needed state.
7. Name the first blocked state.
8. Name the receipt the operator should keep.

If a team cannot answer those questions, it is too early to add more autonomy.

If a team can answer them, the first build path becomes much clearer.

## When to Graduate Runtime

A workflow does not graduate to a heavier runtime because an SDK exists.

It graduates when the operating evidence says the current surface is no longer enough.

Good graduation reasons include:

- visual workflow editing no longer captures the needed orchestration
- side-effecting tools need explicit approval pauses in code
- state must survive retries and recovery flows
- cost, latency, or reliability must be measured in CI-backed tasks
- traces and evals need to become part of release evidence
- tool routing has become too important to leave implicit

Bad graduation reasons include:

- "the new SDK is more powerful"
- "we want everything in code"
- "the visual tool feels less serious"
- "we can replace the operator once it is rebuilt"

The point of graduation is more governed control, not more engineering theater.

## The Main Design Rule

Do not connect a tool unless the workflow can explain the decision state attached to that tool.

For each capability, ask:

- What is the safest useful read?
- What is the first useful draft?
- What is the first side effect?
- Who approves that side effect?
- What would make the action blocked?
- What receipt proves the system behaved?

This rule is intentionally strict. It prevents the common failure where a team adds tool access first and tries to discover governance later.

Governance discovered after tool access is usually cleanup.

Governance defined before tool access is a trust layer.

## Example: Support Reply Drafting

A support reply workflow might start like this:

| Capability | Decision state | Receipt |
| --- | --- | --- |
| Read ticket text | Auto-allow | Ticket ID and timestamp |
| Summarize customer history | Auto-allow if scoped to the account | Source IDs used |
| Draft reply | Auto-allow | Draft text and policy note |
| Post reply | Approval-needed | Approver, final text, send timestamp |
| Offer refund | Approval-needed or blocked by finance policy | Approval ID or blocked reason |
| Delete account data | Blocked unless legal/privacy policy is attached | Escalation record |

The agent can still be helpful immediately. It can read, summarize, and draft. But the trust layer prevents helpfulness from becoming unauthorized action.

## Example: Marketplace Review

A review workflow might start like this:

| Capability | Decision state | Receipt |
| --- | --- | --- |
| Fetch published page evidence | Auto-allow | URL list and fetch timestamp |
| Extract Designer metadata | Auto-allow when authenticated to the review workspace | Workspace and page inventory |
| Normalize checklist findings | Auto-allow | Finding IDs and policy version |
| Recommend request-changes language | Auto-allow | Draft feedback and supporting evidence |
| Approve or reject submission | Blocked for automation | Human reviewer decision |
| Update source-of-truth status | Approval-needed | Approver and status change |

This distinction matters. The review system can become much more useful without pretending it owns final judgment.

## What the Paper Adds for Users

The user-facing value of this model is not theory.

It gives teams a way to slow down the right part of the conversation.

Instead of asking:

**"Which AI agent should we use?"**

Ask:

**"Which workflow handoff is ready for a trust layer?"**

Instead of asking:

**"Can the agent call this tool?"**

Ask:

**"Which decision state governs this tool?"**

Instead of asking:

**"Should we move this to a custom SDK runtime?"**

Ask:

**"What evidence shows the current runtime cannot govern this workflow well enough?"**

Those questions are less exciting than demos. They are more useful.

## Conclusion

The next useful layer in agent adoption is not another generic automation surface.

It is the workflow trust layer underneath agent work:

- one named handoff
- one owner
- one capability boundary
- three decision states
- one receipt trail
- one review cadence

MCP exposes capability. App surfaces make workflows usable. Runtime services make state durable. SDKs can graduate orchestration into code. But users still need the layer that tells the system what should happen, when to pause, and how to prove what occurred.

That layer is the product.`
  }
];
