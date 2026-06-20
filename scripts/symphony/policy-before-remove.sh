#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
WORKSPACE_PATH="$(pwd)"

if git -C "${REPO_ROOT}" worktree list --porcelain | grep -Fq "worktree ${WORKSPACE_PATH}"; then
  if [[ -n "$(git -C "${WORKSPACE_PATH}" status --porcelain)" ]]; then
    echo "Refusing to remove dirty Symphony worktree: ${WORKSPACE_PATH}" >&2
    git -C "${WORKSPACE_PATH}" status --short >&2
    exit 1
  fi
  git -C "${REPO_ROOT}" worktree remove "${WORKSPACE_PATH}"
  git -C "${REPO_ROOT}" worktree prune || true
fi
