#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXPECTED_NODE="v22.21.1"
EXPECTED_PNPM="9.15.0"

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

gh --version >/dev/null
infisical --version >/dev/null
jq --version >/dev/null
wrangler --version >/dev/null

pnpm install --frozen-lockfile
