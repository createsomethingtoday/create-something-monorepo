"""Tests for CREATE SOMETHING Agent Server."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


# Only run if fastapi is installed
pytest.importorskip("fastapi")


class TestServerEndpoints:
    """Tests for server API endpoints."""

    @pytest.fixture
    def client(self):
        """Create test client."""
        from server.main import app
        return TestClient(app)

    def test_root_endpoint(self, client: TestClient) -> None:
        """Test root endpoint returns API info."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "CREATE SOMETHING Agent Server"
        assert "version" in data
        assert data["run"] == "/run"

    def test_health_endpoint(self, client: TestClient) -> None:
        """Test health check endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "version" in data
        assert "timestamp" in data

    def test_run_endpoint_validation(self, client: TestClient) -> None:
        """Test run endpoint validates input."""
        # Missing required field
        response = client.post("/run", json={})
        assert response.status_code == 422  # Validation error

    def test_run_endpoint_accepts_valid_request(self, client: TestClient) -> None:
        """Test run endpoint accepts valid request structure."""
        # Note: This test doesn't actually run the agent (no API key)
        # It just validates the request structure is accepted
        response = client.post(
            "/run",
            json={
                "task": "Test task",
                "agent_type": "default",
                "model": "claude-sonnet-4-20250514",
                "skills": [],
                "max_turns": 10,
            },
        )
        # Will return 200 with success=False (no API key in test)
        # or validation error if structure is wrong
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert "run_id" in data
        assert "timestamp" in data


class TestAgentRequestModel:
    """Tests for request model validation."""

    def test_default_values(self) -> None:
        """Test default values are applied."""
        from server.main import AgentRequest

        request = AgentRequest(task="Test")
        assert request.agent_type == "default"
        assert request.model == "claude-sonnet-4-20250514"
        assert request.skills == []
        assert request.max_turns == 50

    def test_custom_values(self) -> None:
        """Test custom values are accepted."""
        from server.main import AgentRequest

        request = AgentRequest(
            task="Deploy template",
            agent_type="template-deployer",
            model="claude-opus-4-20250514",
            skills=["cloudflare-patterns"],
            max_turns=100,
        )
        assert request.task == "Deploy template"
        assert request.agent_type == "template-deployer"
        assert request.model == "claude-opus-4-20250514"
        assert request.skills == ["cloudflare-patterns"]
        assert request.max_turns == 100

    def test_ralph_config(self) -> None:
        """Test Ralph configuration is accepted."""
        from server.main import AgentRequest

        request = AgentRequest(
            task="Fix tests",
            ralph_config={
                "prompt": "Fix the tests",
                "max_iterations": 15,
                "completion_promise": "DONE",
            },
        )
        assert request.ralph_config is not None
        assert request.ralph_config["max_iterations"] == 15

    def test_max_turns_bounds(self) -> None:
        """Test max_turns validation bounds."""
        from server.main import AgentRequest
        from pydantic import ValidationError

        # Valid bounds
        AgentRequest(task="Test", max_turns=1)
        AgentRequest(task="Test", max_turns=200)

        # Invalid bounds
        with pytest.raises(ValidationError):
            AgentRequest(task="Test", max_turns=0)

        with pytest.raises(ValidationError):
            AgentRequest(task="Test", max_turns=201)


class TestAgentResponseModel:
    """Tests for response model."""

    def test_response_structure(self) -> None:
        """Test response model has all required fields."""
        from server.main import AgentResponse

        response = AgentResponse(
            success=True,
            output="Task completed",
            model="claude-sonnet-4-20250514",
            input_tokens=100,
            output_tokens=50,
            cost_usd=0.001,
            tool_calls=[],
            iterations=3,
            run_id="test-id",
            timestamp="2025-01-01T00:00:00Z",
        )
        assert response.success is True
        assert response.output == "Task completed"
        assert response.iterations == 3


class TestContentAgentRouting:
    def test_content_api_uses_shared_prompt_and_preserves_request_config(self):
        from agents.content_agent import SYSTEM_PROMPT
        from server.main import AgentRequest, create_agent_from_request

        request = AgentRequest(
            task="Build passed; deployment pending; costs unknown.",
            agent_type="content", model="offline-request-model", max_turns=7,
            skills=["voice-canon"]
        )
        agent = create_agent_from_request(request)
        assert agent.system_prompt == SYSTEM_PROMPT
        assert agent.config.model == request.model
        assert agent.config.max_turns == 7
        assert agent.config.skills == ["voice-canon"]


    def test_content_run_endpoint_receives_packaged_prompt(self, monkeypatch):
        from create_something_agents import AgentResult, CreateSomethingAgent
        from create_something_agents.prompts import CONTENT_SYSTEM_PROMPT
        from server.main import app

        captured = {}
        async def offline_run(agent):
            captured["prompt"] = agent.system_prompt
            return AgentResult(
                output="Offline content fixture", model="offline", input_tokens=0,
                output_tokens=0, cost_usd=0, tool_calls=[], success=True
            )
        monkeypatch.setattr(CreateSomethingAgent, "run", offline_run)
        response = TestClient(app).post("/run", json={
            "task": "Build passed; deployment pending; costs unknown.", "agent_type": "content"
        })
        assert response.status_code == 200
        assert response.json()["success"] is True
        assert captured["prompt"] == CONTENT_SYSTEM_PROMPT
