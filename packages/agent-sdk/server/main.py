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

import modal
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

# Import dental agent factories
from agents.dental_coordinator import create_dental_coordinator
from agents.dental_scheduler import create_dental_scheduler

# Import workflow modules
from create_something_agents.workflows import no_show_recovery
from create_something_agents.workflows import insurance_verification
from create_something_agents.workflows import recall_reminders
from create_something_agents.analytics import conversion_tracking


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


# Dental Agent Models
class DentalAgentRequest(BaseModel):
    """Request for dental agent operations."""

    practice_id: str = Field(..., description="Practice identifier")
    operation: str = Field(..., description="Operation to perform: schedule, daily-ops")
    task: str = Field(..., description="Specific task description")
    pms_config: dict[str, Any] = Field(..., description="PMS system configuration")
    correlation_id: str | None = Field(default=None, description="Request correlation ID")


class DentalAgentResponse(BaseModel):
    """Response from dental agent execution."""

    success: bool
    output: str
    model: str
    input_tokens: int
    output_tokens: int
    cost_usd: float
    practice_id: str
    operation: str
    correlation_id: str
    timestamp: str


class WorkflowRequest(BaseModel):
    """Request for individual workflow execution."""

    practice_id: str = Field(..., description="Practice identifier")
    pms_config: dict[str, Any] = Field(..., description="PMS system configuration")
    correlation_id: str | None = Field(default=None, description="Request correlation ID")


class WorkflowResponse(BaseModel):
    """Response from workflow execution."""

    success: bool
    workflow_results: dict[str, Any] = Field(..., description="Workflow-specific results")
    audit_id: str = Field(..., description="Audit trail correlation ID")
    timestamp: str
    error: str | None = None


class DailyReportResponse(BaseModel):
    """Response from daily analytics report."""

    success: bool
    report: dict[str, Any] = Field(..., description="Daily analytics report data")
    timestamp: str
    error: str | None = None


# Modal Configuration for Dental Agent SDK
modal_image = (
    modal.Image.debian_slim()
    .pip_install("anthropic", "httpx", "fastapi", "pydantic")
)

app_modal = modal.App("dental-agent-sdk", image=modal_image)


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
async def root() -> dict[str, Any]:
    """Root endpoint with API info."""
    return {
        "name": "CREATE SOMETHING Agent Server",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/health",
        "run": "/run",
        "dental": {
            "schedule": "/agents/dental/schedule",
            "daily-ops": "/agents/dental/daily-ops",
            "workflows": {
                "no-show-recovery": "/agents/dental/workflows/no-show-recovery",
                "insurance-verification": "/agents/dental/workflows/insurance-verification",
                "recall-reminders": "/agents/dental/workflows/recall-reminders"
            },
            "analytics": {
                "daily-report": "/agents/dental/analytics/daily-report"
            }
        },
    }


# Dental Agent Helper Functions
def extract_agent_response_data(result: AgentResult) -> tuple[str, str, int, int, float]:
    """Extract response data from agent result.

    Returns:
        Tuple of (output, model, input_tokens, output_tokens, cost_usd)
    """
    return (
        result.output,
        result.model,
        result.input_tokens,
        result.output_tokens,
        result.cost_usd,
    )


def generate_correlation_id() -> str:
    """Generate a unique correlation ID for request tracking."""
    return f"dental-{uuid.uuid4()}"


# Dental Agent Endpoints
@app.post("/agents/dental/schedule", response_model=DentalAgentResponse)
async def dental_schedule(request: DentalAgentRequest) -> DentalAgentResponse:
    """Execute dental appointment scheduling operations.

    This endpoint handles scheduling-specific operations like:
    - No-show rescheduling
    - Open slot finding
    - Conflict resolution
    - Workload management

    Uses the dental scheduler specialist agent (Haiku model for cost-effectiveness).
    """
    correlation_id = request.correlation_id or generate_correlation_id()
    timestamp = datetime.now(timezone.utc).isoformat()

    try:
        # Create dental scheduler agent
        agent = create_dental_scheduler(
            task=request.task,
            pms_config=request.pms_config,
            practice_id=request.practice_id,
        )

        # Execute
        result: AgentResult = await agent.run()

        # Extract response data
        output, model, input_tokens, output_tokens, cost_usd = extract_agent_response_data(result)

        return DentalAgentResponse(
            success=result.success,
            output=output,
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_usd=cost_usd,
            practice_id=request.practice_id,
            operation="schedule",
            correlation_id=correlation_id,
            timestamp=timestamp,
        )

    except Exception as e:
        return DentalAgentResponse(
            success=False,
            output=f"Scheduling operation failed: {e!s}",
            model="claude-haiku-4-20250514",
            input_tokens=0,
            output_tokens=0,
            cost_usd=0.0,
            practice_id=request.practice_id,
            operation="schedule",
            correlation_id=correlation_id,
            timestamp=timestamp,
        )


@app.post("/agents/dental/daily-ops", response_model=DentalAgentResponse)
async def dental_daily_ops(request: DentalAgentRequest) -> DentalAgentResponse:
    """Execute dental practice daily operations.

    This endpoint handles multi-agent coordination for daily operations:
    - No-show recovery
    - Waitlist processing
    - Schedule optimization
    - Compliance checks

    Uses the dental coordinator agent (Sonnet model for sophisticated orchestration).
    """
    correlation_id = request.correlation_id or generate_correlation_id()
    timestamp = datetime.now(timezone.utc).isoformat()

    try:
        # Create dental coordinator agent
        agent = create_dental_coordinator(
            task=request.task,
            pms_config=request.pms_config,
            practice_id=request.practice_id,
        )

        # Execute
        result: AgentResult = await agent.run()

        # Extract response data
        output, model, input_tokens, output_tokens, cost_usd = extract_agent_response_data(result)

        return DentalAgentResponse(
            success=result.success,
            output=output,
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_usd=cost_usd,
            practice_id=request.practice_id,
            operation="daily-ops",
            correlation_id=correlation_id,
            timestamp=timestamp,
        )

    except Exception as e:
        return DentalAgentResponse(
            success=False,
            output=f"Daily operations failed: {e!s}",
            model="claude-sonnet-4-5-20250929",
            input_tokens=0,
            output_tokens=0,
            cost_usd=0.0,
            practice_id=request.practice_id,
            operation="daily-ops",
            correlation_id=correlation_id,
            timestamp=timestamp,
        )


# Modal Scheduled Function
@app_modal.function(schedule=modal.Cron("0 6 * * *"))
async def daily_operations_scheduler():
    """Scheduled function to trigger daily operations for all active practices.

    Runs at 6:00 AM UTC daily to:
    1. Query active practices from database
    2. Trigger daily-ops endpoint for each practice
    3. Log execution results

    This function would need access to a database of practices in production.
    For now, it serves as a placeholder for the scheduled trigger pattern.
    """
    timestamp = datetime.now(timezone.utc).isoformat()
    print(f"[{timestamp}] Daily operations scheduler triggered")

    # TODO: In production, query practice database and trigger daily-ops for each
    # Example:
    # practices = await get_active_practices()
    # for practice in practices:
    #     await dental_daily_ops(DentalAgentRequest(
    #         practice_id=practice.id,
    #         operation="daily-ops",
    #         task="Execute daily operations checklist",
    #         pms_config=practice.pms_config,
    #     ))

    print(f"[{timestamp}] Daily operations scheduler completed")


# Workflow Endpoints
@app.post("/agents/dental/workflows/no-show-recovery", response_model=WorkflowResponse)
async def no_show_recovery_workflow(request: WorkflowRequest) -> WorkflowResponse:
    """
    Execute no-show appointment recovery workflow.

    Detects no-show appointments from PMS and matches them with waitlist patients
    based on appointment type, time preferences, and provider availability.

    Returns:
        WorkflowResponse with:
        - no_shows: List of detected no-show appointments
        - matches: Dictionary mapping appointment_id to ranked waitlist matches
        - stats: Summary statistics (total_no_shows, total_matches, etc.)
    """
    correlation_id = request.correlation_id or generate_correlation_id()
    timestamp = datetime.now(timezone.utc).isoformat()

    try:
        # Mock PMS API client (in production, this would be a real client)
        pms_client = request.pms_config

        # Detect no-show appointments
        no_shows = no_show_recovery.detect_no_shows(
            pms_api_client=pms_client,
            days_back=7,
            correlation_id=correlation_id
        )

        # For demonstration, create mock waitlist
        # In production, this would query actual waitlist from PMS
        mock_waitlist = []

        # Match waitlist patients to no-show slots
        all_matches = no_show_recovery.rank_all_matches(
            no_shows=no_shows,
            waitlist=mock_waitlist,
            max_matches_per_slot=3
        )

        # Build workflow results
        workflow_results = {
            "no_shows": len(no_shows),
            "matches": {
                appt_id: [
                    {
                        "patient_id": match.patient.patient_id,
                        "score": match.score,
                        "appointment_type": match.patient.appointment_type
                    }
                    for match in matches
                ]
                for appt_id, matches in all_matches.items()
            },
            "stats": {
                "total_no_shows": len(no_shows),
                "total_matches": sum(len(matches) for matches in all_matches.values()),
                "practice_id": request.practice_id
            }
        }

        return WorkflowResponse(
            success=True,
            workflow_results=workflow_results,
            audit_id=correlation_id,
            timestamp=timestamp
        )

    except Exception as e:
        return WorkflowResponse(
            success=False,
            workflow_results={},
            audit_id=correlation_id,
            timestamp=timestamp,
            error=f"No-show recovery workflow failed: {e!s}"
        )


@app.post("/agents/dental/workflows/insurance-verification", response_model=WorkflowResponse)
async def insurance_verification_workflow(request: WorkflowRequest) -> WorkflowResponse:
    """
    Execute insurance verification workflow.

    Queries PMS for upcoming appointments and verifies insurance eligibility
    via clearinghouse APIs. Flags appointments with coverage issues.

    Returns:
        WorkflowResponse with:
        - verified: List of successfully verified appointments
        - flagged: List of appointments with coverage issues
        - stats: Summary statistics (total_verified, issues_found, etc.)
    """
    correlation_id = request.correlation_id or generate_correlation_id()
    timestamp = datetime.now(timezone.utc).isoformat()

    try:
        # Mock PMS API client
        pms_client = request.pms_config

        # Verify insurance eligibility for upcoming appointments
        verification_results = insurance_verification.verify_upcoming_appointments(
            pms_api_client=pms_client,
            days_ahead=7,
            correlation_id=correlation_id
        )

        # Build workflow results
        workflow_results = {
            "verified": [
                {
                    "appointment_id": result.get("appointment_id"),
                    "status": result.get("status"),
                    "patient_id": result.get("patient_id")
                }
                for result in verification_results
                if result.get("status") == "active"
            ],
            "flagged": [
                {
                    "appointment_id": result.get("appointment_id"),
                    "status": result.get("status"),
                    "patient_id": result.get("patient_id"),
                    "issue": result.get("issue")
                }
                for result in verification_results
                if result.get("status") != "active"
            ],
            "stats": {
                "total_verified": len(verification_results),
                "issues_found": len([r for r in verification_results if r.get("status") != "active"]),
                "practice_id": request.practice_id
            }
        }

        return WorkflowResponse(
            success=True,
            workflow_results=workflow_results,
            audit_id=correlation_id,
            timestamp=timestamp
        )

    except Exception as e:
        return WorkflowResponse(
            success=False,
            workflow_results={},
            audit_id=correlation_id,
            timestamp=timestamp,
            error=f"Insurance verification workflow failed: {e!s}"
        )


@app.post("/agents/dental/workflows/recall-reminders", response_model=WorkflowResponse)
async def recall_reminders_workflow(request: WorkflowRequest) -> WorkflowResponse:
    """
    Execute recall reminder workflow.

    Identifies overdue patients and sends personalized recall reminders for
    routine appointments (cleanings, exams, etc.).

    Returns:
        WorkflowResponse with:
        - overdue_patients: List of identified overdue patients
        - reminders_sent: List of successfully sent reminders
        - stats: Summary statistics (total_overdue, reminders_sent, etc.)
    """
    correlation_id = request.correlation_id or generate_correlation_id()
    timestamp = datetime.now(timezone.utc).isoformat()

    try:
        # Mock PMS API client
        pms_client = request.pms_config

        # Identify overdue patients
        overdue_patients = recall_reminders.identify_overdue_patients(
            pms_api_client=pms_client,
            months_overdue=6,
            correlation_id=correlation_id
        )

        # Send recall reminders
        reminder_results = recall_reminders.send_recall_reminders(
            overdue_patients=overdue_patients,
            pms_api_client=pms_client,
            correlation_id=correlation_id
        )

        # Build workflow results
        workflow_results = {
            "overdue_patients": len(overdue_patients),
            "reminders_sent": len([r for r in reminder_results if r.get("status") == "sent"]),
            "reminders": [
                {
                    "patient_id": result.get("patient_id"),
                    "status": result.get("status"),
                    "reminder_type": result.get("reminder_type")
                }
                for result in reminder_results
            ],
            "stats": {
                "total_overdue": len(overdue_patients),
                "reminders_sent": len([r for r in reminder_results if r.get("status") == "sent"]),
                "practice_id": request.practice_id
            }
        }

        return WorkflowResponse(
            success=True,
            workflow_results=workflow_results,
            audit_id=correlation_id,
            timestamp=timestamp
        )

    except Exception as e:
        return WorkflowResponse(
            success=False,
            workflow_results={},
            audit_id=correlation_id,
            timestamp=timestamp,
            error=f"Recall reminders workflow failed: {e!s}"
        )


@app.get("/agents/dental/analytics/daily-report", response_model=DailyReportResponse)
async def daily_analytics_report(
    practice_id: str,
    date: str | None = None
) -> DailyReportResponse:
    """
    Get daily analytics report for a practice.

    Retrieves conversion tracking metrics for:
    - No-show recovery (slots offered, accepted, booked)
    - Insurance verification (verified, issues flagged, issues resolved)
    - Recall reminders (reminders sent, responses, bookings)

    Args:
        practice_id: Practice identifier
        date: Optional date in YYYY-MM-DD format (defaults to today)

    Returns:
        DailyReportResponse with comprehensive analytics report
    """
    timestamp = datetime.now(timezone.utc).isoformat()

    try:
        # Parse date or use today
        if date:
            report_date = datetime.fromisoformat(date).date()
        else:
            report_date = datetime.now(timezone.utc).date()

        # Generate daily report
        report = conversion_tracking.generate_daily_report(
            practice_id=practice_id,
            date=report_date
        )

        return DailyReportResponse(
            success=True,
            report=report,
            timestamp=timestamp
        )

    except Exception as e:
        return DailyReportResponse(
            success=False,
            report={},
            timestamp=timestamp,
            error=f"Failed to generate daily report: {e!s}"
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "server.main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("DEBUG", "false").lower() == "true",
    )
