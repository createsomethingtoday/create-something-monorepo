#!/bin/bash
# CREATE SOMETHING Monitor Agent
# Runs hourly via launchd to check infrastructure health
#
# Install: launchctl load ~/Library/LaunchAgents/io.createsomething.monitor.plist
# Manual:  ./scripts/run-monitor.sh

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

echo "=== CREATE SOMETHING Monitor Agent ==="
echo "Time: $(date -Iseconds)"
echo "Working directory: $(pwd)"
echo ""

# Activate virtual environment if it exists
if [ -f "$SDK_DIR/.venv/bin/activate" ]; then
    source "$SDK_DIR/.venv/bin/activate"
fi

# Run the monitor agent
python3 -c "
import asyncio
from agents.monitor_agent import create_monitor_agent

async def run():
    agent = create_monitor_agent(check_type='full')
    print('Starting health check...')
    result = await agent.run()
    print(f'Success: {result.success}')
    print(f'Cost: \${result.cost_usd:.4f}')
    if not result.success:
        print(f'Error: {result.output}')
        return 1
    return 0

exit(asyncio.run(run()))
" 2>&1

echo ""
echo "Monitor check complete: $(date -Iseconds)"
