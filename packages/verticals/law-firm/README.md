# Law Firm Template

**Status**: PRODUCTION

A production-ready website template for law firms and legal practices with WORKWAY SDK integration.

## Features

- WORKWAY SDK connected for workflow automation
- Practice areas, attorneys, case results showcase
- Client intake forms with workflow triggers
- Consultation booking integration
- Ethics compliance and disclaimers
- Testimonials and FAQ sections
- SEO optimized with structured data
- Canon design system integration

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

```bash
pnpm build
wrangler pages deploy .svelte-kit/cloudflare
```

See `.env.example` for required environment variables.

**Full documentation**: [../shared/README.template.md](../shared/README.template.md)
