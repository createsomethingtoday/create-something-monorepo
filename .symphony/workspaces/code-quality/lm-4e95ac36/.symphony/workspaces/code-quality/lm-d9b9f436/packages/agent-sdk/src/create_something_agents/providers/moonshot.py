"""
Moonshot Provider

Moonshot AI Kimi K2 implementation for cost-effective agent execution.
Best for: frontend/UI tasks, code generation, refactoring.

Cost comparison (per 1M tokens, Jan 2026):
- Kimi K2 (cache miss): $0.60 input, $2.50 output
- Kimi K2 (cache hit): $0.15 input, $2.50 output
- Claude Haiku: $1.00 input, $5.00 output
- Claude Sonnet: $3.00 input, $15.00 output

Kimi K2 is 40% cheaper than Haiku and 80% cheaper than Sonnet.
Automatic context caching provides additional savings on repeated context.

API: OpenAI-compatible (https://platform.moonshot.ai/docs/guide/migrating-from-openai-to-kimi)
"""

import os
from typing import Any

from openai import OpenAI

from .base import AgentProvider, ProviderConfig, ProviderResult


# Cost per 1M tokens (as of Jan 2026)
# https://platform.moonshot.ai/docs/pricing/chat
MOONSHOT_COSTS = {
    # Kimi K2 series (256K context)
    "kimi-k2-0905-preview": {"input": 0.60, "output": 2.50, "cached": 0.15},
    "kimi-k2-0711-preview": {"input": 0.60, "output": 2.50, "cached": 0.15},
    "kimi-k2-turbo-preview": {"input": 1.15, "output": 8.00, "cached": 0.15},
    "kimi-k2-thinking": {"input": 0.60, "output": 2.50, "cached": 0.15},
    "kimi-k2-thinking-turbo": {"input": 1.15, "output": 8.00, "cached": 0.15},
    # Kimi Latest (tiered by context)
    "kimi-latest": {"input": 0.20, "output": 2.00, "cached": 0.15},
    # Moonshot v1 series (legacy)
    "moonshot-v1-8k": {"input": 0.20, "output": 2.00},
    "moonshot-v1-32k": {"input": 1.00, "output": 3.00},
    "moonshot-v1-128k": {"input": 2.00, "output": 5.00},
    # Aliases
    "kimi-k2": {"input": 0.60, "output": 2.50, "cached": 0.15},
    "kimi-k2-turbo": {"input": 1.15, "output": 8.00, "cached": 0.15},
    "kimi-thinking": {"input": 0.60, "output": 2.50, "cached": 0.15},
}

MODEL_ALIASES = {
    "kimi-k2": "kimi-k2-0905-preview",          # Best quality, 256K context
    "kimi-k2-turbo": "kimi-k2-turbo-preview",   # Fast (60-100 tok/s)
    "kimi-thinking": "kimi-k2-thinking",         # Deep reasoning
    "kimi-thinking-turbo": "kimi-k2-thinking-turbo",
    "kimi-latest": "kimi-latest",                # Auto-selects context tier
}

# Models that support thinking/reasoning
THINKING_MODELS = {
    "kimi-k2-thinking",
    "kimi-k2-thinking-turbo",
}


class MoonshotProvider(AgentProvider):
    """Moonshot AI provider using OpenAI-compatible SDK.

    Kimi K2 offers:
    - 5-6x cost savings vs Claude Sonnet
    - 40% savings vs Claude Haiku
    - Enhanced frontend/UI coding capabilities
    - 256K context window
    - Automatic context caching
    - Tool calls, JSON mode, partial mode support
    """

    name = "moonshot"

    def __init__(self, api_key: str | None = None, base_url: str | None = None):
        """Initialize Moonshot provider.

        Args:
            api_key: Moonshot API key. Falls back to MOONSHOT_API_KEY env var.
            base_url: API base URL. Defaults to https://api.moonshot.ai/v1
        """
        self.api_key = api_key or os.environ.get("MOONSHOT_API_KEY")
        if not self.api_key:
            raise ValueError("MOONSHOT_API_KEY not set")

        self.base_url = base_url or "https://api.moonshot.ai/v1"

        # Use OpenAI SDK with Moonshot endpoint
        self.client = OpenAI(
            api_key=self.api_key,
            base_url=self.base_url,
        )

    def _resolve_model(self, model: str | None) -> str:
        """Resolve model alias to full name."""
        if model is None:
            return "kimi-k2-0905-preview"
        return MODEL_ALIASES.get(model, model)

    def _is_thinking_model(self, model: str) -> bool:
        """Check if model supports thinking/reasoning."""
        return model in THINKING_MODELS

    async def execute(self, config: ProviderConfig) -> ProviderResult:
        """Execute task with Kimi K2.

        Uses OpenAI-compatible API for seamless integration.
        """
        model_name = self._resolve_model(config.model)
        is_thinking = self._is_thinking_model(model_name)

        try:
            # Build messages
            messages: list[dict[str, Any]] = []

            if config.system_prompt:
                messages.append({"role": "system", "content": config.system_prompt})

            # Use structured messages if provided, otherwise wrap task
            if config.messages:
                messages.extend(config.messages)
            else:
                messages.append({"role": "user", "content": config.task})

            # Build request kwargs
            kwargs: dict[str, Any] = {
                "model": model_name,
                "messages": messages,
                "max_tokens": config.max_tokens,
            }

            if config.temperature > 0:
                kwargs["temperature"] = config.temperature

            if config.tools:
                kwargs["tools"] = config.tools

            # Execute request
            response = self.client.chat.completions.create(**kwargs)

            # Extract response
            output = ""
            tool_calls: list[dict[str, Any]] = []

            if response.choices and response.choices[0].message:
                message = response.choices[0].message
                output = message.content or ""

                # Handle tool calls
                if message.tool_calls:
                    tool_calls = [
                        {
                            "id": tc.id,
                            "type": tc.type,
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments,
                            },
                        }
                        for tc in message.tool_calls
                    ]

            # Get token counts
            input_tokens = 0
            output_tokens = 0
            cached_tokens = 0

            if response.usage:
                input_tokens = response.usage.prompt_tokens or 0
                output_tokens = response.usage.completion_tokens or 0
                # Moonshot reports cached tokens in prompt_tokens_details
                if hasattr(response.usage, "prompt_tokens_details"):
                    details = response.usage.prompt_tokens_details
                    if details and hasattr(details, "cached_tokens"):
                        cached_tokens = details.cached_tokens or 0

            # Calculate cost (accounting for cached tokens)
            cost = self.estimate_cost(
                input_tokens, output_tokens, model_name, cached_tokens
            )

            return ProviderResult(
                success=True,
                output=output,
                model=model_name,
                provider=self.name,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                cost_usd=cost,
                tool_calls=tool_calls,
                iterations=1,
                metadata={
                    "thinking_enabled": is_thinking,
                    "cached_tokens": cached_tokens,
                },
            )

        except Exception as e:
            return ProviderResult(
                success=False,
                output="",
                model=model_name,
                provider=self.name,
                error=str(e),
            )

    def estimate_cost(
        self,
        input_tokens: int,
        output_tokens: int,
        model: str,
        cached_tokens: int = 0,
    ) -> float:
        """Calculate cost based on token usage.

        Moonshot has automatic context caching - cached tokens are charged
        at the lower "cached" rate ($0.15/M vs $0.60/M for kimi-k2).
        """
        model_key = model if model in MOONSHOT_COSTS else "kimi-k2"
        costs = MOONSHOT_COSTS.get(model_key, MOONSHOT_COSTS["kimi-k2"])

        # Non-cached input tokens
        non_cached_input = max(0, input_tokens - cached_tokens)

        # Calculate input cost (cached vs non-cached)
        cached_rate = costs.get("cached", costs["input"])
        non_cached_cost = (non_cached_input / 1_000_000) * costs["input"]
        cached_cost = (cached_tokens / 1_000_000) * cached_rate

        # Output cost
        output_cost = (output_tokens / 1_000_000) * costs["output"]

        return non_cached_cost + cached_cost + output_cost

    def get_default_model(self, complexity: str) -> str:
        """Get default model for complexity level.

        Model selection:
        - trivial/simple: kimi-k2 (cost-effective, 256K context)
        - standard: kimi-k2 (same model, excellent for code)
        - complex: kimi-k2-thinking (deep reasoning)
        - For speed-critical: use kimi-k2-turbo variants
        """
        mapping = {
            "trivial": "kimi-k2-0905-preview",      # Standard K2 is already cheap
            "simple": "kimi-k2-0905-preview",       # Great for simple coding
            "standard": "kimi-k2-0905-preview",     # Excellent for features
            "complex": "kimi-k2-thinking",          # Deep reasoning when needed
            "architecture": "kimi-k2-thinking",     # Thinking for design
        }
        return mapping.get(complexity, "kimi-k2-0905-preview")

    def get_turbo_model(self, thinking: bool = False) -> str:
        """Get the high-speed turbo variant.

        Args:
            thinking: Whether to use thinking-enabled turbo

        Returns:
            Model ID for turbo model (60-100 tok/s)
        """
        if thinking:
            return "kimi-k2-thinking-turbo"
        return "kimi-k2-turbo-preview"

    @property
    def available_models(self) -> list[str]:
        return [
            # Kimi K2 series (recommended)
            "kimi-k2-0905-preview",
            "kimi-k2-0711-preview",
            "kimi-k2-turbo-preview",
            "kimi-k2-thinking",
            "kimi-k2-thinking-turbo",
            # Kimi Latest
            "kimi-latest",
            # Moonshot v1 (legacy)
            "moonshot-v1-8k",
            "moonshot-v1-32k",
            "moonshot-v1-128k",
        ]

    @property
    def thinking_models(self) -> list[str]:
        """List of models that support thinking/reasoning."""
        return list(THINKING_MODELS)
