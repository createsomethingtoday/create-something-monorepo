# Newsletter staging service

The Webflow Cloud app calls this service over HTTPS with a server-only bearer credential. The Worker owns its own staging D1 and KV. It shares the production signup, confirmation, and unsubscribe logic. The database starts empty and contains the schema for newsletter and lead records. Production databases, identity cookies, and audience dispatch are outside this service.

| POST path | JSON input | Result |
| --- | --- | --- |
| /api/newsletter | email, website (honeypot), turnstileToken | success and message |
| /api/newsletter/confirm | token | success, message, alreadyConfirmed on success |
| /api/newsletter/unsubscribe | token | success, error, email:null |

Each request needs Content-Type application/json and Authorization Bearer NEWSLETTER_OWNER_TOKEN. For signup, the trusted frontend supplies x-newsletter-client-ip only if its request runtime exposes a trustworthy address. Otherwise the owner rate-limits against a dedicated staging inbox bucket and omits the optional remote IP from Siteverify. The staging service accepts only STAGING_RECIPIENT, omits analytics attribution, and sends confirmation and unsubscribe links under its explicitly configured HTTPS NEWSLETTER_LINK_ORIGIN. Resend sends a confirmation email after signup and a welcome email after the operator confirms.

Configure NEWSLETTER_OWNER_TOKEN, STAGING_RECIPIENT, NEWSLETTER_LINK_ORIGIN, RESEND_API_KEY and TURNSTILE_SECRET_KEY as runtime secrets. Staging uses the matching Cloudflare Turnstile test sitekey and secret. The frontend must hold the bearer credential server-side. Keep its real-mail test operator-controlled and retire the mail credential when the test ends.

After worktree bootstrap, run the isolated verification from the repository root:

```sh
node packages/io/newsletter-owner/verify-staging.mjs
```

It bundles the Worker and runs its real HTTP handlers, D1 statements and KV checks in local workerd. Turnstile and Resend terminate in a synthetic transport. No external email is sent. The checked-in Wrangler configuration targets the staging service only.

## Production candidate (not deployed)

`wrangler.production.jsonc` explicitly selects `NEWSLETTER_MODE=production` and binds the existing IO `create-something-db` and CACHE namespace. It has no migrations directory: do not apply the empty staging schema to production. Default staging configuration remains recipient-restricted and excludes attribution.

Production requires server-only NEWSLETTER_OWNER_TOKEN, RESEND_API_KEY, and real TURNSTILE_SECRET_KEY. Its canonical HTTPS link origin is exactly https://createsomething.io. The authenticated apex ingress must overwrite `x-newsletter-client-ip` with the original CF-Connecting-IP and `x-newsletter-original-url` with the exact apex browser URL; signup fails closed without an address. Allowed URL paths are /api/newsletter, /confirm and /unsubscribe matching the backend operation. Browser-provided x-newsletter-* headers are never authoritative. Privacy headers DNT/GPC and User-Agent must represent the browser. `x-newsletter-user-opted-out` must be the authoritative account preference: only explicit false enables attribution; absent/unknown defaults to opted out. Full canonical signup JSON, including source, sessionId, landingUrl, analyticsEnabled, sourceProperty, referrer, intent and lane, is preserved.

First-wave router must keep any request with cs_access_token or cs_refresh_token on existing IO runtime. Account preference currently requires Identity-backed createSessionManager.getUser() and users.analytics_opt_out; decode-only JWT inspection is insufficient. No account/session cookies should transit Webflow. Analytics consent is cs_consent in localStorage, provided as analyticsEnabled in signup JSON; it is separate from double opt-in email consent. Confirmation uses DNT/GPC and authoritative opt-out, retaining first-party attribution semantics.

Rollout gates: independent runtime review; read-only production schema/consent/suppression/attribution checks; verify actual ingress address support and cookie routing; provision secrets; configure live Turnstile apex allowlist; deploy owner only after authorization; validate owner unauthorized rejection without mail; then explicit approval for a bounded recipient signup/confirm/unsubscribe test and route cutover. Keep existing /api/newsletter, /confirm and /unsubscribe links, newsletter archive and edition subscribe callers compatible. Do not move archive/admin/workflow/webhooks to this owner. Existing runtime remains rollback destination. No audience send permission is implied.

Run `node packages/io/newsletter-owner/verify-production.mjs` for synthetic local workerd verification; no production writes or real mail.
