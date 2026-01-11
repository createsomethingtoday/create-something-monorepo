#!/bin/bash
# CREATE SOMETHING Subtractive Triad Review Agent
# Runs weekly via launchd to audit codebase for DRY/Rams/Heidegger alignment
#
# Install: launchctl load ~/Library/LaunchAgents/io.createsomething.review.plist
# Manual:  ./scripts/run-review.sh [target_path]

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

echo "=== CREATE SOMETHING Subtractive Triad Review ==="
echo "Time: $(date -Iseconds)"
echo "Working directory: $(pwd)"
echo ""

# Optional: specific target path as argument
TARGET_PATH="${1:-}"

# Activate virtual environment if it exists
if [ -f "$SDK_DIR/.venv/bin/activate" ]; then
    source "$SDK_DIR/.venv/bin/activate"
fi

# Run the review agent
python3 -c "
import asyncio
from agents.review_agent import create_review_agent

async def run():
    target = '${TARGET_PATH}' if '${TARGET_PATH}' else None

    agent = create_review_agent(
        target_path=target,
        review_type='full',
        create_issues=True
    )

    print('Starting Subtractive Triad review...')
    print('Checks: DRY (duplication) → Rams (excess) → Heidegger (disconnection)')
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
echo "Review complete: $(date -Iseconds)"
echo "Check findings: bd list --label review-finding --status open"
