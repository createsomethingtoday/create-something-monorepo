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

# Run the generator - pass variables via environment to avoid heredoc issues
export ISSUE_ID DRY_RUN FORCE_MODEL MONOREPO_DIR
python3 << 'PYTHON_SCRIPT'
import asyncio
import json
import os
import subprocess
import sys
from pathlib import Path

# Configuration from environment
ISSUE_ID = os.environ.get("ISSUE_ID", "")
DRY_RUN = os.environ.get("DRY_RUN", "false") == "true"
FORCE_MODEL = os.environ.get("FORCE_MODEL") or None
MONOREPO = Path(os.environ.get("MONOREPO_DIR", "."))

async def main():
    """Generate paper or experiment from Beads issue."""

    # 1. Read the Beads issue
    print(f"📋 Reading Beads issue {ISSUE_ID}...")
    result = subprocess.run(
        ["bd", "--sandbox", "show", ISSUE_ID, "--json", "--allow-stale"],
        capture_output=True, text=True, cwd=MONOREPO
    )

    if result.returncode != 0:
        print(f"❌ Failed to read issue: {result.stderr}")
        return 1

    try:
        issues = json.loads(result.stdout)
        # bd show returns a list, get the first (and only) issue
        issue = issues[0] if isinstance(issues, list) else issues
    except (json.JSONDecodeError, IndexError) as e:
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

    # Determine model
    if FORCE_MODEL:
        model_map = {
            # Claude models
            "opus": "claude-opus-4-20250514",
            "sonnet": "claude-sonnet-4-20250514",
            "haiku": "claude-3-5-haiku-20241022",
            # Gemini models
            "flash": "gemini-2.0-flash-exp",
            "gemini-flash": "gemini-2.5-flash",      # Thinking-enabled flash
            "gemini-thinking": "gemini-2.5-flash",   # Alias
            "gemini-pro": "gemini-2.5-pro",          # Recommended for papers
            "gemini-pro-thinking": "gemini-2.5-pro", # Alias
        }
        model = model_map.get(FORCE_MODEL, FORCE_MODEL)
        print(f"\n🎯 Using forced model: {model}")
    else:
        # Default: Gemini Flash - best value ($0.004, 93% Canon compliance)
        # Experiment showed single-pass Gemini Flash beats multi-model pipelines
        # See: experiments/pipeline-experiment-*.json
        model = "gemini-2.5-flash"
        print(f"\n🎯 Using default: {model} (best value: $0.004/paper, 93% Canon)")

    # 6. Build the task prompt - includes structural requirements
    paper_structure = '''
## PAPER STRUCTURE REQUIREMENTS (MINIMUM)

Your paper MUST include ALL of these elements:

### 1. Header Section
- Paper ID: PAPER-2026-NNN format (monospace)
- Title: H1 with --text-h1
- Subtitle: Brief description
- Meta line: Type • Read time • Difficulty

### 2. Abstract Section (REQUIRED)
Border-left styled (4px solid) with 3-5 sentences summarizing problem, methodology, findings.

### 3. Numbered Sections (MINIMUM 5-7) — TELL A STORY
Use Roman numerals: I, II, III, IV, V, VI, VII
Required: Introduction, Problem/Context, Methodology, Findings, Results, Discussion, Limitations

**CRITICAL: Each section must tell a story, not just list facts.**

Each section follows this narrative pattern:
- **Question/Hook** - Frame the problem (use callout box)
- **Finding** - What was discovered (2-3 paragraphs explaining WHY)
- **Evidence** - Before/After comparison with SPECIFIC NUMBERS
- **Action** - "What We Did" list with concrete steps
- **Outcome** - Measurable result

**Transform vague claims into specific comparisons:**
- "Significantly reduced" → "1,594 lines → 644 lines (60% reduction)"
- "Improved performance" → "450ms → 12ms (97% faster)"
- "Many files removed" → "155 scripts → 13 active (92% reduction)"

**AVOID sparse sections like:**
"Beads provides several patterns. Here are examples."

**WRITE substantive sections like:**
"When Claude Code sessions end—whether from context limits, crashes, or
closing the terminal—work disappears. This is the fundamental challenge.
We discovered that Beads stores issues in .beads/issues.jsonl (line 42),
committed to Git. This means work survives session interruption..."

### 4. Visual Elements (MINIMUM 3)
Include at least 3 of: data tables, comparison cards (success/warning), quote boxes, info card grids, code blocks.

### 5. References Section (MINIMUM 2)
Numbered list citing actual files examined.

### 6. Footer Section
Navigation links to related papers.

### SIZING: Minimum 500 lines, 12+ min read, 5+ sections, 3+ visual elements.
'''

    experiment_structure = '''
## EXPERIMENT STRUCTURE REQUIREMENTS (MINIMUM)

Your experiment MUST include ALL of these elements:

### 1. Header with Status Banner
Title + status indicator (healthy/degraded/error)

### 2. Stats Grid (MINIMUM 4 metrics)
4+ stat cards showing key metrics from live data

### 3. Status Cards for Components
Individual cards showing each component's status

### 4. Activity Log or Data Table
Recent activity from the live endpoint

### 5. Architecture Section
Explanation of how the system works

### 6. +page.server.ts (REQUIRED)
Fetch live data from real endpoints using Promise.allSettled

### 7. Footer
Links to endpoints and related experiments

### SIZING: Minimum 400 lines, 4+ stat metrics, 3+ status cards, 1+ live endpoints.
'''

    task = f'''
Generate a CREATE SOMETHING {content_type} from this Beads issue.

## Issue Details
- ID: {ISSUE_ID}
- Title: {title}
- Description: {description}

## MANDATORY: Use Tools Before Writing

**You MUST call bash and file_read tools before writing ANY content.**

### Step 1: Search with bash tool (REQUIRED)
Call the bash tool to search the codebase:
- Search .claude/rules/ directory for documentation
- Search packages/ for implementations
- Run grep commands to find relevant files

### Step 2: Read files with file_read tool (REQUIRED)
After searching, read the files you found:
- Read .claude/rules/*.md files for patterns
- Read CLAUDE.md for architecture
- Read actual source files

### Step 3: Extract facts from what you read
From the actual file contents:
- Quote exact text with line numbers
- Note real function/class names
- Count actual metrics from files

### Step 4: Write paper citing your sources
Every claim must cite a file you read.

**If you write without calling bash or file_read first, your paper will be rejected.**

{paper_structure if content_type == "paper" else experiment_structure}

## Output Requirements

1. Create directory: {output_dir}

2. Create +page.svelte with:
   - Canon design tokens (var(--color-*), var(--radius-*), var(--text-*))
   - NO Tailwind design utilities (bg-white, rounded-lg, etc.)
   - Tailwind ONLY for layout (flex, grid, p-*, m-*, gap-*)
   - Types DEFINED INLINE (not imported from external files)
   - Escape curly braces in code: {{`code here`}}

3. {"Create +page.server.ts for live data fetching" if content_type == "experiment" else "No server file needed for static paper"}

4. After creating files, close the Beads issue:
   bd close {ISSUE_ID} --no-db

## Canon Token Reference (USE THESE EXACT NAMES)

### Background Colors
- --color-bg-pure: #000000 (page background)
- --color-bg-elevated: #0a0a0a (raised surfaces)
- --color-bg-surface: #111111 (cards, panels)
- --color-bg-subtle: #1a1a1a (hover states, callouts)

### Foreground Colors
- --color-fg-primary: #ffffff (headings, emphasis)
- --color-fg-secondary: rgba(255,255,255,0.8) (body text)
- --color-fg-tertiary: rgba(255,255,255,0.6) (secondary info)
- --color-fg-muted: rgba(255,255,255,0.46) (captions, meta)

### Border Colors
- --color-border-default: rgba(255,255,255,0.1) (subtle borders)
- --color-border-emphasis: rgba(255,255,255,0.2) (visible borders)

### Semantic Colors
- --color-success: #44aa44 (positive, complete)
- --color-success-muted: rgba(68,170,68,0.2) (success backgrounds)
- --color-error: #d44d4d (negative, failed)
- --color-warning: #aa8844 (caution, pending)
- --color-info: #5082b9 (informational, links)

### Typography
- --text-h1: clamp(2rem, 3vw + 1rem, 3.5rem)
- --text-h2: clamp(1.5rem, 2vw + 0.75rem, 2.25rem)
- --text-h3: clamp(1.25rem, 1.5vw + 0.5rem, 1.75rem)
- --text-body-lg: 1.125rem
- --text-body: 1rem
- --text-body-sm: 0.875rem

### Spacing (Golden Ratio φ = 1.618)
- --space-xs: 0.5rem
- --space-sm: 1rem
- --space-md: 1.618rem
- --space-lg: 2.618rem
- --space-xl: 4.236rem

### Border Radius
- --radius-sm: 6px
- --radius-md: 8px
- --radius-lg: 12px

### Animation
- --duration-micro: 200ms (hover states)
- --duration-standard: 300ms (transitions)
- --ease-standard: cubic-bezier(0.4, 0.0, 0.2, 1)

CRITICAL: Use these EXACT token names. Do NOT invent new names like --color-text or --color-background.

## Quality Gate Checklist

- [ ] Paper ID present (PAPER-2026-NNN)
- [ ] Abstract with border-left styling
- [ ] Minimum 5 numbered sections
- [ ] Minimum 3 visual elements
- [ ] References with file paths
- [ ] Footer with navigation
- [ ] 500+ lines for papers, 400+ for experiments
- [ ] All claims cite sources

Generate complete, production-ready content. No placeholders.
'''

    # 7. Configure and run the agent
    is_gemini = model.startswith("gemini")

    print(f"\n🚀 Generating {content_type}...")

    if is_gemini:
        # Use Gemini provider with tools for codebase-aware paper generation
        from create_something_agents.providers.gemini_tools import GeminiToolsProvider
        from create_something_agents.providers.base import ProviderConfig

        # Higher thinking budget for paper generation
        thinking_budget = 16384 if (FORCE_MODEL and "thinking" in FORCE_MODEL) or "2.5" in model else 0

        provider = GeminiToolsProvider(
            thinking_budget=thinking_budget,
            working_dir=str(MONOREPO),
            max_tool_calls=15,
        )
        provider_config = ProviderConfig(
            task=task,
            model=model,
            max_tokens=8192,
            system_prompt="You are a CREATE SOMETHING research agent. Use bash and file_read tools to examine the codebase before writing. Generate Canon-compliant Svelte papers grounded in actual implementation details.",
        )

        result = await provider.execute(provider_config)

        # Write output to file if successful
        if result.success and result.output:
            import os
            import re
            os.makedirs(output_dir, exist_ok=True)
            output_file = output_dir / "+page.svelte"

            # Strip markdown code fences if present
            content = result.output.strip()
            # Remove leading ```svelte or ```html or ```
            content = re.sub(r'^```(?:svelte|html)?\s*\n?', '', content)
            # Remove trailing ```
            content = re.sub(r'\n?```\s*$', '', content)

            with open(output_file, "w") as f:
                f.write(content)
            print(f"   Wrote {len(content)} chars to {output_file}")

    else:
        # Use Claude agent for Claude models
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

        agent = CreateSomethingAgent(config)
        result = await agent.run()

    # 8. Report results
    print(f"\n{'=' * 60}")
    print(f"✅ Success: {result.success}")
    print(f"📊 Model: {result.model}")
    iterations = getattr(result, 'iterations', 1)
    print(f"🔄 Iterations: {iterations}")
    print(f"💰 Cost: ${result.cost_usd:.4f}")
    if hasattr(result, 'metadata') and result.metadata:
        if result.metadata.get('thinking_enabled'):
            print(f"🧠 Thinking tokens: {result.metadata.get('thinking_tokens', 0)}")
        if result.metadata.get('tool_calls_count'):
            print(f"🔧 Tool calls: {result.metadata.get('tool_calls_count', 0)}")

    # Show tool calls if any
    if hasattr(result, 'tool_calls') and result.tool_calls:
        print(f"\n📋 Tool Calls Made:")
        for i, tc in enumerate(result.tool_calls[:10], 1):  # Show first 10
            args_preview = str(tc.get('args', {}))[:50]
            print(f"   {i}. {tc.get('name')}({args_preview}...)")
        if len(result.tool_calls) > 10:
            print(f"   ... and {len(result.tool_calls) - 10} more")

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
