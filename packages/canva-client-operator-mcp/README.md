# Canva Client Operator MCP

Claude-authenticated remote MCP for an operator who manages one client-owned Canva account through Composio.

The operator signs into the MCP through CREATE SOMETHING Identity. The client never signs into Claude or receives operator access: they open a one-time Composio Connect Link and authorize Canva directly. The first completed Canva authorization is pinned as the only downstream account until an authorized operator explicitly resets it.

## Why this is a wrapper

Composio can expose a hosted session MCP URL, but that endpoint expects Composio-generated headers and sends tool calls directly to Composio. This Worker stays in front so Claude gets RFC 9728 OAuth discovery, operators are allowlisted, every Canva call is pinned to the locked `connectedAccountId`, and reset/revocation is governed and auditable.

```text
Claude Cowork
  -> CREATE SOMETHING Identity OAuth
  -> this Worker /mcp
  -> locked Composio user + connectedAccountId
  -> Canva

Client browser
  -> one-time Composio Connect Link
  -> Canva OAuth
  -> lock recorded in Durable Object
```

These are independent authentication layers. Clearing Claude's MCP login does not revoke Canva, and resetting Canva does not sign the operator out of Claude.

## Binding lifecycle

1. `canva_connection_status` returns `unbound`.
2. An operator with `canva-client:admin` calls `canva_create_connect_link` once.
3. The operator sends the returned URL to the client.
4. The client signs into the intended Canva account and approves access.
5. The next status or Canva-tool call observes the active Composio connection and atomically locks its `connectedAccountId`.
6. Every `client_canva_*` call supplies that exact account ID to Composio. No ambient/default account selection is allowed.

While a link is pending, another link cannot be created until the client completes it or an operator resets it. `canva_connection_status` returns the existing pending `redirectUrl`, allowing any authenticated operator to recover and share that link from a new Claude session. While an account is locked, another link cannot be created until an operator resets it.

## Reset and client account change

Reset is an operator-admin action, not a client link action.

1. Check `canva_connection_status` and record the current pending request or locked connection.
2. Call `canva_reset_connection` with the exact phrase shown in the tool schema:

   ```text
   RESET <COMPOSIO_CLIENT_USER_ID>
   ```

3. Omit `revoke`, or pass `true`, to revoke/delete the pending request or locked Composio connected account before detaching it. A Composio `404` is treated as already removed; other upstream failures keep the local binding in place. This is the safe default.
4. Preserve the returned reset receipt.
5. Create a new Connect Link and have the client authorize the replacement account.

Set `revoke: false` only when intentionally detaching this MCP while leaving the upstream Composio/Canva grant active. If upstream revocation fails, the local lock remains in place and no replacement link can be created.

## OAuth and scopes

The remote MCP endpoint is `/mcp`. Unauthenticated requests receive `401` plus a `WWW-Authenticate` header pointing at `/.well-known/oauth-protected-resource`. That metadata advertises CREATE SOMETHING Identity as the authorization server.

Operator scopes:

| Scope | Visible capability |
| --- | --- |
| `canva-client:read` | Connection status |
| `canva-client:write` | Dynamic `client_canva_*` tools |
| `canva-client:admin` | Create Connect Link and reset/revoke |

Write and admin tools are omitted from `tools/list` when the operator lacks the corresponding scope. Identity tokens must be valid for the exact Worker `/mcp` resource and contain a verified, allowed operator email.

## Configuration

Required secret:

```bash
pnpm --filter @create-something/canva-client-operator-mcp exec wrangler secret put COMPOSIO_API_KEY
```

Required deployment variable:

```text
COMPOSIO_CLIENT_USER_ID=client:<stable-client-id>:canva
```

Use an immutable client identifier. Do not derive this value from the operator's identity or a mutable email address.

Optional variables:

- `COMPOSIO_CANVA_AUTH_CONFIG_ID`: custom Canva auth configuration; omit for Composio managed auth.
- `CS_IDENTITY_ISSUER`: defaults in `wrangler.toml` to `https://id.createsomething.space`.
- `OAUTH_ALLOWED_EMAIL_DOMAIN`: fallback operator domain when no explicit allowlist exists.
- `OAUTH_ALLOWED_EMAILS`: comma-separated operator allowlist. When set, it replaces domain-wide admission.

The `CANVA_BINDING` Durable Object stores the active pending/locked record and reset receipts. One deployment is intentionally scoped to one stable client identity. Deploy a separate Worker configuration for a different client.

## Claude setup

After deployment, add the HTTPS MCP endpoint without a static authorization header:

```bash
claude mcp add --transport http canva-client https://<worker-host>/mcp
claude mcp login canva-client
```

Claude discovers protected-resource metadata and completes the operator OAuth flow. In Claude Cowork or claude.ai, add the same URL as the custom connector and complete the browser login.

## Verification

```bash
pnpm --filter @create-something/canva-client-operator-mcp test
pnpm --filter @create-something/canva-client-operator-mcp typecheck
pnpm --filter @create-something/canva-client-operator-mcp build
pnpm --filter @create-something/canva-client-operator-mcp dry-run
```

Before production use, verify with a disposable Canva account:

- unauthenticated `/mcp` returns the RFC 9728 challenge;
- read-only operator sees only status;
- first client Connect Link locks the expected Canva identity;
- Canva execution receipt contains the locked `connectedAccountId`;
- a second Connect Link is rejected;
- reset with a wrong phrase is rejected;
- default reset revokes upstream, emits a receipt, and permits rebind;
- the replacement Canva identity is visible through a read-only Canva identity tool.

Do not promote with a real client until the target client ID, operator allowlist, requested Canva scopes, rollback owner, and revocation behavior have been reviewed.
