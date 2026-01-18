"""
RLM (Recursive Language Model) Module

Implements the RLM pattern from MIT CSAIL's paper "Recursive Language Models"
(arxiv:2512.24601). Key insight: long prompts should be treated as external
environment variables, not fed directly into the model.

Philosophy: The context recedes into the environment. The model orchestrates
code execution and sub-LM calls to process arbitrarily long inputs.

Usage:
    from create_something_agents.rlm import RLMEnvironment, RLMSession

    # Create session with large context
    session = RLMSession(
        context=massive_document_corpus,
        provider="claude",
        root_model="sonnet",
        sub_model="haiku",  # Cheaper for recursive calls
    )

    # Run RLM query
    result = await session.run("What patterns emerge across all documents?")
"""

from create_something_agents.rlm.environment import RLMEnvironment
from create_something_agents.rlm.session import RLMSession, RLMResult, RLMConfig

__all__ = [
    "RLMEnvironment",
    "RLMSession",
    "RLMResult",
    "RLMConfig",
]
