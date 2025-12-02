# Architectural Visualization

CREATE SOMETHING methodology for floor plan visualization.

## Philosophy

**"Weniger, aber besser"** — Less, but better.

Apply the Subtractive Triad:

| Level | Question | Action |
|-------|----------|--------|
| DRY | Have I drawn this before? | Unify repeated patterns |
| Rams | Does this line earn existence? | Remove decoration |
| Heidegger | Does this serve the dwelling? | Reconnect to threshold zones |

## Heidegger Threshold Zones

Every dwelling has five threshold zones. The plan reveals them through subtle value shifts, not labels:

```
OUTER    → Covered exterior (porches, carports)
SERVICE  → Support spaces (utility, laundry)
PUBLIC   → Guest-accessible (entry, hallway)
PRIVATE  → Family only (bedrooms, en-suite)
OPEN     → Dwelling core (kitchen, dining, living)
```

**Flow principle**: A guest should never pass through PRIVATE to reach PUBLIC.

## Implementation

The canonical implementation is a Svelte component:

```
packages/space/src/lib/components/FloorPlan.svelte  → Component
packages/space/src/lib/types/architecture.ts        → Types
```

### Usage

```svelte
<script>
  import FloorPlan from '$lib/components/FloorPlan.svelte';
  import { zone, wall, room } from '$lib/types/architecture';

  const plan = {
    name: 'My House',
    width: 50,
    depth: 30,
    zones: [
      zone(0, 0, 50, 15, 'open'),
      zone(0, 15, 50, 15, 'private'),
    ],
    walls: [
      wall(0, 30, 50, 30, true),  // exterior
      wall(0, 15, 50, 15),        // interior
    ],
    rooms: [
      room(25, 7, 'Living'),
      room(25, 22, 'Bedroom'),
    ]
  };
</script>

<FloorPlan {plan} />
```

### Types

```typescript
type ThresholdZone = 'outer' | 'service' | 'public' | 'private' | 'open';

interface FloorPlanData {
  name: string;
  location?: string;
  width: number;
  depth: number;
  bedrooms?: number;
  bathrooms?: number;
  features?: string;
  zones: Zone[];
  walls: Wall[];
  rooms: Room[];
  columns?: Column[];
  entry?: EntryPoint;
}
```

## Visual Tokens

The component uses CSS variables from CREATE SOMETHING design system:

```css
/* Zone fills (darker = more outer) */
--zone-outer: #0a0a0a;
--zone-service: #111111;
--zone-public: #151515;
--zone-private: #1a1a1a;
--zone-open: #0d0d0d;

/* Inherited from app.css */
--color-bg-pure: #000000;
--color-fg-primary: #ffffff;
--color-fg-secondary: rgba(255, 255, 255, 0.8);
--color-fg-muted: rgba(255, 255, 255, 0.4);
--color-info: #4477aa;
```

## What to Remove

These do NOT earn existence:

- Section views
- Site plans (separate document)
- Materials lists
- Budget estimates
- Dimension strings on plan
- SF labels per room
- Decorative annotations

## What Remains

1. **The plan** — walls, doors, columns
2. **Zone fills** — philosophy made visible
3. **Room names** — orientation only
4. **Entry arrow** — phenomenology of arrival
5. **Minimal caption** — dimensions, SF, BR/BA

## Export

For PDF/PNG output:
- Right-click SVG → Save as SVG → Open in Figma/Illustrator
- Or use browser print to PDF
- Or add Puppeteer-based export (see `workers/motion-extractor` pattern)

## Reference

See experiment: `/experiments/threshold-dwelling`
