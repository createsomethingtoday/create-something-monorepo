# Security Audit Checklist

Comprehensive security testing procedures for the Dental Practice Management Agent system.

## Purpose

This checklist ensures all security controls are properly implemented and functioning before production deployment. Each section includes specific test procedures, expected outcomes, and remediation guidance.

---

## 1. HMAC-SHA256 Confirmation Link Security

**Purpose**: Verify patient confirmation links are tamper-proof and time-limited.

### Test Procedures

#### 1.1 Valid Signature Verification

```python
# Test: Generate confirmation link and verify signature
from create_something_agents.notifications.patient_outreach import (
    generate_confirmation_link,
    verify_confirmation_link
)

# Test case 1: Valid link within expiry window
link = generate_confirmation_link("patient123", "appt456", "secret_key_here")
result = verify_confirmation_link(link, "secret_key_here")

assert result["valid"] == True
assert result["patient_id"] == "patient123"
assert result["appointment_id"] == "appt456"
```

**Expected Result**: Valid link returns `valid=True` with correct patient and appointment IDs.

#### 1.2 Expired Link Rejection

```python
# Test: Link older than 24 hours should be rejected
import time

link = generate_confirmation_link("patient123", "appt456", "secret_key_here")
time.sleep(24 * 60 * 60 + 1)  # Wait 24 hours + 1 second

result = verify_confirmation_link(link, "secret_key_here")

assert result["valid"] == False
assert result["error"] == "expired"
```

**Expected Result**: Expired links return `valid=False` with `error="expired"`.

#### 1.3 Tampered Signature Detection

```python
# Test: Modified link should fail verification
link = generate_confirmation_link("patient123", "appt456", "secret_key_here")

# Tamper with the link (change patient ID in URL)
tampered_link = link.replace("patient123", "patient999")

result = verify_confirmation_link(tampered_link, "secret_key_here")

assert result["valid"] == False
assert result["error"] == "invalid_signature"
```

**Expected Result**: Tampered links return `valid=False` with `error="invalid_signature"`.

#### 1.4 Wrong Secret Key Rejection

```python
# Test: Link verified with different secret key should fail
link = generate_confirmation_link("patient123", "appt456", "secret_key_1")

result = verify_confirmation_link(link, "secret_key_2")

assert result["valid"] == False
assert result["error"] == "invalid_signature"
```

**Expected Result**: Wrong secret key returns `valid=False` with `error="invalid_signature"`.

**✅ Pass Criteria**: All 4 tests pass. Links are tamper-proof, time-limited, and secret-key-dependent.

---

## 2. Timing Attack Prevention

**Purpose**: Verify constant-time comparison prevents timing attacks on HMAC signature verification.

### Test Procedures

#### 2.1 Signature Comparison Timing Consistency

```python
import time
import statistics

# Test: Measure verification time for correct vs incorrect signatures
# Timing should be constant regardless of signature match

times_correct = []
times_incorrect = []

for _ in range(1000):
    link = generate_confirmation_link("patient123", "appt456", "secret_key")

    # Time correct signature verification
    start = time.perf_counter()
    verify_confirmation_link(link, "secret_key")
    times_correct.append(time.perf_counter() - start)

    # Time incorrect signature verification
    tampered = link.replace("patient123", "patient999")
    start = time.perf_counter()
    verify_confirmation_link(tampered, "secret_key")
    times_incorrect.append(time.perf_counter() - start)

# Calculate statistics
mean_correct = statistics.mean(times_correct)
mean_incorrect = statistics.mean(times_incorrect)
ratio = mean_incorrect / mean_correct

# Timing should be within 10% variance (constant-time comparison)
assert 0.9 <= ratio <= 1.1, f"Timing variance {ratio:.2f}x indicates potential timing attack"
```

**Expected Result**: Verification timing is consistent for correct and incorrect signatures (ratio 0.9-1.1x).

**Implementation Requirement**: Use `hmac.compare_digest()` for constant-time comparison, not `==`.

**✅ Pass Criteria**: Timing ratio between 0.9 and 1.1 (within 10% variance).

---

## 3. Rate Limiting Enforcement

**Purpose**: Verify 3 notifications per patient per day limit is enforced.

### Test Procedures

#### 3.1 Normal Usage Within Limit

```python
from create_something_agents.notifications.patient_outreach import (
    send_waitlist_notification,
    check_rate_limit
)
from datetime import datetime

patient_id = "patient123"

# Send 3 notifications (should all succeed)
for i in range(3):
    status = await check_rate_limit(patient_id, datetime.now())
    assert status.allowed == True, f"Notification {i+1} should be allowed"

    # Simulate sending notification
    result = await send_waitlist_notification(patient_id, ...)
    assert result.success == True
```

**Expected Result**: First 3 notifications allowed within 24-hour window.

#### 3.2 Rate Limit Enforcement at Boundary

```python
# Test: 4th notification within 24 hours should be blocked
for i in range(3):
    await send_waitlist_notification(patient_id, ...)

# 4th notification should be blocked
status = await check_rate_limit(patient_id, datetime.now())
assert status.allowed == False
assert status.next_available is not None
```

**Expected Result**: 4th notification blocked with `allowed=False` and `next_available` timestamp.

#### 3.3 Rate Limit Reset After 24 Hours

```python
import asyncio

# Send 3 notifications
for i in range(3):
    await send_waitlist_notification(patient_id, ...)

# Wait 24 hours + 1 second
await asyncio.sleep(24 * 60 * 60 + 1)

# Should now be allowed again
status = await check_rate_limit(patient_id, datetime.now())
assert status.allowed == True
```

**Expected Result**: Rate limit resets after 24-hour sliding window expires.

#### 3.4 Per-Patient Isolation

```python
# Test: Rate limits are isolated per patient_id

patient_1 = "patient123"
patient_2 = "patient456"

# Send 3 notifications to patient 1
for i in range(3):
    await send_waitlist_notification(patient_1, ...)

# Patient 2 should not be affected
status = await check_rate_limit(patient_2, datetime.now())
assert status.allowed == True
```

**Expected Result**: Rate limits apply per-patient, not globally.

**✅ Pass Criteria**: All 4 tests pass. Rate limiting enforces 3/day limit with 24-hour sliding window.

---

## 4. PHI Leakage Audit

**Purpose**: Verify no Protected Health Information appears in logs, error messages, or API responses.

### Test Procedures

#### 4.1 Log File Audit

```bash
# Search all application logs for common PHI patterns

# Names (look for capitalized words in patient contexts)
grep -Ri "patient.*[A-Z][a-z]+ [A-Z][a-z]+" /var/log/dental-agent/ | grep -v "patient_id"

# Date of birth patterns (MM/DD/YYYY, YYYY-MM-DD)
grep -Ri "\b\d{2}/\d{2}/\d{4}\b" /var/log/dental-agent/
grep -Ri "\b\d{4}-\d{2}-\d{2}\b" /var/log/dental-agent/ | grep -v "timestamp\|created_at\|updated_at"

# Social Security Numbers (XXX-XX-XXXX)
grep -Ri "\b\d{3}-\d{2}-\d{4}\b" /var/log/dental-agent/

# Phone numbers (various formats)
grep -Ri "\b\d{3}[-. ]\d{3}[-. ]\d{4}\b" /var/log/dental-agent/ | grep -v "correlation_id"

# Email addresses (must be practice emails, not patient emails)
grep -Ri "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}" /var/log/dental-agent/ | grep -v "@dental-practice.com\|@createsomething.io"

# Addresses (street numbers + street names)
grep -Ri "\b\d+ [A-Z][a-z]+ (Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)\b" /var/log/dental-agent/
```

**Expected Result**: Zero matches for PHI patterns. Only de-identified references (patient_id, appointment_id, correlation_id) should appear.

#### 4.2 Code Audit for PHI Logging

```bash
# Search source code for potential PHI logging

# Find all logger calls
grep -Rn "logger\.\(info\|error\|warning\|debug\)" packages/agent-sdk/src/

# For each logger call, verify:
# 1. No patient name, DOB, SSN, address variables
# 2. Only patient_id, appointment_id, correlation_id used
# 3. No f-strings with patient data objects

# Example violations to flag:
# logger.info(f"Patient {patient.name} scheduled")  # ❌ Contains name
# logger.info(f"DOB: {patient.dob}")                # ❌ Contains DOB
# logger.info(f"Processing patient {patient_id}")   # ✅ De-identified
```

**Manual Review Required**: Audit each logger call to verify no PHI variables are logged.

#### 4.3 Error Message Audit

```python
# Test: Error messages should not expose PHI

# Test case 1: Invalid patient ID (should not echo patient data)
try:
    result = await process_no_show_recovery({
        "patient_id": "test123",
        "name": "John Doe",  # PHI
        "phone": "555-1234"  # PHI
    })
except ValueError as e:
    error_msg = str(e)
    assert "John Doe" not in error_msg, "Error message contains patient name"
    assert "555-1234" not in error_msg, "Error message contains phone number"

# Test case 2: Validation errors should be generic
try:
    result = await verify_insurance_eligibility({
        "patient_dob": "1985-03-15",  # PHI
        "insurer_id": "invalid"
    })
except ValueError as e:
    error_msg = str(e)
    assert "1985-03-15" not in error_msg, "Error message contains DOB"
```

**Expected Result**: Error messages contain only de-identified references, never PHI values.

**✅ Pass Criteria**:
- Zero PHI patterns in logs
- All logger calls audited and compliant
- Error messages contain no PHI

---

## 5. Transaction Atomicity Testing

**Purpose**: Verify appointment booking operations are all-or-nothing (no partial updates).

### Test Procedures

#### 5.1 Successful Booking (All Steps Complete)

```python
from create_something_agents.workflows.no_show_recovery import (
    book_appointment_from_waitlist
)

# Test: All steps complete successfully
result = await book_appointment_from_waitlist(
    no_show_slot=sample_slot,
    waitlist_patient=sample_patient,
    pms_client=mock_pms,
    correlation_id="test-123"
)

# Verify all operations completed
assert result.success == True
assert mock_pms.appointment_updated == True  # Step 1: Update appointment
assert mock_pms.patient_removed_from_waitlist == True  # Step 2: Remove from waitlist
assert mock_pms.notification_sent == True  # Step 3: Send notification
assert mock_pms.audit_logged == True  # Step 4: Log audit trail
```

**Expected Result**: All 4 steps complete when booking succeeds.

#### 5.2 Failure During Step 2 (Rollback Step 1)

```python
# Test: If waitlist removal fails, appointment update should rollback

# Configure mock to fail on step 2
mock_pms.fail_on_waitlist_removal = True

result = await book_appointment_from_waitlist(...)

# Verify rollback
assert result.success == False
assert mock_pms.appointment_updated == False  # Step 1 rolled back
assert mock_pms.patient_removed_from_waitlist == False  # Step 2 failed
assert mock_pms.notification_sent == False  # Step 3 not attempted
```

**Expected Result**: Failed operation rolls back any completed steps (all-or-nothing).

#### 5.3 Network Timeout During Step 3

```python
# Test: Notification timeout should not leave appointment in inconsistent state

mock_pms.timeout_on_notification = True

result = await book_appointment_from_waitlist(...)

# Verify consistent state (either all complete or all rolled back)
if result.success:
    assert all([
        mock_pms.appointment_updated,
        mock_pms.patient_removed_from_waitlist,
        mock_pms.notification_sent,
        mock_pms.audit_logged
    ])
else:
    assert not any([
        mock_pms.appointment_updated,
        mock_pms.patient_removed_from_waitlist,
        mock_pms.notification_sent
    ])
```

**Expected Result**: No partial updates (appointment never in inconsistent state).

**✅ Pass Criteria**:
- All success: all 4 steps complete
- Any failure: all steps rolled back
- No partial updates

---

## 6. Encryption Verification

**Purpose**: Verify all data transmission and storage uses proper encryption.

### Test Procedures

#### 6.1 TLS 1.3+ for All API Calls

```python
import ssl
import httpx

# Test: All PMS API calls use TLS 1.3+
async with httpx.AsyncClient() as client:
    # Make test API call
    response = await client.get("https://pms-api.example.com/test")

    # Verify TLS version
    ssl_version = response.extensions.get('tls_version')
    assert ssl_version in ['TLSv1.3', 'TLSv1.2'], f"Insecure TLS version: {ssl_version}"

    # Verify certificate
    cert = response.extensions.get('peer_certificate')
    assert cert is not None, "No SSL certificate"
    assert cert.not_valid_after > datetime.now(), "Certificate expired"
```

**Expected Result**: All HTTPS connections use TLS 1.2+ (preferably TLS 1.3).

#### 6.2 AES-256 Encryption for PMS Credentials

```bash
# Test: Verify D1 database stores encrypted PMS credentials

# Query practice config from D1
wrangler d1 execute dental-agent-db \
  --command "SELECT practice_id, encrypted_credentials FROM practice_configs LIMIT 1"

# Verify credentials field:
# 1. Should not contain plaintext API keys
# 2. Should be base64-encoded ciphertext
# 3. Should be ~200+ characters (AES-256-GCM output)

# Example verification:
echo "encrypted_value_here" | base64 -d | wc -c
# Output should be > 150 bytes (indicating encrypted payload + auth tag)
```

**Expected Result**:
- No plaintext credentials in database
- Encrypted values are base64-encoded
- Encrypted payload size indicates AES-256-GCM (16-byte auth tag)

#### 6.3 Audit Log Encryption at Rest

```bash
# Test: Verify Cloudflare KV stores audit logs securely

# KV namespaces use encryption-at-rest by default, but verify:
wrangler kv:key get "audit:test-correlation-id" \
  --namespace-id=YOUR_AUDIT_LOG_NAMESPACE_ID

# Verify:
# 1. Audit log contains correlation_id (not PHI)
# 2. Timestamp is in UTC ISO format
# 3. Patient/appointment IDs are de-identified references
```

**Expected Result**: Audit logs contain only de-identified data, encrypted at rest by Cloudflare KV.

**✅ Pass Criteria**:
- TLS 1.2+ for all connections
- AES-256 encryption for PMS credentials
- Cloudflare KV encryption-at-rest enabled

---

## 7. Correlation ID Threading Verification

**Purpose**: Verify correlation IDs flow through entire request lifecycle for audit tracing.

### Test Procedures

#### 7.1 End-to-End Correlation ID Flow

```python
# Test: Correlation ID propagates from edge → coordinator → workflow → PMS

# Step 1: Generate correlation ID at edge
correlation_id = f"dental-{uuid.uuid4()}"

# Step 2: Call coordinator with correlation ID
coordinator_result = await daily_operations(
    practice_id="practice123",
    pms_config=mock_config,
    correlation_id=correlation_id
)

# Step 3: Verify correlation ID in all audit logs
audit_logs = await get_audit_logs(correlation_id=correlation_id)

# All operations should share same correlation ID
for log in audit_logs:
    assert log["correlation_id"] == correlation_id

# Expected log entries:
# 1. Edge router receives request (correlation_id generated)
# 2. Coordinator starts daily operations (correlation_id threaded)
# 3. No-show workflow executes (correlation_id in all PMS calls)
# 4. Insurance workflow executes (correlation_id in all API calls)
# 5. Recall workflow executes (correlation_id in all notifications)
```

**Expected Result**: Single correlation ID appears in all audit logs for a request.

#### 7.2 Correlation ID in Error Logs

```python
# Test: Failed operations include correlation ID for debugging

try:
    result = await book_appointment_from_waitlist(
        ...,
        correlation_id=correlation_id
    )
except Exception as e:
    # Error should include correlation ID
    assert correlation_id in str(e) or hasattr(e, 'correlation_id')

    # Error audit log should include correlation ID
    error_log = await get_audit_log(correlation_id=correlation_id, outcome="failure")
    assert error_log is not None
    assert error_log["correlation_id"] == correlation_id
```

**Expected Result**: Error messages and logs include correlation ID for tracing failed requests.

**✅ Pass Criteria**:
- Correlation ID present in all audit logs for a request
- Failed operations log correlation ID
- End-to-end tracing works from edge to PMS

---

## 8. Penetration Testing Procedures

**Purpose**: Identify vulnerabilities through simulated attacks.

### Test Procedures

#### 8.1 HMAC Signature Brute Force Attack

```python
# Test: Verify HMAC signature cannot be brute-forced in reasonable time

import itertools
import string

link = generate_confirmation_link("patient123", "appt456", "secret_key")

# Attempt brute force attack (1 million attempts)
charset = string.ascii_letters + string.digits
attempts = 0
found = False

for candidate in itertools.product(charset, repeat=10):
    attempts += 1
    if attempts > 1_000_000:
        break

    # Try candidate signature
    tampered = link.replace(link.split('&sig=')[1], ''.join(candidate))
    result = verify_confirmation_link(tampered, "secret_key")

    if result["valid"]:
        found = True
        break

assert found == False, "HMAC signature brute-forced!"
assert attempts == 1_000_000, "Did not test enough candidates"
```

**Expected Result**: 1 million brute force attempts fail to find valid signature (HMAC-SHA256 is cryptographically secure).

#### 8.2 SQL Injection Testing

```python
# Test: Verify PMS API calls sanitize inputs

# Attempt SQL injection via patient_id
malicious_patient_id = "'; DROP TABLE appointments; --"

try:
    result = await get_appointments(
        patient_id=malicious_patient_id,
        pms_client=mock_pms
    )

    # Verify malicious input was escaped/sanitized
    assert mock_pms.query_executed != "SELECT * FROM appointments WHERE patient_id = ''; DROP TABLE appointments; --'"

except ValueError as e:
    # Should reject invalid input format
    assert "invalid patient_id format" in str(e).lower()
```

**Expected Result**: SQL injection attempts are sanitized or rejected with validation error.

#### 8.3 Rate Limit Bypass Attempts

```python
# Test: Verify rate limiting cannot be bypassed with parallel requests

import asyncio

patient_id = "patient123"

# Send 10 concurrent notifications (only 3 should succeed)
tasks = [send_waitlist_notification(patient_id, ...) for _ in range(10)]
results = await asyncio.gather(*tasks, return_exceptions=True)

successful = sum(1 for r in results if r and r.success)
assert successful == 3, f"Rate limit bypassed: {successful} notifications sent (expected 3)"
```

**Expected Result**: Concurrent requests respect 3/day rate limit (no bypass).

**✅ Pass Criteria**:
- HMAC signatures resist brute force
- SQL injection attempts sanitized
- Rate limiting not bypassable with concurrency

---

## 9. Incident Response Readiness

**Purpose**: Verify security incident response procedures are documented and tested.

### Test Procedures

#### 9.1 Breach Notification Simulation

**Scenario**: Audit log reveals unauthorized PHI access.

**Procedure**:
1. Detection (0-1 hour):
   - Review audit logs for anomalous access patterns
   - Identify correlation_id of unauthorized access
   - Determine PHI fields accessed
   - Assess number of patients affected

2. Containment (1-24 hours):
   - Disable compromised API keys
   - Rotate secrets and credentials
   - Block attacker IP addresses
   - Review recent access patterns for additional compromise

3. Assessment (1-24 hours):
   - Determine if breach meets HIPAA notification threshold (>500 patients or high-risk PHI)
   - Document timeline of events
   - Identify root cause (misconfiguration, vulnerability, insider threat)

4. Notification (24-60 days):
   - Notify affected patients (if ≥500 or high-risk PHI)
   - Notify HHS (if ≥500 patients)
   - Notify media (if ≥500 patients in same jurisdiction)
   - Document all notifications sent

**Test**: Run tabletop exercise with security team, simulate breach scenario, verify all steps documented.

**✅ Pass Criteria**: Incident response plan documented, team trained, contact information current.

---

## 10. Audit Checklist Summary

Before production deployment, verify:

### HMAC Confirmation Links
- [ ] Valid links verify correctly
- [ ] Expired links (>24h) are rejected
- [ ] Tampered signatures detected
- [ ] Wrong secret keys rejected
- [ ] Constant-time comparison (hmac.compare_digest) used

### Rate Limiting
- [ ] 3 notifications/day limit enforced
- [ ] 4th notification blocked
- [ ] 24-hour sliding window resets correctly
- [ ] Per-patient isolation (not global limit)

### PHI Protection
- [ ] No PHI in logs (only patient_id, correlation_id)
- [ ] No PHI in error messages
- [ ] All logger calls audited and compliant
- [ ] Grep audit finds zero PHI patterns

### Transaction Safety
- [ ] Successful booking completes all steps
- [ ] Failed operations roll back all steps
- [ ] No partial updates possible

### Encryption
- [ ] TLS 1.3+ for all HTTPS connections
- [ ] AES-256 for PMS credentials at rest
- [ ] Cloudflare KV encryption-at-rest enabled

### Audit Trail
- [ ] Correlation IDs thread through all operations
- [ ] Error logs include correlation IDs
- [ ] End-to-end tracing works
- [ ] 6-year retention configured (189,216,000 seconds)

### Penetration Testing
- [ ] HMAC brute force resistance verified
- [ ] SQL injection attempts sanitized
- [ ] Rate limit bypass attempts fail

### Incident Response
- [ ] Breach notification procedure documented
- [ ] Security team trained on procedures
- [ ] Contact information current (HHS, patients, media)
- [ ] Tabletop exercise completed

---

## Remediation Guidance

| Finding | Severity | Remediation | Verification |
|---------|----------|-------------|--------------|
| PHI in logs | **Critical** | Remove PHI logging, use only patient_id references | Re-run log audit (grep) |
| TLS < 1.2 | **High** | Upgrade httpx client config to require TLS 1.2+ | Re-test SSL version |
| Weak HMAC key | **High** | Rotate to 256-bit random key, update key management | Re-test signature generation |
| Rate limit bypass | **Medium** | Add locking mechanism for concurrent checks | Re-test concurrent requests |
| Missing correlation IDs | **Medium** | Add correlation_id parameter to all workflows | Re-test end-to-end flow |
| Partial updates | **High** | Implement database transactions with rollback | Re-test failure scenarios |

---

## Continuous Security Monitoring

**Quarterly Tasks**:
- [ ] Re-run PHI leakage audit (grep logs)
- [ ] Review audit logs for anomalous access patterns
- [ ] Rotate PMS credentials and HMAC secret keys
- [ ] Re-test rate limiting enforcement
- [ ] Update incident response contact information

**Annual Tasks**:
- [ ] Full penetration testing by third party
- [ ] Security risk assessment update
- [ ] HIPAA compliance training for development team
- [ ] Review and update Business Associate Agreements
- [ ] Disaster recovery drill

---

## Legal References

- **HIPAA Security Rule 45 CFR 164.308(a)(1)(ii)(A)**: Risk Analysis
- **HIPAA Security Rule 45 CFR 164.308(a)(5)**: Security Awareness Training
- **HIPAA Security Rule 45 CFR 164.312(a)(1)**: Access Control
- **HIPAA Security Rule 45 CFR 164.312(b)**: Audit Controls
- **HIPAA Security Rule 45 CFR 164.312(c)(1)**: Integrity Controls
- **HIPAA Security Rule 45 CFR 164.312(e)(1)**: Transmission Security
- **HIPAA Breach Notification Rule 45 CFR 164.404**: Notification to Individuals
- **HIPAA Breach Notification Rule 45 CFR 164.408**: Notification to HHS

---

## Related Documentation

- [HIPAA Compliance Documentation](./HIPAA_COMPLIANCE.md) - Minimum necessary PHI, BAAs, data retention
- [Dental API Integration Patterns](../../.claude/rules/dental-api-integration.md) - PMS system integration
- [Dental Scheduling Patterns](../../.claude/rules/dental-scheduling.md) - Workflow implementation details
