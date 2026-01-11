#!/bin/bash
#
# Ralph: Autonomous Feature Development Loop
#
# Usage: ./ralph.sh [--max-iterations N] [--prd-file path/to/prd.json]
#
# This script implements the Ralph Wiggum pattern for overnight autonomous development.
# Each iteration spawns a fresh Claude Code instance that:
#   1. Picks an incomplete user story from prd.json
#   2. Implements it with clear acceptance criteria
#   3. Commits the change
#   4. Updates prd.json (marks story as complete)
#   5. Logs progress to progress.txt
#
# Prerequisites:
#   - Claude Code CLI installed (claude)
#   - Git repository initialized
#   - prd.json file with user stories
#

set -e

# Configuration
MAX_ITERATIONS=${MAX_ITERATIONS:-10}
PRD_FILE="prd.json"
PROGRESS_FILE="progress.txt"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARCHIVE_DIR=".ralph-archive"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --max-iterations)
            MAX_ITERATIONS="$2"
            shift 2
            ;;
        --prd-file)
            PRD_FILE="$2"
            shift 2
            ;;
        --help)
            echo "Ralph: Autonomous Feature Development Loop"
            echo ""
            echo "Usage: ./ralph.sh [--max-iterations N] [--prd-file path/to/prd.json]"
            echo ""
            echo "Options:"
            echo "  --max-iterations N   Maximum iterations (default: 10)"
            echo "  --prd-file PATH      Path to PRD JSON file (default: prd.json)"
            echo "  --help               Show this help"
            echo ""
            echo "PRD.json Format:"
            echo '  {'
            echo '    "title": "Feature Name",'
            echo '    "stories": ['
            echo '      {'
            echo '        "id": "story-1",'
            echo '        "title": "Add login form",'
            echo '        "acceptance": ["Form renders", "Validates email"],'
            echo '        "passes": false'
            echo '      }'
            echo '    ]'
            echo '  }'
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown argument: $1${NC}"
            exit 1
            ;;
    esac
done

# Check prerequisites
if ! command -v claude &> /dev/null; then
    echo -e "${RED}Error: Claude Code CLI not found. Install with: npm install -g @anthropic-ai/claude-code${NC}"
    exit 1
fi

if [ ! -f "$PRD_FILE" ]; then
    echo -e "${RED}Error: PRD file not found: $PRD_FILE${NC}"
    echo "Create a prd.json file or specify with --prd-file"
    exit 1
fi

# Initialize progress file if needed
if [ ! -f "$PROGRESS_FILE" ]; then
    echo "# Ralph Progress Log" > "$PROGRESS_FILE"
    echo "Started: $(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "$PROGRESS_FILE"
    echo "" >> "$PROGRESS_FILE"
fi

# System prompt for each iteration
SYSTEM_PROMPT='You are an autonomous coding agent working on this project.

## Your Task

1. Read the PRD file (prd.json) and find a user story where "passes": false
2. Pick ONE story to implement (usually the first incomplete one)
3. Implement it according to the acceptance criteria
4. Run any relevant tests to verify your implementation
5. Commit your changes with a clear message: "feat: <story title>"
6. Update prd.json - set "passes": true for the completed story
7. Append to progress.txt:
   - Story ID and title
   - What was implemented
   - Files changed
   - Any learnings for future iterations

## Important Rules

- Complete ONE story per iteration, then stop
- Each story must be atomic and independently verifiable
- If you cannot complete a story, document why in progress.txt
- Always commit before updating prd.json
- If all stories pass, output: ALL_STORIES_COMPLETE

## Acceptance Criteria

For a story to pass, ALL acceptance criteria must be satisfied.
You can verify by:
- Running tests (if applicable)
- Manual verification (checking the code does what it should)
- Type checking (tsc --noEmit)

## Files

- prd.json: User stories with acceptance criteria
- progress.txt: Log of completed work
- CLAUDE.md: Project context (read this first)

Now read prd.json and implement the next incomplete story.'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              Ralph: Autonomous Development Loop            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "PRD File: ${GREEN}$PRD_FILE${NC}"
echo -e "Max Iterations: ${GREEN}$MAX_ITERATIONS${NC}"
echo -e "Progress: ${GREEN}$PROGRESS_FILE${NC}"
echo ""

# Create archive directory
mkdir -p "$ARCHIVE_DIR"

# Main loop
iteration=1
while [ $iteration -le $MAX_ITERATIONS ]; do
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Iteration $iteration of $MAX_ITERATIONS${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Check if all stories are complete
    incomplete_count=$(jq '[.stories[] | select(.passes == false)] | length' "$PRD_FILE" 2>/dev/null || echo "error")

    if [ "$incomplete_count" == "error" ]; then
        echo -e "${RED}Error reading prd.json${NC}"
        exit 1
    fi

    if [ "$incomplete_count" -eq 0 ]; then
        echo -e "${GREEN}All stories complete!${NC}"
        echo "" >> "$PROGRESS_FILE"
        echo "## Completed" >> "$PROGRESS_FILE"
        echo "All stories completed at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "$PROGRESS_FILE"
        echo "Total iterations: $((iteration - 1))" >> "$PROGRESS_FILE"
        break
    fi

    echo -e "Incomplete stories: ${YELLOW}$incomplete_count${NC}"
    echo ""

    # Log iteration start
    echo "" >> "$PROGRESS_FILE"
    echo "---" >> "$PROGRESS_FILE"
    echo "## Iteration $iteration" >> "$PROGRESS_FILE"
    echo "Started: $(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "$PROGRESS_FILE"

    # Run Claude Code with the system prompt
    # The --print flag outputs to stdout, --dangerously-skip-permissions allows autonomous operation
    echo -e "${BLUE}Starting Claude Code...${NC}"

    # Create a temporary file for the prompt
    PROMPT_FILE=$(mktemp)
    echo "$SYSTEM_PROMPT" > "$PROMPT_FILE"

    # Run Claude Code
    # Using --print to get output, piping to tee to save to archive
    THREAD_LOG="$ARCHIVE_DIR/iteration-$iteration-$(date +%Y%m%d-%H%M%S).log"

    if claude --print --dangerously-skip-permissions < "$PROMPT_FILE" 2>&1 | tee "$THREAD_LOG"; then
        echo -e "${GREEN}Iteration $iteration completed${NC}"

        # Check if the output indicates all stories complete
        if grep -q "ALL_STORIES_COMPLETE" "$THREAD_LOG"; then
            echo -e "${GREEN}All stories complete!${NC}"
            rm "$PROMPT_FILE"
            break
        fi
    else
        echo -e "${RED}Iteration $iteration failed${NC}"
        echo "Failed at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "$PROGRESS_FILE"
    fi

    rm "$PROMPT_FILE"

    # Log iteration end
    echo "Completed: $(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "$PROGRESS_FILE"
    echo "Thread log: $THREAD_LOG" >> "$PROGRESS_FILE"

    echo ""
    iteration=$((iteration + 1))

    # Small delay between iterations
    sleep 2
done

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Ralph Complete                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Total iterations: ${GREEN}$((iteration - 1))${NC}"
echo -e "Progress log: ${GREEN}$PROGRESS_FILE${NC}"
echo -e "Thread archives: ${GREEN}$ARCHIVE_DIR/${NC}"
echo ""

# Archive the completed PRD
if [ "$incomplete_count" -eq 0 ] || [ $iteration -gt $MAX_ITERATIONS ]; then
    archive_name="$ARCHIVE_DIR/prd-$(date +%Y%m%d-%H%M%S).json"
    cp "$PRD_FILE" "$archive_name"
    echo -e "PRD archived to: ${GREEN}$archive_name${NC}"
fi
