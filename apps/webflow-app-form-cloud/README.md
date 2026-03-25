# Webflow Marketplace Form - Production Application

A production-grade Next.js application for managing Webflow marketplace app submissions with automatic retry, file storage, database tracking, and comprehensive error handling.

## Overview

This is a complete submission management system that handles form submissions, file uploads, webhook delivery to Airtable, automatic retry on failures, and lifecycle management of uploaded files. The form can be embedded in Webflow via iframe and provides full control over data structure and delivery.

## Architecture

```
User Submission → Form Processing → Database Record → File Upload (Vercel Blob)
                                         ↓
                    ← Success Response ← Webhook Delivery → Airtable
                                         ↓ (on failure)
                    Automatic Retry (every 15 min, max 3 attempts)
                                         ↓
                    Blob Cleanup (24h after success)
```

### Key Components:

- **Next.js Frontend**: Embeddable form with rich text editor
- **Vercel Postgres**: Persistent submission tracking and audit trail
- **Vercel Blob Storage**: File hosting for avatars and screenshots
- **Airtable Webhook**: Delivery endpoint for form data
- **Cron Jobs**: Automatic retry for failures + blob cleanup
- **Vercel Analytics**: Event tracking and monitoring

## Features

### Core Features
✅ **Identical functionality** to original Webflow form (line 6952-12164)
✅ **Quill.js rich text editor** for long descriptions
✅ **Dynamic field validation** based on submission type
✅ **Client ID verification** with custom endpoint
✅ **Auto-fill for updates** - Pre-populate form from existing Airtable data
✅ **Embeddable via iframe** with parent CSS inheritance

### Production Features
✅ **Database-backed tracking** - Full audit trail of all submissions
✅ **Automatic retry system** - 3 attempts with exponential backoff
✅ **File lifecycle management** - Automatic cleanup after 24 hours
✅ **Submission search API** - Query by app name, client ID, status, date range
✅ **Manual retry endpoint** - Support team can retry failed submissions
✅ **Error tracking** - Detailed error messages and retry counts
✅ **Monitoring & alerts** - Failure rate and performance monitoring
✅ **Vercel Analytics** - Track webhooks, retries, failures

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.local.example .env.local
```

**Required variables** (see [Environment Variables](#environment-variables) section for complete list):
- Database credentials (Vercel Postgres)
- Blob storage token
- Webhook URL (shared Airtable endpoint)
- Cron secret for scheduled jobs

### 3. Initialize Database

Run the database initialization script to create the submissions table:

```bash
# Connect to your Vercel Postgres database and run:
psql $DATABASE_URL < scripts/init-db.sql
```

Or use the Vercel dashboard to run the SQL in `scripts/init-db.sql`.

### 4. Run Locally
```bash
npm run dev
# Visit http://localhost:3000
```

### 5. Deploy to Vercel
```bash
npm run build
vercel --prod
```

The cron jobs will automatically be configured from `vercel.json`.

## Webflow Cloud

This project now includes a Webflow Cloud-compatible app shape:

- `webflow.json` declares the project as a Next.js Webflow Cloud app
- `wrangler.json` carries the minimal Wrangler metadata plus the storage bindings Webflow Cloud reads at deploy time
- `next.config.js` respects `BASE_URL` and `ASSETS_PREFIX` so the app can be mounted inside Webflow product paths
- `/api/submit-form` runs as an App Router route handler using `Request`, `FormData`, and `File` APIs instead of `formidable`/`fs`
- `scripts/migrations/0001_create_submissions.sql` boots the D1 schema for fresh Webflow Cloud environments

### Webflow Cloud prerequisites

1. Create a Webflow Cloud project in the Webflow UI and connect it to the GitHub repository that contains this app.
2. Configure the Webflow Cloud environment path, such as `/app-form`.
3. Add the app runtime environment variables in the Webflow Cloud UI using `.env.local.example` as the source of truth.
4. If you want the Update flow to expose the "Load Existing App Data" path in production, set `NEXT_PUBLIC_UPDATE_TOGGLES_ENABLED=true` and `NEXT_PUBLIC_AUTOFILL_UPDATE_ENABLED=true`.
5. Set either `AUTOFILL_TOKEN_SECRET` or `ADMIN_API_TOKEN` so the app can mint short-lived autofill tokens for Airtable reads.
6. Use the Webflow CLI to authenticate against the target site if you want to trigger deployments from your terminal:

```bash
webflow auth login
```

This creates a root `.env` file containing `WEBFLOW_SITE_ID` and `WEBFLOW_API_TOKEN`. A starter template is included in `.env.example`.

### Webflow Cloud deploy

Once the project exists in Webflow and the root `.env` is present:

```bash
webflow cloud deploy
```

### Notes

- Webflow Cloud currently expects a Next.js 15+ project.
- Webflow Cloud manages the worker runtime config; keep repo `wrangler.json` limited to storage bindings and migrations.
- `@opennextjs/cloudflare` expects the Node runtime, so do not add `export const runtime = "edge"` to app routes.
- The Cloudflare/OpenNext code path still exists, but direct standalone Cloudflare deployment now needs its own full worker config outside the Webflow Cloud `wrangler.json`.
- `BASE_URL` and `ASSETS_PREFIX` are used for in-product mounting; the app defaults to root paths when they are unset.

## Environment Variables

### Required Variables

```bash
# ===== Database (Vercel Postgres) =====
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://user:pass@host/db?sslmode=require"
POSTGRES_URL="postgresql://user:pass@host/db?sslmode=require"
POSTGRES_URL_NON_POOLING="postgresql://user:pass@host/db?sslmode=require"
POSTGRES_URL_NO_SSL="postgresql://user:pass@host/db"
POSTGRES_PRISMA_URL="postgresql://user:pass@host/db?connect_timeout=15&sslmode=require"
POSTGRES_HOST="host"
POSTGRES_HOST_UNPOOLED="host"
POSTGRES_DATABASE="db"
POSTGRES_USER="user"
POSTGRES_PASSWORD="password"
PGHOST="host"
PGHOST_UNPOOLED="host"
PGDATABASE="db"
PGUSER="user"
PGPASSWORD="password"
NEON_PROJECT_ID="project-id"

# ===== Blob Storage (Vercel Blob) =====
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."

# ===== Webhook Configuration =====
# Shared Airtable webhook URL (configured in .env.local.example)
WEBHOOK_URL="https://hooks.airtable.com/workflows/v1/genericWebhook/..."

# ===== Cron Job Security =====
CRON_SECRET="your-secure-random-string"

# ===== Vercel OIDC (Auto-configured by Vercel) =====
VERCEL_OIDC_TOKEN="..."
```

### Optional Variables

```bash
# ===== Client ID Verification =====
VALID_CLIENT_IDS="client123,client456,testclient789"

# ===== Airtable (for auto-fill feature) =====
AIRTABLE_API_KEY="patXXXXXXXXXXXXXX"

# ===== Autofill Authorization =====
# Use a dedicated secret when possible. ADMIN_API_TOKEN is used as fallback.
AUTOFILL_TOKEN_SECRET="your-long-random-secret"

# ===== Client-side Feature Flags =====
NEXT_PUBLIC_UPDATE_TOGGLES_ENABLED="true"
NEXT_PUBLIC_AUTOFILL_UPDATE_ENABLED="true"
```

## Database Setup

### Schema Overview

The `submissions` table tracks all form submissions with the following key fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `submission_type` | VARCHAR | "New" or "Update" |
| `app_name` | VARCHAR | Application name |
| `client_id` | VARCHAR | Client ID for verification |
| `creator_email` | VARCHAR | Submitter email |
| `form_data` | JSONB | Complete form data |
| `blob_urls` | JSONB | Array of file URLs |
| `status` | VARCHAR | processing → pending → webhook_success/webhook_failed |
| `airtable_submission_id` | VARCHAR | ID sent to Airtable |
| `error_message` | TEXT | Error details if failed |
| `retry_count` | INTEGER | Number of retry attempts (max 3) |
| `created_at` | TIMESTAMP | Submission time |
| `webhook_sent_at` | TIMESTAMP | Last webhook attempt |
| `blobs_cleaned_at` | TIMESTAMP | File cleanup time |

### Submission Lifecycle

1. **processing** - Initial state, files being uploaded to Vercel Blob
2. **pending** - Files uploaded, ready to send to webhook
3. **webhook_success** - Successfully delivered to Airtable
4. **webhook_failed** - Delivery failed, eligible for retry

### Indexes

Optimized indexes for common queries:
- `client_id` - Fast lookup by client
- `creator_email` - Search by submitter
- `status` - Filter by submission state
- `app_name` - Search by application
- Failed submissions retry queue
- Blob cleanup queue

## API Reference

### Public Endpoints

#### `POST /api/submit-form`
Submit a new marketplace app form with files.

**Body**: `multipart/form-data` with form fields and files

**Response**:
```json
{
  "success": true,
  "message": "Form submitted successfully",
  "submissionId": "uuid",
  "airtableSubmissionId": "68dbffcba545b...",
  "filesUploaded": 6
}
```

#### `POST /api/verify-client-id`
Verify whether a client ID is valid for the selected submission type.

For `submissionType="Update"`, successful responses can include a short-lived `autofillToken` used by the Airtable autofill endpoint.

**Response**:
```json
{
  "clientIdExists": true,
  "autofillToken": "eyJjbGllbnRJZCI6Ii4uLiJ9.signature",
  "message": "Client ID check completed"
}
```

#### `GET /api/airtable/get-app?clientId=xxx`
Get existing app data for auto-fill (Update submissions).

- `clientId` must be a valid 64-character hexadecimal string
- Requires an `x-autofill-token` header minted by `POST /api/verify-client-id`
- Response is limited to the Airtable fields used by the update autofill flow

**Response**:
```json
{
  "success": true,
  "app": {
    "id": "recXXX",
    "fields": { ... },
    "createdTime": "2025-01-01T00:00:00.000Z"
  }
}
```

### Internal/Admin Endpoints

#### `GET /api/submissions/search`
Search submissions with filters.

**Query Parameters**:
- `appName` - Partial match (case-insensitive)
- `clientId` - Exact match
- `creatorEmail` - Partial match (case-insensitive)
- `status` - One of: processing, pending, webhook_success, webhook_failed
- `startDate` - ISO 8601 date
- `endDate` - ISO 8601 date
- `limit` - Max results (default: 50, max: 100)
- `offset` - Pagination offset

**Example**:
```bash
GET /api/submissions/search?status=webhook_failed&startDate=2025-01-01&limit=20
```

**Response**:
```json
{
  "success": true,
  "count": 5,
  "limit": 20,
  "offset": 0,
  "filters": { ... },
  "results": [
    {
      "id": "uuid",
      "submissionType": "New",
      "appName": "My App",
      "clientId": "client123",
      "status": "webhook_failed",
      "errorMessage": "Webhook failed: ...",
      "retryCount": 2,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

#### `GET /api/submissions/[id]`
Get detailed information for a single submission.

**Response**: Full submission record including form_data and blob_urls

#### `POST /api/submissions/retry`
Manually retry a failed submission.

**Body**:
```json
{
  "submissionId": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Webhook retry succeeded",
  "submissionId": "uuid",
  "retryAttempt": 2
}
```

### Cron Endpoints (Protected by CRON_SECRET)

#### `POST /api/cron/retry-failed`
Automatic retry job for failed submissions.

**Schedule**: Every 15 minutes (`*/15 * * * *`)

**Authorization**: `Bearer ${CRON_SECRET}`

**Process**:
1. Find submissions with `status=webhook_failed`
2. Filter for `retry_count < 3`
3. Skip submissions retried in last 15 minutes
4. Attempt webhook delivery
5. Update status and retry count

#### `POST /api/cron/cleanup-blobs`
Automatic blob file cleanup job.

**Schedule**: Every 6 hours (`0 */6 * * *`)

**Authorization**: `Bearer ${CRON_SECRET}`

**Process**:
1. Find submissions with `status=webhook_success`
2. Filter for `created_at > 24 hours ago`
3. Filter for `blobs_cleaned_at IS NULL`
4. Delete blob files from Vercel Blob storage
5. Update `blobs_cleaned_at` timestamp

## Error Handling & Retry System

### Automatic Retry

When webhook delivery fails, the submission is marked as `webhook_failed` and **blob files are preserved** for retry attempts.

**Retry Schedule**:
- Cron runs every 15 minutes
- Maximum 3 retry attempts per submission
- Exponential backoff (15 min delay between attempts)
- After 3 failed attempts, manual review required

**Why Automatic Retry?**
- Network transience: Temporary network issues
- Airtable rate limits: API throttling
- Service outages: Brief downtime

### Manual Retry

Support team can manually retry failed submissions via:

```bash
POST /api/submissions/retry
{
  "submissionId": "uuid"
}
```

**Use cases**:
- Exceeded max automatic retries (3)
- Need immediate retry (don't wait for cron)
- Testing after fixing webhook configuration

### Error Tracking

All errors are stored in the database:
- `error_message` - Full error description
- `retry_count` - Number of attempts made
- `webhook_sent_at` - Timestamp of last attempt
- `status` - Current state

## File Storage & Lifecycle

### Upload Process

1. User submits form with files (avatar + up to 5 screenshots)
2. Files uploaded to Vercel Blob with public access
3. Blob URLs stored in database `blob_urls` field
4. URLs included in webhook payload to Airtable
5. Airtable downloads files from blob URLs

### Retention Policy

**Successful submissions**:
- Blobs kept for 24 hours after webhook success
- Gives Airtable time to download files
- Automatic cleanup via cron job

**Failed submissions**:
- Blobs preserved indefinitely
- Required for retry attempts
- Only cleaned up after manual intervention

### Blob Cleanup Cron

Runs every 6 hours, processes up to 100 submissions:

```javascript
WHERE status = 'webhook_success'
  AND created_at < NOW() - INTERVAL '24 hours'
  AND blobs_cleaned_at IS NULL
```

## Cron Jobs

Configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/retry-failed",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/cleanup-blobs",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

### Security

All cron endpoints require `CRON_SECRET` in Authorization header:

```
Authorization: Bearer ${CRON_SECRET}
```

Vercel automatically includes this header for scheduled cron jobs.

## Monitoring & Analytics

### Alert Rules

Configured in `.monitoring/alert_rules.json`:

**High Failure Rate**:
- Metric: `failure_rate > 0.2` (20%)
- Time Window: 60 minutes
- Severity: High
- Cooldown: 30 minutes

**Slow Execution**:
- Metric: `duration > 300000ms` (5 minutes)
- Time Window: 30 minutes
- Severity: Medium
- Cooldown: 15 minutes

### Analytics Events

Tracked via Vercel Analytics:

| Event | Trigger | Metadata |
|-------|---------|----------|
| `Webhook Delivered` | Successful webhook | submission type, files count |
| `Webhook Failed` | Failed webhook | submission type, error message |
| `Webhook Retry Succeeded` | Successful retry | retry attempt number |
| `Webhook Retry Failed` | Failed retry | retry attempt, error |
| `Webhook Auto-Retry Succeeded` | Cron retry success | retry attempt |
| `Webhook Auto-Retry Failed` | Cron retry failure | retry attempt, needs manual review |
| `Blobs Cleaned Up` | Blob deletion | blobs deleted count |

## Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Build and deploy
npm run build
vercel --prod
```

### Required Vercel Integrations

1. **Vercel Postgres** - Database storage
   - Create from Vercel dashboard
   - Automatically populates DATABASE_URL and related vars

2. **Vercel Blob** - File storage
   - Create from Vercel dashboard
   - Automatically populates BLOB_READ_WRITE_TOKEN

3. **Vercel Cron** - Scheduled jobs
   - Automatically configured from vercel.json
   - Requires CRON_SECRET environment variable

### Post-Deployment

1. Run database initialization script via Vercel dashboard
2. Configure environment variables
3. Test form submission
4. Verify cron jobs are running (check Vercel logs)
5. Test retry mechanism with a failed submission

## Security

### Security Best Practices

✅ **Environment Variables**: All secrets stored in environment variables
✅ **Cron Protection**: CRON_SECRET required for scheduled endpoints
✅ **HTTPS**: All blob URLs use HTTPS
✅ **CSP Headers**: Content Security Policy configured in vercel.json
✅ **File Size Limits**: 10MB max file upload
✅ **Input Validation**: Form validation on client and server
⚠️ **API Authentication**: Search/retry endpoints currently unprotected (internal use only)

### Recommended Improvements

- [ ] Add authentication to admin endpoints (`/api/submissions/*`)
- [ ] Implement rate limiting for public endpoints
- [ ] Add CORS restrictions for production
- [ ] Rotate CRON_SECRET regularly
- [ ] Add webhook signature verification

## Embedding in Webflow

### Replace Original Form (Line 6952-12164)

Replace the existing form section with this iframe:

```html
<div class="col col-lg-6 col-lg-offset-2 col-md-offset-0 col-md-8 col-sm-12">
    <iframe
        id="marketplace-form-app"
        src="https://webflow-form-86kiq5lhw-createsomething.vercel.app"
        width="100%"
        height="2000"
        frameborder="0"
        style="border: none; overflow: hidden;"
        title="Marketplace App Submission Form">
    </iframe>
</div>
```

### Complete Integration Script (Recommended)

Add this script to your Webflow page for style inheritance and auto-resize:

```html
<script>
// Complete Webflow integration with auto-resize and style inheritance
(function() {
    const iframe = document.getElementById('marketplace-form-app');
    if (!iframe) return;

    // Style inheritance
    function sendStyles() {
        if (!iframe.contentWindow) return;

        const bodyStyle = window.getComputedStyle(document.body);
        const rootStyle = window.getComputedStyle(document.documentElement);

        iframe.contentWindow.postMessage({
            type: 'PARENT_STYLES',
            styles: {
                fontFamily: bodyStyle.fontFamily,
                fontSize: bodyStyle.fontSize,
                color: bodyStyle.color,
                backgroundColor: bodyStyle.backgroundColor,
                lineHeight: bodyStyle.lineHeight
            }
        }, '*');
    }

    // Auto-resize iframe
    function resizeIframe(height) {
        iframe.style.height = height + 'px';
    }

    // Message handling
    window.addEventListener('message', function(event) {
        if (event.data.type === 'REQUEST_STYLES') {
            sendStyles();
        } else if (event.data.type === 'RESIZE_IFRAME') {
            resizeIframe(event.data.height);
        } else if (event.data.type === 'FORM_SUBMITTED') {
            console.log('Form submitted:', event.data.data);
            // Add your success handling here
        }
    });

    // Initialize on load
    iframe.addEventListener('load', function() {
        setTimeout(sendStyles, 500);
    });

    // Re-send styles on window resize (responsive changes)
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(sendStyles, 300);
    });
})();
</script>
```

## Development

### Available Scripts

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Project Structure

```
├── pages/
│   ├── index.js                    # Main form UI
│   └── api/
│       ├── submit-form.js          # Form submission handler
│       ├── verify-client-id.js     # Client ID verification
│       ├── submissions/
│       │   ├── search.js           # Search submissions
│       │   ├── [id].js             # Get single submission
│       │   └── retry.js            # Manual retry
│       ├── cron/
│       │   ├── retry-failed.js     # Automatic retry cron
│       │   └── cleanup-blobs.js    # Blob cleanup cron
│       └── airtable/
│           ├── get-app.js          # Auto-fill data
│           └── test-fields.js      # Field mapping test
├── lib/
│   └── db.js                       # Database utilities
├── scripts/
│   └── init-db.sql                 # Database schema
├── .monitoring/
│   └── alert_rules.json            # Monitoring configuration
├── vercel.json                     # Vercel config (crons, headers)
└── .env.local                      # Environment variables (not committed)
```

### Database Queries

```javascript
// Import database utilities
import { db } from '../lib/db';

// Create submission
const submission = await db.createSubmission({ ... });

// Update submission
await db.updateSubmission(id, { status: 'webhook_success' });

// Get submission
const submission = await db.getSubmission(id);

// Search submissions
const results = await db.searchSubmissions({ status: 'webhook_failed' });

// Get failed submissions for retry
const failed = await db.getFailedSubmissions(3);

// Get submissions ready for blob cleanup
const toCleanup = await db.getSubmissionsForBlobCleanup();

// Get statistics
const stats = await db.getStats(7); // Last 7 days
```

### Testing Cron Jobs Locally

Cron jobs require `CRON_SECRET` in Authorization header:

```bash
# Test retry-failed cron
curl -X POST http://localhost:3000/api/cron/retry-failed \
  -H "Authorization: Bearer ${CRON_SECRET}"

# Test cleanup-blobs cron
curl -X POST http://localhost:3000/api/cron/cleanup-blobs \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

## Customization

### Modify Webhook Data Structure
Edit `pages/api/submit-form.js` to change how data is structured before sending to Airtable.

### Add/Remove Form Fields
Edit `pages/index.js` to add or remove form fields while maintaining validation patterns.

### Update Retry Logic
Edit `pages/api/cron/retry-failed.js` to adjust retry attempts, backoff timing, or conditions.

### Change Blob Retention
Edit `pages/api/cron/cleanup-blobs.js` to adjust the 24-hour retention window.

### Styling
The form inherits your Webflow styles when embedded. You can also customize styles in the `<style jsx>` section of `pages/index.js`.

## Benefits

1. **Reliability**: Automatic retry ensures no submissions are lost
2. **Observability**: Full audit trail of all submissions and attempts
3. **Cost Efficiency**: Automatic blob cleanup reduces storage costs
4. **Scalability**: Database-backed with optimized indexes
5. **Maintainability**: Separation of concerns with dedicated API endpoints
6. **Error Recovery**: Detailed error tracking and manual retry capability
7. **Production-Ready**: Monitoring, alerts, and analytics built-in

## Support

For issues, questions, or feature requests:
- Check Vercel logs for runtime errors
- Query database for submission status
- Review analytics events for patterns
- Use search API to find specific submissions
- Manual retry for critical failures

---

**Version**: 1.0.0
**Last Updated**: 2025-11-20
