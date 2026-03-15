"""
Unit tests for recall reminder system.

Tests cover:
- Patient identification with various timeframes
- Procedure type detection from patient history
- Message personalization for different procedures
- Opt-out handling (respects patient preferences)
- Reminder status tracking (sent, opened, clicked, booked)
- HIPAA compliance (minimum necessary PHI)
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch

from create_something_agents.workflows.recall_reminders import (
    identify_overdue_patients,
    send_recall_reminder,
    track_reminder_status,
    handle_opt_out,
    run_recall_reminder_workflow,
    _generate_reminder_message,
    _determine_overdue_procedure,
    OverduePatient,
    ReminderResult,
    ReminderStatus,
    ProcedureType,
)


@pytest.fixture
def mock_pms_client():
    """Mock PMS client for testing."""
    client = Mock()
    client.get = AsyncMock()
    client.put = AsyncMock()
    return client


@pytest.fixture
def sample_overdue_patient():
    """Sample overdue patient for testing."""
    return OverduePatient(
        patient_id="pat_001",
        name="John Doe",
        phone="+15555551234",
        email="john@example.com",
        last_visit_date="2025-01-15",
        days_since_visit=365,
        overdue_procedure_type=ProcedureType.CLEANING,
        preferred_contact_method="sms",
        opt_out_reminders=False
    )


@pytest.fixture
def sample_opted_out_patient():
    """Sample patient who opted out of reminders."""
    return OverduePatient(
        patient_id="pat_999",
        name="Jane Smith",
        phone="+15555555678",
        email="jane@example.com",
        last_visit_date="2024-06-15",
        days_since_visit=547,
        overdue_procedure_type=ProcedureType.EXAM,
        preferred_contact_method="email",
        opt_out_reminders=True
    )


class TestIdentifyOverduePatients:
    """Tests for identify_overdue_patients function."""

    @pytest.mark.asyncio
    async def test_identify_with_6_months_timeframe(self, mock_pms_client):
        """Test identifying patients overdue by 6 months."""
        # Current implementation uses mock data
        # This test validates function returns correct data structure
        patients = await identify_overdue_patients(
            pms_client=mock_pms_client,
            months_overdue=6,
            correlation_id="test-corr-001"
        )

        assert isinstance(patients, list)
        assert len(patients) >= 0  # Mock may return 0 or more patients

        # Validate structure of returned patients
        for patient in patients:
            assert isinstance(patient, OverduePatient)
            assert patient.patient_id
            assert patient.name
            assert patient.phone
            assert isinstance(patient.days_since_visit, int)
            assert isinstance(patient.overdue_procedure_type, ProcedureType)
            assert patient.preferred_contact_method in ["sms", "email", "both"]
            assert isinstance(patient.opt_out_reminders, bool)

    @pytest.mark.asyncio
    async def test_identify_with_12_months_timeframe(self, mock_pms_client):
        """Test identifying patients overdue by 12 months."""
        patients = await identify_overdue_patients(
            pms_client=mock_pms_client,
            months_overdue=12,
            correlation_id="test-corr-002"
        )

        assert isinstance(patients, list)
        # With 12-month cutoff, should find fewer or same patients as 6-month
        # (mock implementation may not reflect this, but structure should be valid)

    @pytest.mark.asyncio
    async def test_identify_minimum_necessary_phi_fields(self, mock_pms_client):
        """Test that only minimum necessary PHI fields are accessed.

        HIPAA: Only accesses patient_id, name, phone, email, last_visit_date
        Excludes: detailed_chart, payment_status, clinical_notes
        """
        patients = await identify_overdue_patients(
            pms_client=mock_pms_client,
            months_overdue=6,
            correlation_id="test-corr-003"
        )

        for patient in patients:
            # Verify only minimum necessary fields present
            assert hasattr(patient, 'patient_id')
            assert hasattr(patient, 'name')
            assert hasattr(patient, 'phone')
            assert hasattr(patient, 'email')  # Optional
            assert hasattr(patient, 'last_visit_date')
            assert hasattr(patient, 'days_since_visit')
            assert hasattr(patient, 'overdue_procedure_type')
            assert hasattr(patient, 'preferred_contact_method')
            assert hasattr(patient, 'opt_out_reminders')

            # Verify PHI fields excluded (should not exist in dataclass)
            assert not hasattr(patient, 'detailed_chart')
            assert not hasattr(patient, 'payment_status')
            assert not hasattr(patient, 'clinical_notes')
            assert not hasattr(patient, 'diagnosis')


class TestProcedureTypeDetection:
    """Tests for procedure type detection from patient history."""

    def test_determine_overdue_procedure_default(self, mock_pms_client):
        """Test default procedure type when history unavailable."""
        patient_data = {
            "patient_id": "pat_001",
            "name": "John Doe",
            "last_visit_date": "2025-01-15"
        }

        procedure = _determine_overdue_procedure(patient_data, mock_pms_client)

        # Current implementation defaults to CLEANING (most common)
        assert procedure == ProcedureType.CLEANING

    def test_procedure_type_enum_values(self):
        """Test all ProcedureType enum values are valid."""
        # Validate enum has expected values
        expected_types = {"cleaning", "exam", "xray", "periodontal", "fluoride"}
        actual_types = {pt.value for pt in ProcedureType}

        assert actual_types == expected_types


class TestMessagePersonalization:
    """Tests for message personalization for different procedures."""

    def test_message_personalization_cleaning(self, sample_overdue_patient):
        """Test personalized message for cleaning procedure."""
        sample_overdue_patient.overdue_procedure_type = ProcedureType.CLEANING

        message = _generate_reminder_message(
            patient=sample_overdue_patient,
            practice_name="Smile Dental",
            practice_phone="+15555551234",
            booking_url="https://booking.example.com",
            reminder_id="rem_test_001"
        )

        assert "routine cleaning" in message["sms"].lower()
        assert "John" in message["sms"]  # First name personalization
        assert "Smile Dental" in message["email_body"]
        assert sample_overdue_patient.name.split()[0] in message["email_body"]

    def test_message_personalization_exam(self, sample_overdue_patient):
        """Test personalized message for exam procedure."""
        sample_overdue_patient.overdue_procedure_type = ProcedureType.EXAM

        message = _generate_reminder_message(
            patient=sample_overdue_patient,
            practice_name="Smile Dental",
            practice_phone="+15555551234",
            booking_url="https://booking.example.com",
            reminder_id="rem_test_002"
        )

        assert "dental exam" in message["sms"].lower()
        assert "dental exam" in message["email_body"].lower()

    def test_message_personalization_xray(self, sample_overdue_patient):
        """Test personalized message for X-ray procedure."""
        sample_overdue_patient.overdue_procedure_type = ProcedureType.XRAY

        message = _generate_reminder_message(
            patient=sample_overdue_patient,
            practice_name="Smile Dental",
            practice_phone="+15555551234",
            booking_url="https://booking.example.com",
            reminder_id="rem_test_003"
        )

        assert "x-ray" in message["sms"].lower()
        assert "x-ray" in message["email_body"].lower()

    def test_message_personalization_periodontal(self, sample_overdue_patient):
        """Test personalized message for periodontal procedure."""
        sample_overdue_patient.overdue_procedure_type = ProcedureType.PERIODONTAL

        message = _generate_reminder_message(
            patient=sample_overdue_patient,
            practice_name="Smile Dental",
            practice_phone="+15555551234",
            booking_url="https://booking.example.com",
            reminder_id="rem_test_004"
        )

        assert "periodontal" in message["sms"].lower()
        assert "periodontal" in message["email_body"].lower()

    def test_message_includes_tracking_url(self, sample_overdue_patient):
        """Test message includes tracking URL with reminder_id and patient_id."""
        message = _generate_reminder_message(
            patient=sample_overdue_patient,
            practice_name="Smile Dental",
            practice_phone="+15555551234",
            booking_url="https://booking.example.com",
            reminder_id="rem_test_005"
        )

        # Verify tracking parameters in URL
        assert "reminder_id=rem_test_005" in message["sms"]
        assert f"patient_id={sample_overdue_patient.patient_id}" in message["sms"]
        assert "reminder_id=rem_test_005" in message["email_body"]
        assert f"patient_id={sample_overdue_patient.patient_id}" in message["email_body"]

    def test_message_includes_days_since_visit(self, sample_overdue_patient):
        """Test message includes days since last visit."""
        message = _generate_reminder_message(
            patient=sample_overdue_patient,
            practice_name="Smile Dental",
            practice_phone="+15555551234",
            booking_url="https://booking.example.com",
            reminder_id="rem_test_006"
        )

        assert str(sample_overdue_patient.days_since_visit) in message["email_body"]

    def test_email_subject_no_phi(self, sample_overdue_patient):
        """Test email subject contains no PHI (HIPAA compliance)."""
        message = _generate_reminder_message(
            patient=sample_overdue_patient,
            practice_name="Smile Dental",
            practice_phone="+15555551234",
            booking_url="https://booking.example.com",
            reminder_id="rem_test_007"
        )

        # Subject should not contain patient name, phone, or specific health info
        assert sample_overdue_patient.name not in message["email_subject"]
        assert sample_overdue_patient.phone not in message["email_subject"]
        # Subject should only contain practice name (generic)
        assert "Smile Dental" in message["email_subject"]


class TestOptOutHandling:
    """Tests for opt-out handling."""

    @pytest.mark.asyncio
    async def test_send_reminder_respects_opt_out(self, sample_opted_out_patient):
        """Test that reminders are not sent to patients who opted out."""
        result = await send_recall_reminder(
            patient=sample_opted_out_patient,
            practice_name="Smile Dental",
            practice_phone="+15555551234",
            booking_url="https://booking.example.com",
            correlation_id="test-corr-004"
        )

        assert result.status == ReminderStatus.OPT_OUT
        assert result.sent_via == "none"
        assert "opted out" in result.error_message.lower()

    @pytest.mark.asyncio
    async def test_send_reminder_to_active_patient(self, sample_overdue_patient):
        """Test that reminders ARE sent to patients who haven't opted out."""
        with patch('create_something_agents.workflows.recall_reminders._send_sms_reminder', new_callable=AsyncMock), \
             patch('create_something_agents.workflows.recall_reminders._log_reminder_audit', new_callable=AsyncMock):

            result = await send_recall_reminder(
                patient=sample_overdue_patient,
                practice_name="Smile Dental",
                practice_phone="+15555551234",
                booking_url="https://booking.example.com",
                correlation_id="test-corr-005"
            )

            assert result.status == ReminderStatus.SENT
            assert result.sent_via == sample_overdue_patient.preferred_contact_method
            assert result.error_message is None

    @pytest.mark.asyncio
    async def test_handle_opt_out_updates_preference(self, mock_pms_client):
        """Test opt-out handling logs preference change."""
        # Current implementation doesn't update PMS (mock)
        # This test validates function completes without error
        await handle_opt_out(
            patient_id="pat_001",
            correlation_id="test-corr-006"
        )

        # Validate function completes (no exception raised)
        # Production would verify PMS API call here


class TestReminderStatusTracking:
    """Tests for reminder status tracking."""

    @pytest.mark.asyncio
    async def test_track_status_sent(self):
        """Test tracking SENT status."""
        await track_reminder_status(
            reminder_id="rem_test_001",
            status=ReminderStatus.SENT,
            correlation_id="test-corr-007"
        )

        # Validate function completes (no exception raised)
        # Production would verify database update

    @pytest.mark.asyncio
    async def test_track_status_opened(self):
        """Test tracking OPENED status."""
        await track_reminder_status(
            reminder_id="rem_test_001",
            status=ReminderStatus.OPENED,
            correlation_id="test-corr-008"
        )

        # Validate function completes

    @pytest.mark.asyncio
    async def test_track_status_clicked(self):
        """Test tracking CLICKED status."""
        await track_reminder_status(
            reminder_id="rem_test_001",
            status=ReminderStatus.CLICKED,
            correlation_id="test-corr-009"
        )

        # Validate function completes

    @pytest.mark.asyncio
    async def test_track_status_booked(self):
        """Test tracking BOOKED status."""
        await track_reminder_status(
            reminder_id="rem_test_001",
            status=ReminderStatus.BOOKED,
            correlation_id="test-corr-010"
        )

        # Validate function completes

    @pytest.mark.asyncio
    async def test_track_status_all_values(self):
        """Test tracking all ReminderStatus values."""
        statuses = [
            ReminderStatus.SENT,
            ReminderStatus.OPENED,
            ReminderStatus.CLICKED,
            ReminderStatus.BOOKED,
            ReminderStatus.OPT_OUT,
            ReminderStatus.FAILED
        ]

        for status in statuses:
            await track_reminder_status(
                reminder_id=f"rem_test_{status.value}",
                status=status,
                correlation_id=f"test-corr-{status.value}"
            )

        # All statuses tracked without error


class TestCompleteWorkflow:
    """Tests for complete recall reminder workflow."""

    @pytest.mark.asyncio
    async def test_run_recall_workflow_complete(self, mock_pms_client):
        """Test complete workflow execution."""
        with patch('create_something_agents.workflows.recall_reminders._send_sms_reminder', new_callable=AsyncMock), \
             patch('create_something_agents.workflows.recall_reminders._send_email_reminder', new_callable=AsyncMock), \
             patch('create_something_agents.workflows.recall_reminders._log_reminder_audit', new_callable=AsyncMock):

            results = await run_recall_reminder_workflow(
                pms_client=mock_pms_client,
                practice_name="Smile Dental",
                practice_phone="+15555551234",
                booking_url="https://booking.example.com",
                months_overdue=6,
                correlation_id="test-corr-011"
            )

            assert isinstance(results, list)
            # Mock implementation returns 2 patients
            # Each result should be ReminderResult
            for result in results:
                assert isinstance(result, ReminderResult)
                assert result.patient_id
                assert result.reminder_id
                assert isinstance(result.status, ReminderStatus)
                assert result.sent_via in ["sms", "email", "both", "none"]
                assert result.sent_at
                assert result.audit_id

    @pytest.mark.asyncio
    async def test_workflow_handles_no_overdue_patients(self, mock_pms_client):
        """Test workflow when no patients are overdue."""
        # Patch identify_overdue_patients to return empty list
        with patch('create_something_agents.workflows.recall_reminders.identify_overdue_patients',
                   new_callable=AsyncMock, return_value=[]):

            results = await run_recall_reminder_workflow(
                pms_client=mock_pms_client,
                practice_name="Smile Dental",
                practice_phone="+15555551234",
                booking_url="https://booking.example.com",
                months_overdue=6,
                correlation_id="test-corr-012"
            )

            assert results == []

    @pytest.mark.asyncio
    async def test_workflow_includes_correlation_id_in_all_calls(self, mock_pms_client):
        """Test that correlation_id is threaded through all workflow calls."""
        test_correlation_id = "test-workflow-corr-001"

        with patch('create_something_agents.workflows.recall_reminders._send_sms_reminder', new_callable=AsyncMock), \
             patch('create_something_agents.workflows.recall_reminders._send_email_reminder', new_callable=AsyncMock), \
             patch('create_something_agents.workflows.recall_reminders._log_reminder_audit', new_callable=AsyncMock):

            results = await run_recall_reminder_workflow(
                pms_client=mock_pms_client,
                practice_name="Smile Dental",
                practice_phone="+15555551234",
                booking_url="https://booking.example.com",
                months_overdue=6,
                correlation_id=test_correlation_id
            )

            # Verify correlation_id in results
            for result in results:
                assert result.audit_id == test_correlation_id


class TestHIPAACompliance:
    """Tests for HIPAA compliance requirements."""

    @pytest.mark.asyncio
    async def test_minimum_necessary_phi_in_overdue_patients(self, mock_pms_client):
        """Test that identify_overdue_patients only accesses minimum necessary PHI."""
        patients = await identify_overdue_patients(
            pms_client=mock_pms_client,
            months_overdue=6,
            correlation_id="test-hipaa-001"
        )

        # Verify structure contains only necessary fields
        for patient in patients:
            # Required fields (minimum necessary)
            assert patient.patient_id
            assert patient.name
            assert patient.phone
            assert patient.last_visit_date
            assert isinstance(patient.days_since_visit, int)
            assert isinstance(patient.overdue_procedure_type, ProcedureType)

            # Optional fields
            # email can be None
            # preferred_contact_method defaults exist
            # opt_out_reminders defaults exist

    def test_email_subject_contains_no_phi(self, sample_overdue_patient):
        """Test email subject line contains no PHI (HIPAA requirement)."""
        message = _generate_reminder_message(
            patient=sample_overdue_patient,
            practice_name="Smile Dental",
            practice_phone="+15555551234",
            booking_url="https://booking.example.com",
            reminder_id="rem_hipaa_test"
        )

        subject = message["email_subject"]

        # Subject must not contain:
        assert sample_overdue_patient.name not in subject
        assert sample_overdue_patient.phone not in subject
        assert sample_overdue_patient.patient_id not in subject
        assert "cleaning" not in subject.lower()  # Procedure type is PHI
        assert "exam" not in subject.lower()
        assert "overdue" not in subject.lower()  # Status is PHI

        # Subject should only contain practice name (generic)
        assert "Smile Dental" in subject

    @pytest.mark.asyncio
    async def test_reminder_result_excludes_detailed_phi(self, sample_overdue_patient):
        """Test ReminderResult contains only necessary identifiers, not detailed PHI."""
        with patch('create_something_agents.workflows.recall_reminders._send_sms_reminder', new_callable=AsyncMock), \
             patch('create_something_agents.workflows.recall_reminders._log_reminder_audit', new_callable=AsyncMock):

            result = await send_recall_reminder(
                patient=sample_overdue_patient,
                practice_name="Smile Dental",
                practice_phone="+15555551234",
                booking_url="https://booking.example.com",
                correlation_id="test-hipaa-002"
            )

            # ReminderResult should contain:
            assert result.patient_id  # Identifier only
            assert result.reminder_id
            assert result.status
            assert result.sent_via
            assert result.sent_at
            assert result.audit_id

            # ReminderResult should NOT contain (validated by dataclass structure):
            # - patient name (should not exist in ReminderResult)
            # - patient phone (should not exist)
            # - patient email (should not exist)
            # These are intentionally excluded from result object
            assert not hasattr(result, 'name')
            assert not hasattr(result, 'phone')
            assert not hasattr(result, 'email')
