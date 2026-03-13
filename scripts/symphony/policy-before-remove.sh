#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
WORKSPACE_PATH="$(pwd)"

if git -C "${REPO_ROOT}" worktree list --porcelain | grep -Fq "worktree ${WORKSPACE_PATH}"; then
  git -C "${REPO_ROOT}" worktree remove --force "${WORKSPACE_PATH}" || true
  git -C "${REPO_ROOT}" worktree prune || true
fi
