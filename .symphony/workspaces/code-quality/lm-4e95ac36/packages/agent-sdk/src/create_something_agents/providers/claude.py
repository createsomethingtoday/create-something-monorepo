"""
Claude Provider

Anthropic Claude implementation for agent execution.
Best for: planning, complex reasoning, review, security-critical tasks.
"""

import os
from typing import Any

from anthropic import Anthropic

from .base import AgentProvider, ProviderConfig, ProviderResult


# Cost per 1M tokens (as of Jan 2025)
CLAUDE_COSTS = {
    "claude-3-5-haiku-20241022": {"input": 1.00, "output": 5.00},
    "claude-sonnet-4-20250514": {"input": 3.00, "output": 15.00},
    "claude-opus-4-20250514": {"input": 15.00, "output": 75.00},
    # Aliases
    "haiku": {"input": 1.00, "output": 5.00},
    "sonnet": {"input": 3.00, "output": 15.00},
    "opus": {"input": 15.00, "output": 75.00},
}

MODEL_ALIASES = {
    "haiku": "claude-3-5-haiku-20241022",
    "sonnet": "claude-sonnet-4-20250514",
    "opus": "claude-opus-4-20250514",
}


class ClaudeProvider(AgentProvider):
    """Claude provider using Anthropic SDK."""

    name = "claude"

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY not set")
        self.client = Anthropic(api_key=self.api_key)

    def _resolve_model(self, model: str | None) -> str:
        """Resolve model alias to full name."""
        if model is None:
            return "claude-sonnet-4-20250514"
        return MODEL_ALIASES.get(model, model)

    async def execute(self, config: ProviderConfig) -> ProviderResult:
        """Execute task with Claude using streaming to avoid timeout issues."""
        model = self._resolve_model(config.model)

        try:
            # Use structured messages if provided, otherwise wrap task as single user message
            if config.messages:
                messages = config.messages
            else:
                messages = [{"role": "user", "content": config.task}]

            kwargs: dict[str, Any] = {
                "model": model,
                "max_tokens": config.max_tokens,
                "messages": messages,
            }

            if config.system_prompt:
                kwargs["system"] = config.system_prompt

            if config.temperature > 0:
                kwargs["temperature"] = config.temperature

            if config.tools:
                kwargs["tools"] = config.tools

            # Use streaming to avoid "Streaming required for long operations" error
            output = ""
            input_tokens = 0
            output_tokens = 0

            with self.client.messages.stream(**kwargs) as stream:
                for text in stream.text_stream:
                    output += text

                # Get final message for usage stats
                final_message = stream.get_final_message()
                input_tokens = final_message.usage.input_tokens
                output_tokens = final_message.usage.output_tokens

            # Calculate cost
            cost = self.estimate_cost(input_tokens, output_tokens, model)

            return ProviderResult(
                success=True,
                output=output,
                model=model,
                provider=self.name,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                cost_usd=cost,
                iterations=1,
            )

        except Exception as e:
            return ProviderResult(
                success=False,
                output="",
                model=model,
                provider=self.name,
                error=str(e),
            )

    def estimate_cost(self, input_tokens: int, output_tokens: int, model: str) -> float:
        """Calculate cost based on token usage."""
        model_key = model if model in CLAUDE_COSTS else "sonnet"
        costs = CLAUDE_COSTS.get(model_key, CLAUDE_COSTS["sonnet"])

        input_cost = (input_tokens / 1_000_000) * costs["input"]
        output_cost = (output_tokens / 1_000_000) * costs["output"]

        return input_cost + output_cost

    def get_default_model(self, complexity: str) -> str:
        """Get default model for complexity level.

        Model hierarchy (cost-effective):
        - trivial/simple: Haiku for execution
        - standard: Sonnet for planning/review
        - complex/architecture: Opus (rare, high-impact only)
        """
        mapping = {
            "trivial": "claude-3-5-haiku-20241022",
            "simple": "claude-3-5-haiku-20241022",
            "standard": "claude-sonnet-4-20250514",  # Planning/review
            "complex": "claude-sonnet-4-20250514",   # Most "complex" is actually standard
            "architecture": "claude-opus-4-20250514",  # Reserved for true architecture
        }
        return mapping.get(complexity, "claude-sonnet-4-20250514")

    @property
    def available_models(self) -> list[str]:
        return [
            "claude-3-5-haiku-20241022",
            "claude-sonnet-4-20250514",
            "claude-opus-4-20250514",
        ]
