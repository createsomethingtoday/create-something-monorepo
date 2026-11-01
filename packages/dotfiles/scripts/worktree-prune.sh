#!/bin/bash
# worktree-prune.sh — daily sweep of stale agent worktrees living in temp dirs.
#
# Agent runners (Codex, Claude Code) create git worktrees under $TMPDIR and
# /private/tmp and never remove them. Each is a full checkout with node_modules,
# so the disk fills every few weeks. Scheduled runs only report candidates.
# A targeted --apply removes only worktrees that are:
#   - older than MIN_AGE_HOURS (default 168; drops to LOW_DISK_MIN_AGE_HOURS when
#     free space is under LOW_DISK_GB — a burst of worktrees in one day can fill
#     the disk before a 24h window elapses)
#   - not locked
#   - not the cwd of any running process
#   - clean (no modified or untracked files)
#   - merged into the origin default branch
# Anything failing a check is logged and left alone.
#
# Orphan directories and node_modules are inventoried but require a separate
# manual cleanup. This avoids deleting active work hidden from git registrations.
#
# Usage: worktree-prune.sh [--dry-run [--target /absolute/worktree/path]]
#                            | --apply --target /absolute/worktree/path
# Env:   WORKTREE_PRUNE_MIN_AGE_HOURS, WORKTREE_PRUNE_CODE_ROOT,
#        WORKTREE_PRUNE_LOW_DISK_GB, WORKTREE_PRUNE_LOW_DISK_MIN_AGE_HOURS

set -u
DRY_RUN=1
TARGET=""
if [[ "${1:-}" == "--apply" && "${2:-}" == "--target" && "${3:-}" == /* && $# -eq 3 ]]; then
  DRY_RUN=0; TARGET="${3%/}"
elif [[ "${1:-}" == "--dry-run" && "${2:-}" == "--target" && "${3:-}" == /* && $# -eq 3 ]]; then
  TARGET="${3%/}"
elif [[ $# -gt 0 && !( $# -eq 1 && "$1" == "--dry-run" ) ]]; then
  echo "usage: $0 [--dry-run [--target /absolute/worktree/path]] | --apply --target /absolute/worktree/path" >&2
  exit 2
fi
if [[ $DRY_RUN -eq 0 ]]; then
  case "$TARGET" in
    ""|/|//*|*/../*|*/./*)
      echo "--apply requires one exact temp worktree path" >&2; exit 2 ;;
  esac
  case "$TARGET" in
    /private/var/folders/*/*/T/*-agent-worktree|/var/folders/*/*/T/*-agent-worktree|/private/tmp/*|/tmp/*) ;;
    *) echo "--apply target must be a temp worktree" >&2; exit 2 ;;
  esac
fi
MIN_AGE_HOURS="${WORKTREE_PRUNE_MIN_AGE_HOURS:-168}"
LOW_DISK_GB="${WORKTREE_PRUNE_LOW_DISK_GB:-30}"
LOW_DISK_MIN_AGE_HOURS="${WORKTREE_PRUNE_LOW_DISK_MIN_AGE_HOURS:-48}"
CODE_ROOT="${WORKTREE_PRUNE_CODE_ROOT:-$HOME/Code}"
STATE_DIR="$HOME/.local/state/worktree-prune"
LOG="$STATE_DIR/prune.log"
mkdir -p "$STATE_DIR"

REMOVED=0; CANDIDATES=0; SKIPPED=0
NOW=$(date +%s)
REGISTERED=$(mktemp)
trap 'rm -f "$REGISTERED"' EXIT

log() { printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" | tee -a "$LOG"; }
run() { if [[ $DRY_RUN -eq 1 ]]; then log "DRY-RUN: $*"; else "$@"; fi; }
free_gb() { df -g /System/Volumes/Data 2>/dev/null | awk 'NR==2{print $4}'; }

# Disk pressure shortens the age gate; every other check still applies.
FREE_GB_START="${WORKTREE_PRUNE_FREE_GB:-$(free_gb)}"
if [[ ${FREE_GB_START:-999} -lt $LOW_DISK_GB ]]; then
  MIN_AGE_HOURS=$LOW_DISK_MIN_AGE_HOURS
fi

# Snapshot every process cwd once; lsof is slow.
LIVE_CWDS=$(lsof -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | sort -u)
[[ -n "$LIVE_CWDS" ]] || { log "process inventory unavailable; refusing cleanup"; exit 1; }

is_temp_path() {
  case "$1" in
    /private/var/folders/*|/var/folders/*|/private/tmp/*|/tmp/*) return 0 ;;
    *) return 1 ;;
  esac
}
has_live_proc() { printf '%s\n' "$LIVE_CWDS" | awk -v p="$1" 'index($0,p)==1 && (length($0)==length(p) || substr($0,length(p)+1,1)=="/") { found=1 } END { exit !found }'; }
age_hours() { local m; m=$(stat -f %m "$1" 2>/dev/null || echo "$NOW"); echo $(( (NOW - m) / 3600 )); }
skip() { SKIPPED=$((SKIPPED+1)); log "skip  $1  ($2)"; }

# Returns 0 if worktree at $1 (belonging to repo $2) is clean and safe to drop.
is_clean_and_merged() {
  local wt="$1" repo="$2" status head def
  status=$(git -C "$wt" status --porcelain 2>/dev/null) || { echo "git status failed"; return 1; }
  [[ -n "$status" ]] && { echo "dirty ($(printf '%s\n' "$status" | wc -l | tr -d ' ') files)"; return 1; }
  head=$(git -C "$wt" rev-parse HEAD 2>/dev/null) || { echo "no HEAD"; return 1; }
  def=$(git -C "$repo" symbolic-ref -q refs/remotes/origin/HEAD 2>/dev/null | sed 's#refs/remotes/##')
  [[ -z "$def" ]] && def=origin/main
  if git -C "$repo" merge-base --is-ancestor "$head" "$def" 2>/dev/null; then echo "merged into $def"; return 0; fi
  echo "HEAD not merged into $def"; return 1
}

process_repo() {
  local repo="$1" fetched=0
  # Never mutate worktree registrations during a scheduled inventory.
  local blocks; blocks=$(git -C "$repo" worktree list --porcelain 2>/dev/null) || return
  local path="" locked=0 line
  while IFS= read -r line || [[ -n "$path" ]]; do
    case "$line" in
      worktree\ *) path="${line#worktree }"; locked=0 ;;
      locked*) locked=1 ;;
      "")
        [[ -z "$path" ]] && continue
        printf '%s\n' "$path" >> "$REGISTERED"
        if [[ "$path" != "$repo" && -d "$path" && ( -z "$TARGET" || "$path" == "$TARGET" ) ]]; then
          if is_temp_path "$path"; then
            local age; age=$(age_hours "$path")
            if [[ $locked -eq 1 ]]; then skip "$path" "locked"
            elif [[ $age -lt $MIN_AGE_HOURS ]]; then skip "$path" "only ${age}h old"
            elif has_live_proc "$path"; then skip "$path" "live process cwd"
            else
              if [[ $fetched -eq 0 ]]; then
                if ! git -C "$repo" fetch origin -q 2>/dev/null; then
                  skip "$path" "origin fetch failed"; path=""; locked=0; continue
                fi
                fetched=1
              fi
              local why
              if why=$(is_clean_and_merged "$path" "$repo"); then
                CANDIDATES=$((CANDIDATES+1))
                log "candidate $path  ($why, ${age}h, $(du -sh "$path" 2>/dev/null | cut -f1))"
                # Another agent can claim or change the checkout after inventory.
                # Refresh process use, lock, and git state at the removal boundary.
                local fresh_cwds=""
                [[ $DRY_RUN -eq 0 ]] && fresh_cwds=$(lsof -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | sort -u)
                if [[ $DRY_RUN -eq 0 ]] && git -C "$repo" worktree list --porcelain | awk -v p="$path" '$1=="worktree" { in_target=($2==p) } in_target && $1=="locked" { found=1 } END { exit !found }'; then
                  skip "$path" "became locked"
                elif [[ $DRY_RUN -eq 0 && -z "$fresh_cwds" ]]; then
                  skip "$path" "process inventory unavailable before removal"
                elif [[ $DRY_RUN -eq 0 ]] && printf '%s\n' "$fresh_cwds" | awk -v p="$path" 'index($0,p)==1 && (length($0)==length(p) || substr($0,length(p)+1,1)=="/") { found=1 } END { exit !found }'; then
                  skip "$path" "became active"
                elif [[ $DRY_RUN -eq 0 ]] && ! is_clean_and_merged "$path" "$repo" >/dev/null; then
                  skip "$path" "state changed before removal"
                elif [[ $DRY_RUN -eq 0 ]]; then
                  git -C "$repo" worktree remove "$path" && REMOVED=$((REMOVED+1))
                else
                  log "DRY-RUN: git worktree remove $path"
                fi
              else skip "$path" "$why"; fi
            fi
          fi
        fi
        path=""; locked=0 ;;
    esac
  done <<< "$blocks
"
  # Registration pruning is a separate manual operation.
}

log "=== worktree-prune start (dry_run=$DRY_RUN min_age=${MIN_AGE_HOURS}h free=${FREE_GB_START:-?}G) ==="
[[ "$MIN_AGE_HOURS" == "$LOW_DISK_MIN_AGE_HOURS" && ${FREE_GB_START:-999} -lt $LOW_DISK_GB ]] && \
  log "low disk (${FREE_GB_START}G < ${LOW_DISK_GB}G): age gate lowered to ${MIN_AGE_HOURS}h"
while IFS= read -r gitdir; do
  process_repo "${gitdir%/.git}"
done < <(find "$CODE_ROOT" -maxdepth 2 -name .git -type d 2>/dev/null)

# Orphans: report only. A missing registration is not proof of abandoned work.
for d in /private/var/folders/*/*/T/*-agent-worktree /private/tmp/cre-*; do
  [[ -d "$d" ]] || continue
  [[ -z "$TARGET" || "$d" == "$TARGET" ]] || continue
  grep -qx "$d" "$REGISTERED" && continue
  age=$(age_hours "$d")
  [[ $age -lt $MIN_AGE_HOURS ]] && { skip "$d" "orphan, only ${age}h old"; continue; }
  has_live_proc "$d" && { skip "$d" "orphan, live process cwd"; continue; }
  kb=$(du -sk "$d" 2>/dev/null | cut -f1)
  skip "$d" "orphan (${kb:-?}K): review by hand"
done

FREE=$(df -h /System/Volumes/Data 2>/dev/null | awk 'NR==2{print $4}')
log "=== done: candidates=$CANDIDATES removed=$REMOVED skipped=$SKIPPED free=$FREE ==="
