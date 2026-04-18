#!/usr/bin/env bash
#
# Deploy packages/webflow-dashboard to Cloudflare Pages.
#
# Why this script exists:
#   Wrangler only reads bindings from wrangler.jsonc when its CWD is the
#   directory that contains the config file. `wrangler pages deploy` does
#   NOT support --config. A deploy started from any other directory will
#   silently drop the R2 UPLOADS binding, and the live app responds with
#   500 "Storage not configured" on every thumbnail/image upload.
#
# Canonical invocation (from repo root or anywhere):
#   packages/webflow-dashboard/scripts/deploy.sh           # production
#   packages/webflow-dashboard/scripts/deploy.sh preview   # preview branch
#
# See: packages/webflow-dashboard/DEPLOYMENT_GUIDE.md

set -euo pipefail

BRANCH="${1:-main}"
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-9645bd52e640b8a4f40a3a55ff1dd75a}"
PROJECT_NAME="webflow-dashboard"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${PACKAGE_DIR}/../.." && pwd)"

BUILD_OUTPUT="${PACKAGE_DIR}/.svelte-kit/cloudflare"
WRANGLER_CONFIG="${PACKAGE_DIR}/wrangler.jsonc"

if [ ! -f "${WRANGLER_CONFIG}" ]; then
  echo "ERROR: wrangler.jsonc not found at ${WRANGLER_CONFIG}" >&2
  exit 1
fi

echo "→ Building @create-something/webflow-dashboard"
( cd "${REPO_ROOT}" && pnpm --filter=@create-something/webflow-dashboard build )

if [ ! -d "${BUILD_OUTPUT}" ]; then
  echo "ERROR: build output missing at ${BUILD_OUTPUT}" >&2
  exit 1
fi

echo "→ Deploying to Cloudflare Pages (project=${PROJECT_NAME}, branch=${BRANCH})"
echo "   CWD pinned to ${PACKAGE_DIR} so wrangler.jsonc bindings attach"

# The --cwd flag makes wrangler discover wrangler.jsonc (and its r2_buckets,
# kv_namespaces, d1_databases bindings) from PACKAGE_DIR regardless of where
# this script is invoked from.
CLOUDFLARE_ACCOUNT_ID="${ACCOUNT_ID}" pnpm --filter=@create-something/webflow-dashboard-cloud exec \
  wrangler --cwd "${PACKAGE_DIR}" pages deploy "${BUILD_OUTPUT}" \
    --project-name="${PROJECT_NAME}" \
    --branch="${BRANCH}" \
    --commit-dirty=true

echo
echo "→ Verifying production bindings"
PROBE_URL="https://webflow-dashboard.pages.dev/api/uploads/probe-$(date +%s)"
HTTP_CODE="$(curl -s -o /dev/null -w "%{http_code}" "${PROBE_URL}")"

if [ "${HTTP_CODE}" = "404" ]; then
  echo "   ✓ R2 UPLOADS binding attached (probe returned 404 File not found)"
elif [ "${HTTP_CODE}" = "500" ]; then
  echo "   ✗ R2 UPLOADS binding MISSING (probe returned 500 Storage not configured)" >&2
  echo "     Check Cloudflare Dashboard → Pages → webflow-dashboard → Settings → Functions → Bindings" >&2
  exit 1
else
  echo "   ? Unexpected status ${HTTP_CODE} from ${PROBE_URL}"
fi
