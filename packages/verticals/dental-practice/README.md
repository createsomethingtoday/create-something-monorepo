# Dental Practice Website Template

> **Appointments that book themselves**

HIPAA-ready dental practice website template with automated appointment scheduling, patient intake forms, treatment reminders, and insurance verification. Built on Cloudflare's edge platform for sub-100ms global response times.

## Features

### Automated Workflows (WORKWAY)

1. **Appointment Scheduling**
   - Patients book online 24/7
   - Real-time calendar availability
   - Auto-syncs with practice management software (Dentrix, Open Dental, Eaglesoft)
   - Instant confirmation emails/SMS

2. **Patient Intake Forms**
   - Digital forms completed before arrival
   - Data auto-populates patient records
   - HIPAA-conscious form handling
   - Medical history, insurance, consent forms

3. **Treatment Reminders**
   - Automated recall for cleanings and checkups
   - Patients self-book hygiene appointments
   - Reduces no-shows with SMS/email reminders
   - Customizable recall intervals

4. **Insurance Verification**
   - Pre-appointment eligibility checks
   - Coverage confirmed before patient arrives
   - Reduces billing surprises
   - Integrates with clearinghouse APIs

### Website Features

- Practice information (hours, location, services)
- Team bios and credentials
- Before/after photo galleries
- Service descriptions
- Insurance partners list
- Emergency contact routing
- Patient portal
- Online payment processing
- Multi-location support
- ADA accessibility (WCAG AA)

## HIPAA Compliance

**IMPORTANT**: This template provides HIPAA-conscious architecture but does not guarantee compliance.

### What's Included

- ✅ Encrypted data transmission (TLS 1.3)
- ✅ Encrypted data storage (Cloudflare D1, R2)
- ✅ Secure session management
- ✅ Audit logging capabilities
- ✅ HTTPS-only architecture

### Your Responsibilities

- Business Associate Agreements (BAAs) with all service providers
- Cloudflare Enterprise plan (required for BAA)
- Annual security risk assessment
- Staff HIPAA training
- Incident response plan
- Consulting with healthcare compliance experts

**Full Documentation**: See the [HIPAA Compliance Guide](../medical-practice/HIPAA_COMPLIANCE.md) (shared with Medical Practice template).

## Tech Stack

- **Framework**: SvelteKit
- **Styling**: Tailwind CSS + Canon Design System
- **Hosting**: Cloudflare Pages
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (S3-compatible)
- **Cache**: Cloudflare KV
- **Workflows**: WORKWAY

## Pricing Tiers

### Free
- Complete dental website
- Canon design system
- SEO & structured data
- Mobile responsive
- Contact forms
- HIPAA-conscious architecture

### Pro ($99/month)
- Everything in Free
- 4 active WORKWAY workflows
- Calendar integration
- Automated appointment reminders
- Patient intake automation
- Insurance verification
- Practice management integration
- Custom domain setup

### Enterprise (Custom)
- Everything in Pro
- Unlimited WORKWAY workflows
- Custom integrations (any practice management software)
- Multi-location support
- White-label branding
- Priority support
- Done-for-you setup
- HIPAA compliance consultation

## Quick Start

```bash
# Clone the template
git clone https://github.com/createsomething/vertical-templates.git
cd vertical-templates/dental-practice

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Cloudflare credentials

# Run development server
pnpm dev

# Deploy to Cloudflare Pages
pnpm deploy
```

## Configuration

### Practice Information

Edit `src/lib/config/practice.ts`:

```typescript
export const practice = {
  name: "Your Dental Practice Name",
  tagline: "Comprehensive Family Dentistry",
  phone: "(555) 123-4567",
  email: "info@yourpractice.com",
  address: {
    street: "123 Main Street",
    city: "Your City",
    state: "ST",
    zip: "12345"
  },
  hours: {
    monday: "8:00 AM - 5:00 PM",
    tuesday: "8:00 AM - 5:00 PM",
    // ...
  }
};
```

### Workflow Integration

Connect your practice management software in `wrangler.toml`:

```toml
[vars]
PRACTICE_MGMT_SYSTEM = "dentrix" # or "opendental", "eaglesoft"
PRACTICE_MGMT_API_ENDPOINT = "https://your-api.example.com"
CALENDLY_API_KEY = "your-calendly-key"
SENDGRID_API_KEY = "your-sendgrid-key"
```

## SEO Optimization

This template is optimized for search engines:

### Target Keywords
- "dental practice website template"
- "dentist website builder"
- "dental office website"
- "HIPAA compliant dental website"

### Structured Data
- `Dentist` schema
- `MedicalBusiness` schema
- `LocalBusiness` schema
- `FAQPage` schema (for AEO)

### Performance
- Sub-100ms global response times (Cloudflare edge)
- Automatic image optimization
- Lazy loading
- Core Web Vitals optimized

## Support

### Documentation
- [HIPAA Compliance Guide](../medical-practice/HIPAA_COMPLIANCE.md)
- [WORKWAY Workflows](https://workway.co/docs/workflows)
- [Cloudflare Pages](https://developers.cloudflare.com/pages)

### Contact
- **General Support**: [createsomething.agency/contact](https://createsomething.agency/contact)
- **WORKWAY**: [workway.co/docs](https://workway.co/docs)

### Community
- GitHub Issues: [Report bugs or request features](https://github.com/createsomething/vertical-templates/issues)
- Discussions: [Ask questions](https://github.com/createsomething/vertical-templates/discussions)

## License

MIT License - See [LICENSE](../../LICENSE) for details.

---

**Built with [CREATE SOMETHING](https://createsomething.agency)**
**Powered by [WORKWAY](https://workway.co)**
