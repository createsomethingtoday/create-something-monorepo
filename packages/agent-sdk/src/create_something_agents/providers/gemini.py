"""
Gemini Provider

Google Gemini implementation for cost-effective agent execution.
Best for: trivial tasks, simple execution, high-volume low-complexity work.

Cost comparison (per 1M tokens):
- Gemini Flash 2.0: ~$0.075 input, ~$0.30 output
- Claude Haiku: ~$1.00 input, ~$5.00 output
- Savings: ~10-15x for simple tasks

Migration Note (Jan 2025):
- Migrated from deprecated google-generativeai to google-genai SDK
- See: https://github.com/googleapis/python-genai
"""

import os
from typing import Any

from .base import AgentProvider, ProviderConfig, ProviderResult


# Cost per 1M tokens (as of Jan 2025)
# https://ai.google.dev/pricing
GEMINI_COSTS = {
    "gemini-2.0-flash-exp": {"input": 0.075, "output": 0.30},
    "gemini-2.5-flash": {"input": 0.075, "output": 0.30},
    "gemini-1.5-flash": {"input": 0.075, "output": 0.30},
    "gemini-1.5-pro": {"input": 1.25, "output": 5.00},
    "gemini-2.0-flash-thinking-exp": {"input": 0.075, "output": 0.30},
    # Aliases
    "flash": {"input": 0.075, "output": 0.30},
    "flash-8b": {"input": 0.075, "output": 0.30},
    "pro": {"input": 1.25, "output": 5.00},
}

MODEL_ALIASES = {
    "flash": "gemini-2.0-flash-exp",
    "flash-8b": "gemini-1.5-flash",
    "pro": "gemini-1.5-pro",
}


class GeminiProvider(AgentProvider):
    """Gemini provider using Google Gen AI SDK (google-genai)."""

    name = "gemini"

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY or GEMINI_API_KEY not set")

        # Import here to make gemini optional
        try:
            from google import genai
            from google.genai import types
            self.genai = genai
            self.types = types
            # Create client with API key
            self.client = genai.Client(api_key=self.api_key)
        except ImportError:
            raise ImportError(
                "google-genai not installed. "
                "Run: pip install 'create-something-agents[gemini]'"
            )

    def _resolve_model(self, model: str | None) -> str:
        """Resolve model alias to full name."""
        if model is None:
            return "gemini-2.0-flash-exp"
        return MODEL_ALIASES.get(model, model)

    async def execute(self, config: ProviderConfig) -> ProviderResult:
        """Execute task with Gemini."""
        model_name = self._resolve_model(config.model)

        try:
            # Build generation config
            gen_config_kwargs: dict[str, Any] = {}

            if config.max_tokens:
                gen_config_kwargs["max_output_tokens"] = config.max_tokens
            if config.temperature is not None:
                gen_config_kwargs["temperature"] = config.temperature
            if config.system_prompt:
                # System instruction can be string or list of strings
                gen_config_kwargs["system_instruction"] = config.system_prompt

            gen_config = self.types.GenerateContentConfig(**gen_config_kwargs)

            # Generate response using client
            response = self.client.models.generate_content(
                model=model_name,
                contents=config.task,
                config=gen_config,
            )

            # Extract output
            output = response.text if response.text else ""

            # Get token counts from usage_metadata
            input_tokens = 0
            output_tokens = 0

            if hasattr(response, "usage_metadata") and response.usage_metadata:
                input_tokens = getattr(response.usage_metadata, "prompt_token_count", 0) or 0
                output_tokens = getattr(response.usage_metadata, "candidates_token_count", 0) or 0

            # Calculate cost
            cost = self.estimate_cost(input_tokens, output_tokens, model_name)

            return ProviderResult(
                success=True,
                output=output,
                model=model_name,
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
                model=model_name,
                provider=self.name,
                error=str(e),
            )

    def estimate_cost(self, input_tokens: int, output_tokens: int, model: str) -> float:
        """Calculate cost based on token usage."""
        model_key = model if model in GEMINI_COSTS else "flash"
        costs = GEMINI_COSTS.get(model_key, GEMINI_COSTS["flash"])

        input_cost = (input_tokens / 1_000_000) * costs["input"]
        output_cost = (output_tokens / 1_000_000) * costs["output"]

        return input_cost + output_cost

    def get_default_model(self, complexity: str) -> str:
        """Get default model for complexity level.

        Gemini should primarily handle trivial/simple tasks.
        Complex tasks should route to Claude.
        """
        mapping = {
            "trivial": "gemini-1.5-flash",      # Cheapest available option
            "simple": "gemini-2.0-flash-exp",   # Best flash model
            "standard": "gemini-1.5-pro",       # Pro for standard
            "complex": "gemini-1.5-pro",        # But prefer Claude for complex
        }
        return mapping.get(complexity, "gemini-2.0-flash-exp")

    @property
    def available_models(self) -> list[str]:
        return [
            "gemini-2.0-flash-exp",
            "gemini-2.5-flash",
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-2.0-flash-thinking-exp",
        ]
