# HIPAA Compliance Documentation

## Dental Practice Management Agent System

**Version**: 1.0
**Last Updated**: 2026-01-12
**Applicable Regulations**:
- HIPAA Privacy Rule 45 CFR 164.502(b) - Minimum Necessary Standard
- HIPAA Security Rule 45 CFR 164.306 - Security Standards for PHI
- HIPAA Breach Notification Rule 45 CFR 164.402 - Breach Definitions

---

## Table of Contents

1. [Minimum Necessary PHI by Workflow](#minimum-necessary-phi-by-workflow)
2. [Audit Logging Specification](#audit-logging-specification)
3. [Incident Response Procedures](#incident-response-procedures)
4. [Required Business Associate Agreements](#required-business-associate-agreements)
5. [Data Retention Policies](#data-retention-policies)
6. [Security Risk Assessment Template](#security-risk-assessment-template)
7. [Technical Safeguards](#technical-safeguards)
8. [Administrative Safeguards](#administrative-safeguards)

---

## Minimum Necessary PHI by Workflow

Per HIPAA Privacy Rule 45 CFR 164.502(b), access to Protected Health Information (PHI) must be limited to the minimum necessary to accomplish the intended purpose.

### 1. No-Show Appointment Recovery

**Purpose**: Reschedule missed appointments by matching with waitlist patients.

**PHI Accessed**:
| Field | Why Necessary | Excluded PHI |
|-------|---------------|--------------|
| `patient_id` | De-identified reference for matching | No names in logs |
| `phone` | Required for outreach notification | No SSN |
| `email` | Alternative contact method | No address |
| `appointment_date` | Scheduling coordination | No clinical notes |
| `appointment_type` | Matching compatible procedures | No imaging |
| `status` | Identify no-show appointments | No treatment plans |
| `duration` | Schedule availability calculation | No diagnosis codes |
| `provider_id` | Provider continuity preference | No payment history |

**Rationale**: Names, SSNs, addresses, clinical details, imaging, and treatment plans are NOT required for appointment rescheduling. Only scheduling-relevant data is accessed.

**Workflow Reference**: `packages/agent-sdk/src/create_something_agents/workflows/no_show_recovery.py`

---

### 2. Insurance Verification

**Purpose**: Verify insurance eligibility for upcoming appointments to prevent claim denials.

**PHI Accessed**:
| Field | Why Necessary | Excluded PHI |
|-------|---------------|--------------|
| `patient_id` | De-identified reference | No names in logs |
| `patient_dob` | Required by insurance clearinghouse APIs | No SSN |
| `insurer_id` | Identify insurance provider | No addresses |
| `procedure_codes` | Verify coverage for specific procedures | No balances |

**Rationale**: Insurance verification APIs require DOB for identity verification and procedure codes for coverage checks. Balances, prior claims, diagnoses, and treatment history are NOT required for eligibility verification.

**Workflow Reference**: `packages/agent-sdk/src/create_something_agents/workflows/insurance_verification.py`

---

### 3. Recall Reminders

**Purpose**: Remind patients overdue for preventive care appointments.

**PHI Accessed**:
| Field | Why Necessary | Excluded PHI |
|-------|---------------|--------------|
| `patient_id` | De-identified reference | No SSN |
| `name` | Personalized greeting in notification | No address |
| `phone` | SMS delivery | No detailed chart |
| `email` | Email delivery | No payment status |
| `last_visit_date` | Calculate days overdue | No clinical notes |
| `overdue_procedure_type` | Personalize message (cleaning vs exam) | No imaging |

**Rationale**: Names are necessary for personalized patient communication (e.g., "Hi John"). Detailed charts, payment status, and clinical notes are NOT required for recall reminders.

**Workflow Reference**: `packages/agent-sdk/src/create_something_agents/workflows/recall_reminders.py`

---

### 4. Appointment Confirmation Links

**Purpose**: Secure, time-limited links for patients to confirm waitlist appointments.

**PHI Accessed**:
| Field | Why Necessary | Excluded PHI |
|-------|---------------|--------------|
| `patient_id` | Link confirmation to patient record | No name in URL |
| `appointment_id` | Link confirmation to specific slot | No PHI in link |
| `timestamp` | 24-hour expiry enforcement | HMAC-signed |

**Rationale**: HMAC-SHA256 signatures prevent tampering. No PHI is visible in the confirmation URL. Patient and appointment IDs are encrypted within the signature.

**Implementation Reference**: `packages/agent-sdk/src/create_something_agents/notifications/patient_outreach.py` (lines 68-115)

---

## Audit Logging Specification

Per HIPAA Security Rule 45 CFR 164.312(b), audit controls must record and examine activity in information systems containing PHI.

### Required Audit Log Fields

Every PHI access must be logged with the following structure:

```json
{
  "timestamp": "2026-01-12T22:00:00.000Z",
  "action": "appointment_query",
  "actor_id": "dental-scheduler-agent",
  "actor_type": "agent",
  "practice_id": "prac_xyz789",
  "patient_id": "patient_456",
  "resource_type": "appointment",
  "resource_id": "appt_789",
  "outcome": "success",
  "ip_address": "192.0.2.1",
  "user_agent": "dental-agent-router/1.0",
  "correlation_id": "dental-abc123",
  "error": null
}
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `timestamp` | ISO 8601 | Yes | UTC timestamp of PHI access |
| `action` | string | Yes | Type of action (`appointment_query`, `patient_update`, `insurance_verify`, `notification_sent`) |
| `actor_id` | string | Yes | Who performed the action (agent ID or user ID) |
| `actor_type` | enum | Yes | `agent`, `human`, `system` |
| `practice_id` | string | Yes | Dental practice context |
| `patient_id` | string | Yes | De-identified patient reference |
| `resource_type` | string | Yes | Type of PHI resource (`appointment`, `patient`, `insurance`, `notification`) |
| `resource_id` | string | No | Specific resource identifier if applicable |
| `outcome` | enum | Yes | `success`, `failure`, `partial` |
| `ip_address` | string | No | Source IP address if applicable |
| `user_agent` | string | No | Client identifier |
| `correlation_id` | string | Yes | Request trace ID (format: `dental-{uuid}`) |
| `error` | string | No | Error message if outcome = failure (no PHI in error text) |

### Retention Period

**6 years** per HIPAA requirements.

- KV namespace TTL: `189,216,000 seconds` (6 years)
- D1 database records: retain indefinitely, archive after 6 years
- Backup audit logs: encrypted at rest, 6-year retention

### Query Examples

**Find all actions for a specific patient:**
```sql
SELECT timestamp, action, outcome, correlation_id
FROM audit_logs
WHERE patient_id = 'patient_456'
ORDER BY timestamp DESC;
```

**Find all failed insurance verifications:**
```sql
SELECT timestamp, patient_id, correlation_id, error
FROM audit_logs
WHERE action = 'insurance_verify'
  AND outcome = 'failure'
ORDER BY timestamp DESC;
```

**Track a specific request end-to-end:**
```sql
SELECT timestamp, action, actor_id, outcome
FROM audit_logs
WHERE correlation_id = 'dental-abc123'
ORDER BY timestamp ASC;
```

### Implementation References

- Cloudflare Worker: `packages/agency/workers/dental-agent-router/src/index.ts` (lines 87-100)
- Workflow logging: Each workflow logs to audit trail with `correlation_id`

---

## Incident Response Procedures

Per HIPAA Breach Notification Rule 45 CFR 164.402, breaches of unsecured PHI must be reported within 60 days.

### Breach Definition

A breach is the acquisition, access, use, or disclosure of PHI in a manner not permitted by the Privacy Rule that compromises the security or privacy of the PHI.

### Incident Classification

| Severity | Definition | Response Time | Notification Required |
|----------|------------|---------------|----------------------|
| **Critical** | Unauthorized access to >500 patients' PHI | Immediate (within 1 hour) | Yes - HHS, Media, Patients |
| **High** | Unauthorized access to 10-499 patients' PHI | Within 24 hours | Yes - HHS, Patients |
| **Medium** | Unauthorized access to <10 patients' PHI | Within 72 hours | Yes - HHS, Patients |
| **Low** | PHI logged in error (no external exposure) | Within 1 week | Internal only |

### Response Workflow

#### Phase 1: Detection & Containment (0-1 hour)

1. **Detect**: Incident detected via monitoring, user report, or audit log analysis
2. **Classify**: Determine severity based on PHI exposure scope
3. **Contain**: Immediately revoke compromised API keys, disable affected accounts, block IP addresses
4. **Preserve**: Capture audit logs, system snapshots, error logs for investigation

**Tools**:
```bash
# Emergency: Revoke compromised API key
wrangler kv:key delete --namespace-id=AUDIT_LOG "api_key:compromised_key_id"

# Emergency: Disable practice account
wrangler d1 execute templates-platform-db --command \
  "UPDATE tenants SET status = 'suspended' WHERE practice_id = 'prac_xxx'"

# Emergency: Block IP address (add to blocklist)
wrangler d1 execute templates-platform-db --command \
  "INSERT INTO ip_blocklist (ip_address, reason, blocked_at) VALUES ('192.0.2.1', 'PHI breach incident', '2026-01-12T22:00:00Z')"
```

#### Phase 2: Investigation (1-24 hours)

1. **Scope**: Query audit logs to determine full extent of PHI access
   ```sql
   -- Find all actions by compromised actor
   SELECT timestamp, action, patient_id, outcome
   FROM audit_logs
   WHERE actor_id = 'compromised_user_id'
     AND timestamp BETWEEN '2026-01-01' AND '2026-01-12'
   ORDER BY timestamp ASC;
   ```

2. **Impact**: Identify affected patients and PHI types exposed
3. **Root Cause**: Determine how breach occurred (credential theft, system vulnerability, social engineering)
4. **Documentation**: Create incident report with timeline, affected systems, PHI exposure details

#### Phase 3: Notification (within 60 days)

**Required Notifications**:

1. **HHS Office for Civil Rights**:
   - Submit breach report via [HHS Breach Portal](https://ocrportal.hhs.gov/ocr/breach/wizard_breach.jsf)
   - Include: breach discovery date, PHI types exposed, number of patients affected, corrective actions

2. **Affected Patients**:
   - Written notification within 60 days of breach discovery
   - Include: breach description, PHI types exposed, steps to protect themselves, contact information
   - Method: First-class mail (or email if patient opted in)

3. **Media** (if >500 patients affected):
   - Prominent media outlets within 60 days
   - Press release with breach details, corrective actions

**Notification Template**:
```
Subject: Important Notice - Data Security Incident

Dear [Patient Name],

We are writing to inform you of a data security incident that may have involved
your protected health information (PHI).

WHAT HAPPENED:
On [date], we discovered that [brief description of incident].

WHAT INFORMATION WAS INVOLVED:
The following information may have been accessed: [list PHI types: names, DOB,
appointment dates, insurance information].

WHAT WE ARE DOING:
We have taken the following steps to address this incident:
- [List corrective actions]
- [Security enhancements]
- [Ongoing monitoring]

WHAT YOU CAN DO:
[Recommendations for patient actions if applicable]

FOR MORE INFORMATION:
Contact our Privacy Officer at [phone] or [email].

Sincerely,
[Practice Name]
```

#### Phase 4: Remediation (ongoing)

1. **Fix Vulnerability**: Patch security flaw, rotate credentials, update access controls
2. **Enhanced Monitoring**: Increase audit log frequency, add anomaly detection
3. **Policy Updates**: Revise security policies, update BAAs, retrain staff
4. **Follow-up**: Review incident response effectiveness, document lessons learned

### Internal Escalation Path

| Role | Responsibility | Contact |
|------|----------------|---------|
| **Security Team** | Initial containment, investigation | security@createsomething.agency |
| **Privacy Officer** | HIPAA compliance, notifications | privacy@createsomething.agency |
| **Legal Counsel** | Regulatory guidance, liability | legal@createsomething.agency |
| **Executive Leadership** | Decision authority, media response | leadership@createsomething.agency |
| **Client Practice** | Patient notifications, local response | [practice contact] |

---

## Required Business Associate Agreements

Per HIPAA Privacy Rule 45 CFR 164.502(e), covered entities must have written BAAs with all third-party vendors that access PHI.

### Required BAAs

| Vendor/Service | Purpose | BAA Status | PHI Accessed |
|----------------|---------|------------|--------------|
| **Twilio** | SMS notification delivery | Required | Phone numbers, appointment dates |
| **SendGrid** | Email notification delivery | Required | Email addresses, names, appointment dates |
| **Dentrix** | Practice Management System API | Required | Full patient records (via API) |
| **Open Dental** | Practice Management System API | Required | Full patient records (via API) |
| **Eaglesoft** | Practice Management System API | Required | Full patient records (via API) |
| **Insurance Clearinghouse APIs** | Eligibility verification | Required | Patient DOB, insurer IDs, procedure codes |
| **Cloudflare** | Edge routing, KV storage, D1 database | Required | Audit logs (de-identified patient_id) |
| **Modal** | Agent execution backend | Required | PMS configs, agent context (no direct PHI access) |
| **Anthropic (Claude)** | AI model inference | Required | Task descriptions (no PHI in prompts) |

### BAA Template Clauses

All BAAs must include the following provisions per HIPAA requirements:

#### 1. Permitted Uses and Disclosures

> "Business Associate agrees to use and disclose Protected Health Information (PHI) only as permitted by this Agreement and as required by law. Business Associate shall not use or disclose PHI in any manner that would constitute a violation of the Privacy Rule if done by Covered Entity."

**Application**: Vendors may only access PHI for the specific purposes defined in the agreement (e.g., Twilio for SMS delivery, SendGrid for email delivery).

#### 2. Safeguards

> "Business Associate agrees to implement administrative, physical, and technical safeguards that reasonably and appropriately protect the confidentiality, integrity, and availability of the electronic Protected Health Information (ePHI) that it creates, receives, maintains, or transmits on behalf of Covered Entity."

**Required Safeguards**:
- **Encryption**: AES-256 at rest, TLS 1.3 in transit
- **Access Controls**: Role-based access, multi-factor authentication
- **Audit Logging**: All PHI access logged with 6-year retention
- **Session Timeouts**: 15-minute inactivity timeout for PHI access

#### 3. Breach Notification

> "Business Associate shall notify Covered Entity within 60 calendar days of discovery of any Breach of Unsecured PHI. Notification shall include, to the extent known: (a) identification of each individual affected; (b) description of PHI involved; (c) date of breach; (d) circumstances of breach; (e) mitigation actions taken."

**Application**: If Twilio experiences a data breach exposing patient phone numbers, they must notify us within 60 days, and we must notify affected patients within 60 days of our discovery.

#### 4. Subcontractors

> "Business Associate shall ensure that any subcontractors that create, receive, maintain, or transmit PHI on behalf of Business Associate agree to the same restrictions and conditions that apply to Business Associate with respect to such PHI."

**Application**: If SendGrid uses a third-party email delivery service, that subcontractor must also sign a BAA.

#### 5. Data Destruction

> "Upon termination of this Agreement, Business Associate shall return or destroy all PHI received from, or created or received by Business Associate on behalf of, Covered Entity. Business Associate shall retain no copies of the PHI."

**Exception**: If return or destruction is infeasible, Business Associate must extend protections and limit further uses/disclosures.

#### 6. Audit Rights

> "Covered Entity shall have the right to audit Business Associate's compliance with this Agreement, including requesting documentation of safeguards, policies, procedures, and training. Business Associate shall make its internal practices, books, and records relating to the use and disclosure of PHI available to Covered Entity and the Secretary of HHS for purposes of determining compliance with HIPAA."

**Application**: We can audit Cloudflare's KV namespace security, Twilio's SMS delivery logs, etc.

### BAA Procurement Process

1. **Request**: Contact vendor's legal/compliance team to request HIPAA BAA
2. **Review**: Ensure all required clauses are present
3. **Negotiate**: Clarify any vendor-specific terms (e.g., encryption standards, breach notification procedures)
4. **Execute**: Both parties sign, retain copy for records
5. **Track**: Maintain BAA registry with renewal dates, contact information

---

## Data Retention Policies

Per HIPAA regulations and best practices, different data types have different retention requirements.

### Audit Logs

**Retention Period**: **6 years** (HIPAA requirement)

**Rationale**: HIPAA Security Rule requires audit logs be retained for 6 years from the date of creation or the date when it was last in effect, whichever is later.

**Implementation**:
- **KV Namespace**: Set TTL to `189,216,000 seconds` (6 years) when writing audit entries
- **D1 Database**: Retain indefinitely, archive to cold storage after 6 years
- **Backup Storage**: Encrypted backups with 6-year retention

**Example**:
```typescript
// Cloudflare Worker audit logging
await env.AUDIT_LOG.put(
  `audit:${correlation_id}`,
  JSON.stringify(auditEntry),
  { expirationTtl: 189216000 } // 6 years in seconds
);
```

### Confirmation Links

**Retention Period**: **24 hours** (functional requirement)

**Rationale**: Appointment confirmation links are time-sensitive. After 24 hours, the link expires and patient must be re-contacted.

**Implementation**:
- HMAC signature includes expiry timestamp
- Verification function checks timestamp and rejects expired links
- No persistent storage of links (generated on-demand)

**Example**:
```python
CONFIRMATION_LINK_EXPIRY_HOURS = 24

def generate_confirmation_link(...):
    expiry = int(time.time()) + (CONFIRMATION_LINK_EXPIRY_HOURS * 3600)
    # HMAC signature includes expiry
```

### Rate Limit Counters

**Retention Period**: **24 hours** (functional requirement)

**Rationale**: Rate limiting enforces 3 notifications per patient per 24-hour period. After 24 hours, counter resets.

**Implementation**:
- KV namespace for rate limit counters
- TTL set to 24 hours (86,400 seconds)
- Sliding window: each notification timestamp stored, expired entries ignored

**Example**:
```typescript
// Rate limit counter with 24-hour TTL
await env.CONFIG_CACHE.put(
  `rate_limit:${patient_id}`,
  JSON.stringify(timestamps),
  { expirationTtl: 86400 } // 24 hours
);
```

### PMS Credentials

**Retention Period**: **Until practice terminates service**

**Rationale**: PMS credentials are required for ongoing operations. Stored encrypted at rest.

**Implementation**:
- D1 database: `encrypted_credentials` field in `tenants` table
- Encryption: AES-256-GCM with KMS-managed keys
- Key rotation: Quarterly (90 days)
- Decryption: Only at request time, never logged

**Example**:
```typescript
// Store encrypted credentials
const encrypted = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv: new Uint8Array(12) },
  key,
  encoder.encode(credentials)
);

await env.DB.prepare(
  'INSERT INTO tenants (practice_id, encrypted_credentials) VALUES (?, ?)'
).bind(practiceId, encrypted).run();
```

### Patient Data (in transit)

**Retention Period**: **0 seconds** (ephemeral)

**Rationale**: Patient PHI should NEVER be stored in agent memory, logs, or temporary files. All PHI access is real-time via PMS API.

**Implementation**:
- Agent context: Contains correlation_id, practice_id, task description (no PHI)
- API responses: Processed and returned immediately, not cached
- Logs: Only de-identified patient_id references, no names/DOB/SSN

### Analytics Metrics

**Retention Period**: **Indefinitely** (aggregate data only)

**Rationale**: Analytics metrics are de-identified aggregates (counts, percentages, revenue estimates). No PHI is stored.

**Implementation**:
- D1 database: `conversion_metrics` table with date, practice_id, counts
- No patient-level data: Only aggregate totals per workflow
- HIPAA compliant: No PHI in metrics

**Example**:
```sql
-- Analytics table (no PHI)
CREATE TABLE conversion_metrics (
  id TEXT PRIMARY KEY,
  practice_id TEXT NOT NULL,
  date TEXT NOT NULL,
  workflow_type TEXT NOT NULL,
  slots_offered INTEGER,
  slots_accepted INTEGER,
  revenue_impact REAL,
  created_at INTEGER NOT NULL
);
```

---

## Security Risk Assessment Template

Per HIPAA Security Rule 45 CFR 164.308(a)(1)(ii)(A), covered entities must conduct periodic security risk assessments.

### Assessment Scope

This assessment covers the Dental Practice Management Agent System, including:
- Cloudflare Worker (edge router)
- Modal backend (agent execution)
- D1 database (practice configs)
- KV namespace (audit logs, rate limits)
- R2 bucket (if applicable)
- PMS API integrations (Dentrix, Open Dental, Eaglesoft)
- Notification providers (Twilio, SendGrid)

### Risk Assessment Matrix

| Threat | Likelihood | Impact | Risk Level | Mitigation |
|--------|------------|--------|------------|------------|
| **Unauthorized PHI Access** | Medium | Critical | **HIGH** | - API key authentication<br>- Rate limiting (100 req/min)<br>- Audit logging (6-year retention)<br>- RBAC (role-based access) |
| **PMS Credential Theft** | Low | Critical | **MEDIUM** | - AES-256 encryption at rest<br>- TLS 1.3 in transit<br>- Key rotation (quarterly)<br>- Credential not logged |
| **HMAC Link Tampering** | Low | Medium | **LOW** | - HMAC-SHA256 signatures<br>- Constant-time comparison<br>- 24-hour expiry<br>- Correlation ID tracking |
| **Rate Limit Bypass** | Medium | Low | **LOW** | - Sliding window (24-hour)<br>- Per-practice configurable limits<br>- Cloudflare Worker enforcement |
| **Audit Log Deletion** | Low | High | **MEDIUM** | - KV write-once (no delete API exposed)<br>- Backup to D1 database<br>- Encrypted backups (6-year retention) |
| **PHI Logged in Error** | Medium | High | **HIGH** | - Code review for logging statements<br>- Grep audit for PHI patterns<br>- De-identified references only (patient_id)<br>- Staff training on HIPAA compliance |
| **Database SQL Injection** | Low | Critical | **MEDIUM** | - Parameterized queries only<br>- D1 prepared statements<br>- Input validation<br>- Principle of least privilege (DB permissions) |
| **Notification Provider Breach** | Low | Medium | **LOW** | - BAAs with Twilio, SendGrid<br>- Encrypted in transit (TLS 1.3)<br>- Minimal PHI in notifications (no clinical details)<br>- Incident response plan |

### Likelihood Definitions

| Level | Description | Probability |
|-------|-------------|-------------|
| **Low** | Has happened rarely or never | <10% |
| **Medium** | Has happened occasionally | 10-50% |
| **High** | Has happened frequently | >50% |

### Impact Definitions

| Level | Description | PHI Exposure |
|-------|-------------|--------------|
| **Low** | Minor disruption, no PHI exposure | 0 patients |
| **Medium** | Significant disruption, limited PHI exposure | 1-10 patients |
| **High** | Major disruption, moderate PHI exposure | 11-499 patients |
| **Critical** | System failure, mass PHI exposure | >500 patients |

### Risk Level Calculation

| Likelihood | Impact | Risk Level |
|------------|--------|------------|
| Low | Low | **LOW** |
| Low | Medium | **LOW** |
| Low | High | **MEDIUM** |
| Low | Critical | **MEDIUM** |
| Medium | Low | **LOW** |
| Medium | Medium | **MEDIUM** |
| Medium | High | **HIGH** |
| Medium | Critical | **HIGH** |
| High | Low | **MEDIUM** |
| High | Medium | **HIGH** |
| High | High | **CRITICAL** |
| High | Critical | **CRITICAL** |

### Mitigation Action Plan

For each **HIGH** or **CRITICAL** risk:

1. **Document**: Create Beads issue with risk description, affected systems, proposed mitigation
2. **Prioritize**: Assign priority based on risk level (HIGH = P1, CRITICAL = P0)
3. **Implement**: Execute mitigation plan (code changes, policy updates, training)
4. **Test**: Verify mitigation effectiveness (penetration testing, audit log review)
5. **Monitor**: Ongoing monitoring to detect if risk materializes

**Example Beads Issue**:
```bash
bd create "Mitigate unauthorized PHI access risk" \
  --priority P1 \
  --label security \
  --label hipaa-compliance \
  --description "Implement RBAC and enhanced audit logging per risk assessment"
```

### Review Schedule

| Review Type | Frequency | Responsibility |
|-------------|-----------|----------------|
| **Annual Assessment** | Once per year | Security Team + Privacy Officer |
| **Post-Incident Review** | After any breach or near-miss | Security Team + Legal |
| **System Change Review** | Before deploying new features | Development Team + Security |
| **Vendor Review** | Upon BAA renewal | Privacy Officer |

---

## Technical Safeguards

Per HIPAA Security Rule 45 CFR 164.312, technical safeguards must be implemented to protect ePHI.

### Access Control (§164.312(a)(1))

**Requirement**: Implement technical policies and procedures for electronic information systems that maintain ePHI to allow access only to those persons or software programs that have been granted access rights.

**Implementation**:

1. **Unique User Identification (Required)**:
   - Every agent, human user, and system component has unique identifier
   - Agent IDs: `dental-scheduler-agent`, `dental-coordinator-agent`
   - Human IDs: `user_{uuid}`, `practice_admin_{uuid}`
   - System IDs: `dental-agent-router`, `modal-backend`

2. **Emergency Access Procedure (Required)**:
   - Cloudflare API keys stored in secure vault
   - Break-glass procedure for emergency PHI access
   - All emergency access logged with justification

3. **Automatic Logoff (Addressable)**:
   - Session timeout: 15 minutes of inactivity
   - Re-authentication required after timeout

4. **Encryption and Decryption (Addressable)**:
   - **At Rest**: AES-256-GCM for PMS credentials in D1 database
   - **In Transit**: TLS 1.3 for all API communications
   - **Key Management**: Cloudflare Workers Crypto API, quarterly rotation

### Audit Controls (§164.312(b))

**Requirement**: Implement hardware, software, and/or procedural mechanisms that record and examine activity in information systems that contain or use ePHI.

**Implementation**:

1. **Audit Log Structure**: 12-field JSON records (see Audit Logging Specification)
2. **Retention**: 6 years (189,216,000 seconds KV TTL)
3. **Review Process**: Weekly automated anomaly detection, monthly manual review
4. **Correlation IDs**: End-to-end request tracing (`dental-{uuid}` format)

### Integrity (§164.312(c)(1))

**Requirement**: Implement policies and procedures to protect ePHI from improper alteration or destruction.

**Implementation**:

1. **Mechanism to Authenticate ePHI (Addressable)**:
   - HMAC-SHA256 signatures for confirmation links (tamper detection)
   - Constant-time comparison prevents timing attacks
   - Cryptographic checksums for data integrity verification

### Person or Entity Authentication (§164.312(d))

**Requirement**: Implement procedures to verify that a person or entity seeking access to ePHI is the one claimed.

**Implementation**:

1. **API Key Authentication**: All requests to Cloudflare Worker require valid `MODAL_API_KEY`
2. **PMS Credentials**: Encrypted at rest, decrypted only at request time
3. **HMAC Link Verification**: Patient confirmation links use HMAC-SHA256 signatures

### Transmission Security (§164.312(e)(1))

**Requirement**: Implement technical security measures to guard against unauthorized access to ePHI that is being transmitted over an electronic communications network.

**Implementation**:

1. **Integrity Controls (Addressable)**:
   - TLS 1.3 for all HTTPS communications
   - Certificate pinning for PMS API connections
   - HMAC signatures for data integrity

2. **Encryption (Addressable)**:
   - All PHI transmitted via HTTPS (TLS 1.3)
   - No PHI transmitted via unencrypted channels (HTTP, email attachments)

---

## Administrative Safeguards

Per HIPAA Security Rule 45 CFR 164.308, administrative safeguards must be implemented to manage the selection, development, implementation, and maintenance of security measures.

### Security Management Process (§164.308(a)(1))

**Requirement**: Implement policies and procedures to prevent, detect, contain, and correct security violations.

**Implementation**:

1. **Risk Analysis (Required)**: Annual security risk assessment using template above
2. **Risk Management (Required)**: Mitigation action plan for HIGH/CRITICAL risks
3. **Sanction Policy (Required)**: Disciplinary actions for HIPAA violations
4. **Information System Activity Review (Required)**: Weekly audit log review, monthly anomaly detection

### Assigned Security Responsibility (§164.308(a)(2))

**Requirement**: Identify the security official who is responsible for the development and implementation of security policies and procedures.

**Implementation**:

- **Security Official**: security@createsomething.agency
- **Privacy Officer**: privacy@createsomething.agency
- **Responsibilities**: HIPAA compliance, incident response, risk assessments, policy updates

### Workforce Security (§164.308(a)(3))

**Requirement**: Implement policies and procedures to ensure that all workforce members have appropriate access to ePHI.

**Implementation**:

1. **Authorization/Supervision (Addressable)**: Role-based access control (RBAC)
2. **Workforce Clearance (Addressable)**: Background checks for staff with PHI access
3. **Termination Procedures (Addressable)**: Immediate credential revocation upon termination

### Information Access Management (§164.308(a)(4))

**Requirement**: Implement policies and procedures for authorizing access to ePHI.

**Implementation**:

1. **Isolating Healthcare Clearinghouse Functions (Required)**: Not applicable (we are not a clearinghouse)
2. **Access Authorization (Addressable)**: API keys per practice, rate limiting per practice
3. **Access Establishment and Modification (Addressable)**: Documented approval process for new practice onboarding

### Security Awareness and Training (§164.308(a)(5))

**Requirement**: Implement a security awareness and training program for all workforce members.

**Implementation**:

1. **Security Reminders (Addressable)**: Quarterly HIPAA training refreshers
2. **Protection from Malicious Software (Addressable)**: Code review for security vulnerabilities
3. **Log-in Monitoring (Addressable)**: Automated anomaly detection on audit logs
4. **Password Management (Addressable)**: API key rotation quarterly, multi-factor authentication for human users

### Security Incident Procedures (§164.308(a)(6))

**Requirement**: Implement policies and procedures to address security incidents.

**Implementation**:

1. **Response and Reporting (Required)**: See Incident Response Procedures section above
2. **Classification**: Critical, High, Medium, Low based on PHI exposure
3. **Escalation**: Security Team → Privacy Officer → Legal Counsel → Executive Leadership
4. **Documentation**: Incident report with timeline, affected systems, PHI exposure details

### Contingency Plan (§164.308(a)(7))

**Requirement**: Establish policies and procedures for responding to an emergency or other occurrence that damages systems containing ePHI.

**Implementation**:

1. **Data Backup Plan (Required)**: Daily encrypted backups to R2 bucket, 6-year retention
2. **Disaster Recovery Plan (Required)**: Cloudflare multi-region redundancy, automatic failover
3. **Emergency Mode Operation Plan (Required)**: Manual PMS access if agent system fails
4. **Testing and Revision Procedures (Addressable)**: Quarterly disaster recovery drills

### Evaluation (§164.308(a)(8))

**Requirement**: Perform a periodic technical and nontechnical evaluation of security measures.

**Implementation**:

1. **Annual Security Risk Assessment**: Using template above
2. **Quarterly Penetration Testing**: Third-party security audits
3. **Monthly Code Review**: Security-focused code review for all PHI-accessing code
4. **Weekly Audit Log Review**: Automated anomaly detection, manual review

### Business Associate Contracts (§164.308(b)(1))

**Requirement**: Obtain satisfactory assurances that any business associates will appropriately safeguard ePHI.

**Implementation**:

1. **Written Contract (Required)**: BAAs with all vendors (see Required Business Associate Agreements)
2. **BAA Registry**: Tracked in D1 database with renewal dates, contact information
3. **Vendor Audit Rights**: Quarterly vendor compliance reviews

---

## Conclusion

This HIPAA Compliance Documentation provides the framework for protecting Protected Health Information (PHI) within the Dental Practice Management Agent System. All workflows, agents, and API endpoints must adhere to these requirements.

### Key Compliance Principles

1. **Minimum Necessary**: Access only the PHI required for the specific task
2. **Audit Everything**: All PHI access logged with 6-year retention
3. **Encrypt in Transit and at Rest**: TLS 1.3, AES-256-GCM
4. **Incident Response**: 60-day notification requirement for breaches
5. **Business Associate Agreements**: Required for all third-party vendors
6. **Risk Assessment**: Annual security risk assessment and mitigation

### Questions or Concerns

Contact the Privacy Officer at privacy@createsomething.agency or the Security Team at security@createsomething.agency.

---

**Document Version History**:
- v1.0 (2026-01-12): Initial documentation covering minimum necessary PHI, audit logging, incident response, BAAs, data retention, risk assessment template, and technical/administrative safeguards.
