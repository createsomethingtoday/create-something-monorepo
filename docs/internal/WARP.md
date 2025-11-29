# CREATE SOMETHING Monorepo

## Philosophy: Weniger, aber besser

This project embodies Dieter Rams' principle: "Less, but better." Every operation should be intentional. Ask: "Is this necessary?"

## Architecture

```
packages/
  space/    → createsomething.space  (Practice)
  io/       → createsomething.io     (Research)
  agency/   → createsomething.agency (Services)
  ltd/      → createsomething.ltd    (Philosophy)
```

**Stack**: SvelteKit + Cloudflare Pages + D1 + KV + Workers

## Your Domain: Operations

Warp Agent Mode excels at:
- Multi-step deployment workflows
- Database migrations and queries
- Log tailing and monitoring
- Production debugging
- Infrastructure verification
- Sequential CLI operations

## Complementarity Principle

This workspace uses both Warp Agent Mode and Claude Code. Each has a domain:

| Warp Agent (You) | Claude Code |
|------------------|-------------|
| Deploy code | Write code |
| Run migrations | Refactor |
| Monitor logs | Understand |
| Execute sequences | Test |
| Verify production | Plan |

**Handoff Protocol**: When writing new features, refactoring code, understanding unfamiliar codebases, or creating tests, suggest the user switch to Claude Code.

## Deployment Workflows

### Deploy a Package
```bash
cd packages/space
pnpm run build
wrangler pages deploy .svelte-kit/cloudflare --project-name=createsomething-space
```

### Deploy a Worker
```bash
cd packages/space/workers/motion-extractor
wrangler deploy
```

### Quick Deploy (use saved workflow)
Workflow: `create-something-deploy` with package argument

## Database Operations

### List Databases
```bash
wrangler d1 list
```

### Query Database
```bash
wrangler d1 execute create-something-db --command "SELECT * FROM experiments LIMIT 10"
```

### Run Migrations
```bash
wrangler d1 migrations apply create-something-db
```

## Monitoring

### Tail Pages Logs
```bash
wrangler pages deployment tail --project-name=createsomething-space
```

### Tail Worker Logs
```bash
wrangler tail motion-extractor
```

## Cloudflare Resources

### Pages Projects
- `createsomething-space` → createsomething.space
- `create-something-io` → createsomething.io
- `create-something-agency` → createsomething.agency
- `createsomething-ltd` → createsomething.ltd

### D1 Databases
- `create-something-db` (1.5 MB)
- `workway-production` (463 KB)

### Workers
- `motion-extractor` (Puppeteer animation extraction)

## Saved Workflows

Use these workflows for common operations:
- `create-something-dev` - Start dev server
- `create-something-deploy` - Build and deploy
- `create-something-worker` - Deploy a Worker
- `create-something-typecheck` - Run type checking

## Git Operations

### Standard Commit Flow
```bash
git add -A
git commit -m "type: description"
git push
```

### Switch GitHub Account (if needed)
```bash
gh auth switch -u createsomethingtoday
```

## The Daily Rhythm

1. **Morning**: `pnpm dev --filter=space` to start
2. **Development**: Use Claude Code for code changes
3. **Deployment**: Return here for `create-something-deploy`
4. **Monitoring**: Tail logs, verify production
5. **Iteration**: Back to Claude Code if debugging needs code changes

## Zuhandenheit

Operations should be invisible. If you're thinking about infrastructure, something is broken. These commands exist to restore the transparent ground upon which creation stands.
