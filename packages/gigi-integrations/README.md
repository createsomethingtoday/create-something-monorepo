# GiGi integrations

This package is the native desktop companion for connector and CTX operations. The executable is built with `pnpm --filter @create-something/gigi-integrations build:companion` and packaged as a Tauri resource named `gigi-integrations`. It reads one JSON request on stdin and writes one JSON response on stdout. It never prints an API credential or provider response body on failure.

## Native contract

Request: `{ "operation": "connections.status", "input": { "provider": "gmail" } }`.
Response: `{ "ok": true, "value": ... }` or `{ "ok": false, "error": { "operation": "connections.status", "reason": "reauthentication_required" } }`.

Supported operations:

| Operation | Input | Value |
| --- | --- | --- |
| `connections.status` | `provider` | `{provider,state,connectedAccountId?,scopes?}` |
| `auth.login` | none | Identity subject, email, exact resource, expiry (no token) |
| `connections.begin` | `provider`, `requestId` | `{provider,status,attemptId,connectedAccountId?,url?,expiresAt?}` |
| `connections.reconcile` | `provider`, `connectedAccountId` | connection status |
| `connections.import` | `workspaceId`, `provider`, `connectedAccountId`, optional `cursor` | canonical local `records.save` inputs and `nextCursor`; read only until Rust persists each |
| `context.search` | `query`, optional `limit` (1–5) | cited hits with at most 500 snippet characters each |
| `context.sync` | none | imports the app-owned `<GIGI_DATA_DIR>/imports/gigi-history.jsonl` |
| `context.import` | absolute `path` staged under `<GIGI_DATA_DIR>/imports` | `{imported:true}` |

Providers are exactly `gmail` and `googlecalendar`. `connections.import` reads an external source page; the desktop domain layer validates and persists its records in the owner's SQLite database. The companion cannot access or modify that database. Requests have bounded response size and timeouts. Mutating OAuth link requests are sent once; uncertain outcomes require broker readback rather than automatic retry.

## Local configuration and privacy

The desktop sets `GIGI_DATA_DIR` to its private app data directory. CTX uses only `<GIGI_DATA_DIR>/ctx`, never the operator's default CTX index. Before first import it persists manual indexing, disables automatic source discovery and upgrades, and launches CTX with an app-owned HOME/XDG/Codex/Claude directory and no provider API keys. Search forces `--provider-key gigi-local --refresh off --backend lexical` and returns only bounded snippets with session IDs. Import uses `ctx-history-jsonl-v2`, admits only real files under `<GIGI_DATA_DIR>/imports`, and checks the official JSON receipt for zero rejections and at least one indexed document. The bundled official `ctx` executable is discovered beside the companion binary; a missing binary returns `missing_dependency`.

`auth.login` uses CREATE SOMETHING Identity with a public PKCE loopback callback, exact GiGi resource, and online userinfo readback. It atomically writes a private mode `0600` broker session with access/refresh tokens and rotation state. A missing or uncertain session returns `reauthentication_required`; an uncertain refresh is never replayed. The desktop request has no owner field. The CREATE SOMETHING Composio developer key stays in the broker's server-side secret store.

## Broker contract and current boundary

The companion expects authenticated `GET /v1/gigi/connections/:provider`, `POST /v1/gigi/connections/:provider/link`, `GET /v1/gigi/connections/:provider/:connectedAccountId`, and `GET /v1/gigi/sources/:provider/:connectedAccountId/page`. These are GiGi-owned broker routes, not Composio endpoints. The broker must validate the exact OAuth audience, an explicit beta subject allowlist, account ownership, provider, auth config, and read-only scopes before returning projected data. `connectedAccountId` never grants authority by itself. Source content is treated as data, never instructions. The broker requires a separate live deployment and account acceptance; local fixture tests alone do not prove connected operation.

## Verification

`pnpm --filter @create-something/gigi-integrations test`, `typecheck`, and `build:companion` verify the package. `GIGI_CTX_REAL_BINARY=<absolute bundled ctx path> pnpm --filter @create-something/gigi-integrations exec node --import tsx --test test/ctx-real.test.ts` verifies the official CTX binary against synthetic GiGi history with no developer context. Live acceptance additionally requires a real Identity token, Composio consent/readback, isolated source import, and the phone-to-desktop session.
