# Understanding: Verticals

> **The template library—Being-as-Industry where vertical-specific sites manifest Canon principles.**

## Ontological Position

**Mode of Being**: Verticals — Being-as-Industry

This is where Canon design meets specific industries. Each vertical is a fully-realized website template that embodies the Subtractive Triad—minimal, functional, aesthetically coherent—while addressing the unique needs of an industry. When tenants deploy a vertical, they get Canon-quality design without hiring a designer.

## Depends On (Understanding-Critical)

| Dependency | Why It Matters |
|------------|----------------|
| `@create-something/components` | Shared UI components (headers, cards, forms) |
| `packages/templates-platform` | Multi-tenant infrastructure and routing |
| **SvelteKit** | Framework for all templates |
| **Tailwind CSS** | Structure utilities |
| **Canon tokens** | Aesthetic consistency (`--color-*`, `--space-*`, etc.) |
| **Cloudflare Pages** | Edge deployment |

## Enables Understanding Of

| Consumer | What This Package Clarifies |
|----------|----------------------------|
| **Tenants** | What templates are available for their industry |
| **Template developers** | How to create industry-specific variations |
| **Agency** | How Canon scales across verticals |
| **The field** | Industry-specific design patterns |

## Internal Structure

```
packages/verticals/
├── professional-services/   → Law, consulting, B2B services
├── medical-practice/        → Healthcare, dental, clinics
├── restaurant/              → Food service, hospitality
├── creative-agency/         → Design studios, agencies
├── creative-portfolio/      → Individual portfolios
├── architecture-studio/     → Architecture firms
├── law-firm/                → Legal practices
├── personal-injury/         → PI law specialty
└── shared/                  → Common components across verticals
```

Each vertical follows the same structure:
```
{vertical}/
├── src/
│   ├── lib/
│   │   └── config/          # Template configuration
│   └── routes/              # SvelteKit pages
│       ├── +layout.svelte   # Layout with site config
│       ├── +page.svelte     # Homepage
│       ├── about/           # About page
│       ├── services/        # Services listing
│       ├── contact/         # Contact form
│       └── projects/        # Portfolio (if applicable)
├── static/                  # Assets (logo, images)
├── svelte.config.js         # SvelteKit + adapter-static
├── tailwind.config.js       # Tailwind + Canon tokens
└── package.json
```

## Available Templates

| Vertical | Description | Status | Template ID |
|----------|-------------|--------|-------------|
| `professional-services` | Law firms, consulting, B2B services | Production | `tpl_professional_services` |
| `medical-practice` | Healthcare, dental, medical clinics | Production | `tpl_medical_practice` |
| `restaurant` | Restaurants, cafes, food service | Production | `tpl_restaurant` |
| `creative-agency` | Design agencies, studios | Development | `tpl_creative_agency` |
| `creative-portfolio` | Individual creative portfolios | Development | `tpl_creative_portfolio` |
| `architecture-studio` | Architecture and design firms | Development | `tpl_architecture_studio` |
| `law-firm` | Legal practices | Development | `tpl_law_firm` |
| `personal-injury` | PI law specialty | Development | `tpl_personal_injury` |

## Core Concepts

| Concept | Definition | Where to Find |
|---------|------------|---------------|
| **Vertical** | Industry-specific template implementation | Each directory |
| **Shared Components** | Reusable UI across verticals | `shared/` |
| **Config Injection** | `window.__SITE_CONFIG__` customization | Router worker |
| **Static Adapter** | Pre-rendered output for R2 deployment | `svelte.config.js` |
| **Canon Alignment** | Design tokens ensure consistency | All templates |

## To Understand This Package, Read

**For Template Structure**:
1. **`professional-services/src/routes/+page.svelte`** — Example homepage
2. **`professional-services/src/lib/config/site.ts`** — Site configuration
3. **`shared/`** — Common components

**For Deployment**:
1. **`.claude/rules/template-deployment-patterns.md`** — Critical patterns
2. **`packages/templates-platform/README.md`** — Platform architecture

## Critical Paths

### Path 1: Template Development
```
Create new vertical:
  1. Copy structure from professional-services/
  2. Update package.json name and description
  3. Customize routes/ for industry needs
  4. Add industry-specific content
  5. Test with local tenant config
  ↓
Build template:
  pnpm --filter=@create-something/vertical-{name} build
  ↓
Output: .svelte-kit/cloudflare/ ready for R2
```

### Path 2: Template Deployment
```
Build template:
  pnpm --filter=@create-something/vertical-{name} build
  ↓
Upload to R2:
  cd packages/verticals/{name}/.svelte-kit/cloudflare
  find . -type f -print0 | xargs -0 -I{} sh -c \
    'wrangler r2 object put \
    "templates-site-assets/tpl_{name}/latest/${1#./}" \
    --file="$1"' _ {}
  ↓
Verify deployment:
  Visit: {subdomain}.createsomething.space
  Check: Config injection, asset loading, routing
```

### Path 3: Tenant Customization
```
Tenant signs up → selects vertical
  ↓
Router worker loads tenant config from D1
  {
    "name": "WORKWAY Architects",
    "tagline": "Design that cares",
    "colors": {
      "primary": "#2563eb",
      "secondary": "#64748b"
    },
    "contact": {
      "email": "hello@workway.com",
      "phone": "(555) 123-4567"
    }
  }
  ↓
Inject into HTML as window.__SITE_CONFIG__
  ↓
SvelteKit reads config and merges with defaults
  ↓
Renders personalized site with tenant branding
```

## Shared Components

Common UI components live in `shared/` and are imported by all verticals:

| Component | Purpose | Used By |
|-----------|---------|---------|
| `Header.svelte` | Site navigation with logo + menu | All verticals |
| `Footer.svelte` | Site footer with links + copyright | All verticals |
| `Hero.svelte` | Homepage hero section | Most verticals |
| `ServiceCard.svelte` | Service listing card | Professional services, medical |
| `ProjectCard.svelte` | Portfolio project card | Creative, architecture |
| `ContactForm.svelte` | Contact form with validation | All verticals |
| `TeamMember.svelte` | Team member profile | Professional services, medical |

**Import pattern**:
```svelte
<script lang="ts">
  import { Header, Footer, Hero } from '@create-something/verticals-shared';
</script>
```

## Config Structure

Each vertical has default config that merges with tenant customization:

```typescript
// src/lib/config/site.ts
export const defaultConfig = {
  name: 'Your Firm Name',
  tagline: 'Your professional tagline',
  description: 'Industry-specific description',
  colors: {
    primary: '#000000',
    secondary: '#ffffff'
  },
  contact: {
    email: 'hello@example.com',
    phone: '(555) 123-4567',
    address: '123 Main St, City, State 12345'
  },
  social: {
    linkedin: '',
    twitter: '',
    instagram: ''
  },
  features: [
    // Industry-specific features
  ]
};
```

**Client hydration**:
```svelte
<script lang="ts">
  import { siteConfig } from '$lib/stores/config';

  // Reads window.__SITE_CONFIG__ and merges with defaults
  const config = $siteConfig;
</script>

<h1>{config.name}</h1>
<p>{config.tagline}</p>
```

## Vertical-Specific Patterns

### Professional Services (Law, Consulting, B2B)
**Focus**: Trust, expertise, professionalism
**Key pages**: Services, Team, Case Studies, Contact
**Design**: Conservative, serif typography, subtle color
**Content**: Practice areas, attorney bios, testimonials

### Medical Practice (Healthcare, Dental)
**Focus**: Care, accessibility, credibility
**Key pages**: Services, Team, Insurance, Contact
**Design**: Clean, approachable, WCAG AAA compliant
**Content**: Services offered, provider credentials, patient info

### Restaurant (Food Service, Hospitality)
**Focus**: Atmosphere, menu, experience
**Key pages**: Menu, Gallery, Reservations, Contact
**Design**: Visual, appetizing imagery, large photos
**Content**: Menu items, chef bio, location, hours

### Creative Agency (Design, Studios)
**Focus**: Portfolio, creativity, process
**Key pages**: Work, Services, Team, Contact
**Design**: Bold, visual, unique layouts
**Content**: Project showcases, design process, case studies

### Creative Portfolio (Individual)
**Focus**: Personal brand, work showcase
**Key pages**: Projects, About, Contact
**Design**: Minimal, work-first, unique aesthetic
**Content**: Project descriptions, process, contact info

## Build Configuration

All verticals use `adapter-static` for pre-rendered output:

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: '200.html',  // SPA fallback, NOT index.html
      precompress: false,
      strict: false
    })
  }
};
```

**Why `fallback: '200.html'`**: Preserves pre-rendered `index.html` while enabling client-side routing. See `.claude/rules/template-deployment-patterns.md` Pattern 2.

## Styling Approach

**Principle**: Tailwind for structure, Canon for aesthetics.

```svelte
<section class="flex flex-col gap-8 p-8 hero-section">
  <h1 class="heading-primary">{config.name}</h1>
  <p class="text-secondary">{config.tagline}</p>
</section>

<style>
  .hero-section {
    background: var(--color-bg-pure);
    border-bottom: 1px solid var(--color-border-default);
  }

  .heading-primary {
    font-size: var(--text-h1);
    color: var(--color-fg-primary);
  }

  .text-secondary {
    color: var(--color-fg-secondary);
  }
</style>
```

**Canon tokens used**:
- Colors: `--color-bg-*`, `--color-fg-*`, `--color-border-*`
- Spacing: `--space-sm`, `--space-md`, `--space-lg`
- Typography: `--text-h1`, `--text-body`, etc.
- Borders: `--radius-md`, `--radius-lg`
- Motion: `--duration-micro`, `--ease-standard`

## Hermeneutic Function

```
.ltd (Canon) ──────────────────────────────────────┐
    │                                               │
    ▼                                               │
verticals (Industry) ◄── "Does this serve clients?" │
    │                                               │
    ├──► Serves templates-platform tenants          │
    ├──► Tests Canon in real contexts               │
    ├──► Validates agency patterns                  │
    │                                               │
    └──► Discovers industry gaps → returns to .ltd ─┘
```

**The loop**:
1. `.ltd` defines design principles
2. `verticals` apply to specific industries
3. Client needs reveal where Canon doesn't fit
4. Gaps feed back to `.ltd` for principle refinement
5. Refined principles make verticals better

## Common Tasks

| Task | Command |
|------|---------|
| Create new vertical | Copy `professional-services/` structure |
| Start dev server | `pnpm --filter=@create-something/vertical-{name} dev` |
| Build template | `pnpm --filter=@create-something/vertical-{name} build` |
| Deploy to R2 | See deployment script in `.claude/rules/template-deployment-patterns.md` |
| Test with config | Inject `window.__SITE_CONFIG__` in dev console |
| Add shared component | Create in `shared/`, import in vertical |

## Quality Checklist

Before deploying a new vertical:

**Content**:
- [ ] Default content is generic (no specific company names)
- [ ] Placeholder images use proper aspect ratios
- [ ] All links work (no 404s)

**Configuration**:
- [ ] `svelte.config.js` uses `fallback: '200.html'`
- [ ] Config store reads `window.__SITE_CONFIG__`
- [ ] Defaults merge correctly with tenant config

**Styling**:
- [ ] Canon tokens used (no hardcoded colors/spacing)
- [ ] Responsive design works (mobile, tablet, desktop)
- [ ] WCAG AA contrast ratios throughout
- [ ] Reduced motion respected

**Build**:
- [ ] Build completes without errors
- [ ] No "Overwriting index.html" warning
- [ ] `_app/immutable/` assets have cache headers
- [ ] Favicon and meta tags present

## Deployment Verification

After uploading to R2:

```bash
# Check single vertical
curl -I https://{subdomain}.createsomething.space
curl -I https://{subdomain}.createsomething.space/_app/immutable/entry/app.js

# Verify config injection
curl https://{subdomain}.createsomething.space | grep "__SITE_CONFIG__"

# Test SPA routing
curl -I https://{subdomain}.createsomething.space/about
# Should return 200, not 404
```

## Adding a New Vertical

**Step 1**: Copy structure
```bash
cp -r packages/verticals/professional-services packages/verticals/{new-vertical}
```

**Step 2**: Update `package.json`
```json
{
  "name": "@create-something/vertical-{new-vertical}",
  "description": "{Industry} vertical template"
}
```

**Step 3**: Customize routes
- Update `+page.svelte` for industry
- Add/remove pages as needed
- Update navigation links

**Step 4**: Update default config
```typescript
// src/lib/config/site.ts
export const defaultConfig = {
  name: 'Your {Industry} Name',
  // Industry-specific fields
};
```

**Step 5**: Build and test locally
```bash
pnpm --filter=@create-something/vertical-{new-vertical} dev
```

**Step 6**: Deploy to R2
Follow deployment script from `.claude/rules/template-deployment-patterns.md`

## References

- **[Template Deployment Patterns](../../.claude/rules/template-deployment-patterns.md)** — Critical deployment patterns
- **[CSS Canon](../../.claude/rules/css-canon.md)** — Design tokens reference
- **`packages/templates-platform`** — Multi-tenant infrastructure

---

*Last validated: 2025-12-29*

**This UNDERSTANDING.md follows the "Less, but better" principle—document what's critical to understand, not every detail. When you need deeper knowledge, follow the references to source files.**
