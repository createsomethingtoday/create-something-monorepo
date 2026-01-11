#!/bin/bash
# CREATE SOMETHING Resolution Agent
# Fixes issues found by the Review Agent
# Runs after review sessions to automatically resolve findings
#
# Install: launchctl load ~/Library/LaunchAgents/io.createsomething.resolution.plist
# Manual:  ./scripts/run-resolution.sh [max_fixes] [fix_types]

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

echo "=== CREATE SOMETHING Resolution Agent ==="
echo "Time: $(date -Iseconds)"
echo "Working directory: $(pwd)"
echo ""

# Optional: max fixes as argument (default: 5)
MAX_FIXES="${1:-5}"

# Optional: fix types filter (dry, rams, heidegger)
FIX_TYPES="${2:-}"

# Activate virtual environment if it exists
if [ -f "$SDK_DIR/.venv/bin/activate" ]; then
    source "$SDK_DIR/.venv/bin/activate"
fi

# Run the resolution agent
python3 -c "
import asyncio
from agents.resolution_agent import create_resolution_agent

async def run():
    max_fixes = ${MAX_FIXES}
    fix_types_str = '${FIX_TYPES}'
    fix_types = fix_types_str.split(',') if fix_types_str else None

    agent = create_resolution_agent(
        max_fixes=max_fixes,
        fix_types=fix_types,
        auto_commit=True
    )

    print(f'Resolution Agent starting...')
    print(f'Max fixes this session: {max_fixes}')
    if fix_types:
        print(f'Fix types filter: {fix_types}')
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
echo "Resolution complete: $(date -Iseconds)"
echo "Check remaining issues: bd list --label review-finding --status open"
