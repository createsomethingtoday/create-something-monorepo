#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKER_DIR="$ROOT_DIR/packages/halfdozen-zoom-transcript-sync"
WORKER_CONFIG="$WORKER_DIR/wrangler.toml"
WORKER_NAME="halfdozen-zoom-transcript-sync"

VAULT_PROVIDER="${VAULT_PROVIDER:-infisical}"
LOAD_FROM_VAULT="${LOAD_FROM_VAULT:-true}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/}"
INFISICAL_INCLUDE_IMPORTS="${INFISICAL_INCLUDE_IMPORTS:-true}"
INFISICAL_API_URL="${INFISICAL_API_URL:-https://app.infisical.com}"
INFISICAL_ORGANIZATION_SLUG="${INFISICAL_ORGANIZATION_SLUG:-}"
INFISICAL_CLIENT_ID="${INFISICAL_CLIENT_ID:-}"
INFISICAL_CLIENT_SECRET="${INFISICAL_CLIENT_SECRET:-}"
INFISICAL_TOKEN="${INFISICAL_TOKEN:-}"
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

normalize_write_mode_or_fail() {
  local raw="${1:-}"
  if [[ -z "$raw" ]]; then
    echo ""
    return 0
  fi

  local lowered
  lowered="$(echo "$raw" | tr '[:upper:]' '[:lower:]')"
  case "$lowered" in
    api | hub) echo "$lowered" ;;
    *)
      echo "invalid NOTION_WRITE_MODE: ${raw} (expected api|hub)" >&2
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

has_secret() {
  local name="$1"
  [[ -n "${!name:-}" ]]
}

put_secret() {
  local key="$1"
  local value="$2"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] wrangler secret put ${key} --name ${WORKER_NAME} --config ${WORKER_CONFIG}"
    return 0
  fi

  printf '%s' "$value" | pnpm exec wrangler secret put "$key" --name "$WORKER_NAME" --config "$WORKER_CONFIG"
}

sync_if_present() {
  local key="$1"
  if has_secret "$key"; then
    put_secret "$key" "${!key}"
  fi
}

validate_zoom_credentials() {
  if has_secret ZOOM_ACCESS_TOKEN; then
    echo "zoom auth mode: access_token"
    return 0
  fi

  if has_secret ZOOM_CLIENT_ID && has_secret ZOOM_CLIENT_SECRET && has_secret ZOOM_ACCOUNT_ID; then
    echo "zoom auth mode: server_to_server"
    return 0
  fi

  if has_secret ZOOM_CLIENT_ID && has_secret ZOOM_CLIENT_SECRET && has_secret ZOOM_REFRESH_TOKEN; then
    echo "zoom auth mode: refresh_token"
    return 0
  fi

  echo "missing Zoom credentials: provide ZOOM_ACCESS_TOKEN or ZOOM_CLIENT_ID + ZOOM_CLIENT_SECRET + ZOOM_ACCOUNT_ID or ZOOM_CLIENT_ID + ZOOM_CLIENT_SECRET + ZOOM_REFRESH_TOKEN" >&2
  return 1
}

validate_notion_transport() {
  NOTION_WRITE_MODE="$(normalize_write_mode_or_fail "${NOTION_WRITE_MODE:-}")"
  export NOTION_WRITE_MODE

  if [[ "$NOTION_WRITE_MODE" == "hub" ]]; then
    require_secret NOTION_HUB_URL || return 1
    require_secret NOTION_HUB_API_TOKEN || return 1
    require_secret NOTION_HUB_PROXY_TOOL || return 1
    echo "notion write mode: hub (forced)"
    return 0
  fi

  if [[ "$NOTION_WRITE_MODE" == "api" ]]; then
    require_secret NOTION_API_KEY || return 1
    echo "notion write mode: api (forced)"
    return 0
  fi

  if has_secret NOTION_HUB_URL && has_secret NOTION_HUB_API_TOKEN && has_secret NOTION_HUB_PROXY_TOOL; then
    echo "notion write mode: hub (inferred)"
    return 0
  fi

  if has_secret NOTION_API_KEY; then
    echo "notion write mode: api (inferred)"
    return 0
  fi

  echo "missing Notion transport: provide NOTION_API_KEY for direct mode or NOTION_HUB_URL + NOTION_HUB_API_TOKEN + NOTION_HUB_PROXY_TOOL for hub mode" >&2
  return 1
}

VAULT_PROVIDER="$(normalize_provider_or_fail "$VAULT_PROVIDER")"
LOAD_FROM_VAULT="$(normalize_bool_or_fail "$LOAD_FROM_VAULT")"
INFISICAL_INCLUDE_IMPORTS="$(normalize_bool_or_fail "$INFISICAL_INCLUDE_IMPORTS")"
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

if [[ ! -f "$WORKER_CONFIG" ]]; then
  echo "wrangler config not found: ${WORKER_CONFIG}" >&2
  exit 1
fi

echo "validating Half Dozen Zoom transcript worker secrets..."
missing=0
require_secret SYNC_API_KEY || missing=1
validate_zoom_credentials || missing=1
validate_notion_transport || missing=1

if [[ "$missing" == "1" ]]; then
  echo "secret validation failed" >&2
  exit 1
fi

echo "syncing Half Dozen Zoom transcript worker secrets..."
put_secret "SYNC_API_KEY" "$SYNC_API_KEY"
sync_if_present "ZOOM_ACCESS_TOKEN"
sync_if_present "ZOOM_CLIENT_ID"
sync_if_present "ZOOM_CLIENT_SECRET"
sync_if_present "ZOOM_ACCOUNT_ID"
sync_if_present "ZOOM_REFRESH_TOKEN"
sync_if_present "ZOOM_REDIRECT_URI"
sync_if_present "ZOOM_USER_ID"
sync_if_present "NOTION_API_KEY"
sync_if_present "NOTION_WRITE_MODE"
sync_if_present "NOTION_HUB_URL"
sync_if_present "NOTION_HUB_API_TOKEN"
sync_if_present "NOTION_HUB_PROXY_TOOL"
sync_if_present "NOTION_HUB_EXPERIMENT_ID"
sync_if_present "NOTION_HUB_CANDIDATE_ID"
sync_if_present "NOTION_HUB_BASELINE_ID"
sync_if_present "NOTION_HUB_COHORT"
sync_if_present "NOTION_HUB_PHASE"
sync_if_present "NOTION_RUNTIME_CONNECTION_REF"

echo "Half Dozen Zoom transcript worker vault sync complete."
