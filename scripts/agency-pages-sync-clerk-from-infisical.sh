#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME="${PROJECT_NAME:-create-something-agency}"
INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/agency/auth}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
INFISICAL_INCLUDE_IMPORTS="${INFISICAL_INCLUDE_IMPORTS:-true}"
DRY_RUN="${DRY_RUN:-false}"

REQUIRED_KEYS=(
  CLERK_PUBLISHABLE_KEY
  CLERK_SECRET_KEY
)

OPTIONAL_KEYS=(
  CLERK_JWT_KEY
  CLERK_AUTHORIZED_PARTIES
  CLERK_ISSUER_URL
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
      map(select((.key // .secretKey // "") | startswith("CLERK_"))) | map(.key // .secretKey) | unique | .[]
    else
      to_entries | map(select(.key | startswith("CLERK_"))) | map(.key) | unique | .[]
    end
  ' 2>/dev/null || true)"

  if [[ -n "$root_keys" ]]; then
    echo "Clerk secrets exist at Infisical root path '/' while canonical path is '${INFISICAL_PATH}'." >&2
    echo "Remove the root-path copies before syncing to Pages to avoid path drift:" >&2
    printf '%s\n' "$root_keys" >&2
    exit 1
  fi
}

get_secret_value() {
  local key="$1"
  local -a get_cmd=(
    infisical secrets get
    "$key"
    --output=json
    --env="$INFISICAL_ENV"
    --path="$INFISICAL_PATH"
    --include-imports="$INFISICAL_INCLUDE_IMPORTS"
  )

  if [[ -n "$INFISICAL_PROJECT_ID" ]]; then
    get_cmd+=(--projectId="$INFISICAL_PROJECT_ID")
  fi

  "${get_cmd[@]}" | jq -r --arg key "$key" '
    if type == "array" then
      map(select((.key // .secretKey // "") == $key)) | .[0].value // .[0].secretValue // empty
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

  printf '%s' "$value" | node scripts/run-wrangler.mjs --cwd packages/agency pages secret put "$key" --project-name="$PROJECT_NAME"
}

main() {
  require_cmd infisical
  require_cmd jq
  require_cmd pnpm
  detect_root_path_drift

  local key
  for key in "${REQUIRED_KEYS[@]}"; do
    local value
    value="$(get_secret_value "$key")"
    if [[ -z "$value" ]]; then
      echo "missing required Infisical secret: ${key} (env=${INFISICAL_ENV} path=${INFISICAL_PATH})" >&2
      exit 1
    fi
    put_secret "$key" "$value"
  done

  for key in "${OPTIONAL_KEYS[@]}"; do
    local value
    value="$(get_secret_value "$key")"
    if [[ -n "$value" ]]; then
      put_secret "$key" "$value"
    fi
  done

  echo "synced Clerk secrets to Cloudflare Pages project=${PROJECT_NAME} from Infisical env=${INFISICAL_ENV} path=${INFISICAL_PATH}"
}

main "$@"
