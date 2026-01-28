# Learning Event Tracking

Cross-property learning activity tracking for the CREATE SOMETHING ecosystem.

## Philosophy

**Canon**: The infrastructure disappears; only the unified journey remains.

Learning happens across all CREATE SOMETHING properties. Reading a paper on `.io`, completing an exercise on `.space`, reviewing a principle on `.ltd`, or delivering a project on `.agency`—all contribute to the learner's hermeneutic spiral.

This utility provides a unified interface for tracking learning activity that flows to the LMS API.

## Installation

The tracking utilities are exported from `@create-something/components/utils`:

```typescript
import {
  trackLearningEvent,
  io,
  space,
  ltd,
  agency
} from '@create-something/components/utils';
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Properties (.io, .space, .ltd, .agency)                    │
│  • Track learning events via helper functions               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  LMS API (learn.createsomething.space/api/events)           │
│  • Validates authentication (JWT cookies)                   │
│  • Stores events in learning_events table                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  LMS Dashboard                                               │
│  • Displays learning progress across all properties         │
│  • Shows hermeneutic spiral visualization                   │
└─────────────────────────────────────────────────────────────┘
```

## Authentication

All tracking functions require the user to be authenticated. Authentication is handled automatically via HTTP-only cookies:

- `cs_access_token` - JWT access token (15 min expiry)
- `cs_refresh_token` - Refresh token (7 day expiry)

The LMS API validates tokens and returns 401 if unauthenticated.

## Usage by Property

### .io (Research)

Track paper reading activity:

```typescript
import { io } from '@create-something/components/utils';

// Track when user starts reading (e.g., 25% scroll)
await io.paperStarted('code-mode-hermeneutic-analysis');

// Track when user completes reading (e.g., 80% scroll)
await io.paperCompleted('code-mode-hermeneutic-analysis', 1800); // 30 min

// Track when user submits a reflection
await io.paperReflected('code-mode-hermeneutic-analysis', 250); // 250 chars
```

**Implementation Pattern**: See `packages/io/src/lib/components/TrackedPaper.svelte` for a complete example.

### .space (Practice)

Track experiment/exercise completion:

```typescript
import { space } from '@create-something/components/utils';

// Track when user starts an experiment
await space.experimentStarted('subtractive-form');

// Track when user completes an experiment
await space.experimentCompleted('subtractive-form', 3600); // 1 hour

// Track code challenge submission
await space.challengeSubmitted('build-a-form', true); // passed=true
```

**Implementation Pattern**: See `packages/space/src/lib/utils/completion.ts` for integration with existing completion tracking.

### .ltd (Philosophy)

Track canon review and principle adoption:

```typescript
import { ltd } from '@create-something/components/utils';

// Track when user views a pattern/principle
await ltd.canonReviewed('arc-pattern');

// Track when user explicitly adopts a principle
await ltd.principleAdopted('subtractive-triad', 'applying to web forms');
```

**Implementation Pattern**: See `packages/ltd/src/lib/utils/tracking.ts` and `packages/ltd/src/lib/components/TrackedPattern.svelte`.

### .agency (Services)

Track methodology application in client work:

```typescript
import { agency } from '@create-something/components/utils';

// Track when methodology is applied to a project
await agency.methodologyApplied('arc-integration', 'project_workway');

// Track when project is completed
await agency.projectCompleted('project_workway', ['arc-integration', 'subtractive-forms']);
```

**Implementation Pattern**: To be implemented in project management interface.

## Custom Events

For events not covered by helper functions, use the low-level API:

```typescript
import { trackLearningEvent } from '@create-something/components/utils';

await trackLearningEvent({
  property: 'io',
  eventType: 'custom_event_type',
  metadata: {
    customField: 'value',
    duration: 300,
  }
});
```

## Event Schema

All events are stored with this structure:

```typescript
{
  id: string;              // evt_1234567890_abc123
  learner_id: string;      // user ID from JWT
  property: 'io' | 'space' | 'ltd' | 'agency';
  event_type: string;      // e.g., 'paper_completed'
  metadata: object;        // Custom data
  created_at: number;      // Unix timestamp
}
```

## Error Handling

All tracking functions return a response object:

```typescript
const response = await io.paperStarted('my-paper');

if (!response.success) {
  console.error('Failed to track event:', response.error);
}
```

**Best Practice**: Track events in a fire-and-forget manner. Don't block UI on tracking failures.

## Local Development

When testing locally, ensure:

1. The LMS API is running: `pnpm dev --filter=lms`
2. You're authenticated (login via `http://localhost:5173/login`)
3. CORS is configured to allow your local property domain

## Database Migration

To enable learning events, apply the migration:

```bash
cd packages/lms
wrangler d1 migrations apply createsomething-lms --local  # Development
wrangler d1 migrations apply createsomething-lms          # Production
```

The migration creates the `learning_events` table.

## Querying Events

Events can be queried via the LMS API:

```typescript
// Get all events for authenticated user
const response = await fetch('https://learn.createsomething.space/api/events', {
  credentials: 'include'
});

// Filter by property
const ioEvents = await fetch(
  'https://learn.createsomething.space/api/events?property=io',
  { credentials: 'include' }
);

// Filter by event type
const paperCompletions = await fetch(
  'https://learn.createsomething.space/api/events?eventType=paper_completed',
  { credentials: 'include' }
);
```

## Subtractive Triad Reflection

This tracking system embodies the Subtractive Triad:

1. **DRY** (Implementation) → Unified API across all properties
2. **Rams** (Artifact) → Minimal surface area, property-specific helpers
3. **Heidegger** (System) → Events flow seamlessly; the infrastructure disappears

The goal: Learning activity is tracked transparently, contributing to the hermeneutic journey without becoming a burden.
