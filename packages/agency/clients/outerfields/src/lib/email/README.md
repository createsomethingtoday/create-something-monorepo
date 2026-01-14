## OUTERFIELDS Email System

This folder is the shared email layer for OUTERFIELDS.

### Goals
- **DRY**: one shared layout, many templates
- **Consistent styling**: matches the OUTERFIELDS welcome email (dark theme)
- **Safe by default**: basic HTML escaping helper

### Structure
- `service.ts`: Resend send wrapper (`sendEmail`)
- `layout.ts`: shared HTML shell + helpers (`renderEmailLayout`, `ctaButton`, `divider`)
- `templates/`: individual email templates (welcome, presentation, video-landing-update, etc.)
- `welcome-template.ts` / `presentation-template.ts`: backwards-compatible re-exports

### Available Templates

| Template | Purpose | Script |
|----------|---------|--------|
| `welcome.ts` | New Founding Member welcome | (sent via webhook) |
| `presentation.ts` | Sharing investor/partner presentations | `send-presentation-email.ts` |
| `video-landing-update.ts` | Platform update: video landing pages | `send-video-landing-update-email.ts` |

### Sending (CLI)

**Presentation email:**
```bash
RESEND_API_KEY=... pnpm tsx packages/agency/clients/outerfields/scripts/send-presentation-email.ts --draft --to micah@createsomething.io --name Micah
RESEND_API_KEY=... pnpm tsx packages/agency/clients/outerfields/scripts/send-presentation-email.ts --to aaron@outerfields.co --name Aaron
```

**Video landing page update:**
```bash
RESEND_API_KEY=... pnpm tsx packages/agency/clients/outerfields/scripts/send-video-landing-update-email.ts --draft --to micah@createsomething.io --name Micah
RESEND_API_KEY=... pnpm tsx packages/agency/clients/outerfields/scripts/send-video-landing-update-email.ts --to aaron@outerfields.co --name Aaron
```

### Notes
- The **Resend sending domain** must be verified for the `from` address you use.
- Prefer `text` fallbacks for deliverability and accessibility.
- Use `--draft` flag to send for internal approval before client-facing sends.

