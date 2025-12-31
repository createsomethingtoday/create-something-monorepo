# Medical Practice Website Template

**Status**: PRODUCTION

**Compassionate care meets modern technology.**

Production-ready medical practice website template with HIPAA-conscious architecture. Free tier available. Deploy to Cloudflare Pages in minutes.

[View Demo](https://medical-practice.createsomething.space) • [Deploy Free](https://github.com/createsomething/vertical-medical-practice)

## Important HIPAA Notice

This template provides a HIPAA-conscious foundation but **requires additional configuration and legal review** before handling Protected Health Information (PHI). See [HIPAA_COMPLIANCE.md](./HIPAA_COMPLIANCE.md) for detailed requirements.

**Key Requirements:**
- Cloudflare Enterprise plan + BAA
- Business Associate Agreements with all third-party services
- Security risk assessment by healthcare compliance expert
- Implementation of additional security controls

**Deployer is responsible for all HIPAA compliance obligations.**

## Features

### Automated Workflows (Powered by WORKWAY)

- **Appointment Booking**: Calendly integration syncs with your calendar (requires BAA)
- **Appointment Reminders**: 24-hour email/SMS reminders with compliant messaging (requires patient consent + BAA)
- **New Patient Intake**: Digital forms with encrypted storage (HIPAA-ready with proper configuration)

### Production-Ready Website

- **5 Core Pages**: Home, About, Services, Team, Contact
- **Services Showcase**: Highlight your medical specializations
- **Provider Profiles**: Credentials, specialties, languages spoken
- **Insurance Information**: Accepted plans and verification details
- **Patient Portal Ready**: Architecture supports authenticated patient portal
- **Canon Design System**: Professional, accessible, mobile-responsive
- **SEO Optimized**: Schema.org markup (MedicalBusiness, MedicalClinic, Physician)
- **HIPAA-Conscious**: Encrypted storage, HTTPS-only, audit logging capabilities

### Security Features

- ✅ HTTPS-only (TLS 1.3)
- ✅ Encrypted data storage (D1, R2, KV with AES-256)
- ✅ Session management with automatic timeout capability
- ✅ Audit logging infrastructure
- ✅ Access control architecture (requires configuration)
- ✅ No PHI in default implementation

## Template Tiers

| Feature | Free | Pro ($129) | Enterprise |
|---------|------|-----------|------------|
| Core Pages (Home, Services, About, Team, Contact) | Yes | Yes | Yes |
| Canon Design System | Yes | Yes | Yes |
| SEO/Schema.org Structured Data | Yes | Yes | Yes |
| Mobile-Responsive Design | Yes | Yes | Yes |
| Contact Form | Yes | Yes | Yes |
| **WORKWAY Workflows** | Stubs | 3 Active | Unlimited |
| **Appointment Booking** | - | Calendly | Custom |
| **Appointment Reminders** | - | Yes | Yes |
| **Patient Intake Forms** | - | Yes | Yes |
| **Insurance Verification** | - | Manual | Automated |
| **EHR Integration** | - | - | Yes |
| **Custom Domain Setup** | Manual | Guided | Done-for-you |
| **HIPAA BAA Assistance** | - | Guidance | Full support |
| **Support** | Community | Email | Priority + .agency |

**Need HIPAA compliance assistance or custom EHR integrations?** [Contact CREATE SOMETHING .agency](https://createsomething.agency/contact)

## Production Readiness

- ✅ All routes functional
- ✅ WORKWAY integration configured
- ✅ TypeScript type checking passes
- ✅ Build successful
- ✅ Environment variables documented
- ✅ Deployment configuration complete
- ✅ Canon compliance verified
- ✅ HIPAA compliance documentation provided
- ⚠️ HIPAA implementation requires additional configuration (see HIPAA_COMPLIANCE.md)

## Quick Start

### 1. Clone and Install

```bash
cd packages/verticals/medical-practice
pnpm install
pnpm dev
```

Visit `http://localhost:5173`

### 2. Customize Your Practice

Edit `src/lib/config/site.ts` with your:
- Practice name and tagline
- Contact information (email, phone, address)
- Office hours
- Provider profiles (names, credentials, specialties)
- Services offered
- Insurance plans accepted

```typescript
export const siteConfig = {
  name: 'Your Practice Name',
  tagline: 'Compassionate Care, Advanced Medicine',
  email: 'contact@yourpractice.com',
  phone: '+1 (555) 123-4567',
  // ... see file for all options
}
```

### 3. Review HIPAA Requirements

**Before deploying:**
1. Read [HIPAA_COMPLIANCE.md](./HIPAA_COMPLIANCE.md) thoroughly
2. Consult with a healthcare compliance expert
3. Conduct a security risk assessment
4. Obtain necessary Business Associate Agreements
5. Configure additional security controls

### 4. Deploy to Cloudflare

**Note**: HIPAA compliance requires Cloudflare Enterprise plan.

```bash
# Create Cloudflare resources
wrangler d1 create medical-practice-hipaa-db  # Use dedicated database
wrangler kv:namespace create "SESSIONS"
wrangler r2 bucket create medical-practice-documents

# Update wrangler.toml with IDs from above commands

# Build and deploy
pnpm build
wrangler pages deploy .svelte-kit/cloudflare --project-name=your-practice-name
```

**After deployment:**
- Contact Cloudflare sales to upgrade to Enterprise and execute BAA
- Configure all required environment variables
- Enable audit logging (Logpush)
- Implement authentication if handling PHI

## Project Structure

```
src/
├── routes/
│   ├── +page.svelte              # Home - Practice overview
│   ├── services/+page.svelte     # Medical services offered
│   ├── team/+page.svelte         # Provider profiles
│   ├── about/+page.svelte        # Practice history, mission
│   ├── contact/+page.svelte      # Contact info, appointment request
│   ├── +layout.svelte            # Site navigation and layout
│   ├── +layout.server.ts         # Server-side data loading
│   └── +error.svelte             # Error page
├── lib/
│   ├── config/
│   │   ├── site.ts               # ⭐ Your practice configuration
│   │   └── context.ts            # Runtime config management
│   └── workflows/                # WORKWAY workflow stubs (Pro/Enterprise)
├── app.css                       # Canon design tokens
└── app.html                      # HTML template

static/
├── images/                       # Generated via Cloudflare Workers AI
├── favicon.svg                   # Replace with your logo
└── og-image.jpg                  # Social sharing image

wrangler.toml                     # Cloudflare configuration
template.json                     # Template metadata
HIPAA_COMPLIANCE.md               # ⭐ HIPAA requirements and guidance
```

## HIPAA Compliance Considerations

### Current Implementation (Non-PHI)

The default template is a **static informational website** that does NOT collect or store PHI:

- Contact form: General inquiries only (no medical information)
- Appointment requests: Links to external Calendly (requires BAA)
- No patient data storage
- No medical records
- No diagnostic information

**HIPAA Status**: ✅ Safe for deployment (informational content only)

### If Adding PHI Features

If you plan to collect/store PHI (patient forms, appointment details, medical history):

**Required Actions:**
1. ✅ Read [HIPAA_COMPLIANCE.md](./HIPAA_COMPLIANCE.md)
2. ✅ Upgrade to Cloudflare Enterprise plan
3. ✅ Execute Cloudflare Business Associate Agreement
4. ✅ Obtain BAAs from all third-party services
5. ✅ Implement authentication and access controls
6. ✅ Enable audit logging for all PHI access
7. ✅ Conduct security risk assessment
8. ✅ Implement encryption for PHI data
9. ✅ Create incident response plan
10. ✅ Staff HIPAA training

**Recommended Consultation:**
- Healthcare compliance attorney
- HIPAA security consultant
- CREATE SOMETHING .agency for technical implementation

### What is Protected Health Information (PHI)?

PHI is any health information that can identify an individual:

**Identifiers**: Name, address, dates, phone, email, SSN, medical record number, IP address, photos, and more (18 total)

**Health Information**: Medical history, diagnoses, treatments, prescriptions, lab results, insurance info, billing records

**Example PHI in Medical Websites:**
- Patient appointment with reason for visit
- Patient intake forms with medical history
- Insurance verification information
- Patient portal with test results
- Prescription refill requests

**Non-PHI Examples:**
- General contact form for office questions
- Informational content about services
- Provider credentials and bios
- Office hours and directions

### Compliance Disclaimer

**This template does not guarantee HIPAA compliance.** Compliance is a shared responsibility:

**Template Provides:**
- HIPAA-conscious architecture
- Encrypted data storage and transmission
- Audit logging capabilities
- Security best practices

**You Must Provide:**
- Legal/compliance consultation
- Business Associate Agreements
- Security risk assessment
- Additional security controls
- Staff training and policies
- Ongoing compliance monitoring

## WORKWAY Workflows

### Included Workflows (Pro/Enterprise)

#### 1. Appointment Booking
**HIPAA Risk**: HIGH (PHI if linked to patient)

**Features:**
- Calendly calendar integration
- Automatic booking confirmation
- CRM sync (optional)

**Compliance Requirements:**
- Calendly BAA (available)
- Minimal data collection
- Patient consent for booking
- Secure data transmission

#### 2. Appointment Reminders
**HIPAA Risk**: HIGH (Patient name + appointment = PHI)

**Features:**
- 24-hour and 72-hour reminders
- Email and SMS options
- Confirmation tracking

**Compliance Requirements:**
- Patient written consent required
- Minimal information in messages
- SendGrid/Twilio BAA required
- Compliant message format

**Compliant Reminder Example:**
```
You have an appointment on Jan 15 at 2:00 PM with [Practice Name].
Reply CONFIRM or call (555) 123-4567.
```

**Non-Compliant Example (DO NOT USE):**
```
Your physical therapy appointment for your knee injury is tomorrow.
```

#### 3. New Patient Intake
**HIPAA Risk**: CRITICAL (Full medical history)

**Features:**
- Digital intake forms
- Insurance verification
- Medical history collection
- Secure document upload

**Compliance Requirements:**
- End-to-end encryption
- Encrypted storage (D1/R2)
- Access controls and authentication
- Audit logging for all access
- Data retention policy
- Patient consent

**Note**: Intake forms stub included but requires full HIPAA configuration before use.

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description | HIPAA BAA Required |
|----------|-------------|-------------------|
| `PUBLIC_SITE_URL` | Your production URL | No |
| `SENDGRID_API_KEY` | Email notifications | Yes (Pro plan) |
| `TWILIO_ACCOUNT_SID` | SMS reminders | Yes |
| `TWILIO_AUTH_TOKEN` | SMS authentication | Yes |
| `CALENDLY_API_KEY` | Appointment booking | Yes |
| `AUTH_SECRET` | Session encryption | No |
| `HIPAA_ENCRYPTION_KEY` | PHI encryption | No |

For production secrets:
```bash
wrangler secret put SENDGRID_API_KEY
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put HIPAA_ENCRYPTION_KEY
```

## SEO & Marketing

The template includes:

- **Structured Data**: MedicalBusiness, MedicalClinic, Physician, LocalBusiness
- **AEO Optimization**: FAQ schema for AI/voice search
- **Target Keywords**: medical practice website, doctor website template, healthcare website, clinic website
- **Sitemap**: Auto-generated XML sitemap
- **Robots.txt**: Search engine crawl configuration
- **HIPAA-Compliant Meta**: No PHI in meta tags or URLs

## Technology Stack

- **Framework**: SvelteKit 2.x
- **CSS**: Tailwind + Canon Design System
- **Hosting**: Cloudflare Pages
- **Database**: Cloudflare D1 (SQLite with AES-256 encryption)
- **Storage**: Cloudflare R2 (encrypted object storage)
- **Cache**: Cloudflare KV (session management)
- **Workflows**: WORKWAY (Cloudflare Workers)
- **Auth** (optional): Auth0, Clerk, or custom
- **Integrations**: Calendly, SendGrid, Twilio, EHR systems (Enterprise)

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |
| `pnpm check` | Type check |
| `pnpm deploy` | Build and deploy to Cloudflare |

## Database

**Default**: Shared templates platform database (NOT HIPAA compliant)

**For HIPAA Compliance**: Use dedicated D1 database

```bash
# Create dedicated HIPAA database
wrangler d1 create medical-practice-hipaa-db

# Update wrangler.toml with new database ID
# Remove shared database configuration
```

**Tables** (if implementing PHI features):
- `patients` - Patient demographics (encrypted)
- `appointments` - Appointment scheduling (encrypted)
- `forms` - Patient intake forms (encrypted)
- `audit_log` - All PHI access events (required)
- `consents` - Patient consent records (required)

**Note**: Base template does not create these tables. Only implement if handling PHI and after HIPAA compliance review.

## Support & Resources

### HIPAA Compliance
- [HHS HIPAA for Professionals](https://www.hhs.gov/hipaa/for-professionals/index.html)
- [Cloudflare HIPAA Compliance](https://www.cloudflare.com/trust-hub/compliance-resources/hipaa/)
- [HHS Security Risk Assessment Tool](https://www.healthit.gov/topic/privacy-security-and-hipaa/security-risk-assessment-tool)

### Technical Support
- [CREATE SOMETHING Documentation](https://createsomething.io)
- [WORKWAY SDK](https://workway.co)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages)
- [SvelteKit Docs](https://kit.svelte.dev)

### Professional Services
Need help with HIPAA compliance or EHR integration?
- [Contact CREATE SOMETHING .agency](https://createsomething.agency/contact)
- Healthcare compliance consultation
- Custom workflow development
- EHR integration (athenahealth, Epic, Cerner)
- Security audit and implementation

## License

MIT License - Free for personal and commercial use.

**HIPAA Disclaimer**: MIT license does not grant HIPAA compliance. You are responsible for ensuring your deployment meets all HIPAA requirements.

---

Built with Canon by [CREATE SOMETHING](https://createsomething.agency)
