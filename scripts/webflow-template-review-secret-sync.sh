#!/usr/bin/env bash
set -euo pipefail

INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/}"
INFISICAL_INCLUDE_IMPORTS="${INFISICAL_INCLUDE_IMPORTS:-true}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
WORKER_NAME="${WORKER_NAME:-webflow-template-review-mcp}"
WORKER_CONFIG="${WORKER_CONFIG:-packages/webflow-template-review-mcp/worker/wrangler.toml}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing required command: $1" >&2
    exit 1
  }
}

infisical_get_secret() {
  local key="$1"
  local -a cmd=(
    infisical secrets get "$key"
    --plain
    --silent
    --env="$INFISICAL_ENV"
    --path="$INFISICAL_PATH"
    --include-imports="$INFISICAL_INCLUDE_IMPORTS"
  )
  if [[ -n "$INFISICAL_PROJECT_ID" ]]; then
    cmd+=(--projectId="$INFISICAL_PROJECT_ID")
  fi
  "${cmd[@]}"
}

put_secret() {
  local worker_key="$1"
  local value="$2"
  printf '%s' "$value" | wrangler secret put "$worker_key" --name "$WORKER_NAME" --config "$WORKER_CONFIG" >/dev/null
}

sync_secret() {
  local infisical_key="$1"
  local worker_key="${2:-$1}"
  local value

  value="$(infisical_get_secret "$infisical_key")"
  if [[ -z "$value" ]]; then
    echo "missing ${infisical_key} in Infisical" >&2
    exit 1
  fi

  put_secret "$worker_key" "$value"
  echo "synced:${infisical_key}->${worker_key}"
}

sync_optional_secret() {
  local infisical_key="$1"
  local worker_key="${2:-$1}"
  local value

  value="$(infisical_get_secret "$infisical_key" 2>/dev/null || true)"
  if [[ -z "$value" ]]; then
    echo "skipped:${infisical_key}->${worker_key} (not present in Infisical)"
    return 0
  fi

  put_secret "$worker_key" "$value"
  echo "synced:${infisical_key}->${worker_key}"
}

main() {
  require_cmd infisical
  require_cmd wrangler

  sync_secret "AIRTABLE_API_KEY"
  sync_optional_secret "REVIEWER_DIRECTORY_JSON"
  sync_secret "WEBFLOW_TEMPLATE_REVIEW_MCP_API_KEY" "MCP_API_KEY"
  sync_secret "WEBFLOW_SITE_ANALYZER_MCP_API_KEY"
  sync_secret "BRAINTRUST_API_KEY"
  sync_secret "BRAINTRUST_PROJECT_ID"

  echo "webflow template review secret sync complete"
  echo "worker=${WORKER_NAME}"
}

main "$@"
