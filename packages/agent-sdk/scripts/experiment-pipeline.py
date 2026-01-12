#!/usr/bin/env python3
"""
Multi-Model Paper Generation Pipeline Experiment

Tests different model combinations to find optimal cost/quality tradeoff:
1. Single-pass: One model does everything
2. Plan→Execute: Architect plans, executor writes
3. Plan→Validate→Execute: Full Subtractive Triad

Metrics:
- Cost (USD)
- Output quality (line count, Canon compliance, structure)
- Time to complete
"""

import asyncio
import json
import os
import re
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

# Add SDK to path
SDK_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(SDK_DIR / "src"))

# Canon tokens for validation
CANON_TOKENS = {
    "backgrounds": ["--color-bg-pure", "--color-bg-elevated", "--color-bg-surface", "--color-bg-subtle"],
    "foregrounds": ["--color-fg-primary", "--color-fg-secondary", "--color-fg-tertiary", "--color-fg-muted"],
    "borders": ["--color-border-default", "--color-border-emphasis"],
    "semantic": ["--color-success", "--color-error", "--color-warning", "--color-info"],
    "typography": ["--text-h1", "--text-h2", "--text-h3", "--text-body", "--text-body-sm"],
    "spacing": ["--space-xs", "--space-sm", "--space-md", "--space-lg", "--space-xl"],
    "radius": ["--radius-sm", "--radius-md", "--radius-lg"],
    "animation": ["--duration-micro", "--duration-standard", "--ease-standard"],
}

# Anti-patterns to detect
ANTI_PATTERNS = [
    r":root\s*\{",  # Redefining root
    r"--color-text",  # Wrong token name
    r"--color-background",  # Wrong token name
    r"bg-white",  # Tailwind design utility
    r"text-white",  # Tailwind design utility
    r"rounded-lg",  # Tailwind design utility
]

PAPER_TOPIC = """
## Paper Topic: Multi-Model Pipeline Optimization

Write a research paper about optimizing AI model pipelines for content generation.

### Key Points to Cover:
1. The cost-quality tradeoff in AI model selection
2. When to use expensive models (Opus) vs cheap models (Haiku/Gemini)
3. The Plan→Execute→Review pattern
4. Empirical results from testing different approaches
5. The Subtractive Triad applied to model selection

### Include these findings:
- Gemini Pro: ~$0.01/paper, Canon-compliant with token reference
- Gemini Flash: ~$0.004/paper, needs more guidance
- Claude Sonnet: ~$0.11/paper, high quality
- Claude Opus: ~$0.50/paper, best reasoning

### Structure:
- Use Roman numeral sections (I, II, III, etc.)
- Include data tables with cost comparisons
- Include comparison cards (success/warning styles)
- Abstract with border-left styling
- Footer with navigation
"""

# Canon token reference to inject in prompts
CANON_REFERENCE = """
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

CRITICAL: Use var(--token-name) syntax. Do NOT redefine :root or invent new token names.
"""


@dataclass
class PipelineResult:
    """Result from a pipeline execution."""
    pipeline_name: str
    output: str
    total_cost: float
    phase_costs: dict[str, float] = field(default_factory=dict)
    duration_seconds: float = 0.0
    line_count: int = 0
    canon_score: float = 0.0  # 0-100
    anti_pattern_count: int = 0
    structure_score: float = 0.0  # 0-100
    error: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


def score_canon_compliance(content: str) -> tuple[float, int]:
    """Score Canon token usage and count anti-patterns."""
    if not content:
        return 0.0, 0

    # Count Canon tokens used correctly
    tokens_used = 0
    total_tokens = 0

    for category, tokens in CANON_TOKENS.items():
        for token in tokens:
            total_tokens += 1
            # Check for var(--token) usage
            if f"var({token}" in content:
                tokens_used += 1

    canon_score = (tokens_used / max(total_tokens, 1)) * 100

    # Count anti-patterns
    anti_pattern_count = 0
    for pattern in ANTI_PATTERNS:
        matches = re.findall(pattern, content, re.IGNORECASE)
        anti_pattern_count += len(matches)

    return canon_score, anti_pattern_count


def score_structure(content: str) -> float:
    """Score paper structure completeness."""
    if not content:
        return 0.0

    checks = [
        (r"PAPER-\d{4}-\d+", "Paper ID"),
        (r"<h1|font-size:\s*var\(--text-h1\)", "H1 heading"),
        (r"border-left.*4px|border-left:\s*4px", "Abstract border"),
        (r"[IVX]+\.\s+\w|Section\s+[IVX]+", "Roman numeral sections"),
        (r"<table|display:\s*grid.*grid-template", "Data table/grid"),
        (r"--color-success|--color-warning|--color-error", "Semantic colors"),
        (r"References|Sources|Citations", "References section"),
        (r"</footer>|navigation|Related", "Footer"),
    ]

    passed = 0
    for pattern, name in checks:
        if re.search(pattern, content, re.IGNORECASE):
            passed += 1

    return (passed / len(checks)) * 100


async def run_gemini(prompt: str, model: str = "gemini-2.5-pro", thinking_budget: int = 8192) -> tuple[str, float, dict]:
    """Run Gemini model and return (output, cost, metadata)."""
    from create_something_agents.providers.gemini import GeminiProvider
    from create_something_agents.providers.base import ProviderConfig

    provider = GeminiProvider(thinking_budget=thinking_budget)
    config = ProviderConfig(
        task=prompt,
        model=model,
        max_tokens=8192,
        system_prompt="You are a CREATE SOMETHING research agent. Generate comprehensive papers following Canon design principles.",
    )

    result = await provider.execute(config)

    return result.output, result.cost_usd, {
        "model": model,
        "thinking_tokens": result.metadata.get("thinking_tokens", 0) if result.metadata else 0,
        "input_tokens": result.input_tokens,
        "output_tokens": result.output_tokens,
    }


async def run_claude(prompt: str, model: str = "claude-sonnet-4-20250514") -> tuple[str, float, dict]:
    """Run Claude model and return (output, cost, metadata)."""
    import anthropic

    client = anthropic.Anthropic()

    start = time.time()
    response = client.messages.create(
        model=model,
        max_tokens=8192,
        system="You are a CREATE SOMETHING research agent. Generate comprehensive papers following Canon design principles.",
        messages=[{"role": "user", "content": prompt}]
    )
    duration = time.time() - start

    output = response.content[0].text if response.content else ""

    # Calculate cost
    input_tokens = response.usage.input_tokens
    output_tokens = response.usage.output_tokens

    costs = {
        "claude-3-5-haiku-20241022": (0.001, 0.005),
        "claude-sonnet-4-20250514": (0.003, 0.015),
        "claude-opus-4-20250514": (0.015, 0.075),
    }

    rates = costs.get(model, (0.003, 0.015))
    cost = (input_tokens / 1_000_000 * rates[0]) + (output_tokens / 1_000_000 * rates[1])

    return output, cost, {
        "model": model,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "duration": duration,
    }


async def pipeline_single_pass(model_name: str, model_id: str, is_gemini: bool = False) -> PipelineResult:
    """Single model does everything."""
    print(f"\n{'='*60}")
    print(f"Pipeline: Single-Pass ({model_name})")
    print(f"{'='*60}")

    prompt = f"""
Generate a complete Svelte paper about multi-model pipeline optimization.

{PAPER_TOPIC}

{CANON_REFERENCE}

Output a complete +page.svelte file with:
- <script> section with types defined inline
- Full HTML structure with all sections
- <style> section using Canon tokens
"""

    start = time.time()
    try:
        if is_gemini:
            output, cost, metadata = await run_gemini(prompt, model_id)
        else:
            output, cost, metadata = await run_claude(prompt, model_id)

        duration = time.time() - start
        line_count = len(output.split('\n')) if output else 0
        canon_score, anti_patterns = score_canon_compliance(output)
        structure_score = score_structure(output)

        print(f"  ✓ Completed in {duration:.1f}s")
        print(f"  Cost: ${cost:.4f}")
        print(f"  Lines: {line_count}")
        print(f"  Canon: {canon_score:.1f}%")
        print(f"  Structure: {structure_score:.1f}%")
        print(f"  Anti-patterns: {anti_patterns}")

        return PipelineResult(
            pipeline_name=f"single-pass-{model_name.lower()}",
            output=output,
            total_cost=cost,
            phase_costs={model_name: cost},
            duration_seconds=duration,
            line_count=line_count,
            canon_score=canon_score,
            anti_pattern_count=anti_patterns,
            structure_score=structure_score,
            metadata=metadata,
        )

    except Exception as e:
        print(f"  ✗ Failed: {e}")
        return PipelineResult(
            pipeline_name=f"single-pass-{model_name.lower()}",
            output="",
            total_cost=0,
            error=str(e),
        )


async def pipeline_plan_execute(planner: str, executor: str) -> PipelineResult:
    """Planner creates outline, executor writes paper."""
    print(f"\n{'='*60}")
    print(f"Pipeline: Plan→Execute ({planner}→{executor})")
    print(f"{'='*60}")

    total_cost = 0.0
    phase_costs = {}

    # Phase 1: Planning
    plan_prompt = f"""
Create a detailed outline for a research paper about multi-model pipeline optimization.

{PAPER_TOPIC}

Output a structured outline with:
1. Exact section titles (Roman numerals)
2. Key points for each section
3. Data tables to include (with headers)
4. Comparison cards needed
5. Code examples to show

Be specific - this outline will be given to another model to write.
"""

    print("  Phase 1: Planning...")
    start = time.time()

    try:
        if planner == "opus":
            plan_output, plan_cost, _ = await run_claude(plan_prompt, "claude-opus-4-20250514")
        else:
            plan_output, plan_cost, _ = await run_claude(plan_prompt, "claude-sonnet-4-20250514")

        total_cost += plan_cost
        phase_costs["planning"] = plan_cost
        print(f"    ✓ Plan created (${plan_cost:.4f})")

    except Exception as e:
        print(f"    ✗ Planning failed: {e}")
        return PipelineResult(
            pipeline_name=f"plan-execute-{planner}-{executor}",
            output="",
            total_cost=total_cost,
            error=f"Planning failed: {e}",
        )

    # Phase 2: Execution
    execute_prompt = f"""
Write a complete Svelte paper following this outline:

{plan_output}

{CANON_REFERENCE}

Requirements:
- Output a complete +page.svelte file
- <script> section with types defined inline
- Full HTML structure with ALL sections from the outline
- <style> section using Canon tokens (var(--token-name))
- Minimum 500 lines

Follow the outline exactly. Include all tables and comparisons specified.
"""

    print("  Phase 2: Executing...")

    try:
        if executor == "gemini-pro":
            exec_output, exec_cost, metadata = await run_gemini(execute_prompt, "gemini-2.5-pro")
        elif executor == "gemini-flash":
            exec_output, exec_cost, metadata = await run_gemini(execute_prompt, "gemini-2.5-flash")
        else:
            exec_output, exec_cost, metadata = await run_claude(execute_prompt, "claude-sonnet-4-20250514")

        total_cost += exec_cost
        phase_costs["execution"] = exec_cost
        duration = time.time() - start

        line_count = len(exec_output.split('\n')) if exec_output else 0
        canon_score, anti_patterns = score_canon_compliance(exec_output)
        structure_score = score_structure(exec_output)

        print(f"    ✓ Executed (${exec_cost:.4f})")
        print(f"  Total: ${total_cost:.4f} in {duration:.1f}s")
        print(f"  Lines: {line_count}")
        print(f"  Canon: {canon_score:.1f}%")
        print(f"  Structure: {structure_score:.1f}%")

        return PipelineResult(
            pipeline_name=f"plan-execute-{planner}-{executor}",
            output=exec_output,
            total_cost=total_cost,
            phase_costs=phase_costs,
            duration_seconds=duration,
            line_count=line_count,
            canon_score=canon_score,
            anti_pattern_count=anti_patterns,
            structure_score=structure_score,
            metadata=metadata,
        )

    except Exception as e:
        print(f"    ✗ Execution failed: {e}")
        return PipelineResult(
            pipeline_name=f"plan-execute-{planner}-{executor}",
            output="",
            total_cost=total_cost,
            phase_costs=phase_costs,
            error=f"Execution failed: {e}",
        )


async def pipeline_plan_validate_execute(planner: str, validator: str, executor: str) -> PipelineResult:
    """Full Subtractive Triad: Plan→Validate→Execute."""
    print(f"\n{'='*60}")
    print(f"Pipeline: Plan→Validate→Execute ({planner}→{validator}→{executor})")
    print(f"{'='*60}")

    total_cost = 0.0
    phase_costs = {}
    start = time.time()

    # Phase 1: Planning (Opus)
    plan_prompt = f"""
Create a detailed architecture for a research paper about multi-model pipeline optimization.

{PAPER_TOPIC}

Output:
1. Paper structure with exact section titles
2. Key claims with supporting evidence needed
3. Data tables with exact columns and sample data
4. Visual elements (cards, quotes, code blocks)
5. Canon tokens to use for each element type
6. Quality checklist for the executor

This plan will be validated, then given to another model to write.
"""

    print("  Phase 1: Planning (Opus)...")

    try:
        plan_output, plan_cost, _ = await run_claude(plan_prompt, "claude-opus-4-20250514")
        total_cost += plan_cost
        phase_costs["planning"] = plan_cost
        print(f"    ✓ Plan created (${plan_cost:.4f})")
    except Exception as e:
        return PipelineResult(
            pipeline_name=f"triad-{planner}-{validator}-{executor}",
            output="",
            total_cost=total_cost,
            error=f"Planning failed: {e}",
        )

    # Phase 2: Validation (Sonnet)
    validate_prompt = f"""
Review this paper plan for completeness and Canon compliance:

{plan_output}

Check:
1. Are all required sections present?
2. Are Canon tokens correctly specified?
3. Is there enough detail for execution?
4. Are the claims specific and measurable?

Output:
- APPROVED if ready, or
- REVISION NEEDED with specific fixes

If approved, add any clarifying notes for the executor.
"""

    print("  Phase 2: Validating (Sonnet)...")

    try:
        validate_output, validate_cost, _ = await run_claude(validate_prompt, "claude-sonnet-4-20250514")
        total_cost += validate_cost
        phase_costs["validation"] = validate_cost
        print(f"    ✓ Validated (${validate_cost:.4f})")
    except Exception as e:
        return PipelineResult(
            pipeline_name=f"triad-{planner}-{validator}-{executor}",
            output="",
            total_cost=total_cost,
            phase_costs=phase_costs,
            error=f"Validation failed: {e}",
        )

    # Phase 3: Execution (Gemini Pro)
    execute_prompt = f"""
Write a complete Svelte paper following this validated plan:

## APPROVED PLAN
{plan_output}

## VALIDATOR NOTES
{validate_output}

{CANON_REFERENCE}

Requirements:
- Output a complete +page.svelte file
- Follow the plan EXACTLY
- Use ONLY Canon tokens (no custom CSS)
- Minimum 500 lines
- Include all tables and visual elements from plan
"""

    print("  Phase 3: Executing (Gemini Pro)...")

    try:
        exec_output, exec_cost, metadata = await run_gemini(execute_prompt, "gemini-2.5-pro")
        total_cost += exec_cost
        phase_costs["execution"] = exec_cost

        duration = time.time() - start
        line_count = len(exec_output.split('\n')) if exec_output else 0
        canon_score, anti_patterns = score_canon_compliance(exec_output)
        structure_score = score_structure(exec_output)

        print(f"    ✓ Executed (${exec_cost:.4f})")
        print(f"  Total: ${total_cost:.4f} in {duration:.1f}s")
        print(f"  Lines: {line_count}")
        print(f"  Canon: {canon_score:.1f}%")
        print(f"  Structure: {structure_score:.1f}%")

        return PipelineResult(
            pipeline_name=f"triad-{planner}-{validator}-{executor}",
            output=exec_output,
            total_cost=total_cost,
            phase_costs=phase_costs,
            duration_seconds=duration,
            line_count=line_count,
            canon_score=canon_score,
            anti_pattern_count=anti_patterns,
            structure_score=structure_score,
            metadata=metadata,
        )

    except Exception as e:
        return PipelineResult(
            pipeline_name=f"triad-{planner}-{validator}-{executor}",
            output="",
            total_cost=total_cost,
            phase_costs=phase_costs,
            error=f"Execution failed: {e}",
        )


def print_results_table(results: list[PipelineResult]):
    """Print comparison table."""
    print("\n" + "="*80)
    print("RESULTS COMPARISON")
    print("="*80)

    # Sort by quality/cost ratio
    def quality_score(r: PipelineResult) -> float:
        if r.error or r.total_cost == 0:
            return 0
        # Weighted: 40% canon, 30% structure, 20% lines, 10% inverse anti-patterns
        quality = (
            r.canon_score * 0.4 +
            r.structure_score * 0.3 +
            min(r.line_count / 5, 100) * 0.2 +
            max(0, 100 - r.anti_pattern_count * 10) * 0.1
        )
        return quality / (r.total_cost * 100)  # Normalize cost

    sorted_results = sorted(results, key=quality_score, reverse=True)

    print(f"\n{'Pipeline':<40} {'Cost':>8} {'Lines':>6} {'Canon':>6} {'Struct':>6} {'Anti':>5} {'Score':>8}")
    print("-"*80)

    for r in sorted_results:
        if r.error:
            print(f"{r.pipeline_name:<40} {'FAILED':>8} {'-':>6} {'-':>6} {'-':>6} {'-':>5} {'-':>8}")
        else:
            score = quality_score(r)
            print(f"{r.pipeline_name:<40} ${r.total_cost:>6.4f} {r.line_count:>6} {r.canon_score:>5.1f}% {r.structure_score:>5.1f}% {r.anti_pattern_count:>5} {score:>7.2f}")

    print("-"*80)

    # Best overall
    valid_results = [r for r in sorted_results if not r.error]
    if valid_results:
        best = valid_results[0]
        print(f"\n🏆 BEST VALUE: {best.pipeline_name}")
        print(f"   Cost: ${best.total_cost:.4f}")
        print(f"   Quality: Canon {best.canon_score:.1f}%, Structure {best.structure_score:.1f}%")

        if best.phase_costs:
            print(f"   Breakdown: {', '.join(f'{k}: ${v:.4f}' for k, v in best.phase_costs.items())}")


async def main():
    """Run the experiment."""
    print("="*60)
    print("Multi-Model Paper Generation Pipeline Experiment")
    print("="*60)
    print(f"Started: {time.strftime('%Y-%m-%d %H:%M:%S')}")

    results: list[PipelineResult] = []

    # Single-pass approaches
    print("\n\n### SINGLE-PASS APPROACHES ###")

    # Gemini Pro (recommended baseline)
    results.append(await pipeline_single_pass("Gemini-Pro", "gemini-2.5-pro", is_gemini=True))

    # Gemini Flash (cheapest)
    results.append(await pipeline_single_pass("Gemini-Flash", "gemini-2.5-flash", is_gemini=True))

    # Plan→Execute approaches
    print("\n\n### PLAN→EXECUTE APPROACHES ###")

    # Sonnet plans, Gemini Pro executes
    results.append(await pipeline_plan_execute("sonnet", "gemini-pro"))

    # Opus plans, Gemini Pro executes
    results.append(await pipeline_plan_execute("opus", "gemini-pro"))

    # Full Subtractive Triad
    print("\n\n### SUBTRACTIVE TRIAD (PLAN→VALIDATE→EXECUTE) ###")

    # Opus→Sonnet→Gemini Pro
    results.append(await pipeline_plan_validate_execute("opus", "sonnet", "gemini-pro"))

    # Print comparison
    print_results_table(results)

    # Save results
    output_dir = SDK_DIR / "experiments"
    output_dir.mkdir(exist_ok=True)

    results_file = output_dir / f"pipeline-experiment-{time.strftime('%Y%m%d-%H%M%S')}.json"

    results_data = []
    for r in results:
        results_data.append({
            "pipeline": r.pipeline_name,
            "cost": r.total_cost,
            "phase_costs": r.phase_costs,
            "duration": r.duration_seconds,
            "lines": r.line_count,
            "canon_score": r.canon_score,
            "structure_score": r.structure_score,
            "anti_patterns": r.anti_pattern_count,
            "error": r.error,
        })

    with open(results_file, "w") as f:
        json.dump({
            "timestamp": time.strftime('%Y-%m-%d %H:%M:%S'),
            "results": results_data,
        }, f, indent=2)

    print(f"\n📊 Results saved to: {results_file}")

    # Save best output
    valid = [r for r in results if not r.error and r.output]
    if valid:
        best = max(valid, key=lambda r: r.canon_score + r.structure_score)
        output_file = output_dir / f"best-output-{best.pipeline_name}.svelte"
        with open(output_file, "w") as f:
            f.write(best.output)
        print(f"📄 Best output saved to: {output_file}")


if __name__ == "__main__":
    asyncio.run(main())
