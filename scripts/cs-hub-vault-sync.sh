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
  "C3DENVER"
  "AARON_OUTERFIELDS"
  "ANDRE_OUTERFIELDS"
  "FILLIP"
  "LEAH"
  "MJ"
)

NAMED_LANE_KEYS=(
  "VIV_BLONDISH"
  "MORGAN_YOUNG_C3_MANAGEMENT"
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
INCLUDE_BRIDGES="${INCLUDE_BRIDGES:-true}"
DRY_RUN="${DRY_RUN:-false}"
HALFDOZEN_OPERATOR_NOTION_MCP_API_KEY="${HALFDOZEN_OPERATOR_NOTION_MCP_API_KEY:-}"
WEBFLOW_TEMPLATE_REVIEW_MCP_API_KEY="${WEBFLOW_TEMPLATE_REVIEW_MCP_API_KEY:-}"

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

hub_worker_for_team() {
  case "$1" in
    "LAINY") echo "cs-hub-lainy" ;;
    "DANNY") echo "cs-hub-danny" ;;
    "AUGUST") echo "cs-hub-august" ;;
    "C3DENVER") echo "cs-hub-c3denver" ;;
    "AARON_OUTERFIELDS") echo "cs-hub-aaron-outerfields" ;;
    "ANDRE_OUTERFIELDS") echo "cs-hub-andre-outerfields" ;;
    "FILLIP") echo "cs-hub-fillip" ;;
    "LEAH") echo "cs-hub-leah" ;;
    "MJ") echo "cs-hub-mj" ;;
    *)
      echo "unknown team key: $1" >&2
      exit 1
      ;;
  esac
}

hub_worker_for_named_lane() {
  case "$1" in
    "VIV_BLONDISH") echo "cs-hub-viv-blondish" ;;
    "MORGAN_YOUNG_C3_MANAGEMENT") echo "cs-hub-morgan-young-c3-management" ;;
    *)
      echo "unknown named lane key: $1" >&2
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

token_env_var_for_named_lane() {
  echo "CS_HUB_${1}_API_TOKEN"
}

bridge_password_env_var_for_team() {
  echo "CS_HUB_${1}_NOTION_BRIDGE_BASIC_PASSWORD"
}

bridge_api_key_env_var_for_team() {
  echo "CS_HUB_${1}_NOTION_BRIDGE_API_KEY"
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

  local scope
  scope="env=${INFISICAL_ENV} path=${INFISICAL_PATH}"
  if [[ -n "$INFISICAL_PROJECT_ID" ]]; then
    scope="${scope} projectId=${INFISICAL_PROJECT_ID}"
  else
    scope="${scope} projectId=<from infisical config/session>"
  fi
  echo "loading secrets from Infisical ${scope}"

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

VAULT_PROVIDER="$(normalize_provider_or_fail "$VAULT_PROVIDER")"
LOAD_FROM_VAULT="$(normalize_bool_or_fail "$LOAD_FROM_VAULT")"
INFISICAL_INCLUDE_IMPORTS="$(normalize_bool_or_fail "$INFISICAL_INCLUDE_IMPORTS")"
INCLUDE_BRIDGES="$(normalize_bool_or_fail "$INCLUDE_BRIDGES")"
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

echo "validating required secrets..."
missing=0
if ! require_secret HUB_SESSION_RESOLVE_TOKEN; then missing=1; fi
if ! require_secret LANGFUSE_SECRET_KEY; then missing=1; fi
if ! require_secret LANGFUSE_PUBLIC_KEY; then missing=1; fi
if ! require_secret HALFDOZEN_OPERATOR_NOTION_MCP_API_KEY; then missing=1; fi
for team_key in "${TEAM_KEYS[@]}"; do
  team_token_var="$(token_env_var_for_team "$team_key")"
  if ! require_secret "$team_token_var"; then missing=1; fi
done
for lane_key in "${NAMED_LANE_KEYS[@]}"; do
  lane_token_var="$(token_env_var_for_named_lane "$lane_key")"
  if ! require_secret "$lane_token_var"; then missing=1; fi
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
  put_secret "$HUB_TEAM_CONFIG" "$worker" "LANGFUSE_SECRET_KEY" "$LANGFUSE_SECRET_KEY"
  put_secret "$HUB_TEAM_CONFIG" "$worker" "LANGFUSE_PUBLIC_KEY" "$LANGFUSE_PUBLIC_KEY"
  put_secret "$HUB_TEAM_CONFIG" "$worker" "HALFDOZEN_OPERATOR_NOTION_MCP_API_KEY" "$HALFDOZEN_OPERATOR_NOTION_MCP_API_KEY"
  if [[ "$team_key" == "MJ" && -n "$WEBFLOW_TEMPLATE_REVIEW_MCP_API_KEY" ]]; then
    put_secret "$HUB_TEAM_CONFIG" "$worker" "WEBFLOW_TEMPLATE_REVIEW_MCP_API_KEY" "$WEBFLOW_TEMPLATE_REVIEW_MCP_API_KEY"
  fi
done

echo "syncing named-lane hub worker secrets..."
for lane_key in "${NAMED_LANE_KEYS[@]}"; do
  worker="$(hub_worker_for_named_lane "$lane_key")"
  token_var="$(token_env_var_for_named_lane "$lane_key")"
  token_value="${!token_var}"
  put_secret "$HUB_TEAM_CONFIG" "$worker" "HUB_API_TOKEN" "$token_value"
  put_secret "$HUB_TEAM_CONFIG" "$worker" "HUB_SESSION_RESOLVE_TOKEN" "$HUB_SESSION_RESOLVE_TOKEN"
  put_secret "$HUB_TEAM_CONFIG" "$worker" "LANGFUSE_SECRET_KEY" "$LANGFUSE_SECRET_KEY"
  put_secret "$HUB_TEAM_CONFIG" "$worker" "LANGFUSE_PUBLIC_KEY" "$LANGFUSE_PUBLIC_KEY"
done

echo "syncing core hub worker secrets..."
core_token="${CS_MCP_HUB_REMOTE_API_TOKEN:-${HUB_API_TOKEN:-}}"
if [[ -z "$core_token" ]]; then
  echo "missing CS_MCP_HUB_REMOTE_API_TOKEN (or HUB_API_TOKEN fallback) for core worker" >&2
  exit 1
fi
put_secret "$HUB_REMOTE_CONFIG" "cs-mcp-hub-remote" "HUB_API_TOKEN" "$core_token"
put_secret "$HUB_REMOTE_CONFIG" "cs-mcp-hub-remote" "HUB_SESSION_RESOLVE_TOKEN" "$HUB_SESSION_RESOLVE_TOKEN"
put_secret "$HUB_REMOTE_CONFIG" "cs-mcp-hub-remote" "LANGFUSE_SECRET_KEY" "$LANGFUSE_SECRET_KEY"
put_secret "$HUB_REMOTE_CONFIG" "cs-mcp-hub-remote" "LANGFUSE_PUBLIC_KEY" "$LANGFUSE_PUBLIC_KEY"
put_secret "$HUB_REMOTE_CONFIG" "cs-mcp-hub-remote" "HALFDOZEN_OPERATOR_NOTION_MCP_API_KEY" "$HALFDOZEN_OPERATOR_NOTION_MCP_API_KEY"

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
