# Personal Gmail MCP (Codex)

Local MCP server that connects to a single Gmail account via Google OAuth and exposes a small, safe toolset for Codex: search, read, send, label/triage.

## Setup

### 1. Create Google OAuth credentials

1. In Google Cloud Console, create (or pick) a project.
2. Enable **Gmail API**.
3. Create an **OAuth Client ID**.
   - Recommended: **Web application**
   - Add an authorized redirect URI:
     - `http://localhost:3857/callback`

### 2. Configure environment

Create `packages/personal-gmail-mcp/.env`:

```bash
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_REDIRECT_URI="http://localhost:3857/callback"

# Optional safety belt: server will refuse to run tools if the authenticated account doesn't match
GMAIL_ALLOWED_EMAIL="micah@createsomething.io"
```

### 3. Authorize Gmail (one-time)

```bash
pnpm --filter @create-something/personal-gmail-mcp auth
```

Tokens are stored at `~/.config/create-something/personal-gmail-mcp/tokens.json` by default (override with `GMAIL_TOKEN_PATH`).

## Run (for Codex)

Codex uses Streamable HTTP URLs, so run the server locally on a port:

```bash
pnpm --filter @create-something/personal-gmail-mcp build
pnpm --filter @create-something/personal-gmail-mcp start:http
```

Health:
- `http://localhost:3850/`
- MCP endpoint: `http://localhost:3850/mcp`

### Codex config

Add to `~/.codex/config.toml`:

```toml
[mcp_servers."personal-gmail"]
url = "http://localhost:3850/mcp"
```

Start a new Codex session.

## Tools

- `gmail_whoami` - verify which account is authenticated (and basic totals)
- `gmail_list_labels`
- `gmail_search` - Gmail query syntax (`from:`, `to:`, `subject:`, `after:`, `before:`, `label:`, `in:inbox`, `is:unread`, etc.)
- `gmail_get_email`
- `gmail_get_thread`
- `gmail_send`
- `gmail_create_draft`
- `gmail_modify_labels`
- `gmail_trash`

## Notes

- Default OAuth scopes include read + send + modify. Override with `GMAIL_SCOPES` if you want read-only.
- If you change scopes, re-run auth to get a token with the new grants.

