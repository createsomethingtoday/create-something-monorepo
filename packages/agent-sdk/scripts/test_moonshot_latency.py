#!/usr/bin/env python3
"""
Moonshot Latency Test

Quick test to measure Moonshot API latency from your location.
Important because Moonshot is China-based - latency may vary.

Usage:
    python scripts/test_moonshot_latency.py

Environment:
    MOONSHOT_API_KEY - Required
"""

import asyncio
import os
import sys
import time
from pathlib import Path
from statistics import mean, stdev

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from create_something_agents.providers.base import ProviderConfig
from create_something_agents.providers.moonshot import MoonshotProvider


async def test_latency(provider: MoonshotProvider, model: str, num_requests: int = 5) -> dict:
    """Test latency with multiple requests."""
    latencies: list[float] = []
    errors: list[str] = []

    print(f"\nTesting {model}...")

    for i in range(num_requests):
        config = ProviderConfig(
            task="Say 'Hello' and nothing else.",
            model=model,
            max_tokens=10,
            temperature=0.0,
        )

        start_time = time.perf_counter()
        try:
            result = await provider.execute(config)
            latency_ms = (time.perf_counter() - start_time) * 1000

            if result.success:
                latencies.append(latency_ms)
                print(f"  Request {i+1}: {latency_ms:.0f}ms")
            else:
                errors.append(result.error or "Unknown error")
                print(f"  Request {i+1}: FAILED - {result.error}")
        except Exception as e:
            errors.append(str(e))
            print(f"  Request {i+1}: ERROR - {e}")

    if latencies:
        return {
            "model": model,
            "successful_requests": len(latencies),
            "failed_requests": len(errors),
            "min_latency_ms": min(latencies),
            "max_latency_ms": max(latencies),
            "avg_latency_ms": mean(latencies),
            "stdev_latency_ms": stdev(latencies) if len(latencies) > 1 else 0,
        }
    else:
        return {
            "model": model,
            "successful_requests": 0,
            "failed_requests": len(errors),
            "errors": errors,
        }


async def main():
    """Main entry point."""
    print("=" * 60)
    print("Moonshot API Latency Test")
    print("=" * 60)

    if not os.environ.get("MOONSHOT_API_KEY"):
        print("\nERROR: MOONSHOT_API_KEY not set")
        print("Get your key at: https://platform.moonshot.ai/")
        sys.exit(1)

    provider = MoonshotProvider()

    # Test different models
    models = [
        "kimi-k2-0905-preview",      # Standard K2
        "kimi-k2-turbo-preview",      # Turbo variant
    ]

    results = []
    for model in models:
        result = await test_latency(provider, model, num_requests=5)
        results.append(result)

    # Print summary
    print("\n" + "=" * 60)
    print("LATENCY SUMMARY")
    print("=" * 60)

    for result in results:
        print(f"\n{result['model']}:")
        if result.get("successful_requests", 0) > 0:
            print(f"  Success rate: {result['successful_requests']}/5")
            print(f"  Min latency: {result['min_latency_ms']:.0f}ms")
            print(f"  Max latency: {result['max_latency_ms']:.0f}ms")
            print(f"  Avg latency: {result['avg_latency_ms']:.0f}ms")
            if result['stdev_latency_ms'] > 0:
                print(f"  Std dev: {result['stdev_latency_ms']:.0f}ms")
        else:
            print(f"  All requests failed")
            print(f"  Errors: {result.get('errors', [])}")

    # Recommendation
    print("\n" + "=" * 60)
    print("RECOMMENDATION")
    print("=" * 60)

    # Find best performing model
    successful_results = [r for r in results if r.get("successful_requests", 0) > 0]

    if successful_results:
        best = min(successful_results, key=lambda x: x["avg_latency_ms"])
        avg_latency = best["avg_latency_ms"]

        if avg_latency < 500:
            print(f"\nExcellent latency ({avg_latency:.0f}ms avg)!")
            print("Kimi K2 is suitable for real-time agent tasks.")
        elif avg_latency < 1500:
            print(f"\nAcceptable latency ({avg_latency:.0f}ms avg).")
            print("Kimi K2 is suitable for most agent tasks.")
            print("Consider using turbo variant for latency-sensitive paths.")
        elif avg_latency < 3000:
            print(f"\nModerate latency ({avg_latency:.0f}ms avg).")
            print("Kimi K2 is best for batch/async tasks.")
            print("Keep Claude as primary for interactive workloads.")
        else:
            print(f"\nHigh latency ({avg_latency:.0f}ms avg).")
            print("Consider limiting Kimi K2 to batch processing only.")
            print("Geographic distance to China servers likely causing latency.")
    else:
        print("\nAll tests failed. Check your API key and network connection.")


if __name__ == "__main__":
    asyncio.run(main())
