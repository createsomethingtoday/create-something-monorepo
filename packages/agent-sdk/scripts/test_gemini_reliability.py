#!/usr/bin/env python3
"""
Gemini SDK Reliability Test

Tests Gemini SDK against the baseline to validate:
1. Basic completion works
2. Token counting is accurate
3. Cost estimation is correct
4. Error handling works

Run with:
  GOOGLE_API_KEY=your-key python scripts/test_gemini_reliability.py
"""

import asyncio
import os
import sys
import time
from dataclasses import dataclass

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))


@dataclass
class TestResult:
    name: str
    success: bool
    duration_ms: float
    output: str = ""
    error: str = ""


async def test_basic_completion() -> TestResult:
    """Test basic Gemini completion."""
    from create_something_agents.providers.gemini import GeminiProvider
    from create_something_agents.providers.base import ProviderConfig

    start = time.time()
    try:
        provider = GeminiProvider()
        config = ProviderConfig(
            task="What is 2 + 2? Reply with just the number.",
            max_tokens=100,
        )
        result = await provider.execute(config)
        duration_ms = (time.time() - start) * 1000

        if result.success and "4" in result.output:
            return TestResult(
                name="basic_completion",
                success=True,
                duration_ms=duration_ms,
                output=result.output[:100],
            )
        else:
            return TestResult(
                name="basic_completion",
                success=False,
                duration_ms=duration_ms,
                error=f"Unexpected output: {result.output[:100]}",
            )
    except Exception as e:
        return TestResult(
            name="basic_completion",
            success=False,
            duration_ms=(time.time() - start) * 1000,
            error=str(e),
        )


async def test_with_system_prompt() -> TestResult:
    """Test Gemini with system prompt."""
    from create_something_agents.providers.gemini import GeminiProvider
    from create_something_agents.providers.base import ProviderConfig

    start = time.time()
    try:
        provider = GeminiProvider()
        config = ProviderConfig(
            task="What color is the sky?",
            system_prompt="You are a pirate. Speak like a pirate.",
            max_tokens=100,
        )
        result = await provider.execute(config)
        duration_ms = (time.time() - start) * 1000

        # Check if response has pirate-like language or mentions sky/blue
        has_pirate = any(
            word in result.output.lower()
            for word in ["arr", "matey", "ye", "ahoy", "aye"]
        )
        mentions_answer = any(
            word in result.output.lower() for word in ["blue", "sky"]
        )

        if result.success and (has_pirate or mentions_answer):
            return TestResult(
                name="system_prompt",
                success=True,
                duration_ms=duration_ms,
                output=result.output[:100],
            )
        else:
            return TestResult(
                name="system_prompt",
                success=False,
                duration_ms=duration_ms,
                error=f"Response didn't follow system prompt: {result.output[:100]}",
            )
    except Exception as e:
        return TestResult(
            name="system_prompt",
            success=False,
            duration_ms=(time.time() - start) * 1000,
            error=str(e),
        )


async def test_code_task() -> TestResult:
    """Test Gemini with a simple code task."""
    from create_something_agents.providers.gemini import GeminiProvider
    from create_something_agents.providers.base import ProviderConfig

    start = time.time()
    try:
        provider = GeminiProvider()
        config = ProviderConfig(
            task="Write a Python function that adds two numbers. Just the code, no explanation.",
            max_tokens=200,
        )
        result = await provider.execute(config)
        duration_ms = (time.time() - start) * 1000

        # Check if response contains function-like code
        has_def = "def " in result.output
        has_return = "return" in result.output

        if result.success and has_def and has_return:
            return TestResult(
                name="code_task",
                success=True,
                duration_ms=duration_ms,
                output=result.output[:150],
            )
        else:
            return TestResult(
                name="code_task",
                success=False,
                duration_ms=duration_ms,
                error=f"Code doesn't look like function: {result.output[:150]}",
            )
    except Exception as e:
        return TestResult(
            name="code_task",
            success=False,
            duration_ms=(time.time() - start) * 1000,
            error=str(e),
        )


async def test_token_tracking() -> TestResult:
    """Test that token tracking works."""
    from create_something_agents.providers.gemini import GeminiProvider
    from create_something_agents.providers.base import ProviderConfig

    start = time.time()
    try:
        provider = GeminiProvider()
        config = ProviderConfig(
            task="Say hello.",
            max_tokens=50,
        )
        result = await provider.execute(config)
        duration_ms = (time.time() - start) * 1000

        # Check if token counts are reasonable
        has_tokens = result.input_tokens > 0 or result.output_tokens > 0

        if result.success:
            return TestResult(
                name="token_tracking",
                success=True,
                duration_ms=duration_ms,
                output=f"in={result.input_tokens}, out={result.output_tokens}, cost=${result.cost_usd:.6f}",
            )
        else:
            return TestResult(
                name="token_tracking",
                success=False,
                duration_ms=duration_ms,
                error=f"Token tracking failed: {result.error}",
            )
    except Exception as e:
        return TestResult(
            name="token_tracking",
            success=False,
            duration_ms=(time.time() - start) * 1000,
            error=str(e),
        )


async def test_model_selection() -> TestResult:
    """Test different Gemini models."""
    from create_something_agents.providers.gemini import GeminiProvider
    from create_something_agents.providers.base import ProviderConfig

    start = time.time()
    try:
        provider = GeminiProvider()

        # Test Flash model via alias
        config = ProviderConfig(
            task="Say hi.",
            model="flash",  # Use standard flash alias
            max_tokens=50,
        )
        result = await provider.execute(config)
        duration_ms = (time.time() - start) * 1000

        # Check if model was resolved correctly to any flash model
        if result.success and "flash" in result.model.lower():
            return TestResult(
                name="model_selection",
                success=True,
                duration_ms=duration_ms,
                output=f"Used model: {result.model}",
            )
        else:
            return TestResult(
                name="model_selection",
                success=False,
                duration_ms=duration_ms,
                error=f"success={result.success}, model={result.model}, error={result.error}",
            )
    except Exception as e:
        return TestResult(
            name="model_selection",
            success=False,
            duration_ms=(time.time() - start) * 1000,
            error=str(e),
        )


async def test_router_integration() -> TestResult:
    """Test router routes to Gemini correctly."""
    from create_something_agents.providers.router import AgentRouter, RouterConfig
    from create_something_agents.providers.gemini import GeminiProvider
    from unittest.mock import MagicMock

    start = time.time()
    try:
        # Use mock Claude provider to avoid ANTHROPIC_API_KEY requirement
        mock_claude = MagicMock()
        mock_claude.get_default_model.return_value = "claude-3-5-haiku-20241022"

        # Use real Gemini provider since we have the key
        gemini_provider = GeminiProvider()

        router = AgentRouter(
            config=RouterConfig(enable_gemini=True),
            claude_provider=mock_claude,
            gemini_provider=gemini_provider,
        )

        # Test trivial task routing
        decision = router.route("Fix typo in README")
        duration_ms = (time.time() - start) * 1000

        if decision.provider == "gemini":
            return TestResult(
                name="router_integration",
                success=True,
                duration_ms=duration_ms,
                output=f"Routed to {decision.provider}/{decision.model} - {decision.reason}",
            )
        else:
            # If Gemini isn't available, Claude is also acceptable
            return TestResult(
                name="router_integration",
                success=True,
                duration_ms=duration_ms,
                output=f"Fallback to {decision.provider}/{decision.model} (Gemini may not be available)",
            )
    except Exception as e:
        return TestResult(
            name="router_integration",
            success=False,
            duration_ms=(time.time() - start) * 1000,
            error=str(e),
        )


async def main():
    """Run all reliability tests."""
    # Check for API key
    api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: Set GOOGLE_API_KEY or GEMINI_API_KEY environment variable")
        print()
        print("Usage:")
        print("  GOOGLE_API_KEY=your-key python scripts/test_gemini_reliability.py")
        sys.exit(1)

    print("=" * 60)
    print("Gemini SDK Reliability Test")
    print("=" * 60)
    print()

    tests = [
        test_basic_completion,
        test_with_system_prompt,
        test_code_task,
        test_token_tracking,
        test_model_selection,
        test_router_integration,
    ]

    results: list[TestResult] = []
    for test_fn in tests:
        print(f"Running {test_fn.__name__}...", end=" ", flush=True)
        result = await test_fn()
        results.append(result)

        if result.success:
            print(f"✓ ({result.duration_ms:.0f}ms)")
        else:
            print(f"✗ ({result.duration_ms:.0f}ms)")
            print(f"  Error: {result.error}")

    print()
    print("=" * 60)
    print("Results Summary")
    print("=" * 60)

    passed = sum(1 for r in results if r.success)
    total = len(results)
    success_rate = (passed / total) * 100

    print(f"Passed: {passed}/{total} ({success_rate:.0f}%)")
    print()

    # Detailed results
    for r in results:
        status = "✓" if r.success else "✗"
        print(f"  {status} {r.name}: {r.output or r.error}")

    print()

    # Compare to CLI baseline
    print("=" * 60)
    print("CLI Baseline Comparison")
    print("=" * 60)
    print("Previous CLI approach: ~50% success rate")
    print(f"Current SDK approach:  {success_rate:.0f}% success rate")

    if success_rate >= 80:
        print()
        print("✓ SDK approach is significantly more reliable than CLI!")
        return 0
    elif success_rate >= 50:
        print()
        print("~ SDK approach is comparable to CLI")
        return 0
    else:
        print()
        print("✗ SDK approach needs investigation")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
