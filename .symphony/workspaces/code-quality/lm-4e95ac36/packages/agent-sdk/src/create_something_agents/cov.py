"""
Chain-of-Verification (CoV) Pattern

@pattern
```yaml
id: chain-of-verification-v1
name: Chain-of-Verification
category: AgenticOrchestration
description: |
  Multi-step LLM validation to reduce hallucinations. Runs content through
  verification steps, auto-refining on failure. Use for code generation,
  JSON validation, SQL safety checks.
priority_score: 38
dependencies: [anthropic]
example_usage: |
  result = await cov_verify(
    content="def add(a, b): return a + b",
    verification_type="code",
    model="sonnet"
  )
  if result.passed: print("Code is valid")
llm_prompt: |
  Validate LLM-generated content using chain-of-verification-v1. Choose
  verification_type: code, json, sql, markdown. Enable auto_refine=True
  to automatically fix issues.
inspired_by: ["Dhuliawala et al. CoVe paper", "Constitutional AI"]
status: stable
```

Multi-step LLM validation to reduce hallucinations in code generation.
The pattern: Generate → Verify → Refine

Philosophy: "Trust but verify" — LLM outputs should be validated before
being used in production workflows. CoV catches errors early.

Usage:
    from create_something_agents.cov import ChainOfVerification, cov_verify

    # Simple verification
    result = await cov_verify(
        content="def add(a, b): return a + b",
        verification_type="code",
        model="sonnet"
    )

    # Custom verification chain
    cov = ChainOfVerification(model="sonnet")
    cov.add_verifier(syntax_verifier)
    cov.add_verifier(logic_verifier)
    result = await cov.verify(content)
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Awaitable

import anthropic


# ─────────────────────────────────────────────────────────────────────────────
# Types
# ─────────────────────────────────────────────────────────────────────────────


class VerificationStatus(Enum):
    """Status of a verification step."""

    PASSED = "passed"
    FAILED = "failed"
    WARNING = "warning"
    SKIPPED = "skipped"


class VerificationType(Enum):
    """Built-in verification types."""

    CODE = "code"
    JSON = "json"
    MARKDOWN = "markdown"
    SQL = "sql"
    API_RESPONSE = "api_response"
    CUSTOM = "custom"


@dataclass
class VerificationFinding:
    """A finding from a verification step."""

    severity: str  # "error", "warning", "info"
    message: str
    location: str | None = None
    suggestion: str | None = None


@dataclass
class VerificationResult:
    """Result of a single verification step."""

    step_name: str
    status: VerificationStatus
    findings: list[VerificationFinding] = field(default_factory=list)
    refined_content: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class CoVResult:
    """Complete result of Chain-of-Verification."""

    original_content: str
    final_content: str
    status: VerificationStatus
    steps: list[VerificationResult] = field(default_factory=list)
    total_refinements: int = 0
    model_calls: int = 0
    total_tokens: int = 0

    @property
    def passed(self) -> bool:
        """Whether verification passed."""
        return self.status == VerificationStatus.PASSED

    @property
    def has_warnings(self) -> bool:
        """Whether there are warnings."""
        return any(
            f.severity == "warning"
            for step in self.steps
            for f in step.findings
        )


# Verifier function type
Verifier = Callable[[str, dict[str, Any]], Awaitable[VerificationResult]]


# ─────────────────────────────────────────────────────────────────────────────
# Chain of Verification
# ─────────────────────────────────────────────────────────────────────────────


class ChainOfVerification:
    """
    Chain-of-Verification orchestrator.

    Runs content through a series of verification steps,
    optionally refining content after each step.
    """

    def __init__(
        self,
        model: str = "claude-sonnet-4-20250514",
        max_refinements: int = 3,
        auto_refine: bool = True,
        stop_on_error: bool = True,
    ):
        self.client = anthropic.Anthropic()
        self.model = model
        self.max_refinements = max_refinements
        self.auto_refine = auto_refine
        self.stop_on_error = stop_on_error
        self._verifiers: list[tuple[str, Verifier]] = []
        self._model_calls = 0
        self._total_tokens = 0

    def add_verifier(self, name: str, verifier: Verifier) -> "ChainOfVerification":
        """Add a verification step."""
        self._verifiers.append((name, verifier))
        return self

    def use_builtin(self, verification_type: VerificationType) -> "ChainOfVerification":
        """Add a built-in verifier."""
        verifier = get_builtin_verifier(verification_type, self)
        self._verifiers.append((verification_type.value, verifier))
        return self

    async def verify(
        self,
        content: str,
        context: dict[str, Any] | None = None,
    ) -> CoVResult:
        """
        Run the verification chain on content.

        Args:
            content: The content to verify
            context: Additional context for verifiers

        Returns:
            CoVResult with all verification results
        """
        self._model_calls = 0
        self._total_tokens = 0

        ctx = context or {}
        current_content = content
        steps: list[VerificationResult] = []
        total_refinements = 0

        for name, verifier in self._verifiers:
            result = await verifier(current_content, ctx)
            steps.append(result)

            # Check for failures
            if result.status == VerificationStatus.FAILED:
                if self.auto_refine and total_refinements < self.max_refinements:
                    # Attempt refinement
                    refined = await self._refine_content(
                        current_content, result, ctx
                    )
                    if refined:
                        total_refinements += 1
                        current_content = refined
                        result.refined_content = refined

                        # Re-run this verifier on refined content
                        recheck = await verifier(refined, ctx)
                        if recheck.status != VerificationStatus.FAILED:
                            result.status = recheck.status
                            result.findings = recheck.findings
                        else:
                            # Refinement didn't help
                            if self.stop_on_error:
                                break
                elif self.stop_on_error:
                    break

            # Use refined content for next step if available
            if result.refined_content:
                current_content = result.refined_content

        # Determine overall status
        if any(s.status == VerificationStatus.FAILED for s in steps):
            overall_status = VerificationStatus.FAILED
        elif any(s.status == VerificationStatus.WARNING for s in steps):
            overall_status = VerificationStatus.WARNING
        else:
            overall_status = VerificationStatus.PASSED

        return CoVResult(
            original_content=content,
            final_content=current_content,
            status=overall_status,
            steps=steps,
            total_refinements=total_refinements,
            model_calls=self._model_calls,
            total_tokens=self._total_tokens,
        )

    async def _refine_content(
        self,
        content: str,
        failed_result: VerificationResult,
        context: dict[str, Any],
    ) -> str | None:
        """Attempt to refine content based on verification failures."""
        findings_text = "\n".join(
            f"- [{f.severity.upper()}] {f.message}"
            + (f" at {f.location}" if f.location else "")
            + (f"\n  Suggestion: {f.suggestion}" if f.suggestion else "")
            for f in failed_result.findings
        )

        prompt = f"""The following content failed verification step "{failed_result.step_name}":

<content>
{content}
</content>

<findings>
{findings_text}
</findings>

Please fix the issues and return ONLY the corrected content, with no explanations or markdown formatting.
If the content type is code, return only the code.
If it's JSON, return only valid JSON.

Context: {json.dumps(context) if context else 'None'}

Corrected content:"""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                messages=[{"role": "user", "content": prompt}],
            )

            self._model_calls += 1
            self._total_tokens += response.usage.input_tokens + response.usage.output_tokens

            return response.content[0].text.strip()
        except Exception as e:
            print(f"[CoV] Refinement failed: {e}")
            return None

    async def _llm_verify(
        self,
        content: str,
        verification_prompt: str,
    ) -> tuple[bool, list[VerificationFinding]]:
        """Use LLM to verify content."""
        prompt = f"""{verification_prompt}

<content>
{content}
</content>

Respond with a JSON object containing:
{{
  "valid": true/false,
  "findings": [
    {{
      "severity": "error" | "warning" | "info",
      "message": "description of the issue",
      "location": "optional location in content",
      "suggestion": "optional fix suggestion"
    }}
  ]
}}

JSON response:"""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2048,
                messages=[{"role": "user", "content": prompt}],
            )

            self._model_calls += 1
            self._total_tokens += response.usage.input_tokens + response.usage.output_tokens

            # Parse response
            text = response.content[0].text.strip()
            # Handle markdown code blocks
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0]

            data = json.loads(text)
            findings = [
                VerificationFinding(
                    severity=f.get("severity", "error"),
                    message=f.get("message", "Unknown issue"),
                    location=f.get("location"),
                    suggestion=f.get("suggestion"),
                )
                for f in data.get("findings", [])
            ]

            return data.get("valid", False), findings

        except Exception as e:
            return False, [
                VerificationFinding(
                    severity="error",
                    message=f"Verification failed: {e}",
                )
            ]


# ─────────────────────────────────────────────────────────────────────────────
# Built-in Verifiers
# ─────────────────────────────────────────────────────────────────────────────


def get_builtin_verifier(
    verification_type: VerificationType,
    cov: ChainOfVerification,
) -> Verifier:
    """Get a built-in verifier function."""

    async def code_verifier(content: str, ctx: dict[str, Any]) -> VerificationResult:
        """Verify code syntax and logic."""
        prompt = """Verify this code for:
1. Syntax errors
2. Obvious logic errors
3. Missing imports or undefined variables
4. Security issues (SQL injection, XSS, etc.)
5. Best practices violations

Be strict but fair. Only report actual issues, not style preferences."""

        valid, findings = await cov._llm_verify(content, prompt)
        errors = [f for f in findings if f.severity == "error"]

        return VerificationResult(
            step_name="code",
            status=(
                VerificationStatus.FAILED if errors
                else VerificationStatus.WARNING if findings
                else VerificationStatus.PASSED
            ),
            findings=findings,
        )

    async def json_verifier(content: str, ctx: dict[str, Any]) -> VerificationResult:
        """Verify JSON is valid."""
        findings = []

        try:
            json.loads(content)
        except json.JSONDecodeError as e:
            findings.append(
                VerificationFinding(
                    severity="error",
                    message=f"Invalid JSON: {e.msg}",
                    location=f"line {e.lineno}, column {e.colno}",
                    suggestion="Ensure all strings are quoted, no trailing commas, etc.",
                )
            )

        # If basic parsing passes, do semantic validation
        if not findings:
            schema = ctx.get("schema")
            if schema:
                prompt = f"""Verify this JSON against the expected schema:
Schema: {json.dumps(schema)}

Check for:
1. Required fields present
2. Correct data types
3. Valid values"""
                valid, schema_findings = await cov._llm_verify(content, prompt)
                findings.extend(schema_findings)

        return VerificationResult(
            step_name="json",
            status=(
                VerificationStatus.FAILED if any(f.severity == "error" for f in findings)
                else VerificationStatus.WARNING if findings
                else VerificationStatus.PASSED
            ),
            findings=findings,
        )

    async def markdown_verifier(content: str, ctx: dict[str, Any]) -> VerificationResult:
        """Verify markdown structure."""
        prompt = """Verify this markdown for:
1. Proper heading hierarchy (h1 → h2 → h3)
2. Valid link syntax
3. Proper code block formatting
4. No broken references
5. Consistent list formatting"""

        valid, findings = await cov._llm_verify(content, prompt)

        return VerificationResult(
            step_name="markdown",
            status=(
                VerificationStatus.FAILED if any(f.severity == "error" for f in findings)
                else VerificationStatus.WARNING if findings
                else VerificationStatus.PASSED
            ),
            findings=findings,
        )

    async def sql_verifier(content: str, ctx: dict[str, Any]) -> VerificationResult:
        """Verify SQL syntax and safety."""
        prompt = """Verify this SQL for:
1. Valid SQL syntax
2. SQL injection vulnerabilities (look for string concatenation)
3. Missing WHERE clauses on UPDATE/DELETE
4. Proper escaping
5. N+1 query patterns"""

        valid, findings = await cov._llm_verify(content, prompt)
        errors = [f for f in findings if f.severity == "error"]

        return VerificationResult(
            step_name="sql",
            status=(
                VerificationStatus.FAILED if errors
                else VerificationStatus.WARNING if findings
                else VerificationStatus.PASSED
            ),
            findings=findings,
        )

    async def api_response_verifier(content: str, ctx: dict[str, Any]) -> VerificationResult:
        """Verify API response structure."""
        expected_fields = ctx.get("expected_fields", [])
        prompt = f"""Verify this API response for:
1. Valid JSON structure
2. Expected fields present: {expected_fields}
3. Reasonable data values (no placeholders like "TODO", "xxx", "example")
4. No sensitive data exposure
5. Consistent naming conventions"""

        valid, findings = await cov._llm_verify(content, prompt)

        return VerificationResult(
            step_name="api_response",
            status=(
                VerificationStatus.FAILED if any(f.severity == "error" for f in findings)
                else VerificationStatus.WARNING if findings
                else VerificationStatus.PASSED
            ),
            findings=findings,
        )

    verifiers = {
        VerificationType.CODE: code_verifier,
        VerificationType.JSON: json_verifier,
        VerificationType.MARKDOWN: markdown_verifier,
        VerificationType.SQL: sql_verifier,
        VerificationType.API_RESPONSE: api_response_verifier,
    }

    return verifiers.get(verification_type, code_verifier)


# ─────────────────────────────────────────────────────────────────────────────
# Convenience Functions
# ─────────────────────────────────────────────────────────────────────────────


async def cov_verify(
    content: str,
    verification_type: VerificationType | str = VerificationType.CODE,
    model: str = "claude-sonnet-4-20250514",
    context: dict[str, Any] | None = None,
    auto_refine: bool = True,
    max_refinements: int = 2,
) -> CoVResult:
    """
    Quick verification of content.

    Args:
        content: Content to verify
        verification_type: Type of verification
        model: Claude model to use
        context: Additional context
        auto_refine: Whether to attempt auto-refinement
        max_refinements: Maximum refinement attempts

    Returns:
        CoVResult with verification results
    """
    if isinstance(verification_type, str):
        verification_type = VerificationType(verification_type)

    cov = ChainOfVerification(
        model=model,
        auto_refine=auto_refine,
        max_refinements=max_refinements,
    )
    cov.use_builtin(verification_type)

    return await cov.verify(content, context)


async def verify_code(
    code: str,
    language: str | None = None,
    model: str = "claude-sonnet-4-20250514",
) -> CoVResult:
    """Verify code content."""
    context = {"language": language} if language else {}
    return await cov_verify(code, VerificationType.CODE, model, context)


async def verify_json(
    json_str: str,
    schema: dict[str, Any] | None = None,
    model: str = "claude-sonnet-4-20250514",
) -> CoVResult:
    """Verify JSON content."""
    context = {"schema": schema} if schema else {}
    return await cov_verify(json_str, VerificationType.JSON, model, context)


def format_cov_result(result: CoVResult) -> str:
    """Format CoV result for display."""
    lines = []

    status_icon = {
        VerificationStatus.PASSED: "✅",
        VerificationStatus.WARNING: "⚠️",
        VerificationStatus.FAILED: "❌",
        VerificationStatus.SKIPPED: "⏭️",
    }

    lines.append(f"{status_icon[result.status]} Verification: {result.status.value.upper()}")
    lines.append(f"   Steps: {len(result.steps)}")
    lines.append(f"   Refinements: {result.total_refinements}")
    lines.append(f"   Model calls: {result.model_calls}")
    lines.append(f"   Tokens: {result.total_tokens}")
    lines.append("")

    for step in result.steps:
        lines.append(f"   {status_icon[step.status]} {step.step_name}")
        for finding in step.findings:
            severity_icon = {"error": "🔴", "warning": "🟡", "info": "🔵"}.get(
                finding.severity, "⚪"
            )
            lines.append(f"      {severity_icon} {finding.message}")
            if finding.suggestion:
                lines.append(f"         💡 {finding.suggestion}")

    if result.original_content != result.final_content:
        lines.append("")
        lines.append("   📝 Content was refined during verification")

    return "\n".join(lines)
