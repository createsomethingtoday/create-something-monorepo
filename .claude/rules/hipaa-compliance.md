# HIPAA Compliance for Dental Practice Management

Absolute rules for handling Protected Health Information (PHI) in AI-native dental practice management systems.

## Absolute Rules

These rules MUST be followed without exception:

### 1. Never Log PHI
- ❌ **NEVER** log patient names, DOB, SSN, addresses, phone numbers, emails, diagnosis codes, treatment details, or clinical notes
- ✅ **ALWAYS** log only de-identified references: `patient_id`, `appointment_id`, `user_id`
- ✅ **ALWAYS** log actions performed, timestamps, and outcomes (without PHI details)

**Example violation:**
```python
# ❌ WRONG - logs PHI
logger.info(f"Scheduled appointment for {patient_name} on {date}")
```

**Correct approach:**
```python
# ✅ CORRECT - logs action without PHI
logger.info(f"Scheduled appointment", extra={
    "patient_id": patient_id,
    "action": "appointment_scheduled",
    "timestamp": datetime.utcnow().isoformat()
})
```

### 2. Encryption Requirements
- ✅ **Data at Rest**: AES-256 encryption for all PHI in databases, object storage, and backups
- ✅ **Data in Transit**: TLS 1.3 for all API communications
- ✅ **Key Management**: Use dedicated KMS (AWS KMS, Cloudflare Workers KV encryption, etc.)
- ❌ **NEVER** store PHI in plaintext logs, cache, or temporary files

**Cloudflare Workers Pattern:**
```typescript
// Encrypt PMS credentials before storing in D1
const encrypted = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv: new Uint8Array(12) },
  key,
  encoder.encode(credentials)
);

// Store encrypted value
await env.DB.prepare('INSERT INTO pms_configs (practice_id, encrypted_credentials) VALUES (?, ?)')
  .bind(practiceId, btoa(String.fromCharCode(...new Uint8Array(encrypted))))
  .run();
```

### 3. Access Controls
- ✅ **Role-Based Access**: Implement least-privilege access for all users and systems
- ✅ **Authentication**: Multi-factor authentication for human users
- ✅ **API Keys**: Rotate credentials quarterly minimum
- ✅ **Session Management**: 15-minute timeout for inactive sessions with PHI access

### 4. Minimum Necessary Standard
Only access PHI required for the specific task. See [Minimum Necessary Determinations](#minimum-necessary-determinations) below.

---

## Audit Logging Requirements

All PHI access MUST be logged with the following structure:

```json
{
  "timestamp": "2026-01-12T22:00:00.000Z",
  "action": "appointment_query",
  "actor_id": "user_abc123",
  "actor_type": "agent",
  "practice_id": "practice_xyz789",
  "patient_id": "patient_456",
  "resource_type": "appointment",
  "resource_id": "appt_789",
  "outcome": "success",
  "ip_address": "192.0.2.1",
  "user_agent": "dental-agent-router/1.0",
  "correlation_id": "req_abc123"
}
```

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `timestamp` | ISO 8601 | UTC timestamp of action | `2026-01-12T22:00:00.000Z` |
| `action` | string | Action performed | `appointment_query`, `patient_update`, `insurance_verify` |
| `actor_id` | string | Who performed action | `user_abc123`, `agent_scheduler_001` |
| `actor_type` | enum | Type of actor | `human`, `agent`, `system` |
| `practice_id` | string | Practice context | `practice_xyz789` |
| `patient_id` | string | De-identified patient reference | `patient_456` |
| `resource_type` | string | PHI resource accessed | `appointment`, `patient`, `insurance` |
| `resource_id` | string | Specific resource ID | `appt_789` |
| `outcome` | enum | Success or failure | `success`, `failure`, `partial` |
| `ip_address` | string | Source IP (if applicable) | `192.0.2.1` |
| `user_agent` | string | Client identifier | `dental-agent-router/1.0` |
| `correlation_id` | string | Request trace ID | `req_abc123` |

### Retention Requirements

- Audit logs MUST be retained for **6 years** (HIPAA requirement)
- Logs MUST be tamper-proof (write-once, append-only)
- Logs MUST be backed up with same encryption as PHI

**Cloudflare KV Implementation:**
```typescript
// Store audit log with 6-year TTL
const sixYearsTTL = 6 * 365 * 24 * 60 * 60; // 189,216,000 seconds
await env.AUDIT_LOG.put(
  `audit:${correlation_id}`,
  JSON.stringify(auditEntry),
  { expirationTtl: sixYearsTTL }
);
```

---

## Data Minimization Guidelines

Apply the **Minimum Necessary** standard to every PHI access:

### Per Workflow Matrix

| Workflow | PHI Required | PHI Excluded |
|----------|--------------|--------------|
| **No-Show Rescheduling** | `patient_id`, `phone`, `email`, `appointment_date`, `appointment_type`, `status` | `clinical_notes`, `imaging`, `full_history`, `treatment_plans`, `diagnosis_codes` |
| **Insurance Verification** | `patient_dob`, `insurer_id`, `procedure_codes` | `balances`, `prior_claims`, `diagnoses`, `treatment_history` |
| **Recall Reminders** | `name`, `phone`, `last_visit_date`, `overdue_procedure_type` | `detailed_chart`, `payment_status`, `clinical_notes` |
| **Appointment Conflicts** | `appointment_date`, `provider_id`, `duration`, `appointment_type` | `patient_name`, `clinical_reason`, `diagnosis` |
| **Waitlist Management** | `patient_id`, `preferred_times`, `procedure_type` | `medical_history`, `insurance_details`, `payment_status` |

### Implementation Pattern

```python
def get_appointments_for_rescheduling(patient_id: str, pms_client):
    """
    Get minimum necessary PHI for no-show rescheduling.

    HIPAA: Only requests fields needed for rescheduling workflow.
    """
    # ✅ CORRECT - minimal field selection
    response = pms_client.get(
        f"/patients/{patient_id}/appointments",
        params={
            "fields": "patient_id,phone,email,appointment_date,appointment_type,status",
            "status": "no_show"
        }
    )

    # ❌ WRONG - retrieves entire patient record
    # response = pms_client.get(f"/patients/{patient_id}")

    return response.json()
```

---

## Business Associate Agreement (BAA) Requirements

Any third-party service that accesses PHI MUST have a signed BAA. This includes:

- Cloud hosting providers (Cloudflare, Modal, AWS, etc.)
- PMS vendors (Dentrix, Open Dental, Eaglesoft)
- Analytics services (if they receive PHI)
- Backup providers
- AI model providers (Anthropic Claude)

### BAA Template Clauses

**Must include:**

1. **Permitted Uses**: Define specific use cases for PHI access
2. **Safeguards**: Require encryption, access controls, audit logging
3. **Breach Notification**: 60-day notification requirement
4. **Subcontractors**: BAAs required for any downstream processors
5. **Data Destruction**: Secure deletion procedures
6. **Audit Rights**: Covered entity can audit BA compliance

**Example clause:**
> "Business Associate agrees to implement administrative, physical, and technical safeguards that reasonably and appropriately protect the confidentiality, integrity, and availability of the electronic Protected Health Information (ePHI) that it creates, receives, maintains, or transmits on behalf of Covered Entity."

---

## Minimum Necessary Determinations

Before accessing PHI, answer these questions:

| Question | If Yes | If No |
|----------|--------|-------|
| Can I complete this task with de-identified data only (`patient_id`, `appointment_id`)? | Use de-identified data | Proceed to next question |
| Is there a specific field set required for this workflow? | Use that exact field set | Proceed to next question |
| Can I query with filters instead of retrieving full records? | Use filtered queries | Proceed to next question |
| Must I retrieve full PHI records? | Document justification in audit log | Reconsider approach |

### Example Decision Tree

**Task**: Reschedule no-show appointments

```
1. Can I use patient_id only?
   → No, need phone/email for contact

2. Is there a defined field set?
   → Yes: patient_id, phone, email, appointment_date, appointment_type, status

3. Can I filter the query?
   → Yes: status=no_show, date>today-7days

✅ Access approved: Query filtered appointments with minimal fields
```

---

## Compliance Checklist

Before deploying any PHI-accessing system:

### Development Phase
- [ ] All PHI fields identified and documented
- [ ] Minimum necessary determination completed per workflow
- [ ] Encryption implemented (at rest and in transit)
- [ ] Audit logging implemented with 6-year retention
- [ ] No PHI in logs, cache, or error messages
- [ ] Access controls and authentication implemented

### Deployment Phase
- [ ] BAAs signed with all third-party services
- [ ] Security incident response plan documented
- [ ] Breach notification procedure defined
- [ ] Staff training completed (for human users)
- [ ] Penetration testing completed
- [ ] Vulnerability scanning configured

### Operational Phase
- [ ] Quarterly credential rotation scheduled
- [ ] Audit log review process established
- [ ] Backup and disaster recovery tested
- [ ] Access control review (quarterly minimum)
- [ ] Compliance monitoring dashboard active

---

## Common Violations to Avoid

| Violation | Example | Correct Approach |
|-----------|---------|------------------|
| **PHI in logs** | `logger.info(f"Patient {name} checked in")` | `logger.info("Patient checked in", extra={"patient_id": id})` |
| **Plaintext storage** | Storing PMS API keys in `.env` file | Encrypt credentials, use KMS |
| **Over-fetching** | `GET /patients/{id}` (full record) | `GET /patients/{id}?fields=phone,email` |
| **Long-lived sessions** | Session timeout: 4 hours | Session timeout: 15 minutes |
| **No audit trail** | API call without logging | Every PHI access logged |
| **Shared credentials** | One API key for all users | Individual credentials per user/system |

---

## References

- **HIPAA Security Rule**: [45 CFR Part 164 Subpart C](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- **HIPAA Privacy Rule**: [45 CFR Part 164 Subpart E](https://www.hhs.gov/hipaa/for-professionals/privacy/index.html)
- **Breach Notification Rule**: [45 CFR Part 164 Subpart D](https://www.hhs.gov/hipaa/for-professionals/breach-notification/index.html)
- **HHS Guidance on Minimum Necessary**: [HHS.gov](https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/minimum-necessary-requirement/index.html)

---

## Integration with Dental API Patterns

This document complements [dental-api-integration.md](./dental-api-integration.md) which defines:
- Supported PMS systems (Dentrix, Open Dental, Eaglesoft)
- API endpoints and authentication
- Rate limiting and error handling
- Per-workflow data access patterns

**Workflow**: Always consult both documents when implementing PHI-accessing features.
