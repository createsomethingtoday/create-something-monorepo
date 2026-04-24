#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKER_NAME="${WORKER_NAME:-youtube-transcript-notion-mcp}"
WORKER_DIR="${WORKER_DIR:-packages/youtube-transcript-notion-mcp/worker}"
WORKER_CONFIG="${WORKER_CONFIG:-$ROOT_DIR/packages/youtube-transcript-notion-mcp/worker/wrangler.toml}"
INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/youtube-transcript-notion-mcp}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
INFISICAL_INCLUDE_IMPORTS="${INFISICAL_INCLUDE_IMPORTS:-true}"
DRY_RUN="${DRY_RUN:-false}"

REQUIRED_KEYS=(
  NOTION_API_KEY
  NOTION_DATABASE_ID
  SUPADATA_API_KEY
)

OPTIONAL_KEYS=(
  SUPADATA_TRANSCRIPT_MODE
  YOUTUBE_DATA_API_KEY
  YOUTUBE_PLAYLIST_ID
  YOUTUBE_PLAYLIST_DATABASE_ID
  YOUTUBE_PLAYLIST_MAX_SCAN_ITEMS
  YOUTUBE_PLAYLIST_MAX_SYNC_ITEMS
  STEEL_API_KEY
  STEEL_PROFILE_ID
  MCP_DISPLAY_NAME
  MCP_DESCRIPTION
  MCP_BEARER_TOKEN
  BRAINTRUST_API_KEY
  BRAINTRUST_PROJECT_ID
)

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

load_infisical_payload() {
  local -a export_cmd=(
    infisical export
    --format=json
    --env="$INFISICAL_ENV"
    --path="$INFISICAL_PATH"
    --include-imports="$INFISICAL_INCLUDE_IMPORTS"
    --silent
  )

  if [[ -n "$INFISICAL_PROJECT_ID" ]]; then
    export_cmd+=(--projectId="$INFISICAL_PROJECT_ID")
  fi

  "${export_cmd[@]}"
}

get_secret_value() {
  local payload="$1"
  local key="$2"

  printf '%s' "$payload" | jq -r --arg key "$key" '
    if type == "array" then
      map(select(.key == $key)) | .[0].value // empty
    else
      .[$key] // empty
    end
  '
}

put_secret() {
  local key="$1"
  local value="$2"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] wrangler secret put ${key} --name ${WORKER_NAME} --config ${WORKER_CONFIG}"
    return 0
  fi

  printf '%s' "$value" | node "$ROOT_DIR/scripts/run-wrangler.mjs" --cwd "$WORKER_DIR" secret put "$key" --name "$WORKER_NAME" --config "$WORKER_CONFIG"
}

main() {
  require_cmd infisical
  require_cmd jq
  require_cmd pnpm

  DRY_RUN="$(normalize_bool_or_fail "$DRY_RUN")"
  INFISICAL_INCLUDE_IMPORTS="$(normalize_bool_or_fail "$INFISICAL_INCLUDE_IMPORTS")"
  resolve_infisical_project_id

  local payload
  payload="$(load_infisical_payload)"

  local key value
  for key in "${REQUIRED_KEYS[@]}"; do
    value="$(get_secret_value "$payload" "$key")"
    if [[ -z "$value" ]]; then
      echo "missing required Infisical secret: ${key} (env=${INFISICAL_ENV} path=${INFISICAL_PATH})" >&2
      exit 1
    fi
    put_secret "$key" "$value"
  done

  for key in "${OPTIONAL_KEYS[@]}"; do
    value="$(get_secret_value "$payload" "$key")"
    if [[ -n "$value" ]]; then
      put_secret "$key" "$value"
    fi
  done

  echo "synced youtube-transcript-notion-mcp secrets from Infisical env=${INFISICAL_ENV} path=${INFISICAL_PATH} worker=${WORKER_NAME}"
}

main "$@"
