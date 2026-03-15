#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
WORKSPACE_PATH="$(pwd)"
source "${SCRIPT_DIR}/worktree-utils.sh"

if [[ -f "${WORKSPACE_PATH}/.git" ]] && grep -q '/.git/worktrees/' "${WORKSPACE_PATH}/.git" 2>/dev/null; then
  symphony_remove_worktree "${REPO_ROOT}" "${WORKSPACE_PATH}" || true
fi
