#!/usr/bin/env bash
set -euo pipefail

INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/agency/auth}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
DRY_RUN="${DRY_RUN:-false}"

PUBLISHABLE_KEY_ALIASES=(
  CLERK_PUBLISHABLE_KEY
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  PUBLIC_CLERK_PUBLISHABLE_KEY
)

REQUIRED_KEYS=(
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
  root_payload="$(infisical export --format=json --env="$INFISICAL_ENV" --path="/" --include-imports=true ${INFISICAL_PROJECT_ID:+--projectId="$INFISICAL_PROJECT_ID"})"

  local root_keys
  root_keys="$(printf '%s' "$root_payload" | jq -r '
    if type == "array" then
      map(select((.key // .secretKey // "") | test("^(CLERK_|NEXT_PUBLIC_CLERK_|PUBLIC_CLERK_)"))) | map(.key // .secretKey) | unique | .[]
    else
      to_entries | map(select(.key | test("^(CLERK_|NEXT_PUBLIC_CLERK_|PUBLIC_CLERK_)"))) | map(.key) | unique | .[]
    end
  ' 2>/dev/null || true)"

  if [[ -n "$root_keys" ]]; then
    echo "Clerk secrets exist at Infisical root path '/' while canonical path is '${INFISICAL_PATH}'." >&2
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

get_publishable_key_value() {
  local key
  for key in "${PUBLISHABLE_KEY_ALIASES[@]}"; do
    local value="${!key:-}"
    if [[ -n "$value" ]]; then
      printf '%s' "$value"
      return 0
    fi
  done

  return 1
}

main() {
  require_cmd infisical
  require_cmd jq
  detect_root_path_drift

  local publishable_key
  if ! publishable_key="$(get_publishable_key_value)"; then
    echo "missing required environment variable: one of ${PUBLISHABLE_KEY_ALIASES[*]}" >&2
    exit 1
  fi
  put_secret CLERK_PUBLISHABLE_KEY "$publishable_key"
  put_secret NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY "$publishable_key"

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

  echo "seeded Clerk secrets into Infisical env=${INFISICAL_ENV} path=${INFISICAL_PATH}"
}

main "$@"
