# Deployment Patterns

Deployment and migration workflows for Cloudflare Pages.

## Complementarity Principle

**Claude Code creates, WezTerm executes.**

| Claude Code | WezTerm |
|-------------|---------|
| Write code | Deploy code |
| Generate commands | Execute commands |
| Validate types | Apply migrations |
| Test locally | Monitor production |

## Standard Deployment Sequence

```bash
# 1. Build
pnpm --filter=[property] build

# 2. Deploy (use exact project name from mapping table below)
cd packages/[property]
wrangler pages deploy .svelte-kit/cloudflare --project-name=[exact-project-name]

# 3. Verify
curl -I https://createsomething.[property]

# 4. Monitor
wrangler pages deployment tail --project-name=[exact-project-name]
```

## Project Name Mapping

**Critical**: Use exact project names. Naming is inconsistent due to historical reasons.

| Package | Cloudflare Pages Project | Domain |
|---------|--------------------------|--------|
| space | `create-something-space` | createsomething.space |
| io | `create-something-io` | createsomething.io |
| agency | `create-something-agency` | createsomething.agency |
| ltd | `createsomething-ltd` | createsomething.ltd |
| lms | `createsomething-lms` | learn.createsomething.space |
| templates-platform | `templates-platform` | templates.createsomething.space |

## Database Migrations

### Create Migration

```bash
cd packages/[property]
wrangler d1 migrations create DB_NAME migration-name
```

Edit: `migrations/NNNN_migration-name.sql`

### Apply Migration

```bash
# Local first
wrangler d1 migrations apply DB_NAME --local

# Test locally
pnpm dev

# Then production
wrangler d1 migrations apply DB_NAME
```

## Rollback

```bash
# List deployments (use exact project name from mapping table)
wrangler pages deployment list --project-name=[exact-project-name]

# Rollback
wrangler pages deployment rollback [DEPLOYMENT_ID] --project-name=[exact-project-name]
```

## Pre-Deployment Checklist

- [ ] Types valid (`pnpm --filter=[property] exec tsc --noEmit`)
- [ ] Build succeeds (`pnpm --filter=[property] build`)
- [ ] Canon compliant (`./.claude/hooks/check-canon.sh`)
- [ ] Changes committed
- [ ] Migrations applied (if database changes)
