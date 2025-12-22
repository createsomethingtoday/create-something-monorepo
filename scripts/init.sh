#!/bin/bash
# init.sh - Harness environment initialization
# Created by: harness init session
# Tracked in: Beads setup issue
# From: .claude/rules/harness-patterns.md

set -e  # Exit on error

# Configuration
PACKAGE="${1:-space}"           # Default package
PORT="${2:-5173}"               # Default port
TIMEOUT="${3:-30}"              # Startup timeout

echo "→ Initializing harness environment..."

# 1. Check dependencies
if ! command -v pnpm &> /dev/null; then
  echo "✗ pnpm not found"
  exit 1
fi

# 2. Install if needed
if [ ! -d "node_modules" ]; then
  echo "→ Installing dependencies..."
  pnpm install
fi

# 3. Generate types (if applicable)
if [ -f "packages/$PACKAGE/wrangler.jsonc" ] || [ -f "packages/$PACKAGE/wrangler.toml" ]; then
  echo "→ Generating Cloudflare types..."
  pnpm --filter="$PACKAGE" exec wrangler types 2>/dev/null || true
fi

# 4. Start dev server in background
echo "→ Starting dev server for $PACKAGE..."
pnpm dev --filter="$PACKAGE" &
DEV_PID=$!

# 5. Wait for server
echo "→ Waiting for server (max ${TIMEOUT}s)..."
for i in $(seq 1 $TIMEOUT); do
  if curl -s "http://localhost:$PORT" > /dev/null 2>&1; then
    echo "✓ Server ready on port $PORT (PID: $DEV_PID)"
    echo "$DEV_PID" > .harness-dev-pid
    exit 0
  fi
  sleep 1
done

echo "✗ Server failed to start within ${TIMEOUT}s"
kill $DEV_PID 2>/dev/null || true
exit 1
