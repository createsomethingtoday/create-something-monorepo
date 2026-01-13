"""
Mock Practice Management System (PMS) Server for Integration Testing.

Simulates Dentrix API endpoints for no-show recovery, insurance verification,
and recall reminder workflows. Provides realistic test data without requiring
actual PMS system access.

Usage:
    # In integration tests
    async with mock_pms_server() as server:
        pms_client = MockPMSClient(server.base_url)
        # Run workflows...
"""

from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import uuid


class MockPMSDatabase:
    """In-memory database simulating PMS data store."""

    def __init__(self):
        """Initialize mock database with test data."""
        self.appointments: List[Dict[str, Any]] = []
        self.patients: List[Dict[str, Any]] = []
        self.waitlist: List[Dict[str, Any]] = []
        self.preferences: Dict[str, Dict[str, Any]] = {}
        self._initialize_test_data()

    def _initialize_test_data(self):
        """Populate database with realistic test data."""
        # Create 3 patients
        self.patients = [
            {
                "patient_id": "patient_001",
                "name": "John Doe",
                "phone": "+15551234567",
                "email": "john.doe@example.com",
                "dob": "1985-03-15",
                "insurer_id": "insurance_001",
                "last_visit_date": (datetime.now() - timedelta(days=200)).isoformat(),
                "opt_out": False,
            },
            {
                "patient_id": "patient_002",
                "name": "Jane Smith",
                "phone": "+15559876543",
                "email": "jane.smith@example.com",
                "dob": "1990-07-22",
                "insurer_id": "insurance_002",
                "last_visit_date": (datetime.now() - timedelta(days=210)).isoformat(),
                "opt_out": False,
            },
            {
                "patient_id": "patient_003",
                "name": "Bob Johnson",
                "phone": "+15555551234",
                "email": "bob.johnson@example.com",
                "dob": "1978-12-05",
                "insurer_id": "insurance_001",
                "last_visit_date": (datetime.now() - timedelta(days=50)).isoformat(),
                "opt_out": False,
            },
        ]

        # Create appointments (2 no-shows, 2 scheduled, 1 completed)
        base_date = datetime.now()
        self.appointments = [
            {
                "appointment_id": "appt_001",
                "patient_id": "patient_001",
                "appointment_date": (base_date - timedelta(days=3)).isoformat(),
                "appointment_type": "cleaning",
                "status": "no_show",
                "duration_minutes": 45,
                "provider_id": "provider_001",
                "procedure_codes": ["D1110"],
            },
            {
                "appointment_id": "appt_002",
                "patient_id": "patient_002",
                "appointment_date": (base_date - timedelta(days=5)).isoformat(),
                "appointment_type": "exam",
                "status": "no_show",
                "duration_minutes": 30,
                "provider_id": "provider_002",
                "procedure_codes": ["D0120"],
            },
            {
                "appointment_id": "appt_003",
                "patient_id": "patient_003",
                "appointment_date": (base_date + timedelta(days=3)).isoformat(),
                "appointment_type": "cleaning",
                "status": "scheduled",
                "duration_minutes": 45,
                "provider_id": "provider_001",
                "procedure_codes": ["D1110"],
            },
            {
                "appointment_id": "appt_004",
                "patient_id": "patient_001",
                "appointment_date": (base_date + timedelta(days=5)).isoformat(),
                "appointment_type": "xray",
                "status": "scheduled",
                "duration_minutes": 15,
                "provider_id": "provider_002",
                "procedure_codes": ["D0210"],
            },
            {
                "appointment_id": "appt_005",
                "patient_id": "patient_002",
                "appointment_date": (base_date - timedelta(days=30)).isoformat(),
                "appointment_type": "cleaning",
                "status": "completed",
                "duration_minutes": 45,
                "provider_id": "provider_001",
                "procedure_codes": ["D1110"],
            },
        ]

        # Create waitlist entries (2 patients waiting for appointments)
        self.waitlist = [
            {
                "patient_id": "patient_004",
                "phone": "+15551111111",
                "email": "waitlist1@example.com",
                "appointment_type": "cleaning",
                "preferred_time_of_day": "morning",
                "preferred_day_of_week": ["monday", "wednesday"],
                "preferred_provider_id": "provider_001",
                "urgency": 3,
                "wait_since": (datetime.now() - timedelta(days=14)).isoformat(),
            },
            {
                "patient_id": "patient_005",
                "phone": "+15552222222",
                "email": "waitlist2@example.com",
                "appointment_type": "exam",
                "preferred_time_of_day": "afternoon",
                "preferred_day_of_week": ["tuesday", "thursday"],
                "preferred_provider_id": "provider_002",
                "urgency": 4,
                "wait_since": (datetime.now() - timedelta(days=21)).isoformat(),
            },
        ]

        # Create patient preferences
        self.preferences = {
            "patient_004": {
                "preferred_contact": "sms",
                "preferred_time_of_day": "morning",
                "preferred_provider_id": "provider_001",
            },
            "patient_005": {
                "preferred_contact": "email",
                "preferred_time_of_day": "afternoon",
                "preferred_provider_id": "provider_002",
            },
        }

    def get_appointments(
        self,
        status: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Query appointments with filters."""
        results = self.appointments

        if status:
            results = [a for a in results if a["status"] == status]

        if date_from:
            date_from_dt = datetime.fromisoformat(date_from)
            results = [
                a
                for a in results
                if datetime.fromisoformat(a["appointment_date"]) >= date_from_dt
            ]

        if date_to:
            date_to_dt = datetime.fromisoformat(date_to)
            results = [
                a
                for a in results
                if datetime.fromisoformat(a["appointment_date"]) <= date_to_dt
            ]

        return results

    def get_patient(self, patient_id: str) -> Optional[Dict[str, Any]]:
        """Get patient by ID."""
        for patient in self.patients:
            if patient["patient_id"] == patient_id:
                return patient
        return None

    def get_waitlist(self, appointment_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Query waitlist with optional appointment type filter."""
        if appointment_type:
            return [w for w in self.waitlist if w["appointment_type"] == appointment_type]
        return self.waitlist

    def get_preferences(self, patient_id: str) -> Dict[str, Any]:
        """Get patient preferences."""
        return self.preferences.get(patient_id, {})

    def update_appointment(self, appointment_id: str, updates: Dict[str, Any]) -> bool:
        """Update appointment fields."""
        for appt in self.appointments:
            if appt["appointment_id"] == appointment_id:
                appt.update(updates)
                return True
        return False

    def remove_from_waitlist(self, patient_id: str) -> bool:
        """Remove patient from waitlist."""
        original_len = len(self.waitlist)
        self.waitlist = [w for w in self.waitlist if w["patient_id"] != patient_id]
        return len(self.waitlist) < original_len


class MockPMSClient:
    """Mock PMS client simulating Dentrix API."""

    def __init__(self, db: Optional[MockPMSDatabase] = None):
        """Initialize mock client with database."""
        self.db = db or MockPMSDatabase()
        self.audit_log: List[Dict[str, Any]] = []

    async def get_appointments(
        self,
        status: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        fields: Optional[str] = None,
        correlation_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Mock GET /patients/{id}/appointments endpoint.

        HIPAA Compliance: Only returns requested fields.
        """
        self._log_audit(
            action="appointment_query",
            correlation_id=correlation_id or self._generate_correlation_id(),
            resource_type="appointment",
            outcome="success",
        )

        results = self.db.get_appointments(status, date_from, date_to)

        # Filter fields if specified (HIPAA minimum necessary)
        if fields:
            requested_fields = [f.strip() for f in fields.split(",")]
            results = [
                {k: v for k, v in appt.items() if k in requested_fields} for appt in results
            ]

        return {"results": results, "count": len(results)}

    def get_patient(
        self, patient_id: str, correlation_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Mock GET /patients/{id} endpoint."""
        self._log_audit(
            action="patient_query",
            correlation_id=correlation_id or self._generate_correlation_id(),
            resource_type="patient",
            patient_id=patient_id,
            outcome="success",
        )

        return self.db.get_patient(patient_id)

    async def query_waitlist(
        self, appointment_type: Optional[str] = None, correlation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Mock GET /waitlist endpoint."""
        self._log_audit(
            action="waitlist_query",
            correlation_id=correlation_id or self._generate_correlation_id(),
            resource_type="waitlist",
            outcome="success",
        )

        results = self.db.get_waitlist(appointment_type)
        return {"results": results, "count": len(results)}

    async def get_patient_preferences(
        self, patient_id: str, correlation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Mock GET /patients/{id}/preferences endpoint."""
        self._log_audit(
            action="preferences_query",
            correlation_id=correlation_id or self._generate_correlation_id(),
            resource_type="preferences",
            patient_id=patient_id,
            outcome="success",
        )

        return self.db.get_preferences(patient_id)

    async def update_appointment(
        self,
        appointment_id: str,
        updates: Dict[str, Any],
        correlation_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Mock PUT /appointments/{id} endpoint."""
        corr_id = correlation_id or self._generate_correlation_id()

        success = self.db.update_appointment(appointment_id, updates)

        self._log_audit(
            action="appointment_update",
            correlation_id=corr_id,
            resource_type="appointment",
            resource_id=appointment_id,
            outcome="success" if success else "failure",
        )

        return {"success": success, "appointment_id": appointment_id}

    async def remove_from_waitlist(
        self, patient_id: str, correlation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Mock DELETE /waitlist/{patient_id} endpoint."""
        corr_id = correlation_id or self._generate_correlation_id()

        success = self.db.remove_from_waitlist(patient_id)

        self._log_audit(
            action="waitlist_remove",
            correlation_id=corr_id,
            resource_type="waitlist",
            patient_id=patient_id,
            outcome="success" if success else "failure",
        )

        return {"success": success, "patient_id": patient_id}

    def _log_audit(
        self,
        action: str,
        correlation_id: str,
        resource_type: str,
        patient_id: Optional[str] = None,
        resource_id: Optional[str] = None,
        outcome: str = "success",
    ):
        """Log PMS API access for audit trail verification."""
        self.audit_log.append(
            {
                "timestamp": datetime.now().isoformat(),
                "action": action,
                "correlation_id": correlation_id,
                "resource_type": resource_type,
                "patient_id": patient_id,
                "resource_id": resource_id,
                "outcome": outcome,
            }
        )

    def _generate_correlation_id(self) -> str:
        """Generate correlation ID for audit logging."""
        return f"dental-{uuid.uuid4()}"

    def get_audit_trail(self) -> List[Dict[str, Any]]:
        """Retrieve audit log for verification in tests."""
        return self.audit_log
