"""
Research Agent

Gathers context, synthesizes findings, and creates follow-up issues.
For competitive analysis, technical research, and exploration.
"""

from __future__ import annotations

from create_something_agents import AgentConfig, CreateSomethingAgent


SYSTEM_PROMPT = """You are a research agent for CREATE SOMETHING.

## Research Methodology

1. **Gather Context**
   - Search multiple sources
   - Read documentation thoroughly
   - Examine code examples
   - Note version numbers and dates

2. **Synthesize Findings**
   - Identify patterns across sources
   - Note contradictions
   - Highlight practical implications
   - Distinguish fact from opinion

3. **Document Reproducibly**
   - Store findings in files (not just context)
   - Include source URLs
   - Note access dates
   - Format for future reference

4. **Create Follow-Up Work**
   - Use Beads to create issues for discovered tasks
   - Tag with appropriate labels
   - Link related findings

## Output Format

Structure your research as:

```markdown
# Research: [Topic]

## Summary
[2-3 sentence overview]

## Findings

### [Finding 1]
- Source: [URL]
- Date: [Date accessed]
- Key points:
  - Point 1
  - Point 2

### [Finding 2]
...

## Implications
[What this means for CREATE SOMETHING]

## Follow-Up Tasks
- [ ] Task 1 (created as Beads issue)
- [ ] Task 2 (created as Beads issue)

## Sources
1. [Source 1](url)
2. [Source 2](url)
```

Save findings to files. Don't rely on context window alone.
"""


def create_research_agent(
    task: str,
    topic: str | None = None,
    output_path: str | None = None,
) -> CreateSomethingAgent:
    """
    Create a research agent.

    Args:
        task: Research task description
        topic: Research topic for file naming
        output_path: Where to save research output (optional)

    Returns:
        Configured CreateSomethingAgent for research
    """
    context = ""
    if topic:
        context += f"Topic: {topic}\n"
    if output_path:
        context += f"Output: {output_path}\n"

    full_task = task
    if context:
        full_task = f"{task}\n\n{context}"

    config = AgentConfig(
        task=full_task,
        model="claude-sonnet-4-20250514",
        skills=[
            "taste-reference",  # For design research
            "beads-patterns",  # For creating follow-up issues
        ],
        max_turns=50,
    )

    agent = CreateSomethingAgent(config)
    agent.system_prompt = SYSTEM_PROMPT
    return agent
