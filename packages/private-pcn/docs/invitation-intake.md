# Invitation intake — CRE-2086

`/join` accepts introductions from learners, creators, and people interested in both.
The homepage and signup help link here. Existing emailed invitation links still use
`/apply?invite=…`; enrollment, membership, creator review, and free-month policies
are unchanged.

Database owns `invitation_requests` and append-only reviewer decisions. Automation
owns bounded submissions, rate limiting, duplicate handling, and scheduled retention.
Human reviewers decide fit; submitting or marking reviewed never grants access.

## Experience

Three steps: direction, practice, introduction. Existing Human Ink practice/card/exchange
art follows the selected path. Names and contact details are requested last, alongside
a readable summary. No local-storage copy of personal answers. Back/edit preserves
in-memory answers; reload intentionally starts fresh. A server-rendered form works
without JavaScript. Progress, visible validation, keyboard focus, and reduced motion
retain the same meaning. Optional work URLs must be HTTPS without embedded credentials.

The reusable primitives are the existing SerifPhrase, Icon, button/field styles,
and performance tokens. This is a local workflow layout, not a new Canon primitive.
Mobbin search intent was request-invitation onboarding; no Mobbin tool was available.
Pattern status: adapt the existing PRIVATE onboarding contract, verify in browser.

CTX context: Codex session 34500c5c, event fceee43b (invite and review only), and
Codex session 0505e7d3, event 6c142963 (Human Ink onboarding and creator ownership).
Current package docs and live entry pages were verified separately from that history.

## Submission and review

- Same-origin POST, 16 KiB body limit, 5 requests/minute/client/edge location using
  `PCN_INTAKE_RATE_LIMIT`; fail closed without the binding. This bounds bursts, not
  distributed/global abuse. A honeypot discards obvious automated submissions.
- One immutable introduction per normalized email and intent during its retention
  window. Repeat responses do not reveal whether an email already has a request.
  This is not proof of email ownership. Do not use intake details as authentication.
- Name, email, selected intent, practice, optional work link/referral, and explicit
  review/contact permission are stored. No newsletter subscription or automated email.
- `/review/intake` is restricted to current platform reviewers and denies
  impersonation. Status filters show the oldest 200 so a backlog can be processed.
  Revision checks reject stale decisions; a database trigger records each review.
- Review states are new/reviewed/closed. Review is internal and does not send anything.
  Use existing member-access or creator-invitation tools for a separately deliberate
  invitation. Creator publishing still requires credentials and a teaching video.
  Only send messages when authorized. Submitted links are untrusted external material.
- The daily retention Worker removes introductions older than 90 days and cascades
  their review notes. Privacy page v1.4 documents the new record and retention.

## Release and rollback

Apply additive migration 0026 to the named preview database, then deploy/test the
preview application. After normal PR gates, apply the same migration to production,
deploy the exact merged application source and retention Worker. Keep all existing
payment/enrollment flags. Record previous Worker versions before promotion.

Rollback the application and retention Worker to their prior versions; retain schema
and submitted introductions. Do not drop tables or replay submissions as a rollback.
No email, membership, Identity account, billing, or creator approval is created by intake.
