#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WRANGLER_RUNNER=(
  node
  "$ROOT_DIR/scripts/run-wrangler.mjs"
  --cwd
  packages/agency
)
PROJECT_NAME="${PROJECT_NAME:-create-something-agency}"
INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/agency/funnel}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
INFISICAL_INCLUDE_IMPORTS="${INFISICAL_INCLUDE_IMPORTS:-true}"
DRY_RUN="${DRY_RUN:-false}"

REQUIRED_KEYS=(
  FUNNEL_AUTOMATION_ENABLED
)

OPTIONAL_KEYS=(
  FUNNEL_AUTOMATION_COMPOSIO_USER_ID
  FUNNEL_AUTOMATION_SLACK_CHANNEL
  FUNNEL_AUTOMATION_SLACK_CONNECTED_ACCOUNT_ID
  FUNNEL_AUTOMATION_SLACK_TOOL_SLUG
  FUNNEL_AUTOMATION_NOTION_DATABASE_ID
  FUNNEL_AUTOMATION_NOTION_CONNECTED_ACCOUNT_ID
  FUNNEL_AUTOMATION_NOTION_GET_DATABASE_TOOL_SLUG
  FUNNEL_AUTOMATION_NOTION_CREATE_PAGE_TOOL_SLUG
  FUNNEL_AUTOMATION_NOTION_UPDATE_PAGE_TOOL_SLUG
  FUNNEL_AUTOMATION_GMAIL_ENABLED
  FUNNEL_AUTOMATION_GMAIL_CONNECTED_ACCOUNT_ID
  FUNNEL_AUTOMATION_GMAIL_DRAFT_TOOL_SLUG
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
  local key="$1"
  local value="$2"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] wrangler pages secret put ${key} --project-name=${PROJECT_NAME}"
    return 0
  fi

  printf '%s' "$value" | "${WRANGLER_RUNNER[@]}" pages secret put "$key" --project-name="$PROJECT_NAME"
}

main() {
  require_cmd infisical
  require_cmd jq
  require_cmd node

  local payload
  payload="$(load_infisical_payload)"

  local key
  for key in "${REQUIRED_KEYS[@]}"; do
    local value
    value="$(get_secret_value "$payload" "$key")"
    if [[ -z "$value" ]]; then
      echo "missing required Infisical secret: ${key} (env=${INFISICAL_ENV} path=${INFISICAL_PATH})" >&2
      exit 1
    fi
    put_secret "$key" "$value"
  done

  for key in "${OPTIONAL_KEYS[@]}"; do
    local value
    value="$(get_secret_value "$payload" "$key")"
    if [[ -n "$value" ]]; then
      put_secret "$key" "$value"
    fi
  done

  echo "synced funnel automation runtime secrets to Cloudflare Pages project=${PROJECT_NAME} from Infisical env=${INFISICAL_ENV} path=${INFISICAL_PATH}"
}

main "$@"
