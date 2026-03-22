# MCP Server Templates

> Compatibility note: Pi is the canonical repo-owned agent host for this repository. Use these templates only when you intentionally configure the Claude compatibility path.

Pre-configured Model Context Protocol (MCP) server templates for common integrations.

## Usage

Copy the relevant server configuration to your `~/.claude/settings.json` under `mcpServers` only when you are using the Claude compatibility host.

## Available Templates

| Template | Purpose | File |
|----------|---------|------|
| Context7 | Up-to-date library docs and code examples | `context7.json` |
| Perplexity | Web search, research, reasoning | `perplexity.json` |
| Slack | Send messages, read channels | `slack.json` |
| Linear | Issue tracking integration | `linear.json` |
| Notion | Document and database access | `notion.json` |
| Resend | Email sending | `resend.json` |
| Stripe | Payment operations | `stripe.json` |
| Supabase | Database and auth | `supabase.json` |

## Template Structure

Each template includes:
- Server command and args
- Required environment variables
- Example usage patterns
- WORKWAY alignment notes

## Philosophy

MCP servers should:
1. **Recede into use** - No explicit invocation needed
2. **Compose cleanly** - Work alongside other servers
3. **Fail gracefully** - Disabled servers don't break the system

> "The tool disappears; only the work remains."
