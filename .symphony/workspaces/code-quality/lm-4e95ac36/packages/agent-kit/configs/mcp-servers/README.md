# MCP Server Templates

Model Context Protocol (MCP) server templates for common integrations.

## Available Templates

| Template | Purpose | Status |
|----------|---------|--------|
| `slack/` | Slack workspace integration | Ready |
| `linear/` | Linear issue tracking | Ready |
| `stripe/` | Stripe payment operations | Ready |
| `github/` | GitHub repository management | Ready |
| `notion/` | Notion workspace integration | Ready |
| `cloudflare/` | Cloudflare Workers/D1/KV | Ready |
| `context7/` | Up-to-date library/API docs for code generation | Ready |

## Usage

1. Copy the template you need to your project:
   ```bash
   cp -r ~/.config/mcp-servers/slack ~/myproject/.mcp/slack
   ```

2. Configure the environment variables in `.env`:
   ```bash
   SLACK_BOT_TOKEN=xoxb-...
   SLACK_TEAM_ID=T...
   ```

3. Add to your Claude Code settings (`.claude/settings.json`):
   ```json
   {
     "mcpServers": {
       "slack": {
         "command": "npx",
         "args": ["tsx", ".mcp/slack/index.ts"]
       }
     }
   }
   ```

## Context7 Quick Add

Use Context7 for version-specific docs and code examples:

```json
{
  "mcpServers": {
    "context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp"
    }
  }
}
```

Agent rule recommendation:
- Always use Context7 MCP for external library/API docs, setup/configuration steps, and code generation.
- Add `use context7` (or pin with `use library /<owner>/<repo>`) in prompts when docs grounding is needed.

## Support

- Office hours: https://cal.com/createsomething/agent-kit
- LMS: https://learn.createsomething.space
- Email: support@createsomething.agency
