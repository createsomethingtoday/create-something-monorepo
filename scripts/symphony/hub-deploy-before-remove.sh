#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
WORKSPACE_PATH="$(pwd)"
source "${SCRIPT_DIR}/worktree-utils.sh"

symphony_remove_worktree "${REPO_ROOT}" "${WORKSPACE_PATH}" || true
