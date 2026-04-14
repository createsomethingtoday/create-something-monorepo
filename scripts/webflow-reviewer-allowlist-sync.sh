#!/usr/bin/env bash
set -euo pipefail

IDENTITY_DB_NAME="${IDENTITY_DB_NAME:-identity-db}"
IDENTITY_DB_CONFIG="${IDENTITY_DB_CONFIG:-packages/identity-worker/wrangler.toml}"
ACTION="${1:-all}"
REVIEWER_ACCOUNT_PATTERN="${REVIEWER_ACCOUNT_PATTERN:-acct_wf_%}"
SKIP_ACCOUNTS_CSV="${SKIP_ACCOUNTS_CSV:-acct_wf_sudiksha}"
REQUIRED_TOOLS_CSV="${REQUIRED_TOOLS_CSV:-webflow-template-review-mcp__template_review_workflow,webflow-template-review-mcp__template_review_enqueue_analysis,webflow-site-analyzer-mcp__enqueue_template_review,webflow-site-analyzer-mcp__get_template_review_job,webflow-site-analyzer-mcp__list_template_review_jobs}"
FORBIDDEN_TOOLS_CSV="${FORBIDDEN_TOOLS_CSV:-webflow-site-analyzer-mcp__run_template_review,webflow-mcp__plagiarism_confidence,webflow-mcp__plagiarism_detect_frameworks,webflow-mcp__plagiarism_health,webflow-mcp__plagiarism_scan}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing required command: $1" >&2
    exit 1
  }
}

sql_escape() {
  printf "%s" "$1" | sed "s/'/''/g"
}

identity_query() {
  local sql="$1"
  wrangler d1 execute "$IDENTITY_DB_NAME" \
    --config "$IDENTITY_DB_CONFIG" \
    --remote \
    --json \
    --command "$sql"
}

select_reviewer_tokens() {
  identity_query "
SELECT account_id, auth_email, bound_host, token_prefix, allowed_tool_prefixes_json
FROM mcp_long_lived_tokens
WHERE account_id LIKE '$(sql_escape "$REVIEWER_ACCOUNT_PATTERN")'
ORDER BY account_id;
"
}

build_sync_rows() {
  local tokens_payload="$1"

  jq -cn \
    --arg skipCsv "$SKIP_ACCOUNTS_CSV" \
    --arg requiredCsv "$REQUIRED_TOOLS_CSV" \
    --arg forbiddenCsv "$FORBIDDEN_TOOLS_CSV" \
    --argjson tokens "$tokens_payload" '
    def trim: gsub("^\\s+|\\s+$"; "");
    def csvToArray($value):
      $value
      | split(",")
      | map(trim)
      | map(select(length > 0));
    (csvToArray($skipCsv)) as $skip
    | (csvToArray($requiredCsv)) as $required
    | (csvToArray($forbiddenCsv)) as $forbidden
    | ($tokens[0].results // [])
    | map(select((.account_id as $accountId | ($skip | index($accountId))) == null))
    | map(
        . as $row
        | (.allowed_tool_prefixes_json | fromjson? // []) as $existing
        | (reduce $existing[] as $tool ({}; .[$tool] = true)) as $existing_set
        | (reduce $forbidden[] as $tool ({}; .[$tool] = true)) as $forbidden_set
        | [$required[] | select(($existing_set[.] // false) | not)] as $missing
        | [$forbidden[] | select($existing_set[.] // false)] as $forbidden_present
        | (
            ($existing | map(select(($forbidden_set[.] // false) | not)))
            + $missing
            | unique
            | sort
          ) as $next
        | {
            account_id: $row.account_id,
            auth_email: $row.auth_email,
            bound_host: $row.bound_host,
            token_prefix: $row.token_prefix,
            existing_tools: $existing,
            next_tools: $next,
            missing_required: $missing,
            forbidden_present: $forbidden_present
          }
        | select(
            (.missing_required | length) > 0
            or (.forbidden_present | length) > 0
            or (.existing_tools | length) != (.next_tools | length)
          )
      )
  '
}

verify_state() {
  local tokens_payload rows_payload
  tokens_payload="$(select_reviewer_tokens)"
  rows_payload="$(build_sync_rows "$tokens_payload")"

  jq -rn \
    --arg skipCsv "$SKIP_ACCOUNTS_CSV" \
    --argjson tokens "$tokens_payload" \
    --argjson rows "$rows_payload" '
    def trim: gsub("^\\s+|\\s+$"; "");
    def csvToArray($value):
      $value
      | split(",")
      | map(trim)
      | map(select(length > 0));
    (csvToArray($skipCsv)) as $skip
    | reduce ($rows // [])[] as $row ({}; .[$row.account_id] = $row) as $updates
    | ($tokens[0].results // [])[]
    | select((.account_id as $accountId | ($skip | index($accountId))) == null)
    | ($updates[.account_id] // null) as $update
    | "\(.account_id) email=\(.auth_email) allowlist_status=\(if $update == null then "ready" else "update_required" end) missing_required=\(if (($update.missing_required // []) | length) == 0 then "none" else (($update.missing_required // []) | join(",")) end) forbidden_present=\(if (($update.forbidden_present // []) | length) == 0 then "none" else (($update.forbidden_present // []) | join(",")) end)"
  '

  local sync_count
  sync_count="$(printf "%s" "$rows_payload" | jq 'length')"
  if [[ "$sync_count" != "0" ]]; then
    echo "reviewer allowlist sync needed for ${sync_count} reviewer account(s)" >&2
    return 1
  fi

  echo "reviewer allowlists match the production reviewer tool lane"
}

apply_state() {
  local tokens_payload rows_payload
  tokens_payload="$(select_reviewer_tokens)"
  rows_payload="$(build_sync_rows "$tokens_payload")"

  local sync_count
  sync_count="$(printf "%s" "$rows_payload" | jq 'length')"
  if [[ "$sync_count" == "0" ]]; then
    echo "no reviewer allowlist rows needed changes"
    return 0
  fi

  printf "%s" "$rows_payload" | jq -c '.[]' | while IFS= read -r row; do
    local account_id next_tools_json escaped_json sql
    account_id="$(printf "%s" "$row" | jq -r '.account_id')"
    next_tools_json="$(printf "%s" "$row" | jq -c '.next_tools')"
    escaped_json="$(sql_escape "$next_tools_json")"
    sql="UPDATE mcp_long_lived_tokens SET allowed_tool_prefixes_json = '${escaped_json}', updated_at = datetime('now') WHERE account_id = '$(sql_escape "$account_id")';"
    identity_query "$sql" >/dev/null
    echo "updated reviewer allowlist for ${account_id}"
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
