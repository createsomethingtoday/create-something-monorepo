#!/usr/bin/env bash
set -euo pipefail

SYMPHONY_WORKTREE_LOCK_TIMEOUT_SECONDS="${SYMPHONY_WORKTREE_LOCK_TIMEOUT_SECONDS:-120}"
SYMPHONY_WORKTREE_LOCK_SLEEP_SECONDS="${SYMPHONY_WORKTREE_LOCK_SLEEP_SECONDS:-1}"

symphony_worktree_lock_dir() {
  local repo_root="$1"
  printf '%s\n' "${repo_root}/.git/.symphony-worktree-lock"
}

symphony_acquire_worktree_lock() {
  local repo_root="$1"
  local lock_dir
  lock_dir="$(symphony_worktree_lock_dir "${repo_root}")"
  local waited=0

  while symphony_other_worktree_operations_running "${repo_root}"; do
    if (( waited >= SYMPHONY_WORKTREE_LOCK_TIMEOUT_SECONDS )); then
      echo "Timed out waiting for other git worktree operations for ${repo_root} after ${SYMPHONY_WORKTREE_LOCK_TIMEOUT_SECONDS}s." >&2
      return 1
    fi

    sleep "${SYMPHONY_WORKTREE_LOCK_SLEEP_SECONDS}"
    waited=$(( waited + SYMPHONY_WORKTREE_LOCK_SLEEP_SECONDS ))
  done

  while ! mkdir "${lock_dir}" 2>/dev/null; do
    if (( waited >= SYMPHONY_WORKTREE_LOCK_TIMEOUT_SECONDS )); then
      echo "Timed out waiting for Symphony git worktree lock at ${lock_dir} after ${SYMPHONY_WORKTREE_LOCK_TIMEOUT_SECONDS}s." >&2
      return 1
    fi

    sleep "${SYMPHONY_WORKTREE_LOCK_SLEEP_SECONDS}"
    waited=$(( waited + SYMPHONY_WORKTREE_LOCK_SLEEP_SECONDS ))
  done

  printf '%s\n' "$$" > "${lock_dir}/pid" 2>/dev/null || true
}

symphony_other_worktree_operations_running() {
  local repo_root="$1"
  local current_pid="$$"

  ps -Ao pid=,command= | awk -v repo_root="${repo_root}" -v current_pid="${current_pid}" '
    {
      pid = $1
      sub(/^[[:space:]]*[0-9]+[[:space:]]+/, "", $0)
      if (pid == current_pid) {
        next
      }
      if (index($0, repo_root) == 0) {
        next
      }
      if ($0 ~ /git([[:space:]].*)? worktree (add|remove|prune)/) {
        found = 1
        exit 0
      }
    }
    END {
      if (found) {
        exit 0
      }
      exit 1
    }
  '
}

symphony_release_worktree_lock() {
  local repo_root="$1"
  local lock_dir
  lock_dir="$(symphony_worktree_lock_dir "${repo_root}")"

  rm -f "${lock_dir}/pid" 2>/dev/null || true
  rmdir "${lock_dir}" 2>/dev/null || true
}

symphony_add_worktree() {
  local repo_root="$1"
  local workspace_path="$2"
  local branch_name="$3"

  if [[ -e "${workspace_path}/.git" ]]; then
    return 0
  fi

  symphony_acquire_worktree_lock "${repo_root}"
  local status=0

  if git -C "${repo_root}" show-ref --verify --quiet "refs/heads/${branch_name}"; then
    git -C "${repo_root}" worktree add --force "${workspace_path}" "${branch_name}" || status=$?
  else
    git -C "${repo_root}" worktree add --force -b "${branch_name}" "${workspace_path}" HEAD || status=$?
  fi

  symphony_release_worktree_lock "${repo_root}"
  return "${status}"
}

symphony_remove_worktree() {
  local repo_root="$1"
  local workspace_path="$2"

  symphony_acquire_worktree_lock "${repo_root}"
  local status=0

  if git -C "${repo_root}" worktree list --porcelain | grep -Fq "worktree ${workspace_path}"; then
    git -C "${repo_root}" worktree remove --force "${workspace_path}" || status=$?
    git -C "${repo_root}" worktree prune || status=$?
  fi

  symphony_release_worktree_lock "${repo_root}"
  return "${status}"
}
