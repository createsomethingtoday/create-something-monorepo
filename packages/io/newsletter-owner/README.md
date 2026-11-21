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
