#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

export PATH="/Volumes/LaCie/bin:/opt/homebrew/bin:/usr/local/bin:${PATH}"

INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
INFISICAL_INCLUDE_IMPORTS="${INFISICAL_INCLUDE_IMPORTS:-true}"
INFISICAL_SECRET_NAME="${INFISICAL_SECRET_NAME:-LOOM_MCP_API_TOKEN}"

usage() {
  cat <<'EOF'
Usage:
  bash scripts/symphony/run-with-infisical.sh <lane> [--once]

Lanes:
  code-quality
  hub-deploy
  policy

Environment:
  LOOM_MCP_API_TOKEN       Optional. If already exported, Infisical is skipped.
  INFISICAL_ENV            Infisical environment slug (default: prod)
  INFISICAL_PATH           Infisical folder path (default: /)
  INFISICAL_PROJECT_ID     Optional explicit Infisical project ID
  INFISICAL_INCLUDE_IMPORTS Include imported secrets when exporting (default: true)
  INFISICAL_SECRET_NAME    Secret name to resolve (default: LOOM_MCP_API_TOKEN)
EOF
}

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

resolve_loom_token_from_infisical() {
  local payload
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

  payload="$("${export_cmd[@]}")"

  PAYLOAD="$payload" SECRET_NAME="$INFISICAL_SECRET_NAME" node <<'EOF'
const payload = process.env.PAYLOAD ?? "";
const secretName = process.env.SECRET_NAME ?? "LOOM_MCP_API_TOKEN";

let parsed;
try {
  parsed = JSON.parse(payload);
} catch (error) {
  console.error(`failed to parse Infisical export JSON: ${error.message}`);
  process.exit(1);
}

let value = "";
if (Array.isArray(parsed)) {
  value = parsed.find((entry) => entry && entry.key === secretName)?.value ?? "";
} else if (parsed && typeof parsed === "object") {
  value = parsed[secretName] ?? "";
}

if (typeof value !== "string" || value.length === 0) {
  console.error(
    `missing required Infisical secret: ${secretName} (env=${process.env.INFISICAL_ENV ?? "prod"} path=${process.env.INFISICAL_PATH ?? "/"})`,
  );
  process.exit(1);
}

process.stdout.write(value);
EOF
}

main() {
  if [[ $# -lt 1 ]]; then
    usage >&2
    exit 1
  fi

  local lane="$1"
  shift

  local workflow_path
  local port
  case "$lane" in
    code-quality)
      workflow_path="automation/symphony/code-quality/WORKFLOW.md"
      port="4780"
      ;;
    hub-deploy)
      workflow_path="automation/symphony/hub-deploy/WORKFLOW.md"
      port="4782"
      ;;
    policy)
      workflow_path="automation/symphony/policy/WORKFLOW.md"
      port="4781"
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "unknown Symphony lane: ${lane}" >&2
      usage >&2
      exit 1
      ;;
  esac

  INFISICAL_INCLUDE_IMPORTS="$(normalize_bool_or_fail "$INFISICAL_INCLUDE_IMPORTS")"

  require_cmd node
  require_cmd pnpm

  if [[ -z "${LOOM_MCP_API_TOKEN:-}" ]]; then
    require_cmd infisical
    export LOOM_MCP_API_TOKEN
    LOOM_MCP_API_TOKEN="$(resolve_loom_token_from_infisical)"
  fi

  if [[ -z "${LOOM_MCP_API_TOKEN:-}" ]]; then
    echo "LOOM_MCP_API_TOKEN resolved to an empty value." >&2
    exit 1
  fi

  cd "$REPO_ROOT"
  exec pnpm exec node packages/symphony/src/cli.js "$workflow_path" --port "$port" "$@"
}

main "$@"
