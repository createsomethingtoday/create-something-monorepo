"""
Insurance Verification Workflow

HIPAA-compliant pre-visit insurance eligibility checking for dental practices.

This module implements automated insurance verification that:
1. Queries PMS for upcoming appointments (next 7 days)
2. Calls insurance verification API with minimum necessary data
3. Flags appointments with coverage issues for human review
4. Logs verification results to audit trail

HIPAA Compliance:
- Minimum necessary PHI: patient_dob, insurer_id, procedure_codes
- Excluded PHI: balances, prior_claims, diagnoses, treatment_history
- All actions logged with correlation_id for audit trail (6-year retention)
- No PHI in log messages (only patient_id references)

Author: CREATE SOMETHING
License: Proprietary
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import List, Dict, Optional, Any
import logging

logger = logging.getLogger(__name__)


class VerificationStatus(Enum):
    """Insurance verification status."""
    ACTIVE = "active"                    # Coverage active, no issues
    INACTIVE = "inactive"                # Coverage not active/expired
    COVERAGE_ISSUE = "coverage_issue"    # Active but procedure not covered
    VERIFICATION_FAILED = "verification_failed"  # API call failed


@dataclass
class UpcomingAppointment:
    """Upcoming appointment requiring insurance verification.

    HIPAA: Minimum necessary PHI for insurance verification workflow.
    """
    appointment_id: str
    patient_id: str
    patient_dob: str  # Format: YYYY-MM-DD
    appointment_date: str  # Format: YYYY-MM-DD HH:MM
    insurer_id: str
    procedure_codes: List[str]  # CDT codes for procedures
    provider_id: str


@dataclass
class VerificationResult:
    """Result of insurance eligibility verification.

    HIPAA: Contains verification outcome and flags, no detailed PHI.
    """
    appointment_id: str
    patient_id: str
    status: VerificationStatus
    coverage_active: bool
    procedures_covered: List[str]  # CDT codes that are covered
    procedures_not_covered: List[str]  # CDT codes that are NOT covered
    estimated_coverage_amount: Optional[float]  # Estimated insurance payment
    patient_responsibility: Optional[float]  # Estimated patient payment
    verification_date: str  # ISO timestamp
    error_message: Optional[str]  # If verification failed
    requires_human_review: bool  # True if coverage issues detected
    audit_id: str  # Correlation ID for audit trail


async def get_upcoming_appointments(
    pms_client: Any,
    days_ahead: int = 7,
    correlation_id: Optional[str] = None
) -> List[UpcomingAppointment]:
    """Query PMS for upcoming appointments requiring insurance verification.

    HIPAA Compliance:
    - Only accesses: appointment_id, patient_id, patient_dob, appointment_date,
      insurer_id, procedure_codes, provider_id
    - Excludes: balances, prior_claims, diagnoses, treatment_history

    Args:
        pms_client: PMS API client (Dentrix, Open Dental, Eaglesoft)
        days_ahead: Number of days ahead to query (default: 7)
        correlation_id: Correlation ID for audit trail

    Returns:
        List of UpcomingAppointment objects

    Example:
        >>> appointments = await get_upcoming_appointments(
        ...     pms_client,
        ...     days_ahead=7,
        ...     correlation_id="verif-abc123"
        ... )
        >>> print(f"Found {len(appointments)} appointments")
    """
    start_date = datetime.now()
    end_date = start_date + timedelta(days=days_ahead)

    # TODO: Production - Replace with actual PMS API call
    # Example for Dentrix:
    # response = await pms_client.get(
    #     "/appointments",
    #     params={
    #         "start_date": start_date.strftime("%Y-%m-%d"),
    #         "end_date": end_date.strftime("%Y-%m-%d"),
    #         "fields": "appointment_id,patient_id,patient_dob,appointment_date,insurer_id,procedure_codes,provider_id",
    #         "has_insurance": "true"
    #     }
    # )

    # Mock implementation for development
    logger.info(
        f"Querying appointments from {start_date.date()} to {end_date.date()}",
        extra={"correlation_id": correlation_id}
    )

    # Mock: Return empty list (production would parse PMS response)
    appointments: List[UpcomingAppointment] = []

    logger.info(
        f"Found {len(appointments)} appointments requiring verification",
        extra={"correlation_id": correlation_id}
    )

    return appointments


async def verify_insurance_eligibility(
    appointment: UpcomingAppointment,
    insurance_api_client: Any,
    correlation_id: str
) -> VerificationResult:
    """Verify insurance eligibility for a single appointment.

    Calls insurance clearinghouse API with minimum necessary data:
    - patient_dob: For patient identification
    - insurer_id: To route to correct insurance provider
    - procedure_codes: To check coverage for specific procedures

    HIPAA Compliance:
    - Minimum necessary PHI: patient_dob, insurer_id, procedure_codes
    - Excluded: balances, prior_claims, diagnoses, treatment_history
    - Logs all actions with correlation_id (no PHI in logs)

    Args:
        appointment: UpcomingAppointment object to verify
        insurance_api_client: Insurance clearinghouse API client
        correlation_id: Correlation ID for audit trail

    Returns:
        VerificationResult object with coverage details

    Example:
        >>> result = await verify_insurance_eligibility(
        ...     appointment,
        ...     insurance_api_client,
        ...     correlation_id="verif-abc123"
        ... )
        >>> if result.requires_human_review:
        ...     print(f"Coverage issue detected: {result.error_message}")
    """
    try:
        # TODO: Production - Replace with actual insurance API call
        # Example for common clearinghouse:
        # response = await insurance_api_client.post(
        #     "/eligibility/verify",
        #     json={
        #         "patient_dob": appointment.patient_dob,
        #         "insurer_id": appointment.insurer_id,
        #         "procedure_codes": appointment.procedure_codes,
        #         "service_date": appointment.appointment_date.split(" ")[0]
        #     }
        # )

        logger.info(
            "Verifying insurance eligibility",
            extra={
                "appointment_id": appointment.appointment_id,
                "patient_id": appointment.patient_id,
                "correlation_id": correlation_id
            }
        )

        # Mock implementation for development
        # Production would parse actual API response
        status = VerificationStatus.ACTIVE
        coverage_active = True
        procedures_covered = appointment.procedure_codes
        procedures_not_covered: List[str] = []
        estimated_coverage_amount = 150.0
        patient_responsibility = 50.0
        error_message = None
        requires_human_review = False

        result = VerificationResult(
            appointment_id=appointment.appointment_id,
            patient_id=appointment.patient_id,
            status=status,
            coverage_active=coverage_active,
            procedures_covered=procedures_covered,
            procedures_not_covered=procedures_not_covered,
            estimated_coverage_amount=estimated_coverage_amount,
            patient_responsibility=patient_responsibility,
            verification_date=datetime.now().isoformat(),
            error_message=error_message,
            requires_human_review=requires_human_review,
            audit_id=correlation_id
        )

        logger.info(
            f"Verification complete: {status.value}",
            extra={
                "appointment_id": appointment.appointment_id,
                "patient_id": appointment.patient_id,
                "status": status.value,
                "requires_review": requires_human_review,
                "correlation_id": correlation_id
            }
        )

        return result

    except Exception as e:
        logger.error(
            "Insurance verification failed",
            extra={
                "appointment_id": appointment.appointment_id,
                "patient_id": appointment.patient_id,
                "error": str(e),
                "correlation_id": correlation_id
            },
            exc_info=True
        )

        # Return failed verification result
        return VerificationResult(
            appointment_id=appointment.appointment_id,
            patient_id=appointment.patient_id,
            status=VerificationStatus.VERIFICATION_FAILED,
            coverage_active=False,
            procedures_covered=[],
            procedures_not_covered=appointment.procedure_codes,
            estimated_coverage_amount=None,
            patient_responsibility=None,
            verification_date=datetime.now().isoformat(),
            error_message=str(e),
            requires_human_review=True,
            audit_id=correlation_id
        )


async def flag_appointments_for_review(
    results: List[VerificationResult],
    correlation_id: str
) -> List[VerificationResult]:
    """Filter verification results to find appointments requiring human review.

    Flags appointments with:
    - Inactive coverage
    - Coverage issues (some procedures not covered)
    - Verification failures (API errors)

    Args:
        results: List of VerificationResult objects
        correlation_id: Correlation ID for audit trail

    Returns:
        Filtered list of VerificationResult objects requiring review

    Example:
        >>> flagged = await flag_appointments_for_review(
        ...     results,
        ...     correlation_id="verif-abc123"
        ... )
        >>> print(f"{len(flagged)} appointments need review")
    """
    flagged = [r for r in results if r.requires_human_review]

    logger.info(
        f"Flagged {len(flagged)} appointments for human review",
        extra={
            "total_verified": len(results),
            "flagged_count": len(flagged),
            "correlation_id": correlation_id
        }
    )

    return flagged


async def send_staff_notification(
    flagged_results: List[VerificationResult],
    practice_email: str,
    correlation_id: str
) -> Dict[str, Any]:
    """Send notification to practice staff about flagged appointments.

    HIPAA Compliance:
    - Email sent only to practice staff (authorized recipients)
    - No PHI in email subject line
    - Email body includes only patient_id and appointment_id (no names/details)

    Args:
        flagged_results: List of VerificationResult objects requiring review
        practice_email: Practice staff email address
        correlation_id: Correlation ID for audit trail

    Returns:
        Dictionary with notification status:
        - success: bool
        - message: str
        - notification_id: str (if successful)

    Example:
        >>> result = await send_staff_notification(
        ...     flagged_results,
        ...     "staff@dentalpractice.com",
        ...     correlation_id="verif-abc123"
        ... )
        >>> print(result["message"])
    """
    if not flagged_results:
        logger.info(
            "No flagged appointments, skipping staff notification",
            extra={"correlation_id": correlation_id}
        )
        return {
            "success": True,
            "message": "No flagged appointments",
            "notification_id": None
        }

    # TODO: Production - Integrate with actual email service (SendGrid, etc.)
    # Example:
    # from ..notifications.patient_outreach import send_email_notification
    #
    # body = "Insurance verification flagged the following appointments:\n\n"
    # for result in flagged_results:
    #     body += f"Appointment: {result.appointment_id}\n"
    #     body += f"Patient: {result.patient_id}\n"
    #     body += f"Status: {result.status.value}\n"
    #     body += f"Issue: {result.error_message or 'Coverage issue'}\n\n"
    #
    # email_result = await send_email_notification(
    #     to_email=practice_email,
    #     subject="Insurance Verification - Review Required",
    #     body=body,
    #     correlation_id=correlation_id
    # )

    logger.info(
        f"Sending staff notification for {len(flagged_results)} flagged appointments",
        extra={
            "flagged_count": len(flagged_results),
            "recipient": practice_email,
            "correlation_id": correlation_id
        }
    )

    # Mock implementation for development
    notification_id = f"notif-{correlation_id}"

    return {
        "success": True,
        "message": f"Notification sent for {len(flagged_results)} flagged appointments",
        "notification_id": notification_id
    }


async def log_verification_results(
    results: List[VerificationResult],
    audit_log_client: Any,
    correlation_id: str
) -> None:
    """Log verification results to audit trail.

    HIPAA Compliance:
    - Logs must be retained for 6 years (HIPAA requirement)
    - No PHI in logs (only patient_id, appointment_id references)
    - All logs include correlation_id for request tracing

    Args:
        results: List of VerificationResult objects to log
        audit_log_client: Audit log storage client (KV, D1, etc.)
        correlation_id: Correlation ID for audit trail

    Example:
        >>> await log_verification_results(
        ...     results,
        ...     env.AUDIT_LOG,
        ...     correlation_id="verif-abc123"
        ... )
    """
    for result in results:
        audit_entry = {
            "timestamp": datetime.now().isoformat(),
            "action": "insurance_verification",
            "actor_type": "system",
            "appointment_id": result.appointment_id,
            "patient_id": result.patient_id,
            "verification_status": result.status.value,
            "coverage_active": result.coverage_active,
            "requires_review": result.requires_human_review,
            "correlation_id": correlation_id
        }

        # TODO: Production - Store in actual audit log system
        # Example for Cloudflare KV:
        # six_years_ttl = 6 * 365 * 24 * 60 * 60  # 189,216,000 seconds
        # await audit_log_client.put(
        #     f"audit:{result.audit_id}:{result.appointment_id}",
        #     json.dumps(audit_entry),
        #     expiration_ttl=six_years_ttl
        # )

        logger.info(
            "Logged verification result to audit trail",
            extra={
                "appointment_id": result.appointment_id,
                "patient_id": result.patient_id,
                "status": result.status.value,
                "audit_id": result.audit_id,
                "correlation_id": correlation_id
            }
        )


async def run_insurance_verification_workflow(
    pms_client: Any,
    insurance_api_client: Any,
    audit_log_client: Any,
    practice_email: str,
    days_ahead: int = 7,
    correlation_id: Optional[str] = None
) -> Dict[str, Any]:
    """Execute complete insurance verification workflow.

    Workflow Steps:
    1. Query PMS for upcoming appointments (next 7 days)
    2. Verify insurance eligibility for each appointment
    3. Flag appointments with coverage issues
    4. Send notification to practice staff
    5. Log all results to audit trail

    HIPAA Compliance:
    - Minimum necessary PHI throughout workflow
    - All actions logged with correlation_id
    - No PHI in notification subject lines or logs

    Args:
        pms_client: PMS API client
        insurance_api_client: Insurance clearinghouse API client
        audit_log_client: Audit log storage client
        practice_email: Practice staff email for notifications
        days_ahead: Number of days ahead to verify (default: 7)
        correlation_id: Correlation ID for audit trail

    Returns:
        Dictionary with workflow results:
        - total_appointments: int
        - verified: int
        - flagged: int
        - notification_sent: bool
        - correlation_id: str

    Example:
        >>> result = await run_insurance_verification_workflow(
        ...     pms_client=pms,
        ...     insurance_api_client=insurance_api,
        ...     audit_log_client=env.AUDIT_LOG,
        ...     practice_email="staff@practice.com",
        ...     correlation_id="verif-abc123"
        ... )
        >>> print(f"Verified {result['verified']} appointments")
    """
    if not correlation_id:
        correlation_id = f"verif-{datetime.now().strftime('%Y%m%d%H%M%S')}"

    logger.info(
        "Starting insurance verification workflow",
        extra={"correlation_id": correlation_id}
    )

    # Step 1: Get upcoming appointments
    appointments = await get_upcoming_appointments(
        pms_client,
        days_ahead=days_ahead,
        correlation_id=correlation_id
    )

    # Step 2: Verify each appointment
    verification_results: List[VerificationResult] = []
    for appointment in appointments:
        result = await verify_insurance_eligibility(
            appointment,
            insurance_api_client,
            correlation_id=correlation_id
        )
        verification_results.append(result)

    # Step 3: Flag appointments requiring review
    flagged_results = await flag_appointments_for_review(
        verification_results,
        correlation_id=correlation_id
    )

    # Step 4: Send staff notification
    notification_result = await send_staff_notification(
        flagged_results,
        practice_email,
        correlation_id=correlation_id
    )

    # Step 5: Log all results to audit trail
    await log_verification_results(
        verification_results,
        audit_log_client,
        correlation_id=correlation_id
    )

    workflow_result = {
        "total_appointments": len(appointments),
        "verified": len(verification_results),
        "flagged": len(flagged_results),
        "notification_sent": notification_result["success"],
        "correlation_id": correlation_id
    }

    logger.info(
        "Insurance verification workflow complete",
        extra={
            **workflow_result,
            "correlation_id": correlation_id
        }
    )

    return workflow_result
