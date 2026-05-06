#!/usr/bin/env bash
set -euo pipefail

INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/retool}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
INFISICAL_TOKEN="${INFISICAL_TOKEN:-}"
INFISICAL_API_URL="${INFISICAL_API_URL:-https://app.infisical.com}"
INFISICAL_INCLUDE_METADATA="${INFISICAL_INCLUDE_METADATA:-true}"

RETOOL_ORIGIN="${RETOOL_ORIGIN:-https://createsomething.retool.com}"
RETOOL_API_BASE_URL="${RETOOL_API_BASE_URL:-${RETOOL_ORIGIN%/}/api/v2}"
RETOOL_MCP_URL="${RETOOL_MCP_URL:-${RETOOL_ORIGIN%/}/mcp}"
RETOOL_API_TOKEN_SECRET_NAME="${RETOOL_API_TOKEN_SECRET_NAME:-RETOOL_API_TOKEN}"
RETOOL_MIN_TOKEN_LENGTH="${RETOOL_MIN_TOKEN_LENGTH:-40}"
TOKEN_SOURCE="${TOKEN_SOURCE:-clipboard}"
TMP_SECRET_FILE=""

cleanup() {
  if [[ -n "${TMP_SECRET_FILE:-}" ]]; then
    rm -f "$TMP_SECRET_FILE"
  fi
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "missing required command: $1" >&2
    exit 1
  fi
}

quote_env_value() {
  local value="$1"
  printf "'%s'" "$(printf '%s' "$value" | sed "s/'/'\\\\''/g")"
}

read_token() {
  case "$TOKEN_SOURCE" in
    clipboard)
      require_cmd pbpaste
      pbpaste
      ;;
    stdin)
      cat
      ;;
    *)
      echo "invalid TOKEN_SOURCE: ${TOKEN_SOURCE} (expected clipboard|stdin)" >&2
      exit 1
      ;;
  esac
}

ensure_infisical_folder() {
  local path="$1"
  if [[ "$path" == "/" || -z "$path" ]]; then
    return 0
  fi

  local current="/"
  local relative="${path#/}"
  IFS='/' read -r -a parts <<<"$relative"
  for part in "${parts[@]}"; do
    [[ -z "$part" ]] && continue
    local -a folder_cmd=(
      infisical secrets folders create
      --env "$INFISICAL_ENV"
      --path "$current"
      --name "$part"
      --silent
    )
    if [[ -n "$INFISICAL_PROJECT_ID" ]]; then
      folder_cmd+=(--projectId "$INFISICAL_PROJECT_ID")
    fi
    if [[ -n "$INFISICAL_TOKEN" ]]; then
      folder_cmd+=(--token "$INFISICAL_TOKEN")
    fi
    INFISICAL_API_URL="$INFISICAL_API_URL" "${folder_cmd[@]}" >/dev/null 2>&1 || true
    if [[ "$current" == "/" ]]; then
      current="/$part"
    else
      current="$current/$part"
    fi
  done
}

main() {
  require_cmd infisical
  require_cmd mktemp

  local token
  token="$(read_token | tr -d '\r\n' | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"
  if [[ -z "$token" ]]; then
    echo "no token found from ${TOKEN_SOURCE}" >&2
    exit 1
  fi

  if [[ "$token" =~ [[:space:]] ]]; then
    echo "refusing to store token: token contains whitespace" >&2
    exit 1
  fi

  if (( ${#token} < RETOOL_MIN_TOKEN_LENGTH )); then
    echo "refusing to store token: token length ${#token} is shorter than RETOOL_MIN_TOKEN_LENGTH=${RETOOL_MIN_TOKEN_LENGTH}" >&2
    echo "copy the generated Retool API token, then rerun this script" >&2
    exit 1
  fi

  ensure_infisical_folder "$INFISICAL_PATH"

  local tmp
  tmp="$(mktemp)"
  TMP_SECRET_FILE="$tmp"
  chmod 600 "$tmp"
  trap cleanup EXIT

  {
    printf '%s=%s\n' "$RETOOL_API_TOKEN_SECRET_NAME" "$(quote_env_value "$token")"
    if [[ "$INFISICAL_INCLUDE_METADATA" == "true" ]]; then
      printf 'RETOOL_ORIGIN=%s\n' "$(quote_env_value "$RETOOL_ORIGIN")"
      printf 'RETOOL_API_BASE_URL=%s\n' "$(quote_env_value "$RETOOL_API_BASE_URL")"
      printf 'RETOOL_MCP_URL=%s\n' "$(quote_env_value "$RETOOL_MCP_URL")"
      printf 'RETOOL_MCP_SERVER_NAME=%s\n' "$(quote_env_value "retool")"
    fi
  } >"$tmp"

  local -a cmd=(
    infisical secrets set
    --file "$tmp"
    --env "$INFISICAL_ENV"
    --path "$INFISICAL_PATH"
    --silent
  )
  if [[ -n "$INFISICAL_PROJECT_ID" ]]; then
    cmd+=(--projectId "$INFISICAL_PROJECT_ID")
  fi
  if [[ -n "$INFISICAL_TOKEN" ]]; then
    cmd+=(--token "$INFISICAL_TOKEN")
  fi

  INFISICAL_API_URL="$INFISICAL_API_URL" "${cmd[@]}" >/dev/null

  echo "stored Retool secrets in Infisical env=${INFISICAL_ENV} path=${INFISICAL_PATH}"
  echo "stored names: ${RETOOL_API_TOKEN_SECRET_NAME}, RETOOL_ORIGIN, RETOOL_API_BASE_URL, RETOOL_MCP_URL, RETOOL_MCP_SERVER_NAME"
}

main "$@"
