# Cross-Property Learning Events Implementation

**Status**: Foundation Complete ✓
**Task**: `zf1` - Cross-Property Learning Actions

## Overview

Implemented a unified learning event tracking system that allows all CREATE SOMETHING properties to contribute to a learner's progress in the LMS.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Properties (.io, .space, .ltd, .agency)                     │
│  • Track learning events via helper functions                │
│  • Auto-tracks on user actions (scroll, completion, etc)     │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│  @create-something/components/utils (Shared Library)         │
│  • trackLearningEvent()                                      │
│  • Property-specific helpers (io.*, space.*, ltd.*, agency.*)│
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│  LMS API (learn.createsomething.space/api/events)            │
│  • Validates JWT authentication                              │
│  • Stores events in learning_events table                    │
│  • Updates learner's last_seen_at timestamp                  │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│  LMS Dashboard                                                │
│  • Displays cross-property progress                          │
│  • Hermeneutic spiral visualization                          │
└──────────────────────────────────────────────────────────────┘
```

## Files Created

### Core Infrastructure

1. **`packages/lms/migrations/0003_learning_events.sql`**
   - Database schema for learning events
   - Tracks: learner_id, property, event_type, metadata, timestamp
   - Indexed for fast queries

2. **`packages/lms/src/routes/api/events/+server.ts`**
   - POST endpoint for recording events
   - GET endpoint for querying events
   - Authentication via JWT cookies
   - Validates property and event_type

3. **`packages/components/src/lib/utils/learning.ts`**
   - Shared utility library
   - `trackLearningEvent()` - Low-level API
   - Property-specific helpers:
     - `io.paperStarted()`, `io.paperCompleted()`, `io.paperReflected()`
     - `space.experimentStarted()`, `space.experimentCompleted()`, `space.challengeSubmitted()`
     - `ltd.canonReviewed()`, `ltd.principleAdopted()`
     - `agency.methodologyApplied()`, `agency.projectCompleted()`

### Property Implementations

#### .io (Research)

4. **`packages/io/src/lib/components/TrackedPaper.svelte`**
   - Wraps Paper component with automatic tracking
   - Tracks start at 25% scroll
   - Tracks completion at 80% scroll
   - Tracks time spent on page
   - Public `trackReflection()` method for reflection submissions

#### .space (Practice)

5. **`packages/space/src/lib/utils/completion.ts`** (modified)
   - Integrated learning event tracking into existing completion flow
   - `trackExperimentStart()` - Tracks first view
   - `markExperimentCompleted()` - Now sends event to LMS
   - Preserves existing localStorage-based completion state

6. **`packages/space/src/routes/experiments/[slug]/+page.svelte`** (modified)
   - Auto-tracks experiment start on mount
   - Sends completion events with time spent

#### .ltd (Philosophy)

7. **`packages/ltd/src/lib/utils/tracking.ts`**
   - `trackCanonReview()` - Tracks pattern/principle views
   - `trackPrincipleAdoption()` - Tracks explicit adoption
   - Uses localStorage to avoid duplicate start events

8. **`packages/ltd/src/lib/components/TrackedPattern.svelte`**
   - Wrapper component for automatic canon review tracking
   - Drop-in replacement for pattern pages

### Documentation

9. **`packages/components/src/lib/utils/LEARNING_TRACKING.md`**
   - Complete usage guide
   - Architecture diagrams
   - Property-specific examples
   - API reference
   - Migration instructions

10. **`LEARNING_EVENTS_IMPLEMENTATION.md`** (this file)
    - Implementation summary
    - Deployment checklist
    - Next steps

## Event Types

### .io Events
- `paper_started` - User scrolls 25% into paper
- `paper_completed` - User scrolls 80% through paper
- `paper_reflected` - User submits reflection on paper

### .space Events
- `experiment_started` - User views experiment page
- `experiment_completed` - User completes experiment
- `challenge_submitted` - User submits code challenge

### .ltd Events
- `canon_reviewed` - User views pattern/principle page
- `principle_adopted` - User explicitly adopts principle

### .agency Events
- `methodology_applied` - Methodology used in project
- `project_completed` - Client project delivered

## Deployment Checklist

### Database Migration

```bash
# Development
cd packages/lms
wrangler d1 migrations apply lms-db --local

# Production
wrangler d1 migrations apply lms-db
```

### Component Library

```bash
# Build and package
pnpm --filter=@create-something/components package

# Will be auto-linked in monorepo
```

### Property Deployments

Each property needs to be redeployed to use the new tracking:

```bash
# .io
pnpm --filter=io build
wrangler pages deploy packages/io/.svelte-kit/cloudflare --project-name=create-something-io

# .space
pnpm --filter=space build
wrangler pages deploy packages/space/.svelte-kit/cloudflare --project-name=create-something-space

# .ltd
pnpm --filter=ltd build
wrangler pages deploy packages/ltd/.svelte-kit/cloudflare --project-name=createsomething-ltd

# .lms (API changes)
pnpm --filter=lms build
wrangler pages deploy packages/lms/.svelte-kit/cloudflare --project-name=createsomething-lms
```

## Testing

### Local Development

1. Start LMS dev server:
   ```bash
   pnpm dev --filter=lms
   ```

2. Start property dev server:
   ```bash
   pnpm dev --filter=io   # or space, ltd, agency
   ```

3. Login at `http://localhost:5173/login`

4. Trigger events:
   - .io: Visit `/papers/code-mode-hermeneutic-analysis` and scroll
   - .space: Visit `/experiments/subtractive-form` and complete
   - .ltd: Visit `/patterns/arc`

5. Check events:
   ```bash
   curl http://localhost:5173/api/events \
     -H "Cookie: cs_access_token=YOUR_TOKEN" \
     -H "Content-Type: application/json"
   ```

### Production Testing

1. Apply database migration (see above)
2. Deploy all properties (see above)
3. Login at `https://learn.createsomething.space/login`
4. Visit papers, experiments, patterns
5. Check events at `https://learn.createsomething.space/api/events`

## Usage Examples

### .io - TrackedPaper Component

```svelte
<script>
  import TrackedPaper from '$lib/components/TrackedPaper.svelte';
</script>

<TrackedPaper
  title="Code Mode Hermeneutic Analysis"
  paperSlug="code-mode-hermeneutic-analysis"
  category="Methodology"
  readTime="15 min read"
>
  {#snippet abstract()}
    <p>Paper abstract...</p>
  {/snippet}

  {#snippet content()}
    <p>Main content...</p>
  {/snippet}
</TrackedPaper>
```

### .space - Automatic Tracking

```typescript
// Existing completion.ts functions now track events automatically
markExperimentCompleted('subtractive-form', 3600); // Sends event to LMS
```

### .ltd - Pattern Wrapper

```svelte
<script>
  import TrackedPattern from '$lib/components/TrackedPattern.svelte';
</script>

<TrackedPattern patternId="arc-pattern">
  <!-- Existing pattern content -->
  <section>...</section>
</TrackedPattern>
```

### .agency - Manual Tracking

```typescript
import { agency } from '@create-something/components/utils';

// When methodology is applied
await agency.methodologyApplied('arc-integration', 'project_workway');

// When project completes
await agency.projectCompleted('project_workway', [
  'arc-integration',
  'subtractive-forms'
]);
```

## Next Steps

### Immediate
- [ ] Apply database migration to production
- [ ] Deploy .lms API changes
- [ ] Test authentication flow end-to-end

### Short-term
- [ ] Replace manual Paper components with TrackedPaper in .io
- [ ] Add TrackedPattern wrapper to .ltd pattern pages
- [ ] Create LMS dashboard to visualize cross-property events

### Long-term
- [ ] Add reflection submission forms to .io papers
- [ ] Create "Adopt this principle" buttons on .ltd patterns
- [ ] Build .agency project management interface with tracking
- [ ] Implement hermeneutic spiral visualization

## Subtractive Triad Reflection

This implementation embodies the three levels:

1. **DRY** (Implementation)
   - Single API endpoint serves all properties
   - Unified utility library eliminates duplication
   - Property-specific helpers abstract common patterns

2. **Rams** (Artifact)
   - Minimal surface area: `trackLearningEvent()` + helpers
   - Fire-and-forget: tracking never blocks UI
   - Transparent: developers import and call, nothing more

3. **Heidegger** (System)
   - Events flow seamlessly across property boundaries
   - The tracking infrastructure disappears
   - Only the unified learning journey remains visible

**Canon**: The infrastructure disappears; only the learning remains.
