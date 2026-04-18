#!/usr/bin/env bash
set -euo pipefail

INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/}"
INFISICAL_INCLUDE_IMPORTS="${INFISICAL_INCLUDE_IMPORTS:-true}"
REVIEWER="${REVIEWER:-all}"
SKIP_MISSING_REVIEWER_SECRETS="${SKIP_MISSING_REVIEWER_SECRETS:-false}"
SESSION_RESOLVE_URL="${SESSION_RESOLVE_URL:-https://id.createsomething.space/v1/mcp/sessions/resolve}"
IDENTITY_BASE_URL="${IDENTITY_BASE_URL:-https://id.createsomething.space}"
INFISICAL_EXPORT_JSON=""

REVIEWERS=(
  "natalia|natalia.ledford@webflow.com|wf-template-review-natalia|acct_wf_natalia|CS_HUB_WF_TEMPLATE_REVIEW_NATALIA_API_TOKEN"
  "sudiksha|sudiksha.khanduja@webflow.com|wf-template-review-sudiksha|acct_wf_sudiksha|CS_HUB_WF_TEMPLATE_REVIEW_SUDIKSHA_API_TOKEN"
  "eric|eric.unger@webflow.com|wf-template-review-eric|acct_wf_eric|CS_HUB_WF_TEMPLATE_REVIEW_ERIC_API_TOKEN"
  "vicki|vicki.chen@webflow.com|wf-template-review-vicki|acct_wf_vicki|CS_HUB_WF_TEMPLATE_REVIEW_VICKI_API_TOKEN"
  "mariana|mariana.segura@webflow.com|wf-template-review-mariana|acct_wf_mariana|CS_HUB_WF_TEMPLATE_REVIEW_MARIANA_API_TOKEN"
  "micah|micah@webflow.com|wf-template-review-micah|acct_wf_micah|CS_HUB_WF_TEMPLATE_REVIEW_MICAH_API_TOKEN"
)

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

reviewer_matches() {
  local reviewer="$1"
  if [[ "$REVIEWER" == "all" ]]; then
    return 0
  fi
  [[ "$reviewer" == "$REVIEWER" ]]
}

load_infisical_export_json() {
  if [[ -n "$INFISICAL_EXPORT_JSON" ]]; then
    return 0
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

  INFISICAL_EXPORT_JSON="$("${export_cmd[@]}")"
  [[ -n "$INFISICAL_EXPORT_JSON" ]]
}

secret_from_export() {
  local secret_name="$1"
  jq -r --arg key "$secret_name" '
    if type == "array" then
      (.[] | select(.key == $key) | .value // empty)
    else
      (.[$key] // empty)
    end
  ' <<<"$INFISICAL_EXPORT_JSON"
}

allowed_tool_prefixes_json() {
  # Broad server-scoped prefixes so delivered MCPs (both the template-review surface
  # and direct analyzer tools) authorize cleanly through the reviewer bearer token.
  # The hub's isRouteAllowedForSession uses startsWith matching, so these unlock every
  # tool from the two production reviewer servers without naming each one.
  jq -cn '[
    "webflow-template-review-mcp__",
    "webflow-site-analyzer-mcp__"
  ]'
}

resolve_auth_subject() {
  local token="$1"
  local resource_host="$2"
  curl -fsS "$SESSION_RESOLVE_URL" \
    -H "X-Session-Resolve-Token: ${HUB_SESSION_RESOLVE_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$(jq -cn --arg token "$token" --arg resource_host "$resource_host" '{token:$token,resource_host:$resource_host}')" \
    | jq -r '.user_id // empty'
}

issue_token() {
  local auth_subject="$1"
  local auth_email="$2"
  local account_id="$3"
  local bound_host="$4"
  local allowed_tool_prefixes="$5"

  curl -fsS "${IDENTITY_BASE_URL%/}/v1/mcp/long-lived-tokens/admin-issue" \
    -H "X-API-Key: ${IDENTITY_WORKER_ADMIN_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$(jq -cn \
      --arg auth_subject "$auth_subject" \
      --arg auth_email "$auth_email" \
      --arg tenant_id "tenant_webflow_marketplace" \
      --arg account_id "$account_id" \
      --arg bound_host "$bound_host" \
      --arg actor "operator:codex-reviewer-bridge-rollout" \
      --argjson allowed_tool_prefixes "$allowed_tool_prefixes" '{
        auth_subject: $auth_subject,
        auth_email: $auth_email,
        tenant_id: $tenant_id,
        account_id: $account_id,
        bound_host: $bound_host,
        tool_mode: "read_write",
        toolkit_profile: [],
        allowed_tool_prefixes: $allowed_tool_prefixes,
        actor: $actor,
        metadata: {
          workflow: "template_review_hub_lane",
          lane_phase: "bridge_tools_direct",
          issued_via: "codex_reviewer_bridge_rollout_2026_04_17"
        }
      }')"
}

set_secret() {
  local secret_name="$1"
  local secret_value="$2"
  infisical secrets set "${secret_name}=${secret_value}" --env="$INFISICAL_ENV" --path="$INFISICAL_PATH" --silent >/dev/null
}

rotate_reviewer() {
  local reviewer="$1"
  local email="$2"
  local bound_host="$3"
  local account_id="$4"
  local secret_name="$5"
  local current_token auth_subject issue_response new_token

  current_token="$(secret_from_export "$secret_name")"
  if [[ -z "$current_token" ]]; then
    if [[ "$SKIP_MISSING_REVIEWER_SECRETS" == "true" ]]; then
      echo "skip reviewer=${reviewer} reason=missing_secret secret=${secret_name}"
      return 0
    fi
    echo "missing reviewer token secret: ${secret_name}" >&2
    exit 1
  fi

  auth_subject="$(resolve_auth_subject "$current_token" "$bound_host")"
  if [[ -z "$auth_subject" ]]; then
    if [[ "$SKIP_MISSING_REVIEWER_SECRETS" == "true" ]]; then
      echo "skip reviewer=${reviewer} reason=unresolved_auth_subject"
      return 0
    fi
    echo "failed to resolve auth_subject for reviewer ${reviewer}" >&2
    exit 1
  fi

  issue_response="$(issue_token "$auth_subject" "$email" "$account_id" "$bound_host" "$ALLOWED_TOOL_PREFIXES_JSON")"
  new_token="$(jq -r '.token // empty' <<<"$issue_response")"
  if [[ -z "$new_token" ]]; then
    echo "failed to issue reviewer token for ${reviewer}" >&2
    echo "$issue_response" | jq .
    exit 1
  fi

  set_secret "$secret_name" "$new_token"
  echo "reviewer=${reviewer} auth_subject=${auth_subject} token_prefix=${new_token:0:16}"
}

main() {
  require_cmd curl
  require_cmd jq
  require_cmd infisical

  INFISICAL_INCLUDE_IMPORTS="$(normalize_bool_or_fail "$INFISICAL_INCLUDE_IMPORTS")"
  SKIP_MISSING_REVIEWER_SECRETS="$(normalize_bool_or_fail "$SKIP_MISSING_REVIEWER_SECRETS")"

  # Rotating reviewer bearers is destructive: it invalidates the previously delivered
  # token values that currently live inside reviewer MCP client configs. Require an
  # explicit opt-in so nothing triggers this path accidentally.
  if [[ "${CONFIRM_ROTATION:-}" != "destructive" ]]; then
    echo "rotation refused: this script invalidates previously delivered reviewer bearer tokens." >&2
    echo "Set CONFIRM_ROTATION=destructive explicitly if that is intended." >&2
    exit 1
  fi

  if [[ -z "${IDENTITY_WORKER_ADMIN_API_KEY:-}" ]]; then
    echo "missing IDENTITY_WORKER_ADMIN_API_KEY" >&2
    exit 1
  fi
  if [[ -z "${HUB_SESSION_RESOLVE_TOKEN:-}" ]]; then
    echo "missing HUB_SESSION_RESOLVE_TOKEN" >&2
    exit 1
  fi

  load_infisical_export_json
  ALLOWED_TOOL_PREFIXES_JSON="$(allowed_tool_prefixes_json)"

  local reviewer
  local email
  local bound_host
  local account_id
  local secret_name
  for entry in "${REVIEWERS[@]}"; do
    IFS='|' read -r reviewer email bound_host account_id secret_name <<<"$entry"
    if ! reviewer_matches "$reviewer"; then
      continue
    fi
    rotate_reviewer "$reviewer" "$email" "$bound_host" "$account_id" "$secret_name"
  done

  echo "webflow reviewer Phase A token rotation complete"
}

main "$@"
