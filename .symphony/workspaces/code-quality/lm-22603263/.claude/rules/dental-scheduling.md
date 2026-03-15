# Dental Appointment Scheduling Patterns

Intelligent scheduling workflows for dental practices. Built for AI-native agents with HIPAA compliance by default.

## Core Workflows

### No-Show Rescheduling

Automatically identify and reschedule missed appointments.

**7-Step Workflow:**

1. **Query**: Retrieve no-show appointments from last 7 days
   - Fields: `patient_id`, `phone`, `email`, `appointment_date`, `appointment_type`, `status`
   - Filter: `status=no_show AND date >= today-7days`

2. **Validate**: Check patient contact preferences
   - Preferred contact method (phone, email, SMS)
   - Best time to contact
   - Do not contact flags

3. **Search Availability**: Find open slots matching original appointment type
   - Same provider preference
   - Same time of day preference
   - Same day of week preference (if possible)

4. **Apply Constraints**: Filter by provider and equipment availability
   - Provider schedule, skills, fatigue limits
   - Equipment: chair, X-ray, sterilization

5. **Rank Options**: Sort by patient preferences
   - Time of day match
   - Day of week match
   - Provider continuity

6. **Contact Patient**: Send reschedule offer via preferred channel
   - Include 3 time slot options
   - Include one-click booking link
   - Log contact attempt

7. **Log Outcome**: Record result with correlation ID
   - Patient response: accepted, declined, no response
   - Rescheduled appointment ID (if accepted)
   - No PHI in logs (only IDs and timestamps)

**Example:**
```python
# Query no-shows with minimal PHI
no_shows = dental_api.get_appointments(
    status="no_show",
    date_from=today - timedelta(days=7),
    fields="patient_id,phone,email,appointment_date,appointment_type,status"
)

# Find availability
slots = dental_api.check_availability(
    appointment_type=no_show.appointment_type,
    provider_id=no_show.provider_id,
    date_from=today,
    duration=no_show.duration
)

# Send reschedule offer
offer = send_reschedule_offer(
    patient_id=no_show.patient_id,
    contact_method=patient.preferred_contact,
    slots=ranked_slots[:3]
)
```

---

### Appointment Conflict Resolution

Handle scheduling conflicts when double-bookings or equipment shortages occur.

**Conflict Resolution Pattern:**

```
Detect Conflict
    ↓
Assess Priority (urgent vs routine)
    ↓
Check Alternative Resources
    ↓
Propose Solution
    ↓
Execute or Escalate
```

**Priority Matrix:**

| Conflict Type | Resolution Strategy |
|---------------|---------------------|
| Double-booked provider | Move lower-priority appointment to available provider |
| Equipment unavailable | Delay appointment or use backup equipment |
| Emergency vs routine | Reschedule routine, accommodate emergency |
| Provider sick/absent | Reassign to provider with same expertise |

**Implementation:**
```python
def resolve_conflict(appointment_id: str, conflict_type: str):
    """
    Resolve scheduling conflict.

    HIPAA: Uses patient_id only, no clinical details logged.
    """
    conflict = dental_api.get_appointment(appointment_id)

    if conflict_type == "double_booked":
        # Find alternative provider or time
        alternatives = dental_api.check_availability(
            appointment_type=conflict.appointment_type,
            exclude_provider=conflict.provider_id,
            date=conflict.date
        )

        if alternatives:
            # Propose reschedule to patient
            proposal = create_reschedule_proposal(
                patient_id=conflict.patient_id,
                alternatives=alternatives[:3]
            )
        else:
            # Escalate to human scheduler
            escalate_to_staff(conflict_id=appointment_id)
```

---

### Waitlist Management

Automatically fill cancellations from waitlist.

**Waitlist Workflow:**

1. **Cancellation Detected**: Appointment cancelled or rescheduled
2. **Query Waitlist**: Retrieve patients waiting for similar appointment type
3. **Filter by Constraints**: Match provider expertise, equipment needs
4. **Rank by Wait Time**: Longest wait gets priority
5. **Send Offer**: Contact top 3 candidates simultaneously
6. **First Acceptance Wins**: Book first responder, notify others
7. **Update Waitlist**: Remove booked patient, keep others active

**Example:**
```python
def fill_from_waitlist(cancelled_appointment_id: str):
    """
    Fill cancelled slot from waitlist.

    HIPAA: Minimal PHI access (patient_id, preferred_times only).
    """
    slot = dental_api.get_appointment(cancelled_appointment_id)

    # Query waitlist
    candidates = dental_api.query_waitlist(
        appointment_type=slot.appointment_type,
        provider_id=slot.provider_id,
        fields="patient_id,preferred_times,procedure_type,wait_since"
    )

    # Rank by wait time
    ranked = sorted(candidates, key=lambda c: c.wait_since)

    # Send simultaneous offers (race to accept)
    for candidate in ranked[:3]:
        send_slot_offer(
            patient_id=candidate.patient_id,
            slot=slot,
            expires_in_minutes=15  # First to accept wins
        )
```

---

## Provider Constraints

### Time Constraints

| Constraint | Implementation |
|------------|----------------|
| **Working hours** | 8am-5pm default, configurable per provider |
| **Lunch breaks** | 12pm-1pm blocked by default |
| **Appointment duration** | Varies by procedure: cleaning (30-45min), crown (60-90min), extraction (45-60min) |
| **Buffer time** | 10-15min between appointments for notes, sterilization |
| **Maximum daily patients** | 12-16 depending on procedure mix |

### Expertise Constraints

| Procedure Type | Required Expertise | Fallback |
|----------------|-------------------|----------|
| Routine cleaning | Hygienist | Any hygienist |
| Cavity filling | General dentist | Any general dentist |
| Root canal | Endodontist | General dentist (if certified) |
| Orthodontics | Orthodontist | No fallback |
| Oral surgery | Oral surgeon | No fallback |
| Pediatric | Pediatric dentist | General dentist (with pediatric training) |

### Fatigue Management

**Principle**: Prevent provider burnout by tracking procedure complexity.

```python
# Complexity scoring
COMPLEXITY_SCORES = {
    "cleaning": 1,
    "filling": 2,
    "crown_prep": 3,
    "root_canal": 4,
    "extraction": 3,
    "implant": 5
}

# Maximum daily complexity: 24 points (equivalent to 6 root canals or 24 cleanings)
MAX_DAILY_COMPLEXITY = 24

def check_provider_fatigue(provider_id: str, new_procedure: str):
    """Check if provider has capacity for additional procedure."""
    todays_appointments = dental_api.get_provider_schedule(
        provider_id=provider_id,
        date=today
    )

    current_complexity = sum(
        COMPLEXITY_SCORES.get(apt.procedure_type, 2)
        for apt in todays_appointments
    )

    new_complexity = COMPLEXITY_SCORES.get(new_procedure, 2)

    return (current_complexity + new_complexity) <= MAX_DAILY_COMPLEXITY
```

---

## Equipment Constraints

### Chair Availability

**Pattern**: Track chair occupancy including buffer time.

| Chair Type | Typical Equipment | Use Cases |
|------------|-------------------|-----------|
| Standard chair | Basic tools, suction | Cleanings, exams, simple fillings |
| X-ray equipped | Standard + X-ray arm | Diagnostics, root canals, crowns |
| Surgical suite | Standard + surgical lights, anesthesia | Extractions, implants, oral surgery |

**Implementation:**
```python
def find_available_chair(appointment_type: str, start_time: datetime, duration: int):
    """
    Find available chair for procedure.

    Accounts for:
    - Procedure-specific equipment needs
    - Buffer time for sterilization (15 min)
    - Overlapping appointments
    """
    required_equipment = EQUIPMENT_REQUIREMENTS[appointment_type]

    chairs = dental_api.get_chairs(equipment=required_equipment)

    for chair in chairs:
        # Check if chair is free (including buffer)
        is_available = dental_api.check_chair_availability(
            chair_id=chair.id,
            start_time=start_time - timedelta(minutes=15),  # sterilization buffer
            end_time=start_time + timedelta(minutes=duration + 15)
        )

        if is_available:
            return chair

    return None
```

### X-Ray Machine Constraints

**Principle**: X-ray machines can serve multiple chairs but have wait time.

```python
XRAY_SETUP_TIME = 5  # minutes
XRAY_EXPOSURE_TIME = 2  # minutes per image
XRAY_PROCESSING_TIME = 3  # minutes

def schedule_xray(appointment_id: str, num_images: int):
    """
    Schedule X-ray within appointment window.

    Returns: optimal time slot within appointment.
    """
    total_xray_time = (
        XRAY_SETUP_TIME +
        (XRAY_EXPOSURE_TIME * num_images) +
        XRAY_PROCESSING_TIME
    )

    # Find gap in X-ray machine schedule
    xray_slot = dental_api.find_equipment_slot(
        equipment_type="xray",
        duration=total_xray_time,
        within_appointment=appointment_id
    )

    return xray_slot
```

---

## Patient Preferences

### Preference Patterns

| Preference Type | Implementation | Priority |
|-----------------|----------------|----------|
| **Time of day** | Morning (8-11am), afternoon (1-3pm), evening (4-6pm) | High |
| **Day of week** | Avoid Mondays/Fridays if possible | Medium |
| **Provider continuity** | Same provider as last visit | High |
| **Appointment clustering** | Group family appointments together | Medium |
| **Reminder preferences** | Email, SMS, phone call, or none | High |

**Preference Matching Algorithm:**
```python
def rank_slots_by_preferences(patient_id: str, available_slots: list):
    """
    Rank available time slots by patient preferences.

    Scoring:
    - Time of day match: 10 points
    - Provider continuity: 8 points
    - Day of week match: 5 points
    - Family clustering: 3 points
    """
    preferences = dental_api.get_patient_preferences(patient_id)

    scored_slots = []
    for slot in available_slots:
        score = 0

        # Time of day match
        if preferences.preferred_time == get_time_of_day(slot.start_time):
            score += 10

        # Provider continuity
        last_provider = dental_api.get_last_provider(patient_id)
        if slot.provider_id == last_provider:
            score += 8

        # Day of week
        if slot.day_of_week in preferences.preferred_days:
            score += 5

        # Family clustering
        family_appointments = dental_api.get_family_appointments_on_day(
            patient_id=patient_id,
            date=slot.date
        )
        if family_appointments:
            score += 3

        scored_slots.append((slot, score))

    # Return sorted by score (highest first)
    return sorted(scored_slots, key=lambda x: x[1], reverse=True)
```

---

## PMS Integration Points

### API Endpoints Required

Each PMS system (Dentrix, Open Dental, Eaglesoft) must support:

| Operation | Dentrix | Open Dental | Eaglesoft |
|-----------|---------|-------------|-----------|
| **Get appointments** | `GET /patients/{id}/appointments` | `GET /api/v1/appointments` | `ListAppointments` |
| **Check availability** | `GET /appointments/availability` | `GET /api/v1/schedule/availability` | `GetAvailableSlots` |
| **Create appointment** | `POST /appointments` | `POST /api/v1/appointments` | `CreateAppointment` |
| **Update appointment** | `PUT /appointments/{id}` | `PUT /api/v1/appointments/{id}` | `UpdateAppointment` |
| **Cancel appointment** | `DELETE /appointments/{id}` | `DELETE /api/v1/appointments/{id}` | `CancelAppointment` |
| **Get patient preferences** | `GET /patients/{id}/preferences` | `GET /api/v1/patients/{id}/preferences` | `GetPatientPreferences` |
| **Query waitlist** | `GET /waitlist` | `GET /api/v1/waitlist` | `GetWaitlist` |

### Authentication Patterns

**Dentrix:**
```python
headers = {
    "Authorization": f"Bearer {oauth_token}",
    "X-API-Key": api_key
}
```

**Open Dental:**
```python
headers = {
    "Authorization": f"Bearer {bearer_token}"
}
```

**Eaglesoft (SOAP):**
```python
headers = {
    "SOAPAction": "http://eaglesoft.com/ListAppointments",
    "Content-Type": "text/xml; charset=utf-8"
}
body = """
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header>
    <AuthHeader>
      <Username>{username}</Username>
      <Password>{password}</Password>
    </AuthHeader>
  </soap:Header>
  <soap:Body>...</soap:Body>
</soap:Envelope>
"""
```

### Rate Limiting Strategy

**Per PMS System:**

| PMS | Limit | Strategy |
|-----|-------|----------|
| Dentrix | 100 req/min | Exponential backoff, queue batches |
| Open Dental | 200 req/min | More aggressive batching |
| Eaglesoft | 60 req/min | Conservative batching, longer delays |

**Implementation:**
```python
from tenacity import retry, wait_exponential, stop_after_attempt

@retry(
    wait=wait_exponential(multiplier=1, min=4, max=60),
    stop=stop_after_attempt(3)
)
async def call_pms_api(pms_type: str, endpoint: str, **kwargs):
    """
    Call PMS API with automatic retry on rate limit.

    Implements exponential backoff:
    - Attempt 1: immediate
    - Attempt 2: wait 4s
    - Attempt 3: wait 16s
    - Attempt 4: wait 60s
    """
    async with httpx.AsyncClient() as client:
        response = await client.request(**kwargs)

        if response.status_code == 429:  # Rate limited
            # Extract retry-after header if available
            retry_after = int(response.headers.get("Retry-After", 60))
            raise RateLimitError(retry_after=retry_after)

        return response
```

---

## HIPAA Compliance Integration

All scheduling workflows MUST follow HIPAA guidelines from [hipaa-compliance.md](./hipaa-compliance.md):

### Required Practices

- [ ] **Minimum necessary PHI**: Only access fields required for scheduling (patient_id, contact info, appointment details)
- [ ] **Audit logging**: Every API call logged with correlation ID, no PHI details
- [ ] **Encryption**: All PMS credentials encrypted at rest (AES-256), TLS 1.3 in transit
- [ ] **Access controls**: API keys rotated quarterly, session timeouts (15 min)
- [ ] **No PHI in logs**: Log only de-identified references (patient_id, appointment_id)

### Example Compliant Call

```python
# ✅ CORRECT - minimal PHI, audit logged
async def get_no_shows_for_rescheduling(pms_client, correlation_id: str):
    """
    Query no-show appointments for rescheduling.

    HIPAA Compliance:
    - Minimal PHI fields (no clinical notes)
    - Audit logged with correlation ID
    - Results filtered by date (7 days max)
    """
    # Log API call (no PHI)
    await log_audit_trail(
        action="appointment_query",
        correlation_id=correlation_id,
        resource_type="appointment",
        filters={"status": "no_show", "days": 7}
    )

    # Query with minimal fields
    response = await pms_client.get_appointments(
        status="no_show",
        date_from=today - timedelta(days=7),
        fields="patient_id,phone,email,appointment_date,appointment_type,status"
    )

    return response
```

---

## Related Documentation

- [HIPAA Compliance](./hipaa-compliance.md) - PHI handling requirements
- [Dental API Integration](./dental-api-integration.md) - PMS system specifics
- [Error Handling Patterns](./error-handling-patterns.md) - Graceful failure patterns
