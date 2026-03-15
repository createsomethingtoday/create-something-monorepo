#!/usr/bin/env bash
set -euo pipefail

SYMPHONY_WORKTREE_LOCK_TIMEOUT_SECONDS="${SYMPHONY_WORKTREE_LOCK_TIMEOUT_SECONDS:-120}"
SYMPHONY_WORKTREE_LOCK_SLEEP_SECONDS="${SYMPHONY_WORKTREE_LOCK_SLEEP_SECONDS:-1}"

symphony_should_exclude_runtime_path() {
  local path="$1"

  case "${path}" in
    .git|.git/*|.symphony|.symphony/*|.loom|.loom/*|node_modules|node_modules/*|.archive|.archive/*|.ralph-archive|.ralph-archive/*|.beads|.beads/*|.claude|.claude/*|.gemini|.gemini/*|.orchestration|.orchestration/*|packages/*/node_modules|packages/*/node_modules/*)
      return 0
      ;;
  esac

  return 1
}

symphony_filter_runtime_paths() {
  local path

  while IFS= read -r -d '' path; do
    if symphony_should_exclude_runtime_path "${path}"; then
      continue
    fi

    printf '%s\0' "${path}"
  done
}

symphony_prune_workspace_runtime_state() {
  local workspace_path="$1"

  rm -rf \
    "${workspace_path}/.symphony" \
    "${workspace_path}/.loom" \
    "${workspace_path}/node_modules" \
    "${workspace_path}/.archive" \
    "${workspace_path}/.ralph-archive" \
    "${workspace_path}/.beads" \
    "${workspace_path}/.claude" \
    "${workspace_path}/.gemini" \
    "${workspace_path}/.orchestration"

  if [[ -d "${workspace_path}/packages" ]]; then
    find "${workspace_path}/packages" -type d -name node_modules -prune -exec rm -rf {} +
  fi
}

symphony_worktree_lock_dir() {
  local repo_root="$1"
  printf '%s\n' "${repo_root}/.git/.symphony-worktree-lock"
}

symphony_worktree_lock_pid_file() {
  local repo_root="$1"
  printf '%s/pid\n' "$(symphony_worktree_lock_dir "${repo_root}")"
}

symphony_worktree_lock_is_stale() {
  local repo_root="$1"
  local lock_dir pid_file pid
  lock_dir="$(symphony_worktree_lock_dir "${repo_root}")"
  pid_file="$(symphony_worktree_lock_pid_file "${repo_root}")"

  if [[ ! -d "${lock_dir}" ]]; then
    return 1
  fi

  if [[ ! -f "${pid_file}" ]]; then
    return 0
  fi

  pid="$(tr -d '[:space:]' < "${pid_file}" 2>/dev/null || true)"
  if [[ -z "${pid}" ]]; then
    return 0
  fi

  if ps -p "${pid}" >/dev/null 2>&1; then
    return 1
  fi

  return 0
}

symphony_clear_stale_worktree_lock() {
  local repo_root="$1"
  local lock_dir pid_file
  lock_dir="$(symphony_worktree_lock_dir "${repo_root}")"
  pid_file="$(symphony_worktree_lock_pid_file "${repo_root}")"

  rm -f "${pid_file}" 2>/dev/null || true
  rmdir "${lock_dir}" 2>/dev/null || true
}

symphony_populate_worktree_from_archive() {
  local repo_root="$1"
  local workspace_path="$2"
  local ref="$3"

  git -C "${repo_root}" archive --format=tar "${ref}" | tar -xf - -C "${workspace_path}"
  symphony_prune_workspace_runtime_state "${workspace_path}"
}

symphony_clone_workspace_from_archive() {
  local repo_root="$1"
  local workspace_path="$2"
  local branch_name="$3"
  local target_ref="${4:-HEAD}"

  if [[ -e "${workspace_path}/.git" ]]; then
    return 0
  fi

  git clone --local --shared --no-checkout "${repo_root}" "${workspace_path}"
  git -C "${workspace_path}" branch -f "${branch_name}" "${target_ref}"
  git -C "${workspace_path}" symbolic-ref HEAD "refs/heads/${branch_name}"
  symphony_populate_worktree_from_archive "${repo_root}" "${workspace_path}" "${target_ref}"
}

symphony_snapshot_workspace() {
  local repo_root="$1"
  local workspace_path="$2"
  local workspace_name stage_root stage_path moved=0
  local -a excludes=(
    --exclude='.git/'
    --exclude='.symphony/'
    --exclude='.loom/'
    --exclude='node_modules/'
    --exclude='packages/*/node_modules/'
    --exclude='.archive/'
    --exclude='.ralph-archive/'
    --exclude='.beads/'
    --exclude='.claude/'
    --exclude='.gemini/'
    --exclude='.orchestration/'
  )

  workspace_name="$(basename "${workspace_path}")"
  stage_root="$(dirname "${repo_root}")/.symphony-snapshot-staging/$(basename "${repo_root}")"
  mkdir -p "${stage_root}"
  stage_path="$(mktemp -d "${stage_root}/${workspace_name}.XXXXXX")"

  cleanup_stage_path() {
    if [[ "${moved}" -eq 0 && -n "${stage_path:-}" ]]; then
      rm -rf "${stage_path}" 2>/dev/null || true
    fi
  }

  trap cleanup_stage_path RETURN

  if command -v git >/dev/null 2>&1 && git -C "${repo_root}" rev-parse --is-inside-work-tree >/dev/null 2>&1 && command -v rsync >/dev/null 2>&1; then
    rm -rf "${workspace_path}"
    mkdir -p "${workspace_path}"
    git -C "${repo_root}" ls-files -z --cached --others --exclude-standard | \
      symphony_filter_runtime_paths | \
      rsync -a --from0 --files-from=- "${repo_root}/" "${workspace_path}/"
    return 0
  fi

  if cp -cR "${repo_root}/." "${stage_path}" 2>/dev/null; then
    rm -rf "${stage_path}/.git"
    symphony_prune_workspace_runtime_state "${stage_path}"

    rm -rf "${workspace_path}"
    mv "${stage_path}" "${workspace_path}"
    moved=1
    return 0
  fi

  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete "${excludes[@]}" "${repo_root}/" "${workspace_path}/"
    return 0
  fi

  (
    cd "${repo_root}"
    tar "${excludes[@]/#/}" -cf - .
  ) | (
    cd "${workspace_path}"
    tar -xf -
  )
}

symphony_snapshot_selected_paths() {
  local repo_root="$1"
  local workspace_path="$2"
  shift 2
  local -a snapshot_paths=("$@")

  rm -rf "${workspace_path}"
  mkdir -p "${workspace_path}"

  (
    cd "${repo_root}"
    tar -cf - "${snapshot_paths[@]}"
  ) | (
    cd "${workspace_path}"
    tar -xf -
  )
}

symphony_link_selected_paths() {
  local repo_root="$1"
  local workspace_path="$2"
  shift 2
  local path target_path target_parent

  rm -rf "${workspace_path}"
  mkdir -p "${workspace_path}"

  for path in "$@"; do
    target_path="${workspace_path}/${path%/}"
    target_parent="$(dirname "${target_path}")"
    mkdir -p "${target_parent}"
    ln -s "${repo_root}/${path%/}" "${target_path}"
  done
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
    if symphony_worktree_lock_is_stale "${repo_root}"; then
      symphony_clear_stale_worktree_lock "${repo_root}"
      continue
    fi

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
  local checkout_strategy="${SYMPHONY_WORKTREE_CHECKOUT_STRATEGY:-checkout}"
  local target_ref="${branch_name}"

  if [[ -e "${workspace_path}/.git" ]]; then
    return 0
  fi

  symphony_acquire_worktree_lock "${repo_root}"
  local status=0

  if git -C "${repo_root}" show-ref --verify --quiet "refs/heads/${branch_name}"; then
    if [[ "${checkout_strategy}" == "archive" ]]; then
      git -C "${repo_root}" worktree add --force --no-checkout "${workspace_path}" "${branch_name}" || status=$?
    else
      git -C "${repo_root}" worktree add --force "${workspace_path}" "${branch_name}" || status=$?
    fi
  else
    if [[ "${checkout_strategy}" == "archive" ]]; then
      git -C "${repo_root}" worktree add --force --no-checkout -b "${branch_name}" "${workspace_path}" HEAD || status=$?
    else
      git -C "${repo_root}" worktree add --force -b "${branch_name}" "${workspace_path}" HEAD || status=$?
    fi
  fi

  if [[ "${status}" -eq 0 && "${checkout_strategy}" == "archive" ]]; then
    symphony_populate_worktree_from_archive "${repo_root}" "${workspace_path}" "${target_ref}" || status=$?
  fi

  if [[ "${status}" -eq 0 ]]; then
    symphony_prune_workspace_runtime_state "${workspace_path}" || status=$?
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

symphony_link_existing_node_modules() {
  local repo_root="$1"
  local workspace_path="$2"

  if [[ ! -d "${repo_root}/node_modules" ]]; then
    return 1
  fi

  if [[ ! -e "${workspace_path}/node_modules" ]]; then
    ln -s "${repo_root}/node_modules" "${workspace_path}/node_modules"
  fi

  while IFS= read -r source_path; do
    local relative_path target_path target_parent
    relative_path="${source_path#${repo_root}/}"
    target_path="${workspace_path}/${relative_path}"
    target_parent="$(dirname "${target_path}")"
    mkdir -p "${target_parent}"
    if [[ ! -e "${target_path}" ]]; then
      ln -s "${source_path}" "${target_path}"
    fi
  done < <(find "${repo_root}/packages" -type d -name node_modules -prune -print 2>/dev/null)

  return 0
}
