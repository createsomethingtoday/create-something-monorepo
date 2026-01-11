"""
CREATE SOMETHING Agent SDK

Reliable Claude agents built on Anthropic's official SDK.
Multi-provider routing: Claude for reasoning, Gemini for cost-effective execution.
The tool recedes; the work remains.
"""

from create_something_agents.agent import (
    AgentConfig,
    AgentResult,
    CreateSomethingAgent,
)
from create_something_agents.tools import bash_tool, file_read_tool, file_write_tool, beads_tool
from create_something_agents.hooks import RalphStopHook, RalphConfig
from create_something_agents.reviewers import (
    CodeReviewer,
    ReviewerType,
    ReviewOutcome,
    FindingSeverity,
    ReviewFinding,
    ReviewResult,
    ReviewContext,
    ReviewerConfig,
    run_review,
)
from create_something_agents.extractors import (
    PatternExtractor,
    PatternCatalog,
    PatternCategory,
    Component,
    LayoutPattern,
    Interaction,
    ExtractionResult,
    extract_patterns,
)

__version__ = "0.1.0"

__all__ = [
    # Core
    "AgentConfig",
    "AgentResult",
    "CreateSomethingAgent",
    # Tools
    "bash_tool",
    "file_read_tool",
    "file_write_tool",
    "beads_tool",
    # Hooks
    "RalphStopHook",
    "RalphConfig",
    # Reviewers
    "CodeReviewer",
    "ReviewerType",
    "ReviewOutcome",
    "FindingSeverity",
    "ReviewFinding",
    "ReviewResult",
    "ReviewContext",
    "ReviewerConfig",
    "run_review",
    # Extractors
    "PatternExtractor",
    "PatternCatalog",
    "PatternCategory",
    "Component",
    "LayoutPattern",
    "Interaction",
    "ExtractionResult",
    "extract_patterns",
]
