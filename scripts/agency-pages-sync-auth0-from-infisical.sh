#!/usr/bin/env bash
set -euo pipefail

# ARCHIVED: Auth0 is no longer the current .agency portal identity provider.
# Keep this script for historical Pages secret sync/rollback only; do not use it for new Clerk provisioning.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_NAME="${PROJECT_NAME:-create-something-agency}"
INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/agency/auth}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
INFISICAL_INCLUDE_IMPORTS="${INFISICAL_INCLUDE_IMPORTS:-true}"
DRY_RUN="${DRY_RUN:-false}"

REQUIRED_KEYS=(
  AUTH0_DOMAIN
  AUTH0_CLIENT_ID
  AUTH0_CLIENT_SECRET
  AUTH0_ISSUER_BASE_URL
  AUTH0_JWKS_URL
)

OPTIONAL_KEYS=(
  AUTH0_AUDIENCE
  AUTH0_SCOPE
  AUTH0_CLAIMS_NAMESPACE
  AUTH0_REDIRECT_URI
)

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "missing required command: $1" >&2
    exit 1
  fi
}

detect_root_path_drift() {
  if [[ "$INFISICAL_PATH" == "/" ]]; then
    return 0
  fi

  local root_payload
  local -a export_cmd=(
    infisical export
    --format=json
    --env="$INFISICAL_ENV"
    --path="/"
    --include-imports="$INFISICAL_INCLUDE_IMPORTS"
  )

  if [[ -n "$INFISICAL_PROJECT_ID" ]]; then
    export_cmd+=(--projectId="$INFISICAL_PROJECT_ID")
  fi

  root_payload="$("${export_cmd[@]}")"

  local root_keys
  root_keys="$(printf '%s' "$root_payload" | jq -r '
    if type == "array" then
      map(select(.key | startswith("AUTH0_"))) | map(.key) | unique | .[]
    else
      to_entries | map(select(.key | startswith("AUTH0_"))) | map(.key) | unique | .[]
    end
  ' 2>/dev/null || true)"

  if [[ -n "$root_keys" ]]; then
    echo "Auth0 secrets exist at Infisical root path '/' while canonical path is '${INFISICAL_PATH}'." >&2
    echo "Remove the root-path copies before syncing to Pages to avoid path drift:" >&2
    printf '%s\n' "$root_keys" >&2
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

  printf '%s' "$value" | pnpm --dir "$ROOT_DIR/packages/agency" exec wrangler pages secret put "$key" --project-name="$PROJECT_NAME"
}

main() {
  require_cmd infisical
  require_cmd jq
  require_cmd pnpm
  detect_root_path_drift

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

  echo "synced Auth0 secrets to Cloudflare Pages project=${PROJECT_NAME} from Infisical env=${INFISICAL_ENV} path=${INFISICAL_PATH}"
}

main "$@"
