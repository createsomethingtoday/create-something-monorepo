# Webflow Dashboard - Production Deployment Guide

**Last Updated**: 2026-01-07
**Status**: Production-Ready
**Cloudflare Pages Project**: `webflow-dashboard`

---

## Quick Deploy

For experienced operators who know the system:

```bash
# 1. Build
pnpm --filter=@create-something/webflow-dashboard build

# 2. Deploy
cd packages/webflow-dashboard
wrangler pages deploy .svelte-kit/cloudflare --project-name=webflow-dashboard

# 3. Verify
curl https://webflow-dashboard.pages.dev/api/health
```

---

## Complete Deployment Checklist

### Pre-Deployment Verification

**Build & Type Safety**:
- [ ] `pnpm --filter=@create-something/webflow-dashboard build` succeeds
- [ ] `pnpm --filter=@create-something/webflow-dashboard exec tsc --noEmit` passes
- [ ] No console errors in build output
- [ ] Build size reasonable (~150kB for server index)

**Code Quality**:
- [ ] All verification issues resolved (see PRODUCTION_READINESS.md)
- [ ] Canon compliance verified (no hardcoded colors/Tailwind violations)
- [ ] No TODO/FIXME comments in production code
- [ ] Git working directory clean (or changes committed)

**Documentation**:
- [ ] PRODUCTION_READINESS.md updated with latest status
- [ ] Any new features documented in relevant architecture files
- [ ] ROADMAP.md reflects current implementation status

---

## Environment Setup

### 1. Cloudflare Resources

**Required Resources** (create if not exists):

```bash
# KV Namespace (Sessions)
wrangler kv:namespace create "SESSIONS"
# Note: ID 552d6f66fdf84e8aad55306e6971068e already created

# R2 Bucket (Image Uploads)
wrangler r2 bucket create webflow-dashboard-uploads
# Note: Bucket already created
```

**Verify Resources**:

```bash
# List KV namespaces
wrangler kv:namespace list

# List R2 buckets
wrangler r2 bucket list
```

### 2. Secrets Configuration

**Required Secrets**:

| Secret | Purpose | Where to Get |
|--------|---------|--------------|
| `AIRTABLE_API_KEY` | Airtable authentication | Airtable Account > API |
| `AIRTABLE_BASE_ID` | Base identifier | Airtable Base URL |
| `CRON_SECRET` | Manual cron auth (optional) | Generate secure random string |

**Set Secrets**:

```bash
# Production secrets
wrangler secret put AIRTABLE_API_KEY --env production
wrangler secret put AIRTABLE_BASE_ID --env production

# Optional: Manual cron trigger authentication
wrangler secret put CRON_SECRET --env production
```

**Verify Secrets** (without exposing values):

```bash
# List secrets (shows names only, not values)
wrangler secret list
```

### 3. Wrangler Configuration

**Verify `wrangler.jsonc`**:

```jsonc
{
  "name": "webflow-dashboard",
  "compatibility_date": "2024-12-01",
  "compatibility_flags": ["nodejs_compat"],
  "pages_build_output_dir": ".svelte-kit/cloudflare",

  "kv_namespaces": [
    {
      "binding": "SESSIONS",
      "id": "552d6f66fdf84e8aad55306e6971068e"
    }
  ],

  "r2_buckets": [
    {
      "binding": "UPLOADS",
      "bucket_name": "webflow-dashboard-uploads"
    }
  ],

  "vars": {
    "ENVIRONMENT": "production"
  }
}
```

**Critical Fields**:
- `name`: Must match Cloudflare Pages project name exactly
- `compatibility_flags`: `nodejs_compat` required for SvelteKit
- `pages_build_output_dir`: Must point to `.svelte-kit/cloudflare`

---

## Build Process

### 1. Clean Build

```bash
# Navigate to project root
cd /path/to/create-something-monorepo

# Clean previous builds
rm -rf packages/webflow-dashboard/.svelte-kit
rm -rf packages/webflow-dashboard/build

# Fresh build
pnpm --filter=@create-something/webflow-dashboard build
```

**Expected Output**:

```
vite v5.x.x building SSR bundle for production...
✓ built in 5.2s
.svelte-kit/output/server/index.js  144.64 kB

vite v5.x.x building for production...
✓ built in 3.8s
.svelte-kit/output/client/_app/immutable/...
```

**Build Artifacts** (verify these exist):

```
packages/webflow-dashboard/.svelte-kit/cloudflare/
├── _app/
│   └── immutable/         # Hashed client assets
├── _worker.js             # Cloudflare Pages Functions adapter
└── (other static files)
```

### 2. Build Validation

**Size Check**:

```bash
# Server bundle should be ~150kB or less
ls -lh packages/webflow-dashboard/.svelte-kit/output/server/index.js

# Client assets total should be reasonable
du -sh packages/webflow-dashboard/.svelte-kit/cloudflare/_app
```

**TypeScript Validation**:

```bash
pnpm --filter=@create-something/webflow-dashboard exec tsc --noEmit
# Should output: no errors
```

---

## Deployment Steps

### 1. Deploy to Cloudflare Pages

```bash
cd packages/webflow-dashboard

# Deploy (production)
wrangler pages deploy .svelte-kit/cloudflare --project-name=webflow-dashboard
```

**Expected Output**:

```
✨ Success! Uploaded 42 files (3.2 sec)

✨ Deployment complete! Take a peek over at https://abc123.webflow-dashboard.pages.dev
```

**Save Deployment URL**: You'll need this for post-deployment testing.

### 2. Configure Cron Triggers

**In Cloudflare Dashboard**:

1. Navigate to: Workers & Pages > webflow-dashboard > Triggers
2. Add Cron Trigger:
   - **Schedule**: `0 0 * * *` (midnight UTC daily)
   - **Route**: `/api/cron/cleanup`
   - **Purpose**: Session cleanup

**Verify Cron Configuration**:

```bash
# Manual trigger (if CRON_SECRET set)
curl -X POST https://webflow-dashboard.pages.dev/api/cron/cleanup \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 3. Custom Domain Setup (Optional)

If using custom domain (e.g., `dashboard.webflow.com`):

**In Cloudflare Dashboard**:

1. Workers & Pages > webflow-dashboard > Custom domains
2. Add custom domain
3. Verify DNS records (Cloudflare handles this if zone is on same account)

**Verify DNS**:

```bash
dig dashboard.webflow.com
# Should resolve to Cloudflare Pages
```

---

## Post-Deployment Testing

### 1. Health Checks

**Basic Connectivity**:

```bash
# Root endpoint
curl -I https://webflow-dashboard.pages.dev/

# Should return: 200 OK with HTML content-type
```

**API Health**:

```bash
# If you have a health endpoint
curl https://webflow-dashboard.pages.dev/api/health

# Expected: {"status":"ok","timestamp":...}
```

### 2. Authentication Flow

**Manual Test** (in browser):

1. Navigate to `https://webflow-dashboard.pages.dev/login`
2. Enter test email address
3. Verify Airtable automation triggers (check for email)
4. Complete login with magic link
5. Verify redirect to dashboard
6. Check session persistence (refresh page, should stay logged in)

**Verification Points**:
- [ ] Login page renders
- [ ] Email validation works (rejects invalid formats)
- [ ] Rate limiting prevents abuse (try 6 login attempts rapidly)
- [ ] Airtable automation sends verification email
- [ ] Magic link login works
- [ ] Session persists across page loads
- [ ] Protected routes redirect unauthenticated users to /login

### 3. Image Upload (R2)

**Manual Test** (in browser):

1. Log in to dashboard
2. Navigate to Assets > Create New Asset
3. Upload primary thumbnail (WebP, 150:199 aspect ratio)
4. Upload carousel images (multiple WebP files)
5. Upload secondary thumbnail (optional)
6. Verify images appear in preview
7. Save asset

**Verification Points**:
- [ ] WebP validation rejects non-WebP files
- [ ] Aspect ratio validation works (150:199 for primary thumbnail)
- [ ] File size limit enforced (10MB max)
- [ ] Multiple images upload successfully
- [ ] Images viewable after upload (R2 URL accessible)
- [ ] Upload progress shows correctly

**Check R2 Storage**:

```bash
# List objects in R2 bucket
wrangler r2 object list webflow-dashboard-uploads --limit 10

# Verify uploaded files exist
```

### 4. Analytics & Leaderboard

**Manual Test**:

1. Navigate to Dashboard > Analytics
2. Verify leaderboard displays
3. Check that competitor revenue is redacted (only see your own)
4. Verify category performance shows
5. Check animated metrics work (KineticNumber transitions)

**Verification Points**:
- [ ] Leaderboard renders with data
- [ ] Only user's own template revenue visible
- [ ] Marketplace totals show aggregate data
- [ ] Category performance displays correctly
- [ ] Donut chart renders
- [ ] Animated transitions work smoothly

**API Test**:

```bash
# Leaderboard (requires authentication cookie)
curl -H "Cookie: session=YOUR_SESSION_TOKEN" \
  https://webflow-dashboard.pages.dev/api/analytics/leaderboard

# Should return JSON with leaderboard data
```

### 5. Asset Management (CRUD)

**Manual Test**:

1. Create new asset (with all fields filled)
2. Edit existing asset (change title, description)
3. Archive asset
4. Verify asset appears/disappears from list

**Verification Points**:
- [ ] Create asset works
- [ ] Update asset works
- [ ] Archive asset works (soft delete)
- [ ] Name uniqueness check works
- [ ] Asset versioning creates snapshots on update
- [ ] Version history displays correctly

**API Test**:

```bash
# List assets (requires authentication)
curl -H "Cookie: session=YOUR_SESSION_TOKEN" \
  https://webflow-dashboard.pages.dev/api/assets

# Should return JSON array of assets
```

### 6. Submission Tracking

**Manual Test**:

1. Navigate to Dashboard
2. Verify SubmissionTracker component displays
3. Check submission count shows correctly
4. Verify countdown timer to next slot
5. Test submission limit warning states

**Verification Points**:
- [ ] Submission count accurate
- [ ] Rate limit enforced (3 submissions per 24 hours)
- [ ] Countdown timer updates
- [ ] Warning badge shows when 1 slot remaining
- [ ] Critical badge shows when 0 slots available

### 7. Asset Versioning

**Manual Test**:

1. Edit an existing asset
2. Make changes and save
3. Navigate to asset detail > Version History
4. Verify new version appears
5. Compare two versions side-by-side
6. Rollback to previous version

**Verification Points**:
- [ ] Version created on asset update
- [ ] Version history displays all versions
- [ ] Comparison view shows differences
- [ ] Rollback works and creates new version
- [ ] Timestamps and user attribution correct

---

## Monitoring & Observability

### 1. Cloudflare Analytics

**Access**:
- Cloudflare Dashboard > Workers & Pages > webflow-dashboard > Analytics

**Key Metrics**:
- Requests per second
- Error rate (4xx, 5xx)
- Response time (p50, p95, p99)
- Bandwidth usage

**Alert Thresholds** (recommended):
- Error rate > 5%: Investigate
- p95 response time > 2s: Performance issue
- Bandwidth spike: Potential abuse

### 2. Real-Time Logs

**Tail Logs**:

```bash
# Stream live logs (production)
wrangler pages deployment tail --project-name=webflow-dashboard

# Filter by status
wrangler pages deployment tail --status error
```

**Log Events to Monitor**:
- Authentication failures (rate limiting triggered)
- Upload failures (invalid files, size exceeded)
- Airtable API errors (rate limiting, auth issues)
- Session expiry warnings

### 3. R2 Storage Monitoring

**Check Storage Usage**:

```bash
# R2 bucket stats
wrangler r2 bucket info webflow-dashboard-uploads
```

**Storage Alerts** (set in Cloudflare Dashboard):
- Storage > 80% of plan limit
- Request rate > expected threshold

### 4. KV Namespace Monitoring

**Check Session Count**:

```bash
# List keys (shows session count)
wrangler kv:key list --namespace-id=552d6f66fdf84e8aad55306e6971068e --prefix="session:"

# Count sessions
wrangler kv:key list --namespace-id=552d6f66fdf84e8aad55306e6971068e --prefix="session:" | grep -c "\"name\""
```

**Session Cleanup Verification**:
- After cron runs (midnight UTC), expired sessions should be removed
- Check logs for cleanup job execution

---

## Rollback Procedures

### 1. Rollback to Previous Deployment

**In Cloudflare Dashboard**:

1. Navigate to: Workers & Pages > webflow-dashboard > Deployments
2. Find previous successful deployment
3. Click "..." menu > "Rollback to this deployment"
4. Confirm rollback

**Time to Rollback**: < 1 minute (propagation instant)

**Via CLI** (if you know deployment ID):

```bash
# List recent deployments
wrangler pages deployment list --project-name=webflow-dashboard

# Rollback to specific deployment
wrangler pages deployment rollback <deployment-id> --project-name=webflow-dashboard
```

### 2. Emergency Rollback Plan

**If Production is Broken**:

1. **Immediate**: Rollback via Dashboard (steps above)
2. **Identify Issue**: Check deployment logs, error messages
3. **Fix Locally**: Reproduce issue, fix in local environment
4. **Test Fix**: Run full test suite locally
5. **Redeploy**: Follow deployment steps with fix

**Rollback Checklist**:
- [ ] Production issue identified and confirmed
- [ ] Rollback initiated (< 1 minute)
- [ ] Service restored (verify health checks)
- [ ] Incident documented (what broke, why, how fixed)
- [ ] Post-mortem scheduled if critical

### 3. Database Rollback (If Needed)

**Airtable Schema Changes**:

If deployment included Airtable schema changes:

1. **Before Deployment**: Export Airtable base (Backup)
2. **After Rollback**: Manually revert schema changes in Airtable
3. **Verify**: Test CRUD operations work with old schema

**R2 Asset Rollback**:

R2 objects are immutable (versioned by upload). No rollback needed unless:
- Assets were deleted (restore from backups if available)
- Bucket configuration changed (revert via Cloudflare Dashboard)

---

## Troubleshooting

### Common Issues

**Build Fails**:

```
Error: TypeScript errors
```

**Fix**:

```bash
# Run type check to see errors
pnpm --filter=@create-something/webflow-dashboard exec tsc --noEmit

# Fix errors, then rebuild
pnpm --filter=@create-something/webflow-dashboard build
```

---

**Deployment Fails: "Project not found"**:

```
Error: Project webflow-dashboard not found
```

**Fix**:

1. Verify project name exactly: `webflow-dashboard` (no spaces, hyphens matter)
2. Check Cloudflare Dashboard > Workers & Pages > Projects
3. If project doesn't exist, create it:

```bash
# First deployment creates project
wrangler pages deploy .svelte-kit/cloudflare --project-name=webflow-dashboard
```

---

**Authentication Doesn't Work**:

**Symptoms**: Login fails, sessions not persisting

**Debug**:

```bash
# Check KV namespace binding
wrangler kv:namespace list

# Verify secrets are set
wrangler secret list

# Check session in KV
wrangler kv:key get "session:YOUR_SESSION_ID" --namespace-id=552d6f66fdf84e8aad55306e6971068e
```

**Fix**:
- Ensure `SESSIONS` KV namespace ID matches `wrangler.jsonc`
- Verify `AIRTABLE_API_KEY` and `AIRTABLE_BASE_ID` secrets are set
- Check Airtable automation is enabled and sending emails

---

**Image Upload Fails**:

**Symptoms**: Upload succeeds but images don't appear

**Debug**:

```bash
# Check R2 bucket exists
wrangler r2 bucket list

# List recent uploads
wrangler r2 object list webflow-dashboard-uploads --limit 10

# Try to get specific object
wrangler r2 object get webflow-dashboard-uploads/path/to/image.webp --file=test.webp
```

**Fix**:
- Verify R2 bucket name matches `wrangler.jsonc`: `webflow-dashboard-uploads`
- Check R2 bucket binding in Cloudflare Dashboard
- Ensure uploaded files are valid WebP format

---

**Cron Job Not Running**:

**Symptoms**: Sessions not being cleaned up, old sessions persist

**Debug**:

```bash
# Manually trigger cron (if CRON_SECRET set)
curl -X POST https://webflow-dashboard.pages.dev/api/cron/cleanup \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Check logs
wrangler pages deployment tail --project-name=webflow-dashboard --search "cron"
```

**Fix**:
- Verify cron trigger configured in Cloudflare Dashboard
- Check cron schedule: `0 0 * * *` (midnight UTC)
- Ensure `/api/cron/cleanup` endpoint exists and works

---

**Analytics/Leaderboard Shows No Data**:

**Symptoms**: Empty leaderboard, no analytics

**Debug**:

```bash
# Test Airtable API access
curl -H "Authorization: Bearer YOUR_AIRTABLE_API_KEY" \
  https://api.airtable.com/v0/YOUR_BASE_ID/Templates

# Check analytics endpoint
curl -H "Cookie: session=YOUR_SESSION_TOKEN" \
  https://webflow-dashboard.pages.dev/api/analytics/leaderboard
```

**Fix**:
- Verify Airtable base has data in Templates table
- Check Airtable API key has read permissions
- Ensure base ID is correct
- Verify rate limiting not blocking requests (5 req/sec Airtable limit)

---

## Performance Optimization

### 1. Build Optimization

**Current Build Size**: ~144kB server bundle

**Optimization Opportunities**:
- Code splitting for large components
- Lazy-load GSAP validation UI
- Tree-shake unused dependencies

**Monitor Build Size**:

```bash
# After each deployment, check bundle size
ls -lh packages/webflow-dashboard/.svelte-kit/output/server/index.js

# Client bundle breakdown
du -sh packages/webflow-dashboard/.svelte-kit/cloudflare/_app/immutable/*
```

### 2. Caching Strategy

**Static Assets** (already cached):
- `/_app/immutable/*`: Cache-Control: `public, max-age=31536000, immutable`
- Versioned assets automatically cache-busted on build

**API Responses**:
- No caching on authenticated endpoints (security)
- Consider caching analytics data (5-minute TTL)

**KV Cache**:
- Session lookup already cached in KV (60-minute expiry)
- Consider caching user profile (reduce Airtable calls)

### 3. R2 Optimization

**Image Delivery**:
- R2 serves images directly (no worker overhead)
- Consider Cloudflare Images for transformation if needed

**Upload Performance**:
- Current: Multi-part upload for large files
- Optimization: Client-side image compression before upload

---

## Security Checklist

**Pre-Deployment**:
- [ ] All secrets set via `wrangler secret put` (not in code)
- [ ] No hardcoded API keys or credentials
- [ ] Rate limiting enabled on login endpoint (5 attempts / 15 min)
- [ ] Session expiry set (60 minutes)
- [ ] CORS configured correctly (if applicable)
- [ ] Content Security Policy headers set (if applicable)

**Post-Deployment**:
- [ ] Test authentication flow (magic link works)
- [ ] Verify rate limiting triggers (try 6 login attempts)
- [ ] Check competitor data redaction (only own revenue visible)
- [ ] Test session expiry (wait 60 min, should require re-login)
- [ ] Verify file upload validation (reject non-WebP, oversized files)
- [ ] Test submission rate limiting (max 3 per 24 hours)

**Ongoing**:
- [ ] Rotate Airtable API keys periodically
- [ ] Monitor for suspicious login patterns
- [ ] Review Cloudflare security logs weekly
- [ ] Update dependencies monthly (security patches)

---

## Related Documentation

- [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) - Feature verification and testing
- [ROADMAP.md](./ROADMAP.md) - Future features and priorities
- [wrangler.jsonc](./wrangler.jsonc) - Cloudflare configuration
- [.claude/rules/cloudflare-patterns.md](../../.claude/rules/cloudflare-patterns.md) - Cloudflare deployment patterns
- [.claude/rules/PROJECT_NAME_REFERENCE.md](../../.claude/rules/PROJECT_NAME_REFERENCE.md) - Project naming conventions

---

## Deployment History Template

Keep a log of deployments for tracking and auditing:

```
# Deployment Log

## 2026-01-07 - Initial Production Deployment
- **Deployer**: Claude Sonnet 4.5 (harness)
- **Version**: Initial release
- **Deployment ID**: abc123
- **Status**: Success
- **Issues**: None
- **Rollback**: N/A
- **Notes**: First production deployment, all features verified

## YYYY-MM-DD - Feature Update
- **Deployer**: Name
- **Version**: vX.Y.Z
- **Deployment ID**: xyz789
- **Status**: Success/Rollback
- **Issues**: List any issues encountered
- **Rollback**: Yes/No, reason if applicable
- **Notes**: What changed, why deployed
```

---

**Prepared by**: Claude Sonnet 4.5 (harness)
**Last Updated**: 2026-01-07
**Status**: Ready for Production Use
