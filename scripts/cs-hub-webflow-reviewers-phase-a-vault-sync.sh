#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HUB_REMOTE_DIR="$ROOT_DIR/packages/cs-mcp-hub-remote"
HUB_TEAM_CONFIG="$HUB_REMOTE_DIR/wrangler.team-hubs.toml"
WRANGLER_RUNNER="$ROOT_DIR/scripts/run-wrangler.mjs"

INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/}"
INFISICAL_INCLUDE_IMPORTS="${INFISICAL_INCLUDE_IMPORTS:-true}"
DRY_RUN="${DRY_RUN:-false}"
REVIEWER="${REVIEWER:-all}"
INCLUDE_CENTRAL="${INCLUDE_CENTRAL:-0}"

REVIEWERS=(
  "WF_TEMPLATE_REVIEW_NATALIA|cs-hub-wf-template-review-natalia"
  "WF_TEMPLATE_REVIEW_SUDIKSHA|cs-hub-wf-template-review-sudiksha"
  "WF_TEMPLATE_REVIEW_ERIC|cs-hub-wf-template-review-eric"
  "WF_TEMPLATE_REVIEW_VICKI|cs-hub-wf-template-review-vicki"
  "WF_TEMPLATE_REVIEW_MARIANA|cs-hub-wf-template-review-mariana"
  "WF_TEMPLATE_REVIEW_MICAH|cs-hub-wf-template-review-micah"
)

TARGETS=("${REVIEWERS[@]}")
if [[ "$INCLUDE_CENTRAL" == "1" || "$INCLUDE_CENTRAL" == "true" || "$REVIEWER" == "central" || "$REVIEWER" == "shared" || "$REVIEWER" == "wf-template-review" ]]; then
  TARGETS+=("WF_TEMPLATE_REVIEW|cs-hub-wf-template-review")
fi

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

require_secret() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "missing required secret: ${name}" >&2
    return 1
  fi
}

put_versioned_secret() {
  local worker="$1"
  local key="$2"
  local value="$3"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] wrangler versions secret put ${key} --name ${worker} --config ${HUB_TEAM_CONFIG}"
    echo "[dry-run] wrangler versions deploy --name ${worker} --config ${HUB_TEAM_CONFIG} --version-id <new-version> --percentage 100"
    return 0
  fi

  local output version_id
  output="$(
    printf '%s' "$value" | node "$WRANGLER_RUNNER" --cwd packages/cs-mcp-hub-remote versions secret put "$key" --name "$worker" --config "$HUB_TEAM_CONFIG" --message "sync reviewer runtime secret ${key}"
  )"
  printf '%s\n' "$output"
  version_id="$(printf '%s\n' "$output" | grep -Eo '[0-9a-f]{8}-[0-9a-f-]{27}' | tail -n1)"
  if [[ -z "$version_id" ]]; then
    echo "failed to parse version id for ${worker}" >&2
    exit 1
  fi

  node "$WRANGLER_RUNNER" --cwd packages/cs-mcp-hub-remote versions deploy \
    --name "$worker" \
    --config "$HUB_TEAM_CONFIG" \
    --version-id "$version_id" \
    --percentage 100 \
    --message "deploy reviewer runtime secrets" \
    --yes
}

reviewer_key_matches() {
  local reviewer_key="$1"
  local reviewer="${2:-all}"
  local reviewer_upper
  if [[ "$reviewer" == "all" ]]; then
    return 0
  fi
  if [[ "$reviewer" == "central" || "$reviewer" == "shared" || "$reviewer" == "wf-template-review" ]]; then
    [[ "$reviewer_key" == "WF_TEMPLATE_REVIEW" ]]
    return $?
  fi
  reviewer_upper="$(printf '%s' "$reviewer" | tr '[:lower:]' '[:upper:]')"
  [[ "$reviewer_key" == "WF_TEMPLATE_REVIEW_${reviewer_upper}" ]]
}

INFISICAL_INCLUDE_IMPORTS="$(normalize_bool_or_fail "$INFISICAL_INCLUDE_IMPORTS")"
DRY_RUN="$(normalize_bool_or_fail "$DRY_RUN")"

require_cmd pnpm
require_cmd jq
require_cmd infisical

load_secrets_from_infisical

missing=0
require_secret "HUB_SESSION_RESOLVE_TOKEN" || missing=1
require_secret "WEBFLOW_TEMPLATE_REVIEW_MCP_API_KEY" || missing=1
require_secret "WEBFLOW_REVIEWER_EXCEPTIONS_MCP_API_KEY" || missing=1
require_secret "BRAINTRUST_API_KEY" || missing=1
require_secret "BRAINTRUST_PROJECT_ID" || missing=1

for entry in "${TARGETS[@]}"; do
  IFS='|' read -r reviewer_key _worker <<<"$entry"
  if ! reviewer_key_matches "$reviewer_key" "$REVIEWER"; then
    continue
  fi
  if [[ "$reviewer_key" == "WF_TEMPLATE_REVIEW" ]]; then
    require_secret "CS_HUB_WF_TEMPLATE_REVIEW_API_TOKEN" || missing=1
  else
    require_secret "CS_HUB_${reviewer_key}_API_TOKEN" || missing=1
  fi
done

if [[ "$missing" == "1" ]]; then
  echo "reviewer hub secret validation failed" >&2
  exit 1
fi

for entry in "${TARGETS[@]}"; do
  IFS='|' read -r reviewer_key worker <<<"$entry"
  if ! reviewer_key_matches "$reviewer_key" "$REVIEWER"; then
    continue
  fi
  echo "syncing ${worker}"
  if [[ "$reviewer_key" == "WF_TEMPLATE_REVIEW" ]]; then
    put_versioned_secret "$worker" "HUB_API_TOKEN" "$CS_HUB_WF_TEMPLATE_REVIEW_API_TOKEN"
  else
    reviewer_token_var="CS_HUB_${reviewer_key}_API_TOKEN"
    put_versioned_secret "$worker" "HUB_API_TOKEN" "${!reviewer_token_var}"
  fi
  put_versioned_secret "$worker" "HUB_SESSION_RESOLVE_TOKEN" "$HUB_SESSION_RESOLVE_TOKEN"
  put_versioned_secret "$worker" "WEBFLOW_TEMPLATE_REVIEW_MCP_API_KEY" "$WEBFLOW_TEMPLATE_REVIEW_MCP_API_KEY"
  put_versioned_secret "$worker" "WEBFLOW_REVIEWER_EXCEPTIONS_MCP_API_KEY" "$WEBFLOW_REVIEWER_EXCEPTIONS_MCP_API_KEY"
  put_versioned_secret "$worker" "BRAINTRUST_API_KEY" "$BRAINTRUST_API_KEY"
  put_versioned_secret "$worker" "BRAINTRUST_PROJECT_ID" "$BRAINTRUST_PROJECT_ID"
done

echo "webflow reviewer hub vault sync complete."
