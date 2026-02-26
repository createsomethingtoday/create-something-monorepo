# DM Client Onboarding (Template, Direct Config, No Exports)

## 1) Add MCP Entries Directly In `~/.codex/config.toml`

```toml
[mcp_servers.dm]
url = "https://dm.mcp.workway.co/mcp"
enabled = true
startup_timeout_sec = 60
tool_timeout_sec = 120

[mcp_servers.dm.http_headers]
Authorization = "Bearer <REPLACE_WITH_DM_MCP_API_KEY>"

[mcp_servers.half_dozen_danny_hub]
url = "https://cs-mcp-hub-remote.createsomething.workers.dev/mcp"
enabled = true
startup_timeout_sec = 60
tool_timeout_sec = 120

[mcp_servers.half_dozen_danny_hub.http_headers]
Authorization = "Bearer <REPLACE_WITH_HUB_API_TOKEN>"
```

Client handoff rule:
Do not ask clients to export `HUB_*` shell variables. Configure client authentication in Codex `http_headers` only.

## 2) Restart Codex

Close and reopen Codex so MCP connections reload with the updated config.

## 3) Verify Connectivity

```bash
curl -is "https://dm.mcp.workway.co/mcp" | head -n 1
curl -is "https://dm.mcp.workway.co/mcp" -H "Authorization: Bearer <REPLACE_WITH_DM_MCP_API_KEY>" | head -n 1

curl -is "https://cs-mcp-hub-remote.createsomething.workers.dev/mcp" | head -n 1
curl -is "https://cs-mcp-hub-remote.createsomething.workers.dev/mcp" -H "Authorization: Bearer <REPLACE_WITH_HUB_API_TOKEN>" | head -n 1
```

Expected:
- unauthenticated requests: `401`
- authenticated/tokenized requests: `406`

If the first Hub MCP connect times out, retry once after ~15-30 seconds (cold runtime warm-up).
