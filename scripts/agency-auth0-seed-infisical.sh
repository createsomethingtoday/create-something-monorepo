#!/usr/bin/env bash
set -euo pipefail

INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/agency/auth}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
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

  echo "seeded Auth0 secrets into Infisical env=${INFISICAL_ENV} path=${INFISICAL_PATH}"
}

main "$@"
