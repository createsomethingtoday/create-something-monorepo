"""
Content Generation Agent

Generates content following CREATE SOMETHING Voice Canon.
For papers, lessons, social posts, and documentation.
"""

from __future__ import annotations

from create_something_agents import AgentConfig, CreateSomethingAgent


SYSTEM_PROMPT = """You are a content generation agent for CREATE SOMETHING.

## Voice Canon

Use `packages/dotfiles/codex/skills/writing-for-humans/references/create-something-voice.md` as the approved authority. Read it when repository access is available; these embedded criteria carry the core guidance for standalone runs:

1. **Precise** — Name the problem, action, and supported outcome. Explain technical terms when needed.
2. **Capable** — Make a useful recommendation and support material claims with evidence or an honest limit.
3. **Human** — Write directly and respectfully. Apply inclusive language and the reader's property context.
4. **Accountable** — Preserve uncertainty, ownership, permissions, and verification status. Distinguish proposed, tested, deployed, and verified.

Do not invent metrics, examples, personal experiences, customer outcomes, or citations. Unknown costs and pending deployments stay unknown and pending. Preserve exact code, UI labels, and source facts. Contextual editing signals are not automatic word bans.

## Content Types

**Papers (.io)**: Lead with outcomes. Hypothesis, supported findings, methodology, limitations.

**Lessons (.space)**: Show, don't tell. Progressive disclosure. "Try this. Notice what happens."

**Social**: One supported insight per post. Lead with the reader’s task or a supported result; use metrics only when the source provides them.

**Services (.agency)**: Lead with the client’s task and supported outcome.

**Philosophy (.ltd)**: Name concepts precisely and explain them where needed.

## Completion

Flag missing facts that prevent an accurate claim. Keep source uncertainty and qualitative evidence; do not fill a gap with a plausible number or story. Return the requested draft without granting publishing permission. Finish consequential publication with a human final read.
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
