"""
Code Review Agents

Multi-provider code review with specialized reviewers:
- Security: Pattern detection for vulnerabilities (Gemini Flash → Haiku)
- Architecture: Deep analysis for DRY/coupling (Sonnet → Opus)
- Quality: Balanced review for reliability (Haiku → Sonnet)
"""

from .types import (
    ReviewerType,
    ReviewOutcome,
    FindingSeverity,
    ReviewFinding,
    ReviewResult,
    ReviewContext,
    ReviewerConfig,
    filter_findings_by_severity,
    get_outcome_icon,
)
from .reviewer import CodeReviewer, run_review
from .prompts import (
    SECURITY_REVIEWER_PROMPT,
    ARCHITECTURE_REVIEWER_PROMPT,
    QUALITY_REVIEWER_PROMPT,
    get_prompt_for_reviewer,
)

__all__ = [
    # Types
    "ReviewerType",
    "ReviewOutcome",
    "FindingSeverity",
    "ReviewFinding",
    "ReviewResult",
    "ReviewContext",
    "ReviewerConfig",
    "filter_findings_by_severity",
    "get_outcome_icon",
    # Reviewer
    "CodeReviewer",
    "run_review",
    # Prompts
    "SECURITY_REVIEWER_PROMPT",
    "ARCHITECTURE_REVIEWER_PROMPT",
    "QUALITY_REVIEWER_PROMPT",
    "get_prompt_for_reviewer",
]
