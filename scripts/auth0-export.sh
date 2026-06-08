#!/usr/bin/env bash
set -euo pipefail

# ARCHIVED: Auth0 is no longer the current .agency portal identity provider.
# Keep this script for historical tenant export/rollback only; do not use it for new Clerk provisioning.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${OUTPUT_DIR:-auth0/export}"
FORMAT="${FORMAT:-yaml}"
CONFIG_FILE="${CONFIG_FILE:-auth0/config.json}"
EXAMPLE_CONFIG="auth0/config.example.json"
INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
INFISICAL_INCLUDE_IMPORTS="${INFISICAL_INCLUDE_IMPORTS:-true}"

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

load_env_file() {
  local env_file="$1"
  if [[ -f "$env_file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a
  fi
}

have_auth0_credentials() {
  [[ -n "${AUTH0_DOMAIN:-}" && -n "${AUTH0_CLIENT_ID:-}" && -n "${AUTH0_CLIENT_SECRET:-}" ]]
}

load_infisical_env() {
  require_cmd infisical

  local -a export_cmd=(
    infisical export
    --format=dotenv
    --env="$INFISICAL_ENV"
    --path="$INFISICAL_PATH"
    --include-imports="$INFISICAL_INCLUDE_IMPORTS"
  )

  if [[ -n "$INFISICAL_PROJECT_ID" ]]; then
    export_cmd+=(--projectId="$INFISICAL_PROJECT_ID")
  fi

  local tmp_env
  tmp_env="$(mktemp)"
  "${export_cmd[@]}" >"$tmp_env"
  load_env_file "$tmp_env"
  rm -f "$tmp_env"
}

ensure_config_file() {
  if [[ -f "$CONFIG_FILE" ]]; then
    return 0
  fi

  mkdir -p "$(dirname "$CONFIG_FILE")"
  cat >"$CONFIG_FILE" <<EOF
{
  "AUTH0_ALLOW_DELETE": false,
  "AUTH0_KEYWORD_REPLACE_MAPPINGS": {
    "AUTH0_DOMAIN": "${AUTH0_DOMAIN}"
  }
}
EOF
  chmod 600 "$CONFIG_FILE"
  echo "created ${CONFIG_FILE} from environment"
}

main() {
  require_cmd a0deploy

  cd "$ROOT_DIR"
  load_env_file "$ROOT_DIR/.env"
  load_env_file "$ROOT_DIR/.env.local"

  if ! have_auth0_credentials; then
    load_infisical_env
  fi

  require_env AUTH0_DOMAIN
  require_env AUTH0_CLIENT_ID
  require_env AUTH0_CLIENT_SECRET

  if [[ ! -f "$CONFIG_FILE" && ! -f "$EXAMPLE_CONFIG" ]]; then
    echo "missing ${EXAMPLE_CONFIG}" >&2
    exit 1
  fi

  ensure_config_file
  mkdir -p "$OUTPUT_DIR"
  a0deploy export -c "$CONFIG_FILE" -f "$FORMAT" -o "$OUTPUT_DIR"
}

main "$@"
