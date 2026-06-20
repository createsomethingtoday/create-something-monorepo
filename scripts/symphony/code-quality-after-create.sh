#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
WORKSPACE_PATH="$(pwd)"
ISSUE_ID="$(basename "${WORKSPACE_PATH}")"
BRANCH_NAME="codex/${ISSUE_ID}-code-quality"
BASE_REF="${SYMPHONY_BASE_REF:-origin/main}"

if [[ ! -e "${WORKSPACE_PATH}/.git" ]]; then
  git -C "${REPO_ROOT}" worktree prune
  git -C "${REPO_ROOT}" fetch --quiet origin main
  if git -C "${REPO_ROOT}" show-ref --verify --quiet "refs/heads/${BRANCH_NAME}"; then
    git -C "${REPO_ROOT}" worktree add "${WORKSPACE_PATH}" "${BRANCH_NAME}"
  else
    git -C "${REPO_ROOT}" worktree add -b "${BRANCH_NAME}" "${WORKSPACE_PATH}" "${BASE_REF}"
  fi
fi

if [[ "${WORKSPACE_PATH}" != "${REPO_ROOT}" ]]; then
  cd "${WORKSPACE_PATH}"
fi

bash ./scripts/bootstrap-worktree.sh
