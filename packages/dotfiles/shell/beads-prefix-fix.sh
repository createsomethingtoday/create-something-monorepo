#!/bin/zsh
# Beads Prefix Resolution Workaround
#
# Bug: `bd show csm-xyz` fails while `bd show xyz` succeeds
# Root cause: ResolvePartialID fast path fails for full prefixed IDs
#
# This wrapper strips the configured prefix when passing IDs to bd,
# allowing the normalization path to work correctly.
#
# Zuhandenheit: The workaround recedes into transparent use.
# The bug becomes invisible until upstream fixes it.

# Commands that take an issue ID as first positional argument
_BD_ID_COMMANDS=(show close update ready blocked dep stale label comment)

# Commands that take multiple IDs
_BD_MULTI_ID_COMMANDS=(dep)

# Get the real bd binary
_BD_BIN="${BD_BIN:-/opt/homebrew/bin/bd}"

# Helper: strip prefix from ID if present
# Converts "csm-abc123" to "abc123" but leaves "abc123" unchanged
_bd_strip_prefix() {
  local id="$1"
  # Match prefix-hash pattern (2-4 chars, hyphen, hash)
  if [[ "$id" =~ ^[a-z]{2,4}-[a-zA-Z0-9]+$ ]]; then
    echo "${id#*-}"
  else
    echo "$id"
  fi
}

# Main bd wrapper
bd() {
  local cmd="$1"
  shift

  # Check if this command takes ID arguments
  if (( ${_BD_ID_COMMANDS[(Ie)$cmd]} )); then
    local args=()
    local found_id=false

    for arg in "$@"; do
      if [[ "$arg" == -* ]]; then
        # Flag argument, pass through
        args+=("$arg")
      elif [[ "$found_id" == false ]] && [[ "$arg" =~ ^[a-z]{2,4}-[a-zA-Z0-9]+$ ]]; then
        # First ID-like argument, strip prefix
        args+=("$(_bd_strip_prefix "$arg")")
        found_id=true
      else
        args+=("$arg")
      fi
    done

    "$_BD_BIN" "$cmd" "${args[@]}"
  else
    # Not an ID command, pass through unchanged
    "$_BD_BIN" "$cmd" "$@"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Verification (silent unless BD_DEBUG is set)
# ─────────────────────────────────────────────────────────────────────────────

if [[ -n "$BD_DEBUG" ]]; then
  echo "Beads prefix workaround loaded:"
  echo "  Affected commands: ${_BD_ID_COMMANDS[*]}"
  echo "  bd show csm-xyz → bd show xyz (prefix stripped)"
  echo "  Set BD_BIN to override binary path (default: /opt/homebrew/bin/bd)"
fi
