#!/bin/bash
# CREATE SOMETHING DRY Check (Duplication Analysis)
# Analyzes codebase for code duplication patterns
# Runs 2x/week (Tuesday, Friday) for systematic cleanup
#
# Install: launchctl load ~/Library/LaunchAgents/io.createsomething.dry-check.plist
# Manual:  ./scripts/run-dry-check.sh [paths...]

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

echo "=== CREATE SOMETHING DRY Check (Duplication Analysis) ==="
echo "Time: $(date -Iseconds)"
echo "Working directory: $(pwd)"
echo ""

# Default paths to analyze (high-value targets for DRY)
if [ $# -eq 0 ]; then
    TARGET_PATHS=(
        "$MONOREPO_DIR/packages/components/src/lib"
        "$MONOREPO_DIR/packages/space/src/lib"
        "$MONOREPO_DIR/packages/io/src/lib"
        "$MONOREPO_DIR/packages/agency/src/lib"
    )
else
    TARGET_PATHS=("$@")
fi

# Activate virtual environment if it exists
if [ -f "$SDK_DIR/.venv/bin/activate" ]; then
    source "$SDK_DIR/.venv/bin/activate"
fi

# Convert paths array to Python list
PATHS_PYTHON=$(printf "'%s', " "${TARGET_PATHS[@]}")
PATHS_PYTHON="[${PATHS_PYTHON%, }]"

# Run the DRY analysis agent
python3 -c "
import asyncio
from agents.review_agent import create_dry_analysis_agent

async def run():
    target_paths = ${PATHS_PYTHON}

    # Filter to only existing paths
    import os
    existing_paths = [p for p in target_paths if os.path.exists(p)]

    if not existing_paths:
        print('No target paths found. Skipping DRY check.')
        return 0

    agent = create_dry_analysis_agent(target_paths=existing_paths)

    print(f'DRY Analysis starting...')
    print(f'Analyzing {len(existing_paths)} path(s) for duplication:')
    for p in existing_paths:
        print(f'  - {p}')
    print('')
    print('Detection patterns:')
    print('  - Literal duplication (3+ similar lines)')
    print('  - Structural duplication (same logic, different names)')
    print('  - Type duplication (same interface in multiple places)')
    print('  - Config duplication (same settings repeated)')
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
echo "DRY check complete: $(date -Iseconds)"
echo "Check findings: bd list --label dry-violation --status open"
