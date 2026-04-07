#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HUB_DIR="$ROOT_DIR/packages/cs-mcp-hub-remote"
TEAM_CONFIG="$HUB_DIR/wrangler.team-hubs.toml"

ACTION="${1:-all}"
REVIEWER="${REVIEWER:-all}"
SESSION_RESOLVE_URL="${SESSION_RESOLVE_URL:-https://id.createsomething.space/v1/mcp/sessions/resolve}"
BUNDLE_NAME="${BUNDLE_NAME:-webflow-marketplace-review-phase-b}"
DISCOVERY_PACK="${DISCOVERY_PACK:-webflow-marketplace-review-phase-b}"
ENABLED_SERVERS="${ENABLED_SERVERS:-webflow-template-review-mcp,webflow-site-analyzer-mcp}"
DISABLED_SERVERS="${DISABLED_SERVERS:-webflow-local}"
DISCOVERY_ACTIVE_SERVERS="${DISCOVERY_ACTIVE_SERVERS:-$ENABLED_SERVERS}"
DISCOVERY_MAX_PROXY_TOOLS="${DISCOVERY_MAX_PROXY_TOOLS:-40}"
RATE_LIMIT_MAX_CALLS="${RATE_LIMIT_MAX_CALLS:-120}"
RATE_LIMIT_WINDOW_SECONDS="${RATE_LIMIT_WINDOW_SECONDS:-60}"
QUOTA_MAX_PROXY_CALLS_PER_PERIOD="${QUOTA_MAX_PROXY_CALLS_PER_PERIOD:-10000}"
REVIEWER_IDENTITY_MODE="${REVIEWER_IDENTITY_MODE:-compat}"
REQUIRED_GLOBAL_SERVERS_SENTINEL="${REQUIRED_GLOBAL_SERVERS_SENTINEL:-__none__}"
REQUIRED_DISCOVERY_SERVERS_SENTINEL="${REQUIRED_DISCOVERY_SERVERS_SENTINEL:-webflow-template-review-mcp,webflow-site-analyzer-mcp}"
SKIP_NORMALIZE="${SKIP_NORMALIZE:-0}"
SKIP_VERIFY="${SKIP_VERIFY:-0}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/}"
INFISICAL_INCLUDE_IMPORTS="${INFISICAL_INCLUDE_IMPORTS:-true}"
AUTO_LOAD_INFISICAL="${AUTO_LOAD_INFISICAL:-true}"

REVIEWERS=(
  "wf-template-review-natalia|acct_wf_natalia"
  "wf-template-review-eric|acct_wf_eric"
  "wf-template-review-vicki|acct_wf_vicki"
  "wf-template-review-mariana|acct_wf_mariana"
  "wf-template-review-micah|acct_wf_micah"
)

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing required command: $1" >&2
    exit 1
  }
}

normalize_bool_or_fail() {
  local raw="${1:-}"
  local lowered
  lowered="$(echo "$raw" | tr '[:upper:]' '[:lower:]')"
  case "$lowered" in
    true | false) echo "$lowered" ;;
    *)
      echo "invalid boolean: ${raw} (expected true|false)" >&2
      exit 1
      ;;
  esac
}

load_secrets_from_infisical() {
  local -a export_cmd=(
    infisical export
    --format=json
    --env="$INFISICAL_ENV"
    --path="$INFISICAL_PATH"
    --include-imports="$INFISICAL_INCLUDE_IMPORTS"
  )
  if [[ -n "$INFISICAL_PROJECT_ID" ]]; then
    export_cmd+=(--projectId="$INFISICAL_PROJECT_ID")
  fi

  local payload
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

json_array_from_csv() {
  jq -cn --arg raw "$1" '
    $raw
    | split(",")
    | map(gsub("^\\s+|\\s+$"; ""))
    | map(select(length > 0))
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

reviewer_token_env_name_for_slug() {
  local slug="$1"
  local reviewer_suffix reviewer_upper
  reviewer_suffix="${slug#wf-template-review-}"
  reviewer_upper="$(printf '%s' "$reviewer_suffix" | tr '[:lower:]-' '[:upper:]_')"
  printf 'CS_HUB_WF_TEMPLATE_REVIEW_%s_API_TOKEN' "$reviewer_upper"
}

hub_api_token_for_slug() {
  local slug="$1"
  local reviewer_token_env_name

  reviewer_token_env_name="$(reviewer_token_env_name_for_slug "$slug")"
  if [[ -n "${!reviewer_token_env_name:-}" ]]; then
    printf '%s' "${!reviewer_token_env_name}"
    return 0
  fi

  if [[ -n "${HUB_API_TOKEN:-}" ]]; then
    printf '%s' "$HUB_API_TOKEN"
    return 0
  fi

  return 1
}

needs_hub_auth() {
  if [[ "$ACTION" != "normalize" && "$ACTION" != "verify" && "$ACTION" != "all" ]]; then
    return 1
  fi

  if [[ "$ACTION" == "normalize" && "$SKIP_NORMALIZE" == "1" ]]; then
    return 1
  fi

  if [[ "$ACTION" == "verify" && "$SKIP_VERIFY" == "1" ]]; then
    return 1
  fi

  if [[ "$ACTION" == "all" && "$SKIP_NORMALIZE" == "1" && "$SKIP_VERIFY" == "1" ]]; then
    return 1
  fi

  return 0
}

selected_reviewers_have_tokens() {
  local entry slug
  for entry in "${REVIEWERS[@]}"; do
    slug="${entry%%|*}"
    if ! slug_matches_reviewer "$slug" "$REVIEWER"; then
      continue
    fi
    if ! hub_api_token_for_slug "$slug" >/dev/null 2>&1; then
      return 1
    fi
  done
  return 0
}

deploy_one() {
  local slug="$1"
  local account_id="$2"
  local worker
  worker="$(worker_name_for_slug "$slug")"

  echo "===== DEPLOY ${worker} ====="
  cd "$HUB_DIR"
  pnpm exec wrangler deploy \
    --config "$TEAM_CONFIG" \
    --name "$worker" \
    --domain "$(domain_for_slug "$slug")" \
    --var "HUB_INSTANCE_ID:${worker}" \
    --var "HUB_ACCOUNT_ID:${account_id}" \
    --var "HUB_ENABLED_BUNDLES:${BUNDLE_NAME}" \
    --var "HUB_ENABLED_SERVERS:${ENABLED_SERVERS}" \
    --var "HUB_DISABLED_SERVERS:${DISABLED_SERVERS}" \
    --var "HUB_IDENTITY_MODE:${REVIEWER_IDENTITY_MODE}" \
    --var "HUB_COMPAT_TRUST_CLIENT_ACCOUNT_HEADERS:false" \
    --var "HUB_SESSION_RESOLVE_URL:${SESSION_RESOLVE_URL}" \
    --var "HUB_DISCOVERY_MODE:compact" \
    --var "HUB_DISCOVERY_SHARED_PACK:${DISCOVERY_PACK}" \
    --var "HUB_DISCOVERY_DEFAULT_SERVERS:${DISCOVERY_ACTIVE_SERVERS}" \
    --var "HUB_DISCOVERY_MAX_PROXY_TOOLS:${DISCOVERY_MAX_PROXY_TOOLS}" \
    --var "HUB_REQUIRED_GLOBAL_SERVERS:${REQUIRED_GLOBAL_SERVERS_SENTINEL}" \
    --var "HUB_REQUIRED_DISCOVERY_SERVERS:${REQUIRED_DISCOVERY_SERVERS_SENTINEL}" \
    --var "HUB_RATE_LIMIT_MAX_CALLS_PER_WINDOW:${RATE_LIMIT_MAX_CALLS}" \
    --var "HUB_RATE_LIMIT_WINDOW_SECONDS:${RATE_LIMIT_WINDOW_SECONDS}" \
    --var "HUB_QUOTA_MAX_PROXY_CALLS_PER_PERIOD:${QUOTA_MAX_PROXY_CALLS_PER_PERIOD}" \
    --keep-vars
}

normalize_one() {
  local slug="$1"
  local worker
  local mcp_url
  local enabled_servers_json
  local discovery_active_servers_json
  local hub_api_token
  local -a auth_headers
  worker="$(worker_name_for_slug "$slug")"
  mcp_url="$(mcp_url_for_slug "$slug")"
  enabled_servers_json="$(json_array_from_csv "$ENABLED_SERVERS")"
  discovery_active_servers_json="$(json_array_from_csv "$DISCOVERY_ACTIVE_SERVERS")"

  if ! hub_api_token="$(hub_api_token_for_slug "$slug")"; then
    echo "missing HUB_API_TOKEN or reviewer-specific API token; cannot normalize ${worker}" >&2
    exit 1
  fi
  auth_headers=(-H "Authorization: Bearer ${hub_api_token}")
  if [[ "$REVIEWER_IDENTITY_MODE" == "session_required" && -z "${SESSION_TOKEN_FOR_NORMALIZE:-}" ]]; then
    echo "missing SESSION_TOKEN_FOR_NORMALIZE; cannot normalize ${worker} in session_required mode" >&2
    exit 1
  fi
  if [[ -n "${SESSION_TOKEN_FOR_NORMALIZE:-}" ]]; then
    auth_headers+=(-H "X-MCP-Session-Token: ${SESSION_TOKEN_FOR_NORMALIZE}")
  fi

  echo "===== NORMALIZE ${worker} ====="

  curl_with_url "$mcp_url" -sS -X POST \
    "${auth_headers[@]}" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
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

  curl_with_url "$mcp_url" -sS -X POST \
    "${auth_headers[@]}" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
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

verify_one() {
  local slug="$1"
  local worker
  local health_url
  local mcp_url
  local hub_api_token
  local -a auth_headers
  worker="$(worker_name_for_slug "$slug")"
  health_url="$(health_url_for_slug "$slug")"
  mcp_url="$(mcp_url_for_slug "$slug")"

  if ! hub_api_token="$(hub_api_token_for_slug "$slug")"; then
    echo "missing HUB_API_TOKEN or reviewer-specific API token; cannot verify ${worker}" >&2
    exit 1
  fi
  auth_headers=(-H "Authorization: Bearer ${hub_api_token}")
  if [[ "$REVIEWER_IDENTITY_MODE" == "session_required" && -z "${SESSION_TOKEN_FOR_VERIFY:-${SESSION_TOKEN_FOR_NORMALIZE:-}}" ]]; then
    echo "missing SESSION_TOKEN_FOR_VERIFY or SESSION_TOKEN_FOR_NORMALIZE; cannot verify ${worker}" >&2
    exit 1
  fi
  if [[ -n "${SESSION_TOKEN_FOR_VERIFY:-${SESSION_TOKEN_FOR_NORMALIZE:-}}" ]]; then
    local session_token="${SESSION_TOKEN_FOR_VERIFY:-${SESSION_TOKEN_FOR_NORMALIZE}}"
    auth_headers+=(-H "X-MCP-Session-Token: ${session_token}")
  fi

  echo "===== VERIFY ${worker} ====="
  curl_with_url "$health_url" -sS | jq .

  curl_with_url "$mcp_url" -sS -X POST \
    "${auth_headers[@]}" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -d '{
      "jsonrpc":"2.0",
      "id":"phase-b-services",
      "method":"tools/call",
      "params":{
        "name":"hub_list_services",
        "arguments":{}
      }
    }' | jq .

  curl_with_url "$mcp_url" -sS -X POST \
    "${auth_headers[@]}" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -d '{
      "jsonrpc":"2.0",
      "id":"phase-b-search-template-review",
      "method":"tools/call",
      "params":{
        "name":"hub_search_proxy_tools",
        "arguments":{
          "serverName":"webflow-template-review-mcp",
          "limit":24
        }
      }
    }' | jq .

  curl_with_url "$mcp_url" -sS -X POST \
    "${auth_headers[@]}" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -d '{
      "jsonrpc":"2.0",
      "id":"phase-b-search-analyzer",
      "method":"tools/call",
      "params":{
        "name":"hub_search_proxy_tools",
        "arguments":{
          "serverName":"webflow-site-analyzer-mcp",
          "limit":20
        }
      }
    }' | jq .
}

require_cmd pnpm
require_cmd jq
require_cmd curl
AUTO_LOAD_INFISICAL="$(normalize_bool_or_fail "$AUTO_LOAD_INFISICAL")"
INFISICAL_INCLUDE_IMPORTS="$(normalize_bool_or_fail "$INFISICAL_INCLUDE_IMPORTS")"

case "$ACTION" in
  deploy|normalize|verify|all)
    ;;
  *)
    echo "usage: $0 [deploy|normalize|verify|all]" >&2
    exit 1
    ;;
esac

if needs_hub_auth && [[ "$AUTO_LOAD_INFISICAL" == "true" ]] && ! selected_reviewers_have_tokens; then
  require_cmd infisical
  load_secrets_from_infisical
fi

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
    fi
  fi
  if [[ "$ACTION" == "verify" || "$ACTION" == "all" ]]; then
    if [[ "$SKIP_VERIFY" != "1" ]]; then
      verify_one "$slug"
    fi
  fi
done

echo "webflow reviewer Phase B hub action complete: ${ACTION}"
