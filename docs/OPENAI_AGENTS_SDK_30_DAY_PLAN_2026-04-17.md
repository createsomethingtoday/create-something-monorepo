# OpenAI Agents SDK 30-Day Plan

> Prepared: April 17, 2026
> Scope: business and product plan for turning the April 15, 2026 OpenAI Agents SDK release into a concrete CREATE SOMETHING move

## Executive Summary

The recommended next move is not a repo-wide migration.

It is a **30-day launch plan for one new paid pilot motion** inside the existing `Policy OS` family:

- **Offer name**: `Policy OS Trial: Sandboxed Workflow Pilot`
- **Client-facing label**: `Skills + MCP`
- **Technical description**: `MCP + Skills + governed sandbox execution`

The goal is to convert a market signal into one real business asset:

1. one bounded pilot offer
2. one repeatable demo workflow
3. one sharper positioning update
4. one case-study-ready proof loop

This release helps CREATE SOMETHING if it is used to sell a bigger category:

- not just `custom MCP development`
- but `agent-operable systems`
- delivered as `connectivity + harness engineering + judgment control`

## Why this matters commercially

The OpenAI release standardizes ideas that used to sound niche or custom:

- shell and file work as first-class agent behavior
- `AGENTS.md` and skills as execution inputs
- MCP as standard tool transport
- sandbox separation as a default safety pattern

That changes the business environment in two ways:

### 1. Basic agent infrastructure becomes easier to explain

This reduces category-friction in sales conversations. Buyers no longer need as much education on why file access, command execution, or controlled workspaces matter.

### 2. Differentiation shifts upward

If more teams can access the same underlying harness patterns, CREATE SOMETHING wins by being better at:

- choosing the right workflow wedge
- designing the trust boundary
- packaging policy artifacts
- routing approvals and escalation
- proving observability, rollback, and operator control

This is good for business if CREATE SOMETHING avoids selling "we have the same sandbox feature too" and instead sells "we make these systems safe, governed, and deployable in your environment."

## Recommended commercial move

Package this as a new entry inside the existing `Policy OS Trial` lane, not as a new product family.

### Offer

**Policy OS Trial: Sandboxed Workflow Pilot**

Use when the workflow needs at least one of:

- file inspection or transformation
- command execution
- code edits or artifact generation
- controlled handling of sensitive internal data
- explicit workspace boundaries and auditability

Do not use when the buyer only needs:

- read-only connectivity
- basic MCP discovery
- general chatbot behavior
- seat-priced assistant access

### Positioning statement

Use this line in internal and external material:

**We do not just connect tools to models. We make agent systems operable inside real environments, with governed access, execution boundaries, and review loops.**

### Commercial posture

- keep `MCP-only` as the free or constrained wedge
- sell this pilot inside `Policy OS Trial`
- do not price it like a seat license
- do not pitch it as a one-time custom build
- use the existing `Policy OS Trial` pricing guidance as the starting band, unless the workflow is materially higher-risk or broader in scope

## The 30-day plan

This plan runs from **April 17, 2026 through May 17, 2026**.

## Days 1-7: Pick the wedge and lock the offer

Window: **April 17-April 23, 2026**

### Goals

- choose one workflow where sandboxed execution is obviously valuable
- define the pilot scope tightly enough to sell and build
- keep the repo story coherent across Python-first and TypeScript lanes

### Required outputs

1. **Choose one design-partner workflow**

Pick one workflow only. Recommended workflow properties:

- frequent enough to matter
- costly enough to justify governance
- bounded enough to pilot in 30-60 days
- requires files, commands, or workspace isolation in a real way

Good examples:

- dataroom or document analysis with file-bound evidence
- governed code or config remediation
- internal policy or content transformation with controlled artifacts
- regulated back-office workflow where reads, writes, and approvals are separate

2. **Write the pilot definition**

Produce a one-page internal brief with:

- workflow name
- failure cost
- systems involved
- sandbox need
- human approval points
- proof metric
- conversion path into `Policy OS Core`

3. **Lock the message**

Adopt these working rules:

- front-door language: `Skills + MCP`
- package family: `Policy OS`
- pilot label: `Sandboxed Workflow Pilot`
- internal thesis: `agent-operable systems`

### Decision at the end of week 1

If no single workflow has clear failure cost and clear sandbox value, stop. Do not launch a generic sandbox offer.

## Days 8-14: Build the pilot surface

Window: **April 24-April 30, 2026**

### Goals

- build one bounded demo and execution path
- keep control planes outside the sandbox
- create sales proof, not platform sprawl

### Product rules

- use the new OpenAI Python-first lane only where native sandbox execution is the actual point
- keep Hub, Loom, policy artifacts, and telemetry outside the sandbox
- do not migrate the main repo runtime just to align messaging
- keep the existing canonical contract bundle unchanged for now

### Required outputs

1. **Pilot implementation**

Build one working path that proves:

- mounted input data or workspace
- controlled execution
- output artifact path
- evidence capture
- failure and escalation path

2. **Pilot contract bundle**

Ship the normal `Policy OS` artifact family:

- `mcp_contract.yaml`
- `agent_contract.yaml`
- `outcome_contract.md`
- `golden_tasks.yaml`
- `runbook.md`

Add one temporary pilot supplement:

- `sandbox_profile.md`

Use the supplement to record:

- workspace shape
- sandbox provider
- allowed execution classes
- secrets posture
- output and retention rules
- restart and failure expectations

Do not promote `sandbox_profile.md` into a canonical contract artifact until there are repeated wins across multiple pilots.

3. **Internal demo narrative**

Prepare one short demo path that shows:

- what goes into the workspace
- what the agent can and cannot do
- where human review happens
- what evidence comes out

## Days 15-21: Run the pilot and measure it

Window: **May 1-May 7, 2026**

### Goals

- prove the workflow on real or representative inputs
- capture both outcome quality and governance quality
- collect material that can support sales and product decisions

### Metrics to capture

- time-to-first-usable-output
- human review burden
- failure modes encountered
- number of blocked or escalated actions
- evidence completeness
- repeatability across at least 3 runs

### Business questions to answer

- does the pilot solve something that clients already pay humans to do?
- does sandboxing materially improve credibility or safety over a non-sandbox lane?
- does the artifact bundle make the workflow easier to review and sell?
- is the result better framed as `Policy OS Trial` than as `MCP-only` or custom project labor?

### Required outputs

1. **Internal evaluation memo**

Capture:

- what worked
- what broke
- what remained manual
- what is saleable now
- what must remain internal for now

2. **Case study skeleton**

Draft:

- workflow before
- workflow after
- trust boundary
- approval posture
- measured improvement
- remaining limits

## Days 22-30: Turn it into a business asset or kill it

Window: **May 8-May 17, 2026**

### Goals

- decide whether the motion is good enough to carry externally
- convert the pilot into a repeatable offer if it clears the bar
- avoid muddy product language if it does not

### Required outputs

1. **One positioning update**

Apply the learning to:

- `.agency` or sales copy
- discovery-call script
- one technical proof surface

The message shift should be:

- from `we build MCP servers`
- to `we build governed agent systems that can operate inside real environments`

2. **One offer page or internal sales sheet**

Include:

- pilot description
- use cases
- scope boundaries
- required client conditions
- what is governed
- what is still out of scope

3. **One go / hold / kill decision**

Use the gates below.

## Day-30 decision gates

### Go

Promote the motion if all are true:

- one workflow repeatedly demonstrates value
- sandboxing materially improves safety, trust, or capability
- the runbook and policy artifacts make the workflow legible
- the pilot can be sold clearly inside `Policy OS Trial`
- the repo story stays coherent without pretending full TypeScript parity

### Hold

Keep it internal if either is true:

- the workflow is useful but still too fragile operationally
- the business story is good but the product surface is not yet legible enough to sell

### Kill

Drop the motion if any are true:

- the sandbox does not add meaningful workflow value
- the offer collapses into commodity assistant pricing logic
- the workflow is too bespoke to repeat
- the Python-first lane creates more narrative confusion than business leverage

## Business impact if this works

### 1. Higher-value entry into Policy OS

This creates a stronger first paid offer than generic automation consulting, because it ties execution, governance, and environment control together.

### 2. Better sales narrative

The market is easier to educate now. CREATE SOMETHING can meet buyers with a category they increasingly recognize, then differentiate on policy, observability, and workflow design.

### 3. Clearer separation from commodity assistants

This helps avoid comparisons to seat-priced AI products. The story becomes:

- not "another assistant"
- but "a governed workflow system with real execution boundaries"

### 4. Better bridge from wedge to recurring revenue

The pilot provides a cleaner path from:

- `MCP-only`
- to `Policy OS Trial`
- to `Policy OS Core`

## Risks

### 1. Messaging confusion

The repo currently has:

- a legacy Anthropic-first `packages/agent-sdk/` lane
- a separate OpenAI Agents SDK lane

If those are blurred together, the business story gets muddy.

### 2. Overbuilding

If the team treats this as a platform rewrite instead of a wedge test, the opportunity gets slower and weaker.

### 3. False parity claims

The repo should not imply that current TypeScript surfaces already match the new Python-first sandbox stack.

### 4. Wrong workflow choice

If the first pilot is too broad or too custom, the category signal will be wasted.

## Recommended decision

Run exactly one **Policy OS Trial: Sandboxed Workflow Pilot** over the next 30 days.

Do not broaden the offer, rename the product family, or migrate the repo around it until one workflow proves all three:

1. real buyer value
2. real sandbox-specific advantage
3. real conversion path into `Policy OS Core`
