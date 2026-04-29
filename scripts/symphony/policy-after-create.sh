#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
WORKSPACE_PATH="$(pwd)"
ISSUE_ID="$(basename "${WORKSPACE_PATH}")"
BRANCH_NAME="codex/${ISSUE_ID}-policy"

if [[ ! -e "${WORKSPACE_PATH}/.git" ]]; then
  git -C "${REPO_ROOT}" worktree prune
  if git -C "${REPO_ROOT}" show-ref --verify --quiet "refs/heads/${BRANCH_NAME}"; then
    git -C "${REPO_ROOT}" worktree add --force "${WORKSPACE_PATH}" "${BRANCH_NAME}"
  else
    git -C "${REPO_ROOT}" worktree add --force -b "${BRANCH_NAME}" "${WORKSPACE_PATH}" HEAD
  fi
fi

if [[ "${WORKSPACE_PATH}" != "${REPO_ROOT}" ]]; then
  cd "${WORKSPACE_PATH}"
fi

bash ./scripts/bootstrap-worktree.sh
