#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EXPECTED_NODE="v22.21.1"
EXPECTED_PNPM="9.15.0"
LOCKFILE_PATH="pnpm-lock.yaml"
LOCKFILE_STAMP_PATH="node_modules/.pnpm-lock.sha256"
STRICT_OPTIONAL_TOOLS="${ONA_BOOTSTRAP_REQUIRE_OPTIONAL_TOOLS:-0}"

export PATH="/usr/local/bin:/usr/local/sbin:${PATH}"
export GROUND_MCP_SKIP_BINARY_INSTALL="${GROUND_MCP_SKIP_BINARY_INSTALL:-1}"
export LOOM_MCP_SKIP_BINARY_INSTALL="${LOOM_MCP_SKIP_BINARY_INSTALL:-1}"
hash -r

cd "$ROOT_DIR"

hash_file() {
  local target_path="$1"

  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$target_path" | awk '{print $1}'
    return
  fi

  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$target_path" | awk '{print $1}'
    return
  fi

  if command -v openssl >/dev/null 2>&1; then
    openssl dgst -sha256 "$target_path" | awk '{print $NF}'
    return
  fi

  echo "Missing a SHA-256 tool (shasum, sha256sum, or openssl)." >&2
  exit 1
}

print_runtime_alignment_help() {
  cat >&2 <<'EOF'
Use the repo-pinned runtime before rerunning bootstrap:
  - Preferred: open the repository through the dev container defined in .devcontainer/devcontainer.json
  - Fast local fallback: run ./scripts/ona-bootstrap-local.sh
  - Local fallback: install Node 22.21.1 from .nvmrc, then run corepack prepare "pnpm@9.15.0" --activate
See docs/guides/ONA_CORE_ROLLOUT.md for the local OrbStack/dev container path.
EOF
}

warn_or_require_optional_commands() {
  local missing_commands=()

  for optional_cmd in gh infisical jq wrangler; do
    if ! command -v "$optional_cmd" >/dev/null 2>&1; then
      missing_commands+=("$optional_cmd")
    fi
  done

  if [[ "${#missing_commands[@]}" -eq 0 ]]; then
    return
  fi

  local message
  message="Optional development/deploy commands not found: ${missing_commands[*]}"

  if [[ "$STRICT_OPTIONAL_TOOLS" == "1" ]]; then
    echo "$message" >&2
    echo "Set ONA_BOOTSTRAP_REQUIRE_OPTIONAL_TOOLS=0 to continue without them." >&2
    exit 1
  fi

  echo "$message" >&2
  echo "Bootstrap will continue. Manual tasks that rely on those commands will stay unavailable until they are installed." >&2
}

should_install_dependencies() {
  local current_lock_hash="$1"

  if [[ ! -f node_modules/.modules.yaml ]]; then
    echo "missing node_modules metadata"
    return
  fi

  if [[ ! -d node_modules/.pnpm ]]; then
    echo "missing node_modules/.pnpm store"
    return
  fi

  if [[ ! -f "$LOCKFILE_STAMP_PATH" ]]; then
    echo "missing lockfile stamp"
    return
  fi

  local recorded_lock_hash
  recorded_lock_hash="$(tr -d '[:space:]' < "$LOCKFILE_STAMP_PATH")"
  if [[ "$recorded_lock_hash" != "$current_lock_hash" ]]; then
    echo "pnpm-lock.yaml changed"
    return
  fi

  return 0
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

warn_or_require_optional_commands

lockfile_hash="$(hash_file "$LOCKFILE_PATH")"
install_reason="$(should_install_dependencies "$lockfile_hash")"

if [[ -n "$install_reason" ]]; then
  echo "Installing workspace dependencies (${install_reason})..."
  pnpm install --frozen-lockfile
  mkdir -p node_modules
  printf '%s\n' "$lockfile_hash" > "$LOCKFILE_STAMP_PATH"
else
  echo "Workspace dependencies already installed and current."
fi

echo "Bootstrap complete for CREATE SOMETHING monorepo."
