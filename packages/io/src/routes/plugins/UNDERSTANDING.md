# Plugins Feature UNDERSTANDING.md

## Overview

The plugins feature on `/plugins` showcases CREATE SOMETHING's Claude Code plugins—extensible tools built around the Subtractive Triad (DRY → Rams → Heidegger). This is a **documentation and discovery system**, not a marketplace. Plugins are distributed via the Claude Code marketplace and installed by users into their local environments.

## Critical Path: User Discovers → Installs → Uses Plugin

```
User visits /plugins
    ↓
List view: browse/filter all plugins
    ↓
Detail view (/plugins/[slug]): learn about plugin
    ↓
Copy install command
    ↓
User runs in Claude Code CLI
```

## Core Files

### Entry Points

| File | Purpose | Key Responsibility |
|------|---------|-------------------|
| `+page.svelte` | Plugins list | Display all plugins, category filtering, quick-start guide |
| `+page.server.ts` | List load function | Fetch plugins, extract unique categories |
| `[slug]/+page.svelte` | Plugin detail | Display plugin info, installation steps, try examples |
| `[slug]/+page.server.ts` | Detail load function | Fetch specific plugin, return 404 if not found |

### Configuration & Types

| File | Purpose | Content |
|------|---------|---------|
| `$lib/config/plugins.ts` | Plugin registry | Single source of truth: PLUGINS array + query functions |
| `$lib/types/plugins.ts` | TypeScript definitions | Plugin interface, response types, user plugin schema |
| `$lib/components/plugins/PluginCard.svelte` | Reusable component | Card rendering for grid display |

## Data Flow

### List Page Flow (`/plugins`)

```typescript
+page.server.ts load()
    ↓
    imports PLUGINS from config
    ↓
    extracts categories: Array.from(new Set(plugins.map(p => p.category)))
    ↓
    returns { plugins, categories }
    ↓
+page.svelte receives data
    ↓
    state: selectedCategory (null = all)
    ↓
    $derived.by: filteredPlugins based on selectedCategory
    ↓
    render: PluginCard grid with category chips
```

**State Management**:
- `selectedCategory`: User's active filter (local state, no persistence)
- `copiedMarketplace`, `copiedInstallAll`: Copy button feedback states (2s timeout)

**User Interactions**:
- Click category chip → update `selectedCategory` → re-filter plugins
- Click copy button → copy command to clipboard → show ✓ for 2s

### Detail Page Flow (`/plugins/[slug]`)

```typescript
[slug]/+page.server.ts load({ params })
    ↓
    const plugin = getPlugin(params.slug)
    ↓
    if (!plugin) throw error(404, 'Plugin not found')
    ↓
    return { plugin }
    ↓
[slug]/+page.svelte receives data
    ↓
    derives: relatedPlugins = getRelatedPlugins(plugin.slug)
    ↓
    render: Hero → Features → What You Get → Installation → Try It → Related
```

**Related Plugins Logic**:
- Plugin declares `relatedPlugins: string[]` (array of slugs)
- `getRelatedPlugins()` function resolves slugs to full Plugin objects
- Filtered to exclude undefined results (broken references)

### Configuration-Driven Plugin List

**Why this approach**:
- Single source of truth (`PLUGINS` array in `config/plugins.ts`)
- Easy to add/remove/update plugins without touching routes
- Slugs in config MUST match marketplace.json in `createsomethingtoday/claude-plugins` repo

**Plugin Schema**:
```typescript
interface Plugin {
  slug: string;                    // Unique identifier, URL-safe
  name: string;                    // Display name
  description: string;             // One-line summary
  category: string;                // Design|Code Review|Content|Documentation
  tags: string[];                  // Searchable tags
  features: string[];              // Bullet-point feature list
  provides?: PluginProvides;       // Commands, agents, skills, hooks
  version?: string;                // Semantic version
  lastUpdated?: string;            // ISO date string
  examples?: PluginExample[];      // Prompt examples for "Try It"
  relatedPlugins?: string[];       // Slugs of related plugins
}

interface PluginProvides {
  commands?: { name: string; description: string }[];
  agents?: { name: string; description: string }[];
  skills?: { name: string; description: string }[];
  hooks?: { name: string; description: string }[];
}
```

## Key Components

### PluginCard.svelte
- **Location**: `$lib/components/plugins/PluginCard.svelte`
- **Props**: `plugin: Plugin`
- **Renders**: Category badge, plugin name, description, tags, explore link
- **Hover**: Border emphasis + arrow translation (4px)
- **Link**: Routes to `/plugins/{plugin.slug}`

### List Page Sections

1. **Hero Section** (pt-24 pb-16)
   - Page title: "Plugins"
   - Description: "Claude Code plugins for subtractive design methodology"
   - Quick Start box: Two copy-to-clipboard commands
     - Add marketplace: `/plugin marketplace add createsomethingtoday/claude-plugins`
     - Install all: `&` chained install commands for every plugin

2. **Category Filter** (py-12)
   - Chips: "All (N)" + category name with count
   - Active state styling
   - Click updates `selectedCategory`

3. **Plugins Grid** (py-16)
   - 3-column grid on lg, 2-column on md, 1-column on sm
   - PluginCard components
   - Staggered reveal animation (delay per index)
   - Empty state message if no plugins in category

### Detail Page Sections

1. **Back Navigation** (pt-24)
   - Link back to `/plugins` list

2. **Hero Section** (pt-8 pb-16)
   - Category badge, version badge, last updated date
   - Plugin name (--text-display size)
   - Description (--text-body-lg)
   - Tag list

3. **Features Section** (py-16)
   - Bulleted list with ✓ prefix
   - Card styling

4. **What You Get Section** (conditional, py-16)
   - Renders if `plugin.provides` exists
   - Grid of categories: Commands, Agents, Skills, Hooks
   - Each item has name (monospace) + description

5. **Installation Section** (py-16)
   - 3-step numbered process
   - Step 1: Add marketplace (copy button)
   - Step 2: Install plugin (copy button)
   - Step 3: Start using

6. **Try It Section** (conditional, py-16)
   - Renders if `plugin.examples` exists
   - List of copyable example prompts
   - Each example has prompt code + description

7. **Related Plugins Section** (conditional, py-16)
   - Grid of related plugin cards
   - Links to detail pages
   - Hover: border emphasis + arrow translation

## Styling Architecture

**Canon Compliance**: All design tokens via CSS custom properties from `@create-something/components/styles/canon.css`

| Token Type | Usage |
|------------|-------|
| `--color-*` | All colors (no hardcoded hex) |
| `--radius-*` | Border radius (sm/md/lg/full) |
| `--space-*` | All spacing (golden ratio) |
| `--text-*` | Typography scale |
| `--duration-*` | Animation timing |
| `--ease-standard` | Standard easing |

**Key Classes**:
- `.page-title`: Display size, bold, primary color
- `.page-description`: Body-lg, tertiary color
- `.quick-start`: Surface bg, subtle border, md padding
- `.command-box`: Subtle bg, flex row, copy button on right
- `.category-chip`: Subtle bg, hover emphasis, active state
- `.section-card`: Surface bg, border, lg padding
- `.animate-reveal`: Entrance animation with staggered delay

**Motion**:
- Category chips: `--duration-micro` (200ms) on hover
- Copy buttons: Color transition on hover
- Related cards: `--duration-micro` transform on hover

## Query Functions

### $lib/config/plugins.ts

```typescript
getPlugin(slug: string): Plugin | undefined
// Returns single plugin or undefined

getPluginsByCategory(category: string): Plugin[]
// Returns array of plugins in category

getRelatedPlugins(slug: string): Plugin[]
// Resolves relatedPlugins slugs to full Plugin objects
// Used in detail page to display related items
```

## Common Patterns

### Adding a New Plugin

1. Add entry to `PLUGINS` array in `$lib/config/plugins.ts`:
```typescript
{
  slug: 'unique-slug',  // Must be URL-safe
  name: 'Display Name',
  description: 'One-liner description',
  category: 'Category',  // Must match existing category or new
  tags: ['tag1', 'tag2'],
  features: ['Feature 1', 'Feature 2'],
  provides: {
    commands: [{ name: '/cmd', description: 'Does X' }],
    agents: [{ name: 'agent', description: 'Does Y' }],
    skills: [{ name: 'skill', description: 'Does Z' }],
  },
  version: '1.0.0',
  lastUpdated: '2024-12-23',
  examples: [
    { prompt: 'example prompt', description: 'what it does' }
  ],
  relatedPlugins: ['other-slug']
}
```

2. Categories are auto-derived from all plugins' `category` field
3. Slug must match marketplace.json entry in `createsomethingtoday/claude-plugins`

### Updating Plugin Info

1. Edit entry in `PLUGINS` array
2. Update `lastUpdated` field (ISO date string)
3. No route or component changes needed
4. Changes appear immediately on both list and detail pages

### Handling Missing Plugin

- Detail page: `getPlugin()` returns undefined → `throw error(404, 'Plugin not found')`
- SvelteKit renders default error page
- User sees 404 with back link

## Related Systems

### Upstream Dependency

- **Claude Code Marketplace**: Plugins must be registered in `createsomethingtoday/claude-plugins` repo
- **Slug Correspondence**: Slug in `PLUGINS` array must match marketplace entry
- Mismatch = user can't install (marketplace won't find slug)

### Consumer Interface

- **List Page**: Provides quick-start and browsing
- **Detail Page**: Provides installation instructions
- **Copy-to-Clipboard**: Users paste commands into Claude Code CLI

## Performance Notes

- **Static Data**: PLUGINS is imported at build time, no runtime fetch
- **Category Extraction**: Array.from(new Set()) on server load (cheap)
- **Client-Side Filtering**: Filtered in $derived.by (reactive, not persisted)
- **No API Calls**: This is a purely static feature

## Accessibility

- **Color Contrast**: All tokens meet WCAG AA (4.5:1+)
- **Semantic HTML**: Proper heading hierarchy (h1 → h2 → h3)
- **Focus States**: via Canon `--color-focus` token (WCAG AA compliant 5.28:1)
- **Reduced Motion**: @media (prefers-reduced-motion: reduce) disables .animate-reveal
- **Copy Buttons**: aria-label on all copy buttons
- **Links**: Back navigation explicit, related plugin cards are links

## Anti-Patterns to Avoid

1. **Hardcoding categories**: Let them derive from plugin.category
2. **Manually managing related plugins**: Use slug arrays + getRelatedPlugins()
3. **Storing selectedCategory in URL**: Current pattern (state) is correct
4. **Inline styles for colors**: Always use CSS custom properties
5. **Missing plugin.version/lastUpdated**: These are important for credibility
6. **Copy button without timeout reset**: Must clear feedback state after 2s

## Testing Considerations

- **Happy Path**: Browse all plugins → filter by category → click to detail → copy install command
- **Edge Cases**: Missing plugin (404), empty category, no related plugins, no provides/examples
- **Interactivity**: Category filter resets on clear, copy buttons work and show feedback
- **Styling**: Verify Canon tokens applied, animations respect prefers-reduced-motion
