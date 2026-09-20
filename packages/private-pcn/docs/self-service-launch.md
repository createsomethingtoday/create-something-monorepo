# Self-service launch — CRE-2030

Status: implementation in progress. Production still serves the managed-service release c96d5466a. No self-service database migration, signup enablement, or payment configuration has been applied remotely.

## Commercial decision

The user directed current market research and a price 50% below a comparable selling offer. Current primary-source Uscreen Starter is USD49/month, monthly billing. CREATE SOMETHING Private launches at USD24.50 per network per month. This compares base subscription prices only; it does not claim competitor sales volumes or feature parity.

Sources checked September 20, 2026:
- https://www.uscreen.tv/pricing/ — Starter49/month;100subscribers;20hours storage; Uscreen branded domain. Its monetization and community features exceed this initial private-library product.
- https://circle.so/pricing — Professional advertised89/month with billing footnote; broader community platform. Not the launch benchmark.
- https://www.mightynetworks.com/pricing/launch —950/year. Annual charge is not a monthly subscription comparison.
- https://developers.cloudflare.com/stream/pricing/ — storage capacity5USD per1000minutes/month; delivery1USD per1000minutes. Storage is prepaid in capacity blocks; actual delivery includes buffering and segment rounding.

Working launch allowance, pending enforcement and provider acceptance: one owner,100 active members,20 uploaded sessions,30minutes and1GB maximum per session (up to10hours stored),5000 provider-reported delivered minutes per calendar month. No automatic overage billing. Warn before the delivery allowance and suspend new playback grants when exceeded; document analytics lag. Do not market unlimited viewing or substitute grant counts for measured delivery. Archived assets still occupy storage until deleted at the provider. Provider billing capacity and tax settings need live validation before selling.

At full utilization, allocated video costs are approximately3USD storage plus5USD delivery, before capacity-block rounding, payment fees, hosting, support, taxes, and analytics lag. This is a planning estimate, not a verified margin or spending authorization.

## Implemented locally

- Additive network ownership migration keeps existing rows in the default network.
- Verified Identity subject owns newly created draft networks; caller cannot set ownership or paid status.
- Catalog, media, memberships and evidence are scoped to the selected network.
- Dashboard creates drafts and links to network studio/settings/library.
- Owner-only settings close existing public previews when changing to members-only.
- Signup/recovery pages use the owning Identity service directly, preserving actual client IP limits.
- Identity enrollment is disabled by default. Random single-use15minute mailbox proof is hashed at rest; signup never overwrites existing accounts; recovery revokes refresh tokens. No session or membership is minted from an email alone.

## Required before promotion

1. Review first-party enrollment contract, full Identity regressions, mail sender/domain configuration, CORS, independent preview and real verification/recovery acceptance. No real email has been sent in tests.
2. Stripe test-mode key or restored connector; hosted subscription Checkout, Customer Portal, signed/replay-safe lifecycle handling, server-side entitlement reconciliation, cancel/payment-failure recovery. Existing discovered key is live; no test charge is authorized with it.
3. Stream Read/Edit credential on the CREATE SOMETHING account, actual private upload/processing/publish/playback and revocation proof.
4. Atomic storage reservations, active member limit, provider delivery metering and visible usage. Subscription status never comes from a redirect or browser input.
5. Creator export, safe cancellation/deletion, operational recovery, launch terms and support path.
6. Full UI/browser/mobile/keyboard/error/reload acceptance with two independent identities and cross-network negatives. Public production resolver problem on this Mac remains distinct from provider HTTPS readback.
7. PR review/CI/merge, ordered migrations and immutable deployments, production readback and rollback evidence in Linear.

Worktree disposition: preserved at /private/tmp/cre-2030-private-pcn, branch codex/cre-2030-self-service until full paid self-service acceptance.

## Latest implementation checkpoint

Implemented locally: hosted Checkout at the verified2450-cent monthly price; customer ownership checked for portal access; database lease and persistent idempotency keys; reconciliation of lost Checkout responses; raw signed webhooks with replay receipts and fresh provider subscription reads; paid-invoice, pause, expiry and cancellation handling; five-minute fail-closed entitlement refresh;100-member database cap;20-slot atomic upload reservations; provider inventory recovery; permanent media deletion with uncertain-outcome preservation; owner-only metadata/member/activity export; provider-reported calendar-month delivery allowance and visible usage. Existing default network remains outside SaaS billing.

Validation:52PCN tests and78Identity tests passed before final copy/return-path changes; rerun required after final edits. Actual local browser:390px signup has no horizontal overflow; recovery screen, missing verification link, and unauthenticated dashboard redirect pass. Screenshot `/tmp/pcn-self-service-signup-mobile.png` inspected. Authenticated creator workspace and real email/payment/media workflows remain unverified.

Runtime dependencies still needed: Stream Read/Edit plus Account Analytics permission (one combined credential or separate `CLOUDFLARE_ANALYTICS_API_TOKEN`); Stripe test-mode credential or reauthenticated connector; verified Identity mailbox sender and real test identities. No live charges, emails, Stripe products/prices/webhooks or new paid capacity have been created.

## Release configuration and rollback

PCN: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, and a dedicated `STRIPE_PORTAL_CONFIGURATION_ID`; use separate test and live objects. Portal configuration must allow payment-method updates, invoices and cancellation at period end, with subscription plan switching disabled. Subscribe to checkout.session.completed/async_payment_succeeded/async_payment_failed and customer.subscription.created/updated/deleted plus invoice.paid/payment_failed. Confirm the endpoint signs the raw payload and failed deliveries retry. `STRIPE_AUTOMATIC_TAX_ENABLED` must only be set after checking registrations and the owning tax configuration.

Enable `PCN_SELF_SERVICE_ENABLED` only after full first-party onboarding, Stream/Analytics and Stripe test acceptance, actual live object readback, terms/usage review and immutable release promotion. Identity enrollment requires migration0016, verified Resend sender, exact private-domain CORS, and `PUBLIC_ENROLLMENT_ENABLED=true`. Discovery reports whether enrollment is configured. The normal login endpoint remains the only session-issuing path.

Apply PCN migrations0002–0005 to the isolated preview first. They preserve existing rows, but0002 changes the membership primary key; the old Worker is not a write-compatible rollback after this migration. Capture a D1 Time Travel bookmark/export before production migration. Prefer a forward fix or disable paid activation while preserving the new schema; reverting to the old Worker requires a deliberate database restore and reconciliation of every post-bookmark write. Never silently restore over new customer records.

A final independent acceptance pass must cover failed/canceled payment, duplicate and out-of-order events, portal cancellation, expiry, signup/recovery/replay, invited member return to the original network, cross-network access denial, actual Stream original protection, provider usage query and cap, deletion recovery and record export. Mocked provider results are supporting proof only.
