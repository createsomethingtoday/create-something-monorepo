"""
CREATE SOMETHING Agent Server

FastAPI server exposing agents for Cloudflare Workers to call.
The tool recedes; agent execution happens.
"""

from __future__ import annotations

import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from create_something_agents import (
    AgentConfig,
    AgentResult,
    CreateSomethingAgent,
    RalphConfig,
    RalphStopHook,
)


class AgentRequest(BaseModel):
    """Request to run an agent task."""

    task: str = Field(..., description="The task for the agent to perform")
    agent_type: str = Field(
        default="default", description="Type of agent: default, template-deployer, content, research, client, coordinator, monitor, review"
    )
    model: str = Field(
        default="claude-sonnet-4-20250514",
        description="Model to use: claude-sonnet-4-20250514, claude-opus-4-20250514, claude-haiku-3-20241022",
    )
    skills: list[str] = Field(
        default_factory=list, description="Skills to load from .claude/rules/"
    )
    max_turns: int = Field(default=50, ge=1, le=200, description="Maximum agent turns")
    client_config: dict[str, Any] | None = Field(
        default=None, description="Configuration for client agents"
    )
    ralph_config: dict[str, Any] | None = Field(
        default=None, description="Ralph iteration configuration"
    )


class AgentResponse(BaseModel):
    """Response from agent execution."""

    success: bool
    output: str
    model: str
    input_tokens: int
    output_tokens: int
    cost_usd: float
    tool_calls: list[dict[str, Any]]
    iterations: int
    run_id: str
    timestamp: str


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    version: str
    timestamp: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print("CREATE SOMETHING Agent Server starting...")
    yield
    # Shutdown
    print("CREATE SOMETHING Agent Server shutting down...")


app = FastAPI(
    title="CREATE SOMETHING Agent Server",
    description="HTTP interface for CREATE SOMETHING agents",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware for cross-origin requests from Workers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def create_agent_from_request(request: AgentRequest) -> CreateSomethingAgent:
    """Create an agent instance from a request."""
    # Build stop hooks if Ralph config provided
    stop_hooks = []
    if request.ralph_config:
        ralph_cfg = RalphConfig(
            prompt=request.ralph_config.get("prompt", request.task),
            max_iterations=request.ralph_config.get("max_iterations", 15),
            completion_promise=request.ralph_config.get("completion_promise"),
        )
        stop_hooks.append(RalphStopHook(ralph_cfg))

    # Create config
    config = AgentConfig(
        task=request.task,
        model=request.model,
        skills=request.skills,
        max_turns=request.max_turns,
        stop_hooks=stop_hooks,
    )

    # Create agent (agent type dispatch happens in pre-built agents)
    agent = CreateSomethingAgent(config)

    # For specific agent types, we could load specialized system prompts
    # This is a hook for Phase 4 pre-built agents
    if request.agent_type == "template-deployer":
        agent.system_prompt = """You are a template deployment agent for CREATE SOMETHING.
Your task is to deploy vertical templates to Cloudflare Pages with proper:
1. Build configuration (SvelteKit static adapter)
2. R2 asset upload (correct paths)
3. Tenant configuration injection
4. DNS and route setup

Use the skills loaded for exact patterns. Verify each step before proceeding.
Output <promise>DEPLOY_COMPLETE</promise> when the site is live and responding."""

    elif request.agent_type == "content":
        agent.system_prompt = """You are a content generation agent for CREATE SOMETHING.

Follow the Voice Canon strictly:
- Clarity over cleverness
- Specificity over generality
- Lead with outcomes, not philosophy

Generate content that can be published to .io papers, .space lessons, or social channels."""

    elif request.agent_type == "research":
        agent.system_prompt = """You are a research agent for CREATE SOMETHING.

Your task is to:
1. Gather context from multiple sources
2. Synthesize findings
3. Document in reproducible format
4. Create Beads issues for follow-up work

Use web search for current information. Store findings in files."""

    elif request.agent_type == "coordinator":
        agent.system_prompt = """You are the Coordinator agent for CREATE SOMETHING autonomous operations.

Your job:
1. Surface highest-priority work from Beads (bv --robot-priority)
2. Route to appropriate specialist agents
3. Track costs and respect budgets (warn at 80%, stop at 100%)
4. Escalate to humans when confidence drops below 70%

Use Beads for all communication. Create checkpoints every 3 completed tasks."""

    elif request.agent_type == "monitor":
        agent.system_prompt = """You are the Monitor agent for CREATE SOMETHING infrastructure health.

Your job:
1. Check all properties are responding (io, space, agency, ltd)
2. Verify build pipelines are green
3. Monitor costs and usage
4. Create incidents when issues detected

Alert levels: INFO (log), WARN (P2), ERROR (P1), CRITICAL (P0).
Use Beads to create incident issues."""

    elif request.agent_type == "review":
        agent.system_prompt = """You are the Subtractive Triad Review Agent for CREATE SOMETHING.

Review code for alignment with:
1. **DRY** (Implementation): Eliminate duplication
2. **Rams** (Artifact): Eliminate excess — only what earns existence remains
3. **Heidegger** (System): Eliminate disconnection — every part serves the whole

For each finding, create a Beads issue with appropriate priority.
Track review coverage to ensure systematic auditing over time."""

    return agent


@app.post("/run", response_model=AgentResponse)
async def run_agent(request: AgentRequest) -> AgentResponse:
    """Execute an agent task."""
    run_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()

    try:
        # Create agent
        agent = create_agent_from_request(request)

        # Execute
        result: AgentResult = await agent.run()

        return AgentResponse(
            success=result.success,
            output=result.output,
            model=result.model,
            input_tokens=result.input_tokens,
            output_tokens=result.output_tokens,
            cost_usd=result.cost_usd,
            tool_calls=result.tool_calls,
            iterations=result.iterations,
            run_id=run_id,
            timestamp=timestamp,
        )

    except Exception as e:
        # Return error as response rather than raising
        return AgentResponse(
            success=False,
            output=f"Agent execution failed: {e!s}",
            model=request.model,
            input_tokens=0,
            output_tokens=0,
            cost_usd=0.0,
            tool_calls=[],
            iterations=0,
            run_id=run_id,
            timestamp=timestamp,
        )


@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse(
        status="ok",
        version="0.1.0",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint with API info."""
    return {
        "name": "CREATE SOMETHING Agent Server",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/health",
        "run": "/run",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "server.main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("DEBUG", "false").lower() == "true",
    )
