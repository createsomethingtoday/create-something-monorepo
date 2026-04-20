#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WRANGLER_RUNNER=(
  node
  "$ROOT_DIR/scripts/run-wrangler.mjs"
  --cwd
  packages/abundance-jobs-mcp/worker
)
INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/agency/abundance-mcp}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
INFISICAL_INCLUDE_IMPORTS="${INFISICAL_INCLUDE_IMPORTS:-true}"
DRY_RUN="${DRY_RUN:-false}"

REQUIRED_KEYS=(
  ABUNDANCE_MCP_BEARER_TOKEN
)

OPTIONAL_KEYS=(
  ABUNDANCE_MCP_OPERATOR_EMAIL
)

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "missing required command: $1" >&2
    exit 1
  fi
}

load_infisical_payload() {
  local -a export_cmd=(
    infisical export
    --format=json
    --env="$INFISICAL_ENV"
    --path="$INFISICAL_PATH"
    --include-imports="$INFISICAL_INCLUDE_IMPORTS"
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
  local target_key="$1"
  local value="$2"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] wrangler secret put ${target_key} --cwd packages/abundance-jobs-mcp/worker"
    return 0
  fi

  printf '%s' "$value" | "${WRANGLER_RUNNER[@]}" secret put "$target_key"
}

main() {
  require_cmd infisical
  require_cmd jq
  require_cmd node

  local payload
  payload="$(load_infisical_payload)"

  local value
  value="$(get_secret_value "$payload" "ABUNDANCE_MCP_BEARER_TOKEN")"
  if [[ -z "$value" ]]; then
    echo "missing required Infisical secret: ABUNDANCE_MCP_BEARER_TOKEN (env=${INFISICAL_ENV} path=${INFISICAL_PATH})" >&2
    exit 1
  fi
  put_secret "MCP_BEARER_TOKEN" "$value"

  value="$(get_secret_value "$payload" "ABUNDANCE_MCP_OPERATOR_EMAIL")"
  if [[ -n "$value" ]]; then
    put_secret "MCP_OPERATOR_EMAIL" "$value"
  fi

  echo "synced Abundance MCP runtime secrets from Infisical env=${INFISICAL_ENV} path=${INFISICAL_PATH}"
}

main "$@"
