#!/usr/bin/env bash
set -euo pipefail

INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
INFISICAL_INCLUDE_IMPORTS="${INFISICAL_INCLUDE_IMPORTS:-true}"
REVIEWER="${REVIEWER:-all}"

reviewer_url() {
  case "$1" in
    natalia) echo "https://wf-template-review-natalia.mcp.createsomething.agency/mcp" ;;
    sudiksha) echo "https://wf-template-review-sudiksha.mcp.createsomething.agency/mcp" ;;
    eric) echo "https://wf-template-review-eric.mcp.createsomething.agency/mcp" ;;
    vicki) echo "https://wf-template-review-vicki.mcp.createsomething.agency/mcp" ;;
    mariana) echo "https://wf-template-review-mariana.mcp.createsomething.agency/mcp" ;;
    micah) echo "https://wf-template-review-micah.mcp.createsomething.agency/mcp" ;;
    *) return 1 ;;
  esac
}

reviewer_hub_url() {
  local reviewer="$1"
  local reviewer_upper env_name
  reviewer_upper="$(printf '%s' "$reviewer" | tr '[:lower:]-' '[:upper:]_')"
  env_name="WEBFLOW_REVIEWER_${reviewer_upper}_HUB_URL"

  if [[ -n "${!env_name:-}" ]]; then
    echo "${!env_name}"
    return 0
  fi

  if [[ -n "${WEBFLOW_REVIEWER_HUB_URL:-}" ]]; then
    echo "$WEBFLOW_REVIEWER_HUB_URL"
    return 0
  fi

  reviewer_url "$reviewer"
}

reviewer_secret_name() {
  case "$1" in
    natalia) echo "CS_HUB_WF_TEMPLATE_REVIEW_NATALIA_API_TOKEN" ;;
    sudiksha) echo "CS_HUB_WF_TEMPLATE_REVIEW_SUDIKSHA_API_TOKEN" ;;
    eric) echo "CS_HUB_WF_TEMPLATE_REVIEW_ERIC_API_TOKEN" ;;
    vicki) echo "CS_HUB_WF_TEMPLATE_REVIEW_VICKI_API_TOKEN" ;;
    mariana) echo "CS_HUB_WF_TEMPLATE_REVIEW_MARIANA_API_TOKEN" ;;
    micah) echo "CS_HUB_WF_TEMPLATE_REVIEW_MICAH_API_TOKEN" ;;
    *) return 1 ;;
  esac
}

reviewer_email() {
  case "$1" in
    natalia) echo "natalia.ledford@webflow.com" ;;
    sudiksha) echo "sudiksha.khanduja@webflow.com" ;;
    eric) echo "eric.unger@webflow.com" ;;
    vicki) echo "vicki.chen@webflow.com" ;;
    mariana) echo "mariana.segura@webflow.com" ;;
    micah) echo "micah@webflow.com" ;;
    *) return 1 ;;
  esac
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "missing required command: $1" >&2
    exit 1
  fi
}

resolve_ip_for_url() {
  local url="$1"
  local host
  local ip
  host="${url#https://}"
  host="${host%%/*}"

  if [[ -n "${CURL_RESOLVE_IP:-}" ]]; then
    printf '%s' "$CURL_RESOLVE_IP"
    return 0
  fi

  if command -v dig >/dev/null 2>&1; then
    ip="$(dig +short "$host" | awk 'NF { print; exit }')"
    if [[ -n "$ip" ]]; then
      printf '%s' "$ip"
      return 0
    fi

    ip="$(dig @1.1.1.1 +short "$host" | awk 'NF { print; exit }')"
    if [[ -n "$ip" ]]; then
      printf '%s' "$ip"
      return 0
    fi
  fi

  if command -v nslookup >/dev/null 2>&1; then
    nslookup "$host" 1.1.1.1 2>/dev/null | awk '/^Address: / && $2 !~ /#53$/ { print $2; exit }'
  fi
}

curl_with_url() {
  local url="$1"
  shift

  local host ip
  local -a cmd=(curl)
  host="${url#https://}"
  host="${host%%/*}"
  ip="$(resolve_ip_for_url "$url")"

  if [[ -n "$ip" ]]; then
    cmd+=(--resolve "${host}:443:${ip}")
  fi

  cmd+=("$@" "$url")
  "${cmd[@]}"
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

  curl_with_url "$hub_url" -sS -X POST \
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
  if echo "$payload" | jq -e '.result.isError == true' >/dev/null 2>&1; then
    echo "tool error during ${context}:"
    echo "$payload" | jq .
    exit 1
  fi
}

payload_json() {
  jq -r '.result.content[0].text | fromjson'
}

reviewer_version_id_override() {
  local reviewer="$1"
  local reviewer_upper env_name
  reviewer_upper="$(printf '%s' "$reviewer" | tr '[:lower:]-' '[:upper:]_')"
  env_name="WEBFLOW_REVIEWER_${reviewer_upper}_VERSION_ID"

  if [[ -n "${!env_name:-}" ]]; then
    echo "${!env_name}"
    return 0
  fi

  if [[ -n "${WEBFLOW_REVIEWER_VERSION_ID:-}" ]]; then
    echo "$WEBFLOW_REVIEWER_VERSION_ID"
    return 0
  fi

  return 1
}

execute_template_review_tool() {
  local hub_url="$1"
  local token="$2"
  local proxy_tool_name="$3"
  local args_json="$4"

  mcp_call "$hub_url" "$token" "hub_execute_proxy_tool" \
    "$(jq -cn --arg proxyToolName "$proxy_tool_name" --argjson args "$args_json" '{proxyToolName:$proxyToolName,args:$args}')"
}

resolve_smoke_version_id() {
  local reviewer="$1"
  local hub_url="$2"
  local token="$3"
  local reviewer_upper override list_resp version_id
  reviewer_upper="$(printf '%s' "$reviewer" | tr '[:lower:]-' '[:upper:]_')"

  if override="$(reviewer_version_id_override "$reviewer")"; then
    echo "$override"
    return 0
  fi

  list_resp="$(execute_template_review_tool "$hub_url" "$token" "webflow-template-review-mcp__template_review_list_queue" \
    '{"limit":50,"status":"ready_to_review","assigned":"unassigned"}')"
  assert_no_rpc_error "$list_resp" "list_queue ready_to_review unassigned ${reviewer}"

  version_id="$(echo "$list_resp" | payload_json | jq -r '.data.items[]? | select(.assignableVersionId != null and (.canAssign == true or .canAssign == null)) | .assignableVersionId' | head -n 1)"
  if [[ -z "$version_id" || "$version_id" == "null" ]]; then
    echo "no unassigned ready_to_review template versions available for ${reviewer}; set WEBFLOW_REVIEWER_${reviewer_upper}_VERSION_ID or WEBFLOW_REVIEWER_VERSION_ID to override" >&2
    exit 1
  fi

  echo "$version_id"
}

smoke_reviewer() {
  local reviewer="$1"
  local hub_url secret_name version_id expected_email token
  hub_url="$(reviewer_hub_url "$reviewer")"
  secret_name="$(reviewer_secret_name "$reviewer")"
  expected_email="$(reviewer_email "$reviewer")"

  if ! token="$(resolve_token "$secret_name")"; then
    echo "missing ${secret_name} and unable to fetch from Infisical" >&2
    exit 1
  fi

  version_id="$(resolve_smoke_version_id "$reviewer" "$hub_url" "$token")"

  echo "== ${reviewer} =="
  local refresh_resp before_resp assign_resp context_resp my_queue_resp unassign_resp restore_resp
  local previous_owner final_owner
  refresh_resp="$(mcp_call "$hub_url" "$token" "hub_refresh_connections" '{}')"
  assert_no_rpc_error "$refresh_resp" "hub_refresh_connections ${reviewer}"

  before_resp="$(execute_template_review_tool "$hub_url" "$token" "webflow-template-review-mcp__template_review_get_review_context" "$(jq -cn --arg version_id "$version_id" '{version_id:$version_id}')")"
  assert_no_rpc_error "$before_resp" "preflight get_review_context ${reviewer}"
  previous_owner="$(echo "$before_resp" | payload_json | jq -r '.data.context.reviewOwner.email // "null"')"

  assign_resp="$(execute_template_review_tool "$hub_url" "$token" "webflow-template-review-mcp__template_review_assign_self" "$(jq -cn --arg version_id "$version_id" '{version_id:$version_id}')")"
  assert_no_rpc_error "$assign_resp" "assign_self ${reviewer}"

  context_resp="$(execute_template_review_tool "$hub_url" "$token" "webflow-template-review-mcp__template_review_get_review_context" "$(jq -cn --arg version_id "$version_id" '{version_id:$version_id}')")"
  assert_no_rpc_error "$context_resp" "get_review_context ${reviewer}"

  my_queue_resp="$(execute_template_review_tool "$hub_url" "$token" "webflow-template-review-mcp__template_review_my_queue" '{"limit":50}')"
  assert_no_rpc_error "$my_queue_resp" "my_queue ${reviewer}"

  unassign_resp="$(execute_template_review_tool "$hub_url" "$token" "webflow-template-review-mcp__template_review_unassign_self" "$(jq -cn --arg version_id "$version_id" '{version_id:$version_id}')")"
  assert_no_rpc_error "$unassign_resp" "unassign_self ${reviewer}"

  if [[ "$previous_owner" == "$expected_email" ]]; then
    restore_resp="$(execute_template_review_tool "$hub_url" "$token" "webflow-template-review-mcp__template_review_assign_self" "$(jq -cn --arg version_id "$version_id" '{version_id:$version_id}')")"
    assert_no_rpc_error "$restore_resp" "restore assignment ${reviewer}"
  fi

  local assign_ok assign_owner context_ok context_current context_owner context_assigned my_queue_ok my_queue_has_version unassign_ok unassign_owner
  assign_ok="$(echo "$assign_resp" | payload_json | jq -r '.ok // false')"
  assign_owner="$(echo "$assign_resp" | payload_json | jq -r '.data.updated_version.reviewOwner.email // "null"')"
  context_ok="$(echo "$context_resp" | payload_json | jq -r '.ok // false')"
  context_current="$(echo "$context_resp" | payload_json | jq -r '.data.context.currentReviewer.email // "null"')"
  context_owner="$(echo "$context_resp" | payload_json | jq -r '.data.context.reviewOwner.email // "null"')"
  context_assigned="$(echo "$context_resp" | payload_json | jq -r '.data.context.isAssignedToCurrentReviewer // false')"
  my_queue_ok="$(echo "$my_queue_resp" | payload_json | jq -r '.ok // false')"
  my_queue_has_version="$(echo "$my_queue_resp" | payload_json | jq -r --arg version_id "$version_id" '([.data.items[].assignableVersionId] | index($version_id)) != null')"
  unassign_ok="$(echo "$unassign_resp" | payload_json | jq -r '.ok // false')"
  unassign_owner="$(echo "$unassign_resp" | payload_json | jq -r '.data.updated_version.reviewOwner.email // "null"')"
  final_owner="$unassign_owner"
  if [[ "$previous_owner" == "$expected_email" ]]; then
    final_owner="$(echo "$restore_resp" | payload_json | jq -r '.data.updated_version.reviewOwner.email // "null"')"
  fi

  if [[ "$assign_ok" != "true" || "$assign_owner" != "$expected_email" ]]; then
    echo "assign_self validation failed for ${reviewer}" >&2
    echo "$assign_resp" | jq .
    exit 1
  fi
  if [[ "$context_ok" != "true" || "$context_current" != "$expected_email" || "$context_owner" != "$expected_email" || "$context_assigned" != "true" ]]; then
    echo "get_review_context validation failed for ${reviewer}" >&2
    echo "$context_resp" | jq .
    exit 1
  fi
  if [[ "$my_queue_ok" != "true" || "$my_queue_has_version" != "true" ]]; then
    echo "my_queue validation failed for ${reviewer}" >&2
    echo "$my_queue_resp" | jq .
    exit 1
  fi
  if [[ "$unassign_ok" != "true" || "$unassign_owner" != "null" ]]; then
    echo "unassign_self validation failed for ${reviewer}" >&2
    echo "$unassign_resp" | jq .
    exit 1
  fi
  if [[ "$final_owner" != "$previous_owner" ]]; then
    echo "assignment restoration failed for ${reviewer}: expected ${previous_owner}, got ${final_owner}" >&2
    exit 1
  fi

  echo "version_id=${version_id}"
  echo "assign_self=ok owner=${assign_owner}"
  echo "get_review_context=ok current=${context_current} assigned=${context_assigned}"
  echo "my_queue=ok has_version=${my_queue_has_version}"
  echo "unassign_self=ok owner=${unassign_owner}"
  echo "state_restored=ok owner=${final_owner}"
}

main() {
  require_cmd curl
  require_cmd jq

  local reviewers=()
  if [[ "$REVIEWER" == "all" ]]; then
    reviewers=(natalia sudiksha eric vicki mariana micah)
  else
    reviewers=("$REVIEWER")
  fi

  local reviewer
  for reviewer in "${reviewers[@]}"; do
    smoke_reviewer "$reviewer"
  done

  echo "webflow reviewer assignment workflow smoke passed"
}

main "$@"
