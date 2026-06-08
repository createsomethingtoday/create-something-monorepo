#!/usr/bin/env bash
set -euo pipefail

# ARCHIVED: Auth0 is no longer the current .agency portal identity provider.
# Keep this script for historical reviewer export/rollback only; do not use it for new Clerk provisioning.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST_FILE="${MANIFEST_FILE:-$ROOT_DIR/specs/webflow-marketplace/delivery/template-review-hub/auth0-reviewer-user-manifest.json}"
AUTH0_CONNECTION="${AUTH0_CONNECTION:-}"
DRY_RUN="${DRY_RUN:-false}"
SEND_PASSWORD_RESET="${SEND_PASSWORD_RESET:-true}"

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

get_management_token() {
  local audience="${AUTH0_AUDIENCE:-https://${AUTH0_DOMAIN}/api/v2/}"

  curl -fsS "https://${AUTH0_DOMAIN}/oauth/token" \
    -H 'content-type: application/json' \
    -d "$(jq -cn \
      --arg client_id "$AUTH0_CLIENT_ID" \
      --arg client_secret "$AUTH0_CLIENT_SECRET" \
      --arg audience "$audience" \
      '{
        client_id: $client_id,
        client_secret: $client_secret,
        audience: $audience,
        grant_type: "client_credentials"
      }')" \
    | jq -r '.access_token'
}

lookup_user_id() {
  local token="$1"
  local email="$2"
  local query
  query="$(python3 - <<'PY' "$email"
import sys, urllib.parse
print(urllib.parse.quote(sys.argv[1], safe=''))
PY
)"

  curl -fsS "https://${AUTH0_DOMAIN}/api/v2/users-by-email?email=${query}" \
    -H "authorization: Bearer ${token}" \
    | jq -r '.[0].user_id // empty'
}

create_user() {
  local token="$1"
  local payload="$2"

  curl -fsS "https://${AUTH0_DOMAIN}/api/v2/users" \
    -H "authorization: Bearer ${token}" \
    -H 'content-type: application/json' \
    -d "$payload" \
    | jq -r '.user_id'
}

generate_password() {
  python3 - <<'PY'
import secrets
alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+"
print(''.join(secrets.choice(alphabet) for _ in range(32)))
PY
}

send_password_reset() {
  local email="$1"

  curl -fsS "https://${AUTH0_DOMAIN}/dbconnections/change_password" \
    -H 'content-type: application/json' \
    -d "$(jq -cn \
      --arg client_id "$AUTH0_CLIENT_ID" \
      --arg email "$email" \
      --arg connection "$AUTH0_CONNECTION" \
      '{
        client_id: $client_id,
        email: $email,
        connection: $connection
      }')" >/dev/null
}

main() {
  require_cmd curl
  require_cmd jq
  require_cmd python3

  cd "$ROOT_DIR"
  load_env_file "$ROOT_DIR/.env"
  load_env_file "$ROOT_DIR/.env.local"

  require_env AUTH0_DOMAIN
  require_env AUTH0_CLIENT_ID
  require_env AUTH0_CLIENT_SECRET

  if [[ -z "$AUTH0_CONNECTION" ]]; then
    echo "missing required environment variable: AUTH0_CONNECTION" >&2
    exit 1
  fi

  if [[ ! -f "$MANIFEST_FILE" ]]; then
    echo "manifest not found: $MANIFEST_FILE" >&2
    exit 1
  fi

  local token
  token="$(get_management_token)"

  jq -c '.[]' "$MANIFEST_FILE" | while IFS= read -r row; do
    local email name existing_id payload created_id temp_password
    email="$(printf '%s' "$row" | jq -r '.email')"
    name="$(printf '%s' "$row" | jq -r '.name')"
    existing_id="$(lookup_user_id "$token" "$email")"

    if [[ -n "$existing_id" ]]; then
      echo "exists  ${email}  ${existing_id}"
      continue
    fi

    temp_password="$(generate_password)"
    payload="$(printf '%s' "$row" | jq -c --arg connection "$AUTH0_CONNECTION" --arg password "$temp_password" '. + {connection: $connection, password: $password}')"

    if [[ "$DRY_RUN" == "true" ]]; then
      echo "create  ${email}  ${name}"
      continue
    fi

    created_id="$(create_user "$token" "$payload")"
    echo "created ${email}  ${created_id}"

    if [[ "$SEND_PASSWORD_RESET" == "true" ]]; then
      send_password_reset "$email"
      echo "reset   ${email}"
    fi
  done
}

main "$@"
