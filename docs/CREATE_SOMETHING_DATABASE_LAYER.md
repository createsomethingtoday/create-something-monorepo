# CREATE SOMETHING Database Layer

The CREATE SOMETHING database layer is the reusable operating substrate behind
Atlas maps, source records, workflow actions, workflow runs, receipts, API/MCP
access, and operator-facing database UI.

`packages/app-governance-db` is the first realized instance of this direction.
It proves the shape for one concrete operating domain: Cloudflare D1 as durable
state, Workers as API/MCP boundary, a dashboard for operators, Atlas as a
first-class database object, and agent-manageable actions/receipts.

It should not become the generic platform by accident. The reusable layer should
absorb the patterns that proved useful while keeping app-review governance
concepts local to that application.

## Product Verdict

This is a healthy progression if the repo keeps three boundaries clear:

1. **Substrate / CREATE SOMETHING database layer** owns reusable database
   primitives: workspaces, source records, schemas, relations, files, audit,
   Atlas bindings, workflow actions, runs, receipts, auth, API, MCP, and the
   fast UI projection over that state.
2. **App Governance & Transparency** owns one application instance: Webflow app
   review sources, findings, categories, marketplace drift, notifications, and
   reviewer workflow.
3. **.agency** owns public buy-in: a safe read-only front-end database demo,
   Canon-aligned images, and plain copy that shows why the layer is different
   before a buyer books.

The unhealthy path would be making `app-governance-db` the platform namespace.
That would trap reusable concepts inside Webflow/app-review terms and make
future client Atlas maps feel like clones of an internal governance dashboard.

## Deep Module Proposal

Concept: CREATE SOMETHING database layer.

Current interface:

- `packages/substrate-mcp` exposes generic workspaces, tables, records,
  relations, files, auth, audit, and a read-only dashboard.
- `packages/app-governance-db` exposes a richer Cloudflare D1/API/MCP/dashboard
  instance with source import runs, source records, Atlas canvases/nodes/edges,
  source-record bindings, source-record relations, workflow actions, workflow
  runs, workflow receipts, transfer reviews, and readiness audits.
- `.agency` currently explains AI workflow systems and stack boundaries, but
  visitors do not yet get a safe hands-on database-layer interaction.

Problem:

- `substrate-mcp` has the right generic ambition but an older stance: "agents
  over UI." The current product direction needs both agent access and a
  meticulous database UI.
- `app-governance-db` has the best realized behavior but its package name,
  README, tables, and tools are application-specific.
- Public `.agency` copy can name the custom database layer, but buy-in will be
  limited until visitors can inspect a safe sample record, Atlas binding,
  action, and receipt in the browser.

Proposed interface:

- Keep `app-governance-db` as the proof instance and adapter.
- Treat `Substrate` as the first-class runtime direction for the reusable layer.
  Keep package naming open only where it affects public distribution, not the
  internal system design.
- The stable reusable interface should be:
  - `workspaces`
  - `sources`
  - `source_records`
  - `source_record_relations`
  - `source_record_atlas_bindings`
  - `atlas_canvases`
  - `atlas_nodes`
  - `atlas_edges`
  - `workflow_actions`
  - `workflow_runs`
  - `workflow_receipts`
  - `files`
  - `events`
  - scoped auth tokens and API keys
- Application packages add domain tables beside that layer, not inside it.

Tier ownership:

| Tier | Owner |
|------|-------|
| Database | D1/R2 schemas, migrations, source records, Atlas topology, workflow state, receipts, auth scopes, audit |
| Automation | Worker HTTP API, MCP tools/resources, import/projection jobs, repair actions, dashboard loaders |
| Judgment | Transfer readiness, review/waiver state, run/wait/stop gates, policy reasons, handoff receipts |

Leverage:

- Client Atlas maps, internal CREATE SOMETHING operations, app governance,
  delivery pages, and future database demos can reuse one substrate instead of
  re-implementing source records, Atlas projection, actions, receipts, and
  audit state per app.
- Agents, MCP clients, dashboards, and desktop shells can operate over the same
  record model.

Locality:

- Cloudflare/D1 quirks, auth, migrations, relation import, Atlas projection,
  and receipt semantics stay in the database-layer package.
- App governance keeps only app-review domain policy, taxonomies, findings,
  marketplace/app sync, and reviewer notifications.
- `.agency` stays a public proof/demo surface, not the canonical state owner.

Test surface:

- Reusable package: typecheck plus public-interface tests for schema creation,
  source-record import, relation insert, Atlas projection, workflow action
  lifecycle, receipt insert, auth scoping, and MCP resource/tool parity.
- App instance: current `packages/app-governance-db` tests continue to prove the
  adapter and governance-specific behavior.
- Public demo: Playwright or route tests prove the safe sample database loads,
  filters locally, selects a row, shows Atlas binding, and shows a receipt.

Migration:

1. Treat `app-governance-db` as the reference implementation.
2. Audit `substrate-mcp` against the app-governance schema and tool surface.
3. Keep `Substrate` first-class as the runtime profile, with
   `@create-something/database-layer` carrying the shared contract and public
   sample state.
4. Extract reusable migrations and types first; leave tools/domain copy in the
   app instance until tests prove the shared surface.
5. Add the public `.agency` read-only database demo from sample records only.
6. Move one second application or client Atlas map onto the shared layer before
   calling it productized.

Rollback note: if extraction creates churn or weakens the app-governance proof,
keep the app-governance implementation intact and document the shared contract
as an adapter target until the second consumer exists.

## Public Buy-In Requirement

The front-end experience must let users feel the difference.

A public database-layer demo should show:

- a compact record table with instant local filtering
- a selected source record
- its Atlas canvas/node binding
- related source-record relations
- the current workflow action or readiness state
- the proof receipt that explains why the state is trustworthy
- a small API/MCP panel showing the same state can be read by agents

The demo must be read-only, sample-backed, and Canon-aligned. The authenticated
workspace can later connect to the real CREATE SOMETHING database layer.

## System Design Bar

Substrate should become the best database experience CREATE SOMETHING can
design for mapped AI workflows. That means:

- topology is data: Atlas canvases, nodes, edges, source bindings, relations,
  geometry, and map state are durable records before they are UI
- execution is inspectable: actions describe what should happen, runs describe
  what happened, and receipts describe why the state can be trusted
- proof is addressable: receipts are queryable by record, type, and source
  through API/MCP/agent paths instead of being buried inside a canvas or queue
- judgment is attached: approvals, waivers, owners, policy reasons, and stop
  states live beside the affected record
- the UI is a projection: browser, desktop, API, MCP, and agents all operate the
  same object model
- large read models are callable: topology, Atlas session, runtime coverage,
  operating slices, and selected record context appear in OpenAPI and MCP tool
  contracts, not only as internal JSON artifacts
- the contract audits itself: API/MCP/agent clients can ask Substrate whether
  every generated resource is covered by a read operation, whether routes are
  duplicated, and whether write-shaped operations remain approval-gated
- the map is windowed: Atlas viewport reads return bounded node/edge payloads,
  level-of-detail metadata, and omission counts so pan/zoom can stay fast on
  dense workflow maps
- the operator path feels Obsidian-like on loaded working sets: local filtering,
  instant selection, direct record URLs, keyboard movement, stable layout, and
  small refreshes
- the shared state remains Cloudflare-native: D1 for relational truth, R2 for
  files/evidence, Workers for API/MCP, and local desktop as an enhancement over
  the same state

This is not a scale-positioning exercise. The product identity is system-design
quality: fast, inspectable, API-first, AI-native, and shaped around CREATE
SOMETHING's workflow topology.

## Marketing Direction

Approved claim:

> CREATE SOMETHING runs workflows on its own custom database layer: Cloudflare
> records, Atlas maps, actions, receipts, and API/MCP/agent access in one
> operating substrate.

Avoid:

- "Notion replacement" as the headline.
- "Faster than Notion" or "faster than Obsidian" until measured.
- Generic "database platform" language as the primary identity.
- Generic database imagery.
- Exposing internal app-governance dashboards as the public buying experience.

Better comparison:

> Notion is a flexible workspace for everyone. CREATE SOMETHING's database
> layer is shaped around one job: mapped AI workflows with source records,
> policies, actions, receipts, API robustness, and agent-readable state.

Better speed framing:

> Obsidian is the feel baseline for active work: fast navigation, local
> filtering, and direct movement between objects. Substrate adds shared
> Cloudflare durability, Atlas topology, API/MCP operation, and receipt-backed
> workflow execution.

## Internal Topology Root

The first real use of Substrate should be CREATE SOMETHING itself.

The internal topology root lives at:

```text
packages/database-layer/data/create-something-internal-topology.json
```

It is generated from repo truth by:

```bash
pnpm --filter @create-something/database-layer topology:generate
```

This artifact is the seed Atlas/Substrate map for everything that powers CREATE
SOMETHING and the client surfaces CREATE SOMETHING manages. It gives every
mapped object a stable `substrate:create-something:*` ID and an Atlas-ready node
ID, then connects packages, apps, workers, policies, guides, Dify configs, MCPs,
agents, and managed client overlays into one root graph.

The root-first rule is:

1. Map CREATE SOMETHING as the canonical topology.
2. Attach client systems as overlays.
3. Promote overlay gaps into workflow actions with owners, policy state, and
   receipts.
4. Only after review, write to external systems such as Notion, Cloudflare,
   Atlas production sessions, Airtable, Webflow, or client destinations.

This keeps client Atlas maps from becoming one-off diagrams. Each client map
inherits the operating model: Substrate records, Atlas topology, API/MCP
operation, actions/runs, receipts, and explicit ownership.
