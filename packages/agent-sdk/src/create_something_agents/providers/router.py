"""
Agent Router

Intelligently routes tasks to the most cost-effective provider.

Routing Strategy:
- trivial execution → Gemini Flash (cheapest)
- frontend/code tasks → Kimi K2 (5-6x cheaper than Sonnet, 40% cheaper than Haiku)
- complex frontend/code → Kimi K2 Thinking (deep reasoning for code)
- complex general → Gemini Pro (2.5x cheaper than Sonnet)
- standard execution → Haiku with extended thinking (cost-effective implementation)
- planning/review/security → Sonnet (trusted reasoning)
- architecture → Opus (only for high-level design decisions)

Hierarchy (by cost, low to high):
- Gemini 2.0 Flash (~$0.075/$0.30 per 1M) = Trivial execution (cheapest)
- Kimi K2 ($0.60/$2.50 per 1M) = Frontend/code tasks
- Haiku ($1/$5 per 1M) = Standard implementation
- Gemini 2.5 Pro ($1.25/$5.00 per 1M) = Complex reasoning (2.5x cheaper than Sonnet)
- Sonnet ($3/$15 per 1M) = Planning + security + review (trusted)
- Opus ($15/$75 per 1M) = Architecture-only (rare)

The router can also handle fallback when a provider fails.
"""

import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from .base import AgentProvider, ProviderConfig, ProviderResult
from .claude import ClaudeProvider


class Complexity(str, Enum):
    """Task complexity levels."""
    TRIVIAL = "trivial"         # Typos, renames, simple fixes → Gemini
    SIMPLE = "simple"           # Single-file edits, CRUD → Gemini/Haiku
    STANDARD = "standard"       # Multi-file features → Haiku with thinking
    COMPLEX = "complex"         # Security-critical, planning → Sonnet
    ARCHITECTURE = "architecture"  # High-level design → Opus (rare)


class TaskType(str, Enum):
    """Task type for routing decisions."""
    EXECUTE = "execute"   # Do the work
    PLAN = "plan"         # Design/architect
    REVIEW = "review"     # Security/quality review


@dataclass
class RoutingDecision:
    """Result of routing decision."""
    provider: str  # "claude" or "gemini"
    model: str
    complexity: Complexity
    task_type: TaskType
    reason: str
    estimated_cost: float = 0.0


@dataclass
class RouterConfig:
    """Configuration for the agent router."""

    # Enable/disable Gemini routing
    enable_gemini: bool = True

    # Enable/disable Moonshot routing (Kimi K2)
    enable_moonshot: bool = True

    # Complexity thresholds for Gemini usage
    gemini_max_complexity: Complexity = Complexity.SIMPLE

    # Complexity thresholds for Moonshot usage (frontend/code tasks)
    moonshot_max_complexity: Complexity = Complexity.STANDARD

    # Always use Claude for these task types
    claude_only_types: list[TaskType] = field(
        default_factory=lambda: [TaskType.PLAN, TaskType.REVIEW]
    )

    # Fallback to Claude on Gemini/Moonshot failure
    fallback_on_failure: bool = True

    # Keywords that force Claude Sonnet (security-critical, planning)
    # These are tasks where we want trusted, well-tested reasoning
    claude_keywords: list[str] = field(
        default_factory=lambda: [
            "design", "review", "audit", "plan", "strategy",
        ]
    )

    # Keywords that indicate security-critical tasks (always use Sonnet)
    security_keywords: list[str] = field(
        default_factory=lambda: [
            "auth", "authentication", "authorization", "security",
            "password", "token", "secret", "credential", "api key",
            "payment", "billing", "stripe", "checkout",
            "pii", "gdpr", "hipaa", "compliance", "encrypt",
            "vulnerability", "injection", "xss", "csrf",
        ]
    )

    # Keywords that require Opus (high-level architecture only)
    opus_keywords: list[str] = field(
        default_factory=lambda: [
            "architect", "architecture", "system design",
            "database schema", "api design", "infrastructure",
        ]
    )

    # Keywords that suggest trivial tasks (Gemini-friendly)
    trivial_keywords: list[str] = field(
        default_factory=lambda: [
            "rename", "typo", "fix typo", "format", "lint",
            "console.log", "print", "comment", "readme",
            "bump version", "update version",
        ]
    )

    # Keywords that suggest simple tasks
    simple_keywords: list[str] = field(
        default_factory=lambda: [
            "add field", "crud", "endpoint", "scaffold",
            "component", "test file", "unit test",
        ]
    )

    # Keywords that suggest frontend/UI tasks (Moonshot-friendly)
    frontend_keywords: list[str] = field(
        default_factory=lambda: [
            "frontend", "ui", "component", "svelte", "react", "vue",
            "css", "tailwind", "styling", "layout", "responsive",
            "button", "form", "modal", "card", "page", "view",
        ]
    )

    # Keywords that suggest code generation tasks (Moonshot-friendly)
    code_keywords: list[str] = field(
        default_factory=lambda: [
            "implement", "create function", "add method", "refactor",
            "generate", "write code", "coding", "feature",
        ]
    )


class AgentRouter:
    """Routes tasks to the optimal provider based on complexity."""

    def __init__(
        self,
        config: RouterConfig | None = None,
        claude_provider: ClaudeProvider | None = None,
        gemini_provider: AgentProvider | None = None,
        moonshot_provider: AgentProvider | None = None,
    ):
        self.config = config or RouterConfig()
        self.claude = claude_provider or ClaudeProvider()

        # Gemini is optional
        if gemini_provider:
            self.gemini = gemini_provider
        elif self.config.enable_gemini:
            try:
                from .gemini import GeminiProvider
                self.gemini = GeminiProvider()
            except (ImportError, ValueError):
                self.gemini = None
                self.config.enable_gemini = False
        else:
            self.gemini = None

        # Moonshot is optional (Kimi K2 for frontend/code tasks)
        if moonshot_provider:
            self.moonshot = moonshot_provider
        elif self.config.enable_moonshot:
            try:
                from .moonshot import MoonshotProvider
                self.moonshot = MoonshotProvider()
            except (ImportError, ValueError):
                self.moonshot = None
                self.config.enable_moonshot = False
        else:
            self.moonshot = None

    def analyze_complexity(self, task: str, labels: list[str] | None = None) -> Complexity:
        """Analyze task to determine complexity level.

        Hierarchy:
        - TRIVIAL: Gemini Flash (cheapest)
        - SIMPLE: Gemini Flash or Haiku
        - STANDARD: Haiku with thinking
        - COMPLEX: Sonnet (planning, review, security)
        - ARCHITECTURE: Opus (rare, high-level design)
        """
        task_lower = task.lower()
        labels = labels or []

        # Check explicit labels first
        for label in labels:
            if label.startswith("complexity:"):
                complexity_str = label.split(":")[1]
                try:
                    return Complexity(complexity_str)
                except ValueError:
                    pass

            # Model labels imply complexity
            if label in ("model:haiku", "model:flash"):
                return Complexity.TRIVIAL
            if label == "model:sonnet":
                return Complexity.COMPLEX
            if label == "model:opus":
                return Complexity.ARCHITECTURE

        # Check for architecture keywords (Opus - rare)
        for keyword in self.config.opus_keywords:
            if keyword in task_lower:
                return Complexity.ARCHITECTURE

        # Check for trivial keywords (Gemini)
        for keyword in self.config.trivial_keywords:
            if keyword in task_lower:
                return Complexity.TRIVIAL

        # Check for simple keywords (Gemini/Haiku)
        for keyword in self.config.simple_keywords:
            if keyword in task_lower:
                return Complexity.SIMPLE

        # Check for complex/security keywords (Sonnet)
        for keyword in self.config.claude_keywords:
            if keyword in task_lower:
                return Complexity.COMPLEX

        # Security keywords also indicate complex (handled separately in routing)
        for keyword in self.config.security_keywords:
            if keyword in task_lower:
                return Complexity.COMPLEX

        # Default based on task length (rough heuristic)
        if len(task) < 100:
            return Complexity.SIMPLE
        elif len(task) < 500:
            return Complexity.STANDARD
        else:
            return Complexity.COMPLEX

    def detect_task_type(self, task: str, labels: list[str] | None = None) -> TaskType:
        """Detect the type of task."""
        task_lower = task.lower()
        labels = labels or []

        # Check labels
        if "review" in labels or "audit" in labels:
            return TaskType.REVIEW
        if "plan" in labels or "design" in labels or "architect" in labels:
            return TaskType.PLAN

        # Check task content
        plan_patterns = [
            r"\bdesign\b", r"\barchitect\b", r"\bplan\b",
            r"\bstrategy\b", r"\bapproach\b",
        ]
        review_patterns = [
            r"\breview\b", r"\baudit\b", r"\bcheck\b",
            r"\bverify\b", r"\bvalidate\b",
        ]

        for pattern in review_patterns:
            if re.search(pattern, task_lower):
                return TaskType.REVIEW

        for pattern in plan_patterns:
            if re.search(pattern, task_lower):
                return TaskType.PLAN

        return TaskType.EXECUTE

    def is_frontend_or_code_task(self, task: str, labels: list[str] | None = None) -> bool:
        """Check if task is frontend/UI or code generation (Moonshot-friendly).

        Kimi K2 excels at:
        - Frontend/UI component development
        - Code generation and refactoring
        - Svelte, React, Vue components
        - CSS/Tailwind styling
        """
        task_lower = task.lower()
        labels = labels or []

        # Check explicit labels
        if any(label in ("frontend", "ui", "code", "component") for label in labels):
            return True

        # Check for frontend keywords
        for keyword in self.config.frontend_keywords:
            if keyword in task_lower:
                return True

        # Check for code generation keywords
        for keyword in self.config.code_keywords:
            if keyword in task_lower:
                return True

        return False

    def is_security_critical(self, task: str, labels: list[str] | None = None) -> bool:
        """Check if task is security-critical (always use Claude Sonnet).

        Security-critical tasks require trusted, well-tested reasoning.
        We don't route these to newer/cheaper providers.
        """
        task_lower = task.lower()
        labels = labels or []

        # Check explicit labels
        if any(label in ("security", "auth", "payment", "compliance") for label in labels):
            return True

        # Check for security keywords
        for keyword in self.config.security_keywords:
            if keyword in task_lower:
                return True

        return False

    def route(self, task: str, labels: list[str] | None = None) -> RoutingDecision:
        """Determine the best provider and model for a task.

        Routing hierarchy:
        1. Architecture → Opus (rare, high-level design)
        2. Planning/Review → Sonnet (trusted reasoning)
        3. Security-critical → Sonnet (no cost optimization on security)
        4. Complex frontend/code → Kimi K2 Thinking (deep reasoning, cheap)
        5. Complex general → Gemini Pro (2.5x cheaper than Sonnet)
        6. Frontend/Code (simple-standard) → Kimi K2 (5-6x cheaper than Sonnet)
        7. Standard → Haiku with thinking
        8. Trivial/Simple → Gemini Flash (cheapest)
        """
        complexity = self.analyze_complexity(task, labels)
        task_type = self.detect_task_type(task, labels)
        is_frontend_code = self.is_frontend_or_code_task(task, labels)
        is_security = self.is_security_critical(task, labels)

        # Architecture-level tasks → Opus (rare)
        if complexity == Complexity.ARCHITECTURE:
            return RoutingDecision(
                provider="claude",
                model="claude-opus-4-20250514",
                complexity=complexity,
                task_type=task_type,
                reason="Architecture-level decisions require Opus",
            )

        # Planning and review tasks → Sonnet (trusted reasoning)
        if task_type in self.config.claude_only_types:
            return RoutingDecision(
                provider="claude",
                model="claude-sonnet-4-20250514",
                complexity=complexity,
                task_type=task_type,
                reason=f"{task_type.value} tasks use Sonnet for trusted reasoning",
            )

        # Security-critical tasks → Sonnet (no cost optimization on security)
        if is_security:
            return RoutingDecision(
                provider="claude",
                model="claude-sonnet-4-20250514",
                complexity=complexity,
                task_type=task_type,
                reason="Security-critical tasks use Sonnet (no cost optimization)",
            )

        # Complex frontend/code → Kimi K2 Thinking (deep reasoning, 5x cheaper)
        if (
            complexity == Complexity.COMPLEX
            and self.config.enable_moonshot
            and self.moonshot
            and is_frontend_code
        ):
            return RoutingDecision(
                provider="moonshot",
                model="kimi-k2-thinking",
                complexity=complexity,
                task_type=task_type,
                reason="Kimi K2 Thinking for complex code (5x cheaper than Sonnet)",
            )

        # Complex general tasks → Gemini Pro (2.5x cheaper than Sonnet)
        if (
            complexity == Complexity.COMPLEX
            and self.config.enable_gemini
            and self.gemini
        ):
            return RoutingDecision(
                provider="gemini",
                model="gemini-2.5-pro",
                complexity=complexity,
                task_type=task_type,
                reason="Gemini Pro for complex reasoning (2.5x cheaper than Sonnet)",
            )

        # Complex fallback → Sonnet (if Gemini unavailable)
        if complexity == Complexity.COMPLEX:
            return RoutingDecision(
                provider="claude",
                model="claude-sonnet-4-20250514",
                complexity=complexity,
                task_type=task_type,
                reason="Complex tasks use Sonnet (Gemini Pro unavailable)",
            )

        # Frontend/Code tasks (simple-standard) → Kimi K2 (5-6x cheaper than Sonnet)
        if (
            self.config.enable_moonshot
            and self.moonshot
            and is_frontend_code
            and complexity.value in (
                Complexity.SIMPLE.value,
                Complexity.STANDARD.value,
            )
        ):
            model = self.moonshot.get_default_model(complexity.value)
            return RoutingDecision(
                provider="moonshot",
                model=model,
                complexity=complexity,
                task_type=task_type,
                reason="Kimi K2 excels at frontend/code (5-6x cheaper than Sonnet)",
            )

        # Standard execution → Haiku with thinking
        if complexity == Complexity.STANDARD:
            return RoutingDecision(
                provider="claude",
                model="claude-3-5-haiku-20241022",
                complexity=complexity,
                task_type=task_type,
                reason="Standard execution uses Haiku with extended thinking",
            )

        # Trivial/Simple → Gemini Flash (cheapest)
        if (
            self.config.enable_gemini
            and self.gemini
            and complexity.value in (Complexity.TRIVIAL.value, Complexity.SIMPLE.value)
        ):
            model = self.gemini.get_default_model(complexity.value)
            return RoutingDecision(
                provider="gemini",
                model=model,
                complexity=complexity,
                task_type=task_type,
                reason=f"Gemini Flash is cheapest for {complexity.value} tasks",
            )

        # Fallback to Haiku for trivial/simple if Gemini unavailable
        return RoutingDecision(
            provider="claude",
            model="claude-3-5-haiku-20241022",
            complexity=complexity,
            task_type=task_type,
            reason="Haiku fallback for simple execution",
        )

    async def execute(
        self,
        task: str,
        labels: list[str] | None = None,
        system_prompt: str | None = None,
        max_tokens: int = 4096,
    ) -> ProviderResult:
        """Route and execute a task with the optimal provider."""
        decision = self.route(task, labels)

        config = ProviderConfig(
            task=task,
            model=decision.model,
            system_prompt=system_prompt,
            max_tokens=max_tokens,
        )

        # Execute with appropriate provider
        if decision.provider == "moonshot" and self.moonshot:
            result = await self.moonshot.execute(config)

            # Fallback to Claude on failure
            if not result.success and self.config.fallback_on_failure:
                fallback_model = self.claude.get_default_model(decision.complexity.value)
                config.model = fallback_model
                result = await self.claude.execute(config)
                if result.success:
                    result.output = f"[Fallback from Moonshot] {result.output}"

        elif decision.provider == "gemini" and self.gemini:
            result = await self.gemini.execute(config)

            # Fallback to Claude on failure
            if not result.success and self.config.fallback_on_failure:
                fallback_model = self.claude.get_default_model(decision.complexity.value)
                config.model = fallback_model
                result = await self.claude.execute(config)
                if result.success:
                    result.output = f"[Fallback from Gemini] {result.output}"
        else:
            result = await self.claude.execute(config)

        return result

    def estimate_savings(self, tasks: list[dict[str, Any]]) -> dict[str, float]:
        """Estimate cost savings from using multi-provider routing.

        Args:
            tasks: List of {"task": str, "labels": list[str]} dicts

        Returns:
            {"claude_only": float, "routed": float, "savings_pct": float}
        """
        claude_cost = 0.0
        routed_cost = 0.0

        for task_info in tasks:
            task = task_info.get("task", "")
            labels = task_info.get("labels", [])

            # Estimate with Claude only
            complexity = self.analyze_complexity(task, labels)
            claude_model = self.claude.get_default_model(complexity.value)
            # Rough estimate: 500 input, 1000 output tokens
            claude_cost += self.claude.estimate_cost(500, 1000, claude_model)

            # Estimate with routing
            decision = self.route(task, labels)
            if decision.provider == "moonshot" and self.moonshot:
                routed_cost += self.moonshot.estimate_cost(500, 1000, decision.model)
            elif decision.provider == "gemini" and self.gemini:
                routed_cost += self.gemini.estimate_cost(500, 1000, decision.model)
            else:
                routed_cost += self.claude.estimate_cost(500, 1000, decision.model)

        savings_pct = ((claude_cost - routed_cost) / claude_cost * 100) if claude_cost > 0 else 0

        return {
            "claude_only": claude_cost,
            "routed": routed_cost,
            "savings_pct": savings_pct,
        }
