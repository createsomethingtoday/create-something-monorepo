# Low-Cost Hub Creation Standard

> Prepared: March 9, 2026
> Scope: codify how CREATE SOMETHING creates MCP hubs so infrastructure spend stays negligible until governed usage justifies expansion

## Purpose

CREATE SOMETHING should not burn infrastructure budget by treating every new client or wedge as a bespoke platform deployment.

The default rule is:

- create the smallest governed hub surface that can prove the workflow
- keep idle infrastructure and connector footprint minimal
- scale only after a paid governed lane is justified

## Core Rule

Hub creation must be **config-first, broker-first, and spend-light by default**.

That means:

1. do not create a new hub package unless the client truly needs new runtime behavior
2. do not expose full connector catalogs when a brokered subset is enough
3. do not provision dedicated infra before a paid governed lane exists or isolation is required

## Default Deployment Standard

The default hub runtime is:

- [packages/cs-mcp-hub-remote/README.md](./../packages/cs-mcp-hub-remote/README.md)

The default deployment shape is:

- one Cloudflare Worker
- broker-only execution
- compact discovery unless full discovery is justified
- minimal enabled server set
- existing shared hub controls before any dedicated client hub

Use [docs/MCP_HUB_REMOTE_DEPLOY.md](./MCP_HUB_REMOTE_DEPLOY.md) as the operational base.

## Spend Control Principles

### 1. Prefer shared hub over dedicated hub

Default:

- put new wedge and trial work on the shared governed hub path

Only create a dedicated client hub when one of these is true:

- tenant isolation requirements demand it
- custom domain or client-branded runtime is required
- policy or contract requires dedicated state separation
- traffic or connector mix justifies independent operations

If none of those are true, use the shared hub.

### 2. Prefer config over code

Default:

- add or restrict capability through:
  - registry configuration
  - enabled server lists
  - discovery packs
  - tenant exposure policy
  - session/account-scoped prefix enforcement

Do not fork or create a new hub codebase just to:

- change visible tools
- narrow discovery
- add a client slug
- enforce bundle-level access

### 3. Prefer brokered discovery over eager surface area

Default:

- keep the hub in broker-only mode
- expose management tools, not the full proxy-tool list as direct tools

This reduces:

- context bloat
- operational risk
- unnecessary connector activity
- incentive to enable too many downstream systems too early

### 4. Enable the fewest downstream systems possible

For wedge and trial work:

- enable only the servers required for the named workflow
- use compact discovery where possible
- keep discovery packs narrow

Do not enable:

- broad shared-auth packs
- large connector categories
- nonessential SaaS surfaces

until the workflow and paid lane justify it.

### 5. Keep paid controls off until governance needs them

The repo already supports richer controls such as:

- quotas
- rate limits
- retry policies
- telemetry
- tenant-aware authorization

Use the governance stack where needed, but do not over-provision or over-complicate the wedge just because the controls exist.

Short rule:

- instrument and gate what matters
- do not build enterprise overhead before enterprise conditions exist

## Creation Ladder

Use this order when standing up hub capability:

### Stage 1. No new hub

Use when:

- the workflow can be served by the existing shared runtime with existing policies and a narrow connector set

Action:

- configure access
- configure discovery scope
- validate routing

### Stage 2. Shared hub, client-scoped configuration

Use when:

- the client needs a dedicated discovery posture or policy envelope
- but does not need dedicated runtime or infra separation

Action:

- use current hub
- narrow server exposure
- apply tenant or prefix policy
- keep spend near-zero incremental

### Stage 3. Dedicated client hub

Use when:

- isolation, branding, or contract demands justify dedicated runtime

Action:

- deploy a dedicated worker instance from the same runtime standard
- keep broker-only mode
- keep server set minimal
- inherit the same governance path

### Stage 4. Dedicated plus expanded controls

Use when:

- paid governed production usage is live
- volume or risk justifies stronger account, tenant, or route budgets

Action:

- enable richer quota and rate-limit controls
- add stricter telemetry review
- expand only with evidence

## Package And Payment Relationship

This standard should align with the commercial ladder:

- `MCP-only` is free by default
- `Policy OS Trial` is the first paid product

Implication:

- the wedge should stay cheap because it is often carrying Codex and MCP onboarding effort, not yet paid operating ownership
- free wedges must not create expensive bespoke hub sprawl
- the architecture for `MCP-only` should be intentionally cheap
- dedicated spend should begin only when the client moves into the paid governed lane or hard isolation requirements demand otherwise

## Required Technical Defaults

For low-cost hub creation, default to:

- existing `cs-mcp-hub-remote` runtime
- broker-only execution
- compact discovery
- narrow `HUB_ENABLED_SERVERS`
- no direct proxy tool mode
- session/account-scoped enforcement where required

Only escalate beyond this when there is a named reason in the proposal or runbook.

## Required Commercial Defaults

For wedges and early trials:

- do not create infra that implies permanent support before the client is paying for the operating layer
- document the intended graduation path from wedge to `Policy OS Trial`
- note any exception explicitly

Example of valid exception:

- a free Outerfields MCP or related hub wedge may be delivered as an introduction to the Half Dozen system team, but the scope must stay bounded and the intended graduation path into `Policy OS Trial` must be explicit

## Anti-Patterns

Do not:

- spin up a bespoke hub runtime for every new prospect
- enable broad connector sets "just in case"
- create direct-tool surfaces when brokered discovery is enough
- treat free wedges as justification for paid-grade infra sprawl
- fork the hub runtime to solve what configuration can solve

## Acceptance Criteria

Hub creation is compliant with this standard when:

1. the client can be served by shared runtime unless a named exception exists
2. the enabled connector surface is minimal and workflow-specific
3. broker-only mode is preserved by default
4. dedicated infra exists only when isolation or paid governed usage justifies it
5. commercial notes explain the graduation path from wedge to paid lane

## Recommended Follow-Through

To fully operationalize this standard, the repo should next:

1. add a lightweight hub-creation decision checklist to proposals or discovery notes
2. align `.agency` proposal inputs with shared-vs-dedicated hub decision logic
3. extend `create-mcp` or related scaffolding only if repeated dedicated hub creation actually becomes common

## Final Rule

New hub spend should be a consequence of:

- paid governed usage
- required isolation
- or measurable operational need

It should not be a consequence of habit.

## Source Anchors

- [docs/MCP_HUB_REMOTE_DEPLOY.md](./MCP_HUB_REMOTE_DEPLOY.md)
- [docs/HUB_EXECUTION_GOVERNANCE_PLAN.md](./HUB_EXECUTION_GOVERNANCE_PLAN.md)
- [docs/MCP_SCAFFOLD.md](./MCP_SCAFFOLD.md)
- [packages/cs-mcp-hub-remote/README.md](./../packages/cs-mcp-hub-remote/README.md)
- [docs/FUNNEL_AND_DISCOVERY_STRATEGY_2026-03-09.md](./FUNNEL_AND_DISCOVERY_STRATEGY_2026-03-09.md)
- [docs/POLICY_OS_TRIAL_PACKAGING_MEMO_2026-03-09.md](./POLICY_OS_TRIAL_PACKAGING_MEMO_2026-03-09.md)
