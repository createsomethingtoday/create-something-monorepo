# Phase 6: The Stack Integration - Implementation

## Overview

Phase 6 integrates Court Reserve with The Stack Indoor Pickleball client site through an embeddable booking widget. This provides a proof-of-concept for white-label court booking that can be deployed to any client site.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  The Stack Website                                           │
│  (packages/agency/clients/the-stack)                        │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  /book Route                                        │    │
│  │  - Loads embed.js from Court Reserve                │    │
│  │  - Initializes widget in #booking-widget div        │    │
│  │  - Handles callbacks (onReady, onError, etc.)       │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ <script src="embed.js">
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Court Reserve Embed Widget                                  │
│  (packages/court-reserve/src/embed/)                        │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  widget.ts                                          │    │
│  │  - Global CourtReserve.createWidget() API           │    │
│  │  - Mounts Widget.svelte into container              │    │
│  │  - Returns instance API (destroy, updateDate, etc.) │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Widget.svelte                                      │    │
│  │  - Fetches availability from /api/availability      │    │
│  │  - Displays courts and time slots                   │    │
│  │  - Handles slot selection and booking               │    │
│  │  - Redirects to checkout flow                       │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ GET /api/availability?facility=thestack&date=2025-12-30
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Court Reserve API                                           │
│  (packages/court-reserve/src/routes/api/)                   │
│                                                              │
│  GET /api/availability                                       │
│  - Returns courts and available time slots                  │
│  - Calculates pricing (base + peak hours)                   │
│  - Handles facility lookup by slug or ID                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Embed Widget (`src/embed/`)

**widget.ts** - Entry point and global API:
```typescript
interface WidgetConfig {
  facilitySlug: string;      // Required: facility identifier
  container: string;         // Required: CSS selector for mount point
  theme?: 'light' | 'dark';  // Optional: theme (default: dark)
  date?: string;             // Optional: initial date (default: today)
  courtType?: string;        // Optional: filter by court type
  onReservationComplete?: (reservation: ReservationResult) => void;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

// Global API
window.CourtReserve = {
  createWidget(config: WidgetConfig): WidgetInstance;
  version: string;
}
```

**Widget.svelte** - Main booking UI component:
- Fetches availability from `/api/availability`
- Displays courts in grid layout
- Shows time slots with availability status and pricing
- Handles slot selection (click to select, shows booking panel)
- Redirects to checkout flow on "Book Now"

**Theme Support**:
- `data-theme="dark"` (default) - Dark background, light text
- `data-theme="light"` - Light background, dark text

### 2. Build Configuration

**vite.config.ts**:
- Dual build mode: SvelteKit app OR standalone embed widget
- Controlled via `BUILD_EMBED=true` environment variable
- Embed build:
  - Entry: `src/embed/widget.ts`
  - Output: `static/embed.js` (IIFE format)
  - Inline all dependencies (single-file bundle)

**package.json scripts**:
```bash
pnpm build         # Build SvelteKit app
pnpm build:embed   # Build embed widget
pnpm deploy        # Build both, deploy to Cloudflare Pages
```

### 3. The Stack Integration (`packages/agency/clients/the-stack/`)

**New Route: `/book`**
- Loads `embed.js` dynamically via script tag
- Initializes widget with `facilitySlug: 'thestack'`
- Handles loading/error states
- Analytics integration (gtag event on booking completion)

**Updated Navigation**:
- "Book a Court" now links to `/book` (was `/locations`)
- Added "Locations" as separate link

**Updated Locations Page**:
- Each location card now has "Book a Court" button
- Button links to `/book` (single booking flow for all locations)

## API Integration

The widget uses the existing `/api/availability` endpoint:

**Request**:
```
GET /api/availability?facility=thestack&date=2025-12-30
```

**Response**:
```json
{
  "facility": {
    "id": "fac_xxx",
    "name": "The Stack",
    "slug": "thestack",
    "timezone": "America/Los_Angeles"
  },
  "date": "2025-12-30",
  "courts": [
    {
      "id": "crt_xxx",
      "name": "Court 1",
      "type": "pickleball",
      "surfaceType": "hardwood",
      "slots": [
        {
          "startTime": "09:00",
          "endTime": "10:00",
          "status": "available",
          "priceCents": 4000
        },
        {
          "startTime": "10:00",
          "endTime": "11:00",
          "status": "reserved",
          "priceCents": null
        }
      ]
    }
  ]
}
```

## Usage

### For Developers

**Development**:
```bash
# Start Court Reserve (includes widget in dev mode)
cd packages/court-reserve
pnpm dev

# Start The Stack
cd packages/agency/clients/the-stack
pnpm dev
```

**Production Build**:
```bash
# Build Court Reserve (app + widget)
cd packages/court-reserve
pnpm build         # SvelteKit app
pnpm build:embed   # Standalone widget

# Deploy
pnpm deploy        # Both builds to Cloudflare Pages
```

### For Client Sites

**Basic Embed**:
```html
<div id="booking-widget"></div>

<script src="https://courtreserve.createsomething.space/embed.js"></script>
<script>
  CourtReserve.createWidget({
    facilitySlug: 'thestack',
    container: '#booking-widget',
    theme: 'dark'
  });
</script>
```

**With Callbacks**:
```javascript
const widget = CourtReserve.createWidget({
  facilitySlug: 'thestack',
  container: '#booking-widget',
  theme: 'dark',
  onReservationComplete: (reservation) => {
    console.log('Booked:', reservation);
    gtag('event', 'booking', { value: reservation.price });
  },
  onReady: () => {
    console.log('Widget ready');
  },
  onError: (error) => {
    console.error('Widget error:', error);
  }
});

// Instance API
widget.updateDate('2025-12-31');  // Change displayed date
widget.refresh();                 // Re-fetch availability
widget.destroy();                 // Unmount widget
```

## Facility Setup (Phase 6.3)

To set up "The Stack" facility in Court Reserve:

1. **Create Facility**:
```sql
INSERT INTO facilities (
  id, name, slug, timezone, status,
  opening_time, closing_time, slot_duration_minutes,
  advance_booking_days, cancellation_hours
) VALUES (
  'fac_thestack',
  'The Stack Indoor Pickleball',
  'thestack',
  'America/Los_Angeles',
  'active',
  '06:00',
  '22:00',
  60,
  14,
  24
);
```

2. **Create Courts** (example for 4 locations):
```sql
-- Grandview Park Tennis Center
INSERT INTO courts (id, facility_id, name, court_type, is_active, sort_order, price_per_slot_cents, peak_price_cents)
VALUES ('crt_grandview1', 'fac_thestack', 'Grandview Court 1', 'pickleball', 1, 1, 4000, 5000),
       ('crt_grandview2', 'fac_thestack', 'Grandview Court 2', 'pickleball', 1, 2, 4000, 5000);

-- Oakridge Sports Complex
INSERT INTO courts (id, facility_id, name, court_type, is_active, sort_order, price_per_slot_cents, peak_price_cents)
VALUES ('crt_oakridge1', 'fac_thestack', 'Oakridge Court 1', 'pickleball', 1, 3, 4000, 5000),
       ('crt_oakridge2', 'fac_thestack', 'Oakridge Court 2', 'pickleball', 1, 4, 4000, 5000);

-- Riverview Tennis Academy
INSERT INTO courts (id, facility_id, name, court_type, is_active, sort_order, price_per_slot_cents, peak_price_cents)
VALUES ('crt_riverview1', 'fac_thestack', 'Riverview Court 1', 'pickleball', 1, 5, 4000, 5000),
       ('crt_riverview2', 'fac_thestack', 'Riverview Court 2', 'pickleball', 1, 6, 4000, 5000);

-- Pinecrest Court Club
INSERT INTO courts (id, facility_id, name, court_type, is_active, sort_order, price_per_slot_cents, peak_price_cents)
VALUES ('crt_pinecrest1', 'fac_thestack', 'Pinecrest Court 1', 'pickleball', 1, 7, 4000, 5000),
       ('crt_pinecrest2', 'fac_thestack', 'Pinecrest Court 2', 'pickleball', 1, 8, 4000, 5000);
```

**Pricing**:
- Base: $40/hour ($4000 cents)
- Peak (weekdays 5-8pm): $50/hour ($5000 cents)

## Testing Checklist

- [ ] Widget loads on `/book` route
- [ ] Displays all courts for The Stack facility
- [ ] Shows available time slots for today
- [ ] Date picker changes displayed availability
- [ ] Clicking an available slot selects it
- [ ] Booking panel shows selected court and time
- [ ] "Book Now" redirects to checkout (or Court Reserve)
- [ ] "Cancel" clears selection
- [ ] Theme switches (dark/light) work
- [ ] Mobile responsive layout
- [ ] Error states display correctly
- [ ] Loading states display correctly

## Future Enhancements

### Phase 6.4: Direct Checkout
- Complete booking flow within widget (no redirect)
- Stripe integration for payment
- Member authentication via The Stack accounts

### Phase 6.5: Multi-Location Support
- Filter by location (Grandview, Oakridge, etc.)
- Map view with court availability
- Location-specific pricing

### Phase 6.6: Advanced Features
- Recurring reservations
- Waitlist integration
- Member pricing tiers
- SMS notifications

## Files Modified/Created

### Court Reserve (`packages/court-reserve/`)
- `src/embed/widget.ts` (new)
- `src/embed/Widget.svelte` (new)
- `vite.config.ts` (modified)
- `package.json` (modified)
- `PHASE6_IMPLEMENTATION.md` (new)

### The Stack (`packages/agency/clients/the-stack/`)
- `src/routes/book/+page.svelte` (new)
- `src/routes/locations/+page.svelte` (modified)
- `src/lib/components/Navigation.svelte` (modified)

## Deployment

```bash
# Court Reserve
cd packages/court-reserve
pnpm build
pnpm build:embed
pnpm deploy

# The Stack
cd packages/agency/clients/the-stack
pnpm build
pnpm deploy
```

The widget will be available at:
- Development: `http://localhost:5173/embed.js`
- Production: `https://courtreserve.createsomething.space/embed.js`

## Notes

- The widget currently redirects to Court Reserve for checkout (Phase 6 scope)
- Full in-widget checkout flow is planned for Phase 6.4
- Facility setup SQL is provided but not yet executed (Phase 6.3)
- The widget is framework-agnostic (vanilla JS) and can be embedded in any site
