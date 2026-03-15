#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

export PATH="/Volumes/LaCie/bin:/opt/homebrew/bin:/usr/local/bin:${PATH}"

INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
INFISICAL_INCLUDE_IMPORTS="${INFISICAL_INCLUDE_IMPORTS:-true}"

TRIGGER_SECRET_NAME="${TRIGGER_SECRET_NAME:-TRIGGER_SECRET_KEY}"
TRIGGER_ACCESS_TOKEN_SECRET_NAME="${TRIGGER_ACCESS_TOKEN_SECRET_NAME:-TRIGGER_ACCESS_TOKEN}"
TRIGGER_PROJECT_REF_SECRET_NAME="${TRIGGER_PROJECT_REF_SECRET_NAME:-TRIGGER_PROJECT_REF}"
TRIGGER_RESOLVE_PROJECT_REF_FROM_INFISICAL="${TRIGGER_RESOLVE_PROJECT_REF_FROM_INFISICAL:-false}"

usage() {
  cat <<'EOF'
Usage:
  bash scripts/trigger/run-with-infisical.sh [trigger.dev-subcommand] [args...]

Examples:
  bash scripts/trigger/run-with-infisical.sh dev
  bash scripts/trigger/run-with-infisical.sh deploy
  bash scripts/trigger/run-with-infisical.sh --help
  bash scripts/trigger/run-with-infisical.sh whoami

Environment:
  TRIGGER_SECRET_KEY                      Optional. Used for `dev` and backend-trigger flows.
  TRIGGER_ACCESS_TOKEN                    Optional. Used for `deploy`/CLI auth flows.
  TRIGGER_PROJECT_REF                     Optional. Recommended to export directly.
  INFISICAL_ENV                           Infisical environment slug (default: prod)
  INFISICAL_PATH                          Infisical folder path (default: /)
  INFISICAL_PROJECT_ID                    Optional explicit Infisical project ID
  INFISICAL_INCLUDE_IMPORTS               Include imported secrets when exporting (default: true)
  TRIGGER_SECRET_NAME                     Secret name for TRIGGER_SECRET_KEY (default: TRIGGER_SECRET_KEY)
  TRIGGER_ACCESS_TOKEN_SECRET_NAME        Secret name for TRIGGER_ACCESS_TOKEN (default: TRIGGER_ACCESS_TOKEN)
  TRIGGER_PROJECT_REF_SECRET_NAME         Secret name for TRIGGER_PROJECT_REF (default: TRIGGER_PROJECT_REF)
  TRIGGER_RESOLVE_PROJECT_REF_FROM_INFISICAL
                                          Resolve TRIGGER_PROJECT_REF from Infisical when true (default: false)
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

resolve_secret_from_infisical() {
  local secret_name="$1"
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

  PAYLOAD="$payload" SECRET_NAME="$secret_name" node <<'EOF'
const payload = process.env.PAYLOAD ?? "";
const secretName = process.env.SECRET_NAME ?? "";

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
  console.error(`missing required Infisical secret: ${secretName}`);
  process.exit(1);
}

process.stdout.write(value);
EOF
}

main() {
  local subcommand="${1:-dev}"
  if [[ "$subcommand" == "--help" || "$subcommand" == "-h" ]]; then
    usage
    exit 0
  fi

  INFISICAL_INCLUDE_IMPORTS="$(normalize_bool_or_fail "$INFISICAL_INCLUDE_IMPORTS")"
  TRIGGER_RESOLVE_PROJECT_REF_FROM_INFISICAL="$(normalize_bool_or_fail "$TRIGGER_RESOLVE_PROJECT_REF_FROM_INFISICAL")"

  require_cmd node
  require_cmd pnpm

  if [[ -z "${TRIGGER_PROJECT_REF:-}" && "$TRIGGER_RESOLVE_PROJECT_REF_FROM_INFISICAL" == "true" ]]; then
    require_cmd infisical
    export TRIGGER_PROJECT_REF
    TRIGGER_PROJECT_REF="$(resolve_secret_from_infisical "$TRIGGER_PROJECT_REF_SECRET_NAME")"
  fi

  case "$subcommand" in
    dev)
      if [[ -z "${TRIGGER_SECRET_KEY:-}" ]]; then
        require_cmd infisical
        export TRIGGER_SECRET_KEY
        TRIGGER_SECRET_KEY="$(resolve_secret_from_infisical "$TRIGGER_SECRET_NAME")"
      fi
      ;;
    deploy | whoami | login)
      if [[ -z "${TRIGGER_ACCESS_TOKEN:-}" ]]; then
        require_cmd infisical
        export TRIGGER_ACCESS_TOKEN
        TRIGGER_ACCESS_TOKEN="$(resolve_secret_from_infisical "$TRIGGER_ACCESS_TOKEN_SECRET_NAME")"
      fi
      ;;
  esac

  cd "$REPO_ROOT"
  exec pnpm --filter @create-something/workflows-trigger exec trigger "$@"
}

main "$@"
