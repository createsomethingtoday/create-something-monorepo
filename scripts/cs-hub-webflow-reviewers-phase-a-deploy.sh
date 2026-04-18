#!/usr/bin/env bash
set -euo pipefail

# Default posture is the current production reviewer surface.
# To revert to the old compact rollback posture, set:
#   BUNDLE_NAME=webflow-marketplace-review-phase-a
#   DISCOVERY_PACK=webflow-marketplace-review-phase-a
#   ENABLED_SERVERS=webflow-template-review-mcp
#   DISABLED_SERVERS=webflow-site-analyzer-mcp,webflow-local
#   DISCOVERY_ACTIVE_SERVERS=webflow-template-review-mcp
#   DISCOVERY_MAX_PROXY_TOOLS=22

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HUB_DIR="$ROOT_DIR/packages/cs-mcp-hub-remote"
TEAM_CONFIG="$HUB_DIR/wrangler.team-hubs.toml"
WRANGLER_RUNNER="$ROOT_DIR/scripts/run-wrangler.mjs"

ACTION="${1:-all}"
REVIEWER="${REVIEWER:-all}"
SESSION_RESOLVE_URL="${SESSION_RESOLVE_URL:-https://id.createsomething.space/v1/mcp/sessions/resolve}"
BUNDLE_NAME="${BUNDLE_NAME:-webflow-marketplace-review-phase-b}"
DISCOVERY_PACK="${DISCOVERY_PACK:-webflow-marketplace-review-phase-b}"
ENABLED_SERVERS="${ENABLED_SERVERS:-webflow-template-review-mcp,webflow-site-analyzer-mcp}"
DISABLED_SERVERS="${DISABLED_SERVERS:-webflow-local}"
DISCOVERY_ACTIVE_SERVERS="${DISCOVERY_ACTIVE_SERVERS:-$ENABLED_SERVERS}"
DISCOVERY_MAX_PROXY_TOOLS="${DISCOVERY_MAX_PROXY_TOOLS:-30}"
RATE_LIMIT_MAX_CALLS="${RATE_LIMIT_MAX_CALLS:-120}"
RATE_LIMIT_WINDOW_SECONDS="${RATE_LIMIT_WINDOW_SECONDS:-60}"
QUOTA_MAX_PROXY_CALLS_PER_PERIOD="${QUOTA_MAX_PROXY_CALLS_PER_PERIOD:-10000}"
REVIEWER_IDENTITY_MODE="${REVIEWER_IDENTITY_MODE:-compat}"
REQUIRED_GLOBAL_SERVERS_SENTINEL="${REQUIRED_GLOBAL_SERVERS_SENTINEL:-__none__}"
REQUIRED_DISCOVERY_SERVERS_SENTINEL="${REQUIRED_DISCOVERY_SERVERS_SENTINEL:-__none__}"
SKIP_NORMALIZE="${SKIP_NORMALIZE:-0}"
SKIP_VERIFY="${SKIP_VERIFY:-0}"
SKIP_MISSING_REVIEWER_SECRETS="${SKIP_MISSING_REVIEWER_SECRETS:-false}"
INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
INFISICAL_INCLUDE_IMPORTS="${INFISICAL_INCLUDE_IMPORTS:-true}"
INFISICAL_EXPORT_JSON=""

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

reviewer_secret_name_for_slug() {
  local slug="$1"
  local reviewer_upper
  reviewer_upper="$(printf '%s' "${slug#wf-template-review-}" | tr '[:lower:]-' '[:upper:]_')"
  echo "CS_HUB_WF_TEMPLATE_REVIEW_${reviewer_upper}_API_TOKEN"
}

load_infisical_export_json() {
  if [[ -n "$INFISICAL_EXPORT_JSON" ]]; then
    return 0
  fi
  if ! command -v infisical >/dev/null 2>&1; then
    return 1
  fi

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

  INFISICAL_EXPORT_JSON="$("${export_cmd[@]}" 2>/dev/null || true)"
  [[ -n "$INFISICAL_EXPORT_JSON" ]]
}

lookup_secret_in_infisical_export() {
  local secret_name="$1"
  [[ -n "$INFISICAL_EXPORT_JSON" ]] || return 1
  jq -r --arg key "$secret_name" '
    if type == "array" then
      (.[] | select(.key == $key) | .value // empty)
    else
      (.[$key] // empty)
    end
  ' <<<"$INFISICAL_EXPORT_JSON"
}

resolve_hub_token_for_slug() {
  local slug="$1"
  local secret_name token
  secret_name="$(reviewer_secret_name_for_slug "$slug")"

  if [[ -n "${!secret_name:-}" ]]; then
    echo "${!secret_name}"
    return 0
  fi

  if [[ "$REVIEWER" != "all" && -n "${HUB_API_TOKEN:-}" ]]; then
    echo "$HUB_API_TOKEN"
    return 0
  fi

  if load_infisical_export_json; then
    token="$(lookup_secret_in_infisical_export "$secret_name")"
    if [[ -n "$token" ]]; then
      echo "$token"
      return 0
    fi
  fi

  return 1
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

deploy_one() {
  local slug="$1"
  local account_id="$2"
  local worker
  local upload_output
  local version_id
  worker="$(worker_name_for_slug "$slug")"

  echo "===== DEPLOY ${worker} ====="
  upload_output="$(
    node "$WRANGLER_RUNNER" --cwd packages/cs-mcp-hub-remote versions upload \
    --config "$TEAM_CONFIG" \
    --name "$worker" \
    --message "deploy reviewer hub code" \
    --var "HUB_INSTANCE_ID:${worker}" \
    --var "HUB_ACCOUNT_ID:${account_id}" \
    --var "HUB_ENABLED_BUNDLES:${BUNDLE_NAME}" \
    --var "HUB_ENABLED_SERVERS:${ENABLED_SERVERS}" \
    --var "HUB_DISABLED_SERVERS:${DISABLED_SERVERS}" \
    --var "HUB_OAUTH_DISCOVERY_ENABLED:false" \
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
    --var "HUB_QUOTA_MAX_PROXY_CALLS_PER_PERIOD:${QUOTA_MAX_PROXY_CALLS_PER_PERIOD}"
  )"
  printf '%s\n' "$upload_output"

  version_id="$(printf '%s\n' "$upload_output" | grep -Eo '[0-9a-f]{8}-[0-9a-f-]{27}' | tail -n1)"
  if [[ -z "$version_id" ]]; then
    echo "failed to parse uploaded version id for ${worker}" >&2
    exit 1
  fi

  node "$WRANGLER_RUNNER" --cwd packages/cs-mcp-hub-remote versions deploy \
    --name "$worker" \
    --config "$TEAM_CONFIG" \
    --version-id "$version_id" \
    --percentage 100 \
    --message "deploy reviewer hub code" \
    --yes
}

normalize_one() {
  local slug="$1"
  local worker
  local mcp_url
  local enabled_servers_json
  local disabled_servers_json
  local discovery_active_servers_json
  local hub_token
  worker="$(worker_name_for_slug "$slug")"
  mcp_url="$(mcp_url_for_slug "$slug")"
  enabled_servers_json="$(json_array_from_csv "$ENABLED_SERVERS")"
  disabled_servers_json="$(json_array_from_csv "$DISABLED_SERVERS")"
  discovery_active_servers_json="$(json_array_from_csv "$DISCOVERY_ACTIVE_SERVERS")"

  if ! hub_token="$(resolve_hub_token_for_slug "$slug")"; then
    if [[ "$SKIP_MISSING_REVIEWER_SECRETS" == "true" ]]; then
      echo "skip normalize ${worker}: missing reviewer token secret"
      return 0
    fi
    echo "missing reviewer token secret; cannot normalize ${worker}" >&2
    exit 1
  fi
  if [[ "$REVIEWER_IDENTITY_MODE" == "session_required" && -z "${SESSION_TOKEN_FOR_NORMALIZE:-}" ]]; then
    echo "missing SESSION_TOKEN_FOR_NORMALIZE; cannot normalize ${worker} in session_required mode" >&2
    exit 1
  fi

  echo "===== NORMALIZE ${worker} ====="

  local -a headers=(
    -H "Authorization: Bearer ${hub_token}"
    -H "Content-Type: application/json"
    -H "Accept: application/json, text/event-stream"
  )
  if [[ -n "${SESSION_TOKEN_FOR_NORMALIZE:-}" ]]; then
    headers+=(-H "X-MCP-Session-Token: ${SESSION_TOKEN_FOR_NORMALIZE}")
  fi

  local state_payload
  state_payload="$(jq -cn \
    --arg bundle "$BUNDLE_NAME" \
    --argjson enabledServers "$enabled_servers_json" \
    --argjson disabledServers "$disabled_servers_json" \
    '{
      jsonrpc:"2.0",
      id:"review-state",
      method:"tools/call",
      params:{
        name:"hub_update_state",
        arguments:(
          {
            setBundles:[$bundle],
            setServers:$enabledServers
          }
          + (if ($disabledServers | length) > 0 then {disableServers:$disabledServers} else {} end)
        )
      }
    }')"

  curl_with_url "$mcp_url" -sS -X POST \
    "${headers[@]}" \
    -d "$state_payload" | jq .

  curl_with_url "$mcp_url" -sS -X POST \
    "${headers[@]}" \
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
  local hub_token
  worker="$(worker_name_for_slug "$slug")"
  health_url="$(health_url_for_slug "$slug")"
  mcp_url="$(mcp_url_for_slug "$slug")"

  if ! hub_token="$(resolve_hub_token_for_slug "$slug")"; then
    if [[ "$SKIP_MISSING_REVIEWER_SECRETS" == "true" ]]; then
      echo "skip verify ${worker}: missing reviewer token secret"
      return 0
    fi
    echo "missing reviewer token secret; cannot verify ${worker}" >&2
    exit 1
  fi
  if [[ "$REVIEWER_IDENTITY_MODE" == "session_required" && -z "${SESSION_TOKEN_FOR_VERIFY:-${SESSION_TOKEN_FOR_NORMALIZE:-}}" ]]; then
    echo "missing SESSION_TOKEN_FOR_VERIFY or SESSION_TOKEN_FOR_NORMALIZE; cannot verify ${worker} in session_required mode" >&2
    exit 1
  fi
  local session_token="${SESSION_TOKEN_FOR_VERIFY:-${SESSION_TOKEN_FOR_NORMALIZE:-}}"
  local -a headers=(
    -H "Authorization: Bearer ${hub_token}"
    -H "Content-Type: application/json"
    -H "Accept: application/json, text/event-stream"
  )
  if [[ -n "$session_token" ]]; then
    headers+=(-H "X-MCP-Session-Token: ${session_token}")
  fi

  echo "===== VERIFY ${worker} ====="
  curl_with_url "$health_url" -sS | jq .

  curl_with_url "$mcp_url" -sS -X POST \
    "${headers[@]}" \
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
    "${headers[@]}" \
    -d '{
      "jsonrpc":"2.0",
      "id":"phase-a-search",
      "method":"tools/call",
      "params":{
        "name":"hub_search_proxy_tools",
        "arguments":{
          "serverName":"webflow-template-review-mcp",
          "limit":30
        }
      }
    }' | jq .
}

require_cmd pnpm
require_cmd jq
require_cmd curl
INFISICAL_INCLUDE_IMPORTS="$(normalize_bool_or_fail "$INFISICAL_INCLUDE_IMPORTS")"
SKIP_MISSING_REVIEWER_SECRETS="$(normalize_bool_or_fail "$SKIP_MISSING_REVIEWER_SECRETS")"

# Prefer the workers-scoped API token when Infisical exposes both.
if [[ -n "${CLOUDFLARE_WORKERS_API_TOKEN:-}" ]]; then
  export CLOUDFLARE_API_TOKEN="$CLOUDFLARE_WORKERS_API_TOKEN"
fi

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

echo "webflow reviewer hub action complete: ${ACTION}"
