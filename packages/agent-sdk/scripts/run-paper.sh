#!/bin/bash
# CREATE SOMETHING Paper/Experiment Generator
#
# Generates Canon-compliant Svelte pages from Linear or Beads issues.
# Uses intelligent routing: Gemini Flash for simple, Sonnet for complex.
#
# Usage:
#   ./scripts/run-paper.sh CRE-123              # Generate from Linear issue
#   ./scripts/run-paper.sh csm-xxx              # Generate from Beads issue
#   ./scripts/run-paper.sh CRE-123 --dry-run    # Preview without writing
#   ./scripts/run-paper.sh CRE-123 --model opus # Force specific model
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
    echo "Usage: ./scripts/run-paper.sh CRE-123|csm-xxx [--dry-run] [--model opus|sonnet|haiku|flash]"
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
import re
import subprocess
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

# Configuration from environment
ISSUE_ID = os.environ.get("ISSUE_ID", "")
DRY_RUN = os.environ.get("DRY_RUN", "false") == "true"
FORCE_MODEL = os.environ.get("FORCE_MODEL") or None
MONOREPO = Path(os.environ.get("MONOREPO_DIR", "."))

def detect_tracking_system(issue_id: str) -> str:
    return "linear" if re.match(r"^[A-Z][A-Z0-9]+-\d+$", issue_id) else "beads"

def parse_labels(raw_labels):
    if isinstance(raw_labels, list):
        return [str(label) for label in raw_labels]
    if isinstance(raw_labels, str):
        try:
            parsed = json.loads(raw_labels)
            if isinstance(parsed, list):
                return [str(label) for label in parsed]
        except json.JSONDecodeError:
            return [part.strip() for part in raw_labels.split(",") if part.strip()]
    return []

def get_linear_issue(issue_id: str):
    token = os.environ.get("LINEAR_API_KEY", "").strip()
    if not token:
        raise RuntimeError("LINEAR_API_KEY is required for Linear issue lookup")

    query = """
    query IssueById($id: String!) {
      issue(id: $id) {
        id
        identifier
        title
        description
        priority
        url
        updatedAt
        state { name type }
        project { name }
        labels { nodes { name } }
      }
    }
    """
    payload = json.dumps({"query": query, "variables": {"id": issue_id}}).encode()
    request = Request(
        os.environ.get("LINEAR_API_URL", "https://api.linear.app/graphql"),
        data=payload,
        headers={"Content-Type": "application/json", "Authorization": token},
        method="POST",
    )

    try:
        with urlopen(request, timeout=15) as response:
            body = json.loads(response.read().decode("utf8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
        raise RuntimeError(f"Linear lookup failed: {error}") from error

    if body.get("errors"):
        raise RuntimeError(f"Linear lookup failed: {body['errors']}")

    issue = body.get("data", {}).get("issue")
    if not issue:
        raise RuntimeError(f"Could not find Linear issue {issue_id}")

    return {
        "id": issue.get("identifier") or issue.get("id"),
        "title": issue.get("title", ""),
        "description": issue.get("description") or "",
        "labels": [node.get("name", "") for node in issue.get("labels", {}).get("nodes", []) if node.get("name")],
        "status": issue.get("state", {}).get("name", ""),
        "priority": issue.get("priority"),
        "url": issue.get("url", ""),
        "updated_at": issue.get("updatedAt", ""),
    }

def get_beads_issue(issue_id: str):
    result = subprocess.run(
        ["bd", "--sandbox", "show", issue_id, "--json", "--allow-stale"],
        capture_output=True, text=True, cwd=MONOREPO
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "Unknown Beads error")

    try:
        issues = json.loads(result.stdout)
        issue = issues[0] if isinstance(issues, list) else issues
    except (json.JSONDecodeError, IndexError) as error:
        raise RuntimeError(f"Failed to parse issue JSON: {result.stdout}") from error

    issue["labels"] = parse_labels(issue.get("labels"))
    return issue

async def main():
    """Generate paper or experiment from Linear or Beads."""

    tracking_system = detect_tracking_system(ISSUE_ID)
    work_item_kind = "Linear issue" if tracking_system == "linear" else "Beads issue"

    # 1. Read the work item
    print(f"📋 Reading {work_item_kind} {ISSUE_ID}...")
    try:
        issue = get_linear_issue(ISSUE_ID) if tracking_system == "linear" else get_beads_issue(ISSUE_ID)
    except RuntimeError as error:
        print(f"❌ Failed to read {work_item_kind.lower()}: {error}")
        return 1

    title = issue.get("title", "")
    description = issue.get("description", "")
    labels = parse_labels(issue.get("labels"))

    print(f"   Title: {title}")
    print(f"   Labels: {', '.join(labels)}")

    # 2. Determine content type from labels/title
    content_type = "paper"  # default
    normalized_labels = [label.lower() for label in labels]
    if any("experiment" in label for label in normalized_labels) or "experiment" in title.lower():
        content_type = "experiment"
    elif any("paper" in label for label in normalized_labels) or "paper" in title.lower():
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
        slug = ISSUE_ID.lower().replace("csm-", "")

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

    # 6. Build the same evidence-preserving task as the agent factory.
    from agents.paper_agent import PaperConfig, SYSTEM_PROMPT, build_paper_task

    task = build_paper_task(
        PaperConfig(
            issue_id=ISSUE_ID, content_type=content_type, slug=slug,
            model=model, monorepo_path=MONOREPO,
        ),
        issue=issue,
    )

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
            system_prompt=SYSTEM_PROMPT,
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
            system_prompt=SYSTEM_PROMPT,
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
