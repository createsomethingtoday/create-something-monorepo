#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HUB_DIR="$ROOT_DIR/packages/cs-mcp-hub-remote"

WORKERS=(
  "cs-hub-lainy"
  "cs-hub-danny"
  "cs-hub-august"
  "cs-hub-filip"
  "cs-hub-leah"
  "cs-hub-mj"
  "cs-mcp-hub-remote"
)

REQUIRED_SECRETS=(
  "HUB_API_TOKEN"
  "BRAINTRUST_API_KEY"
  "BRAINTRUST_PROJECT_ID"
)

health_url_for_worker() {
  case "$1" in
    "cs-hub-lainy") echo "https://lainy.mcp.createsomething.agency/health" ;;
    "cs-hub-danny") echo "https://danny.mcp.createsomething.agency/health" ;;
    "cs-hub-august") echo "https://august.mcp.createsomething.agency/health" ;;
    "cs-hub-filip") echo "https://fillip.mcp.createsomething.agency/health" ;;
    "cs-hub-leah") echo "https://leah.mcp.createsomething.agency/health" ;;
    "cs-hub-mj") echo "https://mj.mcp.createsomething.agency/health" ;;
    "cs-mcp-hub-remote") echo "https://cs-mcp-hub-remote.createsomething.workers.dev/health" ;;
    *)
      return 1
      ;;
  esac
}

failures=0
cd "$HUB_DIR"

echo "Checking required secrets on each worker..."
for worker in "${WORKERS[@]}"; do
  echo "===== SECRETS ${worker} ====="
  secrets_json="$(pnpm exec wrangler secret list --name "$worker")"
  for secret_name in "${REQUIRED_SECRETS[@]}"; do
    if echo "$secrets_json" | jq -e --arg name "$secret_name" '.[] | select(.name == $name)' >/dev/null; then
      echo "ok: ${secret_name}"
    else
      echo "missing: ${secret_name}"
      failures=1
    fi
  done
  echo
done

echo "Checking health endpoints..."
for worker in "${WORKERS[@]}"; do
  health_url="$(health_url_for_worker "$worker")"
  echo "===== HEALTH ${worker} ====="
  health_json="$(curl -fsS "$health_url")"
  built_at="$(echo "$health_json" | jq -r '.built_at // "unknown"')"
  auth_required="$(echo "$health_json" | jq -r '.auth_required // "false"')"
  telemetry_db="$(echo "$health_json" | jq -r '.policy.quota.telemetryDbConfigured // "false"')"
  echo "built_at=${built_at}"
  echo "auth_required=${auth_required}"
  echo "telemetryDbConfigured=${telemetry_db}"
  if [[ "$auth_required" != "true" || "$telemetry_db" != "true" ]]; then
    echo "health check failed for ${worker}"
    failures=1
  fi
  echo
done

if [[ "$failures" -ne 0 ]]; then
  echo "Hub fleet verification failed."
  exit 1
fi

echo "Hub fleet verification passed."
