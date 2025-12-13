"""
LLM-Powered Recommendations for the Subtractive Triad

Uses Hugging Face Inference API to provide contextual,
philosophically-grounded suggestions for each violation.
"""

import os
from typing import Optional
from huggingface_hub import InferenceClient
from triad_audit import AuditResult, Violation


# System prompt grounding the LLM in the Subtractive Triad philosophy
SYSTEM_PROMPT = """You are a code reviewer embodying the Subtractive Triad philosophy from CREATE SOMETHING.

The Subtractive Triad applies one principle—subtractive revelation—at three scales:

1. DRY (Implementation): "Have I built this before?" → Action: Unify
   - Eliminate duplication through abstraction
   - Create shared utilities, not copy-paste

2. Rams (Artifact): "Does this earn its existence?" → Action: Remove
   - Dieter Rams: "Weniger, aber besser" (Less, but better)
   - Every line must justify itself
   - If in doubt, delete it

3. Heidegger (System): "Does this serve the whole?" → Action: Reconnect
   - The hermeneutic circle: parts serve the whole, whole gives meaning to parts
   - Code exists in context—isolated code is disconnected code
   - Documentation explains the part's role in the system

Your recommendations should:
- Be concise (2-3 sentences max)
- Ground suggestions in the philosophy
- Provide specific, actionable next steps
- Explain WHY through the lens of the triad, not just WHAT to fix

Remember: Creation is the discipline of removing what obscures."""


def get_inference_client() -> Optional[InferenceClient]:
    """Get HuggingFace inference client if token is available."""
    token = os.environ.get("HF_TOKEN")
    if not token:
        return None
    return InferenceClient(token=token)


def get_recommendation_for_violation(
    client: InferenceClient,
    violation: Violation,
    code_context: str,
    model: str = "mistralai/Mistral-7B-Instruct-v0.3"
) -> str:
    """Generate a philosophical recommendation for a specific violation."""

    level_context = {
        "dry": "DRY (Implementation) - 'Have I built this before?' - The discipline of unification.",
        "rams": "Rams (Artifact) - 'Does this earn its existence?' - Weniger, aber besser.",
        "heidegger": "Heidegger (System) - 'Does this serve the whole?' - The hermeneutic circle."
    }

    prompt = f"""<s>[INST] {SYSTEM_PROMPT}

Analyze this violation at the {level_context.get(violation.level, violation.level)} level:

**Violation:** {violation.message}
**Location:** {violation.location or 'Not specified'}
**Current suggestion:** {violation.suggestion or 'None'}

**Code context:**
```python
{code_context[:1500]}
```

Provide a 2-3 sentence recommendation grounded in the Subtractive Triad philosophy. Be specific about what to do and why it matters philosophically. [/INST]"""

    try:
        response = client.text_generation(
            prompt,
            max_new_tokens=200,
            temperature=0.7,
            do_sample=True,
        )
        return response.strip()
    except Exception as e:
        return f"(Recommendation unavailable: {str(e)})"


def get_overall_recommendation(
    client: InferenceClient,
    result: AuditResult,
    code: str,
    model: str = "mistralai/Mistral-7B-Instruct-v0.3"
) -> str:
    """Generate an overall philosophical assessment of the code."""

    violations_summary = []
    for v in result.dry.violations[:2]:
        violations_summary.append(f"- DRY: {v.message}")
    for v in result.rams.violations[:2]:
        violations_summary.append(f"- Rams: {v.message}")
    for v in result.heidegger.violations[:2]:
        violations_summary.append(f"- Heidegger: {v.message}")

    commendations_summary = []
    for c in result.dry.commendations:
        commendations_summary.append(f"- DRY: {c}")
    for c in result.rams.commendations:
        commendations_summary.append(f"- Rams: {c}")
    for c in result.heidegger.commendations:
        commendations_summary.append(f"- Heidegger: {c}")

    prompt = f"""<s>[INST] {SYSTEM_PROMPT}

Provide a brief philosophical assessment of this code based on the Subtractive Triad audit:

**Scores:**
- DRY (Implementation): {result.dry.score}/10
- Rams (Artifact): {result.rams.score}/10
- Heidegger (System): {result.heidegger.score}/10
- Overall: {result.overall_score}/10

**Key Violations:**
{chr(10).join(violations_summary) if violations_summary else "None significant"}

**Commendations:**
{chr(10).join(commendations_summary) if commendations_summary else "None"}

**Code preview:**
```python
{code[:800]}
```

Write 3-4 sentences that:
1. Summarize the code's relationship to the Subtractive Triad
2. Identify the most important area for improvement
3. End with an actionable next step

Be philosophical but practical. [/INST]"""

    try:
        response = client.text_generation(
            prompt,
            max_new_tokens=300,
            temperature=0.7,
            do_sample=True,
        )
        return response.strip()
    except Exception as e:
        return f"(Assessment unavailable: {str(e)})"


def enhance_audit_with_llm(result: AuditResult, code: str) -> tuple[AuditResult, str]:
    """
    Enhance audit results with LLM-powered recommendations.

    Returns the result (potentially with enhanced suggestions) and an overall assessment.
    """
    client = get_inference_client()

    if not client:
        return result, "*LLM recommendations require HF_TOKEN environment variable*"

    # Get overall assessment
    overall_assessment = get_overall_recommendation(client, result, code)

    # Enhance top violations with LLM recommendations
    all_violations = (
        result.dry.violations[:2] +
        result.rams.violations[:2] +
        result.heidegger.violations[:2]
    )

    for violation in all_violations:
        if not violation.suggestion or len(violation.suggestion) < 50:
            llm_suggestion = get_recommendation_for_violation(client, violation, code)
            if llm_suggestion and "(Recommendation unavailable" not in llm_suggestion:
                violation.suggestion = llm_suggestion

    return result, overall_assessment
