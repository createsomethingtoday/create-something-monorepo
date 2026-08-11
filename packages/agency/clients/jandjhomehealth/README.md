# J&J Home Health Website

SvelteKit + Cloudflare Pages app for the J&J Home Health public website, contact capture,
and admin portal. The public design reuses the original J&J logo and care photography.

## Runtime Surfaces

- Public website and call-request form: `/`
- Voice-to-voice receptionist demo: `/receptionist`
- Admin login: `/admin`
- Admin contacts: `/admin/contacts`
- QR code: `/admin/qr`

## Data And Secrets

Database: Cloudflare D1 binding `DB`, bound to the canonical `create-something-db` for both
the `jandjhomehealth` and `contact-capture` Pages projects.

Secrets and runtime vars:

- `ADMIN_PASSWORD`: the one shared admin credential. Store it in Infisical and inject the
  same value into both Pages projects as a Cloudflare secret.
- `PUBLIC_BASE_URL`: public form origin for QR links.
- `OPENAI_API_KEY`: server-only OpenAI API key used to mint short-lived Realtime client secrets for the receptionist demo.

Never store live secret values in this package.

## Password Flow

1. The password-only login compares the submitted value to `ADMIN_PASSWORD` in constant time.
2. Successful login creates a signed, seven-day D1-backed admin session.
3. Rotate the credential in Infisical, update both Pages secrets, and invalidate prior shared
   sessions. There is no email-specific or self-service reset path.

## Commands

```bash
pnpm --filter @create-something/jandjhomehealth check
pnpm --filter @create-something/jandjhomehealth test
pnpm --filter @create-something/jandjhomehealth build
pnpm --filter @create-something/jandjhomehealth migrate
pnpm --filter @create-something/jandjhomehealth deploy
pnpm --filter @create-something/jandjhomehealth deploy:contact-capture
```

The prior `contact-capture-db` remains a rollback source only after its missing contact rows are
reconciled into `create-something-db`. Do not run two-way replication between the databases.

See [Voice Receptionist Demo](./docs/VOICE_RECEPTIONIST_DEMO.md) for the local run path,
test script, safety boundary, corpus replacement seam, and future telephony handoff.
