#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
WORKSPACE_PATH="$(pwd)"
ISSUE_ID="$(basename "${WORKSPACE_PATH}")"
BRANCH_NAME="codex/${ISSUE_ID}-code-quality"
source "${SCRIPT_DIR}/worktree-utils.sh"

symphony_add_worktree "${REPO_ROOT}" "${WORKSPACE_PATH}" "${BRANCH_NAME}"

if [[ -d "${REPO_ROOT}/.loom" && ! -e "${WORKSPACE_PATH}/.loom" ]]; then
  ln -s "${REPO_ROOT}/.loom" "${WORKSPACE_PATH}/.loom"
fi

if [[ ! -d "${WORKSPACE_PATH}/node_modules" ]]; then
  pnpm install --frozen-lockfile --prefer-offline
fi
