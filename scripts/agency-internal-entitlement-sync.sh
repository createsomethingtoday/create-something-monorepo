#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IDENTITY_WORKER_CONFIG="$ROOT_DIR/packages/identity-worker/wrangler.toml"

INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/}"
INFISICAL_INCLUDE_IMPORTS="${INFISICAL_INCLUDE_IMPORTS:-true}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
PROJECT_NAME="${PROJECT_NAME:-create-something-agency}"
AGENCY_INTERNAL_API_URL="${AGENCY_INTERNAL_API_URL:-https://createsomething.agency}"
IDENTITY_WORKER_NAME="${IDENTITY_WORKER_NAME:-identity-worker}"
ROTATE_KEY="${ROTATE_KEY:-false}"
DEPLOY_AFTER_SYNC="${DEPLOY_AFTER_SYNC:-true}"
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
  lowered="$(printf '%s' "$raw" | tr '[:upper:]' '[:lower:]')"
  case "$lowered" in
    true | false) printf '%s' "$lowered" ;;
    *)
      echo "invalid boolean: ${raw} (expected true|false)" >&2
      exit 1
      ;;
  esac
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

infisical_set_secret() {
  local key="$1"
  local value="$2"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] infisical secrets set ${key}=<redacted> --env=${INFISICAL_ENV} --path=${INFISICAL_PATH}"
    return 0
  fi

  local -a cmd=(
    infisical secrets set "$key=$value"
    --silent
    --env="$INFISICAL_ENV"
    --path="$INFISICAL_PATH"
  )
  if [[ -n "$INFISICAL_PROJECT_ID" ]]; then
    cmd+=(--projectId="$INFISICAL_PROJECT_ID")
  fi
  "${cmd[@]}" >/dev/null
}

resolve_shared_key() {
  local existing=""
  if [[ "$ROTATE_KEY" == "false" ]]; then
    existing="$(infisical_get_secret "AGENCY_INTERNAL_API_KEY" 2>/dev/null || true)"
  fi

  if [[ -n "$existing" ]]; then
    printf '%s' "$existing"
    return 0
  fi

  openssl rand -hex 32
}

put_pages_secret() {
  local key="$1"
  local value="$2"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] wrangler pages secret put ${key} --project-name=${PROJECT_NAME}"
    return 0
  fi
  printf '%s' "$value" | wrangler pages secret put "$key" --project-name="$PROJECT_NAME" >/dev/null
}

put_worker_secret() {
  local key="$1"
  local value="$2"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] wrangler secret put ${key} --name ${IDENTITY_WORKER_NAME} --config ${IDENTITY_WORKER_CONFIG}"
    return 0
  fi
  printf '%s' "$value" | wrangler secret put "$key" --name "$IDENTITY_WORKER_NAME" --config "$IDENTITY_WORKER_CONFIG" >/dev/null
}

deploy_surfaces() {
  if [[ "$DEPLOY_AFTER_SYNC" != "true" ]]; then
    echo "deploy_after_sync=false; skipped deploy"
    return 0
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] pnpm --filter @create-something/identity-worker deploy"
    echo "[dry-run] pnpm --filter @create-something/agency deploy"
    return 0
  fi

  pnpm --filter @create-something/identity-worker deploy
  pnpm --filter @create-something/agency deploy
}

main() {
  require_cmd infisical
  require_cmd openssl
  require_cmd pnpm
  require_cmd wrangler

  INFISICAL_INCLUDE_IMPORTS="$(normalize_bool_or_fail "$INFISICAL_INCLUDE_IMPORTS")"
  ROTATE_KEY="$(normalize_bool_or_fail "$ROTATE_KEY")"
  DEPLOY_AFTER_SYNC="$(normalize_bool_or_fail "$DEPLOY_AFTER_SYNC")"
  DRY_RUN="$(normalize_bool_or_fail "$DRY_RUN")"

  local shared_key
  shared_key="$(resolve_shared_key)"

  infisical_set_secret "AGENCY_INTERNAL_API_KEY" "$shared_key"
  infisical_set_secret "AGENCY_INTERNAL_API_URL" "$AGENCY_INTERNAL_API_URL"

  put_pages_secret "AGENCY_INTERNAL_API_KEY" "$shared_key"
  put_worker_secret "AGENCY_INTERNAL_API_KEY" "$shared_key"
  put_worker_secret "AGENCY_INTERNAL_API_URL" "$AGENCY_INTERNAL_API_URL"

  deploy_surfaces

  echo "agency internal entitlement bridge sync complete."
  echo "project=${PROJECT_NAME}"
  echo "identity_worker=${IDENTITY_WORKER_NAME}"
  echo "url=${AGENCY_INTERNAL_API_URL}"
  echo "rotated_key=${ROTATE_KEY}"
  echo "deploy_after_sync=${DEPLOY_AFTER_SYNC}"
}

main "$@"
