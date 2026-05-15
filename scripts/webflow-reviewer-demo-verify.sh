#!/usr/bin/env bash
set -euo pipefail

INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
INFISICAL_INCLUDE_IMPORTS="${INFISICAL_INCLUDE_IMPORTS:-true}"
REVIEWER="${REVIEWER:-micah}"
SERVER_NAME="${SERVER_NAME:-webflow-template-review-mcp}"
SEARCH_LIMIT="${SEARCH_LIMIT:-200}"
SESSION_TOKEN="${SESSION_TOKEN:-${SESSION_TOKEN_FOR_VERIFY:-}}"

reviewer_url() {
  case "$1" in
    natalia) echo "https://wf-template-review-natalia.mcp.createsomething.agency/mcp" ;;
    sudiksha) echo "https://wf-template-review-sudiksha.mcp.createsomething.agency/mcp" ;;
    eric) echo "https://wf-template-review-eric.mcp.createsomething.agency/mcp" ;;
    vicki) echo "https://wf-template-review-vicki.mcp.createsomething.agency/mcp" ;;
    mariana) echo "https://wf-template-review-mariana.mcp.createsomething.agency/mcp" ;;
    micah) echo "https://wf-template-review-micah.mcp.createsomething.agency/mcp" ;;
    *) return 1 ;;
  esac
}

reviewer_secret_name() {
  case "$1" in
    natalia) echo "CS_HUB_WF_TEMPLATE_REVIEW_NATALIA_API_TOKEN" ;;
    sudiksha) echo "CS_HUB_WF_TEMPLATE_REVIEW_SUDIKSHA_API_TOKEN" ;;
    eric) echo "CS_HUB_WF_TEMPLATE_REVIEW_ERIC_API_TOKEN" ;;
    vicki) echo "CS_HUB_WF_TEMPLATE_REVIEW_VICKI_API_TOKEN" ;;
    mariana) echo "CS_HUB_WF_TEMPLATE_REVIEW_MARIANA_API_TOKEN" ;;
    micah) echo "CS_HUB_WF_TEMPLATE_REVIEW_MICAH_API_TOKEN" ;;
    *) return 1 ;;
  esac
}

health_url_for_reviewer() {
  local hub_url="$1"
  echo "${hub_url%/mcp}/health"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "missing required command: $1" >&2
    exit 1
  fi
}

resolve_ip_for_url() {
  local url="$1"
  local host
  local ip
  host="${url#https://}"
  host="${host%%/*}"

  if [[ -n "${CURL_RESOLVE_IP:-}" ]]; then
    printf '%s' "$CURL_RESOLVE_IP"
    return 0
  fi

  if command -v dig >/dev/null 2>&1; then
    ip="$(dig +short "$host" | awk 'NF { print; exit }')"
    if [[ -n "$ip" ]]; then
      printf '%s' "$ip"
      return 0
    fi

    ip="$(dig @1.1.1.1 +short "$host" | awk 'NF { print; exit }')"
    if [[ -n "$ip" ]]; then
      printf '%s' "$ip"
      return 0
    fi
  fi

  if command -v nslookup >/dev/null 2>&1; then
    nslookup "$host" 1.1.1.1 2>/dev/null | awk '/^Address: / && $2 !~ /#53$/ { print $2; exit }'
  fi
}

curl_with_url() {
  local url="$1"
  shift

  local host ip
  local -a cmd=(curl)
  host="${url#https://}"
  host="${host%%/*}"
  ip="$(resolve_ip_for_url "$url")"

  if [[ -n "$ip" ]]; then
    cmd+=(--resolve "${host}:443:${ip}")
  fi

  cmd+=("$@" "$url")
  "${cmd[@]}"
}

resolve_token() {
  local secret_name="$1"
  if [[ -n "${!secret_name:-}" ]]; then
    echo "${!secret_name}"
    return 0
  fi
  if command -v infisical >/dev/null 2>&1; then
    local token
    local -a cmd=(
      infisical secrets get "$secret_name"
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
  local hub_url="$1"
  local token="$2"
  local tool_name="$3"
  local args_json="$4"
  local -a headers=(
    -H "Authorization: Bearer ${token}"
    -H 'Content-Type: application/json'
  )
  if [[ -n "$SESSION_TOKEN" ]]; then
    headers+=(-H "X-MCP-Session-Token: ${SESSION_TOKEN}")
  fi

  curl_with_url "$hub_url" -sS -X POST \
    "${headers[@]}" \
    -d "$(jq -cn --arg name "$tool_name" --argjson args "$args_json" '{jsonrpc:"2.0",id:(now|tostring),method:"tools/call",params:{name:$name,arguments:$args}}')"
}

assert_no_rpc_error() {
  local payload="$1"
  local context="$2"
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

payload_json() {
  jq '.result.structuredContent // (.result.content[0].text | fromjson?)'
}

print_tool_list() {
  local payload="$1"
  local prefix="$2"
  while IFS= read -r tool_name; do
    [[ -n "$tool_name" ]] || continue
    echo "${prefix}${tool_name}"
  done < <(printf '%s' "$payload" | jq -r '.[]?')
}

verify_reviewer() {
  local reviewer="$1"
  local hub_url health_url secret_name token
  hub_url="$(reviewer_url "$reviewer")"
  health_url="$(health_url_for_reviewer "$hub_url")"
  secret_name="$(reviewer_secret_name "$reviewer")"

  if ! token="$(resolve_token "$secret_name")"; then
    echo "missing ${secret_name} and unable to fetch from Infisical" >&2
    exit 1
  fi

  local health_resp status_resp services_resp list_resp search_resp
  health_resp="$(curl_with_url "$health_url" -fsS)"

  status_resp="$(mcp_call "$hub_url" "$token" "hub_status" '{}')"
  assert_no_rpc_error "$status_resp" "hub_status ${reviewer}"

  services_resp="$(mcp_call "$hub_url" "$token" "hub_list_services" '{}')"
  assert_no_rpc_error "$services_resp" "hub_list_services ${reviewer}"

  list_resp="$(mcp_call "$hub_url" "$token" "hub_list_proxy_tools" '{}')"
  assert_no_rpc_error "$list_resp" "hub_list_proxy_tools ${reviewer}"

  search_resp="$(mcp_call "$hub_url" "$token" "hub_search_proxy_tools" "$(jq -cn --arg serverName "$SERVER_NAME" --argjson limit "$SEARCH_LIMIT" '{serverName:$serverName,limit:$limit}')")"
  assert_no_rpc_error "$search_resp" "hub_search_proxy_tools ${reviewer}"

  local health_name health_scope hub_state enabled_servers proxy_count warning_count
  local discovery_mode visible_proxy_tool_count total_proxy_tool_count
  health_name="$(echo "$health_resp" | jq -r '.name // "unknown"')"
  health_scope="$(echo "$health_resp" | jq -r '.scope // "unknown"')"
  hub_state="$(echo "$status_resp" | payload_json | jq -r '.state // "unknown"')"
  enabled_servers="$(echo "$status_resp" | payload_json | jq -r '[.enabledServerNames[]?] | join(",")')"
  proxy_count="$(echo "$status_resp" | payload_json | jq -r '.proxyToolCount // 0')"
  warning_count="$(echo "$status_resp" | payload_json | jq -r '(.warnings // []) | length')"
  discovery_mode="$(echo "$services_resp" | payload_json | jq -r '.discovery.mode // "unknown"')"
  visible_proxy_tool_count="$(echo "$services_resp" | payload_json | jq -r '.visibleProxyToolCount // 0')"
  total_proxy_tool_count="$(echo "$services_resp" | payload_json | jq -r '.totalProxyToolCount // 0')"

  if [[ "$enabled_servers" != "$SERVER_NAME" ]]; then
    echo "unexpected enabled servers for ${reviewer}: ${enabled_servers:-none}; expected ${SERVER_NAME}" >&2
    echo "$status_resp" | payload_json | jq .
    exit 1
  fi

  if echo "$services_resp" | payload_json | jq -e '[.services[]?.name] != ["'"$SERVER_NAME"'"]' >/dev/null 2>&1; then
    echo "unexpected services for ${reviewer}; expected only ${SERVER_NAME}" >&2
    echo "$services_resp" | payload_json | jq '.services[]?.name'
    exit 1
  fi

  local visible_tools_json filtered_tools_json
  visible_tools_json="$(echo "$list_resp" | payload_json | jq -c '.proxyTools // []')"
  filtered_tools_json="$(echo "$search_resp" | payload_json | jq -c '[.tools[]?.proxyToolName]')"

  echo "== reviewer demo verify: ${reviewer} =="
  echo "hub_url=${hub_url}"
  echo "health_url=${health_url}"
  echo "health=ok name=${health_name} scope=${health_scope}"
  if [[ -n "$SESSION_TOKEN" ]]; then
    echo "session_token=present"
  else
    echo "session_token=absent"
  fi
  echo "hub_status=ok state=${hub_state} enabled_servers=${enabled_servers:-none} proxy_tool_count=${proxy_count} warnings=${warning_count}"
  echo "discovery=ok mode=${discovery_mode} visible_proxy_tools=${visible_proxy_tool_count}/${total_proxy_tool_count}"
  echo "services:"
  echo "$services_resp" | payload_json | jq -r '.services[]? | "- \(.name) active=\(.activeInDiscovery) visible=\(.visibleProxyTools)/\(.totalProxyTools)"'
  echo "visible_proxy_tools:"
  print_tool_list "$visible_tools_json" "- "
  echo "visible_proxy_tools_filtered server=${SERVER_NAME}:"
  print_tool_list "$filtered_tools_json" "- "
}

main() {
  require_cmd curl
  require_cmd jq

  local reviewers=()
  if [[ "$REVIEWER" == "all" ]]; then
    reviewers=(natalia sudiksha eric vicki mariana micah)
  else
    reviewers=("$REVIEWER")
  fi

  local reviewer
  for reviewer in "${reviewers[@]}"; do
    verify_reviewer "$reviewer"
  done

  echo "webflow reviewer demo verification passed"
}

main "$@"
