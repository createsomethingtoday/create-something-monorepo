# Private legal pages

Public routes `/terms` and `/privacy` are specific to Private. Terms remain effective September 20, 2026, version 1.0. Privacy is effective September 21, 2026, version 1.1, including personal learning progress and its 365-day inactive-progress cleanup. The footer, signup, creator application and company-support request point to these pages rather than agency-wide boilerplate. Keep policy changes in normal review; do not silently substitute a generic policy.

## Source reconciliation

- `src/hooks.server.ts`, `src/lib/server/content-api.ts`, `src/routes/apply/+page.server.ts`, and `src/routes/api/impersonation/+server.ts`: Identity validation, host-only cookies, access/refresh/invitation/support lifetimes.
- `migrations/0008_creator_admission.sql`, creator routes and trial route: human review, exact-email invitations, one-calendar-month trial, no automatic charge; creator approval is not partner approval.
- `src/lib/server/asset-orders.ts`, release/download/export routes: exact-version entitlements, private package delivery, immutable manifests, metadata export limitations; archiving is not deletion.
- `src/lib/impact.ts`, impact routes, playback records and migration0012: aggregate engagement versus operational records, DNT/GPC for engagement, audited15-minute read/write support. No blanket90-day deletion or seven-day account-retention promise.
- `src/lib/server/learning.ts`, migration0015 and `src/retention-worker.ts`: personal playback/watched/practice-start records, account/network access boundaries, exclusion from creator exports and daily removal after 365 days without an update.
- Identity `src/services/crypto.ts` and `enrollment.ts`: hashed passwords and Resend verification/recovery delivery.
- User-approved commercial scope: only900USD/month company support uses95/5; creator asset pricing is independent. Checkout and signed engagement determine taxes, fees, refunds and support scope; no newly invented net-payout promise.
- Existing published contact addresses retained: legal@createsomething.io and privacy@createsomething.io. Operator identified as CREATE SOMETHING without inventing an LLC name, physical address, governing state, arbitration requirement or regulatory certification.

## External reference checks

Reviewed September20,2026:

- [FTC privacy/security guidance](https://www.ftc.gov/business-guidance/privacy-security): privacy promises must match practice.
- [California DOJ privacy guidance](https://www.oag.ca.gov/privacy/ccpa): transparent categories, purposes and request information; applicability is jurisdiction-specific, not claimed globally.
- Provider privacy links verified: [Cloudflare](https://www.cloudflare.com/privacypolicy/), [Resend](https://resend.com/legal/privacy-policy), [Stripe](https://stripe.com/privacy).

These are product-specific terms and operational disclosures, not a legal-compliance certification. Future provider, retention, model-use or access changes require reconciling these documents before release. Special company confidentiality, residency and processing agreements are separate from ordinary platform terms. No generic perpetual promotional license over private creator content is carried over.

## Verification

Svelte checking and build; public200 routes; real desktop/mobile layout, contents anchors, keyboard and footer/signup links. No test should merely assert prose strings. Deployment changes pages and notices only: no database migration, auth or payment activation. Rollback is the preceding Worker version. Preserve the pending free-assets preview release when staging this independent legal change.
