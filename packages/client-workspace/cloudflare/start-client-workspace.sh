#!/bin/sh
set -eu

mkdir -p /workspace/projects /workspace/state

if [ ! -f /workspace/projects/demo-frontend/package.json ]; then
  cp -R /app/seed/demo-frontend /workspace/projects/demo-frontend
fi

if [ -n "${OPENAI_API_KEY:-}" ]; then
  CODEX_HOME=/dev/shm/client-workspace-codex
  export CODEX_HOME
  rm -rf "$CODEX_HOME"
  install -d -m 700 "$CODEX_HOME"

  if ! printf '%s' "$OPENAI_API_KEY" | codex login --with-api-key >/dev/null 2>&1; then
    unset OPENAI_API_KEY
    rm -rf "$CODEX_HOME"
    echo 'Codex authentication bootstrap failed.' >&2
    exit 1
  fi

  unset OPENAI_API_KEY
  CLIENT_WORKSPACE_EPHEMERAL_CODEX_AUTH=1
  export CLIENT_WORKSPACE_EPHEMERAL_CODEX_AUTH
fi

exec node /app/server/index.js
