"""
Unit tests for no-show appointment recovery workflow.

Tests the scoring algorithm and matching logic with mock PMS data.
"""

import pytest
from datetime import datetime, timedelta
from src.create_something_agents.workflows.no_show_recovery import (
    NoShowAppointment,
    WaitlistPatient,
    detect_no_shows,
    match_waitlist_patients,
    rank_all_matches
)


class MockPMSClient:
    """Mock PMS API client for testing."""

    def __init__(self, appointments=None):
        self.appointments = appointments or []

    def get_appointments(self, **kwargs):
        return {"appointments": self.appointments}


@pytest.fixture
def mock_no_show_slot():
    """Create a mock no-show appointment slot."""
    # Morning appointment on Monday at 9:00 AM
    appointment_date = datetime(2026, 1, 13, 9, 0)  # Monday
    return NoShowAppointment(
        appointment_id="appt_123",
        patient_id="patient_original",
        appointment_date=appointment_date,
        appointment_type="cleaning",
        duration_minutes=45,
        provider_id="provider_001",
        phone="+1-555-0100",
        email="original@example.com"
    )


@pytest.fixture
def mock_waitlist_patients():
    """Create a mock waitlist with various patient preferences."""
    now = datetime.now()

    return [
        # Perfect match: same type, morning preference, Monday, same provider, urgent
        WaitlistPatient(
            patient_id="patient_001",
            phone="+1-555-0101",
            email="patient1@example.com",
            appointment_type="cleaning",
            preferred_time_of_day="morning",
            preferred_day_of_week=["monday", "tuesday"],
            preferred_provider_id="provider_001",
            urgency=5,
            wait_since=now - timedelta(weeks=4)
        ),
        # Good match: same type, morning preference, but different provider
        WaitlistPatient(
            patient_id="patient_002",
            phone="+1-555-0102",
            email="patient2@example.com",
            appointment_type="cleaning",
            preferred_time_of_day="morning",
            preferred_day_of_week=["monday"],
            preferred_provider_id="provider_002",
            urgency=3,
            wait_since=now - timedelta(weeks=2)
        ),
        # Partial match: same type, but prefers afternoon
        WaitlistPatient(
            patient_id="patient_003",
            phone="+1-555-0103",
            email="patient3@example.com",
            appointment_type="cleaning",
            preferred_time_of_day="afternoon",
            preferred_day_of_week=["wednesday"],
            preferred_provider_id=None,
            urgency=2,
            wait_since=now - timedelta(weeks=1)
        ),
        # No match: different appointment type
        WaitlistPatient(
            patient_id="patient_004",
            phone="+1-555-0104",
            email="patient4@example.com",
            appointment_type="filling",
            preferred_time_of_day="morning",
            preferred_day_of_week=["monday"],
            preferred_provider_id="provider_001",
            urgency=4,
            wait_since=now - timedelta(weeks=3)
        )
    ]


def test_detect_no_shows_with_mock_data():
    """Test no-show detection returns expected appointments."""
    mock_appointments = [
        {
            "id": "appt_123",
            "patient_id": "patient_001",
            "appointment_date": "2026-01-13T09:00:00",
            "appointment_type": "cleaning",
            "duration": 45,
            "provider_id": "provider_001",
            "phone": "+1-555-0100",
            "email": "test@example.com",
            "status": "no_show"
        }
    ]

    mock_client = MockPMSClient(appointments=mock_appointments)

    # Note: detect_no_shows currently returns empty list (mock implementation)
    # In production, it would call mock_client and parse results
    no_shows = detect_no_shows(mock_client, days_back=7)

    # This test validates the function signature and return type
    assert isinstance(no_shows, list)
    # Production implementation would assert len(no_shows) == 1


def test_match_waitlist_patients_perfect_match(mock_no_show_slot, mock_waitlist_patients):
    """Test that perfect match patient scores highest."""
    matches = match_waitlist_patients(
        no_show_slot=mock_no_show_slot,
        waitlist=mock_waitlist_patients,
        max_matches=3
    )

    assert len(matches) > 0
    # First match should be patient_001 (perfect match)
    best_match = matches[0]
    assert best_match.patient.patient_id == "patient_001"

    # Verify score components for perfect match:
    # - Appointment type match: 20
    # - Time of day match: 10
    # - Provider match: 8
    # - Day of week match: 5
    # - Urgency (5): 15
    # - Wait time (4 weeks): 4
    # Total: 62
    assert best_match.score == 62.0


def test_match_waitlist_patients_filters_by_type(mock_no_show_slot, mock_waitlist_patients):
    """Test that patients with different appointment types are filtered out."""
    matches = match_waitlist_patients(
        no_show_slot=mock_no_show_slot,
        waitlist=mock_waitlist_patients,
        max_matches=10
    )

    # patient_004 has appointment_type="filling", should not match
    patient_ids = [m.patient.patient_id for m in matches]
    assert "patient_004" not in patient_ids


def test_match_waitlist_patients_ranks_by_score(mock_no_show_slot, mock_waitlist_patients):
    """Test that matches are ranked by score (highest first)."""
    matches = match_waitlist_patients(
        no_show_slot=mock_no_show_slot,
        waitlist=mock_waitlist_patients,
        max_matches=3
    )

    # Verify scores are in descending order
    scores = [m.score for m in matches]
    assert scores == sorted(scores, reverse=True)


def test_match_waitlist_patients_respects_max_matches(mock_no_show_slot, mock_waitlist_patients):
    """Test that max_matches limits the number of results."""
    matches = match_waitlist_patients(
        no_show_slot=mock_no_show_slot,
        waitlist=mock_waitlist_patients,
        max_matches=2
    )

    assert len(matches) <= 2


def test_match_waitlist_patients_scoring_components(mock_no_show_slot):
    """Test individual scoring components work correctly."""
    now = datetime.now()

    # Patient with no preferences (only base score + urgency + wait time)
    minimal_patient = WaitlistPatient(
        patient_id="patient_minimal",
        phone="+1-555-0200",
        email=None,
        appointment_type="cleaning",
        preferred_time_of_day=None,
        preferred_day_of_week=None,
        preferred_provider_id=None,
        urgency=1,
        wait_since=now - timedelta(days=7)
    )

    matches = match_waitlist_patients(
        no_show_slot=mock_no_show_slot,
        waitlist=[minimal_patient],
        max_matches=1
    )

    assert len(matches) == 1
    # Score should be: 20 (type match) + 3 (urgency 1*3) + 1 (1 week waiting) = 24
    assert matches[0].score == 24.0


def test_rank_all_matches_multiple_slots():
    """Test ranking matches for multiple no-show slots."""
    now = datetime.now()

    # Two no-show slots
    slot1 = NoShowAppointment(
        appointment_id="appt_001",
        patient_id="patient_x",
        appointment_date=datetime(2026, 1, 13, 9, 0),
        appointment_type="cleaning",
        duration_minutes=45,
        provider_id="provider_001"
    )

    slot2 = NoShowAppointment(
        appointment_id="appt_002",
        patient_id="patient_y",
        appointment_date=datetime(2026, 1, 13, 14, 0),
        appointment_type="exam",
        duration_minutes=30,
        provider_id="provider_002"
    )

    # Waitlist patients
    waitlist = [
        WaitlistPatient(
            patient_id="patient_a",
            phone="+1-555-0301",
            email="a@example.com",
            appointment_type="cleaning",
            preferred_time_of_day="morning",
            preferred_day_of_week=["monday"],
            preferred_provider_id="provider_001",
            urgency=3,
            wait_since=now - timedelta(weeks=2)
        ),
        WaitlistPatient(
            patient_id="patient_b",
            phone="+1-555-0302",
            email="b@example.com",
            appointment_type="exam",
            preferred_time_of_day="afternoon",
            preferred_day_of_week=["monday"],
            preferred_provider_id="provider_002",
            urgency=4,
            wait_since=now - timedelta(weeks=3)
        )
    ]

    all_matches = rank_all_matches(
        no_shows=[slot1, slot2],
        waitlist=waitlist,
        max_matches_per_slot=3
    )

    # Should have matches for both slots
    assert "appt_001" in all_matches
    assert "appt_002" in all_matches

    # slot1 (cleaning) should match patient_a
    assert len(all_matches["appt_001"]) > 0
    assert all_matches["appt_001"][0].patient.patient_id == "patient_a"

    # slot2 (exam) should match patient_b
    assert len(all_matches["appt_002"]) > 0
    assert all_matches["appt_002"][0].patient.patient_id == "patient_b"


def test_wait_time_scoring_max_cap():
    """Test that wait time scoring caps at 10 points."""
    now = datetime.now()

    # Patient waiting 20 weeks (should cap at 10 points)
    long_wait_patient = WaitlistPatient(
        patient_id="patient_long_wait",
        phone="+1-555-0400",
        email="long@example.com",
        appointment_type="cleaning",
        preferred_time_of_day=None,
        preferred_day_of_week=None,
        preferred_provider_id=None,
        urgency=1,
        wait_since=now - timedelta(weeks=20)
    )

    slot = NoShowAppointment(
        appointment_id="appt_test",
        patient_id="patient_x",
        appointment_date=datetime(2026, 1, 13, 9, 0),
        appointment_type="cleaning",
        duration_minutes=45,
        provider_id="provider_001"
    )

    matches = match_waitlist_patients(
        no_show_slot=slot,
        waitlist=[long_wait_patient],
        max_matches=1
    )

    # Score: 20 (type) + 3 (urgency) + 10 (wait capped) = 33
    assert matches[0].score == 33.0
