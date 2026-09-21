#!/bin/bash
# worktree-prune.sh — daily sweep of stale agent worktrees living in temp dirs.
#
# Agent runners (Codex, Claude Code) create git worktrees under $TMPDIR and
# /private/tmp and never remove them. Each is a full checkout with node_modules,
# so the disk fills every few weeks. This script removes only worktrees that are:
#   - older than MIN_AGE_HOURS (default 24)
#   - not locked
#   - not the cwd of any running process
#   - clean (no modified or untracked files)
#   - merged: HEAD is contained in origin's default branch, or HEAD equals
#     origin/<branch> (already pushed)
# Anything failing a check is logged and left alone.
#
# Usage: worktree-prune.sh [--dry-run]
# Env:   WORKTREE_PRUNE_MIN_AGE_HOURS, WORKTREE_PRUNE_CODE_ROOT

set -u
DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1
MIN_AGE_HOURS="${WORKTREE_PRUNE_MIN_AGE_HOURS:-24}"
CODE_ROOT="${WORKTREE_PRUNE_CODE_ROOT:-$HOME/Code}"
STATE_DIR="$HOME/.local/state/worktree-prune"
LOG="$STATE_DIR/prune.log"
mkdir -p "$STATE_DIR"

REMOVED=0; SKIPPED=0; ORPHANS_REMOVED=0
NOW=$(date +%s)
REGISTERED=$(mktemp)
trap 'rm -f "$REGISTERED"' EXIT

log() { printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" | tee -a "$LOG"; }
run() { if [[ $DRY_RUN -eq 1 ]]; then log "DRY-RUN: $*"; else "$@"; fi; }

# Snapshot every process cwd once; lsof is slow.
LIVE_CWDS=$(lsof -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | sort -u)

is_temp_path() {
  case "$1" in
    /private/var/folders/*|/var/folders/*|/private/tmp/*|/tmp/*) return 0 ;;
    *) return 1 ;;
  esac
}
has_live_proc() { printf '%s\n' "$LIVE_CWDS" | grep -q "^$1\(/\|$\)"; }
age_hours() { local m; m=$(stat -f %m "$1" 2>/dev/null || echo "$NOW"); echo $(( (NOW - m) / 3600 )); }
skip() { SKIPPED=$((SKIPPED+1)); log "skip  $1  ($2)"; }

# Returns 0 if worktree at $1 (belonging to repo $2) is clean and merged/pushed.
is_clean_and_merged() {
  local wt="$1" repo="$2" status head branch def
  status=$(git -C "$wt" status --porcelain 2>/dev/null) || { echo "git status failed"; return 1; }
  [[ -n "$status" ]] && { echo "dirty ($(printf '%s\n' "$status" | wc -l | tr -d ' ') files)"; return 1; }
  head=$(git -C "$wt" rev-parse HEAD 2>/dev/null) || { echo "no HEAD"; return 1; }
  def=$(git -C "$repo" symbolic-ref -q refs/remotes/origin/HEAD 2>/dev/null | sed 's#refs/remotes/##')
  [[ -z "$def" ]] && def=origin/main
  if git -C "$repo" merge-base --is-ancestor "$head" "$def" 2>/dev/null; then echo "merged into $def"; return 0; fi
  branch=$(git -C "$wt" rev-parse --abbrev-ref HEAD 2>/dev/null)
  if [[ -n "$branch" && "$branch" != "HEAD" ]]; then
    local remote_head; remote_head=$(git -C "$repo" rev-parse -q --verify "refs/remotes/origin/$branch" 2>/dev/null)
    [[ -n "$remote_head" && "$remote_head" == "$head" ]] && { echo "pushed as origin/$branch"; return 0; }
    echo "unpushed commits on $branch"; return 1
  fi
  echo "detached HEAD not in $def"; return 1
}

process_repo() {
  local repo="$1" fetched=0
  git -C "$repo" worktree prune 2>/dev/null
  local blocks; blocks=$(git -C "$repo" worktree list --porcelain 2>/dev/null) || return
  local path="" locked=0 line
  while IFS= read -r line || [[ -n "$path" ]]; do
    case "$line" in
      worktree\ *) path="${line#worktree }"; locked=0 ;;
      locked*) locked=1 ;;
      "")
        [[ -z "$path" ]] && continue
        printf '%s\n' "$path" >> "$REGISTERED"
        if [[ "$path" != "$repo" ]] && is_temp_path "$path" && [[ -d "$path" ]]; then
          local age; age=$(age_hours "$path")
          if [[ $locked -eq 1 ]]; then skip "$path" "locked"
          elif [[ $age -lt $MIN_AGE_HOURS ]]; then skip "$path" "only ${age}h old"
          elif has_live_proc "$path"; then skip "$path" "live process cwd"
          else
            if [[ $fetched -eq 0 ]]; then git -C "$repo" fetch origin -q 2>/dev/null; fetched=1; fi
            local why
            if why=$(is_clean_and_merged "$path" "$repo"); then
              log "remove $path  ($why, ${age}h, $(du -sh "$path" 2>/dev/null | cut -f1))"
              run git -C "$repo" worktree remove --force "$path" && REMOVED=$((REMOVED+1))
            else skip "$path" "$why"; fi
          fi
        fi
        path=""; locked=0 ;;
    esac
  done <<< "$blocks
"
  git -C "$repo" worktree prune 2>/dev/null
}

log "=== worktree-prune start (dry_run=$DRY_RUN min_age=${MIN_AGE_HOURS}h) ==="
while IFS= read -r gitdir; do
  process_repo "${gitdir%/.git}"
done < <(find "$CODE_ROOT" -maxdepth 2 -name .git -type d 2>/dev/null)

# Orphans: agent worktree dirs in temp that no repo registers anymore.
for d in /private/var/folders/*/*/T/*-agent-worktree /private/tmp/cre-*; do
  [[ -d "$d" ]] || continue
  grep -qx "$d" "$REGISTERED" && continue
  age=$(age_hours "$d")
  [[ $age -lt $MIN_AGE_HOURS ]] && { skip "$d" "orphan, only ${age}h old"; continue; }
  has_live_proc "$d" && { skip "$d" "orphan, live process cwd"; continue; }
  kb=$(du -sk "$d" 2>/dev/null | cut -f1)
  if [[ -d "$d/.git" ]]; then
    # Standalone clone: judge against its own origin.
    git -C "$d" fetch origin -q 2>/dev/null
    if why=$(is_clean_and_merged "$d" "$d"); then
      log "remove $d  (orphan clone, $why, ${age}h)"; run rm -rf "$d" && ORPHANS_REMOVED=$((ORPHANS_REMOVED+1))
    else skip "$d" "orphan clone, $why"; fi
  elif [[ ${kb:-0} -le 1024 ]]; then
    log "remove $d  (orphan remnant, ${kb}K, ${age}h)"; run rm -rf "$d" && ORPHANS_REMOVED=$((ORPHANS_REMOVED+1))
  else
    skip "$d" "orphan with dead gitdir but ${kb}K of content — review by hand"
  fi
done

FREE=$(df -h /System/Volumes/Data 2>/dev/null | awk 'NR==2{print $4}')
log "=== done: removed=$REMOVED orphans_removed=$ORPHANS_REMOVED skipped=$SKIPPED free=$FREE ==="
