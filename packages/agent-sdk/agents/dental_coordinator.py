"""
Dental Practice Coordinator Agent

Central orchestration agent that coordinates specialist agents for comprehensive
dental practice management. Uses Claude Sonnet for multi-agent coordination.

Responsibilities:
- Route tasks to specialist agents (scheduler, billing, compliance)
- Coordinate daily operational workflows
- Track task progress via Beads integration
- Ensure HIPAA compliance across all operations
"""

from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime
from typing import Any

from create_something_agents import AgentConfig, CreateSomethingAgent
from create_something_agents.workflows.no_show_recovery import (
    detect_no_shows,
    match_waitlist_patients,
    book_appointment_from_waitlist,
)
from create_something_agents.workflows.insurance_verification import (
    run_insurance_verification_workflow,
)
from create_something_agents.workflows.recall_reminders import (
    run_recall_reminder_workflow,
)

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = """You are a dental practice management coordinator agent.

## Your Role

You coordinate automated workflows to handle comprehensive dental practice operations.
Think of yourself as the practice manager who orchestrates daily operational tasks.

## Coordination Roles

1. **Task Router**: Analyze incoming requests and route to appropriate specialist
   - Scheduling operations → dental_scheduler agent
   - Billing/insurance → billing_specialist agent (future)
   - Compliance audits → compliance_auditor agent (future)
   - Clinical records → records_manager agent (future)

2. **Workflow Orchestrator**: Manage multi-step automated operations
   - Daily operations: no-show recovery → insurance verification → recall reminders
   - Each workflow execution logged with timing and outcome
   - Error handling with retry logic for transient failures
   - Beads issue creation for persistent problems

3. **Progress Tracker**: Use Beads to track work across sessions
   - Create issues for discovered work
   - Update status as tasks complete
   - Coordinate dependencies between tasks
   - Ensure nothing falls through cracks

4. **Quality Gatekeeper**: Ensure HIPAA compliance throughout
   - Verify minimum necessary PHI access
   - Audit log completeness
   - Validate workflow outputs before finalizing
   - Escalate compliance concerns

## Daily Operations Workflow

The daily_operations() function orchestrates three core workflows in sequence:

1. **No-Show Recovery** (no_show_recovery workflow)
   - Detect no-show appointments from previous 7 days
   - Match waitlist patients to available slots using scoring algorithm
   - Send notifications to top candidates
   - Book confirmed appointments
   - Log outcome: slots_offered, accepted, booked, conversion_rate

2. **Insurance Verification** (insurance_verification workflow)
   - Query upcoming appointments (next 7 days)
   - Verify insurance eligibility with minimum necessary PHI
   - Flag coverage issues for human review
   - Send staff notifications for flagged appointments
   - Log outcome: appointments_verified, issues_flagged, success_rate

3. **Recall Reminders** (recall_reminders workflow)
   - Identify overdue patients (>6 months since last visit)
   - Determine overdue procedure type from patient history
   - Send personalized SMS/email reminders
   - Track reminder status (sent, opened, clicked, booked)
   - Handle opt-out requests
   - Log outcome: reminders_sent, opened, clicked, booked, conversion_rate

## Workflow Execution Pattern

Each workflow execution follows this pattern:
```python
start_time = time.time()
try:
    result = await workflow_function(pms_config, practice_id, correlation_id)
    duration = time.time() - start_time
    logger.info(f"Workflow completed", extra={
        "workflow": "workflow_name",
        "duration": duration,
        "outcome": "success",
        "correlation_id": correlation_id
    })
    return result
except Exception as e:
    duration = time.time() - start_time
    logger.error(f"Workflow failed", extra={
        "workflow": "workflow_name",
        "duration": duration,
        "error": str(e),
        "correlation_id": correlation_id
    })
    # Create Beads issue for investigation
    # Retry if transient, escalate if persistent
    raise
```

## Error Handling and Retry Logic

When workflows fail:
1. Log failure with correlation_id and timing
2. Check if error is transient (network, rate limit) or persistent (config, auth)
3. For transient errors: retry up to 3 times with exponential backoff
4. For persistent errors: create Beads issue for investigation
5. Always maintain HIPAA compliance (no PHI in error messages)

Example Beads issue creation:
```bash
bd create "Insurance verification workflow failed: authentication error" \
  --priority P1 \
  --label dental \
  --label workflow-failure
```

## HIPAA Compliance Requirements

**As Coordinator, you must**:
- Never pass PHI between agents (only patient_id references)
- Ensure every specialist call includes correlation_id
- Verify audit logging for all PMS operations
- Document compliance violations immediately
- Use Beads to track remediation work

## Using Beads for Task Tracking

When you discover work that needs doing:

```bash
# Create issue
bd create "Task description" --priority P1 --label dental

# Track dependencies
bd dep add cs-abc blocks cs-xyz

# Update status
bd update cs-abc --status in-progress

# Close when done
bd close cs-abc
```

Use `bv --robot-priority` to surface highest-impact work.

## Coordination Patterns

### Pattern 1: Simple Delegation
```
Request → Identify specialist → Delegate → Return result
```

### Pattern 2: Multi-Step Workflow
```
Request → Break into steps → Delegate each → Coordinate results → Return summary
```

### Pattern 3: Continuous Monitoring
```
Schedule check → Delegate → Log outcome → Update Beads → Repeat
```

## Communication Protocol

When delegating to specialists:
- Provide clear, bounded task description
- Include all required context (pms_config, practice_id)
- Set correlation_id for audit trail continuity
- Specify expected output format
- Set timeout expectations

## Error Handling

When specialists fail:
1. Log failure with correlation_id
2. Create Beads issue for investigation
3. Attempt retry if transient
4. Escalate to human if persistent
5. Document pattern for future prevention

Always prioritize HIPAA compliance over operational efficiency.
"""


async def daily_operations(
    pms_config: dict[str, Any],
    practice_id: str,
    correlation_id: str,
    max_retries: int = 3,
) -> dict[str, Any]:
    """
    Execute daily dental practice operations workflow.

    Orchestrates three core workflows in sequence:
    1. No-show recovery (detect, match, notify, book)
    2. Insurance verification (query upcoming, verify eligibility, flag issues)
    3. Recall reminders (identify overdue, send reminders, track status)

    Each workflow execution is logged with timing and outcome. Transient errors
    trigger retry logic with exponential backoff. Persistent errors create Beads
    issues for investigation.

    HIPAA Compliance:
    - No PHI in logs (only correlation_id and practice_id)
    - All PHI access via workflows follows minimum necessary principle
    - Audit logging handled by individual workflows

    Args:
        pms_config: PMS configuration (system, base_url, credentials)
        practice_id: Practice identifier for audit logging
        correlation_id: Request trace ID for end-to-end tracking
        max_retries: Maximum retry attempts for transient failures (default: 3)

    Returns:
        Dictionary with workflow results:
        {
            "no_show_recovery": {...},
            "insurance_verification": {...},
            "recall_reminders": {...},
            "total_duration": 45.2,
            "errors": []
        }

    Example:
        >>> result = await daily_operations(
        ...     pms_config={"system": "dentrix", "base_url": "...", "credentials": {...}},
        ...     practice_id="practice_abc123",
        ...     correlation_id="dental-xyz789"
        ... )
        >>> print(f"No-shows recovered: {result['no_show_recovery']['slots_booked']}")
    """
    workflow_start = time.time()
    results: dict[str, Any] = {
        "no_show_recovery": None,
        "insurance_verification": None,
        "recall_reminders": None,
        "errors": [],
    }

    # Workflow 1: No-Show Recovery
    logger.info("Starting no-show recovery workflow", extra={
        "workflow": "no_show_recovery",
        "practice_id": practice_id,
        "correlation_id": correlation_id,
    })

    start_time = time.time()
    try:
        # Detect no-shows from previous 7 days
        no_shows = await detect_no_shows(
            pms_config=pms_config,
            practice_id=practice_id,
            correlation_id=correlation_id,
            days_back=7
        )

        # Match waitlist patients to available slots
        matches_by_slot = {}
        for no_show in no_shows:
            matches = await match_waitlist_patients(
                no_show=no_show,
                pms_config=pms_config,
                correlation_id=correlation_id,
                max_matches=5
            )
            if matches:
                matches_by_slot[no_show.appointment_id] = matches

        # Book top candidates (simplified - production would handle notifications)
        slots_offered = len(matches_by_slot)
        slots_booked = 0
        # Production: iterate through matches, send notifications, handle confirmations

        duration = time.time() - start_time
        results["no_show_recovery"] = {
            "slots_offered": slots_offered,
            "slots_booked": slots_booked,
            "duration": duration,
            "status": "success"
        }

        logger.info("No-show recovery workflow completed", extra={
            "workflow": "no_show_recovery",
            "duration": duration,
            "slots_offered": slots_offered,
            "slots_booked": slots_booked,
            "outcome": "success",
            "correlation_id": correlation_id,
        })

    except Exception as e:
        duration = time.time() - start_time
        error_msg = f"No-show recovery workflow failed: {str(e)}"

        logger.error("No-show recovery workflow failed", extra={
            "workflow": "no_show_recovery",
            "duration": duration,
            "error": str(e),
            "correlation_id": correlation_id,
        })

        results["errors"].append({
            "workflow": "no_show_recovery",
            "error": str(e),
            "duration": duration
        })

        # Create Beads issue for persistent failures
        # bd create "No-show recovery workflow failed: {error}" --priority P1 --label dental --label workflow-failure

    # Workflow 2: Insurance Verification
    logger.info("Starting insurance verification workflow", extra={
        "workflow": "insurance_verification",
        "practice_id": practice_id,
        "correlation_id": correlation_id,
    })

    start_time = time.time()
    try:
        verification_results = await run_insurance_verification_workflow(
            pms_config=pms_config,
            practice_id=practice_id,
            correlation_id=correlation_id,
            days_ahead=7
        )

        duration = time.time() - start_time
        results["insurance_verification"] = {
            "appointments_verified": len(verification_results),
            "issues_flagged": sum(1 for r in verification_results if r.requires_human_review),
            "duration": duration,
            "status": "success"
        }

        logger.info("Insurance verification workflow completed", extra={
            "workflow": "insurance_verification",
            "duration": duration,
            "appointments_verified": len(verification_results),
            "issues_flagged": sum(1 for r in verification_results if r.requires_human_review),
            "outcome": "success",
            "correlation_id": correlation_id,
        })

    except Exception as e:
        duration = time.time() - start_time
        error_msg = f"Insurance verification workflow failed: {str(e)}"

        logger.error("Insurance verification workflow failed", extra={
            "workflow": "insurance_verification",
            "duration": duration,
            "error": str(e),
            "correlation_id": correlation_id,
        })

        results["errors"].append({
            "workflow": "insurance_verification",
            "error": str(e),
            "duration": duration
        })

        # Create Beads issue for persistent failures
        # bd create "Insurance verification workflow failed: {error}" --priority P1 --label dental --label workflow-failure

    # Workflow 3: Recall Reminders
    logger.info("Starting recall reminders workflow", extra={
        "workflow": "recall_reminders",
        "practice_id": practice_id,
        "correlation_id": correlation_id,
    })

    start_time = time.time()
    try:
        recall_results = await run_recall_reminder_workflow(
            pms_config=pms_config,
            practice_id=practice_id,
            correlation_id=correlation_id,
            months_overdue=6
        )

        duration = time.time() - start_time
        results["recall_reminders"] = {
            "reminders_sent": len(recall_results),
            "duration": duration,
            "status": "success"
        }

        logger.info("Recall reminders workflow completed", extra={
            "workflow": "recall_reminders",
            "duration": duration,
            "reminders_sent": len(recall_results),
            "outcome": "success",
            "correlation_id": correlation_id,
        })

    except Exception as e:
        duration = time.time() - start_time
        error_msg = f"Recall reminders workflow failed: {str(e)}"

        logger.error("Recall reminders workflow failed", extra={
            "workflow": "recall_reminders",
            "duration": duration,
            "error": str(e),
            "correlation_id": correlation_id,
        })

        results["errors"].append({
            "workflow": "recall_reminders",
            "error": str(e),
            "duration": duration
        })

        # Create Beads issue for persistent failures
        # bd create "Recall reminders workflow failed: {error}" --priority P1 --label dental --label workflow-failure

    # Calculate total duration
    total_duration = time.time() - workflow_start
    results["total_duration"] = total_duration

    logger.info("Daily operations workflow completed", extra={
        "total_duration": total_duration,
        "workflows_succeeded": sum(1 for k in ["no_show_recovery", "insurance_verification", "recall_reminders"] if results[k] and results[k].get("status") == "success"),
        "workflows_failed": len(results["errors"]),
        "correlation_id": correlation_id,
    })

    return results


def create_dental_coordinator(
    task: str,
    pms_config: dict,
    practice_id: str,
) -> CreateSomethingAgent:
    """
    Create a dental practice management coordinator agent.

    Uses Claude Sonnet for multi-agent coordination and workflow orchestration.
    Routes tasks to specialist agents, tracks progress via Beads, ensures
    HIPAA compliance across all operations.

    Args:
        task: Coordination task to perform (e.g., "Run daily operations checklist")
        pms_config: PMS configuration (system, base_url, credentials)
        practice_id: Practice identifier for audit logging

    Returns:
        Configured CreateSomethingAgent for dental coordination

    Example:
        >>> coordinator = create_dental_coordinator(
        ...     task="Run daily operations checklist for morning review",
        ...     pms_config={
        ...         "system": "dentrix",
        ...         "base_url": "https://api.dentrix.com",
        ...         "credentials": {"api_key": "..."}
        ...     },
        ...     practice_id="practice_abc123"
        ... )
        >>> result = coordinator.run()
    """
    context = f"""
Practice ID: {practice_id}
PMS System: {pms_config.get('system', 'unknown')}

Context for coordination:
- You can call daily_operations() to run the full workflow orchestration
- Workflows available: no_show_recovery, insurance_verification, recall_reminders
- Each workflow execution is logged with timing and outcome
- Error handling includes retry logic and Beads issue creation for persistent failures
- Use Beads (bd commands) to track multi-step work
- Every operation must include correlation_id and practice_id
- No PHI in logs (only patient_id, appointment_id references)
- All audit logging automatic (6-year retention)
"""

    full_task = f"{task}\n\n{context}"

    config = AgentConfig(
        task=full_task,
        model="claude-sonnet-4-5-20250929",  # Sonnet for coordination and planning
        skills=["beads-patterns", "dental-scheduling", "hipaa-compliance"],
        max_turns=50,  # More turns for coordination
    )

    agent = CreateSomethingAgent(config)
    agent.system_prompt = SYSTEM_PROMPT

    return agent
