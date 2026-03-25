#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST_FILE="${MANIFEST_FILE:-$ROOT_DIR/specs/webflow-marketplace/delivery/template-review-hub/reviewer-managed-bearer-manifest.json}"

ACTION="${1:-all}"
REVIEWER="${REVIEWER:-all}"
DRY_RUN="${DRY_RUN:-false}"
RUN_SYNC="${RUN_SYNC:-true}"
RUN_DEPLOY="${RUN_DEPLOY:-true}"
RUN_VERIFY="${RUN_VERIFY:-true}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/}"
INFISICAL_INCLUDE_IMPORTS="${INFISICAL_INCLUDE_IMPORTS:-true}"
AGENCY_DB_NAME="${AGENCY_DB_NAME:-create-something-db}"
IDENTITY_DB_NAME="${IDENTITY_DB_NAME:-identity-db}"
IDENTITY_BASE_URL="${IDENTITY_BASE_URL:-https://id.createsomething.space}"
CURL_MAX_TIME="${CURL_MAX_TIME:-30}"

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

load_secrets_from_infisical() {
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
  payload="$("${export_cmd[@]}")"

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

  unset CLOUDFLARE_API_TOKEN
  unset CLOUDFLARE_PAGES_API_TOKEN
  unset CLOUDFLARE_ACCOUNT_ID
}

set_infisical_secret() {
  local key="$1"
  local value="$2"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] infisical secrets set ${key}=<redacted> --env=${INFISICAL_ENV} --path=${INFISICAL_PATH}"
    export "${key}=${value}"
    return 0
  fi

  local tmp_file
  tmp_file="$(mktemp)"
  printf '%s' "$value" > "$tmp_file"

  local -a set_cmd=(
    infisical secrets set
    "${key}=@${tmp_file}"
    --env="$INFISICAL_ENV"
    --path="$INFISICAL_PATH"
    --silent
  )
  if [[ -n "$INFISICAL_PROJECT_ID" ]]; then
    set_cmd+=(--projectId="$INFISICAL_PROJECT_ID")
  fi

  "${set_cmd[@]}" >/dev/null
  rm -f "$tmp_file"
  export "${key}=${value}"
}

reviewer_matches() {
  local reviewer="$1"
  [[ "$REVIEWER" == "all" || "$REVIEWER" == "$reviewer" ]]
}

generate_gateway_token() {
  printf 'mcpg_%s' "$(openssl rand -hex 24)"
}

fetch_entitlement_binding() {
  local account_id="$1"
  local email="$2"
  local sql

  sql="SELECT auth_subject, auth_email, account_id, tenant_id, workspace_account_id, managed_bearer_allowed, service_entitled, policy_accepted, contract_active, billing_active FROM agency_mcp_entitlements WHERE account_id = '${account_id}' OR auth_email = '${email}' LIMIT 1;"
  node "$ROOT_DIR/scripts/run-wrangler.mjs" \
    --cwd packages/agency \
    d1 execute "$AGENCY_DB_NAME" \
    --remote \
    --json \
    --command "$sql"
}

fetch_existing_managed_bearer() {
  local auth_subject="$1"
  local sql

  sql="SELECT id, auth_subject, auth_email, account_id, tenant_id, bound_host, token_prefix, revoked_at FROM mcp_long_lived_tokens WHERE auth_subject = '${auth_subject}' LIMIT 1;"
  node "$ROOT_DIR/scripts/run-wrangler.mjs" \
    --cwd packages/identity-worker \
    d1 execute "$IDENTITY_DB_NAME" \
    --remote \
    --json \
    --command "$sql"
}

adopt_one() {
  local entry_json="$1"
  local reviewer reviewer_name email account_id lane_slug bearer_secret_name gateway_secret_name tenant_id bearer_token gateway_token entitlement_row auth_subject host_key prefixes_json status body_file response_token response_source
  local existing_managed_row bearer_prefix

  reviewer="$(printf '%s' "$entry_json" | jq -r '.reviewer')"
  reviewer_name="$(printf '%s' "$entry_json" | jq -r '.reviewer_name')"
  email="$(printf '%s' "$entry_json" | jq -r '.email')"
  account_id="$(printf '%s' "$entry_json" | jq -r '.account_id')"
  lane_slug="$(printf '%s' "$entry_json" | jq -r '.hub_slug')"
  bearer_secret_name="$(printf '%s' "$entry_json" | jq -r '.bearer_secret_name')"
  gateway_secret_name="$(printf '%s' "$entry_json" | jq -r '.gateway_secret_name')"
  tenant_id="$(printf '%s' "$entry_json" | jq -r '.tenant_id // empty')"
  if [[ -z "$tenant_id" || "$tenant_id" == "null" ]]; then
    tenant_id="$(jq -r '.tenant_id' "$MANIFEST_FILE")"
  fi

  bearer_token="${!bearer_secret_name:-}"
  if [[ -z "$bearer_token" ]]; then
    echo "missing bearer secret ${bearer_secret_name} for ${reviewer}" >&2
    exit 1
  fi

  gateway_token="${!gateway_secret_name:-}"
  if [[ -z "$gateway_token" ]]; then
    gateway_token="$(generate_gateway_token)"
    set_infisical_secret "$gateway_secret_name" "$gateway_token"
  fi

  entitlement_row="$(
    fetch_entitlement_binding "$account_id" "$email" | jq -c '
      if type == "array" then
        .[0].results[0] // empty
      elif type == "object" then
        .results[0] // empty
      else
        empty
      end
    '
  )"
  if [[ -z "$entitlement_row" ]]; then
    echo "no entitlement row found for ${reviewer}" >&2
    exit 1
  fi

  if [[ "$(printf '%s' "$entitlement_row" | jq -r '.managed_bearer_allowed')" != "1" || "$(printf '%s' "$entitlement_row" | jq -r '.service_entitled')" != "1" || "$(printf '%s' "$entitlement_row" | jq -r '.policy_accepted')" != "1" || "$(printf '%s' "$entitlement_row" | jq -r '.contract_active')" != "1" || "$(printf '%s' "$entitlement_row" | jq -r '.billing_active')" != "1" ]]; then
    echo "entitlement row is not managed-bearer ready for ${reviewer}" >&2
    printf '%s\n' "$entitlement_row" | jq .
    exit 1
  fi

  auth_subject="$(printf '%s' "$entitlement_row" | jq -r '.auth_subject // empty')"
  host_key="$lane_slug"
  if [[ -z "$auth_subject" ]]; then
    echo "entitlement row missing auth_subject for ${reviewer}" >&2
    exit 1
  fi

  if [[ "$(printf '%s' "$entitlement_row" | jq -r '.account_id // empty')" != "$account_id" ]]; then
    echo "account_id mismatch for ${reviewer}: manifest=${account_id}" >&2
    printf '%s\n' "$entitlement_row" | jq .
    exit 1
  fi

  if [[ "$(printf '%s' "$entitlement_row" | jq -r '.tenant_id // empty')" != "$tenant_id" ]]; then
    echo "tenant_id mismatch for ${reviewer}: manifest=${tenant_id}" >&2
    printf '%s\n' "$entitlement_row" | jq .
    exit 1
  fi

  prefixes_json="$(printf '%s' "$entry_json" | jq -c '.allowed_tool_prefixes // []')"
  if [[ "$prefixes_json" == "[]" ]]; then
    prefixes_json="$(jq -c '.allowed_tool_prefixes' "$MANIFEST_FILE")"
  fi

  bearer_prefix="$(printf '%.14s' "$bearer_token")"
  existing_managed_row="$(
    fetch_existing_managed_bearer "$auth_subject" | jq -c '
      if type == "array" then
        .[0].results[0] // empty
      elif type == "object" then
        .results[0] // empty
      else
        empty
      end
    '
  )"
  if [[ -n "$existing_managed_row" && "$DRY_RUN" != "true" ]]; then
    if [[ "$(printf '%s' "$existing_managed_row" | jq -r '.revoked_at // empty')" == "" \
      && "$(printf '%s' "$existing_managed_row" | jq -r '.token_prefix // empty')" == "$bearer_prefix" \
      && "$(printf '%s' "$existing_managed_row" | jq -r '.account_id // empty')" == "$account_id" \
      && "$(printf '%s' "$existing_managed_row" | jq -r '.tenant_id // empty')" == "$tenant_id" \
      && "$(printf '%s' "$existing_managed_row" | jq -r '.bound_host // empty')" == "$host_key" ]]; then
      echo "managed bearer already adopted for ${reviewer}; skipping re-issue"
      jq -n \
        --arg token_id "$(printf '%s' "$existing_managed_row" | jq -r '.id')" \
        --arg token_prefix "$bearer_prefix" \
        --arg token_source "adopted" \
        --arg account_id "$account_id" \
        --arg tenant_id "$tenant_id" \
        --arg auth_subject "$auth_subject" \
        --arg bound_host "$host_key" \
        '{
          token_id: $token_id,
          token_prefix: $token_prefix,
          token_source: $token_source,
          account_id: $account_id,
          tenant_id: $tenant_id,
          auth_subject: $auth_subject,
          bound_host: $bound_host
        }'
      return 0
    fi
  fi

  echo "adopting managed bearer for ${reviewer_name} (${reviewer})"
  if [[ "$DRY_RUN" == "true" ]]; then
    jq -n \
      --arg reviewer "$reviewer" \
      --arg auth_subject "$auth_subject" \
      --arg email "$email" \
      --arg account_id "$account_id" \
      --arg tenant_id "$tenant_id" \
      --arg host_key "$host_key" \
      --arg bearer_secret_name "$bearer_secret_name" \
      --arg gateway_secret_name "$gateway_secret_name" \
      --argjson allowed_tool_prefixes "$prefixes_json" \
      '{
        reviewer: $reviewer,
        auth_subject: $auth_subject,
        email: $email,
        account_id: $account_id,
        tenant_id: $tenant_id,
        host_key: $host_key,
        bearer_secret_name: $bearer_secret_name,
        gateway_secret_name: $gateway_secret_name,
        allowed_tool_prefixes: $allowed_tool_prefixes
      }'
    return 0
  fi

  body_file="$(mktemp)"
  status="$(
    jq -cn \
      --arg auth_subject "$auth_subject" \
      --arg auth_email "$email" \
      --arg account_id "$account_id" \
      --arg tenant_id "$tenant_id" \
      --arg bound_host "$host_key" \
      --arg existing_token "$bearer_token" \
      --arg actor "operator:webflow-reviewer-managed-bearer-adopt" \
      --argjson allowed_tool_prefixes "$prefixes_json" \
      '{
        auth_subject: $auth_subject,
        auth_email: $auth_email,
        account_id: $account_id,
        tenant_id: $tenant_id,
        bound_host: $bound_host,
        tool_mode: "read_write",
        toolkit_profile: [],
        allowed_tool_prefixes: $allowed_tool_prefixes,
        existing_token: $existing_token,
        actor: $actor,
        metadata: {
          issued_via: "webflow_reviewer_bearer_adoption",
          lane_slug: $bound_host,
          repeatable_workflow: true
        }
      }' | curl -sS -o "$body_file" -w "%{http_code}" \
        --max-time "$CURL_MAX_TIME" \
        -X POST "${IDENTITY_BASE_URL%/}/v1/mcp/long-lived-tokens/admin-issue" \
        -H "X-API-Key: ${IDENTITY_API_KEY}" \
        -H 'Content-Type: application/json' \
        --data @-
  )"

  if [[ "$status" != "200" ]]; then
    echo "managed bearer adoption failed for ${reviewer} (status=${status})" >&2
    cat "$body_file" >&2
    rm -f "$body_file"
    exit 1
  fi

  response_token="$(jq -r '.token // empty' "$body_file")"
  response_source="$(jq -r '.token_source // empty' "$body_file")"
  if [[ "$response_token" != "$bearer_token" ]]; then
    echo "identity-worker returned a different bearer for ${reviewer}; adoption was not lossless" >&2
    cat "$body_file" >&2
    rm -f "$body_file"
    exit 1
  fi
  if [[ "$response_source" != "adopted" ]]; then
    echo "identity-worker did not report adopted token source for ${reviewer}" >&2
    cat "$body_file" >&2
    rm -f "$body_file"
    exit 1
  fi

  jq '{
    token_id,
    token_prefix,
    token_source,
    account_id,
    tenant_id,
    auth_subject,
    bound_host
  }' "$body_file"
  rm -f "$body_file"
}

run_sync() {
  if [[ "$RUN_SYNC" != "true" ]]; then
    return 0
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] REVIEWER=${REVIEWER} $ROOT_DIR/scripts/cs-hub-webflow-reviewers-phase-b-vault-sync.sh"
    return 0
  fi

  REVIEWER="$REVIEWER" bash "$ROOT_DIR/scripts/cs-hub-webflow-reviewers-phase-b-vault-sync.sh"
}

run_deploy() {
  if [[ "$RUN_DEPLOY" != "true" ]]; then
    return 0
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] REVIEWER=${REVIEWER} bash $ROOT_DIR/scripts/cs-hub-webflow-reviewers-phase-b-deploy.sh all"
    return 0
  fi

  REVIEWER="$REVIEWER" bash "$ROOT_DIR/scripts/cs-hub-webflow-reviewers-phase-b-deploy.sh" all
}

run_verify() {
  local reviewer
  if [[ "$RUN_VERIFY" != "true" ]]; then
    return 0
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] run webflow-template-review-phase-b-smoke.sh for ${REVIEWER}"
    return 0
  fi

  if [[ "$REVIEWER" == "all" ]]; then
    while IFS= read -r reviewer; do
      REVIEWER="$reviewer" bash "$ROOT_DIR/scripts/webflow-template-review-phase-b-smoke.sh"
    done < <(jq -r '.reviewers[].reviewer' "$MANIFEST_FILE")
    return 0
  fi

  REVIEWER="$REVIEWER" bash "$ROOT_DIR/scripts/webflow-template-review-phase-b-smoke.sh"
}

main() {
  require_cmd curl
  require_cmd infisical
  require_cmd jq
  require_cmd node
  require_cmd openssl

  if [[ ! -f "$MANIFEST_FILE" ]]; then
    echo "missing manifest file: $MANIFEST_FILE" >&2
    exit 1
  fi

  case "$ACTION" in
    adopt|sync|deploy|verify|all)
      ;;
    *)
      echo "usage: $0 [adopt|sync|deploy|verify|all]" >&2
      exit 1
      ;;
  esac

  DRY_RUN="$(normalize_bool_or_fail "$DRY_RUN")"
  RUN_SYNC="$(normalize_bool_or_fail "$RUN_SYNC")"
  RUN_DEPLOY="$(normalize_bool_or_fail "$RUN_DEPLOY")"
  RUN_VERIFY="$(normalize_bool_or_fail "$RUN_VERIFY")"
  INFISICAL_INCLUDE_IMPORTS="$(normalize_bool_or_fail "$INFISICAL_INCLUDE_IMPORTS")"

  load_secrets_from_infisical

  if [[ -z "${IDENTITY_API_KEY:-}" && -n "${IDENTITY_WORKER_ADMIN_API_KEY:-}" ]]; then
    export IDENTITY_API_KEY="$IDENTITY_WORKER_ADMIN_API_KEY"
  fi

  if [[ "$ACTION" == "adopt" || "$ACTION" == "all" ]]; then
    [[ -n "${IDENTITY_API_KEY:-}" ]] || { echo "missing IDENTITY_API_KEY or IDENTITY_WORKER_ADMIN_API_KEY" >&2; exit 1; }

    while IFS= read -r entry_json; do
      if reviewer_matches "$(printf '%s' "$entry_json" | jq -r '.reviewer')"; then
        adopt_one "$entry_json"
      fi
    done < <(jq -c '.reviewers[]' "$MANIFEST_FILE")
  fi

  if [[ "$ACTION" == "sync" || "$ACTION" == "all" ]]; then
    run_sync
  fi

  if [[ "$ACTION" == "deploy" || "$ACTION" == "all" ]]; then
    run_deploy
  fi

  if [[ "$ACTION" == "verify" || "$ACTION" == "all" ]]; then
    run_verify
  fi
}

main "$@"
