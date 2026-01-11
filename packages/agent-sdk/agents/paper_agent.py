"""
Paper/Experiment Generation Agent

Generates Canon-compliant Svelte pages from Beads issues.
Uses intelligent routing: Sonnet for content generation, with Gemini fallback.
"""

from __future__ import annotations

import json
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from create_something_agents import AgentConfig, CreateSomethingAgent


SYSTEM_PROMPT = """You are a content generation agent for CREATE SOMETHING.

## Your Role

Generate Canon-compliant Svelte pages for papers and experiments on createsomething.io.

## Canon Design Principles

1. **Tailwind for structure, Canon for aesthetics**
   - USE Tailwind: flex, grid, p-*, m-*, gap-*, items-*, justify-*
   - AVOID Tailwind: bg-white, rounded-lg, text-gray-*, shadow-*
   - USE Canon tokens: var(--color-*), var(--radius-*), var(--text-*)

2. **Monochrome palette**
   - Pure black (#000000) and white (#ffffff)
   - Opacity variations for hierarchy
   - Semantic colors only for status (success, error, warning)

3. **Golden ratio spacing**
   - var(--space-sm): 1rem
   - var(--space-md): 1.618rem
   - var(--space-lg): 2.618rem

## Voice Canon

1. **Clarity Over Cleverness** — Serve the reader
2. **Specificity Over Generality** — Measurable claims
3. **Honesty Over Polish** — Document failures too
4. **Useful Over Interesting** — Implementation focus

## Output Format

Generate complete, production-ready Svelte components:
- TypeScript with proper types
- Semantic HTML
- Canon tokens in <style> blocks
- No placeholder content

## File Structure

Papers: packages/io/src/routes/papers/[slug]/+page.svelte
Experiments: packages/io/src/routes/experiments/[slug]/+page.svelte
"""


@dataclass
class PaperConfig:
    """Configuration for paper/experiment generation."""

    issue_id: str
    content_type: Literal["paper", "experiment"] = "paper"
    slug: str | None = None
    model: str | None = None  # None = auto-route
    monorepo_path: Path | None = None


def get_issue_details(issue_id: str, monorepo: Path) -> dict | None:
    """Fetch issue details from Beads."""
    result = subprocess.run(
        ["bd", "show", issue_id, "--json", "--no-db"],
        capture_output=True,
        text=True,
        cwd=monorepo,
    )

    if result.returncode != 0:
        return None

    try:
        issues = json.loads(result.stdout)
        # bd show returns a list, get the first issue
        return issues[0] if isinstance(issues, list) else issues
    except (json.JSONDecodeError, IndexError):
        return None


def generate_slug(title: str, issue_id: str) -> str:
    """Generate URL-safe slug from title."""
    slug = title.lower()

    # Remove common prefixes
    for prefix in ["paper:", "experiment:", "create", "add", "write"]:
        slug = slug.replace(prefix, "")

    # Clean up
    slug = slug.strip()
    slug = "-".join(slug.split())[:50]
    slug = "".join(c if c.isalnum() or c == "-" else "-" for c in slug)
    slug = "-".join(filter(None, slug.split("-")))

    return slug or issue_id.replace("csm-", "")


def detect_content_type(title: str, labels: list[str]) -> Literal["paper", "experiment"]:
    """Detect content type from issue."""
    if "experiment" in labels or "experiment" in title.lower():
        return "experiment"
    return "paper"


def create_paper_agent(
    config: PaperConfig,
) -> CreateSomethingAgent:
    """
    Create an agent for generating papers/experiments from Beads issues.

    Args:
        config: Paper generation configuration

    Returns:
        Configured CreateSomethingAgent

    Example:
        agent = create_paper_agent(PaperConfig(issue_id="csm-abc123"))
        result = await agent.run()
    """
    monorepo = config.monorepo_path or Path.cwd()

    # Fetch issue details
    issue = get_issue_details(config.issue_id, monorepo)
    if not issue:
        raise ValueError(f"Could not fetch issue {config.issue_id}")

    title = issue.get("title", "")
    description = issue.get("description", "")
    labels = issue.get("labels", [])

    # Determine content type and slug
    content_type = config.content_type or detect_content_type(title, labels)
    slug = config.slug or generate_slug(title, config.issue_id)

    # Determine output path
    if content_type == "experiment":
        output_dir = monorepo / "packages/io/src/routes/experiments" / slug
        route_path = f"/experiments/{slug}"
    else:
        output_dir = monorepo / "packages/io/src/routes/papers" / slug
        route_path = f"/papers/{slug}"

    # Build task prompt
    task = f'''
Generate a CREATE SOMETHING {content_type} from this Beads issue.

## Issue Details
- ID: {config.issue_id}
- Title: {title}
- Description: {description}
- Labels: {", ".join(labels)}

## Output Requirements

1. Create directory: {output_dir}

2. Create +page.svelte with:
   - Canon design tokens (var(--color-*), var(--radius-*), var(--text-*))
   - NO Tailwind design utilities (bg-white, rounded-lg, etc.)
   - Tailwind ONLY for layout (flex, grid, p-*, m-*, gap-*)
   - Proper <script lang="ts"> with types
   - Semantic HTML structure
   - 800+ lines of comprehensive content

3. {"Create +page.server.ts for data fetching" if content_type == "experiment" else "Static paper - no server file needed"}

4. Content structure for {content_type}:
   {"- Live data visualization\n   - Real metrics display\n   - Status indicators\n   - Interactive elements" if content_type == "experiment" else "- Hypothesis and research question\n   - Methodology\n   - Findings with specific metrics\n   - Implications and next steps"}

5. After creating files successfully, close the Beads issue:
   bd close {config.issue_id} --no-db

## Canon Token Quick Reference

```css
/* Colors */
--color-bg-pure: #000000;
--color-bg-surface: #111111;
--color-bg-subtle: #1a1a1a;
--color-fg-primary: #ffffff;
--color-fg-secondary: rgba(255,255,255,0.8);
--color-fg-tertiary: rgba(255,255,255,0.6);
--color-fg-muted: rgba(255,255,255,0.46);
--color-border-default: rgba(255,255,255,0.1);
--color-border-emphasis: rgba(255,255,255,0.2);
--color-success: #44aa44;
--color-error: #d44d4d;
--color-warning: #aa8844;

/* Typography */
--text-h1: clamp(2rem, 3vw + 1rem, 3.5rem);
--text-h2: clamp(1.5rem, 2vw + 0.75rem, 2.25rem);
--text-h3: clamp(1.25rem, 1.5vw + 0.5rem, 1.75rem);
--text-body: 1rem;
--text-body-sm: 0.875rem;

/* Spacing (Golden Ratio) */
--space-sm: 1rem;
--space-md: 1.618rem;
--space-lg: 2.618rem;

/* Radius */
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 12px;
```

Generate complete, production-ready content. No placeholders. No TODOs.
Route will be: {route_path}
'''

    # Select model
    model = config.model or "claude-sonnet-4-20250514"

    agent_config = AgentConfig(
        task=task,
        model=model,
        skills=[
            "css-canon",
            "voice-canon",
            "sveltekit-conventions",
            "beads-patterns",
        ],
        max_turns=50,
    )

    agent = CreateSomethingAgent(agent_config)
    agent.system_prompt = SYSTEM_PROMPT
    return agent


async def generate_from_issue(
    issue_id: str,
    content_type: Literal["paper", "experiment"] | None = None,
    model: str | None = None,
    monorepo_path: Path | None = None,
) -> dict:
    """
    Generate a paper or experiment from a Beads issue.

    Args:
        issue_id: Beads issue ID (e.g., "csm-abc123")
        content_type: Override detected type ("paper" or "experiment")
        model: Model to use (default: auto-route with Sonnet)
        monorepo_path: Path to monorepo root

    Returns:
        Dict with success, output, cost_usd, model, iterations

    Example:
        result = await generate_from_issue("csm-abc123")
        print(f"Success: {result['success']}, Cost: ${result['cost_usd']:.4f}")
    """
    config = PaperConfig(
        issue_id=issue_id,
        content_type=content_type,
        model=model,
        monorepo_path=monorepo_path,
    )

    agent = create_paper_agent(config)
    result = await agent.run()

    return {
        "success": result.success,
        "output": result.output,
        "cost_usd": result.cost_usd,
        "model": result.model,
        "iterations": result.iterations,
    }


# CLI entry point
if __name__ == "__main__":
    import asyncio
    import sys

    if len(sys.argv) < 2:
        print("Usage: python -m agents.paper_agent <issue_id> [--type paper|experiment] [--model sonnet|opus|haiku]")
        sys.exit(1)

    issue_id = sys.argv[1]
    content_type = None
    model = None

    # Parse args
    i = 2
    while i < len(sys.argv):
        if sys.argv[i] == "--type" and i + 1 < len(sys.argv):
            content_type = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == "--model" and i + 1 < len(sys.argv):
            model_map = {
                "opus": "claude-opus-4-20250514",
                "sonnet": "claude-sonnet-4-20250514",
                "haiku": "claude-3-5-haiku-20241022",
            }
            model = model_map.get(sys.argv[i + 1], sys.argv[i + 1])
            i += 2
        else:
            i += 1

    async def main():
        print(f"Generating from issue {issue_id}...")
        result = await generate_from_issue(
            issue_id,
            content_type=content_type,
            model=model,
        )
        print(f"\nSuccess: {result['success']}")
        print(f"Model: {result['model']}")
        print(f"Iterations: {result['iterations']}")
        print(f"Cost: ${result['cost_usd']:.4f}")
        return 0 if result["success"] else 1

    sys.exit(asyncio.run(main()))
