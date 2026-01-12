"""
GTM (Go-To-Market) Agent

Handles campaign tracking, lead management, and sales enablement.
For .agency property marketing and business development.
"""

from __future__ import annotations

from create_something_agents import AgentConfig, CreateSomethingAgent


SYSTEM_PROMPT = """You are a GTM (Go-To-Market) agent for CREATE SOMETHING.

## Core Responsibilities

1. **Campaign Status** — Track and report on active marketing campaigns
2. **Lead Tracking** — Monitor and qualify inbound leads
3. **Sales Enablement** — Generate materials that support sales conversations
4. **Content Distribution** — Schedule and track social content performance

## The Unified Thesis

Every piece of GTM content connects to this:

> "Better outcomes through systematic discipline. Norvig achieved 20x improvement.
> Kickstand reduced 155 scripts to 13. Here's the methodology—and why it works."

## Presentation Order

| Position | Content | Example |
|----------|---------|---------|
| First sentence | Metric or outcome | "155 scripts → 13" |
| Middle | Concrete methodology | "Bounded tasks, quality gates, systematic review" |
| Closing (optional) | Philosophy anchor | "Rooted in design discipline" |

**The Earned Depth Principle**: Philosophy earns its place after outcomes establish credibility.

## Content Guidelines

**Lead with outcomes, not philosophy:**
- ❌ "Applying Heideggerian phenomenology to AI development..."
- ✅ "Production in 6 hours. $50K under budget. Here's how."

**Avoid marketing jargon:**
- ❌ "Cutting-edge AI solutions", "transformative digital outcomes"
- ✅ "Claude Code generates components. You review and ship."

**Be specific:**
- ❌ "Significant cost savings", "improved efficiency"
- ✅ "78% reduction in development time", "155 scripts → 13"

## Multi-Account Strategy

| Account | Purpose | Voice |
|---------|---------|-------|
| CREATE SOMETHING | Research institution | Evidence-first |
| WORKWAY | Methodology in practice | Practical, applied |
| Personal (Micah) | Practitioner perspective | Learning alongside |

## Lead Qualification

Qualified leads typically exhibit:
- Interest in AI-native development (not just "AI tools")
- Recognition of methodology value (not just code output)
- Budget for systematic implementation
- Technical decision-making authority

## Output Formats

When generating GTM content:
1. **Campaign Reports** — Metrics, trends, recommendations
2. **Lead Summaries** — Qualification status, next steps
3. **Social Content** — Following social-patterns.md
4. **Sales Materials** — Case studies, capability decks

Always include actionable next steps.
"""


def create_gtm_agent(
    task: str,
    campaign_context: str | None = None,
    leads: list[str] | None = None,
) -> CreateSomethingAgent:
    """
    Create a GTM (Go-To-Market) agent.

    Args:
        task: GTM task (campaign tracking, lead analysis, content generation)
        campaign_context: Optional context about active campaigns
        leads: Optional list of lead identifiers to focus on

    Returns:
        Configured CreateSomethingAgent for GTM tasks
    """
    context_parts = []

    if campaign_context:
        context_parts.append(f"Campaign Context: {campaign_context}")

    if leads:
        context_parts.append(f"Focus Leads: {', '.join(leads)}")

    context = "\n".join(context_parts) if context_parts else ""
    full_task = f"{task}\n\n{context}" if context else task

    config = AgentConfig(
        task=full_task,
        model="claude-sonnet-4-20250514",
        skills=[
            "voice-canon",  # Writing quality
            "social-patterns",  # Content distribution
            "service-delivery-patterns",  # .agency methodology
        ],
        max_turns=25,
    )

    agent = CreateSomethingAgent(config)
    agent.system_prompt = SYSTEM_PROMPT
    return agent


def create_campaign_tracker(campaign_id: str) -> CreateSomethingAgent:
    """
    Create an agent focused on tracking a specific campaign.

    Args:
        campaign_id: Campaign identifier to track

    Returns:
        Agent configured for campaign analysis
    """
    return create_gtm_agent(
        task=f"""Analyze campaign {campaign_id}:

1. Gather current metrics (impressions, engagement, conversions)
2. Compare to previous period
3. Identify top-performing content
4. Recommend optimizations
5. Generate status report

Output a structured campaign report with actionable recommendations.""",
        campaign_context=f"Campaign: {campaign_id}",
    )


def create_lead_qualifier(leads: list[str]) -> CreateSomethingAgent:
    """
    Create an agent to qualify inbound leads.

    Args:
        leads: List of lead identifiers to analyze

    Returns:
        Agent configured for lead qualification
    """
    return create_gtm_agent(
        task="""Qualify the following leads:

For each lead, determine:
1. Interest level (stated needs, engagement patterns)
2. Budget indicators (company size, previous purchases)
3. Technical fit (their stack, AI readiness)
4. Decision authority (role, org structure)
5. Qualification score (1-10)
6. Recommended next action

Output a prioritized list with qualification details and next steps.""",
        leads=leads,
    )
