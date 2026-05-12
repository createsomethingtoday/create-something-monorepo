#!/usr/bin/env bash
set -euo pipefail

reviewer="${1:-${WF_TEMPLATE_REVIEW_REVIEWER:-}}"
if [[ -z "$reviewer" ]]; then
  echo "Usage: $0 <eric|natalia|mariana|vicki|micah|sudiksha>" >&2
  exit 64
fi

normalize_reviewer() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9_-' '-'
}

secret_for_reviewer() {
  case "$(normalize_reviewer "$1")" in
    eric) echo "CS_HUB_WF_TEMPLATE_REVIEW_ERIC_API_TOKEN" ;;
    natalia) echo "CS_HUB_WF_TEMPLATE_REVIEW_NATALIA_API_TOKEN" ;;
    mariana) echo "CS_HUB_WF_TEMPLATE_REVIEW_MARIANA_API_TOKEN" ;;
    vicki) echo "CS_HUB_WF_TEMPLATE_REVIEW_VICKI_API_TOKEN" ;;
    micah) echo "CS_HUB_WF_TEMPLATE_REVIEW_MICAH_API_TOKEN" ;;
    sudiksha) echo "CS_HUB_WF_TEMPLATE_REVIEW_SUDIKSHA_API_TOKEN" ;;
    *)
      echo "Unknown Webflow Template Review reviewer: $1" >&2
      exit 64
      ;;
  esac
}

secret_key="$(secret_for_reviewer "$reviewer")"
token="${WF_TEMPLATE_REVIEW_HUB_TOKEN:-}"

if [[ -z "$token" ]]; then
  if ! command -v infisical >/dev/null 2>&1; then
    echo "Missing WF_TEMPLATE_REVIEW_HUB_TOKEN and infisical CLI is not available." >&2
    exit 69
  fi

  token="$(
    infisical secrets get "$secret_key" \
      --plain \
      --silent \
      --env="${INFISICAL_ENV:-prod}" \
      --path="${WF_TEMPLATE_REVIEW_HUB_SECRET_PATH:-/mcp-hub/hubs}" \
      --include-imports=true
  )"
fi

if [[ -z "$token" ]]; then
  echo "Resolved empty token for $reviewer ($secret_key)." >&2
  exit 69
fi

AUTH_HEADER="Bearer $token" node -e 'console.log(JSON.stringify({ Authorization: process.env.AUTH_HEADER }))'
