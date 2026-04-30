#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXPECTED_NODE="v$(tr -d '[:space:]' < "${ROOT_DIR}/.nvmrc")"
EXPECTED_PNPM="$(
  awk -F'"' '/"packageManager"[[:space:]]*:/ { print $4; exit }' "${ROOT_DIR}/package.json" \
    | sed -E 's/^pnpm@//'
)"

cd "${ROOT_DIR}"

print_help() {
  cat <<EOF
Usage: ./scripts/bootstrap-worktree.sh

Bootstraps a repo worktree with the pinned Node/pnpm runtime and workspace
dependencies so local tooling such as pnpm exec tsc and pnpm exec tsx are
available.

If the host runtime already matches ${EXPECTED_NODE} / pnpm ${EXPECTED_PNPM},
this calls ./.ona/scripts/bootstrap.sh directly.

If the host runtime does not match, this falls back to
./scripts/ona-bootstrap-local.sh ./.ona/scripts/bootstrap.sh
to use the repo-cached toolchain without changing your global Node install.
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  print_help
  exit 0
fi

if [[ -z "${EXPECTED_PNPM}" ]]; then
  echo "Unable to determine the repo-pinned pnpm version from package.json." >&2
  exit 1
fi

actual_node="$(node -v 2>/dev/null || true)"
actual_pnpm="$(pnpm -v 2>/dev/null || true)"

if [[ "${actual_node}" == "${EXPECTED_NODE}" && "${actual_pnpm}" == "${EXPECTED_PNPM}" ]]; then
  exec ./.ona/scripts/bootstrap.sh
fi

exec ./scripts/ona-bootstrap-local.sh ./.ona/scripts/bootstrap.sh
