> Moved: the MCP client and `login` now live in `../../cli/` (`@create-something/webflow-template-validation-cli`, see `cli/README.md`). The notes below are the 2026-10-30 spike record; their run commands use the old paths.

# Spike: headless CLI client for Webflow's remote MCP server

Goal: prove that a non-AI command-line client can authenticate to Webflow's first-party remote MCP server and call a design-data tool headlessly. This is the "creator logs in from a CLI" half of the planned template-validation CLI.

## Result (2026-10-30)

| Step | Status |
| --- | --- |
| `discover.ts` (OAuth metadata + unauthenticated `initialize`) | Executed. Output below. |
| `login.ts` metadata discovery (`discover()` helper) | Executed. Resolves `https://mcp.webflow.com`, registration endpoint present, S256 present. |
| `login.ts` dynamic client registration, browser consent, code exchange | Executed 2026-10-30. Registration with a `http://localhost:8976/callback` redirect was accepted (client name "Webflow Template Validate CLI (spike)"). Consent page is Webflow's standard OAuth screen for the "Webflow MCP Bridge App" with a fixed scope list (includes `page_client:write`, shown as "View your designs"); one site in the user's own workspace was authorized. Token exchange returned an access token with a 1 hour lifetime plus a refresh token, no `scope` value. |
| `call.ts` (initialize, tools/list, `data_sites_tool`, `data_pages_tool`, `data_style_tool`) | Executed 2026-10-30 with the stored token and no Designer open: server `webflow-mcp 2.2.0`, 37 tools, `list_sites` returned the one authorized site, `query_styles` ran (0 matches for `button` on that site). A follow-up unfiltered `get_styles` with `include_properties` returned 2 styles with property maps; `get_variable_collections` and `get_all_components` also returned data. |

What discovery proves:

1. **The data server is `https://mcp.webflow.com/mcp`.** It returns `401` with a spec-compliant `WWW-Authenticate: Bearer ... resource_metadata=...` header (RFC 9728), as the MCP authorization spec requires.
2. **`https://developers.webflow.com/_mcp/server` is not the data server.** It answers `initialize` without auth as `fern-docs-mcp-server`, and `tools/list` returns one tool, `searchDocs`. It is a docs search server. Its OAuth metadata belongs to Fern, not Webflow Data.
3. **Dynamic client registration exists** at `https://mcp.webflow.com/oauth/register`. `token_endpoint_auth_methods_supported` includes `none`, so a public client (no secret) is advertised. A third-party CLI does not need a Webflow-issued client id, provided registration accepts a `http://localhost` redirect (not yet verified).
4. **No scopes are advertised.** `scopes_supported` is absent from both the protected-resource and the authorization-server metadata on `mcp.webflow.com`. Access is decided at consent time (one workspace per authorization), not by requested scopes. `login.ts` sends no `scope` unless `WEBFLOW_MCP_SCOPE` is set.
5. **PKCE**: `S256` and `plain` are both supported. `login.ts` uses `S256` only.
6. `https://mcp.webflow.com/sse` behaves the same as `/mcp` (same auth server, its own resource metadata). `call.ts` uses Streamable HTTP on `/mcp`.

## How to run

Node 20+ (tested on 22). Run from this directory:

```sh
TSX=../../worker/node_modules/.bin/tsx

$TSX discover.ts   # read-only, no auth
$TSX login.ts      # registers a public client, prints an authorize URL, waits on http://localhost:8976/callback
$TSX call.ts       # uses the stored token
../../worker/node_modules/.bin/tsc -p tsconfig.json   # type-check
```

`client.ts` holds the shared `McpClient` (Streamable HTTP, SSE or JSON responses, plus `callTool`, which adds `session_id`, `agent_id`, and `context`). `call.ts` and `spike/headless-collector/collect.ts` both import it.

Environment overrides:

- `WEBFLOW_MCP_URL` (default `https://mcp.webflow.com/mcp`)
- `WEBFLOW_MCP_CALLBACK_PORT` (default `8976`)
- `WEBFLOW_MCP_CLIENT_ID` skips dynamic registration and uses a pre-issued client id
- `WEBFLOW_MCP_SCOPE` adds a `scope` parameter (none is advertised)

Local files (outside the repo, directory 0700, files 0600):

- `~/.config/webflow-template-cli/mcp-client.json`: registered client id and redirect URI. Reused while the issuer and redirect stay the same.
- `~/.config/webflow-template-cli/mcp-token.json`: access and refresh token. `call.ts` refreshes it when it expires. Neither script prints tokens.

### What `login.ts` sends

Registration (RFC 7591):

```http
POST https://mcp.webflow.com/oauth/register
Content-Type: application/json

{"client_name":"Webflow Template Validate CLI (spike)","redirect_uris":["http://localhost:8976/callback"],"grant_types":["authorization_code","refresh_token"],"response_types":["code"],"token_endpoint_auth_method":"none"}
```

Authorization URL printed for the user:

```
https://mcp.webflow.com/oauth/authorize?response_type=code&client_id=<registered>&redirect_uri=http%3A%2F%2Flocalhost%3A8976%2Fcallback&code_challenge=<S256>&code_challenge_method=S256&state=<random>&resource=https%3A%2F%2Fmcp.webflow.com%2Fmcp
```

Token exchange: `POST https://mcp.webflow.com/oauth/token` with form fields `grant_type=authorization_code`, `code`, `redirect_uri`, `client_id`, `code_verifier`, `resource`.

### What `call.ts` does

The Streamable HTTP JSON-RPC client is about 60 lines over `fetch`, with no SDK dependency. It sends `Accept: application/json, text/event-stream`, parses SSE-framed responses, tracks `Mcp-Session-Id`, and sends `MCP-Protocol-Version` after `initialize`. The steps are:

1. `initialize`, then `notifications/initialized`
2. `tools/list` (follows `nextCursor`) and prints all tool names
3. `data_sites_tool` with `actions: [{ label, list_sites: { detail: "summary" } }]` and `session_id: "start"`. It captures the issued `ses_...` value and sends it on all later calls.
4. `data_pages_tool` with `list_pages` (limit 1) on the first site
5. `data_style_tool` with `siteId`, `pageId`, and `query_styles.queries: [{ name_path: ["button"], include_properties: true }]`. It prints the style count and the union of property names only.

The argument shapes (an `actions` array, each item has `label` plus one action key) come from the tool input schemas that the same server exposes through the claude.ai Webflow connector. Every call sends `agent_id` `cli|webflow-template-validate|<6 hex>` and a 15 to 25 word third-person `context`.

## Verbatim discovery output

```
discover.ts run at 2026-10-30T19:29:03.326Z

=== https://developers.webflow.com/_mcp/server
initialize POST: HTTP 200 OK
  WWW-Authenticate: (absent)
  content-type: text/event-stream
  body[0..200]: event: message data: {"result":{"protocolVersion":"2025-06-18","capabilities":{"tools":{"listChanged":true}},"serverInfo":{"name":"fern-docs-mcp-server","version":"1.0.0"}},"jsonrpc":"2.0","id":1} 
GET https://developers.webflow.com/.well-known/oauth-protected-resource/_mcp/server -> 200
  resource: https://developers.webflow.com/_mcp/server
  authorization_servers: ["https://developers.webflow.com/_mcp/oauth"]
  scopes_supported: []
GET https://developers.webflow.com/.well-known/oauth-protected-resource -> 200
  resource: https://developers.webflow.com
  authorization_servers: ["https://developers.webflow.com/_mcp/oauth"]
  scopes_supported: []
GET https://developers.webflow.com/.well-known/oauth-authorization-server/_mcp/server -> 404
GET https://developers.webflow.com/.well-known/oauth-authorization-server -> 200
  {
    "issuer": "https://developers.webflow.com",
    "authorization_endpoint": "https://developers.webflow.com/_mcp/oauth/authorize",
    "token_endpoint": "https://developers.webflow.com/_mcp/oauth/token",
    "registration_endpoint": "https://developers.webflow.com/_mcp/oauth/register",
    "scopes_supported": [],
    "code_challenge_methods_supported": [
      "S256"
    ],
    "grant_types_supported": [
      "authorization_code",
      "refresh_token"
    ],
    "token_endpoint_auth_methods_supported": [
      "none",
      "client_secret_post",
      "client_secret_basic"
    ],
    "client_id_metadata_document_supported": true
  }
auth server https://developers.webflow.com/_mcp/oauth: metadata from https://developers.webflow.com/.well-known/oauth-authorization-server/_mcp/oauth
  {
    "issuer": "https://developers.webflow.com/_mcp/oauth",
    "authorization_endpoint": "https://developers.webflow.com/_mcp/oauth/authorize",
    "token_endpoint": "https://developers.webflow.com/_mcp/oauth/token",
    "registration_endpoint": "https://developers.webflow.com/_mcp/oauth/register",
    "scopes_supported": [],
    "code_challenge_methods_supported": [
      "S256"
    ],
    "grant_types_supported": [
      "authorization_code",
      "refresh_token"
    ],
    "token_endpoint_auth_methods_supported": [
      "none",
      "client_secret_post",
      "client_secret_basic"
    ],
    "client_id_metadata_document_supported": true
  }

=== https://mcp.webflow.com/mcp
initialize POST: HTTP 401 Unauthorized
  WWW-Authenticate: Bearer realm="OAuth", resource_metadata="https://mcp.webflow.com/.well-known/oauth-protected-resource/mcp", error="invalid_token", error_description="Missing or invalid access token"
  content-type: application/json
  body[0..200]: {"error":"invalid_token","error_description":"Missing or invalid access token"}
GET https://mcp.webflow.com/.well-known/oauth-protected-resource/mcp -> 200
  resource: https://mcp.webflow.com/mcp
  authorization_servers: ["https://mcp.webflow.com"]
  scopes_supported: "(not advertised)"
GET https://mcp.webflow.com/.well-known/oauth-protected-resource -> 200
  resource: https://mcp.webflow.com
  authorization_servers: ["https://mcp.webflow.com"]
  scopes_supported: "(not advertised)"
GET https://mcp.webflow.com/.well-known/oauth-authorization-server/mcp -> 404 non-JSON (text/plain;charset=UTF-8): Not found
GET https://mcp.webflow.com/.well-known/oauth-authorization-server -> 200
  {
    "issuer": "https://mcp.webflow.com",
    "authorization_endpoint": "https://mcp.webflow.com/oauth/authorize",
    "token_endpoint": "https://mcp.webflow.com/oauth/token",
    "registration_endpoint": "https://mcp.webflow.com/oauth/register",
    "scopes_supported": "(not advertised)",
    "code_challenge_methods_supported": [
      "plain",
      "S256"
    ],
    "grant_types_supported": [
      "authorization_code",
      "refresh_token"
    ],
    "token_endpoint_auth_methods_supported": [
      "client_secret_basic",
      "client_secret_post",
      "none"
    ],
    "client_id_metadata_document_supported": false
  }
auth server https://mcp.webflow.com: metadata from https://mcp.webflow.com/.well-known/oauth-authorization-server
  {
    "issuer": "https://mcp.webflow.com",
    "authorization_endpoint": "https://mcp.webflow.com/oauth/authorize",
    "token_endpoint": "https://mcp.webflow.com/oauth/token",
    "registration_endpoint": "https://mcp.webflow.com/oauth/register",
    "scopes_supported": "(not advertised)",
    "code_challenge_methods_supported": [
      "plain",
      "S256"
    ],
    "grant_types_supported": [
      "authorization_code",
      "refresh_token"
    ],
    "token_endpoint_auth_methods_supported": [
      "client_secret_basic",
      "client_secret_post",
      "none"
    ],
    "client_id_metadata_document_supported": false
  }

=== https://mcp.webflow.com/sse
initialize POST: HTTP 401 Unauthorized
  WWW-Authenticate: Bearer realm="OAuth", resource_metadata="https://mcp.webflow.com/.well-known/oauth-protected-resource/sse", error="invalid_token", error_description="Missing or invalid access token"
  content-type: application/json
  body[0..200]: {"error":"invalid_token","error_description":"Missing or invalid access token"}
GET https://mcp.webflow.com/.well-known/oauth-protected-resource/sse -> 200
  resource: https://mcp.webflow.com/sse
  authorization_servers: ["https://mcp.webflow.com"]
  scopes_supported: "(not advertised)"
GET https://mcp.webflow.com/.well-known/oauth-protected-resource -> 200
  resource: https://mcp.webflow.com
  authorization_servers: ["https://mcp.webflow.com"]
  scopes_supported: "(not advertised)"
GET https://mcp.webflow.com/.well-known/oauth-authorization-server/sse -> 404 non-JSON (text/plain;charset=UTF-8): Not found
GET https://mcp.webflow.com/.well-known/oauth-authorization-server -> 200
  {
    "issuer": "https://mcp.webflow.com",
    "authorization_endpoint": "https://mcp.webflow.com/oauth/authorize",
    "token_endpoint": "https://mcp.webflow.com/oauth/token",
    "registration_endpoint": "https://mcp.webflow.com/oauth/register",
    "scopes_supported": "(not advertised)",
    "code_challenge_methods_supported": [
      "plain",
      "S256"
    ],
    "grant_types_supported": [
      "authorization_code",
      "refresh_token"
    ],
    "token_endpoint_auth_methods_supported": [
      "client_secret_basic",
      "client_secret_post",
      "none"
    ],
    "client_id_metadata_document_supported": false
  }
auth server https://mcp.webflow.com: metadata from https://mcp.webflow.com/.well-known/oauth-authorization-server
  {
    "issuer": "https://mcp.webflow.com",
    "authorization_endpoint": "https://mcp.webflow.com/oauth/authorize",
    "token_endpoint": "https://mcp.webflow.com/oauth/token",
    "registration_endpoint": "https://mcp.webflow.com/oauth/register",
    "scopes_supported": "(not advertised)",
    "code_challenge_methods_supported": [
      "plain",
      "S256"
    ],
    "grant_types_supported": [
      "authorization_code",
      "refresh_token"
    ],
    "token_endpoint_auth_methods_supported": [
      "client_secret_basic",
      "client_secret_post",
      "none"
    ],
    "client_id_metadata_document_supported": false
  }
```

Follow-up check (curl, read-only), `tools/list` on `https://developers.webflow.com/_mcp/server` without auth: HTTP 200, `text/event-stream`, one tool `searchDocs` ("Search the documentation at https://developers.webflow.com").

## Open questions

1. **Does `/oauth/register` accept arbitrary public clients with `http://localhost` redirects?** The metadata says it should. This is the one call that decides whether a third-party CLI works with no help from Webflow. Run `login.ts` once to find out. It creates one client registration on Webflow's production auth server, so get approval first.
2. **What does consent grant?** No scopes are advertised. We do not know if the token carries the full scope set of the MCP app, or if design-data tools (`data_style_tool`, `data_variable_tool`) need the Designer to be open. The Bridge app is not needed for `data_*` tools in the connector schemas, but this is not verified headlessly.
3. **Token lifetime and refresh rotation**: not known until a real exchange happens. `login.ts` records `expires_at` and stores a rotated refresh token if one comes back.
4. **Registration hygiene**: there is no documented way to delete a dynamically registered client, and no documented policy on rate limits or review of DCR clients. Before shipping to creators, ask the MCP owners whether the CLI should use a Webflow-issued client id (`WEBFLOW_MCP_CLIENT_ID`) or per-install DCR.
5. **`client_id_metadata_document_supported: false`** on `mcp.webflow.com`, so the newer CIMD path (a URL as client id) is not available. DCR is the only self-serve path.
6. **Template site selection**: one authorization grants one workspace. A creator with templates in several workspaces must log in once per workspace, and the CLI needs a site picker instead of "first site".
