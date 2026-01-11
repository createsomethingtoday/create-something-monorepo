"""Tests for CREATE SOMETHING Agent providers and router."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from create_something_agents.providers.base import (
    AgentProvider,
    ProviderConfig,
    ProviderResult,
)
from create_something_agents.providers.router import (
    AgentRouter,
    Complexity,
    RouterConfig,
    RoutingDecision,
    TaskType,
)


class TestProviderResult:
    """Tests for ProviderResult dataclass."""

    def test_basic_creation(self) -> None:
        """Test creating a basic result."""
        result = ProviderResult(
            success=True,
            output="Hello",
            model="claude-sonnet-4-20250514",
            provider="claude",
        )
        assert result.success is True
        assert result.output == "Hello"
        assert result.total_tokens == 0

    def test_token_counting(self) -> None:
        """Test total_tokens property."""
        result = ProviderResult(
            success=True,
            output="Test",
            model="test-model",
            provider="test",
            input_tokens=100,
            output_tokens=50,
        )
        assert result.total_tokens == 150

    def test_error_result(self) -> None:
        """Test error result creation."""
        result = ProviderResult(
            success=False,
            output="",
            model="test-model",
            provider="test",
            error="Connection failed",
        )
        assert result.success is False
        assert result.error == "Connection failed"


class TestProviderConfig:
    """Tests for ProviderConfig dataclass."""

    def test_default_values(self) -> None:
        """Test default configuration values."""
        config = ProviderConfig(task="Test task")
        assert config.model is None
        assert config.max_tokens == 4096
        assert config.temperature == 0.0
        assert config.tools is None

    def test_custom_values(self) -> None:
        """Test custom configuration."""
        config = ProviderConfig(
            task="Test task",
            model="claude-opus-4-20250514",
            max_tokens=8192,
            temperature=0.7,
        )
        assert config.model == "claude-opus-4-20250514"
        assert config.max_tokens == 8192
        assert config.temperature == 0.7


class TestComplexity:
    """Tests for Complexity enum."""

    def test_complexity_values(self) -> None:
        """Test complexity enum values."""
        assert Complexity.TRIVIAL.value == "trivial"
        assert Complexity.SIMPLE.value == "simple"
        assert Complexity.STANDARD.value == "standard"
        assert Complexity.COMPLEX.value == "complex"
        assert Complexity.ARCHITECTURE.value == "architecture"


class TestTaskType:
    """Tests for TaskType enum."""

    def test_task_type_values(self) -> None:
        """Test task type enum values."""
        assert TaskType.EXECUTE.value == "execute"
        assert TaskType.PLAN.value == "plan"
        assert TaskType.REVIEW.value == "review"


class TestAgentRouterComplexityDetection:
    """Tests for complexity analysis in AgentRouter."""

    def setup_method(self) -> None:
        """Set up test fixtures."""
        # Mock the ClaudeProvider to avoid API key requirement
        mock_claude = MagicMock()
        mock_claude.get_default_model.return_value = "claude-sonnet-4-20250514"
        self.router = AgentRouter(
            config=RouterConfig(enable_gemini=False),
            claude_provider=mock_claude,
        )

    def test_trivial_keywords(self) -> None:
        """Test trivial complexity detection."""
        assert self.router.analyze_complexity("Fix typo in README") == Complexity.TRIVIAL
        assert self.router.analyze_complexity("Rename variable X to Y") == Complexity.TRIVIAL
        assert self.router.analyze_complexity("Format code") == Complexity.TRIVIAL

    def test_simple_keywords(self) -> None:
        """Test simple complexity detection."""
        assert self.router.analyze_complexity("Add CRUD endpoints for users") == Complexity.SIMPLE
        assert self.router.analyze_complexity("Create scaffold for new component") == Complexity.SIMPLE

    def test_complex_keywords(self) -> None:
        """Test complex complexity detection (Sonnet-level)."""
        assert self.router.analyze_complexity("Review security of payment flow") == Complexity.COMPLEX
        assert self.router.analyze_complexity("Implement password hashing") == Complexity.COMPLEX
        assert self.router.analyze_complexity("Design the login flow") == Complexity.COMPLEX

    def test_architecture_keywords(self) -> None:
        """Test architecture complexity detection (Opus-level, rare)."""
        assert self.router.analyze_complexity("Architect the new system") == Complexity.ARCHITECTURE
        assert self.router.analyze_complexity("Design system architecture") == Complexity.ARCHITECTURE
        assert self.router.analyze_complexity("Plan database schema design") == Complexity.ARCHITECTURE

    def test_explicit_complexity_label(self) -> None:
        """Test explicit complexity labels override detection."""
        # Label should override keyword detection
        result = self.router.analyze_complexity(
            "Design architecture for simple thing",
            labels=["complexity:trivial"],
        )
        assert result == Complexity.TRIVIAL

    def test_model_label_implies_complexity(self) -> None:
        """Test model labels imply complexity."""
        assert (
            self.router.analyze_complexity("Some task", labels=["model:haiku"])
            == Complexity.TRIVIAL
        )
        assert (
            self.router.analyze_complexity("Some task", labels=["model:flash"])
            == Complexity.TRIVIAL
        )
        assert (
            self.router.analyze_complexity("Some task", labels=["model:sonnet"])
            == Complexity.COMPLEX
        )
        assert (
            self.router.analyze_complexity("Some task", labels=["model:opus"])
            == Complexity.ARCHITECTURE
        )

    def test_length_based_complexity(self) -> None:
        """Test complexity based on task length."""
        short_task = "Do X"  # < 100 chars
        medium_task = "a" * 200  # > 100, < 500 chars
        long_task = "a" * 600  # > 500 chars

        assert self.router.analyze_complexity(short_task) == Complexity.SIMPLE
        assert self.router.analyze_complexity(medium_task) == Complexity.STANDARD
        assert self.router.analyze_complexity(long_task) == Complexity.COMPLEX


class TestAgentRouterTaskTypeDetection:
    """Tests for task type detection in AgentRouter."""

    def setup_method(self) -> None:
        """Set up test fixtures."""
        mock_claude = MagicMock()
        mock_claude.get_default_model.return_value = "claude-sonnet-4-20250514"
        self.router = AgentRouter(
            config=RouterConfig(enable_gemini=False),
            claude_provider=mock_claude,
        )

    def test_review_detection(self) -> None:
        """Test review task type detection."""
        assert self.router.detect_task_type("Review the code changes") == TaskType.REVIEW
        assert self.router.detect_task_type("Audit security settings") == TaskType.REVIEW
        assert self.router.detect_task_type("Verify the implementation") == TaskType.REVIEW

    def test_plan_detection(self) -> None:
        """Test plan task type detection."""
        assert self.router.detect_task_type("Design the new API") == TaskType.PLAN
        assert self.router.detect_task_type("Architect the payment system") == TaskType.PLAN
        assert self.router.detect_task_type("Plan the migration strategy") == TaskType.PLAN

    def test_execute_detection(self) -> None:
        """Test execute task type detection."""
        assert self.router.detect_task_type("Fix the bug in auth.py") == TaskType.EXECUTE
        assert self.router.detect_task_type("Add a new endpoint") == TaskType.EXECUTE
        assert self.router.detect_task_type("Create user profile component") == TaskType.EXECUTE

    def test_label_override(self) -> None:
        """Test labels override detection."""
        assert (
            self.router.detect_task_type("Do something", labels=["review"])
            == TaskType.REVIEW
        )
        assert (
            self.router.detect_task_type("Do something", labels=["plan"])
            == TaskType.PLAN
        )


class TestAgentRouterRouting:
    """Tests for routing decisions in AgentRouter."""

    def test_claude_only_mode(self) -> None:
        """Test router with Gemini disabled."""
        mock_claude = MagicMock()
        mock_claude.get_default_model.return_value = "claude-3-5-haiku-20241022"
        router = AgentRouter(
            config=RouterConfig(enable_gemini=False),
            claude_provider=mock_claude,
        )
        decision = router.route("Fix typo")
        assert decision.provider == "claude"
        assert "haiku" in decision.model.lower()

    def test_planning_routes_to_claude(self) -> None:
        """Test planning tasks always route to Claude Sonnet."""
        mock_claude = MagicMock()
        mock_claude.get_default_model.return_value = "claude-sonnet-4-20250514"
        router = AgentRouter(
            config=RouterConfig(enable_gemini=True),
            claude_provider=mock_claude,
        )
        router.gemini = MagicMock()
        router.gemini.get_default_model.return_value = "gemini-flash"

        decision = router.route("Design new login flow")
        assert decision.provider == "claude"
        assert decision.task_type == TaskType.PLAN
        assert "sonnet" in decision.model

    def test_review_routes_to_claude(self) -> None:
        """Test review tasks always route to Claude Sonnet."""
        mock_claude = MagicMock()
        mock_claude.get_default_model.return_value = "claude-sonnet-4-20250514"
        router = AgentRouter(
            config=RouterConfig(enable_gemini=True),
            claude_provider=mock_claude,
        )
        router.gemini = MagicMock()
        router.gemini.get_default_model.return_value = "gemini-flash"

        decision = router.route("Review security changes")
        assert decision.provider == "claude"
        assert decision.task_type == TaskType.REVIEW
        assert "sonnet" in decision.model

    def test_complex_routes_to_sonnet(self) -> None:
        """Test complex tasks route to Sonnet (not Opus)."""
        mock_claude = MagicMock()
        mock_claude.get_default_model.return_value = "claude-sonnet-4-20250514"
        router = AgentRouter(
            config=RouterConfig(enable_gemini=True),
            claude_provider=mock_claude,
        )
        router.gemini = MagicMock()
        router.gemini.get_default_model.return_value = "gemini-flash"

        decision = router.route("Implement secure authentication with tokens")
        assert decision.provider == "claude"
        assert decision.complexity == Complexity.COMPLEX
        assert "sonnet" in decision.model

    def test_architecture_routes_to_opus(self) -> None:
        """Test architecture tasks route to Opus (rare)."""
        mock_claude = MagicMock()
        mock_claude.get_default_model.return_value = "claude-opus-4-20250514"
        router = AgentRouter(
            config=RouterConfig(enable_gemini=True),
            claude_provider=mock_claude,
        )
        router.gemini = MagicMock()
        router.gemini.get_default_model.return_value = "gemini-flash"

        decision = router.route("Architect the new database schema")
        assert decision.provider == "claude"
        assert decision.complexity == Complexity.ARCHITECTURE
        assert "opus" in decision.model

    def test_trivial_routes_to_gemini_when_enabled(self) -> None:
        """Test trivial tasks route to Gemini when available."""
        mock_claude = MagicMock()
        mock_claude.get_default_model.return_value = "claude-3-5-haiku-20241022"
        mock_gemini = MagicMock()
        mock_gemini.get_default_model.return_value = "gemini-1.5-flash-8b"

        # Pass gemini_provider during init to avoid config.enable_gemini being set to False
        router = AgentRouter(
            config=RouterConfig(enable_gemini=True),
            claude_provider=mock_claude,
            gemini_provider=mock_gemini,
        )

        decision = router.route("Fix typo in README")
        assert decision.provider == "gemini"
        assert decision.complexity == Complexity.TRIVIAL

    def test_simple_routes_to_gemini_when_enabled(self) -> None:
        """Test simple tasks route to Gemini when available."""
        mock_claude = MagicMock()
        mock_claude.get_default_model.return_value = "claude-3-5-haiku-20241022"
        mock_gemini = MagicMock()
        mock_gemini.get_default_model.return_value = "gemini-2.0-flash-exp"

        # Pass gemini_provider during init to avoid config.enable_gemini being set to False
        router = AgentRouter(
            config=RouterConfig(enable_gemini=True),
            claude_provider=mock_claude,
            gemini_provider=mock_gemini,
        )

        decision = router.route("Add CRUD endpoint for users")
        assert decision.provider == "gemini"
        assert decision.complexity == Complexity.SIMPLE


class TestAgentRouterCostEstimation:
    """Tests for cost estimation in AgentRouter."""

    def test_estimate_savings(self) -> None:
        """Test cost savings estimation."""
        mock_claude = MagicMock()
        mock_claude.get_default_model.return_value = "claude-3-5-haiku-20241022"
        mock_claude.estimate_cost.return_value = 0.001

        router = AgentRouter(
            config=RouterConfig(enable_gemini=True),
            claude_provider=mock_claude,
        )
        router.gemini = MagicMock()
        router.gemini.get_default_model.return_value = "gemini-2.0-flash-exp"
        router.gemini.estimate_cost.return_value = 0.0001

        tasks = [
            {"task": "Fix typo", "labels": []},
            {"task": "Rename variable", "labels": []},
            {"task": "Architect system design", "labels": []},
        ]

        savings = router.estimate_savings(tasks)
        assert "claude_only" in savings
        assert "routed" in savings
        assert "savings_pct" in savings
        # Some savings expected since trivial tasks route to Gemini
        assert savings["routed"] <= savings["claude_only"]


class TestClaudeProvider:
    """Tests for ClaudeProvider."""

    def test_model_alias_resolution(self) -> None:
        """Test model alias resolution."""
        from create_something_agents.providers.claude import MODEL_ALIASES

        assert MODEL_ALIASES["haiku"] == "claude-3-5-haiku-20241022"
        assert MODEL_ALIASES["sonnet"] == "claude-sonnet-4-20250514"
        assert MODEL_ALIASES["opus"] == "claude-opus-4-20250514"

    def test_cost_estimation(self) -> None:
        """Test cost calculation."""
        from create_something_agents.providers.claude import ClaudeProvider

        with patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"}):
            with patch("create_something_agents.providers.claude.Anthropic"):
                provider = ClaudeProvider(api_key="test-key")

        # 1000 input, 500 output tokens with sonnet
        # Sonnet: $3/1M input, $15/1M output
        cost = provider.estimate_cost(1000, 500, "claude-sonnet-4-20250514")
        expected = (1000 / 1_000_000 * 3.0) + (500 / 1_000_000 * 15.0)
        assert cost == pytest.approx(expected, rel=0.01)

    def test_default_model_by_complexity(self) -> None:
        """Test default model selection.

        Hierarchy:
        - trivial/simple → Haiku
        - standard/complex → Sonnet
        - architecture → Opus (rare)
        """
        from create_something_agents.providers.claude import ClaudeProvider

        with patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"}):
            with patch("create_something_agents.providers.claude.Anthropic"):
                provider = ClaudeProvider(api_key="test-key")

        assert "haiku" in provider.get_default_model("trivial")
        assert "haiku" in provider.get_default_model("simple")
        assert "sonnet" in provider.get_default_model("standard")
        assert "sonnet" in provider.get_default_model("complex")  # Sonnet, not Opus
        assert "opus" in provider.get_default_model("architecture")  # Opus for architecture only


class TestGeminiProviderStructure:
    """Tests for GeminiProvider structure (without requiring actual SDK)."""

    def test_model_aliases(self) -> None:
        """Test model aliases are defined."""
        from create_something_agents.providers.gemini import MODEL_ALIASES

        assert "flash" in MODEL_ALIASES
        assert "flash-8b" in MODEL_ALIASES
        assert "pro" in MODEL_ALIASES

    def test_cost_table(self) -> None:
        """Test cost table is defined."""
        from create_something_agents.providers.gemini import GEMINI_COSTS

        assert "gemini-2.0-flash-exp" in GEMINI_COSTS
        assert "gemini-1.5-flash" in GEMINI_COSTS
        assert "gemini-1.5-pro" in GEMINI_COSTS

        # Flash should be cheaper than Pro
        assert GEMINI_COSTS["flash"]["input"] < GEMINI_COSTS["pro"]["input"]
        assert GEMINI_COSTS["flash"]["output"] < GEMINI_COSTS["pro"]["output"]


class TestRouterConfig:
    """Tests for RouterConfig."""

    def test_default_config(self) -> None:
        """Test default configuration values."""
        config = RouterConfig()
        assert config.enable_gemini is True
        assert config.fallback_on_failure is True
        assert TaskType.PLAN in config.claude_only_types
        assert TaskType.REVIEW in config.claude_only_types

    def test_claude_keywords(self) -> None:
        """Test security-critical keywords are defined."""
        config = RouterConfig()
        assert "auth" in config.claude_keywords
        assert "security" in config.claude_keywords
        assert "payment" in config.claude_keywords

    def test_trivial_keywords(self) -> None:
        """Test trivial task keywords are defined."""
        config = RouterConfig()
        assert "typo" in config.trivial_keywords
        assert "rename" in config.trivial_keywords


class TestRoutingDecision:
    """Tests for RoutingDecision dataclass."""

    def test_routing_decision_creation(self) -> None:
        """Test creating a routing decision."""
        decision = RoutingDecision(
            provider="gemini",
            model="gemini-2.0-flash-exp",
            complexity=Complexity.TRIVIAL,
            task_type=TaskType.EXECUTE,
            reason="Cost optimization for trivial task",
        )
        assert decision.provider == "gemini"
        assert decision.model == "gemini-2.0-flash-exp"
        assert decision.estimated_cost == 0.0  # Default
