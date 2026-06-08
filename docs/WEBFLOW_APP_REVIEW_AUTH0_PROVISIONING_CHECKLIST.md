# Webflow App Review Auth0 Provisioning Checklist

> Archived: Auth0 was the previous `.agency` portal identity provider. Current reviewer provisioning should use Clerk identity flows; keep this checklist only for historical audit, export, or rollback context.

## Goal

Provision the two Webflow Marketplace app reviewers into `.agency`, create the corresponding Auth0 users, and verify first-login identity binding for the Phase A app-review rollout.

## Reviewers

- `pablo.miranda@webflow.com` -> `acct_wf_pablo` -> `wf-app-review-pablo`
- `shea.sisco@webflow.com` -> `acct_wf_shea` -> `wf-app-review-shea`

Shared tenant:

- `tenant_webflow_marketplace`

## Source files

- `.agency` seed manifest: `docs/examples/webflow-app-review-user-seed.csv`
- Auth0 user manifest: `specs/webflow-marketplace/delivery/app-review-hub/auth0-reviewer-user-manifest.json`

## Workflow

1. Seed identity rows into `.agency`.
2. Create or invite the two Auth0 users.
3. Have each reviewer complete first login through `.agency`.
4. Confirm the login binds the seed row to the Auth0 `sub`.
5. Confirm each reviewer lands in the expected reviewer-scoped Hub lane.
6. Apply Phase A read-only Hub posture.
7. Verify traces resolve reviewer identity before any write enablement.

## Seed `.agency`

Generate SQL from the reviewer seed manifest:

```bash
pnpm exec tsx packages/agency/scripts/prepare-agency-identity-seed.ts docs/examples/webflow-app-review-user-seed.csv > /tmp/webflow_app_review_identity_seeds.sql
```

Then apply the SQL to the `.agency` D1 database using the normal Wrangler workflow.

## Create Auth0 users

Required environment:

- `AUTH0_DOMAIN`
- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`
- `AUTH0_CONNECTION`

Dry run first:

```bash
DRY_RUN=true AUTH0_CONNECTION="<your-db-or-passwordless-connection>" scripts/auth0-create-reviewer-users.sh
```

Create the users:

```bash
AUTH0_CONNECTION="<your-db-or-passwordless-connection>" scripts/auth0-create-reviewer-users.sh
```

Notes:

- The script is idempotent by email. Existing users are reported and skipped.
- The manifest defaults to `email_verified=false` and `verify_email=true`.
- Do not store temporary passwords or invitation secrets in repo-tracked files.

## First-login verification

After each reviewer logs in, verify:

- `/dashboard` resolves the expected `account_id` and `tenant_id`
- the reviewer is mapped to the expected Hub slug
- the reviewer session resolves actor identity cleanly
- Phase A discovery is read-only
- mutable routes do not appear in reviewer discovery

## Hub rollout checks

Before enabling any write path, confirm:

- reviewer-specific Hub posture is applied
- `webflow-app-review-mcp` is the only required active server for Phase A
- rate limits and quotas are enabled before write rollout
- traces include reviewer identity and `correlation_id`
- manual fallback is rehearsed

## Open assumptions to confirm

- `tenant_webflow_marketplace` is the correct shared tenant id
- per-reviewer account ids should remain distinct
- the intended Auth0 connection is the correct reviewer login boundary
- reviewer-to-Hub slug binding happens outside Auth0 only if the app metadata is insufficient
