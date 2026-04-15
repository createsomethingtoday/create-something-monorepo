#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
CLOUDFLARE_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
PACKAGE_DIR="$(cd -- "${CLOUDFLARE_DIR}/.." && pwd)"
RUNTIME_DIR="${CLOUDFLARE_DIR}/runtime"

echo "Preparing Cloudflare runtime in ${RUNTIME_DIR}"
rm -rf "${RUNTIME_DIR}"
mkdir -p "${RUNTIME_DIR}/backend" "${RUNTIME_DIR}/public"

cp "${PACKAGE_DIR}/backend/server.py" "${RUNTIME_DIR}/backend/server.py"
cp "${PACKAGE_DIR}/backend/analyze.py" "${RUNTIME_DIR}/backend/analyze.py"
cp "${PACKAGE_DIR}/backend/requirements.txt" "${RUNTIME_DIR}/backend/requirements.txt"
cp "${PACKAGE_DIR}/public/index.html" "${RUNTIME_DIR}/public/index.html"

if [[ -d "${PACKAGE_DIR}/backend/static" ]]; then
  cp -R "${PACKAGE_DIR}/backend/static" "${RUNTIME_DIR}/backend/static"
fi

if [[ -f "${PACKAGE_DIR}/userscript/template-analyzer.user.js" ]]; then
  mkdir -p "${RUNTIME_DIR}/userscript"
  cp "${PACKAGE_DIR}/userscript/template-analyzer.user.js" "${RUNTIME_DIR}/userscript/template-analyzer.user.js"
fi

mkdir -p "${RUNTIME_DIR}/backend/output"
echo "Runtime prepared."
