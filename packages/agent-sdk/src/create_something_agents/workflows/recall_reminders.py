"""
Recall Reminder System

HIPAA-compliant automated recall system for dental practices.

This module implements automated recall reminders that:
1. Identifies overdue patients (last visit > 6 months, no future appointments)
2. Determines overdue procedure type from patient history
3. Sends personalized recall reminders via SMS/email
4. Tracks reminder status (sent, opened, clicked, booked)
5. Handles opt-out preferences

HIPAA Compliance:
- Minimum necessary PHI: name, phone, last_visit_date, overdue_procedure_type
- Excluded PHI: detailed_chart, payment_status, clinical_notes
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


class ReminderStatus(Enum):
    """Recall reminder status tracking."""
    SENT = "sent"              # Reminder sent to patient
    OPENED = "opened"          # Patient opened email/SMS
    CLICKED = "clicked"        # Patient clicked booking link
    BOOKED = "booked"          # Patient booked appointment
    OPT_OUT = "opt_out"        # Patient opted out of reminders
    FAILED = "failed"          # Delivery failed


class ProcedureType(Enum):
    """Common dental procedure types for recall."""
    CLEANING = "cleaning"              # Routine cleaning
    EXAM = "exam"                      # Comprehensive exam
    XRAY = "xray"                      # Routine X-rays
    PERIODONTAL = "periodontal"        # Periodontal maintenance
    FLUORIDE = "fluoride"              # Fluoride treatment


@dataclass
class OverduePatient:
    """Patient overdue for dental appointment.

    HIPAA: Minimum necessary PHI for recall reminder workflow.
    """
    patient_id: str
    name: str  # For personalized greeting
    phone: str  # Primary contact
    email: Optional[str]  # Secondary contact
    last_visit_date: str  # Format: YYYY-MM-DD
    days_since_visit: int  # Calculated from last_visit_date
    overdue_procedure_type: ProcedureType
    preferred_contact_method: str  # "sms", "email", or "both"
    opt_out_reminders: bool  # Patient preference


@dataclass
class ReminderResult:
    """Result of sending recall reminder.

    HIPAA: Contains delivery status, no detailed PHI.
    """
    patient_id: str
    reminder_id: str  # Unique ID for tracking
    status: ReminderStatus
    sent_via: str  # "sms", "email", or "both"
    sent_at: str  # ISO timestamp
    opened_at: Optional[str]  # ISO timestamp if opened
    clicked_at: Optional[str]  # ISO timestamp if clicked
    booked_at: Optional[str]  # ISO timestamp if booked
    error_message: Optional[str]  # If delivery failed
    audit_id: str  # Correlation ID for audit trail


async def identify_overdue_patients(
    pms_client: Any,
    months_overdue: int = 6,
    correlation_id: Optional[str] = None
) -> List[OverduePatient]:
    """Identify patients overdue for dental appointments.

    HIPAA Compliance:
    - Only accesses: patient_id, name, phone, email, last_visit_date
    - Excludes: detailed_chart, payment_status, clinical_notes
    - Filters patients with no future appointments scheduled

    Args:
        pms_client: PMS API client (Dentrix, Open Dental, Eaglesoft)
        months_overdue: Minimum months since last visit (default: 6)
        correlation_id: Correlation ID for audit trail

    Returns:
        List of OverduePatient objects

    Example:
        >>> overdue = await identify_overdue_patients(
        ...     pms_client,
        ...     months_overdue=6,
        ...     correlation_id="recall-abc123"
        ... )
        >>> print(f"Found {len(overdue)} overdue patients")
        Found 45 overdue patients
    """
    logger.info(
        f"Identifying overdue patients (months_overdue={months_overdue})",
        extra={"correlation_id": correlation_id, "action": "identify_overdue"}
    )

    # Calculate cutoff date
    cutoff_date = datetime.now() - timedelta(days=months_overdue * 30)
    cutoff_date_str = cutoff_date.strftime("%Y-%m-%d")

    # TODO: Replace with actual PMS API call
    # Production implementation:
    # response = await pms_client.get(
    #     "/patients",
    #     params={
    #         "fields": "patient_id,name,phone,email,last_visit_date,next_appointment,opt_out_reminders",
    #         "last_visit_before": cutoff_date_str,
    #         "has_future_appointment": "false"
    #     },
    #     headers={"X-Correlation-ID": correlation_id}
    # )

    # Mock data for development
    mock_patients = [
        {
            "patient_id": "pat_001",
            "name": "John Doe",
            "phone": "+15555551234",
            "email": "john@example.com",
            "last_visit_date": "2025-01-15",
            "opt_out_reminders": False,
            "preferred_contact_method": "sms"
        },
        {
            "patient_id": "pat_002",
            "name": "Jane Smith",
            "phone": "+15555555678",
            "email": "jane@example.com",
            "last_visit_date": "2024-12-01",
            "opt_out_reminders": False,
            "preferred_contact_method": "email"
        }
    ]

    overdue_patients = []
    for patient_data in mock_patients:
        # Calculate days since last visit
        last_visit = datetime.strptime(patient_data["last_visit_date"], "%Y-%m-%d")
        days_since = (datetime.now() - last_visit).days

        # Determine overdue procedure type from patient history
        procedure_type = _determine_overdue_procedure(patient_data, pms_client)

        overdue_patients.append(OverduePatient(
            patient_id=patient_data["patient_id"],
            name=patient_data["name"],
            phone=patient_data["phone"],
            email=patient_data.get("email"),
            last_visit_date=patient_data["last_visit_date"],
            days_since_visit=days_since,
            overdue_procedure_type=procedure_type,
            preferred_contact_method=patient_data["preferred_contact_method"],
            opt_out_reminders=patient_data["opt_out_reminders"]
        ))

    logger.info(
        f"Identified {len(overdue_patients)} overdue patients",
        extra={"correlation_id": correlation_id, "count": len(overdue_patients)}
    )

    return overdue_patients


def _determine_overdue_procedure(
    patient_data: Dict[str, Any],
    pms_client: Any
) -> ProcedureType:
    """Determine which procedure type patient is overdue for.

    Logic:
    - If last procedure was cleaning → cleaning due
    - If last X-ray > 1 year ago → X-ray due
    - If periodontal patient → periodontal maintenance due
    - Default: exam + cleaning

    Args:
        patient_data: Patient record from PMS
        pms_client: PMS API client for history lookup

    Returns:
        ProcedureType enum value
    """
    # TODO: Query patient procedure history from PMS
    # For now, default to cleaning (most common)
    return ProcedureType.CLEANING


async def send_recall_reminder(
    patient: OverduePatient,
    practice_name: str,
    practice_phone: str,
    booking_url: str,
    correlation_id: Optional[str] = None
) -> ReminderResult:
    """Send personalized recall reminder to patient.

    HIPAA Compliance:
    - No PHI in email subject lines
    - Personalized messaging using patient name
    - Includes opt-out link in all communications
    - Only sends to patients who haven't opted out

    Args:
        patient: OverduePatient object
        practice_name: Dental practice name for branding
        practice_phone: Practice contact number
        booking_url: URL for online booking (includes tracking)
        correlation_id: Correlation ID for audit trail

    Returns:
        ReminderResult with delivery status

    Example:
        >>> result = await send_recall_reminder(
        ...     patient=overdue_patient,
        ...     practice_name="Smile Dental",
        ...     practice_phone="+15555551234",
        ...     booking_url="https://booking.example.com/book?token=abc123",
        ...     correlation_id="recall-abc123"
        ... )
        >>> print(result.status)
        ReminderStatus.SENT
    """
    # Check opt-out status
    if patient.opt_out_reminders:
        logger.info(
            f"Patient opted out of reminders",
            extra={"patient_id": patient.patient_id, "correlation_id": correlation_id}
        )
        return ReminderResult(
            patient_id=patient.patient_id,
            reminder_id=f"rem_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            status=ReminderStatus.OPT_OUT,
            sent_via="none",
            sent_at=datetime.now().isoformat(),
            opened_at=None,
            clicked_at=None,
            booked_at=None,
            error_message="Patient opted out of reminders",
            audit_id=correlation_id or "unknown"
        )

    reminder_id = f"rem_{datetime.now().strftime('%Y%m%d%H%M%S')}_{patient.patient_id}"

    # Generate personalized message
    message = _generate_reminder_message(
        patient=patient,
        practice_name=practice_name,
        practice_phone=practice_phone,
        booking_url=booking_url,
        reminder_id=reminder_id
    )

    # Send via preferred contact method
    delivery_status = ReminderStatus.SENT
    error_msg = None

    try:
        if patient.preferred_contact_method in ["sms", "both"]:
            await _send_sms_reminder(patient.phone, message["sms"], correlation_id)

        if patient.preferred_contact_method in ["email", "both"] and patient.email:
            await _send_email_reminder(
                patient.email,
                message["email_subject"],
                message["email_body"],
                correlation_id
            )
    except Exception as e:
        logger.error(
            f"Failed to send reminder",
            extra={"patient_id": patient.patient_id, "error": str(e), "correlation_id": correlation_id}
        )
        delivery_status = ReminderStatus.FAILED
        error_msg = str(e)

    result = ReminderResult(
        patient_id=patient.patient_id,
        reminder_id=reminder_id,
        status=delivery_status,
        sent_via=patient.preferred_contact_method,
        sent_at=datetime.now().isoformat(),
        opened_at=None,
        clicked_at=None,
        booked_at=None,
        error_message=error_msg,
        audit_id=correlation_id or "unknown"
    )

    # Log to audit trail
    await _log_reminder_audit(result, correlation_id)

    return result


def _generate_reminder_message(
    patient: OverduePatient,
    practice_name: str,
    practice_phone: str,
    booking_url: str,
    reminder_id: str
) -> Dict[str, str]:
    """Generate personalized reminder messages for SMS and email.

    Args:
        patient: OverduePatient object
        practice_name: Practice name
        practice_phone: Practice contact
        booking_url: Booking link (with tracking token)
        reminder_id: Unique reminder ID for tracking

    Returns:
        Dict with keys: sms, email_subject, email_body
    """
    # Add tracking parameter to booking URL
    tracking_url = f"{booking_url}&reminder_id={reminder_id}&patient_id={patient.patient_id}"

    # Determine procedure-specific messaging
    procedure_text = {
        ProcedureType.CLEANING: "routine cleaning",
        ProcedureType.EXAM: "dental exam",
        ProcedureType.XRAY: "X-ray appointment",
        ProcedureType.PERIODONTAL: "periodontal maintenance",
        ProcedureType.FLUORIDE: "fluoride treatment"
    }.get(patient.overdue_procedure_type, "dental appointment")

    # SMS message (concise, <160 chars)
    sms_message = (
        f"Hi {patient.name.split()[0]}, it's time for your {procedure_text} at {practice_name}. "
        f"Book online: {tracking_url} or call {practice_phone}"
    )

    # Email subject (no PHI)
    email_subject = f"Time for your dental appointment at {practice_name}"

    # Email body (HTML)
    email_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #333;">
        <h2>Hi {patient.name.split()[0]},</h2>
        <p>It's been a while since your last visit to {practice_name}! We'd love to see you back for your {procedure_text}.</p>

        <p><strong>It's been {patient.days_since_visit} days since your last visit.</strong></p>

        <p>Maintaining regular dental visits helps:</p>
        <ul>
            <li>Prevent cavities and gum disease</li>
            <li>Catch issues early when they're easier to treat</li>
            <li>Keep your smile healthy and bright</li>
        </ul>

        <p style="margin-top: 30px;">
            <a href="{tracking_url}"
               style="background-color: #4CAF50; color: white; padding: 12px 24px;
                      text-decoration: none; border-radius: 4px; display: inline-block;">
                Book Your Appointment
            </a>
        </p>

        <p style="margin-top: 30px; font-size: 14px;">
            Prefer to call? Reach us at {practice_phone}
        </p>

        <hr style="margin-top: 40px; border: none; border-top: 1px solid #ddd;">

        <p style="font-size: 12px; color: #666;">
            Don't want to receive these reminders?
            <a href="{booking_url}&action=opt_out&patient_id={patient.patient_id}">Unsubscribe</a>
        </p>
    </body>
    </html>
    """

    return {
        "sms": sms_message,
        "email_subject": email_subject,
        "email_body": email_body
    }


async def _send_sms_reminder(
    phone: str,
    message: str,
    correlation_id: Optional[str] = None
) -> None:
    """Send SMS reminder via Twilio or similar provider.

    Args:
        phone: Patient phone number (E.164 format)
        message: SMS message text
        correlation_id: Correlation ID for audit trail
    """
    # TODO: Replace with actual Twilio API call
    # Production implementation:
    # from twilio.rest import Client
    # client = Client(account_sid, auth_token)
    # message = client.messages.create(
    #     body=message,
    #     from_=twilio_phone_number,
    #     to=phone
    # )

    logger.info(
        "SMS reminder sent (mock)",
        extra={"phone": phone[:5] + "***", "correlation_id": correlation_id}
    )


async def _send_email_reminder(
    email: str,
    subject: str,
    body: str,
    correlation_id: Optional[str] = None
) -> None:
    """Send email reminder via SendGrid or similar provider.

    Args:
        email: Patient email address
        subject: Email subject (no PHI)
        body: Email body (HTML)
        correlation_id: Correlation ID for audit trail
    """
    # TODO: Replace with actual SendGrid API call
    # Production implementation:
    # from sendgrid import SendGridAPIClient
    # from sendgrid.helpers.mail import Mail
    # message = Mail(
    #     from_email='noreply@dentalpractice.com',
    #     to_emails=email,
    #     subject=subject,
    #     html_content=body
    # )
    # sg = SendGridAPIClient(sendgrid_api_key)
    # response = sg.send(message)

    logger.info(
        "Email reminder sent (mock)",
        extra={"email": email[:3] + "***", "correlation_id": correlation_id}
    )


async def _log_reminder_audit(
    result: ReminderResult,
    correlation_id: Optional[str] = None
) -> None:
    """Log reminder delivery to audit trail with 6-year retention.

    HIPAA: 6-year retention = 189,216,000 seconds

    Args:
        result: ReminderResult object
        correlation_id: Correlation ID for audit trail
    """
    audit_entry = {
        "timestamp": datetime.now().isoformat(),
        "action": "recall_reminder_sent",
        "actor_id": "system",
        "actor_type": "agent",
        "patient_id": result.patient_id,
        "resource_type": "reminder",
        "resource_id": result.reminder_id,
        "outcome": result.status.value,
        "correlation_id": correlation_id or "unknown",
        "sent_via": result.sent_via,
        "sent_at": result.sent_at,
        "error": result.error_message
    }

    # TODO: Store in KV with 6-year TTL
    # Production implementation:
    # six_years_ttl = 189216000
    # await env.AUDIT_LOG.put(
    #     f"audit:recall:{result.reminder_id}",
    #     json.dumps(audit_entry),
    #     expirationTtl=six_years_ttl
    # )

    logger.info(
        "Reminder audit logged",
        extra=audit_entry
    )


async def track_reminder_status(
    reminder_id: str,
    status: ReminderStatus,
    correlation_id: Optional[str] = None
) -> None:
    """Update reminder status when patient interacts (opens, clicks, books).

    This function would be called by webhook endpoints that track:
    - Email opens (via tracking pixel)
    - Link clicks (via tracking parameters)
    - Appointment bookings (via booking system)

    Args:
        reminder_id: Unique reminder ID
        status: New status (opened, clicked, booked)
        correlation_id: Correlation ID for audit trail

    Example:
        >>> await track_reminder_status(
        ...     reminder_id="rem_20260112_pat_001",
        ...     status=ReminderStatus.CLICKED,
        ...     correlation_id="recall-abc123"
        ... )
    """
    logger.info(
        f"Reminder status updated: {status.value}",
        extra={"reminder_id": reminder_id, "status": status.value, "correlation_id": correlation_id}
    )

    # TODO: Update reminder status in database
    # Production implementation:
    # await db.execute(
    #     "UPDATE recall_reminders SET status = ?, updated_at = ? WHERE reminder_id = ?",
    #     (status.value, datetime.now().isoformat(), reminder_id)
    # )


async def handle_opt_out(
    patient_id: str,
    correlation_id: Optional[str] = None
) -> None:
    """Handle patient opt-out request for recall reminders.

    HIPAA: Patient has right to opt out of marketing communications.

    Args:
        patient_id: Patient identifier
        correlation_id: Correlation ID for audit trail

    Example:
        >>> await handle_opt_out(
        ...     patient_id="pat_001",
        ...     correlation_id="recall-abc123"
        ... )
    """
    logger.info(
        "Patient opted out of recall reminders",
        extra={"patient_id": patient_id, "correlation_id": correlation_id}
    )

    # TODO: Update patient preferences in PMS
    # Production implementation:
    # await pms_client.put(
    #     f"/patients/{patient_id}/preferences",
    #     json={"opt_out_reminders": True},
    #     headers={"X-Correlation-ID": correlation_id}
    # )

    # Log to audit trail
    audit_entry = {
        "timestamp": datetime.now().isoformat(),
        "action": "recall_opt_out",
        "actor_id": patient_id,
        "actor_type": "patient",
        "patient_id": patient_id,
        "resource_type": "preferences",
        "outcome": "success",
        "correlation_id": correlation_id or "unknown"
    }

    logger.info("Opt-out audit logged", extra=audit_entry)


async def run_recall_reminder_workflow(
    pms_client: Any,
    practice_name: str,
    practice_phone: str,
    booking_url: str,
    months_overdue: int = 6,
    correlation_id: Optional[str] = None
) -> List[ReminderResult]:
    """Execute complete recall reminder workflow.

    Orchestrates:
    1. Identify overdue patients (> months_overdue since last visit)
    2. Filter out patients who have opted out
    3. Send personalized reminders via SMS/email
    4. Log all actions to audit trail

    Args:
        pms_client: PMS API client
        practice_name: Dental practice name
        practice_phone: Practice contact number
        booking_url: Base URL for online booking
        months_overdue: Minimum months since last visit (default: 6)
        correlation_id: Correlation ID for audit trail

    Returns:
        List of ReminderResult objects

    Example:
        >>> results = await run_recall_reminder_workflow(
        ...     pms_client=pms_client,
        ...     practice_name="Smile Dental",
        ...     practice_phone="+15555551234",
        ...     booking_url="https://booking.example.com",
        ...     months_overdue=6,
        ...     correlation_id="recall-daily-001"
        ... )
        >>> print(f"Sent {len(results)} reminders")
        Sent 45 reminders
    """
    logger.info(
        "Starting recall reminder workflow",
        extra={"correlation_id": correlation_id, "months_overdue": months_overdue}
    )

    # Step 1: Identify overdue patients
    overdue_patients = await identify_overdue_patients(
        pms_client=pms_client,
        months_overdue=months_overdue,
        correlation_id=correlation_id
    )

    if not overdue_patients:
        logger.info(
            "No overdue patients found",
            extra={"correlation_id": correlation_id}
        )
        return []

    # Step 2 & 3: Send reminders (opt-out handled inside send_recall_reminder)
    results = []
    for patient in overdue_patients:
        result = await send_recall_reminder(
            patient=patient,
            practice_name=practice_name,
            practice_phone=practice_phone,
            booking_url=booking_url,
            correlation_id=correlation_id
        )
        results.append(result)

    # Summary logging
    sent_count = len([r for r in results if r.status == ReminderStatus.SENT])
    opt_out_count = len([r for r in results if r.status == ReminderStatus.OPT_OUT])
    failed_count = len([r for r in results if r.status == ReminderStatus.FAILED])

    logger.info(
        f"Recall workflow complete: {sent_count} sent, {opt_out_count} opted out, {failed_count} failed",
        extra={
            "correlation_id": correlation_id,
            "total": len(results),
            "sent": sent_count,
            "opt_out": opt_out_count,
            "failed": failed_count
        }
    )

    return results
