"""
Base Agent Provider

Abstract interface for LLM providers (Claude, Gemini, etc.)
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class ProviderResult:
    """Result from any provider execution."""

    success: bool
    output: str
    model: str
    provider: str  # "claude" or "gemini"
    input_tokens: int = 0
    output_tokens: int = 0
    cost_usd: float = 0.0
    tool_calls: list[dict[str, Any]] = field(default_factory=list)
    iterations: int = 1
    error: str | None = None

    @property
    def total_tokens(self) -> int:
        return self.input_tokens + self.output_tokens


@dataclass
class ProviderConfig:
    """Configuration for provider execution."""

    task: str
    model: str | None = None  # Provider-specific model name
    system_prompt: str | None = None
    max_tokens: int = 4096
    temperature: float = 0.0
    tools: list[dict[str, Any]] | None = None
    max_iterations: int = 1  # For agentic loops


class AgentProvider(ABC):
    """Abstract base class for LLM providers."""

    name: str = "base"

    @abstractmethod
    async def execute(self, config: ProviderConfig) -> ProviderResult:
        """Execute a task with this provider."""
        pass

    @abstractmethod
    def estimate_cost(self, input_tokens: int, output_tokens: int, model: str) -> float:
        """Estimate cost for token usage."""
        pass

    @abstractmethod
    def get_default_model(self, complexity: str) -> str:
        """Get default model for a complexity level."""
        pass

    @property
    @abstractmethod
    def available_models(self) -> list[str]:
        """List available models for this provider."""
        pass
