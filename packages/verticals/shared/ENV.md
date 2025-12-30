# Environment Configuration

Vertical Template - Environment Variables & Secrets

## Required Cloudflare Resources

Before deployment, create these resources:

```bash
# 1. Create D1 Database
wrangler d1 create <your-template>-db
# Copy the database_id to wrangler.toml

# 2. Create KV Namespace
wrangler kv:namespace create "CACHE"
# Copy the id to wrangler.toml

# 3. Create R2 Bucket (optional, for document storage)
wrangler r2 bucket create <your-template>-documents
```

## Environment Variables

Set in `wrangler.toml` under `[vars]`:

| Variable | Description | Default |
|----------|-------------|---------|
| `ENVIRONMENT` | `development`, `staging`, or `production` | `production` |
| `SITE_NAME` | Your business name | - |
| `SITE_URL` | Your site's URL | - |
| `CONTACT_EMAIL` | Email for contact form submissions | - |

## Secrets

Set via `wrangler secret put <NAME>`:

| Secret | Description | Required |
|--------|-------------|----------|
| `SENDGRID_API_KEY` | SendGrid API key for transactional emails | For email workflows |
| `CALENDLY_WEBHOOK_SECRET` | Calendly webhook verification secret | For booking integration |
| `TWILIO_ACCOUNT_SID` | Twilio account SID for SMS | For SMS reminders |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | For SMS reminders |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | For SMS reminders |

## Optional Integrations

### Email (SendGrid)
```bash
wrangler secret put SENDGRID_API_KEY
# Enter your SendGrid API key
```

### Calendar (Calendly)
```bash
wrangler secret put CALENDLY_WEBHOOK_SECRET
# Enter your Calendly webhook signing secret
```

### SMS (Twilio)
```bash
wrangler secret put TWILIO_ACCOUNT_SID
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put TWILIO_PHONE_NUMBER
```

### CRM (HubSpot)
```bash
wrangler secret put HUBSPOT_API_KEY
```

## Local Development

For local development, create a `.dev.vars` file (gitignored):

```env
SENDGRID_API_KEY=your_key_here
CALENDLY_WEBHOOK_SECRET=your_secret_here
```

Then run:
```bash
pnpm dev
```

## Deployment

```bash
# Apply database migrations
wrangler d1 migrations apply DB --remote

# Deploy to Cloudflare Pages
wrangler pages deploy .svelte-kit/cloudflare --project-name=your-project-name
```

## Workflow Configuration

Workflows are configured in `src/lib/workflows/`. Each workflow can be enabled/disabled via environment:

```toml
[vars]
WORKFLOW_BOOKING_ENABLED = "true"
WORKFLOW_REMINDER_ENABLED = "true"
WORKFLOW_FOLLOWUP_ENABLED = "true"
```
