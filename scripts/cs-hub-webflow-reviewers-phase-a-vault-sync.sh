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

REVIEWERS=(
  "WF_TEMPLATE_REVIEW_NATALIA|cs-hub-wf-template-review-natalia"
  "WF_TEMPLATE_REVIEW_SUDIKSHA|cs-hub-wf-template-review-sudiksha"
  "WF_TEMPLATE_REVIEW_ERIC|cs-hub-wf-template-review-eric"
  "WF_TEMPLATE_REVIEW_VICKI|cs-hub-wf-template-review-vicki"
  "WF_TEMPLATE_REVIEW_MARIANA|cs-hub-wf-template-review-mariana"
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
}

require_secret() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "missing required secret: ${name}" >&2
    return 1
  fi
}

put_secret() {
  local worker="$1"
  local key="$2"
  local value="$3"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] wrangler secret put ${key} --name ${worker} --config ${HUB_TEAM_CONFIG}"
    return 0
  fi

  printf '%s' "$value" | node "$WRANGLER_RUNNER" --cwd packages/cs-mcp-hub-remote secret put "$key" --name "$worker" --config "$HUB_TEAM_CONFIG"
}

INFISICAL_INCLUDE_IMPORTS="$(normalize_bool_or_fail "$INFISICAL_INCLUDE_IMPORTS")"
DRY_RUN="$(normalize_bool_or_fail "$DRY_RUN")"

require_cmd pnpm
require_cmd jq
require_cmd infisical

load_secrets_from_infisical

missing=0
require_secret HUB_SESSION_RESOLVE_TOKEN || missing=1
require_secret BRAINTRUST_API_KEY || missing=1
require_secret BRAINTRUST_PROJECT_ID || missing=1
for entry in "${REVIEWERS[@]}"; do
  IFS='|' read -r team_key _ <<<"$entry"
  require_secret "CS_HUB_${team_key}_API_TOKEN" || missing=1
done

if [[ "$missing" == "1" ]]; then
  echo "reviewer hub secret validation failed" >&2
  exit 1
fi

for entry in "${REVIEWERS[@]}"; do
  IFS='|' read -r team_key worker <<<"$entry"
  token_var="CS_HUB_${team_key}_API_TOKEN"
  token_value="${!token_var}"
  echo "syncing ${worker}"
  put_secret "$worker" "HUB_API_TOKEN" "$token_value"
  put_secret "$worker" "HUB_SESSION_RESOLVE_TOKEN" "$HUB_SESSION_RESOLVE_TOKEN"
  put_secret "$worker" "BRAINTRUST_API_KEY" "$BRAINTRUST_API_KEY"
  put_secret "$worker" "BRAINTRUST_PROJECT_ID" "$BRAINTRUST_PROJECT_ID"
done

echo "webflow reviewer hub vault sync complete."
