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

cd "$HUB_DIR"

echo "Deploying team hub workers with hardened routing config..."
for worker in "${TEAM_WORKERS[@]}"; do
  echo "===== DEPLOY ${worker} ====="
  if [[ "$worker" == "cs-hub-mj" ]]; then
    pnpm exec wrangler deploy \
      --config "$TEAM_CONFIG" \
      --name "$worker" \
      --var "HUB_INSTANCE_ID:${worker}" \
      --var "HUB_ENABLED_BUNDLES:agency,core" \
      --var "HUB_ENABLED_SERVERS:${SHARED_AUTH_SERVERS_CSV},outerfields-pcn" \
      --var "HUB_DISABLED_SERVERS:composio-toolkit-airtable,composio-toolkit-webflow,halfdozen-dm-mcp,loom-mcp,schedule-mcp,substrate-mcp" \
      --var "HUB_DISCOVERY_MODE:full" \
      --var "HUB_DISCOVERY_SHARED_PACK:shared-auth-core"
  else
    pnpm exec wrangler deploy \
      --config "$TEAM_CONFIG" \
      --name "$worker" \
      --var "HUB_INSTANCE_ID:${worker}" \
      --var "HUB_ENABLED_BUNDLES:" \
      --var "HUB_ENABLED_SERVERS:${SHARED_AUTH_SERVERS_CSV}" \
      --var "HUB_DISABLED_SERVERS:" \
      --var "HUB_DISCOVERY_MODE:compact" \
      --var "HUB_DISCOVERY_SHARED_PACK:shared-auth-core"
  fi
  echo
done

echo "Deploying core hub workers..."
for worker in "${CORE_WORKERS[@]}"; do
  echo "===== DEPLOY ${worker} ====="
  pnpm exec wrangler deploy --name "$worker" --var "HUB_INSTANCE_ID:${worker}"
  echo
done

echo "Hub fleet deploy complete."
