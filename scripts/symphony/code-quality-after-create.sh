#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
WORKSPACE_PATH="$(pwd)"
ISSUE_ID="$(basename "${WORKSPACE_PATH}")"
BRANCH_NAME="codex/${ISSUE_ID}-code-quality"
source "${SCRIPT_DIR}/worktree-utils.sh"

export SYMPHONY_WORKSPACE_BACKEND="${SYMPHONY_WORKSPACE_BACKEND:-clone}"
if [[ "${SYMPHONY_WORKSPACE_BACKEND}" == "clone" ]]; then
  symphony_clone_workspace_from_archive "${REPO_ROOT}" "${WORKSPACE_PATH}" "${BRANCH_NAME}" HEAD
else
  export SYMPHONY_WORKTREE_CHECKOUT_STRATEGY="${SYMPHONY_WORKTREE_CHECKOUT_STRATEGY:-archive}"
  symphony_add_worktree "${REPO_ROOT}" "${WORKSPACE_PATH}" "${BRANCH_NAME}"
fi

if [[ -d "${REPO_ROOT}/.loom" && ! -e "${WORKSPACE_PATH}/.loom" ]]; then
  ln -s "${REPO_ROOT}/.loom" "${WORKSPACE_PATH}/.loom"
fi

if ! symphony_link_existing_node_modules "${REPO_ROOT}" "${WORKSPACE_PATH}"; then
  pnpm install --frozen-lockfile --prefer-offline
fi
