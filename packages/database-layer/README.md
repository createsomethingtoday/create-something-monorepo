# @create-something/database-layer

Reusable CREATE SOMETHING database-layer contracts, Substrate runtime profile,
and public demo data.

This package gives `.agency`, Substrate, and future clients a stable shape for
showing the database layer without exposing the internal App Governance
dashboard. It is deliberately contract-first: callers should be able to inspect
the system design before they adopt an implementation detail.

The package models:

- source records
- Atlas bindings
- workflow actions
- workflow receipts
- API/MCP capabilities
- performance budgets
- system-design principles
- Substrate runtime boundaries
- client overlay Atlas/Substrate coverage
- Cloudflare runtime binding coverage
- Dify/MCP agent config coverage
- Atlas coverage grouping
- operating slice review and promotion readiness
- operating slice readiness gates
- API/MCP/agent management surface
- CREATE SOMETHING internal operating topology
- CREATE SOMETHING topology completion report
- read-only demo state

`packages/app-governance-db` remains the first realized instance. Substrate is
the first-class runtime direction for the reusable layer: Cloudflare durable
state, API/MCP access, Atlas topology as records, fast UI projection, and
receipt-backed workflow execution. Future extraction should move proven generic
schema and behavior here while leaving app-review-specific concepts in
`app-governance-db`.

The speed bar is an Obsidian-like operator path: direct navigation, local
filtering over active working sets, stable record URLs, and small state refreshes
instead of heavy workspace reloads. That is a design budget, not a benchmark
claim; production claims need measured evidence.

See `docs/CREATE_SOMETHING_DATABASE_LAYER.md` for the product/module direction.

## Agent Legibility Contract

<!-- prettier-ignore-start -->
| Field | Value |
| --- | --- |
| Entry point | `src/index.ts` |
| Boot command | `pnpm --filter @create-something/database-layer build` |
| Smoke command | `pnpm --filter @create-something/database-layer typecheck && pnpm --filter @create-something/database-layer build` |
| Validation surfaces | `test/*.test.mjs`, `data/*.json`, `worker/generated-state.mjs` |
| UI validation path | None; this package exports contracts, generated proof artifacts, and Worker state rather than a UI route. |
| Escalation rule | Escalate before mutating Cloudflare, Atlas production, Dify Studio, Notion, client systems, or other third-party state. |
<!-- prettier-ignore-end -->

## Internal Operating Topology

`data/create-something-internal-topology.json` is the first Substrate-ready root
map for CREATE SOMETHING itself. It is generated from repo truth, not authored
by hand.

The topology includes:

- workspace packages and apps
- Cloudflare Worker configs
- MCP and agent packages
- policy and guide artifacts
- Dify agent/MCP config files
- managed client overlays under `packages/agency/clients`
- stable `substrate:create-something:*` record IDs
- Atlas-ready node IDs and graph edges

Refresh it after topology-affecting changes:

```bash
pnpm substrate:refresh
```

That root command runs the full local Substrate refresh pipeline, rebuilds the
package, regenerates the completion report, 3D projection, Atlas Studio session,
and Worker state, then runs the database-layer tests plus Worker smoke. It fails
if the regenerated completion report contains any local Atlas/Substrate gaps.

Use the package-local command when working directly inside this module:

```bash
pnpm --filter @create-something/database-layer refresh
```

Use `pnpm substrate:refresh:install` to also install the exported Atlas Studio
session into both the repo-local session store and the macOS Atlas Studio
app-data store used by `pnpm atlas:portal`. Use `pnpm substrate:refresh:quick`
only for an inner-loop artifact refresh that intentionally skips tests.

The explicit pipeline is:

```bash
pnpm --filter @create-something/database-layer client-overlays:generate
pnpm --filter @create-something/database-layer runtime-bindings:generate
pnpm --filter @create-something/database-layer agent-configs:generate
pnpm --filter @create-something/database-layer topology:generate
pnpm --filter @create-something/database-layer atlas-coverage:generate
pnpm --filter @create-something/database-layer topology:generate
pnpm --filter @create-something/database-layer operating-slices:generate
pnpm --filter @create-something/database-layer operating-slice-readiness:generate
pnpm --filter @create-something/database-layer management-surface:generate
pnpm --filter @create-something/database-layer worker-state:generate
pnpm --filter @create-something/database-layer build
pnpm --filter @create-something/database-layer topology:report
pnpm --filter @create-something/database-layer topology:3d:generate
pnpm --filter @create-something/database-layer topology:atlas-session
pnpm --filter @create-something/database-layer test
pnpm --filter @create-something/database-layer topology:summary
```

The artifact is intentionally local and reviewable before any Notion,
Cloudflare, Atlas, or client-system write. Coverage artifacts are local proof
objects: they can mark repo-discovered surfaces as `mapped`, but they do not
mutate client systems, Cloudflare, Notion, or Atlas production state.

Use `client-overlays:generate` to create the first client Atlas/Substrate
coverage artifact:

```text
packages/database-layer/data/create-something-client-overlay-coverage.json
```

That artifact scans `packages/agency/clients`, groups package surfaces by
client, and creates Substrate source records, Atlas nodes, proof receipts, and
local review actions. After it exists, `topology:generate` marks those covered
client package nodes as `mapped`; this closes the first Atlas gap wave without
mutating client systems.

Use `runtime-bindings:generate` to create the Cloudflare runtime binding
coverage artifact:

```text
packages/database-layer/data/create-something-runtime-binding-coverage.json
```

That artifact scans `wrangler.toml`, `wrangler.json`, and `wrangler.jsonc`
files, captures binding names and route/project metadata, and creates Substrate
source records, proof receipts, and local review actions. It records variable
keys, not secret values. After it exists, `topology:generate` marks covered
worker config nodes as `mapped`; this closes the Substrate runtime-binding wave
without mutating Cloudflare.

Use `agent-configs:generate` to create the Dify/MCP config coverage artifact:

```text
packages/database-layer/data/create-something-agent-config-coverage.json
```

That artifact scans `config/dify-agents` and `config/dify-mcp-intake`, captures
server references, tool counts, write-tool counts, smoke/eval status, and
secret-reference counts, then creates Substrate source records, proof receipts,
and local review actions. It records references to secret locations already in
repo config, not secret values. After it exists, `topology:generate` marks those
Dify/MCP config nodes as `mapped`; this closes the remaining Substrate config
wave without mutating Dify Studio or MCP hub configuration.

Use `atlas-coverage:generate` after `topology:generate` to create the Atlas
coverage grouping artifact:

```text
packages/database-layer/data/create-something-atlas-coverage.json
```

That artifact reads the current internal topology, groups non-root topology
nodes by tier/surface, and creates Substrate source records, proof receipts, and
local review actions for each Atlas coverage item. Run
`topology:generate` again after it exists; covered nodes are then marked
`mapped`. This can close the local topology gap queue while still requiring
human review before any production Atlas write-back or external mutation.

Use `operating-slices:generate` after Atlas coverage and the second
`topology:generate` pass to create the production-review queue:

```text
packages/database-layer/data/create-something-operating-slice-review.json
```

That artifact turns Atlas coverage groups into review-ready operating slices.
Each slice carries record IDs, owner, tier, surface, evidence paths, validation
commands, an explicit promotion boundary, rollback note, and next action. It is
the bridge from "everything is mapped" to "this specific slice is approved for
workflow use"; it is not permission to mutate Atlas production, Cloudflare,
Dify Studio, client systems, or other third-party state.

Use `operating-slice-readiness:generate` after `operating-slices:generate` to
create the local readiness gate projection:

```text
packages/database-layer/data/create-something-operating-slice-readiness.json
```

That artifact checks each operating slice against the topology records,
declared validation commands, evidence paths, explicit promotion boundary, and
rollback note. Worker slices also join to the Cloudflare runtime binding
coverage artifact so Wrangler config records, worker-package records, binding
refs, route refs, and secret-handling boundaries are visible before any
production workflow promotion.

Use `management-surface:generate` after operating-slice readiness to create
the API-first, MCP-compatible, agent-native control contract:

```text
packages/database-layer/data/create-something-management-surface.json
```

That artifact assigns API paths, MCP resource URIs/tools, and agent commands to
the topology, Atlas session, runtime coverage, every operating slice, and every
slice readiness object. Read operations are inspection-only. Write-shaped
operations create local proposals, approval records, or receipts only; they do
not mutate Cloudflare, Atlas production, Dify Studio, client systems, or other
third-party state without explicit operator approval and the owning promotion
workflow.

The package also exports dependency-free management API helpers:

```ts
import {
  createDatabaseLayerManagementApi,
  createDatabaseLayerManagementEdgeAdapter,
  createDatabaseLayerManagementWorker
} from '@create-something/database-layer';
```

Pass the generated topology, operating-slice review, operating-slice readiness,
and management-surface artifacts into the helper. The returned object can serve
read-only HTTP-style requests, MCP resource reads, MCP tool calls, and
agent-native commands from the same state. It intentionally refuses
write-shaped operations with an `approval_required` response until an owning
promotion workflow implements those writes.

Use `createDatabaseLayerManagementEdgeAdapter` inside a Cloudflare Worker or
similar edge host to serialize the same API responses with JSON, CORS, cache,
`HEAD`, and `OPTIONS` handling. A Worker host can wrap the returned structural
response in the platform `Response` object:

```ts
const result = edge.handleEdgeRequest(request);
return new Response(result.bodyText, {
  status: result.status,
  headers: result.headers
});
```

`createDatabaseLayerManagementWorker` wraps that pattern in a Worker-style
`fetch(request)` handler. In a real Cloudflare Worker, pass the platform
`Response` constructor as the response factory:

```ts
const worker = createDatabaseLayerManagementWorker(state, {
  responseFactory: (body, init) => new Response(body, init)
});

export default {
  fetch: worker.fetch
};
```

The package includes a read-only Worker host under `worker/`. It embeds the
current generated topology/control artifacts via
`scripts/generate-worker-state.mjs`, then serves the same API through Wrangler:

```bash
pnpm --filter @create-something/database-layer worker-state:generate
pnpm --filter @create-something/database-layer-worker smoke
```

The Worker host is deployable, but no production route is configured in this
package. Production deployment and route binding remain approval-gated work.

The read-only Worker host also exposes MCP-style HTTP helpers over the same
contract:

```text
GET /api/substrate/mcp/resources
GET /api/substrate/mcp/resources/{encodedMcpUri}
GET /api/substrate/mcp/tools
GET /api/substrate/mcp/tools/database_layer_get_operating_slice_readiness/call/{sliceSlug}
POST /api/substrate/mcp/rpc
```

Write-shaped MCP tool calls return `approval_required` until a production
approval workflow is implemented.

The JSON-RPC endpoint supports these read methods:

- `resources/list`
- `resources/read`
- `tools/list`
- `tools/call` for read tools such as
  `database_layer_get_operating_slice_readiness`

The exported projection helpers turn the generated topology into:

- Substrate source records
- Atlas node/edge canvas data
- source-record Atlas bindings
- proof/decision/handoff receipts
- workflow actions for `needs_atlas` and `needs_substrate` gaps

Use `topology:summary` after a build to inspect those derived counts without
mutating external systems.

Use `topology:3d:generate` to write the experimental read-only 3D projection:

```text
packages/database-layer/data/create-something-internal-topology.3d.json
```

The 3D artifact is precomputed on purpose: clusters, coordinates, colors, edge
indexes, and click targets are derived ahead of time so the browser viewer can
stay dumb and fast. It is an experiment for cluster discovery only; it does not
own topology truth and does not write back to Atlas, Substrate, or external
systems.

The viewer includes two primary read-only lenses:

- **Operational**: groups records by repo-derived surface, tier, status, and
  runtime shape.
- **Business**: an inferred lens over the same records that groups emerging
  business areas such as MCP capability platform, Cloudflare delivery spine,
  Webflow marketplace ops, policy/judgment OS, client overlays, database
  substrate, and public learning surfaces. This is not a canonical revenue or
  customer taxonomy.

The artifact still contains an **API / AI** analysis lens, but it is treated as a
machine-native lens for MCP/insight reads instead of a primary visual cluster. It
groups records by interface role: agent-callable MCP/tool surfaces, runtime API
delivery, AI orchestration, machine-readable governance, API-readable substrate,
knowledge-to-tool playbooks, client API overlays, public AI distribution, and
reusable capability packages.

The generated artifact also declares `contextApi`, an MCP-shaped control
contract for agent-native use. It defines the view state (`lensId`, `groupId`,
`status`, `tier`, `edgeMode`, `search`, and `selectedNodeId`), resources for
artifact/state/context/node reads, and tools such as:

- `topology3d_context_read`
- `topology3d_context_set`
- `topology3d_node_focus`
- `topology3d_lens_summarize`
- `topology3d_selection_export`
- `topology3d_insights_read`
- `topology3d_group_explain`
- `topology3d_atlas_context_read`
- `topology3d_atlas_story_read`

The package also includes a local stdio MCP runtime for the same contract:

```bash
pnpm --dir packages/database-layer topology:3d:mcp
```

It supports `initialize`, `resources/list`, `resources/read`, `tools/list`, and
`tools/call` for the topology resources and tools above. The browser viewer
exposes the same contract on `window.__topology3dApi` so a local browser bridge
can navigate the 3D space, focus records, switch lenses, and export context
without scraping visual state. These tools are read-only against generated
topology truth: view-state changes may move a local viewer or MCP session, but
writes to Atlas, Substrate, Cloudflare, client systems, or production review
state require a separate governed promotion surface.

The artifact also emits `insights`: generated observations, caveats, structural
cross-group pairings, completed improvements, and improvement candidates.
`topology3d_group_explain` turns one cluster/business/interface group into an
agent-readable packet with dominant surfaces, representative records, inbound and
outbound structural links, linked completed improvements, and linked open
improvement candidates. This lets an agent chat against the topology in a closed
loop: read what is interesting, explain why a group matters, choose an
improvement candidate, focus the relevant cluster or node, complete the
improvement, and export a handoff packet for the next governed implementation
step.

The topology MCP also exposes the associated Atlas session as read-only context.
`topology3d_atlas_context_read` joins a topology node or Atlas node to the Atlas
canvas node, adjacent Atlas edges, story steps, callouts, and topology join IDs.
`topology3d_atlas_story_read` returns the Atlas story, active step, questions,
callouts, and focus topology node IDs without loading the full canvas. This keeps
the 3D topology, Atlas story, and MCP context composable while preserving the
write boundary: Atlas story/proposal/canvas mutation still belongs to the owning
Atlas promotion workflow.

Open the local viewer from a repo-root static server:

```bash
python3 -m http.server 4173
```

Then visit:

```text
http://127.0.0.1:4173/packages/database-layer/experiments/topology-3d/
```

Use `topology:report` after a build to write the machine-readable completion
backlog:

```text
packages/database-layer/data/create-something-internal-topology-completion-report.json
```

The report preserves the current gap totals, groups gaps by surface/tier, lists
managed client overlays, and ranks the first completion wave. That first wave is
the operating bridge from the broad root topology into concrete Atlas/Substrate
completion work.

Use `topology:atlas-session` after a build to export a reviewable Atlas Studio
session artifact:

```text
packages/database-layer/data/create-something-internal-operating-topology.atlas-session.json
```

To install that artifact into the local Atlas Studio session store for browser
review, run:

```bash
pnpm --filter @create-something/database-layer topology:atlas-session -- --install
```

That write is local-only. It creates or updates
`.atlas-studio/sessions/create-something-internal-operating-topology.json`
unless `CREATE_SOMETHING_ATLAS_HOME` points somewhere else.
