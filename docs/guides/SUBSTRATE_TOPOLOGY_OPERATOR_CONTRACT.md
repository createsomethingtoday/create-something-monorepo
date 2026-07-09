# Substrate Topology Operator Contract

This guide defines the agent-facing contract for the generated CREATE SOMETHING topology surface.

The topology is an operating context surface, not a production write surface. It lets an agent inspect repo-derived state, explain clusters, navigate a 3D projection, and export handoff packets for governed follow-up work.

## Ownership

| Field | Value |
| --- | --- |
| Tier | Database |
| Surface | Substrate / topology |
| Source of truth | `packages/database-layer/data/create-something-internal-topology.json` |
| 3D projection | `packages/database-layer/data/create-something-internal-topology.3d.json` |
| Business recommendations | `packages/database-layer/data/create-something-business-operating-recommendations.json` |
| MCP runtime | `packages/database-layer/scripts/topology-3d-mcp.mjs` |
| Human viewer | `packages/database-layer/experiments/topology-3d/` |

The generated artifacts are read models over repo truth. If a finding requires writes to Atlas, Substrate, Cloudflare, client systems, Linear, or production review state, use that system's governed promotion workflow.

## Executor Boundary

Codex native subagents are the default executor for CREATE SOMETHING
Atlas/Topology/Substrate research, review, and handoff work. They should receive
bounded topology questions, read this contract plus the generated agent wiki,
and return a handoff packet rather than mutating production state.

Zellij is not the default manager for Codex subagents in this loop. Use Zellij
only when the worker is a non-Codex terminal agent, such as Claude, Ornith, or
another local executor, or when the outcome specifically needs visible terminal
proof that Codex can inspect through Zellij commands.

Claude remains a Webflow-work-only surface in this repo. Do not route CREATE
SOMETHING Atlas/Topology/Substrate work through Claude unless the task is
Webflow-owned and Claude owns the required Webflow connector evidence.

## MCP Resources

| URI | Purpose |
| --- | --- |
| `topology3d://create-something/internal/artifact` | Complete generated 3D topology artifact. |
| `topology3d://create-something/internal/lenses` | Lens labels, groups, counts, and meanings. |
| `topology3d://create-something/internal/state` | Current local MCP session view state. |
| `topology3d://create-something/internal/context` | Resolved context snapshot for the active view. |
| `topology3d://create-something/internal/node/{nodeId}` | Single topology node with adjacent edges and lens memberships. |
| `topology3d://create-something/internal/insights` | Generated observations, caveats, completed improvements, and open improvement candidates. |
| `topology3d://create-something/internal/atlas-session` | Exported Atlas Studio session associated with this topology projection. |
| `topology3d://create-something/internal/atlas-story` | Atlas story, callouts, questions, and guided navigation steps. |
| `topology3d://create-something/internal/atlas-node/{atlasNodeId}` | Single Atlas canvas node joined back to its topology node and adjacent Atlas edges. |

## MCP Tools

| Tool | Class | Use |
| --- | --- | --- |
| `topology3d_context_read` | Read | Read a filtered context snapshot without changing session state. |
| `topology3d_context_set` | View state | Set local lens, group, status, tier, edge mode, search, or selected node. |
| `topology3d_node_focus` | View state | Focus a node and return lens memberships plus adjacent edges. |
| `topology3d_lens_summarize` | Read | Summarize a lens by group counts, meanings, surfaces, and status. |
| `topology3d_selection_export` | Read | Export selected and visible context as a compact handoff packet. |
| `topology3d_insights_read` | Read | Read generated observations, structural pairings, and improvement loop state. |
| `topology3d_group_explain` | Read | Explain one group with representative records, classification evidence, directional links, and linked recommendations. |
| `topology3d_atlas_context_read` | Read | Join a topology node or Atlas node to the associated Atlas canvas node, adjacent Atlas edges, story steps, callouts, and topology IDs. |
| `topology3d_atlas_story_read` | Read | Read Atlas story steps, active step, callouts, questions, and focus topology joins without loading the full canvas. |

View-state tools mutate only the local MCP session. They do not mutate topology truth.

## Agent Workflow

1. Call `topology3d_insights_read` to understand current observations and open candidates.
2. Call `topology3d_group_explain` for the relevant group before drawing conclusions from a visual cluster.
3. Use `topology3d_context_set` or `topology3d_node_focus` to align local view state with the question.
4. Use `topology3d_selection_export` when handing a cluster, node, or finding to another agent or workflow.
5. Read `packages/database-layer/data/create-something-business-operating-recommendations.json` or `/api/substrate/business/recommendations` when the question is about business operating lanes, client delivery packets, worker runtime review, or policy/guide attachments.
6. If the next action requires writes, create or use the owning governed workflow outside this topology MCP.

For multi-agent review, split work by operating slice, lens, group, package, or
explicit topology node. Each subagent should return only the evidence needed for
the supervisor to accept, reject, or split the finding. The supervisor remains
responsible for synthesis, Linear evidence, validation, and the done decision.

## Read And Write Boundary

Allowed through this contract:

- read generated topology artifacts
- read generated insights
- explain repo-derived groups and relationships
- join topology nodes to read-only Atlas session, story, and canvas context
- change local view state
- export handoff packets

Not allowed through this contract:

- write Atlas records
- change Atlas story state, proposal action state, or canvas state
- write Substrate source records
- deploy or mutate Cloudflare resources
- change client systems
- change Linear issue state
- approve production review status
- infer revenue, customer priority, or roadmap truth as authoritative

The topology can suggest where those actions may be needed. It cannot authorize or perform them.

## Handoff Packet Requirements

Every handoff from this surface should include:

- `topologyId`
- `atlasCanvasId`
- active `lensId`
- active `groupId`
- selected `nodeId` and path
- selected `atlasNodeId` when available
- visible node and edge counts
- group meaning or node meaning
- linked improvement candidate or completed improvement id
- validation command or evidence path for the next workflow
- relevant business recommendation lane, when the handoff maps to Substrate product surface, worker runtime review, client overlay delivery, or policy/guide attachment

`topology3d_selection_export` returns this shape directly.

## Validation

After changing this contract or the topology MCP runtime, run:

```bash
pnpm --dir packages/database-layer refresh
```

For a narrower loop while editing:

```bash
node packages/database-layer/scripts/generate-topology-3d.mjs
node --check packages/database-layer/scripts/topology-3d-mcp.mjs
node --test packages/database-layer/test/topology-3d.test.mjs packages/database-layer/test/topology-3d-mcp.test.mjs
packages/database-layer/node_modules/.bin/tsc -p packages/database-layer/tsconfig.json --noEmit
```

The contract is valid only when the generated insights show `substrate-operator-contract` as completed rather than open.
