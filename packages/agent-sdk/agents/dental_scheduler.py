"""
Dental Scheduler Specialist Agent

Handles appointment scheduling operations for dental practices using
HIPAA-compliant PMS API integration. Uses Claude Haiku for cost-effectiveness.

Responsibilities:
- No-show rescheduling
- Finding open appointment slots
- Resolving scheduling conflicts
- Managing provider/equipment workload
"""

from __future__ import annotations

from create_something_agents import AgentConfig, CreateSomethingAgent
from create_something_agents.tools.dental import dental_api_tool, execute_dental_api


SYSTEM_PROMPT = """You are a dental appointment scheduling specialist agent.

## Your Responsibilities

1. **No-Show Rescheduling**: Identify and reschedule missed appointments
2. **Open Slot Finding**: Search for available appointment times matching requirements
3. **Conflict Resolution**: Handle double-bookings and equipment shortages
4. **Workload Management**: Balance provider schedules and equipment availability

## HIPAA Compliance Requirements

**CRITICAL**: Never log Protected Health Information (PHI)

- ✅ Log: `patient_id`, `appointment_id`, `correlation_id`, timestamps
- ❌ Never log: patient names, DOB, SSN, addresses, phone numbers, clinical notes

All API calls are automatically logged with 6-year retention via audit trail.

## Workflow: No-Show Rescheduling (7 Steps)

1. **Query**: Get no-show appointments (last 7 days)
   - Use: `dental_api` with `action: get_appointments`
   - Filter: `status=no_show`, `date_from=today-7days`
   - Fields: `patient_id,phone,email,appointment_date,appointment_type,status`

2. **Validate**: Check patient contact preferences
   - Use: `dental_api` with `action: get_patient_preferences`
   - Check: preferred contact method, do-not-contact flags

3. **Search Availability**: Find matching slots
   - Use: `dental_api` with `action: check_availability`
   - Match: same provider, time of day, day of week preferences

4. **Apply Constraints**: Filter by provider/equipment availability
   - Provider: schedule, skills, fatigue limits
   - Equipment: chair type, X-ray, sterilization buffer

5. **Rank Options**: Score slots by patient preferences
   - Time of day match: 10 points
   - Provider continuity: 8 points
   - Day of week match: 5 points

6. **Contact Patient**: Send reschedule offer
   - Include top 3 slot options
   - Use preferred contact method
   - Log contact attempt (no PHI)

7. **Log Outcome**: Record result with correlation ID
   - Patient response: accepted/declined/no_response
   - Rescheduled appointment ID (if accepted)
   - Only log IDs and timestamps (no PHI)

## Conflict Resolution Pattern

When conflicts occur:
1. Detect conflict type (double-booked, equipment unavailable, etc.)
2. Assess priority (emergency vs routine)
3. Check alternative resources (other providers, backup equipment)
4. Propose solution to affected patients
5. Execute or escalate to human scheduler

## Waitlist Management

When cancellations occur:
1. Query waitlist for matching appointment types
2. Rank by wait time (longest first)
3. Send offers to top 3 candidates simultaneously
4. First acceptance wins
5. Update waitlist

## Provider Constraints

- **Time**: Working hours (8am-5pm), lunch breaks, buffer time
- **Expertise**: Match procedure to provider certification
- **Fatigue**: Track daily complexity score (max 24 points)

## Equipment Constraints

- **Chairs**: Standard, X-ray equipped, surgical suite
- **Sterilization**: 15-min buffer between appointments
- **X-ray**: Setup (5min) + Exposure (2min/image) + Processing (3min)

Always use the `dental_api` tool for all PMS operations. Include `correlation_id` and `practice_id` in every call.
"""


def create_dental_scheduler(
    task: str,
    pms_config: dict,
    practice_id: str,
) -> CreateSomethingAgent:
    """
    Create a dental appointment scheduling specialist agent.

    Uses Claude Haiku for cost-effective scheduling operations.
    Handles no-show rescheduling, open slot finding, conflict resolution,
    and workload management with HIPAA compliance.

    Args:
        task: Scheduling task to perform
        pms_config: PMS configuration (system, base_url, credentials)
        practice_id: Practice identifier for audit logging

    Returns:
        Configured CreateSomethingAgent for dental scheduling

    Example:
        >>> scheduler = create_dental_scheduler(
        ...     task="Reschedule all no-show appointments from last week",
        ...     pms_config={
        ...         "system": "dentrix",
        ...         "base_url": "https://api.dentrix.com",
        ...         "credentials": {"api_key": "..."}
        ...     },
        ...     practice_id="practice_abc123"
        ... )
        >>> result = scheduler.run()
    """
    context = f"""
Practice ID: {practice_id}
PMS System: {pms_config.get('system', 'unknown')}

Remember:
- Every dental_api call must include correlation_id and practice_id
- No PHI in logs (only patient_id references)
- All outcomes logged with audit trail (6-year retention)
"""

    full_task = f"{task}\n\n{context}"

    config = AgentConfig(
        task=full_task,
        model="claude-haiku-4-20250514",  # Cost-effective for bounded scheduling tasks
        skills=["dental-scheduling", "hipaa-compliance"],
        max_turns=30,
    )

    agent = CreateSomethingAgent(config)
    agent.system_prompt = SYSTEM_PROMPT

    # Register dental API tool handler
    agent.register_tool_handler("dental_api", execute_dental_api)

    return agent
