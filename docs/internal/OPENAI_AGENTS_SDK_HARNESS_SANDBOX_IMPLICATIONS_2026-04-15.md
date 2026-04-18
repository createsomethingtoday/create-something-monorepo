# OpenAI Agents SDK Harness + Sandbox Implications

Date: 2026-04-15
Source: "The next evolution of the Agents SDK" (OpenAI)

## Why this matters here

The April 15 release matters because it productizes several primitives this repo already treats as core harness features:

- MCP as standardized tool transport
- skills as progressive disclosure
- `AGENTS.md` as repo-local instruction routing
- shell and `apply_patch` as first-class code-work primitives
- sandbox separation as the default safety boundary

This is not a small feature release. It is a signal that frontier-model vendors now see harness design, not only model quality, as a first-class product surface.

## What the announcement validates

### 1. Harness engineering is now vendor product surface

Implication for CREATE SOMETHING:

- `docs/guides/CODING_AGENT_HARNESS_PATTERN.md` is aligned with the direction of the platform, not an internal quirk
- connectivity alone is not enough; the harness around it materially affects reliability, safety, and throughput
- the moat stays in policy, observability, and execution design, not commodity access to model APIs

### 2. Repo-local artifacts are becoming standard execution inputs

Implication for CREATE SOMETHING:

- `AGENTS.md`, skills, contracts, and policy artifacts should remain short, explicit, and machine-operable
- docs indexes and progressive disclosure become more important, not less
- policy artifacts should travel with task artifacts when work moves between agents or sandboxes

### 3. Sandboxes should be treated as disposable compute, not the system of record

Implication for CREATE SOMETHING:

- keep state, checkpoints, and policy outside the sandbox
- use isolated compute for shell, file, and code execution, but keep Loom, Hub, and telemetry as control planes
- design for container loss and rehydration instead of assuming sticky sessions

### 4. MCP becomes more valuable when paired with governed compute

Implication for CREATE SOMETHING:

- Hub remains strategic as broker, policy, and discovery layer
- sandboxes execute work; Hub determines safe surface and exposure
- the more standard shell/file/code primitives become, the more our value shifts toward governed access and judgment control

### 5. TypeScript lag matters operationally

Implication for CREATE SOMETHING:

- do not overclaim parity in repo docs
- the current repo OpenAI lane is TypeScript SDK orchestration for MCP and tracing, not the new Python-first sandbox stack
- keep smoke runners scoped to connectivity and evidence until TypeScript support lands for the same primitives

## Current repo strengths

- `docs/guides/CODING_AGENT_HARNESS_PATTERN.md` already treats harness engineering as product work
- `docs/guides/AGENT_LEGIBILITY_CONTRACT.md` and the observability docs already align with agent-operable execution
- `docs/OPENAI_AGENT_SDK_HALFDOZEN_SMOKE.md` and `scripts/openai-agent-sdk-halfdozen-smoke.ts` give the repo a real OpenAI Agents SDK integration point
- `packages/observability/src/openai-agents.ts` already exports OpenAI Agents SDK traces into Braintrust
- `AGENTS.md` already behaves as a routing layer instead of an encyclopedia

## Current gaps

### 1. The repo has two different "Agent SDK" stories

- `packages/agent-sdk/` is a legacy CREATE SOMETHING Python runtime centered on Anthropic and related providers
- the OpenAI lane lives in the TypeScript smoke runner and observability integration
- documentation needs to keep these lanes distinct until a real migration exists

### 2. Native sandbox execution is not yet part of the repo's OpenAI path

- no manifest-based workspace example is checked in
- no disposable sandbox provider abstraction is used in the active OpenAI examples
- no checkpoint or rehydration story is wired into OpenAI agent runs yet

### 3. The current smoke runner proves evidence collection, not harness-compute separation

- it is useful for MCP connectivity, scenario policy, and tool-call coverage
- it is not yet proof of production long-horizon execution posture

## Recommended moves

### Priority 1: Keep the docs honest about the current lane

- mark the smoke runner as MCP and orchestration validation, not sandbox parity
- label `packages/agent-sdk` as legacy or internal while it remains Anthropic-first

### Priority 2: Prepare for Python-first sandbox evaluation

- build one minimal manifest-mounted dataroom example when we want direct evaluation
- test sandbox loss and rehydration assumptions against existing checkpoint patterns
- compare provider boundaries with current Hub and Loom control-plane assumptions

### Priority 3: Keep Hub and Loom as control planes

- do not collapse state, policy, and compute into one runtime
- preserve external checkpoints, evidence, and approval posture

### Priority 4: Watch the TypeScript surface before migrating the main repo lane

- upgrade only when the TypeScript docs and API expose the same harness and sandbox primitives we actually need
- avoid half-migrations that create messaging alignment without operational benefit

## Positioning update

This announcement should sharpen, not replace, the repo thesis:

- MCP is still the connectivity wedge
- harness engineering is now a first-class vendor surface
- durable advantage stays in judgment control, policy artifacts, discovery governance, and agent legibility

## Decision

Treat the April 15, 2026 release as validation of the current direction with one important adjustment:

1. keep the repo's OpenAI Agents SDK lane distinct from the legacy internal `packages/agent-sdk` lane
2. keep the current docs honest about sandbox parity
3. plan a deliberate evaluation of Python-first sandbox execution rather than assuming the repo already has it
