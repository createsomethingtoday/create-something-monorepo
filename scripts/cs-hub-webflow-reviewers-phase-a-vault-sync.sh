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
  local payload_file="$2"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] wrangler versions secret bulk ${payload_file} --name ${worker} --config ${HUB_TEAM_CONFIG}"
    echo "[dry-run] wrangler versions deploy --name ${worker} --config ${HUB_TEAM_CONFIG} --version-id <new-version> --percentage 100"
    return 0
  fi

  local output version_id
  output="$(
    node "$WRANGLER_RUNNER" --cwd packages/cs-mcp-hub-remote versions secret bulk "$payload_file" --name "$worker" --config "$HUB_TEAM_CONFIG" --message "sync reviewer runtime secrets"
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
  payload_file="$(mktemp)"
  jq -n \
    --arg hub_api_token "$token_value" \
    --arg resolve_token "$HUB_SESSION_RESOLVE_TOKEN" \
    --arg braintrust_api_key "$BRAINTRUST_API_KEY" \
    --arg braintrust_project_id "$BRAINTRUST_PROJECT_ID" \
    '{
      HUB_API_TOKEN: $hub_api_token,
      HUB_SESSION_RESOLVE_TOKEN: $resolve_token,
      BRAINTRUST_API_KEY: $braintrust_api_key,
      BRAINTRUST_PROJECT_ID: $braintrust_project_id
    }' > "$payload_file"
  put_secret "$worker" "$payload_file"
  rm -f "$payload_file"
done

echo "webflow reviewer hub vault sync complete."
