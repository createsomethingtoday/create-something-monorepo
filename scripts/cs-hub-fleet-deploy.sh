#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HUB_DIR="$ROOT_DIR/packages/cs-mcp-hub-remote"
TEAM_CONFIG="$HUB_DIR/wrangler.team-hubs.toml"

TEAM_WORKERS=(
  "cs-hub-lainy"
  "cs-hub-danny"
  "cs-hub-august"
  "cs-hub-c3denver"
  "cs-hub-aaron-outerfields"
  "cs-hub-andre-outerfields"
  "cs-hub-fillip"
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
OUTERFIELDS_CLICKUP_SERVERS=(
  "${SHARED_AUTH_SERVERS[@]}"
  "composio-toolkit-clickup"
)

join_by_comma() {
  local IFS=','
  echo "$*"
}

SHARED_AUTH_SERVERS_CSV="$(join_by_comma "${SHARED_AUTH_SERVERS[@]}")"
OUTERFIELDS_CLICKUP_SERVERS_CSV="$(join_by_comma "${OUTERFIELDS_CLICKUP_SERVERS[@]}")"
DANNY_SERVERS_CSV="${SHARED_AUTH_SERVERS_CSV},halfdozen-dm-mcp,halfdozen-operator-notion-mcp"
MJ_SERVERS_CSV="composio-toolkit-airtable,${SHARED_AUTH_SERVERS_CSV},composio-toolkit-exa,meetings,webflow-template-review-mcp"
C3DENVER_SERVERS_CSV="composio-toolkit-airtable,composio-toolkit-gmail,composio-toolkit-notion"
CORE_BUNDLES_CSV="core"
CORE_SERVERS_CSV="${SHARED_AUTH_SERVERS_CSV}"
SESSION_RESOLVE_URL="${HUB_SESSION_RESOLVE_URL:-https://id.createsomething.space/v1/mcp/sessions/resolve}"
SESSION_TOKEN_FOR_NORMALIZE="${MCP_SESSION_TOKEN:-}"
COMPAT_TRUST_CLIENT_ACCOUNT_HEADERS="${HUB_COMPAT_TRUST_CLIENT_ACCOUNT_HEADERS:-false}"
TEAM_HUB_DEPLOY_IDENTITY_MODE="${TEAM_HUB_DEPLOY_IDENTITY_MODE:-${HUB_DEPLOY_IDENTITY_MODE:-compat}}"
CORE_HUB_DEPLOY_IDENTITY_MODE="${CORE_HUB_DEPLOY_IDENTITY_MODE:-session_required}"
COMPAT_TRUST_CLIENT_ACCOUNT_HEADERS="$(
  printf '%s' "$COMPAT_TRUST_CLIENT_ACCOUNT_HEADERS" | tr '[:upper:]' '[:lower:]'
)"
TEAM_HUB_DEPLOY_IDENTITY_MODE="$(
  printf '%s' "$TEAM_HUB_DEPLOY_IDENTITY_MODE" | tr '[:upper:]' '[:lower:]'
)"
CORE_HUB_DEPLOY_IDENTITY_MODE="$(
  printf '%s' "$CORE_HUB_DEPLOY_IDENTITY_MODE" | tr '[:upper:]' '[:lower:]'
)"

case "${COMPAT_TRUST_CLIENT_ACCOUNT_HEADERS}" in
  "true"|"false")
    ;;
  *)
    echo "invalid HUB_COMPAT_TRUST_CLIENT_ACCOUNT_HEADERS=${COMPAT_TRUST_CLIENT_ACCOUNT_HEADERS}; expected true|false" >&2
    exit 1
    ;;
esac

case "${TEAM_HUB_DEPLOY_IDENTITY_MODE}" in
  "session_required"|"compat")
    ;;
  *)
    echo "invalid TEAM_HUB_DEPLOY_IDENTITY_MODE=${TEAM_HUB_DEPLOY_IDENTITY_MODE}; expected session_required|compat" >&2
    exit 1
    ;;
esac

case "${CORE_HUB_DEPLOY_IDENTITY_MODE}" in
  "session_required"|"compat")
    ;;
  *)
    echo "invalid CORE_HUB_DEPLOY_IDENTITY_MODE=${CORE_HUB_DEPLOY_IDENTITY_MODE}; expected session_required|compat" >&2
    exit 1
    ;;
esac

account_id_for_worker() {
  case "$1" in
    "cs-hub-lainy") echo "acct_lainy" ;;
    "cs-hub-danny") echo "acct_danny" ;;
    "cs-hub-august") echo "acct_august" ;;
    "cs-hub-c3denver") echo "acct_c3_denver" ;;
    "cs-hub-aaron-outerfields") echo "acct_aaron_outerfields" ;;
    "cs-hub-andre-outerfields") echo "acct_andre_outerfields" ;;
    "cs-hub-fillip"|"cs-hub-filip") echo "acct_fillip" ;;
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
    "cs-hub-c3denver") echo "https://c3denver.mcp.createsomething.agency/mcp" ;;
    "cs-hub-aaron-outerfields") echo "https://aaron-outerfields.mcp.createsomething.agency/mcp" ;;
    "cs-hub-andre-outerfields") echo "https://andre-outerfields.mcp.createsomething.agency/mcp" ;;
    "cs-hub-fillip"|"cs-hub-filip") echo "https://fillip.mcp.createsomething.agency/mcp" ;;
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
    "cs-hub-c3denver") echo "CS_HUB_C3DENVER_API_TOKEN" ;;
    "cs-hub-aaron-outerfields") echo "CS_HUB_AARON_OUTERFIELDS_API_TOKEN" ;;
    "cs-hub-andre-outerfields") echo "CS_HUB_ANDRE_OUTERFIELDS_API_TOKEN" ;;
    "cs-hub-fillip"|"cs-hub-filip") echo "CS_HUB_FILLIP_API_TOKEN" ;;
    "cs-hub-leah") echo "CS_HUB_LEAH_API_TOKEN" ;;
    "cs-hub-mj") echo "CS_HUB_MJ_API_TOKEN" ;;
    "cs-mcp-hub-remote") echo "CS_MCP_HUB_REMOTE_API_TOKEN" ;;
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
  if [[ -z "$token" && ( "$worker" == "cs-hub-fillip" || "$worker" == "cs-hub-filip" ) ]]; then
    token="${CS_HUB_FILIP_API_TOKEN:-}"
  fi
  if [[ -z "$token" ]]; then
    token="${HUB_API_TOKEN:-}"
  fi
  echo "$token"
}

resolve_deploy_worker_name() {
  local worker="$1"
  if [[ "$worker" != "cs-hub-fillip" ]]; then
    echo "$worker"
    return 0
  fi
  if pnpm exec wrangler secret list --name "cs-hub-fillip" >/dev/null 2>&1; then
    echo "cs-hub-fillip"
    return 0
  fi
  if pnpm exec wrangler secret list --name "cs-hub-filip" >/dev/null 2>&1; then
    echo "cs-hub-filip"
    return 0
  fi
  echo "cs-hub-fillip"
}

target_server_csv_for_worker() {
  case "$1" in
    "cs-mcp-hub-remote") echo "$CORE_SERVERS_CSV" ;;
    "cs-hub-c3denver") echo "$C3DENVER_SERVERS_CSV" ;;
    "cs-hub-danny") echo "$DANNY_SERVERS_CSV" ;;
    "cs-hub-aaron-outerfields"|"cs-hub-andre-outerfields") echo "$OUTERFIELDS_CLICKUP_SERVERS_CSV" ;;
    "cs-hub-mj") echo "$MJ_SERVERS_CSV" ;;
    *) echo "$SHARED_AUTH_SERVERS_CSV" ;;
  esac
}

target_bundle_csv_for_worker() {
  case "$1" in
    "cs-mcp-hub-remote") echo "$CORE_BUNDLES_CSV" ;;
    *) echo "" ;;
  esac
}

discovery_shared_pack_for_worker() {
  case "$1" in
    "cs-hub-danny") echo "danny-shared-auth-plus-dm-and-operator-notion" ;;
    "cs-hub-c3denver") echo "c3denver-airtable-gmail-notion" ;;
    "cs-hub-aaron-outerfields"|"cs-hub-andre-outerfields") echo "outerfields-shared-auth-clickup" ;;
    "cs-hub-mj") echo "mj-shared-auth-plus-ops-search-meetings-and-review" ;;
    *) echo "shared-auth-core" ;;
  esac
}

direct_proxy_enabled_for_worker() {
  # Reviewed compatibility carveout:
  # Danny keeps a narrow direct-proxy allowance for operator Notion tooling.
  # Do not widen this beyond the approved prefix, and treat removal as a
  # separate compatibility-tested change rather than routine discovery cleanup.
  case "$1" in
    "cs-hub-danny") echo "true" ;;
    *) echo "false" ;;
  esac
}

direct_proxy_prefixes_for_worker() {
  case "$1" in
    "cs-hub-danny") echo "halfdozen-operator-notion-mcp__" ;;
    *) echo "" ;;
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

write_worker_state_to_kv() {
  local worker="$1"
  local bundle_csv="$2"
  local server_csv="$3"
  local disabled_server_csv="${4:-}"
  local state_key state_payload
  state_key="hub_state_v1::${worker}"
  state_payload="$(
    jq -cn \
      --argjson enabledBundles "$(csv_to_json_array "$bundle_csv")" \
      --argjson enabledServers "$(csv_to_json_array "$server_csv")" \
      --argjson disabledServers "$(csv_to_json_array "$disabled_server_csv")" \
      '{
        enabledBundles: $enabledBundles,
        enabledServers: $enabledServers,
        disabledServers: $disabledServers
      }'
  )"
  pnpm exec wrangler kv key put --binding HUB_STATE_KV --remote --preview false "$state_key" "$state_payload" >/dev/null
  echo "state_kv_sync=ok key=${state_key}"
}

normalize_worker_state() {
  local worker="$1"
  local mcp_url token_var_name token token_help target_servers_csv target_bundles_csv
  mcp_url="$(mcp_url_for_worker "$worker")"
  token_var_name="$(token_env_var_for_worker "$worker")"
  token="$(resolve_worker_token "$worker")"
  token_help="${token_var_name} (or HUB_API_TOKEN)"
  target_servers_csv="$(target_server_csv_for_worker "$worker")"
  target_bundles_csv="$(target_bundle_csv_for_worker "$worker")"

  if [[ -z "$token" ]]; then
    echo "missing API token for state normalization on ${worker} (${token_help})"
    return 1
  fi
  if [[ "$TEAM_HUB_DEPLOY_IDENTITY_MODE" == "session_required" && -z "$SESSION_TOKEN_FOR_NORMALIZE" ]]; then
    echo "missing MCP_SESSION_TOKEN for state normalization on ${worker} (strict identity mode)"
    return 1
  fi

  local set_bundles_json set_servers_json payload response_body status
  set_bundles_json="$(csv_to_json_array "$target_bundles_csv")"
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
  local curl_args=(
    -sS
    -o "$response_body"
    -w "%{http_code}"
    -X POST "$mcp_url"
    -H "Authorization: Bearer ${token}"
    -H "Content-Type: application/json"
    -H "Accept: application/json"
  )
  if [[ -n "$SESSION_TOKEN_FOR_NORMALIZE" ]]; then
    curl_args+=(-H "X-MCP-Session-Token: ${SESSION_TOKEN_FOR_NORMALIZE}")
  fi
  curl_args+=(--data "$payload")

  status="$(
    curl "${curl_args[@]}"
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
echo "team_identity_mode=${TEAM_HUB_DEPLOY_IDENTITY_MODE}"
echo "core_identity_mode=${CORE_HUB_DEPLOY_IDENTITY_MODE}"
echo "compat_trust_client_account_headers=${COMPAT_TRUST_CLIENT_ACCOUNT_HEADERS}"
for worker in "${TEAM_WORKERS[@]}"; do
  deploy_worker="$(resolve_deploy_worker_name "$worker")"
  target_servers_csv="$(target_server_csv_for_worker "$worker")"
  discovery_shared_pack="$(discovery_shared_pack_for_worker "$worker")"
  direct_proxy_enabled="$(direct_proxy_enabled_for_worker "$worker")"
  direct_proxy_prefixes="$(direct_proxy_prefixes_for_worker "$worker")"
  echo "===== DEPLOY ${worker} ====="
  if [[ "$deploy_worker" != "$worker" ]]; then
    echo "deploy_target=${deploy_worker} (legacy alias)"
  fi
  account_id="$(account_id_for_worker "$worker")"
  if [[ "$worker" == "cs-hub-mj" ]]; then
    pnpm exec wrangler deploy \
      --config "$TEAM_CONFIG" \
      --name "$deploy_worker" \
      --var "HUB_INSTANCE_ID:${deploy_worker}" \
      --var "HUB_ACCOUNT_ID:${account_id}" \
      --var "HUB_ENABLED_BUNDLES:[]" \
      --var "HUB_ENABLED_SERVERS:${target_servers_csv}" \
      --var "HUB_DISABLED_SERVERS:outerfields-pcn,create-something,three-tier-framework,playbook,composio-toolkit-webflow,halfdozen-dm-mcp,schedule-mcp,substrate-mcp" \
      --var "HUB_IDENTITY_MODE:${TEAM_HUB_DEPLOY_IDENTITY_MODE}" \
      --var "HUB_COMPAT_TRUST_CLIENT_ACCOUNT_HEADERS:${COMPAT_TRUST_CLIENT_ACCOUNT_HEADERS}" \
      --var "HUB_SESSION_RESOLVE_URL:${SESSION_RESOLVE_URL}" \
      --var "HUB_DISCOVERY_MODE:full" \
      --var "HUB_CONNECT_TIMEOUT_MS:10000" \
      --var "HUB_LIST_TOOLS_TIMEOUT_MS:15000" \
      --var "HUB_CONNECT_CONCURRENCY:4" \
      --var "HUB_ALLOW_DIRECT_PROXY_TOOLS:${direct_proxy_enabled}" \
      --var "HUB_DIRECT_PROXY_ALLOWED_PREFIXES:${direct_proxy_prefixes}" \
      --var "HUB_DISCOVERY_SHARED_PACK:${discovery_shared_pack}"
  else
    pnpm exec wrangler deploy \
      --config "$TEAM_CONFIG" \
      --name "$deploy_worker" \
      --var "HUB_INSTANCE_ID:${deploy_worker}" \
      --var "HUB_ACCOUNT_ID:${account_id}" \
      --var "HUB_ENABLED_BUNDLES:[]" \
      --var "HUB_ENABLED_SERVERS:${target_servers_csv}" \
      --var "HUB_DISABLED_SERVERS:[]" \
      --var "HUB_IDENTITY_MODE:${TEAM_HUB_DEPLOY_IDENTITY_MODE}" \
      --var "HUB_COMPAT_TRUST_CLIENT_ACCOUNT_HEADERS:${COMPAT_TRUST_CLIENT_ACCOUNT_HEADERS}" \
      --var "HUB_SESSION_RESOLVE_URL:${SESSION_RESOLVE_URL}" \
      --var "HUB_DISCOVERY_MODE:compact" \
      --var "HUB_CONNECT_TIMEOUT_MS:10000" \
      --var "HUB_LIST_TOOLS_TIMEOUT_MS:15000" \
      --var "HUB_CONNECT_CONCURRENCY:4" \
      --var "HUB_ALLOW_DIRECT_PROXY_TOOLS:${direct_proxy_enabled}" \
      --var "HUB_DIRECT_PROXY_ALLOWED_PREFIXES:${direct_proxy_prefixes}" \
      --var "HUB_DISCOVERY_SHARED_PACK:${discovery_shared_pack}"
  fi
  echo "----- NORMALIZE STATE ${worker} -----"
  normalize_worker_state "$worker"
  echo
done

echo "Deploying core hub workers..."
for worker in "${CORE_WORKERS[@]}"; do
  target_bundles_csv="$(target_bundle_csv_for_worker "$worker")"
  target_servers_csv="$(target_server_csv_for_worker "$worker")"
  discovery_shared_pack="$(discovery_shared_pack_for_worker "$worker")"
  echo "===== DEPLOY ${worker} ====="
  pnpm exec wrangler deploy \
    --name "$worker" \
    --var "HUB_INSTANCE_ID:${worker}" \
    --var "HUB_IDENTITY_MODE:${CORE_HUB_DEPLOY_IDENTITY_MODE}" \
    --var "HUB_COMPAT_TRUST_CLIENT_ACCOUNT_HEADERS:${COMPAT_TRUST_CLIENT_ACCOUNT_HEADERS}" \
    --var "HUB_SESSION_RESOLVE_URL:${SESSION_RESOLVE_URL}" \
    --var "HUB_ENABLED_BUNDLES:${target_bundles_csv}" \
    --var "HUB_ENABLED_SERVERS:${target_servers_csv}" \
    --var "HUB_DISABLED_SERVERS:[]" \
    --var "HUB_DISCOVERY_MODE:compact" \
    --var "HUB_DISCOVERY_SHARED_PACK:${discovery_shared_pack}"
  echo "----- SYNC KV STATE ${worker} -----"
  write_worker_state_to_kv "$worker" "$target_bundles_csv" "$target_servers_csv" "[]"
  echo
done

echo "Hub fleet deploy complete."
