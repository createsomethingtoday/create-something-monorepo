# Phase 1 Implementation Plan
## Critical Features for Production Deployment

**Status**: 🔵 Ready for Implementation
**Timeline**: 11 days (3 weeks with buffer)
**Target**: Production-ready webflow-dashboard
**Last Updated**: January 7, 2026

---

## Executive Summary

This document provides detailed task breakdowns, dependencies, testing strategies, and acceptance criteria for Phase 1 critical features that must be completed before production deployment.

### Current State Assessment

**✅ Already Implemented**:
- Submission tracking store (`src/lib/stores/submission.ts`)
- SubmissionTracker component (both compact and full variants)
- GSAP validation API endpoint (`/api/validation/gsap`)
- Basic upload system (single thumbnail only)
- Authentication and CRUD operations

**❌ Missing (Blocks Production)**:
1. Submission Tracking UI integration gaps
2. GSAP Validation UI (modal and results display)
3. Multi-image upload (carousel + secondary thumbnails)

### Phase 1 Features

| Feature | Effort | Status | Priority | Blocks Production? |
|---------|--------|--------|----------|-------------------|
| **1.1 Submission Tracking System** | 5 days | ⬜ Not Started | P0 | ✅ YES |
| **1.2 GSAP Validation UI** | 3 days | ⬜ Not Started | P0 | ✅ YES |
| **1.3 Multi-Image Upload** | 3 days | ⬜ Not Started | P1 | ⚠️ Degrades UX |

**Total**: 11 days development + 2-3 days testing/integration = ~3 weeks

---

## Feature 1.1: Submission Tracking System

**Priority**: P0 (Drop Everything)
**Effort**: 5 days
**Complexity**: Standard
**Status**: ⬜ Not Started

### Context

**What Already Exists**:
- ✅ `src/lib/stores/submission.ts` - Complete submission tracking logic
- ✅ `src/lib/components/SubmissionTracker.svelte` - Full UI component (499 lines)
- ✅ External API integration with `https://check-asset-name.vercel.app`
- ✅ Local calculation fallback with UTC timestamp handling
- ✅ 30-day rolling window logic

**What's Missing**:
- Dashboard integration (component not used in main views)
- Error state handling improvements
- Loading state UI polish
- Testing coverage
- Documentation

### Task Breakdown

#### Day 1: Dashboard Integration (4 hours)

**Tasks**:
1. Add SubmissionTracker to dashboard home page (`src/routes/(authenticated)/+page.svelte`)
2. Pass user email from session to component
3. Add compact variant to header/navigation bar
4. Verify data flows correctly from Airtable assets

**Files to Modify**:
- `src/routes/(authenticated)/+page.svelte` - Add full variant tracker
- `src/routes/(authenticated)/+layout.svelte` - Add compact variant to header

**Testing**:
- [ ] Component renders with correct data
- [ ] External API called when user email present
- [ ] Local fallback works when API unavailable
- [ ] Compact and full variants both display correctly

**Acceptance Criteria**:
- [ ] Users see submission status on dashboard home
- [ ] Compact tracker in header shows at-a-glance status
- [ ] Both variants update reactively when assets change

---

#### Day 2: Error State Enhancement (4 hours)

**Tasks**:
1. Add retry mechanism for failed external API calls
2. Improve error messaging for different failure scenarios
3. Add toast notifications for API failures
4. Add "Refresh Status" button when errors occur

**Files to Modify**:
- `src/lib/stores/submission.ts` - Add retry logic
- `src/lib/components/SubmissionTracker.svelte` - Add error UI states

**Error Scenarios to Handle**:
| Scenario | Current Behavior | Enhanced Behavior |
|----------|-----------------|-------------------|
| External API timeout | Silent fallback | Show toast, offer retry |
| Network error | Silent fallback | Show warning banner |
| Invalid API response | Silent fallback | Show error details |
| CORS error (dev mode) | Console log | Clear dev mode indicator |

**Testing**:
- [ ] Simulate API timeout (mock fetch with delay)
- [ ] Test with network disconnected
- [ ] Verify retry mechanism works (3 attempts max)
- [ ] Check toast notifications display correctly

**Acceptance Criteria**:
- [ ] Users informed when external API unavailable
- [ ] Retry button allows manual refresh attempts
- [ ] Error messages are user-friendly and actionable
- [ ] Dev mode clearly indicates external API skipped

---

#### Day 3: Loading States & Polish (4 hours)

**Tasks**:
1. Add skeleton loading state while fetching data
2. Implement smooth transitions between loading/loaded states
3. Add progress indicators for external API calls
4. Optimize component performance (memoization if needed)

**Files to Modify**:
- `src/lib/components/SubmissionTracker.svelte` - Add loading skeletons
- May need new `SkeletonCard.svelte` component

**Loading States**:
| State | UI Treatment |
|-------|-------------|
| Initial load | Skeleton cards with pulse animation |
| External API pending | Progress spinner + "Checking status..." |
| Fallback calculation | Instant display (no loading) |
| Refresh triggered | Subtle spinner in corner |

**Testing**:
- [ ] Loading states display for appropriate duration
- [ ] Transitions are smooth (no flash of content)
- [ ] Performance: Component renders in <100ms
- [ ] No layout shift during loading→loaded transition

**Acceptance Criteria**:
- [ ] Loading experience feels professional and polished
- [ ] No jarring transitions or layout shifts
- [ ] Users understand when data is being fetched
- [ ] Fast perceived performance

---

#### Day 4: Testing & Edge Cases (6 hours)

**Tasks**:
1. Write unit tests for submission calculation logic
2. Write integration tests for component
3. Test edge cases (0 submissions, exactly 6, whitelist users)
4. Test date boundary conditions (UTC vs local time)

**Test Coverage**:

**Unit Tests** (`submission.test.ts`):
```typescript
describe('Submission Store', () => {
  test('calculates remaining submissions correctly', () => {
    // Test with 0-6 submissions
  });

  test('handles 30-day rolling window with UTC', () => {
    // Test date boundaries
  });

  test('identifies next expiry date correctly', () => {
    // Test expiry calculation
  });

  test('handles whitelist users correctly', () => {
    // Test unlimited submission case
  });
});
```

**Integration Tests** (`SubmissionTracker.test.ts`):
```typescript
describe('SubmissionTracker Component', () => {
  test('renders compact variant correctly', () => {
    // Test compact UI
  });

  test('renders full variant correctly', () => {
    // Test full card UI
  });

  test('updates when assets change', () => {
    // Test reactivity
  });

  test('handles external API failure gracefully', () => {
    // Test error states
  });
});
```

**Edge Cases to Test**:
| Case | Expected Behavior |
|------|------------------|
| 0 submissions | Shows 6/6 available, no timeline |
| Exactly 6 submissions | Shows "Limit Reached", next expiry date |
| Whitelist user | Shows "Unlimited" badge |
| Date at UTC midnight boundary | Calculates correctly in user timezone |
| Assets with no `submittedDate` | Skipped, no error |
| Delisted templates | Not counted in 30-day window |

**Testing**:
- [ ] All unit tests pass (>90% coverage)
- [ ] All integration tests pass
- [ ] Manual testing of edge cases complete
- [ ] Cross-browser testing (Chrome, Firefox, Safari)

**Acceptance Criteria**:
- [ ] Test coverage >90% for submission logic
- [ ] All edge cases handled gracefully
- [ ] No console errors in any scenario
- [ ] Works correctly in all major browsers

---

#### Day 5: Documentation & Handoff (3 hours)

**Tasks**:
1. Document component API (props, events, slots)
2. Document store API (methods, derived stores)
3. Add JSDoc comments to public APIs
4. Create usage examples in README

**Documentation Structure**:

**README Section** (add to `packages/webflow-dashboard/README.md`):
```markdown
## Submission Tracking

### SubmissionTracker Component

Displays user's current submission status with 30-day rolling window calculation.

**Props**:
- `assets: Asset[]` - User's template assets
- `variant?: 'default' | 'compact'` - Display variant (default: 'default')
- `userEmail?: string` - Optional user email for external API check

**Variants**:
- **default**: Full card with timeline and stats
- **compact**: Header badge with tooltip

**Usage**:
\```svelte
<script>
  import { SubmissionTracker } from '$lib/components';
  export let data;
</script>

<SubmissionTracker
  assets={data.assets}
  userEmail={data.user.email}
/>
\```

### Submission Store API

**Methods**:
- `setAssets(assets: Asset[])` - Update assets for calculation
- `refresh(userEmail?: string)` - Refresh from external API
- `getNextAvailableDate()` - Get date when next submission slot available
- `getTimeUntilNextSubmission()` - Get milliseconds until next slot

**Derived Stores**:
- `submissions` - Array of current submissions in window
- `remainingSubmissions` - Number of slots available
- `isAtLimit` - Boolean: user at 6-submission limit
- `canSubmitNow` - Boolean: user can submit now
- `nextExpiryDate` - Date when oldest submission expires
- `isLoading` - Boolean: external API call in progress
```

**Files to Create/Modify**:
- `packages/webflow-dashboard/README.md` - Add submission tracking section
- `src/lib/stores/submission.ts` - Add JSDoc comments
- `src/lib/components/SubmissionTracker.svelte` - Add JSDoc

**Testing**:
- [ ] Documentation is clear and accurate
- [ ] Code examples work when copied
- [ ] JSDoc comments display in IDE tooltips

**Acceptance Criteria**:
- [ ] Component usage is documented with examples
- [ ] Store API is documented with method signatures
- [ ] Future developers can integrate without asking questions

---

### Dependencies

**Blocks**:
- Multi-Image Upload (uses same asset data structure)

**Blocked By**:
- None (all required infrastructure exists)

**External Dependencies**:
- ✅ Airtable API (already integrated)
- ✅ External validation API (already integrated)
- ✅ Session management (already working)

---

### Testing Strategy

**Unit Tests** (Day 4):
- Submission calculation logic
- Date handling (UTC conversion)
- Edge cases (0, 6, whitelist)

**Integration Tests** (Day 4):
- Component rendering both variants
- Store updates triggering UI updates
- External API integration
- Error handling flows

**Manual Testing** (Day 5):
- Visual QA of both variants
- Cross-browser compatibility
- Mobile responsive behavior
- Error state scenarios

**Performance Testing**:
- Component renders in <100ms
- No performance regression with 50+ assets
- Memory: No leaks after repeated mount/unmount

---

### Acceptance Criteria

#### Functional Requirements
- [ ] Users see current submission count (X of 6)
- [ ] 30-day rolling window calculates correctly with UTC timestamps
- [ ] Template expiry dates display accurately
- [ ] "Next available submission" date shows when limit hit
- [ ] Whitelist users see unlimited status indicator
- [ ] Error states handle API failures gracefully
- [ ] Loading states show during external API calls

#### Technical Requirements
- [ ] Test coverage >90% for submission logic
- [ ] No TypeScript errors
- [ ] Canon-compliant styling (no hardcoded colors)
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Accessible (ARIA labels, keyboard navigation)

#### User Experience Requirements
- [ ] Loading feels instant (<100ms perceived)
- [ ] Error messages are clear and actionable
- [ ] Visual feedback for all interactions
- [ ] No layout shifts or flashing content

---

### Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| External API downtime | Medium | High | Local fallback always available |
| UTC date boundary bugs | Low | Medium | Comprehensive date tests |
| Performance issues with many assets | Low | Medium | Memoization + pagination |
| CORS issues in development | High | Low | Dev mode detection already implemented |

---

## Feature 1.2: GSAP Validation UI

**Priority**: P0 (Blocks Compliance Workflow)
**Effort**: 3 days
**Complexity**: Standard
**Status**: ⬜ Not Started

### Context

**What Already Exists**:
- ✅ `/api/validation/gsap` endpoint fully functional
- ✅ Worker integration with `gsap-validation-worker.createsomething.workers.dev`
- ✅ TypeScript types in `src/lib/types/validation.ts`
- ✅ Result processing and recommendation generation

**What's Missing**:
- **Entire UI layer** for displaying validation results
- Modal component for validation flow
- Tabbed results display
- Issue detail views
- Recommendations panel

### Task Breakdown

#### Day 1: Modal Component & Overview Tab (6 hours)

**Tasks**:
1. Create `GsapValidationModal.svelte` base component
2. Implement modal trigger from asset details view
3. Build Overview tab with summary metrics
4. Add loading state during validation

**Component Structure**:
```typescript
// GsapValidationModal.svelte
interface Props {
  assetUrl: string;
  onClose: () => void;
  initialTab?: 'overview' | 'pages' | 'issues' | 'recommendations';
}
```

**Overview Tab Content**:
- Pass/Fail status badge (large, prominent)
- Summary metrics card:
  - Total pages analyzed
  - Pages passed/failed
  - Pass rate percentage
  - Total flagged code instances
  - Security risks detected
- Quick action buttons: "View Details", "Copy Report"

**Files to Create**:
- `src/lib/components/GsapValidationModal.svelte` - Main modal
- `src/lib/components/validation/OverviewTab.svelte` - Overview content
- `src/lib/components/validation/ValidationSummaryCard.svelte` - Metrics display

**Files to Modify**:
- `src/routes/(authenticated)/assets/[id]/+page.svelte` - Add "Validate GSAP" button

**Testing**:
- [ ] Modal opens/closes smoothly
- [ ] Loading state displays during API call
- [ ] Summary metrics calculate correctly
- [ ] Pass/fail status shows correct variant

**Acceptance Criteria**:
- [ ] Modal opens from asset details "Validate GSAP" button
- [ ] Validation runs against user's template URL
- [ ] Loading state shows progress indicator
- [ ] Overview tab displays summary metrics clearly

---

#### Day 2: Pages & Issues Tabs (6 hours)

**Tasks**:
1. Build Pages tab with per-page results table
2. Build Issues tab with detailed error list
3. Implement collapsible issue sections
4. Add "copy to clipboard" for debugging

**Pages Tab Content**:
- Table with columns:
  - Page URL
  - Status (passed/failed badge)
  - Flagged code count
  - Security risks count
  - Valid GSAP count
  - "View Details" expand button
- Expandable row showing page-specific issues

**Issues Tab Content**:
- Grouped by issue type
- Each issue section shows:
  - Issue description
  - Occurrence count
  - Affected pages list
  - Code preview (first 100 chars)
  - "Show full code" expand button
- Search/filter input at top

**Files to Create**:
- `src/lib/components/validation/PagesTab.svelte` - Per-page results
- `src/lib/components/validation/IssuesTab.svelte` - Detailed issues list
- `src/lib/components/validation/PageResultRow.svelte` - Expandable table row
- `src/lib/components/validation/IssueSection.svelte` - Collapsible issue group

**Testing**:
- [ ] Pages table displays all analyzed pages
- [ ] Expand/collapse works for page details
- [ ] Issues grouped by type correctly
- [ ] Code preview shows without breaking layout
- [ ] Copy to clipboard works

**Acceptance Criteria**:
- [ ] Pages tab shows all analyzed pages with status
- [ ] Issues tab groups similar issues together
- [ ] Collapsible sections work smoothly
- [ ] Code preview helps debugging without overwhelming UI

---

#### Day 3: Recommendations Tab & Polish (6 hours)

**Tasks**:
1. Build Recommendations tab with actionable suggestions
2. Add export functionality (JSON/text report)
3. Implement error handling for API failures
4. Add keyboard shortcuts (ESC to close, tab navigation)
5. Polish transitions and animations

**Recommendations Tab Content**:
- Priority-sorted list of recommendations
- Each recommendation shows:
  - Type badge (critical/warning/success)
  - Title
  - Description
  - Action steps
  - "Required for submission" indicator
- "Export Report" button (downloads JSON + text summary)

**Export Formats**:
- **JSON**: Full validation result object
- **Text**: Human-readable summary with issue list

**Keyboard Shortcuts**:
| Key | Action |
|-----|--------|
| `Escape` | Close modal |
| `Tab` | Navigate tabs |
| `Ctrl+C` (on issue) | Copy issue to clipboard |
| `Ctrl+S` | Save/export report |

**Files to Create**:
- `src/lib/components/validation/RecommendationsTab.svelte` - Recommendations display
- `src/lib/components/validation/RecommendationCard.svelte` - Single recommendation
- `src/lib/utils/export-validation.ts` - Export logic

**Testing**:
- [ ] Recommendations sort by priority correctly
- [ ] Export generates valid JSON
- [ ] Export text is readable and complete
- [ ] Keyboard shortcuts work
- [ ] Transitions are smooth (Canon timing)

**Acceptance Criteria**:
- [ ] Recommendations provide actionable next steps
- [ ] Export functionality works for both formats
- [ ] Modal is keyboard accessible
- [ ] Animations follow Canon timing tokens
- [ ] Error states handle API failures gracefully

---

### Dependencies

**Blocks**:
- None (standalone feature)

**Blocked By**:
- None (API already exists)

**External Dependencies**:
- ✅ GSAP validation worker (already deployed)
- ✅ Validation types (already defined)

---

### Testing Strategy

**Component Tests**:
```typescript
describe('GsapValidationModal', () => {
  test('renders all tabs correctly', () => {});
  test('calls validation API on open', () => {});
  test('handles API errors gracefully', () => {});
  test('exports report in both formats', () => {});
  test('keyboard shortcuts work', () => {});
});

describe('Validation Tabs', () => {
  test('OverviewTab displays summary metrics', () => {});
  test('PagesTab shows per-page results', () => {});
  test('IssuesTab groups issues by type', () => {});
  test('RecommendationsTab sorts by priority', () => {});
});
```

**Manual Testing Scenarios**:
1. Validate template with 0 issues → success state
2. Validate template with flagged code → issue details display
3. Validate template with security risks → critical warnings
4. Test with slow API response → loading state
5. Test with API failure → error handling
6. Test export → both formats valid

**Performance**:
- Modal renders in <200ms
- Tab switching instant (<50ms)
- Large validation results (50+ pages) don't lag

---

### Acceptance Criteria

#### Functional Requirements
- [ ] Modal opens from asset details view
- [ ] Validation runs against user's template URL
- [ ] Results display in 4 organized tabs (Overview, Pages, Issues, Recommendations)
- [ ] Issues show file paths and code previews
- [ ] Recommendations are actionable and specific
- [ ] Export works for JSON and text formats

#### Technical Requirements
- [ ] Loading state shows during validation
- [ ] Error states handle API failures gracefully
- [ ] All tabs tested with unit tests
- [ ] Canon-compliant styling
- [ ] Keyboard accessible (ARIA labels, focus management)

#### User Experience Requirements
- [ ] Modal feels responsive and polished
- [ ] Tabs organize information clearly
- [ ] Code previews help debugging
- [ ] Recommendations provide clear next steps

---

### Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Worker downtime | Low | High | Show clear error, allow retry |
| Large validation results slow UI | Medium | Medium | Pagination + virtualization |
| Complex issue grouping logic | Low | Low | Start simple, iterate based on feedback |

---

## Feature 1.3: Multi-Image Upload System

**Priority**: P1 (Degrades User Experience)
**Effort**: 3 days
**Complexity**: Standard
**Status**: ⬜ Not Started

### Context

**What Already Exists**:
- ✅ Single thumbnail upload working
- ✅ R2 bucket integration (`UPLOADS` binding)
- ✅ Upload validation utils (`src/lib/utils/upload-validation.ts`)
- ✅ WebP validation, aspect ratio checks, size limits

**What's Missing**:
- Carousel image uploader (3-6 images)
- Secondary thumbnail uploader (1-2 images)
- Multi-file upload API endpoint
- Image deletion functionality
- R2 cleanup for orphaned images

### Task Breakdown

#### Day 1: Carousel Uploader Component (6 hours)

**Tasks**:
1. Create `CarouselUploader.svelte` component
2. Implement drag-and-drop multi-file selection
3. Build preview gallery with reordering
4. Add individual image delete buttons

**Component Features**:
- Drag-and-drop zone for multiple files
- File validation before upload (WebP, size, aspect ratio)
- Preview grid (3-6 images)
- Drag handles for reordering
- Delete button per image
- Upload progress indicators per image

**Component Structure**:
```typescript
// CarouselUploader.svelte
interface Props {
  assetId: string;
  existingImages?: string[]; // R2 URLs
  maxImages?: number; // default: 6
  minImages?: number; // default: 3
  onUploadComplete: (urls: string[]) => void;
}
```

**Validation Rules** (inherit from existing upload-validation.ts):
- Format: WebP only
- Size: <10MB per image
- Aspect ratio: 150:199 (same as thumbnail)
- Minimum: 3 images
- Maximum: 6 images

**Files to Create**:
- `src/lib/components/CarouselUploader.svelte` - Main component
- `src/lib/components/upload/ImagePreviewCard.svelte` - Single preview
- `src/lib/components/upload/DropZone.svelte` - Drag-and-drop area

**Files to Modify**:
- `src/routes/(authenticated)/assets/[id]/+page.svelte` - Add carousel section

**Testing**:
- [ ] Drag-and-drop works for multiple files
- [ ] File validation rejects invalid formats
- [ ] Reordering updates state correctly
- [ ] Delete removes image from preview
- [ ] Can't upload <3 or >6 images

**Acceptance Criteria**:
- [ ] Users can upload 3-6 carousel images
- [ ] Drag-and-drop works smoothly
- [ ] Validation provides clear error messages
- [ ] Reordering is intuitive (drag handles visible)

---

#### Day 2: Multi-Upload API & Storage (6 hours)

**Tasks**:
1. Extend `/api/upload` to handle multiple files
2. Add image metadata tracking in Airtable
3. Create `/api/assets/[id]/images/[imageId]` DELETE endpoint
4. Store image order in asset record

**API Design**:

**POST `/api/upload`** (extend existing):
```typescript
// Request: FormData with multiple files
// - file1, file2, ..., file6
// - assetId
// - imageType: 'carousel' | 'secondary' | 'thumbnail'

// Response:
{
  success: true,
  urls: string[], // R2 URLs in order
  metadata: { filename, size, uploadedAt }[]
}
```

**DELETE `/api/assets/[id]/images/[imageId]`**:
```typescript
// Delete from R2 and update Airtable record
// Response: { success: true }
```

**Airtable Schema Update**:
```typescript
// Asset record fields (already exists, extend)
{
  thumbnailUrl: string; // existing
  carouselImages: string[]; // NEW: ordered array of R2 URLs
  secondaryThumbnails: string[]; // NEW: 1-2 additional URLs
}
```

**R2 Path Structure**:
```
uploads/
  {userId}/
    {assetId}/
      thumbnail.webp         # Primary thumbnail
      carousel-1.webp        # Carousel image 1
      carousel-2.webp        # Carousel image 2
      ...
      secondary-1.webp       # Secondary thumbnail 1
      secondary-2.webp       # Optional secondary 2
```

**Files to Create**:
- `src/routes/api/upload/multi/+server.ts` - Multi-file upload endpoint
- `src/routes/api/assets/[id]/images/[imageId]/+server.ts` - Delete endpoint

**Files to Modify**:
- `src/lib/server/airtable.ts` - Add carousel image fields to Asset type
- `src/lib/server/r2.ts` - Add bulk upload helper

**Testing**:
- [ ] Multi-file upload succeeds
- [ ] Images stored in correct R2 paths
- [ ] Airtable record updates with URLs array
- [ ] Delete endpoint removes from R2 and Airtable
- [ ] Parallel uploads don't conflict

**Acceptance Criteria**:
- [ ] Multi-upload API handles 3-6 files
- [ ] Images stored in structured R2 paths
- [ ] Image order persists in Airtable
- [ ] Delete removes image completely

---

#### Day 3: Secondary Thumbnails & Cleanup Cron (6 hours)

**Tasks**:
1. Create `SecondaryThumbnailUploader.svelte` component
2. Add R2 cleanup cron job for orphaned images
3. Update asset details view to show all images
4. Add bulk delete functionality

**Secondary Thumbnail Uploader**:
- Similar to carousel uploader but simpler
- Supports 1-2 images (optional)
- Same validation as primary thumbnail
- Preview shows side-by-side

**R2 Cleanup Cron**:
- Runs daily at midnight UTC
- Identifies orphaned images (R2 file exists, but not in any Airtable record)
- Deletes files older than 7 days (grace period)
- Logs cleanup stats

**Cron Implementation**:
```typescript
// src/routes/api/cron/cleanup-images/+server.ts
export const GET: RequestHandler = async ({ locals, request }) => {
  // Verify cron secret
  const secret = request.headers.get('X-Cron-Secret');
  if (secret !== env.CRON_SECRET) {
    throw error(401, 'Unauthorized');
  }

  // 1. List all R2 objects in uploads/
  // 2. Query all asset records from Airtable
  // 3. Find orphaned images (in R2, not in Airtable)
  // 4. Delete files >7 days old
  // 5. Return stats
};
```

**Files to Create**:
- `src/lib/components/SecondaryThumbnailUploader.svelte` - Secondary uploader
- `src/routes/api/cron/cleanup-images/+server.ts` - Cleanup cron

**Files to Modify**:
- `src/routes/(authenticated)/assets/[id]/+page.svelte` - Show all images
- `wrangler.jsonc` - Add cron trigger schedule

**Wrangler Config**:
```json
{
  "triggers": {
    "crons": [
      "0 0 * * *"  // Daily at midnight UTC
    ]
  }
}
```

**Testing**:
- [ ] Secondary thumbnail upload works
- [ ] Cleanup cron identifies orphaned images
- [ ] Cleanup cron doesn't delete recent uploads
- [ ] Bulk delete removes all carousel images
- [ ] Asset details page shows all images

**Acceptance Criteria**:
- [ ] Secondary thumbnail upload works independently
- [ ] All images validate WebP format, aspect ratio, size limits
- [ ] Uploaded images display in asset preview
- [ ] Image deletion removes from R2 and database
- [ ] Cleanup cron deletes orphaned images after 7 days

---

### Dependencies

**Blocks**:
- None (standalone feature)

**Blocked By**:
- Submission Tracking System (shares Airtable asset structure)

**External Dependencies**:
- ✅ R2 bucket (already configured)
- ✅ Airtable API (already integrated)
- ✅ Upload validation utils (already exist)

---

### Testing Strategy

**Unit Tests**:
```typescript
describe('CarouselUploader', () => {
  test('validates file count (3-6)', () => {});
  test('validates file format (WebP only)', () => {});
  test('reorders images correctly', () => {});
  test('deletes individual images', () => {});
});

describe('Upload API', () => {
  test('handles multiple files', () => {});
  test('stores in correct R2 paths', () => {});
  test('updates Airtable with URLs', () => {});
});

describe('Cleanup Cron', () => {
  test('identifies orphaned images', () => {});
  test('does not delete recent uploads', () => {});
  test('deletes files older than 7 days', () => {});
});
```

**Manual Testing**:
1. Upload 3 carousel images → success
2. Upload 6 carousel images → success
3. Try to upload 2 images → validation error
4. Try to upload 7 images → validation error
5. Reorder carousel images → order persists
6. Delete carousel image → removed everywhere
7. Upload secondary thumbnail → displays correctly
8. Wait 8 days → orphaned images cleaned up

---

### Acceptance Criteria

#### Functional Requirements
- [ ] Users can upload 3-6 carousel images per template
- [ ] Carousel images can be reordered via drag-and-drop
- [ ] Secondary thumbnail upload works independently
- [ ] All images validate WebP format, aspect ratio, size limits
- [ ] Uploaded images display in asset preview
- [ ] Image deletion removes from R2 and database
- [ ] Cleanup cron deletes orphaned images after 7 days

#### Technical Requirements
- [ ] Multi-upload API handles parallel requests
- [ ] R2 paths structured and predictable
- [ ] Airtable updates atomic (no partial state)
- [ ] Cron job is idempotent (safe to retry)

#### User Experience Requirements
- [ ] Upload progress visible per image
- [ ] Drag-and-drop feels responsive
- [ ] Validation errors are clear
- [ ] Delete confirmation prevents accidents

---

### Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Parallel uploads corrupt data | Low | High | Use atomic Airtable updates |
| R2 cleanup deletes wrong files | Low | Critical | 7-day grace period + thorough testing |
| Large images slow upload | Medium | Medium | Show progress, validate size |

---

## Cross-Feature Dependencies

```
┌─────────────────────────────────────────────┐
│         Submission Tracking (Day 1-5)       │
│  ✅ Already has store & component           │
└──────────────────┬──────────────────────────┘
                   │ (Shares Airtable schema)
                   ▼
┌─────────────────────────────────────────────┐
│       Multi-Image Upload (Day 1-3)          │
│  Extends asset record with new fields       │
└──────────────────┬──────────────────────────┘
                   │ (Can run in parallel)
                   ▼
┌─────────────────────────────────────────────┐
│       GSAP Validation UI (Day 1-3)          │
│  Standalone modal, no shared state          │
└─────────────────────────────────────────────┘
```

**Recommended Order**:
1. **Week 1**: Submission Tracking (Days 1-5)
2. **Week 2**: GSAP Validation UI (Days 1-3) + Multi-Image Upload (Days 1-3) **IN PARALLEL**
3. **Week 3**: Integration testing, polish, bug fixes

---

## Testing Strategy (Phase-Wide)

### Unit Testing

**Coverage Target**: >90% for all new code

**Test Files to Create**:
```
src/lib/stores/__tests__/submission.test.ts
src/lib/components/__tests__/SubmissionTracker.test.ts
src/lib/components/__tests__/GsapValidationModal.test.ts
src/lib/components/__tests__/CarouselUploader.test.ts
src/routes/api/upload/__tests__/multi.test.ts
src/routes/api/cron/__tests__/cleanup-images.test.ts
```

**Testing Tools**:
- Vitest (unit tests)
- Testing Library (component tests)
- MSW (API mocking)

---

### Integration Testing

**Scenarios to Test**:
1. **Submission Tracking Flow**:
   - User logs in → sees submission status
   - User submits new template → count updates
   - Submission expires after 30 days → count decreases

2. **GSAP Validation Flow**:
   - User opens validation modal → API called
   - Validation completes → results display in tabs
   - User exports report → both formats valid

3. **Multi-Image Upload Flow**:
   - User uploads carousel → images stored
   - User reorders images → order persists
   - User deletes image → removed everywhere

---

### E2E Testing (Manual)

**Test Scenarios**:
1. **Happy Path**: New user submits first template with all features
2. **Limit Path**: User at 6 submissions tries to submit 7th
3. **Error Path**: API failures, network issues, validation errors
4. **Mobile Path**: All features work on mobile device

**Browsers**:
- Chrome (primary)
- Firefox
- Safari
- Mobile Safari (iOS)
- Mobile Chrome (Android)

---

### Performance Testing

**Metrics**:
| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial page load | <2s | Lighthouse |
| Submission tracker render | <100ms | Chrome DevTools |
| Validation modal open | <200ms | Chrome DevTools |
| Image upload (per image) | <3s | Network tab |
| Tab switching | <50ms | Chrome DevTools |

**Load Testing**:
- Test with 50 assets (submission calculation)
- Test with 50-page validation result (modal performance)
- Test with 6 simultaneous image uploads (R2 throughput)

---

## Deployment Strategy

### Phase 1 Deployment Plan

**Pre-Deployment Checklist**:
- [ ] All acceptance criteria met
- [ ] Test coverage >90%
- [ ] No TypeScript errors
- [ ] No console errors in production build
- [ ] Canon compliance verified
- [ ] Performance benchmarks met
- [ ] Cross-browser testing complete
- [ ] Mobile responsive verified

**Deployment Steps**:
```bash
# 1. Build
pnpm --filter=@create-something/webflow-dashboard build

# 2. Run pre-flight checks
pnpm --filter=@create-something/webflow-dashboard test
pnpm --filter=@create-something/webflow-dashboard exec tsc --noEmit

# 3. Deploy to Cloudflare Pages
cd packages/webflow-dashboard
wrangler pages deploy .svelte-kit/cloudflare --project-name=webflow-dashboard

# 4. Verify deployment
curl https://webflow-dashboard.pages.dev
```

**Post-Deployment Verification**:
- [ ] Submission tracking displays correctly
- [ ] GSAP validation modal works
- [ ] Multi-image upload succeeds
- [ ] All APIs responding
- [ ] No JavaScript errors in console
- [ ] Mobile navigation works

---

### Rollback Plan

If critical issues discovered post-deployment:

**Immediate Rollback**:
```bash
# Revert to previous deployment
wrangler pages deployment tail --project-name=webflow-dashboard
# Find previous deployment ID
wrangler pages deployment rollback <PREVIOUS_DEPLOYMENT_ID>
```

**Critical Issues Requiring Rollback**:
- Auth broken (users can't log in)
- Data loss (assets deleted)
- Complete UI breakdown
- Security vulnerability discovered

**Non-Critical Issues** (fix forward):
- UI polish issues
- Minor bugs in edge cases
- Performance regressions
- Analytics tracking issues

---

## Success Metrics

### Phase 1 Completion Criteria

**Technical**:
- [x] All 3 features implemented
- [x] Test coverage >90%
- [x] No TypeScript errors
- [x] No console errors
- [x] Performance benchmarks met

**Functional**:
- [x] Users can track submissions
- [x] Users can validate GSAP compliance
- [x] Users can upload multiple images
- [x] All APIs responding correctly

**User Experience**:
- [x] Dashboard feels polished
- [x] Features are discoverable
- [x] Error messages are helpful
- [x] Loading states feel responsive

---

### Post-Launch Metrics

**Track for 2 Weeks**:
| Metric | Target | Measurement |
|--------|--------|-------------|
| Submission tracker usage | 80% of users view | Analytics event |
| GSAP validation runs | 50% of assets validated | API calls logged |
| Multi-image uploads | 30% use carousel | Upload endpoint stats |
| Error rate | <1% of requests | Cloudflare analytics |
| User feedback | Positive sentiment | Support tickets |

---

## Risk Management

### High-Priority Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **External API downtime** | Medium | High | Local fallback always available |
| **R2 cleanup bug deletes active images** | Low | Critical | 7-day grace period + extensive testing |
| **Large file uploads timeout** | Medium | Medium | Chunked uploads + progress indicators |
| **Parallel uploads corrupt Airtable** | Low | High | Atomic updates + optimistic locking |

### Contingency Plans

**If Submission Tracking API Fails**:
- Gracefully degrade to local-only calculation
- Show warning banner explaining external API unavailable
- Allow retry with manual "Refresh Status" button

**If GSAP Validation Worker Down**:
- Show maintenance message in modal
- Provide link to worker status page
- Allow users to check validation separately

**If Multi-Upload R2 Fails**:
- Fall back to single thumbnail upload
- Show error message encouraging retry
- Log failures for investigation

---

## Timeline & Milestones

### Week-by-Week Breakdown

**Week 1** (Days 1-5): Submission Tracking System
- **Milestone**: Users can see and understand submission limits

**Week 2** (Days 6-11): GSAP Validation UI + Multi-Image Upload (parallel)
- **Milestone**: Users have full compliance workflow and richer template showcases

**Week 3** (Days 12-15): Integration, Testing, Polish
- **Milestone**: All features working together, ready for production

### Daily Checklist Template

**Each Day**:
- [ ] Morning: Review task list, set goals
- [ ] Execute tasks according to breakdown
- [ ] Write tests for new code
- [ ] Run full test suite before committing
- [ ] Update documentation
- [ ] Evening: Demo progress, note blockers

---

## Appendix A: File Structure

### New Files Created

```
packages/webflow-dashboard/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── GsapValidationModal.svelte               # NEW
│   │   │   ├── CarouselUploader.svelte                  # NEW
│   │   │   ├── SecondaryThumbnailUploader.svelte        # NEW
│   │   │   ├── validation/
│   │   │   │   ├── OverviewTab.svelte                   # NEW
│   │   │   │   ├── PagesTab.svelte                      # NEW
│   │   │   │   ├── IssuesTab.svelte                     # NEW
│   │   │   │   ├── RecommendationsTab.svelte            # NEW
│   │   │   │   ├── ValidationSummaryCard.svelte         # NEW
│   │   │   │   ├── PageResultRow.svelte                 # NEW
│   │   │   │   ├── IssueSection.svelte                  # NEW
│   │   │   │   └── RecommendationCard.svelte            # NEW
│   │   │   └── upload/
│   │   │       ├── ImagePreviewCard.svelte              # NEW
│   │   │       └── DropZone.svelte                      # NEW
│   │   └── utils/
│   │       └── export-validation.ts                     # NEW
│   └── routes/
│       └── api/
│           ├── upload/
│           │   └── multi/
│           │       └── +server.ts                       # NEW
│           ├── assets/
│           │   └── [id]/
│           │       └── images/
│           │           └── [imageId]/
│           │               └── +server.ts               # NEW
│           └── cron/
│               └── cleanup-images/
│                   └── +server.ts                       # NEW
└── __tests__/
    ├── submission.test.ts                               # NEW
    ├── SubmissionTracker.test.ts                        # NEW
    ├── GsapValidationModal.test.ts                      # NEW
    ├── CarouselUploader.test.ts                         # NEW
    └── api/
        ├── multi-upload.test.ts                         # NEW
        └── cleanup-cron.test.ts                         # NEW
```

### Modified Files

```
packages/webflow-dashboard/
├── src/
│   ├── lib/
│   │   └── server/
│   │       └── airtable.ts                    # MODIFY: Add carousel fields
│   └── routes/
│       └── (authenticated)/
│           ├── +page.svelte                   # MODIFY: Add submission tracker
│           ├── +layout.svelte                 # MODIFY: Add compact tracker
│           └── assets/
│               └── [id]/
│                   └── +page.svelte           # MODIFY: Add validation + carousel
├── wrangler.jsonc                             # MODIFY: Add cron trigger
└── README.md                                  # MODIFY: Add documentation
```

---

## Appendix B: API Reference

### New Endpoints

**POST `/api/upload/multi`**
- **Purpose**: Upload multiple images (carousel or secondary)
- **Auth**: Required
- **Body**: FormData with files + metadata
- **Response**: Array of R2 URLs

**DELETE `/api/assets/[id]/images/[imageId]`**
- **Purpose**: Delete specific image from asset
- **Auth**: Required
- **Response**: Success boolean

**GET `/api/cron/cleanup-images`**
- **Purpose**: Cleanup orphaned R2 images
- **Auth**: Cron secret header
- **Response**: Cleanup stats

---

## Appendix C: Canon Compliance

All UI components follow Canon design tokens:

**Colors**:
- Background: `var(--color-bg-surface)`
- Text: `var(--color-fg-primary)`, `var(--color-fg-secondary)`
- Borders: `var(--color-border-default)`
- Success: `var(--color-success)`
- Error: `var(--color-error)`

**Spacing**:
- Small: `var(--space-sm)`
- Medium: `var(--space-md)`
- Large: `var(--space-lg)`

**Typography**:
- Body: `var(--text-body)`
- Body Small: `var(--text-body-sm)`
- Caption: `var(--text-caption)`

**Timing**:
- Micro interactions: `var(--duration-micro)` (200ms)
- Standard transitions: `var(--duration-standard)` (300ms)
- Easing: `var(--ease-standard)`

---

## Appendix D: Related Documentation

### Existing Documentation
- [Roadmap](/packages/webflow-dashboard/ROADMAP.md) - Full feature roadmap
- [Feature Parity Analysis](/packages/webflow-dashboard/FEATURE_PARITY_ANALYSIS.md) - Gap analysis
- [Production Readiness](/packages/webflow-dashboard/PRODUCTION_READINESS.md) - Current status
- [CSS Canon](/.claude/rules/css-canon.md) - Design system
- [SvelteKit Conventions](/.claude/rules/sveltekit-conventions.md) - Code patterns
- [Cloudflare Patterns](/.claude/rules/cloudflare-patterns.md) - Infrastructure

### External References
- [Webflow Template Guidelines](https://webflow.com/templates/guidelines)
- [GSAP Validation Worker](https://gsap-validation-worker.createsomething.workers.dev)
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)

---

## Document Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-01-07 | 1.0 | Initial implementation plan | Claude Sonnet 4.5 |

---

**Next Review**: After Week 1 completion (Submission Tracking done)
**Owner**: Engineering Team
**Status**: 🟢 **APPROVED - READY TO BEGIN**
