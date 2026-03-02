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
  "cs-hub-c3denver"
)

CORE_WORKERS=(
  "cs-mcp-hub-remote"
)

cd "$HUB_DIR"

echo "Deploying team hub workers with hardened routing config..."
for worker in "${TEAM_WORKERS[@]}"; do
  echo "===== DEPLOY ${worker} ====="
  if [[ "$worker" == "cs-hub-c3denver" ]]; then
    pnpm exec wrangler deploy \
      --name "$worker" \
      --routes "c3denver.mcp.createsomething.agency/*" \
      --var HUB_ACCOUNT_ID:acct_c3_denver \
      --var HUB_DISCOVERY_MODE:compact \
      --var HUB_DISCOVERY_SHARED_PACK:c3-denver-gmail-notion \
      --var HUB_DISCOVERY_DEFAULT_SERVERS:composio-toolkit-gmail,composio-toolkit-notion \
      --var HUB_DISCOVERY_MAX_PROXY_TOOLS:250 \
      --keep-vars
  else
    pnpm exec wrangler deploy --config "$TEAM_CONFIG" --name "$worker"
  fi
  echo
done

echo "Deploying core hub workers..."
for worker in "${CORE_WORKERS[@]}"; do
  echo "===== DEPLOY ${worker} ====="
  pnpm exec wrangler deploy --name "$worker"
  echo
done

echo "Hub fleet deploy complete."
