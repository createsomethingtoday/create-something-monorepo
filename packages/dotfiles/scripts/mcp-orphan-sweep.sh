#!/bin/bash
# mcp-orphan-sweep.sh — kill session-scoped dev servers that outlived their session.
#
# Claude Code / Codex sessions spawn MCP servers (`npm exec @foo/mcp`, lsmcp,
# typescript-language-server, operator-agent-mcp.mjs, …), wrangler dev
# (workerd) and Playwright browsers as children. When the session dies
# uncleanly the children are reparented to launchd (ppid 1) and keep running
# for days. One leaked mcp-server-cloudflare was found holding 3.7 GB on a
# 16 GB machine. This script kills only processes that are:
#   - reparented to launchd (ppid == 1)
#   - matching a known session-scoped tooling pattern (see PATTERNS)
#   - not matching EXCLUDE (long-lived services that legitimately run under launchd)
#   - older than MIN_AGE_MIN (default 10)
# and their descendants. Everything else is left alone and logged.
#
# Usage: mcp-orphan-sweep.sh [--dry-run]
# Env:   MCP_SWEEP_MIN_AGE_MIN

set -u
DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1
MIN_AGE_MIN="${MCP_SWEEP_MIN_AGE_MIN:-10}"
STATE_DIR="$HOME/.local/state/mcp-orphan-sweep"
LOG="$STATE_DIR/sweep.log"
mkdir -p "$STATE_DIR"

# Session-scoped tooling. Matched against the full command line, only when ppid == 1.
PATTERNS=(
  'npm exec .*(mcp|lsmcp|typescript-language-server|agentcash)'
  'node .*(/[^ /]*mcp[^ /]*( |$)|/[a-z0-9-]*-mcp/|lsmcp|typescript-language-server|agentcash|operator-agent-mcp\.mjs)'
  'node .*/playwright-core/lib/entry/cli'
  '^(/private/tmp|/private/var/folders|/var/folders|/tmp)/.*/workerd( |$)'
)
# Long-lived services that run under launchd on purpose. Never touched.
EXCLUDE='remodex|/happy/|ChatGPT\.app|\.codex/|cua_node|Pencil\.app|Codex'

log() { printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" | tee -a "$LOG"; }

# etime ([[dd-]hh:]mm:ss) -> minutes
etime_min() {
  local e="$1" d=0 h=0 m=0
  [[ "$e" == *-* ]] && { d="${e%%-*}"; e="${e#*-}"; }
  IFS=: read -r a b c <<< "$e"
  if [[ -n "${c:-}" ]]; then h=$a; m=$b; else m=$a; fi
  echo $(( d*1440 + 10#$h*60 + 10#$m ))
}

descendants() {  # print pid and all descendants, depth-first
  local p="$1" c
  echo "$p"
  for c in $(pgrep -P "$p" 2>/dev/null); do descendants "$c"; done
}

matches() {
  local args="$1" pat
  [[ "$args" =~ $EXCLUDE ]] && return 1
  for pat in "${PATTERNS[@]}"; do [[ "$args" =~ $pat ]] && return 0; done
  return 1
}

KILLED=0; SKIPPED=0
declare -a TARGETS=()
while IFS= read -r line; do
  pid=$(awk '{print $1}' <<< "$line"); ppid=$(awk '{print $2}' <<< "$line")
  etime=$(awk '{print $3}' <<< "$line"); args=$(cut -d' ' -f4- <<< "$(sed -E 's/^ *//; s/  +/ /g' <<< "$line")")
  [[ "$ppid" == "1" ]] || continue
  matches "$args" || continue
  age=$(etime_min "$etime")
  if (( age < MIN_AGE_MIN )); then SKIPPED=$((SKIPPED+1)); log "skip  $pid  (only ${age}m old) ${args:0:100}"; continue; fi
  rss_mb=$(( $(ps -o rss= -p "$pid" 2>/dev/null | tr -d ' ' || echo 0) / 1024 ))
  log "kill  $pid  (orphan ${age}m, rss ${rss_mb}MB) ${args:0:120}"
  TARGETS+=("$pid")
done < <(ps -axo pid=,ppid=,etime=,args=)

if (( ${#TARGETS[@]} > 0 )); then
  ALL=$(for t in "${TARGETS[@]}"; do descendants "$t"; done | sort -un)
  if (( DRY_RUN )); then
    log "DRY-RUN: would TERM pids: $(tr '\n' ' ' <<< "$ALL")"
  else
    # shellcheck disable=SC2086
    kill -TERM $ALL 2>/dev/null
    sleep 5
    for p in $ALL; do
      if kill -0 "$p" 2>/dev/null; then kill -KILL "$p" 2>/dev/null && log "KILL  $p  (did not exit on TERM)"; fi
    done
    KILLED=$(wc -w <<< "$ALL" | tr -d ' ')
  fi
fi

SWAP=$(sysctl -n vm.swapusage 2>/dev/null | sed -E 's/.*used = ([^ ]+).*/\1/')
log "=== done: dry_run=$DRY_RUN targets=${#TARGETS[@]} killed=$KILLED skipped=$SKIPPED swap_used=${SWAP:-?} ==="
