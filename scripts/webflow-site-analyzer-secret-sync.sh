#!/usr/bin/env bash
set -euo pipefail

INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/}"
INFISICAL_INCLUDE_IMPORTS="${INFISICAL_INCLUDE_IMPORTS:-true}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
WORKER_NAME="${WORKER_NAME:-webflow-site-analyzer-mcp}"
WORKER_CONFIG="${WORKER_CONFIG:-packages/webflow-site-analyzer-mcp/wrangler.toml}"

REQUIRED_SECRETS=(
  "STEEL_API_KEY"
  "BROWSERLESS_API_KEY"
  "WEBFLOW_SITE_ANALYZER_MCP_API_KEY"
  "WEBFLOW_GROQ_API_KEY"
  "WEBFLOW_OPENAI_API_KEY"
)

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
  local key="$1"
  local value="$2"
  printf '%s' "$value" | wrangler secret put "$key" --name "$WORKER_NAME" --config "$WORKER_CONFIG" >/dev/null
}

main() {
  require_cmd infisical
  require_cmd wrangler

  local key value
  for key in "${REQUIRED_SECRETS[@]}"; do
    value="$(infisical_get_secret "$key")"
    if [[ -z "$value" ]]; then
      echo "missing ${key} in Infisical" >&2
      exit 1
    fi
    put_secret "$key" "$value"
    echo "synced:${key}"
  done

  echo "webflow site analyzer secret sync complete"
  echo "worker=${WORKER_NAME}"
}

main "$@"
