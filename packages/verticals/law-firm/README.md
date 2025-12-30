# Law Firm Website Template

**Status**: PRODUCTION

**Consultations that book themselves.**

Production-ready law firm website template with automated client workflows. Free tier available. Deploy to Cloudflare Pages in minutes.

[View Demo](https://professional-services.createsomething.space/template) • [Deploy Free](https://github.com/createsomething/vertical-professional-services)

## Features

### Automated Workflows (Powered by WORKWAY)

- **Consultation Booking**: Calendly integration syncs with your calendar. No more phone tag.
- **Appointment Reminders**: 24-hour email/SMS reminders reduce no-shows automatically.
- **Post-Meeting Follow-Up**: Thank you emails, proposal delivery, review requests—zero manual work.

### Production-Ready Website

- **5 Core Pages**: Home, About, Services, Team, Contact
- **Practice Areas Showcase**: Highlight your specializations
- **Attorney Profiles**: Individual pages with credentials
- **Case Results**: Anonymized outcomes for social proof
- **Client Intake Forms**: WORKWAY workflow triggers
- **Canon Design System**: Professional, accessible, mobile-responsive
- **SEO Optimized**: Schema.org markup (LegalService, FAQPage, SoftwareApplication)
- **Bar Compliant**: Ethics disclaimers, HTTPS encryption, privilege protection

## Production Readiness

- ✅ All routes functional
- ✅ WORKWAY integration configured
- ✅ TypeScript type checking passes
- ✅ Build successful
- ✅ Environment variables documented
- ✅ Deployment configuration complete
- ✅ Canon compliance verified

## Quick Start

```bash
cd packages/verticals/law-firm
pnpm install
pnpm dev
```

## Deployment

### Free Tier (DIY)

```bash
pnpm build
wrangler pages deploy .svelte-kit/cloudflare
```

See `.env.example` for required environment variables.

### Pro Tier (Managed)

Sign up at [workway.co/templates/law-firm?tier=pro](https://workway.co/templates/law-firm?tier=pro). We handle deployment, custom domain setup, and workflow configuration.

## SEO & Marketing

The template includes:

- **Structured Data**: LegalService, FAQPage, SoftwareApplication, BreadcrumbList
- **AEO Optimization**: FAQPage schema for AI/voice search engines
- **Target Keywords**: law firm website template, attorney website builder, legal practice website
- **Marketing Landing Page**: `/template` route showcases the template itself
- **Sitemap**: Auto-generated XML sitemap at `/sitemap.xml`
- **Robots.txt**: Search engine crawl configuration

## Technology Stack

- **Framework**: SvelteKit 2.x
- **CSS**: Tailwind + Canon Design System
- **Hosting**: Cloudflare Pages
- **Database**: Cloudflare D1 (SQLite)
- **Workflows**: WORKWAY (Cloudflare Workers)
- **Integrations**: Calendly, HubSpot, Clio, SendGrid, Twilio

## License

MIT License. You own the code.

**Full documentation**: [../shared/README.template.md](../shared/README.template.md)
