"""
Stop hooks for agent iteration control.

Ralph-style iteration: the prompt never changes—your work does.
Each iteration, Claude sees its previous work in files and Git history.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass
class StopDecision:
    """Decision from a stop hook."""

    stop: bool
    reason: str | None = None
    inject_prompt: str | None = None


class StopHook(ABC):
    """
    Base class for stop hooks.

    Stop hooks control when an agent iteration loop ends.
    They can:
    - Stop the loop (stop=True)
    - Continue with same context (stop=False, inject_prompt=None)
    - Continue with injected prompt (stop=False, inject_prompt="...")
    """

    @abstractmethod
    async def should_stop(
        self,
        messages: list[dict[str, Any]],
        iteration: int,
    ) -> StopDecision:
        """
        Decide whether to stop the agent loop.

        Args:
            messages: Conversation history
            iteration: Current iteration number (1-indexed)

        Returns:
            StopDecision with stop flag and optional prompt injection
        """
        pass


@dataclass
class RalphConfig:
    """Configuration for Ralph-style iteration."""

    prompt: str
    """The prompt to re-inject each iteration."""

    max_iterations: int = 15
    """Maximum iterations before forced stop."""

    completion_promise: str | None = None
    """String that signals task completion (e.g., '<promise>DONE</promise>')."""


class RalphStopHook(StopHook):
    """
    Ralph-style iteration: keep going until completion promise or max iterations.

    The technique: Prompt stays the same. Files change. Each iteration, Claude
    sees its own past work and refines it. Excellent for test-fix loops.

    Usage:
        agent = CreateSomethingAgent(AgentConfig(
            task="Fix failing tests",
            stop_hooks=[RalphStopHook(RalphConfig(
                prompt="Fix failing tests. Output <promise>DONE</promise> when all pass.",
                max_iterations=15,
                completion_promise="DONE"
            ))]
        ))

    The agent will iterate until:
    1. It outputs the completion promise, OR
    2. It reaches max_iterations

    Source: Ralph Wiggum technique by Geoffrey Huntley (ghuntley.com/ralph)
    """

    def __init__(self, config: RalphConfig) -> None:
        self.config = config
        self.iterations = 0

    async def should_stop(
        self,
        messages: list[dict[str, Any]],
        iteration: int,
    ) -> StopDecision:
        self.iterations = iteration

        # Get last assistant message
        last_message = ""
        for msg in reversed(messages):
            if msg.get("role") == "assistant":
                content = msg.get("content")
                if isinstance(content, str):
                    last_message = content
                elif isinstance(content, list):
                    # Extract text from content blocks
                    for block in content:
                        if hasattr(block, "text"):
                            last_message += block.text
                        elif isinstance(block, dict) and block.get("type") == "text":
                            last_message += block.get("text", "")
                break

        # Check completion promise
        if self.config.completion_promise:
            if self.config.completion_promise in last_message:
                return StopDecision(
                    stop=True,
                    reason=f"Completion promise met: '{self.config.completion_promise}'"
                )

        # Check max iterations
        if self.iterations >= self.config.max_iterations:
            return StopDecision(
                stop=True,
                reason=f"Max iterations ({self.config.max_iterations}) reached"
            )

        # Continue with same prompt (files have changed, agent sees its work)
        return StopDecision(
            stop=False,
            inject_prompt=self.config.prompt
        )


class VerificationStopHook(StopHook):
    """
    Stop hook that runs a verification command after each iteration.

    Useful for test-driven loops: run tests, stop if they pass.
    """

    def __init__(
        self,
        command: str,
        success_exit_code: int = 0,
        max_iterations: int = 20,
        prompt_on_failure: str | None = None,
    ) -> None:
        """
        Args:
            command: Bash command to run for verification
            success_exit_code: Exit code that indicates success (default 0)
            max_iterations: Maximum iterations before forced stop
            prompt_on_failure: Prompt to inject when verification fails
        """
        self.command = command
        self.success_exit_code = success_exit_code
        self.max_iterations = max_iterations
        self.prompt_on_failure = prompt_on_failure

    async def should_stop(
        self,
        messages: list[dict[str, Any]],
        iteration: int,
    ) -> StopDecision:
        import subprocess

        # Check max iterations
        if iteration >= self.max_iterations:
            return StopDecision(
                stop=True,
                reason=f"Max iterations ({self.max_iterations}) reached"
            )

        # Run verification command
        try:
            result = subprocess.run(
                self.command,
                shell=True,
                capture_output=True,
                timeout=120,
            )

            if result.returncode == self.success_exit_code:
                return StopDecision(
                    stop=True,
                    reason=f"Verification passed: {self.command}"
                )

            # Verification failed, continue
            prompt = self.prompt_on_failure
            if prompt is None:
                stderr = result.stderr.decode("utf-8", errors="replace")[:1000]
                prompt = f"Verification failed. Output:\n{stderr}\n\nFix the issues and try again."

            return StopDecision(
                stop=False,
                inject_prompt=prompt
            )

        except subprocess.TimeoutExpired:
            return StopDecision(
                stop=False,
                inject_prompt="Verification command timed out. Check for infinite loops or long-running processes."
            )
        except Exception as e:
            return StopDecision(
                stop=False,
                inject_prompt=f"Verification error: {e!s}"
            )
