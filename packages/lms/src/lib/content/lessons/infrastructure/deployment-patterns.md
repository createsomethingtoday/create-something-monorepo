# Deployment Patterns

## The Principle

**Making deployment invisible.**

The best deployment is the one you don't think about. Code flows from development to production without ceremony, without anxiety, without manual steps.

## The Goal: Zero-Friction Deployment

Traditional deployment creates friction:
- Wait for CI/CD pipeline
- Approve staging review
- Schedule deployment window
- Monitor rollout
- Rollback if issues

Subtractive deployment removes friction:
- Push code
- It's live

**Every step that doesn't add value is a step to remove.**

## Cloudflare Pages Deployment

SvelteKit + Cloudflare Pages = Automatic deployment:

```bash
# The entire deployment process
git push
```

That's it. Cloudflare:
1. Detects the push
2. Runs the build
3. Deploys globally
4. Serves at the edge

### Configuration

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-cloudflare';

export default {
  kit: {
    adapter: adapter({
      routes: {
        include: ['/*'],
        exclude: ['<all>']
      }
    })
  }
};
```

### Build Settings

In Cloudflare dashboard or `wrangler.toml`:

```toml
# wrangler.toml for Pages
name = "create-something-space"
pages_build_output_dir = ".svelte-kit/cloudflare"
# Note: Actual project names vary - see .claude/rules/cloudflare-patterns.md

[build]
command = "pnpm build"
```

## Workers Deployment

Standalone Workers deploy via Wrangler:

```bash
# Deploy to production
wrangler deploy

# Deploy to preview
wrangler deploy --env preview
```

### Environment Configuration

```toml
# wrangler.toml
name = "api-worker"
main = "src/index.ts"

[vars]
ENVIRONMENT = "production"

[env.preview]
name = "api-worker-preview"
[env.preview.vars]
ENVIRONMENT = "preview"
```

## Database Migrations

D1 migrations should be automated but explicit:

### Migration Flow

```bash
# 1. Create migration
wrangler d1 migrations create DB_NAME add_feature

# 2. Write SQL
# migrations/0005_add_feature.sql

# 3. Test locally
wrangler d1 migrations apply DB_NAME --local

# 4. Apply to production
wrangler d1 migrations apply DB_NAME
```

### CI/CD Integration

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - run: pnpm install

      - name: Apply migrations
        run: wrangler d1 migrations apply DB_NAME
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

      - name: Deploy
        run: wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

## Preview Deployments

Every pull request gets a preview:

```yaml
# .github/workflows/preview.yml
name: Preview

on:
  pull_request:
    branches: [main]

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - run: pnpm install
      - run: pnpm build

      - name: Deploy Preview
        id: deploy
        run: |
          URL=$(wrangler pages deploy .svelte-kit/cloudflare --branch ${{ github.head_ref }})
          echo "url=$URL" >> $GITHUB_OUTPUT
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🚀 Preview deployed: ${{ steps.deploy.outputs.url }}'
            })
```

## Secrets Management

Never commit secrets. Use Wrangler:

```bash
# Set a secret
wrangler secret put API_KEY

# Set for specific environment
wrangler secret put API_KEY --env preview
```

Access in Workers:

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // env.API_KEY is available but never logged/exposed
    const response = await fetch('https://api.example.com', {
      headers: { Authorization: `Bearer ${env.API_KEY}` }
    });
    return response;
  }
};
```

## Rollback Strategies

### Instant Rollback (Pages)

Every deployment creates a version. Rollback via dashboard or CLI:

```bash
# List deployments
wrangler pages deployments list --project-name=my-project

# Rollback to specific deployment
wrangler pages deployments rollback <deployment-id> --project-name=my-project
```

### Worker Versions

```bash
# List versions
wrangler deployments list

# Rollback
wrangler rollback <version-id>
```

### Feature Flags for Gradual Rollout

Use KV-based feature flags for controlled rollout:

```typescript
async function shouldUseNewFeature(userId: string, env: Env): Promise<boolean> {
  // Check if feature is enabled
  const flag = await env.FLAGS.get('new-feature', { type: 'json' });

  if (!flag || !flag.enabled) return false;

  // Percentage rollout
  if (flag.percentage < 100) {
    const hash = await hashUserId(userId);
    return (hash % 100) < flag.percentage;
  }

  return true;
}
```

## Monorepo Deployment

For multiple packages, deploy only what changed:

```yaml
# .github/workflows/deploy.yml
name: Deploy Changed Packages

on:
  push:
    branches: [main]

jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      space: ${{ steps.changes.outputs.space }}
      io: ${{ steps.changes.outputs.io }}
      agency: ${{ steps.changes.outputs.agency }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v2
        id: changes
        with:
          filters: |
            space:
              - 'packages/space/**'
            io:
              - 'packages/io/**'
            agency:
              - 'packages/agency/**'

  deploy-space:
    needs: changes
    if: ${{ needs.changes.outputs.space == 'true' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm --filter=space build
      - run: wrangler pages deploy packages/space/.svelte-kit/cloudflare

  deploy-io:
    needs: changes
    if: ${{ needs.changes.outputs.io == 'true' }}
    runs-on: ubuntu-latest
    steps:
      # Similar to deploy-space
```

## Zero-Downtime Patterns

### Blue-Green with Workers

```typescript
// router-worker
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const deployment = await env.KV.get('active-deployment');

    if (deployment === 'blue') {
      return env.BLUE.fetch(request);
    }

    return env.GREEN.fetch(request);
  }
};
```

Switch deployments instantly:

```bash
wrangler kv:key put active-deployment green --namespace-id=xxx
```

### Canary Deployments

Route percentage of traffic to new version:

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const canaryPercent = parseInt(await env.KV.get('canary-percent') || '0');

    if (Math.random() * 100 < canaryPercent) {
      return env.CANARY.fetch(request);
    }

    return env.STABLE.fetch(request);
  }
};
```

## Monitoring Deployments

### Health Checks

```typescript
// health.ts - Simple health endpoint
export function handleHealth(env: Env): Response {
  return Response.json({
    status: 'healthy',
    version: env.VERSION,
    timestamp: new Date().toISOString()
  });
}
```

### Deployment Notifications

```yaml
# In deploy workflow
- name: Notify Deployment
  if: success()
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
      -H 'Content-Type: application/json' \
      -d '{"text": "✅ Deployed ${{ github.repository }} to production"}'
```

## The Invisible Deployment Checklist

For deployment to truly recede:

1. **Push triggers deploy** → No manual steps
2. **Tests run automatically** → Failures block deploy
3. **Migrations are automated** → Schema stays in sync
4. **Secrets are managed** → Never in code
5. **Rollback is instant** → One command recovery
6. **Previews are automatic** → Every PR is testable
7. **Monitoring is passive** → Alerts only on problems

**When deployment is invisible, you focus on building.**

---

## Reflection

Before moving on:

1. How many manual steps exist in your current deployment process?
2. How long does it take from "git push" to "live in production"?
3. When was the last time deployment itself caused an incident?

**Good deployment is deployment you forget about.**

---

## Cross-Property References

> **Canon Reference**: Invisible deployment embodies [Dwelling in Tools](https://createsomething.ltd/patterns/dwelling-in-tools)—infrastructure that recedes into transparent use.
>
> **Canon Reference**: The deployment checklist applies [Principled Defaults](https://createsomething.ltd/patterns/principled-defaults)—automation that guides toward correct outcomes.
>
> **Practice**: Study `.github/workflows/` in any CREATE SOMETHING property for real deployment patterns.
