---
description: Generate deployment commands for WezTerm execution
allowed-tools: Read, Bash, Grep
---

# Deploy Command

Generate deployment commands following the Complementarity Principle.

## Usage

```
/deploy <space|io|agency|ltd>
```

## What It Does

1. Validates deployment readiness (types, build)
2. Generates WezTerm commands
3. Provides verification and rollback steps

## Output Format

```markdown
## Deployment: [Property]

### Pre-Flight Checks
- [ ] Types validated
- [ ] Build successful

### Commands for WezTerm

```bash
cd /Users/micahjohnson/Documents/Github/Create\ Something/create-something-monorepo
pnpm --filter=[property] build
cd packages/[property]
# Use exact project name from mapping table below
wrangler pages deploy .svelte-kit/cloudflare --project-name=[exact-project-name]
```

### Verify

```bash
curl -I https://createsomething.[property]
```

### Monitor (separate terminal)

```bash
# Use exact project name from mapping table
wrangler pages deployment tail --project-name=[exact-project-name]
```

### Rollback (If Needed)

```bash
# Use exact project name from mapping table
wrangler pages deployment list --project-name=[exact-project-name]
wrangler pages deployment rollback [DEPLOYMENT_ID] --project-name=[exact-project-name]
```
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

## Complementarity Principle

**Claude Code creates, WezTerm executes.**

This command GENERATES commands for the user to execute in WezTerm.
Claude Code does NOT execute deployment commands directly.
