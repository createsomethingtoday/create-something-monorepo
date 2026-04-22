# mcp-json-bridge

JSON-normalizing MCP compatibility worker for streamable HTTP servers.

It exists for clients like Dify that can send JSON-RPC MCP requests but choke on `text/event-stream` responses or do not manage `mcp-session-id` reliably.

## What it does

For each non-`initialize` request, the bridge:

1. sends its own upstream `initialize`,
2. sends `notifications/initialized`,
3. forwards the original JSON-RPC request,
4. unwraps upstream SSE into a normal JSON body, and
5. best-effort `DELETE`s the upstream session.

The client only sees `application/json`.

## Why this fixes the Abundance/Dify issue

The Abundance jobs worker responds with `text/event-stream` on `/mcp`, even for `initialize` and `tools/call`.
Dify shows the tool `REQUEST` block, then leaves `RESPONSE` blank because it expects JSON and does not unwrap the SSE body.

This bridge converts those upstream SSE payloads back into plain JSON-RPC.

## Required env

- `UPSTREAM_MCP_URL`

## Optional secrets

- `UPSTREAM_BEARER_TOKEN`
- `BRIDGE_BEARER_TOKEN`
- `BRIDGE_API_KEY`

## Optional vars

- `UPSTREAM_HEADERS_JSON`
  - JSON object of static headers to inject upstream.
  - Useful for Composio account routing, for example:
  - `{"x-mcp-account-id":"acct_abundance"}`
- `BRIDGE_CORS_ORIGIN`
- `BRIDGE_PROTOCOL_VERSION`
- `BRIDGE_CLIENT_NAME`
- `BRIDGE_CLIENT_VERSION`

## Abundance jobs example

Configure the bridge worker with:

- `UPSTREAM_MCP_URL = "https://abundance-jobs-mcp.createsomething.workers.dev/mcp"`
- `UPSTREAM_BEARER_TOKEN = "<abundance bearer>"`
- `BRIDGE_API_KEY = "<dify bridge key>"`

Then point Dify at the bridge URL instead of the upstream worker.

## Composio example

Configure the bridge worker with:

- `UPSTREAM_MCP_URL = "https://composio-toolkit-mcp.createsomething.workers.dev/mcp"`
- `UPSTREAM_BEARER_TOKEN = "<hub bearer or gateway bearer>"`
- `UPSTREAM_HEADERS_JSON = "{\"x-mcp-account-id\":\"acct_abundance\"}"`

This does not replace your job normalization layer. It only makes MCP transport and session handling Dify-safe.

## New York note

The bridge fixes the blank response problem, but it does not rewrite invalid tool arguments.

For `list_public_jobs`, this is valid:

```json
{"state":"NY","limit":25}
```

This is not valid for the Abundance jobs tool schema:

```json
{"state":"NY","limit":25,"status":"open"}
```

Allowed `status` values are:

- `new`
- `reviewing`
- `qualified`
- `rejected`
- `archived`
