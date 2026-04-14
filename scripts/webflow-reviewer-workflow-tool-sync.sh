#!/usr/bin/env bash
set -euo pipefail

IDENTITY_DB_NAME="${IDENTITY_DB_NAME:-identity-db}"
IDENTITY_DB_CONFIG="${IDENTITY_DB_CONFIG:-packages/identity-worker/wrangler.toml}"
ACTION="${1:-all}"
WORKFLOW_TOOL="${WORKFLOW_TOOL:-webflow-template-review-mcp__template_review_workflow}"
REVIEWER_ACCOUNT_PATTERN="${REVIEWER_ACCOUNT_PATTERN:-acct_wf_%}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing required command: $1" >&2
    exit 1
  }
}

identity_query() {
  local sql="$1"
  wrangler d1 execute "$IDENTITY_DB_NAME" \
    --config "$IDENTITY_DB_CONFIG" \
    --remote \
    --json \
    --command "$sql"
}

sql_escape() {
  printf "%s" "$1" | sed "s/'/''/g"
}

select_reviewer_tokens_sql() {
  cat <<SQL
SELECT identity_subject, auth_email, account_id, bound_host, token_prefix, allowed_tool_prefixes_json
FROM mcp_long_lived_tokens
WHERE account_id LIKE '$(sql_escape "$REVIEWER_ACCOUNT_PATTERN")'
ORDER BY account_id;
SQL
}

verify_state() {
  local payload
  payload="$(identity_query "$(select_reviewer_tokens_sql)")"

  printf "%s" "$payload" | jq -r --arg tool "$WORKFLOW_TOOL" '
    .[0].results[]
    | [
        .account_id,
        .auth_email,
        .bound_host,
        .token_prefix,
        ((.allowed_tool_prefixes_json | fromjson | index($tool)) != null | tostring)
      ]
    | @tsv
  ' | while IFS=$'\t' read -r account_id auth_email bound_host token_prefix has_tool; do
    echo "${account_id} email=${auth_email} host=${bound_host} token_prefix=${token_prefix} workflow_tool=${has_tool}"
  done

  local missing
  missing="$(printf "%s" "$payload" | jq -r --arg tool "$WORKFLOW_TOOL" '
    [.[0].results[]
      | select((.allowed_tool_prefixes_json | fromjson | index($tool)) == null)
      | .account_id] | length
  ')"

  if [[ "$missing" != "0" ]]; then
    echo "reviewer workflow tool missing from ${missing} long-lived token rows" >&2
    return 1
  fi

  echo "reviewer workflow tool present on all reviewer long-lived token rows"
}

apply_state() {
  local payload
  payload="$(identity_query "$(select_reviewer_tokens_sql)")"

  local updates
  updates="$(printf "%s" "$payload" | jq -c --arg tool "$WORKFLOW_TOOL" '
    [.[0].results[]
      | .account_id as $accountId
      | (.allowed_tool_prefixes_json | fromjson) as $tools
      | select(($tools | index($tool)) == null)
      | {
          account_id: $accountId,
          next_tools_json: (($tools + [$tool]) | unique)
        }]
  ')"

  local update_count
  update_count="$(printf "%s" "$updates" | jq 'length')"
  if [[ "$update_count" == "0" ]]; then
    echo "no reviewer token rows needed updates"
    return 0
  fi

  printf "%s" "$updates" | jq -c '.[]' | while IFS= read -r row; do
    local account_id next_tools_json escaped_json sql
    account_id="$(printf "%s" "$row" | jq -r '.account_id')"
    next_tools_json="$(printf "%s" "$row" | jq -c '.next_tools_json')"
    escaped_json="$(sql_escape "$next_tools_json")"
    sql="UPDATE mcp_long_lived_tokens SET allowed_tool_prefixes_json = '${escaped_json}', updated_at = datetime('now') WHERE account_id = '${account_id}';"
    identity_query "$sql" >/dev/null
    echo "updated reviewer workflow allowlist for ${account_id}"
  done
}

case "$ACTION" in
  verify)
    require_cmd wrangler
    require_cmd jq
    verify_state
    ;;
  apply)
    require_cmd wrangler
    require_cmd jq
    apply_state
    verify_state
    ;;
  all)
    require_cmd wrangler
    require_cmd jq
    apply_state
    verify_state
    ;;
  *)
    echo "usage: $0 [verify|apply|all]" >&2
    exit 1
    ;;
esac
