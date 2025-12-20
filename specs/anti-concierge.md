# Anti-Concierge: Wayfinding Through Design

## Overview

Make the hermeneutic circle visible so visitors navigate the CREATE SOMETHING ecosystem without explicit guidance. The Anti-Concierge principle: guidance emerges from design, not from an intermediary.

**Epic**: csm-vgsw (already created)

## Philosophy

> "Good design is as little design as possible." — Rams

Car dealerships need concierges because navigation breaks down. CREATE SOMETHING shouldn't need one if the design is right.

**Goal**: Visitors know where they are, where they can go, and why the circle exists—without being told.

## Track A: Design Visibility

### 1. Enhance ModeIndicator (csm-u5uc)

**File**: `packages/components/src/lib/navigation/ModeIndicator.svelte`

Current state:
- Fixed position (bottom-left desktop, top-left mobile)
- Opacity 0.6, reveals on hover
- Shows circle with clickable property links
- No text labels

Changes:
- Add property name label next to current indicator
- Add "You are here" tooltip or subtle indicator
- Increase base visibility (opacity 0.7 or 0.8)
- Keep hover reveal for full navigation

### 2. Footer Descriptions (csm-pmay)

**File**: `packages/components/src/lib/footer/Footer.svelte`

Current state:
```
.space — Explore
.learn — Study
.io — Research
.agency — Build
.ltd — Canon
```

Changes:
Add 1-line descriptions:
```
.space — Explore interactive experiments
.learn — Study structured courses
.io — Research papers and analysis
.agency — Build with us
.ltd — Canon principles and philosophy
```

Keep concise. The description should answer "why would I go there?"

## Track B: Analytics

### 3. Extend Analytics Schema (csm-2ki9)

**File**: `packages/components/src/lib/analytics/migration.sql`

Add to `unified_sessions`:
```sql
ALTER TABLE unified_sessions ADD COLUMN source_property TEXT;
```

This field captures which property the visitor came from (detected via referrer).

### 4. Cross-Property Tracking (csm-eygk)

**File**: `packages/components/src/lib/analytics/client.ts`

On page load:
1. Check `document.referrer` domain
2. If referrer is a CREATE SOMETHING property, record `source_property`
3. Fire `property_transition` event with:
   - `from_property`: source property (or null if external)
   - `to_property`: current property
   - `entry_url`: current URL

This enables measuring cross-property sessions.

### 5. Dashboard Visualization (csm-0ptx)

**File**: `packages/io/src/routes/admin/analytics/`

Add cross-property flow visualization:
- Sankey diagram or flow chart showing property transitions
- Table of top property-to-property journeys
- Filter by date range

Lower priority (P3). Do after tracking is working.

## Dependency Order

1. **Independent** (can run in parallel):
   - csm-u5uc (ModeIndicator)
   - csm-pmay (Footer)
   - csm-2ki9 (Schema)

2. **After schema**:
   - csm-eygk (Tracking) — depends on csm-2ki9

3. **After tracking**:
   - csm-0ptx (Dashboard) — depends on csm-eygk

## Success Criteria

- [ ] ModeIndicator shows property name, not just icon
- [ ] Footer shows descriptive text for each property
- [ ] Analytics captures `source_property` on sessions
- [ ] `property_transition` events fire on cross-property navigation
- [ ] (P3) Dashboard shows cross-property flows

## Testing

Each component should:
1. Build without TypeScript errors
2. Render correctly in dev server
3. Not break existing functionality

## Canon Compliance

Check after implementation:
- Uses Canon tokens (no hardcoded colors)
- Follows "Tailwind for structure, Canon for aesthetics"
- Transitions use Canon motion tokens
