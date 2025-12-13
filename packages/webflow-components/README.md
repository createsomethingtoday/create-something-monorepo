# Maverick X Webflow Components

React component library for Webflow, adapted from the Maverick X design system.

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

## Components

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

## Brand Variants

All components support brand color variants:

- `default` - Blue (#3B82F6)
- `lithx` - Teal (#00C2A8) - Mining
- `petrox` - Orange (#FF7A00) - Oil & Gas
- `dme` - Cyan (#06B6D4) - Water Treatment

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

The library uses Canon design tokens for consistent styling:

- **Colors**: Dark theme with semantic foreground/background hierarchy
- **Spacing**: Golden ratio (φ = 1.618) based spacing scale
- **Typography**: Inter and Inter Tight font families
- **Border Radius**: `0` for all structural elements (Maverick X aesthetic)
- **Shadows**: Consistent shadow hierarchy
- **Animation**: 200ms (micro), 300ms (standard), 500ms (complex)

### Maverick X Design Principles

This library adheres to the Maverick X design system:

1. **No border radius** on structural elements (buttons, cards, inputs, containers)
2. **Shine effect** on Button hover (gradient sweep animation)
3. **Light/Dark modes** for Button (`light` prop for use on dark backgrounds)
4. **Brand color variants** via `variant` prop across all components
5. **Industrial color palette** - Grayscale (g-50 to g-500) and White scale (w-50 to w-500)
6. **Product brands** - lithx (teal), petrox (orange), dme (cyan)

### Webflow-Specific Adaptations

These adaptations preserve Maverick X design while accommodating Webflow constraints:

| Original | Webflow Adaptation | Reason |
|----------|-------------------|--------|
| Tailwind classes | Inline `CSSProperties` | Webflow requires inline styles |
| Framer Motion | CSS `@keyframes` | Framer Motion unavailable in Webflow |
| No default data | Default demo data | Webflow Designer needs visible preview |
| No class prefix | `mavx-` prefix | Prevents CSS collisions in Webflow |
| GSAP ScrollTrigger | Static (add Webflow Interactions) | GSAP unavailable; use native Interactions |

### Logo Animation Custom Code

The original Maverick X site animates the logo between home and internal pages. To replicate this in Webflow, add this custom code to your site's `<head>`:

```html
<script>
// Maverick X Logo Animation
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

Then in your Header component settings:
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

## Credits

Adapted from the Maverick X Next.js application by CREATE SOMETHING.
