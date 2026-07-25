# Understanding: Webflow Way Validator

> **Validates Webflow templates against submission guidelines before creators submit to the marketplace.**

## Ontological Position

**Mode of Being**: Quality Gate

This system exists at the boundary between creation and submission. Template creators catch issues *before* Webflow's review—not after rejection. Validation happens where work happens: inside the Designer, not in a separate tool.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Webflow Designer                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Extension Panel (extension/)                │    │
│  │  ┌─────────────┐    ┌─────────────┐    ┌────────────┐   │    │
│  │  │ Collect     │───▶│ Call Worker │───▶│ Render     │   │    │
│  │  │ Designer    │    │ Endpoints   │    │ Results    │   │    │
│  │  │ Data        │    │             │    │            │   │    │
│  │  └─────────────┘    └──────┬──────┘    └────────────┘   │    │
│  └────────────────────────────┼────────────────────────────┘    │
└───────────────────────────────┼─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Cloudflare Worker (worker/)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ /api/       │  │ /validate   │  │ /validate/assets        │  │
│  │ validate    │  │             │  │ (batched, 100% coverage)│  │
│  │ (designer)  │  │ (enhanced)  │  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│         │                │                     │                 │
│         ▼                ▼                     ▼                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Variables   │  │ Content     │  │ Asset Size/Format       │  │
│  │ Components  │  │ Accessibility│  │ (HEAD requests)         │  │
│  │ Styles      │  │ SEO         │  │                         │  │
│  │ Pages       │  │             │  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Depends On (Understanding-Critical)

| Dependency | Why It Matters |
|------------|----------------|
| Webflow Designer API | Source of all project data (variables, components, styles, pages, assets) |
| Cloudflare Workers | Runtime for validation logic, subrequest model shapes architecture |
| Webflow Way Guidelines | The rules being validated against (150KB assets, naming conventions, etc.) |

## Enables Understanding Of

| Consumer | What This Package Clarifies |
|----------|----------------------------|
| Template Creators | What issues will cause marketplace rejection |
| Webflow Review Team | Pre-validated templates reduce review burden |
| CREATE Something | Real-world Cloudflare Workers patterns for extension development |

## Internal Structure

```
packages/webflow-template-validation/
├── extension/                    → Webflow Designer Extension
│   ├── public/
│   │   ├── index.js              → Main extension logic (data collection, API calls, rendering)
│   │   ├── index.html            → Extension panel markup
│   │   └── styles.css            → Tufte-inspired dense UI (Webflow design system aligned)
│   └── webflow.json              → Extension manifest
│
├── worker/                       → Cloudflare Worker (unified validation backend)
│   ├── src/
│   │   ├── index.ts              → Route handlers (/api/validate, /validate, /validate/assets)
│   │   ├── types.ts              → TypeScript interfaces for all data structures
│   │   ├── validators/
│   │   │   ├── designer-validator.ts   → Variables, components, styles, pages
│   │   │   ├── asset-validator.ts      → Image sizes, formats, optimization
│   │   │   ├── content-validator.ts    → Lorem ipsum, headings, SEO
│   │   │   └── accessibility-validator.ts → Alt text, structure, form labels, focus
│   │   └── utils/
│   │       ├── fetch-utils.ts    → HTML fetching, asset metadata (HEAD requests)
│   │       └── asset-utils.ts    → Optimization analysis, size calculations
│   └── wrangler.jsonc            → Cloudflare deployment config
│
└── src/                          → Next.js companion app and API routes
```

## To Understand This Package, Read

1. **`extension/public/index.js`** — The complete client-side flow: data collection → API calls → result rendering
2. **`worker/src/index.ts`** — All three endpoints and how they compose validators
3. **`worker/src/types.ts`** — Data structures that flow between extension and worker
4. **`worker/src/validators/asset-validator.ts`** — Batching pattern for Cloudflare subrequest limits
5. **`extension/public/styles.css`** — Webflow design system alignment (tokens, hierarchy)

## Key Concepts

| Concept | Definition | Where to Find |
|---------|------------|---------------|
| Designer Data | Project metadata from Webflow Designer API (variables, components, styles, pages, assets) | `extension/public/index.js:collectProjectData()` |
| Subrequest Limit | Cloudflare Workers limit of ~50 external fetches per request | `worker/src/validators/asset-validator.ts` |
| Batched Validation | Multi-request pattern for 100% asset coverage | `extension/public/index.js:fetchBatchedAssetValidation()` |
| Webflow Way | Template quality guidelines (150KB assets, no lorem ipsum, etc.) | `VALIDATION_COVERAGE_ANALYSIS.md` |
| Severity Levels | error (blocking) → warning (should fix) → info (suggestions) | `worker/src/types.ts:ValidationIssue` |

## This Package Helps You Understand

- **Webflow Extensions** — Not documentation, but working code for Designer panel apps
- **Cloudflare Workers** — The 50-subrequest limit shapes everything; batching is the solution
- **Validation Architecture** — Client orchestrates, server analyzes, neither does both
- **Dense UI Design** — Tufte's data-ink ratio applied to developer tools

## Common Tasks

| Task | Start Here |
|------|------------|
| Add new validation rule | `worker/src/validators/designer-validator.ts` |
| Change UI appearance | `extension/public/styles.css` |
| Modify API endpoints | `worker/src/index.ts` |
| Update data collection | `extension/public/index.js:collectProjectData()` |
| Deploy worker changes | `pnpm --filter @create-something/webflow-template-validation-worker deploy` |
| Bundle extension | `cd extension && webflow extension bundle` |
| Test locally | `cd extension && webflow extension serve` |

## Validation Categories

| Category | Validator | What It Checks |
|----------|-----------|----------------|
| Variables | designer-validator | Naming conventions, mode coverage, type consistency |
| Components | designer-validator | Naming, nesting depth, instance counts |
| Styles | designer-validator | Class naming, unused styles, HTML tag overrides |
| Pages | designer-validator | SEO metadata, slug format, home page designation |
| Assets | asset-validator | Size (150KB limit), format optimization, alt text |
| Content | content-validator | Lorem ipsum, heading hierarchy, broken links |
| Accessibility | accessibility-validator | Alt text coverage, heading structure, form labels, focus management |

## API Endpoints

| Endpoint | Purpose | Request |
|----------|---------|---------|
| `POST /api/validate` | Designer data validation (fast, no fetching) | `{ designerData }` |
| `POST /validate` | Enhanced validation (crawls pages) | `{ siteUrl, designerData, pageSlugs }` |
| `POST /validate/assets` | Batched asset validation (100% coverage) | `{ siteUrl, assets, batchIndex, totalAssets }` |

## The Batching Pattern

Cloudflare limits subrequests to ~50 per request. For projects with 100+ assets:

```
Extension                           Worker
    │                                  │
    │── POST /validate/assets ────────▶│ Process 40 assets
    │◀── { results, remaining: 60 } ───│
    │                                  │
    │── POST /validate/assets ────────▶│ Process 40 assets
    │◀── { results, remaining: 20 } ───│
    │                                  │
    │── POST /validate/assets ────────▶│ Process 20 assets
    │◀── { results, isComplete: true }─│
    │                                  │
    └── Aggregate all results          │
```

---

*Last validated: 2025-12-05*
