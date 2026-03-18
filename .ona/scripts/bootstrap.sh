#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EXPECTED_NODE="v22.21.1"
EXPECTED_PNPM="9.15.0"

export PATH="/usr/local/bin:/usr/local/sbin:${PATH}"
export GROUND_MCP_SKIP_BINARY_INSTALL="${GROUND_MCP_SKIP_BINARY_INSTALL:-1}"
export LOOM_MCP_SKIP_BINARY_INSTALL="${LOOM_MCP_SKIP_BINARY_INSTALL:-1}"
hash -r

cd "$ROOT_DIR"

actual_node="$(node -v)"
if [[ "$actual_node" != "$EXPECTED_NODE" ]]; then
  echo "Expected Node ${EXPECTED_NODE}, found ${actual_node}" >&2
  exit 1
fi

corepack enable >/dev/null 2>&1 || true
corepack prepare "pnpm@${EXPECTED_PNPM}" --activate >/dev/null

actual_pnpm="$(pnpm -v)"
if [[ "$actual_pnpm" != "$EXPECTED_PNPM" ]]; then
  echo "Expected pnpm ${EXPECTED_PNPM}, found ${actual_pnpm}" >&2
  exit 1
fi

for required_cmd in gh infisical jq wrangler; do
  if ! command -v "$required_cmd" >/dev/null 2>&1; then
    echo "Missing required command: ${required_cmd}" >&2
    exit 1
  fi
done

if [[ ! -f node_modules/.modules.yaml ]]; then
  echo "Installing workspace dependencies..."
  pnpm install --frozen-lockfile
else
  echo "Workspace dependencies already installed."
fi

echo "Bootstrap complete for CREATE SOMETHING monorepo."
