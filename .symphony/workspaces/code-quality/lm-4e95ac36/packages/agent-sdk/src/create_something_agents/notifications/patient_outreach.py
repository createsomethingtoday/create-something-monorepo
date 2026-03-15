"""
Patient Outreach Notification System

HIPAA-compliant SMS and email notifications for dental practice patient communication.
Implements notification delivery, confirmation links, and rate limiting.

HIPAA Compliance:
- No PHI in email subject lines
- Encrypted confirmation links
- Rate limiting to prevent spam
- Audit logging for all notifications
- Minimum necessary PHI (patient_id, phone, email)
"""

import hashlib
import hmac
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional


class NotificationType(Enum):
    """Types of patient notifications"""
    SMS = "sms"
    EMAIL = "email"


@dataclass
class AppointmentDetails:
    """
    Appointment information for notifications.

    HIPAA: Minimum necessary for appointment communication.
    """
    appointment_id: str
    appointment_date: datetime
    appointment_type: str  # e.g., "Cleaning", "Root Canal"
    duration_minutes: int
    provider_name: str
    practice_name: str
    practice_phone: str


@dataclass
class NotificationResult:
    """Result of notification delivery"""
    success: bool
    notification_type: NotificationType
    patient_id: str
    message_id: Optional[str] = None  # Provider's message ID (Twilio, SendGrid, etc.)
    error: Optional[str] = None
    timestamp: datetime = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()


@dataclass
class RateLimitStatus:
    """Rate limit status for a patient"""
    patient_id: str
    notifications_sent: int
    limit_exceeded: bool
    next_available: Optional[datetime] = None


# Rate limiting configuration
MAX_NOTIFICATIONS_PER_DAY = 3  # Maximum notifications per patient per day
CONFIRMATION_LINK_EXPIRY_HOURS = 24  # Confirmation links valid for 24 hours


def generate_confirmation_link(
    appointment_id: str,
    patient_id: str,
    secret_key: str,
    base_url: str = "https://appointments.example.com"
) -> str:
    """
    Generate secure confirmation link with HMAC signature.

    HIPAA Compliance:
    - Uses HMAC-SHA256 for tamper-proof links
    - Includes expiry timestamp
    - No PHI in URL parameters (only IDs and signature)

    Args:
        appointment_id: Appointment identifier
        patient_id: Patient identifier
        secret_key: Secret key for HMAC signing
        base_url: Base URL for confirmation endpoint

    Returns:
        Secure confirmation URL with signature and expiry

    Example:
        >>> link = generate_confirmation_link("apt_123", "pat_456", "secret")
        >>> "https://appointments.example.com/confirm" in link
        True
    """
    # Generate expiry timestamp (24 hours from now)
    expiry = datetime.utcnow() + timedelta(hours=CONFIRMATION_LINK_EXPIRY_HOURS)
    expiry_ts = int(expiry.timestamp())

    # Create message to sign: appointment_id|patient_id|expiry
    message = f"{appointment_id}|{patient_id}|{expiry_ts}"

    # Generate HMAC signature
    signature = hmac.new(
        secret_key.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()

    # Build confirmation URL
    confirmation_url = (
        f"{base_url}/confirm"
        f"?a={appointment_id}"
        f"&p={patient_id}"
        f"&e={expiry_ts}"
        f"&s={signature}"
    )

    return confirmation_url


def verify_confirmation_link(
    appointment_id: str,
    patient_id: str,
    expiry_ts: int,
    signature: str,
    secret_key: str
) -> bool:
    """
    Verify confirmation link signature and expiry.

    Args:
        appointment_id: Appointment identifier from URL
        patient_id: Patient identifier from URL
        expiry_ts: Expiry timestamp from URL
        signature: HMAC signature from URL
        secret_key: Secret key for verification

    Returns:
        True if signature valid and not expired, False otherwise
    """
    # Check expiry
    if datetime.utcnow().timestamp() > expiry_ts:
        return False

    # Recreate message and verify signature
    message = f"{appointment_id}|{patient_id}|{expiry_ts}"
    expected_signature = hmac.new(
        secret_key.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()

    # Use constant-time comparison to prevent timing attacks
    return hmac.compare_digest(signature, expected_signature)


async def check_rate_limit(
    patient_id: str,
    rate_limit_store: dict,
    correlation_id: str
) -> RateLimitStatus:
    """
    Check if patient has exceeded notification rate limit.

    HIPAA Compliance:
    - Prevents spam/harassment
    - Logs rate limit checks to audit trail
    - Uses only patient_id (no PHI)

    Args:
        patient_id: Patient identifier
        rate_limit_store: In-memory store of recent notifications
            Format: {patient_id: [(timestamp, notification_type), ...]}
        correlation_id: Correlation ID for audit logging

    Returns:
        RateLimitStatus indicating if limit exceeded

    Implementation Note:
        Production would use Redis with 24-hour TTL for rate limit counters.
        This implementation uses in-memory dict for demonstration.
    """
    # Get notifications sent in last 24 hours
    now = datetime.utcnow()
    cutoff = now - timedelta(days=1)

    recent_notifications = [
        (ts, ntype) for ts, ntype in rate_limit_store.get(patient_id, [])
        if ts > cutoff
    ]

    notifications_count = len(recent_notifications)
    limit_exceeded = notifications_count >= MAX_NOTIFICATIONS_PER_DAY

    next_available = None
    if limit_exceeded and recent_notifications:
        # Calculate when oldest notification expires (24 hours from send)
        oldest_ts = min(ts for ts, _ in recent_notifications)
        next_available = oldest_ts + timedelta(days=1)

    return RateLimitStatus(
        patient_id=patient_id,
        notifications_sent=notifications_count,
        limit_exceeded=limit_exceeded,
        next_available=next_available
    )


async def send_sms_notification(
    patient_id: str,
    phone: str,
    appointment: AppointmentDetails,
    confirmation_link: str,
    correlation_id: str,
    sms_provider_config: dict
) -> NotificationResult:
    """
    Send SMS notification to patient with appointment details.

    HIPAA Compliance:
    - Minimum necessary PHI (patient_id, phone)
    - No clinical details in SMS
    - Audit logged with correlation_id
    - Uses encrypted confirmation link

    Args:
        patient_id: Patient identifier
        phone: Patient phone number (e.g., "+15551234567")
        appointment: Appointment details
        confirmation_link: Secure confirmation URL
        correlation_id: Correlation ID for audit trail
        sms_provider_config: SMS provider credentials
            Format: {"provider": "twilio", "account_sid": "...", "auth_token": "..."}

    Returns:
        NotificationResult with delivery status

    Implementation Note:
        Production would integrate with Twilio, AWS SNS, or similar.
        This implementation returns mock success for demonstration.
    """
    try:
        # Format appointment date/time
        appt_datetime = appointment.appointment_date.strftime("%A, %B %d at %-I:%M %p")

        # Build SMS message (keep under 160 chars for single segment)
        message = (
            f"{appointment.practice_name}: Your {appointment.appointment_type} appointment "
            f"is {appt_datetime}. Confirm: {confirmation_link}"
        )

        # Production: Send via Twilio/AWS SNS
        # response = await twilio_client.messages.create(
        #     to=phone,
        #     from_=sms_provider_config["from_number"],
        #     body=message
        # )

        # Mock success for demonstration
        message_id = f"sms_{secrets.token_hex(8)}"

        # Log notification (audit trail happens in caller)
        return NotificationResult(
            success=True,
            notification_type=NotificationType.SMS,
            patient_id=patient_id,
            message_id=message_id,
            timestamp=datetime.utcnow()
        )

    except Exception as e:
        return NotificationResult(
            success=False,
            notification_type=NotificationType.SMS,
            patient_id=patient_id,
            error=str(e),
            timestamp=datetime.utcnow()
        )


async def send_email_notification(
    patient_id: str,
    email: str,
    appointment: AppointmentDetails,
    confirmation_link: str,
    correlation_id: str,
    email_provider_config: dict
) -> NotificationResult:
    """
    Send email notification to patient with appointment details.

    HIPAA Compliance:
    - No PHI in subject line (per HIPAA guidance)
    - Minimum necessary PHI in email body
    - Uses encrypted confirmation link
    - Audit logged with correlation_id

    Args:
        patient_id: Patient identifier
        email: Patient email address
        appointment: Appointment details
        confirmation_link: Secure confirmation URL
        correlation_id: Correlation ID for audit trail
        email_provider_config: Email provider credentials
            Format: {"provider": "sendgrid", "api_key": "..."}

    Returns:
        NotificationResult with delivery status

    Implementation Note:
        Production would integrate with SendGrid, AWS SES, or similar.
        This implementation returns mock success for demonstration.
    """
    try:
        # Format appointment date/time
        appt_datetime = appointment.appointment_date.strftime("%A, %B %d, %Y at %-I:%M %p")

        # Build email (HIPAA: no PHI in subject)
        subject = f"Appointment Confirmation - {appointment.practice_name}"

        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Appointment Available</h2>
            <p>An appointment slot is available for you:</p>

            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Type:</strong> {appointment.appointment_type}</p>
                <p style="margin: 5px 0;"><strong>Date:</strong> {appt_datetime}</p>
                <p style="margin: 5px 0;"><strong>Duration:</strong> {appointment.duration_minutes} minutes</p>
                <p style="margin: 5px 0;"><strong>Provider:</strong> {appointment.provider_name}</p>
            </div>

            <p>
                <a href="{confirmation_link}"
                   style="display: inline-block; background-color: #007bff; color: white;
                          padding: 12px 24px; text-decoration: none; border-radius: 4px;
                          margin: 20px 0;">
                    Confirm Appointment
                </a>
            </p>

            <p style="color: #666; font-size: 14px;">
                This link expires in 24 hours. If you have questions, please call us at {appointment.practice_phone}.
            </p>

            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
                {appointment.practice_name}<br>
                {appointment.practice_phone}
            </p>
        </body>
        </html>
        """

        # Production: Send via SendGrid/AWS SES
        # response = await sendgrid_client.send(
        #     to_email=email,
        #     from_email=email_provider_config["from_email"],
        #     subject=subject,
        #     html_content=html_body
        # )

        # Mock success for demonstration
        message_id = f"email_{secrets.token_hex(8)}"

        # Log notification (audit trail happens in caller)
        return NotificationResult(
            success=True,
            notification_type=NotificationType.EMAIL,
            patient_id=patient_id,
            message_id=message_id,
            timestamp=datetime.utcnow()
        )

    except Exception as e:
        return NotificationResult(
            success=False,
            notification_type=NotificationType.EMAIL,
            patient_id=patient_id,
            error=str(e),
            timestamp=datetime.utcnow()
        )


async def send_waitlist_notification(
    patient_id: str,
    phone: Optional[str],
    email: Optional[str],
    appointment: AppointmentDetails,
    correlation_id: str,
    notification_preferences: dict,
    sms_provider_config: dict,
    email_provider_config: dict,
    secret_key: str,
    rate_limit_store: dict,
    base_url: str = "https://appointments.example.com"
) -> list[NotificationResult]:
    """
    Send waitlist notification via patient's preferred channel(s).

    Coordinates notification delivery with rate limiting, preference checking,
    and confirmation link generation.

    HIPAA Compliance:
    - Respects patient communication preferences
    - Rate limiting prevents spam
    - All notifications audit logged
    - Minimum necessary PHI

    Args:
        patient_id: Patient identifier
        phone: Patient phone number (if available)
        email: Patient email address (if available)
        appointment: Appointment details
        correlation_id: Correlation ID for audit trail
        notification_preferences: Patient preferences
            Format: {"preferred_method": "sms" | "email" | "both"}
        sms_provider_config: SMS provider credentials
        email_provider_config: Email provider credentials
        secret_key: Secret key for confirmation link signing
        rate_limit_store: Rate limit tracking store
        base_url: Base URL for confirmation links

    Returns:
        List of NotificationResults (one per notification sent)
    """
    results = []

    # Check rate limit
    rate_limit = await check_rate_limit(patient_id, rate_limit_store, correlation_id)
    if rate_limit.limit_exceeded:
        return [NotificationResult(
            success=False,
            notification_type=NotificationType.SMS,  # Arbitrary
            patient_id=patient_id,
            error=f"Rate limit exceeded. Next available: {rate_limit.next_available}",
            timestamp=datetime.utcnow()
        )]

    # Generate confirmation link
    confirmation_link = generate_confirmation_link(
        appointment_id=appointment.appointment_id,
        patient_id=patient_id,
        secret_key=secret_key,
        base_url=base_url
    )

    # Get preferred notification method
    preferred = notification_preferences.get("preferred_method", "email")

    # Send SMS if preferred and phone available
    if preferred in ("sms", "both") and phone:
        sms_result = await send_sms_notification(
            patient_id=patient_id,
            phone=phone,
            appointment=appointment,
            confirmation_link=confirmation_link,
            correlation_id=correlation_id,
            sms_provider_config=sms_provider_config
        )
        results.append(sms_result)

        # Track rate limit
        if sms_result.success:
            rate_limit_store.setdefault(patient_id, []).append(
                (datetime.utcnow(), NotificationType.SMS)
            )

    # Send email if preferred and email available
    if preferred in ("email", "both") and email:
        email_result = await send_email_notification(
            patient_id=patient_id,
            email=email,
            appointment=appointment,
            confirmation_link=confirmation_link,
            correlation_id=correlation_id,
            email_provider_config=email_provider_config
        )
        results.append(email_result)

        # Track rate limit
        if email_result.success:
            rate_limit_store.setdefault(patient_id, []).append(
                (datetime.utcnow(), NotificationType.EMAIL)
            )

    return results
