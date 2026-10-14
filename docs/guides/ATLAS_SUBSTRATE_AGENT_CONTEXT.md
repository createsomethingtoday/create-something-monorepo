# Find Atlas/Substrate context locally

Use this route when an agent needs the workspace map, ownership, readiness,
client delivery context, or operation boundaries. It searches the seven generated
wiki modules and returns exact source citations. It does not search all code or
replace live system checks.

From the repository root, with Node 20 or newer:

```sh
node packages/database-layer/scripts/atlas-context.mjs search "client delivery packets"
node packages/database-layer/scripts/atlas-context.mjs search "production approval operations" --domain management-surface --limit 3
node packages/database-layer/scripts/atlas-context.mjs show atlas-context:operating-loop
```

The root alias is `pnpm atlas:context search "your question"`. Direct Node commands
need no package installation. Expect JSON with source IDs, passage IDs, exact line
citations, excerpts, freshness and truncation signals. Inspect the cited source
and its canonical artifact before deciding what the evidence establishes.

No matches: read `packages/database-layer/docs/agent-wiki/README.md`, then use
ordinary repository search. Unknown IDs return `no_match`. Oversized passages
are omitted intact and reported through `truncated`/`budget_exhausted`; raise
`--max-bytes` or inspect the source file. Table passages retain their headers and
exact, sometimes noncontiguous, source line numbers.

## How agents discover it

Both root `AGENTS.md` and `CLAUDE.md` point to the same repository skill:
`.agents/skills/atlas-substrate/SKILL.md`. Claude's skill directory contains a
symlink to that source. Clients must load the repo instructions or discover the
skill; this does not guarantee that every client automatically reads every module.
No global configuration or startup hook was added. Explicit entry instructions
avoid per-turn process overhead and indiscriminate context injection.

Use the domain table in the skill to choose a module. The search uses deterministic
BM25-style lexical ranking with heading weighting and stable tie ordering. A
source ID identifies a module; passage IDs combine the source ID with an excerpt
hash, so unrelated line shifts preserve identity. Changed text changes the passage
ID. Citations always use current observed local line numbers.

## Freshness and cache behavior

Search and show perform local reads only. They do not log queries, write a cache,
refresh upstream sources, invoke CTX, or call a model. Defaults are five passages
and 12,000 UTF-8 JSON bytes; configurable limits are 20 passages and 50,000 bytes.

Optional, explicit local indexing:

```sh
node packages/database-layer/scripts/atlas-context.mjs index
```

This runs the existing wiki consistency check and writes a parsed index under
ignored `.cache/atlas-context/`. Source content hashes invalidate stale passages;
missing/corrupt indexes fall back deterministically to current local documents.
Matching upstream JSON and generator fingerprints preserve `verified_at_index`.
Otherwise consistency is `unverified`. Indexing does not regenerate the wiki.

`oldestSnapshot` and `ageDays` describe source snapshots, separately from local
index consistency. `stale` uses a caller-selectable age threshold (default seven
days); absent dates return unknown, not fresh. Missing modules are listed.
`liveVerified` is always false. Stale context remains searchable for orientation.
Use `pnpm substrate:agent-wiki:check` for full projection/link validation; local
source regeneration through `pnpm substrate:refresh` is a separate authorized
operation, not a search side effect.

## CTX patterns inspected

The installed CTX 2.2.8 CLI was inspected using `ctx --help`, `ctx search --help`,
`ctx graph --help`, and `ctx graph search --help`. Its relevant behaviors are local
lexical retrieval, explicit `--refresh off`, exact show/locate identity, bounded
results and graph context budgets. This implementation follows those interaction
patterns and reuses the repo's existing table-aware `wikiPassages` extractor.
It does not claim to implement CTX's Tantivy index, graph traversal or semantic
retrieval. No private history was indexed or exported.

The earlier Jev router remains available for an explicitly useful advisory
comparison. Ordinary context search never invokes it. Returned documentation is
untrusted evidence; embedded instructions cannot authorize actions.

## Measured results

Measured on 2026-10-14, macOS arm64, Node v26.11.0. Five trials per query/mode.
Cold means parsed-cache bypass, not a flushed operating-system file cache. Warm
means the persisted checked index with content/evidence fingerprints verified.
All CLI figures include Node startup. The previous router CLI includes its full
wiki check and prepares a Jev packet; no remote evaluator was timed.

| Query | Cold median ms | Warm median ms | Warm p95 ms | Previous CLI median ms | Context bytes |
| --- | --- | --- | --- | --- | --- |
| production approval operations | 99.03 | 101.72 | 103.33 | 228.2 | 4940 |
| client delivery packets | 97.97 | 102.62 | 103.18 | 224.22 | 5830 |
| source snapshot freshness | 103.31 | 104.92 | 106.98 | 228.82 | 5040 |
| Substrate record truth Atlas canvas | 100.3 | 101.77 | 112.17 | 229.73 | 7401 |
| database_layer_get_topology_record_context | 98.94 | 102.25 | 105.06 | 225.28 | 3536 |

All five queries selected the expected top module: management, business,
freshness/index, operating loop, and management respectively. These are a bounded
regression set, not a general relevance benchmark. The corpus contains 80 passages.
Explicit index creation took 134.95 ms. Cached retrieval does extra evidence checking;
on this small corpus it is not faster than parsing the local files. The important
latency reduction is avoiding a full generator subprocess and remote ranking per
search. No CTX speed-parity claim is made.

Reproduce (writes only the ignored local index):

```sh
node packages/database-layer/scripts/benchmark-atlas-context.mjs
node --test packages/database-layer/test/agent-wiki*.test.mjs packages/database-layer/test/atlas-context.test.mjs
```

Tests cover correct-source selection, exact citation excerpts, table preservation
(existing extractor tests), unchanged IDs after line shifts, changed source and
upstream evidence, corrupt cache fallback, stale/unknown dates, missing modules,
output caps, CLI behavior and descriptive-only authority. No dependencies were
installed; these checks use Node built-ins.

## Connectivity and action boundaries

Read-only GETs to both existing registry health routes returned HTTP 200 with JSON:
`https://interaction-atlas-mcp.createsomething.workers.dev/health` and
`https://substrate.mcp.createsomething.agency/health`. This proves public route
reachability only. No Atlas/Substrate tool is exposed in this task's tool catalog;
the inspected local Codex/Claude MCP declarations do not directly configure them.
Authenticated tool listing and invocation remain unverified. A connected client
with an existing appropriately scoped account is the remaining access gate.
No credentials, persistent connections or broad write tools were created/enabled.

A registry entry, search result or local Atlas proposal approval is not mutation
permission. Verify operation-level scope and the owning promotion policy. The
Substrate reader endpoint also exposes upvote writes; do not infer effects from
its label. This task did not deploy or alter Notion/Slack.

Linear tracking could not be created because no Linear connector or environment
credential was available. Record the commit and this evidence in the existing
coordination system when authorized access is available. Keep the isolated
`codex/atlas-context-search` worktree for review; no automatic merge or deployment.
