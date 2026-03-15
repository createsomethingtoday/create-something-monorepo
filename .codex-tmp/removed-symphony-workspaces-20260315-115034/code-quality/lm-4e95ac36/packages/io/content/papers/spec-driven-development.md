---
title: "Spec-Driven Development"
subtitle: "A Meta-Experiment in Agent Orchestration: Building NBA Live Analytics as Methodology Validation"
authors: ["Micah Johnson"]
category: "Methodology"
abstract: "This paper documents a meta-experiment testing whetherstructured specificationscan effectively guide agent-based development. The vehicle is an NBA Live Analytics Dashboard
				with three analytical views—Duo Synergy, Defensive Impact, and Shot Network. The hypothesis:
				spec-driven development produces both working software and methodology documentation as
				equally important artifacts. Through three phases of implementation (Infrastructure, Pages, Polish),
				we observe that explicit depe"
keywords: []
publishedAt: "2025-01-08"
readingTime: 15
difficulty: "advanced"
published: true
---


## Abstract
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
- D3 integration complexity.Svelte 5 runes ($props()) interact differently
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
- Methodology documentation as a first-class artifact

