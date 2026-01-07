# GSAP Validation UI Architecture Design

## Overview

This document outlines the architecture for porting GsapValidationModal.jsx to a fully-featured validation UI system in the Webflow Dashboard. The design balances modal convenience with playground flexibility, while maintaining Canon-compliant aesthetics.

## Existing Implementation Analysis

### Current Components

1. **GsapValidationModal.svelte** - Modal-based validation interface
   - URL input with real-time validation
   - Loading states with spinner animations
   - Results display with pass/fail status
   - Stats grid (pass rate, total pages, passed/failed counts)
   - Issues summary with counts
   - Top 3 recommendations preview
   - Link to playground for full details

2. **/validation/playground/+page.svelte** - Full-page validation playground
   - Comprehensive URL input section
   - Status header with pass/fail badge
   - Stats grid (4 metrics)
   - Tabbed interface (Overview, Pages, Issues, Recommendations)
   - Sortable pages list with expandable details
   - Crawl statistics display

3. **/api/validation/gsap/+server.ts** - Backend endpoint
   - Calls external GSAP validation worker
   - Processes WorkerResponse → ValidationResult
   - Extracts common issues
   - Generates smart recommendations

### Existing Types (validation.ts)

```typescript
// Core result types
ValidationResult
ValidationSummary
ValidationIssues
PageResult
Recommendation

// Worker types
WorkerResponse
WorkerPageResult
FlaggedCode
SecurityRisk

// UI state
TabOption = 'overview' | 'pages' | 'issues' | 'recommendations'
SortOption = 'issues-high' | 'issues-low' | 'name' | 'health'
```

## Design Decision: Modal vs Dedicated Route

### Current Approach (RECOMMENDED)

**Keep both implementations:**
- **Modal**: Quick validation from dashboard/navigation
- **Playground**: Deep-dive analysis with full results

**Rationale:**
1. Modal provides **convenience** - validate without context switch
2. Playground provides **depth** - comprehensive analysis and debugging
3. Natural flow: Modal → "View Full Details" → Playground
4. Follows Canon principle: tool recedes (modal) vs tool reveals (playground)

### Alternative Considered (REJECTED)

**Replace modal with route:**
- Pros: Single implementation, simpler maintenance
- Cons: Loses quick-access validation, forces context switch, breaks existing workflow

## Architecture Components

### 1. Component Hierarchy

```
/validation
├── playground/
│   └── +page.svelte               # Full validation interface
└── +page.svelte                   # Validation tools landing page (optional)

/lib/components/
├── GsapValidationModal.svelte     # Quick validation modal (KEEP)
├── validation/
│   ├── ValidationInput.svelte     # Shared URL input component
│   ├── ValidationResults.svelte   # Results container
│   ├── ValidationStatus.svelte    # Pass/fail header
│   ├── ValidationStats.svelte     # Stats grid
│   ├── ValidationTabs.svelte      # Tab navigation
│   ├── OverviewTab.svelte         # Overview content
│   ├── PagesTab.svelte            # Pages list with expand
│   ├── IssuesTab.svelte           # Issues display
│   └── RecommendationsTab.svelte  # Recommendations list
└── ui/                            # Existing UI primitives (Button, Input, Dialog, Tabs)
```

### 2. Component Responsibilities

#### GsapValidationModal.svelte (EXISTING - ENHANCE)
**Purpose:** Quick validation from dashboard
**Features:**
- URL input with validation
- Loading states
- Compact results preview
- Link to playground

**Enhancements:**
- Add persistent state (localStorage) for last validation
- Add "Open in Playground" button that passes results
- Improve error handling with retry

#### ValidationInput.svelte (NEW - SHARED)
**Purpose:** Reusable URL input component
**Props:**
```typescript
{
  value: string;
  onValidate: (url: string) => Promise<void>;
  isValidating: boolean;
  error?: string;
  placeholder?: string;
  showClear?: boolean;
}
```
**Features:**
- URL format validation
- Webflow domain check (.webflow.io)
- Clear button
- Loading state
- Error display

#### ValidationResults.svelte (NEW - SHARED)
**Purpose:** Results container with intelligent rendering
**Props:**
```typescript
{
  result: ValidationResult;
  mode: 'compact' | 'full';
  onViewDetails?: () => void;
}
```
**Features:**
- Renders different layouts based on mode
- Compact: Summary + top issues + link
- Full: Complete tabbed interface

#### ValidationStatus.svelte (NEW - SHARED)
**Purpose:** Pass/fail header with visual feedback
**Props:**
```typescript
{
  passed: boolean;
  url: string;
  timestamp: string;
}
```
**Canon Compliance:**
- Success: `--color-success-muted` background
- Failure: `--color-error-muted` background
- Status badge with icon (✓/✗)

#### ValidationStats.svelte (NEW - SHARED)
**Purpose:** Stats grid with metric cards
**Props:**
```typescript
{
  summary: ValidationSummary;
  layout: 'grid-4' | 'grid-2' | 'inline';
}
```
**Metrics:**
- Pass Rate (percentage)
- Total Pages
- Passed Pages (success color)
- Failed Pages (error color)

#### ValidationTabs.svelte (NEW)
**Purpose:** Tab navigation for playground
**Props:**
```typescript
{
  result: ValidationResult;
  activeTab: TabOption;
  onTabChange: (tab: TabOption) => void;
}
```
**Features:**
- Tab badges with counts
- Active state styling
- Keyboard navigation (arrow keys)

#### OverviewTab.svelte (NEW)
**Purpose:** High-level summary
**Content:**
- Issue summary card (flagged, security, valid GSAP)
- Common issues list (top 5)
- Crawl statistics

#### PagesTab.svelte (NEW)
**Purpose:** Detailed page-by-page results
**Features:**
- Sort controls (issues high/low, name, health)
- Expandable page items
- Pass/fail indicators
- Metrics badges (flagged, security, valid)
- Code preview in expanded state

#### IssuesTab.svelte (NEW)
**Purpose:** Consolidated issues view
**Features:**
- Grouped by page
- Filterable by type (flagged, security)
- Code snippets with syntax highlighting
- Link to page

#### RecommendationsTab.svelte (NEW)
**Purpose:** Actionable improvement suggestions
**Features:**
- Priority sorting
- Type-based styling (critical/warning/success)
- Required badge
- Expandable details

### 3. State Management

#### Local State (per component)

```typescript
// GsapValidationModal.svelte
let url = $state('');
let isValidating = $state(false);
let result = $state<ValidationResult | null>(null);
let error = $state<string | null>(null);

// playground/+page.svelte
let url = $state('');
let isValidating = $state(false);
let result = $state<ValidationResult | null>(null);
let error = $state<string | null>(null);
let activeTab = $state<TabOption>('overview');
let sortOption = $state<SortOption>('issues-high');
let expandedPages = $state<Set<string>>(new Set());
```

#### Shared State (optional - localStorage)

```typescript
// lib/stores/validation.ts
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

interface ValidationCache {
  lastUrl?: string;
  lastResult?: ValidationResult;
  timestamp?: string;
}

function createValidationStore() {
  const stored = browser
    ? JSON.parse(localStorage.getItem('validation-cache') || '{}')
    : {};

  const store = writable<ValidationCache>(stored);

  store.subscribe(value => {
    if (browser) {
      localStorage.setItem('validation-cache', JSON.stringify(value));
    }
  });

  return {
    ...store,
    setResult: (url: string, result: ValidationResult) => {
      store.set({
        lastUrl: url,
        lastResult: result,
        timestamp: new Date().toISOString()
      });
    },
    clear: () => store.set({})
  };
}

export const validationCache = createValidationStore();
```

### 4. API Integration

#### Endpoint: /api/validation/gsap (EXISTING - MAINTAIN)

**Request:**
```typescript
POST /api/validation/gsap
{
  url: string;
}
```

**Response:**
```typescript
ValidationResult {
  url: string;
  success: boolean;
  passed: boolean;
  timestamp: string;
  summary: ValidationSummary;
  issues: ValidationIssues;
  pageResults: PageResult[];
  crawlStats?: CrawlStats;
  recommendations: Recommendation[];
}
```

**Error Handling:**
- 400: Invalid URL format
- 401: Unauthorized (requires login)
- 429: Rate limiting
- 500: Worker error
- 503: Worker unavailable

**Loading States:**
1. Initial: "Validating..."
2. Crawling: "Analyzing template..." (worker-side)
3. Complete: Show results
4. Error: Show error message with retry

### 5. Routing Strategy

#### Current Routes
- `/validation` - Validation tools landing (optional)
- `/validation/playground` - Full validation interface

#### Proposed Routes (KEEP EXISTING)
- `/validation` - Landing page with:
  - Quick validation card (embedded modal form)
  - Recent validations list
  - Documentation links
- `/validation/playground` - Full interface (EXISTING)

#### Navigation Flow
```
Dashboard → "Validate" (modal)
  ↓
GsapValidationModal opens
  ↓
Enter URL → Validate
  ↓
Show compact results
  ↓
"View Full Details" → /validation/playground?url=...
  ↓
Full playground with all tabs
```

### 6. Error Handling

#### Input Validation
```typescript
function validateUrl(url: string): { valid: boolean; error?: string } {
  if (!url.trim()) {
    return { valid: false, error: 'URL is required' };
  }

  if (!url.startsWith('https://')) {
    return { valid: false, error: 'URL must use HTTPS' };
  }

  if (!url.includes('.webflow.io')) {
    return { valid: false, error: 'Must be a Webflow site (*.webflow.io)' };
  }

  try {
    new URL(url);
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}
```

#### API Error Handling
```typescript
async function handleValidation() {
  const validation = validateUrl(url);
  if (!validation.valid) {
    error = validation.error;
    return;
  }

  isValidating = true;
  error = null;

  try {
    const response = await fetch('/api/validation/gsap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.trim() })
    });

    if (!response.ok) {
      const data = await response.json();

      // Specific error handling
      if (response.status === 429) {
        error = 'Too many requests. Please wait before trying again.';
      } else if (response.status === 503) {
        error = 'Validation service temporarily unavailable. Please try again.';
      } else {
        error = data.message || 'Validation failed';
      }

      return;
    }

    result = await response.json();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Network error occurred';
  } finally {
    isValidating = false;
  }
}
```

### 7. Loading States

#### Spinner Component (EXISTING - REUSE)
```svelte
<svg class="spinner" viewBox="0 0 24 24" fill="none">
  <circle
    cx="12" cy="12" r="10"
    stroke="currentColor"
    stroke-width="4"
    opacity="0.25"
  />
  <path
    fill="currentColor"
    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
  />
</svg>

<style>
  .spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
```

#### Loading States Progression
1. **Button Loading**: Spinner + "Validating..."
2. **Progress Card**: Large spinner + "Analyzing template..."
3. **Results**: Show content, hide loading

### 8. Accessibility

#### Keyboard Navigation
- Tab through inputs/buttons
- Enter to submit form
- Escape to close modal
- Arrow keys for tab navigation

#### ARIA Labels
```svelte
<form
  onsubmit={handleValidate}
  role="search"
  aria-label="GSAP Validation"
>
  <label for="validation-url">
    Webflow Site URL
  </label>
  <input
    id="validation-url"
    type="url"
    aria-describedby="url-hint url-error"
    aria-invalid={!!error}
  />
  <div id="url-hint" class="sr-only">
    Enter a Webflow site URL ending in .webflow.io
  </div>
  {#if error}
    <div id="url-error" role="alert">
      {error}
    </div>
  {/if}
</form>
```

#### Focus Management
- Modal opens → focus URL input
- Validation completes → focus "View Results" button
- Modal closes → return focus to trigger button

### 9. Performance Optimizations

#### Derived State
```typescript
// Expensive computations
const sortedPages = $derived(() => {
  if (!result?.pageResults) return [];
  const pages = [...result.pageResults];

  switch (sortOption) {
    case 'issues-high':
      return pages.sort((a, b) => b.flaggedCodeCount - a.flaggedCodeCount);
    case 'issues-low':
      return pages.sort((a, b) => a.flaggedCodeCount - b.flaggedCodeCount);
    case 'name':
      return pages.sort((a, b) => a.url.localeCompare(b.url));
    case 'health':
      return pages.sort((a, b) => (a.passed === b.passed ? 0 : a.passed ? -1 : 1));
    default:
      return pages;
  }
});
```

#### Lazy Loading
- Expand page details on demand (already implemented)
- Load code snippets only when expanded
- Pagination for large page lists (future enhancement)

#### Debouncing
```typescript
import { debounce } from '$lib/utils';

const debouncedSearch = debounce((value: string) => {
  // Search/filter logic
}, 300);
```

### 10. Canon Compliance

#### Color Tokens
```css
/* Status colors */
--color-success / --color-success-muted / --color-success-border
--color-error / --color-error-muted / --color-error-border
--color-warning / --color-warning-muted / --color-warning-border
--color-info / --color-info-muted / --color-info-border

/* Structure */
--color-bg-pure / --color-bg-elevated / --color-bg-surface / --color-bg-subtle
--color-fg-primary / --color-fg-secondary / --color-fg-tertiary / --color-fg-muted
--color-border-default / --color-border-emphasis

/* Interactive */
--color-hover / --color-active / --color-focus
```

#### Spacing Tokens
```css
--space-xs: 0.5rem
--space-sm: 1rem
--space-md: 1.618rem  /* Golden ratio */
--space-lg: 2.618rem
--space-xl: 4.236rem
```

#### Motion Tokens
```css
--duration-micro: 200ms    /* Hover states, toggles */
--duration-standard: 300ms /* Transitions, modals */
--ease-standard: cubic-bezier(0.4, 0.0, 0.2, 1)
```

#### Typography Tokens
```css
--text-caption: 0.75rem
--text-body-sm: 0.875rem
--text-body: 1rem
--text-body-lg: 1.125rem
--text-h3: clamp(1.25rem, 1.5vw + 0.5rem, 1.75rem)
--text-h2: clamp(1.5rem, 2vw + 0.75rem, 2.25rem)
--text-h1: clamp(2rem, 3vw + 1rem, 3.5rem)
```

#### Design Patterns
- **Tailwind for structure**: `flex`, `grid`, `items-center`, `gap-4`
- **Canon for aesthetics**: Colors, spacing, typography via tokens
- **No decoration**: Functional minimalism, no gradients/shadows for effect

## Implementation Plan

### Phase 1: Refactor Shared Components (Week 1)
1. Create `ValidationInput.svelte`
2. Create `ValidationStatus.svelte`
3. Create `ValidationStats.svelte`
4. Update `GsapValidationModal.svelte` to use shared components

### Phase 2: Tab Components (Week 2)
1. Create `ValidationTabs.svelte`
2. Create `OverviewTab.svelte`
3. Create `PagesTab.svelte`
4. Create `IssuesTab.svelte`
5. Create `RecommendationsTab.svelte`

### Phase 3: Playground Enhancement (Week 3)
1. Update `/validation/playground` to use new tab components
2. Add localStorage caching
3. Add URL parameter support (`?url=...`)
4. Add "Open in Playground" from modal

### Phase 4: Polish & Testing (Week 4)
1. Add loading skeleton states
2. Add empty states
3. Add error recovery (retry button)
4. Add accessibility audit
5. Add responsive design refinements

## Testing Strategy

### Unit Tests
- ValidationInput validation logic
- Stats calculations
- Sort/filter functions
- URL parameter parsing

### Integration Tests
- Modal → Playground flow
- API error handling
- Loading states
- Accessibility (a11y)

### E2E Tests
- Complete validation flow
- Tab navigation
- Page expand/collapse
- Sort and filter operations

## Migration Path

### Option A: Big Bang (NOT RECOMMENDED)
- Replace all at once
- Risk: Breaking existing functionality
- Timeline: 4 weeks

### Option B: Incremental (RECOMMENDED)
1. Create shared components (no breaking changes)
2. Update modal to use shared components (backward compatible)
3. Enhance playground with new tabs (additive)
4. Deprecate old components gradually

## Open Questions

1. **Pagination**: Do we need pagination for 50+ pages?
   - Decision: Not yet - expand on demand is sufficient

2. **Export Results**: Should users export validation reports?
   - Decision: Future enhancement - JSON/PDF export

3. **History**: Should we show validation history?
   - Decision: Phase 5 - validation history table

4. **Real-time**: Should validation poll for progress?
   - Decision: Not yet - worker is fast enough (~5-10s)

## Success Metrics

- Modal load time < 200ms
- Validation response < 10s (worker-dependent)
- Playground interactive < 300ms
- 0 accessibility violations (WCAG AA)
- Mobile responsive down to 360px width

## Conclusion

This architecture maintains the existing dual-interface approach (modal + playground) while introducing shared components for consistency and maintainability. The design follows Canon principles (Tailwind for structure, tokens for aesthetics) and provides a clear implementation path.

**Key Design Decisions:**
1. Keep modal + playground (don't merge)
2. Create shared validation components
3. Use localStorage for caching
4. Incremental migration (no breaking changes)
5. Canon-compliant styling throughout

**Next Steps:**
1. Review and approve architecture
2. Create Beads issues for each phase
3. Begin Phase 1: Shared components
