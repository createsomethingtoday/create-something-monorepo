#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SYNC_SCRIPT="$ROOT_DIR/scripts/cs-hub-vault-sync.sh"

TEAM_KEYS=(
  "LAINY"
  "DANNY"
  "AUGUST"
  "C3DENVER"
  "AARON_OUTERFIELDS"
  "ANDRE_OUTERFIELDS"
  "FILLIP"
  "LEAH"
  "MJ"
)

BRIDGE_TEAM_KEYS=(
  "LAINY"
  "DANNY"
  "AUGUST"
  "FILLIP"
  "LEAH"
  "MJ"
)

VAULT_PROVIDER="${VAULT_PROVIDER:-infisical}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/}"
INFISICAL_INCLUDE_IMPORTS="${INFISICAL_INCLUDE_IMPORTS:-true}"
INFISICAL_API_URL="${INFISICAL_API_URL:-https://app.infisical.com}"
INFISICAL_CLIENT_ID="${INFISICAL_CLIENT_ID:-}"
INFISICAL_CLIENT_SECRET="${INFISICAL_CLIENT_SECRET:-}"
INFISICAL_TOKEN="${INFISICAL_TOKEN:-}"
INCLUDE_BRIDGES="${INCLUDE_BRIDGES:-true}"
EXCLUDE_TEAM_KEYS="${EXCLUDE_TEAM_KEYS:-}"
SKIP_DEPLOY="${SKIP_DEPLOY:-false}"
SKIP_VERIFY="${SKIP_VERIFY:-false}"
DRY_RUN="${DRY_RUN:-false}"
HUB_DEPLOY_IDENTITY_MODE="${HUB_DEPLOY_IDENTITY_MODE:-compat}"

usage() {
  cat <<'EOF'
Usage:
  bash scripts/cs-hub-rotate-production.sh [options]

Options:
  --provider <name>               Vault provider: infisical|env (default: infisical)
  --vault-provider <name>         Alias for --provider
  --infisical-project-id <id>     Infisical project ID (optional if .infisical.json is present)
  --infisical-env <slug>          Infisical environment slug (default: prod)
  --infisical-path <path>         Infisical secret path (default: /)
  --exclude-team <key>            Preserve an existing team token instead of rotating it (repeatable)
  --no-bridges                    Skip Notion bridge credential rotation
  --skip-deploy                   Skip deploy step
  --skip-verify                   Skip verify step
  --dry-run                       Print operations without writing vault/worker state
  -h, --help                      Show this help
EOF
}

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

normalize_identity_mode_or_fail() {
  local raw="${1:-}"
  local lowered
  lowered="$(echo "$raw" | tr '[:upper:]' '[:lower:]')"
  case "$lowered" in
    compat | session_required) echo "$lowered" ;;
    *)
      echo "invalid identity mode: ${raw} (expected compat|session_required)" >&2
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

token_env_var_for_team() {
  echo "CS_HUB_${1}_API_TOKEN"
}

bridge_password_env_var_for_team() {
  echo "CS_HUB_${1}_NOTION_BRIDGE_BASIC_PASSWORD"
}

declare -a EXCLUDED_TEAM_KEY_LIST=()

normalize_team_key_or_fail() {
  local raw="${1:-}"
  local normalized
  normalized="$(printf '%s' "$raw" | tr '[:lower:]' '[:upper:]' | tr '-' '_')"
  case "$normalized" in
    "LAINY" | "DANNY" | "AUGUST" | "C3DENVER" | "AARON_OUTERFIELDS" | "ANDRE_OUTERFIELDS" | "FILLIP" | "FILIP" | "LEAH" | "MJ")
      if [[ "$normalized" == "FILIP" ]]; then
        normalized="FILLIP"
      fi
      echo "$normalized"
      ;;
    *)
      echo "invalid team key: ${raw}" >&2
      exit 1
      ;;
  esac
}

append_excluded_team_key() {
  local normalized="$1"
  local existing
  for existing in "${EXCLUDED_TEAM_KEY_LIST[@]}"; do
    if [[ "$existing" == "$normalized" ]]; then
      return 0
    fi
  done
  EXCLUDED_TEAM_KEY_LIST+=("$normalized")
}

parse_excluded_team_keys() {
  local raw="${1:-}"
  if [[ -z "$raw" ]]; then
    return 0
  fi

  local entry trimmed normalized
  IFS=',' read -r -a raw_entries <<<"$raw"
  for entry in "${raw_entries[@]}"; do
    trimmed="$(printf '%s' "$entry" | xargs)"
    if [[ -z "$trimmed" ]]; then
      continue
    fi
    normalized="$(normalize_team_key_or_fail "$trimmed")"
    append_excluded_team_key "$normalized"
  done
}

team_is_excluded() {
  local team_key="$1"
  local excluded
  for excluded in "${EXCLUDED_TEAM_KEY_LIST[@]}"; do
    if [[ "$excluded" == "$team_key" ]]; then
      return 0
    fi
  done
  return 1
}

rand_hex() {
  local bytes="$1"
  openssl rand -hex "$bytes"
}

infisical_with_auth() {
  local -a cmd=("$@")
  if [[ -n "$INFISICAL_TOKEN" ]]; then
    INFISICAL_API_URL="$INFISICAL_API_URL" INFISICAL_TOKEN="$INFISICAL_TOKEN" "${cmd[@]}"
  else
    INFISICAL_API_URL="$INFISICAL_API_URL" "${cmd[@]}"
  fi
}

login_infisical_if_needed() {
  if [[ -n "$INFISICAL_TOKEN" ]]; then
    return 0
  fi
  if [[ -n "${INFISICAL_CLIENT_ID:-}" || -n "${INFISICAL_CLIENT_SECRET:-}" ]]; then
    if [[ -z "${INFISICAL_CLIENT_ID:-}" || -z "${INFISICAL_CLIENT_SECRET:-}" ]]; then
      echo "for Universal Auth, both INFISICAL_CLIENT_ID and INFISICAL_CLIENT_SECRET are required" >&2
      exit 1
    fi
    INFISICAL_TOKEN="$(
      INFISICAL_API_URL="$INFISICAL_API_URL" \
      infisical login \
        --method=universal-auth \
        --client-id="$INFISICAL_CLIENT_ID" \
        --client-secret="$INFISICAL_CLIENT_SECRET" \
        --silent \
        --plain
    )"
    export INFISICAL_TOKEN
  fi
}

set_infisical_secret() {
  local key="$1"
  local value="$2"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] infisical secrets set ${key}=<redacted> --env=${INFISICAL_ENV} --path=${INFISICAL_PATH}"
    return 0
  fi
  local -a set_cmd=(
    infisical secrets set
    "${key}=${value}"
    --env="$INFISICAL_ENV"
    --path="$INFISICAL_PATH"
    --silent
  )
  if [[ -n "$INFISICAL_PROJECT_ID" ]]; then
    set_cmd+=(--projectId="$INFISICAL_PROJECT_ID")
  fi
  infisical_with_auth "${set_cmd[@]}" >/dev/null
}

get_infisical_secret() {
  local key="$1"
  local -a get_cmd=(
    infisical secrets get "$key"
    --plain
    --silent
    --env="$INFISICAL_ENV"
    --path="$INFISICAL_PATH"
    --include-imports="$INFISICAL_INCLUDE_IMPORTS"
  )
  if [[ -n "$INFISICAL_PROJECT_ID" ]]; then
    get_cmd+=(--projectId="$INFISICAL_PROJECT_ID")
  fi
  infisical_with_auth "${get_cmd[@]}"
}

set_vault_secret() {
  local key="$1"
  local value="$2"
  case "$VAULT_PROVIDER" in
    infisical) set_infisical_secret "$key" "$value" ;;
    env)
      echo "[${VAULT_PROVIDER}] secret ${key} left in process env only (not persisted to external vault)"
      ;;
  esac
}

get_vault_secret() {
  local key="$1"
  case "$VAULT_PROVIDER" in
    infisical) get_infisical_secret "$key" ;;
    env)
      if [[ -z "${!key:-}" ]]; then
        return 1
      fi
      printf '%s' "${!key}"
      ;;
  esac
}

run_infisical_command() {
  local cmd="$1"
  if [[ "$DRY_RUN" == "true" ]]; then
    local scope="--env=${INFISICAL_ENV} --path=${INFISICAL_PATH}"
    if [[ -n "$INFISICAL_PROJECT_ID" ]]; then
      scope="${scope} --projectId=${INFISICAL_PROJECT_ID}"
    fi
    echo "[dry-run] infisical run ${scope} --command \"${cmd}\""
    return 0
  fi
  local -a run_cmd=(
    infisical run
    --env="$INFISICAL_ENV"
    --path="$INFISICAL_PATH"
    --include-imports="$INFISICAL_INCLUDE_IMPORTS"
    --command "$cmd"
  )
  if [[ -n "$INFISICAL_PROJECT_ID" ]]; then
    run_cmd+=(--projectId="$INFISICAL_PROJECT_ID")
  fi
  infisical_with_auth "${run_cmd[@]}"
}

run_env_command() {
  local cmd="$1"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] env run --command \"${cmd}\""
    return 0
  fi
  bash -lc "$cmd"
}

run_vault_command() {
  local cmd="$1"
  case "$VAULT_PROVIDER" in
    infisical) run_infisical_command "$cmd" ;;
    env) run_env_command "$cmd" ;;
  esac
}

infisical_secret_exists() {
  local key="$1"
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
  payload="$(infisical_with_auth "${export_cmd[@]}")"
  printf '%s' "$payload" | jq -e --arg key "$key" '
    if type == "array" then
      any(.[]; .key == $key)
    elif type == "object" then
      has($key)
    else
      false
    end
  ' >/dev/null
}

vault_secret_exists() {
  local key="$1"
  case "$VAULT_PROVIDER" in
    infisical) infisical_secret_exists "$key" ;;
    env) [[ -n "${!key:-}" ]] ;;
  esac
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --provider | --vault-provider)
      VAULT_PROVIDER="$2"
      shift 2
      ;;
    --infisical-project-id)
      INFISICAL_PROJECT_ID="$2"
      shift 2
      ;;
    --infisical-env)
      INFISICAL_ENV="$2"
      shift 2
      ;;
    --infisical-path)
      INFISICAL_PATH="$2"
      shift 2
      ;;
    --exclude-team)
      append_excluded_team_key "$(normalize_team_key_or_fail "$2")"
      shift 2
      ;;
    --no-bridges)
      INCLUDE_BRIDGES="false"
      shift
      ;;
    --skip-deploy)
      SKIP_DEPLOY="true"
      shift
      ;;
    --skip-verify)
      SKIP_VERIFY="true"
      shift
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

VAULT_PROVIDER="$(normalize_provider_or_fail "$VAULT_PROVIDER")"
INCLUDE_BRIDGES="$(normalize_bool_or_fail "$INCLUDE_BRIDGES")"
SKIP_DEPLOY="$(normalize_bool_or_fail "$SKIP_DEPLOY")"
SKIP_VERIFY="$(normalize_bool_or_fail "$SKIP_VERIFY")"
DRY_RUN="$(normalize_bool_or_fail "$DRY_RUN")"
HUB_DEPLOY_IDENTITY_MODE="$(normalize_identity_mode_or_fail "$HUB_DEPLOY_IDENTITY_MODE")"
INFISICAL_INCLUDE_IMPORTS="$(normalize_bool_or_fail "$INFISICAL_INCLUDE_IMPORTS")"
parse_excluded_team_keys "$EXCLUDE_TEAM_KEYS"

require_cmd openssl
require_cmd bash
require_cmd pnpm
require_cmd jq
case "$VAULT_PROVIDER" in
  infisical)
    require_cmd infisical
    if [[ "$DRY_RUN" == "false" ]]; then
      login_infisical_if_needed
    fi
    ;;
  env)
    ;;
esac

case "$VAULT_PROVIDER" in
  infisical)
    if [[ -n "$INFISICAL_PROJECT_ID" ]]; then
      echo "rotating delivery credentials in Infisical projectId=${INFISICAL_PROJECT_ID} env=${INFISICAL_ENV} path=${INFISICAL_PATH}"
    else
      echo "rotating delivery credentials in Infisical project=<from .infisical.json/session> env=${INFISICAL_ENV} path=${INFISICAL_PATH}"
    fi
    ;;
  env)
    echo "rotating delivery credentials in process env only (VAULT_PROVIDER=env)"
    ;;
esac

if [[ "${#EXCLUDED_TEAM_KEY_LIST[@]}" -gt 0 ]]; then
  echo "preserving existing team tokens for: ${EXCLUDED_TEAM_KEY_LIST[*]}"
fi

# Keep fallback and core remote token aligned.
core_gateway_token="$(rand_hex 32)"
export HUB_API_TOKEN="$core_gateway_token"
export CS_MCP_HUB_REMOTE_API_TOKEN="$core_gateway_token"
set_vault_secret "HUB_API_TOKEN" "$core_gateway_token"
set_vault_secret "CS_MCP_HUB_REMOTE_API_TOKEN" "$core_gateway_token"

operator_notion_mcp_token="$(rand_hex 32)"
export HALFDOZEN_OPERATOR_NOTION_MCP_API_KEY="$operator_notion_mcp_token"
set_vault_secret "HALFDOZEN_OPERATOR_NOTION_MCP_API_KEY" "$operator_notion_mcp_token"

for team_key in "${TEAM_KEYS[@]}"; do
  token_key="$(token_env_var_for_team "$team_key")"
  if team_is_excluded "$team_key"; then
    echo "preserving existing ${token_key}"
    if [[ -z "${!token_key:-}" ]]; then
      existing_team_token="$(get_vault_secret "$token_key" 2>/dev/null || true)"
      if [[ -z "$existing_team_token" ]]; then
        echo "unable to preserve ${token_key}: current value not found in ${VAULT_PROVIDER} or env" >&2
        exit 1
      fi
      export "${token_key}=${existing_team_token}"
    fi
    continue
  fi
  team_token_value="$(rand_hex 32)"
  export "${token_key}=${team_token_value}"
  set_vault_secret "$token_key" "$team_token_value"
done

if [[ "$INCLUDE_BRIDGES" == "true" ]]; then
  for team_key in "${BRIDGE_TEAM_KEYS[@]}"; do
    bridge_password_key="$(bridge_password_env_var_for_team "$team_key")"
    bridge_password_value="$(rand_hex 24)"
    export "${bridge_password_key}=${bridge_password_value}"
    set_vault_secret "$bridge_password_key" "$bridge_password_value"
  done
fi

if [[ "$DRY_RUN" == "true" ]]; then
  export HUB_SESSION_RESOLVE_TOKEN="${HUB_SESSION_RESOLVE_TOKEN:-dry_run_placeholder}"
  export LANGFUSE_SECRET_KEY="${LANGFUSE_SECRET_KEY:-dry_run_placeholder}"
  export LANGFUSE_PUBLIC_KEY="${LANGFUSE_PUBLIC_KEY:-dry_run_placeholder}"
fi

echo "syncing vault values to Cloudflare Worker secrets..."
load_from_vault_for_sync="true"
if [[ "$DRY_RUN" == "true" || "$VAULT_PROVIDER" == "env" ]]; then
  load_from_vault_for_sync="false"
fi
LOAD_FROM_VAULT="$load_from_vault_for_sync" \
VAULT_PROVIDER="$VAULT_PROVIDER" \
INCLUDE_BRIDGES="$INCLUDE_BRIDGES" \
DRY_RUN="$DRY_RUN" \
INFISICAL_PROJECT_ID="$INFISICAL_PROJECT_ID" \
INFISICAL_ENV="$INFISICAL_ENV" \
INFISICAL_PATH="$INFISICAL_PATH" \
INFISICAL_INCLUDE_IMPORTS="$INFISICAL_INCLUDE_IMPORTS" \
INFISICAL_API_URL="$INFISICAL_API_URL" \
INFISICAL_CLIENT_ID="$INFISICAL_CLIENT_ID" \
INFISICAL_CLIENT_SECRET="$INFISICAL_CLIENT_SECRET" \
INFISICAL_TOKEN="$INFISICAL_TOKEN" \
bash "$SYNC_SCRIPT"

if [[ "$SKIP_DEPLOY" == "false" ]]; then
  if [[ "$DRY_RUN" == "false" && "$HUB_DEPLOY_IDENTITY_MODE" == "session_required" ]]; then
    if [[ -z "${MCP_SESSION_TOKEN:-}" && -z "${IDENTITY_ACCESS_TOKEN:-}" ]]; then
      if ! vault_secret_exists "MCP_SESSION_TOKEN" && ! vault_secret_exists "IDENTITY_ACCESS_TOKEN"; then
        echo "warning: MCP_SESSION_TOKEN or IDENTITY_ACCESS_TOKEN not found in env or ${VAULT_PROVIDER} context."
        echo "         pnpm mcp:hub:fleet:deploy may fail during strict state normalization."
      fi
    fi
  fi
  run_vault_command "cd \"$ROOT_DIR\" && HUB_DEPLOY_IDENTITY_MODE=$HUB_DEPLOY_IDENTITY_MODE pnpm mcp:hub:fleet:deploy"
fi

if [[ "$SKIP_VERIFY" == "false" ]]; then
  run_vault_command "cd \"$ROOT_DIR\" && HUB_VERIFY_IDENTITY_MODE=$HUB_DEPLOY_IDENTITY_MODE pnpm mcp:hub:fleet:verify"
fi

echo "rotation workflow complete."
