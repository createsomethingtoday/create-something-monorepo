"""
Gemini Provider

Google Gemini implementation for cost-effective agent execution.
Supports thinking/reasoning models for complex tasks.

Cost comparison (per 1M tokens, Jan 2026):
- Gemini 2.5 Flash: ~$0.15 input, ~$0.60 output (with thinking)
- Gemini 2.5 Pro: ~$1.25 input, ~$5.00 output (advanced thinking)
- Claude Haiku: ~$0.80 input, ~$4.00 output
- Claude Sonnet: ~$3.00 input, ~$15.00 output

Thinking models:
- gemini-2.5-flash: Hybrid reasoning with thinking budget control
- gemini-2.5-pro: Advanced reasoning for complex tasks

Migration Note (Jan 2025):
- Migrated from deprecated google-generativeai to google-genai SDK
- See: https://github.com/googleapis/python-genai
"""

import os
from typing import Any

from .base import AgentProvider, ProviderConfig, ProviderResult


# Cost per 1M tokens (as of Jan 2026)
# https://ai.google.dev/pricing
GEMINI_COSTS = {
    # 2.5 series with thinking
    "gemini-2.5-flash": {"input": 0.15, "output": 0.60, "thinking": 0.60},
    "gemini-2.5-pro": {"input": 1.25, "output": 5.00, "thinking": 5.00},
    # 2.0 series
    "gemini-2.0-flash-exp": {"input": 0.075, "output": 0.30},
    "gemini-2.0-flash": {"input": 0.075, "output": 0.30},
    # Aliases
    "flash": {"input": 0.075, "output": 0.30},
    "flash-thinking": {"input": 0.15, "output": 0.60, "thinking": 0.60},
    "pro": {"input": 1.25, "output": 5.00},
    "pro-thinking": {"input": 1.25, "output": 5.00, "thinking": 5.00},
}

MODEL_ALIASES = {
    "flash": "gemini-2.0-flash-exp",
    "flash-thinking": "gemini-2.5-flash",
    "pro": "gemini-2.5-pro",
    "pro-thinking": "gemini-2.5-pro",
    # Convenience aliases for paper generation
    "gemini-thinking": "gemini-2.5-flash",
    "gemini-pro-thinking": "gemini-2.5-pro",
}

# Models that support thinking/reasoning (2.5 series)
THINKING_MODELS = {
    "gemini-2.5-flash",
    "gemini-2.5-pro",
}


class GeminiProvider(AgentProvider):
    """Gemini provider using Google Gen AI SDK (google-genai).

    Supports thinking/reasoning models with configurable thinking budget.
    """

    name = "gemini"

    def __init__(self, api_key: str | None = None, thinking_budget: int | None = None):
        """Initialize Gemini provider.

        Args:
            api_key: Google API key. Falls back to GOOGLE_API_KEY or GEMINI_API_KEY env vars.
            thinking_budget: Token budget for thinking/reasoning (0-24576). Default: 8192.
        """
        self.api_key = api_key or os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY or GEMINI_API_KEY not set")

        self.thinking_budget = thinking_budget or 8192  # Default thinking budget

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

    def _is_thinking_model(self, model: str) -> bool:
        """Check if model supports thinking/reasoning."""
        return model in THINKING_MODELS

    async def execute(self, config: ProviderConfig) -> ProviderResult:
        """Execute task with Gemini.

        For thinking models, enables extended reasoning with configurable budget.
        """
        model_name = self._resolve_model(config.model)
        is_thinking = self._is_thinking_model(model_name)

        try:
            # Build generation config
            gen_config_kwargs: dict[str, Any] = {}

            if config.max_tokens:
                gen_config_kwargs["max_output_tokens"] = config.max_tokens
            if config.temperature is not None:
                gen_config_kwargs["temperature"] = config.temperature
            if config.system_prompt:
                gen_config_kwargs["system_instruction"] = config.system_prompt

            # Enable thinking for reasoning models
            if is_thinking:
                gen_config_kwargs["thinking_config"] = self.types.ThinkingConfig(
                    thinking_budget=self.thinking_budget
                )

            gen_config = self.types.GenerateContentConfig(**gen_config_kwargs)

            # Generate response using client
            response = self.client.models.generate_content(
                model=model_name,
                contents=config.task,
                config=gen_config,
            )

            # Extract output - handle thinking model response structure
            output = ""
            thinking_output = ""

            if response.candidates and response.candidates[0].content:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, "thought") and part.thought:
                        thinking_output += part.text + "\n"
                    elif hasattr(part, "text") and part.text:
                        output += part.text

            # Fallback to simple text extraction
            if not output and response.text:
                output = response.text

            # Get token counts from usage_metadata
            input_tokens = 0
            output_tokens = 0
            thinking_tokens = 0

            if hasattr(response, "usage_metadata") and response.usage_metadata:
                input_tokens = getattr(response.usage_metadata, "prompt_token_count", 0) or 0
                output_tokens = getattr(response.usage_metadata, "candidates_token_count", 0) or 0
                # Thinking tokens counted separately in 2.5 models
                thinking_tokens = getattr(response.usage_metadata, "thoughts_token_count", 0) or 0

            # Calculate cost (including thinking tokens)
            cost = self.estimate_cost(input_tokens, output_tokens, model_name, thinking_tokens)

            return ProviderResult(
                success=True,
                output=output,
                model=model_name,
                provider=self.name,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                cost_usd=cost,
                iterations=1,
                metadata={
                    "thinking_enabled": is_thinking,
                    "thinking_tokens": thinking_tokens,
                    "thinking_budget": self.thinking_budget if is_thinking else 0,
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
        self, input_tokens: int, output_tokens: int, model: str, thinking_tokens: int = 0
    ) -> float:
        """Calculate cost based on token usage, including thinking tokens."""
        model_key = model if model in GEMINI_COSTS else "flash"
        costs = GEMINI_COSTS.get(model_key, GEMINI_COSTS["flash"])

        input_cost = (input_tokens / 1_000_000) * costs["input"]
        output_cost = (output_tokens / 1_000_000) * costs["output"]

        # Thinking tokens are charged at output rate (or dedicated thinking rate if specified)
        thinking_rate = costs.get("thinking", costs["output"])
        thinking_cost = (thinking_tokens / 1_000_000) * thinking_rate

        return input_cost + output_cost + thinking_cost

    def get_default_model(self, complexity: str) -> str:
        """Get default model for complexity level.

        Gemini 2.5 with thinking for complex tasks.
        """
        mapping = {
            "trivial": "gemini-2.0-flash-exp",           # Cheapest, no thinking needed
            "simple": "gemini-2.0-flash-exp",            # Fast flash model
            "standard": "gemini-2.5-flash-preview-05-20", # Thinking for standard
            "complex": "gemini-2.5-pro-preview-05-06",    # Pro thinking for complex
        }
        return mapping.get(complexity, "gemini-2.0-flash-exp")

    def get_thinking_model(self, tier: str = "flash") -> str:
        """Get a thinking-enabled model.

        Args:
            tier: "flash" for fast+cheap, "pro" for advanced reasoning

        Returns:
            Model ID for thinking model
        """
        if tier == "pro":
            return "gemini-2.5-pro-preview-05-06"
        return "gemini-2.5-flash-preview-05-20"

    @property
    def available_models(self) -> list[str]:
        return [
            # 2.5 series (thinking)
            "gemini-2.5-flash-preview-05-20",
            "gemini-2.5-pro-preview-05-06",
            # 2.0 series
            "gemini-2.0-flash-exp",
            "gemini-2.0-flash-thinking-exp",
            # 1.5 series (legacy)
            "gemini-1.5-flash",
            "gemini-1.5-pro",
        ]

    @property
    def thinking_models(self) -> list[str]:
        """List of models that support thinking/reasoning."""
        return list(THINKING_MODELS)
