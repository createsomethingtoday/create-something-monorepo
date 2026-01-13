# Deployment Guide

How to deploy the OUTERFIELDS PCN MCP server to Cloudflare Workers.

## Prerequisites

1. Cloudflare account with Workers enabled
2. `outerfields.io` domain managed in Cloudflare
3. Wrangler CLI installed globally:
   ```bash
   npm install -g wrangler
   ```

## One-Time Setup

### 1. Authenticate with Cloudflare

```bash
wrangler login
```

This opens your browser to authorize Wrangler.

### 2. Configure DNS

In Cloudflare Dashboard → DNS:

1. Add an AAAA record:
   - **Name**: `mcp`
   - **Content**: `100::` (placeholder)
   - **Proxy status**: Proxied (orange cloud)
   - **TTL**: Auto

2. The Workers route will handle requests to `mcp.outerfields.io`

### 3. Update wrangler.toml (Optional - Routes)

If you want to add routes for production deployment, add this to `wrangler.toml`:

```toml
# Optional: Add custom routes
routes = [
  { pattern = "mcp.outerfields.io/*", zone_name = "outerfields.io" }
]
```

For now, we'll use the default `.workers.dev` subdomain and set up custom domain via Cloudflare Dashboard.

## Deploy to Workers

### Development Deploy (staging)

```bash
pnpm run deploy
```

This deploys to `outerfields-pcn-mcp.{your-account}.workers.dev`

### Production Deploy

1. Deploy the worker:
   ```bash
   pnpm run deploy
   ```

2. In Cloudflare Dashboard → Workers & Pages → outerfields-pcn-mcp:
   - Go to **Settings** → **Triggers**
   - Click **Add Custom Domain**
   - Enter: `mcp.outerfields.io`
   - Click **Add Custom Domain**

3. Cloudflare automatically configures SSL and routing

### Verify Deployment

```bash
# Test health endpoint
curl https://mcp.outerfields.io/health

# Should return:
# {
#   "status": "healthy",
#   "server": "outerfields-pcn-remote",
#   "version": "1.0.0",
#   "tools": 5,
#   "timestamp": "..."
# }
```

## Local Development

### Start Dev Server

```bash
pnpm run dev
```

Server runs at `http://localhost:8787`

### Test Locally

```bash
# Health check
curl http://localhost:8787/health

# List tools
curl -X POST http://localhost:8787/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Call a tool
curl -X POST http://localhost:8787/mcp \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc":"2.0",
    "id":2,
    "method":"tools/call",
    "params":{
      "name":"pcn_explore_component",
      "arguments":{"component":"VideoModal"}
    }
  }'
```

## Updating Documentation

Documentation lives in `src/docs.ts`. To update:

1. Edit the documentation content in `src/docs.ts`
2. Deploy:
   ```bash
   pnpm run deploy
   ```

Changes are live immediately (no client update needed).

## Enabling Presentation Management (Option B)

By default this remote MCP server is **read-only** (documentation + guidance).

To let Claude Desktop **create/edit presentations** in `outerfields-presentations` and trigger an **automatic deploy**, you must configure two things:

### 1) Worker secrets (Cloudflare)

Set these secrets on the `outerfields-pcn-mcp` Worker:

- **`ADMIN_TOKEN`**: shared secret used to authorize write operations
- **`GITHUB_TOKEN`**: GitHub token with access to:
  - `createsomethingtoday/outerfields-presentations` (write)
  - `createsomethingtoday/create-something-monorepo` (repository dispatch)

Recommended: create a **fine‑grained PAT** scoped to just those repos and permissions:
- Contents: Read & write (presentations repo)
- Repository dispatch / Actions: Read & write (monorepo)

Set via Wrangler:

```bash
wrangler secret put ADMIN_TOKEN --config wrangler.toml
wrangler secret put GITHUB_TOKEN --config wrangler.toml
```

Optional vars (defaults are fine):
- `PRESENTATIONS_REPO` (default: `createsomethingtoday/outerfields-presentations`)
- `PRESENTATIONS_BRANCH` (default: `main`)
- `MONOREPO_REPO` (default: `createsomethingtoday/create-something-monorepo`)
- `MONOREPO_DISPATCH_EVENT` (default: `outerfields_presentations_updated`)

### 2) Monorepo sync workflow

The monorepo listens for a `repository_dispatch` event and runs a `git subtree pull` to sync:

- `packages/agency/clients/outerfields/src/routes/presentations/`

This sync commit triggers the normal Cloudflare deploy for OUTERFIELDS.

### 3) Client connector URL (Claude Desktop)

Clients should install the existing MCP server via a Custom Connector URL that includes the token:

- `https://outerfields-pcn-mcp.createsomething.workers.dev/sse?token=<ADMIN_TOKEN>`

This ensures **write tools are only usable** by people who have the token.

## Monitoring

### View Logs

```bash
wrangler tail outerfields-pcn-mcp
```

### Analytics

Cloudflare Dashboard → Workers & Pages → outerfields-pcn-mcp → Analytics

### Error Tracking

Errors appear in:
- `wrangler tail` output
- Cloudflare Dashboard → Workers → outerfields-pcn-mcp → Logs

## Troubleshooting

### Deployment Fails

```bash
# Clear cache and retry
rm -rf node_modules dist
pnpm install
pnpm run deploy
```

### Custom Domain Not Working

1. Verify DNS record exists: `mcp.outerfields.io` → `100::` (proxied)
2. Check Workers & Pages → Settings → Triggers → Custom Domains
3. Wait 5-10 minutes for DNS propagation
4. Test: `curl https://mcp.outerfields.io/health`

### CORS Errors in Claude Desktop

The server includes CORS headers for all origins (`Access-Control-Allow-Origin: *`). If you see CORS errors:

1. Verify deployment succeeded: `curl https://mcp.outerfields.io/health`
2. Check browser console for exact error
3. Ensure Claude Desktop config uses `https://` (not `http://`)

## Cost

Cloudflare Workers free tier:
- **100,000 requests/day**
- **10ms CPU time per request**
- **Zero cold starts**

This MCP server should stay well within free tier limits.

## Security Notes

- **Read-only**: Server serves documentation only, no mutations
- **No authentication**: Documentation is public, no sensitive data exposed
- **CORS**: Open to all origins (required for Claude Desktop)
- **Rate limiting**: Cloudflare enforces 100k req/day on free tier

## Rollback

If you need to rollback to a previous deployment:

```bash
# List deployments
wrangler deployments list

# View specific deployment
wrangler deployment view <id>

# Rollback (in dashboard)
# Workers & Pages → outerfields-pcn-mcp → Deployments → Rollback
```

## CI/CD (Future)

To set up automatic deployments:

1. Create Cloudflare API token with Workers write permission
2. Add to GitHub Secrets: `CLOUDFLARE_API_TOKEN`
3. Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy MCP Server

on:
  push:
    branches: [main]
    paths:
      - 'packages/agency/clients/outerfields/mcp-remote/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm --filter @outerfields/pcn-mcp-remote deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```
