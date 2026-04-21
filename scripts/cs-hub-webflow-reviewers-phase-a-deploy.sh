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
DISABLED_SERVERS="${DISABLED_SERVERS:-webflow-local,webflow-site-analyzer-mcp}"
DISCOVERY_MODE="${DISCOVERY_MODE:-compact}"
DISCOVERY_ACTIVE_SERVERS="${DISCOVERY_ACTIVE_SERVERS:-$ENABLED_SERVERS}"
DISCOVERY_MAX_PROXY_TOOLS="${DISCOVERY_MAX_PROXY_TOOLS:-21}"
RATE_LIMIT_MAX_CALLS="${RATE_LIMIT_MAX_CALLS:-120}"
RATE_LIMIT_WINDOW_SECONDS="${RATE_LIMIT_WINDOW_SECONDS:-60}"
QUOTA_MAX_PROXY_CALLS_PER_PERIOD="${QUOTA_MAX_PROXY_CALLS_PER_PERIOD:-10000}"
REVIEWER_IDENTITY_MODE="${REVIEWER_IDENTITY_MODE:-compat}"
REQUIRED_GLOBAL_SERVERS_SENTINEL="${REQUIRED_GLOBAL_SERVERS_SENTINEL:-__none__}"
REQUIRED_DISCOVERY_SERVERS_SENTINEL="${REQUIRED_DISCOVERY_SERVERS_SENTINEL:-__none__}"
SKIP_NORMALIZE="${SKIP_NORMALIZE:-0}"
SKIP_VERIFY="${SKIP_VERIFY:-0}"
INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
INFISICAL_INCLUDE_IMPORTS="${INFISICAL_INCLUDE_IMPORTS:-true}"

REVIEWERS=(
  "wf-template-review-natalia|acct_wf_natalia"
  "wf-template-review-sudiksha|acct_wf_sudiksha"
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

reviewer_secret_name_for_slug() {
  case "$1" in
    "wf-template-review-natalia") echo "CS_HUB_WF_TEMPLATE_REVIEW_NATALIA_API_TOKEN" ;;
    "wf-template-review-sudiksha") echo "CS_HUB_WF_TEMPLATE_REVIEW_SUDIKSHA_API_TOKEN" ;;
    "wf-template-review-eric") echo "CS_HUB_WF_TEMPLATE_REVIEW_ERIC_API_TOKEN" ;;
    "wf-template-review-vicki") echo "CS_HUB_WF_TEMPLATE_REVIEW_VICKI_API_TOKEN" ;;
    "wf-template-review-mariana") echo "CS_HUB_WF_TEMPLATE_REVIEW_MARIANA_API_TOKEN" ;;
    "wf-template-review-micah") echo "CS_HUB_WF_TEMPLATE_REVIEW_MICAH_API_TOKEN" ;;
    *)
      echo "unknown reviewer slug: $1" >&2
      exit 1
      ;;
  esac
}

resolve_reviewer_token() {
  local slug="$1"
  local secret_name
  secret_name="$(reviewer_secret_name_for_slug "$slug")"

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

  echo "missing reviewer token secret ${secret_name} for ${slug}" >&2
  exit 1
}

slug_matches_reviewer() {
  local slug="$1"
  local reviewer="${2:-all}"
  if [[ "$reviewer" == "all" ]]; then
    return 0
  fi
  [[ "$slug" == "wf-template-review-${reviewer}" ]]
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
    --var "HUB_DISCOVERY_MODE:${DISCOVERY_MODE}" \
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
  local hub_token
  local -a auth_headers
  local enabled_servers_json
  local discovery_active_servers_json
  worker="$(worker_name_for_slug "$slug")"
  mcp_url="$(mcp_url_for_slug "$slug")"
  hub_token="$(resolve_reviewer_token "$slug")"
  auth_headers=(-H "Authorization: Bearer ${hub_token}")
  enabled_servers_json="$(json_array_from_csv "$ENABLED_SERVERS")"
  discovery_active_servers_json="$(json_array_from_csv "$DISCOVERY_ACTIVE_SERVERS")"

  if [[ "$REVIEWER_IDENTITY_MODE" == "session_required" ]]; then
    if [[ -z "${SESSION_TOKEN_FOR_NORMALIZE:-}" ]]; then
      echo "missing SESSION_TOKEN_FOR_NORMALIZE; cannot normalize ${worker} in session_required mode" >&2
      exit 1
    fi
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
          \"mode\":\"${DISCOVERY_MODE}\",
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
  local hub_token
  local -a auth_headers
  worker="$(worker_name_for_slug "$slug")"
  health_url="$(health_url_for_slug "$slug")"
  mcp_url="$(mcp_url_for_slug "$slug")"
  hub_token="$(resolve_reviewer_token "$slug")"
  auth_headers=(-H "Authorization: Bearer ${hub_token}")

  if [[ "$REVIEWER_IDENTITY_MODE" == "session_required" ]]; then
    if [[ -z "${SESSION_TOKEN_FOR_VERIFY:-${SESSION_TOKEN_FOR_NORMALIZE:-}}" ]]; then
      echo "missing SESSION_TOKEN_FOR_VERIFY or SESSION_TOKEN_FOR_NORMALIZE; cannot verify ${worker}" >&2
      exit 1
    fi
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
      "id":"phase-a-services",
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
      "id":"phase-a-search",
      "method":"tools/call",
      "params":{
        "name":"hub_search_proxy_tools",
        "arguments":{
          "serverName":"webflow-template-review-mcp",
          "limit":20
        }
      }
    }' | jq .
}

require_cmd pnpm
require_cmd jq
require_cmd curl

case "$ACTION" in
  deploy|normalize|verify|all)
    ;;
  *)
    echo "usage: $0 [deploy|normalize|verify|all]" >&2
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
    fi
  fi
  if [[ "$ACTION" == "verify" || "$ACTION" == "all" ]]; then
    if [[ "$SKIP_VERIFY" != "1" ]]; then
      verify_one "$slug"
    fi
  fi
done

echo "webflow reviewer Phase A hub action complete: ${ACTION}"
