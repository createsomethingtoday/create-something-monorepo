#!/bin/bash
# CREATE SOMETHING Coordinator Agent
# Runs daily via launchd to surface and route work
#
# Install: launchctl load ~/Library/LaunchAgents/io.createsomething.coordinator.plist
# Manual:  ./scripts/run-coordinator.sh

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

echo "=== CREATE SOMETHING Coordinator Agent ==="
echo "Time: $(date -Iseconds)"
echo "Working directory: $(pwd)"
echo ""

# Activate virtual environment if it exists
if [ -f "$SDK_DIR/.venv/bin/activate" ]; then
    source "$SDK_DIR/.venv/bin/activate"
fi

# Run the coordinator agent
python3 -c "
import asyncio
from agents.coordinator_agent import create_coordinator_agent

async def run():
    agent = create_coordinator_agent(
        session_type='autonomous',
        daily_budget=10.0
    )
    print('Starting daily coordination...')
    result = await agent.run()
    print(f'Success: {result.success}')
    print(f'Cost: \${result.cost_usd:.4f}')
    print(f'Iterations: {result.iterations}')
    if not result.success:
        print(f'Error: {result.output}')
        return 1
    return 0

exit(asyncio.run(run()))
" 2>&1

echo ""
echo "Coordination complete: $(date -Iseconds)"
