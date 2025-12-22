#!/bin/bash
# cleanup.sh - Stop harness environment
# Companion to init.sh
# From: .claude/rules/harness-patterns.md

if [ -f ".harness-dev-pid" ]; then
  PID=$(cat .harness-dev-pid)
  if kill -0 "$PID" 2>/dev/null; then
    echo "→ Stopping dev server (PID: $PID)..."
    kill "$PID"
    rm .harness-dev-pid
    echo "✓ Server stopped"
  else
    echo "→ Server already stopped"
    rm .harness-dev-pid
  fi
else
  echo "→ No active harness server"
fi
