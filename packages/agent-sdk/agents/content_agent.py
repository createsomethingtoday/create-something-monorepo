"""
Content Generation Agent

Generates content following CREATE SOMETHING Voice Canon.
For papers, lessons, social posts, and documentation.
"""

from __future__ import annotations

from create_something_agents import AgentConfig, CreateSomethingAgent
from create_something_agents.prompts import CONTENT_SYSTEM_PROMPT as SYSTEM_PROMPT


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
