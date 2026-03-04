#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HUB_DIR="$ROOT_DIR/packages/cs-mcp-hub-remote"

WORKERS=(
  "cs-hub-lainy"
  "cs-hub-danny"
  "cs-hub-august"
  "cs-hub-filip"
  "cs-hub-leah"
  "cs-hub-mj"
  "cs-mcp-hub-remote"
)

REQUIRED_SECRETS=(
  "HUB_API_TOKEN"
  "BRAINTRUST_API_KEY"
  "BRAINTRUST_PROJECT_ID"
)

SHARED_AUTH_SERVERS=(
  "composio-toolkit-dropbox"
  "composio-toolkit-gmail"
  "composio-toolkit-youtube"
  "composio-toolkit-googlesheets"
  "composio-toolkit-googledrive"
  "composio-toolkit-zoom"
  "composio-toolkit-slack"
  "composio-toolkit-quickbooks"
  "composio-toolkit-linkedin"
  "composio-toolkit-notion"
)

join_by_comma() {
  local IFS=','
  echo "$*"
}

SHARED_AUTH_SERVERS_CSV="$(join_by_comma "${SHARED_AUTH_SERVERS[@]}")"

health_url_for_worker() {
  case "$1" in
    "cs-hub-lainy") echo "https://lainy.mcp.createsomething.agency/health" ;;
    "cs-hub-danny") echo "https://danny.mcp.createsomething.agency/health" ;;
    "cs-hub-august") echo "https://august.mcp.createsomething.agency/health" ;;
    "cs-hub-filip") echo "https://fillip.mcp.createsomething.agency/health" ;;
    "cs-hub-leah") echo "https://leah.mcp.createsomething.agency/health" ;;
    "cs-hub-mj") echo "https://mj.mcp.createsomething.agency/health" ;;
    "cs-mcp-hub-remote") echo "https://cs-mcp-hub-remote.createsomething.workers.dev/health" ;;
    *)
      return 1
      ;;
  esac
}

mcp_url_for_worker() {
  case "$1" in
    "cs-hub-lainy") echo "https://lainy.mcp.createsomething.agency/mcp" ;;
    "cs-hub-danny") echo "https://danny.mcp.createsomething.agency/mcp" ;;
    "cs-hub-august") echo "https://august.mcp.createsomething.agency/mcp" ;;
    "cs-hub-filip") echo "https://fillip.mcp.createsomething.agency/mcp" ;;
    "cs-hub-leah") echo "https://leah.mcp.createsomething.agency/mcp" ;;
    "cs-hub-mj") echo "https://mj.mcp.createsomething.agency/mcp" ;;
    "cs-mcp-hub-remote") echo "https://cs-mcp-hub-remote.createsomething.workers.dev/mcp" ;;
    *)
      return 1
      ;;
  esac
}

token_env_var_for_worker() {
  case "$1" in
    "cs-hub-lainy") echo "CS_HUB_LAINY_API_TOKEN" ;;
    "cs-hub-danny") echo "CS_HUB_DANNY_API_TOKEN" ;;
    "cs-hub-august") echo "CS_HUB_AUGUST_API_TOKEN" ;;
    "cs-hub-filip") echo "CS_HUB_FILLIP_API_TOKEN" ;;
    "cs-hub-leah") echo "CS_HUB_LEAH_API_TOKEN" ;;
    "cs-hub-mj") echo "CS_HUB_MJ_API_TOKEN" ;;
    "cs-mcp-hub-remote") echo "CS_MCP_HUB_REMOTE_API_TOKEN" ;;
    *)
      return 1
      ;;
  esac
}

resolve_worker_token() {
  local worker="$1"
  local token_var_name
  token_var_name="$(token_env_var_for_worker "$worker")"
  local token="${!token_var_name:-}"
  if [[ -z "$token" && "$worker" == "cs-hub-filip" ]]; then
    token="${CS_HUB_FILIP_API_TOKEN:-}"
  fi
  if [[ -z "$token" ]]; then
    token="${HUB_API_TOKEN:-}"
  fi
  echo "$token"
}

expected_account_id_for_worker() {
  case "$1" in
    "cs-hub-lainy") echo "acct_lainy" ;;
    "cs-hub-danny") echo "acct_danny" ;;
    "cs-hub-august") echo "acct_august" ;;
    "cs-hub-filip") echo "acct_fillip" ;;
    "cs-hub-leah") echo "acct_leah" ;;
    "cs-hub-mj") echo "acct_mj" ;;
    *)
      echo ""
      ;;
  esac
}

check_mcp_protocol() {
  local worker="$1"
  local mcp_url
  mcp_url="$(mcp_url_for_worker "$worker")"
  local token_var_name
  token_var_name="$(token_env_var_for_worker "$worker")"
  local token
  token="$(resolve_worker_token "$worker")"
  local token_help="${token_var_name} (or HUB_API_TOKEN)"

  if [[ -z "$token" ]]; then
    echo "missing API token for ${worker} (${token_help})"
    failures=1
    return
  fi

  local init_headers init_body init_status session_id
  init_headers="$(mktemp)"
  init_body="$(mktemp)"
  init_status="$(
    curl -sS -o "$init_body" -D "$init_headers" -w "%{http_code}" \
      -X POST "$mcp_url" \
      -H "Authorization: Bearer ${token}" \
      -H 'Content-Type: application/json' \
      -H 'Accept: application/json' \
      --data '{"jsonrpc":"2.0","id":"fleet-verify-init","method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"cs-hub-fleet-verify","version":"1.0.0"},"capabilities":{}}}'
  )"

  if [[ "$init_status" != "200" ]]; then
    echo "initialize failed for ${worker} (status=${init_status})"
    cat "$init_body"
    failures=1
    rm -f "$init_headers" "$init_body"
    return
  fi

  if ! jq -e '.error == null and .result != null' "$init_body" >/dev/null; then
    echo "initialize returned JSON-RPC error for ${worker}"
    cat "$init_body"
    failures=1
    rm -f "$init_headers" "$init_body"
    return
  fi

  if ! jq -e '.result.capabilities.resources != null' "$init_body" >/dev/null; then
    echo "initialize missing resources capability for ${worker}"
    cat "$init_body"
    failures=1
    rm -f "$init_headers" "$init_body"
    return
  fi

  session_id="$(
    tr -d '\r' < "$init_headers" \
      | awk -F': ' 'tolower($1) == "mcp-session-id" { print $2 }' \
      | tail -n 1
  )"

  local list_headers list_body list_status
  list_headers="$(mktemp)"
  list_body="$(mktemp)"

  local curl_args=(
    -sS
    -o "$list_body"
    -D "$list_headers"
    -w "%{http_code}"
    -X POST "$mcp_url"
    -H "Authorization: Bearer ${token}"
    -H "Content-Type: application/json"
    -H "Accept: application/json"
    --data '{"jsonrpc":"2.0","id":"fleet-verify-resources-list","method":"resources/list","params":{}}'
  )
  if [[ -n "$session_id" ]]; then
    curl_args+=(-H "Mcp-Session-Id: ${session_id}")
  fi

  list_status="$(curl "${curl_args[@]}")"
  if [[ "$list_status" != "200" ]]; then
    echo "resources/list failed for ${worker} (status=${list_status})"
    cat "$list_body"
    failures=1
    rm -f "$init_headers" "$init_body" "$list_headers" "$list_body"
    return
  fi

  if ! jq -e '.error == null and (.result.resources | type == "array")' "$list_body" >/dev/null; then
    echo "resources/list returned JSON-RPC error for ${worker}"
    cat "$list_body"
    failures=1
    rm -f "$init_headers" "$init_body" "$list_headers" "$list_body"
    return
  fi

  if ! jq -e '.result.resources[]? | select(.uri == "hub://status")' "$list_body" >/dev/null; then
    echo "resources/list missing expected hub://status resource for ${worker}"
    cat "$list_body"
    failures=1
    rm -f "$init_headers" "$init_body" "$list_headers" "$list_body"
    return
  fi

  echo "protocol_check=ok resources=$(jq -r '.result.resources | length' "$list_body")"
  rm -f "$init_headers" "$init_body" "$list_headers" "$list_body"
}

check_account_routing() {
  local worker="$1"
  local expected_account_id
  expected_account_id="$(expected_account_id_for_worker "$worker")"
  if [[ -z "$expected_account_id" ]]; then
    return
  fi

  local mcp_url
  mcp_url="$(mcp_url_for_worker "$worker")"
  local token_var_name
  token_var_name="$(token_env_var_for_worker "$worker")"
  local token
  token="$(resolve_worker_token "$worker")"
  local token_help="${token_var_name} (or HUB_API_TOKEN)"

  if [[ -z "$token" ]]; then
    echo "missing API token for ${worker} (${token_help})"
    failures=1
    return
  fi

  local set_payload='{"jsonrpc":"2.0","id":"fleet-verify-discovery","method":"tools/call","params":{"name":"hub_set_discovery","arguments":{"mode":"full","activeServers":["composio-toolkit-notion"]}}}'
  curl -sS -X POST "$mcp_url" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    --data "$set_payload" >/dev/null || true

  local body_file status
  body_file="$(mktemp)"
  status="$(
    curl -sS -o "$body_file" -w "%{http_code}" -X POST "$mcp_url" \
      -H "Authorization: Bearer ${token}" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json" \
      --data '{"jsonrpc":"2.0","id":"fleet-verify-account","method":"tools/call","params":{"name":"hub_execute_proxy_tool","arguments":{"proxyToolName":"composio-toolkit-notion__connection_status","args":{}}}}'
  )"

  if [[ "$status" != "200" ]]; then
    echo "account routing check failed for ${worker} (status=${status})"
    cat "$body_file"
    failures=1
    rm -f "$body_file"
    return
  fi

  local actual_account_id
  actual_account_id="$(
    jq -r '
      .result.content[0].text
      | fromjson?
      | .entityId // empty
    ' "$body_file"
  )"

  if [[ "$actual_account_id" != "$expected_account_id" ]]; then
    echo "account routing mismatch for ${worker}"
    echo "expected=${expected_account_id}"
    echo "actual=${actual_account_id:-<empty>}"
    cat "$body_file"
    failures=1
    rm -f "$body_file"
    return
  fi

  echo "account_routing=ok account_id=${actual_account_id}"
  rm -f "$body_file"
}

failures=0
cd "$HUB_DIR"

echo "Checking required secrets on each worker..."
for worker in "${WORKERS[@]}"; do
  echo "===== SECRETS ${worker} ====="
  secrets_json="$(pnpm exec wrangler secret list --name "$worker")"
  for secret_name in "${REQUIRED_SECRETS[@]}"; do
    if echo "$secrets_json" | jq -e --arg name "$secret_name" '.[] | select(.name == $name)' >/dev/null; then
      echo "ok: ${secret_name}"
    else
      echo "missing: ${secret_name}"
      failures=1
    fi
  done
  echo
done

echo "Checking health endpoints..."
for worker in "${WORKERS[@]}"; do
  health_url="$(health_url_for_worker "$worker")"
  echo "===== HEALTH ${worker} ====="
  health_json="$(curl -fsS "$health_url")"
  built_at="$(echo "$health_json" | jq -r '.built_at // "unknown"')"
  auth_required="$(echo "$health_json" | jq -r '.auth_required // "false"')"
  telemetry_db="$(echo "$health_json" | jq -r '.policy.quota.telemetryDbConfigured // "false"')"
  echo "built_at=${built_at}"
  echo "auth_required=${auth_required}"
  echo "telemetryDbConfigured=${telemetry_db}"
  if [[ "$auth_required" != "true" || "$telemetry_db" != "true" ]]; then
    echo "health check failed for ${worker}"
    failures=1
  fi

  if [[ "$worker" == "cs-hub-lainy" || "$worker" == "cs-hub-danny" || "$worker" == "cs-hub-august" || "$worker" == "cs-hub-filip" || "$worker" == "cs-hub-leah" ]]; then
    enabled_sorted_csv="$(
      echo "$health_json" | jq -r '.enabled_servers // [] | sort | join(",")'
    )"
    expected_sorted_csv="$(
      printf '%s\n' "$SHARED_AUTH_SERVERS_CSV" | tr ',' '\n' | sort | paste -sd',' -
    )"
    if [[ "$enabled_sorted_csv" != "$expected_sorted_csv" ]]; then
      echo "enabled server policy mismatch for ${worker}"
      echo "expected=${expected_sorted_csv}"
      echo "actual=${enabled_sorted_csv}"
      failures=1
    else
      echo "enabled_server_policy=shared_auth_core"
    fi
  fi

  if [[ "$worker" == "cs-hub-mj" ]]; then
    if ! echo "$health_json" | jq -e '.enabled_servers // [] | index("outerfields-pcn")' >/dev/null; then
      echo "expected cs-hub-mj to include broader access (missing outerfields-pcn)"
      failures=1
    else
      echo "enabled_server_policy=mj_broader"
    fi

    if ! echo "$health_json" | jq -e '.enabled_servers // [] | index("meetings")' >/dev/null; then
      echo "expected cs-hub-mj to include meetings"
      failures=1
    else
      echo "enabled_server_policy=mj_meetings_enabled"
    fi
  fi

  echo
done

echo "Checking MCP protocol endpoints (initialize + resources/list)..."
for worker in "${WORKERS[@]}"; do
  echo "===== PROTOCOL ${worker} ====="
  check_mcp_protocol "$worker"
  echo
done

echo "Checking token-only account routing on team hubs..."
for worker in "${WORKERS[@]}"; do
  echo "===== ACCOUNT ${worker} ====="
  check_account_routing "$worker"
  echo
done

if [[ "$failures" -ne 0 ]]; then
  echo "Hub fleet verification failed."
  exit 1
fi

echo "Hub fleet verification passed."
