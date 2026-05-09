# TrustClaw Vercel Deployment

> Status: parked exception path.
> Purpose: deploy TrustClaw only as the isolated Vercel exception path for the
> internal CREATE SOMETHING operator companion.

TrustClaw's upstream deployment path is Vercel-first. Do not use it as the
default operator companion path.

The preferred evaluation path is Moltworker / RELAY on Cloudflare. See
`docs/guides/MOLTWORKER_OPERATOR_COMPANION.md`.

Use this TrustClaw/Vercel path only if Moltworker fails evaluation, a
Vercel-specific capability is required, or a client explicitly needs TrustClaw
upstream behavior.

Do not run the TrustClaw deploy CLI until the billing gates in this document are
confirmed.

## Current Posture

- Target scope: `createsomething`
- Target project name: `trustclaw`
- Runtime: upstream TrustClaw on Vercel
- Owner: CREATE SOMETHING
- Audience: internal operator only
- Client exposure: none by default
- Source of truth: monorepo operating model and upstream TrustClaw fork

## Billing Guardrails

Before deploy, confirm in the Vercel dashboard:

1. Spend Management is enabled for the target team.
2. The spend action includes pausing production deployments at the agreed cap.
3. Notifications are enabled for the owner/billing roles.
4. Marketplace storage billing is understood and accepted.
5. The deploy will not attach this project to unrelated high-traffic domains.

Important billing boundary:

- Vercel Spend Management covers metered resources beyond plan credits and
  allocation.
- Spend Management does not include seats, integrations such as Marketplace, or
  separate add-ons.
- TrustClaw's upstream deploy can provision Postgres through Vercel Marketplace
  and optionally Redis. Treat those as separate billing surfaces.

## Cost Estimate

Use this estimate before the first deploy. Replace it with actual invoice and
usage data after the first billing cycle.

| Component | Low internal use | Practical budget | Risk note |
| --- | ---: | ---: | --- |
| Vercel team/project | $0 marginal if the team already exists; otherwise about $20/mo for Pro | $20/mo | Confirm whether the target team is already paid. |
| Vercel compute/network/builds | $0-$10/mo | $10-$50/mo | Agent loops, long function execution, high traffic, or repeated builds can move this. |
| Vercel AI Gateway | $0-$10/mo | $10-$50/mo | Model choice and token volume dominate. Use cheap defaults for briefs/drafts. |
| Neon/Postgres + pgvector | $0 on free tier if tiny/intermittent | ~$15/mo Launch-style budget | Marketplace billing may be separate from Vercel spend caps. |
| Upstash Redis optional | $0 if omitted or free tier | $10/mo fixed small plan | Only enable Redis if resumable streams/abort flags are needed. |
| Composio | $0 under free tool-call limits | $29/mo Growth-style budget | Tool-call volume and premium tools can change this. |

Expected first-month ranges:

- **Bare internal test:** $0-$30/mo marginal, assuming existing Vercel team,
  free Neon, no Redis, Composio free, and light AI usage.
- **Clean practical budget:** $75-$125/mo, assuming Vercel Pro, Neon paid
  cushion, optional Redis, Composio Growth, and moderate AI usage.
- **Heavy/operator production:** $150-$300+/mo if tool calls, AI tokens,
  scheduled runs, logs, or production database usage grow.

Cost controls:

- Start without Redis unless the missing resumable-stream behavior is painful.
- Use the smallest acceptable model for routine briefs and drafts.
- Keep scheduled jobs sparse at first.
- Cap or alert Vercel spend, but do not rely on it for Marketplace storage.
- Check Composio tool-call volume weekly during the first month.
- Record actual usage after two weeks and again after the first invoice.

## Read-Only Preflight

Run:

```bash
pnpm trustclaw:vercel:preflight
```

This checks:

- Vercel CLI availability
- Vercel login
- target team/project visibility
- GitHub CLI login

It does not create a Vercel project, install Marketplace storage, deploy code,
or store secrets.

## Secrets

Do not store these in repo files:

- `COMPOSIO_API_KEY`
- `BETTER_AUTH_SECRET`
- `CRON_SECRET`
- `DATABASE_URL`
- `REDIS_URL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`

Use Vercel project environment variables, Infisical, or the TrustClaw deploy CLI
prompting path. If the deploy CLI creates secrets, mirror only secret references
into repo artifacts.

## Deployment Command

After billing gates and preflight pass, deploy from a temporary upstream checkout
or fork:

```bash
git clone https://github.com/ComposioHQ/trustclaw
cd trustclaw
pnpm install
npx @composio/trustclaw deploy
```

The upstream CLI may:

- fork or publish the repo to GitHub
- create a Vercel project
- provision Postgres + pgvector through Vercel Marketplace
- optionally provision Redis
- generate auth and cron secrets
- request a Composio API key
- run Prisma schema sync
- trigger a production deploy
- optionally configure Telegram

Do not run this command from the CREATE SOMETHING monorepo root.

## Post-Deploy Smoke

Before using TrustClaw operationally:

1. Verify login works.
2. Verify memory write/read works.
3. Connect one low-risk Composio account.
4. Run a read-only tool call.
5. Run a scheduled task with no external side effect.
6. Confirm action logs are visible.
7. Confirm connected account revocation works.
8. If Telegram is configured, send and receive a test message.
9. Add the deployment URL and project ID to the Retool operating model only as
   metadata, not as a secret.

## Retool Boundary

TrustClaw prepares and acts internally. Retool governs what becomes visible,
approved, client-facing, paused, retried, or escalated.

TrustClaw is allowed to:

- brief
- summarize
- draft
- create low-risk internal tasks
- run scheduled checks

TrustClaw requires approval before:

- sending client messages
- changing production workflows
- retrying risky jobs
- triggering deployments
- changing permissions

TrustClaw is blocked from:

- deleting records
- changing secrets
- making hiring/staffing decisions
- publishing public proof
- committing legal or financial terms

## Rollback

If cost, security, or behavior is unacceptable:

1. Disable scheduled jobs.
2. Revoke connected Composio accounts.
3. Pause or remove the Vercel project.
4. Remove Marketplace storage only after exporting required data.
5. Record the incident and decision in Retool and the monorepo delivery notes.
