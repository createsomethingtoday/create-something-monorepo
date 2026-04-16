#!/usr/bin/env bash
# test-fleet-urls.sh — probe every deployment in fleet.json with MCP initialize.
#
# Unauthenticated run (shows auth gates):
#   bash config/mcp-hub/test-fleet-urls.sh
#
# Authenticated run via Infisical (tests bearer-protected hubs end-to-end):
#   infisical run --env=prod --path=/mcp-hub -- bash config/mcp-hub/test-fleet-urls.sh
#
# Auth reads bearer tokens from env var names declared in fleet.json
# (auth.bearer_token_env_var). Missing vars produce a 401 row, not a failure.

set -uo pipefail

FLEET_JSON="${FLEET_JSON:-$(dirname "$0")/fleet.json}"
TIMEOUT="${TIMEOUT:-15}"

command -v jq >/dev/null || { echo "jq required"; exit 1; }

probe() {
  local slug="$1" url="$2" env_var="${3:-}"
  local headers=(-H "Content-Type: application/json" -H "Accept: application/json, text/event-stream")
  local auth_note="—"
  if [ -n "$env_var" ]; then
    local token="${!env_var:-}"
    if [ -n "$token" ]; then
      headers+=(-H "Authorization: Bearer $token")
      auth_note="✓ $env_var"
    else
      auth_note="✗ $env_var"
    fi
  fi
  local body='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"fleet-probe","version":"1.0"}}}'
  local resp
  resp=$(curl -sS -o /tmp/mcp.$$ -w "%{http_code}|%{time_total}" --max-time "$TIMEOUT" \
    -X POST "${headers[@]}" --data "$body" "$url" 2>&1) || resp="000|timeout"
  local code="${resp%%|*}" time="${resp#*|}"
  local result="?"
  case "$code" in
    200) result="✓ MCP OK" ;;
    401|403) result="⚠ auth gate" ;;
    404) result="✗ missing" ;;
    5*) result="✗ server err" ;;
    000) result="✗ network" ;;
    *) result="? $code" ;;
  esac
  printf '%-32s %-3s %6ss  %-14s  %s\n' "$slug" "$code" "$time" "$result" "$auth_note"
  rm -f /tmp/mcp.$$
}

printf '%-32s %-3s %7s  %-14s  %s\n' "DEPLOYMENT" "HTTP" "TIME" "RESULT" "AUTH"
echo "---"

jq -r '
  .deployments
  | to_entries[]
  | [.key, .value.url, (.value.auth.bearer_token_env_var // "")]
  | @tsv
' "$FLEET_JSON" | while IFS=$'\t' read -r slug url env_var; do
  probe "$slug" "$url" "$env_var"
done

echo "---"
echo "Legend: ✓ MCP OK = initialize handshake returned 200"
echo "        ⚠ auth gate = endpoint live, rejected unauthenticated (expected for policy_os_hub)"
echo "        ✗ missing/server err/network = needs investigation"
