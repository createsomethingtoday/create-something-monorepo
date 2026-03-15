"""
Patient notification system for dental practice management.

Provides HIPAA-compliant SMS and email notifications with rate limiting
and secure confirmation links.
"""

from .patient_outreach import (
    AppointmentDetails,
    NotificationResult,
    NotificationType,
    RateLimitStatus,
    check_rate_limit,
    generate_confirmation_link,
    send_email_notification,
    send_sms_notification,
    send_waitlist_notification,
    verify_confirmation_link,
)

__all__ = [
    "AppointmentDetails",
    "NotificationResult",
    "NotificationType",
    "RateLimitStatus",
    "check_rate_limit",
    "generate_confirmation_link",
    "send_email_notification",
    "send_sms_notification",
    "send_waitlist_notification",
    "verify_confirmation_link",
]
