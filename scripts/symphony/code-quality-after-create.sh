#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
WORKSPACE_PATH="$(pwd)"
source "${SCRIPT_DIR}/worktree-utils.sh"

export SYMPHONY_WORKSPACE_BACKEND="${SYMPHONY_WORKSPACE_BACKEND:-snapshot}"
export SYMPHONY_CODE_QUALITY_SCOPE="${SYMPHONY_CODE_QUALITY_SCOPE:-full}"
if [[ "${SYMPHONY_WORKSPACE_BACKEND}" == "snapshot" ]]; then
  if [[ "${SYMPHONY_CODE_QUALITY_SCOPE}" == "symphony-live" ]]; then
    symphony_link_selected_paths \
      "${REPO_ROOT}" \
      "${WORKSPACE_PATH}" \
      "AGENTS.md" \
      "package.json" \
      "pnpm-lock.yaml" \
      "pnpm-workspace.yaml" \
      "turbo.json" \
      "tsconfig.base.json" \
      "vitest.workspace.ts" \
      "automation/symphony/" \
      "packages/symphony/" \
      "scripts/loom/" \
      "scripts/symphony/"
  elif [[ "${SYMPHONY_CODE_QUALITY_SCOPE}" == "symphony" ]]; then
    symphony_snapshot_selected_paths \
      "${REPO_ROOT}" \
      "${WORKSPACE_PATH}" \
      "AGENTS.md" \
      "package.json" \
      "pnpm-lock.yaml" \
      "pnpm-workspace.yaml" \
      "turbo.json" \
      "tsconfig.base.json" \
      "vitest.workspace.ts" \
      "automation/symphony/" \
      "packages/symphony/" \
      "scripts/loom/" \
      "scripts/symphony/"
  else
    symphony_snapshot_workspace "${REPO_ROOT}" "${WORKSPACE_PATH}"
  fi
elif [[ "${SYMPHONY_WORKSPACE_BACKEND}" == "clone" ]]; then
  ISSUE_ID="$(basename "${WORKSPACE_PATH}")"
  BRANCH_NAME="codex/${ISSUE_ID}-code-quality"
  symphony_clone_workspace_from_archive "${REPO_ROOT}" "${WORKSPACE_PATH}" "${BRANCH_NAME}" HEAD
else
  ISSUE_ID="$(basename "${WORKSPACE_PATH}")"
  BRANCH_NAME="codex/${ISSUE_ID}-code-quality"
  export SYMPHONY_WORKTREE_CHECKOUT_STRATEGY="${SYMPHONY_WORKTREE_CHECKOUT_STRATEGY:-archive}"
  symphony_add_worktree "${REPO_ROOT}" "${WORKSPACE_PATH}" "${BRANCH_NAME}"
fi

if [[ -d "${REPO_ROOT}/.loom" && ! -e "${WORKSPACE_PATH}/.loom" ]]; then
  ln -s "${REPO_ROOT}/.loom" "${WORKSPACE_PATH}/.loom"
fi

if [[ "${SYMPHONY_CODE_QUALITY_SCOPE}" == "symphony" || "${SYMPHONY_CODE_QUALITY_SCOPE}" == "symphony-live" ]]; then
  if [[ -d "${REPO_ROOT}/node_modules" && ! -e "${WORKSPACE_PATH}/node_modules" ]]; then
    ln -s "${REPO_ROOT}/node_modules" "${WORKSPACE_PATH}/node_modules"
  elif [[ ! -d "${REPO_ROOT}/node_modules" ]]; then
    pnpm install --frozen-lockfile --prefer-offline
  fi
elif ! symphony_link_existing_node_modules "${REPO_ROOT}" "${WORKSPACE_PATH}"; then
  pnpm install --frozen-lockfile --prefer-offline
fi
