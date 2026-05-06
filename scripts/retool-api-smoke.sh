#!/usr/bin/env bash
set -euo pipefail

INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/retool}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
INFISICAL_TOKEN="${INFISICAL_TOKEN:-}"
INFISICAL_API_URL="${INFISICAL_API_URL:-https://app.infisical.com}"
INFISICAL_INCLUDE_IMPORTS="${INFISICAL_INCLUDE_IMPORTS:-true}"
LOAD_FROM_VAULT="${LOAD_FROM_VAULT:-true}"

RETOOL_ORIGIN="${RETOOL_ORIGIN:-https://createsomething.retool.com}"
RETOOL_API_BASE_URL="${RETOOL_API_BASE_URL:-${RETOOL_ORIGIN%/}/api/v2}"
RETOOL_API_SMOKE_PATH="${RETOOL_API_SMOKE_PATH:-/users}"
RETOOL_API_SMOKE_ACCEPT_FORBIDDEN="${RETOOL_API_SMOKE_ACCEPT_FORBIDDEN:-true}"
TMP_BODY_FILE=""

cleanup() {
  if [[ -n "${TMP_BODY_FILE:-}" ]]; then
    rm -f "$TMP_BODY_FILE"
  fi
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "missing required command: $1" >&2
    exit 1
  fi
}

load_from_infisical() {
  require_cmd infisical
  require_cmd jq

  local -a cmd=(
    infisical export
    --format=json
    --env "$INFISICAL_ENV"
    --path "$INFISICAL_PATH"
    --include-imports="$INFISICAL_INCLUDE_IMPORTS"
  )
  if [[ -n "$INFISICAL_PROJECT_ID" ]]; then
    cmd+=(--projectId "$INFISICAL_PROJECT_ID")
  fi
  if [[ -n "$INFISICAL_TOKEN" ]]; then
    cmd+=(--token "$INFISICAL_TOKEN")
  fi

  local payload
  payload="$(INFISICAL_API_URL="$INFISICAL_API_URL" "${cmd[@]}")"
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

main() {
  require_cmd curl

  if [[ "$LOAD_FROM_VAULT" == "true" ]]; then
    load_from_infisical
  fi

  if [[ -z "${RETOOL_API_TOKEN:-}" ]]; then
    echo "missing RETOOL_API_TOKEN" >&2
    exit 1
  fi

  local url="${RETOOL_API_BASE_URL%/}${RETOOL_API_SMOKE_PATH}"
  local body_file status
  body_file="$(mktemp)"
  TMP_BODY_FILE="$body_file"
  trap cleanup EXIT

  status="$(
    curl -sS -o "$body_file" -w "%{http_code}" \
      -H "Authorization: Bearer ${RETOOL_API_TOKEN}" \
      -H "Accept: application/json" \
      "$url"
  )"

  if [[ "$status" == "403" && "$RETOOL_API_SMOKE_ACCEPT_FORBIDDEN" == "true" ]]; then
    echo "Retool API auth ok but scope denied path=${RETOOL_API_SMOKE_PATH}"
    head -c 500 "$body_file" || true
    echo
    return 0
  fi

  if [[ "$status" != "200" ]]; then
    echo "Retool API smoke failed status=${status} path=${RETOOL_API_SMOKE_PATH}" >&2
    head -c 500 "$body_file" >&2 || true
    echo >&2
    exit 1
  fi

  echo "Retool API smoke ok path=${RETOOL_API_SMOKE_PATH}"
}

main "$@"
