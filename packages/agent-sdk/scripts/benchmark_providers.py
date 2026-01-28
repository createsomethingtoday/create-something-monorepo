#!/usr/bin/env python3
"""
Provider Benchmark Script

Compares Kimi K2 (Moonshot) vs Claude Sonnet on frontend/code tasks.
Run this after setting up your MOONSHOT_API_KEY to validate quality and latency.

Usage:
    python scripts/benchmark_providers.py

Environment:
    ANTHROPIC_API_KEY - Required for Claude
    MOONSHOT_API_KEY - Required for Kimi K2

Results are saved to benchmark_results.json
"""

import asyncio
import json
import os
import time
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path

# Add parent to path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from create_something_agents.providers.base import ProviderConfig
from create_something_agents.providers.claude import ClaudeProvider
from create_something_agents.providers.moonshot import MoonshotProvider


@dataclass
class BenchmarkResult:
    """Result from a single benchmark task."""
    provider: str
    model: str
    task_name: str
    success: bool
    latency_ms: float
    input_tokens: int
    output_tokens: int
    cost_usd: float
    output_preview: str  # First 500 chars
    error: str | None = None


@dataclass
class BenchmarkSummary:
    """Summary of benchmark results."""
    timestamp: str
    total_tasks: int
    moonshot_results: list[BenchmarkResult]
    claude_results: list[BenchmarkResult]
    moonshot_avg_latency_ms: float
    claude_avg_latency_ms: float
    moonshot_total_cost: float
    claude_total_cost: float
    cost_savings_pct: float


# Frontend/code tasks for benchmarking
BENCHMARK_TASKS = [
    {
        "name": "svelte_component",
        "task": """Create a Svelte component called `GlassCard.svelte` with:
- A glass morphism effect using Tailwind CSS
- Props: title (string), description (string), icon (optional string)
- Hover animation that subtly lifts the card
- Use CSS variables for theming
Output only the complete component code.""",
    },
    {
        "name": "react_hook",
        "task": """Write a React custom hook called `useDebounce` that:
- Takes a value and delay (ms) as arguments
- Returns the debounced value
- Properly cleans up timeouts on unmount
- Includes TypeScript types
Output only the complete hook code.""",
    },
    {
        "name": "tailwind_form",
        "task": """Create a responsive contact form using Tailwind CSS:
- Fields: name, email, message (textarea)
- Mobile-first design
- Subtle animations on focus
- Accessible with proper labels and ARIA
Output only the HTML with Tailwind classes.""",
    },
    {
        "name": "typescript_utility",
        "task": """Write a TypeScript utility function called `deepMerge` that:
- Recursively merges two objects
- Handles arrays (concatenates by default)
- Has proper generic types
- Includes JSDoc documentation
Output only the complete function code.""",
    },
    {
        "name": "css_animation",
        "task": """Create a CSS animation for a loading spinner:
- Smooth infinite rotation
- Uses CSS custom properties for size/color
- Includes the HTML structure
- Works without JavaScript
Output only the CSS and HTML.""",
    },
]


async def run_task(provider, provider_name: str, model: str, task_info: dict) -> BenchmarkResult:
    """Run a single benchmark task."""
    config = ProviderConfig(
        task=task_info["task"],
        model=model,
        max_tokens=2000,
        temperature=0.0,
    )

    start_time = time.perf_counter()

    try:
        result = await provider.execute(config)
        latency_ms = (time.perf_counter() - start_time) * 1000

        return BenchmarkResult(
            provider=provider_name,
            model=model,
            task_name=task_info["name"],
            success=result.success,
            latency_ms=latency_ms,
            input_tokens=result.input_tokens,
            output_tokens=result.output_tokens,
            cost_usd=result.cost_usd,
            output_preview=result.output[:500] if result.output else "",
            error=result.error,
        )
    except Exception as e:
        latency_ms = (time.perf_counter() - start_time) * 1000
        return BenchmarkResult(
            provider=provider_name,
            model=model,
            task_name=task_info["name"],
            success=False,
            latency_ms=latency_ms,
            input_tokens=0,
            output_tokens=0,
            cost_usd=0.0,
            output_preview="",
            error=str(e),
        )


async def run_benchmark() -> BenchmarkSummary:
    """Run the full benchmark suite."""
    print("=" * 60)
    print("Provider Benchmark: Kimi K2 vs Claude Sonnet")
    print("=" * 60)

    # Check API keys
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("ERROR: ANTHROPIC_API_KEY not set")
        sys.exit(1)

    if not os.environ.get("MOONSHOT_API_KEY"):
        print("ERROR: MOONSHOT_API_KEY not set")
        print("Get your key at: https://platform.moonshot.ai/")
        sys.exit(1)

    # Initialize providers
    print("\nInitializing providers...")
    claude = ClaudeProvider()
    moonshot = MoonshotProvider()

    moonshot_results: list[BenchmarkResult] = []
    claude_results: list[BenchmarkResult] = []

    # Run tasks
    for i, task_info in enumerate(BENCHMARK_TASKS, 1):
        print(f"\n[{i}/{len(BENCHMARK_TASKS)}] Task: {task_info['name']}")

        # Run Moonshot (Kimi K2)
        print("  Running Kimi K2...", end=" ", flush=True)
        moonshot_result = await run_task(
            moonshot, "moonshot", "kimi-k2-0905-preview", task_info
        )
        moonshot_results.append(moonshot_result)
        if moonshot_result.success:
            print(f"OK ({moonshot_result.latency_ms:.0f}ms, ${moonshot_result.cost_usd:.4f})")
        else:
            print(f"FAILED: {moonshot_result.error}")

        # Run Claude Sonnet
        print("  Running Claude Sonnet...", end=" ", flush=True)
        claude_result = await run_task(
            claude, "claude", "claude-sonnet-4-20250514", task_info
        )
        claude_results.append(claude_result)
        if claude_result.success:
            print(f"OK ({claude_result.latency_ms:.0f}ms, ${claude_result.cost_usd:.4f})")
        else:
            print(f"FAILED: {claude_result.error}")

    # Calculate summaries
    moonshot_successful = [r for r in moonshot_results if r.success]
    claude_successful = [r for r in claude_results if r.success]

    moonshot_avg_latency = (
        sum(r.latency_ms for r in moonshot_successful) / len(moonshot_successful)
        if moonshot_successful else 0
    )
    claude_avg_latency = (
        sum(r.latency_ms for r in claude_successful) / len(claude_successful)
        if claude_successful else 0
    )

    moonshot_total_cost = sum(r.cost_usd for r in moonshot_results)
    claude_total_cost = sum(r.cost_usd for r in claude_results)

    cost_savings_pct = (
        ((claude_total_cost - moonshot_total_cost) / claude_total_cost * 100)
        if claude_total_cost > 0 else 0
    )

    summary = BenchmarkSummary(
        timestamp=datetime.now().isoformat(),
        total_tasks=len(BENCHMARK_TASKS),
        moonshot_results=moonshot_results,
        claude_results=claude_results,
        moonshot_avg_latency_ms=moonshot_avg_latency,
        claude_avg_latency_ms=claude_avg_latency,
        moonshot_total_cost=moonshot_total_cost,
        claude_total_cost=claude_total_cost,
        cost_savings_pct=cost_savings_pct,
    )

    # Print summary
    print("\n" + "=" * 60)
    print("BENCHMARK SUMMARY")
    print("=" * 60)
    print(f"\nTasks completed: {len(BENCHMARK_TASKS)}")
    print(f"\nKimi K2 (Moonshot):")
    print(f"  Success rate: {len(moonshot_successful)}/{len(moonshot_results)}")
    print(f"  Avg latency: {moonshot_avg_latency:.0f}ms")
    print(f"  Total cost: ${moonshot_total_cost:.4f}")
    print(f"\nClaude Sonnet:")
    print(f"  Success rate: {len(claude_successful)}/{len(claude_results)}")
    print(f"  Avg latency: {claude_avg_latency:.0f}ms")
    print(f"  Total cost: ${claude_total_cost:.4f}")
    print(f"\nCost Savings: {cost_savings_pct:.1f}%")

    if moonshot_avg_latency > claude_avg_latency:
        latency_diff = moonshot_avg_latency - claude_avg_latency
        print(f"Latency: Kimi K2 is {latency_diff:.0f}ms slower (may be due to geographic location)")
    else:
        latency_diff = claude_avg_latency - moonshot_avg_latency
        print(f"Latency: Kimi K2 is {latency_diff:.0f}ms faster")

    return summary


def save_results(summary: BenchmarkSummary):
    """Save benchmark results to JSON."""
    output_path = Path(__file__).parent.parent / "benchmark_results.json"

    # Convert dataclasses to dicts
    data = {
        "timestamp": summary.timestamp,
        "total_tasks": summary.total_tasks,
        "moonshot_results": [asdict(r) for r in summary.moonshot_results],
        "claude_results": [asdict(r) for r in summary.claude_results],
        "moonshot_avg_latency_ms": summary.moonshot_avg_latency_ms,
        "claude_avg_latency_ms": summary.claude_avg_latency_ms,
        "moonshot_total_cost": summary.moonshot_total_cost,
        "claude_total_cost": summary.claude_total_cost,
        "cost_savings_pct": summary.cost_savings_pct,
    }

    with open(output_path, "w") as f:
        json.dump(data, f, indent=2)

    print(f"\nResults saved to: {output_path}")


async def main():
    """Main entry point."""
    summary = await run_benchmark()
    save_results(summary)

    print("\n" + "=" * 60)
    print("Benchmark complete!")
    print("Review benchmark_results.json for detailed output comparison.")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
