# @create-something/templates-platform

CREATE SOMETHING Templates Platform.

**Live**: [templates.createsomething.space](https://templates.createsomething.space)

## Purpose

Deploy beautiful sites in seconds. Tenant management, template routing, and Stripe integration for the vertical templates system.

## Architecture

```
Request → Router Worker → R2 Assets
              ↓
         D1 (tenants)
              ↓
         KV (cache)
```

## Features

- **Tenant Management**: Subdomain-based multi-tenancy
- **Template Routing**: Dynamic template selection per tenant
- **Config Injection**: `window.__SITE_CONFIG__` for client hydration
- **Stripe Integration**: Subscription management
- **Asset Serving**: R2-backed static files

## Stack

- **Framework**: SvelteKit
- **Database**: Cloudflare D1 (tenants)
- **Cache**: Cloudflare KV
- **Storage**: Cloudflare R2 (assets)
- **Payments**: Stripe

## Development

```bash
pnpm dev --filter=templates-platform
```

## Deployment

```bash
pnpm --filter=templates-platform build
wrangler pages deploy packages/templates-platform/.svelte-kit/cloudflare --project-name=templates-platform
```

## Related

- `packages/verticals` - Template implementations
- `.claude/rules/template-deployment-patterns.md` - Deployment guide
- `STRIPE_SETUP.md` - Payment configuration
