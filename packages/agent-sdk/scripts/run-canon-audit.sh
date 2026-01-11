#!/bin/bash
# CREATE SOMETHING Daily Canon Audit
# Checks CSS/styling for Canon compliance
# Runs daily to catch design drift early
#
# Install: launchctl load ~/Library/LaunchAgents/io.createsomething.canon-audit.plist
# Manual:  ./scripts/run-canon-audit.sh [target_path]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SDK_DIR="$(dirname "$SCRIPT_DIR")"
MONOREPO_DIR="$(dirname "$(dirname "$SDK_DIR")")"

cd "$SDK_DIR"

# Set PYTHONPATH to include both src and root for imports
export PYTHONPATH="$SDK_DIR/src:$SDK_DIR:$PYTHONPATH"

# Load API credentials if available
if [ -f "$SDK_DIR/.env" ]; then
    export $(grep -v '^#' "$SDK_DIR/.env" | xargs)
elif [ -f "$HOME/.config/createsomething/credentials" ]; then
    export $(grep -v '^#' "$HOME/.config/createsomething/credentials" | xargs)
fi

echo "=== CREATE SOMETHING Daily Canon Audit ==="
echo "Time: $(date -Iseconds)"
echo "Working directory: $(pwd)"
echo ""

# Default: audit all packages in priority order
# Can override with specific path
TARGET_PATH="${1:-$MONOREPO_DIR/packages}"

# Activate virtual environment if it exists
if [ -f "$SDK_DIR/.venv/bin/activate" ]; then
    source "$SDK_DIR/.venv/bin/activate"
fi

# Run the canon audit agent
python3 -c "
import asyncio
from agents.review_agent import create_canon_audit_agent

async def run():
    target = '${TARGET_PATH}'

    agent = create_canon_audit_agent(target_path=target)

    print(f'Canon Audit starting...')
    print(f'Target: {target}')
    print('Checking: Colors, typography, spacing, motion, borders')
    print('')

    result = await agent.run()

    print('')
    print('=' * 60)
    print(f'Success: {result.success}')
    print(f'Cost: \${result.cost_usd:.4f}')
    print(f'Iterations: {result.iterations}')
    print('=' * 60)

    if not result.success:
        print(f'Error: {result.output}')
        return 1
    return 0

exit(asyncio.run(run()))
" 2>&1

echo ""
echo "Canon audit complete: $(date -Iseconds)"
echo "Check findings: bd list --label canon-violation --status open"
