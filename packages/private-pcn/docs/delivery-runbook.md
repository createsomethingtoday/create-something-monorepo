# Managed PCN delivery runbook

## Offer and ownership

Discovery produces a written scope covering library size, brand assets, series, invitation or paid access, import method, launch date, named approver and acceptance workflow. Separate implementation, recurring support and hosting/video usage. Never inherit the Outerfields $99 access pass or $19,999 build price. Content production, paid memberships, integrations and a client-editable Replit frontend require explicit scope.

Deliver owned code/configuration, client domain, isolated data/media bindings, publishing/member workflow, training, backup/export, monitoring and rollback. Support coverage and response times belong in the client agreement. Agree who pays each provider and what happens on termination. Confirm permission to use every film, caption and image.

## Access and isolation

Use one deployment and database per network. This demo is not shared multi-tenant SaaS. Reuse implementation patterns, never client database IDs, secrets, administrator emails or media. Database owns content/members/receipts; Automation owns upload/process/publish/playback; Judgment owns invitation/publication/promotion policy.

This .agency application uses the exact `agency` Identity audience, host-only secure cookies, verified token contract, online active-account readback, and fresh network membership. Agency commercial entitlement does not imply PCN access. No preview/demo administrator bypass is permitted.

`/admin` grants or revokes library access. It does not create an Identity account or send an email. Confirm the invitee has a verified account through the owning Identity workflow before handoff. Send invitations only when authorized. Revocation blocks new grants immediately; issued 60-second tokens and buffered media cannot be recalled. Do not claim DRM or download prevention.

## Provision and publish

1. Record issue, owner, approved scope, exact account/domains and rollback owner.
2. Create isolated D1, commit its real binding ID and apply the schema to that target. Keep preview and production separate; do not copy client seeds.
3. Configure verified administrator emails and an account-scoped Stream Read/Edit credential through the owning secret manager. Bind `CLOUDFLARE_STREAM_API_TOKEN` as a Worker secret. Never place it in code, browser responses, CLI arguments or logs.
4. Inspect existing domain records before attaching Worker custom domains. Never replace an existing service without reconciling ownership.
5. Upload via the admin browser. TUS creates a private original and draft row, bounded to 1 GB/30 minutes. Confirm existing storage capacity; do not silently buy more.
6. Check processing. Readiness is accepted only after Stream confirms signed originals. Deliberately select members or public preview; public previews still use signed delivery.
7. Reconcile failed uploads before retrying. A provider success followed by a database failure can leave an orphan: locate it using the task video ID/creator and `network` metadata. Delete only verified task-owned orphan data with appropriate authorization.
8. Validate below, review/merge through repo gates, deploy immutable source, then repeat production acceptance. Git-light deploy is an inner-loop preview exception.

## Acceptance

- Anonymous offer, public preview, mobile/desktop, keyboard, reload, error recovery and booking handoff work.
- Administrator uploads, processes and publishes actual media. Unfinished or unsigned originals cannot be published.
- A valid member cannot access administration; anonymous/uninvited visitors cannot see private metadata or receive grants.
- Invited member watches; revocation plus reload denies new grants and private metadata. Confirm the residual expiry of already issued grants.
- Direct provider originals/manifests without a token fail. No legacy raw-video route exists.
- Logout removes local credentials and clean reload remains denied. Supporting tests reject wrong issuer/audience/signature/expiry.
- A film longer than one token lifetime plays across renewal, subject to fresh access checks.
- Record commit, deployment/version IDs, resource ownership, screenshots and exact browser workflow results. Mocks/builds cannot substitute for live acceptance.

## Operations and recovery

Worker observability records runtime failures; admin receipts record publication/access changes. Playback-grant counts include renewals and are not unique viewers or completed watches. Monitor Stream processing failures, storage/delivery usage, Identity failures and 429/5xx responses. The edge limiter bounds client/location bursts, not global cost.

Demo limit: 20 unarchived films. Archiving does not delete stored originals or reduce provider charges. Production usage budgets, alert recipient, incident owner and monthly review belong in the client agreement. Clean up only verified task-owned expired uploads through the provider.

Use the supported D1 export against the exact named database, saving private member data outside the repo in approved storage. Verify restore into a separate non-production database. Retention/deletion follows the client agreement. Do not hand over paste-ready configurations with placeholder bindings.

Before promotion, record the prior Worker version. Roll back to that known-good version through Cloudflare/Wrangler after confirming the exact application. Preserve additive schema/data. Revoke secrets only through the owning workflow. If the initial release fails, preserve its database for diagnosis and remove only task-owned domains/Worker through a reviewed cleanup.

## Closeout

Record issue, operator, domain, commit/deploy version, resource owner, access/publication rules, usage limits, support coverage, acceptance evidence, exceptions, rollback owner and `Worktree disposition:`. Do not mark a network complete merely because deployment succeeds.
