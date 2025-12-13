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
wrangler pages deploy .svelte-kit/cloudflare --project-name=createsomething-[property]
```

### Verify

```bash
curl -I https://createsomething.[property]
```

### Monitor (separate terminal)

```bash
wrangler pages deployment tail --project-name=createsomething-[property]
```

### Rollback (If Needed)

```bash
wrangler pages deployment list --project-name=createsomething-[property]
wrangler pages deployment rollback [DEPLOYMENT_ID] --project-name=createsomething-[property]
```
```

## Project Name Mapping

| Package | Pages Project |
|---------|---------------|
| space | createsomething-space |
| io | createsomething-io |
| agency | createsomething-agency |
| ltd | createsomething-ltd |

## Complementarity Principle

**Claude Code creates, WezTerm executes.**

This command GENERATES commands for the user to execute in WezTerm.
Claude Code does NOT execute deployment commands directly.
