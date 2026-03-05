#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HUB_DIR="$ROOT_DIR/packages/cs-mcp-hub-remote"

WORKERS=(
  "cs-hub-lainy"
  "cs-hub-danny"
  "cs-hub-august"
  "cs-hub-fillip"
  "cs-hub-leah"
  "cs-hub-mj"
  "cs-mcp-hub-remote"
)

REQUIRED_SECRETS=(
  "HUB_API_TOKEN"
  "HUB_SESSION_RESOLVE_TOKEN"
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
MJ_SERVERS_CSV="${SHARED_AUTH_SERVERS_CSV},meetings"
VERIFY_IDENTITY_MODE="${HUB_VERIFY_IDENTITY_MODE:-compat}"
VERIFY_IDENTITY_MODE="$(printf '%s' "$VERIFY_IDENTITY_MODE" | tr '[:upper:]' '[:lower:]')"

case "$VERIFY_IDENTITY_MODE" in
  "compat"|"session_required")
    ;;
  *)
    echo "invalid HUB_VERIFY_IDENTITY_MODE=${VERIFY_IDENTITY_MODE}; expected compat|session_required" >&2
    exit 1
    ;;
esac

health_url_for_worker() {
  case "$1" in
    "cs-hub-lainy") echo "https://lainy.mcp.createsomething.agency/health" ;;
    "cs-hub-danny") echo "https://danny.mcp.createsomething.agency/health" ;;
    "cs-hub-august") echo "https://august.mcp.createsomething.agency/health" ;;
    "cs-hub-fillip"|"cs-hub-filip") echo "https://fillip.mcp.createsomething.agency/health" ;;
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
    "cs-hub-fillip"|"cs-hub-filip") echo "https://fillip.mcp.createsomething.agency/mcp" ;;
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
    "cs-hub-fillip"|"cs-hub-filip") echo "CS_HUB_FILLIP_API_TOKEN" ;;
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
  if [[ -z "$token" && ( "$worker" == "cs-hub-fillip" || "$worker" == "cs-hub-filip" ) ]]; then
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
    "cs-hub-fillip"|"cs-hub-filip") echo "acct_fillip" ;;
    "cs-hub-leah") echo "acct_leah" ;;
    "cs-hub-mj") echo "acct_mj" ;;
    *)
      return 1
      ;;
  esac
}

resolve_secret_check_worker_name() {
  local worker="$1"
  if [[ "$worker" != "cs-hub-fillip" ]]; then
    echo "$worker"
    return 0
  fi
  if pnpm exec wrangler secret list --name "cs-hub-fillip" >/dev/null 2>&1; then
    echo "cs-hub-fillip"
    return 0
  fi
  if pnpm exec wrangler secret list --name "cs-hub-filip" >/dev/null 2>&1; then
    echo "cs-hub-filip"
    return 0
  fi
  echo "cs-hub-fillip"
}

reset_discovery_preferences() {
  local mcp_url="$1"
  local token="$2"
  local session_token="${3:-}"
  local reset_payload='{"jsonrpc":"2.0","id":"fleet-verify-discovery-reset","method":"tools/call","params":{"name":"hub_set_discovery","arguments":{"reset":true}}}'
  local curl_args=(
    -sS
    -X POST "$mcp_url"
    -H "Authorization: Bearer ${token}"
    -H "Content-Type: application/json"
    -H "Accept: application/json"
    --data "$reset_payload"
  )
  if [[ -n "$session_token" ]]; then
    curl_args+=(-H "X-MCP-Session-Token: ${session_token}")
  fi
  curl "${curl_args[@]}" >/dev/null || true
}

create_fleet_verify_session() {
  local identity_base_url="${IDENTITY_BASE_URL:-https://id.createsomething.space}"
  local identity_access_token="${IDENTITY_ACCESS_TOKEN:-}"
  local tenant_id="${MCP_SESSION_TENANT_ID:-fleet_verify}"
  local host="${MCP_SESSION_HOST:-fleet_verify}"
  local toolkit_profile_json="${MCP_SESSION_TOOLKIT_PROFILE_JSON:-[\"dropbox\",\"gmail\",\"youtube\",\"googlesheets\",\"googledrive\",\"zoom\",\"slack\",\"quickbooks\",\"linkedin\",\"notion\"]}"

  if [[ -n "${MCP_SESSION_TOKEN:-}" ]]; then
    FLEET_VERIFY_SESSION_TOKEN="$MCP_SESSION_TOKEN"
    FLEET_VERIFY_ACCOUNT_ID="${MCP_SESSION_ACCOUNT_ID:-}"
    echo "session_token_source=env"
    return 0
  fi

  if [[ -z "$identity_access_token" ]]; then
    echo "missing MCP_SESSION_TOKEN or IDENTITY_ACCESS_TOKEN for session-based E2E checks"
    return 1
  fi

  create_one_identity_session() {
    local suffix="$1"
    local create_url="${identity_base_url%/}/v1/mcp/sessions"
    local body_file status
    body_file="$(mktemp)"
    status="$(
      curl -sS -o "$body_file" -w "%{http_code}" -X POST "$create_url" \
        -H "Authorization: Bearer ${identity_access_token}" \
        -H "Content-Type: application/json" \
        --data "$(jq -cn --arg tenant "$tenant_id" --arg host "${host}-${suffix}" --argjson toolkitProfile "$toolkit_profile_json" '{
          tenant_id: $tenant,
          host: $host,
          toolkit_profile: $toolkitProfile,
          tool_mode: "read_write",
          ttl_seconds: 3600
        }')"
    )"

    if [[ "$status" != "200" ]]; then
      echo "failed to create MCP session via identity-worker (status=${status})"
      cat "$body_file"
      rm -f "$body_file"
      return 1
    fi

    local token account_id session_id
    token="$(jq -r '.token // empty' "$body_file")"
    account_id="$(jq -r '.account_id // empty' "$body_file")"
    session_id="$(jq -r '.session_id // empty' "$body_file")"
    rm -f "$body_file"

    if [[ -z "$token" || -z "$account_id" ]]; then
      echo "identity-worker create session response missing token/account_id"
      return 1
    fi

    echo "${token}|${account_id}|${session_id}"
  }

  local first second
  if ! first="$(create_one_identity_session primary)"; then
    return 1
  fi
  if ! second="$(create_one_identity_session secondary)"; then
    return 1
  fi

  local first_token first_account first_session
  local second_token second_account second_session
  IFS='|' read -r first_token first_account first_session <<< "$first"
  IFS='|' read -r second_token second_account second_session <<< "$second"

  if [[ "$first_account" != "$second_account" ]]; then
    echo "stable-account check failed: account_id changed for same user+tenant"
    echo "first_account=${first_account}"
    echo "second_account=${second_account}"
    return 1
  fi

  FLEET_VERIFY_SESSION_TOKEN="$first_token"
  FLEET_VERIFY_ACCOUNT_ID="$first_account"

  echo "session_token_source=identity_worker account_id=${FLEET_VERIFY_ACCOUNT_ID} stability_check=ok first_session_id=${first_session:-unknown} second_session_id=${second_session:-unknown}"
  return 0
}

check_mcp_protocol() {
  local worker="$1"
  local mcp_url token_var_name token token_help
  mcp_url="$(mcp_url_for_worker "$worker")"
  token_var_name="$(token_env_var_for_worker "$worker")"
  token="$(resolve_worker_token "$worker")"
  token_help="${token_var_name} (or HUB_API_TOKEN)"

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

check_missing_session_token_rejected() {
  local worker="$1"
  local mcp_url token_var_name token token_help
  mcp_url="$(mcp_url_for_worker "$worker")"
  token_var_name="$(token_env_var_for_worker "$worker")"
  token="$(resolve_worker_token "$worker")"
  token_help="${token_var_name} (or HUB_API_TOKEN)"

  if [[ -z "$token" ]]; then
    echo "missing API token for ${worker} (${token_help})"
    failures=1
    return
  fi

  local body_file status
  body_file="$(mktemp)"
  status="$(
    curl -sS -o "$body_file" -w "%{http_code}" -X POST "$mcp_url" \
      -H "Authorization: Bearer ${token}" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json" \
      --data '{"jsonrpc":"2.0","id":"fleet-verify-missing-session","method":"tools/call","params":{"name":"hub_status","arguments":{}}}'
  )"

  if jq -e '.result != null and .error == null' "$body_file" >/dev/null 2>&1; then
    echo "strict identity check failed for ${worker}: request without X-MCP-Session-Token unexpectedly succeeded"
    cat "$body_file"
    failures=1
    rm -f "$body_file"
    return
  fi

  if ! grep -qiE 'X-MCP-Session-Token|session_required|Unauthorized MCP session token|HUB_IDENTITY_MODE' "$body_file"; then
    echo "strict identity check failed for ${worker}: expected session-token error message"
    echo "status=${status}"
    cat "$body_file"
    failures=1
    rm -f "$body_file"
    return
  fi

  echo "missing_session_token=enforced"
  rm -f "$body_file"
}

check_compat_identity_without_session() {
  local worker="$1"
  local mcp_url token_var_name token token_help
  mcp_url="$(mcp_url_for_worker "$worker")"
  token_var_name="$(token_env_var_for_worker "$worker")"
  token="$(resolve_worker_token "$worker")"
  token_help="${token_var_name} (or HUB_API_TOKEN)"

  if [[ -z "$token" ]]; then
    echo "missing API token for ${worker} (${token_help})"
    failures=1
    return
  fi

  local body_file status
  body_file="$(mktemp)"
  status="$(
    curl -sS -o "$body_file" -w "%{http_code}" -X POST "$mcp_url" \
      -H "Authorization: Bearer ${token}" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json" \
      --data '{"jsonrpc":"2.0","id":"fleet-verify-compat-no-session","method":"tools/call","params":{"name":"hub_status","arguments":{}}}'
  )"

  if [[ "$status" != "200" ]]; then
    echo "compat identity check failed for ${worker}: request without X-MCP-Session-Token failed (status=${status})"
    cat "$body_file"
    failures=1
    rm -f "$body_file"
    return
  fi

  if ! jq -e '.result != null and .error == null' "$body_file" >/dev/null 2>&1; then
    echo "compat identity check failed for ${worker}: expected success without X-MCP-Session-Token"
    cat "$body_file"
    failures=1
    rm -f "$body_file"
    return
  fi

  echo "compat_no_session=ok"
  rm -f "$body_file"
}

check_compat_account_routing() {
  local worker="$1"
  local expected_account_id mcp_url token_var_name token token_help
  if ! expected_account_id="$(expected_account_id_for_worker "$worker")"; then
    echo "account_routing=skipped reason=no_expected_account_mapping"
    return
  fi
  mcp_url="$(mcp_url_for_worker "$worker")"
  token_var_name="$(token_env_var_for_worker "$worker")"
  token="$(resolve_worker_token "$worker")"
  token_help="${token_var_name} (or HUB_API_TOKEN)"

  if [[ -z "$token" ]]; then
    echo "missing API token for ${worker} (${token_help})"
    failures=1
    return
  fi

  local probe_body_file probe_status probe_proxy_tool
  probe_body_file="$(mktemp)"
  probe_status="$(
    curl -sS -o "$probe_body_file" -w "%{http_code}" -X POST "$mcp_url" \
      -H "Authorization: Bearer ${token}" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json" \
      --data '{"jsonrpc":"2.0","id":"fleet-verify-compat-search","method":"tools/call","params":{"name":"hub_search_proxy_tools","arguments":{"query":"connection_status","limit":1}}}'
  )"
  if [[ "$probe_status" != "200" ]]; then
    echo "compat account routing probe search failed for ${worker} (status=${probe_status})"
    cat "$probe_body_file"
    failures=1
    rm -f "$probe_body_file"
    return
  fi

  probe_proxy_tool="$(
    jq -r '
      .result.structuredContent.tools[0].proxyToolName //
      (.result.content[0].text | fromjson? | .tools[0].proxyToolName) //
      empty
    ' "$probe_body_file"
  )"
  rm -f "$probe_body_file"
  if [[ -z "$probe_proxy_tool" ]]; then
    echo "compat account routing probe returned no visible proxy tool for ${worker}"
    failures=1
    return
  fi

  local body_file status actual_account_id
  body_file="$(mktemp)"
  status="$(
    curl -sS -o "$body_file" -w "%{http_code}" -X POST "$mcp_url" \
      -H "Authorization: Bearer ${token}" \
      -H "X-MCP-Account-Id: acct_spoof_attempt" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json" \
      --data "$(jq -cn --arg proxyToolName "$probe_proxy_tool" '{
        jsonrpc: "2.0",
        id: "fleet-verify-compat-account",
        method: "tools/call",
        params: {
          name: "hub_execute_proxy_tool",
          arguments: {
            proxyToolName: $proxyToolName,
            args: {}
          }
        }
      }')"
  )"
  if [[ "$status" != "200" ]]; then
    echo "compat account routing execution failed for ${worker} (status=${status})"
    cat "$body_file"
    failures=1
    rm -f "$body_file"
    return
  fi

  actual_account_id="$(
    jq -r '
      .result.content[0].text
      | fromjson?
      | .entityId // empty
    ' "$body_file"
  )"
  rm -f "$body_file"
  if [[ -z "$actual_account_id" ]]; then
    echo "compat account routing check failed for ${worker}: could not read entityId from tool response"
    failures=1
    return
  fi
  if [[ "$actual_account_id" != "$expected_account_id" ]]; then
    echo "compat account routing mismatch for ${worker}"
    echo "expected=${expected_account_id}"
    echo "actual=${actual_account_id}"
    failures=1
    return
  fi

  echo "compat_account_routing=ok account_id=${actual_account_id}"
}

check_session_account_routing() {
  local worker="$1"
  local mcp_url token_var_name token token_help
  mcp_url="$(mcp_url_for_worker "$worker")"
  token_var_name="$(token_env_var_for_worker "$worker")"
  token="$(resolve_worker_token "$worker")"
  token_help="${token_var_name} (or HUB_API_TOKEN)"

  if [[ -z "$token" ]]; then
    echo "missing API token for ${worker} (${token_help})"
    failures=1
    return
  fi

  if [[ -z "${FLEET_VERIFY_SESSION_TOKEN:-}" ]]; then
    echo "missing fleet verify MCP session token"
    failures=1
    return
  fi

  local set_payload='{"jsonrpc":"2.0","id":"fleet-verify-discovery","method":"tools/call","params":{"name":"hub_set_discovery","arguments":{"mode":"full","activeServers":[]}}}'
  curl -sS -X POST "$mcp_url" \
    -H "Authorization: Bearer ${token}" \
    -H "X-MCP-Session-Token: ${FLEET_VERIFY_SESSION_TOKEN}" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    --data "$set_payload" >/dev/null || true

  local probe_body_file probe_status probe_proxy_tool
  probe_body_file="$(mktemp)"
  probe_status="$(
    curl -sS -o "$probe_body_file" -w "%{http_code}" -X POST "$mcp_url" \
      -H "Authorization: Bearer ${token}" \
      -H "X-MCP-Session-Token: ${FLEET_VERIFY_SESSION_TOKEN}" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json" \
      --data '{"jsonrpc":"2.0","id":"fleet-verify-search","method":"tools/call","params":{"name":"hub_search_proxy_tools","arguments":{"query":"connection_status","limit":1}}}'
  )"
  if [[ "$probe_status" != "200" ]]; then
    echo "probe search failed for ${worker} (status=${probe_status})"
    cat "$probe_body_file"
    failures=1
    reset_discovery_preferences "$mcp_url" "$token" "$FLEET_VERIFY_SESSION_TOKEN"
    rm -f "$probe_body_file"
    return
  fi
  probe_proxy_tool="$(
    jq -r '
      .result.structuredContent.tools[0].proxyToolName //
      (.result.content[0].text | fromjson? | .tools[0].proxyToolName) //
      empty
    ' "$probe_body_file"
  )"
  rm -f "$probe_body_file"
  if [[ -z "$probe_proxy_tool" ]]; then
    if [[ "$worker" == "cs-mcp-hub-remote" ]]; then
      echo "account_routing=skipped reason=no_visible_proxy_tool"
      reset_discovery_preferences "$mcp_url" "$token" "$FLEET_VERIFY_SESSION_TOKEN"
      return
    fi
    echo "probe search returned no visible proxy tool for ${worker}"
    failures=1
    reset_discovery_preferences "$mcp_url" "$token" "$FLEET_VERIFY_SESSION_TOKEN"
    return
  fi

  local body_file status
  body_file="$(mktemp)"
  status="$(
    curl -sS -o "$body_file" -w "%{http_code}" -X POST "$mcp_url" \
      -H "Authorization: Bearer ${token}" \
      -H "X-MCP-Session-Token: ${FLEET_VERIFY_SESSION_TOKEN}" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json" \
      --data "$(jq -cn --arg proxyToolName "$probe_proxy_tool" '{
        jsonrpc: "2.0",
        id: "fleet-verify-account",
        method: "tools/call",
        params: {
          name: "hub_execute_proxy_tool",
          arguments: {
            proxyToolName: $proxyToolName,
            args: {}
          }
        }
      }')"
  )"

  if [[ "$status" != "200" ]]; then
    echo "account routing check failed for ${worker} (status=${status})"
    cat "$body_file"
    failures=1
    reset_discovery_preferences "$mcp_url" "$token" "$FLEET_VERIFY_SESSION_TOKEN"
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

  if [[ -z "$actual_account_id" ]]; then
    echo "account routing mismatch for ${worker}"
    echo "actual=${actual_account_id:-<empty>}"
    cat "$body_file"
    failures=1
    reset_discovery_preferences "$mcp_url" "$token" "$FLEET_VERIFY_SESSION_TOKEN"
    rm -f "$body_file"
    return
  fi

  if [[ -n "${FLEET_VERIFY_ACCOUNT_ID:-}" && "$actual_account_id" != "$FLEET_VERIFY_ACCOUNT_ID" ]]; then
    echo "account routing mismatch for ${worker}"
    echo "expected=${FLEET_VERIFY_ACCOUNT_ID}"
    echo "actual=${actual_account_id}"
    cat "$body_file"
    failures=1
    reset_discovery_preferences "$mcp_url" "$token" "$FLEET_VERIFY_SESSION_TOKEN"
    rm -f "$body_file"
    return
  fi

  echo "account_routing=ok account_id=${actual_account_id}"
  reset_discovery_preferences "$mcp_url" "$token" "$FLEET_VERIFY_SESSION_TOKEN"
  rm -f "$body_file"
}

failures=0
FLEET_VERIFY_SESSION_TOKEN=""
FLEET_VERIFY_ACCOUNT_ID=""
cd "$HUB_DIR"

echo "Checking required secrets on each worker..."
for worker in "${WORKERS[@]}"; do
  echo "===== SECRETS ${worker} ====="
  secret_check_worker="$(resolve_secret_check_worker_name "$worker")"
  if [[ "$secret_check_worker" != "$worker" ]]; then
    echo "secret_check_target=${secret_check_worker} (legacy alias)"
  fi
  secrets_json="$(pnpm exec wrangler secret list --name "$secret_check_worker")"
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
  identity_mode="$(echo "$health_json" | jq -r '.identity_mode // "unknown"')"
  telemetry_db="$(echo "$health_json" | jq -r '.policy.quota.telemetryDbConfigured // "false"')"
  echo "built_at=${built_at}"
  echo "auth_required=${auth_required}"
  echo "identity_mode=${identity_mode}"
  echo "telemetryDbConfigured=${telemetry_db}"

  if [[ "$auth_required" != "true" || "$telemetry_db" != "true" || "$identity_mode" != "$VERIFY_IDENTITY_MODE" ]]; then
    echo "health check failed for ${worker}"
    failures=1
  fi

  if [[ "$worker" == "cs-hub-lainy" || "$worker" == "cs-hub-danny" || "$worker" == "cs-hub-august" || "$worker" == "cs-hub-fillip" || "$worker" == "cs-hub-leah" ]]; then
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
    enabled_sorted_csv="$(
      echo "$health_json" | jq -r '.enabled_servers // [] | sort | join(",")'
    )"
    expected_sorted_csv="$(
      printf '%s\n' "$MJ_SERVERS_CSV" | tr ',' '\n' | sort | paste -sd',' -
    )"
    if [[ "$enabled_sorted_csv" != "$expected_sorted_csv" ]]; then
      echo "enabled server policy mismatch for cs-hub-mj"
      echo "expected=${expected_sorted_csv}"
      echo "actual=${enabled_sorted_csv}"
      failures=1
    else
      echo "enabled_server_policy=mj_shared_auth_plus_meetings"
    fi
  fi

  echo
done

if [[ "$VERIFY_IDENTITY_MODE" == "session_required" ]]; then
  echo "Creating MCP session token for strict identity E2E..."
  if ! create_fleet_verify_session; then
    failures=1
  fi
  echo

  echo "Checking strict identity enforcement (missing X-MCP-Session-Token should fail)..."
  for worker in "${WORKERS[@]}"; do
    echo "===== STRICT ${worker} ====="
    check_missing_session_token_rejected "$worker"
    echo
  done
else
  echo "Checking compat identity behavior (session token not required)..."
  for worker in "${WORKERS[@]}"; do
    echo "===== COMPAT ${worker} ====="
    check_compat_identity_without_session "$worker"
    echo
  done
fi

echo "Checking MCP protocol endpoints (initialize + resources/list)..."
for worker in "${WORKERS[@]}"; do
  echo "===== PROTOCOL ${worker} ====="
  check_mcp_protocol "$worker"
  echo
done

if [[ "$VERIFY_IDENTITY_MODE" == "session_required" ]]; then
  echo "Checking session-based account routing across hubs..."
  for worker in "${WORKERS[@]}"; do
    echo "===== ACCOUNT ${worker} ====="
    if [[ "$worker" == "cs-mcp-hub-remote" ]]; then
      echo "account_routing=skipped reason=core_hub_probe_timeout_variance"
      echo
      continue
    fi
    check_session_account_routing "$worker"
    echo
  done
else
  echo "Checking token-bound account routing across compat hubs..."
  for worker in "${WORKERS[@]}"; do
    echo "===== ACCOUNT ${worker} ====="
    if [[ "$worker" == "cs-mcp-hub-remote" ]]; then
      echo "account_routing=skipped reason=core_hub_probe_timeout_variance"
      echo
      continue
    fi
    check_compat_account_routing "$worker"
    echo
  done
fi

if [[ "$failures" -ne 0 ]]; then
  echo "Hub fleet verification failed."
  exit 1
fi

echo "Hub fleet verification passed."
