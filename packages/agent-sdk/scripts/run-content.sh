#!/bin/bash
# CREATE SOMETHING Content Agent
# Runs 4x/week via launchd to generate social content
#
# Install: launchctl load ~/Library/LaunchAgents/io.createsomething.content.plist
# Manual:  ./scripts/run-content.sh

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

echo "=== CREATE SOMETHING Content Agent ==="
echo "Time: $(date -Iseconds)"
echo "Working directory: $(pwd)"
echo ""

# Activate virtual environment if it exists
if [ -f "$SDK_DIR/.venv/bin/activate" ]; then
    source "$SDK_DIR/.venv/bin/activate"
fi

# Run the content agent
python3 -c "
import asyncio
from agents.content_agent import create_content_agent

async def run():
    # Generate social post based on latest work
    task = '''
Generate a LinkedIn post about recent CREATE SOMETHING work.

Steps:
1. Check recent Beads activity: bd list --status closed --since 7d
2. Identify compelling outcome or insight
3. Write post following Voice Canon:
   - Lead with outcome or metric
   - Specificity over generality
   - Under 1500 chars
   - Include methodology insight
4. Save draft to packages/agency/content/social/draft-{date}.md

Do NOT schedule or post - just create the draft for human review.
'''

    agent = create_content_agent(
        task=task,
        content_type='social',
        property='agency'
    )
    print('Generating content draft...')
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
echo "Content generation complete: $(date -Iseconds)"
