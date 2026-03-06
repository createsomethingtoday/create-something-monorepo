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
  if ! echo "$payload" | jq -e '.error == null' >/dev/null 2>&1; then
    echo "rpc error during ${context}:"
    echo "$payload" | jq .
    exit 1
  fi
}

main() {
  require_cmd curl
  require_cmd jq

  local token
  if ! token="$(resolve_token)"; then
    echo "missing ${HUB_TOKEN_SECRET_NAME}/HUB_API_TOKEN and unable to fetch from Infisical" >&2
    exit 1
  fi

  echo "searching proxy tools..."
  local search_resp
  search_resp="$(mcp_call "$token" "hub_search_proxy_tools" '{"query":"notion","limit":200}')"
  assert_no_rpc_error "$search_resp" "hub_search_proxy_tools"

  local tool_a tool_b tool_accounts
  tool_a="$(find_proxy_tool "$search_resp" "$PINNED_A")"
  tool_b="$(find_proxy_tool "$search_resp" "$PINNED_B")"
  tool_accounts="$(find_proxy_tool "$search_resp" "$ACCOUNTS_TOOL")"

  if [[ -z "$tool_a" || -z "$tool_b" || -z "$tool_accounts" ]]; then
    echo "missing required tools in discovery results"
    echo "found:"
    echo "  ${PINNED_A}: ${tool_a:-<missing>}"
    echo "  ${PINNED_B}: ${tool_b:-<missing>}"
    echo "  ${ACCOUNTS_TOOL}: ${tool_accounts:-<missing>}"
    exit 1
  fi

  echo "describing tools..."
  local describe_a describe_b describe_accounts
  describe_a="$(mcp_call "$token" "hub_describe_proxy_tool" "{\"proxyToolName\":\"$tool_a\"}")"
  describe_b="$(mcp_call "$token" "hub_describe_proxy_tool" "{\"proxyToolName\":\"$tool_b\"}")"
  describe_accounts="$(mcp_call "$token" "hub_describe_proxy_tool" "{\"proxyToolName\":\"$tool_accounts\"}")"
  assert_no_rpc_error "$describe_a" "describe ${tool_a}"
  assert_no_rpc_error "$describe_b" "describe ${tool_b}"
  assert_no_rpc_error "$describe_accounts" "describe ${tool_accounts}"

  echo "executing operator accounts list..."
  local exec_accounts
  exec_accounts="$(mcp_call "$token" "hub_execute_proxy_tool" "{\"proxyToolName\":\"$tool_accounts\",\"args\":{\"action\":\"list_accounts\",\"args\":{}}}")"
  assert_no_rpc_error "$exec_accounts" "execute ${tool_accounts}"

  echo "executing pinned tool checks..."
  local exec_a exec_b
  exec_a="$(mcp_call "$token" "hub_execute_proxy_tool" "{\"proxyToolName\":\"$tool_a\",\"args\":{\"action\":\"search\",\"args\":{\"query\":\"\",\"page_size\":1}}}")"
  exec_b="$(mcp_call "$token" "hub_execute_proxy_tool" "{\"proxyToolName\":\"$tool_b\",\"args\":{\"action\":\"search\",\"args\":{\"query\":\"\",\"page_size\":1}}}")"
  assert_no_rpc_error "$exec_a" "execute ${tool_a}"
  assert_no_rpc_error "$exec_b" "execute ${tool_b}"

  echo "hub smoke check passed"
  echo "- accounts tool: $tool_accounts"
  echo "- pinned A: $tool_a"
  echo "- pinned B: $tool_b"
}

main "$@"
