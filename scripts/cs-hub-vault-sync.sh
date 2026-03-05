#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HUB_REMOTE_DIR="$ROOT_DIR/packages/cs-mcp-hub-remote"
HUB_TEAM_CONFIG="$HUB_REMOTE_DIR/wrangler.team-hubs.toml"
HUB_REMOTE_CONFIG="$HUB_REMOTE_DIR/wrangler.toml"
NOTION_BRIDGE_DIR="$ROOT_DIR/packages/cs-mcp-hub-notion-bridge"
NOTION_BRIDGE_CONFIG="$NOTION_BRIDGE_DIR/wrangler.toml"

TEAM_KEYS=(
  "LAINY"
  "DANNY"
  "AUGUST"
  "AARON_OUTERFIELDS"
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

DOPPLER_PROJECT="${DOPPLER_PROJECT:-create-something}"
DOPPLER_CONFIG="${DOPPLER_CONFIG:-production}"
LOAD_FROM_DOPPLER="${LOAD_FROM_DOPPLER:-true}"
INCLUDE_BRIDGES="${INCLUDE_BRIDGES:-true}"
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

hub_worker_for_team() {
  case "$1" in
    "LAINY") echo "cs-hub-lainy" ;;
    "DANNY") echo "cs-hub-danny" ;;
    "AUGUST") echo "cs-hub-august" ;;
    "AARON_OUTERFIELDS") echo "cs-hub-aaron-outerfields" ;;
    "FILLIP") echo "cs-hub-fillip" ;;
    "LEAH") echo "cs-hub-leah" ;;
    "MJ") echo "cs-hub-mj" ;;
    *)
      echo "unknown team key: $1" >&2
      exit 1
      ;;
  esac
}

notion_bridge_worker_for_team() {
  case "$1" in
    "LAINY") echo "cs-hub-lainy-notion-bridge" ;;
    "DANNY") echo "cs-hub-danny-notion-bridge" ;;
    "AUGUST") echo "cs-hub-august-notion-bridge" ;;
    "FILLIP") echo "cs-hub-fillip-notion-bridge" ;;
    "LEAH") echo "cs-hub-leah-notion-bridge" ;;
    "MJ") echo "cs-mcp-hub-notion-bridge" ;;
    *)
      echo "unknown team key: $1" >&2
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

bridge_api_key_env_var_for_team() {
  echo "CS_HUB_${1}_NOTION_BRIDGE_API_KEY"
}

load_secrets_from_doppler() {
  echo "loading secrets from Doppler project=${DOPPLER_PROJECT} config=${DOPPLER_CONFIG}"
  local payload
  payload="$(
    doppler secrets download \
      --no-file \
      --format json \
      --project "$DOPPLER_PROJECT" \
      --config "$DOPPLER_CONFIG"
  )"
  while IFS=$'\t' read -r key value; do
    export "${key}=${value}"
  done < <(printf '%s' "$payload" | jq -r 'to_entries[] | [.key, (.value | tostring)] | @tsv')
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
  local config="$1"
  local worker="$2"
  local key="$3"
  local value="$4"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] wrangler secret put ${key} --name ${worker} --config ${config}"
    return 0
  fi

  local target_worker="$worker"
  case "$worker" in
    "cs-hub-fillip")
      if pnpm exec wrangler secret list --name "cs-hub-fillip" --config "$config" >/dev/null 2>&1; then
        target_worker="cs-hub-fillip"
      elif pnpm exec wrangler secret list --name "cs-hub-filip" --config "$config" >/dev/null 2>&1; then
        target_worker="cs-hub-filip"
      fi
      ;;
    "cs-hub-fillip-notion-bridge")
      if pnpm exec wrangler secret list --name "cs-hub-fillip-notion-bridge" --config "$config" >/dev/null 2>&1; then
        target_worker="cs-hub-fillip-notion-bridge"
      elif pnpm exec wrangler secret list --name "cs-hub-filip-notion-bridge" --config "$config" >/dev/null 2>&1; then
        target_worker="cs-hub-filip-notion-bridge"
      fi
      ;;
  esac

  if [[ "$target_worker" != "$worker" ]]; then
    echo "secret_target=${target_worker} (legacy alias for ${worker})"
  fi
  printf '%s' "$value" | pnpm exec wrangler secret put "$key" --name "$target_worker" --config "$config"
}

LOAD_FROM_DOPPLER="$(normalize_bool_or_fail "$LOAD_FROM_DOPPLER")"
INCLUDE_BRIDGES="$(normalize_bool_or_fail "$INCLUDE_BRIDGES")"
DRY_RUN="$(normalize_bool_or_fail "$DRY_RUN")"

require_cmd pnpm
require_cmd jq

if [[ "$LOAD_FROM_DOPPLER" == "true" ]]; then
  require_cmd doppler
  load_secrets_from_doppler
fi

echo "validating required secrets..."
missing=0
if ! require_secret HUB_SESSION_RESOLVE_TOKEN; then missing=1; fi
if ! require_secret BRAINTRUST_API_KEY; then missing=1; fi
if ! require_secret BRAINTRUST_PROJECT_ID; then missing=1; fi
for team_key in "${TEAM_KEYS[@]}"; do
  team_token_var="$(token_env_var_for_team "$team_key")"
  if ! require_secret "$team_token_var"; then missing=1; fi
done
if [[ "$INCLUDE_BRIDGES" == "true" ]]; then
  for team_key in "${BRIDGE_TEAM_KEYS[@]}"; do
    team_bridge_password_var="$(bridge_password_env_var_for_team "$team_key")"
    if ! require_secret "$team_bridge_password_var"; then missing=1; fi
  done
fi

if [[ "$missing" == "1" ]]; then
  echo "secret validation failed" >&2
  exit 1
fi

echo "syncing strict hub worker secrets..."
for team_key in "${TEAM_KEYS[@]}"; do
  worker="$(hub_worker_for_team "$team_key")"
  token_var="$(token_env_var_for_team "$team_key")"
  token_value="${!token_var}"
  put_secret "$HUB_TEAM_CONFIG" "$worker" "HUB_API_TOKEN" "$token_value"
  put_secret "$HUB_TEAM_CONFIG" "$worker" "HUB_SESSION_RESOLVE_TOKEN" "$HUB_SESSION_RESOLVE_TOKEN"
  put_secret "$HUB_TEAM_CONFIG" "$worker" "BRAINTRUST_API_KEY" "$BRAINTRUST_API_KEY"
  put_secret "$HUB_TEAM_CONFIG" "$worker" "BRAINTRUST_PROJECT_ID" "$BRAINTRUST_PROJECT_ID"
done

echo "syncing core hub worker secrets..."
core_token="${CS_MCP_HUB_REMOTE_API_TOKEN:-${HUB_API_TOKEN:-}}"
if [[ -z "$core_token" ]]; then
  echo "missing CS_MCP_HUB_REMOTE_API_TOKEN (or HUB_API_TOKEN fallback) for core worker" >&2
  exit 1
fi
put_secret "$HUB_REMOTE_CONFIG" "cs-mcp-hub-remote" "HUB_API_TOKEN" "$core_token"
put_secret "$HUB_REMOTE_CONFIG" "cs-mcp-hub-remote" "HUB_SESSION_RESOLVE_TOKEN" "$HUB_SESSION_RESOLVE_TOKEN"
put_secret "$HUB_REMOTE_CONFIG" "cs-mcp-hub-remote" "BRAINTRUST_API_KEY" "$BRAINTRUST_API_KEY"
put_secret "$HUB_REMOTE_CONFIG" "cs-mcp-hub-remote" "BRAINTRUST_PROJECT_ID" "$BRAINTRUST_PROJECT_ID"

if [[ "$INCLUDE_BRIDGES" == "true" ]]; then
  echo "syncing notion bridge worker secrets..."
  for team_key in "${BRIDGE_TEAM_KEYS[@]}"; do
    worker="$(notion_bridge_worker_for_team "$team_key")"
    token_var="$(token_env_var_for_team "$team_key")"
    bridge_password_var="$(bridge_password_env_var_for_team "$team_key")"
    bridge_api_key_var="$(bridge_api_key_env_var_for_team "$team_key")"
    put_secret "$NOTION_BRIDGE_CONFIG" "$worker" "HUB_API_TOKEN" "${!token_var}"
    put_secret "$NOTION_BRIDGE_CONFIG" "$worker" "BRIDGE_BASIC_PASSWORD" "${!bridge_password_var}"
    if [[ -n "${!bridge_api_key_var:-}" ]]; then
      put_secret "$NOTION_BRIDGE_CONFIG" "$worker" "BRIDGE_API_KEY" "${!bridge_api_key_var}"
    fi
  done
fi

echo "vault sync complete."
