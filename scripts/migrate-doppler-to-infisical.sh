#!/usr/bin/env bash
set -euo pipefail

DOPPLER_PROJECT="${DOPPLER_PROJECT:-create-something}"
DOPPLER_CONFIG="${DOPPLER_CONFIG:-production}"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/}"
INFISICAL_INCLUDE_IMPORTS="${INFISICAL_INCLUDE_IMPORTS:-true}"
INFISICAL_API_URL="${INFISICAL_API_URL:-https://app.infisical.com}"
INFISICAL_CLIENT_ID="${INFISICAL_CLIENT_ID:-}"
INFISICAL_CLIENT_SECRET="${INFISICAL_CLIENT_SECRET:-}"
INFISICAL_TOKEN="${INFISICAL_TOKEN:-}"
INCLUDE_DOPPLER_RUNTIME_VARS="${INCLUDE_DOPPLER_RUNTIME_VARS:-false}"
VERIFY_IMPORT="${VERIFY_IMPORT:-false}"
DRY_RUN="${DRY_RUN:-false}"
TMP_FILES=()

usage() {
  cat <<'EOF'
Usage:
  bash scripts/migrate-doppler-to-infisical.sh [options]

Options:
  --doppler-project <name>          Doppler project (default: create-something)
  --doppler-config <name>           Doppler config/environment (default: production)
  --infisical-project-id <id>       Infisical project ID (optional if .infisical.json is configured)
  --infisical-env <slug>            Infisical environment slug (default: prod)
  --infisical-path <path>           Infisical folder path (default: /)
  --include-doppler-runtime-vars    Include DOPPLER_PROJECT/DOPPLER_CONFIG/DOPPLER_ENVIRONMENT
  --verify                          Verify imported keys/values after write
  --dry-run                         Print planned actions without writing secrets
  -h, --help                        Show this help

Auth:
  - Existing Infisical session, OR
  - INFISICAL_TOKEN, OR
  - INFISICAL_CLIENT_ID + INFISICAL_CLIENT_SECRET (universal auth)

Examples:
  INFISICAL_PROJECT_ID=mcp-m1k5 \
  INFISICAL_CLIENT_ID=... \
  INFISICAL_CLIENT_SECRET=... \
  bash scripts/migrate-doppler-to-infisical.sh --doppler-config production --verify

  # Dry run
  bash scripts/migrate-doppler-to-infisical.sh --dry-run
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

cleanup_tmp_files() {
  for tmp_file in "${TMP_FILES[@]:-}"; do
    if [[ -n "$tmp_file" && -f "$tmp_file" ]]; then
      rm -f "$tmp_file"
    fi
  done
}

login_infisical_if_needed() {
  if [[ -n "${INFISICAL_TOKEN:-}" ]]; then
    return 0
  fi
  if [[ -n "${INFISICAL_CLIENT_ID:-}" || -n "${INFISICAL_CLIENT_SECRET:-}" ]]; then
    if [[ -z "${INFISICAL_CLIENT_ID:-}" || -z "${INFISICAL_CLIENT_SECRET:-}" ]]; then
      echo "for Universal Auth, both INFISICAL_CLIENT_ID and INFISICAL_CLIENT_SECRET are required" >&2
      exit 1
    fi
    INFISICAL_TOKEN="$(
      INFISICAL_API_URL="$INFISICAL_API_URL" \
      infisical login \
        --method=universal-auth \
        --client-id="$INFISICAL_CLIENT_ID" \
        --client-secret="$INFISICAL_CLIENT_SECRET" \
        --silent \
        --plain
    )"
    export INFISICAL_TOKEN
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --)
      shift
      ;;
    --doppler-project)
      DOPPLER_PROJECT="$2"
      shift 2
      ;;
    --doppler-config)
      DOPPLER_CONFIG="$2"
      shift 2
      ;;
    --infisical-project-id)
      INFISICAL_PROJECT_ID="$2"
      shift 2
      ;;
    --infisical-env)
      INFISICAL_ENV="$2"
      shift 2
      ;;
    --infisical-path)
      INFISICAL_PATH="$2"
      shift 2
      ;;
    --include-doppler-runtime-vars)
      INCLUDE_DOPPLER_RUNTIME_VARS="true"
      shift
      ;;
    --verify)
      VERIFY_IMPORT="true"
      shift
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

INCLUDE_DOPPLER_RUNTIME_VARS="$(normalize_bool_or_fail "$INCLUDE_DOPPLER_RUNTIME_VARS")"
VERIFY_IMPORT="$(normalize_bool_or_fail "$VERIFY_IMPORT")"
DRY_RUN="$(normalize_bool_or_fail "$DRY_RUN")"
INFISICAL_INCLUDE_IMPORTS="$(normalize_bool_or_fail "$INFISICAL_INCLUDE_IMPORTS")"

require_cmd doppler
require_cmd jq
require_cmd mktemp
trap cleanup_tmp_files EXIT

if [[ "$DRY_RUN" == "false" ]]; then
  require_cmd infisical
  login_infisical_if_needed
fi

echo "reading Doppler secrets project=${DOPPLER_PROJECT} config=${DOPPLER_CONFIG}"
source_payload="$(
  doppler secrets download \
    --no-file \
    --format json \
    --project "$DOPPLER_PROJECT" \
    --config "$DOPPLER_CONFIG"
)"

if [[ "$INCLUDE_DOPPLER_RUNTIME_VARS" == "false" ]]; then
  source_payload="$(
    printf '%s' "$source_payload" | jq 'del(.DOPPLER_PROJECT, .DOPPLER_CONFIG, .DOPPLER_ENVIRONMENT)'
  )"
fi

total_count="$(printf '%s' "$source_payload" | jq 'length')"
if [[ "$total_count" -eq 0 ]]; then
  echo "no secrets found after filtering; nothing to migrate"
  exit 0
fi

echo "migrating ${total_count} secret(s) to Infisical env=${INFISICAL_ENV} path=${INFISICAL_PATH}"
if [[ -n "$INFISICAL_PROJECT_ID" ]]; then
  echo "target Infisical project=${INFISICAL_PROJECT_ID}"
else
  echo "target Infisical project=<from .infisical.json or active CLI context>"
fi

set_count=0
while IFS= read -r entry; do
  key="$(printf '%s' "$entry" | jq -r '.key')"
  value="$(printf '%s' "$entry" | jq -r '.value // "" | tostring')"
  set_count=$((set_count + 1))

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] would set ${key}"
    continue
  fi

  echo "setting ${key} (${set_count}/${total_count})"
  tmp_file="$(mktemp)"
  TMP_FILES+=("$tmp_file")
  printf '%s' "$value" > "$tmp_file"

  set_cmd=(
    infisical secrets set
    "${key}=@${tmp_file}"
    --env="$INFISICAL_ENV"
    --path="$INFISICAL_PATH"
    --silent
  )
  if [[ -n "$INFISICAL_PROJECT_ID" ]]; then
    set_cmd+=(--projectId="$INFISICAL_PROJECT_ID")
  fi
  INFISICAL_API_URL="$INFISICAL_API_URL" "${set_cmd[@]}" >/dev/null
done < <(printf '%s' "$source_payload" | jq -c 'to_entries[]')

echo "write pass complete (${set_count} secret(s))"

if [[ "$VERIFY_IMPORT" == "true" ]]; then
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "verify skipped in dry-run mode"
    exit 0
  fi

  echo "verifying imported secrets..."
  export_cmd=(
    infisical export
    --format=json
    --env="$INFISICAL_ENV"
    --path="$INFISICAL_PATH"
    --include-imports="$INFISICAL_INCLUDE_IMPORTS"
  )
  if [[ -n "$INFISICAL_PROJECT_ID" ]]; then
    export_cmd+=(--projectId="$INFISICAL_PROJECT_ID")
  fi

  target_payload="$(
    INFISICAL_API_URL="$INFISICAL_API_URL" \
    "${export_cmd[@]}"
  )"

  source_map="$(printf '%s' "$source_payload" | jq 'with_entries(.value |= tostring)')"
  target_map="$(printf '%s' "$target_payload" | jq '
    if type == "array" then
      reduce .[] as $s ({}; . + {($s.key): ($s.value | tostring)})
    elif type == "object" then
      with_entries(.value |= tostring)
    else
      {}
    end
  ')"

  verification="$(
    jq -n \
      --argjson src "$source_map" \
      --argjson dst "$target_map" \
      '{
        missing: [($src | keys[]) as $k | select(($dst | has($k)) | not) | $k],
        mismatched: [($src | keys[]) as $k | select(($dst | has($k)) and (($dst[$k] | tostring) != ($src[$k] | tostring))) | $k]
      }'
  )"

  missing_count="$(printf '%s' "$verification" | jq '.missing | length')"
  mismatched_count="$(printf '%s' "$verification" | jq '.mismatched | length')"

  if [[ "$missing_count" -gt 0 || "$mismatched_count" -gt 0 ]]; then
    echo "verification failed: missing=${missing_count} mismatched=${mismatched_count}" >&2
    if [[ "$missing_count" -gt 0 ]]; then
      echo "missing keys:" >&2
      printf '%s' "$verification" | jq -r '.missing[]' >&2
    fi
    if [[ "$mismatched_count" -gt 0 ]]; then
      echo "mismatched keys:" >&2
      printf '%s' "$verification" | jq -r '.mismatched[]' >&2
    fi
    exit 1
  fi
  echo "verification passed"
fi

echo "doppler -> infisical migration complete"
