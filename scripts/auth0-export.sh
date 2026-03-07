#!/usr/bin/env bash
set -euo pipefail

OUTPUT_DIR="${OUTPUT_DIR:-auth0/export}"
FORMAT="${FORMAT:-yaml}"
CONFIG_FILE="${CONFIG_FILE:-auth0/config.json}"
EXAMPLE_CONFIG="auth0/config.example.json"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "missing required command: $1" >&2
    exit 1
  fi
}

require_env() {
  local key="$1"
  if [[ -z "${!key:-}" ]]; then
    echo "missing required environment variable: ${key}" >&2
    exit 1
  fi
}

main() {
  require_cmd a0deploy

  if [[ ! -f "$CONFIG_FILE" ]]; then
    if [[ -f "$EXAMPLE_CONFIG" ]]; then
      echo "missing ${CONFIG_FILE}. Copy ${EXAMPLE_CONFIG} to ${CONFIG_FILE} and fill in Auth0 credentials." >&2
    else
      echo "missing ${CONFIG_FILE}" >&2
    fi
    exit 1
  fi

  require_env AUTH0_DOMAIN
  require_env AUTH0_CLIENT_ID
  require_env AUTH0_CLIENT_SECRET

  mkdir -p "$OUTPUT_DIR"
  a0deploy export -c "$CONFIG_FILE" -f "$FORMAT" -o "$OUTPUT_DIR"
}

main "$@"
