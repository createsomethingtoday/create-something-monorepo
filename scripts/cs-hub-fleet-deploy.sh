#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HUB_DIR="$ROOT_DIR/packages/cs-mcp-hub-remote"
TEAM_CONFIG="$HUB_DIR/wrangler.team-hubs.toml"

TEAM_WORKERS=(
  "cs-hub-lainy"
  "cs-hub-danny"
  "cs-hub-august"
  "cs-hub-filip"
  "cs-hub-leah"
  "cs-hub-mj"
)

CORE_WORKERS=(
  "cs-mcp-hub-remote"
)

SHARED_AUTH_SERVERS=(
  "composio-toolkit-dropbox"
  "composio-toolkit-gmail"
  "composio-toolkit-youtube"
  "composio-toolkit-googlesheets"
  "composio-toolkit-googledrive"
  "composio-toolkit-zoom"
  "composio-toolkit-slack"
  "composio-toolkit-quickbooks"
  "composio-toolkit-linkedin"
  "composio-toolkit-notion"
)

join_by_comma() {
  local IFS=','
  echo "$*"
}

SHARED_AUTH_SERVERS_CSV="$(join_by_comma "${SHARED_AUTH_SERVERS[@]}")"
MJ_SERVERS_CSV="${SHARED_AUTH_SERVERS_CSV},meetings"
SESSION_RESOLVE_URL="${HUB_SESSION_RESOLVE_URL:-https://id.createsomething.space/v1/mcp/sessions/resolve}"
SESSION_TOKEN_FOR_NORMALIZE="${MCP_SESSION_TOKEN:-}"

account_id_for_worker() {
  case "$1" in
    "cs-hub-lainy") echo "acct_lainy" ;;
    "cs-hub-danny") echo "acct_danny" ;;
    "cs-hub-august") echo "acct_august" ;;
    "cs-hub-filip") echo "acct_fillip" ;;
    "cs-hub-leah") echo "acct_leah" ;;
    "cs-hub-mj") echo "acct_mj" ;;
    *)
      return 1
      ;;
  esac
}

mcp_url_for_worker() {
  case "$1" in
    "cs-hub-lainy") echo "https://lainy.mcp.createsomething.agency/mcp" ;;
    "cs-hub-danny") echo "https://danny.mcp.createsomething.agency/mcp" ;;
    "cs-hub-august") echo "https://august.mcp.createsomething.agency/mcp" ;;
    "cs-hub-filip") echo "https://fillip.mcp.createsomething.agency/mcp" ;;
    "cs-hub-leah") echo "https://leah.mcp.createsomething.agency/mcp" ;;
    "cs-hub-mj") echo "https://mj.mcp.createsomething.agency/mcp" ;;
    *)
      return 1
      ;;
  esac
}

token_env_var_for_worker() {
  case "$1" in
    "cs-hub-lainy") echo "CS_HUB_LAINY_API_TOKEN" ;;
    "cs-hub-danny") echo "CS_HUB_DANNY_API_TOKEN" ;;
    "cs-hub-august") echo "CS_HUB_AUGUST_API_TOKEN" ;;
    "cs-hub-filip") echo "CS_HUB_FILLIP_API_TOKEN" ;;
    "cs-hub-leah") echo "CS_HUB_LEAH_API_TOKEN" ;;
    "cs-hub-mj") echo "CS_HUB_MJ_API_TOKEN" ;;
    *)
      return 1
      ;;
  esac
}

resolve_worker_token() {
  local worker="$1"
  local token_var_name
  token_var_name="$(token_env_var_for_worker "$worker")"
  local token="${!token_var_name:-}"
  if [[ -z "$token" && "$worker" == "cs-hub-filip" ]]; then
    token="${CS_HUB_FILIP_API_TOKEN:-}"
  fi
  if [[ -z "$token" ]]; then
    token="${HUB_API_TOKEN:-}"
  fi
  echo "$token"
}

target_server_csv_for_worker() {
  case "$1" in
    "cs-hub-mj") echo "$MJ_SERVERS_CSV" ;;
    *) echo "$SHARED_AUTH_SERVERS_CSV" ;;
  esac
}

csv_to_json_array() {
  local csv="$1"
  if [[ -z "${csv// }" ]]; then
    echo '[]'
    return
  fi
  printf '%s' "$csv" | tr ',' '\n' | sed '/^\s*$/d' | jq -R . | jq -s .
}

normalize_worker_state() {
  local worker="$1"
  local mcp_url token_var_name token token_help target_servers_csv
  mcp_url="$(mcp_url_for_worker "$worker")"
  token_var_name="$(token_env_var_for_worker "$worker")"
  token="$(resolve_worker_token "$worker")"
  token_help="${token_var_name} (or HUB_API_TOKEN)"
  target_servers_csv="$(target_server_csv_for_worker "$worker")"

  if [[ -z "$token" ]]; then
    echo "missing API token for state normalization on ${worker} (${token_help})"
    return 1
  fi
  if [[ -z "$SESSION_TOKEN_FOR_NORMALIZE" ]]; then
    echo "missing MCP_SESSION_TOKEN for state normalization on ${worker} (strict identity mode)"
    return 1
  fi

  local set_bundles_json set_servers_json payload response_body status
  set_bundles_json='[]'
  set_servers_json="$(csv_to_json_array "$target_servers_csv")"
  payload="$(
    jq -cn \
      --argjson setBundles "$set_bundles_json" \
      --argjson setServers "$set_servers_json" \
      '{
        jsonrpc:"2.0",
        id:"fleet-deploy-normalize",
        method:"tools/call",
        params:{
          name:"hub_update_state",
          arguments:{
            setBundles:$setBundles,
            setServers:$setServers
          }
        }
      }'
  )"

  response_body="$(mktemp)"
  status="$(
    curl -sS -o "$response_body" -w "%{http_code}" -X POST "$mcp_url" \
      -H "Authorization: Bearer ${token}" \
      -H "X-MCP-Session-Token: ${SESSION_TOKEN_FOR_NORMALIZE}" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json" \
      --data "$payload"
  )"

  if [[ "$status" != "200" ]]; then
    echo "state normalization failed for ${worker} (status=${status})"
    cat "$response_body"
    rm -f "$response_body"
    return 1
  fi

  if ! jq -e '.error == null and .result != null' "$response_body" >/dev/null; then
    echo "state normalization returned JSON-RPC error for ${worker}"
    cat "$response_body"
    rm -f "$response_body"
    return 1
  fi

  echo "state_normalization=ok"
  rm -f "$response_body"
}

cd "$HUB_DIR"

echo "Deploying team hub workers with hardened routing config..."
for worker in "${TEAM_WORKERS[@]}"; do
  echo "===== DEPLOY ${worker} ====="
  account_id="$(account_id_for_worker "$worker")"
  if [[ "$worker" == "cs-hub-mj" ]]; then
    pnpm exec wrangler deploy \
      --config "$TEAM_CONFIG" \
      --name "$worker" \
      --var "HUB_INSTANCE_ID:${worker}" \
      --var "HUB_ACCOUNT_ID:${account_id}" \
      --var "HUB_ENABLED_BUNDLES:[]" \
      --var "HUB_ENABLED_SERVERS:${MJ_SERVERS_CSV}" \
      --var "HUB_DISABLED_SERVERS:outerfields-pcn,create-something,three-tier-framework,playbook,composio-toolkit-airtable,composio-toolkit-webflow,halfdozen-dm-mcp,loom-mcp,schedule-mcp,substrate-mcp" \
      --var "HUB_IDENTITY_MODE:session_required" \
      --var "HUB_SESSION_RESOLVE_URL:${SESSION_RESOLVE_URL}" \
      --var "HUB_DISCOVERY_MODE:full" \
      --var "HUB_CONNECT_TIMEOUT_MS:10000" \
      --var "HUB_LIST_TOOLS_TIMEOUT_MS:15000" \
      --var "HUB_CONNECT_CONCURRENCY:4" \
      --var "HUB_DISCOVERY_SHARED_PACK:shared-auth-core"
  else
    pnpm exec wrangler deploy \
      --config "$TEAM_CONFIG" \
      --name "$worker" \
      --var "HUB_INSTANCE_ID:${worker}" \
      --var "HUB_ACCOUNT_ID:${account_id}" \
      --var "HUB_ENABLED_BUNDLES:[]" \
      --var "HUB_ENABLED_SERVERS:${SHARED_AUTH_SERVERS_CSV}" \
      --var "HUB_DISABLED_SERVERS:[]" \
      --var "HUB_IDENTITY_MODE:session_required" \
      --var "HUB_SESSION_RESOLVE_URL:${SESSION_RESOLVE_URL}" \
      --var "HUB_DISCOVERY_MODE:compact" \
      --var "HUB_CONNECT_TIMEOUT_MS:10000" \
      --var "HUB_LIST_TOOLS_TIMEOUT_MS:15000" \
      --var "HUB_CONNECT_CONCURRENCY:4" \
      --var "HUB_DISCOVERY_SHARED_PACK:shared-auth-core"
  fi
  echo "----- NORMALIZE STATE ${worker} -----"
  normalize_worker_state "$worker"
  echo
done

echo "Deploying core hub workers..."
for worker in "${CORE_WORKERS[@]}"; do
  echo "===== DEPLOY ${worker} ====="
  pnpm exec wrangler deploy \
    --name "$worker" \
    --var "HUB_INSTANCE_ID:${worker}" \
    --var "HUB_IDENTITY_MODE:session_required" \
    --var "HUB_SESSION_RESOLVE_URL:${SESSION_RESOLVE_URL}"
  echo
done

echo "Hub fleet deploy complete."
