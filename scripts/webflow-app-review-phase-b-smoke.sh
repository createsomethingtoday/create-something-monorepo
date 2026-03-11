#!/usr/bin/env bash
set -euo pipefail

INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
INFISICAL_INCLUDE_IMPORTS="${INFISICAL_INCLUDE_IMPORTS:-true}"
REVIEWER="${REVIEWER:-}"
ACTION="${ACTION:-}"
VERSION_ID="${VERSION_ID:-}"
REVIEW_FEEDBACK="${REVIEW_FEEDBACK:-Phase B smoke verification from reviewer-scoped Hub.}"
REJECTION_REASON="${REJECTION_REASON:-Other}"
REVIEW_TYPE="${REVIEW_TYPE:-}"

reviewer_url() {
  case "$1" in
    pablo) echo "https://wf-app-review-pablo.mcp.createsomething.agency/mcp" ;;
    shea) echo "https://wf-app-review-shea.mcp.createsomething.agency/mcp" ;;
    *) return 1 ;;
  esac
}

reviewer_secret_name() {
  case "$1" in
    pablo) echo "CS_HUB_WF_APP_REVIEW_PABLO_API_TOKEN" ;;
    shea) echo "CS_HUB_WF_APP_REVIEW_SHEA_API_TOKEN" ;;
    *) return 1 ;;
  esac
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "missing required command: $1" >&2
    exit 1
  fi
}

resolve_token() {
  local secret_name="$1"
  if [[ -n "${!secret_name:-}" ]]; then
    echo "${!secret_name}"
    return 0
  fi
  if command -v infisical >/dev/null 2>&1; then
    local token
    local -a cmd=(
      infisical secrets get "$secret_name"
      --plain
      --silent
      --env="$INFISICAL_ENV"
      --path="$INFISICAL_PATH"
      --include-imports="$INFISICAL_INCLUDE_IMPORTS"
    )
    if [[ -n "$INFISICAL_PROJECT_ID" ]]; then
      cmd+=(--projectId="$INFISICAL_PROJECT_ID")
    fi
    token="$("${cmd[@]}" 2>/dev/null || true)"
    if [[ -n "$token" ]]; then
      echo "$token"
      return 0
    fi
  fi
  return 1
}

mcp_call() {
  local hub_url="$1"
  local token="$2"
  local tool_name="$3"
  local args_json="$4"

  curl -sS -X POST "$hub_url" \
    -H "Authorization: Bearer ${token}" \
    -H 'Content-Type: application/json' \
    -d "$(jq -cn --arg name "$tool_name" --argjson args "$args_json" '{jsonrpc:"2.0",id:(now|tostring),method:"tools/call",params:{name:$name,arguments:$args}}')"
}

assert_no_rpc_error() {
  local payload="$1"
  local context="$2"
  if ! echo "$payload" | jq -e '.error == null' >/dev/null 2>&1; then
    echo "rpc error during ${context}:"
    echo "$payload" | jq .
    exit 1
  fi
}

build_args_json() {
  case "$ACTION" in
    request_changes)
      jq -cn \
        --arg version_id "$VERSION_ID" \
        --arg review_feedback "$REVIEW_FEEDBACK" \
        --arg rejection_reason "$REJECTION_REASON" \
        '{
          proxyToolName:"webflow-app-review-mcp__app_review_request_changes",
          args:{
            version_id:$version_id,
            review_feedback:$review_feedback,
            rejection_reason:$rejection_reason
          }
        }'
      ;;
    approve)
      jq -cn \
        --arg version_id "$VERSION_ID" \
        --arg review_feedback "$REVIEW_FEEDBACK" \
        --arg review_type "$REVIEW_TYPE" \
        '{
          proxyToolName:"webflow-app-review-mcp__app_review_approve_version",
          args: (
            {
              version_id:$version_id,
              review_feedback:$review_feedback
            }
            + (if $review_type != "" then {review_type:$review_type} else {} end)
          )
        }'
      ;;
    reject)
      jq -cn \
        --arg version_id "$VERSION_ID" \
        --arg review_feedback "$REVIEW_FEEDBACK" \
        --arg rejection_reason "$REJECTION_REASON" \
        --arg review_type "$REVIEW_TYPE" \
        '{
          proxyToolName:"webflow-app-review-mcp__app_review_reject_version",
          args: (
            {
              version_id:$version_id,
              rejection_reason:$rejection_reason,
              review_feedback:$review_feedback
            }
            + (if $review_type != "" then {review_type:$review_type} else {} end)
          )
        }'
      ;;
    *)
      echo "unsupported ACTION: ${ACTION}" >&2
      exit 1
      ;;
  esac
}

main() {
  require_cmd curl
  require_cmd jq

  if [[ -z "$REVIEWER" ]]; then
    echo "set REVIEWER=pablo|shea" >&2
    exit 1
  fi
  if [[ -z "$ACTION" ]]; then
    echo "set ACTION=request_changes|approve|reject" >&2
    exit 1
  fi
  if [[ -z "$VERSION_ID" ]]; then
    echo "set VERSION_ID=<asset-version-record-id>" >&2
    exit 1
  fi

  local hub_url secret_name token args_json response
  hub_url="$(reviewer_url "$REVIEWER")"
  secret_name="$(reviewer_secret_name "$REVIEWER")"

  if ! token="$(resolve_token "$secret_name")"; then
    echo "missing ${secret_name} and unable to fetch from Infisical" >&2
    exit 1
  fi

  args_json="$(build_args_json)"

  echo "== Phase B smoke =="
  echo "reviewer=${REVIEWER}"
  echo "action=${ACTION}"
  echo "version_id=${VERSION_ID}"
  echo "hub_url=${hub_url}"
  echo "note=use only on a noncritical record or a record prepared for rollback"

  response="$(mcp_call "$hub_url" "$token" "hub_execute_proxy_tool" "$args_json")"
  assert_no_rpc_error "$response" "hub_execute_proxy_tool ${ACTION}"

  echo "$response" | jq .
}

main "$@"
