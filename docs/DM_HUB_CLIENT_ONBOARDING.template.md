# DM Client Onboarding Script (Template, No Secrets)

## 1) Export Keys + Endpoints

```bash
export DM_ENDPOINT="https://dm.mcp.workway.co/mcp"
export HALFDOZEN_DM_MCP_API_KEY="<REPLACE_WITH_DM_MCP_API_KEY>"

export HUB_ENDPOINT="https://cs-mcp-hub-remote.createsomething.workers.dev/mcp"
export HUB_API_TOKEN="<REPLACE_WITH_HUB_API_TOKEN>"
export HUB_ENDPOINT_WITH_TOKEN="${HUB_ENDPOINT}?token=${HUB_API_TOKEN}"
```

## 2) Verify Connectivity

```bash
curl -is "$DM_ENDPOINT" | head -n 1
curl -is "$DM_ENDPOINT" -H "Authorization: Bearer $HALFDOZEN_DM_MCP_API_KEY" | head -n 1

curl -is "$HUB_ENDPOINT" | head -n 1
curl -is "$HUB_ENDPOINT_WITH_TOKEN" | head -n 1
```

## 3) Print Paste-Ready Config Values

```bash
cat <<EOF
DM MCP
  URL: ${DM_ENDPOINT}
  Header: Authorization: Bearer ${HALFDOZEN_DM_MCP_API_KEY}

Hub MCP
  HUB_ENDPOINT: ${HUB_ENDPOINT}
  HUB_API_TOKEN: ${HUB_API_TOKEN}
  URL (tokenized): ${HUB_ENDPOINT_WITH_TOKEN}
EOF
```

## 4) Clear Shell Variables After Session

```bash
unset HALFDOZEN_DM_MCP_API_KEY
unset HUB_API_TOKEN
unset HUB_ENDPOINT_WITH_TOKEN
unset DM_ENDPOINT
unset HUB_ENDPOINT
```
