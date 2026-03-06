#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WRANGLER_FILE="$ROOT_DIR/packages/halfdozen-operator-notion-mcp/worker/wrangler.toml"
MIGRATION_FILE="$ROOT_DIR/packages/agency/migrations/0011_partner_notion_accounts.sql"
EXPECTED_NOTION_AUTH_CONFIG_ID="${EXPECTED_NOTION_AUTH_CONFIG_ID:-ac_1fYSxzK38XeT}"
INFISICAL_ENV="${INFISICAL_ENV:-prod}"
PRECHECK_SKIP_REMOTE_DB="${PRECHECK_SKIP_REMOTE_DB:-false}"

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
    true|false) echo "$lowered" ;;
    *)
      echo "invalid boolean: ${raw} (expected true|false)" >&2
      exit 1
      ;;
  esac
}

load_secret_if_needed() {
  local name="$1"
  if [[ -n "${!name:-}" ]]; then
    return 0
  fi
  if command -v infisical >/dev/null 2>&1; then
    local value
    value="$(infisical secrets get "$name" --plain --env="$INFISICAL_ENV" 2>/dev/null || true)"
    if [[ -n "$value" ]]; then
      export "${name}=${value}"
    fi
  fi
}

check_secret_present() {
  local name="$1"
  load_secret_if_needed "$name"
  if [[ -z "${!name:-}" ]]; then
    echo "missing required secret: ${name}" >&2
    return 1
  fi
  echo "ok: ${name} is available"
  return 0
}

check_wrangler_defaults() {
  if [[ ! -f "$WRANGLER_FILE" ]]; then
    echo "wrangler config not found: $WRANGLER_FILE" >&2
    return 1
  fi

  if rg -n 'database_id = "00000000-0000-0000-0000-000000000000"' "$WRANGLER_FILE" >/dev/null; then
    echo "placeholder D1 database_id detected in $WRANGLER_FILE" >&2
    return 1
  fi

  local configured
  configured="$(awk -F'=' '/^COMPOSIO_NOTION_AUTH_CONFIG_ID\s*=/{gsub(/"| /,"",$2); print $2; exit}' "$WRANGLER_FILE" || true)"
  if [[ -z "$configured" ]]; then
    echo "COMPOSIO_NOTION_AUTH_CONFIG_ID is not set in $WRANGLER_FILE" >&2
    return 1
  fi
  if [[ "$configured" != "$EXPECTED_NOTION_AUTH_CONFIG_ID" ]]; then
    echo "COMPOSIO_NOTION_AUTH_CONFIG_ID mismatch in wrangler.toml (expected $EXPECTED_NOTION_AUTH_CONFIG_ID, got $configured)" >&2
    return 1
  fi

  echo "ok: wrangler defaults are valid"
}

check_remote_db_migration() {
  if [[ "$PRECHECK_SKIP_REMOTE_DB" == "true" ]]; then
    echo "skip: remote D1 migration check (PRECHECK_SKIP_REMOTE_DB=true)"
    return 0
  fi

  require_cmd pnpm
  require_cmd jq

  local output
  if ! output="$(pnpm exec wrangler d1 execute create-something-agency --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name='partner_auth_notion_accounts';" --json 2>/dev/null)"; then
    echo "failed to query create-something-agency D1. Ensure Cloudflare auth is configured (wrangler login/token)." >&2
    return 1
  fi

  if ! echo "$output" | jq -e '.[0].results[0].name == "partner_auth_notion_accounts"' >/dev/null 2>&1; then
    echo "D1 migration 0011 not applied: table partner_auth_notion_accounts missing in create-something-agency." >&2
    return 1
  fi

  echo "ok: D1 migration table exists (partner_auth_notion_accounts)"
}

main() {
  PRECHECK_SKIP_REMOTE_DB="$(normalize_bool_or_fail "$PRECHECK_SKIP_REMOTE_DB")"

  require_cmd rg
  if [[ ! -f "$MIGRATION_FILE" ]]; then
    echo "missing migration file: $MIGRATION_FILE" >&2
    exit 1
  fi

  local missing=0

  echo "checking required secrets..."
  check_secret_present "COMPOSIO_API_KEY" || missing=1
  check_secret_present "MCP_API_KEY" || missing=1
  check_secret_present "HALFDOZEN_OPERATOR_NOTION_MCP_API_KEY" || missing=1
  check_secret_present "CS_HUB_DANNY_API_TOKEN" || missing=1

  if [[ "$missing" == "1" ]]; then
    echo "secret preflight failed" >&2
    exit 1
  fi

  echo "checking worker config defaults..."
  check_wrangler_defaults

  echo "checking auth config id..."
  if [[ -n "${COMPOSIO_NOTION_AUTH_CONFIG_ID:-}" && "$COMPOSIO_NOTION_AUTH_CONFIG_ID" != "$EXPECTED_NOTION_AUTH_CONFIG_ID" ]]; then
    echo "COMPOSIO_NOTION_AUTH_CONFIG_ID env mismatch (expected $EXPECTED_NOTION_AUTH_CONFIG_ID, got $COMPOSIO_NOTION_AUTH_CONFIG_ID)" >&2
    exit 1
  fi
  echo "ok: Notion auth config id is $EXPECTED_NOTION_AUTH_CONFIG_ID"

  echo "checking D1 migration status..."
  check_remote_db_migration

  echo "preflight complete"
}

main "$@"
