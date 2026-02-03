# Deployment Guide - Webflow Review

Step-by-step deployment instructions for production.

---

## Prerequisites

- Cloudflare account with Workers enabled
- `wrangler` CLI installed: `npm install -g wrangler`
- Authenticated: `wrangler login`
- Node.js 20+ installed
- pnpm installed

---

## Step 1: Create Cloudflare Resources

### Automated Setup (Recommended)

```bash
cd packages/webflow-review
pnpm install
pnpm setup
```

This script will:
1. Create D1 database
2. Create KV namespace
3. Create R2 bucket
4. Create queues
5. Update wrangler.toml files with IDs
6. Apply database migrations

### Manual Setup (If Automated Fails)

```bash
# 1. Create D1 database
wrangler d1 create webflow-review-db
# Copy the database_id from output

# 2. Create KV namespace
wrangler kv:namespace create KV
# Copy the id from output

# 3. Create R2 bucket
wrangler r2 bucket create webflow-review-screenshots

# 4. Create queues
wrangler queues create webflow-review-queue
wrangler queues create webflow-review-dlq

# 5. Update wrangler.toml files
# Replace YOUR_D1_DATABASE_ID and YOUR_KV_NAMESPACE_ID in:
# - workers/orchestrator/wrangler.toml
# - workers/queue-consumer/wrangler.toml
```

---

## Step 2: Apply Database Migrations

```bash
cd packages/webflow-review

# Apply to production
wrangler d1 migrations apply webflow-review-db --remote

# Verify
wrangler d1 execute webflow-review-db --command "SELECT name FROM sqlite_master WHERE type='table'"
```

Expected tables:
- reviews
- findings
- review_pages
- api_usage

---

## Step 3: Deploy Workers

### Deploy Orchestrator

```bash
cd packages/webflow-review/workers/orchestrator
pnpm install
pnpm deploy
```

Expected output:
```
Published webflow-review-orchestrator
  https://webflow-review-orchestrator.YOUR_SUBDOMAIN.workers.dev
```

### Deploy Queue Consumer

```bash
cd packages/webflow-review/workers/queue-consumer
pnpm install
pnpm deploy
```

Expected output:
```
Published webflow-review-queue-consumer
  Consuming from queue: webflow-review-queue
```

---

## Step 4: Verify Deployment

### Health Check

```bash
curl https://webflow-review-orchestrator.YOUR_SUBDOMAIN.workers.dev/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": 1704067200000,
  "version": "1.0.0"
}
```

### Test Single Page Review

```bash
curl -X POST https://webflow-review-orchestrator.YOUR_SUBDOMAIN.workers.dev/api/review/page \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://preview.webflow.com/preview/new-clann?preview=a8cf79ecaf5ea08516e9e9e702e1d54c"
  }'
```

Expected: Response in <5 seconds with findings array.

### Test Full Project Review

```bash
curl -X POST https://webflow-review-orchestrator.YOUR_SUBDOMAIN.workers.dev/api/review/project \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "test",
    "pages": ["https://example.com"]
  }'
```

Expected: `reviewId` and `statusUrl` returned immediately.

### Check Database

```bash
wrangler d1 execute webflow-review-db --command "SELECT * FROM reviews LIMIT 5"
```

Expected: Recent reviews from test requests.

---

## Step 5: Configure Custom Domain (Optional)

### Add Custom Domain to Worker

```bash
# In workers/orchestrator/wrangler.toml, uncomment and update:
routes = [
  { pattern = "review.webflow.dev/*", zone_name = "webflow.dev" }
]

# Deploy
pnpm deploy
```

### Verify DNS

```bash
curl https://review.webflow.dev/health
```

---

## Step 6: Set Up Monitoring

### Enable Logpush (Optional)

```bash
# Send logs to R2 or external service
wrangler logpush create \
  --name="webflow-review-logs" \
  --destination="r2://webflow-review-logs" \
  --format=json
```

### Set Up Alerts

In Cloudflare Dashboard:
1. Go to Workers > webflow-review-orchestrator
2. Settings > Alerts
3. Add alert for:
   - Error rate > 5%
   - CPU time > 50ms
   - Invocations > 1000/min (rate limiting)

---

## Step 7: Configure Rate Limiting (Recommended)

Add to `workers/orchestrator/src/index.ts`:

```typescript
import { RateLimiter } from '@cloudflare/workers-rate-limiter';

const limiter = new RateLimiter({
  store: env.KV,
  limit: 100, // 100 requests
  window: 60,  // per minute
});

app.use('/*', async (c, next) => {
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const allowed = await limiter.check(ip);

  if (!allowed) {
    return c.json({ error: 'Rate limit exceeded' }, 429);
  }

  return next();
});
```

---

## Step 8: Security Hardening

### Add API Key Authentication (Optional)

```typescript
// In workers/orchestrator/src/index.ts
app.use('/api/*', async (c, next) => {
  const apiKey = c.req.header('X-API-Key');

  if (!apiKey || apiKey !== c.env.API_KEY) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  return next();
});
```

Store API key as secret:
```bash
wrangler secret put API_KEY
# Enter your secret API key when prompted
```

### Enable CORS Restrictions

```typescript
// Update CORS config in workers/orchestrator/src/index.ts
app.use('/*', cors({
  origin: [
    'https://webflow.com',
    'https://*.webflow.io',
    'chrome-extension://*', // For extension
  ],
  allowMethods: ['GET', 'POST'],
  allowHeaders: ['Content-Type', 'X-API-Key'],
}));
```

---

## Step 9: Performance Optimization

### Enable KV Caching

```typescript
// Cache frequently accessed data
async function getCachedTemplate(templateId: string, env: Env) {
  const cacheKey = `template:${templateId}`;
  const cached = await env.KV.get(cacheKey, 'json');

  if (cached) return cached;

  const template = await fetchTemplate(templateId);
  await env.KV.put(cacheKey, JSON.stringify(template), {
    expirationTtl: 300, // 5 minutes
  });

  return template;
}
```

### Optimize D1 Queries

```sql
-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_findings_page ON findings(page_url);
CREATE INDEX IF NOT EXISTS idx_findings_auto_fixable ON findings(auto_fixable);
CREATE INDEX IF NOT EXISTS idx_reviews_score ON reviews(overall_score);
```

---

## Step 10: Backup Strategy

### Daily D1 Backup

```bash
# Create backup script
cat > scripts/backup-d1.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d)
wrangler d1 export webflow-review-db > backups/webflow-review-$DATE.sql
EOF

chmod +x scripts/backup-d1.sh

# Add to cron (optional)
# 0 2 * * * /path/to/backup-d1.sh
```

### R2 Versioning

```bash
# Enable versioning on R2 bucket
wrangler r2 bucket update webflow-review-screenshots --versioning=Enabled
```

---

## Step 11: Cost Monitoring

### Set Budget Alerts

In Cloudflare Dashboard:
1. Billing > Notifications
2. Add alert for Workers usage > $10/month
3. Add alert for D1 usage > $5/month
4. Add alert for R2 usage > $5/month

### Track Usage

```bash
# Get current month usage
wrangler billing usage --month=$(date +%Y-%m)

# Get worker-specific metrics
wrangler metrics webflow-review-orchestrator --since=7d
```

---

## Troubleshooting

### Worker Not Deploying

```bash
# Check wrangler.toml syntax
wrangler deploy --dry-run

# Check for TypeScript errors
pnpm exec tsc --noEmit

# Check worker size
wrangler deploy --outdir=dist --dry-run
# Should be <1MB
```

### D1 Migrations Failing

```bash
# Check migration status
wrangler d1 migrations list webflow-review-db

# Rollback last migration (if needed)
wrangler d1 execute webflow-review-db --command "DELETE FROM _cf_KV WHERE key='last_migration'"

# Re-apply
wrangler d1 migrations apply webflow-review-db --remote
```

### Queue Not Processing

```bash
# Check queue depth
wrangler queues consumer list webflow-review-queue

# Check dead letter queue
wrangler queues consumer list webflow-review-dlq

# Purge queue (if stuck)
wrangler queues delete webflow-review-queue
wrangler queues create webflow-review-queue
pnpm deploy:queue
```

### High Error Rate

```bash
# Tail logs in real-time
wrangler tail webflow-review-orchestrator --status error

# Check recent errors in D1
wrangler d1 execute webflow-review-db --command \
  "SELECT error, COUNT(*) as count FROM api_usage WHERE error IS NOT NULL GROUP BY error ORDER BY count DESC LIMIT 10"
```

---

## Rollback Procedure

### Rollback Worker

```bash
# List deployments
wrangler deployments list --name=webflow-review-orchestrator

# Rollback to previous version
wrangler rollback --name=webflow-review-orchestrator --deployment-id=PREVIOUS_ID
```

### Rollback Database Migration

```bash
# Manual rollback (no automated rollback in D1)
# 1. Restore from backup
cat backups/webflow-review-20240101.sql | wrangler d1 execute webflow-review-db --file=-

# 2. Re-run migrations up to target version
wrangler d1 migrations apply webflow-review-db --remote --to-version=2
```

---

## Production Checklist

Before going live:

- [ ] All workers deployed and healthy
- [ ] Database migrations applied
- [ ] Health endpoint returns 200
- [ ] Sample review completes successfully
- [ ] Custom domain configured (if applicable)
- [ ] Rate limiting enabled
- [ ] CORS restrictions in place
- [ ] API key authentication configured (if using)
- [ ] Monitoring alerts set up
- [ ] Budget alerts configured
- [ ] Backup script scheduled
- [ ] Documentation updated
- [ ] Team trained on troubleshooting

---

## Maintenance Schedule

### Weekly
- [ ] Check error logs
- [ ] Review queue depth
- [ ] Check D1 database size

### Monthly
- [ ] Review cost dashboard
- [ ] Rotate API keys (if using)
- [ ] Test backup restoration
- [ ] Review and delete old reviews (>90 days)

### Quarterly
- [ ] Review and optimize D1 indexes
- [ ] Update dependencies
- [ ] Performance benchmarking
- [ ] Security audit

---

## Support

If you encounter issues:

1. Check logs: `wrangler tail webflow-review-orchestrator`
2. Check database: `wrangler d1 execute webflow-review-db --command "SELECT * FROM reviews ORDER BY created_at DESC LIMIT 10"`
3. Check queue: `wrangler queues consumer list webflow-review-queue`
4. Open GitHub issue: [link]
5. Contact: [email]

---

## Next Steps

After successful deployment:

1. **Phase 2**: Build Chrome extension
2. **Phase 3**: Add accessibility checks
3. **Phase 4**: Implement AI agent
4. **Phase 5**: Add Canon compliance checks
5. **Phase 6**: Build plagiarism detection
