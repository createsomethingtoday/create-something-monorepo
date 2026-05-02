# Dify Agent Imports

This directory stores Dify DSL files that can be imported into Studio.

## Active Jobs

Import `active-jobs.yml` into Dify after the workspace MCP server below is authorized:

- Server ID: `active-jobs`
- Display name: `Active Jobs DB`
- URL: `https://active-jobs-mcp.createsomething.workers.dev/mcp`

The YAML intentionally stores no secrets. Dify resolves the MCP tools from the workspace server card, so keep the server ID stable.
