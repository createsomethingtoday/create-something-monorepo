#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WRANGLER_FILE="$ROOT_DIR/packages/halfdozen-operator-notion-mcp/worker/wrangler.toml"
MIGRATION_FILE="$ROOT_DIR/packages/agency/migrations/0011_partner_notion_accounts.sql"
SYNC_MIGRATION_FILE="$ROOT_DIR/packages/agency/migrations/0020_partner_notion_sync_contracts.sql"
EXPECTED_NOTION_AUTH_CONFIG_ID="${EXPECTED_NOTION_AUTH_CONFIG_ID:-ac_1fYSxzK38XeT}"
EXPECTED_CLOUDFLARE_ACCOUNT_ID="${EXPECTED_CLOUDFLARE_ACCOUNT_ID:-9645bd52e640b8a4f40a3a55ff1dd75a}"
INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
INFISICAL_INCLUDE_IMPORTS="${INFISICAL_INCLUDE_IMPORTS:-true}"
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
    local -a cmd=(
      infisical secrets get "$name"
      --plain
      --silent
      --env="$INFISICAL_ENV"
      --path="$INFISICAL_PATH"
      --include-imports="$INFISICAL_INCLUDE_IMPORTS"
    )
    if [[ -n "$INFISICAL_PROJECT_ID" ]]; then
      cmd+=(--projectId="$INFISICAL_PROJECT_ID")
    fi
    value="$("${cmd[@]}" 2>/dev/null || true)"
    if [[ -n "$value" ]]; then
      export "${name}=${value}"
    fi
  fi
}

check_secret_present_with_aliases() {
  local canonical="$1"
  shift || true
  local -a aliases
  local -a candidates
  aliases=()
  candidates=("$canonical")
  if [[ "$#" -gt 0 ]]; then
    aliases=("$@")
    candidates+=("${aliases[@]}")
  fi

  local candidate
  for candidate in "${candidates[@]}"; do
    load_secret_if_needed "$candidate"
    if [[ -n "${!candidate:-}" ]]; then
      if [[ "$candidate" != "$canonical" && -z "${!canonical:-}" ]]; then
        export "${canonical}=${!candidate}"
      fi
      if [[ "$candidate" == "$canonical" ]]; then
        echo "ok: ${canonical} is available"
      else
        echo "ok: ${canonical} is available via alias ${candidate}"
      fi
      return 0
    fi
  done

  if [[ "${#aliases[@]}" -gt 0 ]]; then
    echo "missing required secret: ${canonical} (aliases tried: ${aliases[*]})" >&2
  else
    echo "missing required secret: ${canonical}" >&2
  fi
  return 1
}

extract_config_db_field() {
  local field="$1"
  awk -F'=' -v wanted="$field" '
    /^\[\[d1_databases\]\]/ { in_block=1; binding=""; value=""; next }
    in_block && /^binding/ {
      binding=$2
      gsub(/"| /, "", binding)
      next
    }
    in_block && $1 ~ ("^" wanted "[[:space:]]*$") {
      value=$2
      gsub(/"| /, "", value)
      if (binding == "CONFIG_DB") {
        print value
        exit
      }
    }
  ' "$WRANGLER_FILE"
}

check_wrangler_defaults() {
  if [[ ! -f "$WRANGLER_FILE" ]]; then
    echo "wrangler config not found: $WRANGLER_FILE" >&2
    return 1
  fi

  local config_db_id
  config_db_id="$(extract_config_db_field "database_id")"
  if [[ -z "$config_db_id" ]]; then
    echo "CONFIG_DB database_id is not set in $WRANGLER_FILE" >&2
    return 1
  fi
  if [[ "$config_db_id" == "00000000-0000-0000-0000-000000000000" ]]; then
    echo "placeholder CONFIG_DB database_id detected in $WRANGLER_FILE" >&2
    return 1
  fi

  local configured
  configured="$(awk -F'=' '/^COMPOSIO_NOTION_AUTH_CONFIG_ID[[:space:]]*=/{gsub(/"| /,"",$2); print $2; exit}' "$WRANGLER_FILE" || true)"
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

  require_cmd node
  require_cmd jq

  local config_db_name
  config_db_name="$(extract_config_db_field "database_name")"
  if [[ -z "$config_db_name" ]]; then
    echo "CONFIG_DB database_name is not set in $WRANGLER_FILE" >&2
    return 1
  fi

  local output stderr_file
  stderr_file="$(mktemp)"
  if ! output="$(
    CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-$EXPECTED_CLOUDFLARE_ACCOUNT_ID}" \
    node "$ROOT_DIR/scripts/run-wrangler.mjs" \
      --cwd "$ROOT_DIR/packages/halfdozen-operator-notion-mcp/worker" \
      d1 execute "$config_db_name" \
      --remote \
      --command "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('partner_auth_clients','partner_auth_notion_accounts','partner_auth_notion_sync_contracts','partner_auth_notion_sync_contract_fields','partner_auth_notion_sync_record_mappings','partner_auth_notion_sync_runs') ORDER BY name;" \
      --json 2>"$stderr_file"
  )"; then
    echo "failed to query ${config_db_name} D1. Ensure Cloudflare auth is configured and authorized for CLOUDFLARE_ACCOUNT_ID=${CLOUDFLARE_ACCOUNT_ID:-$EXPECTED_CLOUDFLARE_ACCOUNT_ID}." >&2
    if [[ -n "$output" ]]; then
      echo "$output" >&2
    fi
    if [[ -s "$stderr_file" ]]; then
      cat "$stderr_file" >&2
    fi
    rm -f "$stderr_file"
    return 1
  fi
  rm -f "$stderr_file"

  if ! echo "$output" | jq -e '([.[0].results[].name] | sort) == ["partner_auth_clients","partner_auth_notion_accounts","partner_auth_notion_sync_contract_fields","partner_auth_notion_sync_contracts","partner_auth_notion_sync_record_mappings","partner_auth_notion_sync_runs"]' >/dev/null 2>&1; then
    echo "D1 migrations 0010/0011/0020 not applied on ${config_db_name}: expected partner_auth_clients, partner_auth_notion_accounts, and all partner_auth_notion_sync_* tables." >&2
    return 1
  fi

  echo "ok: D1 migration tables exist (partner_auth_clients, partner_auth_notion_accounts, partner_auth_notion_sync_*)"
}

main() {
  PRECHECK_SKIP_REMOTE_DB="$(normalize_bool_or_fail "$PRECHECK_SKIP_REMOTE_DB")"

  require_cmd rg
  if [[ ! -f "$MIGRATION_FILE" ]]; then
    echo "missing migration file: $MIGRATION_FILE" >&2
    exit 1
  fi
  if [[ ! -f "$SYNC_MIGRATION_FILE" ]]; then
    echo "missing migration file: $SYNC_MIGRATION_FILE" >&2
    exit 1
  fi

  local missing=0

  echo "checking required secrets..."
  check_secret_present_with_aliases "COMPOSIO_API_KEY" || missing=1
  check_secret_present_with_aliases "MCP_API_KEY" "HALFDOZEN_OPERATOR_NOTION_MCP_API_KEY" || missing=1
  check_secret_present_with_aliases "HALFDOZEN_OPERATOR_NOTION_MCP_API_KEY" "MCP_API_KEY" || missing=1
  check_secret_present_with_aliases "CS_HUB_DANNY_API_TOKEN" "HUB_API_TOKEN" || missing=1

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
