# Understanding: @create-something/ziprecruiter-mcp

> **ZipRecruiter MCP for Abundance nurse staffing**

## Ontological Position

**Mode of Being**: Operational MCP package

This package makes ZipRecruiter legible and governable inside the Abundance nurse staffing workflow. It fronts the live partner API, preserves a local canonical record of jobs and applications, and keeps webhook side effects visible through D1 and MCP resources.

## Depends On

| Dependency | Why It Matters |
|------------|----------------|
| `@create-something/mcp-core` | Scoped server primitives, auth/provider surface, and shared MCP transport helpers |
| `@modelcontextprotocol/sdk` | MCP protocol implementation |
| `.agency` D1 (`DB`) | Canonical staffing jobs, candidates, applications, and ZipRecruiter logs |
| `.agency` R2 (`STORAGE`) | Raw resume artifact persistence outside canonical rows |
| Infisical | Secret delivery for local dev and secret-sync source of truth |

## Internal Structure

```text
src/
├── index.ts             → stdio entry point
├── server.ts            → shared scoped MCP server
├── auth.ts              → runtime auth and env resolution
├── runtime.ts           → typed runtime metadata accessors
├── schemas/             → ZipRecruiter and MCP input contracts
├── services/api.ts      → ZipRecruiter HTTP client
├── signature.ts         → Apply Webhook signature verification
├── storage.ts           → D1/R2 persistence helpers
├── tools/               → automation tier handlers
├── resources/           → database tier handlers
├── prompts/             → judgment tier handlers
└── webhook.ts           → Apply Webhook ingestion flow

worker/
├── index.ts             → Cloudflare Worker entry point
└── wrangler.toml        → shared DB/STORAGE bindings
```

## Read Order

1. `README.md`
2. `src/server.ts`
3. `src/tools/index.ts`
4. `src/webhook.ts`
5. `worker/index.ts`

## Validation Surfaces

- `/health` for runtime configuration sanity
- `/webhooks/apply` for candidate delivery and signature enforcement
- `ziprecruiter://sync-status` and `ziprecruiter://webhook-events/recent`
- `.agency` migration `0021_abundance_ziprecruiter_staffing.sql`
- `tests/api.test.ts` and `tests/signature.test.ts`
