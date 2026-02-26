# DM Hub Client Onboarding (Template, Secure Delivery, Any Client)

## 1) Operator Issues One-Time Package (Broker API)

```bash
export DELIVERY_BROKER_ENDPOINT="https://dm-delivery-broker.createsomething.workers.dev"
export DELIVERY_ADMIN_TOKEN="<REPLACE_WITH_DELIVERY_ADMIN_TOKEN>"
export CLIENT_ID="<REPLACE_WITH_CLIENT_ID>" # e.g. acme

ISSUE_RESPONSE="$(curl -fsS -X POST "${DELIVERY_BROKER_ENDPOINT}/v1/delivery/issue" \
  -H "Authorization: Bearer ${DELIVERY_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "X-Operator-Id: <OPERATOR_ID>" \
  -d '{
    "client_id": "'"${CLIENT_ID}"'",
    "ttl_seconds": 900,
    "max_redemptions": 1,
    "recipient": "<CLIENT_EMAIL>",
    "note": "DM + Hub onboarding package",
    "payload": {
      "dm": {
        "endpoint": "https://dm.mcp.workway.co/mcp",
        "api_key": "<REPLACE_WITH_DM_MCP_API_KEY>"
      },
      "hub": {
        "endpoint": "https://cs-mcp-hub-remote.createsomething.workers.dev/mcp",
        "api_token": "<REPLACE_WITH_HUB_API_TOKEN>"
      }
    }
  }')"

export DELIVERY_ID="$(echo "$ISSUE_RESPONSE" | jq -r '.delivery_id')"
export DELIVERY_URL="$(echo "$ISSUE_RESPONSE" | jq -r '.delivery_url')"
export DELIVERY_CODE="$(echo "$ISSUE_RESPONSE" | jq -r '.delivery_code')"

unset ISSUE_RESPONSE
```

## 2) Client Redeems Delivery Package

```bash
PAYLOAD_JSON="$(curl -fsS "$DELIVERY_URL" -H "X-Delivery-Code: ${DELIVERY_CODE}")"

export DM_ENDPOINT="$(echo "$PAYLOAD_JSON" | jq -r '.payload.dm.endpoint')"
export HALFDOZEN_DM_MCP_API_KEY="$(echo "$PAYLOAD_JSON" | jq -r '.payload.dm.api_key')"

export HUB_ENDPOINT="$(echo "$PAYLOAD_JSON" | jq -r '.payload.hub.endpoint')"
export HUB_API_TOKEN="$(echo "$PAYLOAD_JSON" | jq -r '.payload.hub.api_token')"

unset PAYLOAD_JSON
unset DELIVERY_URL
unset DELIVERY_CODE
```

## 3) Verify Connectivity

```bash
curl -is "$DM_ENDPOINT" | head -n 1
curl -is "$DM_ENDPOINT" -H "Authorization: Bearer $HALFDOZEN_DM_MCP_API_KEY" | head -n 1

curl -is "$HUB_ENDPOINT" | head -n 1
curl -is "$HUB_ENDPOINT" -H "Authorization: Bearer $HUB_API_TOKEN" | head -n 1
```

## 4) Optional: Revoke Package After Successful Onboarding

```bash
curl -fsS -X POST "${DELIVERY_BROKER_ENDPOINT}/v1/delivery/${DELIVERY_ID}/revoke" \
  -H "Authorization: Bearer ${DELIVERY_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Onboarding complete"}'
```

## 5) Session Cleanup

```bash
unset HALFDOZEN_DM_MCP_API_KEY
unset HUB_API_TOKEN
unset DM_ENDPOINT
unset HUB_ENDPOINT
unset DELIVERY_ID
unset CLIENT_ID
unset DELIVERY_BROKER_ENDPOINT
unset DELIVERY_ADMIN_TOKEN
```
