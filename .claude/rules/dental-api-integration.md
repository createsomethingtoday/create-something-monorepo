# Dental API Integration Patterns

## Supported Practice Management Systems

### Dentrix API
- Base URL: varies per practice (cloud or on-premise)
- Authentication: API key + OAuth 2.0
- Rate Limits: 100 requests/minute
- Key Endpoints:
  - GET /patients/{id}/appointments - Retrieve appointment history
  - POST /appointments - Create new appointment
  - PUT /appointments/{id} - Reschedule/cancel
  - GET /appointments/availability - Check open slots
  - GET /patients/{id}/insurance - Get coverage info

### Open Dental API
- Base URL: https://api.opendental.com
- Authentication: Bearer token
- Rate Limits: 200 requests/minute
- Key Endpoints:
  - GET /api/v1/appointments - List appointments
  - POST /api/v1/appointments - Book appointment
  - GET /api/v1/patients/{id} - Patient details
  - GET /api/v1/insurance/verify - Check eligibility

### Eaglesoft API
- Base URL: SOAP over HTTPS
- Authentication: API credentials in header
- Key Endpoints:
  - GetPatient
  - ListAppointments
  - UpdateBalance
  - VerifyInsurance

## Data Access Patterns

### Minimum Necessary PHI (Per Workflow)

**No-Show Rescheduling**:
- Required: patient_id, phone, email, appointment_date, appointment_type, status
- Excluded: clinical_notes, imaging, full_history, treatment_plans

**Insurance Verification**:
- Required: patient_dob, insurer_id, procedure_codes
- Excluded: balances, prior_claims, diagnoses

**Recall Reminders**:
- Required: name, phone, last_visit_date, overdue_procedure_type
- Excluded: detailed_chart, payment_status

## Error Handling

All API calls must:
1. Use exponential backoff for rate limits
2. Log errors without PHI details
3. Fail gracefully with user notification
4. Never cache PHI longer than task duration
