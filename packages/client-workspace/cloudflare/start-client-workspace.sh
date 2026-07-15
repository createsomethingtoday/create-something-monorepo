#!/bin/sh
set -eu

mkdir -p /workspace/projects /workspace/state

if [ ! -f /workspace/projects/demo-frontend/package.json ]; then
  cp -R /app/seed/demo-frontend /workspace/projects/demo-frontend
fi

exec node /app/server/index.js
