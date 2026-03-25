#!/usr/bin/env bash
set -euo pipefail

REVIEWERS=(
  "natalia|https://wf-template-review-natalia.mcp.createsomething.agency/health|https://wf-template-review-natalia.mcp.createsomething.agency/mcp|WF_TEMPLATE_REVIEW_NATALIA"
  "sudiksha|https://wf-template-review-sudiksha.mcp.createsomething.agency/health|https://wf-template-review-sudiksha.mcp.createsomething.agency/mcp|WF_TEMPLATE_REVIEW_SUDIKSHA"
  "eric|https://wf-template-review-eric.mcp.createsomething.agency/health|https://wf-template-review-eric.mcp.createsomething.agency/mcp|WF_TEMPLATE_REVIEW_ERIC"
  "vicki|https://wf-template-review-vicki.mcp.createsomething.agency/health|https://wf-template-review-vicki.mcp.createsomething.agency/mcp|WF_TEMPLATE_REVIEW_VICKI"
  "mariana|https://wf-template-review-mariana.mcp.createsomething.agency/health|https://wf-template-review-mariana.mcp.createsomething.agency/mcp|WF_TEMPLATE_REVIEW_MARIANA"
  "micah|https://wf-template-review-micah.mcp.createsomething.agency/health|https://wf-template-review-micah.mcp.createsomething.agency/mcp|WF_TEMPLATE_REVIEW_MICAH"
)

EXPECTED_IDENTITY_MODE="${EXPECTED_IDENTITY_MODE:-session_required}"
EXPECTED_DISCOVERY_MODE="${EXPECTED_DISCOVERY_MODE:-compact}"
EXPECTED_DISCOVERY_MAX_PROXY_TOOLS="${EXPECTED_DISCOVERY_MAX_PROXY_TOOLS:-30}"
LEGACY_SERVER_NAME="${LEGACY_SERVER_NAME:-webflow-local}"
VERIFY_DISCOVERY="${VERIFY_DISCOVERY:-true}"
CURL_MAX_TIME="${CURL_MAX_TIME:-20}"
REVIEWER="${REVIEWER:-all}"
INFISICAL_AUTO_LOAD="${INFISICAL_AUTO_LOAD:-true}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/}"
INFISICAL_INCLUDE_IMPORTS="${INFISICAL_INCLUDE_IMPORTS:-true}"
INFISICAL_LOADED="${INFISICAL_LOADED:-false}"

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
  local -a export_cmd
  local payload
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

reviewer_hub_token_var() {
  local reviewer="$1"
  printf 'CS_HUB_WF_TEMPLATE_REVIEW_%s_API_TOKEN' "$(printf '%s' "$reviewer" | tr '[:lower:]' '[:upper:]')"
}

reviewer_session_token_var() {
  local reviewer="$1"
  printf 'CS_HUB_WF_TEMPLATE_REVIEW_%s_SESSION_TOKEN' "$(printf '%s' "$reviewer" | tr '[:lower:]' '[:upper:]')"
}

resolve_session_token() {
  local reviewer="$1"
  local specific_var legacy_specific_var
  specific_var="$(reviewer_session_token_var "$reviewer")"
  legacy_specific_var="WF_TEMPLATE_REVIEW_$(printf '%s' "$reviewer" | tr '[:lower:]' '[:upper:]')_SESSION_TOKEN"
  printf '%s' "${!specific_var:-${!legacy_specific_var:-${SESSION_TOKEN_FOR_VERIFY:-${MCP_SESSION_TOKEN:-}}}}"
}

reviewer_matches() {
  local reviewer="$1"
  [[ "$REVIEWER" == "all" || "$REVIEWER" == "$reviewer" ]]
}

ensure_reviewer_token_loaded() {
  local reviewer="$1"
  local token_var fallback_token_var
  token_var="WF_TEMPLATE_REVIEW_$(printf '%s' "$reviewer" | tr '[:lower:]' '[:upper:]')"
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
      \"id\":\"phase-b-verify\",
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

  VERIFY_DISCOVERY="$(normalize_bool "$VERIFY_DISCOVERY")"
  INFISICAL_AUTO_LOAD="$(normalize_bool "$INFISICAL_AUTO_LOAD")"

  local failures=0

  for entry in "${REVIEWERS[@]}"; do
    local reviewer health_url hub_url token_var payload connected_names discovery_payload token fallback_token_var session_token discovery_response
    IFS='|' read -r reviewer health_url hub_url token_var <<<"$entry"

    if ! reviewer_matches "$reviewer"; then
      continue
    fi

    echo "== ${reviewer} =="
    payload="$(curl -fsS --max-time "$CURL_MAX_TIME" "$health_url")"

    echo "$payload" | jq '{
      identity_mode,
      enabled_servers,
      connected_servers: [.connected_servers[]?.name],
      proxy_tool_count
    }'

    connected_names="$(echo "$payload" | jq '[.connected_servers[]?.name]')"

    if [[ "$(echo "$payload" | jq -r '.identity_mode // ""')" != "$EXPECTED_IDENTITY_MODE" ]]; then
      echo "identity-mode-mismatch: ${reviewer}" >&2
      failures=1
    fi

    if ! echo "$payload" | jq '.enabled_servers' | json_array_contains "webflow-site-analyzer-mcp" >/dev/null; then
      echo "phase-b-missing-analyzer: ${reviewer}" >&2
      failures=1
    fi

    if ! echo "$payload" | jq '.enabled_servers' | json_array_contains "webflow-originality-mcp" >/dev/null; then
      echo "phase-b-missing-originality: ${reviewer}" >&2
      failures=1
    fi

    if echo "$payload" | jq '.enabled_servers' | json_array_contains "$LEGACY_SERVER_NAME" >/dev/null; then
      echo "legacy-server-enabled: ${reviewer}" >&2
      failures=1
    fi

    if ! echo "$connected_names" | json_array_contains "webflow-site-analyzer-mcp" >/dev/null; then
      echo "phase-b-disconnected-analyzer: ${reviewer}" >&2
      failures=1
    fi

    if ! echo "$connected_names" | json_array_contains "webflow-originality-mcp" >/dev/null; then
      echo "phase-b-disconnected-originality: ${reviewer}" >&2
      failures=1
    fi

    if echo "$connected_names" | json_array_contains "$LEGACY_SERVER_NAME" >/dev/null; then
      echo "legacy-server-connected: ${reviewer}" >&2
      failures=1
    fi

    if [[ "$VERIFY_DISCOVERY" == "false" ]]; then
      echo "discovery-verification-skipped: ${reviewer}" >&2
      continue
    fi

    ensure_reviewer_token_loaded "$reviewer"
    fallback_token_var="$(reviewer_hub_token_var "$reviewer")"
    token="${!token_var:-${!fallback_token_var:-}}"
    if [[ -z "$token" ]]; then
      echo "missing reviewer token env var for discovery verification: ${token_var} or ${fallback_token_var}" >&2
      failures=1
      continue
    fi

    session_token="$(resolve_session_token "$reviewer")"

    discovery_response="$(call_hub_tool "$hub_url" "$token" "$session_token" "hub_list_services" "{}")"
    if ! echo "$discovery_response" | jq -e '.result.structuredContent != null' >/dev/null 2>&1; then
      echo "$discovery_response" | jq .
      echo "hub-list-services-failed: ${reviewer}" >&2
      failures=1
      continue
    fi
    discovery_payload="$(echo "$discovery_response" | jq -c '.result.structuredContent')"

    echo "$discovery_payload" | jq '{
      discovery,
      visible_services: [.services[] | {name, activeInDiscovery, visibleProxyTools}]
    }'

    if [[ "$(echo "$discovery_payload" | jq -r '.discovery.mode // ""')" != "$EXPECTED_DISCOVERY_MODE" ]]; then
      echo "discovery-mode-mismatch: ${reviewer}" >&2
      failures=1
    fi

    if [[ "$(echo "$discovery_payload" | jq -r '.discovery.maxProxyTools // ""')" != "$EXPECTED_DISCOVERY_MAX_PROXY_TOOLS" ]]; then
      echo "discovery-max-proxy-tools-mismatch: ${reviewer}" >&2
      failures=1
    fi

    if ! echo "$discovery_payload" | jq '.discovery.activeServers' | json_array_contains "webflow-site-analyzer-mcp" >/dev/null; then
      echo "discovery-missing-analyzer: ${reviewer}" >&2
      failures=1
    fi

    if ! echo "$discovery_payload" | jq '.discovery.activeServers' | json_array_contains "webflow-originality-mcp" >/dev/null; then
      echo "discovery-missing-originality: ${reviewer}" >&2
      failures=1
    fi

    if echo "$discovery_payload" | jq '.discovery.activeServers' | json_array_contains "$LEGACY_SERVER_NAME" >/dev/null; then
      echo "discovery-legacy-server-active: ${reviewer}" >&2
      failures=1
    fi
  done

  exit "$failures"
}

main "$@"
