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

host_label_from_value() {
  local value="${1:-}"
  value="${value#*://}"
  value="${value%%/*}"
  value="${value##*@}"
  value="${value%%:*}"
  value="${value%%.*}"
  value="$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')"
  value="$(printf '%s' "$value" | tr -cd 'a-z0-9._-')"
  printf '%s' "$value"
}

tool_prefixes_json_from_toolkit_profile_json() {
  local toolkit_profile_json="$1"
  jq -cn --argjson toolkit_profile "$toolkit_profile_json" '
    if ($toolkit_profile | type) != "array" then
      []
    else
      $toolkit_profile
      | map(select(type == "string"))
      | map(ascii_downcase)
      | map(gsub("[^a-z0-9_]"; "_"))
      | map(gsub("^_+|_+$"; ""))
      | map(select(length > 0))
      | unique
      | map("composio-toolkit-" + . + "__")
    end
  '
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
      --connect-timeout "${CURL_CONNECT_TIMEOUT_SECONDS}" \
      --max-time "${CURL_MAX_TIME_SECONDS}" \
      -H "$auth_header" \
      -H "Content-Type: application/json" \
      ${extra_header_name:+-H "$extra_header_name: $extra_header_value"} \
      --data "$payload"
  )"
  printf '%s\n%s\n' "$status" "$body_file"
}

capture_result() {
  local output
  output="$("$@")"
  RESULT_STATUS="${output%%$'\n'*}"
  RESULT_BODY_FILE="${output#*$'\n'}"
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

issue_managed_bearer() {
  local auth_subject="$1"
  local account_id="$2"
  local tenant_id="$3"
  local toolkit_profile_json="$4"
  local allowed_tool_prefixes_json="$5"
  local bound_host="$6"
  local actor="$7"
  local body_file status payload
  payload="$(jq -cn \
    --arg auth_subject "$auth_subject" \
    --arg account_id "$account_id" \
    --arg tenant_id "$tenant_id" \
    --arg bound_host "$bound_host" \
    --arg actor "$actor" \
    --argjson toolkit_profile "$toolkit_profile_json" \
    --argjson allowed_tool_prefixes "$allowed_tool_prefixes_json" \
    '{
      auth_subject: $auth_subject,
      account_id: $account_id,
      tenant_id: $tenant_id,
      tool_mode: "read_write",
      toolkit_profile: $toolkit_profile,
      allowed_tool_prefixes: $allowed_tool_prefixes,
      actor: $actor,
      metadata: {
        reason: "policy_os_live_verification"
      }
    } + (if $bound_host != "" then {bound_host: $bound_host} else {} end)'
  )"
  capture_result post_json "POST" "${IDENTITY_BASE_URL%/}/v1/mcp/long-lived-tokens/admin-issue" "X-API-Key: ${IDENTITY_API_KEY}" "$payload"
  status="$RESULT_STATUS"
  body_file="$RESULT_BODY_FILE"
  if [[ "$status" != "200" ]]; then
    echo "failed to issue managed bearer for ${account_id} (status=${status})" >&2
    cat "$body_file" >&2
    rm -f "$body_file"
    exit 1
  fi
  jq -r '.token' "$body_file"
  rm -f "$body_file"
}

resolve_identity_token() {
  local token="$1"
  local resource_host="${2:-}"
  local payload
  payload="$(jq -cn --arg token "$token" --arg resource_host "$resource_host" '{
    token: $token
  } + (if $resource_host != "" then {resource_host: $resource_host} else {} end)')"
  post_json "POST" "${IDENTITY_BASE_URL%/}/v1/mcp/sessions/resolve" "X-Session-Resolve-Token: ${MCP_SESSION_RESOLVE_TOKEN}" "$payload"
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
  : "${POLICY_OS_ONLY_PROXY_TOOL_NAME:=create-something__search}"
  : "${PAID_DISCOVERY_PROXY_TOOL_NAME:=composio-toolkit-slack__slack_send_message}"
  : "${MCP_ONLY_WRITE_PROXY_TOOL_NAME:=composio-toolkit-googlesheets__googlesheets_values_update}"
  : "${MCP_ONLY_TOOLKIT_PROFILE_JSON:=[\"googlesheets\"]}"
  : "${POLICY_OS_TOOLKIT_PROFILE_JSON:=[\"slack\"]}"
  : "${POLICY_OS_DENY_EXPECTED_REASON:=billing_inactive}"
  : "${POLICY_OS_DENY_TOOLKIT_PROFILE_JSON:=[\"slack\"]}"
  : "${REQUIRE_AGENCY_ENTITLEMENT_CHECK:=true}"
  : "${MCP_SESSION_RESOLVE_TOKEN:=${HUB_SESSION_RESOLVE_TOKEN:-}}"
  : "${CURL_CONNECT_TIMEOUT_SECONDS:=5}"
  : "${CURL_MAX_TIME_SECONDS:=30}"
  if [[ -z "${MCP_ONLY_WRITE_ARGS_JSON+x}" ]]; then
    MCP_ONLY_WRITE_ARGS_JSON='{"spreadsheet_id":"demo","range":"Sheet1!A1","value_input_option":"RAW","values":[["test"]]}'
  fi

  local default_hub_resource_host
  default_hub_resource_host="$(host_label_from_value "$HUB_BASE_URL")"

  : "${MCP_ONLY_ALLOWED_TOOL_PREFIXES_JSON:=$(tool_prefixes_json_from_toolkit_profile_json "$MCP_ONLY_TOOLKIT_PROFILE_JSON")}"
  : "${POLICY_OS_ALLOWED_TOOL_PREFIXES_JSON:=$(tool_prefixes_json_from_toolkit_profile_json "$POLICY_OS_TOOLKIT_PROFILE_JSON")}"
  : "${POLICY_OS_DENY_ALLOWED_TOOL_PREFIXES_JSON:=$(tool_prefixes_json_from_toolkit_profile_json "$POLICY_OS_DENY_TOOLKIT_PROFILE_JSON")}"
  : "${MCP_ONLY_RESOURCE_HOST:=${default_hub_resource_host}}"
  : "${POLICY_OS_BOUND_HOST:=${default_hub_resource_host}}"
  : "${POLICY_OS_RESOURCE_HOST:=${POLICY_OS_BOUND_HOST}}"
  : "${POLICY_OS_DENY_BOUND_HOST:=${POLICY_OS_BOUND_HOST}}"
  : "${POLICY_OS_DENY_RESOURCE_HOST:=${POLICY_OS_DENY_BOUND_HOST}}"

  if [[ -z "${IDENTITY_API_KEY:-}" && -n "${IDENTITY_WORKER_ADMIN_API_KEY:-}" ]]; then
    export IDENTITY_API_KEY="$IDENTITY_WORKER_ADMIN_API_KEY"
  fi
  if [[ -z "${HUB_API_TOKEN:-}" && -n "${CS_MCP_HUB_REMOTE_API_TOKEN:-}" ]]; then
    export HUB_API_TOKEN="$CS_MCP_HUB_REMOTE_API_TOKEN"
  fi

  require_env IDENTITY_API_KEY
  require_env MCP_SESSION_RESOLVE_TOKEN
  require_env HUB_API_TOKEN
  require_env MCP_ONLY_AUTH_SUBJECT
  require_env MCP_ONLY_ACCOUNT_ID
  require_env MCP_ONLY_TENANT_ID
  require_env POLICY_OS_AUTH_SUBJECT
  require_env POLICY_OS_ACCOUNT_ID
  require_env POLICY_OS_TENANT_ID

  local payload result status body_file
  print_section "Step 1: agency entitlement"
  if [[ "$REQUIRE_AGENCY_ENTITLEMENT_CHECK" == "true" ]]; then
    require_env AGENCY_INTERNAL_API_KEY

    payload="$(jq -cn \
      --arg auth_subject "$MCP_ONLY_AUTH_SUBJECT" \
      --arg account_id "$MCP_ONLY_ACCOUNT_ID" \
      --arg tenant_id "$MCP_ONLY_TENANT_ID" \
      '{auth_subject: $auth_subject, account_id: $account_id, tenant_id: $tenant_id}'
    )"
    capture_result post_json "POST" "${AGENCY_BASE_URL%/}/api/internal/mcp-entitlements/check" "Authorization: Bearer ${AGENCY_INTERNAL_API_KEY}" "$payload"
    status="$RESULT_STATUS"
    body_file="$RESULT_BODY_FILE"
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
    capture_result post_json "POST" "${AGENCY_BASE_URL%/}/api/internal/mcp-entitlements/check" "Authorization: Bearer ${AGENCY_INTERNAL_API_KEY}" "$payload"
    status="$RESULT_STATUS"
    body_file="$RESULT_BODY_FILE"
    [[ "$status" == "200" ]] || { echo "agency entitlement check failed for policy os actor (status=${status})" >&2; cat "$body_file" >&2; exit 1; }
    assert_json_true "$body_file" '.allowed == true'
    assert_json_true "$body_file" '.service_tier == "policy_os_trial" or .service_tier == "policy_os_core"'
    assert_json_true "$body_file" '.entitlement_snapshot.billing_active == true'
    assert_json_true "$body_file" '.entitlement_snapshot.contract_active == true'
    assert_json_true "$body_file" '.entitlement_snapshot.policy_accepted == true'
    rm -f "$body_file"
    echo "policy_os entitlement=ok"
  else
    echo "agency entitlement check=skipped"
  fi

  print_section "Step 2: session tokens"
  if [[ -z "${MCP_ONLY_SESSION_TOKEN:-}" ]]; then
    MCP_ONLY_SESSION_TOKEN="$(issue_managed_bearer "$MCP_ONLY_AUTH_SUBJECT" "$MCP_ONLY_ACCOUNT_ID" "$MCP_ONLY_TENANT_ID" "$MCP_ONLY_TOOLKIT_PROFILE_JSON" "$MCP_ONLY_ALLOWED_TOOL_PREFIXES_JSON" "${MCP_ONLY_BOUND_HOST:-}" "${VERIFY_ACTOR:-operator:policy-os-live-verify}")"
    export MCP_ONLY_SESSION_TOKEN
    echo "issued mcp_only managed bearer"
  else
    echo "using provided mcp_only session token"
  fi

  if [[ -z "${POLICY_OS_SESSION_TOKEN:-}" ]]; then
    POLICY_OS_SESSION_TOKEN="$(issue_managed_bearer "$POLICY_OS_AUTH_SUBJECT" "$POLICY_OS_ACCOUNT_ID" "$POLICY_OS_TENANT_ID" "$POLICY_OS_TOOLKIT_PROFILE_JSON" "$POLICY_OS_ALLOWED_TOOL_PREFIXES_JSON" "$POLICY_OS_BOUND_HOST" "${VERIFY_ACTOR:-operator:policy-os-live-verify}")"
    export POLICY_OS_SESSION_TOKEN
    echo "issued policy_os managed bearer"
  else
    echo "using provided policy_os session token"
  fi

  print_section "Step 3: identity resolve"
  capture_result resolve_identity_token "$MCP_ONLY_SESSION_TOKEN" "$MCP_ONLY_RESOURCE_HOST"
  status="$RESULT_STATUS"
  body_file="$RESULT_BODY_FILE"
  [[ "$status" == "200" ]] || { echo "identity resolve failed for mcp_only (status=${status})" >&2; cat "$body_file" >&2; exit 1; }
  assert_json_true "$body_file" '.valid == true'
  assert_json_eq "$body_file" '.account_id' "$MCP_ONLY_ACCOUNT_ID"
  assert_json_eq "$body_file" '.service_tier' 'mcp_only'
  assert_json_true "$body_file" '.entitlement_snapshot != null'
  rm -f "$body_file"
  echo "mcp_only resolve=ok"

  capture_result resolve_identity_token "$POLICY_OS_SESSION_TOKEN" "$POLICY_OS_RESOURCE_HOST"
  status="$RESULT_STATUS"
  body_file="$RESULT_BODY_FILE"
  [[ "$status" == "200" ]] || { echo "identity resolve failed for policy_os actor (status=${status})" >&2; cat "$body_file" >&2; exit 1; }
  assert_json_true "$body_file" '.valid == true'
  assert_json_eq "$body_file" '.account_id' "$POLICY_OS_ACCOUNT_ID"
  assert_json_true "$body_file" '.service_tier == "policy_os_trial" or .service_tier == "policy_os_core"'
  assert_json_true "$body_file" '.entitlement_snapshot != null'
  rm -f "$body_file"
  echo "policy_os resolve=ok"

  print_section "Step 4: strict hub precondition"
  capture_result post_json "POST" "${HUB_BASE_URL%/}/mcp" "Authorization: Bearer ${HUB_API_TOKEN}" '{"jsonrpc":"2.0","id":"policy-os-missing-session","method":"tools/call","params":{"name":"hub_status","arguments":{}}}'
  status="$RESULT_STATUS"
  body_file="$RESULT_BODY_FILE"
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

  capture_result call_hub "$MCP_ONLY_SESSION_TOKEN" '{"jsonrpc":"2.0","id":"policy-os-hub-status","method":"tools/call","params":{"name":"hub_status","arguments":{}}}'
  status="$RESULT_STATUS"
  body_file="$RESULT_BODY_FILE"
  [[ "$status" == "200" ]] || { echo "hub_status failed for mcp_only (status=${status})" >&2; cat "$body_file" >&2; exit 1; }
  assert_json_true "$body_file" '.result != null and .error == null'
  rm -f "$body_file"
  echo "hub_status=ok"

  print_section "Step 5: mcp_only cannot discover policy_os_only"
  payload="$(jq -cn \
    --arg proxyToolName "$POLICY_OS_ONLY_PROXY_TOOL_NAME" \
    '{
      jsonrpc: "2.0",
      id: "policy-os-free-describe-policy-os-only",
      method: "tools/call",
      params: {
        name: "hub_describe_proxy_tool",
        arguments: {
          proxyToolName: $proxyToolName
        }
      }
    }'
  )"
  capture_result call_hub "$MCP_ONLY_SESSION_TOKEN" "$payload"
  status="$RESULT_STATUS"
  body_file="$RESULT_BODY_FILE"
  [[ "$status" == "200" ]] || { echo "hub describe failed for mcp_only policy_os_only check (status=${status})" >&2; cat "$body_file" >&2; exit 1; }
  assert_json_true "$body_file" '.result.isError == true'
  if ! grep -qiE 'unknown or not visible|not enabled for this session' "$body_file"; then
    echo "mcp_only policy_os_only check failed without expected visibility deny signal" >&2
    cat "$body_file" >&2
    exit 1
  fi
  echo "mcp_only policy_os_only discovery=blocked"
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
  capture_result call_hub "$MCP_ONLY_SESSION_TOKEN" "$payload"
  status="$RESULT_STATUS"
  body_file="$RESULT_BODY_FILE"
  [[ "$status" == "200" ]] || { echo "hub execute failed unexpectedly for mcp_only write check (status=${status})" >&2; cat "$body_file" >&2; exit 1; }
  if jq -e '.result.isError != true' "$body_file" >/dev/null 2>&1; then
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
    --arg proxyToolName "$PAID_DISCOVERY_PROXY_TOOL_NAME" \
    '{
      jsonrpc: "2.0",
      id: "policy-os-paid-describe",
      method: "tools/call",
      params: {
        name: "hub_describe_proxy_tool",
        arguments: {
          proxyToolName: $proxyToolName
        }
      }
    }'
  )"
  capture_result call_hub "$POLICY_OS_SESSION_TOKEN" "$payload"
  status="$RESULT_STATUS"
  body_file="$RESULT_BODY_FILE"
  [[ "$status" == "200" ]] || { echo "hub paid describe failed (status=${status})" >&2; cat "$body_file" >&2; exit 1; }
  assert_json_true "$body_file" '.result.isError != true'
  assert_json_eq "$body_file" '.result.structuredContent.proxyToolName' "$PAID_DISCOVERY_PROXY_TOOL_NAME"
  echo "policy_os paid_discovery=ok"
  rm -f "$body_file"

  print_section "Step 8: staged commercial deny"
  if [[ -n "${POLICY_OS_DENY_AUTH_SUBJECT:-}" ]]; then
    local policy_os_deny_session_token deny_snapshot_expr
    require_env POLICY_OS_DENY_ACCOUNT_ID
    require_env POLICY_OS_DENY_TENANT_ID

    if [[ "$REQUIRE_AGENCY_ENTITLEMENT_CHECK" == "true" ]]; then
      payload="$(jq -cn \
        --arg auth_subject "$POLICY_OS_DENY_AUTH_SUBJECT" \
        --arg account_id "$POLICY_OS_DENY_ACCOUNT_ID" \
        --arg tenant_id "$POLICY_OS_DENY_TENANT_ID" \
        '{auth_subject: $auth_subject, account_id: $account_id, tenant_id: $tenant_id}'
      )"
      capture_result post_json "POST" "${AGENCY_BASE_URL%/}/api/internal/mcp-entitlements/check" "Authorization: Bearer ${AGENCY_INTERNAL_API_KEY}" "$payload"
      status="$RESULT_STATUS"
      body_file="$RESULT_BODY_FILE"
      [[ "$status" == "200" ]] || { echo "agency entitlement check failed for deny actor (status=${status})" >&2; cat "$body_file" >&2; exit 1; }
      assert_json_true "$body_file" '.allowed == false'
      assert_json_eq "$body_file" '.reason' "$POLICY_OS_DENY_EXPECTED_REASON"
      assert_json_true "$body_file" '.service_tier == "policy_os_trial" or .service_tier == "policy_os_core"'
      rm -f "$body_file"
      echo "deny actor entitlement=${POLICY_OS_DENY_EXPECTED_REASON}"
    else
      echo "deny actor entitlement=skipped"
    fi

    if [[ -n "${POLICY_OS_DENY_SESSION_TOKEN:-}" ]]; then
      policy_os_deny_session_token="$POLICY_OS_DENY_SESSION_TOKEN"
      echo "using provided deny actor session token"
    else
      policy_os_deny_session_token="$(issue_managed_bearer "$POLICY_OS_DENY_AUTH_SUBJECT" "$POLICY_OS_DENY_ACCOUNT_ID" "$POLICY_OS_DENY_TENANT_ID" "$POLICY_OS_DENY_TOOLKIT_PROFILE_JSON" "$POLICY_OS_DENY_ALLOWED_TOOL_PREFIXES_JSON" "$POLICY_OS_DENY_BOUND_HOST" "${VERIFY_ACTOR:-operator:policy-os-live-verify}")"
      echo "issued deny actor managed bearer"
    fi

    capture_result resolve_identity_token "$policy_os_deny_session_token" "$POLICY_OS_DENY_RESOURCE_HOST"
    status="$RESULT_STATUS"
    body_file="$RESULT_BODY_FILE"
    [[ "$status" == "200" ]] || { echo "identity resolve failed for deny actor (status=${status})" >&2; cat "$body_file" >&2; exit 1; }
    assert_json_true "$body_file" '.valid == true'
    assert_json_eq "$body_file" '.account_id' "$POLICY_OS_DENY_ACCOUNT_ID"
    assert_json_true "$body_file" '.entitlement_snapshot != null'
    case "$POLICY_OS_DENY_EXPECTED_REASON" in
      billing_inactive)
        deny_snapshot_expr='.entitlement_snapshot.billing_active == false'
        ;;
      contract_inactive)
        deny_snapshot_expr='.entitlement_snapshot.contract_active == false'
        ;;
      policy_acceptance_required)
        deny_snapshot_expr='.entitlement_snapshot.policy_accepted == false'
        ;;
      service_not_entitled)
        deny_snapshot_expr='.entitlement_snapshot.service_entitled == false'
        ;;
      *)
        echo "unsupported POLICY_OS_DENY_EXPECTED_REASON=${POLICY_OS_DENY_EXPECTED_REASON}" >&2
        exit 1
        ;;
    esac
    assert_json_true "$body_file" "$deny_snapshot_expr"
    rm -f "$body_file"
    echo "deny actor resolve=ok"

    payload="$(jq -cn \
      --arg proxyToolName "$PAID_DISCOVERY_PROXY_TOOL_NAME" \
      '{
        jsonrpc: "2.0",
        id: "policy-os-commercial-deny",
        method: "tools/call",
        params: {
          name: "hub_describe_proxy_tool",
          arguments: {
            proxyToolName: $proxyToolName
          }
        }
      }'
    )"
    capture_result call_hub "$policy_os_deny_session_token" "$payload"
    status="$RESULT_STATUS"
    body_file="$RESULT_BODY_FILE"
    [[ "$status" == "200" ]] || { echo "hub staged deny check failed (status=${status})" >&2; cat "$body_file" >&2; exit 1; }
    if jq -e '.result.isError != true' "$body_file" >/dev/null 2>&1; then
      echo "staged commercial deny unexpectedly succeeded" >&2
      cat "$body_file" >&2
      exit 1
    fi
    if ! grep -qiE "$POLICY_OS_DENY_EXPECTED_REASON|billing|contract|policy acceptance|service entitlement" "$body_file"; then
      echo "staged commercial deny did not surface the expected commercial gate" >&2
      cat "$body_file" >&2
      exit 1
    fi
    echo "deny actor commercial_gate=blocked"
    rm -f "$body_file"
  else
    echo "staged commercial deny=skipped"
  fi

  print_section "Complete"
  echo "policy_os_live_verification=ok"
}

main "$@"
