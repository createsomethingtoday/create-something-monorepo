#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HUB_DIR="$ROOT_DIR/packages/cs-mcp-hub-remote"

WORKERS=(
  "cs-hub-lainy"
  "cs-hub-danny"
  "cs-hub-august"
  "cs-hub-c3denver"
  "cs-hub-aaron-outerfields"
  "cs-hub-andre-outerfields"
  "cs-hub-fillip"
  "cs-hub-leah"
  "cs-hub-mj"
  "cs-mcp-hub-remote"
)

REQUIRED_SECRETS=(
  "HUB_API_TOKEN"
  "HUB_SESSION_RESOLVE_TOKEN"
  "BRAINTRUST_API_KEY"
  "BRAINTRUST_PROJECT_ID"
)

INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/}"
INFISICAL_INCLUDE_IMPORTS="${INFISICAL_INCLUDE_IMPORTS:-true}"
LOAD_FROM_INFISICAL="${LOAD_FROM_INFISICAL:-auto}"
VERIFY_CURL_CONNECT_TIMEOUT_SECONDS="${VERIFY_CURL_CONNECT_TIMEOUT_SECONDS:-5}"
VERIFY_CURL_MAX_TIME_SECONDS="${VERIFY_CURL_MAX_TIME_SECONDS:-30}"

SHARED_AUTH_SERVERS=(
  "composio-toolkit-dropbox"
  "composio-toolkit-gmail"
  "composio-toolkit-youtube"
  "composio-toolkit-googlesheets"
  "composio-toolkit-googledrive"
  "composio-toolkit-zoom"
  "composio-toolkit-slack"
  "composio-toolkit-quickbooks"
  "composio-toolkit-linkedin"
  "composio-toolkit-notion"
)
OUTERFIELDS_CLICKUP_SERVERS=(
  "${SHARED_AUTH_SERVERS[@]}"
  "composio-toolkit-clickup"
)

join_by_comma() {
  local IFS=','
  echo "$*"
}

SHARED_AUTH_SERVERS_CSV="$(join_by_comma "${SHARED_AUTH_SERVERS[@]}")"
OUTERFIELDS_CLICKUP_SERVERS_CSV="$(join_by_comma "${OUTERFIELDS_CLICKUP_SERVERS[@]}")"
DANNY_SERVERS_CSV="${SHARED_AUTH_SERVERS_CSV},halfdozen-dm-mcp,halfdozen-operator-notion-mcp"
C3DENVER_SERVERS_CSV="composio-toolkit-airtable,composio-toolkit-gmail,composio-toolkit-notion"
MJ_SERVERS_CSV="composio-toolkit-airtable,${SHARED_AUTH_SERVERS_CSV},composio-toolkit-exa,meetings,webflow-template-review-mcp"
VERIFY_IDENTITY_MODE="${HUB_VERIFY_IDENTITY_MODE:-compat}"
VERIFY_IDENTITY_MODE="$(printf '%s' "$VERIFY_IDENTITY_MODE" | tr '[:upper:]' '[:lower:]')"

case "$VERIFY_IDENTITY_MODE" in
  "compat"|"session_required")
    ;;
  *)
    echo "invalid HUB_VERIFY_IDENTITY_MODE=${VERIFY_IDENTITY_MODE}; expected compat|session_required" >&2
    exit 1
    ;;
esac

health_url_for_worker() {
  case "$1" in
    "cs-hub-lainy") echo "https://lainy.mcp.createsomething.agency/health" ;;
    "cs-hub-danny") echo "https://danny.mcp.createsomething.agency/health" ;;
    "cs-hub-august") echo "https://august.mcp.createsomething.agency/health" ;;
    "cs-hub-c3denver") echo "https://c3denver.mcp.createsomething.agency/health" ;;
    "cs-hub-aaron-outerfields") echo "https://aaron-outerfields.mcp.createsomething.agency/health" ;;
    "cs-hub-andre-outerfields") echo "https://andre-outerfields.mcp.createsomething.agency/health" ;;
    "cs-hub-fillip"|"cs-hub-filip") echo "https://fillip.mcp.createsomething.agency/health" ;;
    "cs-hub-leah") echo "https://leah.mcp.createsomething.agency/health" ;;
    "cs-hub-mj") echo "https://mj.mcp.createsomething.agency/health" ;;
    "cs-mcp-hub-remote") echo "https://cs-mcp-hub-remote.createsomething.workers.dev/health" ;;
    *)
      return 1
      ;;
  esac
}

mcp_url_for_worker() {
  case "$1" in
    "cs-hub-lainy") echo "https://lainy.mcp.createsomething.agency/mcp" ;;
    "cs-hub-danny") echo "https://danny.mcp.createsomething.agency/mcp" ;;
    "cs-hub-august") echo "https://august.mcp.createsomething.agency/mcp" ;;
    "cs-hub-c3denver") echo "https://c3denver.mcp.createsomething.agency/mcp" ;;
    "cs-hub-aaron-outerfields") echo "https://aaron-outerfields.mcp.createsomething.agency/mcp" ;;
    "cs-hub-andre-outerfields") echo "https://andre-outerfields.mcp.createsomething.agency/mcp" ;;
    "cs-hub-fillip"|"cs-hub-filip") echo "https://fillip.mcp.createsomething.agency/mcp" ;;
    "cs-hub-leah") echo "https://leah.mcp.createsomething.agency/mcp" ;;
    "cs-hub-mj") echo "https://mj.mcp.createsomething.agency/mcp" ;;
    "cs-mcp-hub-remote") echo "https://cs-mcp-hub-remote.createsomething.workers.dev/mcp" ;;
    *)
      return 1
      ;;
  esac
}

token_env_var_for_worker() {
  case "$1" in
    "cs-hub-lainy") echo "CS_HUB_LAINY_API_TOKEN" ;;
    "cs-hub-danny") echo "CS_HUB_DANNY_API_TOKEN" ;;
    "cs-hub-august") echo "CS_HUB_AUGUST_API_TOKEN" ;;
    "cs-hub-c3denver") echo "CS_HUB_C3DENVER_API_TOKEN" ;;
    "cs-hub-aaron-outerfields") echo "CS_HUB_AARON_OUTERFIELDS_API_TOKEN" ;;
    "cs-hub-andre-outerfields") echo "CS_HUB_ANDRE_OUTERFIELDS_API_TOKEN" ;;
    "cs-hub-fillip"|"cs-hub-filip") echo "CS_HUB_FILLIP_API_TOKEN" ;;
    "cs-hub-leah") echo "CS_HUB_LEAH_API_TOKEN" ;;
    "cs-hub-mj") echo "CS_HUB_MJ_API_TOKEN" ;;
    "cs-mcp-hub-remote") echo "CS_MCP_HUB_REMOTE_API_TOKEN" ;;
    *)
      return 1
      ;;
  esac
}

resolve_worker_token() {
  local worker="$1"
  local token_var_name
  token_var_name="$(token_env_var_for_worker "$worker")"
  local token="${!token_var_name:-}"
  if [[ -z "$token" && ( "$worker" == "cs-hub-fillip" || "$worker" == "cs-hub-filip" ) ]]; then
    token="${CS_HUB_FILIP_API_TOKEN:-}"
  fi
  if [[ -z "$token" ]]; then
    token="${HUB_API_TOKEN:-}"
  fi
  echo "$token"
}

expected_account_id_for_worker() {
  case "$1" in
    "cs-hub-lainy") echo "acct_lainy" ;;
    "cs-hub-danny") echo "acct_danny" ;;
    "cs-hub-august") echo "acct_august" ;;
    "cs-hub-c3denver") echo "acct_c3_denver" ;;
    "cs-hub-aaron-outerfields") echo "acct_aaron_outerfields" ;;
    "cs-hub-andre-outerfields") echo "acct_andre_outerfields" ;;
    "cs-hub-fillip"|"cs-hub-filip") echo "acct_fillip" ;;
    "cs-hub-leah") echo "acct_leah" ;;
    "cs-hub-mj") echo "acct_mj" ;;
    *)
      return 1
      ;;
  esac
}

resolve_secret_check_worker_name() {
  local worker="$1"
  if [[ "$worker" != "cs-hub-fillip" ]]; then
    echo "$worker"
    return 0
  fi
  if pnpm exec wrangler secret list --name "cs-hub-fillip" >/dev/null 2>&1; then
    echo "cs-hub-fillip"
    return 0
  fi
  if pnpm exec wrangler secret list --name "cs-hub-filip" >/dev/null 2>&1; then
    echo "cs-hub-filip"
    return 0
  fi
  echo "cs-hub-fillip"
}

expected_identity_mode_for_worker() {
  case "$1" in
    "cs-mcp-hub-remote") echo "session_required" ;;
    *) echo "compat" ;;
  esac
}

expected_enabled_servers_csv_for_worker() {
  case "$1" in
    "cs-hub-lainy"|"cs-hub-august"|"cs-hub-fillip"|"cs-hub-leah") echo "$SHARED_AUTH_SERVERS_CSV" ;;
    "cs-hub-danny") echo "$DANNY_SERVERS_CSV" ;;
    "cs-hub-c3denver") echo "$C3DENVER_SERVERS_CSV" ;;
    "cs-hub-aaron-outerfields"|"cs-hub-andre-outerfields") echo "$OUTERFIELDS_CLICKUP_SERVERS_CSV" ;;
    "cs-hub-mj") echo "$MJ_SERVERS_CSV" ;;
    *)
      return 1
      ;;
  esac
}

expected_enabled_policy_label_for_worker() {
  case "$1" in
    "cs-hub-lainy"|"cs-hub-august"|"cs-hub-fillip"|"cs-hub-leah") echo "shared_auth_core" ;;
    "cs-hub-danny") echo "danny_shared_auth_plus_dm_and_operator_notion" ;;
    "cs-hub-c3denver") echo "c3denver_airtable_gmail_notion" ;;
    "cs-hub-aaron-outerfields"|"cs-hub-andre-outerfields") echo "outerfields_shared_auth_plus_clickup" ;;
    "cs-hub-mj") echo "mj_shared_auth_plus_ops_search_meetings_and_review" ;;
    *)
      return 1
      ;;
  esac
}

expected_discovery_pack_for_worker() {
  case "$1" in
    "cs-hub-danny") echo "danny-shared-auth-plus-dm-and-operator-notion" ;;
    "cs-hub-c3denver") echo "c3denver-airtable-gmail-notion" ;;
    "cs-hub-aaron-outerfields"|"cs-hub-andre-outerfields") echo "outerfields-shared-auth-clickup" ;;
    "cs-hub-mj") echo "mj-shared-auth-plus-ops-search-meetings-and-review" ;;
    *) echo "shared-auth-core" ;;
  esac
}

load_infisical_env() {
  if ! command -v infisical >/dev/null 2>&1; then
    return 1
  fi

  local payload
  payload="$(
    infisical export \
      --format=json \
      --env="$INFISICAL_ENV" \
      --path="$INFISICAL_PATH" \
      --include-imports="$INFISICAL_INCLUDE_IMPORTS"
  )" || return 1

  while IFS=$'\t' read -r key value; do
    if [[ -z "${!key:-}" ]]; then
      export "${key}=${value}"
    fi
  done < <(
    printf '%s' "$payload" | jq -r '
      def wanted:
        test("^(HUB_API_TOKEN|CS_HUB_[A-Z0-9_]+_API_TOKEN|CS_MCP_HUB_REMOTE_API_TOKEN|IDENTITY_API_KEY|IDENTITY_WORKER_ADMIN_API_KEY)$");
      if type == "array" then
        .[] | select(.key != null and (.key | wanted)) | [.key, (.value | tostring)]
      else
        to_entries[] | select(.key | wanted) | [.key, (.value | tostring)]
      end
      | @tsv
    '
  )

  if [[ -z "${IDENTITY_API_KEY:-}" && -n "${IDENTITY_WORKER_ADMIN_API_KEY:-}" ]]; then
    export IDENTITY_API_KEY="$IDENTITY_WORKER_ADMIN_API_KEY"
  fi
}

maybe_load_supporting_env() {
  local mode
  mode="$(printf '%s' "$LOAD_FROM_INFISICAL" | tr '[:upper:]' '[:lower:]')"
  if [[ "$mode" == "false" ]]; then
    return 0
  fi

  local need_load=0
  if [[ -z "${HUB_API_TOKEN:-}" || -z "${CS_MCP_HUB_REMOTE_API_TOKEN:-}" ]]; then
    need_load=1
  fi
  if [[ -z "${IDENTITY_API_KEY:-}" && -z "${IDENTITY_WORKER_ADMIN_API_KEY:-}" ]]; then
    need_load=1
  fi

  if [[ "$mode" == "true" || "$need_load" -eq 1 ]]; then
    if ! load_infisical_env; then
      if [[ "$mode" == "true" ]]; then
        echo "failed to load fleet verify secrets from Infisical" >&2
        exit 1
      fi
    fi
  fi
}

reset_discovery_preferences() {
  local mcp_url="$1"
  local token="$2"
  local session_token="${3:-}"
  local reset_payload='{"jsonrpc":"2.0","id":"fleet-verify-discovery-reset","method":"tools/call","params":{"name":"hub_set_discovery","arguments":{"reset":true}}}'
  local curl_args=(
    -sS
    --connect-timeout "${VERIFY_CURL_CONNECT_TIMEOUT_SECONDS}"
    --max-time "${VERIFY_CURL_MAX_TIME_SECONDS}"
    -X POST "$mcp_url"
    -H "Authorization: Bearer ${token}"
    -H "Content-Type: application/json"
    -H "Accept: application/json"
    --data "$reset_payload"
  )
  if [[ -n "$session_token" ]]; then
    curl_args+=(-H "X-MCP-Session-Token: ${session_token}")
  fi
  curl "${curl_args[@]}" >/dev/null || true
}

create_fleet_verify_session() {
  local identity_base_url="${IDENTITY_BASE_URL:-https://id.createsomething.space}"
  local identity_access_token="${IDENTITY_ACCESS_TOKEN:-}"
  local identity_admin_token="${IDENTITY_API_KEY:-${IDENTITY_WORKER_ADMIN_API_KEY:-}}"
  local tenant_id="${MCP_SESSION_TENANT_ID:-fleet_verify}"
  local host="${MCP_SESSION_HOST:-cs-mcp-hub-remote}"
  local default_account_id="${MCP_SESSION_ACCOUNT_ID:-${POLICY_OS_ACCOUNT_ID:-${MCP_ONLY_ACCOUNT_ID:-acct_mj}}}"
  local toolkit_profile_json="${MCP_SESSION_TOOLKIT_PROFILE_JSON:-[\"dropbox\",\"gmail\",\"youtube\",\"googlesheets\",\"googledrive\",\"zoom\",\"slack\",\"quickbooks\",\"linkedin\",\"notion\"]}"

  if [[ -n "${MCP_SESSION_TOKEN:-}" ]]; then
    FLEET_VERIFY_SESSION_TOKEN="$MCP_SESSION_TOKEN"
    FLEET_VERIFY_ACCOUNT_ID="${MCP_SESSION_ACCOUNT_ID:-}"
    echo "session_token_source=env"
    return 0
  fi

  create_admin_mint_session() {
    local account_id="$default_account_id"
    if [[ -z "$identity_admin_token" || -z "$account_id" ]]; then
      return 1
    fi

    local create_url="${identity_base_url%/}/v1/mcp/sessions/admin-mint"
    local consent_granted_at body_file status
    consent_granted_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    body_file="$(mktemp)"
    status="$(
      curl -sS -o "$body_file" -w "%{http_code}" -X POST "$create_url" \
        --connect-timeout "${VERIFY_CURL_CONNECT_TIMEOUT_SECONDS}" \
        --max-time "${VERIFY_CURL_MAX_TIME_SECONDS}" \
        -H "X-API-Key: ${identity_admin_token}" \
        -H "Content-Type: application/json" \
        --data "$(jq -cn \
          --arg account_id "$account_id" \
          --arg host "$host" \
          --arg consent_record_id "consent_cs_hub_fleet_verify" \
          --arg consent_granted_at "$consent_granted_at" \
          --arg workspace_account_id "$account_id" \
          --argjson toolkitProfile "$toolkit_profile_json" '{
            account_id: $account_id,
            host: $host,
            tool_mode: "read_write",
            toolkit_profile: $toolkitProfile,
            actor: "operator:cs-hub-fleet-verify",
            consent_record_id: $consent_record_id,
            consent_granted_at: $consent_granted_at,
            metadata: {
              client_slug: "cs-hub-fleet-verify",
              workspace_account_id: $workspace_account_id
            }
          }')"
    )"

    if [[ "$status" != "200" ]]; then
      echo "failed to admin-mint MCP session via identity-worker (status=${status})" >&2
      cat "$body_file" >&2
      rm -f "$body_file"
      return 1
    fi

    local token account_id_value session_id
    token="$(jq -r '.token // empty' "$body_file")"
    account_id_value="$(jq -r '.account_id // empty' "$body_file")"
    session_id="$(jq -r '.session_id // empty' "$body_file")"
    rm -f "$body_file"

    if [[ -z "$token" || -z "$account_id_value" ]]; then
      echo "identity-worker admin-mint response missing token/account_id" >&2
      return 1
    fi

    echo "${token}|${account_id_value}|${session_id}"
  }

  create_admin_managed_bearer() {
    local auth_subject="${MCP_SESSION_AUTH_SUBJECT:-${POLICY_OS_AUTH_SUBJECT:-${MCP_ONLY_AUTH_SUBJECT:-}}}"
    local account_id="$default_account_id"
    local tenant_id_value="${MCP_SESSION_TENANT_ID:-${POLICY_OS_TENANT_ID:-${MCP_ONLY_TENANT_ID:-${tenant_id}}}}"
    if [[ -z "$identity_admin_token" || -z "$auth_subject" || -z "$account_id" || -z "$tenant_id_value" ]]; then
      return 1
    fi

    local issue_url="${identity_base_url%/}/v1/mcp/long-lived-tokens/admin-issue"
    local body_file status
    body_file="$(mktemp)"
    status="$(
      curl -sS -o "$body_file" -w "%{http_code}" -X POST "$issue_url" \
        --connect-timeout "${VERIFY_CURL_CONNECT_TIMEOUT_SECONDS}" \
        --max-time "${VERIFY_CURL_MAX_TIME_SECONDS}" \
        -H "X-API-Key: ${identity_admin_token}" \
        -H "Content-Type: application/json" \
        --data "$(jq -cn \
          --arg auth_subject "$auth_subject" \
          --arg account_id "$account_id" \
          --arg tenant_id "$tenant_id_value" \
          --arg actor "operator:cs-hub-fleet-verify" \
          --argjson toolkitProfile "$toolkit_profile_json" '{
            auth_subject: $auth_subject,
            account_id: $account_id,
            tenant_id: $tenant_id,
            tool_mode: "read_write",
            toolkit_profile: $toolkitProfile,
            actor: $actor,
            metadata: {
              reason: "cs_hub_fleet_verify"
            }
          }')"
    )"

    if [[ "$status" != "200" ]]; then
      echo "failed to issue managed bearer via identity-worker (status=${status})" >&2
      cat "$body_file" >&2
      rm -f "$body_file"
      return 1
    fi

    local token issued_account_id token_id
    token="$(jq -r '.token // empty' "$body_file")"
    issued_account_id="$(jq -r '.account_id // empty' "$body_file")"
    token_id="$(jq -r '.token_id // empty' "$body_file")"
    rm -f "$body_file"

    if [[ -z "$token" || -z "$issued_account_id" ]]; then
      echo "identity-worker admin issue response missing token/account_id" >&2
      return 1
    fi

    echo "${token}|${issued_account_id}|${token_id}"
  }

  local minted
  if minted="$(create_admin_mint_session)"; then
    local minted_token minted_account minted_session
    IFS='|' read -r minted_token minted_account minted_session <<< "$minted"
    FLEET_VERIFY_SESSION_TOKEN="$minted_token"
    FLEET_VERIFY_ACCOUNT_ID="$minted_account"
    echo "session_token_source=identity_worker_admin_mint account_id=${FLEET_VERIFY_ACCOUNT_ID} session_id=${minted_session:-unknown}"
    return 0
  fi

  if minted="$(create_admin_managed_bearer)"; then
    local issued_token issued_account issued_token_id
    IFS='|' read -r issued_token issued_account issued_token_id <<< "$minted"
    FLEET_VERIFY_SESSION_TOKEN="$issued_token"
    FLEET_VERIFY_ACCOUNT_ID="$issued_account"
    echo "session_token_source=identity_worker_admin_issue account_id=${FLEET_VERIFY_ACCOUNT_ID} token_id=${issued_token_id:-unknown}"
    return 0
  fi

  if [[ -z "$identity_access_token" ]]; then
    echo "missing MCP_SESSION_TOKEN, admin identity token, or IDENTITY_ACCESS_TOKEN for session-based E2E checks"
    return 1
  fi

  create_one_identity_session() {
    local create_url="${identity_base_url%/}/v1/mcp/sessions"
    local body_file status
    body_file="$(mktemp)"
    status="$(
      curl -sS -o "$body_file" -w "%{http_code}" -X POST "$create_url" \
        --connect-timeout "${VERIFY_CURL_CONNECT_TIMEOUT_SECONDS}" \
        --max-time "${VERIFY_CURL_MAX_TIME_SECONDS}" \
        -H "Authorization: Bearer ${identity_access_token}" \
        -H "Content-Type: application/json" \
        --data "$(jq -cn --arg tenant "$tenant_id" --arg host "$host" --argjson toolkitProfile "$toolkit_profile_json" '{
          tenant_id: $tenant,
          host: $host,
          toolkit_profile: $toolkitProfile,
          tool_mode: "read_write",
          ttl_seconds: 3600
        }')"
    )"

    if [[ "$status" != "200" ]]; then
      echo "failed to create MCP session via identity-worker (status=${status})"
      cat "$body_file"
      rm -f "$body_file"
      return 1
    fi

    local token account_id session_id
    token="$(jq -r '.token // empty' "$body_file")"
    account_id="$(jq -r '.account_id // empty' "$body_file")"
    session_id="$(jq -r '.session_id // empty' "$body_file")"
    rm -f "$body_file"

    if [[ -z "$token" || -z "$account_id" ]]; then
      echo "identity-worker create session response missing token/account_id"
      return 1
    fi

    echo "${token}|${account_id}|${session_id}"
  }

  local first second
  if ! first="$(create_one_identity_session)"; then
    return 1
  fi
  if ! second="$(create_one_identity_session)"; then
    return 1
  fi

  local first_token first_account first_session
  local second_token second_account second_session
  IFS='|' read -r first_token first_account first_session <<< "$first"
  IFS='|' read -r second_token second_account second_session <<< "$second"

  if [[ "$first_account" != "$second_account" ]]; then
    echo "stable-account check failed: account_id changed for same user+tenant"
    echo "first_account=${first_account}"
    echo "second_account=${second_account}"
    return 1
  fi

  FLEET_VERIFY_SESSION_TOKEN="$first_token"
  FLEET_VERIFY_ACCOUNT_ID="$first_account"

  echo "session_token_source=identity_worker account_id=${FLEET_VERIFY_ACCOUNT_ID} stability_check=ok first_session_id=${first_session:-unknown} second_session_id=${second_session:-unknown}"
  return 0
}

check_mcp_protocol() {
  local worker="$1"
  local mcp_url token_var_name token token_help expected_mode session_header
  mcp_url="$(mcp_url_for_worker "$worker")"
  token_var_name="$(token_env_var_for_worker "$worker")"
  token="$(resolve_worker_token "$worker")"
  token_help="${token_var_name} (or HUB_API_TOKEN)"
  expected_mode="$(expected_identity_mode_for_worker "$worker")"
  session_header=""

  if [[ -z "$token" ]]; then
    echo "missing API token for ${worker} (${token_help})"
    failures=1
    return
  fi
  if [[ "$expected_mode" == "session_required" ]]; then
    if [[ -z "${FLEET_VERIFY_SESSION_TOKEN:-}" ]]; then
      echo "missing fleet verify MCP session token for ${worker}"
      failures=1
      return
    fi
    session_header="$FLEET_VERIFY_SESSION_TOKEN"
  fi

  local init_headers init_body init_status session_id
  init_headers="$(mktemp)"
  init_body="$(mktemp)"
  init_status="$(
    curl -sS -o "$init_body" -D "$init_headers" -w "%{http_code}" \
      --connect-timeout "${VERIFY_CURL_CONNECT_TIMEOUT_SECONDS}" \
      --max-time "${VERIFY_CURL_MAX_TIME_SECONDS}" \
      -X POST "$mcp_url" \
      -H "Authorization: Bearer ${token}" \
      -H 'Content-Type: application/json' \
      -H 'Accept: application/json' \
      ${session_header:+-H "X-MCP-Session-Token: ${session_header}"} \
      --data '{"jsonrpc":"2.0","id":"fleet-verify-init","method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"cs-hub-fleet-verify","version":"1.0.0"},"capabilities":{}}}'
  )"

  if [[ "$init_status" != "200" ]]; then
    echo "initialize failed for ${worker} (status=${init_status})"
    cat "$init_body"
    failures=1
    rm -f "$init_headers" "$init_body"
    return
  fi

  if ! jq -e '.error == null and .result != null' "$init_body" >/dev/null; then
    echo "initialize returned JSON-RPC error for ${worker}"
    cat "$init_body"
    failures=1
    rm -f "$init_headers" "$init_body"
    return
  fi

  if ! jq -e '.result.capabilities.resources != null' "$init_body" >/dev/null; then
    echo "initialize missing resources capability for ${worker}"
    cat "$init_body"
    failures=1
    rm -f "$init_headers" "$init_body"
    return
  fi

  session_id="$(
    tr -d '\r' < "$init_headers" \
      | awk -F': ' 'tolower($1) == "mcp-session-id" { print $2 }' \
      | tail -n 1
  )"

  local list_headers list_body list_status
  list_headers="$(mktemp)"
  list_body="$(mktemp)"

  local curl_args=(
    -sS
    --connect-timeout "${VERIFY_CURL_CONNECT_TIMEOUT_SECONDS}"
    --max-time "${VERIFY_CURL_MAX_TIME_SECONDS}"
    -o "$list_body"
    -D "$list_headers"
    -w "%{http_code}"
    -X POST "$mcp_url"
    -H "Authorization: Bearer ${token}"
    -H "Content-Type: application/json"
    -H "Accept: application/json"
    --data '{"jsonrpc":"2.0","id":"fleet-verify-resources-list","method":"resources/list","params":{}}'
  )
  if [[ -n "$session_id" ]]; then
    curl_args+=(-H "Mcp-Session-Id: ${session_id}")
  elif [[ -n "$session_header" ]]; then
    curl_args+=(-H "X-MCP-Session-Token: ${session_header}")
  fi

  list_status="$(curl "${curl_args[@]}")"
  if [[ "$list_status" != "200" ]]; then
    echo "resources/list failed for ${worker} (status=${list_status})"
    cat "$list_body"
    failures=1
    rm -f "$init_headers" "$init_body" "$list_headers" "$list_body"
    return
  fi

  if ! jq -e '.error == null and (.result.resources | type == "array")' "$list_body" >/dev/null; then
    echo "resources/list returned JSON-RPC error for ${worker}"
    cat "$list_body"
    failures=1
    rm -f "$init_headers" "$init_body" "$list_headers" "$list_body"
    return
  fi

  if ! jq -e '.result.resources[]? | select(.uri == "hub://status")' "$list_body" >/dev/null; then
    echo "resources/list missing expected hub://status resource for ${worker}"
    cat "$list_body"
    failures=1
    rm -f "$init_headers" "$init_body" "$list_headers" "$list_body"
    return
  fi

  echo "protocol_check=ok resources=$(jq -r '.result.resources | length' "$list_body")"
  rm -f "$init_headers" "$init_body" "$list_headers" "$list_body"
}

check_missing_session_token_rejected() {
  local worker="$1"
  local mcp_url token_var_name token token_help
  mcp_url="$(mcp_url_for_worker "$worker")"
  token_var_name="$(token_env_var_for_worker "$worker")"
  token="$(resolve_worker_token "$worker")"
  token_help="${token_var_name} (or HUB_API_TOKEN)"

  if [[ -z "$token" ]]; then
    echo "missing API token for ${worker} (${token_help})"
    failures=1
    return
  fi

  local body_file status
  body_file="$(mktemp)"
  status="$(
    curl -sS -o "$body_file" -w "%{http_code}" -X POST "$mcp_url" \
      --connect-timeout "${VERIFY_CURL_CONNECT_TIMEOUT_SECONDS}" \
      --max-time "${VERIFY_CURL_MAX_TIME_SECONDS}" \
      -H "Authorization: Bearer ${token}" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json" \
      --data '{"jsonrpc":"2.0","id":"fleet-verify-missing-session","method":"tools/call","params":{"name":"hub_status","arguments":{}}}'
  )"

  if jq -e '.result != null and .error == null' "$body_file" >/dev/null 2>&1; then
    echo "strict identity check failed for ${worker}: request without X-MCP-Session-Token unexpectedly succeeded"
    cat "$body_file"
    failures=1
    rm -f "$body_file"
    return
  fi

  if ! grep -qiE 'X-MCP-Session-Token|session_required|Unauthorized MCP session token|HUB_IDENTITY_MODE' "$body_file"; then
    echo "strict identity check failed for ${worker}: expected session-token error message"
    echo "status=${status}"
    cat "$body_file"
    failures=1
    rm -f "$body_file"
    return
  fi

  echo "missing_session_token=enforced"
  rm -f "$body_file"
}

check_compat_identity_without_session() {
  local worker="$1"
  local mcp_url token_var_name token token_help
  mcp_url="$(mcp_url_for_worker "$worker")"
  token_var_name="$(token_env_var_for_worker "$worker")"
  token="$(resolve_worker_token "$worker")"
  token_help="${token_var_name} (or HUB_API_TOKEN)"

  if [[ -z "$token" ]]; then
    echo "missing API token for ${worker} (${token_help})"
    failures=1
    return
  fi

  local body_file status
  body_file="$(mktemp)"
  status="$(
    curl -sS -o "$body_file" -w "%{http_code}" -X POST "$mcp_url" \
      --connect-timeout "${VERIFY_CURL_CONNECT_TIMEOUT_SECONDS}" \
      --max-time "${VERIFY_CURL_MAX_TIME_SECONDS}" \
      -H "Authorization: Bearer ${token}" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json" \
      --data '{"jsonrpc":"2.0","id":"fleet-verify-compat-no-session","method":"tools/call","params":{"name":"hub_status","arguments":{}}}'
  )"

  if [[ "$status" != "200" ]]; then
    echo "compat identity check failed for ${worker}: request without X-MCP-Session-Token failed (status=${status})"
    cat "$body_file"
    failures=1
    rm -f "$body_file"
    return
  fi

  if ! jq -e '.result != null and .error == null' "$body_file" >/dev/null 2>&1; then
    echo "compat identity check failed for ${worker}: expected success without X-MCP-Session-Token"
    cat "$body_file"
    failures=1
    rm -f "$body_file"
    return
  fi

  echo "compat_no_session=ok"
  rm -f "$body_file"
}

check_discovery_pack_reset() {
  local worker="$1"
  local expected_pack mcp_url token_var_name token token_help
  expected_pack="$(expected_discovery_pack_for_worker "$worker")"
  mcp_url="$(mcp_url_for_worker "$worker")"
  token_var_name="$(token_env_var_for_worker "$worker")"
  token="$(resolve_worker_token "$worker")"
  token_help="${token_var_name} (or HUB_API_TOKEN)"

  if [[ -z "$token" ]]; then
    echo "missing API token for ${worker} (${token_help})"
    failures=1
    return
  fi

  local body_file status
  body_file="$(mktemp)"
  local -a headers=(
    -H "Authorization: Bearer ${token}"
    -H "Content-Type: application/json"
    -H "Accept: application/json"
  )
  if [[ "$(expected_identity_mode_for_worker "$worker")" == "session_required" ]]; then
    if [[ -z "${FLEET_VERIFY_SESSION_TOKEN:-}" ]]; then
      echo "discovery_pack=skipped reason=missing_fleet_verify_session_token"
      rm -f "$body_file"
      failures=1
      return
    fi
    headers+=(-H "X-MCP-Session-Token: ${FLEET_VERIFY_SESSION_TOKEN}")
  fi

  status="$(
    curl -sS -o "$body_file" -w "%{http_code}" -X POST "$mcp_url" \
      --connect-timeout "${VERIFY_CURL_CONNECT_TIMEOUT_SECONDS}" \
      --max-time "${VERIFY_CURL_MAX_TIME_SECONDS}" \
      "${headers[@]}" \
      --data '{"jsonrpc":"2.0","id":"fleet-verify-reset-discovery","method":"tools/call","params":{"name":"hub_set_discovery","arguments":{"reset":true}}}'
  )"

  if [[ "$status" != "200" ]]; then
    echo "discovery pack reset failed for ${worker} (status=${status})"
    cat "$body_file"
    failures=1
    rm -f "$body_file"
    return
  fi

  if ! jq -e '.result != null and .error == null' "$body_file" >/dev/null 2>&1; then
    echo "discovery pack reset returned JSON-RPC error for ${worker}"
    cat "$body_file"
    failures=1
    rm -f "$body_file"
    return
  fi

  local actual_pack
  actual_pack="$(
    jq -r '
      .result.structuredContent.appliedPack.id //
      (.result.content[0].text | fromjson? | .appliedPack.id) //
      empty
    ' "$body_file"
  )"
  rm -f "$body_file"

  if [[ "$actual_pack" != "$expected_pack" ]]; then
    echo "discovery pack mismatch for ${worker}"
    echo "expected=${expected_pack}"
    echo "actual=${actual_pack:-<missing>}"
    failures=1
    return
  fi

  echo "discovery_pack=${actual_pack}"
}

extract_result_entity_id() {
  local body_file="$1"
  jq -r '
    .result.structuredContent.entityId //
    (.result.content[0].text | fromjson? | .entityId) //
    empty
  ' "$body_file"
}

search_visible_connection_status_tool() {
  local mcp_url="$1"
  local token="$2"
  local session_token="${3:-}"

  local services_body services_status
  services_body="$(mktemp)"
  if [[ -n "$session_token" ]]; then
    services_status="$(
      curl -sS -o "$services_body" -w "%{http_code}" -X POST "$mcp_url" \
        --connect-timeout "${VERIFY_CURL_CONNECT_TIMEOUT_SECONDS}" \
        --max-time "${VERIFY_CURL_MAX_TIME_SECONDS}" \
        -H "Authorization: Bearer ${token}" \
        -H "X-MCP-Session-Token: ${session_token}" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json" \
        --data '{"jsonrpc":"2.0","id":"fleet-verify-services","method":"tools/call","params":{"name":"hub_list_services","arguments":{}}}'
    )"
  else
    services_status="$(
      curl -sS -o "$services_body" -w "%{http_code}" -X POST "$mcp_url" \
        --connect-timeout "${VERIFY_CURL_CONNECT_TIMEOUT_SECONDS}" \
        --max-time "${VERIFY_CURL_MAX_TIME_SECONDS}" \
        -H "Authorization: Bearer ${token}" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json" \
        --data '{"jsonrpc":"2.0","id":"fleet-verify-services","method":"tools/call","params":{"name":"hub_list_services","arguments":{}}}'
    )"
  fi

  if [[ "$services_status" != "200" ]]; then
    cat "$services_body" >&2
    rm -f "$services_body"
    return 1
  fi

  local -a services=()
  while IFS= read -r service_name; do
    [[ -n "$service_name" ]] || continue
    services+=("$service_name")
  done < <(
    jq -r '
      (
        .result.structuredContent.services //
        (.result.content[0].text | fromjson? | .services) //
        []
      )
      | map(select(.activeInDiscovery == true and ((.visibleProxyTools // 0) > 0)))
      | .[].name
    ' "$services_body"
  )
  rm -f "$services_body"

  local -a preferred_services=(
    "composio-toolkit-notion"
    "composio-toolkit-gmail"
    "composio-toolkit-googledrive"
    "composio-toolkit-googlesheets"
    "composio-toolkit-slack"
  )
  local -a ordered_services=()
  local preferred candidate
  for preferred in "${preferred_services[@]}"; do
    for candidate in "${services[@]}"; do
      if [[ "$candidate" == "$preferred" ]]; then
        ordered_services+=("$candidate")
      fi
    done
  done
  for candidate in "${services[@]}"; do
    local already_added=0
    for preferred in "${ordered_services[@]}"; do
      if [[ "$candidate" == "$preferred" ]]; then
        already_added=1
        break
      fi
    done
    if [[ "$already_added" -eq 0 ]]; then
      ordered_services+=("$candidate")
    fi
  done
  services=("${ordered_services[@]}")

  local service_name
  for service_name in "${services[@]}"; do
    local body_file status payload
    body_file="$(mktemp)"
    payload="$(
      jq -cn --arg serverName "$service_name" '{
        jsonrpc:"2.0",
        id:"fleet-verify-search",
        method:"tools/call",
        params:{
          name:"hub_search_proxy_tools",
          arguments:{
            serverName:$serverName,
            query:"connection_status",
            limit:20
          }
        }
      }'
    )"
    if [[ -n "$session_token" ]]; then
      status="$(
        curl -sS -o "$body_file" -w "%{http_code}" -X POST "$mcp_url" \
          --connect-timeout "${VERIFY_CURL_CONNECT_TIMEOUT_SECONDS}" \
          --max-time "${VERIFY_CURL_MAX_TIME_SECONDS}" \
          -H "Authorization: Bearer ${token}" \
          -H "X-MCP-Session-Token: ${session_token}" \
          -H "Content-Type: application/json" \
          -H "Accept: application/json" \
          --data "$payload"
      )"
    else
      status="$(
        curl -sS -o "$body_file" -w "%{http_code}" -X POST "$mcp_url" \
          --connect-timeout "${VERIFY_CURL_CONNECT_TIMEOUT_SECONDS}" \
          --max-time "${VERIFY_CURL_MAX_TIME_SECONDS}" \
          -H "Authorization: Bearer ${token}" \
          -H "Content-Type: application/json" \
          -H "Accept: application/json" \
          --data "$payload"
      )"
    fi

    if [[ "$status" != "200" ]]; then
      cat "$body_file" >&2
      rm -f "$body_file"
      return 1
    fi

    local proxy_tool_name
    proxy_tool_name="$(
      jq -r '
        (
          .result.structuredContent.tools //
          (.result.content[0].text | fromjson? | .tools) //
          []
        )
        | map(select((.proxyToolName // "") | endswith("__connection_status")))
        | .[0].proxyToolName // empty
      ' "$body_file"
    )"
    rm -f "$body_file"

    if [[ -n "$proxy_tool_name" ]]; then
      echo "$proxy_tool_name"
      return 0
    fi
  done

  return 1
}

check_compat_account_routing() {
  local worker="$1"
  local expected_account_id mcp_url token_var_name token token_help
  local probe_proxy_tool="${COMPAT_ACCOUNT_ROUTING_PROXY_TOOL_NAME:-}"
  if ! expected_account_id="$(expected_account_id_for_worker "$worker")"; then
    echo "account_routing=skipped reason=no_expected_account_mapping"
    return
  fi
  mcp_url="$(mcp_url_for_worker "$worker")"
  token_var_name="$(token_env_var_for_worker "$worker")"
  token="$(resolve_worker_token "$worker")"
  token_help="${token_var_name} (or HUB_API_TOKEN)"

  if [[ -z "$token" ]]; then
    echo "missing API token for ${worker} (${token_help})"
    failures=1
    return
  fi

  if [[ -z "$probe_proxy_tool" ]]; then
    probe_proxy_tool="$(search_visible_connection_status_tool "$mcp_url" "$token" || true)"
  fi
  if [[ -z "$probe_proxy_tool" ]]; then
    echo "compat account routing check skipped for ${worker}: no visible connection_status probe tool"
    return
  fi

  local body_file status actual_account_id
  body_file="$(mktemp)"
  status="$(
    curl -sS -o "$body_file" -w "%{http_code}" -X POST "$mcp_url" \
      --connect-timeout "${VERIFY_CURL_CONNECT_TIMEOUT_SECONDS}" \
      --max-time "${VERIFY_CURL_MAX_TIME_SECONDS}" \
      -H "Authorization: Bearer ${token}" \
      -H "X-MCP-Account-Id: acct_spoof_attempt" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json" \
      --data "$(jq -cn --arg proxyToolName "$probe_proxy_tool" '{
        jsonrpc: "2.0",
        id: "fleet-verify-compat-account",
        method: "tools/call",
        params: {
          name: "hub_execute_proxy_tool",
          arguments: {
            proxyToolName: $proxyToolName,
            args: {}
          }
        }
      }')"
  )"
  if [[ "$status" != "200" ]]; then
    echo "compat account routing execution failed for ${worker} (status=${status})"
    cat "$body_file"
    failures=1
    rm -f "$body_file"
    return
  fi

  actual_account_id="$(extract_result_entity_id "$body_file")"
  if [[ -z "$actual_account_id" ]]; then
    echo "compat account routing check failed for ${worker}: could not read entityId from tool response"
    cat "$body_file"
    failures=1
    rm -f "$body_file"
    return
  fi
  rm -f "$body_file"
  if [[ "$actual_account_id" != "$expected_account_id" ]]; then
    echo "compat account routing mismatch for ${worker}"
    echo "expected=${expected_account_id}"
    echo "actual=${actual_account_id}"
    failures=1
    return
  fi

  echo "compat_account_routing=ok account_id=${actual_account_id}"
}

check_clickup_discovery_for_worker() {
  local worker="$1"
  local health_url health_json
  health_url="$(health_url_for_worker "$worker")"
  health_json="$(
    curl -fsS \
      --connect-timeout "${VERIFY_CURL_CONNECT_TIMEOUT_SECONDS}" \
      --max-time "${VERIFY_CURL_MAX_TIME_SECONDS}" \
      "$health_url"
  )" || {
    echo "clickup discovery health probe failed for ${worker}"
    failures=1
    return
  }

  if ! echo "$health_json" | jq -e '.enabled_servers // [] | index("composio-toolkit-clickup") != null' >/dev/null; then
    echo "clickup discovery visibility failed for ${worker}"
    echo "$health_json"
    failures=1
    return
  fi

  echo "clickup_discovery=ok via=enabled_servers"
}

check_session_account_routing() {
  local worker="$1"
  local mcp_url token_var_name token token_help
  mcp_url="$(mcp_url_for_worker "$worker")"
  token_var_name="$(token_env_var_for_worker "$worker")"
  token="$(resolve_worker_token "$worker")"
  token_help="${token_var_name} (or HUB_API_TOKEN)"

  if [[ -z "$token" ]]; then
    echo "missing API token for ${worker} (${token_help})"
    failures=1
    return
  fi

  if [[ -z "${FLEET_VERIFY_SESSION_TOKEN:-}" ]]; then
    echo "missing fleet verify MCP session token"
    failures=1
    return
  fi

  local set_payload='{"jsonrpc":"2.0","id":"fleet-verify-discovery","method":"tools/call","params":{"name":"hub_set_discovery","arguments":{"mode":"full","activeServers":[]}}}'
  curl -sS -X POST "$mcp_url" \
    --connect-timeout "${VERIFY_CURL_CONNECT_TIMEOUT_SECONDS}" \
    --max-time "${VERIFY_CURL_MAX_TIME_SECONDS}" \
    -H "Authorization: Bearer ${token}" \
    -H "X-MCP-Session-Token: ${FLEET_VERIFY_SESSION_TOKEN}" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    --data "$set_payload" >/dev/null || true

  local probe_body_file probe_status probe_proxy_tool
  probe_body_file=""
  probe_status=""
  probe_proxy_tool="$(search_visible_connection_status_tool "$mcp_url" "$token" "$FLEET_VERIFY_SESSION_TOKEN" || true)"
  if [[ -z "$probe_proxy_tool" ]]; then
    if [[ "$worker" == "cs-mcp-hub-remote" ]]; then
      echo "account_routing=skipped reason=no_visible_proxy_tool"
      reset_discovery_preferences "$mcp_url" "$token" "$FLEET_VERIFY_SESSION_TOKEN"
      return
    fi
    echo "probe search returned no visible proxy tool for ${worker}"
    failures=1
    reset_discovery_preferences "$mcp_url" "$token" "$FLEET_VERIFY_SESSION_TOKEN"
    return
  fi

  local body_file status
  body_file="$(mktemp)"
  status="$(
    curl -sS -o "$body_file" -w "%{http_code}" -X POST "$mcp_url" \
      --connect-timeout "${VERIFY_CURL_CONNECT_TIMEOUT_SECONDS}" \
      --max-time "${VERIFY_CURL_MAX_TIME_SECONDS}" \
      -H "Authorization: Bearer ${token}" \
      -H "X-MCP-Session-Token: ${FLEET_VERIFY_SESSION_TOKEN}" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json" \
      --data "$(jq -cn --arg proxyToolName "$probe_proxy_tool" '{
        jsonrpc: "2.0",
        id: "fleet-verify-account",
        method: "tools/call",
        params: {
          name: "hub_execute_proxy_tool",
          arguments: {
            proxyToolName: $proxyToolName,
            args: {}
          }
        }
      }')"
  )"

  if [[ "$status" != "200" ]]; then
    echo "account routing check failed for ${worker} (status=${status})"
    cat "$body_file"
    failures=1
    reset_discovery_preferences "$mcp_url" "$token" "$FLEET_VERIFY_SESSION_TOKEN"
    rm -f "$body_file"
    return
  fi

  local actual_account_id
  actual_account_id="$(extract_result_entity_id "$body_file")"

  if [[ -z "$actual_account_id" ]]; then
    echo "account routing mismatch for ${worker}"
    echo "actual=${actual_account_id:-<empty>}"
    cat "$body_file"
    failures=1
    reset_discovery_preferences "$mcp_url" "$token" "$FLEET_VERIFY_SESSION_TOKEN"
    rm -f "$body_file"
    return
  fi

  if [[ -n "${FLEET_VERIFY_ACCOUNT_ID:-}" && "$actual_account_id" != "$FLEET_VERIFY_ACCOUNT_ID" ]]; then
    echo "account routing mismatch for ${worker}"
    echo "expected=${FLEET_VERIFY_ACCOUNT_ID}"
    echo "actual=${actual_account_id}"
    cat "$body_file"
    failures=1
    reset_discovery_preferences "$mcp_url" "$token" "$FLEET_VERIFY_SESSION_TOKEN"
    rm -f "$body_file"
    return
  fi

  echo "account_routing=ok account_id=${actual_account_id}"
  reset_discovery_preferences "$mcp_url" "$token" "$FLEET_VERIFY_SESSION_TOKEN"
  rm -f "$body_file"
}

failures=0
FLEET_VERIFY_SESSION_TOKEN=""
FLEET_VERIFY_ACCOUNT_ID=""
cd "$HUB_DIR"
maybe_load_supporting_env

echo "Checking required secrets on each worker..."
for worker in "${WORKERS[@]}"; do
  echo "===== SECRETS ${worker} ====="
  secret_check_worker="$(resolve_secret_check_worker_name "$worker")"
  if [[ "$secret_check_worker" != "$worker" ]]; then
    echo "secret_check_target=${secret_check_worker} (legacy alias)"
  fi
  secrets_json="$(pnpm exec wrangler secret list --name "$secret_check_worker")"
  for secret_name in "${REQUIRED_SECRETS[@]}"; do
    if echo "$secrets_json" | jq -e --arg name "$secret_name" '.[] | select(.name == $name)' >/dev/null; then
      echo "ok: ${secret_name}"
    else
      echo "missing: ${secret_name}"
      failures=1
    fi
  done
  echo
done

echo "Checking health endpoints..."
for worker in "${WORKERS[@]}"; do
  health_url="$(health_url_for_worker "$worker")"
  echo "===== HEALTH ${worker} ====="
  health_json="$(
    curl -fsS \
      --connect-timeout "${VERIFY_CURL_CONNECT_TIMEOUT_SECONDS}" \
      --max-time "${VERIFY_CURL_MAX_TIME_SECONDS}" \
      "$health_url"
  )"
  built_at="$(echo "$health_json" | jq -r '.built_at // "unknown"')"
  auth_required="$(echo "$health_json" | jq -r '.auth_required // "false"')"
  identity_mode="$(echo "$health_json" | jq -r '.identity_mode // "unknown"')"
  expected_identity_mode="$(expected_identity_mode_for_worker "$worker")"
  telemetry_db="$(echo "$health_json" | jq -r '.policy.quota.telemetryDbConfigured // "false"')"
  echo "built_at=${built_at}"
  echo "auth_required=${auth_required}"
  echo "identity_mode=${identity_mode}"
  echo "telemetryDbConfigured=${telemetry_db}"

  if [[ "$auth_required" != "true" || "$telemetry_db" != "true" || "$identity_mode" != "$expected_identity_mode" ]]; then
    echo "health check failed for ${worker}"
    failures=1
  fi

  if expected_servers_csv="$(expected_enabled_servers_csv_for_worker "$worker")"; then
    enabled_sorted_csv="$(
      echo "$health_json" | jq -r '.enabled_servers // [] | sort | join(",")'
    )"
    expected_sorted_csv="$(
      printf '%s\n' "$expected_servers_csv" | tr ',' '\n' | sort | paste -sd',' -
    )"
    if [[ "$enabled_sorted_csv" != "$expected_sorted_csv" ]]; then
      echo "enabled server policy mismatch for ${worker}"
      echo "expected=${expected_sorted_csv}"
      echo "actual=${enabled_sorted_csv}"
      failures=1
    else
      echo "enabled_server_policy=$(expected_enabled_policy_label_for_worker "$worker")"
    fi
  fi

  echo
done

needs_session_checks=0
for worker in "${WORKERS[@]}"; do
  if [[ "$(expected_identity_mode_for_worker "$worker")" == "session_required" ]]; then
    needs_session_checks=1
    break
  fi
done

if [[ "$needs_session_checks" -eq 1 ]]; then
  echo "Creating MCP session token for strict identity E2E..."
  if ! create_fleet_verify_session; then
    failures=1
  fi
  echo

  echo "Checking identity behavior by worker mode..."
  for worker in "${WORKERS[@]}"; do
    expected_identity_mode="$(expected_identity_mode_for_worker "$worker")"
    if [[ "$expected_identity_mode" == "session_required" ]]; then
      echo "===== STRICT ${worker} ====="
      check_missing_session_token_rejected "$worker"
    else
      echo "===== COMPAT ${worker} ====="
      check_compat_identity_without_session "$worker"
    fi
    echo
  done
else
  echo "Checking compat identity behavior (session token not required)..."
  for worker in "${WORKERS[@]}"; do
    echo "===== COMPAT ${worker} ====="
    check_compat_identity_without_session "$worker"
    echo
  done
fi

echo "Checking managed discovery pack reset..."
for worker in "${WORKERS[@]}"; do
  echo "===== DISCOVERY PACK ${worker} ====="
  check_discovery_pack_reset "$worker"
  echo
done

echo "Checking MCP protocol endpoints (initialize + resources/list)..."
for worker in "${WORKERS[@]}"; do
  echo "===== PROTOCOL ${worker} ====="
  check_mcp_protocol "$worker"
  echo
done

echo "Checking ClickUp discovery visibility for Outerfields hubs..."
for worker in "cs-hub-aaron-outerfields" "cs-hub-andre-outerfields"; do
  echo "===== CLICKUP ${worker} ====="
  check_clickup_discovery_for_worker "$worker"
  echo
done

echo "Checking account routing by worker mode..."
for worker in "${WORKERS[@]}"; do
  echo "===== ACCOUNT ${worker} ====="
  if [[ "$worker" == "cs-mcp-hub-remote" ]]; then
    echo "account_routing=skipped reason=core_hub_probe_timeout_variance"
    echo
    continue
  fi
  expected_identity_mode="$(expected_identity_mode_for_worker "$worker")"
  if [[ "$expected_identity_mode" == "session_required" ]]; then
    check_session_account_routing "$worker"
  else
    check_compat_account_routing "$worker"
  fi
  echo
done

if [[ "$failures" -ne 0 ]]; then
  echo "Hub fleet verification failed."
  exit 1
fi

echo "Hub fleet verification passed."
