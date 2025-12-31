# HIPAA Compliance Guide

**CRITICAL DISCLAIMER**: This template provides a foundation for HIPAA compliance but **does not guarantee compliance**. Deployers are responsible for conducting their own security assessments, obtaining Business Associate Agreements (BAAs), and consulting with healthcare compliance experts.

## Status: ARCHITECTURE REVIEW

This document outlines HIPAA compliance considerations for the Medical Practice template. The template is designed with HIPAA-conscious architecture but requires additional configuration and legal review before handling Protected Health Information (PHI).

## What is HIPAA?

The Health Insurance Portability and Accountability Act (HIPAA) protects sensitive patient health information from disclosure without patient consent or knowledge. Covered entities (healthcare providers) and business associates (service providers) must implement safeguards to protect PHI.

## Architecture Overview

### Current Template Scope

This template provides:
- ✅ Static website with informational content
- ✅ Contact/appointment request forms (non-PHI)
- ✅ HTTPS-only architecture via Cloudflare
- ✅ Encrypted data storage (D1, R2)
- ✅ Access logging capabilities
- ✅ Secure session management (KV)

This template **does NOT** provide:
- ❌ Electronic Health Records (EHR) system
- ❌ Prescription management
- ❌ Patient diagnostic information storage
- ❌ Clinical decision support
- ❌ Medical billing systems

## HIPAA Compliance Checklist

### Technical Safeguards (Required by HIPAA)

#### 1. Access Control (§164.312(a)(1))

**Current Implementation:**
- Cloudflare Access can be configured for authenticated endpoints
- KV namespace for session management
- No authentication implemented in base template

**Deployer Requirements:**
- [ ] Implement user authentication for patient portal (if applicable)
- [ ] Configure role-based access control (RBAC)
- [ ] Set up unique user IDs for all users accessing PHI
- [ ] Implement automatic logoff after inactivity period
- [ ] Enable audit logs for all PHI access

**Recommended Solutions:**
- Auth0 / Clerk for authentication
- Cloudflare Access for infrastructure protection
- Custom middleware for RBAC

#### 2. Audit Controls (§164.312(b))

**Current Implementation:**
- Cloudflare logs HTTP requests (IP, timestamp, endpoint)
- D1 database can log queries
- R2 access logging available

**Deployer Requirements:**
- [ ] Enable Cloudflare Logpush to external SIEM
- [ ] Implement application-level audit logging
- [ ] Log all PHI access, modifications, deletions
- [ ] Store logs for minimum 6 years
- [ ] Implement log monitoring and alerting

**Recommended Solutions:**
- Cloudflare Logpush to AWS S3/Azure Blob
- Datadog / Splunk for log analysis
- Custom audit table in D1 for application events

#### 3. Integrity Controls (§164.312(c)(1))

**Current Implementation:**
- Data at rest encrypted in D1 and R2 (AES-256)
- TLS 1.3 for data in transit
- Cloudflare validates request integrity

**Deployer Requirements:**
- [ ] Implement checksums/hashing for PHI records
- [ ] Version control for PHI modifications
- [ ] Validate data integrity on read
- [ ] Implement tamper detection mechanisms

#### 4. Transmission Security (§164.312(e)(1))

**Current Implementation:**
- ✅ HTTPS-only (enforced by Cloudflare Pages)
- ✅ TLS 1.3 encryption
- ✅ HSTS headers enabled
- ✅ Secure WebSocket connections (if needed)

**Deployer Requirements:**
- [ ] Verify TLS configuration (A+ rating on SSL Labs)
- [ ] Disable insecure protocols (TLS 1.0, 1.1)
- [ ] Implement certificate pinning for critical endpoints
- [ ] Encrypt emails containing PHI (S/MIME or PGP)

### Administrative Safeguards

#### 1. Security Management Process (§164.308(a)(1))

**Deployer Requirements:**
- [ ] Conduct annual risk assessments
- [ ] Document security policies and procedures
- [ ] Implement incident response plan
- [ ] Establish disaster recovery procedures
- [ ] Regular security training for staff

#### 2. Workforce Security (§164.308(a)(3))

**Deployer Requirements:**
- [ ] Background checks for users with PHI access
- [ ] Signed confidentiality agreements
- [ ] Access authorization procedures
- [ ] Workforce clearance procedures
- [ ] Termination procedures (revoke access)

#### 3. Business Associate Agreements (§164.308(b)(1))

**CRITICAL**: You must obtain BAAs from all third-party services handling PHI.

**Cloudflare BAA:**
- Enterprise plan required for BAA
- Covers Pages, Workers, D1, R2, KV
- Contact Cloudflare sales for BAA execution
- [Cloudflare HIPAA Compliance](https://www.cloudflare.com/trust-hub/compliance-resources/hipaa/)

**Other Service Providers Requiring BAAs:**
- [ ] Calendly (appointment scheduling) - **BAA available**
- [ ] SendGrid (email notifications) - **BAA available with Pro plan**
- [ ] Twilio (SMS notifications) - **BAA available**
- [ ] Auth0/Clerk (authentication) - **BAA available**
- [ ] Datadog/Splunk (logging) - **BAA available**
- [ ] Any EHR integration partner

### Physical Safeguards

**Note**: Most physical safeguards are handled by infrastructure providers (Cloudflare, AWS via Cloudflare).

**Deployer Responsibilities:**
- [ ] Verify data center compliance (SOC 2, HIPAA)
- [ ] Restrict physical access to devices accessing PHI
- [ ] Implement device encryption for workstations
- [ ] Secure disposal of devices/media

## What Data is Protected Health Information (PHI)?

PHI includes any individually identifiable health information:

**Identifiers (18 types):**
1. Names
2. Addresses (more specific than state)
3. Dates (birth, admission, discharge, death, etc.)
4. Phone/fax numbers
5. Email addresses
6. Social Security numbers
7. Medical record numbers
8. Health plan beneficiary numbers
9. Account numbers
10. Certificate/license numbers
11. Vehicle identifiers and serial numbers
12. Device identifiers and serial numbers
13. Web URLs
14. IP addresses
15. Biometric identifiers (fingerprints, voiceprints)
16. Full-face photos
17. Any other unique identifying number, characteristic, or code

**Health Information:**
- Medical history
- Diagnoses
- Treatment plans
- Prescriptions
- Lab results
- Insurance information
- Billing records

## Template Data Handling Analysis

### Contact Form (Non-PHI)

**File**: `src/routes/contact/+page.svelte`

**Current Implementation:**
- Collects: Name, phone, email, message
- No patient health information collected
- No medical record linkage

**HIPAA Status**: ✅ **NOT PHI** (general contact information without health context)

**Recommendations:**
- Keep form simple and non-medical
- Add disclaimer: "Do not include medical information in this form"
- For urgent medical needs, direct to phone/emergency services

### Appointment Booking (Potential PHI)

**Template Config**: `src/lib/config/site.ts`

**Current Implementation:**
- Links to external Calendly
- No appointment data stored in template
- Patient forms referenced but not implemented

**HIPAA Considerations:**
- Appointment dates/times linked to patient = PHI
- Reason for visit = PHI
- Patient demographic information = PHI

**If Implementing Internal Booking:**
- [ ] Obtain Calendly BAA (or equivalent)
- [ ] Encrypt appointment data in D1
- [ ] Implement access controls
- [ ] Add audit logging
- [ ] Patient consent for appointment reminders

### Patient Forms (Not Implemented)

**Template Config**: `newPatients.forms` (empty array)

**HIPAA Requirements if Implementing:**
- [ ] Encrypt forms in R2 bucket
- [ ] Implement access controls (patient + authorized staff only)
- [ ] Audit log all form access
- [ ] Secure form submission (HTTPS + validation)
- [ ] Data retention policy
- [ ] Patient consent for data collection

**Recommended Implementation:**
```typescript
// src/routes/api/patient-intake/+server.ts
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, platform }) => {
  // 1. Validate authentication
  const user = await authenticateUser(request);
  if (!user) return new Response('Unauthorized', { status: 401 });

  // 2. Validate and sanitize input
  const formData = await request.formData();
  const sanitizedData = sanitizePatientData(formData);

  // 3. Encrypt PHI before storage
  const encryptedData = await encryptPHI(sanitizedData);

  // 4. Store in D1 with audit log
  await platform.env.DB.prepare(
    'INSERT INTO patient_forms (patient_id, form_type, data, created_at) VALUES (?, ?, ?, ?)'
  ).bind(user.id, 'intake', encryptedData, Date.now()).run();

  // 5. Audit log
  await logAudit(platform.env.DB, {
    action: 'patient_form_submission',
    user_id: user.id,
    ip: request.headers.get('CF-Connecting-IP'),
    timestamp: Date.now()
  });

  return new Response('Form submitted', { status: 200 });
};
```

### Database Configuration (D1)

**File**: `wrangler.toml`

**Current Implementation:**
- Shared database with templates platform
- Encryption at rest (AES-256)
- Regional data residency available

**HIPAA Compliance Actions:**
- [ ] Use dedicated D1 database (not shared)
- [ ] Enable Cloudflare Enterprise for BAA
- [ ] Configure regional data residency (if required)
- [ ] Implement row-level encryption for PHI columns
- [ ] Set up automated backups (7-year retention)

**Updated `wrangler.toml`:**
```toml
[[d1_databases]]
binding = "DB"
database_name = "medical-practice-hipaa-db"  # Dedicated database
database_id = "YOUR_DATABASE_ID"

# Regional data residency (requires Enterprise)
# [env.production.d1_databases.region]
# location = "us-east-1"  # or as required
```

### Storage Configuration (R2)

**File**: `wrangler.toml`

**Current Implementation:**
- R2 bucket for patient documents
- Encryption at rest (AES-256)
- Versioning available

**HIPAA Compliance Actions:**
- [ ] Enable R2 object versioning
- [ ] Configure lifecycle policies (retention + deletion)
- [ ] Implement access controls (presigned URLs only)
- [ ] Audit logging for all object access
- [ ] Regular access reviews

**Recommended R2 Configuration:**
```typescript
// src/lib/utils/secure-storage.ts
export async function uploadPatientDocument(
  r2: R2Bucket,
  patientId: string,
  file: File
): Promise<string> {
  // 1. Validate file type and size
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type');
  }

  // 2. Generate secure key with patient ID isolation
  const key = `patients/${patientId}/documents/${crypto.randomUUID()}-${file.name}`;

  // 3. Add metadata for audit
  const customMetadata = {
    uploadedBy: userId,
    uploadedAt: new Date().toISOString(),
    patientId: patientId,
    originalFilename: file.name
  };

  // 4. Upload with metadata
  await r2.put(key, file, {
    customMetadata,
    httpMetadata: {
      contentType: file.type,
    }
  });

  // 5. Audit log
  await logAudit(db, {
    action: 'document_upload',
    resource: key,
    patient_id: patientId
  });

  return key;
}

export async function getPatientDocument(
  r2: R2Bucket,
  key: string,
  userId: string
): Promise<Response> {
  // 1. Verify access permissions
  const hasAccess = await verifyDocumentAccess(userId, key);
  if (!hasAccess) throw new Error('Access denied');

  // 2. Generate time-limited presigned URL (5 min expiry)
  const object = await r2.get(key);
  if (!object) throw new Error('Document not found');

  // 3. Audit log
  await logAudit(db, {
    action: 'document_access',
    resource: key,
    accessed_by: userId
  });

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata.contentType,
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, no-cache, no-store, must-revalidate'
    }
  });
}
```

### Session Management (KV)

**Current Implementation:**
- KV namespace for caching and sessions
- TTL-based expiration

**HIPAA Compliance Actions:**
- [ ] Implement automatic session timeout (15 min recommended)
- [ ] Encrypt session data
- [ ] Invalidate sessions on logout
- [ ] Monitor for session hijacking attempts

## Minimum Necessary Standard

HIPAA requires limiting PHI use/disclosure to the "minimum necessary" amount.

**Template Implementations:**
- Only request information needed for specific purpose
- Limit form fields to essential data
- Role-based access to minimize PHI exposure
- Anonymize data when PHI identifiers not needed

## Patient Rights Under HIPAA

Deployers must implement mechanisms for:

1. **Right to Access** (§164.524)
   - Patients can request copies of their PHI
   - Must provide within 30 days
   - Reasonable copying fees allowed

2. **Right to Amend** (§164.526)
   - Patients can request corrections
   - Must respond within 60 days

3. **Right to Accounting of Disclosures** (§164.528)
   - Track all PHI disclosures
   - Provide accounting upon request

4. **Right to Restrict Use** (§164.522)
   - Patients can request restrictions
   - Must agree or negotiate

## Breach Notification Requirements

If PHI is accessed, acquired, or disclosed in violation of HIPAA:

**Timeline:**
- Notify affected individuals within 60 days
- Notify HHS if 500+ individuals affected
- Notify media if 500+ individuals in same state

**Breach Prevention:**
- [ ] Implement breach detection monitoring
- [ ] Create incident response plan
- [ ] Regular security testing (penetration tests)
- [ ] Staff training on breach protocols

## WORKWAY Workflows and HIPAA

The template references WORKWAY workflows for:
- Appointment booking
- Appointment reminders
- New patient intake

**HIPAA Considerations:**

### Appointment Reminders
**PHI Risk**: HIGH
- Patient name + appointment time = PHI
- Reason for visit = PHI

**Compliance Requirements:**
- [ ] Obtain patient consent for reminders (written)
- [ ] Minimum information in reminders
- [ ] Secure transmission (encrypted email/SMS)
- [ ] BAA with SendGrid/Twilio

**Recommended Implementation:**
```typescript
// Compliant reminder message
"You have an appointment on [DATE] at [TIME] with [PRACTICE NAME]. Reply CONFIRM or call [PHONE]."

// NON-compliant reminder
"Your physical therapy appointment for your knee injury is tomorrow at 2pm with Dr. Smith."
```

### Patient Intake Forms
**PHI Risk**: CRITICAL
- Full medical history
- Insurance information
- Personal identifiers

**Compliance Requirements:**
- [ ] End-to-end encryption
- [ ] Secure storage (encrypted D1/R2)
- [ ] Access controls
- [ ] Audit logging
- [ ] Data retention policy

### Insurance Verification
**PHI Risk**: HIGH
- Insurance member ID = PHI
- Policy details = PHI

**Compliance Requirements:**
- [ ] BAA with insurance verification service
- [ ] Encrypt all transmitted data
- [ ] Minimum necessary disclosure
- [ ] Audit logging

## Deployment Checklist

Before deploying this template for a medical practice:

### Legal & Compliance
- [ ] Consult healthcare compliance attorney
- [ ] Conduct HIPAA security risk assessment
- [ ] Document security policies and procedures
- [ ] Create incident response plan
- [ ] Establish data retention/disposal policies
- [ ] Obtain required Business Associate Agreements

### Technical Infrastructure
- [ ] Upgrade to Cloudflare Enterprise plan
- [ ] Execute Cloudflare BAA
- [ ] Configure dedicated D1 database (not shared)
- [ ] Enable audit logging (Logpush)
- [ ] Implement authentication/authorization
- [ ] Configure automatic session timeout
- [ ] Enable MFA for administrative access
- [ ] Set up encrypted backups (7-year retention)

### Third-Party Services
- [ ] Calendly: Obtain BAA, configure security settings
- [ ] SendGrid: Pro plan + BAA for email
- [ ] Twilio: BAA for SMS
- [ ] Auth provider: BAA for authentication
- [ ] Any EHR integration: BAA required

### Application Security
- [ ] Implement row-level encryption for PHI
- [ ] Add application-level audit logging
- [ ] Configure CSP headers
- [ ] Implement rate limiting
- [ ] Add CAPTCHA to public forms
- [ ] Regular security scanning (OWASP)
- [ ] Penetration testing (annual minimum)

### Staff Training
- [ ] HIPAA awareness training (annual)
- [ ] Security incident response training
- [ ] Password policy enforcement
- [ ] Phishing awareness training
- [ ] Clean desk policy
- [ ] Device security policies

### Ongoing Compliance
- [ ] Annual security risk assessment
- [ ] Quarterly access reviews
- [ ] Monthly security updates/patches
- [ ] Regular backup testing
- [ ] Audit log reviews
- [ ] Policy updates as needed

## Disclaimer & Scope

### What This Template Provides

This template is designed with HIPAA-conscious architecture:
- Encrypted data transmission (HTTPS/TLS 1.3)
- Encrypted data storage (D1, R2, KV)
- Logging capabilities
- Secure session management
- Static website security best practices

### What This Template Does NOT Provide

This template is NOT:
- ❌ A turnkey HIPAA-compliant solution
- ❌ A substitute for legal/compliance consultation
- ❌ An EHR or practice management system
- ❌ Pre-configured with all required security controls
- ❌ Certified by any HIPAA compliance authority

### Deployer Responsibilities

You (the deployer) are responsible for:
1. Conducting your own security risk assessment
2. Obtaining all required Business Associate Agreements
3. Implementing additional security controls as needed
4. Staff training and policy enforcement
5. Ongoing compliance monitoring and auditing
6. Consulting with healthcare compliance experts
7. Meeting all HIPAA requirements for your use case

### No Warranty

This template is provided "as is" without warranty. CREATE SOMETHING and WORKWAY are not liable for HIPAA violations resulting from use of this template. Compliance is the deployer's responsibility.

## Resources

### HIPAA Regulations
- [HHS HIPAA for Professionals](https://www.hhs.gov/hipaa/for-professionals/index.html)
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [HIPAA Privacy Rule](https://www.hhs.gov/hipaa/for-professionals/privacy/index.html)
- [Breach Notification Rule](https://www.hhs.gov/hipaa/for-professionals/breach-notification/index.html)

### Cloudflare HIPAA
- [Cloudflare HIPAA Compliance](https://www.cloudflare.com/trust-hub/compliance-resources/hipaa/)
- [Cloudflare Security](https://www.cloudflare.com/trust-hub/)

### Third-Party BAAs
- [Calendly HIPAA](https://help.calendly.com/hc/en-us/articles/360056383734-HIPAA-compliance)
- [SendGrid HIPAA](https://docs.sendgrid.com/ui/account-and-settings/hipaa)
- [Twilio HIPAA](https://www.twilio.com/en-us/legal/hipaa)

### Compliance Tools
- [HHS Security Risk Assessment Tool](https://www.healthit.gov/topic/privacy-security-and-hipaa/security-risk-assessment-tool)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

## Support

For questions about HIPAA compliance:
1. Consult a healthcare compliance attorney
2. Contact your organization's compliance officer
3. Refer to HHS.gov HIPAA resources

For technical questions about this template:
- [CREATE SOMETHING Support](https://createsomething.agency/contact)
- [WORKWAY Documentation](https://workway.co/docs)

---

**Last Updated**: 2024-12-30
**Next Review**: Quarterly (or upon regulatory changes)
