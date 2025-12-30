# WORKWAY Integration Guide

This law-firm template is integrated with WORKWAY for workflow automation. This document explains the integration pattern and how to configure it.

## Philosophy: Zuhandenheit

The WORKWAY integration recedes into transparent use. Developers call `workway.trigger()`, and workflows happen invisibly. Users experience outcomes (automated consultation bookings) without seeing the mechanism.

## Architecture

```
Law Firm Template (SvelteKit)
  └── API Route: /api/consultation
      └── WORKWAY Client
          └── Triggers workflow
              └── WORKWAY Platform
                  └── Executes workflow
                      ├── Calendar integration
                      ├── CRM integration
                      └── Slack notification
```

## Files

| File | Purpose |
|------|---------|
| `src/lib/workway/client.ts` | WORKWAY API client (follows BaseAPIClient pattern) |
| `src/lib/workway/index.ts` | Module exports |
| `src/routes/api/consultation/+server.ts` | Consultation form handler with WORKWAY trigger |
| `src/lib/workflows/consultation-booking.ts` | Workflow definition using `defineWorkflow()` |
| `src/lib/config/site.ts` | Workflow IDs configuration |

## Environment Variables

Set these in your Cloudflare Pages environment:

```bash
WORKWAY_API_KEY=your_api_key_here
WORKWAY_ORG_ID=your_organization_id  # Optional: for private workflows
```

### Getting Your API Key

1. Sign up at https://workway.co
2. Navigate to Settings → API Keys
3. Create a new API key for this law firm site
4. Copy the key and set it in Cloudflare Pages environment variables

## Configuration

In `src/lib/config/site.ts`:

```typescript
workflows: {
  consultationBooking: 'consultation-booking',
  followUp: 'post-meeting-follow-up',
  appointmentReminder: 'appointment-reminder',
}
```

These IDs correspond to WORKWAY workflows. The consultation booking flow triggers automatically when a user submits the consultation form.

## Usage: Triggering Workflows

In API routes or server-side code:

```typescript
import { createWorkwayClient, isWorkflowSuccess } from '$lib/workway';

// Create client
const workway = createWorkwayClient({
  apiKey: platform?.env.WORKWAY_API_KEY,
  organizationId: platform?.env.WORKWAY_ORG_ID, // optional
});

// Trigger workflow
const result = await workway.trigger({
  workflowId: 'consultation-booking',
  event: 'consultation.requested',
  data: {
    name: 'John Doe',
    email: 'john@example.com',
    service: 'family-law',
    preferredDate: '2025-01-15',
    preferredTime: '14:00',
  },
  idempotencyKey: 'unique-key', // optional: prevents duplicate triggers
});

// Check result
if (isWorkflowSuccess(result)) {
  console.log('Workflow triggered:', result.executionId);
} else {
  console.error('Workflow failed:', result.error);
}
```

## Workflow Definitions

Workflows are defined in `src/lib/workflows/` using WORKWAY SDK:

```typescript
import { defineWorkflow, webhook } from '@workwayco/sdk';

export const consultationBookingWorkflow = defineWorkflow({
  name: 'Consultation Booking',
  version: '1.0.0',

  // Required integrations
  integrations: ['calendly', 'hubspot', 'slack'],

  // User-configurable inputs
  inputs: {
    calendarId: {
      type: 'text',
      label: 'Calendar ID',
      required: true,
    },
    slackChannel: {
      type: 'text',
      label: 'Slack Channel',
      default: '#new-consultations',
    },
  },

  // Webhook trigger
  trigger: webhook({
    event: 'consultation.requested',
  }),

  // Execution logic
  async execute(context) {
    const data = context.trigger.data;
    const { inputs, integrations } = context;

    // Integration calls would go here
    // await integrations.calendly.createEvent(...)
    // await integrations.hubspot.createContact(...)
    // await integrations.slack.sendMessage(...)

    return {
      success: true,
      data: { message: 'Consultation booked' },
    };
  },
});
```

## BaseAPIClient Pattern

The WORKWAY client follows the BaseAPIClient pattern from WORKWAY SDK:

- **Centralized error handling**: All errors are caught and returned as structured responses
- **Automatic retries**: Transient failures are retried automatically
- **Rate limiting**: Respects API rate limits
- **Consistent responses**: All methods return typed response objects

This pattern ensures:
1. **Zuhandenheit**: Tool recedes - developers don't think about error handling
2. **Reliability**: Failures are handled gracefully
3. **Observability**: All actions are logged for debugging

## Deployment

### Local Development

```bash
# Install dependencies (links WORKWAY SDK from local WORKWAY repo)
pnpm install

# Run development server
pnpm dev
```

The SDK is linked from `../../../../../WORKWAY/Cloudflare/packages/sdk` during development.

### Production Deployment

For production, replace the local link with the published package:

```json
{
  "dependencies": {
    "@workwayco/sdk": "^1.1.0"
  }
}
```

Then deploy to Cloudflare Pages:

```bash
pnpm build
pnpm deploy
```

## Testing

Test the integration:

```bash
# Send a test consultation request
curl -X POST http://localhost:5173/api/consultation \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "service": "family-law",
    "preferredDate": "2025-01-15",
    "preferredTime": "14:00"
  }'
```

Check the console output for:
- ✅ WORKWAY workflow triggered: `{executionId}`
- ❌ WORKWAY workflow trigger failed: `{error}`

## Design Canon Compliance

This integration follows CREATE SOMETHING's design canon:

1. **Zuhandenheit**: WORKWAY mechanism is invisible - users experience outcomes
2. **Weniger, aber besser**: Minimal API surface (`trigger()`, `getExecutionStatus()`, `testConnection()`)
3. **Outcome Test**: Can describe value without mentioning technology ("Consultations book themselves")
4. **BaseAPIClient**: Follows proven pattern from WORKWAY SDK
5. **TypeScript**: Fully typed for developer experience

## Future Enhancements

Planned improvements:

- [ ] Add actual integration implementations (Calendly, HubSpot, Slack) to workflows
- [ ] Add workflow execution status polling
- [ ] Add retry logic with exponential backoff
- [ ] Add webhook verification for WORKWAY → law-firm callbacks
- [ ] Add analytics dashboard for workflow executions

## Support

For questions about WORKWAY integration:
- WORKWAY Docs: https://docs.workway.co
- WORKWAY Discord: https://discord.gg/workway
- Issues: https://github.com/workwayco/workway/issues
