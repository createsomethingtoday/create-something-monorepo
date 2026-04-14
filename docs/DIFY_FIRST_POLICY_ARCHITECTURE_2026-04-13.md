# Dify-First Policy Architecture

> Drafted: April 13, 2026
> Scope: client-facing hosted agent delivery on Dify using CREATE SOMETHING Hub + Policy OS
> Status: phase 1 scaffolded with `config/dify/apps/mj-hub`

## Decision

For client-facing agent delivery, **Dify becomes the primary hosted touchpoint**.

It does **not** replace:

- `Policy OS`
- the Hub control plane
- `identity-worker`
- versioned policy artifacts in `docs/policies/`
- operator-oriented desktop packaging such as Goose bundles

The operating split is:

- **Dify** = hosted app shell, web UI, prompt/workflow authoring, publish surface
- **CREATE SOMETHING Hub** = governed MCP execution plane
- **Policy OS** = canonical policy artifacts, approval boundaries, runtime governance
- **Repo** = system of record for contracts, promotion, and release evidence

## Why This Split

The repo already has strong governance and MCP infrastructure:

- tenant-aware Hub routing and downstream execution controls
- policy artifacts as tracked repo-native documents
- identity normalization and bearer-governed remote MCP access
- operator runbooks and release evidence discipline

What Dify adds is the missing **hosted client shell**:

- web apps that update on publish
- API and web deployment surfaces
- external HTTP MCP tool consumption
- app-level moderation hooks
- draft/live version history and restore
- secrets and DSL-based portability

That means Dify should own the **hosted experience**, while CREATE SOMETHING keeps ownership of the **governed runtime**.

## Non-Goals

1. Do not let Dify become the canonical source of truth for policy.
2. Do not register broad raw connector fleets directly in client-facing Dify apps.
3. Do not move managed bearer issuance or entitlement logic into Dify.
4. Do not treat app publishing as equivalent to policy promotion.
5. Do not require desktop-host onboarding for standard client delivery.

## Stack Placement

```text
Client Browser / Customer User
          |
          v
     Dify Web App
  (chatflow / workflow)
          |
          | hosted UI, prompting, app-scoped tool choice
          v
   Dify MCP Tool Surface
  (HTTP MCP servers only)
          |
          v
 CREATE SOMETHING Hub Remote
  (identity, authz, quotas,
   routing, retries, trace)
          |
          v
 Curated MCP fleet / providers


Dify moderation hooks
          |
          v
 CREATE SOMETHING moderation service
  (policy-backed input/output review)


Repo + policy artifacts + runbooks
          |
          v
 Dify publish + Hub deploy + release evidence
```

## Ownership Boundary

| Concern | Dify owns | CREATE SOMETHING owns |
| --- | --- | --- |
| Client-facing UI | web app, embed, chat/workflow experience | branded contract and delivery rules |
| Prompt/application behavior | app instructions, workflow graph, visible tool choices | canonical policy artifact families and runtime policy rules |
| App access | Dify workspace/app access settings | remote bearer issuance, entitlement, actor normalization |
| Content moderation | extension point invocation and app setting | moderation implementation and policy decision logic |
| Tool connectivity | MCP registration inside the workspace | which remote MCP surfaces exist and what they expose |
| Tool execution policy | limited app-level tool selection and fixed params | authz, route class, quotas, retry, fail-closed execution |
| Secrets | workspace env vars for app-local values | managed bearer tokens, provider/OAuth governance, vault rotation |
| Versioning | draft/live versions and restore inside Dify | repo-tracked policy promotion, runbooks, Loom evidence, deploy checkpoints |

## Policy Layers

Dify can manage some policy directly, but not the whole policy stack.

### 1. Access policy

Use Dify for:

- published web app visibility
- authenticated external-user access
- internal workspace-role access
- public/private app access posture

This is the **host access boundary**, not the execution boundary.

### 2. App behavior policy

Use Dify for:

- system instructions
- workflow structure
- tool descriptions
- fixed tool parameters
- app-local memory and iteration settings

This is where the agent learns **how to behave** inside the hosted app.

### 3. Content policy

Use Dify moderation extension points for:

- end-user input review
- LLM output review
- direct block responses
- safe rewrite behavior

But the moderation service itself should be implemented by CREATE SOMETHING, so the rules remain tied to repo-native policy artifacts.

### 4. Execution policy

This must stay in CREATE SOMETHING.

Every Dify-originated MCP action should still pass through the Hub execution pipeline:

1. resolve actor context
2. classify route
3. evaluate authorization
4. enforce quota and rate limits
5. apply retry/backoff policy
6. execute downstream call
7. emit telemetry and trace records

This is the line between "Dify can use the tool" and "the system is allowed to execute the tool."

### 5. Commercial policy

This also stays in CREATE SOMETHING.

Entitlement, billing, contract state, policy acceptance, and bearer issuance should remain governed by the existing runtime and policy artifacts, not by app-local configuration.

## Canonical Policy Ownership

The following repo-native policy families remain authoritative even when Dify is the host:

- `policy.hub-route-authorization.v1`
- `policy.tenant-tool-exposure.v1`
- `policy.user-bearer-token-governance.v1`
- `policy.mcp-credential-delivery.v1`
- `policy.service-tier-entitlement.v1`
- `policy.policy-lifecycle-governance.v1`
- `policy.client-hub-user-experience.v1`

Use Dify configuration to **apply** these decisions at the app surface.
Do not rewrite them as Dify-only product behavior.

## Runtime Standards

### Standard 1: Dify talks to curated Hub endpoints, not the raw fleet

Default rule:

- register one curated CREATE SOMETHING remote Hub per Dify app or client lane
- expose only the tool surface that the app actually needs

Do not point Dify at a raw broad connector catalog unless the lane is intentionally brokered and governed for that breadth.

### Standard 2: Use stable MCP server IDs in Dify

When a Dify app depends on Hub-connected tools:

- the Dify-side MCP server identifier must be stable
- tool selection should be treated as part of the app contract
- environment promotion should preserve the same logical server IDs across development, staging, and production

### Standard 3: Bearer remains the portable host credential

For remote MCP access into CREATE SOMETHING:

- use managed bearer tokens
- resolve tenant-aware actor context at the Hub
- keep upstream provider auth and delegated OAuth governed behind the same model

Do not turn Dify into an independent identity plane for protected MCP execution.

### Standard 4: Dify secrets are app-local, not governance-local

Use Dify environment variables for:

- app-local configuration values
- non-governance service keys
- settings needed to render or route the hosted app

Do not move:

- managed bearer issuance
- provider credential lifecycle
- vault rotation logic
- entitlement-sensitive secrets

out of CREATE SOMETHING control.

### Standard 5: App publish is not policy promotion

Two distinct control loops must exist:

- **Dify publish loop**: makes a draft app live
- **repo policy promotion loop**: changes what is allowed, blocked, approved, or entitled

The app can publish only after the governed policy artifacts it depends on are valid and promoted.

## Three-Tier Mapping

### Database

Repo-native database artifacts remain:

- `docs/policies/`
- identity and entitlement records
- Hub registry, routing, and state
- telemetry and trace outputs
- future Dify app DSL exports and environment contracts

### Automation

Automation spans both systems:

- Dify workflow/chatflow execution
- Dify moderation extension invocation
- Hub proxy execution and routing
- downstream MCP tools and providers

### Judgment

Judgment remains repo-led:

- policy selection
- approval rules
- route authorization
- entitlement gating
- moderation decision logic
- release evidence and rollback posture

Dify is allowed to express judgment settings at the app layer, but CREATE SOMETHING remains the canonical system for policy truth.

## Recommended Repo Artifact Model

Introduce a Dify-first artifact tree rather than treating live Dify apps as opaque external state.

### Recommended source tree

```text
config/dify/
├── apps/
│   └── <app-id>/
│       ├── app.dify.dsl.yaml
│       ├── env.contract.json
│       ├── mcp-servers.json
│       ├── policy-map.json
│       └── publish.md
├── moderation/
│   └── <service-id>.json
└── workspaces/
    └── <workspace-id>.md
```

### Meaning of each file

`app.dify.dsl.yaml`
- exported Dify application definition
- prompt/workflow host artifact

`env.contract.json`
- required environment variables
- secret provenance
- whether the value belongs in Dify or must stay CREATE SOMETHING-managed

`mcp-servers.json`
- stable IDs, URLs, and connection assumptions for Dify MCP registrations

`policy-map.json`
- explicit mapping from the Dify app to repo-native policy IDs and moderation contracts

`publish.md`
- operator checklist for test, publish, rollback, and release evidence

## Delivery Workflow

1. Define or update the client lane in the Hub and policy catalog.
2. Ensure entitlement, bearer, and route-exposure rules are valid.
3. Export or update the Dify app DSL and commit it to the repo.
4. Register the curated remote Hub endpoint in Dify with a stable MCP server ID.
5. Configure Dify env vars only for allowed app-local settings.
6. Wire Dify input/output moderation to a CREATE SOMETHING moderation service.
7. Test in Dify draft mode against golden tasks and guarded tool paths.
8. Publish the Dify version.
9. Record deploy, app version, policy versions, and validation evidence in Loom.

## Relationship To Existing Repo Packages

### `packages/cs-mcp-hub` and remote Hub workers

Remain the canonical execution governance plane for Dify-originated tool calls.

### `packages/mcp-authz` and `packages/policy-os-engine`

Remain the canonical policy runtime and policy compilation layer.

### `packages/identity-worker`

Remains the authority for bearer resolution, entitlement, and normalized actor context.

### `packages/playbook-mcp`

Should become the Dify artifact helper over time:

- app contract lookup
- env contract generation
- MCP registration payload generation
- Dify release verification helpers

### `packages/agency`

Should shift from Goose-first client onboarding toward:

- Dify-first hosted delivery guidance
- client app access documentation
- governance and verification posture
- Goose as an operator or compatibility path only

## Relationship To Goose Distribution

The Goose distribution work is still valid, but its role changes:

- **Goose** becomes an operator and power-user path
- **Dify** becomes the default client-facing hosted path

This repo should not force a single packaging system to do both jobs.

## Rollout Phases

### Phase 0

Document the architecture and agree on the split.

### Phase 1

Add `config/dify/` as a repo-native artifact family and define one exemplar client app.

Status:

- scaffolded with `config/dify/apps/mj-hub/`

### Phase 2

Implement a CREATE SOMETHING moderation service for Dify input/output review, ideally on Cloudflare Workers so it sits near the existing runtime.

### Phase 3

Extend `playbook-mcp` to emit and verify Dify app contracts:

- env contract
- MCP registration payloads
- policy map summaries
- publish checklist scaffolds

### Phase 4

Update `.agency` so client-hosted delivery leads with Dify, while Goose remains available for internal/operator flows and compatibility cases.

## Success Criteria

The Dify-first architecture is working when:

- a client can use one hosted app URL without local MCP setup
- Dify apps only expose curated Hub-governed tools
- moderation decisions are backed by CREATE SOMETHING policy artifacts
- app publish and policy promotion are tracked as separate control loops
- operators can reconstruct a live client app from repo artifacts plus approved secrets
- release evidence ties together Dify publish, Hub state, and policy versions

## Related Docs

- [docs/MCP_FIRST_THESIS.md](./MCP_FIRST_THESIS.md)
- [docs/THREE_TIER_FRAMEWORK.md](./THREE_TIER_FRAMEWORK.md)
- [docs/POLICY_OS_PRODUCT_DEFINITION.md](./POLICY_OS_PRODUCT_DEFINITION.md)
- [docs/MCP_HUB_CONTROL_PLANE.md](./MCP_HUB_CONTROL_PLANE.md)
- [docs/HUB_EXECUTION_GOVERNANCE_PLAN.md](./HUB_EXECUTION_GOVERNANCE_PLAN.md)
- [docs/REMOTE_MCP_IDENTITY_STANDARD.md](./REMOTE_MCP_IDENTITY_STANDARD.md)
- [docs/policies/README.md](./policies/README.md)
- [docs/DISTRIBUTION_PLANE_PRODUCT_SPEC_2026-04-13.md](./DISTRIBUTION_PLANE_PRODUCT_SPEC_2026-04-13.md)

## External Product Notes

Validated Dify product surfaces used in this architecture:

- Key concepts: Dify apps can publish to web, API, or MCP server
- Using MCP tools: Dify can consume external HTTP MCP servers
- Web app settings: published web apps update on publish
- Access control: app visibility and authenticated external-user access
- Version control: draft/live versioning and restore for chatflow/workflow apps
- Manage apps: DSL export/import plus secret-variable handling
- Sensitive content moderation: input/output moderation extension points

Those surfaces make Dify a good **host**, but not a replacement for CREATE SOMETHING's governed runtime and policy system.
