#!/usr/bin/env bash
# deploy-team.sh — Deploy per-user Gmail MCP instances
#
# Usage:
#   ./scripts/deploy-team.sh                  # Deploy all environments
#   ./scripts/deploy-team.sh fillip           # Deploy one environment
#   ./scripts/deploy-team.sh --secrets fillip # Set secrets then deploy
#   ./scripts/deploy-team.sh --secrets-only fillip # Set secrets without deploying
#
# Adding a new team member:
#   1. Add an entry to TEAM array below
#   2. Add env section to wrangler.toml (use gen-env helper below)
#   3. Add redirect URI to Google OAuth console
#   4. Run: ./scripts/deploy-team.sh --secrets <name>

set -euo pipefail
cd "$(dirname "$0")/.."

# ─── Team Configuration (single source of truth) ─────────────
# Format: "env_name:email"
TEAM=(
  "fillip:fillip@halfdozen.co"
  "leah:leah@halfdozen.co"
)

# Secrets shared across all instances (same Google OAuth app + Notion workspace)
SHARED_SECRETS=(
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  NOTION_API_KEY
  NOTION_INTERACTIONS_DB_ID
  NOTION_CONTACTS_DB_ID
)

# ─── Functions ────────────────────────────────────────────────

deploy_env() {
  local env_name="$1"
  echo "→ Deploying --env $env_name..."
  wrangler deploy --env "$env_name"
  echo "  ✓ Deployed"
}

set_secrets() {
  local env_name="$1"
  echo "→ Setting shared secrets for --env $env_name..."
  echo "  (Each prompt reads from the base deployment's secrets)"
  for secret in "${SHARED_SECRETS[@]}"; do
    echo "  Setting $secret..."
    wrangler secret put "$secret" --env "$env_name"
  done
  echo "  ✓ Secrets set"
}

copy_secrets_from_base() {
  local env_name="$1"
  echo "→ Bulk-copying secrets to --env $env_name..."
  echo "  Paste JSON like: {\"GOOGLE_CLIENT_ID\":\"...\", ...}"
  echo "  Then press Ctrl+D"
  wrangler secret bulk --env "$env_name"
  echo "  ✓ Secrets copied"
}

deploy_base() {
  echo "→ Deploying base (Danny)..."
  wrangler deploy --env=""
  echo "  ✓ Deployed base"
}

# Print wrangler.toml env section for a new team member
gen_env() {
  local env_name="$1"
  local email="$2"
  local domain="${env_name}-gmail.mcp.workway.co"
  cat <<EOF

# --- ${env_name^} ---
[env.${env_name}]
name = "halfdozen-gmail-${env_name}"
routes = [{ pattern = "${domain}", custom_domain = true }]

[env.${env_name}.vars]
AUTHORIZED_EMAIL = "${email}"
TELEMETRY_SERVER_NAME = "halfdozen-gmail-sync-${env_name}"

[[env.${env_name}.durable_objects.bindings]]
name = "MCP_OBJECT"
class_name = "GmailSyncMCPv2"

[[env.${env_name}.kv_namespaces]]
binding = "GMAIL_TOKENS"
id = "772f9433b9674d54935ea39ccd1288f1"

[[env.${env_name}.d1_databases]]
binding = "FEEDBACK_DB"
database_name = "halfdozen-feedback"
database_id = "4eb35a0f-6ee2-4d0c-8c0a-9a2ab4049b97"

[[env.${env_name}.migrations]]
tag = "v1"
new_classes = ["GmailSyncMCP"]

[[env.${env_name}.migrations]]
tag = "v2"
new_sqlite_classes = ["GmailSyncMCPv2"]
EOF
}

# ─── Main ─────────────────────────────────────────────────────

ACTION="deploy"
TARGET=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --secrets)      ACTION="secrets-then-deploy"; shift ;;
    --secrets-only) ACTION="secrets-only"; shift ;;
    --gen-env)      ACTION="gen-env"; shift ;;
    --all)          TARGET="all"; shift ;;
    *)              TARGET="$1"; shift ;;
  esac
done

# Filter team to target
if [[ -n "$TARGET" && "$TARGET" != "all" ]]; then
  FILTERED=()
  for entry in "${TEAM[@]}"; do
    env_name="${entry%%:*}"
    if [[ "$env_name" == "$TARGET" ]]; then
      FILTERED+=("$entry")
    fi
  done
  if [[ ${#FILTERED[@]} -eq 0 ]]; then
    echo "Error: Unknown environment '$TARGET'"
    echo "Available: ${TEAM[*]%%:*}"
    exit 1
  fi
  TEAM=("${FILTERED[@]}")
fi

case "$ACTION" in
  deploy)
    for entry in "${TEAM[@]}"; do
      deploy_env "${entry%%:*}"
    done
    ;;
  secrets-then-deploy)
    for entry in "${TEAM[@]}"; do
      env_name="${entry%%:*}"
      set_secrets "$env_name"
      deploy_env "$env_name"
    done
    ;;
  secrets-only)
    for entry in "${TEAM[@]}"; do
      set_secrets "${entry%%:*}"
    done
    ;;
  gen-env)
    for entry in "${TEAM[@]}"; do
      env_name="${entry%%:*}"
      email="${entry#*:}"
      gen_env "$env_name" "$email"
    done
    ;;
esac

echo ""
echo "Done. Team instances:"
echo "  Danny:  https://gmail.mcp.workway.co"
for entry in "${TEAM[@]}"; do
  env_name="${entry%%:*}"
  email="${entry#*:}"
  echo "  ${env_name^}:  https://${env_name}-gmail.mcp.workway.co  (${email})"
done
