# Webflow Dashboard - Environment Setup

## Environment Variables Configured

The following environment variables have been configured in Cloudflare Pages for production:

### Airtable Configuration

| Variable | Value Source | Status |
|----------|--------------|--------|
| `AIRTABLE_API_KEY` | Retrieved from Vercel project | ✅ Set |
| `AIRTABLE_BASE_ID` | Retrieved from Vercel project | ✅ Set |

**Set on**: January 7, 2026

**How they were set**:
```bash
# Retrieved from original Vercel project
cd /Users/micahjohnson/Documents/Github/Webflow/wf-asset-dashboard
vercel env pull .env.production --environment=production

# Set in Cloudflare Pages
cd packages/webflow-dashboard
echo "<value>" | wrangler pages secret put AIRTABLE_API_KEY --project-name=webflow-dashboard
echo "<value>" | wrangler pages secret put AIRTABLE_BASE_ID --project-name=webflow-dashboard
```

---

## How Secrets Work in Cloudflare Pages

### Setting Secrets

Secrets in Cloudflare Pages are set per-project and persist across deployments:

```bash
# Set a secret
wrangler pages secret put SECRET_NAME --project-name=webflow-dashboard

# List secrets (values are encrypted, only names shown)
wrangler pages secret list --project-name=webflow-dashboard

# Delete a secret
wrangler pages secret delete SECRET_NAME --project-name=webflow-dashboard
```

### Accessing Secrets in Code

Secrets are available via `platform.env` in SvelteKit:

```typescript
// In +server.ts or hooks.server.ts
export const GET: RequestHandler = async ({ platform }) => {
  const apiKey = platform?.env?.AIRTABLE_API_KEY;
  const baseId = platform?.env?.AIRTABLE_BASE_ID;
  
  // Use the secrets...
};
```

### When Secrets Take Effect

- **Secrets are applied immediately** to new deployments
- Existing deployments do **NOT** automatically get updated secrets
- You must trigger a new deployment for secrets to be available:
  - Push to GitHub (auto-deploy via GitHub integration)
  - Manual deployment via `wrangler pages deploy`
  - Trigger redeploy in Cloudflare Dashboard

---

## Deployment Notes

### Current Status

After setting the environment variables, we triggered a redeployment by:
1. Creating an empty commit with `git commit --allow-empty`
2. Pushing to GitHub, which triggers Cloudflare Pages auto-deploy

### Monitoring Deployments

**Cloudflare Dashboard**: https://dash.cloudflare.com/9645bd52e640b8a4f40a3a55ff1dd75a/pages/view/webflow-dashboard

**CLI**:
```bash
# List recent deployments
wrangler pages deployment list --project-name=webflow-dashboard

# Tail logs for latest deployment
wrangler pages deployment tail --project-name=webflow-dashboard
```

---

## Troubleshooting

### Profile API Returns 500 Error

**Symptom**: `/api/profile` returns "Internal Server Error" (500)

**Cause**: Missing or invalid Airtable credentials

**Solution**:
1. Verify secrets are set:
   ```bash
   wrangler pages secret list --project-name=webflow-dashboard
   ```
2. Check logs for specific error:
   ```bash
   wrangler pages deployment tail --project-name=webflow-dashboard
   ```
3. Look for error messages like:
   - `[Profile API] Missing Airtable env vars`
   - `Server configuration error`

### Secrets Not Taking Effect

**Cause**: Secrets only apply to new deployments

**Solution**: Trigger a new deployment:
```bash
# Option 1: Empty commit (recommended)
git commit --allow-empty -m "chore: trigger redeployment"
git push

# Option 2: Manual deploy
pnpm build
wrangler pages deploy .svelte-kit/cloudflare --project-name=webflow-dashboard
```

---

## Related Documentation

- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Complete deployment instructions
- [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) - Production checklist
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
