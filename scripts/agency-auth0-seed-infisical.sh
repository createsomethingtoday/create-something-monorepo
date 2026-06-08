#!/usr/bin/env bash
set -euo pipefail

# ARCHIVED: Auth0 is no longer the current .agency portal identity provider.
# Keep this script for historical export/rollback only; do not use it for new Clerk provisioning.

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
  root_payload="$(infisical export --format=json --env="$INFISICAL_ENV" --path="/" --include-imports=true ${INFISICAL_PROJECT_ID:+--projectId="$INFISICAL_PROJECT_ID"})"

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
    echo "Remove the root-path copies before seeding to avoid path drift:" >&2
    printf '%s\n' "$root_keys" >&2
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
  require_cmd jq
  detect_root_path_drift

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
