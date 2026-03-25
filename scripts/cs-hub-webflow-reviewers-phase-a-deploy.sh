#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HUB_DIR="$ROOT_DIR/packages/cs-mcp-hub-remote"
TEAM_CONFIG="$HUB_DIR/wrangler.team-hubs.toml"

ACTION="${1:-all}"
REVIEWER="${REVIEWER:-all}"
SESSION_RESOLVE_URL="${SESSION_RESOLVE_URL:-https://id.createsomething.space/v1/mcp/sessions/resolve}"
BUNDLE_NAME="${BUNDLE_NAME:-webflow-marketplace-review-phase-a}"
DISCOVERY_PACK="${DISCOVERY_PACK:-webflow-marketplace-review-phase-a}"
ENABLED_SERVERS="${ENABLED_SERVERS:-webflow-template-review-mcp}"
DISABLED_SERVERS="${DISABLED_SERVERS:-webflow-local,webflow-originality-mcp,webflow-site-analyzer-mcp}"
DISCOVERY_ACTIVE_SERVERS="${DISCOVERY_ACTIVE_SERVERS:-$ENABLED_SERVERS}"
DISCOVERY_MAX_PROXY_TOOLS="${DISCOVERY_MAX_PROXY_TOOLS:-18}"
RATE_LIMIT_MAX_CALLS="${RATE_LIMIT_MAX_CALLS:-120}"
RATE_LIMIT_WINDOW_SECONDS="${RATE_LIMIT_WINDOW_SECONDS:-60}"
QUOTA_MAX_PROXY_CALLS_PER_PERIOD="${QUOTA_MAX_PROXY_CALLS_PER_PERIOD:-10000}"
REVIEWER_IDENTITY_MODE="${REVIEWER_IDENTITY_MODE:-session_required}"
REQUIRED_GLOBAL_SERVERS_SENTINEL="${REQUIRED_GLOBAL_SERVERS_SENTINEL:-__none__}"
REQUIRED_DISCOVERY_SERVERS_SENTINEL="${REQUIRED_DISCOVERY_SERVERS_SENTINEL:-__none__}"
SKIP_NORMALIZE="${SKIP_NORMALIZE:-0}"
SKIP_VERIFY="${SKIP_VERIFY:-0}"
REFRESH_AFTER_NORMALIZE="${REFRESH_AFTER_NORMALIZE:-1}"
REFRESH_RETRY_COUNT="${REFRESH_RETRY_COUNT:-8}"
REFRESH_RETRY_SLEEP_SECONDS="${REFRESH_RETRY_SLEEP_SECONDS:-3}"
CURL_MAX_TIME="${CURL_MAX_TIME:-20}"
REVIEWERS=(
  "wf-template-review-natalia|acct_wf_natalia"
  "wf-template-review-sudiksha|acct_wf_sudiksha"
  "wf-template-review-eric|acct_wf_eric"
  "wf-template-review-vicki|acct_wf_vicki"
  "wf-template-review-mariana|acct_wf_mariana"
  "wf-template-review-micah|acct_mj"
)

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing required command: $1" >&2
    exit 1
  }
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

uri_encode() {
  jq -rn --arg value "$1" '$value|@uri'
}

json_array_from_csv() {
  jq -cn --arg raw "$1" '
    $raw
    | split(",")
    | map(gsub("^\\s+|\\s+$"; ""))
    | map(select(length > 0))
  '
}

json_array_contains_value() {
  local value="$1"
  jq -e --arg value "$value" '
    if type == "array" then
      index($value) != null
    else
      false
    end
  '
}

worker_name_for_slug() {
  local slug="$1"
  echo "cs-hub-${slug}"
}

domain_for_slug() {
  local slug="$1"
  echo "${slug}.mcp.createsomething.agency"
}

mcp_url_for_slug() {
  local slug="$1"
  echo "https://$(domain_for_slug "$slug")/mcp"
}

health_url_for_slug() {
  local slug="$1"
  echo "https://$(domain_for_slug "$slug")/health"
}

slug_matches_reviewer() {
  local slug="$1"
  local reviewer="${2:-all}"
  if [[ "$reviewer" == "all" ]]; then
    return 0
  fi
  [[ "$slug" == "wf-template-review-${reviewer}" ]]
}

reviewer_key_for_slug() {
  local slug="$1"
  local reviewer
  reviewer="${slug#wf-template-review-}"
  printf 'WF_TEMPLATE_REVIEW_%s' "$(printf '%s' "$reviewer" | tr '[:lower:]' '[:upper:]')"
}

reviewer_bearer_token_var_for_slug() {
  local reviewer_key
  reviewer_key="$(reviewer_key_for_slug "$1")"
  printf 'CS_HUB_%s_API_TOKEN' "$reviewer_key"
}

reviewer_gateway_token_var_for_slug() {
  local reviewer_key
  reviewer_key="$(reviewer_key_for_slug "$1")"
  printf 'CS_HUB_%s_GATEWAY_API_TOKEN' "$reviewer_key"
}

resolve_reviewer_bearer_token_for_slug() {
  local slug="$1"
  local specific_var legacy_var
  specific_var="$(reviewer_bearer_token_var_for_slug "$slug")"
  legacy_var="$(reviewer_key_for_slug "$slug")"
  printf '%s' "${!specific_var:-${!legacy_var:-}}"
}

resolve_gateway_token_for_slug() {
  local slug="$1"
  local specific_var legacy_var
  specific_var="$(reviewer_gateway_token_var_for_slug "$slug")"
  legacy_var="$(reviewer_key_for_slug "$slug")_GATEWAY_API_TOKEN"
  printf '%s' "${!specific_var:-${!legacy_var:-${HUB_API_TOKEN:-}}}"
}

build_mcp_request_auth_for_slug() {
  local slug="$1"
  local base_url="$2"
  local session_token_candidate="${3:-}"
  local gateway_token reviewer_bearer request_url auth_token session_token

  gateway_token="$(resolve_gateway_token_for_slug "$slug")"
  reviewer_bearer="$(resolve_reviewer_bearer_token_for_slug "$slug")"

  if [[ -z "$gateway_token" ]]; then
    echo "missing gateway token for ${slug}; set $(reviewer_gateway_token_var_for_slug "$slug")" >&2
    exit 1
  fi

  request_url="${base_url}?mcp_access_token=$(uri_encode "$gateway_token")"

  if [[ -n "$reviewer_bearer" ]]; then
    auth_token="$reviewer_bearer"
    session_token=""
  elif [[ -n "$session_token_candidate" ]]; then
    auth_token="$gateway_token"
    session_token="$session_token_candidate"
  else
    echo "missing reviewer bearer for ${slug}; set $(reviewer_bearer_token_var_for_slug "$slug") or provide a session token" >&2
    exit 1
  fi

  printf '%s\t%s\t%s\n' "$request_url" "$auth_token" "$session_token"
}

call_hub_tool_for_slug() {
  local slug="$1"
  local session_token_candidate="$2"
  local tool_name="$3"
  local args_json="$4"
  local mcp_url request_url auth_token session_token
  local -a headers

  mcp_url="$(mcp_url_for_slug "$slug")"
  IFS=$'\t' read -r request_url auth_token session_token <<<"$(build_mcp_request_auth_for_slug "$slug" "$mcp_url" "$session_token_candidate")"

  headers=(
    -H "Authorization: Bearer ${auth_token}"
    -H "Content-Type: application/json"
    -H "Accept: application/json, text/event-stream"
  )
  if [[ -n "$session_token" ]]; then
    headers+=(-H "X-MCP-Session-Token: ${session_token}")
  fi

  curl_with_url "$request_url" -sS --max-time "$CURL_MAX_TIME" -X POST \
    "${headers[@]}" \
    -d "{
      \"jsonrpc\":\"2.0\",
      \"id\":\"${tool_name}\",
      \"method\":\"tools/call\",
      \"params\":{
        \"name\":\"${tool_name}\",
        \"arguments\":${args_json}
      }
    }"
}

health_payload_for_slug() {
  local slug="$1"
  local health_url
  health_url="$(health_url_for_slug "$slug")"
  curl_with_url "$health_url" -sS --max-time "$CURL_MAX_TIME"
}

is_lane_ready() {
  local slug="$1"
  local health_payload connected_names services_response services_payload
  local session_token_candidate
  local server_name
  local -a enabled_servers discovery_servers

  session_token_candidate="${SESSION_TOKEN_FOR_VERIFY:-${SESSION_TOKEN_FOR_NORMALIZE:-}}"
  health_payload="$(health_payload_for_slug "$slug")"
  connected_names="$(printf '%s' "$health_payload" | jq '[.connected_servers[]?.name]')"

  IFS=',' read -r -a enabled_servers <<<"$ENABLED_SERVERS"
  for server_name in "${enabled_servers[@]}"; do
    server_name="$(printf '%s' "$server_name" | xargs)"
    if [[ -z "$server_name" ]]; then
      continue
    fi
    if ! printf '%s' "$health_payload" | jq '.enabled_servers' | json_array_contains_value "$server_name" >/dev/null; then
      return 1
    fi
    if ! printf '%s' "$connected_names" | json_array_contains_value "$server_name" >/dev/null; then
      return 1
    fi
  done

  services_response="$(call_hub_tool_for_slug "$slug" "$session_token_candidate" "hub_list_services" "{}")"
  if ! printf '%s' "$services_response" | jq -e '.result.structuredContent != null' >/dev/null 2>&1; then
    return 1
  fi
  services_payload="$(printf '%s' "$services_response" | jq -c '.result.structuredContent')"

  IFS=',' read -r -a discovery_servers <<<"$DISCOVERY_ACTIVE_SERVERS"
  for server_name in "${discovery_servers[@]}"; do
    server_name="$(printf '%s' "$server_name" | xargs)"
    if [[ -z "$server_name" ]]; then
      continue
    fi
    if ! printf '%s' "$services_payload" | jq '.discovery.activeServers' | json_array_contains_value "$server_name" >/dev/null; then
      return 1
    fi
    if ! printf '%s' "$services_payload" | jq -e --arg name "$server_name" '[.services[] | select(.name == $name and .activeInDiscovery == true and ((.visibleProxyTools // 0) > 0))] | length > 0' >/dev/null; then
      return 1
    fi
  done

  return 0
}

deploy_one() {
  local slug="$1"
  local account_id="$2"
  local worker
  local -a deploy_cmd
  worker="$(worker_name_for_slug "$slug")"

  echo "===== DEPLOY ${worker} ====="
  cd "$HUB_DIR"
  deploy_cmd=(
    pnpm exec wrangler deploy
    --config "$TEAM_CONFIG"
    --name "$worker"
    --domain "$(domain_for_slug "$slug")"
    --var "HUB_INSTANCE_ID:${worker}"
    --var "HUB_ACCOUNT_ID:${account_id}"
    --var "HUB_ENABLED_BUNDLES:${BUNDLE_NAME}"
    --var "HUB_ENABLED_SERVERS:${ENABLED_SERVERS}"
    --var "HUB_DISABLED_SERVERS:${DISABLED_SERVERS}"
    --var "HUB_IDENTITY_MODE:${REVIEWER_IDENTITY_MODE}"
    --var "HUB_COMPAT_TRUST_CLIENT_ACCOUNT_HEADERS:false"
    --var "HUB_SESSION_RESOLVE_URL:${SESSION_RESOLVE_URL}"
    --var "HUB_DISCOVERY_MODE:compact"
    --var "HUB_DISCOVERY_SHARED_PACK:${DISCOVERY_PACK}"
    --var "HUB_DISCOVERY_DEFAULT_SERVERS:${DISCOVERY_ACTIVE_SERVERS}"
    --var "HUB_DISCOVERY_MAX_PROXY_TOOLS:${DISCOVERY_MAX_PROXY_TOOLS}"
    --var "HUB_REQUIRED_GLOBAL_SERVERS:${REQUIRED_GLOBAL_SERVERS_SENTINEL}"
    --var "HUB_REQUIRED_DISCOVERY_SERVERS:${REQUIRED_DISCOVERY_SERVERS_SENTINEL}"
    --var "HUB_RATE_LIMIT_MAX_CALLS_PER_WINDOW:${RATE_LIMIT_MAX_CALLS}"
    --var "HUB_RATE_LIMIT_WINDOW_SECONDS:${RATE_LIMIT_WINDOW_SECONDS}"
    --var "HUB_QUOTA_MAX_PROXY_CALLS_PER_PERIOD:${QUOTA_MAX_PROXY_CALLS_PER_PERIOD}"
    --keep-vars
  )

  if [[ -n "${WEBFLOW_SITE_ANALYZER_MCP_URL:-}" ]]; then
    deploy_cmd+=(--var "WEBFLOW_SITE_ANALYZER_MCP_URL:${WEBFLOW_SITE_ANALYZER_MCP_URL}")
  fi

  if [[ -n "${WEBFLOW_ORIGINALITY_MCP_URL:-}" ]]; then
    deploy_cmd+=(--var "WEBFLOW_ORIGINALITY_MCP_URL:${WEBFLOW_ORIGINALITY_MCP_URL}")
  fi

  if [[ -n "${HUB_ALLOW_DIRECT_PROXY_TOOLS:-}" ]]; then
    deploy_cmd+=(--var "HUB_ALLOW_DIRECT_PROXY_TOOLS:${HUB_ALLOW_DIRECT_PROXY_TOOLS}")
  fi

  if [[ -n "${HUB_DIRECT_PROXY_ALLOWED_PREFIXES:-}" ]]; then
    deploy_cmd+=(--var "HUB_DIRECT_PROXY_ALLOWED_PREFIXES:${HUB_DIRECT_PROXY_ALLOWED_PREFIXES}")
  fi

  "${deploy_cmd[@]}"
}

normalize_one() {
  local slug="$1"
  local worker
  local mcp_url
  local enabled_servers_json
  local discovery_active_servers_json
  local request_url auth_token session_token
  worker="$(worker_name_for_slug "$slug")"
  mcp_url="$(mcp_url_for_slug "$slug")"
  enabled_servers_json="$(json_array_from_csv "$ENABLED_SERVERS")"
  discovery_active_servers_json="$(json_array_from_csv "$DISCOVERY_ACTIVE_SERVERS")"
  IFS=$'\t' read -r request_url auth_token session_token <<<"$(build_mcp_request_auth_for_slug "$slug" "$mcp_url" "${SESSION_TOKEN_FOR_NORMALIZE:-}")"

  echo "===== NORMALIZE ${worker} ====="

  local -a normalize_headers=(
    -H "Authorization: Bearer ${auth_token}"
    -H "Content-Type: application/json"
    -H "Accept: application/json, text/event-stream"
  )
  if [[ -n "$session_token" ]]; then
    normalize_headers+=(-H "X-MCP-Session-Token: ${session_token}")
  fi

  curl_with_url "$request_url" -sS --max-time "$CURL_MAX_TIME" -X POST \
    "${normalize_headers[@]}" \
    -d '{
      "jsonrpc":"2.0",
      "id":"review-state",
      "method":"tools/call",
      "params":{
        "name":"hub_update_state",
        "arguments":{
          "setBundles":["'"${BUNDLE_NAME}"'"],
          "setServers":'"${enabled_servers_json}"'
        }
      }
    }' | jq .

  curl_with_url "$request_url" -sS --max-time "$CURL_MAX_TIME" -X POST \
    "${normalize_headers[@]}" \
    -d "{
      \"jsonrpc\":\"2.0\",
      \"id\":\"review-discovery\",
      \"method\":\"tools/call\",
      \"params\":{
        \"name\":\"hub_set_discovery\",
        \"arguments\":{
          \"pack\":\"${DISCOVERY_PACK}\",
          \"mode\":\"compact\",
          \"activeServers\":${discovery_active_servers_json},
          \"maxProxyTools\":${DISCOVERY_MAX_PROXY_TOOLS}
        }
      }
    }" | jq .
}

refresh_one() {
  local slug="$1"
  local worker
  local response
  local session_token_candidate
  worker="$(worker_name_for_slug "$slug")"
  session_token_candidate="${SESSION_TOKEN_FOR_VERIFY:-${SESSION_TOKEN_FOR_NORMALIZE:-}}"

  echo "===== REFRESH ${worker} ====="
  response="$(call_hub_tool_for_slug "$slug" "$session_token_candidate" "hub_refresh_connections" "{}")"
  printf '%s\n' "$response" | jq .

  if ! printf '%s' "$response" | jq -e '.result != null and (.result.isError // false) == false' >/dev/null 2>&1; then
    echo "hub_refresh_connections failed for ${worker}" >&2
    return 1
  fi
}

wait_for_ready_one() {
  local slug="$1"
  local worker
  local attempt
  worker="$(worker_name_for_slug "$slug")"

  for (( attempt=1; attempt<=REFRESH_RETRY_COUNT; attempt++ )); do
    if is_lane_ready "$slug"; then
      echo "lane ready: ${worker}"
      return 0
    fi

    if (( attempt == REFRESH_RETRY_COUNT )); then
      break
    fi

    echo "waiting for downstream connections: ${worker} (${attempt}/${REFRESH_RETRY_COUNT})"
    sleep "$REFRESH_RETRY_SLEEP_SECONDS"
    refresh_one "$slug" >/dev/null
  done

  echo "lane did not reach ready state: ${worker}" >&2
  return 1
}

verify_one() {
  local slug="$1"
  local worker
  local request_url auth_token session_token
  local health_payload connected_names services_response services_payload tool_response
  local server_name
  local failures=0
  local -a enabled_servers discovery_servers verify_headers

  worker="$(worker_name_for_slug "$slug")"
  IFS=$'\t' read -r request_url auth_token session_token <<<"$(build_mcp_request_auth_for_slug "$slug" "$(mcp_url_for_slug "$slug")" "${SESSION_TOKEN_FOR_VERIFY:-${SESSION_TOKEN_FOR_NORMALIZE:-}}")"

  echo "===== VERIFY ${worker} ====="
  health_payload="$(health_payload_for_slug "$slug")"
  printf '%s\n' "$health_payload" | jq '{
    identity_mode,
    enabled_servers,
    connected_servers: [.connected_servers[]?.name],
    proxy_tool_count
  }'
  connected_names="$(printf '%s' "$health_payload" | jq '[.connected_servers[]?.name]')"

  verify_headers=(
    -H "Authorization: Bearer ${auth_token}"
    -H "Content-Type: application/json"
    -H "Accept: application/json, text/event-stream"
  )
  if [[ -n "$session_token" ]]; then
    verify_headers+=(-H "X-MCP-Session-Token: ${session_token}")
  fi

  services_response="$(
    curl_with_url "$request_url" -sS --max-time "$CURL_MAX_TIME" -X POST \
      "${verify_headers[@]}" \
      -d '{
        "jsonrpc":"2.0",
        "id":"phase-a-services",
        "method":"tools/call",
        "params":{
          "name":"hub_list_services",
          "arguments":{}
        }
      }'
  )"
  printf '%s\n' "$services_response" | jq .
  if ! printf '%s' "$services_response" | jq -e '.result.structuredContent != null' >/dev/null 2>&1; then
    echo "hub_list_services failed for ${worker}" >&2
    return 1
  fi
  services_payload="$(printf '%s' "$services_response" | jq -c '.result.structuredContent')"

  IFS=',' read -r -a enabled_servers <<<"$ENABLED_SERVERS"
  for server_name in "${enabled_servers[@]}"; do
    server_name="$(printf '%s' "$server_name" | xargs)"
    if [[ -z "$server_name" ]]; then
      continue
    fi
    if ! printf '%s' "$health_payload" | jq '.enabled_servers' | json_array_contains_value "$server_name" >/dev/null; then
      echo "enabled-server-missing: ${worker} ${server_name}" >&2
      failures=1
    fi
    if ! printf '%s' "$connected_names" | json_array_contains_value "$server_name" >/dev/null; then
      echo "connected-server-missing: ${worker} ${server_name}" >&2
      failures=1
    fi
  done

  IFS=',' read -r -a discovery_servers <<<"$DISCOVERY_ACTIVE_SERVERS"
  for server_name in "${discovery_servers[@]}"; do
    server_name="$(printf '%s' "$server_name" | xargs)"
    if [[ -z "$server_name" ]]; then
      continue
    fi
    if ! printf '%s' "$services_payload" | jq '.discovery.activeServers' | json_array_contains_value "$server_name" >/dev/null; then
      echo "discovery-server-missing: ${worker} ${server_name}" >&2
      failures=1
    fi
  done

  for server_name in "${enabled_servers[@]}"; do
    server_name="$(printf '%s' "$server_name" | xargs)"
    if [[ -z "$server_name" ]]; then
      continue
    fi

    tool_response="$(
      curl_with_url "$request_url" -sS --max-time "$CURL_MAX_TIME" -X POST \
        "${verify_headers[@]}" \
        -d "{
          \"jsonrpc\":\"2.0\",
          \"id\":\"verify-${server_name}\",
          \"method\":\"tools/call\",
          \"params\":{
            \"name\":\"hub_search_proxy_tools\",
            \"arguments\":{
              \"serverName\":\"${server_name}\",
              \"limit\":20
            }
          }
        }"
    )"
    printf '%s\n' "$tool_response" | jq .

    if ! printf '%s' "$tool_response" | jq -e '.result.structuredContent != null' >/dev/null 2>&1; then
      echo "tool-search-failed: ${worker} ${server_name}" >&2
      failures=1
      continue
    fi

    if [[ "$(printf '%s' "$tool_response" | jq -r '.result.structuredContent.total // 0')" == "0" ]]; then
      echo "tool-search-empty: ${worker} ${server_name}" >&2
      failures=1
    fi
  done

  return "$failures"
}

require_cmd pnpm
require_cmd jq
require_cmd curl

case "$ACTION" in
  deploy|normalize|refresh|verify|all)
    ;;
  *)
    echo "usage: $0 [deploy|normalize|refresh|verify|all]" >&2
    exit 1
    ;;
esac

for entry in "${REVIEWERS[@]}"; do
  slug="${entry%%|*}"
  account_id="${entry#*|}"
  if ! slug_matches_reviewer "$slug" "$REVIEWER"; then
    continue
  fi
  if [[ "$ACTION" == "deploy" || "$ACTION" == "all" ]]; then
    deploy_one "$slug" "$account_id"
  fi
  if [[ "$ACTION" == "normalize" || "$ACTION" == "all" ]]; then
    if [[ "$SKIP_NORMALIZE" != "1" ]]; then
      normalize_one "$slug"
      if [[ "$REFRESH_AFTER_NORMALIZE" == "1" ]]; then
        refresh_one "$slug"
        wait_for_ready_one "$slug"
      fi
    fi
  fi
  if [[ "$ACTION" == "refresh" ]]; then
    refresh_one "$slug"
    wait_for_ready_one "$slug"
  fi
  if [[ "$ACTION" == "verify" || "$ACTION" == "all" ]]; then
    if [[ "$SKIP_VERIFY" != "1" ]]; then
      verify_one "$slug"
    fi
  fi
done

echo "webflow reviewer hub action complete: ${ACTION}"
