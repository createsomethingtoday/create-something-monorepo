#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SYNC_SCRIPT="$ROOT_DIR/scripts/cs-hub-vault-sync.sh"

TEAM_KEYS=(
  "LAINY"
  "DANNY"
  "AUGUST"
  "FILLIP"
  "LEAH"
  "MJ"
)

DOPPLER_PROJECT="${DOPPLER_PROJECT:-create-something}"
DOPPLER_CONFIG="${DOPPLER_CONFIG:-production}"
INCLUDE_BRIDGES="${INCLUDE_BRIDGES:-true}"
SKIP_DEPLOY="${SKIP_DEPLOY:-false}"
SKIP_VERIFY="${SKIP_VERIFY:-false}"
DRY_RUN="${DRY_RUN:-false}"
HUB_DEPLOY_IDENTITY_MODE="${HUB_DEPLOY_IDENTITY_MODE:-compat}"

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

token_env_var_for_team() {
  echo "CS_HUB_${1}_API_TOKEN"
}

bridge_password_env_var_for_team() {
  echo "CS_HUB_${1}_NOTION_BRIDGE_BASIC_PASSWORD"
}

rand_hex() {
  local bytes="$1"
  openssl rand -hex "$bytes"
}

set_doppler_secret() {
  local key="$1"
  local value="$2"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] doppler secrets set ${key}=<redacted>"
    return 0
  fi
  doppler secrets set \
    --project "$DOPPLER_PROJECT" \
    --config "$DOPPLER_CONFIG" \
    "${key}=${value}" >/dev/null
}

run_doppler_command() {
  local cmd="$1"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] doppler run --project ${DOPPLER_PROJECT} --config ${DOPPLER_CONFIG} --command \"${cmd}\""
    return 0
  fi
  doppler run \
    --project "$DOPPLER_PROJECT" \
    --config "$DOPPLER_CONFIG" \
    --command "$cmd"
}

doppler_secret_exists() {
  local key="$1"
  doppler secrets get \
    --project "$DOPPLER_PROJECT" \
    --config "$DOPPLER_CONFIG" \
    --plain "$key" >/dev/null 2>&1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)
      DOPPLER_PROJECT="$2"
      shift 2
      ;;
    --config)
      DOPPLER_CONFIG="$2"
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
    *)
      echo "unknown argument: $1" >&2
      echo "usage: $0 [--project <name>] [--config <name>] [--no-bridges] [--skip-deploy] [--skip-verify] [--dry-run]" >&2
      exit 1
      ;;
  esac
done

INCLUDE_BRIDGES="$(normalize_bool_or_fail "$INCLUDE_BRIDGES")"
SKIP_DEPLOY="$(normalize_bool_or_fail "$SKIP_DEPLOY")"
SKIP_VERIFY="$(normalize_bool_or_fail "$SKIP_VERIFY")"
DRY_RUN="$(normalize_bool_or_fail "$DRY_RUN")"
HUB_DEPLOY_IDENTITY_MODE="$(normalize_identity_mode_or_fail "$HUB_DEPLOY_IDENTITY_MODE")"

require_cmd doppler
require_cmd openssl
require_cmd bash
require_cmd pnpm

echo "rotating delivery credentials in Doppler project=${DOPPLER_PROJECT} config=${DOPPLER_CONFIG}"

# Keep fallback and core remote token aligned.
core_gateway_token="$(rand_hex 32)"
export HUB_API_TOKEN="$core_gateway_token"
export CS_MCP_HUB_REMOTE_API_TOKEN="$core_gateway_token"
set_doppler_secret "HUB_API_TOKEN" "$core_gateway_token"
set_doppler_secret "CS_MCP_HUB_REMOTE_API_TOKEN" "$core_gateway_token"

for team_key in "${TEAM_KEYS[@]}"; do
  token_key="$(token_env_var_for_team "$team_key")"
  team_token_value="$(rand_hex 32)"
  export "${token_key}=${team_token_value}"
  set_doppler_secret "$token_key" "$team_token_value"
  if [[ "$INCLUDE_BRIDGES" == "true" ]]; then
    bridge_password_key="$(bridge_password_env_var_for_team "$team_key")"
    bridge_password_value="$(rand_hex 24)"
    export "${bridge_password_key}=${bridge_password_value}"
    set_doppler_secret "$bridge_password_key" "$bridge_password_value"
  fi
done

if [[ "$DRY_RUN" == "true" ]]; then
  export HUB_SESSION_RESOLVE_TOKEN="${HUB_SESSION_RESOLVE_TOKEN:-dry_run_placeholder}"
  export BRAINTRUST_API_KEY="${BRAINTRUST_API_KEY:-dry_run_placeholder}"
  export BRAINTRUST_PROJECT_ID="${BRAINTRUST_PROJECT_ID:-dry_run_placeholder}"
fi

echo "syncing vault values to Cloudflare Worker secrets..."
LOAD_FROM_DOPPLER="$(
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "false"
  else
    echo "true"
  fi
)" \
INCLUDE_BRIDGES="$INCLUDE_BRIDGES" \
DRY_RUN="$DRY_RUN" \
DOPPLER_PROJECT="$DOPPLER_PROJECT" \
DOPPLER_CONFIG="$DOPPLER_CONFIG" \
bash "$SYNC_SCRIPT"

if [[ "$SKIP_DEPLOY" == "false" ]]; then
  if [[ "$DRY_RUN" == "false" && "$HUB_DEPLOY_IDENTITY_MODE" == "session_required" ]]; then
    if [[ -z "${MCP_SESSION_TOKEN:-}" && -z "${IDENTITY_ACCESS_TOKEN:-}" ]]; then
      if ! doppler_secret_exists "MCP_SESSION_TOKEN" && ! doppler_secret_exists "IDENTITY_ACCESS_TOKEN"; then
        echo "warning: MCP_SESSION_TOKEN or IDENTITY_ACCESS_TOKEN not found in env or Doppler config."
        echo "         pnpm mcp:hub:fleet:deploy may fail during strict state normalization."
      fi
    fi
  fi
  run_doppler_command "cd \"$ROOT_DIR\" && HUB_DEPLOY_IDENTITY_MODE=$HUB_DEPLOY_IDENTITY_MODE pnpm mcp:hub:fleet:deploy"
fi

if [[ "$SKIP_VERIFY" == "false" ]]; then
  run_doppler_command "cd \"$ROOT_DIR\" && HUB_VERIFY_IDENTITY_MODE=$HUB_DEPLOY_IDENTITY_MODE pnpm mcp:hub:fleet:verify"
fi

echo "rotation workflow complete."
