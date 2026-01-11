"""
Tests for Code Review Agents

Tests the multi-provider code review system.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from create_something_agents.reviewers import (
    CodeReviewer,
    ReviewerType,
    ReviewOutcome,
    FindingSeverity,
    ReviewFinding,
    ReviewResult,
    ReviewContext,
    ReviewerConfig,
    filter_findings_by_severity,
    get_outcome_icon,
    get_prompt_for_reviewer,
    SECURITY_REVIEWER_PROMPT,
    ARCHITECTURE_REVIEWER_PROMPT,
    QUALITY_REVIEWER_PROMPT,
)
from create_something_agents.reviewers.reviewer import REVIEWER_ROUTING
from create_something_agents.providers.base import ProviderResult


class TestReviewerTypes:
    """Test reviewer type definitions."""

    def test_reviewer_types(self) -> None:
        """All reviewer types are defined."""
        assert ReviewerType.SECURITY.value == "security"
        assert ReviewerType.ARCHITECTURE.value == "architecture"
        assert ReviewerType.QUALITY.value == "quality"
        assert ReviewerType.CUSTOM.value == "custom"

    def test_review_outcomes(self) -> None:
        """All review outcomes are defined."""
        assert ReviewOutcome.PASS.value == "pass"
        assert ReviewOutcome.PASS_WITH_FINDINGS.value == "pass_with_findings"
        assert ReviewOutcome.FAIL.value == "fail"
        assert ReviewOutcome.ERROR.value == "error"

    def test_finding_severities(self) -> None:
        """All finding severities are defined."""
        assert FindingSeverity.CRITICAL.value == "critical"
        assert FindingSeverity.HIGH.value == "high"
        assert FindingSeverity.MEDIUM.value == "medium"
        assert FindingSeverity.LOW.value == "low"
        assert FindingSeverity.INFO.value == "info"


class TestReviewerRouting:
    """Test multi-provider routing logic."""

    def test_security_routes_to_gemini(self) -> None:
        """Security reviewer routes to Gemini Flash (cheap pattern detection)."""
        routing = REVIEWER_ROUTING[ReviewerType.SECURITY]
        assert routing.primary_provider == "gemini"
        assert "flash" in routing.primary_model.lower()
        assert routing.fallback_provider == "claude"

    def test_architecture_routes_to_sonnet(self) -> None:
        """Architecture reviewer routes to Sonnet (deep analysis)."""
        routing = REVIEWER_ROUTING[ReviewerType.ARCHITECTURE]
        assert routing.primary_provider == "claude"
        assert "sonnet" in routing.primary_model.lower()
        assert routing.fallback_provider == "claude"
        assert "opus" in routing.fallback_model.lower()

    def test_quality_routes_to_haiku(self) -> None:
        """Quality reviewer routes to Haiku (balanced)."""
        routing = REVIEWER_ROUTING[ReviewerType.QUALITY]
        assert routing.primary_provider == "claude"
        assert "haiku" in routing.primary_model.lower()
        assert routing.fallback_provider == "claude"
        assert "sonnet" in routing.fallback_model.lower()


class TestPrompts:
    """Test reviewer prompts."""

    def test_security_prompt_has_context_placeholder(self) -> None:
        """Security prompt has {CONTEXT} placeholder."""
        assert "{CONTEXT}" in SECURITY_REVIEWER_PROMPT
        assert "security" in SECURITY_REVIEWER_PROMPT.lower()
        assert "injection" in SECURITY_REVIEWER_PROMPT.lower()

    def test_architecture_prompt_has_dry_focus(self) -> None:
        """Architecture prompt emphasizes DRY violations."""
        assert "{CONTEXT}" in ARCHITECTURE_REVIEWER_PROMPT
        assert "DRY" in ARCHITECTURE_REVIEWER_PROMPT
        assert "quote" in ARCHITECTURE_REVIEWER_PROMPT.lower()

    def test_quality_prompt_has_context_placeholder(self) -> None:
        """Quality prompt has {CONTEXT} placeholder."""
        assert "{CONTEXT}" in QUALITY_REVIEWER_PROMPT
        assert "error" in QUALITY_REVIEWER_PROMPT.lower()

    def test_get_prompt_for_reviewer(self) -> None:
        """get_prompt_for_reviewer returns correct prompts."""
        assert get_prompt_for_reviewer(ReviewerType.SECURITY) == SECURITY_REVIEWER_PROMPT
        assert (
            get_prompt_for_reviewer(ReviewerType.ARCHITECTURE)
            == ARCHITECTURE_REVIEWER_PROMPT
        )
        assert get_prompt_for_reviewer(ReviewerType.QUALITY) == QUALITY_REVIEWER_PROMPT

    def test_custom_prompt_override(self) -> None:
        """Custom prompt overrides default."""
        custom = "My custom prompt"
        assert get_prompt_for_reviewer(ReviewerType.SECURITY, custom) == custom

    def test_custom_type_requires_prompt(self) -> None:
        """Custom reviewer type requires custom_prompt."""
        with pytest.raises(ValueError, match="Custom reviewer type requires"):
            get_prompt_for_reviewer(ReviewerType.CUSTOM)


class TestFilterFindings:
    """Test finding filtering by severity."""

    def test_filter_by_high_severity(self) -> None:
        """Filter keeps critical and high findings."""
        findings = [
            ReviewFinding(
                id="1", severity=FindingSeverity.CRITICAL, category="test", title="Critical", description=""
            ),
            ReviewFinding(
                id="2", severity=FindingSeverity.HIGH, category="test", title="High", description=""
            ),
            ReviewFinding(
                id="3", severity=FindingSeverity.MEDIUM, category="test", title="Medium", description=""
            ),
            ReviewFinding(
                id="4", severity=FindingSeverity.LOW, category="test", title="Low", description=""
            ),
            ReviewFinding(
                id="5", severity=FindingSeverity.INFO, category="test", title="Info", description=""
            ),
        ]

        filtered = filter_findings_by_severity(findings, FindingSeverity.HIGH)
        assert len(filtered) == 2
        assert filtered[0].severity == FindingSeverity.CRITICAL
        assert filtered[1].severity == FindingSeverity.HIGH

    def test_filter_keeps_all_above_threshold(self) -> None:
        """Filter keeps findings at or above minimum severity."""
        findings = [
            ReviewFinding(
                id="1", severity=FindingSeverity.MEDIUM, category="test", title="Med", description=""
            ),
            ReviewFinding(
                id="2", severity=FindingSeverity.INFO, category="test", title="Info", description=""
            ),
        ]

        filtered = filter_findings_by_severity(findings, FindingSeverity.MEDIUM)
        assert len(filtered) == 1


class TestOutcomeIcons:
    """Test outcome icons."""

    def test_outcome_icons(self) -> None:
        """Each outcome has an icon."""
        assert get_outcome_icon(ReviewOutcome.PASS) == "✅"
        assert get_outcome_icon(ReviewOutcome.PASS_WITH_FINDINGS) == "⚠️"
        assert get_outcome_icon(ReviewOutcome.FAIL) == "❌"
        assert get_outcome_icon(ReviewOutcome.ERROR) == "💥"


class TestCodeReviewer:
    """Test the CodeReviewer class."""

    @pytest.fixture
    def mock_claude_provider(self) -> MagicMock:
        """Create mock Claude provider."""
        provider = MagicMock()
        provider.execute = AsyncMock(
            return_value=ProviderResult(
                success=True,
                output='{"outcome": "pass", "confidence": 0.9, "summary": "All good", "findings": []}',
                model="claude-sonnet-4-20250514",
                provider="claude",
                input_tokens=100,
                output_tokens=50,
                cost_usd=0.001,
            )
        )
        return provider

    @pytest.fixture
    def mock_gemini_provider(self) -> MagicMock:
        """Create mock Gemini provider."""
        provider = MagicMock()
        provider.execute = AsyncMock(
            return_value=ProviderResult(
                success=True,
                output='{"outcome": "pass_with_findings", "confidence": 0.8, "summary": "Minor issues", "findings": [{"severity": "low", "category": "secrets", "title": "Exposed key", "description": "Found API key"}]}',
                model="gemini-2.0-flash-exp",
                provider="gemini",
                input_tokens=100,
                output_tokens=80,
                cost_usd=0.0001,
            )
        )
        return provider

    @pytest.fixture
    def review_context(self) -> ReviewContext:
        """Create review context."""
        return ReviewContext(
            files_changed=["src/auth.ts", "src/api.ts"],
            git_diff="diff --git a/src/auth.ts...",
            completed_issues=[{"id": "cs-123", "title": "Add auth"}],
            checkpoint_summary="Added authentication",
        )

    @pytest.mark.asyncio
    async def test_security_review_uses_gemini(
        self,
        mock_claude_provider: MagicMock,
        mock_gemini_provider: MagicMock,
        review_context: ReviewContext,
    ) -> None:
        """Security review uses Gemini provider."""
        reviewer = CodeReviewer(mock_claude_provider, mock_gemini_provider)
        config = ReviewerConfig(id="security-1", type=ReviewerType.SECURITY)

        result = await reviewer.review(config, review_context)

        assert result.provider == "gemini"
        assert result.outcome == ReviewOutcome.PASS_WITH_FINDINGS
        mock_gemini_provider.execute.assert_called_once()
        mock_claude_provider.execute.assert_not_called()

    @pytest.mark.asyncio
    async def test_architecture_review_uses_claude(
        self,
        mock_claude_provider: MagicMock,
        mock_gemini_provider: MagicMock,
        review_context: ReviewContext,
    ) -> None:
        """Architecture review uses Claude provider."""
        reviewer = CodeReviewer(mock_claude_provider, mock_gemini_provider)
        config = ReviewerConfig(id="arch-1", type=ReviewerType.ARCHITECTURE)

        result = await reviewer.review(config, review_context)

        assert result.provider == "claude"
        assert result.outcome == ReviewOutcome.PASS
        mock_claude_provider.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_quality_review_uses_claude_haiku(
        self,
        mock_claude_provider: MagicMock,
        mock_gemini_provider: MagicMock,
        review_context: ReviewContext,
    ) -> None:
        """Quality review uses Claude (Haiku)."""
        reviewer = CodeReviewer(mock_claude_provider, mock_gemini_provider)
        config = ReviewerConfig(id="quality-1", type=ReviewerType.QUALITY)

        result = await reviewer.review(config, review_context)

        assert result.provider == "claude"
        mock_claude_provider.execute.assert_called_once()
        call_args = mock_claude_provider.execute.call_args
        assert "haiku" in call_args[0][0].model.lower()

    @pytest.mark.asyncio
    async def test_provider_override(
        self,
        mock_claude_provider: MagicMock,
        mock_gemini_provider: MagicMock,
        review_context: ReviewContext,
    ) -> None:
        """Provider override forces specific provider."""
        reviewer = CodeReviewer(mock_claude_provider, mock_gemini_provider)
        config = ReviewerConfig(
            id="security-2",
            type=ReviewerType.SECURITY,
            provider_override="claude",  # Force Claude instead of Gemini
        )

        result = await reviewer.review(config, review_context)

        assert result.provider == "claude"
        mock_claude_provider.execute.assert_called_once()
        mock_gemini_provider.execute.assert_not_called()

    @pytest.mark.asyncio
    async def test_fallback_when_primary_unavailable(
        self,
        mock_claude_provider: MagicMock,
        review_context: ReviewContext,
    ) -> None:
        """Falls back to Claude when Gemini unavailable."""
        reviewer = CodeReviewer(mock_claude_provider, None)  # No Gemini
        config = ReviewerConfig(id="security-3", type=ReviewerType.SECURITY)

        result = await reviewer.review(config, review_context)

        assert result.provider == "claude"
        mock_claude_provider.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_error_when_no_providers(
        self,
        review_context: ReviewContext,
    ) -> None:
        """Returns error when no providers available."""
        reviewer = CodeReviewer(None, None)
        config = ReviewerConfig(id="test-1", type=ReviewerType.QUALITY)

        result = await reviewer.review(config, review_context)

        assert result.outcome == ReviewOutcome.ERROR
        assert "No provider available" in result.summary

    @pytest.mark.asyncio
    async def test_parses_findings(
        self,
        mock_gemini_provider: MagicMock,
        review_context: ReviewContext,
    ) -> None:
        """Parses findings from review output."""
        reviewer = CodeReviewer(None, mock_gemini_provider)
        config = ReviewerConfig(id="security-4", type=ReviewerType.SECURITY)

        result = await reviewer.review(config, review_context)

        assert len(result.findings) == 1
        assert result.findings[0].severity == FindingSeverity.LOW
        assert result.findings[0].category == "secrets"
        assert result.findings[0].title == "Exposed key"


class TestJSONParsing:
    """Test JSON extraction and parsing."""

    @pytest.fixture
    def reviewer(self) -> CodeReviewer:
        """Create reviewer instance."""
        return CodeReviewer(None, None)

    def test_extract_json_from_raw(self, reviewer: CodeReviewer) -> None:
        """Extracts JSON from raw output."""
        output = '{"outcome": "pass", "findings": []}'
        result = reviewer._extract_json(output)
        assert result is not None
        assert '"outcome": "pass"' in result

    def test_extract_json_from_code_block(self, reviewer: CodeReviewer) -> None:
        """Extracts JSON from code block."""
        output = """Here's my analysis:
```json
{"outcome": "fail", "findings": []}
```"""
        result = reviewer._extract_json(output)
        assert result is not None
        assert '"outcome": "fail"' in result

    def test_extract_json_with_prefill(self, reviewer: CodeReviewer) -> None:
        """Handles prefilled response format."""
        # Claude may return output without the prefill
        output = ' "pass", "confidence": 0.9, "summary": "OK", "findings": []}'
        result = reviewer._extract_json(output)
        assert result is not None
        assert '"outcome"' in result

    def test_handles_nested_json(self, reviewer: CodeReviewer) -> None:
        """Handles nested JSON structures."""
        output = '{"outcome": "pass", "findings": [{"nested": {"deep": true}}]}'
        result = reviewer._extract_json(output)
        assert result is not None


class TestCostTracking:
    """Test cost tracking across reviews."""

    @pytest.mark.asyncio
    async def test_tracks_cost(self) -> None:
        """Review result includes cost."""
        provider = MagicMock()
        provider.execute = AsyncMock(
            return_value=ProviderResult(
                success=True,
                output='{"outcome": "pass", "findings": []}',
                model="gemini-2.0-flash-exp",
                provider="gemini",
                cost_usd=0.0001,
            )
        )

        reviewer = CodeReviewer(None, provider)
        config = ReviewerConfig(id="cost-test", type=ReviewerType.SECURITY)
        context = ReviewContext(files_changed=[], git_diff="")

        result = await reviewer.review(config, context)

        assert result.cost_usd == 0.0001
