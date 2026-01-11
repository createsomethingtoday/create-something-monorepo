"""
Client Agent (Configurable)

Generic agent that can be configured per-client requirements.
Used for .agency client work with custom constraints.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from create_something_agents import AgentConfig, CreateSomethingAgent


@dataclass
class ClientConfig:
    """Configuration for a client agent."""

    client_id: str
    client_name: str
    instructions: str
    skills: list[str] = field(default_factory=list)
    allowed_paths: list[str] = field(default_factory=lambda: ["."])
    allowed_commands: list[str] | None = None  # None = all allowed
    allow_beads: bool = False
    max_turns: int = 30
    model: str = "claude-sonnet-4-20250514"


def create_client_agent(
    task: str,
    config: ClientConfig,
) -> CreateSomethingAgent:
    """
    Create a configurable client agent.

    Args:
        task: Task to perform
        config: Client-specific configuration

    Returns:
        Configured CreateSomethingAgent for client work
    """
    system_prompt = f"""You are an agent for {config.client_name}.

## Client Instructions

{config.instructions}

## Working Directory Restrictions

You may only access paths under: {', '.join(config.allowed_paths)}

"""

    if config.allowed_commands:
        system_prompt += f"""## Allowed Commands

You may only use these bash commands: {', '.join(config.allowed_commands)}

"""

    if not config.allow_beads:
        system_prompt += """## Note

Do not use the Beads tool for this client. Track work externally.

"""

    agent_config = AgentConfig(
        task=task,
        model=config.model,
        skills=config.skills,
        max_turns=config.max_turns,
    )

    agent = CreateSomethingAgent(agent_config)
    agent.system_prompt = system_prompt

    return agent


# Example client configurations
EXAMPLE_CONFIGS = {
    "standard": ClientConfig(
        client_id="standard",
        client_name="Standard Client",
        instructions="""
Follow CREATE SOMETHING patterns for:
- Code style (Tailwind for structure, Canon for aesthetics)
- SvelteKit conventions
- Cloudflare deployment

Prioritize simplicity and maintainability.
""",
        skills=["sveltekit-conventions", "css-canon", "cloudflare-patterns"],
    ),
    "restricted": ClientConfig(
        client_id="restricted",
        client_name="Restricted Client",
        instructions="""
This client has specific security requirements:
- No external API calls without approval
- All changes must be in designated directories
- Document all modifications

Be conservative with changes.
""",
        allowed_paths=["./src", "./tests"],
        allowed_commands=["npm", "pnpm", "git", "ls", "cat", "echo"],
        allow_beads=False,
    ),
}
