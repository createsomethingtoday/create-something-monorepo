#!/usr/bin/env bash
set -euo pipefail

INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/agency/funnel}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
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

put_secret() {
  local key="$1"
  local value="$2"
  local -a cmd=(
    infisical secrets set
    "$key=$value"
    --env="$INFISICAL_ENV"
    --path="$INFISICAL_PATH"
  )

  if [[ -n "$INFISICAL_PROJECT_ID" ]]; then
    cmd+=(--projectId="$INFISICAL_PROJECT_ID")
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] ${cmd[*]//$value/<redacted>}"
    return 0
  fi

  "${cmd[@]}" >/dev/null
}

main() {
  require_cmd infisical

  local key
  for key in "${REQUIRED_KEYS[@]}"; do
    local value="${!key:-}"
    if [[ -z "$value" ]]; then
      echo "missing required environment variable: ${key}" >&2
      exit 1
    fi
    put_secret "$key" "$value"
  done

  for key in "${OPTIONAL_KEYS[@]}"; do
    local value="${!key:-}"
    if [[ -n "$value" ]]; then
      put_secret "$key" "$value"
    fi
  done

  echo "seeded funnel automation runtime secrets into Infisical env=${INFISICAL_ENV} path=${INFISICAL_PATH}"
}

main "$@"
