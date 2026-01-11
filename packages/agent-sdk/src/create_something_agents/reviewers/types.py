"""
Reviewer Types

Type definitions for code review agents.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Literal


class ReviewerType(str, Enum):
    """Types of code reviewers."""

    SECURITY = "security"
    ARCHITECTURE = "architecture"
    QUALITY = "quality"
    CUSTOM = "custom"


class ReviewOutcome(str, Enum):
    """Possible outcomes from a review."""

    PASS = "pass"
    PASS_WITH_FINDINGS = "pass_with_findings"
    FAIL = "fail"
    ERROR = "error"


class FindingSeverity(str, Enum):
    """Severity levels for review findings."""

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


# Severity ordering for comparison
SEVERITY_ORDER = {
    FindingSeverity.CRITICAL: 0,
    FindingSeverity.HIGH: 1,
    FindingSeverity.MEDIUM: 2,
    FindingSeverity.LOW: 3,
    FindingSeverity.INFO: 4,
}


@dataclass
class ReviewFinding:
    """A single finding from a code review."""

    id: str
    severity: FindingSeverity
    category: str
    title: str
    description: str
    file: str | None = None
    line: int | None = None
    quote: str | None = None  # Verbatim code quote (required for architecture)
    suggestion: str | None = None


@dataclass
class ReviewResult:
    """Result from a code review session."""

    reviewer_id: str
    reviewer_type: ReviewerType
    outcome: ReviewOutcome
    findings: list[ReviewFinding]
    summary: str
    confidence: float  # 0.0-1.0
    duration_ms: float
    model: str | None = None
    provider: str | None = None
    cost_usd: float = 0.0
    error: str | None = None


@dataclass
class ReviewContext:
    """Context provided to a reviewer."""

    files_changed: list[str]
    git_diff: str
    completed_issues: list[dict[str, str]] = field(default_factory=list)
    checkpoint_summary: str | None = None
    full_harness_diff: str | None = None  # For architecture DRY detection


@dataclass
class ReviewerConfig:
    """Configuration for a reviewer."""

    id: str
    type: ReviewerType
    enabled: bool = True
    can_block: bool = False  # If True, FAIL outcome blocks the work
    custom_prompt: str | None = None
    include_patterns: list[str] | None = None  # Glob patterns to include
    exclude_patterns: list[str] | None = None  # Glob patterns to exclude
    min_severity: FindingSeverity | None = None  # Filter findings below this
    model_override: str | None = None  # Force specific model
    provider_override: Literal["claude", "gemini"] | None = None  # Force provider


def filter_findings_by_severity(
    findings: list[ReviewFinding],
    min_severity: FindingSeverity,
) -> list[ReviewFinding]:
    """Filter findings to only include those at or above minimum severity."""
    min_order = SEVERITY_ORDER[min_severity]
    return [f for f in findings if SEVERITY_ORDER[f.severity] <= min_order]


def get_outcome_icon(outcome: ReviewOutcome) -> str:
    """Get display icon for a review outcome."""
    icons = {
        ReviewOutcome.PASS: "✅",
        ReviewOutcome.PASS_WITH_FINDINGS: "⚠️",
        ReviewOutcome.FAIL: "❌",
        ReviewOutcome.ERROR: "💥",
    }
    return icons.get(outcome, "❓")
