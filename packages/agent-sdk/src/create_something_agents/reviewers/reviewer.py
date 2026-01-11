"""
Code Reviewer

Multi-provider code review with specialized reviewers.
Philosophy: Route to the most cost-effective provider that can handle the task.

Provider Routing:
- Security: Gemini Flash (pattern detection) → Haiku fallback
- Quality: Haiku (balanced review) → Sonnet fallback
- Architecture: Sonnet (deep analysis) → Opus fallback
"""

import json
import re
import time
from dataclasses import dataclass
from typing import Any

from ..providers.base import ProviderConfig, ProviderResult
from .types import (
    ReviewerType,
    ReviewOutcome,
    FindingSeverity,
    ReviewFinding,
    ReviewResult,
    ReviewContext,
    ReviewerConfig,
    filter_findings_by_severity,
)
from .prompts import get_prompt_for_reviewer


@dataclass
class ProviderPreference:
    """Provider preference for a reviewer type."""

    primary_provider: str  # "gemini" or "claude"
    primary_model: str
    fallback_provider: str
    fallback_model: str


# Multi-provider routing by reviewer type
REVIEWER_ROUTING: dict[ReviewerType, ProviderPreference] = {
    # Security: Pattern detection is cheap - use Gemini Flash
    ReviewerType.SECURITY: ProviderPreference(
        primary_provider="gemini",
        primary_model="gemini-2.0-flash-exp",
        fallback_provider="claude",
        fallback_model="claude-3-5-haiku-20241022",
    ),
    # Quality: Balanced review - use Haiku, fallback to Sonnet
    ReviewerType.QUALITY: ProviderPreference(
        primary_provider="claude",
        primary_model="claude-3-5-haiku-20241022",
        fallback_provider="claude",
        fallback_model="claude-sonnet-4-20250514",
    ),
    # Architecture: Deep analysis needs reasoning - use Sonnet
    ReviewerType.ARCHITECTURE: ProviderPreference(
        primary_provider="claude",
        primary_model="claude-sonnet-4-20250514",
        fallback_provider="claude",
        fallback_model="claude-opus-4-20250514",
    ),
    # Custom: Default to Sonnet
    ReviewerType.CUSTOM: ProviderPreference(
        primary_provider="claude",
        primary_model="claude-sonnet-4-20250514",
        fallback_provider="claude",
        fallback_model="claude-opus-4-20250514",
    ),
}

# Cost estimates per request (approximate)
COST_ESTIMATES = {
    "gemini-2.0-flash-exp": 0.0001,
    "gemini-1.5-flash": 0.0001,
    "gemini-1.5-pro": 0.0005,
    "claude-3-5-haiku-20241022": 0.001,
    "claude-sonnet-4-20250514": 0.01,
    "claude-opus-4-20250514": 0.10,
}


class CodeReviewer:
    """
    Multi-provider code reviewer.

    Routes reviews to the most cost-effective provider:
    - Security: Gemini Flash (~$0.0001) for pattern detection
    - Quality: Haiku (~$0.001) for balanced review
    - Architecture: Sonnet (~$0.01) for deep analysis
    """

    def __init__(
        self,
        claude_provider: Any | None = None,
        gemini_provider: Any | None = None,
    ):
        """
        Initialize the code reviewer.

        Args:
            claude_provider: ClaudeProvider instance (optional)
            gemini_provider: GeminiProvider instance (optional)
        """
        self.claude_provider = claude_provider
        self.gemini_provider = gemini_provider
        self._failure_counts: dict[str, int] = {}

    def _get_provider(self, provider_name: str) -> Any | None:
        """Get provider by name."""
        if provider_name == "claude":
            return self.claude_provider
        elif provider_name == "gemini":
            return self.gemini_provider
        return None

    def _should_escalate(self, reviewer_id: str, threshold: int = 2) -> bool:
        """Check if we should escalate to fallback due to failures."""
        return self._failure_counts.get(reviewer_id, 0) >= threshold

    def _record_failure(self, reviewer_id: str) -> None:
        """Record a failure for escalation tracking."""
        self._failure_counts[reviewer_id] = self._failure_counts.get(reviewer_id, 0) + 1

    def _clear_failures(self, reviewer_id: str) -> None:
        """Clear failure count on success."""
        self._failure_counts.pop(reviewer_id, None)

    async def review(
        self,
        config: ReviewerConfig,
        context: ReviewContext,
        timeout_ms: int = 120000,
    ) -> ReviewResult:
        """
        Run a code review.

        Args:
            config: Reviewer configuration
            context: Review context (files, diff, etc.)
            timeout_ms: Timeout in milliseconds

        Returns:
            ReviewResult with findings
        """
        start_time = time.time()

        # Generate prompt
        base_prompt = get_prompt_for_reviewer(config.type, config.custom_prompt)
        prompt = self._build_prompt(base_prompt, context)

        # Determine provider and model
        routing = REVIEWER_ROUTING.get(config.type, REVIEWER_ROUTING[ReviewerType.CUSTOM])

        # Check for overrides
        if config.provider_override:
            provider_name = config.provider_override
            model = config.model_override or routing.primary_model
        elif self._should_escalate(config.id):
            provider_name = routing.fallback_provider
            model = config.model_override or routing.fallback_model
            print(f"    [{config.id}] Escalating to {provider_name}/{model}")
        else:
            provider_name = routing.primary_provider
            model = config.model_override or routing.primary_model

        provider = self._get_provider(provider_name)

        # Fallback if primary provider not available
        if provider is None:
            fallback_name = routing.fallback_provider
            provider = self._get_provider(fallback_name)
            if provider is not None:
                provider_name = fallback_name
                model = routing.fallback_model
                print(f"    [{config.id}] Primary provider unavailable, using {provider_name}")

        if provider is None:
            duration_ms = (time.time() - start_time) * 1000
            return ReviewResult(
                reviewer_id=config.id,
                reviewer_type=config.type,
                outcome=ReviewOutcome.ERROR,
                findings=[],
                summary="No provider available",
                confidence=0.0,
                duration_ms=duration_ms,
                error="No provider available (neither Claude nor Gemini configured)",
            )

        # Execute review
        try:
            provider_config = ProviderConfig(
                task=prompt,
                model=model,
                max_tokens=4096,
                temperature=0.0,
            )

            result = await provider.execute(provider_config)
            duration_ms = (time.time() - start_time) * 1000

            if not result.success:
                self._record_failure(config.id)
                return ReviewResult(
                    reviewer_id=config.id,
                    reviewer_type=config.type,
                    outcome=ReviewOutcome.ERROR,
                    findings=[],
                    summary=f"Provider execution failed: {result.error}",
                    confidence=0.0,
                    duration_ms=duration_ms,
                    model=model,
                    provider=provider_name,
                    cost_usd=result.cost_usd,
                    error=result.error,
                )

            # Parse result
            parsed = self._parse_review_output(config, result.output)

            # Build result
            review_result = ReviewResult(
                reviewer_id=config.id,
                reviewer_type=config.type,
                outcome=parsed.get("outcome", ReviewOutcome.ERROR),
                findings=parsed.get("findings", []),
                summary=parsed.get("summary", "No summary provided"),
                confidence=parsed.get("confidence", 0.0),
                duration_ms=duration_ms,
                model=model,
                provider=provider_name,
                cost_usd=result.cost_usd,
            )

            # Filter findings by severity if configured
            if config.min_severity and review_result.findings:
                review_result.findings = filter_findings_by_severity(
                    review_result.findings,
                    config.min_severity,
                )

            self._clear_failures(config.id)
            return review_result

        except Exception as e:
            self._record_failure(config.id)
            duration_ms = (time.time() - start_time) * 1000
            return ReviewResult(
                reviewer_id=config.id,
                reviewer_type=config.type,
                outcome=ReviewOutcome.ERROR,
                findings=[],
                summary=f"Review failed: {str(e)}",
                confidence=0.0,
                duration_ms=duration_ms,
                error=str(e),
            )

    def _build_prompt(self, base_prompt: str, context: ReviewContext) -> str:
        """Build the full prompt with context."""
        context_lines: list[str] = []

        context_lines.append("## Files Changed")
        if context.files_changed:
            for f in context.files_changed:
                context_lines.append(f"- {f}")
        else:
            context_lines.append("(No files changed)")
        context_lines.append("")

        context_lines.append("## Git Diff (This Checkpoint)")
        context_lines.append("```diff")
        # Truncate diff to avoid context overflow
        truncated_diff = context.git_diff[:30000]
        context_lines.append(truncated_diff)
        if len(context.git_diff) > 30000:
            context_lines.append("... (diff truncated)")
        context_lines.append("```")
        context_lines.append("")

        # For architecture, include full harness diff
        if context.full_harness_diff:
            context_lines.append("## Full Harness Diff (All Changes Since Branch Start)")
            context_lines.append(
                "**IMPORTANT: Check this for DRY violations across all files.**"
            )
            context_lines.append("```diff")
            truncated_full = context.full_harness_diff[:20000]
            context_lines.append(truncated_full)
            if len(context.full_harness_diff) > 20000:
                context_lines.append("... (full harness diff truncated)")
            context_lines.append("```")
            context_lines.append("")

        context_lines.append("## Completed Issues")
        if context.completed_issues:
            for issue in context.completed_issues:
                context_lines.append(f"- {issue.get('id', '?')}: {issue.get('title', '?')}")
        else:
            context_lines.append("(No issues completed)")
        context_lines.append("")

        context_lines.append("## Checkpoint Summary")
        context_lines.append(context.checkpoint_summary or "(No summary available)")

        context_section = "\n".join(context_lines)
        return base_prompt.replace("{CONTEXT}", context_section)

    def _parse_review_output(
        self,
        config: ReviewerConfig,
        output: str,
    ) -> dict[str, Any]:
        """Parse reviewer output into structured data."""
        # Extract JSON from output
        json_content = self._extract_json(output)
        if not json_content:
            return {
                "outcome": ReviewOutcome.ERROR,
                "findings": [],
                "summary": "Failed to parse reviewer output (no JSON found)",
                "confidence": 0.0,
            }

        try:
            parsed = json.loads(json_content)
        except json.JSONDecodeError as e:
            return {
                "outcome": ReviewOutcome.ERROR,
                "findings": [],
                "summary": f"Invalid JSON: {e}",
                "confidence": 0.0,
            }

        # Validate outcome
        outcome_str = parsed.get("outcome", "error")
        outcome_map = {
            "pass": ReviewOutcome.PASS,
            "pass_with_findings": ReviewOutcome.PASS_WITH_FINDINGS,
            "fail": ReviewOutcome.FAIL,
            "error": ReviewOutcome.ERROR,
        }
        outcome = outcome_map.get(outcome_str, ReviewOutcome.ERROR)

        # Parse findings
        findings = self._parse_findings(config.id, parsed.get("findings", []))

        # Validate confidence
        confidence = parsed.get("confidence", 0.0)
        if not isinstance(confidence, (int, float)):
            confidence = 0.5
        confidence = max(0.0, min(1.0, float(confidence)))

        return {
            "outcome": outcome,
            "findings": findings,
            "summary": parsed.get("summary", "No summary provided"),
            "confidence": confidence,
        }

    def _extract_json(self, output: str) -> str | None:
        """Extract JSON from model output."""
        output = output.strip()

        # Handle prefilled responses (output may not start with {)
        if not output.startswith("{"):
            output = '{\n  "outcome":' + output

        # Strategy 1: Code block
        code_block = re.search(r"```json?\s*([\s\S]*?)\s*```", output)
        if code_block:
            content = code_block.group(1).strip()
            if self._is_valid_json(content):
                return content

        # Strategy 2: Balanced braces
        json_content = self._extract_balanced_json(output)
        if json_content and self._is_valid_json(json_content):
            return json_content

        # Strategy 3: Whole output
        if output.startswith("{") and output.endswith("}"):
            if self._is_valid_json(output):
                return output

        return None

    def _extract_balanced_json(self, text: str) -> str | None:
        """Extract balanced JSON object from text."""
        start_idx = text.find("{")
        if start_idx == -1:
            return None

        depth = 0
        in_string = False
        escape_next = False

        for i in range(start_idx, len(text)):
            char = text[i]

            if escape_next:
                escape_next = False
                continue

            if char == "\\" and in_string:
                escape_next = True
                continue

            if char == '"':
                in_string = not in_string
                continue

            if not in_string:
                if char == "{":
                    depth += 1
                elif char == "}":
                    depth -= 1
                    if depth == 0:
                        return text[start_idx : i + 1]

        return None

    def _is_valid_json(self, text: str) -> bool:
        """Check if text is valid JSON."""
        try:
            json.loads(text)
            return True
        except json.JSONDecodeError:
            return False

    def _parse_findings(
        self,
        reviewer_id: str,
        findings: list[Any],
    ) -> list[ReviewFinding]:
        """Parse findings array from JSON."""
        if not isinstance(findings, list):
            return []

        results: list[ReviewFinding] = []

        for i, f in enumerate(findings):
            if not isinstance(f, dict):
                continue

            # Validate severity
            severity_str = f.get("severity", "info")
            severity_map = {
                "critical": FindingSeverity.CRITICAL,
                "high": FindingSeverity.HIGH,
                "medium": FindingSeverity.MEDIUM,
                "low": FindingSeverity.LOW,
                "info": FindingSeverity.INFO,
            }
            severity = severity_map.get(severity_str, FindingSeverity.INFO)

            finding = ReviewFinding(
                id=f"{reviewer_id}-{i}",
                severity=severity,
                category=f.get("category", "general"),
                title=f.get("title", "Untitled finding"),
                description=f.get("description", ""),
                file=f.get("file"),
                line=f.get("line"),
                quote=f.get("quote"),
                suggestion=f.get("suggestion"),
            )
            results.append(finding)

        return results


async def run_review(
    config: ReviewerConfig,
    context: ReviewContext,
    claude_provider: Any | None = None,
    gemini_provider: Any | None = None,
    timeout_ms: int = 120000,
) -> ReviewResult:
    """
    Convenience function to run a single review.

    Args:
        config: Reviewer configuration
        context: Review context
        claude_provider: Optional ClaudeProvider
        gemini_provider: Optional GeminiProvider
        timeout_ms: Timeout in milliseconds

    Returns:
        ReviewResult
    """
    reviewer = CodeReviewer(claude_provider, gemini_provider)
    return await reviewer.review(config, context, timeout_ms)
