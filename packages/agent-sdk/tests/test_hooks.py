"""Tests for CREATE SOMETHING Agent hooks."""

from __future__ import annotations

import pytest

from create_something_agents.hooks.stop import RalphConfig, RalphStopHook, StopDecision


class TestRalphStopHook:
    """Tests for Ralph-style stop hook."""

    @pytest.mark.asyncio
    async def test_stops_on_completion_promise(self) -> None:
        """Test that hook stops when completion promise is found."""
        config = RalphConfig(
            prompt="Fix tests",
            max_iterations=15,
            completion_promise="DONE",
        )
        hook = RalphStopHook(config)

        # Message contains the promise
        messages = [
            {"role": "user", "content": "Fix tests"},
            {"role": "assistant", "content": "I fixed the tests. <promise>DONE</promise>"},
        ]

        decision = await hook.should_stop(messages, iteration=1)
        assert decision.stop is True
        assert "Completion promise" in (decision.reason or "")

    @pytest.mark.asyncio
    async def test_continues_without_promise(self) -> None:
        """Test that hook continues when promise not found."""
        config = RalphConfig(
            prompt="Fix tests",
            max_iterations=15,
            completion_promise="DONE",
        )
        hook = RalphStopHook(config)

        messages = [
            {"role": "user", "content": "Fix tests"},
            {"role": "assistant", "content": "Still working on it..."},
        ]

        decision = await hook.should_stop(messages, iteration=1)
        assert decision.stop is False
        assert decision.inject_prompt == "Fix tests"

    @pytest.mark.asyncio
    async def test_stops_at_max_iterations(self) -> None:
        """Test that hook stops at max iterations."""
        config = RalphConfig(
            prompt="Fix tests",
            max_iterations=3,
        )
        hook = RalphStopHook(config)

        messages = [
            {"role": "user", "content": "Fix tests"},
            {"role": "assistant", "content": "Still working..."},
        ]

        # Should not stop at iteration 2
        decision = await hook.should_stop(messages, iteration=2)
        assert decision.stop is False

        # Should stop at iteration 3
        decision = await hook.should_stop(messages, iteration=3)
        assert decision.stop is True
        assert "Max iterations" in (decision.reason or "")

    @pytest.mark.asyncio
    async def test_handles_content_blocks(self) -> None:
        """Test that hook handles content block format."""
        config = RalphConfig(
            prompt="Fix tests",
            max_iterations=15,
            completion_promise="SUCCESS",
        )
        hook = RalphStopHook(config)

        # Simulated content block format
        messages = [
            {"role": "user", "content": "Fix tests"},
            {
                "role": "assistant",
                "content": [{"type": "text", "text": "Done! SUCCESS"}],
            },
        ]

        decision = await hook.should_stop(messages, iteration=1)
        assert decision.stop is True


class TestStopDecision:
    """Tests for StopDecision dataclass."""

    def test_stop_decision_defaults(self) -> None:
        """Test default values."""
        decision = StopDecision(stop=True)
        assert decision.stop is True
        assert decision.reason is None
        assert decision.inject_prompt is None

    def test_stop_decision_with_reason(self) -> None:
        """Test with reason."""
        decision = StopDecision(stop=True, reason="Task complete")
        assert decision.stop is True
        assert decision.reason == "Task complete"

    def test_continue_decision_with_prompt(self) -> None:
        """Test continue decision with prompt injection."""
        decision = StopDecision(stop=False, inject_prompt="Keep trying")
        assert decision.stop is False
        assert decision.inject_prompt == "Keep trying"
