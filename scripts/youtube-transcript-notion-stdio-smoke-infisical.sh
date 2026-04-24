#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/youtube-transcript-notion-mcp}"
INFISICAL_INCLUDE_IMPORTS="${INFISICAL_INCLUDE_IMPORTS:-true}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "missing required command: $1" >&2
    exit 1
  fi
}

normalize_bool_or_fail() {
  local raw="${1:-}"
  local lowered
  lowered="$(echo "$raw" | tr '[:upper:]' '[:lower:]')"
  case "$lowered" in
    true | false) echo "$lowered" ;;
    *)
      echo "invalid boolean: ${raw} (expected true|false)" >&2
      exit 1
      ;;
  esac
}

resolve_infisical_project_id() {
  if [[ -n "$INFISICAL_PROJECT_ID" ]]; then
    return 0
  fi

  local config_path="$ROOT_DIR/.infisical.json"
  if [[ ! -f "$config_path" ]]; then
    return 0
  fi

  INFISICAL_PROJECT_ID="$(jq -r '.workspaceId // empty' "$config_path")"
}

main() {
  require_cmd infisical
  require_cmd jq
  require_cmd pnpm

  INFISICAL_INCLUDE_IMPORTS="$(normalize_bool_or_fail "$INFISICAL_INCLUDE_IMPORTS")"
  resolve_infisical_project_id

  local -a run_cmd=(
    infisical run
    --env="$INFISICAL_ENV"
    --path="$INFISICAL_PATH"
    --include-imports="$INFISICAL_INCLUDE_IMPORTS"
  )

  if [[ -n "$INFISICAL_PROJECT_ID" ]]; then
    run_cmd+=(--projectId="$INFISICAL_PROJECT_ID")
  fi

  run_cmd+=(-- pnpm mcp:youtube-transcript-notion:smoke:auto "$@")

  cd "$ROOT_DIR"
  exec "${run_cmd[@]}"
}

main "$@"
