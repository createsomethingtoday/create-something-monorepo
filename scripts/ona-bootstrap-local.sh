#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXPECTED_NODE="22.21.1"
EXPECTED_PNPM="9.15.0"
CACHE_DIR="$ROOT_DIR/.cache"
TOOLCHAIN_DIR="$CACHE_DIR/toolchains"
COREPACK_HOME_DIR="$CACHE_DIR/corepack"
PNPM_SHIM_DIR="$TOOLCHAIN_DIR/pnpm-shims"

require_command() {
  local command_name="$1"

  if command -v "$command_name" >/dev/null 2>&1; then
    return
  fi

  echo "Missing required command: ${command_name}" >&2
  exit 1
}

resolve_node_dist() {
  case "$(uname -s)-$(uname -m)" in
    Darwin-arm64)
      echo "darwin-arm64"
      ;;
    Darwin-x86_64)
      echo "darwin-x64"
      ;;
    Linux-arm64 | Linux-aarch64)
      echo "linux-arm64"
      ;;
    Linux-x86_64)
      echo "linux-x64"
      ;;
    *)
      echo "Unsupported platform: $(uname -s)-$(uname -m)" >&2
      exit 1
      ;;
  esac
}

install_node() {
  local node_dist="$1"
  local node_dir="$TOOLCHAIN_DIR/node-v${EXPECTED_NODE}-${node_dist}"
  local archive_name="node-v${EXPECTED_NODE}-${node_dist}.tar.xz"
  local archive_path="$TOOLCHAIN_DIR/$archive_name"
  local node_url="https://nodejs.org/dist/v${EXPECTED_NODE}/${archive_name}"

  if [[ -x "$node_dir/bin/node" ]]; then
    printf '%s\n' "$node_dir"
    return
  fi

  mkdir -p "$TOOLCHAIN_DIR"

  if [[ ! -f "$archive_path" ]]; then
    echo "Downloading Node v${EXPECTED_NODE} for ${node_dist}..." >&2
    curl -fsSL "$node_url" -o "$archive_path"
  fi

  rm -rf "$node_dir"
  echo "Installing Node v${EXPECTED_NODE} into repo cache..." >&2
  tar -xJf "$archive_path" -C "$TOOLCHAIN_DIR"

  printf '%s\n' "$node_dir"
}

install_pnpm() {
  local node_dir="$1"
  local pnpm_dir="$TOOLCHAIN_DIR/pnpm-${EXPECTED_PNPM}"
  local archive_name="pnpm-${EXPECTED_PNPM}.tgz"
  local archive_path="$TOOLCHAIN_DIR/$archive_name"
  local pnpm_url="https://registry.npmjs.org/pnpm/-/${archive_name}"

  if [[ ! -f "$archive_path" ]]; then
    echo "Downloading pnpm ${EXPECTED_PNPM}..." >&2
    curl -fsSL "$pnpm_url" -o "$archive_path"
  fi

  if [[ ! -f "$pnpm_dir/package/bin/pnpm.cjs" ]]; then
    mkdir -p "$pnpm_dir"
    echo "Installing pnpm ${EXPECTED_PNPM} into repo cache..." >&2
    tar -xzf "$archive_path" -C "$pnpm_dir"
  fi

  mkdir -p "$PNPM_SHIM_DIR"
  cat > "$PNPM_SHIM_DIR/pnpm" <<EOF
#!/usr/bin/env bash
exec "$node_dir/bin/node" "$pnpm_dir/package/bin/pnpm.cjs" "\$@"
EOF
  chmod +x "$PNPM_SHIM_DIR/pnpm"

  printf '%s\n' "$pnpm_dir"
}

require_command curl
require_command tar
require_command xz

cd "$ROOT_DIR"

node_dist="$(resolve_node_dist)"
node_dir="$(install_node "$node_dist")"
install_pnpm "$node_dir" >/dev/null

export PATH="$PNPM_SHIM_DIR:$node_dir/bin:$PATH"
export COREPACK_HOME="$COREPACK_HOME_DIR"
hash -r

actual_node="$(node -v)"
if [[ "$actual_node" != "v${EXPECTED_NODE}" ]]; then
  echo "Expected helper Node v${EXPECTED_NODE}, found ${actual_node}" >&2
  exit 1
fi

actual_pnpm="$(pnpm -v)"
if [[ "$actual_pnpm" != "${EXPECTED_PNPM}" ]]; then
  echo "Expected helper pnpm ${EXPECTED_PNPM}, found ${actual_pnpm}" >&2
  exit 1
fi

if [[ $# -eq 0 ]]; then
  set -- ./.ona/scripts/bootstrap.sh
fi

exec "$@"
