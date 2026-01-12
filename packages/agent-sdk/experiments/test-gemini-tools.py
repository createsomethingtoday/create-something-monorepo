#!/usr/bin/env python3
"""
Test Gemini with Tools vs Baseline

Compares paper generation quality:
1. Baseline (no tools) - generic content
2. Tools (bash, file_read) - codebase-grounded content

Expected improvements with tools:
- Real file paths instead of generic references
- Actual metrics from the codebase
- Specific code examples
- Grounded philosophical claims
"""

import asyncio
import json
import os
import sys
from pathlib import Path

# Add SDK to path
SDK_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(SDK_DIR / "src"))

from create_something_agents.providers.gemini_tools import GeminiToolsProvider
from create_something_agents.providers.base import ProviderConfig

# Paper generation prompt
PAPER_PROMPT = """
Generate a CREATE SOMETHING research paper about "Beads Cross-Session Memory Patterns".

## MANDATORY: Use Tools Before Writing

**You MUST call bash and file_read tools before writing ANY content.**

### Step 1: Search with bash tool (REQUIRED)
- Search for Beads-related files: `grep -r "beads" .claude/rules/ --include="*.md"`
- Find implementation files: `find packages -name "*beads*" -type f`
- Search for molecule/wisp patterns: `grep -r "molecule\\|wisp" .claude/rules/`

### Step 2: Read files with file_read tool (REQUIRED)
- Read the Beads patterns file: `.claude/rules/beads-patterns.md`
- Read CLAUDE.md for context
- Read any implementation files you find

### Step 3: Extract facts from what you read
- Quote exact text with line numbers
- Note real command examples
- Count actual features/patterns

### Step 4: Write paper citing your sources
Every claim must reference a file you actually read.

## Paper Structure Requirements

1. Paper ID in format: PAPER-2026-XXX
2. Abstract with border-left styling (3-5 sentences)
3. Minimum 5 numbered sections (Roman numerals: I, II, III, IV, V)
4. At least 3 visual elements (tables, comparison cards, code blocks)
5. References section with actual file paths you read
6. Footer with navigation

## Canon Token Reference (USE THESE EXACT NAMES)

### Background Colors
- --color-bg-pure: #000000
- --color-bg-surface: #111111
- --color-bg-subtle: #1a1a1a

### Foreground Colors
- --color-fg-primary: #ffffff
- --color-fg-secondary: rgba(255,255,255,0.8)
- --color-fg-muted: rgba(255,255,255,0.46)

### Border Colors
- --color-border-default: rgba(255,255,255,0.1)
- --color-border-emphasis: rgba(255,255,255,0.2)

### Semantic Colors
- --color-success: #44aa44
- --color-error: #d44d4d
- --color-info: #5082b9

Output ONLY the Svelte component code (no markdown code fences).
"""


async def main():
    """Test Gemini with tools."""
    print("=" * 60)
    print("Testing Gemini with Tools")
    print("=" * 60)

    # Find monorepo root
    current = Path.cwd()
    while current != current.parent:
        if (current / "CLAUDE.md").exists():
            break
        current = current.parent

    print(f"Working directory: {current}")

    # Initialize provider
    try:
        provider = GeminiToolsProvider(
            working_dir=str(current),
            thinking_budget=16384,
            max_tool_calls=15,
        )
    except ValueError as e:
        print(f"Error: {e}")
        return

    print(f"Provider: {provider.name}")
    print(f"Model: gemini-2.5-flash")
    print()

    # Execute
    print("Generating paper with tool access...")
    print("-" * 40)

    config = ProviderConfig(
        task=PAPER_PROMPT,
        system_prompt="You are a CREATE SOMETHING research agent. Use bash and file_read tools to examine the codebase before writing. Generate Canon-compliant Svelte papers grounded in actual implementation details.",
        max_tokens=8192,
        temperature=0.0,
    )

    result = await provider.execute(config)

    # Report
    print()
    print("=" * 60)
    print("Results")
    print("=" * 60)
    print(f"Success: {result.success}")
    print(f"Model: {result.model}")
    print(f"Iterations: {result.iterations}")
    print(f"Input tokens: {result.input_tokens}")
    print(f"Output tokens: {result.output_tokens}")
    print(f"Cost: ${result.cost_usd:.4f}")

    if result.metadata:
        print(f"Thinking tokens: {result.metadata.get('thinking_tokens', 0)}")
        print(f"Tool calls: {result.metadata.get('tool_calls_count', 0)}")

    print()
    print("Tool Calls Made:")
    print("-" * 40)
    for i, tc in enumerate(result.tool_calls, 1):
        print(f"{i}. {tc['name']}({json.dumps(tc['args'])[:60]}...)")
        print(f"   Result preview: {tc['result_preview'][:100]}...")
        print()

    if result.error:
        print(f"Error: {result.error}")
        return

    # Save output
    output_file = Path(__file__).parent / "gemini-tools-test-output.svelte"
    output_file.write_text(result.output)
    print(f"Output saved to: {output_file}")
    print(f"Output length: {len(result.output)} chars, {result.output.count(chr(10))} lines")

    # Quality checks
    print()
    print("Quality Checks:")
    print("-" * 40)

    output = result.output

    checks = [
        ("Has PAPER-2026 ID", "PAPER-2026" in output),
        ("Uses --color-bg-pure", "--color-bg-pure" in output),
        ("Uses --color-fg-primary", "--color-fg-primary" in output),
        ("Has Roman numeral sections", any(f">{n}." in output or f">{n} " in output for n in ["I", "II", "III", "IV", "V"])),
        ("References actual files", ".claude/rules" in output or "packages/" in output),
        ("Has code blocks", "<code" in output or "```" in output or "<pre" in output),
        ("Mentions bd command", "bd " in output or "`bd`" in output),
        ("Has abstract section", "abstract" in output.lower()),
        ("Has references section", "reference" in output.lower()),
    ]

    passed = 0
    for name, check in checks:
        status = "✓" if check else "✗"
        print(f"  {status} {name}")
        if check:
            passed += 1

    print()
    print(f"Quality score: {passed}/{len(checks)} ({100*passed//len(checks)}%)")


if __name__ == "__main__":
    asyncio.run(main())
