#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HUB_DIR="$ROOT_DIR/packages/cs-mcp-hub-remote"
TEAM_CONFIG="$HUB_DIR/wrangler.team-hubs.toml"

LEGACY_TEAM_WORKERS=(
  "cs-hub-lainy-legacy"
  "cs-hub-danny-legacy"
  "cs-hub-august-legacy"
  "cs-hub-filip-legacy"
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

account_id_for_legacy_worker() {
  case "$1" in
    "cs-hub-lainy-legacy") echo "acct_lainy" ;;
    "cs-hub-danny-legacy") echo "acct_danny" ;;
    "cs-hub-august-legacy") echo "acct_august" ;;
    "cs-hub-filip-legacy") echo "acct_fillip" ;;
    "cs-hub-leah-legacy") echo "acct_leah" ;;
    "cs-hub-mj-legacy") echo "acct_mj" ;;
    *)
      return 1
      ;;
  esac
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

for worker in "${LEGACY_TEAM_WORKERS[@]}"; do
  echo "===== DEPLOY ${worker} ====="
  account_id="$(account_id_for_legacy_worker "$worker")"
  enabled_servers="$(enabled_servers_for_legacy_worker "$worker")"

  pnpm exec wrangler deploy \
    --config "$TEAM_CONFIG" \
    --name "$worker" \
    --var "HUB_INSTANCE_ID:${worker}" \
    --var "HUB_ACCOUNT_ID:${account_id}" \
    --var "HUB_ENABLED_BUNDLES:[]" \
    --var "HUB_ENABLED_SERVERS:${enabled_servers}" \
    --var "HUB_DISABLED_SERVERS:[]" \
    --var "HUB_IDENTITY_MODE:compat" \
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
