# Understanding: @create-something/app-reviewer-airtable-mcp

This package exposes App Reviewer Airtable state to MCP clients through a small bounded-access surface over two tables: `Assets` and `Asset Versions`.

## Ontological Position

**Mode of Being**: Operational MCP package

The package makes a large Airtable base usable by agents without forcing them to dump whole tables or use generic Airtable mutation tools. Its main design burden is performance plus bounded mutation: every useful read should be filterable, projected, and paginated, and every write should go through an explicit field allowlist.

## Three-Tier Mapping

| Tier | MCP Primitive | Role |
|------|---------------|------|
| Database | Resources | Field map, performance policy, workflow contract, account policy |
| Automation | Tools | Airtable list/get operations plus allowlisted update tools over `Assets` and `Asset Versions` |
| Judgment | Prompts | Reviewer investigation policy for narrow traversal, sensitive-field handling, and routed review-status writes |

## Depends On

| Dependency | Why It Matters |
|------------|----------------|
| Airtable REST API | Source of truth for reviewer asset/version state |
| Infisical/runtime env | Holds `AIRTABLE_API_KEY`; secrets must not live in repo files |
| `@create-something/mcp-core` | Account scoping, bounded-write policy metadata, stdio transport helpers |
| `@modelcontextprotocol/sdk` | MCP server protocol implementation |
| `zod` | Tool/prompt input validation |

## Internal Structure

```text
src/
├── index.ts                 -> stdio entry point
├── server.ts                -> scoped MCP server setup
├── auth.ts                  -> runtime Airtable secret resolution
├── services/airtable.ts     -> no-SDK Airtable REST client with projection, pagination, and allowlisted PATCH support
├── tools/index.ts           -> read and bounded-write tool catalog
├── resources/index.ts       -> field map, performance policy, workflow resources
├── prompts/index.ts         -> reviewer investigation prompt
└── schemas/index.ts         -> table ids, field ids, presets, tool enums

worker/
├── index.ts                 -> Cloudflare Worker entry point with /health
└── wrangler.toml            -> Worker config; token supplied as secret
```

## Key Concepts

| Concept | Definition | Where |
|---------|------------|-------|
| Projection preset | Named field-id list that prevents accidental large Airtable reads | `src/schemas/index.ts` |
| `nextOffset` | Airtable pagination cursor returned to the caller | `src/services/airtable.ts` |
| Sensitive fields | Credentials/internal-note fields excluded unless explicitly requested | `src/schemas/index.ts`, `src/services/airtable.ts` |
| Bounded write policy | MCP policy that communicates write support only through explicit allowlisted tools | `src/auth.ts` |
| Dry-run writes | Mutation validation path that returns planned field names without PATCHing Airtable | `src/services/airtable.ts`, `src/tools/index.ts`, `worker/index.ts` |
| Derived field routing | Review summary fields on Assets are rejected with hints to update Asset Versions instead | `src/schemas/index.ts`, `src/services/airtable.ts` |

## Validation Surfaces

- TypeScript typecheck.
- Unit tests for Airtable request projection/pagination behavior and write-field validation.
- Package build.
- Worker `/health` for runtime table/base configuration.
- Representative read MCP tool call with Infisical-provided `AIRTABLE_API_KEY`.
- Representative dry-run write MCP tool calls for both Assets and Asset Versions.

## Escalation Rule

Stop and update this package before production use if:

- Airtable table IDs or field IDs drift.
- The runtime cannot source `AIRTABLE_API_KEY` from Infisical/Worker secrets.
- A reviewer workflow requires fields outside the explicit write allowlist.
- A list operation requires more than the 100-record page cap instead of cursor-based paging.

*Last validated: 2026-06-19*
