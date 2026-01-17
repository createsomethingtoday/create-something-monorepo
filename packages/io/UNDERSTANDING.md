# Understanding: @create-something/io

> **The research platform—Being-as-Document that publishes rigorous inquiry into AI-native development.**

## Ontological Position

**Mode of Being**: `.io` — Being-as-Document

This is where theory lives. When we discover something worth knowing, `.io` documents it. Papers on Code Mode, hermeneutic analysis, Cloudflare patterns—all originate or culminate here. `.io` bridges canon (`.ltd`) and practice (`.space`), providing the intellectual framework that makes both meaningful.

## Depends On (Understanding-Critical)

| Dependency | Why It Matters |
|------------|----------------|
| `@create-something/components` | Shared UI for paper display |
| `@create-something/tufte` | Visualization for experiment metrics |
| `marked` | Markdown → HTML for paper content |
| `highlight.js` | Code syntax highlighting in papers |
| Cloudflare Pages + D1 | Edge deployment with database for experiments |

## Enables Understanding Of

| Consumer | What This Package Clarifies |
|----------|----------------------------|
| `@create-something/space` | Theoretical grounding for practical experiments |
| `@create-something/agency` | Research-backed patterns for client work |
| External readers | AI-native development methodology |
| The field | Novel contributions to agentic development |

## Internal Structure

```
src/routes/
├── +page.svelte              → Homepage: featured research
├── experiments/              → Published papers/experiments
│   ├── +page.svelte          → Paper listing
│   ├── [slug]/               → Individual paper pages
│   └── +layout.svelte        → Paper layout with navigation
├── methodology/              → Research methodology explanation
├── categories/               → Paper categorization
├── plugins/                  → Plugin marketplace
│   ├── +page.svelte          → Plugin listing (filterable by category)
│   ├── [slug]/               → Individual plugin detail pages
│   └── +page.server.ts       → Load plugins from config
├── admin/                    → Content management
│   ├── experiments/          → CRUD for papers
│   ├── analytics/            → Tufte dashboard for metrics
│   ├── agent-drafts/         → AI-generated draft review
│   └── subscribers/          → Newsletter management
└── subscribe/                → Newsletter signup

src/lib/
├── components/
│   └── plugins/              → Plugin-specific components
│       └── PluginCard.svelte → Reusable card in listing
├── config/
│   └── plugins.ts            → Plugin catalog (single source of truth)
├── types/
│   └── plugins.ts            → Type definitions for plugins
└── utils/                    → Markdown processing, etc.
```

## Critical Paths: Plugin Feature

### Path 1: User Views Plugin Listing
```
GET /plugins
  ↓
src/routes/plugins/+page.server.ts (load)
  ├─ Imports PLUGINS from src/lib/config/plugins.ts
  ├─ Extracts unique categories
  └─ Returns { plugins, categories }
  ↓
src/routes/plugins/+page.svelte (render)
  ├─ Receives plugins & categories from PageData
  ├─ Uses $state(selectedCategory) for filtering
  ├─ Renders PluginCard component per plugin
  └─ Hero section: quick-start with marketplace command
```

**Key Code**: `/plugins` → Hero command display + category filter + grid of PluginCard

### Path 2: User Views Individual Plugin Detail
```
GET /plugins/[slug]
  ↓
src/routes/plugins/[slug]/+page.server.ts (load)
  ├─ Extracts slug from params
  ├─ Calls getPlugin(slug) from config/plugins.ts
  ├─ Throws 404 if not found
  └─ Returns { plugin }
  ↓
src/routes/plugins/[slug]/+page.svelte (render)
  ├─ Displays plugin hero (name, description, tags, category)
  ├─ Features section (bulleted list)
  ├─ Conditional "What You Get" section
  │  ├─ Renders plugin.provides.commands (if any)
  │  ├─ Renders plugin.provides.agents (if any)
  │  ├─ Renders plugin.provides.skills (if any)
  │  └─ Renders plugin.provides.hooks (if any)
  ├─ Installation steps (3-step guide)
  ├─ Copy-to-clipboard for CLI commands
  └─ SEO/OpenGraph metadata
```

**Key Code**: `/plugins/[slug]` → Hero + features + "What You Get" + installation guide + CLI copy buttons

### Path 3: API Endpoint for Plugin Catalog
```
GET /api/plugins
  ↓
src/routes/api/plugins/+server.ts
  ├─ Imports PLUGINS from src/lib/config/plugins.ts
  └─ Returns JSON: { plugins: PLUGINS }
```

**Use Case**: External tools (Claude Code UI, marketplace clients) fetch plugin list programmatically.

## To Understand This Package, Read

**For Plugin Feature**:
1. **`src/lib/config/plugins.ts`** — Plugin catalog definition (4 core plugins)
2. **`src/routes/plugins/+page.svelte`** — Listing page with filtering
3. **`src/routes/plugins/[slug]/+page.svelte`** — Detail page with installation guide
4. **`src/lib/types/plugins.ts`** — Type definitions (Plugin, UserPlugin, etc.)

**For Paper System**:
1. **`src/routes/experiments/[slug]/+page.svelte`** — How papers are rendered
2. **`src/routes/methodology/+page.svelte`** — Research methodology
3. **`src/routes/admin/experiments/+page.svelte`** — How papers are managed

## Key Concepts

| Concept | Definition | Where to Find |
|---------|------------|---------------|
| Plugin | Isolated skill/agent/command that extends Claude Code | `/plugins` listing |
| Plugin Catalog | Four curated plugins (canon, hermeneutic-review, voice-validator, understanding-graphs) | `src/lib/config/plugins.ts` |
| Plugin Metadata | name, description, category, tags, features, provides (commands/agents/skills/hooks) | Plugin interface |
| Plugin Detail | Full description, features list, "What You Get", installation instructions | `/plugins/[slug]` |
| Experiment | A documented research inquiry with hypothesis and results | `/experiments/[slug]` |
| Category | Thematic grouping of plugins or papers | `/categories` or `/plugins` filter |
| Methodology | How we conduct and document research | `/methodology` |
| Agent Drafts | AI-generated paper drafts for review | `/admin/agent-drafts` |

## This Package Helps You Understand

- **Research methodology**: How CREATE Something conducts inquiry
- **Paper structure**: Hypothesis → Method → Results → Discussion
- **Plugin ecosystem**: How Claude Code extensions are documented and discovered
- **Theory ↔ practice**: How papers connect to `.space` experiments
- **Documentation as practice**: Writing as part of the hermeneutic cycle

## Common Tasks

| Task | Start Here |
|------|------------|
| Read a paper | `/experiments/[slug]` |
| Create a new paper | `/admin/experiments/new` |
| View analytics | `/admin/analytics` |
| Review AI drafts | `/admin/agent-drafts` |
| Add a new plugin | Modify `src/lib/config/plugins.ts` |
| View plugins list | `/plugins` |
| View plugin details | `/plugins/[slug]` |

## Plugin Architecture

### Plugin Catalog (Single Source of Truth)
**File**: `src/lib/config/plugins.ts`

```typescript
export const PLUGINS: Plugin[] = [
  {
    slug: 'canon',                    // URL identifier
    name: 'Canon',                    // Display name
    description: '...',               // One-liner
    category: 'Design',               // Filtering category
    tags: ['design', ...],            // Multiple tags
    features: ['...', '...'],         // Bulleted feature list
    provides: {                       // Optional: what the plugin adds
      commands: [{ name, description }],
      agents: [{ name, description }],
      skills: [{ name, description }],
      hooks: [{ name, description }]
    }
  },
  // ... more plugins
];
```

**Helper Functions**:
- `getPlugin(slug)` → Find plugin by slug
- `getPluginsByCategory(category)` → Filter by category

### Plugin Type System
**File**: `src/lib/types/plugins.ts`

Defines:
- `Plugin` — Catalog entry (name, description, metadata)
- `PluginProvides` — What commands/agents/skills/hooks plugin provides
- `UserPlugin` — User's enabled/disabled plugin state
- `PluginExportResponse` — API response for exporting plugin data

## Routes Deep Dive

### `/plugins` (Listing)
**Route**: `src/routes/plugins/+page.svelte`

**Features**:
1. **Hero Section**: Title, description, quick-start command (copy-to-clipboard)
2. **Category Filter**: Buttons to filter by category (All, Design, Code Review, Content, Documentation)
3. **Plugin Grid**: 3-column responsive grid of PluginCard components
4. **PluginCard**: Name, description, tags, category badge, "Explore →" link

**Functionality**:
- `selectedCategory` state for filtering
- `filteredPlugins` derived state
- Copy marketplace command button with success feedback
- Responsive: 1 column mobile, 2 columns tablet, 3 columns desktop

**Server Data** (`+page.server.ts`):
- Loads PLUGINS from config
- Extracts and sorts unique categories
- Returns both to page

### `/plugins/[slug]` (Detail)
**Route**: `src/routes/plugins/[slug]/+page.svelte`

**Sections**:
1. **Back Navigation**: ← Link to `/plugins`
2. **Hero**: Category badge, plugin name, description, tags
3. **Features**: Bulleted list of capabilities (with ✓ checkmark)
4. **What You Get** (conditional):
   - Commands (with code formatting)
   - Agents
   - Skills
   - Hooks
   All styled as cards with name and description
5. **Installation** (3-step guide):
   - Step 1: Add marketplace command (copy button)
   - Step 2: Install plugin command (copy button)
   - Step 3: Start using
6. **Metadata**: OpenGraph, Twitter Card, Schema.org (SoftwareApplication)

**Functionality**:
- SEO-rich head metadata
- Copy-to-clipboard for two CLI commands with success feedback
- Staggered animation on sections (delay per section)
- Responsive command boxes (flex-direction: column on mobile)

**Server Data** (`+page.server.ts`):
- Looks up plugin by slug from config
- Throws 404 if not found
- Returns plugin object

### `/api/plugins` (JSON Endpoint)
**Route**: `src/routes/api/plugins/+server.ts`

**Response**:
```json
{
  "plugins": [ /* full PLUGINS array */ ]
}
```

**Use Case**: External tools fetch plugin list via JSON API.

## Component Architecture

### PluginCard.svelte
**File**: `src/lib/components/plugins/PluginCard.svelte`

**Props**: `plugin: Plugin`

**Renders**:
- Heading: Category badge
- Body: Name, description, tags
- Footer: "Explore →" link

**Styling**:
- Links to `/plugins/{plugin.slug}`
- Canvas Cards pattern (surface + border + shadow on hover)
- Tag styling with `text-body-sm`
- Animated arrow on hover (transform: translateX)
- Responsive: fills grid column

## Data Flow

```
User navigates to /plugins
  ↓
PageLoad runs +page.server.ts
  ├─ Import: PLUGINS from src/lib/config/plugins.ts
  ├─ Compute: unique categories
  └─ Return: { plugins, categories }
  ↓
Page component receives PageData
  ├─ Local state: selectedCategory
  ├─ Derived state: filteredPlugins
  └─ Render: PluginCard grid
  ↓
User clicks plugin card → navigates to /plugins/[slug]
  ↓
PageLoad runs [slug]/+page.server.ts
  ├─ Parse: slug from params
  ├─ Query: getPlugin(slug)
  └─ Return: { plugin } or throw 404
  ↓
Detail page component receives plugin
  ├─ Display: hero + features + what-you-get + installation
  ├─ Interaction: copy-to-clipboard buttons
  └─ Meta: SEO tags + OpenGraph
```

## Adding a New Plugin

### Step 1: Define Plugin in Catalog
Edit `src/lib/config/plugins.ts`:
```typescript
{
  slug: 'my-plugin',
  name: 'My Plugin',
  description: 'What it does...',
  category: 'Category Name',
  tags: ['tag1', 'tag2'],
  features: ['Feature 1', 'Feature 2'],
  provides: {
    commands: [{ name: '/my-cmd', description: 'Does X' }],
    agents: [{ name: 'my-agent', description: 'Does Y' }],
    // ... other capabilities
  }
}
```

### Step 2: Automatic Routes
- `/plugins` will include it in listing (auto-filtered by category)
- `/plugins/my-plugin` will render detail page automatically
- `/api/plugins` will include it in JSON response

### Step 3: Link from Elsewhere (Optional)
Add link from paper/methodology if the plugin relates.

## Paper Architecture

### Why Papers Are Static Routes (Not D1)

IO papers contain **interactive Svelte components** that cannot be stored in or rendered from D1:

```svelte
// hermeneutic-spiral-ux/+page.svelte
import { IsometricSpiral, IsometricArchitecture } from '@create-something/components';

const archNodes = [
  { id: 'whatsapp', label: 'WhatsApp', position: { x: -100, y: 0, z: 0 } },
  // 3D diagrams, metric cards, custom visualizations
];
```

This is different from `.space`, which uses D1 for experiment content.

### Content Sources

| Route | Source | Content Type |
|-------|--------|--------------|
| `/papers/{slug}` | Static `.svelte` routes | Rich interactive papers |
| `/experiments/{slug}` | D1 + Static routes | Both D1 and file-based |
| `/api/manifest` | Manifest endpoint | Metadata for search indexing |

### Adding a New Paper

1. **Create static route**: `src/routes/papers/new-paper/+page.svelte`
2. **Update manifest**: `src/routes/api/manifest/+server.ts` - add entry to `PAPERS` array
3. **Search indexing**: Happens automatically via manifest every 6 hours

### The Manifest API

The manifest at `/api/manifest` provides metadata for the unified search indexer:

```typescript
// src/routes/api/manifest/+server.ts
const PAPERS: ContentItem[] = [
  {
    slug: 'hermeneutic-spiral-ux',
    title: 'The Hermeneutic Spiral in UX Design',
    description: 'Applying Heidegger\'s hermeneutic circle to UX design',
    category: 'methodology'
  },
  // ... add new papers here
];
```

The search indexer fetches this manifest instead of querying D1, ensuring only papers with actual routes are indexed.

## Paper Structure

Each paper follows this canonical structure:

```markdown
# [Title]

## Abstract
[150-250 words summarizing contribution]

## The Problem
[What we're investigating and why it matters]

## Methodology
[How we approached the inquiry]

## Results
[What we found, with evidence]

## Discussion
[What it means, limitations, future work]

## Conclusion
[Summary and implications]
```

## Hermeneutic Function

```
.ltd (Canon) ──────────────────────────────────────┐
    │                                               │
    ▼                                               │
.io (Research) ◄── "Is this theoretically sound?"  │
    │                                               │
    ├──► Grounds .space experiments                 │
    ├──► Validates .agency patterns                 │
    ├──► Documents plugins & methodology            │
    │                                               │
    └──► Discovers patterns → returns to .ltd ─────┘
```

## Styling & Theming

All plugin UI uses **Canon tokens** (no hardcoded colors):

| Pattern | Token |
|---------|-------|
| Card backgrounds | `--color-bg-surface` |
| Borders | `--color-border-default` |
| Text (primary) | `--color-fg-primary` |
| Text (secondary) | `--color-fg-secondary` |
| Text (muted) | `--color-fg-muted` |
| Success state | `--color-success` |
| Spacing | `--space-sm`, `--space-md`, `--space-lg` |
| Border radius | `--radius-md`, `--radius-lg` |
| Motion | `--duration-micro`, `--duration-complex`, `--ease-standard` |

**Animations**:
- `.animate-reveal`: Fade in + slide up (staggered per element)
- `.hover` transitions: Color + border changes (200ms)
- Copy button success: Color change + checkmark (immediate)

---

## Related Packages

### `@create-something/space` — Hermeneutic Partner

**Relationship**: Theory ↔ Practice

| Aspect | `.io` (This Package) | `.space` |
|--------|---------------------|----------|
| Mode of Being | Being-as-Document | Being-as-Experience |
| Primary Function | Document methodology | Enable hands-on practice |
| Output | Papers, research | Completed exercises |
| Validation | Theoretical rigor | Empirical success |

**Shared Architecture Patterns**:
- `/experiments/` routes (papers here, lessons there)
- `/methodology/` explaining approach
- `/categories/` for content organization
- Same Canon token system and styling
- Same hermeneutic circle participation

**See**: [`packages/space/UNDERSTANDING.md`](../space/UNDERSTANDING.md)

---

*Last validated: 2025-12-30*

*This UNDERSTANDING.md follows the "Less, but better" principle—document what's critical to understand, not every detail. When you need deeper knowledge, follow the references to source files.*
