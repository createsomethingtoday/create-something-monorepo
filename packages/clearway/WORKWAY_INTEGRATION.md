# WORKWAY Integration for CLEARWAY

CLEARWAY's notification system is integrated with WORKWAY for workflow automation. This document explains the integration pattern and configuration.

## Philosophy: Zuhandenheit

The WORKWAY integration recedes into transparent use. When a booking is confirmed, reminders are sent, or cancellations occur, workflows trigger invisibly. Users experience outcomes (automated follow-ups, CRM updates) without seeing the mechanism.

## Architecture

```
CLEARWAY Notification Worker
  └── Notification Events (cron + queue)
      └── WORKWAY Client
          └── Triggers workflow
              └── WORKWAY Platform
                  └── Executes workflow
                      ├── CRM integration (HubSpot, Salesforce)
                      ├── Email automation (SendGrid)
                      ├── SMS follow-ups (Twilio)
                      └── Calendar sync (Google Calendar)
```

## Integration Points

| Event | Workflow ID | When Triggered |
|-------|-------------|----------------|
| Booking confirmed | `clearway-booking-confirmed` | Payment successful, reservation confirmed |
| Booking reminder | `clearway-booking-reminder` | 24h and 2h before reservation |
| Booking cancelled | `clearway-booking-cancelled` | User cancels reservation |
| Payment received | `clearway-payment-received` | Stripe payment intent succeeds |

## Files

| File | Purpose |
|------|---------|
| `workers/notifier/src/workway-client.ts` | WORKWAY API client (follows BaseAPIClient pattern) |
| `workers/notifier/src/index.ts` | Notification worker with WORKWAY triggers |
| `workers/notifier/wrangler.toml` | Worker configuration with WORKWAY env vars |

## Environment Variables

Set these in Cloudflare Workers environment (via `wrangler secret put`):

```bash
# Optional: WORKWAY integration (graceful degradation if not set)
wrangler secret put WORKWAY_API_KEY
wrangler secret put WORKWAY_ORG_ID  # Optional: for private workflows
```

### Getting Your API Key

1. Sign up at https://workway.co
2. Navigate to Settings → API Keys
3. Create a new API key for CLEARWAY
4. Copy the key and set it via `wrangler secret put WORKWAY_API_KEY`

## Workflow Triggers

### 1. Booking Confirmed

**Event:** `booking.confirmed`
**Workflow ID:** `clearway-booking-confirmed`

Triggered when:
- Stripe checkout session completes successfully
- Reservation status changes to `confirmed`

Payload:
```typescript
{
  reservationId: string;
  memberId: string;
  facilityId: string;
  courtName: string;
  startTime: string;
  endTime: string;
  facilityName: string;
  email: string;
  phone: string | null;
}
```

Example workflow actions:
- Add contact to CRM
- Send welcome email with facility details
- Create Google Calendar event
- Send SMS confirmation

### 2. Booking Reminder

**Event:** `booking.reminder`
**Workflow ID:** `clearway-booking-reminder`

Triggered when:
- Cron runs every 15 minutes
- Reservation starts in 24 hours (first reminder)
- Reservation starts in 2 hours (second reminder)

Payload:
```typescript
{
  reservationId: string;
  memberId: string;
  facilityId: string;
  courtName: string;
  startTime: string;
  endTime: string;
  facilityName: string;
  minutesBefore: number;  // 1440 (24h) or 120 (2h)
  email: string;
  phone: string | null;
}
```

Example workflow actions:
- Send reminder email with directions
- Send SMS with check-in instructions
- Update CRM contact activity
- Notify facility staff via Slack

### 3. Booking Cancelled

**Event:** `booking.cancelled`
**Workflow ID:** `clearway-booking-cancelled`

Triggered when:
- User cancels reservation
- Admin cancels reservation
- Auto-cancelled due to payment failure

Payload:
```typescript
{
  reservationId: string;
  memberId: string;
  facilityId: string;
  courtName: string;
  startTime: string;
  facilityName: string;
  penaltyApplied: boolean;
  email: string;
  phone: string | null;
}
```

Example workflow actions:
- Send cancellation confirmation
- Process refund (if applicable)
- Update CRM status
- Notify waitlist members

### 4. Payment Received

**Event:** `payment.received`
**Workflow ID:** `clearway-payment-received`

Triggered when:
- Stripe payment intent succeeds
- Payment record created in database

Payload:
```typescript
{
  paymentId: string;
  reservationId: string;
  memberId: string;
  facilityId: string;
  amountTotal: number;
  platformFee: number;
  facilityAmount: number;
  email: string;
}
```

Example workflow actions:
- Send receipt email
- Update accounting system
- Create invoice in QuickBooks
- Notify facility of payment

## Graceful Degradation

**Critical design principle:** WORKWAY failures DO NOT fail the main operation.

If WORKWAY is unavailable or not configured:
- Notifications still send (email/SMS)
- Logs warning: `WORKWAY trigger skipped (not configured): booking.confirmed`
- Reservation proceeds normally

This ensures:
1. **Reliability**: Core functionality works without WORKWAY
2. **Optional enhancement**: WORKWAY is a value-add, not a dependency
3. **Zuhandenheit**: Users never see WORKWAY failures

## Implementation Pattern

All workflow triggers follow this pattern:

```typescript
// After successful notification send
const workway = createWorkwayClient(env.WORKWAY_API_KEY, env.WORKWAY_ORG_ID);
await triggerWorkflowSafely(workway, {
  workflowId: 'clearway-booking-confirmed',
  event: 'booking.confirmed',
  data: { ... },
  idempotencyKey: `booking-confirmed-${reservationId}`
});
```

Key features:
- **Idempotency keys**: Prevent duplicate triggers (e.g., webhook retries)
- **Safe triggering**: `triggerWorkflowSafely()` logs errors but doesn't throw
- **Null-safe**: Works when `workway` client is null (not configured)

## BaseAPIClient Pattern

The WORKWAY client follows the BaseAPIClient pattern from WORKWAY SDK:

- **Centralized error handling**: All errors are caught and returned as structured responses
- **Consistent responses**: All methods return typed response objects
- **Graceful degradation**: Missing API key returns null client

This pattern ensures:
1. **Zuhandenheit**: Tool recedes - developers don't think about error handling
2. **Reliability**: Failures are handled gracefully
3. **Observability**: All actions are logged for debugging

## Testing

### Local Testing

```bash
# Install dependencies
pnpm install

# Set environment variables
export WORKWAY_API_KEY="your_api_key_here"
export WORKWAY_ORG_ID="your_org_id"  # optional

# Run notifier worker locally
cd workers/notifier
pnpm dev
```

### Trigger Test Notifications

Use the CLEARWAY admin UI or API to:
1. Create a test reservation
2. Complete Stripe checkout
3. Check worker logs for WORKWAY trigger confirmation

Expected log output:
```
WORKWAY workflow triggered: booking.confirmed → exec_abc123xyz
```

Or if WORKWAY not configured:
```
WORKWAY trigger skipped (not configured): booking.confirmed
```

## Deployment

### 1. Deploy Worker

```bash
cd packages/clearway/workers/notifier
wrangler deploy
```

### 2. Set Secrets

```bash
# Required for email/SMS
wrangler secret put SENDGRID_API_KEY
wrangler secret put TWILIO_ACCOUNT_SID
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put TWILIO_FROM_NUMBER

# Optional for WORKWAY
wrangler secret put WORKWAY_API_KEY
wrangler secret put WORKWAY_ORG_ID
```

### 3. Verify Deployment

```bash
# Check worker logs
wrangler tail court-reserve-notifier

# Trigger test notification
# (Use CLEARWAY admin UI to create test booking)
```

## Creating Workflows

To create custom workflows for CLEARWAY events:

1. Go to https://workway.co/workflows
2. Create new workflow
3. Set workflow ID (must match trigger IDs above)
4. Configure integrations (CRM, email, etc.)
5. Define workflow steps
6. Publish workflow

Example workflow for `clearway-booking-confirmed`:

```yaml
name: CLEARWAY Booking Confirmation
trigger:
  event: booking.confirmed

steps:
  - name: Add to CRM
    integration: hubspot
    action: create_or_update_contact
    config:
      email: "{{ event.data.email }}"
      properties:
        firstname: "{{ event.data.email | split('@') | first }}"
        court_bookings: "{{ event.data.facilityName }}"
        last_booking_date: "{{ event.data.startTime }}"

  - name: Send Welcome Email
    integration: sendgrid
    action: send_email
    config:
      to: "{{ event.data.email }}"
      template_id: "d-abc123"
      dynamic_data:
        courtName: "{{ event.data.courtName }}"
        startTime: "{{ event.data.startTime }}"
        facilityName: "{{ event.data.facilityName }}"

  - name: Create Calendar Event
    integration: google-calendar
    action: create_event
    config:
      summary: "Court Reservation - {{ event.data.courtName }}"
      start: "{{ event.data.startTime }}"
      end: "{{ event.data.endTime }}"
      attendees:
        - "{{ event.data.email }}"
```

## Monitoring

### Workflow Execution Logs

View workflow executions in WORKWAY dashboard:
- https://workway.co/executions

Filter by:
- Workflow ID (e.g., `clearway-booking-confirmed`)
- Status (success, failed)
- Date range

### Worker Logs

View notification worker logs:

```bash
wrangler tail court-reserve-notifier
```

Look for:
- ✅ `WORKWAY workflow triggered: booking.confirmed → exec_123`
- ⚠️  `WORKWAY workflow trigger failed: booking.confirmed → Network error`
- ℹ️  `WORKWAY trigger skipped (not configured): booking.confirmed`

## Design Canon Compliance

This integration follows CREATE SOMETHING's design canon:

1. **Zuhandenheit**: WORKWAY mechanism is invisible - users experience outcomes
2. **Weniger, aber besser**: Minimal API surface (`trigger()`, `testConnection()`)
3. **Outcome Test**: Can describe value without mentioning technology ("Bookings update CRM automatically")
4. **BaseAPIClient**: Follows proven pattern from WORKWAY SDK
5. **TypeScript**: Fully typed for developer experience
6. **Graceful degradation**: Works without WORKWAY, enhanced with it

## Future Enhancements

Planned improvements:

- [ ] Add workflow execution status polling
- [ ] Add retry logic with exponential backoff for failed triggers
- [ ] Add analytics dashboard for workflow executions
- [ ] Add webhook verification for WORKWAY → CLEARWAY callbacks
- [ ] Add workflow template marketplace for common CLEARWAY automations

## Support

For questions about WORKWAY integration:
- WORKWAY Docs: https://docs.workway.co
- WORKWAY Discord: https://discord.gg/workway
- Issues: https://github.com/workwayco/workway/issues
