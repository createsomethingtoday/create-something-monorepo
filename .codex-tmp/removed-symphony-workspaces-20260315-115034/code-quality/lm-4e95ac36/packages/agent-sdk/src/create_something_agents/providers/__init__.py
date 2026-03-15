"""
Agent Providers

Multiple LLM backends for cost-effective agent execution.
- Claude: planning/review, complex reasoning, security-critical
- Gemini: trivial execution (cheapest)
- Moonshot: frontend/code tasks (5-6x cheaper than Claude Sonnet)
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

# Moonshot is optional - import only if available
try:
    from .moonshot import MoonshotProvider
    __all__.append("MoonshotProvider")
    MOONSHOT_AVAILABLE = True
except ImportError:
    MOONSHOT_AVAILABLE = False
