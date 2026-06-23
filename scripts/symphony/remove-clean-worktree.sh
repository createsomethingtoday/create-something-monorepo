#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="${SYMPHONY_REPO_ROOT:-$(cd "${SCRIPT_DIR}/../.." && pwd -P)}"
WORKSPACE_PATH="${1:-$(pwd)}"

if [[ ! -d "${WORKSPACE_PATH}" ]]; then
  exit 0
fi

WORKSPACE_PATH="$(cd "${WORKSPACE_PATH}" && pwd -P)"

if git -C "${REPO_ROOT}" worktree list --porcelain | grep -Fqx "worktree ${WORKSPACE_PATH}"; then
  if [[ -n "$(git -C "${WORKSPACE_PATH}" status --porcelain)" ]]; then
    echo "Refusing to remove dirty Symphony worktree: ${WORKSPACE_PATH}" >&2
    git -C "${WORKSPACE_PATH}" status --short >&2
    exit 1
  fi
  git -C "${REPO_ROOT}" worktree remove "${WORKSPACE_PATH}"
  git -C "${REPO_ROOT}" worktree prune || true
fi
