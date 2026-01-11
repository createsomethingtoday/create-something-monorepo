#!/bin/bash
# CREATE SOMETHING Paper/Experiment Generator
#
# Generates Canon-compliant Svelte pages from Beads issues.
# Uses intelligent routing: Gemini Flash for simple, Sonnet for complex.
#
# Usage:
#   ./scripts/run-paper.sh csm-xxx              # Generate from issue
#   ./scripts/run-paper.sh csm-xxx --dry-run    # Preview without writing
#   ./scripts/run-paper.sh csm-xxx --model opus # Force specific model
#
# Install: cd packages/agent-sdk && uv pip install -e ".[all]"

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SDK_DIR="$(dirname "$SCRIPT_DIR")"
MONOREPO_DIR="$(dirname "$(dirname "$SDK_DIR")")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
ISSUE_ID=""
DRY_RUN=false
FORCE_MODEL=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --model)
            FORCE_MODEL="$2"
            shift 2
            ;;
        -*)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
        *)
            ISSUE_ID="$1"
            shift
            ;;
    esac
done

if [ -z "$ISSUE_ID" ]; then
    echo -e "${RED}Error: Issue ID required${NC}"
    echo "Usage: ./scripts/run-paper.sh csm-xxx [--dry-run] [--model opus|sonnet|haiku|flash]"
    exit 1
fi

cd "$SDK_DIR"

# Set PYTHONPATH
export PYTHONPATH="$SDK_DIR/src:$SDK_DIR:$PYTHONPATH"

# Load API credentials
if [ -f "$SDK_DIR/.env" ]; then
    export $(grep -v '^#' "$SDK_DIR/.env" | xargs)
elif [ -f "$HOME/.config/createsomething/credentials" ]; then
    export $(grep -v '^#' "$HOME/.config/createsomething/credentials" | xargs)
fi

# Activate virtual environment if exists
if [ -f "$SDK_DIR/.venv/bin/activate" ]; then
    source "$SDK_DIR/.venv/bin/activate"
fi

echo -e "${BLUE}=== CREATE SOMETHING Paper/Experiment Generator ===${NC}"
echo -e "Time: $(date -Iseconds)"
echo -e "Issue: ${YELLOW}$ISSUE_ID${NC}"
echo -e "Dry run: $DRY_RUN"
[ -n "$FORCE_MODEL" ] && echo -e "Force model: $FORCE_MODEL"
echo ""

# Run the generator
python3 << PYTHON_SCRIPT
import asyncio
import json
import subprocess
import sys
from pathlib import Path

# Configuration
ISSUE_ID = "$ISSUE_ID"
DRY_RUN = "$DRY_RUN" == "true"
FORCE_MODEL = "$FORCE_MODEL" or None
MONOREPO = Path("$MONOREPO_DIR")

async def main():
    """Generate paper or experiment from Beads issue."""

    # 1. Read the Beads issue
    print(f"📋 Reading Beads issue {ISSUE_ID}...")
    result = subprocess.run(
        ["bd", "show", ISSUE_ID, "--json", "--no-db"],
        capture_output=True, text=True, cwd=MONOREPO
    )

    if result.returncode != 0:
        print(f"❌ Failed to read issue: {result.stderr}")
        return 1

    try:
        issue = json.loads(result.stdout)
    except json.JSONDecodeError:
        print(f"❌ Failed to parse issue JSON: {result.stdout}")
        return 1

    title = issue.get("title", "")
    description = issue.get("description", "")
    labels = issue.get("labels", [])

    print(f"   Title: {title}")
    print(f"   Labels: {', '.join(labels)}")

    # 2. Determine content type from labels/title
    content_type = "paper"  # default
    if "experiment" in labels or "experiment" in title.lower():
        content_type = "experiment"
    elif "paper" in labels or "paper" in title.lower():
        content_type = "paper"

    # 3. Generate slug from title
    slug = title.lower()
    # Remove common prefixes
    for prefix in ["paper:", "experiment:", "create", "add"]:
        slug = slug.replace(prefix, "")
    # Clean up
    slug = slug.strip()
    slug = "-".join(slug.split())[:50]  # Max 50 chars
    slug = "".join(c if c.isalnum() or c == "-" else "-" for c in slug)
    slug = "-".join(filter(None, slug.split("-")))  # Remove double dashes

    if not slug:
        slug = ISSUE_ID.replace("csm-", "")

    print(f"   Type: {content_type}")
    print(f"   Slug: {slug}")

    # 4. Determine output path
    if content_type == "experiment":
        output_dir = MONOREPO / "packages/io/src/routes/experiments" / slug
        route_path = f"/experiments/{slug}"
    else:
        output_dir = MONOREPO / "packages/io/src/routes/papers" / slug
        route_path = f"/papers/{slug}"

    print(f"   Output: {output_dir.relative_to(MONOREPO)}")

    if output_dir.exists():
        print(f"⚠️  Warning: Directory already exists")

    if DRY_RUN:
        print(f"\n🔍 Dry run - would generate {content_type} at {route_path}")
        return 0

    # 5. Import and configure the agent
    from create_something_agents import CreateSomethingAgent, AgentConfig
    from create_something_agents.providers.router import AgentRouter, RouterConfig, Complexity

    # Determine model
    if FORCE_MODEL:
        model_map = {
            "opus": "claude-opus-4-20250514",
            "sonnet": "claude-sonnet-4-20250514",
            "haiku": "claude-3-5-haiku-20241022",
            "flash": "gemini-2.0-flash-exp",
        }
        model = model_map.get(FORCE_MODEL, FORCE_MODEL)
        print(f"\n🎯 Using forced model: {model}")
    else:
        # Use router to determine optimal model
        router = AgentRouter(RouterConfig(enable_gemini=True))

        # Paper/experiment generation is STANDARD complexity (multi-file, needs reasoning)
        # but not security-critical, so Sonnet is appropriate
        decision = router.route(
            f"Generate {content_type}: {title}",
            labels=labels + [f"complexity:standard"]
        )
        model = decision.model
        print(f"\n🎯 Router selected: {model} ({decision.reason})")

    # 6. Build the task prompt
    task = f'''
Generate a CREATE SOMETHING {content_type} from this Beads issue.

## Issue Details
- ID: {ISSUE_ID}
- Title: {title}
- Description: {description}

## Output Requirements

1. Create directory: {output_dir}

2. Create +page.svelte with:
   - Canon design tokens (var(--color-*), var(--radius-*), var(--text-*))
   - NO Tailwind design utilities (bg-white, rounded-lg, etc.)
   - Tailwind ONLY for layout (flex, grid, p-*, m-*, gap-*)
   - Proper <script lang="ts"> with types
   - Semantic HTML structure

3. {"Create +page.server.ts if data fetching needed" if content_type == "experiment" else "No server file needed for static paper"}

4. Content structure:
   {"- Live data visualization with real metrics" if content_type == "experiment" else "- Research paper with hypothesis, methodology, findings"}
   - Clear sections with proper headings
   - Tables for data comparison
   - Code examples where relevant

5. After creating files, close the Beads issue:
   bd close {ISSUE_ID} --no-db

## Canon Token Reference

Colors:
- var(--color-bg-pure): #000000
- var(--color-bg-surface): #111111
- var(--color-bg-subtle): #1a1a1a
- var(--color-fg-primary): #ffffff
- var(--color-fg-secondary): rgba(255,255,255,0.8)
- var(--color-fg-muted): rgba(255,255,255,0.46)
- var(--color-border-default): rgba(255,255,255,0.1)
- var(--color-success): #44aa44
- var(--color-error): #d44d4d

Typography:
- var(--text-h1): clamp(2rem, 3vw + 1rem, 3.5rem)
- var(--text-h2): clamp(1.5rem, 2vw + 0.75rem, 2.25rem)
- var(--text-body): 1rem
- var(--text-body-sm): 0.875rem

Spacing (Golden Ratio):
- var(--space-sm): 1rem
- var(--space-md): 1.618rem
- var(--space-lg): 2.618rem

Radius:
- var(--radius-sm): 6px
- var(--radius-md): 8px
- var(--radius-lg): 12px

## Example Structure

<style>
  .container {{ max-width: 65ch; margin: 0 auto; padding: var(--space-lg); }}
  .card {{ background: var(--color-bg-surface); border-radius: var(--radius-lg);
           border: 1px solid var(--color-border-default); padding: var(--space-md); }}
  h1 {{ font-size: var(--text-h1); color: var(--color-fg-primary); }}
  p {{ color: var(--color-fg-secondary); }}
</style>

Generate complete, production-ready content. No placeholders.
'''

    # 7. Configure and run the agent
    config = AgentConfig(
        task=task,
        model=model,
        skills=[
            "css-canon",
            "voice-canon",
            "sveltekit-conventions",
            "beads-patterns",
        ],
        max_turns=40,
    )

    print(f"\n🚀 Generating {content_type}...")

    agent = CreateSomethingAgent(config)
    result = await agent.run()

    # 8. Report results
    print(f"\n{'=' * 60}")
    print(f"✅ Success: {result.success}")
    print(f"📊 Model: {result.model}")
    print(f"🔄 Iterations: {result.iterations}")
    print(f"💰 Cost: \${result.cost_usd:.4f}")
    print(f"{'=' * 60}")

    if result.success:
        print(f"\n🎉 {content_type.title()} created at: {route_path}")
        print(f"   Preview: https://createsomething.io{route_path}")
    else:
        print(f"\n❌ Failed: {result.output[:500]}")
        return 1

    return 0

sys.exit(asyncio.run(main()))
PYTHON_SCRIPT

echo ""
echo -e "${GREEN}Generation complete: $(date -Iseconds)${NC}"
