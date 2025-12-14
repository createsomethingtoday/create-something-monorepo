# Template Architecture

## The Principle

**Building templates that adapt without complexity.**

Good template architecture separates the unchangeable from the configurable, enabling adaptation while maintaining integrity.

## The Three Layers

Every template has three distinct layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                        STRUCTURE                                │
│              Routing, data flow, security, core patterns       │
│                       (Template owns this)                      │
├─────────────────────────────────────────────────────────────────┤
│                      CONFIGURATION                              │
│           Content, colors, toggles, text, images               │
│                       (Client owns this)                        │
├─────────────────────────────────────────────────────────────────┤
│                        EXTENSION                                │
│          Custom components, integrations, new pages            │
│                      (Developer owns this)                      │
└─────────────────────────────────────────────────────────────────┘
```

## Structure: The Unchangeable Core

Structure defines what the template IS:

### Route Architecture

```
src/routes/
├── +layout.svelte          # Global layout (structure)
├── +page.svelte            # Homepage (structure)
├── about/+page.svelte      # About page (structure)
├── services/+page.svelte   # Services grid (structure)
├── contact/+page.svelte    # Contact form (structure)
└── [slug]/+page.svelte     # Dynamic pages (extension point)
```

**Routes are structure. You cannot add `/products` to a services template without extending.**

### Component Relationships

```typescript
// Structure: These components exist and compose this way
<Layout>
  <Navigation />
  <slot />
  <Footer />
</Layout>

// Structure: Navigation always contains these elements
<Navigation>
  <Logo />
  <NavLinks />
  <CTA />
</Navigation>
```

**Component architecture is structure. Changing composition = new template.**

### Data Flow

```typescript
// Structure: Config flows from platform to components
export const load = async ({ platform }) => {
  const config = await getConfig(platform);
  return { config };
};

// Structure: Components receive config, not fetch it
export let { config } = $props();
```

**Data flow patterns are structure. They ensure consistency across instances.**

## Configuration: Declarative Customization

Configuration is data, not code:

### Type-Safe Configuration

```typescript
interface SiteConfig {
  // Identity
  name: string;
  tagline: string;
  logo?: string;

  // Content
  hero: {
    headline: string;
    subheadline: string;
    cta: { text: string; url: string };
  };

  // Style (within Canon constraints)
  accent: 'blue' | 'green' | 'purple' | 'amber';

  // Features
  features: {
    newsletter: boolean;
    contactForm: boolean;
    analytics: boolean;
  };

  // Meta
  seo: {
    title: string;
    description: string;
    image?: string;
  };
}
```

### Configuration Sources

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Default   │ ──→ │   Tenant    │ ──→ │   Runtime   │
│   Config    │     │   Config    │     │   Config    │
└─────────────┘     └─────────────┘     └─────────────┘
    (template)         (database)        (injected)
```

1. **Default Config**: Template's baseline
2. **Tenant Config**: Client's customizations (D1)
3. **Runtime Config**: Injected into HTML (SSR)

### Configuration Injection

```typescript
// Router Worker injects config into HTML
const html = await fetchTemplate(templateId);
const configScript = `<script>window.__SITE_CONFIG__=${JSON.stringify(config)};</script>`;
return new Response(html.replace('</head>', `${configScript}</head>`));
```

```svelte
<!-- Component reads from injected config -->
<script>
  import { browser } from '$app/environment';

  let config = $state(defaultConfig);

  if (browser && window.__SITE_CONFIG__) {
    config = mergeConfigs(defaultConfig, window.__SITE_CONFIG__);
  }
</script>
```

## Extension: Controlled Flexibility

Extensions add capability without breaking structure:

### Extension Points

```typescript
// Defined extension points
interface TemplateExtensions {
  // New route types
  customRoutes?: {
    slug: string;
    component: Component;
  }[];

  // Additional components
  headerExtras?: Component;
  footerExtras?: Component;

  // Integration hooks
  onPageLoad?: (route: string) => void;
  onFormSubmit?: (data: FormData) => void;
}
```

### Extension Boundaries

```markdown
✓ Can Add:
- New pages via [slug] route
- Components in defined slots
- Integration hooks
- Custom CSS (scoped)

✗ Cannot Change:
- Navigation structure
- Footer layout
- Data flow patterns
- Core component behavior
```

## Asset Architecture

### Static Assets

```
R2 Bucket: templates-site-assets/
└── {template_id}/
    └── {version}/
        ├── index.html          # Pre-rendered
        ├── 200.html            # SPA fallback
        ├── favicon.svg
        └── _app/
            └── immutable/      # Hashed, cacheable forever
                ├── entry/
                ├── chunks/
                └── assets/
```

### Content Assets

```
R2 Bucket: tenant-assets/
└── {tenant_id}/
    ├── logo.svg
    ├── hero.jpg
    ├── team/
    │   ├── alice.jpg
    │   └── bob.jpg
    └── projects/
        ├── project-a.jpg
        └── project-b.jpg
```

### Asset Resolution

```typescript
// Template assets (versioned)
const templateAsset = `${TEMPLATE_BUCKET}/${templateId}/${version}/${path}`;

// Tenant assets (client-owned)
const tenantAsset = `${TENANT_BUCKET}/${tenantId}/${path}`;

// Fallback chain
async function resolveAsset(path: string, tenantId: string) {
  // Try tenant asset first
  const tenantAsset = await getTenantAsset(tenantId, path);
  if (tenantAsset) return tenantAsset;

  // Fall back to template default
  return getTemplateAsset(path);
}
```

## Multi-Tenancy Architecture

### Tenant Isolation

```typescript
// Each tenant has isolated:
interface Tenant {
  id: string;
  subdomain: string;
  templateId: string;
  templateVersion: string;
  config: SiteConfig;
  createdAt: Date;
  updatedAt: Date;
}

// Requests are routed by subdomain
// subdomain.createsomething.space → tenant config → template render
```

### Request Flow

```
1. Request arrives at *.createsomething.space/*
2. Router Worker extracts subdomain
3. Lookup tenant in D1 (cached in KV)
4. Fetch template assets from R2
5. Inject tenant config
6. Return rendered response
```

### Cache Strategy

```typescript
// Tenant config: Cache in KV (invalidate on update)
const cacheKey = `tenant:${subdomain}`;
let config = await KV.get(cacheKey, 'json');
if (!config) {
  config = await D1.queryTenant(subdomain);
  await KV.put(cacheKey, JSON.stringify(config), { expirationTtl: 3600 });
}

// Template assets: Cache forever (immutable hashes)
// Tenant assets: Cache with short TTL (may update)
```

## Build Architecture

### Template Build

```typescript
// svelte.config.js for templates
export default {
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: '200.html',  // NOT index.html
      precompress: false,
      strict: false
    }),
    prerender: {
      entries: ['/', '/about', '/services', '/contact']
    }
  }
};
```

### Pre-rendering Strategy

```markdown
Pre-render (SSG):
- Homepage
- About
- Services
- Contact
- Any static content pages

SPA Fallback (CSR):
- Dynamic routes ([slug])
- Client-specific content
- Interactive features
```

## Configuration Schema

### Validation

```typescript
import { z } from 'zod';

const SiteConfigSchema = z.object({
  name: z.string().min(1).max(100),
  tagline: z.string().max(200),
  accent: z.enum(['blue', 'green', 'purple', 'amber']),
  hero: z.object({
    headline: z.string().min(1).max(100),
    subheadline: z.string().max(200),
    cta: z.object({
      text: z.string().min(1).max(30),
      url: z.string().url()
    })
  }),
  // ... more fields
});

// Validate on save
function updateConfig(tenantId: string, newConfig: unknown) {
  const validated = SiteConfigSchema.parse(newConfig);
  return saveConfig(tenantId, validated);
}
```

### Defaults

```typescript
const defaultConfig: SiteConfig = {
  name: 'WORKWAY',
  tagline: 'Professional services',
  accent: 'blue',
  hero: {
    headline: 'Welcome',
    subheadline: 'Professional services you can trust',
    cta: { text: 'Get Started', url: '/contact' }
  },
  features: {
    newsletter: true,
    contactForm: true,
    analytics: false
  }
};

// Merge with tenant config
function mergeConfigs(defaults: SiteConfig, tenant: Partial<SiteConfig>): SiteConfig {
  return deepMerge(defaults, tenant);
}
```

---

## Reflection

Before moving on:

1. In your current projects, what's structure vs. what's configuration?
2. Where are your extension points? Are they explicit?
3. How would a template update flow to deployed instances?

**Architecture is the art of making the right things easy and the wrong things hard.**

---

## Cross-Property References

> **Canon Reference**: This architecture philosophy is [Constraint as Liberation](https://createsomething.ltd/patterns/constraint-as-liberation)—boundaries that guide toward correct outcomes.
>
> **Canon Reference**: Template extension points embody [Principled Defaults](https://createsomething.ltd/patterns/principled-defaults)—structure that enables without dictating.
>
> **Practice**: Study the professional-services vertical (`packages/verticals/professional-services/`) for real template architecture patterns.
