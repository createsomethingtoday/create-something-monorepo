#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTE_DIR="$ROOT_DIR/packages/webflow-site-analyzer-mcp/workers/remote"
WRANGLER_RUNNER="$ROOT_DIR/scripts/run-wrangler.mjs"
REMOTE_WORKER="webflow-site-analyzer-mcp-remote"

INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/}"
INFISICAL_INCLUDE_IMPORTS="${INFISICAL_INCLUDE_IMPORTS:-true}"
DRY_RUN="${DRY_RUN:-false}"

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

load_secrets_from_infisical() {
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

  local payload
  payload="$("${export_cmd[@]}")"

  while IFS=$'\t' read -r key value; do
    export "${key}=${value}"
  done < <(
    printf '%s' "$payload" | jq -r '
      if type == "array" then
        .[] | select(.key != null) | [.key, (.value | tostring)]
      else
        to_entries[] | [.key, (.value | tostring)]
      end
      | @tsv
    '
  )
}

require_secret() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "missing required secret: ${name}" >&2
    return 1
  fi
}

put_secret() {
  local key="$1"
  local value="$2"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] wrangler secret put ${key} --name ${REMOTE_WORKER}"
    return 0
  fi

  printf '%s' "$value" | node "$WRANGLER_RUNNER" --cwd packages/webflow-site-analyzer-mcp/workers/remote secret put "$key" --name "$REMOTE_WORKER"
}

INFISICAL_INCLUDE_IMPORTS="$(normalize_bool_or_fail "$INFISICAL_INCLUDE_IMPORTS")"
DRY_RUN="$(normalize_bool_or_fail "$DRY_RUN")"

require_cmd jq
require_cmd infisical

load_secrets_from_infisical

missing=0
require_secret "WEBFLOW_SITE_ANALYZER_MCP_API_KEY" || missing=1
if [[ -z "${STEEL_API_KEY:-}" && -z "${BROWSERLESS_TOKEN:-}" && -z "${BROWSERLESS_API_KEY:-}" ]]; then
  echo "missing required browser provider secret: set STEEL_API_KEY or BROWSERLESS_TOKEN/BROWSERLESS_API_KEY" >&2
  missing=1
fi

if [[ "$missing" == "1" ]]; then
  echo "webflow analyzer remote secret validation failed" >&2
  exit 1
fi

put_secret "WEBFLOW_SITE_ANALYZER_MCP_API_KEY" "$WEBFLOW_SITE_ANALYZER_MCP_API_KEY"

if [[ -n "${STEEL_API_KEY:-}" ]]; then
  put_secret "STEEL_API_KEY" "$STEEL_API_KEY"
fi

if [[ -n "${BROWSERLESS_TOKEN:-}" ]]; then
  put_secret "BROWSERLESS_TOKEN" "$BROWSERLESS_TOKEN"
elif [[ -n "${BROWSERLESS_API_KEY:-}" ]]; then
  put_secret "BROWSERLESS_API_KEY" "$BROWSERLESS_API_KEY"
fi

if [[ -n "${BROWSERLESS_ENDPOINT:-}" ]]; then
  put_secret "BROWSERLESS_ENDPOINT" "$BROWSERLESS_ENDPOINT"
fi

if [[ -n "${BRAINTRUST_API_KEY:-}" ]]; then
  put_secret "BRAINTRUST_API_KEY" "$BRAINTRUST_API_KEY"
fi

if [[ -n "${BRAINTRUST_PROJECT_ID:-}" ]]; then
  put_secret "BRAINTRUST_PROJECT_ID" "$BRAINTRUST_PROJECT_ID"
fi

echo "webflow-site-analyzer remote vault sync complete."
