#!/usr/bin/env bash
set -euo pipefail

HUB_URL="${HUB_URL:-https://danny.mcp.createsomething.agency/mcp}"
INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
INFISICAL_INCLUDE_IMPORTS="${INFISICAL_INCLUDE_IMPORTS:-true}"
HUB_TOKEN_SECRET_NAME="${HUB_TOKEN_SECRET_NAME:-CS_HUB_DANNY_API_TOKEN}"
PINNED_A="${PINNED_A:-halfdozen_notion}"
PINNED_B="${PINNED_B:-blondish_notion}"
ACCOUNTS_TOOL="${ACCOUNTS_TOOL:-operator_notion_accounts}"
SYNC_CONTRACTS_TOOL="${SYNC_CONTRACTS_TOOL:-operator_notion_sync_contracts}"
RUN_SYNC_TOOL="${RUN_SYNC_TOOL:-operator_notion_run_sync_contract}"
ROUTER_TOOL="${ROUTER_TOOL:-operator_notion_router}"
OPERATOR_SERVER_NAME="${OPERATOR_SERVER_NAME:-halfdozen-operator-notion-mcp}"
NOTION_SERVER_NAME="${NOTION_SERVER_NAME:-composio-toolkit-notion}"
CURL_MAX_TIME="${CURL_MAX_TIME:-20}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "missing required command: $1" >&2
    exit 1
  fi
}

resolve_token() {
  if [[ -n "${!HUB_TOKEN_SECRET_NAME:-}" ]]; then
    echo "${!HUB_TOKEN_SECRET_NAME}"
    return 0
  fi
  if [[ -n "${HUB_API_TOKEN:-}" ]]; then
    echo "$HUB_API_TOKEN"
    return 0
  fi
  if command -v infisical >/dev/null 2>&1; then
    local token
    local -a cmd=(
      infisical secrets get "$HUB_TOKEN_SECRET_NAME"
      --plain
      --silent
      --env="$INFISICAL_ENV"
      --path="$INFISICAL_PATH"
      --include-imports="$INFISICAL_INCLUDE_IMPORTS"
    )
    if [[ -n "$INFISICAL_PROJECT_ID" ]]; then
      cmd+=(--projectId="$INFISICAL_PROJECT_ID")
    fi
    token="$("${cmd[@]}" 2>/dev/null || true)"
    if [[ -n "$token" ]]; then
      echo "$token"
      return 0
    fi
  fi
  return 1
}

mcp_call() {
  local token="$1"
  local tool_name="$2"
  local args_json="$3"

  curl -sS -X POST "$HUB_URL" \
    --max-time "$CURL_MAX_TIME" \
    -H "Authorization: Bearer ${token}" \
    -H 'Content-Type: application/json' \
    -d "$(jq -cn --arg name "$tool_name" --argjson args "$args_json" '{jsonrpc:"2.0",id:(now|tostring),method:"tools/call",params:{name:$name,arguments:$args}}')"
}

find_proxy_tool() {
  local response_json="$1"
  local contains="$2"

  echo "$response_json" | jq -r '.. | objects | .proxyToolName? // empty' | grep "$contains" | head -n1 || true
}

assert_no_rpc_error() {
  local payload="$1"
  local context="$2"
  if [[ -z "$payload" ]]; then
    echo "empty response during ${context}" >&2
    exit 1
  fi
  if ! echo "$payload" | jq -e '.error == null' >/dev/null 2>&1; then
    echo "rpc error during ${context}:"
    echo "$payload" | jq .
    exit 1
  fi
  if echo "$payload" | jq -e '.result.isError == true' >/dev/null 2>&1; then
    echo "tool error during ${context}:"
    echo "$payload" | jq .
    exit 1
  fi
}

assert_downstream_success() {
  local payload="$1"
  local context="$2"
  local inner_text

  inner_text="$(echo "$payload" | jq -r '.result.content[0].text // empty' 2>/dev/null || true)"
  if [[ -z "$inner_text" ]]; then
    return 0
  fi

  if echo "$inner_text" | jq -e '.ok == false' >/dev/null 2>&1; then
    echo "downstream tool failure during ${context}:"
    echo "$inner_text" | jq .
    exit 1
  fi
}

payload_json() {
  jq '.result.structuredContent // (.result.content[0].text | fromjson?)'
}

main() {
  require_cmd curl
  require_cmd jq

  local token
  if ! token="$(resolve_token)"; then
    echo "missing ${HUB_TOKEN_SECRET_NAME}/HUB_API_TOKEN and unable to fetch from Infisical" >&2
    exit 1
  fi

  echo "listing services..."
  local services_resp
  services_resp="$(mcp_call "$token" "hub_list_services" '{}')"
  assert_no_rpc_error "$services_resp" "hub_list_services"

  if ! echo "$services_resp" | jq -e --arg server "$OPERATOR_SERVER_NAME" '.result.structuredContent.services[]? | select(.name == $server and .activeInDiscovery == true)' >/dev/null 2>&1; then
    echo "operator service is missing from active discovery"
    echo "$services_resp" | jq .
    exit 1
  fi

  if ! echo "$services_resp" | jq -e --arg server "$NOTION_SERVER_NAME" '.result.structuredContent.services[]? | select(.name == $server and .activeInDiscovery == true)' >/dev/null 2>&1; then
    echo "notion service is missing from active discovery"
    echo "$services_resp" | jq .
    exit 1
  fi

  echo "searching operator proxy tools..."
  local search_resp
  search_resp="$(mcp_call "$token" "hub_search_proxy_tools" "{\"serverName\":\"$OPERATOR_SERVER_NAME\",\"limit\":200}")"
  assert_no_rpc_error "$search_resp" "hub_search_proxy_tools"

  local tool_a tool_b tool_accounts tool_sync_contracts tool_run_sync tool_router
  tool_a="$(find_proxy_tool "$search_resp" "$PINNED_A")"
  tool_b="$(find_proxy_tool "$search_resp" "$PINNED_B")"
  tool_accounts="$(find_proxy_tool "$search_resp" "$ACCOUNTS_TOOL")"
  tool_sync_contracts="$(find_proxy_tool "$search_resp" "$SYNC_CONTRACTS_TOOL")"
  tool_run_sync="$(find_proxy_tool "$search_resp" "$RUN_SYNC_TOOL")"
  tool_router="$(find_proxy_tool "$search_resp" "$ROUTER_TOOL")"

  if [[ -z "$tool_a" || -z "$tool_b" || -z "$tool_accounts" || -z "$tool_sync_contracts" || -z "$tool_run_sync" || -z "$tool_router" ]]; then
    echo "missing required tools in discovery results"
    echo "found:"
    echo "  ${PINNED_A}: ${tool_a:-<missing>}"
    echo "  ${PINNED_B}: ${tool_b:-<missing>}"
    echo "  ${ACCOUNTS_TOOL}: ${tool_accounts:-<missing>}"
    echo "  ${SYNC_CONTRACTS_TOOL}: ${tool_sync_contracts:-<missing>}"
    echo "  ${RUN_SYNC_TOOL}: ${tool_run_sync:-<missing>}"
    echo "  ${ROUTER_TOOL}: ${tool_router:-<missing>}"
    exit 1
  fi

  echo "describing tools..."
  local describe_a describe_b describe_accounts describe_sync_contracts describe_run_sync describe_router
  describe_a="$(mcp_call "$token" "hub_describe_proxy_tool" "{\"proxyToolName\":\"$tool_a\"}")"
  describe_b="$(mcp_call "$token" "hub_describe_proxy_tool" "{\"proxyToolName\":\"$tool_b\"}")"
  describe_accounts="$(mcp_call "$token" "hub_describe_proxy_tool" "{\"proxyToolName\":\"$tool_accounts\"}")"
  describe_sync_contracts="$(mcp_call "$token" "hub_describe_proxy_tool" "{\"proxyToolName\":\"$tool_sync_contracts\"}")"
  describe_run_sync="$(mcp_call "$token" "hub_describe_proxy_tool" "{\"proxyToolName\":\"$tool_run_sync\"}")"
  describe_router="$(mcp_call "$token" "hub_describe_proxy_tool" "{\"proxyToolName\":\"$tool_router\"}")"
  assert_no_rpc_error "$describe_a" "describe ${tool_a}"
  assert_no_rpc_error "$describe_b" "describe ${tool_b}"
  assert_no_rpc_error "$describe_accounts" "describe ${tool_accounts}"
  assert_no_rpc_error "$describe_sync_contracts" "describe ${tool_sync_contracts}"
  assert_no_rpc_error "$describe_run_sync" "describe ${tool_run_sync}"
  assert_no_rpc_error "$describe_router" "describe ${tool_router}"

  echo "executing operator accounts list..."
  local exec_accounts
  exec_accounts="$(mcp_call "$token" "hub_execute_proxy_tool" "{\"proxyToolName\":\"$tool_accounts\",\"args\":{\"action\":\"list_accounts\",\"args\":{}}}")"
  assert_no_rpc_error "$exec_accounts" "execute ${tool_accounts}"
  assert_downstream_success "$exec_accounts" "execute ${tool_accounts}"
  if ! echo "$exec_accounts" | payload_json | jq -e '.action == "list_accounts" and (.pin_status | type == "object")' >/dev/null 2>&1; then
    echo "list_accounts response is missing pin_status"
    echo "$exec_accounts" | jq .
    exit 1
  fi

  echo "executing explicit pin inspection..."
  local exec_pin_status
  exec_pin_status="$(mcp_call "$token" "hub_execute_proxy_tool" "{\"proxyToolName\":\"$tool_accounts\",\"args\":{\"action\":\"get_pin_status\",\"args\":{\"tool_name\":\"$PINNED_B\"}}}")"
  assert_no_rpc_error "$exec_pin_status" "execute ${tool_accounts} get_pin_status"
  assert_downstream_success "$exec_pin_status" "execute ${tool_accounts} get_pin_status"
  if ! echo "$exec_pin_status" | payload_json | jq -e --arg tool "$PINNED_B" '.action == "get_pin_status" and .tool_name == $tool and .pin_status.tool_name == $tool and (.pin_status.state | type == "string")' >/dev/null 2>&1; then
    echo "get_pin_status response is missing expected pin status fields"
    echo "$exec_pin_status" | jq .
    exit 1
  fi

  echo "executing sync contract list..."
  local exec_sync_contracts
  exec_sync_contracts="$(mcp_call "$token" "hub_execute_proxy_tool" "{\"proxyToolName\":\"$tool_sync_contracts\",\"args\":{\"action\":\"list_contracts\",\"args\":{}}}")"
  assert_no_rpc_error "$exec_sync_contracts" "execute ${tool_sync_contracts}"
  assert_downstream_success "$exec_sync_contracts" "execute ${tool_sync_contracts}"

  echo "executing pinned tool checks..."
  local exec_a exec_b
  exec_a="$(mcp_call "$token" "hub_execute_proxy_tool" "{\"proxyToolName\":\"$tool_a\",\"args\":{\"action\":\"search\",\"args\":{\"query\":\"\",\"page_size\":1}}}")"
  exec_b="$(mcp_call "$token" "hub_execute_proxy_tool" "{\"proxyToolName\":\"$tool_b\",\"args\":{\"action\":\"search\",\"args\":{\"query\":\"\",\"page_size\":1}}}")"
  assert_no_rpc_error "$exec_a" "execute ${tool_a}"
  assert_no_rpc_error "$exec_b" "execute ${tool_b}"
  assert_downstream_success "$exec_a" "execute ${tool_a}"
  assert_downstream_success "$exec_b" "execute ${tool_b}"

  echo "executing router pin inspection..."
  local exec_router
  exec_router="$(mcp_call "$token" "hub_execute_proxy_tool" "$(jq -cn --arg proxyToolName "$tool_router" --arg request "what is blondish notion pointed to right now?" '{proxyToolName:$proxyToolName,args:{request:$request}}')")"
  assert_no_rpc_error "$exec_router" "execute ${tool_router}"
  assert_downstream_success "$exec_router" "execute ${tool_router}"
  if ! echo "$exec_router" | payload_json | jq -e --arg tool "$PINNED_B" '.action == "get_pin_status" and .tool_name == $tool and .pin_status.tool_name == $tool' >/dev/null 2>&1; then
    echo "router pin inspection did not resolve to get_pin_status for ${PINNED_B}"
    echo "$exec_router" | jq .
    exit 1
  fi

  echo "hub smoke check passed"
  echo "- accounts tool: $tool_accounts"
  echo "- sync contracts tool: $tool_sync_contracts"
  echo "- run sync tool: $tool_run_sync"
  echo "- router tool: $tool_router"
  echo "- pinned A: $tool_a"
  echo "- pinned B: $tool_b"
}

main "$@"
