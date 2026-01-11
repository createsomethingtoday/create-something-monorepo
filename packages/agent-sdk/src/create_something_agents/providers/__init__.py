"""
Agent Providers

Multiple LLM backends for cost-effective agent execution.
Claude for planning/review, Gemini for trivial execution.
"""

from .base import AgentProvider, ProviderResult
from .claude import ClaudeProvider
from .router import AgentRouter, RoutingDecision

__all__ = [
    "AgentProvider",
    "ProviderResult",
    "ClaudeProvider",
    "AgentRouter",
    "RoutingDecision",
]

# Gemini is optional - import only if available
try:
    from .gemini import GeminiProvider
    __all__.append("GeminiProvider")
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
