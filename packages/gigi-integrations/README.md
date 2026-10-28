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

## Codex chat companion

`src/codex-main.ts` is the persistent JSON-line desktop companion, built with `pnpm build:codex-companion`. It requires the profile data directory, exact GiGi MCP binary and GiGi skill path supplied by the native application. The native application owns the companion process; Effect scopes the child runtime resources. Each request returns one correlated result while provider events are collected separately for bounded chat polling.

This adapter uses the installed, ChatGPT-signed-in Codex runtime. It must not extract provider credentials or silently fall back to API billing. Session metadata is profile-scoped; provider transcripts and SQLite record backups remain separate. Restart and uncertain writes require reconciliation rather than automatic replay.

The embedded tool surface contains GiGi reads and saves of existing records only. Every save captures a fresh expected record, receives an explicit approval, uses an idempotency key and checks readback. The adapter rejects record creation and oversized approval payloads. A workspace with an uncertain save cannot make more embedded writes until a matching full record read reconciles it. A conversation with an unidentified turn remains blocked; it never automatically resends. Profiles are capped at 100 conversations so unresolved fences cannot disappear through history eviction.

## Instagram draft publishing

Instagram extends the existing user-initiated `connections.status`, `connections.begin`, and `connections.reconcile` flow with `provider: "instagram"`. It is not a source importer. No connection is created or authenticated on application startup. The broker derives the owner from CREATE SOMETHING Identity and verifies the selected Composio connection's owner, toolkit, auth config, exact approved scope snapshot, private account flag and active state before an account read or publication. A connected account is not proof that Meta will accept a post.

Additional companion operations:

| Operation | Input | Result |
| --- | --- | --- |
| `instagram.account` | `connectedAccountId` | Verified `instagramAccountId`, `username`, `accountType`, and `publishingPermission: "not_verified"` |
| `instagram.preview` | `imageUrl` | Exact JPEG `dataUrl`, `expectedImageSha256`, `width`, `height`, and original `imageUrl` |
| `instagram.publish` | `requestId`, `connectedAccountId`, `instagramAccountId`, `caption`, `imageUrl`, `expectedImageSha256`, `confirmed: true` | Durable receipt |
| `instagram.receipt` | `requestId`, optional `continueConfirmed: true` | Read the durable receipt; explicit continuation can finish its pending container, never replay a dispatched publication |

The native draft must display the inspected data URL and bind its hash before explicit publication confirmation. A URL edit invalidates the hash. Publishing re-downloads and hashes the image; different bytes return `image_changed`. After confirmation, identical bytes are temporarily staged in the dedicated R2 bucket and Meta receives only the immutable, random-token broker URL. No local file or private collection is uploaded by these operations. The public media URL expires after ten minutes. A processing container retains the object until it finishes or its ten-minute deadline expires; terminal attempts delete it. Configure a one-day R2 lifecycle deletion rule as a crash-cleanup backstop.

Read-only receipt GETs never publish. The UI offers **Continue pending publish** only for a durable pending container and explains that it may publish the previously confirmed image, caption and account. Each confirmed reconciliation POST checks readiness once; an atomic claim ensures competing calls dispatch at most one publication. Expired containers become `not_published`.

Receipts distinguish `not_published`, `unknown`, `published_unverified`, and `published`. Only a returned media ID followed by an exact ID/type provider readback is `published`. A timeout after the durable publication checkpoint stays uncertain and cannot be retried automatically. The same request ID replays its receipt. A new request ID with the same payload remains blocked unless the previous attempt is definitely `not_published`; the user can explicitly copy that draft and confirm again. Caption and image bytes are not stored in D1. R2 retains only the temporary approved media, with expiry and digest metadata.

### Required broker configuration

Apply additive migration `0004_instagram_workspace.sql` before deploying the new broker. It creates separate Instagram consent and publishing journals without altering the existing Google tables, triggers or records. The publisher requires:

- Existing `COMPOSIO_API_KEY`, Identity admission, and D1 bindings.
- `GIGI_INSTAGRAM_AUTH_CONFIG_ID`: the independently verified, existing Instagram Business Login auth config. Do not invent an ID or create a new OAuth app/grant to fill this setting.
- `GIGI_INSTAGRAM_APPROVED_SCOPES`: the checked-in existing config `ac_9TS_DrtjidYX` requires exactly `instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish,instagram_business_manage_insights`. Its grant includes profile, messages, comments, publishing and insights; the connection UI must disclose that breadth before consent. GiGi only calls the fixed profile/publishing endpoints. Other explicitly configured auth configs are admitted only with the two publishing-minimum scopes `instagram_business_basic,instagram_business_content_publish`. These are a configured approval snapshot, checked against the connection's requested scopes; this setting does not grant permissions or prove effective token permissions. A differently scoped existing config needs explicit review rather than automatic scope expansion or credential replacement.
- `GIGI_INSTAGRAM_MEDIA_HOSTS`: explicit comma-separated trusted public media hostnames. No wildcard, internal host, redirect, cookie, or private authorization is accepted. Leave unset until approved hosting is known; preview then reports `media_host_not_allowed`.
- `INSTAGRAM_MEDIA`: a dedicated R2 bucket binding with a one-day object deletion lifecycle rule. No public bucket access is required. Missing staging returns `media_staging_unconfigured` before any publish attempt.

The checked-in deployment configuration pins existing managed auth config `ac_9TS_DrtjidYX`, approved media host `media.createsomething.io`, and the planned dedicated bucket `gigi-instagram-publish-media`. The config was independently read back as enabled on 2026-10-20; its complete connected-account list was empty. The R2 bucket must be provisioned and its lifecycle verified before deploying the binding. Deploying code does not authorize or establish a real Instagram connection. Setup is incomplete until the operator verifies these bindings and the user explicitly completes consent. Never use a real post as a deployment smoke test without separate post-specific authorization.

Supported publishing scope is a **single JPEG feed post** on Business/Creator accounts. The broker enforces an 8 MiB limit, 320-pixel minimum width, 4:5–1.91:1 aspect ratio, JPEG structure, 2,200 caption characters, 30 hashtags and 20 mentions. Meta's decoder and container readiness are the final validity authority. Reels, Stories, carousels, audio overlays, scheduling and local-media uploads are not implemented by this publisher. Public-URL media must remain retrievable during review; Meta receives the immutable staged copy during publishing.

Official references: [Composio Instagram](https://docs.composio.dev/toolkits/instagram), [Composio authenticated proxy](https://docs.composio.dev/reference/sdk-reference/typescript/tools#proxyexecute), [Meta media constraints](https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user/media), and [Meta content publishing](https://developers.facebook.com/documentation/instagram-platform/content-publishing). The broker uses the existing Composio authenticated proxy convention and Graph v25.0 with explicit endpoint construction, preserving separate container creation, publication and readback boundaries.
