#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME="${PROJECT_NAME:-abundance-concierge-chat}"
INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/agency/abundance/geo}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
INFISICAL_INCLUDE_IMPORTS="${INFISICAL_INCLUDE_IMPORTS:-true}"
DRY_RUN="${DRY_RUN:-false}"

REQUIRED_KEYS=(
  ABUNDANCE_GEO_MAPBOX_ACCESS_TOKEN
)

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "missing required command: $1" >&2
    exit 1
  fi
}

get_secret_value() {
  local key="$1"

  local -a get_cmd=(
    infisical secrets get
    "$key"
    --env="$INFISICAL_ENV"
    --path="$INFISICAL_PATH"
    --include-imports="$INFISICAL_INCLUDE_IMPORTS"
    --output=json
  )

  if [[ -n "$INFISICAL_PROJECT_ID" ]]; then
    get_cmd+=(--projectId="$INFISICAL_PROJECT_ID")
  fi

  local payload
  payload="$("${get_cmd[@]}")"

  printf '%s' "$payload" | jq -r '
    if type == "array" then
      .[0].secretValue // empty
    else
      .secretValue // empty
    end
  '
}

put_secret() {
  local key="$1"
  local value="$2"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] pnpm --filter @create-something/concierge-chat exec wrangler pages secret put ${key} --project-name=${PROJECT_NAME}"
    return 0
  fi

  printf '%s' "$value" | pnpm --filter @create-something/concierge-chat exec wrangler pages secret put "$key" --project-name="$PROJECT_NAME"
}

main() {
  require_cmd infisical
  require_cmd jq
  require_cmd pnpm

  local key
  for key in "${REQUIRED_KEYS[@]}"; do
    local value
    value="$(get_secret_value "$key")"
    if [[ -z "$value" || "$value" == "*not found*" ]]; then
      echo "missing required Infisical secret: ${key} (env=${INFISICAL_ENV} path=${INFISICAL_PATH})" >&2
      exit 1
    fi
    put_secret "$key" "$value"
  done

  echo "synced concierge geo secrets to Cloudflare Pages project=${PROJECT_NAME} from Infisical env=${INFISICAL_ENV} path=${INFISICAL_PATH}"
}

main "$@"
