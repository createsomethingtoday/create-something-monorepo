## OUTERFIELDS Email System

This folder is the shared email layer for OUTERFIELDS.

### Goals
- **DRY**: one shared layout, many templates
- **Consistent styling**: matches the OUTERFIELDS welcome email (dark theme)
- **Safe by default**: basic HTML escaping helper

### Structure
- `service.ts`: Resend send wrapper (`sendEmail`)
- `layout.ts`: shared HTML shell + helpers (`renderEmailLayout`, `ctaButton`, `divider`)
- `templates/`: individual email templates (welcome, presentation, etc.)
- `welcome-template.ts` / `presentation-template.ts`: backwards-compatible re-exports

### Sending (CLI)
Use the script:

```bash
RESEND_API_KEY=... pnpm tsx packages/agency/clients/outerfields/scripts/send-presentation-email.ts --draft --to micah@createsomething.io --name Micah
RESEND_API_KEY=... pnpm tsx packages/agency/clients/outerfields/scripts/send-presentation-email.ts --to aaron@outerfields.co --name Aaron
```

### Notes
- The **Resend sending domain** must be verified for the `from` address you use.
- Prefer `text` fallbacks for deliverability and accessibility.

