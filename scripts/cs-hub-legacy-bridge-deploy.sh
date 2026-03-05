#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HUB_DIR="$ROOT_DIR/packages/cs-mcp-hub-remote"
TEAM_CONFIG="$HUB_DIR/wrangler.team-hubs.toml"

LEGACY_TEAM_WORKERS=(
  "cs-hub-lainy-legacy"
  "cs-hub-danny-legacy"
  "cs-hub-august-legacy"
  "cs-hub-fillip-legacy"
  "cs-hub-leah-legacy"
  "cs-hub-mj-legacy"
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
LEGACY_SUNSET_AT="${HUB_LEGACY_SUNSET_AT:-2026-06-30T23:59:59Z}"
LEGACY_DISCOVERY_MODE="${HUB_LEGACY_DISCOVERY_MODE:-compact}"
LEGACY_TRUST_CLIENT_ACCOUNT_HEADERS_DEFAULT="${
  HUB_LEGACY_TRUST_CLIENT_ACCOUNT_HEADERS_DEFAULT:-${HUB_COMPAT_TRUST_CLIENT_ACCOUNT_HEADERS:-false}
}"

normalize_boolean_or_fail() {
  local label="$1"
  local raw="$2"
  local lowered
  lowered="$(echo "$raw" | tr '[:upper:]' '[:lower:]')"
  case "$lowered" in
    "true"|"false")
      echo "$lowered"
      ;;
    *)
      echo "invalid ${label}=${raw}; expected true|false" >&2
      return 1
      ;;
  esac
}

legacy_trust_headers_override_env_for_worker() {
  case "$1" in
    "cs-hub-lainy-legacy") echo "CS_HUB_LAINY_LEGACY_TRUST_CLIENT_ACCOUNT_HEADERS" ;;
    "cs-hub-danny-legacy") echo "CS_HUB_DANNY_LEGACY_TRUST_CLIENT_ACCOUNT_HEADERS" ;;
    "cs-hub-august-legacy") echo "CS_HUB_AUGUST_LEGACY_TRUST_CLIENT_ACCOUNT_HEADERS" ;;
    "cs-hub-fillip-legacy"|"cs-hub-filip-legacy") echo "CS_HUB_FILLIP_LEGACY_TRUST_CLIENT_ACCOUNT_HEADERS" ;;
    "cs-hub-leah-legacy") echo "CS_HUB_LEAH_LEGACY_TRUST_CLIENT_ACCOUNT_HEADERS" ;;
    "cs-hub-mj-legacy") echo "CS_HUB_MJ_LEGACY_TRUST_CLIENT_ACCOUNT_HEADERS" ;;
    *)
      return 1
      ;;
  esac
}

trust_headers_for_legacy_worker() {
  local worker="$1"
  local override_var_name
  override_var_name="$(legacy_trust_headers_override_env_for_worker "$worker")"
  local override_value="${!override_var_name:-}"
  if [[ -z "$override_value" && ( "$worker" == "cs-hub-fillip-legacy" || "$worker" == "cs-hub-filip-legacy" ) ]]; then
    override_var_name="CS_HUB_FILIP_LEGACY_TRUST_CLIENT_ACCOUNT_HEADERS"
    override_value="${!override_var_name:-}"
  fi
  if [[ -n "$override_value" ]]; then
    normalize_boolean_or_fail "$override_var_name" "$override_value"
    return
  fi
  normalize_boolean_or_fail "HUB_LEGACY_TRUST_CLIENT_ACCOUNT_HEADERS_DEFAULT" "$LEGACY_TRUST_CLIENT_ACCOUNT_HEADERS_DEFAULT"
}

account_id_for_legacy_worker() {
  case "$1" in
    "cs-hub-lainy-legacy") echo "acct_lainy" ;;
    "cs-hub-danny-legacy") echo "acct_danny" ;;
    "cs-hub-august-legacy") echo "acct_august" ;;
    "cs-hub-fillip-legacy"|"cs-hub-filip-legacy") echo "acct_fillip" ;;
    "cs-hub-leah-legacy") echo "acct_leah" ;;
    "cs-hub-mj-legacy") echo "acct_mj" ;;
    *)
      return 1
      ;;
  esac
}

resolve_legacy_deploy_worker_name() {
  local worker="$1"
  if [[ "$worker" != "cs-hub-fillip-legacy" ]]; then
    echo "$worker"
    return 0
  fi
  if pnpm exec wrangler secret list --name "cs-hub-fillip-legacy" >/dev/null 2>&1; then
    echo "cs-hub-fillip-legacy"
    return 0
  fi
  if pnpm exec wrangler secret list --name "cs-hub-filip-legacy" >/dev/null 2>&1; then
    echo "cs-hub-filip-legacy"
    return 0
  fi
  echo "cs-hub-fillip-legacy"
}

enabled_servers_for_legacy_worker() {
  case "$1" in
    "cs-hub-mj-legacy") echo "${SHARED_AUTH_SERVERS_CSV},meetings" ;;
    *) echo "${SHARED_AUTH_SERVERS_CSV}" ;;
  esac
}

cd "$HUB_DIR"

echo "Deploying legacy bridge hubs in compat mode..."
echo "legacy_sunset_at=${LEGACY_SUNSET_AT}"
echo "legacy_trust_client_account_headers_default=$(
  normalize_boolean_or_fail "HUB_LEGACY_TRUST_CLIENT_ACCOUNT_HEADERS_DEFAULT" "$LEGACY_TRUST_CLIENT_ACCOUNT_HEADERS_DEFAULT"
)"

for worker in "${LEGACY_TEAM_WORKERS[@]}"; do
  deploy_worker="$(resolve_legacy_deploy_worker_name "$worker")"
  echo "===== DEPLOY ${worker} ====="
  if [[ "$deploy_worker" != "$worker" ]]; then
    echo "deploy_target=${deploy_worker} (legacy alias)"
  fi
  account_id="$(account_id_for_legacy_worker "$worker")"
  enabled_servers="$(enabled_servers_for_legacy_worker "$worker")"
  trust_headers="$(trust_headers_for_legacy_worker "$worker")"
  echo "compat_trust_client_account_headers=${trust_headers}"

  pnpm exec wrangler deploy \
    --config "$TEAM_CONFIG" \
    --name "$deploy_worker" \
    --var "HUB_INSTANCE_ID:${deploy_worker}" \
    --var "HUB_ACCOUNT_ID:${account_id}" \
    --var "HUB_ENABLED_BUNDLES:[]" \
    --var "HUB_ENABLED_SERVERS:${enabled_servers}" \
    --var "HUB_DISABLED_SERVERS:[]" \
    --var "HUB_IDENTITY_MODE:compat" \
    --var "HUB_COMPAT_TRUST_CLIENT_ACCOUNT_HEADERS:${trust_headers}" \
    --var "HUB_DISCOVERY_MODE:${LEGACY_DISCOVERY_MODE}" \
    --var "HUB_DISCOVERY_SHARED_PACK:shared-auth-core" \
    --var "HUB_CONNECT_TIMEOUT_MS:10000" \
    --var "HUB_LIST_TOOLS_TIMEOUT_MS:15000" \
    --var "HUB_CONNECT_CONCURRENCY:4" \
    --var "HUB_LEGACY_BRIDGE_ENABLED:true" \
    --var "HUB_LEGACY_SUNSET_AT:${LEGACY_SUNSET_AT}"

  echo
done

echo "Legacy bridge deploy complete."
