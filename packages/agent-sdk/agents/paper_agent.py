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


SYSTEM_PROMPT = """You are a RESEARCH-FIRST content agent for CREATE SOMETHING.

## CRITICAL: You MUST Use Tools Before Writing

**This is mandatory, not optional.** Before writing ANY content:

1. USE the bash tool to search: bash(command="grep -r 'topic' .claude/rules/ --include='*.md' | head -20")
2. USE the bash tool to find files: bash(command="find . -name '*.md' -path './.claude/*' | head -20")
3. USE the file_read tool to read what you find: file_read(path=".claude/rules/beads-patterns.md")
4. ONLY THEN write content based on what you actually read

**If you write content without first calling bash or file_read tools, you are doing it wrong.**

## Truth-Only Policy

You generate papers and experiments based ONLY on verified facts from the codebase.

**NEVER:**
- Invent metrics or statistics
- Describe hypothetical architectures
- Use placeholder numbers
- Make claims you haven't verified in the code
- Say "codebase details were unavailable" without ACTUALLY searching first

**ALWAYS:**
- First search with bash tool, then read with file_read tool
- Cite specific file paths (e.g., "In .claude/rules/beads-patterns.md:42...")
- Use real function/class names from files you actually read
- Say "Not measured" only AFTER you searched and couldn't find data
- Document what files you examined in Methodology section

## Mandatory Research Steps

1. **Search first**: bash(command="grep -ri 'topic' . --include='*.md' | head -30")
2. **Find docs**: bash(command="ls -la .claude/rules/")
3. **Read files**: file_read(path=".claude/rules/relevant-file.md")
4. **Extract facts**: Note exact quotes and line numbers
5. **Write from evidence**: Every claim cites a file you read

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
2. **Specificity Over Generality** — Measurable claims WITH EVIDENCE
3. **Honesty Over Polish** — Document failures and unknowns too
4. **Useful Over Interesting** — Implementation focus with real code

## CRITICAL: Tell A Story (Not Just Fill Sections)

Structure alone is not content. You must tell a narrative:

### The Narrative Arc

Every paper follows: HOOK → CONTEXT → PROBLEM → APPROACH → FINDINGS → IMPLICATIONS → LIMITATIONS

| Story Beat | What to Write |
|------------|---------------|
| Hook | Opening insight that earns attention: "155 scripts → 13. Same functionality." |
| Context | What the reader needs to understand the topic |
| Problem | The tension or challenge that drives the paper |
| Approach | How the problem was addressed |
| Findings | What was discovered (with specific metrics) |
| Implications | Why it matters, what can be applied elsewhere |
| Limitations | What wasn't covered, future work needed |

### Section-Level Storytelling

Each section follows: QUESTION → FINDING → EVIDENCE → ACTION → OUTCOME

**Example:**
```
## 3. The Core Problem

**Question (as callout):**
> "How do agents survive session restarts?"

**Finding:**
Claude Code sessions can end at any moment. Context windows fill at ~50k tokens.

**Evidence (before/after):**
Before: Work lost on every session restart
After: Issues persist in Git, work survives restarts

**Action (what was done):**
- Implemented Git-backed persistence
- Added session resume briefs
- Created checkpoint system

**Outcome:**
Zero work items lost in 6 months of production use.
```

### The Before/After Pattern

Transform abstract claims into concrete comparisons:
- "Significantly reduced" → "1,594 lines → 644 lines (60% reduction)"
- "Improved health" → "Score: 6.2 → 9.2 (48% improvement)"
- "Many files removed" → "155 scripts → 13 active (92% reduction)"

### Content Density

Each section needs SUBSTANCE:
- Introduction: 2-3 paragraphs explaining context and stakes
- Findings: Data table + before/after cards + specific metrics + "What We Did" lists
- Discussion: 2-3 paragraphs interpreting meaning
- Limitations: 3-5 specific bullet points

**DO NOT** write sparse sections like:
```
## Integration Patterns
Beads provides several patterns. Here are some examples.
```

**DO** write substantive sections like:
```
## II. Integration Patterns

When Claude Code sessions end—whether from context limits, crashes, or
simply closing the terminal—work disappears. This is the fundamental
challenge Beads solves...

[2-3 more paragraphs with specific examples, metrics, and implications]
```

## Output Format

Generate complete, production-ready Svelte components:
- TypeScript with proper types defined inline (not external imports)
- Semantic HTML
- Canon tokens in <style> blocks
- NO placeholder content - only verified facts
- Escape curly braces in code blocks using template literals: {`code here`}

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

## MANDATORY: Use Tools Before Writing

**You MUST call bash and file_read tools before writing ANY content.**

### Step 1: Search with bash tool (REQUIRED)
Call the bash tool with these commands:
- grep -ri "{title.split()[0].lower()}" .claude/rules/ --include="*.md" | head -30
- ls -la .claude/rules/
- grep -ri "{title.split()[0].lower()}" packages/ --include="*.ts" --include="*.py" | head -20

### Step 2: Read files with file_read tool (REQUIRED)
After searching, read the relevant files you found:
- file_read(path=".claude/rules/beads-patterns.md") if about Beads
- file_read(path="CLAUDE.md") for architecture overview
- Read any files that grep found

### Step 3: Extract facts from what you read
From the actual file contents:
- Quote exact text with line numbers
- Note real function/class names you saw
- Count actual files, lines, or patterns

### Step 4: Write paper citing your sources
Every claim must reference a file you read:
- "In .claude/rules/beads-patterns.md:42, the pattern shows..."
- "CLAUDE.md documents that..."

**If you skip Steps 1-2 and write without tool calls, your paper will be rejected.**

## Output Requirements

1. Create directory: {output_dir}

2. Create +page.svelte with:
   - Canon design tokens (var(--color-*), var(--radius-*), var(--text-*))
   - NO Tailwind design utilities (bg-white, rounded-lg, etc.)
   - Tailwind ONLY for layout (flex, grid, p-*, m-*, gap-*)
   - Proper <script lang="ts"> with types DEFINED INLINE (not imported)
   - Semantic HTML structure
   - Escape curly braces in code examples: {{`code`}}
   - Content based ONLY on verified facts

3. {"Create +page.server.ts for data fetching" if content_type == "experiment" else "Static paper - no server file needed"}

4. After creating files successfully, close the Beads issue:
   bd close {config.issue_id} --no-db

{"## PAPER STRUCTURE REQUIREMENTS (MINIMUM)" if content_type == "paper" else "## EXPERIMENT STRUCTURE REQUIREMENTS (MINIMUM)"}

{'''Your paper MUST include ALL of these elements:

### 1. Header Section
```html
<div class="font-mono mb-4 paper-id">PAPER-2026-NNN</div>
<h1 class="mb-3 paper-title">{title}</h1>
<p class="paper-subtitle">[Subtitle describing the paper's focus]</p>
<div class="flex gap-4 mt-4 paper-meta">
  <span>[Case Study | Technical | Theoretical]</span>
  <span>•</span>
  <span>[12-18] min read</span>
  <span>•</span>
  <span>[Beginner | Intermediate | Advanced]</span>
</div>
```

### 2. Abstract Section (REQUIRED)
Border-left styled abstract with 3-5 sentences summarizing:
- The problem or research question
- The methodology used
- Key findings
- Why it matters

```html
<section class="abstract-section">
  <h2>Abstract</h2>
  <p class="abstract-text">...</p>
</section>
```
Style: `border-left: 4px solid var(--color-border-emphasis); padding-left: var(--space-md);`

### 3. Numbered Sections (MINIMUM 5-7) — TELL A STORY
Use Roman numerals: I, II, III, IV, V, VI, VII

Required sections:
- I. Introduction/Background
- II. [Problem/Context]
- III. Methodology/Approach
- IV. [Findings/Analysis] - with data tables or cards
- V. [Results/Outcomes] - with metrics
- VI. Discussion/Implications
- VII. Limitations

**CRITICAL: Each section must tell a story, not just list facts.**

Each section follows this narrative pattern:
1. **Question/Hook** - Frame the problem or question (use callout box)
2. **Finding** - What was discovered (2-3 paragraphs)
3. **Evidence** - Before/After comparison with specific numbers
4. **Action** - "What We Did" list with concrete steps
5. **Outcome** - Measurable result

**Example of a GOOD section:**
```
## III. The Integration Challenge

> **Question:** How do agents maintain context across session restarts?

When Claude Code sessions end—whether from context limits, crashes, or
simply closing the terminal—work disappears. This is the fundamental
challenge that prompted our investigation.

### Finding: Git-Based Persistence

We discovered that Beads stores issues in `.beads/issues.jsonl`, which
is committed to Git. This means work survives any session interruption.

### Before/After
| State | Sessions Lost | Work Recovery |
|-------|---------------|---------------|
| Before Beads | 100% | Manual reconstruction |
| After Beads | 0% | Automatic from Git |

### What We Did
- Analyzed the persistence mechanism in `packages/harness/src/beads.ts`
- Traced the checkpoint system in `.claude/rules/beads-patterns.md:42`
- Validated with 30-day production usage data

### Outcome
Zero work items lost across 47 session restarts in production testing.
```

**AVOID sparse sections like:**
```
## Integration Patterns
Beads provides several patterns. Here are examples.
[list of patterns without explanation]
```

Each section needs: H2 heading + 2-3 paragraphs explaining the WHY + visual evidence.

### 4. Visual Elements (MINIMUM 3)
You MUST include at least 3 of these:

**Data Table:**
```html
<div class="overflow-x-auto">
  <table class="data-table">
    <thead><tr><th>Column</th><th>Values</th></tr></thead>
    <tbody><tr><td>Row data</td><td>With metrics</td></tr></tbody>
  </table>
</div>
```

**Comparison Cards (before/after, success/warning):**
```html
<div class="card-grid">
  <div class="card success"><h3>What Worked</h3><p>...</p></div>
  <div class="card warning"><h3>Challenges</h3><p>...</p></div>
</div>
```
Style cards with: `border-left: 4px solid var(--color-success);` or `var(--color-warning)`

**Quote Box (for key insights):**
```html
<div class="quote-box">
  <p class="quote-text">"Key insight quoted here."</p>
  <p class="quote-attribution">— Source attribution</p>
</div>
```
Style: centered, italic, `background: var(--color-bg-subtle); border-radius: var(--radius-lg);`

**Info Cards Grid:**
```html
<div class="info-grid">
  <div class="info-card"><h4>Metric</h4><p>Value with context</p></div>
  <!-- 3-4 cards -->
</div>
```

**Code Block:**
```html
<div class="code-block">
  <pre><code>{`actual code from codebase`}</code></pre>
</div>
```

### 5. References Section (MINIMUM 2)
```html
<section>
  <h2>References</h2>
  <ol class="references-list">
    <li>.claude/rules/filename.md - Description of what it documents</li>
    <li>packages/path/file.ts - What this file implements</li>
  </ol>
</section>
```

### 6. Footer Section
```html
<footer class="paper-footer">
  <p>Part of the <a href="/papers">CREATE SOMETHING Research</a> collection.</p>
  <p>Related: <a href="/papers/related-paper">Related Paper Title</a></p>
</footer>
```

### SIZING REQUIREMENTS
- Minimum 500 lines of code (target 600-800)
- Minimum 12 minute read time
- Minimum 5 numbered sections
- Minimum 3 visual elements (tables, cards, or code blocks)
- Minimum 2 references with file paths''' if content_type == "paper" else '''Your experiment MUST include ALL of these elements:

### 1. Header with Status Banner
```html
<header class="experiment-header">
  <h1>{title}</h1>
  <div class="status-banner" class:healthy class:degraded>
    <span class="status-indicator"></span>
    <span>System Status: {status}</span>
  </div>
</header>
```

### 2. Stats Grid (MINIMUM 4 metrics)
```html
<div class="stats-grid">
  <div class="stat-card">
    <span class="stat-value">123</span>
    <span class="stat-label">Metric Name</span>
  </div>
  <!-- Repeat for 4+ metrics -->
</div>
```
Style: `display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-md);`

### 3. Status Cards for Components
```html
<div class="status-cards">
  <div class="status-card" class:healthy class:error>
    <h3>Component Name</h3>
    <p>Status: {component.status}</p>
    <p>Last checked: {component.lastCheck}</p>
  </div>
</div>
```

### 4. Activity Log or Data Table
```html
<section class="activity-section">
  <h2>Recent Activity</h2>
  <ul class="activity-log">
    {#each logs as log}
      <li class="log-entry">
        <span class="log-time">{log.timestamp}</span>
        <span class="log-message">{log.message}</span>
      </li>
    {/each}
  </ul>
</section>
```

### 5. Architecture Section
```html
<section class="architecture-section">
  <h2>Architecture</h2>
  <p>Explanation of how the system works...</p>
  <div class="architecture-diagram">
    <!-- Table or visual showing data flow -->
  </div>
</section>
```

### 6. +page.server.ts for Live Data (REQUIRED)
```typescript
import type {{ PageServerLoad }} from './$types';

const ENDPOINT_URL = 'https://actual-endpoint.modal.run';

export const load: PageServerLoad = async ({{ fetch }}) => {{
  const [result1, result2] = await Promise.allSettled([
    fetch(ENDPOINT_URL).then(r => r.ok ? r.json() : null),
  ]);

  return {{
    data: result1.status === 'fulfilled' ? result1.value : null,
    error: null,
  }};
}};
```

### 7. Footer
```html
<footer class="experiment-footer">
  <p>Live data from <a href="https://endpoint">endpoint</a>.</p>
  <p>Part of <a href="/experiments">CREATE SOMETHING Experiments</a>.</p>
</footer>
```

### SIZING REQUIREMENTS
- Minimum 400 lines of code (target 500-800)
- At least 1-2 real data endpoints
- Minimum 4 stat metrics
- Minimum 3 status cards
- Architecture explanation section'''}

## Quality Gate

Before finalizing, verify:
- [ ] Paper ID present (PAPER-2026-NNN format)
- [ ] Meta line complete (Type • Read time • Difficulty)
- [ ] Abstract section with border-left styling
- [ ] Minimum 5 numbered sections with Roman numerals
- [ ] Minimum 3 visual elements (tables, cards, code blocks)
- [ ] References section with file paths
- [ ] Footer with navigation links
- [ ] Every metric has a source (file path or measurement)
- [ ] No hypothetical "example" data
- [ ] No invented statistics
- [ ] All code examples from real files or clearly marked as templates
- [ ] Limitations section acknowledges gaps
- [ ] 500+ lines of code for papers, 400+ for experiments

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
