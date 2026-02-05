#!/bin/bash
# Encode session-context.json for GitHub Actions secret
#
# Usage: ./encode-session.sh
# Copy the output and paste into GitHub secret: ZOOM_SESSION_CONTEXT

if [ ! -f "session-context.json" ]; then
  echo "Error: session-context.json not found"
  echo "Run 'npx tsx watch-session.ts' first to capture session context"
  exit 1
fi

echo "=== Base64 encoded session context ==="
echo ""
base64 -i session-context.json
echo ""
echo "=== Copy the above output to GitHub secret: ZOOM_SESSION_CONTEXT ==="
