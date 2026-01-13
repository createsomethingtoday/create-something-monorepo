# HIPAA Compliance Documentation

**Dental Practice Management Agent - Phase 3**
**Document Version:** 1.0
**Last Updated:** 2026-01-12
**Regulatory References:** 45 CFR 164.502(b) (Privacy Rule), 45 CFR 164.306 (Security Rule)

---

## Table of Contents

1. [Overview](#overview)
2. [Minimum Necessary PHI Matrix](#minimum-necessary-phi-matrix)
3. [Audit Logging Specification](#audit-logging-specification)
4. [Incident Response Procedures](#incident-response-procedures)
5. [Required Business Associate Agreements (BAAs)](#required-business-associate-agreements-baas)
6. [Data Retention Policies](#data-retention-policies)
7. [Security Risk Assessment Template](#security-risk-assessment-template)

---

## Overview

This document outlines HIPAA compliance requirements and procedures for the Dental Practice Management Agent system. The system processes Protected Health Information (PHI) to automate dental practice workflows including appointment scheduling, insurance verification, and patient recall reminders.

**Regulatory Basis:**
- **HIPAA Privacy Rule** (45 CFR 164.502(b)): Requires "minimum necessary" PHI access
- **HIPAA Security Rule** (45 CFR 164.306): Requires administrative, physical, and technical safeguards

**System Scope:**
- No-show appointment rescheduling
- Insurance verification workflow
- Recall reminder system
- Patient notification system

---

## Minimum Necessary PHI Matrix

Per HIPAA Privacy Rule 45 CFR 164.502(b), covered entities must make reasonable efforts to limit PHI to the minimum necessary to accomplish the intended purpose.

### Workflow 1: No-Show Rescheduling

| PHI Field | Required | Rationale |
|-----------|----------|-----------|
| \`patient_id\` | ✓ | De-identified reference for tracking |
| \`phone\` | ✓ | Required for patient contact |
| \`email\` | ✓ | Alternative contact method |
| \`appointment_date\` | ✓ | Scheduling context |
| \`appointment_type\` | ✓ | Determines available provider/equipment |
| \`status\` | ✓ | Identifies no-show appointments |
| \`patient_name\` | ✗ | Not needed - use patient_id |
| \`clinical_notes\` | ✗ | Not relevant to scheduling |
| \`imaging\` | ✗ | Not relevant to scheduling |
| \`treatment_plans\` | ✗ | Not relevant to scheduling |
| \`full_medical_history\` | ✗ | Not relevant to scheduling |

**Access Pattern:**
\`\`\`python
# CORRECT - Minimum necessary fields
appointments = pms_client.get_appointments(
    status="no_show",
    date_from=today - timedelta(days=7),
    fields="patient_id,phone,email,appointment_date,appointment_type,status"
)

# INCORRECT - Over-fetching PHI
appointments = pms_client.get_patients(patient_id)  # Returns full patient record
\`\`\`

### Workflow 2: Insurance Verification

| PHI Field | Required | Rationale |
|-----------|----------|-----------|
| \`patient_id\` | ✓ | De-identified reference for tracking |
| \`patient_dob\` | ✓ | Required for insurer verification |
| \`insurer_id\` | ✓ | Identifies insurance provider |
| \`procedure_codes\` | ✓ | Determines coverage eligibility |
| \`patient_name\` | ✗ | Not needed for verification API |
| \`balances\` | ✗ | Not relevant to eligibility check |
| \`prior_claims\` | ✗ | Not relevant to current verification |
| \`diagnoses\` | ✗ | Not required for eligibility |
| \`treatment_history\` | ✗ | Not relevant to verification |

**Access Pattern:**
\`\`\`python
# CORRECT - Minimum necessary fields
verification = insurance_api.verify_eligibility(
    patient_dob=patient.dob,
    insurer_id=patient.insurer_id,
    procedure_codes=["D0120", "D0274"]
)

# INCORRECT - Over-fetching PHI
patient_record = pms_client.get_patient_full_record(patient_id)
\`\`\`

### Workflow 3: Recall Reminders

| PHI Field | Required | Rationale |
|-----------|----------|-----------|
| \`patient_id\` | ✓ | De-identified reference for tracking |
| \`name\` | ✓ | Personalization in reminder message |
| \`phone\` | ✓ | Required for SMS delivery |
| \`last_visit_date\` | ✓ | Determines overdue status |
| \`overdue_procedure_type\` | ✓ | Reminder context (e.g., "cleaning") |
| \`detailed_chart\` | ✗ | Not relevant to reminder |
| \`payment_status\` | ✗ | Not relevant to recall |
| \`clinical_notes\` | ✗ | Not relevant to reminder |
| \`imaging\` | ✗ | Not relevant to reminder |

**Access Pattern:**
\`\`\`python
# CORRECT - Minimum necessary fields
overdue_patients = pms_client.get_overdue_patients(
    procedure_type="cleaning",
    overdue_days_min=180,
    fields="patient_id,name,phone,last_visit_date,overdue_procedure_type"
)

# INCORRECT - Over-fetching PHI
patients = pms_client.get_all_patients()  # Returns full records
\`\`\`

---

## Audit Logging Specification

Per HIPAA Security Rule 45 CFR 164.312(b), implement audit controls to record and examine activity in systems containing PHI.

### Required Log Fields

Every PHI access event MUST log the following fields:

\`\`\`json
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
\`\`\`

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| \`timestamp\` | ISO 8601 | UTC timestamp of action | \`2026-01-12T22:00:00.000Z\` |
| \`action\` | string | Action performed | \`appointment_query\`, \`patient_update\` |
| \`actor_id\` | string | Who performed action | \`user_abc123\`, \`agent_scheduler_001\` |
| \`actor_type\` | enum | Type of actor | \`human\`, \`agent\`, \`system\` |
| \`practice_id\` | string | Practice context | \`practice_xyz789\` |
| \`patient_id\` | string | De-identified patient reference | \`patient_456\` |
| \`resource_type\` | string | PHI resource accessed | \`appointment\`, \`patient\`, \`insurance\` |
| \`resource_id\` | string | Specific resource ID | \`appt_789\` |
| \`outcome\` | enum | Success or failure | \`success\`, \`failure\`, \`partial\` |
| \`ip_address\` | string | Source IP (if applicable) | \`192.0.2.1\` |
| \`user_agent\` | string | Client identifier | \`dental-agent-router/1.0\` |
| \`correlation_id\` | string | Request trace ID | \`req_abc123\` |

### Retention Period

**Requirement:** Audit logs MUST be retained for **6 years** per HIPAA requirements (45 CFR 164.530(j)).

**Implementation:**
\`\`\`python
# Cloudflare KV with 6-year TTL
six_years_ttl = 6 * 365 * 24 * 60 * 60  # 189,216,000 seconds
await env.AUDIT_LOG.put(
    f"audit:{correlation_id}",
    json.dumps(audit_entry),
    expirationTtl=six_years_ttl
)
\`\`\`

### Query Examples

**Example 1: Find all PHI access by a specific actor**
\`\`\`python
# Query audit logs for specific actor
logs = await env.DB.prepare("""
    SELECT * FROM audit_logs
    WHERE actor_id = ?
    AND timestamp >= ?
    ORDER BY timestamp DESC
""").bind(actor_id, cutoff_date).all()
\`\`\`

**Example 2: Find all access to specific patient**
\`\`\`python
# Query audit logs for specific patient
logs = await env.DB.prepare("""
    SELECT * FROM audit_logs
    WHERE patient_id = ?
    AND timestamp >= ?
    ORDER BY timestamp DESC
""").bind(patient_id, cutoff_date).all()
\`\`\`

**Example 3: Find failed PHI access attempts**
\`\`\`python
# Query failed access attempts
logs = await env.DB.prepare("""
    SELECT * FROM audit_logs
    WHERE outcome = 'failure'
    AND timestamp >= ?
    ORDER BY timestamp DESC
""").bind(cutoff_date).all()
\`\`\`

### Prohibited Logging Practices

**Never log PHI directly:**

\`\`\`python
# ❌ WRONG - Logs PHI
logger.info(f"Scheduled appointment for {patient_name} on {date}")

# ✅ CORRECT - Logs action without PHI
logger.info("Scheduled appointment", extra={
    "patient_id": patient_id,
    "action": "appointment_scheduled",
    "correlation_id": correlation_id,
    "timestamp": datetime.utcnow().isoformat()
})
\`\`\`

---

## Incident Response Procedures

### PHI Breach Definition

A breach is the acquisition, access, use, or disclosure of PHI in a manner not permitted under the HIPAA Privacy Rule that compromises the security or privacy of the PHI (45 CFR 164.402).

### Incident Response Steps

#### 1. Detection and Containment (0-2 hours)

**Immediate Actions:**
1. Identify the scope of the breach:
   - Which patients are affected?
   - What PHI was exposed?
   - How was it exposed?
   - When did the breach occur?

2. Contain the breach:
   - Disable compromised credentials immediately
   - Rotate API keys if compromised
   - Block suspicious IP addresses
   - Isolate affected systems

**Query Example - Identify affected patients:**
\`\`\`python
# Find all patients accessed during breach window
affected_patients = await env.DB.prepare("""
    SELECT DISTINCT patient_id
    FROM audit_logs
    WHERE timestamp BETWEEN ? AND ?
    AND (actor_id = ? OR ip_address = ?)
""").bind(breach_start, breach_end, compromised_actor_id, suspicious_ip).all()
\`\`\`

#### 2. Risk Assessment (2-24 hours)

Determine if the breach requires notification per 45 CFR 164.402:

| Factor | Low Risk | High Risk |
|--------|----------|-----------|
| **PHI Type** | De-identified IDs only | Names, DOB, SSN, clinical data |
| **Access Duration** | <1 hour | >24 hours |
| **Recipient** | Internal authorized user | External unauthorized party |
| **Data Use** | No evidence of use | Evidence of data extraction |
| **Mitigation** | Immediate containment | Delayed detection |

**Risk Assessment Template:**
\`\`\`
Breach ID: [AUTO-GENERATED]
Date Detected: [TIMESTAMP]
Detection Method: [Monitoring alert / User report / Audit review]

Scope:
- Patients Affected: [COUNT]
- PHI Fields Exposed: [LIST]
- Access Duration: [HOURS]
- Access Method: [API / Direct DB / Export]

Risk Level: [LOW / MEDIUM / HIGH]
Notification Required: [YES / NO]
Justification: [FREE TEXT]

Containment Actions Taken:
- [ACTION 1 with timestamp]
- [ACTION 2 with timestamp]
\`\`\`

#### 3. Notification (24-60 days)

**If breach affects 500+ individuals:**
- Notify affected individuals within 60 days (45 CFR 164.404)
- Notify HHS Office for Civil Rights within 60 days
- Notify prominent media outlets

**If breach affects <500 individuals:**
- Notify affected individuals within 60 days
- Document in annual report to HHS

**Notification Template (Patient):**
\`\`\`
Subject: Important Notice Regarding Your Health Information

Dear [Patient Name],

We are writing to inform you of a data security incident that may have
involved some of your protected health information.

What Happened:
[Brief description of incident]

What Information Was Involved:
[Specific PHI fields exposed]

What We Are Doing:
[Steps taken to investigate and prevent recurrence]

What You Can Do:
[Recommended actions for patient]

For More Information:
Contact: [Practice contact information]
Reference: [Incident ID]

Sincerely,
[Practice Name]
[HIPAA Privacy Officer Contact]
\`\`\`

#### 4. Documentation (Ongoing)

Maintain a breach log per 45 CFR 164.414(b):

\`\`\`python
# Breach log entry
breach_log = {
    "breach_id": "breach_001",
    "date_discovered": "2026-01-12T10:30:00Z",
    "date_occurred": "2026-01-10T14:00:00Z",
    "description": "Unauthorized API access via compromised credentials",
    "patients_affected": 127,
    "phi_exposed": ["patient_id", "phone", "email", "appointment_dates"],
    "notification_date": "2026-02-15",
    "corrective_actions": [
        "Rotated all API keys",
        "Implemented IP allowlisting",
        "Enhanced monitoring alerts"
    ]
}
\`\`\`

---

## Required Business Associate Agreements (BAAs)

Per HIPAA Privacy Rule 45 CFR 164.502(e), covered entities must obtain satisfactory assurances through a Business Associate Agreement (BAA) that the business associate will appropriately safeguard PHI.

### Required BAAs

| Service Provider | Service Type | PHI Exposure | BAA Required |
|-----------------|--------------|--------------|--------------|
| **Twilio** | SMS notifications | Patient phone numbers, appointment reminders | ✓ Yes |
| **SendGrid** | Email notifications | Patient emails, appointment reminders | ✓ Yes |
| **Dentrix** | PMS integration | Full patient records, appointments, clinical data | ✓ Yes |
| **Open Dental** | PMS integration | Full patient records, appointments, clinical data | ✓ Yes |
| **Eaglesoft** | PMS integration | Full patient records, appointments, clinical data | ✓ Yes |
| **Insurance APIs** | Eligibility verification | Patient DOB, insurer ID, procedure codes | ✓ Yes |
| **Cloudflare** | Hosting infrastructure | All stored PHI (D1, KV, R2) | ✓ Yes |
| **Anthropic Claude** | AI processing | De-identified data only (no direct PHI exposure) | ✓ Yes (precautionary) |

### BAA Template Clauses

Every BAA MUST include:

1. **Permitted Uses and Disclosures**
   \`\`\`
   Business Associate may use or disclose PHI only to perform the
   following services for Covered Entity:
   - [Specific service description]
   - [No broader permissions]
   \`\`\`

2. **Safeguards Requirement**
   \`\`\`
   Business Associate agrees to implement administrative, physical,
   and technical safeguards that reasonably and appropriately protect
   the confidentiality, integrity, and availability of electronic PHI.
   \`\`\`

3. **Subcontractor Requirements**
   \`\`\`
   Business Associate shall ensure that any subcontractors that create,
   receive, maintain, or transmit PHI on behalf of Business Associate
   agree to the same restrictions and conditions that apply to Business
   Associate.
   \`\`\`

4. **Breach Notification**
   \`\`\`
   Business Associate shall notify Covered Entity of any breach of
   unsecured PHI within 60 days of discovery.
   \`\`\`

5. **Audit Rights**
   \`\`\`
   Covered Entity has the right to audit Business Associate's compliance
   with this Agreement and applicable HIPAA regulations.
   \`\`\`

6. **Data Destruction**
   \`\`\`
   Upon termination, Business Associate shall return or destroy all PHI
   and retain no copies, except as required by law.
   \`\`\`

### BAA Verification Checklist

Before going live with any vendor:

- [ ] BAA executed and signed by both parties
- [ ] BAA includes all required clauses above
- [ ] Vendor's security documentation reviewed
- [ ] Vendor's incident response procedures documented
- [ ] Vendor's encryption standards verified (TLS 1.3+, AES-256)
- [ ] Vendor's audit log capabilities confirmed
- [ ] Vendor's data retention policies documented
- [ ] Emergency contact information obtained

---

## Data Retention Policies

### Audit Logs: 6 Years

**Requirement:** Per HIPAA 45 CFR 164.530(j), audit logs must be retained for 6 years.

**Implementation:**
- Store in Cloudflare KV with 6-year TTL (189,216,000 seconds)
- Backup to R2 for redundancy
- Immutable append-only logs (no deletion/modification)

**Verification:**
\`\`\`python
# Verify retention policy
six_years_seconds = 6 * 365 * 24 * 60 * 60
assert audit_log_ttl == six_years_seconds, "Audit log TTL must be 6 years"
\`\`\`

### Confirmation Links: 24 Hours

**Requirement:** Patient confirmation links for appointment rescheduling expire after 24 hours to minimize exposure window.

**Implementation:**
\`\`\`python
# Generate confirmation link with 24-hour expiration
expiration_time = int(time.time()) + (24 * 60 * 60)  # 24 hours
confirmation_link = generate_confirmation_link(
    patient_id=patient_id,
    appointment_id=appointment_id,
    expiration=expiration_time
)
\`\`\`

**Rationale:** Reduces risk of unauthorized access if link is intercepted.

### PMS API Credentials: 90 Days

**Requirement:** Rotate PMS API credentials quarterly (every 90 days).

**Implementation:**
- Calendar reminder for credential rotation
- Automated notification 7 days before expiration
- Grace period: 7 days after expiration (with warnings)

**Rotation Procedure:**
\`\`\`python
# Check credential age
credential_age_days = (datetime.now() - credential_created_date).days
if credential_age_days > 90:
    logger.warning(f"PMS credential age: {credential_age_days} days - rotation required")
    # Trigger rotation workflow
\`\`\`

### Patient Session Timeout: 15 Minutes

**Requirement:** Inactive sessions with PHI access expire after 15 minutes.

**Implementation:**
\`\`\`python
# Session timeout configuration
SESSION_TIMEOUT_SECONDS = 15 * 60  # 15 minutes

# Verify timeout
if (current_time - last_activity_time) > SESSION_TIMEOUT_SECONDS:
    # Terminate session
    await terminate_session(session_id)
\`\`\`

---

## Security Risk Assessment Template

Per HIPAA Security Rule 45 CFR 164.308(a)(1)(ii)(A), conduct annual security risk assessments.

### Risk Assessment Framework

#### Step 1: Identify PHI Assets

| Asset | PHI Type | Storage Location | Access Method |
|-------|----------|------------------|---------------|
| Appointment records | Patient ID, dates, provider | Dentrix PMS | API |
| Patient demographics | Name, DOB, contact info | Open Dental PMS | API |
| Insurance records | Policy numbers, eligibility | Insurance API | API |
| Audit logs | De-identified access logs | Cloudflare KV | Direct |
| Confirmation links | HMAC-signed URLs | Email/SMS | One-time use |

#### Step 2: Identify Threats and Vulnerabilities

| Threat | Vulnerability | Likelihood | Impact | Risk Score |
|--------|--------------|------------|--------|------------|
| Unauthorized API access | Weak credentials | Medium | High | High |
| PHI exposure in logs | Improper logging | Low | Critical | High |
| HMAC link compromise | Timing attack | Low | Medium | Medium |
| Rate limit bypass | Insufficient throttling | Low | Medium | Low |
| Session hijacking | Long timeout | Medium | High | High |
| SQL injection | Unparameterized queries | Low | Critical | Medium |

**Risk Score Formula:**
\`\`\`
Risk Score = Likelihood × Impact
- Low: 1-3
- Medium: 4-6
- High: 7-9
- Critical: 10+
\`\`\`

#### Step 3: Document Current Controls

| Control | Type | Implementation | Effectiveness |
|---------|------|----------------|---------------|
| API authentication | Technical | OAuth 2.0 + API keys | High |
| Encryption at rest | Technical | AES-256 (Cloudflare) | High |
| Encryption in transit | Technical | TLS 1.3 | High |
| Audit logging | Technical | All PHI access logged | High |
| Rate limiting | Technical | 3 notifications/patient/day | Medium |
| HMAC verification | Technical | Constant-time comparison | High |
| Session timeout | Administrative | 15-minute inactivity | Medium |
| Minimum necessary | Administrative | PHI field restrictions | High |

#### Step 4: Identify Gaps and Recommendations

| Gap | Recommendation | Priority | Timeline |
|-----|----------------|----------|----------|
| No automated credential rotation | Implement 90-day rotation | High | Q1 2026 |
| Manual audit log review | Implement automated alerting | Medium | Q2 2026 |
| Single-factor API authentication | Require MFA for human users | High | Q1 2026 |
| No penetration testing | Engage third-party security firm | Medium | Q2 2026 |
| No disaster recovery drill | Schedule annual DR test | Low | Q3 2026 |

#### Step 5: Annual Review Schedule

**Quarterly Reviews:**
- Q1: Credential rotation verification
- Q2: Audit log analysis
- Q3: Vendor BAA status check
- Q4: Full risk assessment update

**Annual Deep Dive:**
- External penetration testing
- Security control effectiveness review
- Incident response drill
- HIPAA regulation update review

### Assessment Documentation

\`\`\`
Security Risk Assessment
Date: [YYYY-MM-DD]
Assessor: [Name, Title]
Scope: Dental Practice Management Agent System

Executive Summary:
[2-3 paragraphs summarizing findings]

Assets Reviewed: [COUNT]
Threats Identified: [COUNT]
High-Risk Items: [COUNT]
Recommendations: [COUNT]

Next Assessment Due: [YYYY-MM-DD]

Signature: ___________________
HIPAA Security Officer
\`\`\`

---

## Appendix: Quick Reference

### Minimum Necessary Checklist

Before accessing PHI, ask:
1. Can I use patient_id instead of patient_name?
2. Do I need full patient record, or just specific fields?
3. Can I filter the query to reduce result set?
4. Is there a more limited field set that would work?

### Audit Logging Checklist

Every PHI access must log:
- [ ] Timestamp (ISO 8601)
- [ ] Action performed
- [ ] Actor ID and type
- [ ] Patient ID (de-identified)
- [ ] Resource accessed
- [ ] Outcome (success/failure)
- [ ] Correlation ID

### Incident Response Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| HIPAA Privacy Officer | [TBD] | [TBD] | [TBD] |
| HIPAA Security Officer | [TBD] | [TBD] | [TBD] |
| Practice Manager | [TBD] | [TBD] | [TBD] |
| IT Director | [TBD] | [TBD] | [TBD] |
| Legal Counsel | [TBD] | [TBD] | [TBD] |

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-12 | Dental Agent Team | Initial documentation |

---

**References:**
- HIPAA Privacy Rule: 45 CFR Part 164 Subpart E
- HIPAA Security Rule: 45 CFR Part 164 Subpart C
- HHS Breach Notification Rule: 45 CFR Part 164 Subpart D
- HHS Guidance on Minimum Necessary: https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/minimum-necessary-requirement/index.html
