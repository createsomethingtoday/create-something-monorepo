#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOOM_REMOTE_DIR="$ROOT_DIR/packages/loom-mcp-remote"
LOOM_REMOTE_CONFIG="$LOOM_REMOTE_DIR/wrangler.toml"
LOOM_REMOTE_WORKER="loom-mcp-remote"

VAULT_PROVIDER="${VAULT_PROVIDER:-infisical}"
LOAD_FROM_VAULT="${LOAD_FROM_VAULT:-true}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/loom}"
INFISICAL_INCLUDE_IMPORTS="${INFISICAL_INCLUDE_IMPORTS:-true}"
INFISICAL_API_URL="${INFISICAL_API_URL:-https://app.infisical.com}"
INFISICAL_ORGANIZATION_SLUG="${INFISICAL_ORGANIZATION_SLUG:-}"
INFISICAL_CLIENT_ID="${INFISICAL_CLIENT_ID:-}"
INFISICAL_CLIENT_SECRET="${INFISICAL_CLIENT_SECRET:-}"
INFISICAL_TOKEN="${INFISICAL_TOKEN:-}"
SYNC_BRAINTRUST="${SYNC_BRAINTRUST:-true}"
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
  lowered="$(echo "$raw" | tr '[:upper:]' '[:lower:]')"
  case "$lowered" in
    true | false) echo "$lowered" ;;
    *)
      echo "invalid boolean: ${raw} (expected true|false)" >&2
      exit 1
      ;;
  esac
}

normalize_provider_or_fail() {
  local raw="${1:-}"
  local lowered
  lowered="$(echo "$raw" | tr '[:upper:]' '[:lower:]')"
  case "$lowered" in
    infisical | env) echo "$lowered" ;;
    *)
      echo "invalid VAULT_PROVIDER: ${raw} (expected infisical|env)" >&2
      exit 1
      ;;
  esac
}

load_secrets_from_infisical() {
  local token="${INFISICAL_TOKEN:-}"

  if [[ -z "$token" ]] && [[ -n "${INFISICAL_CLIENT_ID:-}" || -n "${INFISICAL_CLIENT_SECRET:-}" ]]; then
    if [[ -z "${INFISICAL_CLIENT_ID:-}" || -z "${INFISICAL_CLIENT_SECRET:-}" ]]; then
      echo "for Universal Auth, both INFISICAL_CLIENT_ID and INFISICAL_CLIENT_SECRET are required" >&2
      exit 1
    fi
    require_cmd curl
    local auth_url="${INFISICAL_API_URL%/}/api/v1/auth/universal-auth/login"
    local auth_payload
    if [[ -n "$INFISICAL_ORGANIZATION_SLUG" ]]; then
      auth_payload="$(jq -cn \
        --arg clientId "$INFISICAL_CLIENT_ID" \
        --arg clientSecret "$INFISICAL_CLIENT_SECRET" \
        --arg organizationSlug "$INFISICAL_ORGANIZATION_SLUG" \
        '{clientId: $clientId, clientSecret: $clientSecret, organizationSlug: $organizationSlug}')"
    else
      auth_payload="$(jq -cn \
        --arg clientId "$INFISICAL_CLIENT_ID" \
        --arg clientSecret "$INFISICAL_CLIENT_SECRET" \
        '{clientId: $clientId, clientSecret: $clientSecret}')"
    fi
    token="$(
      curl -fsS "$auth_url" \
        --request POST \
        --header "Content-Type: application/json" \
        --data "$auth_payload" | jq -r '.accessToken // empty'
    )"
    if [[ -z "$token" ]]; then
      echo "failed to mint INFISICAL_TOKEN via Universal Auth" >&2
      exit 1
    fi
  fi

  local -a export_cmd=(
    infisical export
    --format=json
    --env="$INFISICAL_ENV"
    --path="$INFISICAL_PATH"
    --include-imports="$INFISICAL_INCLUDE_IMPORTS"
  )
  if [[ -n "$INFISICAL_PROJECT_ID" ]]; then
    export_cmd+=(--projectId="$INFISICAL_PROJECT_ID")
  fi

  local payload
  if [[ -n "$token" ]]; then
    payload="$(
      INFISICAL_API_URL="$INFISICAL_API_URL" \
      INFISICAL_TOKEN="$token" \
      "${export_cmd[@]}"
    )"
  else
    payload="$(
      INFISICAL_API_URL="$INFISICAL_API_URL" \
      "${export_cmd[@]}"
    )"
  fi

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

require_secret() {
  local name="$1"
  local value="${!name:-}"
  if [[ -z "$value" ]]; then
    echo "missing required secret: ${name}" >&2
    return 1
  fi
  return 0
}

put_secret() {
  local key="$1"
  local value="$2"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] wrangler secret put ${key} --name ${LOOM_REMOTE_WORKER} --config ${LOOM_REMOTE_CONFIG}"
    return 0
  fi

  printf '%s' "$value" | pnpm exec wrangler secret put "$key" --name "$LOOM_REMOTE_WORKER" --config "$LOOM_REMOTE_CONFIG"
}

VAULT_PROVIDER="$(normalize_provider_or_fail "$VAULT_PROVIDER")"
LOAD_FROM_VAULT="$(normalize_bool_or_fail "$LOAD_FROM_VAULT")"
INFISICAL_INCLUDE_IMPORTS="$(normalize_bool_or_fail "$INFISICAL_INCLUDE_IMPORTS")"
SYNC_BRAINTRUST="$(normalize_bool_or_fail "$SYNC_BRAINTRUST")"
DRY_RUN="$(normalize_bool_or_fail "$DRY_RUN")"

require_cmd pnpm
require_cmd jq

if [[ "$LOAD_FROM_VAULT" == "true" ]]; then
  case "$VAULT_PROVIDER" in
    infisical)
      require_cmd infisical
      load_secrets_from_infisical
      ;;
    env)
      echo "VAULT_PROVIDER=env; skipping vault pull and using existing process environment"
      ;;
  esac
else
  echo "LOAD_FROM_VAULT=false; using existing process environment"
fi

echo "validating Loom remote secrets..."
missing=0
require_secret LOOM_MCP_API_TOKEN || missing=1
require_secret MIGRATION_ADMIN_TOKEN || missing=1
require_secret MIGRATION_SIGNING_SECRET || missing=1
if [[ "$SYNC_BRAINTRUST" == "true" ]]; then
  require_secret BRAINTRUST_API_KEY || missing=1
  require_secret BRAINTRUST_PROJECT_ID || missing=1
fi

if [[ "$missing" == "1" ]]; then
  echo "secret validation failed" >&2
  exit 1
fi

echo "syncing remote Loom worker secrets..."
put_secret "LOOM_MCP_API_TOKEN" "$LOOM_MCP_API_TOKEN"
put_secret "MIGRATION_ADMIN_TOKEN" "$MIGRATION_ADMIN_TOKEN"
put_secret "MIGRATION_SIGNING_SECRET" "$MIGRATION_SIGNING_SECRET"

if [[ -n "${LOOM_NOTION_TOKEN:-}" ]]; then
  put_secret "LOOM_NOTION_TOKEN" "$LOOM_NOTION_TOKEN"
fi

if [[ "$SYNC_BRAINTRUST" == "true" ]]; then
  put_secret "BRAINTRUST_API_KEY" "$BRAINTRUST_API_KEY"
  put_secret "BRAINTRUST_PROJECT_ID" "$BRAINTRUST_PROJECT_ID"
fi

echo "Loom remote vault sync complete."
