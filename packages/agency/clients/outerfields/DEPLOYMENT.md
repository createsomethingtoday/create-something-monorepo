# Outerfields Production Deployment Guide

Complete checklist for deploying Outerfields to Cloudflare Pages with all required bindings.

## Prerequisites

- Cloudflare account with access to Pages, D1, KV, R2, and Workers
- Wrangler CLI installed and authenticated: `wrangler login`
- Stripe account with API keys
- Resend/SendGrid account for transactional emails
- Calendly account for discovery call scheduling

---

## Step 1: Create Cloudflare Resources

### 1.1 Create D1 Database

```bash
cd packages/agency/clients/outerfields

# Create database
wrangler d1 create outerfields-db

# Output will show database_id - copy this
# Example: database_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

Update `wrangler.toml` with the database_id:
```toml
[[d1_databases]]
binding = "DB"
database_name = "outerfields-db"
database_id = "YOUR_DATABASE_ID_HERE"  # Replace with actual ID
preview_database_id = "YOUR_DATABASE_ID_HERE"  # Same ID for now
```

### 1.2 Create KV Namespaces

```bash
# Create SESSIONS namespace
wrangler kv:namespace create SESSIONS

# Output will show id - copy this
# Example: id = "abc123def456"

# Update wrangler.toml with SESSIONS id
```

Update `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "SESSIONS"
id = "YOUR_SESSIONS_ID_HERE"  # Replace with actual ID
preview_id = "YOUR_SESSIONS_ID_HERE"  # Same ID for now
```

**Note**: VIDEO_STATS namespace already configured (id: 55a1177ee7c3491589c19094e38df0f7)

### 1.3 Create R2 Bucket

```bash
# Create R2 bucket for video assets
wrangler r2 bucket create outerfields-videos

# Success message confirms creation
```

R2 bucket is already configured in `wrangler.toml`:
```toml
[[r2_buckets]]
binding = "VIDEO_ASSETS"
bucket_name = "outerfields-videos"
```

---

## Step 2: Apply Database Migrations

Apply all migrations to production D1:

```bash
cd packages/agency/clients/outerfields

# Apply all pending migrations
pnpm migrate

# Or manually with wrangler:
wrangler d1 migrations apply outerfields-db

# Verify migrations applied
pnpm migrate:list
```

Migrations include:
1. `0001_auth_system.sql` - Users, sessions, authentication
2. `0002_videos.sql` - Video content database with categories
3. `0003_discovery_calls.sql` - Calendly integration tracking

---

## Step 3: Upload Video Assets to R2

Upload video files and thumbnails to the R2 bucket:

```bash
# Upload all videos
wrangler r2 object put outerfields-videos/videos/crew-call-ep1.mp4 --file=./assets/videos/crew-call-ep1.mp4

# Upload thumbnails
wrangler r2 object put outerfields-videos/thumbnails/crew-call-ep1.jpg --file=./assets/thumbnails/crew-call-ep1.jpg

# Or bulk upload with a script:
for file in assets/videos/*.mp4; do
  filename=$(basename "$file")
  wrangler r2 object put "outerfields-videos/videos/$filename" --file="$file"
done

for file in assets/thumbnails/*.jpg; do
  filename=$(basename "$file")
  wrangler r2 object put "outerfields-videos/thumbnails/$filename" --file="$file"
done
```

---

## Step 4: Set Environment Variables

Configure environment variables in Cloudflare Pages dashboard:

1. Go to Cloudflare Dashboard → Pages → outerfields-pcn → Settings → Environment Variables
2. Add the following variables for **Production**:

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...  # $99 lifetime membership price ID
RESEND_API_KEY=re_...  # Or SENDGRID_API_KEY
CALENDLY_ACCESS_TOKEN=...
CALENDLY_WEBHOOK_SECRET=...
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
PUBLIC_SITE_URL=https://outerfields.pcn
```

---

## Step 5: Build and Deploy

### 5.1 Test Build Locally

```bash
cd packages/agency/clients/outerfields

# Type check
pnpm check

# Build
pnpm build

# Verify .svelte-kit/cloudflare directory exists
ls -la .svelte-kit/cloudflare
```

### 5.2 Deploy to Production

```bash
# Deploy to production
pnpm deploy

# This runs: pnpm build && wrangler pages deploy .svelte-kit/cloudflare --project-name=outerfields-pcn
```

### 5.3 Deploy Preview Branch (Optional)

```bash
# Deploy to preview environment
pnpm deploy:preview

# This deploys to a preview URL: outerfields-pcn-preview.pages.dev
```

---

## Step 6: Configure Stripe Webhook

After deployment, configure Stripe webhook to point to production:

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://YOUR_PRODUCTION_DOMAIN/api/stripe/webhook`
3. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created` (if using subscriptions)
4. Copy webhook signing secret
5. Update `STRIPE_WEBHOOK_SECRET` in Cloudflare Pages environment variables

---

## Step 7: Configure Calendly Webhook

Set up Calendly webhook for discovery call tracking:

1. Go to Calendly → Integrations → Webhooks
2. Add webhook URL: `https://YOUR_PRODUCTION_DOMAIN/api/calendly/webhook`
3. Select events:
   - `invitee.created`
   - `invitee.canceled`
4. Copy webhook secret
5. Update `CALENDLY_WEBHOOK_SECRET` in environment variables

---

## Step 8: Verify Deployment

### 8.1 Check Site is Live

Visit your production domain and verify:
- [ ] Homepage loads correctly
- [ ] Hero section with galaxy animation displays
- [ ] Video categories render (7 categories)
- [ ] Pricing section shows $99 lifetime offer
- [ ] Urgency messaging appears (banner, hero, pricing)

### 8.2 Test Authentication Flow

1. Navigate to `/login`
2. Try creating an account (if signup enabled)
3. Log in with test credentials
4. Verify session persists after refresh
5. Log out and verify session cleared

### 8.3 Test Video Gating

As non-member:
1. Click on any non-free video
2. Video should play for 30-60 seconds
3. Gate overlay should appear
4. "Subscribe to continue" CTA should display

### 8.4 Test Stripe Checkout

1. Click "Become a Founding Member - $99" button
2. Verify Stripe Checkout opens
3. Use Stripe test card: `4242 4242 4242 4242`
4. Complete checkout
5. Verify redirect to `/welcome`
6. Check D1 database: user should have `membership = true`
7. Check welcome email sent

### 8.5 Test Member Access

As member (after purchase):
1. Navigate to any video
2. Video should play without gate
3. Full platform access should be granted
4. Analytics dashboard should be visible (not blurred)

---

## Step 9: Monitor and Debug

### 9.1 View Logs

```bash
# Tail production logs
wrangler pages deployment tail --project-name=outerfields-pcn

# Filter for errors
wrangler pages deployment tail --project-name=outerfields-pcn --format=json | grep "error"
```

### 9.2 Check Database

```bash
# Query users table
pnpm db:shell "SELECT id, email, membership, created_at FROM users LIMIT 10"

# Query videos table
pnpm db:shell "SELECT id, title, category, tier FROM videos WHERE category = 'crew-call'"

# Query discovery calls
pnpm db:shell "SELECT * FROM discovery_calls ORDER BY created_at DESC LIMIT 10"
```

### 9.3 Common Issues

**Issue**: Build fails with "Cannot find module"
- **Fix**: Run `pnpm install` to ensure all dependencies installed

**Issue**: D1 binding not found
- **Fix**: Verify `database_id` in `wrangler.toml` matches created database

**Issue**: KV binding not found
- **Fix**: Verify `id` in `wrangler.toml` matches created namespace

**Issue**: R2 bucket not accessible
- **Fix**: Verify bucket name `outerfields-videos` exists: `wrangler r2 bucket list`

**Issue**: Stripe webhook fails
- **Fix**: Check `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard, verify endpoint URL

**Issue**: Videos not loading
- **Fix**: Verify R2 objects uploaded: `wrangler r2 object list outerfields-videos --limit=10`

---

## Step 10: Post-Deployment Tasks

### 10.1 Seed Initial Data

If not already seeded, populate videos table:

```bash
# Run seed script (if exists)
pnpm db:shell < ./scripts/seed-videos.sql
```

### 10.2 Test All Acceptance Criteria

- [ ] wrangler.toml configured with D1, KV, R2 bindings ✓
- [ ] Build succeeds: `pnpm build --filter=outerfields` ✓
- [ ] Deploy succeeds: `wrangler pages deploy` ✓
- [ ] All migrations applied to production D1 ✓
- [ ] Video assets uploaded to R2 bucket
- [ ] Site accessible at production domain
- [ ] Stripe webhook configured to production URL
- [ ] All environment variables set in Cloudflare dashboard

### 10.3 Setup Monitoring

Consider setting up:
- Cloudflare Analytics for traffic monitoring
- Sentry or error tracking service
- Uptime monitoring (e.g., UptimeRobot)
- Log aggregation (e.g., Datadog, if needed)

---

## Quick Reference Commands

```bash
# Development
pnpm dev                    # Start dev server
pnpm build                  # Build for production
pnpm check                  # Type check

# Database
pnpm migrate                # Apply migrations
pnpm migrate:list           # List migrations
pnpm db:shell "SQL"         # Execute SQL query

# Deployment
pnpm deploy                 # Deploy to production
pnpm deploy:preview         # Deploy preview branch

# Logs
wrangler pages deployment tail --project-name=outerfields-pcn

# R2
wrangler r2 object put outerfields-videos/path --file=./file
wrangler r2 object list outerfields-videos

# Types
pnpm types                  # Generate Cloudflare types
```

---

## Rollback Procedure

If deployment fails or issues arise:

1. **Rollback to previous deployment**:
   ```bash
   # Go to Cloudflare Pages dashboard
   # Select previous successful deployment
   # Click "Rollback to this deployment"
   ```

2. **Rollback database migration** (if needed):
   ```bash
   # D1 doesn't support automatic rollback
   # Manually revert with SQL:
   pnpm db:shell "DROP TABLE IF EXISTS new_table;"
   ```

3. **Verify rollback**:
   - Check site loads correctly
   - Test critical flows (login, video playback, checkout)
   - Monitor logs for errors

---

## Support

For deployment issues:
- Check Cloudflare Pages status: https://www.cloudflarestatus.com/
- Cloudflare Discord: https://discord.gg/cloudflaredev
- CREATE SOMETHING internal: Check CLAUDE.md and related patterns

---

## Deployment Checklist Summary

**Pre-Deployment**:
- [ ] All code changes committed and pushed
- [ ] `pnpm check` passes (TypeScript)
- [ ] `pnpm build` succeeds locally
- [ ] Environment variables documented

**Cloudflare Setup**:
- [ ] D1 database created and ID added to wrangler.toml
- [ ] KV namespace created and ID added to wrangler.toml
- [ ] R2 bucket created (outerfields-videos)
- [ ] All migrations applied
- [ ] Video assets uploaded to R2

**Environment Variables**:
- [ ] Stripe keys configured
- [ ] Email service keys configured
- [ ] Calendly keys configured
- [ ] Public keys configured

**Post-Deployment**:
- [ ] Site accessible at production URL
- [ ] Stripe webhook verified working
- [ ] Calendly webhook verified working
- [ ] All user flows tested (auth, video, checkout)
- [ ] Monitoring set up
- [ ] Team notified of deployment

---

**Last Updated**: 2026-01-12
**Deployment Target**: Cloudflare Pages (outerfields-pcn)
**Build Tool**: SvelteKit with @sveltejs/adapter-cloudflare
