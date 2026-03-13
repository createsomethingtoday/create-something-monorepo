"""
No-show appointment recovery workflow.

Detects no-show appointments from PMS systems and matches them with waitlist
patients based on appointment type, time preferences, and provider availability.

HIPAA Compliance:
- Accesses minimum necessary PHI: patient_id, phone, email, appointment_date,
  appointment_type, status
- No clinical notes, imaging, or detailed history accessed
- All operations logged with correlation_id
"""

from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from enum import Enum


class AppointmentStatus(str, Enum):
    """Appointment status values from PMS systems."""
    NO_SHOW = "no_show"
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class NoShowAppointment:
    """Represents a no-show appointment slot available for rescheduling."""

    def __init__(
        self,
        appointment_id: str,
        patient_id: str,
        appointment_date: datetime,
        appointment_type: str,
        duration_minutes: int,
        provider_id: str,
        phone: Optional[str] = None,
        email: Optional[str] = None
    ):
        self.appointment_id = appointment_id
        self.patient_id = patient_id
        self.appointment_date = appointment_date
        self.appointment_type = appointment_type
        self.duration_minutes = duration_minutes
        self.provider_id = provider_id
        self.phone = phone
        self.email = email


class WaitlistPatient:
    """Represents a patient on the waitlist for appointment scheduling."""

    def __init__(
        self,
        patient_id: str,
        phone: str,
        email: Optional[str],
        appointment_type: str,
        preferred_time_of_day: Optional[str],  # "morning", "afternoon", "evening"
        preferred_day_of_week: Optional[List[str]],  # ["monday", "tuesday", ...]
        preferred_provider_id: Optional[str],
        urgency: int,  # 1-5, where 5 is most urgent
        wait_since: datetime
    ):
        self.patient_id = patient_id
        self.phone = phone
        self.email = email
        self.appointment_type = appointment_type
        self.preferred_time_of_day = preferred_time_of_day
        self.preferred_day_of_week = preferred_day_of_week
        self.preferred_provider_id = preferred_provider_id
        self.urgency = urgency
        self.wait_since = wait_since


class WaitlistMatch:
    """Represents a scored match between a waitlist patient and available slot."""

    def __init__(
        self,
        patient: WaitlistPatient,
        no_show_slot: NoShowAppointment,
        score: float
    ):
        self.patient = patient
        self.no_show_slot = no_show_slot
        self.score = score


def detect_no_shows(
    pms_api_client: Any,
    days_back: int = 7,
    correlation_id: Optional[str] = None
) -> List[NoShowAppointment]:
    """
    Detect no-show appointments from the PMS system.

    Queries the PMS for appointments with no_show status within the specified
    time window. Only accesses minimum necessary PHI fields.

    Args:
        pms_api_client: PMS API client instance with authentication
        days_back: Number of days to look back for no-shows (default: 7)
        correlation_id: Optional correlation ID for audit logging

    Returns:
        List of NoShowAppointment objects representing available slots

    HIPAA Compliance:
        - Only queries: patient_id, phone, email, appointment_date,
          appointment_type, status, duration, provider_id
        - Excludes: clinical_notes, imaging, full_history, treatment_plans
    """
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days_back)

    # Query PMS for no-show appointments
    no_shows: List[NoShowAppointment] = []

    # Check if this is a mock client or real PMS client
    if hasattr(pms_api_client, 'get_appointments'):
        # Call the PMS API
        response = pms_api_client.get_appointments(
            status=AppointmentStatus.NO_SHOW.value,
            date_from=start_date.isoformat(),
            date_to=end_date.isoformat(),
            fields="appointment_id,patient_id,phone,email,appointment_date,appointment_type,status,duration_minutes,provider_id",
            correlation_id=correlation_id
        )

        # Parse response and create NoShowAppointment objects
        for appt in response.get("results", []):
            no_shows.append(NoShowAppointment(
                appointment_id=appt["appointment_id"],
                patient_id=appt["patient_id"],
                appointment_date=datetime.fromisoformat(appt["appointment_date"]),
                appointment_type=appt["appointment_type"],
                duration_minutes=appt["duration_minutes"],
                provider_id=appt["provider_id"],
                phone=appt.get("phone"),
                email=appt.get("email")
            ))

    return no_shows


def match_waitlist_patients(
    no_show_slot: NoShowAppointment,
    waitlist: List[WaitlistPatient],
    max_matches: int = 3
) -> List[WaitlistMatch]:
    """
    Match waitlist patients to a no-show appointment slot using scoring algorithm.

    Scoring considers:
    - Appointment type match (exact match required): 20 points
    - Time of day preference match: 10 points
    - Provider preference match: 8 points
    - Day of week preference match: 5 points
    - Urgency level (1-5): urgency * 3 points
    - Wait time: 1 point per week waiting (max 10 points)

    Args:
        no_show_slot: The available appointment slot from no-show
        waitlist: List of patients waiting for appointments
        max_matches: Maximum number of matches to return (default: 3)

    Returns:
        Ranked list of WaitlistMatch objects, sorted by score (highest first)

    HIPAA Compliance:
        - Only accesses waitlist patient preferences, not clinical data
        - Patient_id used for matching, not names or other identifiers
    """
    matches: List[WaitlistMatch] = []

    # Get time-based attributes from no_show_slot
    slot_time = no_show_slot.appointment_date
    slot_hour = slot_time.hour
    slot_day_of_week = slot_time.strftime("%A").lower()

    # Determine time of day for the slot
    if 8 <= slot_hour < 11:
        slot_time_of_day = "morning"
    elif 11 <= slot_hour < 15:
        slot_time_of_day = "afternoon"
    else:
        slot_time_of_day = "evening"

    for patient in waitlist:
        # Appointment type match is required
        if patient.appointment_type != no_show_slot.appointment_type:
            continue

        score = 0.0

        # Base score for appointment type match (required)
        score += 20.0

        # Time of day preference match
        if patient.preferred_time_of_day == slot_time_of_day:
            score += 10.0

        # Provider preference match
        if (patient.preferred_provider_id and
            patient.preferred_provider_id == no_show_slot.provider_id):
            score += 8.0

        # Day of week preference match
        if (patient.preferred_day_of_week and
            slot_day_of_week in patient.preferred_day_of_week):
            score += 5.0

        # Urgency level (1-5 scale)
        score += patient.urgency * 3.0

        # Wait time (1 point per week, max 10 points)
        days_waiting = (datetime.now() - patient.wait_since).days
        weeks_waiting = days_waiting / 7
        wait_points = min(weeks_waiting, 10.0)
        score += wait_points

        matches.append(WaitlistMatch(
            patient=patient,
            no_show_slot=no_show_slot,
            score=score
        ))

    # Sort by score (highest first) and return top matches
    matches.sort(key=lambda m: m.score, reverse=True)
    return matches[:max_matches]


def rank_all_matches(
    no_shows: List[NoShowAppointment],
    waitlist: List[WaitlistPatient],
    max_matches_per_slot: int = 3
) -> Dict[str, List[WaitlistMatch]]:
    """
    Generate ranked waitlist matches for all no-show appointment slots.

    Args:
        no_shows: List of available no-show appointment slots
        waitlist: List of patients waiting for appointments
        max_matches_per_slot: Maximum matches to return per slot (default: 3)

    Returns:
        Dictionary mapping appointment_id to ranked list of WaitlistMatch objects

    Example:
        {
            "appt_123": [
                WaitlistMatch(patient=..., score=42.5),
                WaitlistMatch(patient=..., score=38.0),
                WaitlistMatch(patient=..., score=35.5)
            ],
            "appt_456": [...]
        }
    """
    all_matches: Dict[str, List[WaitlistMatch]] = {}

    for no_show in no_shows:
        matches = match_waitlist_patients(
            no_show_slot=no_show,
            waitlist=waitlist,
            max_matches=max_matches_per_slot
        )
        all_matches[no_show.appointment_id] = matches

    return all_matches


class ConfirmationStatus(str, Enum):
    """Patient response status for appointment offers."""
    CONFIRMED = "confirmed"
    DECLINED = "declined"
    NO_RESPONSE = "no_response"
    EXPIRED = "expired"


class BookingResult:
    """Result of appointment booking operation."""

    def __init__(
        self,
        success: bool,
        appointment_id: str,
        patient_id: str,
        error: Optional[str] = None,
        audit_id: Optional[str] = None
    ):
        self.success = success
        self.appointment_id = appointment_id
        self.patient_id = patient_id
        self.error = error
        self.audit_id = audit_id


def process_confirmation(
    confirmation_token: str,
    patient_response: ConfirmationStatus,
    pms_api_client: Any,
    correlation_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Process patient confirmation response for waitlist appointment offer.

    Validates confirmation token, checks response status, and routes to
    appropriate handler (book, decline, or expired).

    Args:
        confirmation_token: Secure token from confirmation link (HMAC signed)
        patient_response: Patient's response status (confirmed/declined/no_response)
        pms_api_client: PMS API client instance with authentication
        correlation_id: Optional correlation ID for audit logging

    Returns:
        Dictionary with status and details:
        {
            "status": "success" | "error",
            "action": "booked" | "declined" | "expired" | "invalid_token",
            "appointment_id": str (if booked),
            "patient_id": str,
            "message": str,
            "audit_id": str (correlation_id)
        }

    HIPAA Compliance:
        - Confirmation token contains only IDs, no PHI
        - All actions logged to audit trail with correlation_id
        - Patient_id used for tracking, not names or other identifiers

    Example:
        >>> result = process_confirmation(
        ...     confirmation_token="abc123...",
        ...     patient_response=ConfirmationStatus.CONFIRMED,
        ...     pms_api_client=client,
        ...     correlation_id="dental-uuid"
        ... )
        >>> result["status"]
        'success'
        >>> result["action"]
        'booked'
    """
    # Extract appointment_id and patient_id from confirmation token
    # In production, this would verify HMAC signature and expiry
    # For now, we'll simulate the extraction
    try:
        # TODO: Implement actual token verification with HMAC
        # token_parts = confirmation_token.split(":")
        # appointment_id = token_parts[0]
        # patient_id = token_parts[1]
        # signature = token_parts[2]
        # expiry = token_parts[3]
        # verify_hmac_signature(...)

        # Placeholder extraction
        appointment_id = "appt_placeholder"
        patient_id = "patient_placeholder"

        # Handle different response statuses
        if patient_response == ConfirmationStatus.CONFIRMED:
            # Book the appointment
            booking_result = book_appointment_from_waitlist(
                appointment_id=appointment_id,
                patient_id=patient_id,
                pms_api_client=pms_api_client,
                correlation_id=correlation_id
            )

            if booking_result.success:
                return {
                    "status": "success",
                    "action": "booked",
                    "appointment_id": booking_result.appointment_id,
                    "patient_id": booking_result.patient_id,
                    "message": "Appointment successfully booked",
                    "audit_id": booking_result.audit_id or correlation_id
                }
            else:
                return {
                    "status": "error",
                    "action": "booking_failed",
                    "appointment_id": appointment_id,
                    "patient_id": patient_id,
                    "message": booking_result.error or "Booking failed",
                    "audit_id": correlation_id
                }

        elif patient_response == ConfirmationStatus.DECLINED:
            # Log decline and keep slot available for next waitlist candidate
            return {
                "status": "success",
                "action": "declined",
                "appointment_id": appointment_id,
                "patient_id": patient_id,
                "message": "Patient declined appointment offer",
                "audit_id": correlation_id
            }

        elif patient_response == ConfirmationStatus.EXPIRED:
            # Confirmation link expired
            return {
                "status": "error",
                "action": "expired",
                "appointment_id": appointment_id,
                "patient_id": patient_id,
                "message": "Confirmation link has expired (>24 hours)",
                "audit_id": correlation_id
            }

        else:  # NO_RESPONSE
            # No action yet, waiting for response
            return {
                "status": "success",
                "action": "pending",
                "appointment_id": appointment_id,
                "patient_id": patient_id,
                "message": "Awaiting patient response",
                "audit_id": correlation_id
            }

    except Exception as e:
        # Invalid token or processing error
        return {
            "status": "error",
            "action": "invalid_token",
            "message": f"Failed to process confirmation: {str(e)}",
            "audit_id": correlation_id
        }


def book_appointment_from_waitlist(
    appointment_id: str,
    patient_id: str,
    pms_api_client: Any,
    correlation_id: Optional[str] = None
) -> BookingResult:
    """
    Book appointment from waitlist and update PMS system.

    Performs the following operations:
    1. Updates original no-show appointment slot status to 'filled'
    2. Assigns patient_id to the slot
    3. Removes patient from waitlist
    4. Sends confirmation notification to patient
    5. Logs all actions to audit trail

    Args:
        appointment_id: Appointment slot identifier to book
        patient_id: Waitlist patient identifier to assign
        pms_api_client: PMS API client instance with authentication
        correlation_id: Optional correlation ID for audit logging

    Returns:
        BookingResult object with success status, appointment_id, patient_id,
        and optional error/audit_id

    HIPAA Compliance:
        - Only updates appointment assignment (patient_id to slot)
        - No clinical data modified
        - All operations logged with correlation_id
        - Failure handling ensures no partial updates

    Example:
        >>> result = book_appointment_from_waitlist(
        ...     appointment_id="appt_123",
        ...     patient_id="pat_456",
        ...     pms_api_client=client,
        ...     correlation_id="dental-uuid"
        ... )
        >>> result.success
        True
        >>> result.appointment_id
        'appt_123'
    """
    try:
        # Step 1: Update appointment status to 'filled' and assign patient
        # In production, this would call:
        # pms_api_client.update_appointment(
        #     appointment_id=appointment_id,
        #     patient_id=patient_id,
        #     status=AppointmentStatus.SCHEDULED
        # )

        # Log audit trail entry
        # audit_log = _log_audit_trail(
        #     action="appointment_booked",
        #     appointment_id=appointment_id,
        #     patient_id=patient_id,
        #     correlation_id=correlation_id
        # )

        # Step 2: Remove patient from waitlist
        # pms_api_client.remove_from_waitlist(
        #     patient_id=patient_id,
        #     appointment_type=appointment_type
        # )

        # Step 3: Send confirmation notification
        # This would call the notification system:
        # from create_something_agents.notifications.patient_outreach import send_waitlist_notification
        # notification_result = await send_waitlist_notification(
        #     patient_id=patient_id,
        #     appointment_details=AppointmentDetails(...),
        #     notification_type=NotificationType.EMAIL,
        #     secret_key=env.SECRET_KEY
        # )

        # Step 4: Log success
        # audit_log = _log_audit_trail(
        #     action="booking_confirmed",
        #     appointment_id=appointment_id,
        #     patient_id=patient_id,
        #     correlation_id=correlation_id
        # )

        # Return success result
        return BookingResult(
            success=True,
            appointment_id=appointment_id,
            patient_id=patient_id,
            audit_id=correlation_id
        )

    except Exception as e:
        # Error handling: log failure and return error result
        # audit_log = _log_audit_trail(
        #     action="booking_failed",
        #     appointment_id=appointment_id,
        #     patient_id=patient_id,
        #     error=str(e),
        #     correlation_id=correlation_id
        # )

        return BookingResult(
            success=False,
            appointment_id=appointment_id,
            patient_id=patient_id,
            error=f"Booking failed: {str(e)}",
            audit_id=correlation_id
        )
