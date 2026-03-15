"""
Base agent implementation using Anthropic's official SDK.

The agent recedes into transparent use. You think about tasks, not infrastructure.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, Callable

import anthropic
from anthropic.types import (
    ContentBlock,
    Message,
    TextBlock,
    ToolResultBlockParam,
    ToolUseBlock,
)

if TYPE_CHECKING:
    from create_something_agents.hooks.stop import StopHook


@dataclass
class AgentConfig:
    """Configuration for a CREATE SOMETHING agent."""

    task: str
    model: str = "claude-sonnet-4-20250514"
    tools: list[dict[str, Any]] = field(default_factory=list)
    stop_hooks: list[StopHook] = field(default_factory=list)
    skills: list[str] = field(default_factory=list)
    max_turns: int = 50
    cwd: str | None = None
    system_prompt: str | None = None

    def __post_init__(self) -> None:
        if self.cwd is None:
            self.cwd = os.getcwd()


@dataclass
class AgentResult:
    """Result from an agent run."""

    output: str
    model: str
    input_tokens: int
    output_tokens: int
    cost_usd: float
    tool_calls: list[dict[str, Any]]
    success: bool
    iterations: int = 0


# Cost per million tokens (approximate, as of 2025)
MODEL_COSTS: dict[str, tuple[float, float]] = {
    "claude-sonnet-4-20250514": (3.0, 15.0),  # (input, output) per million
    "claude-opus-4-20250514": (15.0, 75.0),
    "claude-3-5-haiku-20241022": (0.80, 4.0),  # Haiku 3.5
    "claude-3-haiku-20240307": (0.25, 1.25),   # Haiku 3 (legacy)
}


def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Calculate cost in USD based on token usage."""
    costs = MODEL_COSTS.get(model, (3.0, 15.0))  # Default to Sonnet pricing
    input_cost = (input_tokens / 1_000_000) * costs[0]
    output_cost = (output_tokens / 1_000_000) * costs[1]
    return input_cost + output_cost


class CreateSomethingAgent:
    """
    Base agent with CREATE SOMETHING patterns integrated.

    Uses Anthropic's official SDK for reliability while adding:
    - Skills system for progressive context
    - Stop hooks for Ralph-style iteration
    - Beads integration for cross-session persistence
    - Tool execution with full subprocess access
    """

    def __init__(self, config: AgentConfig) -> None:
        self.config = config
        self.client = anthropic.Anthropic()
        self._tool_handlers: dict[str, Callable[..., Any]] = {}
        self._system_prompt: str | None = config.system_prompt

    @property
    def system_prompt(self) -> str:
        """Build system prompt including loaded skills."""
        if self._system_prompt:
            return self._system_prompt

        base = "You are a CREATE SOMETHING agent. Work systematically and thoroughly."

        # Load skills as context
        if self.config.skills:
            from create_something_agents.skills import load_skill

            for skill_name in self.config.skills:
                skill_content = load_skill(skill_name, cwd=self.config.cwd)
                if skill_content:
                    base += f"\n\n## {skill_name}\n{skill_content}"

        return base

    @system_prompt.setter
    def system_prompt(self, value: str) -> None:
        """Set custom system prompt."""
        self._system_prompt = value

    def register_tool_handler(
        self, tool_name: str, handler: Callable[..., Any]
    ) -> None:
        """Register a handler function for a tool."""
        self._tool_handlers[tool_name] = handler

    def _get_default_tools(self) -> list[dict[str, Any]]:
        """Return default tool definitions."""
        from create_something_agents.tools import (
            bash_tool,
            beads_tool,
            file_read_tool,
            file_write_tool,
        )

        return [bash_tool, file_read_tool, file_write_tool, beads_tool]

    def _get_default_handlers(self) -> dict[str, Callable[..., Any]]:
        """Return default tool handlers."""
        from create_something_agents.tools import (
            execute_bash,
            execute_beads,
            execute_file_read,
            execute_file_write,
        )

        return {
            "bash": execute_bash,
            "file_read": execute_file_read,
            "file_write": execute_file_write,
            "beads": execute_beads,
        }

    async def _execute_tool(self, tool_use: ToolUseBlock) -> str:
        """Execute a tool and return the result."""
        tool_name = tool_use.name
        tool_input = tool_use.input

        # Get handler
        handlers = {**self._get_default_handlers(), **self._tool_handlers}
        handler = handlers.get(tool_name)

        if handler is None:
            return f"Error: Unknown tool '{tool_name}'"

        try:
            # Handle both sync and async handlers
            import asyncio
            import inspect

            if inspect.iscoroutinefunction(handler):
                result = await handler(**tool_input)  # type: ignore[arg-type]
            else:
                # Run sync handler in executor
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(
                    None, lambda: handler(**tool_input)  # type: ignore[arg-type]
                )
            return str(result)
        except Exception as e:
            return f"Error executing {tool_name}: {e!s}"

    async def _check_stop_hooks(
        self, messages: list[dict[str, Any]], iteration: int
    ) -> tuple[bool, str | None]:
        """Check if any stop hook wants to stop or inject a prompt."""
        for hook in self.config.stop_hooks:
            decision = await hook.should_stop(
                messages=messages,
                iteration=iteration,
            )
            if decision.stop:
                return True, decision.reason
            if decision.inject_prompt:
                return False, decision.inject_prompt
        return False, None

    async def run(self) -> AgentResult:
        """
        Execute the agent task with iterative tool use.

        Returns AgentResult with output, cost, and metadata.
        """
        tools = self.config.tools or self._get_default_tools()
        messages: list[dict[str, Any]] = [{"role": "user", "content": self.config.task}]

        total_input_tokens = 0
        total_output_tokens = 0
        all_tool_calls: list[dict[str, Any]] = []
        iteration = 0

        while iteration < self.config.max_turns:
            iteration += 1

            # Call Claude
            response: Message = self.client.messages.create(
                model=self.config.model,
                max_tokens=8192,
                system=self.system_prompt,
                tools=tools,  # type: ignore[arg-type]
                messages=messages,
            )

            # Track tokens
            total_input_tokens += response.usage.input_tokens
            total_output_tokens += response.usage.output_tokens

            # Process response
            assistant_content: list[ContentBlock] = response.content
            messages.append({"role": "assistant", "content": assistant_content})

            # Check for tool use
            tool_uses = [
                block for block in assistant_content if isinstance(block, ToolUseBlock)
            ]

            if not tool_uses:
                # No tool use - check stop hooks
                should_stop, inject = await self._check_stop_hooks(messages, iteration)

                if should_stop:
                    break

                if inject:
                    # Inject prompt and continue
                    messages.append({"role": "user", "content": inject})
                    continue

                # Natural completion
                break

            # Execute tools
            tool_results: list[ToolResultBlockParam] = []
            for tool_use in tool_uses:
                result = await self._execute_tool(tool_use)
                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": tool_use.id,
                        "content": result,
                    }
                )
                all_tool_calls.append(
                    {
                        "name": tool_use.name,
                        "input": tool_use.input,
                        "output": result[:500],  # Truncate for logging
                    }
                )

            messages.append({"role": "user", "content": tool_results})

            # Check stop hooks after tool execution
            should_stop, inject = await self._check_stop_hooks(messages, iteration)
            if should_stop:
                break
            if inject:
                messages.append({"role": "user", "content": inject})

        # Extract final output
        output = ""
        for block in assistant_content:
            if isinstance(block, TextBlock):
                output += block.text

        return AgentResult(
            output=output,
            model=self.config.model,
            input_tokens=total_input_tokens,
            output_tokens=total_output_tokens,
            cost_usd=calculate_cost(
                self.config.model, total_input_tokens, total_output_tokens
            ),
            tool_calls=all_tool_calls,
            success=True,
            iterations=iteration,
        )
