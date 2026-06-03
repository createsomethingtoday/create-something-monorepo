# Abundance Concierge Production Runbook

## Required Runtime Inputs

- `DB` D1 binding for thread, verification, claim, and rate-limit storage
- `UPLOADS` R2 binding for protected nurse document storage
- `ABUNDANCE_INTAKE_SIGNING_SECRET` for secure intake grants and self-serve verification
- `RESEND_API_KEY` for production verification email delivery
- `ABUNDANCE_INTAKE_EMAIL_FROM` if the sender should differ from the default
- `AGENCY_BASE_URL` for control-plane bridge targets
- `ABUNDANCE_GEO_MAPBOX_ACCESS_TOKEN` for external preferred-location recovery when the internal catalog cannot normalize confidently

## Production Validation Checklist

1. Run `pnpm --filter @create-something/concierge-chat smoke`.
2. Run `pnpm --filter @create-something/concierge-chat acceptance`.
3. Apply the latest remote migration with `pnpm --filter @create-something/concierge-chat db:migrate`.
4. Confirm the stable domain returns:
   - `/` -> `200`
   - `/apply` -> `200`
   - anonymous `/chat` -> `303 /apply` unless a candidate thread is already active
   - anonymous `/settings` -> `303 /apply`
5. Complete one real nurse flow on the stable domain:
   - start from `/apply`
   - request and enter the email verification code
   - upload the required documents
   - book recruiter review
6. Complete one real internal staff flow on the stable domain:
   - recruiter review completion
   - staffing outreach
   - facility submission / response
   - onboarding completion

## Expected Recovery Paths

### `403`

- Candidate routes:
  - the browser has not completed secure verification yet
  - the signed intake grant is missing or expired
- Internal routes:
  - `.agency` access is missing or blocked for the current browser session

### `429`

- Public write limits are now active on:
  - thread creation
  - candidate thread messaging
  - verification request
  - verification submit
  - candidate uploads
  - workflow action mutations
- The response includes `Retry-After`. Wait for that window before retrying.

### `5xx`

- Check Pages runtime logs for structured `concierge-chat` JSON events.
- Confirm:
  - D1 binding is present
  - R2 binding is present
  - signing secret exists
  - Resend key exists
  - latest migration has been applied

## Logging / Events

The service now emits structured JSON logs for:

- `thread.created`
- `thread.message.sent`
- `thread.upload.accepted`
- `appointment.booked`
- `verification.requested`
- `verification.verified`
- `thread.action.completed`
- matching rate-limit and failure events for each of those surfaces

Use these logs to identify the failing route, thread, session, and request IP without exposing nurse message content.

## Rollback

1. Re-deploy the previous known-good Pages deployment for `abundance-concierge-chat`.
2. Do not roll back D1 migrations unless the schema change is known to be incompatible with the previous deployment.
3. If the issue is isolated to secrets/config, restore the prior Pages or Infisical value and redeploy the same code.
