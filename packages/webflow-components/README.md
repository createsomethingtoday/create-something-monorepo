# CREATE SOMETHING Canon Webflow Components

React component library for Webflow positioned around Canon parity.

The package currently contains a mix of:
- Canon-parity exports already present in Webflow
- compatibility components carried forward from earlier Maverick-derived work
- section-level components that are useful in Webflow but are not Canon parity targets

## Installation

```bash
cd packages/webflow-components
npm install
```

## Publish to Webflow

```bash
npx webflow library share
```

This will prompt for Workspace authentication and upload the component library.

## Parity Status

Current Canon parity by exported component name:

| Canon component | Status | Notes |
|---|---|---|
| `Button` | `ported` | Present in the Webflow library |
| `Footer` | `ported with cleanup remaining` | Present, but implementation still carries older branding assumptions |
| `Select` | `ported` | Present in the Webflow library |
| `Navigation` | `ported` | Canon navigation now exists separately from legacy `Header` |
| `Heading` | `ported` | Canon fluid heading scales are available in Webflow |
| `Card` | `ported` | Canon surface card is separate from legacy `GlassCard` |
| `TextField` | `ported` | Canon text input now exists separately from legacy `Field` |
| `TextArea` | `ported` | Canon multiline field now exists separately from legacy `Field` |
| `Tabs` | `ported` | Canon tabs primitive now exists separately from `Solutions` |
| `Dialog` | `ported` | Canon dialog is now available for Webflow preview composition |

Phase 1 delivered:
- package metadata and docs reframed around Canon
- token layer normalized toward Canon semantics
- shared primitives added for new React/Webflow ports
- `Navigation`, `Heading`, `Card`, `TextField`, `TextArea`, `Tabs`, and `Dialog` shipped

Legacy or non-Canon surfaces currently in the library:
- `GlassCard`
- `IconCard`
- `Field`
- `StatsDisplay`
- `HeroSection`
- `KineticHero`
- `ProductShowcase`
- `Solutions`
- `ProcessSteps`
- `IconCardGrid`
- `Header`

Canon exports now available in the Webflow package:
- `Heading`
- `Card`
- `TextField`
- `TextArea`
- `Tabs`
- `Dialog`
- `Navigation`

## Current Components

The current package contains both Canon exports and compatibility exports. The lists below are grouped by what is already present in the Webflow library, not by parity status.

### Core (Group: Core)

| Component | Description | Key Props |
|-----------|-------------|-----------|
| **Button** | Primary CTA button with shine effect | `title`, `href`, `arrow`, `light`, `variant` |

### Cards (Group: Cards)

| Component | Description | Key Props |
|-----------|-------------|-----------|
| **Glass Card** | Glassmorphism container | `glassVariant`, `showShine`, `padding` |
| **Icon Card** | Feature card with icon | `title`, `icon`, `cardVariant`, `variant` |

### Forms (Group: Forms)

| Component | Description | Key Props |
|-----------|-------------|-----------|
| **Field** | Form input/textarea | `label`, `type`, `textarea`, `error` |
| **Select** | Dropdown selector | `label`, `items`, `placeholder` |

### Data (Group: Data)

| Component | Description | Key Props |
|-----------|-------------|-----------|
| **Stats Display** | Animated counters | `stats` (JSON), `columns`, `animated` |

### Sections (Group: Sections)

| Component | Description | Key Props |
|-----------|-------------|-----------|
| **Kinetic Hero** | Full-screen hero with video | `title`, `subtitle`, `videoSrc`, `ctaText` |
| **Product Showcase** | 3-column product grid | `products` (JSON), `variant` |
| **Solutions** | Tabbed content | `heading`, `tabs` (JSON), `variant` |
| **Process Steps** | Step navigator | `heading`, `steps` (JSON), `variant` |
| **Icon Card Grid** | Grid of icon cards | `heading`, `cards` (JSON), `columns` |

### Layout (Group: Layout)

| Component | Description | Key Props |
|-----------|-------------|-----------|
| **Header** | Site navigation | `logo`, `navItems` (JSON), `ctaText` |
| **Footer** | Site footer | `logo`, `columns` (JSON), `socialLinks` (JSON) |

## Accent Variants

Some current components still expose older accent variants from the pre-Canon library:

- `default`
- `lithx`
- `petrox`
- `dme`

These remain for compatibility while the package is moved toward Canon-first component parity.

## JSON Data Formats

### Stats Display

```json
[
  {"value": 99, "suffix": "%", "label": "Recovery Rate"},
  {"value": 50, "suffix": "+", "label": "Installations"},
  {"value": 24, "suffix": "/7", "label": "Support"}
]
```

### Product Showcase

```json
[
  {
    "name": "LithX",
    "tagline": "Mining Solutions",
    "description": "Advanced lithium extraction.",
    "url": "/lithx",
    "videoSrc": "/videos/lithx.mp4"
  }
]
```

### Solutions Tabs

```json
[
  {
    "id": "standard",
    "title": "Standard",
    "subtitle": "Entry-level",
    "description": "Perfect for small operations.",
    "features": ["99% efficiency", "24/7 monitoring"],
    "imageSrc": "/images/standard.jpg"
  }
]
```

### Process Steps

```json
[
  {
    "id": "1",
    "number": 1,
    "title": "Assessment",
    "description": "Analyze current operations.",
    "imageSrc": "/images/step1.jpg"
  }
]
```

### Icon Card Grid

```json
[
  {
    "title": "High Efficiency",
    "description": "99% metal recovery rate",
    "icon": "circle",
    "href": "/efficiency"
  }
]
```

Icon options: `circle`, `square`, `triangle`, `hexagon`

### Navigation Items

```json
[
  {"label": "Products", "href": "/products"},
  {"label": "Solutions", "href": "/solutions"}
]
```

### Footer Columns

```json
[
  {
    "title": "Company",
    "links": [
      {"label": "About", "href": "/about"},
      {"label": "Careers", "href": "/careers"}
    ]
  }
]
```

### Social Links

```json
[
  {"platform": "linkedin", "href": "https://linkedin.com/company/example"},
  {"platform": "twitter", "href": "https://twitter.com/example"}
]
```

Platforms: `linkedin`, `twitter`, `youtube`, `instagram`, `facebook`

## Design Tokens

The library uses a token layer that is being normalized toward Canon semantics:

- **Colors**: Dark theme with semantic foreground/background hierarchy
- **Spacing**: Golden ratio (φ = 1.618) based spacing scale
- **Typography**: Inter and Inter Tight font families
- **Border Radius**: current components often keep hard edges from earlier work; this is being normalized during Canon parity work
- **Shadows**: Consistent shadow hierarchy
- **Animation**: 200ms (micro), 300ms (standard), 500ms (complex)

### Positioning

This package should now be read as:

1. A Webflow delivery surface for Canon-aligned components
2. A compatibility home for earlier Webflow React components that are still useful
3. A package in transition until Canon primitive parity is complete

### Webflow-Specific Adaptations

These adaptations reflect current Webflow implementation constraints:

| Original | Webflow Adaptation | Reason |
|----------|-------------------|--------|
| Tailwind classes | Inline `CSSProperties` | Webflow requires inline styles |
| Framer Motion | CSS `@keyframes` | Framer Motion unavailable in Webflow |
| No default data | Default demo data | Webflow Designer needs visible preview |
| Existing legacy class prefix | `mavx-` prefix in older components | Compatibility; will be reduced over time |
| GSAP ScrollTrigger | Static (add Webflow Interactions) | GSAP unavailable; use native Interactions |

### Legacy Header Note

The current `Header` component is a legacy compatibility surface rather than Canon `Navigation`. It still carries older logo animation behavior and naming assumptions.

If you need that behavior during the transition, add this custom code to your site's `<head>`:

```html
<script>
// Legacy header logo animation
// Tracks navigation between home and internal pages
(function() {
  const isHome = window.location.pathname === '/' || window.location.pathname === '/home';
  const wasOnInternal = sessionStorage.getItem('mavx-was-internal') === 'true';

  // Set data attribute for CSS-based animation
  document.documentElement.setAttribute('data-logo-expanded', isHome ? 'true' : 'false');
  document.documentElement.setAttribute('data-logo-animate', isHome && wasOnInternal ? 'true' : 'false');

  // Track page context for next navigation
  if (isHome) {
    sessionStorage.removeItem('mavx-was-internal');
  } else {
    sessionStorage.setItem('mavx-was-internal', 'true');
  }
})();
</script>
```

Then in the current `Header` component settings:
- **Home page**: `logoExpanded: true`, `animateLogo: true`
- **Internal pages**: `logoExpanded: false`, `animateLogo: false`

Or use Webflow's native Interactions to animate the logo container width.

## Development

```bash
# Type check
npm run typecheck

# Publish to Webflow
npm run share
```

## Architecture

```
src/
├── components/
│   ├── core/        # Button
│   ├── cards/       # GlassCard, IconCard
│   ├── forms/       # Field, Select
│   ├── data/        # StatsDisplay
│   ├── sections/    # KineticHero, ProductShowcase, etc.
│   └── layout/      # Header, Footer
├── styles/
│   └── tokens.ts    # Design tokens
└── index.ts         # Exports
```

Each component has:
- `ComponentName.tsx` - React implementation
- `ComponentName.webflow.tsx` - Webflow declaration

## Status

This package is usable today, but it should not yet be described as full Canon parity. The current milestone is to complete the Phase 1 Canon foundation and then retire or relabel the remaining non-Canon surfaces more explicitly.
