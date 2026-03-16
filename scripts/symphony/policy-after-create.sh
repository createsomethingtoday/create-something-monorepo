#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
WORKSPACE_PATH="$(pwd)"
ISSUE_ID="$(basename "${WORKSPACE_PATH}")"
BRANCH_NAME="codex/${ISSUE_ID}-policy"
source "${SCRIPT_DIR}/worktree-utils.sh"

SYMPHONY_WORKSPACE_MODE="${SYMPHONY_WORKSPACE_MODE:-isolated}"
SYMPHONY_DEPENDENCY_MODE="${SYMPHONY_DEPENDENCY_MODE:-install-if-missing}"

if [[ "${SYMPHONY_WORKSPACE_MODE}" == "lightweight" ]]; then
  symphony_snapshot_selected_paths \
    "${REPO_ROOT}" \
    "${WORKSPACE_PATH}" \
    "AGENTS.md" \
    "package.json" \
    "pnpm-lock.yaml" \
    "pnpm-workspace.yaml" \
    "tsconfig.base.json" \
    "automation/symphony/policy/" \
    "docs/" \
    "scripts/" \
    "config/" \
    "packages/policy-os-engine/" \
    "packages/symphony/"
else
  symphony_add_worktree "${REPO_ROOT}" "${WORKSPACE_PATH}" "${BRANCH_NAME}"
fi

if [[ -d "${REPO_ROOT}/.loom" && ! -e "${WORKSPACE_PATH}/.loom" ]]; then
  ln -s "${REPO_ROOT}/.loom" "${WORKSPACE_PATH}/.loom"
fi

if [[ "${SYMPHONY_DEPENDENCY_MODE}" == "reuse" ]]; then
  if [[ -d "${REPO_ROOT}/node_modules" && ! -e "${WORKSPACE_PATH}/node_modules" ]]; then
    ln -s "${REPO_ROOT}/node_modules" "${WORKSPACE_PATH}/node_modules"
  fi
elif [[ ! -d "${WORKSPACE_PATH}/node_modules" ]]; then
  pnpm install --frozen-lockfile --prefer-offline
fi
