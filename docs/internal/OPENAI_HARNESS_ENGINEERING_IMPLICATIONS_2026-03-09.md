# OpenAI Harness Engineering Implications

Date: 2026-03-09
Source: "Harness engineering: leveraging Codex in an agent-first world" by Ryan Lopopolo

## Why this matters here

The article validates the current CREATE SOMETHING trajectory:

- value compounds in the environment around the model, not only in the model
- policy and review loops are first-class product surfaces
- agent legibility requires UI access, observability, and versioned repository knowledge
- throughput changes engineering economics, so the system must optimize for scarce human attention

This aligns with the repo's existing positions:

- MCP-first connectivity as the entry wedge
- policy as artifact in the Three-Tier Framework
- judgment control as the differentiator on top of model reasoning

## What the article reinforces

### 1. Harness engineering is product work

The harness is not operational glue. It is the execution environment that determines whether agents can produce reliable outcomes at scale.

Implication for CREATE SOMETHING:

- custom MCP development remains important, but it is not enough
- the paid offer should increasingly be framed as `custom MCP + harness + policy operations + observability`
- our internal architecture should treat harness capabilities as core platform features

### 2. Agent legibility is more important than human convenience

If agents cannot inspect or validate something directly, that part of the system is effectively invisible to them.

Implication for CREATE SOMETHING:

- repository-local policy, plans, and runbooks should be canonical
- UI preview and observability need to become default execution surfaces, not optional extras
- package-level boot and validation contracts should be standardized

### 3. AGENTS.md should be a map, not an encyclopedia

The article's strongest documentation lesson is that large instruction blobs decay quickly and crowd out task-relevant context.

Implication for CREATE SOMETHING:

- compress `AGENTS.md` into a routing file
- treat `docs/` as the system of record with explicit indexes
- favor stable entrypoints and progressive disclosure over dense inline guidance

### 4. Policy artifacts are the durable moat

The article describes human judgment being encoded into reviews, constraints, and feedback loops until it compounds automatically. That is already close to CREATE SOMETHING's Judgment Layer thesis.

Implication for CREATE SOMETHING:

- continue investing in policy catalogs, Andon logs, approval posture, and monitoring checks
- position judgment control as a portable layer that survives model churn
- connect policy artifacts more directly to execution traces and post-run review

### 5. Continuous cleanup is mandatory in agent-generated systems

Pattern drift and "AI slop" are not exceptional events. They are steady-state operational costs unless the repository includes mechanical cleanup loops.

Implication for CREATE SOMETHING:

- recurring drift detection should cover docs, architecture, and coding patterns
- quality grading should be explicit and versioned
- cleanup PRs should be routine, small, and cheap to merge

## Current repo strengths

- Three-Tier Framework already names policy-as-artifact and the role of insight
- Judgment Layer already persists policy packs, checks, and Andon logs
- UI preview and observability docs already exist
- harness package already supports isolated worktree execution

## Current gaps

### 1. Documentation system is strong but not yet agent-indexed enough

We have many good documents, but not yet a clearly structured agent-first knowledge map for architecture, product, quality, and active execution plans.

### 2. Harness layer is transitional

The harness package is Loom-first in intent but still carries legacy Beads and Claude-oriented assumptions. It does not yet read as the default Codex-native execution substrate for the whole monorepo.

### 3. Legibility contracts are not standardized

Some packages have observability or preview paths, but the monorepo does not appear to enforce a standard package contract like:

- how to boot
- how to smoke test
- how to inspect logs/traces
- how to validate UI

### 4. Cleanup loops are not yet systematic

We have policy and judgment artifacts, but not yet a clear recurring "garbage collection" lane for documentation drift, architectural drift, and quality score maintenance across the repo.

## Recommended moves

### Priority 1: Refactor AGENTS and docs into a true routing system

Deliverables:

- shorten `AGENTS.md`
- add a top-level docs index for architecture, product specs, plans, quality, and policies
- define canonical entrypoints for agents by task type

### Priority 2: Converge the harness around Codex-native execution

Deliverables:

- make Loom the only control-plane language in harness docs and flows
- define a default self-review and agent-review loop
- standardize worktree boot, fix, validate, and merge behavior

### Priority 3: Define an agent legibility contract for packages

Deliverables:

- per-package boot command
- smoke or acceptance command
- trace surface
- UI validation path where relevant
- escalation path when validation fails

### Priority 4: Add recurring cleanup automation

Deliverables:

- docs freshness scan
- architecture drift scan
- quality-grade refresh
- small cleanup PR generation workflow

## Positioning update

The article should shift how we describe our moat:

- not just "we build MCP servers"
- not just "we add an agent layer"
- but "we build agent-operable systems"

That means CREATE SOMETHING should increasingly describe its work as:

`connectivity + harness engineering + judgment control`

## Decision

Treat the article as validation of the current strategy, with a raised implementation bar:

1. keep the MCP-first thesis
2. strengthen the harness layer
3. productize judgment control
4. make repository knowledge more agent-legible
5. add systematic cleanup loops before scale makes drift expensive
