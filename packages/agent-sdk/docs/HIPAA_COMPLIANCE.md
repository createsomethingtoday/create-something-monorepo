# HIPAA Compliance Documentation

## Purpose

This document defines HIPAA compliance requirements for dental practice management AI agents, including minimum necessary PHI determinations, audit procedures, incident response, and security controls.

## Table of Contents

1. [Minimum Necessary PHI by Workflow](#minimum-necessary-phi-by-workflow)
2. [Audit Logging Specification](#audit-logging-specification)
3. [Incident Response Procedures](#incident-response-procedures)
4. [Business Associate Agreements](#business-associate-agreements)
5. [Data Retention Policies](#data-retention-policies)
6. [Security Risk Assessment](#security-risk-assessment)
7. [Legal References](#legal-references)

---

## Minimum Necessary PHI by Workflow

Per HIPAA Privacy Rule 45 CFR 164.502(b), covered entities must limit PHI access to the minimum necessary to accomplish the intended purpose. This section documents the minimum necessary determination for each workflow.

### No-Show Recovery Workflow

**Purpose**: Reschedule patients who missed appointments by matching with waitlist candidates.

| PHI Element | Required? | Rationale |
|-------------|-----------|-----------|
| `patient_id` | ✅ Yes | Unique identifier for linking appointments and waitlist entries |
| `phone` | ✅ Yes | Contact method for notification delivery |
| `email` | ✅ Yes | Alternative contact method |
| `appointment_date` | ✅ Yes | Determines original appointment time for matching |
| `appointment_type` | ✅ Yes | Must match procedure type (cleaning vs exam vs root canal) |
| `status` | ✅ Yes | Identifies no-show appointments |
| `duration` | ✅ Yes | Ensures replacement slot matches time requirements |
| `provider_id` | ✅ Yes | Enables provider continuity preference matching |
| `name` | ❌ No | Not needed for matching algorithm or notifications (uses patient_id) |
| `clinical_notes` | ❌ No | Not relevant to scheduling decisions |
| `imaging` | ❌ No | Not relevant to scheduling decisions |
| `full_history` | ❌ No | Not relevant to scheduling decisions |
| `treatment_plans` | ❌ No | Not relevant to scheduling decisions |

**Access Pattern Example**:
```python
# ✅ CORRECT: Minimum necessary fields
appointments = pms_client.get_appointments(
    status="no_show",
    fields="patient_id,phone,email,appointment_date,appointment_type,status,duration,provider_id"
)

# ❌ WRONG: Requesting entire patient record
appointments = pms_client.get_patient_records(status="no_show")
```

### Insurance Verification Workflow

**Purpose**: Verify insurance eligibility for upcoming appointments.

| PHI Element | Required? | Rationale |
|-------------|-----------|-----------|
| `patient_id` | ✅ Yes | Unique identifier for linking verification results |
| `patient_dob` | ✅ Yes | Required by insurance clearinghouse APIs for identity verification |
| `insurer_id` | ✅ Yes | Identifies which insurance plan to verify |
| `procedure_codes` | ✅ Yes | Determines coverage for specific procedures |
| `appointment_date` | ✅ Yes | Verifies coverage at time of service |
| `name` | ❌ No | Not needed for insurance API calls |
| `phone` | ❌ No | Not needed for verification |
| `balances` | ❌ No | Not relevant to eligibility determination |
| `prior_claims` | ❌ No | Not relevant to eligibility determination |
| `diagnoses` | ❌ No | Not relevant to eligibility determination |
| `treatment_history` | ❌ No | Not relevant to eligibility determination |

**Access Pattern Example**:
```python
# ✅ CORRECT: Minimum necessary fields
eligibility = insurance_api.verify_eligibility(
    patient_dob="1980-05-15",
    insurer_id="ins_12345",
    procedure_codes=["D0120", "D1110"]
)

# ❌ WRONG: Including unnecessary patient details
eligibility = insurance_api.verify_eligibility(
    patient_name="John Doe",
    patient_dob="1980-05-15",
    patient_phone="555-0123",
    insurer_id="ins_12345",
    procedure_codes=["D0120", "D1110"],
    prior_claims=prior_claim_history
)
```

### Recall Reminder Workflow

**Purpose**: Identify overdue patients and send reminders for preventive care.

| PHI Element | Required? | Rationale |
|-------------|-----------|-----------|
| `patient_id` | ✅ Yes | Unique identifier for tracking reminder status |
| `name` | ✅ Yes | Personalize reminder messages ("Hi Sarah, it's time...") |
| `phone` | ✅ Yes | SMS delivery |
| `email` | ✅ Yes | Email delivery |
| `last_visit_date` | ✅ Yes | Calculate days since last visit for reminder messaging |
| `overdue_procedure_type` | ✅ Yes | Personalize message (cleaning vs exam vs X-ray) |
| `detailed_chart` | ❌ No | Not relevant to reminder messaging |
| `payment_status` | ❌ No | Not relevant to preventive care reminders |
| `clinical_notes` | ❌ No | Not relevant to reminder messaging |
| `diagnosis_codes` | ❌ No | Not relevant to reminder messaging |

**Access Pattern Example**:
```python
# ✅ CORRECT: Minimum necessary fields
overdue_patients = pms_client.get_patients(
    last_visit_before="2025-07-01",
    fields="patient_id,name,phone,email,last_visit_date,overdue_procedure_type"
)

# ❌ WRONG: Requesting full patient records
overdue_patients = pms_client.get_patients(
    last_visit_before="2025-07-01",
    include_full_chart=True
)
```

---

## Audit Logging Specification

Per HIPAA Security Rule 45 CFR 164.312(b), information systems must implement audit controls to record and examine access to PHI.

### Required Audit Log Fields

Every PHI access must log the following fields:

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
| `correlation_id` | string | Request trace ID | `dental_abc123` |

### Audit Log Retention

**Requirement**: HIPAA mandates 6-year retention for audit logs.

**Implementation**:
```typescript
// Cloudflare KV example
const sixYearsTTL = 6 * 365 * 24 * 60 * 60; // 189,216,000 seconds
await env.AUDIT_LOG.put(
  `audit:${correlation_id}`,
  JSON.stringify(auditEntry),
  { expirationTtl: sixYearsTTL }
);
```

### Audit Log Query Examples

**Find all accesses for a specific patient**:
```sql
-- D1 example
SELECT * FROM audit_logs
WHERE patient_id = 'patient_456'
ORDER BY timestamp DESC
LIMIT 100;
```

**Find all insurance verifications today**:
```sql
SELECT * FROM audit_logs
WHERE action = 'insurance_verify'
  AND timestamp >= datetime('now', 'start of day')
ORDER BY timestamp DESC;
```

**Find all failed operations in last 24 hours**:
```sql
SELECT * FROM audit_logs
WHERE outcome = 'failure'
  AND timestamp >= datetime('now', '-1 day')
ORDER BY timestamp DESC;
```

---

## Incident Response Procedures

Per HIPAA Breach Notification Rule 45 CFR 164.404, covered entities must notify affected individuals, HHS, and potentially the media in case of PHI breaches.

### Definition of a Breach

A breach is an impermissible use or disclosure that compromises the security or privacy of PHI.

**Examples of Breaches**:
- PHI exposed in application logs
- PHI sent to incorrect patient
- Unauthorized access to patient records
- Lost or stolen device containing unencrypted PHI
- PHI visible in email subject lines

**Not Considered Breaches** (if immediately corrected):
- Unintentional access by authorized staff acting in good faith
- Inadvertent disclosure to another authorized person at the practice
- PHI that cannot reasonably be retained

### Incident Response Steps

**1. Detection and Containment (0-1 hour)**

- Identify the breach source and scope
- Immediately disable affected system access
- Preserve evidence (logs, screenshots, affected systems)
- Notify security team and practice administrator

**Action Checklist**:
- [ ] Stop the breach (disable access, revoke credentials)
- [ ] Document timeline (when breach occurred, when detected)
- [ ] Preserve all relevant logs and system states
- [ ] Notify practice security officer

**2. Assessment (1-24 hours)**

Determine:
- How many patients affected?
- What PHI was exposed (names, DOB, SSN, diagnosis codes, etc.)?
- Was PHI encrypted?
- Who had unauthorized access?
- What is the likelihood of re-identification?

**Risk Assessment Matrix**:

| PHI Type | Encrypted? | Exposure Scope | Risk Level |
|----------|-----------|----------------|------------|
| Patient IDs only | Yes | Internal staff | Low |
| Patient IDs only | No | External | Medium |
| Names + DOB | Yes | Internal staff | Medium |
| Names + DOB | No | External | High |
| Names + DOB + SSN | Any | Any | Critical |
| Clinical notes | Any | External | Critical |

**3. Notification (24-60 days)**

Per 45 CFR 164.404(b), notification must occur **without unreasonable delay** and **no later than 60 days** after discovery.

**Who to Notify**:

| Recipients | When | Method |
|-----------|------|--------|
| **Affected individuals** | < 500 people: within 60 days | Written notice (first-class mail or email if opted in) |
| **Affected individuals** | ≥ 500 people: immediately | Written notice + substitute notice (media or prominent web posting) |
| **HHS** | < 500 people: annually | Log on HHS web portal |
| **HHS** | ≥ 500 people: within 60 days | Immediate report to HHS |
| **Media** | ≥ 500 people in state/jurisdiction | Prominent media outlets |

**Notification Content Requirements**:

Notices must include:
- Brief description of what happened
- Types of PHI involved (names, DOB, SSN, etc.)
- Steps individuals should take to protect themselves
- What the practice is doing to investigate and prevent recurrence
- Contact information for questions

**4. Remediation and Documentation**

- Implement fixes to prevent recurrence
- Update security policies and training
- Document entire incident response process
- Retain all documentation for 6 years

---

## Business Associate Agreements

Per HIPAA Privacy Rule 45 CFR 164.502(e), covered entities must have signed Business Associate Agreements (BAAs) with all vendors who access PHI.

### Required BAAs

| Vendor Type | Examples | BAA Required? |
|-------------|----------|---------------|
| **Cloud Hosting** | Cloudflare, Modal, AWS | ✅ Yes |
| **PMS Vendors** | Dentrix, Open Dental, Eaglesoft | ✅ Yes |
| **Insurance Clearinghouses** | Availity, Change Healthcare, DentalXChange | ✅ Yes |
| **Communication Providers** | Twilio (SMS), SendGrid (email) | ✅ Yes |
| **AI Model Providers** | Anthropic (Claude Code) | ✅ Yes |
| **Analytics** | Only if receiving PHI | ✅ Yes if PHI shared |
| **Backup Providers** | If storing PHI backups | ✅ Yes |

### BAA Template Clauses

**1. Permitted Uses**

> "Business Associate agrees to use and disclose PHI only as permitted by this Agreement or as required by law. Business Associate may use or disclose PHI for the following purposes:
> - No-show appointment recovery
> - Insurance eligibility verification
> - Patient recall reminders
> - Aggregate analytics (de-identified data only)"

**2. Safeguards**

> "Business Associate agrees to implement administrative, physical, and technical safeguards that reasonably and appropriately protect the confidentiality, integrity, and availability of electronic PHI (ePHI), including:
> - Encryption at rest (AES-256)
> - Encryption in transit (TLS 1.3+)
> - Access controls (role-based, least privilege)
> - Audit logging (6-year retention)
> - Regular security risk assessments"

**3. Breach Notification**

> "Business Associate agrees to notify Covered Entity of any Breach of Unsecured PHI within **60 calendar days** of discovery. Notification shall include:
> - Description of breach
> - Types of PHI involved
> - Number of individuals affected
> - Date of breach discovery
> - Mitigation steps taken"

**4. Subcontractors**

> "Business Associate shall ensure that any subcontractors who access PHI agree to substantially similar BAA terms as those imposed on Business Associate."

**5. Data Destruction**

> "Upon termination of this Agreement, Business Associate shall return or destroy all PHI in its possession, except where retention is required by law."

**6. Audit Rights**

> "Covered Entity has the right to audit Business Associate's compliance with this Agreement and applicable HIPAA regulations upon reasonable notice."

---

## Data Retention Policies

### Audit Logs: 6 Years

**Requirement**: HIPAA Security Rule 45 CFR 164.316(b)(2)(i) requires audit logs be retained for 6 years.

**Implementation**:
```typescript
// Cloudflare KV with 6-year TTL
const SIX_YEARS_IN_SECONDS = 189216000;
await env.AUDIT_LOG.put(
  `audit:${correlation_id}`,
  JSON.stringify(auditEntry),
  { expirationTtl: SIX_YEARS_IN_SECONDS }
);
```

### Confirmation Links: 24 Hours

**Requirement**: Patient confirmation links should expire after 24 hours to minimize risk window.

**Implementation**:
```python
# HMAC-based confirmation link with 24-hour expiry
CONFIRMATION_LINK_EXPIRY_HOURS = 24

def generate_confirmation_link(patient_id: str, appointment_id: str) -> str:
    expires_at = int(time.time()) + (CONFIRMATION_LINK_EXPIRY_HOURS * 3600)
    # ... HMAC signature generation
```

### Rate Limit Counters: 24 Hours

**Requirement**: Notification rate limits use 24-hour sliding windows.

**Implementation**:
```python
# Rate limit counter with 24-hour TTL
rate_limit_ttl = 24 * 60 * 60  # 86,400 seconds
await redis.setex(f"rate_limit:{patient_id}", rate_limit_ttl, notification_count)
```

### Patient Records: Varies by State

**Note**: Patient medical records retention varies by state law (typically 7-10 years after last treatment, or longer for minors).

**This system does NOT store patient medical records**, only operational data (appointments, insurance verifications, reminders). Retention of operational data follows practice's own policies.

---

## Security Risk Assessment

Per HIPAA Security Rule 45 CFR 164.308(a)(1)(ii)(A), covered entities must conduct periodic risk assessments.

### Risk Assessment Template

Complete this assessment **annually** or after significant system changes.

#### 1. Asset Inventory

| Asset | PHI Stored? | Encryption? | Access Controls? |
|-------|-------------|-------------|------------------|
| D1 Database (practice configs) | Yes (patient_id references) | ✅ Yes (at rest) | ✅ Yes (Cloudflare IAM) |
| KV Namespace (audit logs) | Yes (patient_id references) | ✅ Yes (at rest) | ✅ Yes (Cloudflare IAM) |
| Modal Backend (agent execution) | Transient only | ✅ Yes (in transit TLS 1.3) | ✅ Yes (API key auth) |
| PMS API Credentials | Yes (stored encrypted) | ✅ Yes (AES-256) | ✅ Yes (Cloudflare Workers KMS) |

#### 2. Threat Identification

| Threat | Likelihood | Impact | Risk Level |
|--------|------------|--------|------------|
| Unauthorized access to D1 database | Low | High | Medium |
| PHI exposure in application logs | Medium | High | **High** |
| Compromised PMS API credentials | Low | Critical | Medium |
| Rate limit bypass (notification spam) | Medium | Low | Low |
| HMAC signature forgery | Low | Medium | Low |
| Insider threat (practice staff) | Medium | Medium | Medium |
| DDoS attack on edge router | Medium | Low | Low |

#### 3. Mitigation Controls

| Threat | Mitigation | Effectiveness |
|--------|-----------|---------------|
| Unauthorized D1 access | Cloudflare IAM, least privilege roles | ✅ Effective |
| PHI in logs | Audit all log statements, use only patient_id | ✅ Effective |
| Compromised credentials | Quarterly rotation, encrypted storage, KMS | ✅ Effective |
| Rate limit bypass | Sliding window rate limiting, per-patient counters | ✅ Effective |
| HMAC forgery | HMAC-SHA256 with strong secret, constant-time comparison | ✅ Effective |
| Insider threat | Audit logging, correlation IDs, quarterly access reviews | ⚠️ Partial |
| DDoS | Cloudflare DDoS protection, rate limiting | ✅ Effective |

#### 4. Residual Risk

After implementing all controls:

| Risk Area | Residual Risk | Acceptance |
|-----------|---------------|------------|
| PHI exposure in logs | **Medium** (human error possible) | Mitigate with code review + quarterly log audits |
| Insider threat | **Medium** (authorized access hard to prevent) | Mitigate with audit logging + correlation ID tracking |
| All other threats | **Low** | Acceptable |

#### 5. Action Items

- [ ] Quarterly: Rotate PMS API credentials
- [ ] Quarterly: Audit all log statements for PHI leakage
- [ ] Quarterly: Review user access permissions
- [ ] Annually: Conduct full HIPAA Security Rule assessment
- [ ] Annually: Update BAAs with all vendors
- [ ] Continuously: Monitor audit logs for anomalous access patterns

---

## Legal References

### HIPAA Privacy Rule

**45 CFR 164.502(b)** - Minimum Necessary Standard
> "A covered entity must make reasonable efforts to limit protected health information to the minimum necessary to accomplish the intended purpose."

**45 CFR 164.512** - Uses and Disclosures for Treatment, Payment, and Health Care Operations
> Permits PHI use for treatment (appointment scheduling), payment (insurance verification), and operations (recall reminders) without patient authorization.

### HIPAA Security Rule

**45 CFR 164.306** - Security Standards: General Rules
> "Covered entities must ensure the confidentiality, integrity, and availability of all electronic protected health information (ePHI) the covered entity creates, receives, maintains, or transmits."

**45 CFR 164.312(b)** - Audit Controls
> "Implement hardware, software, and/or procedural mechanisms that record and examine activity in information systems that contain or use electronic protected health information."

**45 CFR 164.316(b)(2)(i)** - Time Limit for Retention
> "Retain documentation for 6 years from the date of creation or the date when it last was in effect, whichever is later."

### HIPAA Breach Notification Rule

**45 CFR 164.404** - Notification to Individuals
> "Covered entity shall notify each individual whose unsecured PHI has been, or is reasonably believed to have been, accessed, acquired, used, or disclosed as a result of a breach."

**45 CFR 164.408** - Notification to the Secretary (HHS)
> "If breach affects ≥500 individuals: notify HHS within 60 days. If < 500 individuals: log annually."

---

## Implementation Checklist

### Development Phase

- [ ] All PHI access queries use minimum necessary fields
- [ ] No PHI in application logs (only patient_id, appointment_id)
- [ ] Encryption implemented (AES-256 at rest, TLS 1.3 in transit)
- [ ] Audit logging implemented with 6-year retention
- [ ] HMAC-SHA256 for confirmation links with 24-hour expiry
- [ ] Rate limiting implemented (3 notifications/day per patient)

### Deployment Phase

- [ ] BAAs signed with all vendors (Cloudflare, Modal, Anthropic, Twilio, SendGrid, PMS vendors)
- [ ] PMS API credentials encrypted and stored securely
- [ ] Cloudflare Workers KMS configured for credential decryption
- [ ] D1 database access restricted to authorized roles only
- [ ] Penetration testing completed
- [ ] Vulnerability scanning scheduled

### Operational Phase

- [ ] Quarterly credential rotation scheduled
- [ ] Quarterly log audit for PHI leakage
- [ ] Quarterly access control review
- [ ] Annual HIPAA Security Rule risk assessment
- [ ] Annual BAA review with all vendors
- [ ] Incident response plan tested at least annually
- [ ] Staff training completed on PHI handling

---

## Conclusion

This HIPAA Compliance Documentation provides the foundation for secure, compliant dental practice management AI agents. All workflows, audit procedures, and incident response protocols reference this document as the authoritative source for compliance requirements.

**For Questions**: Contact the practice's HIPAA Security Officer or legal counsel.

**Last Updated**: 2026-01-12
**Review Frequency**: Annually or after significant system changes
