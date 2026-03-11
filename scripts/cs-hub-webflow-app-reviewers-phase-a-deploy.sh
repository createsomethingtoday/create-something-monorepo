#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HUB_DIR="$ROOT_DIR/packages/cs-mcp-hub-remote"
TEAM_CONFIG="$HUB_DIR/wrangler.team-hubs.toml"

ACTION="${1:-all}"
SESSION_RESOLVE_URL="${SESSION_RESOLVE_URL:-https://id.createsomething.space/v1/mcp/sessions/resolve}"
DISCOVERY_PACK="${DISCOVERY_PACK:-webflow-marketplace-app-review-phase-a}"
DISCOVERY_MAX_PROXY_TOOLS="${DISCOVERY_MAX_PROXY_TOOLS:-8}"
RATE_LIMIT_MAX_CALLS="${RATE_LIMIT_MAX_CALLS:-120}"
RATE_LIMIT_WINDOW_SECONDS="${RATE_LIMIT_WINDOW_SECONDS:-60}"
QUOTA_MAX_PROXY_CALLS_PER_PERIOD="${QUOTA_MAX_PROXY_CALLS_PER_PERIOD:-10000}"
REVIEWER_IDENTITY_MODE="${REVIEWER_IDENTITY_MODE:-session_required}"
REQUIRED_GLOBAL_SERVERS_SENTINEL="${REQUIRED_GLOBAL_SERVERS_SENTINEL:-__none__}"
REQUIRED_DISCOVERY_SERVERS_SENTINEL="${REQUIRED_DISCOVERY_SERVERS_SENTINEL:-__none__}"
SKIP_NORMALIZE="${SKIP_NORMALIZE:-0}"
SKIP_VERIFY="${SKIP_VERIFY:-0}"

REVIEWERS=(
  "wf-app-review-pablo|acct_wf_pablo"
  "wf-app-review-shea|acct_wf_shea"
)

INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
INFISICAL_INCLUDE_IMPORTS="${INFISICAL_INCLUDE_IMPORTS:-true}"

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
    "wf-app-review-pablo") echo "CS_HUB_WF_APP_REVIEW_PABLO_API_TOKEN" ;;
    "wf-app-review-shea") echo "CS_HUB_WF_APP_REVIEW_SHEA_API_TOKEN" ;;
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
    --var "HUB_ENABLED_BUNDLES:webflow-marketplace-app-review-phase-a" \
    --var "HUB_ENABLED_SERVERS:webflow-app-review-mcp" \
    --var "HUB_IDENTITY_MODE:${REVIEWER_IDENTITY_MODE}" \
    --var "HUB_COMPAT_TRUST_CLIENT_ACCOUNT_HEADERS:false" \
    --var "HUB_SESSION_RESOLVE_URL:${SESSION_RESOLVE_URL}" \
    --var "HUB_DISCOVERY_MODE:compact" \
    --var "HUB_DISCOVERY_SHARED_PACK:${DISCOVERY_PACK}" \
    --var "HUB_DISCOVERY_DEFAULT_SERVERS:webflow-app-review-mcp" \
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
  worker="$(worker_name_for_slug "$slug")"
  mcp_url="$(mcp_url_for_slug "$slug")"
  hub_token="$(resolve_reviewer_token "$slug")"
  if [[ -z "${SESSION_TOKEN_FOR_NORMALIZE:-}" ]]; then
    echo "missing SESSION_TOKEN_FOR_NORMALIZE; cannot normalize ${worker} in session_required mode" >&2
    exit 1
  fi

  echo "===== NORMALIZE ${worker} ====="

  curl -sS -X POST "$mcp_url" \
    -H "Authorization: Bearer ${hub_token}" \
    -H "X-MCP-Session-Token: ${SESSION_TOKEN_FOR_NORMALIZE}" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -d '{
      "jsonrpc":"2.0",
      "id":"phase-a-state",
      "method":"tools/call",
      "params":{
        "name":"hub_update_state",
        "arguments":{
          "setBundles":["webflow-marketplace-app-review-phase-a"],
          "setServers":["webflow-app-review-mcp"]
        }
      }
    }' | jq .

  curl -sS -X POST "$mcp_url" \
    -H "Authorization: Bearer ${hub_token}" \
    -H "X-MCP-Session-Token: ${SESSION_TOKEN_FOR_NORMALIZE}" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -d "{
      \"jsonrpc\":\"2.0\",
      \"id\":\"phase-a-discovery\",
      \"method\":\"tools/call\",
      \"params\":{
        \"name\":\"hub_set_discovery\",
        \"arguments\":{
          \"pack\":\"${DISCOVERY_PACK}\",
          \"mode\":\"compact\",
          \"activeServers\":[\"webflow-app-review-mcp\"],
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
  worker="$(worker_name_for_slug "$slug")"
  health_url="$(health_url_for_slug "$slug")"
  mcp_url="$(mcp_url_for_slug "$slug")"
  hub_token="$(resolve_reviewer_token "$slug")"
  if [[ -z "${SESSION_TOKEN_FOR_VERIFY:-${SESSION_TOKEN_FOR_NORMALIZE:-}}" ]]; then
    echo "missing SESSION_TOKEN_FOR_VERIFY or SESSION_TOKEN_FOR_NORMALIZE; cannot verify ${worker}" >&2
    exit 1
  fi
  local session_token="${SESSION_TOKEN_FOR_VERIFY:-${SESSION_TOKEN_FOR_NORMALIZE}}"

  echo "===== VERIFY ${worker} ====="
  curl -sS "$health_url" | jq .

  curl -sS -X POST "$mcp_url" \
    -H "Authorization: Bearer ${hub_token}" \
    -H "X-MCP-Session-Token: ${session_token}" \
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

  curl -sS -X POST "$mcp_url" \
    -H "Authorization: Bearer ${hub_token}" \
    -H "X-MCP-Session-Token: ${session_token}" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -d '{
      "jsonrpc":"2.0",
      "id":"phase-a-search",
      "method":"tools/call",
      "params":{
        "name":"hub_search_proxy_tools",
        "arguments":{
          "serverName":"webflow-app-review-mcp",
          "limit":20
        }
      }
    }' | jq .
}

require_cmd pnpm
require_cmd jq
require_cmd curl
INFISICAL_INCLUDE_IMPORTS="$(normalize_bool_or_fail "$INFISICAL_INCLUDE_IMPORTS")"

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

echo "webflow app-reviewer Phase A hub action complete: ${ACTION}"
