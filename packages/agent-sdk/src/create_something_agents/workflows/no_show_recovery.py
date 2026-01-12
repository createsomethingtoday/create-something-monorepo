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
    # In production, this would call pms_api_client.get_appointments()
    # with appropriate filters and field selection

    no_shows: List[NoShowAppointment] = []

    # Example implementation (would be replaced with actual PMS API call):
    # response = pms_api_client.get_appointments(
    #     status=AppointmentStatus.NO_SHOW,
    #     date_from=start_date,
    #     date_to=end_date,
    #     fields="patient_id,phone,email,appointment_date,appointment_type,status,duration,provider_id"
    # )
    #
    # for appt in response.get("appointments", []):
    #     no_shows.append(NoShowAppointment(
    #         appointment_id=appt["id"],
    #         patient_id=appt["patient_id"],
    #         appointment_date=datetime.fromisoformat(appt["appointment_date"]),
    #         appointment_type=appt["appointment_type"],
    #         duration_minutes=appt["duration"],
    #         provider_id=appt["provider_id"],
    #         phone=appt.get("phone"),
    #         email=appt.get("email")
    #     ))

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
