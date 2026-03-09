#!/usr/bin/env bash
set -euo pipefail

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "missing required command: $1" >&2
    exit 1
  fi
}

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "missing required env var: ${name}" >&2
    exit 1
  fi
}

json_escape() {
  jq -Rn --arg value "$1" '$value'
}

post_json() {
  local method="$1"
  local url="$2"
  local auth_header="$3"
  local payload="$4"
  local extra_header_name="${5:-}"
  local extra_header_value="${6:-}"
  local body_file status
  body_file="$(mktemp)"
  status="$(
    curl -sS -o "$body_file" -w "%{http_code}" -X "$method" "$url" \
      -H "$auth_header" \
      -H "Content-Type: application/json" \
      ${extra_header_name:+-H "$extra_header_name: $extra_header_value"} \
      --data "$payload"
  )"
  printf '%s\n%s\n' "$status" "$body_file"
}

call_hub() {
  local session_token="$1"
  local payload="$2"
  post_json "POST" "${HUB_BASE_URL%/}/mcp" "Authorization: Bearer ${HUB_API_TOKEN}" "$payload" "X-MCP-Session-Token" "$session_token"
}

assert_json_eq() {
  local file="$1"
  local expr="$2"
  local expected="$3"
  local actual
  actual="$(jq -r "$expr" "$file")"
  if [[ "$actual" != "$expected" ]]; then
    echo "assertion failed: expected $expr == $expected, got $actual" >&2
    cat "$file" >&2
    exit 1
  fi
}

assert_json_true() {
  local file="$1"
  local expr="$2"
  if ! jq -e "$expr" "$file" >/dev/null 2>&1; then
    echo "assertion failed: expected truthy jq expression: $expr" >&2
    cat "$file" >&2
    exit 1
  fi
}

mint_session() {
  local account_id="$1"
  local toolkit_profile_json="$2"
  local consent_record_id="$3"
  local body_file status payload now_iso
  now_iso="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  payload="$(jq -cn \
    --arg account_id "$account_id" \
    --arg host "${MCP_SESSION_HOST:-codex}" \
    --arg actor "${VERIFY_ACTOR:-operator:policy-os-live-verify}" \
    --arg consent_record_id "$consent_record_id" \
    --arg consent_granted_at "$now_iso" \
    --arg client_slug "${VERIFY_CLIENT_SLUG:-policy-os-live-verification}" \
    --arg workspace_account_id "$account_id" \
    --argjson toolkit_profile "$toolkit_profile_json" \
    '{
      account_id: $account_id,
      host: $host,
      tool_mode: "read_write",
      toolkit_profile: $toolkit_profile,
      actor: $actor,
      consent_record_id: $consent_record_id,
      consent_granted_at: $consent_granted_at,
      metadata: {
        client_slug: $client_slug,
        workspace_account_id: $workspace_account_id
      }
    }'
  )"
  readarray -t result < <(post_json "POST" "${IDENTITY_BASE_URL%/}/v1/mcp/sessions/admin-mint" "Authorization: Bearer ${IDENTITY_API_KEY}" "$payload")
  status="${result[0]}"
  body_file="${result[1]}"
  if [[ "$status" != "200" ]]; then
    echo "failed to mint session for ${account_id} (status=${status})" >&2
    cat "$body_file" >&2
    rm -f "$body_file"
    exit 1
  fi
  jq -r '.token' "$body_file"
  rm -f "$body_file"
}

print_section() {
  printf '\n== %s ==\n' "$1"
}

main() {
  require_cmd curl
  require_cmd jq

  : "${AGENCY_BASE_URL:=https://agency.createsomething.agency}"
  : "${IDENTITY_BASE_URL:=https://id.createsomething.space}"
  : "${HUB_BASE_URL:=https://cs-mcp-hub-remote.createsomething.workers.dev}"
  : "${POLICY_OS_ONLY_SERVER_NAME:=create-something}"
  : "${POLICY_OS_ONLY_QUERY:=policy}"
  : "${PAID_DISCOVERY_SERVER_NAME:=composio-toolkit-slack}"
  : "${PAID_DISCOVERY_QUERY:=send message}"
  : "${MCP_ONLY_WRITE_PROXY_TOOL_NAME:=composio-toolkit-googlesheets__googlesheets_values_update}"
  : "${MCP_ONLY_WRITE_ARGS_JSON:='{\"spreadsheet_id\":\"demo\",\"range\":\"Sheet1!A1\",\"value_input_option\":\"RAW\",\"values\":[[\"test\"]]}'}"
  : "${MCP_ONLY_TOOLKIT_PROFILE_JSON:=[]}"
  : "${POLICY_OS_TOOLKIT_PROFILE_JSON:=[\"slack\"]}"

  require_env AGENCY_INTERNAL_API_KEY
  require_env IDENTITY_API_KEY
  require_env HUB_API_TOKEN
  require_env MCP_ONLY_AUTH_SUBJECT
  require_env MCP_ONLY_ACCOUNT_ID
  require_env MCP_ONLY_TENANT_ID
  require_env POLICY_OS_AUTH_SUBJECT
  require_env POLICY_OS_ACCOUNT_ID
  require_env POLICY_OS_TENANT_ID

  print_section "Step 1: agency entitlement"
  local payload result status body_file

  payload="$(jq -cn \
    --arg auth_subject "$MCP_ONLY_AUTH_SUBJECT" \
    --arg account_id "$MCP_ONLY_ACCOUNT_ID" \
    --arg tenant_id "$MCP_ONLY_TENANT_ID" \
    '{auth_subject: $auth_subject, account_id: $account_id, tenant_id: $tenant_id}'
  )"
  readarray -t result < <(post_json "POST" "${AGENCY_BASE_URL%/}/api/internal/mcp-entitlements/check" "Authorization: Bearer ${AGENCY_INTERNAL_API_KEY}" "$payload")
  status="${result[0]}"
  body_file="${result[1]}"
  [[ "$status" == "200" ]] || { echo "agency entitlement check failed for mcp_only (status=${status})" >&2; cat "$body_file" >&2; exit 1; }
  assert_json_eq "$body_file" '.service_tier' 'mcp_only'
  assert_json_true "$body_file" '.allowed == true'
  rm -f "$body_file"
  echo "mcp_only entitlement=ok"

  payload="$(jq -cn \
    --arg auth_subject "$POLICY_OS_AUTH_SUBJECT" \
    --arg account_id "$POLICY_OS_ACCOUNT_ID" \
    --arg tenant_id "$POLICY_OS_TENANT_ID" \
    '{auth_subject: $auth_subject, account_id: $account_id, tenant_id: $tenant_id}'
  )"
  readarray -t result < <(post_json "POST" "${AGENCY_BASE_URL%/}/api/internal/mcp-entitlements/check" "Authorization: Bearer ${AGENCY_INTERNAL_API_KEY}" "$payload")
  status="${result[0]}"
  body_file="${result[1]}"
  [[ "$status" == "200" ]] || { echo "agency entitlement check failed for policy os actor (status=${status})" >&2; cat "$body_file" >&2; exit 1; }
  assert_json_true "$body_file" '.allowed == true'
  assert_json_true "$body_file" '.service_tier == "policy_os_trial" or .service_tier == "policy_os_core"'
  assert_json_true "$body_file" '.entitlement_snapshot.billing_active == true'
  assert_json_true "$body_file" '.entitlement_snapshot.contract_active == true'
  assert_json_true "$body_file" '.entitlement_snapshot.policy_accepted == true'
  rm -f "$body_file"
  echo "policy_os entitlement=ok"

  print_section "Step 2: session tokens"
  if [[ -z "${MCP_ONLY_SESSION_TOKEN:-}" ]]; then
    MCP_ONLY_SESSION_TOKEN="$(mint_session "$MCP_ONLY_ACCOUNT_ID" "$MCP_ONLY_TOOLKIT_PROFILE_JSON" "consent_policy_os_live_verify_mcp_only")"
    export MCP_ONLY_SESSION_TOKEN
    echo "minted mcp_only session token"
  else
    echo "using provided mcp_only session token"
  fi

  if [[ -z "${POLICY_OS_SESSION_TOKEN:-}" ]]; then
    POLICY_OS_SESSION_TOKEN="$(mint_session "$POLICY_OS_ACCOUNT_ID" "$POLICY_OS_TOOLKIT_PROFILE_JSON" "consent_policy_os_live_verify_policy_os")"
    export POLICY_OS_SESSION_TOKEN
    echo "minted policy_os session token"
  else
    echo "using provided policy_os session token"
  fi

  print_section "Step 3: identity resolve"
  payload="$(jq -cn --arg token "$MCP_ONLY_SESSION_TOKEN" '{token: $token}')"
  readarray -t result < <(post_json "POST" "${IDENTITY_BASE_URL%/}/v1/mcp/sessions/resolve" "Authorization: Bearer ${IDENTITY_API_KEY}" "$payload")
  status="${result[0]}"
  body_file="${result[1]}"
  [[ "$status" == "200" ]] || { echo "identity resolve failed for mcp_only (status=${status})" >&2; cat "$body_file" >&2; exit 1; }
  assert_json_true "$body_file" '.valid == true'
  assert_json_eq "$body_file" '.account_id' "$MCP_ONLY_ACCOUNT_ID"
  assert_json_eq "$body_file" '.service_tier' 'mcp_only'
  assert_json_true "$body_file" '.entitlement_snapshot != null'
  rm -f "$body_file"
  echo "mcp_only resolve=ok"

  payload="$(jq -cn --arg token "$POLICY_OS_SESSION_TOKEN" '{token: $token}')"
  readarray -t result < <(post_json "POST" "${IDENTITY_BASE_URL%/}/v1/mcp/sessions/resolve" "Authorization: Bearer ${IDENTITY_API_KEY}" "$payload")
  status="${result[0]}"
  body_file="${result[1]}"
  [[ "$status" == "200" ]] || { echo "identity resolve failed for policy_os actor (status=${status})" >&2; cat "$body_file" >&2; exit 1; }
  assert_json_true "$body_file" '.valid == true'
  assert_json_eq "$body_file" '.account_id' "$POLICY_OS_ACCOUNT_ID"
  assert_json_true "$body_file" '.service_tier == "policy_os_trial" or .service_tier == "policy_os_core"'
  assert_json_true "$body_file" '.entitlement_snapshot != null'
  rm -f "$body_file"
  echo "policy_os resolve=ok"

  print_section "Step 4: strict hub precondition"
  readarray -t result < <(post_json "POST" "${HUB_BASE_URL%/}/mcp" "Authorization: Bearer ${HUB_API_TOKEN}" '{"jsonrpc":"2.0","id":"policy-os-missing-session","method":"tools/list"}')
  status="${result[0]}"
  body_file="${result[1]}"
  if jq -e '.result != null and .error == null' "$body_file" >/dev/null 2>&1; then
    echo "hub strict identity check failed: request without X-MCP-Session-Token unexpectedly succeeded" >&2
    cat "$body_file" >&2
    exit 1
  fi
  if ! grep -qiE 'X-MCP-Session-Token|session_required|Unauthorized MCP session token|Missing X-MCP-Session-Token' "$body_file"; then
    echo "hub strict identity check failed: expected missing session token error" >&2
    cat "$body_file" >&2
    exit 1
  fi
  rm -f "$body_file"
  echo "missing_session_token=enforced"

  readarray -t result < <(call_hub "$MCP_ONLY_SESSION_TOKEN" '{"jsonrpc":"2.0","id":"policy-os-tools-list","method":"tools/list"}')
  status="${result[0]}"
  body_file="${result[1]}"
  [[ "$status" == "200" ]] || { echo "hub tools/list failed for mcp_only (status=${status})" >&2; cat "$body_file" >&2; exit 1; }
  assert_json_true "$body_file" '.result != null and .error == null'
  assert_json_true "$body_file" '.result.tools[]? | select(.name == "hub_search_proxy_tools")'
  rm -f "$body_file"
  echo "tools_list=ok"

  print_section "Step 5: mcp_only cannot discover policy_os_only"
  payload="$(jq -cn \
    --arg serverName "$POLICY_OS_ONLY_SERVER_NAME" \
    --arg query "$POLICY_OS_ONLY_QUERY" \
    '{
      jsonrpc: "2.0",
      id: "policy-os-free-discovery",
      method: "tools/call",
      params: {
        name: "hub_search_proxy_tools",
        arguments: {
          serverName: $serverName,
          query: $query,
          limit: 10
        }
      }
    }'
  )"
  readarray -t result < <(call_hub "$MCP_ONLY_SESSION_TOKEN" "$payload")
  status="${result[0]}"
  body_file="${result[1]}"
  [[ "$status" == "200" ]] || { echo "hub search failed for mcp_only discovery check (status=${status})" >&2; cat "$body_file" >&2; exit 1; }
  if jq -e '.result.structuredContent.tools? | length > 0' "$body_file" >/dev/null 2>&1; then
    echo "mcp_only discovery unexpectedly returned policy_os_only tools" >&2
    cat "$body_file" >&2
    exit 1
  fi
  echo "mcp_only policy_os_only discovery=blocked"
  rm -f "$body_file"

  readarray -t result < <(call_hub "$POLICY_OS_SESSION_TOKEN" "$payload")
  status="${result[0]}"
  body_file="${result[1]}"
  [[ "$status" == "200" ]] || { echo "hub search failed for paid discovery check (status=${status})" >&2; cat "$body_file" >&2; exit 1; }
  if jq -e '.error != null' "$body_file" >/dev/null 2>&1; then
    echo "paid actor discovery returned JSON-RPC error" >&2
    cat "$body_file" >&2
    exit 1
  fi
  echo "policy_os policy_os_only discovery=not_service_tier_blocked"
  rm -f "$body_file"

  print_section "Step 6: mcp_only paid write deny"
  payload="$(jq -cn \
    --arg proxyToolName "$MCP_ONLY_WRITE_PROXY_TOOL_NAME" \
    --argjson args "$MCP_ONLY_WRITE_ARGS_JSON" \
    '{
      jsonrpc: "2.0",
      id: "policy-os-free-write",
      method: "tools/call",
      params: {
        name: "hub_execute_proxy_tool",
        arguments: {
          proxyToolName: $proxyToolName,
          args: $args
        }
      }
    }'
  )"
  readarray -t result < <(call_hub "$MCP_ONLY_SESSION_TOKEN" "$payload")
  status="${result[0]}"
  body_file="${result[1]}"
  [[ "$status" == "200" ]] || { echo "hub execute failed unexpectedly for mcp_only write check (status=${status})" >&2; cat "$body_file" >&2; exit 1; }
  if jq -e '.result != null and .error == null' "$body_file" >/dev/null 2>&1; then
    echo "mcp_only write check unexpectedly succeeded" >&2
    cat "$body_file" >&2
    exit 1
  fi
  if ! grep -qiE 'paid governed write|mcp-only access does not include paid governed write|policy' "$body_file"; then
    echo "mcp_only write check failed without expected service-tier deny signal" >&2
    cat "$body_file" >&2
    exit 1
  fi
  echo "mcp_only paid_write=blocked"
  rm -f "$body_file"

  print_section "Step 7: paid discovery path"
  payload="$(jq -cn \
    --arg serverName "$PAID_DISCOVERY_SERVER_NAME" \
    --arg query "$PAID_DISCOVERY_QUERY" \
    '{
      jsonrpc: "2.0",
      id: "policy-os-paid-discovery",
      method: "tools/call",
      params: {
        name: "hub_search_proxy_tools",
        arguments: {
          serverName: $serverName,
          query: $query,
          limit: 10
        }
      }
    }'
  )"
  readarray -t result < <(call_hub "$POLICY_OS_SESSION_TOKEN" "$payload")
  status="${result[0]}"
  body_file="${result[1]}"
  [[ "$status" == "200" ]] || { echo "hub paid discovery failed (status=${status})" >&2; cat "$body_file" >&2; exit 1; }
  if jq -e '.error != null' "$body_file" >/dev/null 2>&1; then
    echo "paid discovery returned JSON-RPC error" >&2
    cat "$body_file" >&2
    exit 1
  fi
  echo "policy_os paid_discovery=ok"
  rm -f "$body_file"

  print_section "Complete"
  echo "policy_os_live_verification=ok"
}

main "$@"
