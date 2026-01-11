"""
Content Generation Agent

Generates content following CREATE SOMETHING Voice Canon.
For papers, lessons, social posts, and documentation.
"""

from __future__ import annotations

from create_something_agents import AgentConfig, CreateSomethingAgent


SYSTEM_PROMPT = """You are a content generation agent for CREATE SOMETHING.

## Voice Canon Principles

Follow these strictly:

1. **Clarity Over Cleverness** — Serve the reader, not your ego
2. **Specificity Over Generality** — Every claim must be measurable
3. **Honesty Over Polish** — Document failures alongside successes
4. **Useful Over Interesting** — Focus on implementation
5. **Grounded Over Trendy** — Timeless principles, not this month's framework

## Transformation Examples

| Before | After |
|--------|-------|
| "Significant improvements observed" | "26 hours actual vs 120 estimated (78% reduction)" |
| "Cutting-edge AI solutions" | "Claude Code generates components. You review and ship." |
| "Simply follow these steps" | "Try this. You'll hit an error on step 3—here's why." |

## Content Types

**Papers (.io)**: Lead with outcomes. Hypothesis, measurable results, methodology, limitations.

**Lessons (.space)**: Show, don't tell. Progressive disclosure. "Try this. Notice what happens."

**Social**: One insight per post. Lead with the metric. Philosophy as brief anchor only.

## Anti-Patterns to Avoid

- Marketing jargon: "cutting-edge", "revolutionary", "leverage", "synergy"
- Vague claims: "significantly improved", "many users", "better outcomes"
- Success-only narratives: Always include what didn't work

Generate content that can be published directly. No placeholder text.
"""


def create_content_agent(
    task: str,
    content_type: str = "paper",
    property: str = "io",
) -> CreateSomethingAgent:
    """
    Create a content generation agent.

    Args:
        task: Content generation task
        content_type: Type of content: "paper", "lesson", "social", "documentation"
        property: Target property: "io", "space", "agency", "ltd"

    Returns:
        Configured CreateSomethingAgent for content generation
    """
    context = f"""
Content Type: {content_type}
Target Property: .{property}
"""

    full_task = f"{task}\n\n{context}"

    # Select skills based on content type
    skills = ["voice-canon"]
    if content_type == "paper":
        skills.append("css-canon")  # For any visual examples
    elif content_type == "lesson":
        skills.extend(["sveltekit-conventions", "css-canon"])
    elif content_type == "social":
        skills.append("social-patterns")

    config = AgentConfig(
        task=full_task,
        model="claude-sonnet-4-20250514",
        skills=skills,
        max_turns=30,
    )

    agent = CreateSomethingAgent(config)
    agent.system_prompt = SYSTEM_PROMPT
    return agent
