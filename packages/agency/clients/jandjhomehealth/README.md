# J&J Home Health Contact Capture

SvelteKit + Cloudflare Pages app for the J&J Home Health assistance request form and admin portal.

## Runtime Surfaces

- Public form: `/`
- Admin login: `/admin`
- Admin contacts: `/admin/contacts`
- QR code: `/admin/qr`
- Password management: `/admin/settings`
- Password reset: `/admin/reset?token=...`

## Data And Secrets

Database: Cloudflare D1 binding `DB`, currently bound to `create-something-db` for the Pages project.

Secrets and runtime vars:

- `ADMIN_EMAILS`: comma-separated admin emails allowed to log in and reset passwords.
- `ADMIN_INITIAL_PASSWORD`: one-time bootstrap password. Store in Infisical/Cloudflare, then remove after the client sets their own password.
- `ADMIN_PASSWORD`: legacy fallback for the old one-password gate. Prefer `ADMIN_INITIAL_PASSWORD`.
- `RESEND_API_KEY`: optional, required for email reset links.
- `RESEND_FROM_EMAIL`: optional Resend sender, defaults to `J&J Home Health <noreply@createsomething.io>`.
- `PUBLIC_BASE_URL`: public form origin for QR/reset links.

Never store live secret values in this package.

## Password Flow

1. Admin emails are controlled by `ADMIN_EMAILS`.
2. First login can use `ADMIN_INITIAL_PASSWORD` or `ADMIN_PASSWORD`; that password is immediately hashed into D1 for the admin email.
3. The client can change the password from `/admin/settings`.
4. If Resend is configured, the client can request a reset link from `/admin`.
5. Password changes and resets invalidate existing admin sessions and create a fresh session.

## Commands

```bash
pnpm --filter @create-something/jandjhomehealth check
pnpm --filter @create-something/jandjhomehealth build
pnpm --filter @create-something/jandjhomehealth migrate
pnpm --filter @create-something/jandjhomehealth deploy
```

The package is configured against the Pages project's existing production `create-something-db` binding. The prior J&J contact records were copied from `contact-capture-db` during deployment so the admin portal sees the current records.
