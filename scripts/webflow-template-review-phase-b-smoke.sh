#!/usr/bin/env bash
set -euo pipefail

REVIEWER="${REVIEWER:-}"
EXPECTED_IDENTITY_MODE="${EXPECTED_IDENTITY_MODE:-session_required}"
EXPECTED_DISCOVERY_MODE="${EXPECTED_DISCOVERY_MODE:-compact}"
EXPECTED_DISCOVERY_MAX_PROXY_TOOLS="${EXPECTED_DISCOVERY_MAX_PROXY_TOOLS:-30}"
LEGACY_SERVER_NAME="${LEGACY_SERVER_NAME:-webflow-local}"
CURL_MAX_TIME="${CURL_MAX_TIME:-20}"
INFISICAL_AUTO_LOAD="${INFISICAL_AUTO_LOAD:-true}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/}"
INFISICAL_INCLUDE_IMPORTS="${INFISICAL_INCLUDE_IMPORTS:-true}"
INFISICAL_LOADED="${INFISICAL_LOADED:-false}"

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

reviewer_health_url() {
  case "$1" in
    natalia) echo "https://wf-template-review-natalia.mcp.createsomething.agency/health" ;;
    sudiksha) echo "https://wf-template-review-sudiksha.mcp.createsomething.agency/health" ;;
    eric) echo "https://wf-template-review-eric.mcp.createsomething.agency/health" ;;
    vicki) echo "https://wf-template-review-vicki.mcp.createsomething.agency/health" ;;
    mariana) echo "https://wf-template-review-mariana.mcp.createsomething.agency/health" ;;
    micah) echo "https://wf-template-review-micah.mcp.createsomething.agency/health" ;;
    *) return 1 ;;
  esac
}

reviewer_secret_name() {
  case "$1" in
    natalia) echo "WF_TEMPLATE_REVIEW_NATALIA" ;;
    sudiksha) echo "WF_TEMPLATE_REVIEW_SUDIKSHA" ;;
    eric) echo "WF_TEMPLATE_REVIEW_ERIC" ;;
    vicki) echo "WF_TEMPLATE_REVIEW_VICKI" ;;
    mariana) echo "WF_TEMPLATE_REVIEW_MARIANA" ;;
    micah) echo "WF_TEMPLATE_REVIEW_MICAH" ;;
    *) return 1 ;;
  esac
}

reviewer_hub_token_var() {
  printf 'CS_HUB_WF_TEMPLATE_REVIEW_%s_API_TOKEN' "$(printf '%s' "$1" | tr '[:lower:]' '[:upper:]')"
}

reviewer_session_token_var() {
  printf 'CS_HUB_WF_TEMPLATE_REVIEW_%s_SESSION_TOKEN' "$(printf '%s' "$1" | tr '[:lower:]' '[:upper:]')"
}

resolve_session_token() {
  local reviewer="$1"
  local specific_var legacy_specific_var
  specific_var="$(reviewer_session_token_var "$reviewer")"
  legacy_specific_var="WF_TEMPLATE_REVIEW_$(printf '%s' "$reviewer" | tr '[:lower:]' '[:upper:]')_SESSION_TOKEN"
  printf '%s' "${!specific_var:-${!legacy_specific_var:-${SESSION_TOKEN_FOR_VERIFY:-${MCP_SESSION_TOKEN:-}}}}"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "missing required command: $1" >&2
    exit 1
  fi
}

normalize_bool() {
  local value
  value="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')"
  case "$value" in
    1|true|yes|on) echo "true" ;;
    0|false|no|off) echo "false" ;;
    *)
      echo "invalid boolean value: $1" >&2
      exit 1
      ;;
  esac
}

load_secrets_from_infisical() {
  local -a export_cmd payload
  export_cmd=(
    infisical export
    --format=json
    --env="$INFISICAL_ENV"
    --path="$INFISICAL_PATH"
    --include-imports="$INFISICAL_INCLUDE_IMPORTS"
  )
  if [[ -n "$INFISICAL_PROJECT_ID" ]]; then
    export_cmd+=(--projectId="$INFISICAL_PROJECT_ID")
  fi

  payload="$("${export_cmd[@]}")"
  while IFS=$'\t' read -r key value; do
    export "${key}=${value}"
  done < <(
    printf '%s' "$payload" | jq -r '
      if type == "array" then
        .[] | select(.key != null) | [.key, (.value | tostring)]
      else
        to_entries[] | [.key, (.value | tostring)]
      end
      | @tsv
    '
  )
  unset CLOUDFLARE_API_TOKEN
  unset CLOUDFLARE_PAGES_API_TOKEN
  unset CLOUDFLARE_ACCOUNT_ID
  INFISICAL_LOADED="true"
}

ensure_reviewer_token_loaded() {
  local reviewer="$1"
  local token_var fallback_token_var
  token_var="$(reviewer_secret_name "$reviewer")"
  fallback_token_var="$(reviewer_hub_token_var "$reviewer")"

  if [[ -n "${!token_var:-${!fallback_token_var:-}}" ]]; then
    return 0
  fi

  if [[ "$INFISICAL_AUTO_LOAD" != "true" ]]; then
    return 0
  fi

  require_cmd infisical
  if [[ "$INFISICAL_LOADED" != "true" ]]; then
    load_secrets_from_infisical
  fi
}

json_array_contains() {
  local value="$1"
  jq -e --arg value "$value" '
    if type == "array" then
      index($value) != null
    else
      false
    end
  '
}

call_hub_tool() {
  local hub_url="$1"
  local token="$2"
  local session_token="$3"
  local tool_name="$4"
  local args_json="$5"
  local -a curl_args

  curl_args=(
    curl -fsS -X POST "$hub_url"
    --max-time "$CURL_MAX_TIME"
    -H "Authorization: Bearer ${token}"
    -H 'Content-Type: application/json'
    -d "{
      \"jsonrpc\":\"2.0\",
      \"id\":\"phase-b-smoke\",
      \"method\":\"tools/call\",
      \"params\":{
        \"name\":\"${tool_name}\",
        \"arguments\":${args_json}
      }
    }"
  )

  if [[ -n "$session_token" ]]; then
    curl_args+=(-H "X-MCP-Session-Token: ${session_token}")
  fi

  "${curl_args[@]}"
}

main() {
  require_cmd curl
  require_cmd jq
  INFISICAL_AUTO_LOAD="$(normalize_bool "$INFISICAL_AUTO_LOAD")"

  if [[ -z "$REVIEWER" ]]; then
    echo "set REVIEWER=natalia|sudiksha|eric|vicki|mariana|micah" >&2
    exit 1
  fi

  local hub_url health_url token_var fallback_token_var token session_token failures=0 health_payload services_payload analyzer_tools_payload originality_tools_payload policy_payload originality_health_payload
  local services_response analyzer_tools_response originality_tools_response
  hub_url="$(reviewer_url "$REVIEWER")"
  health_url="$(reviewer_health_url "$REVIEWER")"
  ensure_reviewer_token_loaded "$REVIEWER"
  token_var="$(reviewer_secret_name "$REVIEWER")"
  fallback_token_var="$(reviewer_hub_token_var "$REVIEWER")"
  token="${!token_var:-${!fallback_token_var:-}}"
  session_token="$(resolve_session_token "$REVIEWER")"

  if [[ -z "$token" ]]; then
    echo "missing reviewer token env var: ${token_var} or ${fallback_token_var}" >&2
    exit 1
  fi

  health_payload="$(curl -fsS --max-time "$CURL_MAX_TIME" "$health_url")"
  echo "$health_payload" | jq '{
    identity_mode,
    enabled_servers,
    connected_servers: [.connected_servers[]?.name],
    proxy_tool_count
  }'

  if [[ "$(echo "$health_payload" | jq -r '.identity_mode // ""')" != "$EXPECTED_IDENTITY_MODE" ]]; then
    echo "identity-mode-mismatch: ${REVIEWER}" >&2
    failures=1
  fi

  if ! echo "$health_payload" | jq '.enabled_servers' | json_array_contains "webflow-site-analyzer-mcp" >/dev/null; then
    echo "phase-b-missing-analyzer: ${REVIEWER}" >&2
    failures=1
  fi

  if ! echo "$health_payload" | jq '.enabled_servers' | json_array_contains "webflow-originality-mcp" >/dev/null; then
    echo "phase-b-missing-originality: ${REVIEWER}" >&2
    failures=1
  fi

  if echo "$health_payload" | jq '.enabled_servers' | json_array_contains "$LEGACY_SERVER_NAME" >/dev/null; then
    echo "legacy-server-enabled: ${REVIEWER}" >&2
    failures=1
  fi

  if ! echo "$health_payload" | jq '[.connected_servers[]?.name]' | json_array_contains "webflow-site-analyzer-mcp" >/dev/null; then
    echo "phase-b-disconnected-analyzer: ${REVIEWER}" >&2
    failures=1
  fi

  if ! echo "$health_payload" | jq '[.connected_servers[]?.name]' | json_array_contains "webflow-originality-mcp" >/dev/null; then
    echo "phase-b-disconnected-originality: ${REVIEWER}" >&2
    failures=1
  fi

  if echo "$health_payload" | jq '[.connected_servers[]?.name]' | json_array_contains "$LEGACY_SERVER_NAME" >/dev/null; then
    echo "legacy-server-connected: ${REVIEWER}" >&2
    failures=1
  fi

  services_response="$(call_hub_tool "$hub_url" "$token" "$session_token" "hub_list_services" "{}")"
  if ! echo "$services_response" | jq -e '.result.structuredContent != null' >/dev/null 2>&1; then
    echo "$services_response" | jq .
    echo "hub-list-services-failed: ${REVIEWER}" >&2
    exit 1
  fi
  services_payload="$(echo "$services_response" | jq -c '.result.structuredContent')"
  echo "$services_payload" | jq '{
    discovery,
    visible_services: [.services[] | {name, activeInDiscovery, visibleProxyTools}]
  }'

  if [[ "$(echo "$services_payload" | jq -r '.discovery.mode // ""')" != "$EXPECTED_DISCOVERY_MODE" ]]; then
    echo "discovery-mode-mismatch: ${REVIEWER}" >&2
    failures=1
  fi

  if [[ "$(echo "$services_payload" | jq -r '.discovery.maxProxyTools // ""')" != "$EXPECTED_DISCOVERY_MAX_PROXY_TOOLS" ]]; then
    echo "discovery-max-proxy-tools-mismatch: ${REVIEWER}" >&2
    failures=1
  fi

  if ! echo "$services_payload" | jq '.discovery.activeServers' | json_array_contains "webflow-site-analyzer-mcp" >/dev/null; then
    echo "discovery-missing-analyzer: ${REVIEWER}" >&2
    failures=1
  fi

  if ! echo "$services_payload" | jq '.discovery.activeServers' | json_array_contains "webflow-originality-mcp" >/dev/null; then
    echo "discovery-missing-originality: ${REVIEWER}" >&2
    failures=1
  fi

  if echo "$services_payload" | jq '.discovery.activeServers' | json_array_contains "$LEGACY_SERVER_NAME" >/dev/null; then
    echo "discovery-legacy-server-active: ${REVIEWER}" >&2
    failures=1
  fi

  analyzer_tools_response="$(call_hub_tool "$hub_url" "$token" "$session_token" "hub_search_proxy_tools" '{"serverName":"webflow-site-analyzer-mcp","limit":20}')"
  if ! echo "$analyzer_tools_response" | jq -e '.result.structuredContent != null' >/dev/null 2>&1; then
    echo "$analyzer_tools_response" | jq .
    echo "analyzer-tool-search-failed: ${REVIEWER}" >&2
    exit 1
  fi
  analyzer_tools_payload="$(echo "$analyzer_tools_response" | jq -c '.result.structuredContent')"
  echo "$analyzer_tools_payload" | jq .

  if [[ "$(echo "$analyzer_tools_payload" | jq -r '.total // 0')" == "0" ]]; then
    echo "analyzer-tools-missing: ${REVIEWER}" >&2
    failures=1
  fi

  originality_tools_response="$(call_hub_tool "$hub_url" "$token" "$session_token" "hub_search_proxy_tools" '{"serverName":"webflow-originality-mcp","limit":20}')"
  if ! echo "$originality_tools_response" | jq -e '.result.structuredContent != null' >/dev/null 2>&1; then
    echo "$originality_tools_response" | jq .
    echo "originality-tool-search-failed: ${REVIEWER}" >&2
    exit 1
  fi
  originality_tools_payload="$(echo "$originality_tools_response" | jq -c '.result.structuredContent')"
  echo "$originality_tools_payload" | jq .

  if [[ "$(echo "$originality_tools_payload" | jq -r '.total // 0')" == "0" ]]; then
    echo "originality-tools-missing: ${REVIEWER}" >&2
    failures=1
  fi

  originality_health_payload="$(
    call_hub_tool "$hub_url" "$token" "$session_token" "hub_execute_proxy_tool" '{"proxyToolName":"webflow-originality-mcp__plagiarism_health","args":{}}'
  )"
  echo "$originality_health_payload" | jq .

  if [[ "$(echo "$originality_health_payload" | jq -r '.result.isError // false')" == "true" ]]; then
    echo "originality-health-failed: ${REVIEWER}" >&2
    failures=1
  fi

  policy_payload="$(
    call_hub_tool "$hub_url" "$token" "$session_token" "hub_execute_proxy_tool" '{"proxyToolName":"webflow-site-analyzer-mcp__get_webflow_review_policy","args":{}}'
  )"
  echo "$policy_payload" | jq .

  if [[ "$(echo "$policy_payload" | jq -r '.result.isError // false')" == "true" ]]; then
    echo "analyzer-policy-fetch-failed: ${REVIEWER}" >&2
    failures=1
  fi

  exit "$failures"
}

main "$@"
