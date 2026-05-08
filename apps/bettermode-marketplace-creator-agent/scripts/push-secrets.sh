#!/usr/bin/env bash
# Push Worker secrets for the Marketplace Creator Agent from environment
# variables (typically injected by `infisical run --env=dev`).
#
# Usage:
#   pnpm --filter @create-something/bettermode-marketplace-creator-agent secrets:push
#
# Or, equivalently:
#   infisical run --env=dev -- bash apps/bettermode-marketplace-creator-agent/scripts/push-secrets.sh
#
# The script never echoes the secret values.

set -euo pipefail

REQUIRED_VARS=(
  "WEBFLOW_BETTERMODE_CLIENT_ID:BETTERMODE_CLIENT_ID"
  "WEBFLOW_BETTERMODE_CLIENT_SECRET:BETTERMODE_CLIENT_SECRET"
  "WEBFLOW_BETTERMODE_SIGNING_SECRET:BETTERMODE_SIGNING_SECRET"
  "WEBFLOW_OPENAI_API_KEY:OPENAI_API_KEY"
)

OPTIONAL_VARS=(
  "AIRTABLE_API_KEY:AIRTABLE_API_KEY"
)

cd "$(dirname "$0")/.."

push_secret() {
  local source_var="$1"
  local target_name="$2"
  local value
  value="${!source_var:-}"
  if [[ -z "$value" ]]; then
    return 1
  fi
  printf '%s' "$value" | npx wrangler secret put "$target_name"
}

missing=()
for entry in "${REQUIRED_VARS[@]}"; do
  source_var="${entry%%:*}"
  target_name="${entry##*:}"
  if ! push_secret "$source_var" "$target_name"; then
    missing+=("$source_var")
  fi
done

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "Missing required env vars: ${missing[*]}" >&2
  echo "Run via: infisical run --env=dev -- bash scripts/push-secrets.sh" >&2
  exit 1
fi

for entry in "${OPTIONAL_VARS[@]}"; do
  source_var="${entry%%:*}"
  target_name="${entry##*:}"
  push_secret "$source_var" "$target_name" || echo "skipping optional $source_var" >&2
done

echo "secrets pushed."
