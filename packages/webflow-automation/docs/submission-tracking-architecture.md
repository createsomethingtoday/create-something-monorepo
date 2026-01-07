# Submission Tracking System Architecture

Port of webflow-dashboard submission tracking to SvelteKit. Hybrid API integration with local fallback.

## Overview

The submission tracking system enforces Webflow's 6-submission-per-30-day rolling window limit. It uses a hybrid approach:
1. **Primary**: External API call to `check-asset-name.vercel.app` (source of truth)
2. **Fallback**: Local calculation from asset data when API unavailable

## Architecture Diagram

```
+------------------+     +------------------+     +------------------+
|   SvelteKit UI   |     |  Server Routes   |     |   External API   |
|  (Svelte Store)  |     |   (+server.ts)   |     | (Vercel/Worker)  |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
         | 1. Load assets         |                        |
         +----------------------->|                        |
         |                        |                        |
         | 2. Subscribe to store  | 3. Proxy API call      |
         |<-----------------------+----------------------->|
         |                        |                        |
         |                        | 4. Return submission   |
         | 5. Update UI state     |<-----------------------+
         |<-----------------------+                        |
         |                        |                        |
         | (If API fails)         |                        |
         | 6. Use local calc      |                        |
         +----------------------->|                        |
         |                        |                        |
+--------+---------+     +--------+---------+     +--------+---------+
|   Asset Cache    |     |    D1 Database   |     |    Airtable      |
| (Client memory)  |     |    (Optional)    |     |  (Source data)   |
+------------------+     +------------------+     +------------------+
```

## Data Flow

### 1. Initial Load
```
User opens dashboard
  -> Server load function fetches assets from Airtable
  -> Assets passed to client via page data
  -> Client store initialized with assets
  -> Store calculates local submission state
```

### 2. API Verification (Production Only)
```
Store initialized
  -> Check if production (not localhost/127.0.0.1)
  -> POST to server proxy route
  -> Server calls external API (bypasses CORS)
  -> Response merged with local calculation
  -> UI updated with authoritative data
```

### 3. Local Fallback
```
External API fails OR development mode
  -> Local calculation from assets array
  -> 30-day rolling window applied
  -> Submission list with expiry dates generated
  -> Conservative estimate used
```

## API Endpoints

### External API (Existing)
**URL**: `https://check-asset-name.vercel.app/api/checkTemplateuser`
**Method**: POST
**Body**: `{ email: string }`

#### Response
```typescript
interface ExternalApiResponse {
  assetsSubmitted30: number;      // Submissions in last 30 days
  hasError: boolean;              // Whether user is at limit or has error
  message?: string;               // Human-readable status message
  publishedTemplates?: number;    // Total published templates
  submittedTemplates?: number;    // Total submitted templates
  isWhitelisted?: boolean;        // Whether user bypasses limits
}
```

### SvelteKit Proxy Route (New)
**Path**: `/api/submissions/status`
**Method**: POST
**Body**: `{ email: string }`

#### Why a Proxy?
1. **CORS**: External API doesn't allow browser requests
2. **Security**: Hides API structure from client
3. **Caching**: Can add server-side caching layer
4. **Logging**: Centralized error tracking

```typescript
// src/routes/api/submissions/status/+server.ts
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
  const { email } = await request.json();

  try {
    const response = await fetch(
      'https://check-asset-name.vercel.app/api/checkTemplateuser',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      }
    );

    if (!response.ok) {
      throw new Error(`External API error: ${response.status}`);
    }

    return json(await response.json());
  } catch (error) {
    console.error('[Submissions] External API failed:', error);
    return json({ error: 'External API unavailable' }, { status: 502 });
  }
};
```

## TypeScript Types

### Core Types

```typescript
// packages/webflow-automation/shared/submission-types.ts

/**
 * Individual submission within the 30-day window
 */
export interface Submission {
  id: string;
  name: string;
  submittedDate: Date;
  expiryDate: Date;        // When this submission exits the 30-day window
  status: TemplateStatus;
}

/**
 * Template statuses that affect submission counting
 */
export type TemplateStatus =
  | 'Submitted'
  | 'In Review'
  | 'Published'
  | 'Rejected'
  | 'Delisted';

/**
 * Complete submission state for the store
 */
export interface SubmissionState {
  // External API data
  remainingSubmissions: number;   // 0-6, how many slots available
  hasError: boolean;              // Whether user is blocked
  message: string;                // Status message for UI
  canSubmitNow: boolean;          // Quick check for submit button
  isAtLimit: boolean;             // True if remainingSubmissions === 0
  publishedTemplates: number;     // Total published count
  submittedTemplates: number;     // Total submitted count
  isWhitelisted: boolean;         // Whether user bypasses limits
  assetsSubmitted30: number;      // Submissions in 30-day window
  isLoading: boolean;             // Loading state for UI

  // Local calculation data
  submissions: Submission[];      // List of submissions with expiry dates
  nextExpiryDate: Date | null;    // When next slot becomes available
}

/**
 * External API response structure
 */
export interface ExternalApiResponse {
  assetsSubmitted30: number;
  hasError: boolean;
  message?: string;
  publishedTemplates?: number;
  submittedTemplates?: number;
  isWhitelisted?: boolean;
}

/**
 * Asset data from Airtable (subset of fields needed)
 */
export interface Asset {
  id: string;
  name: string;
  status: TemplateStatus | 'Delisted';
  submittedDate?: string;         // ISO date string
  publishedDate?: string;         // ISO date string
}
```

### Utility Types

```typescript
/**
 * Result of local submission calculation
 */
export interface LocalSubmissionCalculation {
  submissions: Submission[];
  remainingSubmissions: number;
  isAtLimit: boolean;
  nextExpiryDate: Date | null;
  publishedCount: number;
  totalSubmitted: number;
}

/**
 * Time breakdown for countdown display
 */
export interface TimeUntilSubmission {
  days: number;
  hours: number;
  minutes: number;
  totalMs: number;
}
```

## Svelte Store Design

### Store Structure

```typescript
// src/lib/stores/submission.ts
import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import type {
  SubmissionState,
  Asset,
  ExternalApiResponse,
  LocalSubmissionCalculation
} from '$lib/types/submission';

// Initial state
const initialState: SubmissionState = {
  remainingSubmissions: 6,
  hasError: false,
  message: '',
  canSubmitNow: true,
  isAtLimit: false,
  publishedTemplates: 0,
  submittedTemplates: 0,
  isWhitelisted: false,
  assetsSubmitted30: 0,
  isLoading: true,
  submissions: [],
  nextExpiryDate: null
};

// Internal stores
const assetsStore = writable<Asset[]>([]);
const submissionState = writable<SubmissionState>(initialState);

// Exported derived stores for component access
export const submissions = derived(submissionState, $s => $s.submissions);
export const remainingSubmissions = derived(submissionState, $s => $s.remainingSubmissions);
export const isAtLimit = derived(submissionState, $s => $s.isAtLimit);
export const canSubmitNow = derived(submissionState, $s => $s.canSubmitNow);
export const nextExpiryDate = derived(submissionState, $s => $s.nextExpiryDate);
export const isLoading = derived(submissionState, $s => $s.isLoading);
```

### Core Functions

```typescript
/**
 * Calculate 30-day rolling window locally from assets
 */
function calculateLocalSubmissions(assets: Asset[]): LocalSubmissionCalculation {
  const now = new Date();
  const thirtyDaysAgo = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - 30,
      0, 0, 0, 0
    )
  );

  const submissions: Submission[] = [];

  for (const asset of assets) {
    // Skip delisted assets (they don't count against limit)
    if (asset.status === 'Delisted') continue;
    if (!asset.submittedDate) continue;

    const submissionDate = new Date(asset.submittedDate);
    const submissionDateUTC = new Date(
      Date.UTC(
        submissionDate.getUTCFullYear(),
        submissionDate.getUTCMonth(),
        submissionDate.getUTCDate(),
        submissionDate.getUTCHours(),
        submissionDate.getUTCMinutes(),
        submissionDate.getUTCSeconds()
      )
    );

    // Only count submissions within 30-day window
    if (submissionDateUTC >= thirtyDaysAgo) {
      submissions.push({
        id: asset.id,
        name: asset.name,
        submittedDate: submissionDateUTC,
        expiryDate: new Date(submissionDateUTC.getTime() + 30 * 24 * 60 * 60 * 1000),
        status: asset.status as TemplateStatus
      });
    }
  }

  // Sort by submission date (oldest first, so first to expire is at index 0)
  submissions.sort((a, b) => a.submittedDate.getTime() - b.submittedDate.getTime());

  const remainingSubmissions = Math.max(0, 6 - submissions.length);
  const publishedCount = assets.filter(a => a.status === 'Published').length;
  const totalSubmitted = assets.filter(a => a.status !== 'Delisted').length;

  return {
    submissions,
    remainingSubmissions,
    isAtLimit: remainingSubmissions <= 0,
    nextExpiryDate: submissions[0]?.expiryDate || null,
    publishedCount,
    totalSubmitted
  };
}

/**
 * Fetch submission status from server proxy
 * Returns null if API fails (fallback to local calculation)
 */
async function fetchExternalStatus(userEmail: string): Promise<ExternalApiResponse | null> {
  // Skip in development (CORS issues with direct calls)
  if (browser && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  )) {
    console.log('[SubmissionStore] Dev mode: Using local calculation');
    return null;
  }

  try {
    const response = await fetch('/api/submissions/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[SubmissionStore] External API failed:', error);
    return null;
  }
}

/**
 * Refresh submission status (main entry point)
 */
async function refreshSubmissionStatus(userEmail?: string): Promise<void> {
  const currentAssets = get(assetsStore);
  const localData = calculateLocalSubmissions(currentAssets);

  submissionState.update(s => ({ ...s, isLoading: true }));

  if (userEmail) {
    const externalData = await fetchExternalStatus(userEmail);

    if (externalData) {
      // Merge external (authoritative) with local (for UI details)
      submissionState.set({
        remainingSubmissions: Math.max(0, 6 - externalData.assetsSubmitted30),
        hasError: externalData.hasError,
        message: externalData.message || '',
        canSubmitNow: !externalData.hasError,
        isAtLimit: externalData.hasError,
        publishedTemplates: externalData.publishedTemplates || localData.publishedCount,
        submittedTemplates: externalData.submittedTemplates || localData.totalSubmitted,
        isWhitelisted: externalData.isWhitelisted || false,
        assetsSubmitted30: externalData.assetsSubmitted30,
        isLoading: false,
        submissions: localData.submissions,  // Keep local for expiry display
        nextExpiryDate: localData.nextExpiryDate
      });
      return;
    }
  }

  // Fallback to local calculation
  submissionState.set({
    remainingSubmissions: localData.remainingSubmissions,
    hasError: false,
    message: '',
    canSubmitNow: !localData.isAtLimit,
    isAtLimit: localData.isAtLimit,
    publishedTemplates: localData.publishedCount,
    submittedTemplates: localData.totalSubmitted,
    isWhitelisted: false,
    assetsSubmitted30: localData.submissions.length,
    isLoading: false,
    submissions: localData.submissions,
    nextExpiryDate: localData.nextExpiryDate
  });
}
```

### Store API

```typescript
/**
 * Exported store with actions
 */
export const submissionStore = {
  subscribe: submissionState.subscribe,

  /**
   * Set assets for local calculation
   */
  setAssets(assets: Asset[]): void {
    assetsStore.set(assets);
    const localData = calculateLocalSubmissions(assets);

    submissionState.update(state => ({
      ...state,
      submissions: localData.submissions,
      nextExpiryDate: localData.nextExpiryDate,
      // Only update counts if we don't have external data yet
      ...(state.isLoading || !state.assetsSubmitted30 ? {
        remainingSubmissions: localData.remainingSubmissions,
        isAtLimit: localData.isAtLimit,
        canSubmitNow: !localData.isAtLimit,
        publishedTemplates: localData.publishedCount,
        submittedTemplates: localData.totalSubmitted,
        assetsSubmitted30: localData.submissions.length
      } : {})
    }));
  },

  /**
   * Refresh from external API
   */
  refresh: refreshSubmissionStatus,

  /**
   * Get next available submission date
   */
  getNextAvailableDate(): Date | null {
    const state = get(submissionState);
    if (!state.isAtLimit) return new Date();
    return state.nextExpiryDate;
  },

  /**
   * Get milliseconds until next submission slot
   */
  getTimeUntilNextSubmission(): number | null {
    const state = get(submissionState);
    if (!state.isAtLimit) return 0;
    if (!state.nextExpiryDate) return null;
    return state.nextExpiryDate.getTime() - Date.now();
  },

  /**
   * Format time until next submission for display
   */
  formatTimeUntil(): TimeUntilSubmission | null {
    const ms = this.getTimeUntilNextSubmission();
    if (ms === null || ms <= 0) return null;

    const totalMinutes = Math.floor(ms / 60000);
    const totalHours = Math.floor(totalMinutes / 60);

    return {
      days: Math.floor(totalHours / 24),
      hours: totalHours % 24,
      minutes: totalMinutes % 60,
      totalMs: ms
    };
  }
};
```

## Date Handling

### UTC Normalization

All dates are normalized to UTC to avoid timezone issues:

```typescript
function toUTCDate(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds()
    )
  );
}

function getThirtyDaysAgo(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - 30,
      0, 0, 0, 0  // Midnight UTC
    )
  );
}
```

### Expiry Calculation

Submissions expire exactly 30 days after submission:

```typescript
function calculateExpiryDate(submissionDate: Date): Date {
  return new Date(submissionDate.getTime() + 30 * 24 * 60 * 60 * 1000);
}
```

## CORS Handling

### Development
- External API call skipped entirely
- Uses local calculation from assets

### Production
- Server-side proxy route calls external API
- No CORS issues (server-to-server)
- Response passed through to client

```typescript
// Detection logic
const isDevelopment = browser && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
);

if (isDevelopment) {
  // Use local calculation only
} else {
  // Try external API, fallback to local
}
```

## File Structure

```
packages/webflow-automation/
  shared/
    types.ts                    # Existing types
    submission-types.ts         # NEW: Submission tracking types
    validators.ts               # Existing validators

packages/space/                 # Or wherever SvelteKit app lives
  src/
    lib/
      stores/
        submission.ts           # Svelte store implementation
      types/
        submission.ts           # Re-export from shared
    routes/
      api/
        submissions/
          status/
            +server.ts          # Proxy endpoint for external API
```

## Migration Notes

### From Next.js to SvelteKit

| Next.js Pattern | SvelteKit Pattern |
|-----------------|-------------------|
| `useState` + `useEffect` | Svelte stores + `$:` reactivity |
| API routes in `/api` | `+server.ts` in routes |
| `process.env` | `import.meta.env` or `platform.env` |
| `useContext` | Svelte context or stores |
| Client-side fetch | Same, or server load functions |

### Key Differences

1. **Reactivity**: Svelte stores are reactive by default
2. **SSR**: SvelteKit has built-in SSR support
3. **Routing**: File-based routing similar to Next.js
4. **State**: No need for React hooks, use stores

## Testing Strategy

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { calculateLocalSubmissions } from './submission';

describe('calculateLocalSubmissions', () => {
  it('counts submissions within 30-day window', () => {
    const assets = [
      { id: '1', name: 'Template 1', status: 'Submitted', submittedDate: new Date().toISOString() },
      { id: '2', name: 'Template 2', status: 'Published', submittedDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString() }
    ];

    const result = calculateLocalSubmissions(assets);

    expect(result.submissions.length).toBe(1);
    expect(result.remainingSubmissions).toBe(5);
  });

  it('excludes delisted templates', () => {
    const assets = [
      { id: '1', name: 'Template 1', status: 'Delisted', submittedDate: new Date().toISOString() }
    ];

    const result = calculateLocalSubmissions(assets);

    expect(result.submissions.length).toBe(0);
  });

  it('calculates correct expiry dates', () => {
    const submittedDate = new Date('2024-01-01T00:00:00Z');
    const assets = [
      { id: '1', name: 'Template 1', status: 'Submitted', submittedDate: submittedDate.toISOString() }
    ];

    const result = calculateLocalSubmissions(assets);

    expect(result.submissions[0].expiryDate.getTime())
      .toBe(submittedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  });
});
```

### Integration Tests

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Submission API Route', () => {
  it('proxies to external API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ assetsSubmitted30: 3, hasError: false })
    });

    // Test the route handler
  });

  it('returns 502 on external API failure', async () => {
    // Test error handling
  });
});
```

## Security Considerations

1. **Email validation**: Validate email format before API calls
2. **Rate limiting**: Consider adding rate limiting to proxy route
3. **Error exposure**: Don't expose internal errors to client
4. **Input sanitization**: Sanitize all inputs before use

## Performance Considerations

1. **Caching**: Consider caching API responses (5 min TTL)
2. **Debouncing**: Debounce rapid refresh calls
3. **Lazy loading**: Don't fetch until needed
4. **Optimistic updates**: Show local calculation while API loads

## Related Documents

- [Webflow Validation Worker](../../../io/workers/webflow-validation/README.md) - Server-side validation logic
- [Error Handling Patterns](../../../.claude/rules/error-handling-patterns.md) - Standard error patterns
- [SvelteKit Conventions](../../../.claude/rules/sveltekit-conventions.md) - SvelteKit patterns

## Subtractive Triad

| Level | Principle | Application |
|-------|-----------|-------------|
| **DRY** | Single source of truth | Reuse existing external API; one store, multiple derived values |
| **Rams** | Only what's needed | Minimal state; calculate derived values on demand |
| **Heidegger** | Tool recedes | Store provides simple boolean checks; complexity hidden |
