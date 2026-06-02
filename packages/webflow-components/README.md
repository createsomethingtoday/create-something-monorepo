# CREATE SOMETHING Canon Webflow Components

React component library for Webflow positioned around Canon parity.

The package currently contains a mix of:
- Canon-parity exports already present in Webflow
- Canon control-plane exports for operator surfaces backed by Cloudflare preview routes
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

## Verify Locally

```bash
pnpm run verify
```

This runs TypeScript and `webflow library bundle --public-path / --no-input` before sharing.

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
| `CanonControlPanel` | `ported` | Composite operator surface for Webflow + Cloudflare demos |
| `OperatingLayerCards` | `ported` | Database / Automation / Judgment layer cards |
| `EvidenceTrail` | `ported` | Grounded evidence list for proof and review surfaces |
| `ArtifactGrid` | `ported` | Client-safe artifact packet with visibility labels |
| `ActionPreview` | `ported` | Preview-only action surface with optional Cloudflare endpoint |
| `ApprovalGate` | `ported` | Human approval boundary for governed actions |
| `AgentDock` | `ported` | Bounded agent dock with optional Cloudflare endpoint |
| `DecisionQueue` | `ported` | Operator decision list with owner and tier metadata |
| `RuntimeStatus` | `ported` | Cloudflare and governance runtime check panel |

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
- `CanonControlPanel`
- `OperatingLayerCards`
- `EvidenceTrail`
- `ArtifactGrid`
- `ActionPreview`
- `ApprovalGate`
- `AgentDock`
- `DecisionQueue`
- `RuntimeStatus`

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

### Marketplace (Group: Marketplace)

| Component | Description | Key Props |
|-----------|-------------|-----------|
| **Template Card** | CMS-bindable marketplace template card | `templateName`, `templateLink`, `primaryImage`, `creatorName`, `creatorIcon`, `popularityScore` |
| **Template Grid** | Worker-backed template search grid | `apiBase`, `categorySlug`, `creatorSlug`, `creatorRecordId`, `scopeOverride`, `initialSort`, `pageSize` |
| **Template Filter Bar** | Worker-backed marketplace filters and pills | `apiBase`, `categorySlug`, `creatorSlug`, `creatorRecordId`, `scopeOverride`, `defaultSort` |
| **Template Search Box** | Shared marketplace search input that routes to the standalone search page or filters the current page | `mode`, `variant`, `searchAction`, `queryParam`, `placeholder`, `showButton` |
| **Template Search Page** | Standalone marketplace search experiment surface with search, filter sidebar, active chips, result grid, and no-results recovery | `apiBase`, `title`, `quickSearches`, `scopeOverride`, `defaultSort`, `noindex` |
| **Template Search Sidebar** | Standalone marketplace sidebar with search, All/Featured/Landing/Free rows, dynamic category counts, and vertical filters | `apiBase`, `title`, `interactionMode`, `countMode`, `showSearch`, `showCategories`, `showCounts` |
| **Template Search Results** | Standalone search results grid with inline no-results recovery | `apiBase`, `creatorSlug`, `creatorRecordId`, `scopeOverride`, `defaultSort`, `pageSize`, `emptyTitle` |
| **Marketplace Landing Hero** | Search-backed landing hero with template search form, popular category suggestions, and native-vs-template-search experiment routing | `apiBase`, `title`, `searchExperience`, `searchAction`, `templateSearchAction`, `queryParam`, `useSearchSuggestions`, `enableAnalytics` |
| **Template Carousel Section** | Worker-backed editorial carousel for marketplace landing sections | `preset`, `title`, `ctaLink`, `scopeOverride`, `sortOverride`, `itemLimit`, `enableAnalytics` |
| **Popular Category Grid** | Search-backed marketplace use-case grid with live counts and optional thumbnails | `apiBase`, `layout`, `categories`, `useSearchCategories`, `maxCategories`, `enableAnalytics` |
| **Marketplace FAQ** | Accessible marketplace FAQ accordion with optional FAQPage JSON-LD | `items`, `openFirst`, `allowMultipleOpen`, `includeStructuredData`, `enableAnalytics` |
| **Marketplace Landing Experiment Gate** | Optimizely-compatible test gate for control/treatment reveal and exposure tracking | `mode`, `trafficPercent`, `controlSelector`, `treatmentSelector`, `optimizelyExposureEvent` |
| **Featured Creator Card** | CMS-bindable monthly featured creator card | `creatorName`, `creatorLink`, `creatorAvatar`, `headline`, `featuredTemplateCount`, `newTemplates90d`, `buyerDemand`, `categoryBreadth`, `topTemplateName`, `topTemplateImage` |

#### Designer profile listings

Use **Template Filter Bar** and **Template Grid** together on `/templates/designers/{slug}` pages to replace the native Webflow Collection List. Both components auto-detect the designer slug from the published URL and pass `creator_slug` to the template search API. When the Designer CMS item exposes the Airtable/Webflow sync record ID, bind it to `creatorRecordId` on both components for the narrowest possible match; otherwise the slug route is sufficient.

### Forms (Group: Forms)

| Component | Description | Key Props |
|-----------|-------------|-----------|
| **Field** | Form input/textarea | `label`, `type`, `textarea`, `error` |
| **Select** | Dropdown selector | `label`, `items`, `placeholder` |

### Data (Group: Data)

| Component | Description | Key Props |
|-----------|-------------|-----------|
| **Stats Display** | Animated counters | `stats` (JSON), `columns`, `animated` |

### Control Plane (Group: Control Plane)

| Component | Description | Key Props |
|-----------|-------------|-----------|
| **Canon Control Panel** | Full operator control surface for MCPs, agents, workflows, Dify, Composio, Cloudflare, approvals, and evidence | `contextEndpointUrl`, `agentEndpointUrl`, `actionEndpointUrl`, JSON content props |
| **Business Context Switcher** | Business/client/project/workflow scope | `contextEndpointUrl`, `contexts` (JSON), `activeContextId` |
| **Workflow Metrics Strip** | Operating metrics for approvals, decisions, runtime, and boundary state | `contextEndpointUrl`, `metrics` (JSON) |
| **Operating Layer Cards** | Database / Automation / Judgment layer cards | `contextEndpointUrl`, `layers` (JSON), `layout` |
| **Source Truth Status** | Source-of-truth and connectivity status | `contextEndpointUrl`, `sources` (JSON) |
| **Evidence Trail** | Evidence and grounding list | `contextEndpointUrl`, `evidence` (JSON), `compact` |
| **Evidence Manager** | Evidence visibility and review-state manager | `contextEndpointUrl`, `evidence` (JSON) |
| **Artifact Grid** | Client-safe review artifact grid | `contextEndpointUrl`, `artifacts` (JSON), `columns` |
| **Action Preview** | Governed action preview | `contextEndpointUrl`, `endpointUrl`, `contextId` |
| **Approval Gate** | Human approval state panel | `contextEndpointUrl`, `approvalState`, `requiredApprover` |
| **Approval Queue** | Approval review, approve, and block queue with local fallback state | `contextEndpointUrl`, trusted-proxy `endpointUrl`, `approvals` (JSON) |
| **Action Execution Queue** | Preview, queued, approved, blocked, and executed action states | `contextEndpointUrl`, `items` (JSON) |
| **Agent Dock** | Bounded Q&A dock | `contextEndpointUrl`, `endpointUrl`, `suggestedPrompts` (JSON) |
| **Decision Queue** | Operator decisions and owners | `contextEndpointUrl`, `decisions` (JSON) |
| **Operator Activity Log** | Public-safe audit trail | `contextEndpointUrl`, `events` (JSON) |
| **Runtime Status** | Runtime checks and status | `contextEndpointUrl`, `status`, `checks` (JSON) |

### Sections (Group: Sections)

| Component | Description | Key Props |
|-----------|-------------|-----------|
| **Kinetic Hero** | Full-screen hero with video | `title`, `subtitle`, `videoSrc`, `ctaText` |
| **Product Showcase** | 3-column product grid | `products` (JSON), `variant` |
| **Solutions** | Tabbed content | `heading`, `tabs` (JSON), `variant` |
| **Process Steps** | Step navigator | `heading`, `steps` (JSON), `variant` |
| **Icon Card Grid** | Grid of icon cards | `heading`, `cards` (JSON), `columns` |

### Cato Supply (Group: Cato Supply)

These components are based on the exported project at `/Users/micahjohnson/Downloads/cato-supply.webflow` and are meant to replace the slow native/MCP delivery path for the remaining Cato surfaces.

| Component | Description | Key Props |
|-----------|-------------|-----------|
| **Cato Supply Search Hero** | Homepage hero with Product Search redirect and Risk Radar catalog | `heading`, `productSearchUrl`, `apiUrl`, `showRiskRadar` |
| **Cato Product Search Form** | Standalone search form redirecting to Cato Product Search | `placeholder`, `buttonLabel`, `productSearchUrl` |
| **Cato Risk Radar Catalog** | Live Risk Radar table replacing the custom-code embed | `apiUrl`, `riskRadarUrl`, `rowsJson`, `fetchEnabled`, `autoScroll` |
| **Cato Insights Mega Menu** | Self-contained Insights mega-menu content | `heading`, `summary`, `itemsEndpointUrl`, `categoriesJson`, `itemsJson` |
| **Cato Insights Hub** | Insights landing page with category cards and latest content | `itemsEndpointUrl`, `categoriesJson`, `itemsJson`, `itemLimit`, `showFilterRail` |
| **Cato Insights Archive** | Focused archive page for Resiliency, Research, Resources, or Newsroom | `categoryId`, `showSubscribe`, `itemsEndpointUrl`, `itemsJson` |
| **Cato Insights Archive Shell** | CMS-ready archive shell that renders endpoint items inside its archive panel | `categoryId`, `categorySlug`, `showItems`, `itemsEndpointUrl` |
| **Cato Insight Category Archive** | CMS category template archive that resolves the active Insight Category from the slug | `categorySlug`, `categoryId`, `showSubscribe`, `itemsEndpointUrl` |
| **Cato Insight CMS Card** | CMS-bindable Insight card for native Webflow Collection Lists | `title`, `summary`, `date`, `contentLabel`, `itemLink` |
| **Cato Insight Detail** | CMS-bindable detail-page article shell | `title`, `summary`, `itemsEndpointUrl`, `bodyJson`, `takeawaysJson`, `categoryId` |
| **Cato About Page** | Improved About page experience with hero, platform focus, proof metrics, values, mission, leadership, and board sections | `valuesJson`, `leadershipJson`, `boardJson`, `metricsJson`, `showMission`, `showTeam` |
| **Cato Case Studies Landing** | Improved Case Studies landing page with featured story, result proof, and customer story grid | `caseStudiesJson`, `showFeatured`, `linkMode`, `pathPrefix` |
| **Cato Case Study Detail** | CMS-bindable case study detail template with customer profile, challenge, solution, results, and related stories | `slug`, `clientName`, `challengeHtml`, `solutionHtml`, `challengeImage`, `solutionImage`, `resultsJson`, `caseStudiesJson`, `backHref` |

#### Cato Insights CMS Archive Build

Use a public cache endpoint for live CMS archives. The Code Component should never call the authenticated Webflow API directly from the browser.

1. Deploy the Cato Insights CMS Worker from `packages/agency/clients/cato-supply-insights-review`.
2. Set the component `Items Endpoint URL` to `/api/cato/insights` on the Worker route, or pass a filtered URL such as `/api/cato/insights?category=newsroom`.
3. Use **Cato Insights Archive Shell** when the page should render the archive intro and item list inside one Code Component.
4. Set `Archive` to `resiliency`, `research`, `resources`, or `newsroom`.
5. Keep `Fetch Endpoint Items` enabled and use `Items JSON` only as fallback content before the endpoint responds.
6. Do not place a native Collection List into the Shell unless intentionally using the legacy slot fallback.

The native **Cato Insight CMS Card** remains available for a Webflow Collection List build, but the preferred route for this Cato implementation is the cached public endpoint rendered directly inside the Code Component.

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

### Featured Creator Card

Bind each card inside a Webflow CMS Collection List. The monthly batch should be generated server-side, reviewed editorially, and stored in CMS fields instead of exposing Airtable or Webflow API tokens in browser props.

Suggested CMS fields:

```json
{
  "month": "2026-06",
  "sortOrder": 1,
  "creatorRecordId": "recdfcBmYwaBCAuma",
  "creatorName": "BRIX Templates",
  "creatorSlug": "brix-templates",
  "creatorProfileUrl": "https://webflow.com/templates/designers/brix-templates",
  "creatorAvatar": "Webflow asset or CMS image",
  "rankLabel": "#1",
  "accent": "demand",
  "headline": "12 featured templates",
  "curationNote": "Selected for sustained buyer demand across 26 category groups.",
  "featuredTemplateCount": "12",
  "newTemplates90d": "9",
  "buyerDemand": "52.6k buys",
  "categoryBreadth": "26",
  "topTemplateName": "Dark X",
  "topTemplateUrl": "https://webflow.com/templates/html/dark-x",
  "topTemplateImage": "Webflow asset or CMS image"
}
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

### Control Plane Endpoint Configuration

The control-plane components work without endpoints by rendering static Webflow props. To enable the hybrid Cloudflare demo, configure:

```text
Workflow Context Endpoint URL: https://<agency-domain>/api/canon/workflow-context
Context ID: create-something-governed-workflow-console
Agent Endpoint URL: https://<agency-domain>/api/canon/agent
Action Endpoint URL: https://<agency-domain>/api/canon/action-preview
```

The workflow context endpoint returns sanitized runtime checks, business contexts, operating metrics, source statuses, operating layers, actions, approvals, execution queue items, evidence, decisions, artifacts, activity events, and agent prompts from Cloudflare-managed workflow state. The action and agent endpoints are preview-only in v1. They return sanitized answers, policy checks, evidence labels, and allowed next actions. They do not expose secrets, raw source records, private workspace URLs, or token-bearing endpoints, and they do not execute external mutations.

Approval persistence uses `POST /api/canon/approval`, but that route requires the server-side `AGENCY_INTERNAL_API_KEY`. Do not place that credential in Webflow props or browser code. Public Webflow compositions should leave `Approval Endpoint URL` empty for local review state, or call approval writes through a trusted authenticated operator proxy.

Use `POST /api/canon/operator-approval` for an operator-only console. That proxy requires an Auth0 `.agency` session with an email in `AGENCY_OPERATOR_EMAILS`; set `Approval Request Credentials` to `include` only when the Webflow page can send a compatible operator session to `.agency`. The production Webflow publish origin is `https://governed-workflow-console.webflow.io`; it is trusted by backend CORS, but the existing `.agency` session cookies are `SameSite=Lax` and do not travel on cross-site fetch POSTs from `webflow.io`. Keep approval persistence disabled on Webflow Designer and `webflow.io` until a Webflow-specific operator auth bridge exists. For the authenticated `.agency` operator surface, use `https://createsomething.agency/api/canon/operator-approval`.

Endpoint props are intentionally deployment-specific. Configure them per Webflow site or environment so component defaults never imply a production target.

`CanonControlPanel` is client-rendered in Webflow (`ssr: false`) on purpose. It is an operator console backed by Cloudflare/D1, not an SEO surface, and client rendering prevents Webflow code-island SSR/client recovery errors from becoming production noise.

### Control Plane JSON Examples

#### Operating Layers

```json
[
  {
    "tier": "Database",
    "title": "Operational Memory",
    "status": "Structured",
    "description": "Authoritative records, review state, and evidence IDs are separated.",
    "evidence": ["Source records", "Review state", "Evidence IDs"],
    "tone": "info"
  }
]
```

#### Action Preview

```json
[
  {
    "id": "draft-operator-brief",
    "label": "Draft operator brief",
    "description": "Prepare a client-safe workflow brief from approved evidence and decisions.",
    "status": "allowed",
    "risk": "low",
    "policyChecks": ["Uses public evidence only", "No credentials or private source data"],
    "evidence": ["Workflow map", "Decision queue"]
  }
]
```

#### Agent Prompts

```json
[
  {
    "label": "What is private?",
    "prompt": "What should stay out of the public surface?"
  }
]
```

## Abundance Pattern Use

The Abundance delivery page is implementation context for these components, not public default content. Reuse the pattern: artifact-backed delivery, Database / Automation / Judgment, bounded agent answers, private/public boundaries, and next-review decisions. Do not ship Abundance-specific client details, staffing language, credentials, source data, or private artifact references in this package.

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
