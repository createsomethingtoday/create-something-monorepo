---
description: Generate deployment commands for a CREATE SOMETHING property
argument-hint: "<space|io|agency|ltd>"
---

# Deploy $1

Generate deployment commands for the `$1` property.

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

## Steps

1. **Pre-flight**: Run type check (`pnpm --filter=$1 exec tsc --noEmit`) and build (`pnpm --filter=$1 build`)
2. **Deploy**: `wrangler pages deploy packages/$1/.svelte-kit/cloudflare --project-name=<exact-project-name>`
3. **Verify**: `curl -I https://createsomething.$1`
4. **Monitor**: `wrangler pages deployment tail --project-name=<exact-project-name>`
5. **Rollback**: `wrangler pages deployment list --project-name=<exact-project-name>` then `wrangler pages deployment rollback [DEPLOYMENT_ID] --project-name=<exact-project-name>`

## Output

Provide a complete runnable script with all commands. Record the deployment in the relevant Linear issue.
