"""Tests for CREATE SOMETHING pre-built agents."""

from __future__ import annotations

import pytest


class TestTemplateDeployer:
    """Tests for template deployer agent."""

    def test_create_template_deployer(self) -> None:
        """Test creating a template deployer agent."""
        from agents.template_deployer import create_template_deployer

        agent = create_template_deployer(
            task="Deploy template",
            subdomain="testsite",
            template_id="tpl_professional_services",
        )

        assert agent is not None
        assert "DEPLOY_COMPLETE" in agent.system_prompt
        assert len(agent.config.stop_hooks) == 1
        assert agent.config.model == "claude-sonnet-4-20250514"

    def test_template_deployer_skills(self) -> None:
        """Test template deployer has correct skills."""
        from agents.template_deployer import create_template_deployer

        agent = create_template_deployer(task="Deploy")

        assert "cloudflare-patterns" in agent.config.skills
        assert "template-deployment-patterns" in agent.config.skills


class TestContentAgent:
    """Tests for content generation agent."""

    def test_create_content_agent(self) -> None:
        """Test creating a content agent."""
        from agents.content_agent import create_content_agent

        agent = create_content_agent(
            task="Write a paper about X",
            content_type="paper",
            property="io",
        )

        assert agent is not None
        assert "Voice Canon" in agent.system_prompt
        assert "voice-canon" in agent.config.skills

    def test_content_agent_types(self) -> None:
        """Test different content types load different skills."""
        from agents.content_agent import create_content_agent

        paper_agent = create_content_agent(task="Write", content_type="paper")
        lesson_agent = create_content_agent(task="Write", content_type="lesson")
        social_agent = create_content_agent(task="Write", content_type="social")

        # All have voice-canon
        assert "voice-canon" in paper_agent.config.skills
        assert "voice-canon" in lesson_agent.config.skills
        assert "voice-canon" in social_agent.config.skills

        # Lesson has sveltekit
        assert "sveltekit-conventions" in lesson_agent.config.skills

        # Social has social patterns
        assert "social-patterns" in social_agent.config.skills


class TestResearchAgent:
    """Tests for research agent."""

    def test_create_research_agent(self) -> None:
        """Test creating a research agent."""
        from agents.research_agent import create_research_agent

        agent = create_research_agent(
            task="Research competitor landscape",
            topic="AI agents",
        )

        assert agent is not None
        assert "Research Methodology" in agent.system_prompt
        assert "beads-patterns" in agent.config.skills

    def test_research_agent_output_path(self) -> None:
        """Test research agent with output path."""
        from agents.research_agent import create_research_agent

        agent = create_research_agent(
            task="Research X",
            output_path="/tmp/research.md",
        )

        assert "/tmp/research.md" in agent.config.task


class TestClientAgent:
    """Tests for client agent."""

    def test_create_client_agent(self) -> None:
        """Test creating a client agent."""
        from agents.client_agent import ClientConfig, create_client_agent

        config = ClientConfig(
            client_id="test",
            client_name="Test Client",
            instructions="Do good work",
            skills=["sveltekit-conventions"],
        )

        agent = create_client_agent(task="Build feature", config=config)

        assert agent is not None
        assert "Test Client" in agent.system_prompt
        assert "Do good work" in agent.system_prompt

    def test_client_agent_restrictions(self) -> None:
        """Test client agent with path restrictions."""
        from agents.client_agent import ClientConfig, create_client_agent

        config = ClientConfig(
            client_id="restricted",
            client_name="Restricted Client",
            instructions="Limited access",
            allowed_paths=["./src"],
            allowed_commands=["npm", "git"],
            allow_beads=False,
        )

        agent = create_client_agent(task="Work", config=config)

        assert "./src" in agent.system_prompt
        assert "npm" in agent.system_prompt
        assert "Do not use the Beads tool" in agent.system_prompt

    def test_example_configs(self) -> None:
        """Test example configurations exist."""
        from agents.client_agent import EXAMPLE_CONFIGS

        assert "standard" in EXAMPLE_CONFIGS
        assert "restricted" in EXAMPLE_CONFIGS
        assert EXAMPLE_CONFIGS["standard"].allow_beads is False
        assert EXAMPLE_CONFIGS["restricted"].allowed_commands is not None
