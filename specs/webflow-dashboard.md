# Webflow Asset Dashboard: SvelteKit Port

Port the existing Next.js Webflow asset dashboard to SvelteKit with Cloudflare infrastructure.

## Overview

**Source**: `/Users/micahjohnson/Documents/Github/Webflow/wf-asset-dashboard` (Next.js)
**Target**: `packages/webflow-dashboard/` (SvelteKit + Cloudflare)

This is a direct port preserving existing UX while migrating from Vercel to Cloudflare infrastructure.

### Infrastructure Mapping

| Source (Vercel) | Target (Cloudflare) |
|-----------------|---------------------|
| Vercel KV | Cloudflare KV |
| Vercel Blob | Cloudflare R2 |
| Next.js API Routes | SvelteKit +server.ts |
| React hooks | Svelte 5 runes |

---

## Features

### Phase 1: Foundation
Set up fresh SvelteKit project with Cloudflare adapter.

- Delete existing `packages/webflow-dashboard/` directory
- Initialize new SvelteKit project with `pnpm create svelte@latest`
- Install Cloudflare adapter: `@sveltejs/adapter-cloudflare`
- Configure `wrangler.jsonc` with KV (SESSIONS) and R2 (UPLOADS) bindings
- Import Canon CSS tokens from `@create-something/components/styles/tokens.css`
- Create `app.d.ts` with Cloudflare Env types
- Create base `+layout.svelte` with dark mode support
- Port Airtable client from `utils/airtableSecurity.js` to `src/lib/server/airtable.ts`
- Port KV session utilities to `src/lib/server/kv.ts`

### Phase 2: Authentication
Port two-stage email token authentication flow with Airtable automation trigger.

**Critical Pattern**: The login endpoint uses a TWO-STEP Airtable update:
1. First update: Set token fields to `null` (clears old token)
2. Second update: Set new token and expiration
3. The transition `null → value` triggers the Airtable automation that sends the email

This is NOT optional - the Airtable automation watches for this field transition.

**Implementation:**
- Create `/login` route with email form
- Create `/verify` route for magic link landing (reads token from URL query)
- Port `POST /api/auth/login` endpoint:
  - Rate limit: 5 attempts per 15 minutes per IP
  - Validate email format
  - Escape email for Airtable formula (injection prevention)
  - Find user in Airtable table `tbldQNGszIyOjt9a1`
  - TWO-STEP UPDATE: First set `fldI8NZzmJSEVly4D` (token) and `fldbK6n1sooEQaoWg` (expiry) to `null`
  - Then set new UUID token and 60-minute expiration
  - Airtable automation sends email (we don't send it)
- Port `POST /api/auth/verify-token` endpoint:
  - Rate limit: 5 attempts per 15 minutes per IP
  - Validate token format (UUID)
  - Find user by token field in Airtable
  - Check token expiration
  - Generate session: `session_${crypto.randomUUID()}`
  - Store in Cloudflare KV with 2-hour TTL
  - Set HTTP-only cookie: `session_token`
  - Clear token fields in Airtable (set to null)
- Port `GET /api/auth/check-session` endpoint (validates session from KV)
- Port `POST /api/auth/logout` endpoint (deletes from KV, clears cookie)
- Implement session middleware in `hooks.server.ts`
- Port rate limiting using Cloudflare KV counters
- Add protected route guards (redirect to /login if no session)

**Airtable Field IDs:**
- Users table: `tbldQNGszIyOjt9a1`
- Token field: `fldI8NZzmJSEVly4D`
- Expiration field: `fldbK6n1sooEQaoWg`

### Phase 3: Core UI Components
Port reusable UI components with Canon CSS tokens.

- Button (variants: primary, secondary, webflow, ghost, link)
- Input, Label, Textarea
- Card, CardHeader, CardTitle, CardContent
- Badge with status colors
- Toast notification system with Svelte store
- DarkModeToggle with localStorage persistence
- SearchInput with debounce
- Table, TableHeader, TableBody, TableRow, TableHead, TableCell
- Tooltip
- Dialog/Modal base component
- Tabs (TabsList, TabsTrigger, TabsContent)
- DropdownMenu
- Separator

### Phase 4: Dashboard Layout
Port main dashboard structure and header.

- Create Header component with logo, navigation, user menu
- Port SubmissionTracker (compact variant) for header display
- Create main `/` route with dashboard layout
- Add Profile button that opens settings modal
- Add Logout button with confirmation
- Implement mobile-responsive hamburger menu
- Add search bar in header (desktop: inline, mobile: expandable)

### Phase 5: Asset Listing
Port asset display with filtering and search.

- Create `AssetsDisplay` component with grid/table view toggle
- Port `AssetCard` component for grid view
- Port `AssetTable` and `AssetTableRow` for table view
- Port `StatusBadge` component with Canon semantic colors
- Port `StatusSection` for grouping assets by status
- Implement client-side search filtering (name, description, type)
- Implement status filter buttons
- Create `GET /api/assets` endpoint (fetches user's assets from Airtable)
- Add loading skeleton states
- Handle empty states with helpful messaging

### Phase 6: Asset Detail Page
Port full asset detail view.

- Create `/assets/[id]` dynamic route
- Port hero section with thumbnail/carousel display
- Port performance metrics cards (viewers, purchases, revenue)
- Port details grid (dates, status, type, price)
- Port rejection feedback section (conditional on status)
- Port related assets sidebar
- Create `GET /api/assets/[id]` endpoint
- Add back navigation to dashboard
- Handle 404 for invalid asset IDs

### Phase 7: Asset Actions
Port edit and archive functionality.

- Port `EditAssetModal` with form fields (name, description, URLs)
- Port form validation with real-time name uniqueness check
- Create `PATCH /api/assets/[id]` endpoint for updates
- Port `ConfirmDialog` component for archive confirmation
- Create `POST /api/assets/[id]/archive` endpoint
- Create `GET /api/assets/check-name` endpoint for uniqueness
- Wire dropdown actions in `AssetTableRow` to handlers
- Add toast notifications for success/error feedback
- Refresh asset list after mutations

### Phase 8: Overview Section
Port dashboard overview with metrics cards.

- Port `Overview` component container
- Port `MetricCard` component for stats display
- Port template count by status breakdown
- Port performance summary (total revenue, purchases, viewers)
- Port asset distribution visualization
- Add conditional rendering when no assets
- Calculate aggregates from asset data

### Phase 9: Profile & Settings
Port profile editing and API key management.

- Port `SettingsModal` with tabs (Profile, API Keys)
- Port `ProfileTab` with form fields (name, legal name, bio)
- Create `GET /api/profile` endpoint
- Create `PATCH /api/profile` endpoint
- Port `ApiKeysTab` with key list and actions
- Port `ApiKeyCard` component showing prefix, status, last used
- Port `GenerateKeyForm` with name and scope selection
- Port one-time key reveal display
- Create `POST /api/v1/keys/generate` endpoint
- Create `GET /api/v1/keys/list` endpoint
- Create `POST /api/v1/keys/revoke` endpoint

### Phase 10: Submission Tracker
Port complete submission tracking with external API.

- Port submission tracker store with reactive state
- Port external API call to `check-asset-name.vercel.app` for limits
- Port local calculation fallback for CORS/development
- Port 30-day rolling window logic
- Port `SubmissionTooltip` with detailed breakdown
- Port slot calculation (used, remaining, next available)
- Port template list with submission dates and expiry
- Handle loading and error states gracefully

### Phase 11: Image Upload
Replace Vercel Blob with Cloudflare R2.

- Create `POST /api/upload` endpoint with R2 storage
- Port WebP format validation (buffer inspection)
- Port thumbnail aspect ratio validation (150:199)
- Port `ImageUploader` component with drag-drop zone
- Add upload progress indicator
- Generate unique filenames: `${timestamp}_${random}_${original}`
- Integrate into profile avatar upload
- Add file size limits and error handling

### Phase 12: Marketplace Insights
Port category performance and leaderboard.

- Create `/marketplace` route
- Port `CategoryPerformanceTable` with sortable columns
- Port leaderboard display with rankings
- Port contextual tooltips explaining metrics
- Create `GET /api/analytics/categories` endpoint
- Create `GET /api/analytics/leaderboard` endpoint
- Add loading states and empty states

### Phase 13: Validation Tools
Port validation playground for testing.

- Create `/validation` route
- Port `GsapValidationModal` for custom code testing
- Port URL validation utilities
- Port custom code pattern detection
- Create `POST /api/validation/playground` endpoint
- Add example inputs and documentation

### Phase 14: Polish & Integration
Final integration, testing, and deployment.

- Verify all navigation flows work correctly
- Test authentication edge cases (expired tokens, invalid sessions)
- Verify toast notifications appear throughout app
- Test responsive layout on mobile, tablet, desktop
- Add loading states to all async operations
- Implement error boundaries for graceful failures
- Build and deploy to Cloudflare Pages
- Verify KV and R2 bindings work in production
- Test with real Airtable data
- Update DNS if needed

---

## Technical Notes

### Svelte 5 Patterns

**State**: Use `$state()` instead of `useState()`
```svelte
let count = $state(0);
let items = $state<Item[]>([]);
```

**Derived**: Use `$derived()` instead of `useMemo()`
```svelte
const filtered = $derived(items.filter(i => i.active));
```

**Effects**: Use `$effect()` instead of `useEffect()`
```svelte
$effect(() => {
  console.log('count changed:', count);
});
```

**Props**: Use `$props()` instead of destructuring
```svelte
let { title, onclick }: Props = $props();
```

### Canon CSS Integration

Import tokens in `app.css`:
```css
@import '@create-something/components/styles/tokens.css';
```

Use tokens for design properties:
```css
.card {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
}
```

Use Tailwind for layout:
```svelte
<div class="flex items-center gap-4 p-6">
```

### Cloudflare Bindings

```typescript
// app.d.ts
declare global {
  namespace App {
    interface Platform {
      env: {
        SESSIONS: KVNamespace;
        UPLOADS: R2Bucket;
        AIRTABLE_API_KEY: string;
        AIRTABLE_BASE_ID: string;
      };
    }
    interface Locals {
      user?: { email: string };
    }
  }
}
```

---

## Success Criteria

- All 14 phases complete
- Feature parity with source Next.js dashboard
- Authentication flow works end-to-end
- Asset CRUD operations functional
- Image uploads work with R2
- Deployed to Cloudflare Pages
- Canon CSS tokens applied
- Dark mode functional
- Mobile responsive
