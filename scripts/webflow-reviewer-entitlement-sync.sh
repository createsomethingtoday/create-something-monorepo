#!/usr/bin/env bash
set -euo pipefail

IDENTITY_DB_NAME="${IDENTITY_DB_NAME:-identity-db}"
IDENTITY_DB_CONFIG="${IDENTITY_DB_CONFIG:-packages/identity-worker/wrangler.toml}"
AGENCY_DB_NAME="${AGENCY_DB_NAME:-create-something-db}"
AGENCY_DB_CONFIG="${AGENCY_DB_CONFIG:-packages/agency/wrangler.jsonc}"
ACTION="${1:-all}"
REVIEWER_ACCOUNT_PATTERN="${REVIEWER_ACCOUNT_PATTERN:-acct_wf_%}"
SERVICE_TIER="${SERVICE_TIER:-policy_os_trial}"
SOURCE_TAG="${SOURCE_TAG:-webflow_reviewer_rollout}"
SKIP_ACCOUNTS_CSV="${SKIP_ACCOUNTS_CSV:-acct_wf_sudiksha}"

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

agency_query() {
  local sql="$1"
  wrangler d1 execute "$AGENCY_DB_NAME" \
    --config "$AGENCY_DB_CONFIG" \
    --remote \
    --json \
    --command "$sql"
}

detect_subject_column() {
  local db_kind="$1"
  local table_name="$2"
  local payload

  if [[ "$db_kind" == "identity" ]]; then
    payload="$(identity_query "PRAGMA table_info(${table_name});")"
  else
    payload="$(agency_query "PRAGMA table_info(${table_name});")"
  fi

  printf "%s" "$payload" | jq -r '
    [.[0].results[]?.name]
    | if index("auth_subject") != null then "auth_subject"
      elif index("identity_subject") != null then "identity_subject"
      else empty
      end
  '
}

select_reviewer_tokens() {
  local identity_subject_column="$1"
  identity_query "
SELECT ${identity_subject_column} AS auth_subject, auth_email, tenant_id, account_id, bound_host
FROM mcp_long_lived_tokens
WHERE account_id LIKE '$(sql_escape "$REVIEWER_ACCOUNT_PATTERN")'
ORDER BY account_id;
"
}

build_sql_in_list() {
  local json_payload="$1"
  printf "%s" "$json_payload" | jq -r '
    [.[0].results[]?.auth_subject | select(type == "string" and length > 0)]
    | unique
    | map("'"'"'" + gsub("'"'"'"; "''") + "'"'"'")
    | join(",")
  '
}

select_reviewer_entitlements() {
  local agency_subject_column="$1"
  local tokens_payload="$2"
  local subject_in_list
  subject_in_list="$(build_sql_in_list "$tokens_payload")"

  local where_clause
  where_clause="account_id LIKE '$(sql_escape "$REVIEWER_ACCOUNT_PATTERN")'"
  if [[ -n "$subject_in_list" ]]; then
    where_clause="${where_clause} OR ${agency_subject_column} IN (${subject_in_list})"
  fi

  agency_query "
SELECT ${agency_subject_column} AS auth_subject, auth_email, account_id, tenant_id, metadata_json
FROM agency_mcp_entitlements
WHERE ${where_clause}
ORDER BY account_id;
"
}

build_sync_rows() {
  local tokens_payload="$1"
  local entitlements_payload="$2"

  jq -cn \
    --arg source "$SOURCE_TAG" \
    --arg serviceTier "$SERVICE_TIER" \
    --arg skipCsv "$SKIP_ACCOUNTS_CSV" \
    --argjson tokens "$tokens_payload" \
    --argjson entitlements "$entitlements_payload" '
    def trim: gsub("^\\s+|\\s+$"; "");
    def skipAccounts:
      $skipCsv
      | split(",")
      | map(trim)
      | map(select(length > 0));
    def lowerOrEmpty($value):
      (($value // "") | ascii_downcase);
    def slugForAccount($accountId; $boundHost):
      if ($boundHost // "") | length > 0 then $boundHost
      elif ($accountId | startswith("acct_wf_")) then ("wf-template-review-" + ($accountId | sub("^acct_wf_"; "")))
      else $accountId
      end;

    ($entitlements[0].results // []) as $existing
    | reduce $existing[] as $row ({};
        if ($row.auth_subject // "") | length > 0 then
          .[$row.auth_subject] = $row
        else
          .
        end
      ) as $existingBySubject
    | ($tokens[0].results // [])
    | map(select((.account_id as $accountId | (skipAccounts | index($accountId))) == null))
    | map(
        . as $token
        | ($existingBySubject[$token.auth_subject] // null) as $existingRow
        | {
            operation:
              if $existingRow == null then
                "insert"
              elif (
                ($existingRow.account_id != $token.account_id)
                or ($existingRow.tenant_id != $token.tenant_id)
                or (lowerOrEmpty($existingRow.auth_email) != lowerOrEmpty($token.auth_email))
                or ((($existingRow.metadata_json | fromjson? // {}) | .manual_override) != true)
              ) then
                "update"
              else
                "ready"
              end,
            auth_subject: $token.auth_subject,
            auth_email: $token.auth_email,
            account_id: $token.account_id,
            tenant_id: $token.tenant_id,
            workspace_account_id: $token.account_id,
            service_tier: (
              if ($existingRow.service_tier // "") | length > 0 then
                $existingRow.service_tier
              else
                $serviceTier
              end
            ),
            metadata_json: (
              (($existingRow.metadata_json | fromjson? // {}) + {
                manual_override: true,
                source: $source,
                slug: slugForAccount($token.account_id; $token.bound_host)
              }) | tojson
            ),
            existing_account_id: ($existingRow.account_id // null)
          }
      )
    | map(select(.operation != "ready"))
  '
}

verify_state() {
  local identity_subject_column="$1"
  local agency_subject_column="$2"
  local tokens_payload entitlements_payload

  tokens_payload="$(select_reviewer_tokens "$identity_subject_column")"
  entitlements_payload="$(select_reviewer_entitlements "$agency_subject_column" "$tokens_payload")"

  jq -rn \
    --arg skipCsv "$SKIP_ACCOUNTS_CSV" \
    --argjson tokens "$tokens_payload" \
    --argjson entitlements "$entitlements_payload" '
    def trim: gsub("^\\s+|\\s+$"; "");
    def skipAccounts:
      $skipCsv
      | split(",")
      | map(trim)
      | map(select(length > 0));
    def lowerOrEmpty($value):
      (($value // "") | ascii_downcase);

    ($entitlements[0].results // []) as $existing
    | reduce $existing[] as $row ({};
        if ($row.auth_subject // "") | length > 0 then
          .[$row.auth_subject] = $row
        else
          .
        end
      ) as $existingBySubject
    | ($tokens[0].results // [])
    | map(select((.account_id as $accountId | (skipAccounts | index($accountId))) == null))
    | .[]
    | (. as $token | ($existingBySubject[$token.auth_subject] // null)) as $existingRow
    | [
        .account_id,
        .auth_email,
        (
          if $existingRow == null then
            "missing"
          elif (
            ($existingRow.account_id != .account_id)
            or ($existingRow.tenant_id != .tenant_id)
            or (lowerOrEmpty($existingRow.auth_email) != lowerOrEmpty(.auth_email))
            or ((($existingRow.metadata_json | fromjson? // {}) | .manual_override) != true)
          ) then
            "update_required"
          else
            "ready"
          end
        )
      ]
    | @tsv
  ' | while IFS=$'\t' read -r account_id auth_email has_entitlement; do
    echo "${account_id} email=${auth_email} entitlement_status=${has_entitlement}"
  done

  local sync_count
  sync_count="$(build_sync_rows "$tokens_payload" "$entitlements_payload" | jq 'length')"
  if [[ "$sync_count" != "0" ]]; then
    echo "reviewer entitlement sync needed for ${sync_count} reviewer account(s)" >&2
    return 1
  fi

  echo "reviewer entitlement rows present for all non-skipped reviewer accounts"
}

apply_state() {
  local identity_subject_column="$1"
  local agency_subject_column="$2"
  local tokens_payload entitlements_payload sync_rows

  tokens_payload="$(select_reviewer_tokens "$identity_subject_column")"
  entitlements_payload="$(select_reviewer_entitlements "$agency_subject_column" "$tokens_payload")"
  sync_rows="$(build_sync_rows "$tokens_payload" "$entitlements_payload")"

  local sync_count
  sync_count="$(printf "%s" "$sync_rows" | jq 'length')"
  if [[ "$sync_count" == "0" ]]; then
    echo "no reviewer entitlement rows needed changes"
    return 0
  fi

  printf "%s" "$sync_rows" | jq -c '.[]' | while IFS= read -r row; do
    local operation auth_subject auth_email account_id tenant_id workspace_account_id service_tier metadata_json sql
    operation="$(printf "%s" "$row" | jq -r '.operation')"
    auth_subject="$(printf "%s" "$row" | jq -r '.auth_subject')"
    auth_email="$(printf "%s" "$row" | jq -r '.auth_email')"
    account_id="$(printf "%s" "$row" | jq -r '.account_id')"
    tenant_id="$(printf "%s" "$row" | jq -r '.tenant_id')"
    workspace_account_id="$(printf "%s" "$row" | jq -r '.workspace_account_id')"
    service_tier="$(printf "%s" "$row" | jq -r '.service_tier')"
    metadata_json="$(printf "%s" "$row" | jq -r '.metadata_json')"

    if [[ "$operation" == "insert" ]]; then
      sql="
INSERT INTO agency_mcp_entitlements (
  ${agency_subject_column},
  auth_email,
  account_id,
  tenant_id,
  workspace_account_id,
  service_tier,
  managed_bearer_allowed,
  org_membership_active,
  service_entitled,
  policy_accepted,
  contract_active,
  billing_active,
  denial_reason,
  metadata_json
) VALUES (
  '$(sql_escape "$auth_subject")',
  '$(sql_escape "$auth_email")',
  '$(sql_escape "$account_id")',
  '$(sql_escape "$tenant_id")',
  '$(sql_escape "$workspace_account_id")',
  '$(sql_escape "$service_tier")',
  1,
  1,
  1,
  1,
  1,
  1,
  NULL,
  '$(sql_escape "$metadata_json")'
);
"
    else
      sql="
UPDATE agency_mcp_entitlements
SET auth_email = '$(sql_escape "$auth_email")',
    account_id = '$(sql_escape "$account_id")',
    tenant_id = '$(sql_escape "$tenant_id")',
    workspace_account_id = '$(sql_escape "$workspace_account_id")',
    service_tier = '$(sql_escape "$service_tier")',
    managed_bearer_allowed = 1,
    org_membership_active = 1,
    service_entitled = 1,
    policy_accepted = 1,
    contract_active = 1,
    billing_active = 1,
    denial_reason = NULL,
    metadata_json = '$(sql_escape "$metadata_json")',
    updated_at = datetime('now')
WHERE ${agency_subject_column} = '$(sql_escape "$auth_subject")';
"
    fi
    agency_query "$sql" >/dev/null
    echo "${operation}d reviewer entitlement row for ${account_id}"
  done
}

main() {
  require_cmd wrangler
  require_cmd jq

  local identity_subject_column agency_subject_column
  identity_subject_column="$(detect_subject_column identity mcp_long_lived_tokens)"
  agency_subject_column="$(detect_subject_column agency agency_mcp_entitlements)"

  if [[ -z "$identity_subject_column" || -z "$agency_subject_column" ]]; then
    echo "unable to detect reviewer entitlement subject columns" >&2
    exit 1
  fi

  case "$ACTION" in
    verify)
      verify_state "$identity_subject_column" "$agency_subject_column"
      ;;
    apply)
      apply_state "$identity_subject_column" "$agency_subject_column"
      verify_state "$identity_subject_column" "$agency_subject_column"
      ;;
    all)
      apply_state "$identity_subject_column" "$agency_subject_column"
      verify_state "$identity_subject_column" "$agency_subject_column"
      ;;
    *)
      echo "usage: $0 [verify|apply|all]" >&2
      exit 1
      ;;
  esac
}

main "$@"
