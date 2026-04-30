---
title: "The Andon Protocol"
subtitle: "AI-Native Structured Escalation for Agent Harnesses and Multi-Agent Systems"
authors: ["CREATE SOMETHING"]
category: "Research"
abstract: "Agent systems handle uncertainty badly. They either ask constantly or guess silently. Manufacturing solved this decades ago. Version 2.0 synthesized Toyota's Andon, aerospace Deviation/Concession, and Porsche's error correction into a unified escalation protocol. Version 3.0 addresses a critical gap: manufacturing patterns assume the worker knows when something is wrong. LLMs don't—they hallucinate with high confidence; they operate in multi-agent topologies; their harnesses are artifacts that should evolve. This revision extends the Andon Protocol with five AI-native capabilities (Automated Jidoka, Multi-Agent Topology, Dynamic Thresholds, Harness Evolution, Semantic Precedent). Version 3.1 further addresses operational gaps: Silent Running Detection (enforcing the obligation to pull by auditing agent reasoning traces post-hoc), cost parameter defaults and worked examples for the resolution equation, a Resolution Surface design for human batch review, and a three-phase implementation plan. The result is a protocol designed for non-deterministic, multi-agent, self-modifying systems—with a concrete path to deployment."
keywords: ["andon", "jidoka", "deviation", "concession", "agent harness", "three-tier framework", "multi-agent", "Kaizen", "semantic precedent", "silent running"]
publishedAt: "2026-02-01"
readingTime: 28
difficulty: "intermediate"
published: true
---

## Release Thesis

The Andon Protocol defines when agent systems must ask, stop, proceed, or escalate.

The practical change in v3.1 is that escalation is no longer treated as a soft prompt instruction. It becomes an operating protocol with detector-triggered pulls, multi-agent routing, cost-based thresholds, semantic precedent, and explicit human approval for harness changes.

The decision this paper should make easier: when an agent encounters uncertainty, should it continue, alert, block, route to a peer, or send the decision to a human?

## Evidence Snapshot

| Claim | Evidence | Status | Reusable Artifact |
|-------|----------|--------|-------------------|
| Agents cannot reliably self-detect every defect | Hallucination and overconfidence make self-assessment insufficient | Design premise | Automated Jidoka detectors |
| Multi-agent systems need routed escalation | Agent outputs become other agents' inputs, creating upstream and downstream responsibility | Protocol design | Resolution authority hierarchy |
| Fixed takt time does not map to agent work | Agent tasks range from milliseconds to multi-hour research loops | Protocol design | `resolve_urgency` equation |
| Silent uncertainty is itself a defect | An agent can proceed while uncertain and leave no trace | Protocol extension | Silent Running Audit |
| Harness improvement requires governance | Thresholds and tool access can improve, but broad changes need human policy approval | Governance rule | Harness Kaizen approval path |

## What This Improves

The protocol makes uncertainty visible without forcing every uncertain step to become a human interruption.

It separates alerting, blocking, deviation requests, concessions, retroactive audits, and harness changes. That gives operators a vocabulary for handling agent uncertainty at different stakes and different costs.

## Evaluation Surface

This is a protocol paper, not a completed production rollout report. Its evidence is structural:

- manufacturing escalation patterns: Andon, deviation, concession, and error-correction loops
- agent-specific failure modes: overconfidence, multi-agent handoff, variable work duration, harness drift, and semantic precedent
- implementation mapping to D1, Vectorize, Workers, MCP tools, Slack/email touchpoints, and Loom continuity
- concrete object schema for Andon records and resolution history

The next validation should be a dogfood pilot: instrument one agent lane with alert, stop, concession, and silent-running audit records, then measure unnecessary pull rate, reversal rate, and time-to-resolution.

## Governance Boundary

The protocol intentionally keeps Harness Kaizen under L4 human policy approval. Agents may propose constraint changes based on accumulated evidence, but tool access, authority hierarchy, and major threshold movement remain human-controlled policy decisions.

## Next Decision

The next operating decision is to select one CREATE SOMETHING agent lane and implement a minimal Andon object, resolver surface, and Silent Running audit before broadening the protocol to multi-agent topologies.

## Part I: Manufacturing Foundation

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

`resolve_urgency = cost_of_delay / (cost_of_wrong_action × (1 − confidence))`

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
| type | enum | alert \| stop \| deviation \| concession \| audit | audit (v3.1) |
| source | enum | agent \| jidoka_detector \| cross_agent | Yes |
| source_agent_id | string | | Yes |
| status | enum | open \| investigating \| resolved \| applied \| clustered \| retroactive | clustered, retroactive (v3.1) |
| resolution_level | enum | L0 \| L1 \| L2 \| L3 \| L4 | Yes |
| question | text | |
| context | object | |
| proposed_action | text | |
| confidence | number (0–1) | |
| resolve_urgency | number (computed) | Yes |
| impact | text | |
| precedent_matches | array of {id, similarity, pattern} | Semantic matches |
| cluster_id | string (nullable) | Yes |
| resolution | object | {decision, rationale, resolver_id, level} | level added |
| kaizen_type | enum | knowledge \| threshold \| harness \| none | Yes |
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

*Version 3.1 — February 2026*  
*Supersedes: v1.0 (RFI Protocol), v2.0 (Andon Protocol), v3.0 (AI-Native Extensions)*  
*CREATE SOMETHING · WORKWAY · Half Dozen Solutions*
