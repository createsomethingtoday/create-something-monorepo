#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXPECTED_NODE="v22.21.1"
EXPECTED_PNPM="9.15.0"

export PATH="/usr/local/bin:/usr/local/sbin:${PATH}"
export GROUND_MCP_SKIP_BINARY_INSTALL="${GROUND_MCP_SKIP_BINARY_INSTALL:-1}"
export LOOM_MCP_SKIP_BINARY_INSTALL="${LOOM_MCP_SKIP_BINARY_INSTALL:-1}"
hash -r

cd "$ROOT_DIR"

print_runtime_alignment_help() {
  cat >&2 <<'EOF'
Use the repo-pinned runtime before rerunning the dev container post-create step:
  - Preferred: rebuild/reopen the repository with .devcontainer/devcontainer.json so the pinned image is used
  - Local fallback: install Node 22.21.1 from .nvmrc, then run corepack prepare "pnpm@9.15.0" --activate
EOF
}

actual_node="$(node -v)"
if [[ "$actual_node" != "$EXPECTED_NODE" ]]; then
  echo "Expected Node ${EXPECTED_NODE}, found ${actual_node}" >&2
  print_runtime_alignment_help
  exit 1
fi

corepack enable >/dev/null 2>&1 || true
corepack prepare "pnpm@${EXPECTED_PNPM}" --activate >/dev/null

actual_pnpm="$(pnpm -v)"
if [[ "$actual_pnpm" != "$EXPECTED_PNPM" ]]; then
  echo "Expected pnpm ${EXPECTED_PNPM}, found ${actual_pnpm}" >&2
  print_runtime_alignment_help
  exit 1
fi

gh --version >/dev/null
infisical --version >/dev/null
jq --version >/dev/null
wrangler --version >/dev/null

pnpm install --frozen-lockfile
pnpm --filter @create-something/dotfiles install-codex-skills

# Install Pi coding agent for container-based agent sessions
if ! command -v pi >/dev/null 2>&1; then
  echo "Installing Pi coding agent..."
  npm install -g @mariozechner/pi-coding-agent 2>/dev/null || true
fi
