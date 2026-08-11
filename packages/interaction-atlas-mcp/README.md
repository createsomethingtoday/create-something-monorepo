# @create-something/interaction-atlas-mcp

AI Interaction Atlas mapping server for MCPs and agents with:

- versioned workflow visualizations,
- operator-selectable versions,
- policy-driven Judgment tuning,
- pre/post estimate reports with shareable URLs.

## Core Flows

### Arc presentation catalog

The Atlas composition tools expose the public, registry-backed Arc catalog while keeping
write authority outside the presentation layer:

- `atlas_composition_list` lists all 54 Arc summaries.
- `atlas_composition_get` resolves a generated Arc or the App Review Governance prototype.
- `atlas_composition_resolve_map_module` returns the pinned reusable map for any Arc.
- `atlas_composition_propose_local_action` remains limited to the hand-authored App Review
  prototype; generated catalog Arcs are read-only.

The catalog uses the same source registries as Playbook MCP. It does not create a second
graph, permission model, story ledger, or execution ledger.

### 0) Atlas Studio browser portal

For Codex-led client mapping, use MCP as the agent-native control plane and the browser portal as the presentation layer.

Primary launcher tool:

- `atlas_studio_portal_start` -> starts or reuses the local browser portal and returns `openUrl`.

Session and canvas tools:

- `atlas_studio_portal_status`
- `atlas_studio_portal_stop`
- `atlas_studio_session_create`
- `atlas_studio_session_list`
- `atlas_studio_session_show`
- `atlas_studio_observe`
- `atlas_studio_node_add`
- `atlas_studio_edge_add`
- `atlas_studio_suggestion_accept`
- `atlas_studio_tidy`
- `atlas_studio_heal`
- `atlas_studio_propose_writeback`
- `atlas_studio_proposal_action_review`
- `atlas_studio_proposal_handoff`
- `atlas_studio_export`

The local fallback command is:

```bash
pnpm atlas:portal --client "Client" --workflow "Workflow" --owner "Operator"
```

For the CREATE SOMETHING Template System map, bind and reconcile the canvas against
repo-owned production primitive definitions:

```bash
pnpm atlas:desktop:studio heal --session <session-id> --profile template-system
pnpm atlas:desktop:studio propose --session <session-id> --profile template-system
pnpm atlas:desktop:studio proposal-action --session <session-id> --proposal <proposal-id> --action <action-id> --status approved
pnpm atlas:desktop:studio proposal-handoff --session <session-id> --proposal <proposal-id>
```

This is a read-only production sync. It attaches structured bindings to known canvas
nodes and checks repo-owned production contracts such as Wrangler files, MCP registry
entries, Dify inventory/DSL files, Webflow Cloud configs, delivery manifests, and policy
docs. It updates the local Atlas session with `synced`, `partial`, `missing`, or
`unbound` state, but it does not deploy, rotate secrets, mutate Airtable, or change
production review status.

The proposal command runs the same binding check and writes an approval-gated
change plan back into the local Atlas session. Proposal actions are grouped as
`safe`, `review`, or `approval` based on the underlying primitive. They are review
artifacts only; applying a proposal still requires the owning repo, platform, or
deployment workflow.

Use proposal-action review to mark a proposal item `approved`, `rejected`, or
back to `proposed`. This updates only the local Atlas session and adds a review
observation; it is not an apply step.

Use proposal-handoff to export a Codex-ready markdown packet from the reviewed
proposal. The handoff separates approved implementation candidates from pending
and rejected actions and repeats the production safety boundary.

For a client-facing projection of an existing mapping session, use the read-only
Map-to-Build handoff:

```bash
pnpm atlas:desktop:studio client-handoff --session <session-id>
```

The browser portal exposes the same artifact at
`/api/sessions/<session-id>/client-handoff.md`. It projects the internal Atlas
session into public `Map -> Build -> Control` language, separates mapped facts,
Build candidates, Control boundaries, proof, and open questions, and never
approves or applies production changes. The existing `export` command remains
the internal Atlas operator export.

Both MCP tools and CLI commands use the same app-data store:

```text
~/Library/Application Support/CREATE SOMETHING/Atlas Studio
```

### Shared canvas kernel

Atlas Studio renders topology maps through the shared
`@create-something/canvas-kernel` package. The kernel is intentionally
domain-neutral so Atlas, Substrate, and future Topology surfaces can reuse the
same pan, zoom, fit, focus, label, hit-test, and WebGPU-first rendering
behavior.

Adapters should stay thin:

- map their domain records to `{ id, label, kind, status, x, y, width, height }`
  nodes and `{ id, source, target }` edges,
- pass a surface palette and control inputs for fit/focus,
- keep product-specific overlays, story steps, inspector panels, and policy
  actions outside the kernel.

The shared agent-readable canvas state contract is
`flow.shared-canvas-state.v1`, also exported by
`@create-something/canvas-kernel/shared-canvas-state`:

```ts
type SharedCanvasState = {
  version: 'flow.shared-canvas-state.v1';
  renderer: 'canvas-kernel';
  viewport: { x: number; y: number; width: number; height: number; zoom: number };
  visibleNodeIds: string[];
  selectedNodeId: string | null;
  lens: string;
  query: string;
  focusedNodeIds: string[];
  storyStepId: string | null;
  joins: { substrateRecordId: string; topologyNodeId: string; atlasCanvasId: string; atlasNodeId: string }[];
};
```

MCP resources and tools that operate on Atlas/Substrate/Topology should expose
or accept that contract rather than renderer-specific DOM details. The browser
surface publishes renderer readback via `data-atlas-renderer="canvas-kernel"`,
`data-render-backend`, `data-node-count`, `data-edge-count`, and `data-viewport`
on the canvas root for verification and agent control.

### 1) Mapping + visualization URLs

The following tools now return visualization URLs and decision metadata:

- `workflow_get`
- `workflow_mermaid`
- `workflow_map_from_tool_sequence`
- `mcp_map_to_workflow`

Common output fields include:

- `resolvedVersion`
- `selectionSource`
- `commitSha`
- `policyVersionId`
- `activePolicyVersionId`
- `visualizationUrl`
- `judgmentDecision`
- `estimateReference` (latest estimate report id when available)

### 2) Version selection

- `version_selection_get` -> read default/latest selection for an entity.
- `version_selection_set` -> set account default version for an entity.

Resolution order at runtime:

1. per-request override (`versionId` or `commitSha`) if allowed,
2. account default version,
3. latest version.

### 3) Judgment policy tuning

Policy lifecycle tools:

- `judgment_dashboard_summary`
- `judgment_policy_get`
- `judgment_policy_save`
- `judgment_policy_activate`
- `judgment_policy_estimate`
- `judgment_policy_compare_report_get`

`judgment_policy_estimate` returns:

- `inlineSummary` (before/after deltas),
- `reportId`,
- `reportUrl`.

### 4) Minimal control plane surfaces

New MCP tools for operator workflows:

- `automation_contract_list`
- `automation_contract_get`
- `automation_contract_upsert`
- `automation_run_start`
- `approval_inbox_list`
- `approval_inbox_decide`

## HTTP Endpoints

- `GET /workflows`, `GET /mcps` (viewer pages)
- `GET /api/dashboard/summary` (Atlas Studio dashboard payload; optional `entity_type`, `entity_id`, `recent_limit`)
- `GET /api/sessions/:sessionId/story` (Atlas Story API v1 payload)
- `POST /api/sessions/:sessionId/story` (set Story API v1 focus; accepts camelCase, snake_case, or `story_artifact` / Canon `PublicAtlasStoryArtifact`-compatible chapters)
- `DELETE /api/sessions/:sessionId/story` (clear transient story focus while preserving questions)
- `POST /api/sessions/:sessionId/story/questions` (add a validation question)
- `POST /api/sessions/:sessionId/story/steps/:stepId/activate`
- `POST /api/sessions/:sessionId/story/next`
- `POST /api/sessions/:sessionId/story/previous`
- `GET /policies` and `GET /policies/editor` now return MCP-first deprecation payloads by default.
  - Use `legacy_ui=1` query param to temporarily access old pages.
- `GET /reports/:reportId` (shareable estimate report page)
- `GET /api/policies?entity_type=<mcp|agent>&entity_id=<id>`
- `GET /api/reports/:reportId`
- `GET /api/automations` (active automation contracts for account)
- `GET /api/automations/:automationId` (active contract details)
- `GET /api/inbox` (pending approval requests)

Story API responses include:

- `meta.apiVersion: 1`
- `meta.storyContract: "atlas-story-v1"`
- `meta.invalidFocusNodeIds` and `meta.invalidFocusEdgeIds`
- `story`
- `session`

## Auth Scope

Policy/report/dashboard APIs are account-scoped by authenticated context (`x-api-key` or Bearer token).

- `meta.authScope = "account"` is returned for policy/report JSON APIs and policy/version MCP tool responses.
- Missing key resolves to public read-only context.

### API key role binding

`API_KEYS` supports optional role suffix:

- `key:account`
- `key:account:role`

Supported roles:

- `admin`
- `operator`
- `auditor`
- `readonly`

`admin` and `operator` can mutate policy/version/control-plane state. `auditor` and `readonly` are read-only.

### Reactive MCP Tool Access Kill Switch

For incident response, set `MCP_TOOL_ACCESS_MODE` in Worker env/secrets:

- `normal` (default): standard behavior.
- `read_only`: only read-only MCP tools are exposed; all write tools are hidden.
- `off`: all MCP tools are hidden (tool calls fail as unknown tool).

This control applies at server registration time through `@create-something/mcp-core` policy constraints (`mcpToolAccessMode`) and is intended as a fast containment lever.

Quick ops commands (run from `worker/`):

```bash
# Full stop
printf 'off' | wrangler secret put MCP_TOOL_ACCESS_MODE --config wrangler.toml
wrangler deploy --config wrangler.toml

# Containment without full outage
printf 'read_only' | wrangler secret put MCP_TOOL_ACCESS_MODE --config wrangler.toml
wrangler deploy --config wrangler.toml

# Restore normal
printf 'normal' | wrangler secret put MCP_TOOL_ACCESS_MODE --config wrangler.toml
wrangler deploy --config wrangler.toml
```

### Reactive abuse guard (auto kill + report)

The server can auto-switch an account to `off` when a suspicious blocked-call pattern is detected.

Env controls:

- `ABUSE_GUARD_ENABLED=true|false` (default `true`)
- `ABUSE_WINDOW_SECONDS` (default `300`)
- `ABUSE_BLOCK_THRESHOLD` (default `8`)
- `ABUSE_DISTINCT_TOOLS_THRESHOLD` (default `2`)
- `ABUSE_RESPONSE_MODE=auto_off|review` (default `auto_off`)

Reporting/control MCP tools:

- `judgment_security_status_get`
- `judgment_security_incident_review_next`
- `judgment_security_access_set`
- `judgment_security_incident_resolve`

## Ops Handoff (Role Test Checklist)

Use this checklist after key rotation or environment changes.

1. Confirm role/account resolution via MCP `auth_whoami`:
   - `admin` -> `accountId=<tenant>`, `role=admin`, `readOnly=false`
   - `operator` -> `accountId=<tenant>`, `role=operator`, `readOnly=false`
   - `auditor` -> `accountId=<tenant>`, `role=auditor`, `readOnly=true`
   - `readonly` -> `accountId=<tenant>`, `role=readonly`, `readOnly=true`
2. Confirm read APIs are account-scoped:
   - `GET /api/automations`
   - `GET /api/inbox`
3. Confirm write paths:
   - `operator` can call `automation_contract_upsert` and `judgment_policy_save`
   - `auditor` and `readonly` cannot call write tools (tool hidden in read-only mode)
4. Confirm policy activation consistency:
   - activating policy version `B` demotes prior active version `A` to `draft`
5. Confirm DB invariants:
   - only one active automation contract per `(account_id, automation_id)`
   - autonomous contracts require non-`none` assignment mode

### Quick verify commands

Replace `ATLAS_HOST` and `KEY`:

```bash
# whoami
curl -sS \
  -H "accept: application/json, text/event-stream" \
  -H "x-api-key: KEY" \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":"who","method":"tools/call","params":{"name":"auth_whoami","arguments":{}}}' \
  "ATLAS_HOST/mcp"

# account-scoped automations list
curl -sS -H "x-api-key: KEY" "ATLAS_HOST/api/automations"
```

## D1 Migrations

Apply migrations in order:

1. `worker/migrations/0001_versions_visualizations.sql`
2. `worker/migrations/0002_judgment_policy.sql`
3. `worker/migrations/0003_automation_registry.sql`
4. `worker/migrations/0004_runs_approvals_audit.sql`
5. `worker/migrations/0005_policy_activation_governance.sql`
6. `worker/migrations/0006_control_plane_invariants.sql`
7. `worker/migrations/0007_polar_artifacts.sql`
8. `worker/migrations/0008_judgment_event_correlation.sql`
9. `worker/migrations/0009_security_response.sql`
10. `worker/migrations/0010_security_incident_claims.sql`
11. `worker/migrations/0011_authz_tables.sql`
12. `worker/migrations/0012_policy_os_scaffold.sql`

Ensure `worker/wrangler.toml` has a valid D1 `database_id` before deploy.
Use `worker/migrations/ROLLOUT.md` for apply order, post-migration checks, and rollback guidance.

## Land-The-Plane Checklist

To complete production readiness for Atlas + Judgment control-plane persistence:

1. Set the target `database_id` in `worker/wrangler.toml`.
2. Apply all migrations to the target D1 database.
3. Verify trigger-based invariants:
   - one active automation contract per `(account_id, automation_id)`,
   - autonomous execution requires non-`none` assignment mode in contract `spec_json`,
   - approval transitions only from `pending`,
   - `awaiting_approval` run state requires a pending approval row.
4. Run end-to-end verification against deployed worker:
   - mapping tools return visualization URLs,
   - policy save/get/activate paths resolve correct active version,
   - estimate reports persist and are retrievable via URL/API,
   - approval and run events are queryable for audit replay.

## cURL Examples

Replace:

- `ATLAS_HOST` with your worker host (for example `https://interaction-atlas-mcp.example.com`)
- `API_KEY` with your account-scoped key

### Get active policy for an entity

```bash
curl -sS \
  -H "x-api-key: API_KEY" \
  "ATLAS_HOST/api/policies?entity_type=agent&entity_id=fleet-watchdog"
```

### Save a draft policy (MCP tool call)

```bash
curl -sS \
  -H "x-api-key: API_KEY" \
  -H "content-type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "tools/call",
    "params": {
      "name": "judgment_policy_save",
      "arguments": {
        "entity_type": "agent",
        "entity_id": "fleet-watchdog",
        "status": "draft",
        "policy": {
          "id": "policy-fleet-watchdog-v2",
          "name": "Fleet Watchdog v2",
          "rules": [
            {
              "id": "rule-review-write",
              "priority": 10,
              "when": { "hasWriteIntent": true, "hasHumanReviewStep": false },
              "then": {
                "decision": "require_human_review",
                "reason": "Write intent requires explicit human review."
              }
            },
            {
              "id": "rule-default-allow",
              "priority": 999,
              "when": {},
              "then": { "decision": "allow", "reason": "Default allow." }
            }
          ]
        }
      }
    }
  }' \
  "ATLAS_HOST/mcp"
```

### Run policy estimate (inline + report URL)

```bash
curl -sS \
  -H "x-api-key: API_KEY" \
  -H "content-type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "2",
    "method": "tools/call",
    "params": {
      "name": "judgment_policy_estimate",
      "arguments": {
        "entity_type": "agent",
        "entity_id": "fleet-watchdog",
        "scenarios": [
          { "id": "s1", "toolName": "workflow_get", "hasWriteIntent": false, "hasHumanReviewStep": true, "introspectionOk": true },
          { "id": "s2", "toolName": "workflow_map_from_tool_sequence", "hasWriteIntent": true, "hasHumanReviewStep": false, "introspectionOk": true },
          { "id": "s3", "toolName": "mcp_map_to_workflow", "hasWriteIntent": true, "hasHumanReviewStep": true, "introspectionOk": false }
        ]
      }
    }
  }' \
  "ATLAS_HOST/mcp"
```

### Activate a saved policy version

```bash
curl -sS \
  -H "x-api-key: API_KEY" \
  -H "content-type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "3",
    "method": "tools/call",
    "params": {
      "name": "judgment_policy_activate",
      "arguments": {
        "entity_type": "agent",
        "entity_id": "fleet-watchdog",
        "policy_version_id": "pol_example_version_id"
      }
    }
  }' \
  "ATLAS_HOST/mcp"
```

### Fetch a saved estimate report (JSON API)

```bash
curl -sS \
  -H "x-api-key: API_KEY" \
  "ATLAS_HOST/api/reports/rep_example_report_id"
```

### Open shareable report page

```bash
open "ATLAS_HOST/reports/rep_example_report_id"
```
