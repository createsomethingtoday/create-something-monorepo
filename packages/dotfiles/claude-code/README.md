# Claude Code Configuration

Production-tested Claude Code settings from CREATE SOMETHING methodology.

## Installation

```bash
# Copy settings to ~/.claude/
cp settings.json ~/.claude/settings.json

# Or symlink (preferred for updates)
ln -sf "$(pwd)/settings.json" ~/.claude/settings.json
```

## MCP Servers

The configuration includes these MCP servers:

| Server | Purpose | Requires |
|--------|---------|----------|
| `cloudflare` | D1, KV, Workers, R2 operations | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` |
| `github` | Repository operations | `GITHUB_TOKEN` |
| `postgres` | Database queries (disabled by default) | `DATABASE_URL` |
| `memory` | Persistent context across sessions | None |

### Enabling/Disabling Servers

Add `"disabled": true` to disable a server without removing config.

### Adding Custom Servers

See `mcp-templates/` for additional server configurations.

## Permissions

Default permissions allow common development operations:

- **Package managers**: npm, pnpm
- **Version control**: git
- **Task tracking**: bd (Beads)
- **Deployment**: wrangler
- **File operations**: Read, Write, Edit, Glob, Grep

## Custom Instructions

The `customInstructions` field is pre-configured with the Subtractive Triad philosophy. Modify for project-specific guidance.

## Environment Variables

Set these in your shell profile or `.env`:

```bash
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
export CLOUDFLARE_API_TOKEN="your-api-token"
export GITHUB_TOKEN="ghp_your-token"
```

## Philosophy

> The tool recedes; the work remains.

This configuration follows Zuhandenheit—tools that disappear into transparent use. MCP servers extend Claude Code's capabilities without requiring explicit invocation.
