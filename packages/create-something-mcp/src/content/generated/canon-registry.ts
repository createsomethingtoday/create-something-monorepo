/**
 * Generated Canon registry content — DO NOT EDIT MANUALLY.
 * Run: npm run build:content
 * Source: packages/canon/src/lib/registry/
 */

import type { CanonRegistryManifest } from '../types.js';

export const CANON_REGISTRY_MANIFEST: CanonRegistryManifest = {
  "schemaVersion": 1,
  "id": "canon-registry",
  "sourceOfTruth": "@create-something/canon/registry",
  "description": "Machine-readable Canon foundation for CREATE SOMETHING design system discovery, templates, modality adapters, and project extension governance.",
  "requiredModalities": [
    "web",
    "chat",
    "app",
    "voice",
    "glasses"
  ],
  "extensionLifecycle": [
    {
      "stage": "project-local",
      "description": "Project or client overlay owns the need, evidence, and local implementation without forking Canon primitives."
    },
    {
      "stage": "candidate",
      "description": "Pattern repeats across at least two surfaces or clients and receives a source-adjacent contract plus docs path."
    },
    {
      "stage": "canon-stable",
      "description": "Canon owns the primitive, export path, tests, docs, and compatibility contract for all consumers."
    },
    {
      "stage": "deprecated",
      "description": "Canon keeps discovery metadata and migration guidance while routing new work to the replacement primitive."
    }
  ],
  "agentContract": {
    "purpose": "canon-design-system-discovery",
    "primaryConsumers": [
      "codex",
      "mcp",
      "ltd-docs",
      "project-overlays"
    ],
    "useFor": [
      "choose Canon primitives before inventing local UI",
      "map a requested surface to web, chat, app, voice, or glasses modality constraints",
      "find templates that preserve Signal, Decision, Proof, receipt, and owner structure",
      "decide whether a client/project pattern should stay local or become a Canon candidate"
    ],
    "stopBefore": [
      "copying third-party brand identity into Canon",
      "creating a local component when an equivalent stable primitive exists",
      "moving reasoning or trust boundaries onto thin display devices",
      "promoting a project-local overlay without evidence from multiple surfaces or clients"
    ]
  },
  "items": [
    {
      "id": "token.canon-core",
      "name": "Canon Core Tokens",
      "kind": "token",
      "maturity": "stable",
      "description": "Shared color, typography, spacing, radius, motion, surface, and proof-state values used by Canon consumers.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/styles/tokens.css",
      "importPath": "@create-something/canon/styles/tokens.css",
      "docsPath": "/canon/resources/tokens",
      "tags": [
        "tokens",
        "css",
        "foundation",
        "theme"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "contract": {
        "accessibility": "Tokens must preserve readable contrast and must not make state color-only.",
        "extension": "Project overlays may add aliases, but canonical values remain owned by Canon."
      }
    },
    {
      "id": "component.button",
      "name": "Button",
      "kind": "component",
      "maturity": "stable",
      "description": "Action control for primary, secondary, and ghost interactions.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/Button.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/button",
      "tags": [
        "action",
        "control",
        "web"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Actions need explicit labels, disabled state, and visible focus treatment.",
        "extension": "Use variants before adding local button styles."
      }
    },
    {
      "id": "component.card",
      "name": "Card",
      "kind": "component",
      "maturity": "stable",
      "description": "Container for grouping related content with controlled emphasis.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/Card.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/card",
      "tags": [
        "container",
        "surface",
        "web"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Cards must not hide structure from headings, landmarks, or link text.",
        "extension": "Use cards for bounded repeated items, not nested page-section decoration."
      }
    },
    {
      "id": "component.navigation",
      "name": "Navigation",
      "kind": "component",
      "maturity": "stable",
      "description": "Primary wayfinding with property-aware navigation and clear visual style support.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/Navigation.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/navigation",
      "tags": [
        "navigation",
        "wayfinding",
        "property"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Navigation must expose clear labels, current state, and mobile-safe targets.",
        "extension": "Property packages configure links and policy; Canon owns the primitive."
      }
    },
    {
      "id": "component.heading",
      "name": "Heading",
      "kind": "component",
      "maturity": "stable",
      "description": "Semantic heading primitive with Canon fluid typography scales and explicit heading levels.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/Heading.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/heading",
      "tags": [
        "typography",
        "heading",
        "semantic",
        "foundation"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Consumers must choose the heading level for document structure, not visual size alone.",
        "extension": "Use the canonical scale before adding local heading styles or viewport-specific typography."
      }
    },
    {
      "id": "component.skip-to-content",
      "name": "SkipToContent",
      "kind": "component",
      "maturity": "stable",
      "description": "WCAG skip link primitive that lets keyboard users bypass repeated navigation.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/SkipToContent.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/skip-to-content",
      "tags": [
        "accessibility",
        "keyboard",
        "navigation",
        "foundation"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Place before navigation and ensure the configured target id exists on the main content.",
        "extension": "Use this primitive for route shells before creating local skip-link implementations."
      }
    },
    {
      "id": "component.layout-section",
      "name": "Section",
      "kind": "component",
      "maturity": "stable",
      "description": "Canonical page section wrapper for vertical rhythm, background variants, and content width.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/layout/Section.svelte",
      "importPath": "@create-something/canon/layout",
      "docsPath": "/canon/components/layout",
      "tags": [
        "layout",
        "section",
        "spacing",
        "foundation"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Sections must preserve semantic section structure and readable spacing.",
        "extension": "Use Section for page bands before inventing local wrappers or nested card shells."
      }
    },
    {
      "id": "component.layout-section-header",
      "name": "SectionHeader",
      "kind": "component",
      "maturity": "stable",
      "description": "Section title, eyebrow, and subtitle pattern with explicit semantic heading-level control.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/layout/SectionHeader.svelte",
      "importPath": "@create-something/canon/layout",
      "docsPath": "/canon/components/layout",
      "tags": [
        "layout",
        "heading",
        "section-header",
        "foundation"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.layout-section",
        "component.heading"
      ],
      "contract": {
        "accessibility": "Choose the heading level for document structure and keep title/subtitle readable as text.",
        "extension": "Use SectionHeader for repeated section introductions before adding local header patterns."
      }
    },
    {
      "id": "component.layout-bento-grid",
      "name": "BentoGrid",
      "kind": "component",
      "maturity": "stable",
      "description": "Responsive asymmetric grid wrapper for repeated feature, proof, or workflow-summary items.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/layout/BentoGrid.svelte",
      "importPath": "@create-something/canon/layout",
      "docsPath": "/canon/components/layout",
      "tags": [
        "layout",
        "grid",
        "bento",
        "foundation"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "token.canon-core",
        "component.layout-bento-item"
      ],
      "contract": {
        "accessibility": "Grid order must remain logical when the responsive layout stacks or spans change.",
        "extension": "Use BentoGrid for asymmetric repeated layouts before creating local feature grids."
      }
    },
    {
      "id": "component.layout-bento-item",
      "name": "BentoItem",
      "kind": "component",
      "maturity": "stable",
      "description": "Child layout container for BentoGrid with controlled span and surface variants.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/layout/BentoItem.svelte",
      "importPath": "@create-something/canon/layout",
      "docsPath": "/canon/components/layout",
      "tags": [
        "layout",
        "grid-item",
        "bento",
        "foundation"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Spans and variants must not replace semantic headings, labels, or reading order.",
        "extension": "Use BentoItem inside BentoGrid before adding local card-grid span utilities."
      }
    },
    {
      "id": "component.layout-split-section",
      "name": "SplitSection",
      "kind": "component",
      "maturity": "stable",
      "description": "Two-column responsive layout primitive with explicit ratios, gaps, alignment, and stacking.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/layout/SplitSection.svelte",
      "importPath": "@create-something/canon/layout",
      "docsPath": "/canon/components/layout",
      "tags": [
        "layout",
        "split",
        "responsive",
        "foundation"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "token.canon-core",
        "component.layout-section"
      ],
      "contract": {
        "accessibility": "Column order must stay understandable when reversed or stacked at responsive breakpoints.",
        "extension": "Use SplitSection for two-column content/media layouts before creating local split wrappers."
      }
    },
    {
      "id": "component.icon",
      "name": "Icon",
      "kind": "component",
      "maturity": "stable",
      "description": "Stroke-based Canon icon primitive with typed names, size tokens, and accessible labeling.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/icons/Icon.svelte",
      "importPath": "@create-something/canon/icons",
      "docsPath": "/canon/components/icons",
      "tags": [
        "icon",
        "visual-language",
        "accessibility",
        "foundation"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Provide a label for standalone meaningful icons and omit it only for decorative icons.",
        "extension": "Use the Canon typed icon set before adding local SVG paths or decorative icon variants."
      }
    },
    {
      "id": "component.footer",
      "name": "Footer",
      "kind": "component",
      "maturity": "candidate",
      "description": "Shared site footer candidate for property navigation, legal routes, contact links, and cross-property identity.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/Footer.svelte",
      "importPath": "@create-something/canon/components",
      "docsPath": "/canon/components",
      "tags": [
        "components",
        "footer",
        "navigation",
        "site-chrome",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.navigation"
      ],
      "contract": {
        "accessibility": "Footer content must preserve landmark semantics, link labels, property identity, and legal route names.",
        "evidence": "Footer data must preserve property links, legal links, contact routes, copyright text, and source property.",
        "extension": "Promote to stable only after property topology, legal-route policy, compact summaries, and cross-property behavior are documented."
      }
    },
    {
      "id": "component.catalog-card",
      "name": "CatalogCard",
      "kind": "component",
      "maturity": "candidate",
      "description": "Catalog listing card candidate for reusable offers, templates, papers, packages, or property entries.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/CatalogCard.svelte",
      "importPath": "@create-something/canon/components",
      "docsPath": "/canon/components",
      "tags": [
        "components",
        "catalog",
        "card",
        "listing",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.card",
        "component.clear-artifact-card"
      ],
      "contract": {
        "accessibility": "Catalog cards must expose title, description, category, link/action label, and any status text without relying on hover.",
        "evidence": "Catalog item data must preserve slug or href, taxonomy, summary, image or icon fallback, and source collection.",
        "extension": "Promote to stable only after catalog item schema, media fallback, taxonomy, and repeated-list behavior are documented."
      }
    },
    {
      "id": "component.paper-card",
      "name": "PaperCard",
      "kind": "component",
      "maturity": "candidate",
      "description": "Research paper card candidate for title, summary, category, publication metadata, and reading route.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/PaperCard.svelte",
      "importPath": "@create-something/canon/components",
      "docsPath": "/canon/components",
      "tags": [
        "components",
        "paper",
        "research",
        "card",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.card",
        "component.content-testimonial-carousel"
      ],
      "contract": {
        "accessibility": "Paper cards must expose title, summary, category, date or status, and read action as text.",
        "evidence": "Paper card data must preserve slug, title, excerpt, category, date, author/source, and relationship to the source paper.",
        "extension": "Promote to stable only after research metadata, excerpt policy, related-content behavior, and nonvisual summaries are documented."
      }
    },
    {
      "id": "component.papers-grid",
      "name": "PapersGrid",
      "kind": "component",
      "maturity": "candidate",
      "description": "Research paper collection grid candidate for filtered or grouped paper lists with empty and loading states.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/PapersGrid.svelte",
      "importPath": "@create-something/canon/components",
      "docsPath": "/canon/components",
      "tags": [
        "components",
        "papers",
        "grid",
        "collection",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.paper-card",
        "component.clear-card-grid"
      ],
      "contract": {
        "accessibility": "Paper grids must preserve collection heading, item count, filter context, empty state, and card order.",
        "evidence": "Grid state must preserve paper ids, order, active category or query, loading state, and empty-state reason.",
        "extension": "Promote to stable only after collection schema, filtering policy, empty-state copy, and pagination behavior are documented."
      }
    },
    {
      "id": "component.category-section",
      "name": "CategorySection",
      "kind": "component",
      "maturity": "candidate",
      "description": "Content taxonomy section candidate for grouping entries under a category heading with summary and calls to action.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/CategorySection.svelte",
      "importPath": "@create-something/canon/components",
      "docsPath": "/canon/components",
      "tags": [
        "components",
        "category",
        "taxonomy",
        "section",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.layout-section",
        "component.heading"
      ],
      "contract": {
        "accessibility": "Category sections must expose category name, summary, item list, and route labels in a logical heading hierarchy.",
        "evidence": "Category state must preserve taxonomy key, display label, description, item count, and route or source collection.",
        "extension": "Promote to stable only after taxonomy schema, item relationship policy, empty behavior, and cross-surface summary rules are documented."
      }
    },
    {
      "id": "component.share-buttons",
      "name": "ShareButtons",
      "kind": "component",
      "maturity": "candidate",
      "description": "Share control candidate for platform-specific sharing routes with explicit channel policy and copy fallback.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/ShareButtons.svelte",
      "importPath": "@create-something/canon/components",
      "docsPath": "/canon/components",
      "tags": [
        "components",
        "share",
        "platform",
        "actions",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.button"
      ],
      "contract": {
        "accessibility": "Share controls must expose destination platform, target URL, copy action, success or failure state, and focusable labels.",
        "evidence": "Share data must preserve canonical URL, title, platform list, generated share URL, and copy-to-clipboard outcome.",
        "extension": "Promote to stable only after channel allowlist, tracking policy, clipboard fallback, and privacy behavior are documented."
      }
    },
    {
      "id": "component.quote-block",
      "name": "QuoteBlock",
      "kind": "component",
      "maturity": "candidate",
      "description": "Editorial quote block candidate for quoted text, attribution, source context, and optional proof relationship.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/QuoteBlock.svelte",
      "importPath": "@create-something/canon/components",
      "docsPath": "/canon/components",
      "tags": [
        "components",
        "quote",
        "editorial",
        "proof",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.clear-quote-metric-panel"
      ],
      "contract": {
        "accessibility": "Quotes must expose quote text, attribution, source label, and context without decorative punctuation as the only cue.",
        "evidence": "Quote data must preserve exact quote, attribution, source URL or artifact, relationship to nearby proof, and editing status.",
        "extension": "Promote to stable only after quote provenance, truncation policy, citation behavior, and thin-display summaries are documented."
      }
    },
    {
      "id": "component.related-articles",
      "name": "RelatedArticles",
      "kind": "component",
      "maturity": "candidate",
      "description": "Related content section candidate for recommendation lists tied to taxonomy, topic, or authored relationship.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/RelatedArticles.svelte",
      "importPath": "@create-something/canon/components",
      "docsPath": "/canon/components",
      "tags": [
        "components",
        "related-content",
        "recommendation",
        "section",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.navigation-related-content",
        "component.card"
      ],
      "contract": {
        "accessibility": "Related content must expose section heading, article titles, relationship reason when available, and route labels.",
        "evidence": "Recommendation data must preserve related item ids, titles, hrefs, relationship source, order, and exclusion rules.",
        "extension": "Promote to stable only after recommendation provenance, ordering policy, fallback state, and cross-property routing are documented."
      }
    },
    {
      "id": "component.triad-health",
      "name": "TriadHealth",
      "kind": "component",
      "maturity": "candidate",
      "description": "Three-Tier Framework health display candidate for Database, Automation, and Judgment readiness.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/TriadHealth.svelte",
      "importPath": "@create-something/canon/components",
      "docsPath": "/canon/components",
      "tags": [
        "components",
        "three-tier",
        "health",
        "governance",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "policy.signal-decision-proof",
        "component.clear-state-rows"
      ],
      "contract": {
        "accessibility": "Triad health must expose each tier label, state, blocker, evidence, owner, and next action in text.",
        "evidence": "Health data must preserve tier states, checks, receipts, owners, timestamps, and escalation route.",
        "extension": "Promote to stable only after tier schema, status semantics, evidence requirements, and client overlay policy are documented."
      }
    },
    {
      "id": "component.hermeneutic-circle",
      "name": "HermeneuticCircle",
      "kind": "component",
      "maturity": "candidate",
      "description": "Conceptual framework display candidate for showing iterative interpretation loops and their current state.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/HermeneuticCircle.svelte",
      "importPath": "@create-something/canon/components",
      "docsPath": "/canon/components",
      "tags": [
        "components",
        "framework",
        "loop",
        "governance",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.clear-state-rows"
      ],
      "contract": {
        "accessibility": "Loop displays must expose cycle labels, current phase, interpretation state, and route to detail without relying on circular layout.",
        "evidence": "Loop state must preserve phase order, active phase, interpretation notes, owner, and source artifact.",
        "extension": "Promote to stable only after framework schema, phase semantics, nonvisual sequence summary, and motion policy are documented."
      }
    },
    {
      "id": "component.mode-indicator",
      "name": "ModeIndicator",
      "kind": "component",
      "maturity": "candidate",
      "description": "Mode and state indicator candidate for showing current operating mode, environment, or workflow posture.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/ModeIndicator.svelte",
      "importPath": "@create-something/canon/components",
      "docsPath": "/canon/components",
      "tags": [
        "components",
        "mode",
        "status",
        "indicator",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.clear-state-rows"
      ],
      "contract": {
        "accessibility": "Mode indicators must expose label, current mode, state meaning, and change context without color-only encoding.",
        "evidence": "Mode data must preserve mode id, label, severity or tone, source of truth, timestamp, and optional owner.",
        "extension": "Promote to stable only after mode taxonomy, tone semantics, compact rendering, and source-of-truth policy are documented."
      }
    },
    {
      "id": "component.cross-property-link",
      "name": "CrossPropertyLink",
      "kind": "component",
      "maturity": "candidate",
      "description": "Cross-property routing candidate for linking between CREATE SOMETHING properties with clear destination context.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/CrossPropertyLink.svelte",
      "importPath": "@create-something/canon/components",
      "docsPath": "/canon/components",
      "tags": [
        "components",
        "property",
        "routing",
        "link",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.button",
        "component.navigation"
      ],
      "contract": {
        "accessibility": "Cross-property links must name the destination property, action, external context, and current-route relationship.",
        "evidence": "Route data must preserve source property, destination property, href, reason, tracking label, and fallback text.",
        "extension": "Promote to stable only after property topology, route ownership, tracking policy, and external-link behavior are documented."
      }
    },
    {
      "id": "component.property-funnel",
      "name": "PropertyFunnel",
      "kind": "component",
      "maturity": "candidate",
      "description": "Property conversion funnel candidate for routing visitors from property context to the next owned action.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/PropertyFunnel.svelte",
      "importPath": "@create-something/canon/components",
      "docsPath": "/canon/components",
      "tags": [
        "components",
        "property",
        "funnel",
        "conversion",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.clear-cta-band",
        "component.conversion-sticky-cta"
      ],
      "contract": {
        "accessibility": "Funnels must expose current property, offer, qualifying context, primary action, secondary action, and dismissal state.",
        "evidence": "Funnel data must preserve property, audience segment, offer, destination, stage, proof reference, and conversion event.",
        "extension": "Promote to stable only after funnel stage policy, offer schema, analytics boundaries, and cross-property handoff are documented."
      }
    },
    {
      "id": "component.cookie-consent",
      "name": "CookieConsent",
      "kind": "component",
      "maturity": "candidate",
      "description": "Consent surface candidate for privacy notice, preference state, regional behavior, and analytics gating.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/CookieConsent.svelte",
      "importPath": "@create-something/canon/components",
      "docsPath": "/canon/components",
      "tags": [
        "components",
        "consent",
        "privacy",
        "policy",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "policy.signal-decision-proof",
        "component.button"
      ],
      "contract": {
        "accessibility": "Consent prompts must expose notice text, accept action, reject or manage action, preference state, and policy link.",
        "evidence": "Consent state must preserve region, categories, selected preferences, storage key, timestamp, and analytics gating status.",
        "extension": "Promote to stable only after privacy policy mapping, regional defaults, storage behavior, and revocation flow are documented."
      }
    },
    {
      "id": "component.page-actions",
      "name": "PageActions",
      "kind": "component",
      "maturity": "candidate",
      "description": "Page-level action group candidate for edit, preview, share, copy, publish, or workflow commands.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/PageActions.svelte",
      "importPath": "@create-something/canon/components",
      "docsPath": "/canon/components",
      "tags": [
        "components",
        "page-actions",
        "commands",
        "authoring",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.button",
        "component.clear-action-footer"
      ],
      "contract": {
        "accessibility": "Page actions must expose command labels, disabled state, destructive state, shortcut or status text, and result feedback.",
        "evidence": "Action data must preserve command id, label, permission, target artifact, pending state, and last result.",
        "extension": "Promote to stable only after command schema, permission policy, destructive-action behavior, and result feedback are documented."
      }
    },
    {
      "id": "component.markdown-preview-modal",
      "name": "MarkdownPreviewModal",
      "kind": "component",
      "maturity": "candidate",
      "description": "Markdown preview modal candidate for authoring workflows that need rendered preview, source context, and close controls.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/MarkdownPreviewModal.svelte",
      "importPath": "@create-something/canon/components",
      "docsPath": "/canon/components",
      "tags": [
        "components",
        "markdown",
        "preview",
        "authoring",
        "modal",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.feedback-dialog",
        "component.page-actions"
      ],
      "contract": {
        "accessibility": "Preview modals must expose title, close action, rendered heading structure, source state, and focus management.",
        "evidence": "Preview data must preserve source markdown, rendered output status, target artifact, validation errors, and last update.",
        "extension": "Promote to stable only after rendering policy, sanitization, focus behavior, and authoring workflow ownership are documented."
      }
    },
    {
      "id": "component.layout-project-grid-interactive",
      "name": "ProjectGridInteractive",
      "kind": "component",
      "maturity": "candidate",
      "description": "Interactive project grid candidate for portfolio-style cards with hover focus and responsive image metadata.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/layout/ProjectGridInteractive.svelte",
      "importPath": "@create-something/canon/layout",
      "docsPath": "/canon/components/layout",
      "tags": [
        "layout",
        "project-grid",
        "interactive",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.layout-section",
        "component.layout-bento-grid",
        "component.layout-bento-item"
      ],
      "contract": {
        "accessibility": "Project cards must preserve title, location, outcome, image alt text, and route order without depending on hover.",
        "evidence": "Project data must preserve slug, title, hero image, location, optional outcome, display order, and focus variant.",
        "motion": "Sibling dimming, image scaling, and metadata reveal must be optional and reduced-motion safe.",
        "extension": "Promote to stable only after project schema, hover/focus parity, image fallback, and nonvisual summary contracts are documented."
      }
    },
    {
      "id": "component.diagrams-flow-diagram",
      "name": "FlowDiagram",
      "kind": "component",
      "maturity": "candidate",
      "description": "Node-and-edge process diagram candidate for workflows, systems, and decision paths.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/diagrams/FlowDiagram.svelte",
      "importPath": "@create-something/canon/diagrams",
      "docsPath": "/canon/components/diagrams",
      "tags": [
        "diagrams",
        "flow",
        "graph",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Every node and edge must be recoverable as ordered text for screen readers and nonvisual modalities.",
        "evidence": "Data must preserve stable node ids, labels, edge direction, and optional edge labels.",
        "motion": "Flow motion must be optional and disabled for reduced-motion contexts.",
        "extension": "Promote to stable only after layout rules, overflow behavior, and text summary format are documented."
      }
    },
    {
      "id": "component.diagrams-bar-chart",
      "name": "BarChart",
      "kind": "component",
      "maturity": "candidate",
      "description": "Categorical comparison chart candidate for compact quantitative evidence.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/diagrams/BarChart.svelte",
      "importPath": "@create-something/canon/diagrams",
      "docsPath": "/canon/components/diagrams",
      "tags": [
        "diagrams",
        "chart",
        "bar",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Bars must have text labels and values that do not depend on color or visual height alone.",
        "evidence": "Data must include labeled numeric values and the source or owner of the measurement.",
        "motion": "Animated bar transitions must not hide final values or block reduced-motion users.",
        "extension": "Promote to stable only after scale, empty-state, and long-label behavior are documented."
      }
    },
    {
      "id": "component.diagrams-line-chart",
      "name": "LineChart",
      "kind": "component",
      "maturity": "candidate",
      "description": "Time-series or ordered-series chart candidate for trends and deltas.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/diagrams/LineChart.svelte",
      "importPath": "@create-something/canon/diagrams",
      "docsPath": "/canon/components/diagrams",
      "tags": [
        "diagrams",
        "chart",
        "line",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Series names, axis labels, and point values must be available as structured text.",
        "evidence": "Data must name each series and preserve x/y values without relying on sampled pixels.",
        "motion": "Line drawing and point reveal effects must respect reduced-motion preferences.",
        "extension": "Promote to stable only after multi-series labeling, axis scaling, and summary rules are documented."
      }
    },
    {
      "id": "component.diagrams-pie-chart",
      "name": "PieChart",
      "kind": "component",
      "maturity": "candidate",
      "description": "Part-to-whole chart candidate for small proportional datasets.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/diagrams/PieChart.svelte",
      "importPath": "@create-something/canon/diagrams",
      "docsPath": "/canon/components/diagrams",
      "tags": [
        "diagrams",
        "chart",
        "pie",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Slices must expose labels, values, and percentages in text; color must not be the only differentiator.",
        "evidence": "Data must include labeled numeric values and clarify whether totals are complete or sampled.",
        "motion": "Slice reveal motion must be optional and never delay text value availability.",
        "extension": "Promote to stable only after limits for slice count, legends, and donut variants are documented."
      }
    },
    {
      "id": "component.diagrams-timeline",
      "name": "Timeline",
      "kind": "component",
      "maturity": "candidate",
      "description": "Chronological event diagram candidate for process, history, and roadmap surfaces.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/diagrams/Timeline.svelte",
      "importPath": "@create-something/canon/diagrams",
      "docsPath": "/canon/components/diagrams",
      "tags": [
        "diagrams",
        "timeline",
        "events",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Events must retain readable date, label, description, and highlight state in source order.",
        "evidence": "Data must preserve dates as text and identify which events are emphasized.",
        "motion": "Scroll or reveal effects must not be required to understand event order.",
        "extension": "Promote to stable only after date parsing, wrapping, and horizontal/vertical behavior are documented."
      }
    },
    {
      "id": "component.diagrams-matrix",
      "name": "Matrix",
      "kind": "component",
      "maturity": "candidate",
      "description": "Row-and-column comparison matrix candidate for decisions and capability maps.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/diagrams/Matrix.svelte",
      "importPath": "@create-something/canon/diagrams",
      "docsPath": "/canon/components/diagrams",
      "tags": [
        "diagrams",
        "matrix",
        "comparison",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Cells must preserve row and column headers so values remain understandable outside the visual table.",
        "evidence": "Data must include row headers, column headers, cell values, and any highlight semantics.",
        "motion": "Highlight transitions must not be required to identify selected or emphasized cells.",
        "extension": "Promote to stable only after responsive overflow, caption, and boolean/value formatting are documented."
      }
    },
    {
      "id": "component.diagrams-knowledge-graph-canvas",
      "name": "KnowledgeGraphCanvas",
      "kind": "component",
      "maturity": "candidate",
      "description": "Canvas graph candidate for concept, entity, relation, and document networks.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/diagrams/KnowledgeGraphCanvas.svelte",
      "importPath": "@create-something/canon/diagrams",
      "docsPath": "/canon/components/diagrams",
      "tags": [
        "diagrams",
        "knowledge-graph",
        "canvas",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Canvas graph nodes and edges must have an equivalent textual graph summary and keyboard-safe inspection route.",
        "evidence": "Data must preserve node ids, labels, types, edge endpoints, weights, and relation types.",
        "motion": "Force or pan animations must be optional and disabled for reduced-motion contexts.",
        "extension": "Promote to stable only after canvas fallback, graph summary, and interaction contracts are documented."
      }
    },
    {
      "id": "component.diagrams-canvas-diagram",
      "name": "CanvasDiagram",
      "kind": "component",
      "maturity": "candidate",
      "description": "General canvas drawing candidate for exportable annotated diagram shapes.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/diagrams/CanvasDiagram.svelte",
      "importPath": "@create-something/canon/diagrams",
      "docsPath": "/canon/components/diagrams",
      "tags": [
        "diagrams",
        "canvas",
        "export",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Canvas shapes must have a durable text alternative or serialized shape list for nonvisual modalities.",
        "evidence": "Data must preserve shape ids, geometry, labels, image sources, and export intent.",
        "motion": "Drag, selection, and animation behavior must be optional and keyboard-safe before stable use.",
        "extension": "Promote to stable only after export, selection, keyboard, and text-fallback contracts are documented."
      }
    },
    {
      "id": "component.typography-typography-hero",
      "name": "TypographyHero",
      "kind": "component",
      "maturity": "candidate",
      "description": "Typography-led hero candidate for monochrome pages where hierarchy comes from type scale and weight.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/typography/TypographyHero.svelte",
      "importPath": "@create-something/canon/typography",
      "docsPath": "/canon/components/typography",
      "tags": [
        "typography",
        "hero",
        "weight-contrast",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.heading"
      ],
      "contract": {
        "accessibility": "Hero hierarchy must preserve semantic heading structure and readable copy in every modality.",
        "evidence": "Headline, eyebrow, subhead, and CTA text must remain inspectable as text and tied to the page claim.",
        "motion": "Fade-up entrance motion must respect reduced-motion preferences and never hide core copy.",
        "extension": "Promote to stable only after heading-level control, CTA composition, and responsive type rules are documented."
      }
    },
    {
      "id": "component.atlas-atlas-flow",
      "name": "AtlasFlow",
      "kind": "component",
      "maturity": "candidate",
      "description": "Interactive Atlas workflow-map renderer candidate for node and edge inspection against the Canon graph artifact.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/atlas/AtlasFlow.svelte",
      "importPath": "@create-something/canon/atlas",
      "docsPath": "/canon/components/atlas",
      "tags": [
        "atlas",
        "renderer",
        "workflow-map",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "adapter.atlas-graph-artifact",
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Rendered nodes and edges must retain aria labels plus a text summary path for chat, voice, and glasses surfaces.",
        "evidence": "Canvas data must preserve node ids, edge ids, owner, status, products, and graph source-of-truth fields from the headless artifact.",
        "motion": "Panning, dragging, focus dimming, and animated viewport changes must stay optional and reduced-motion safe.",
        "extension": "Promote to stable only after keyboard inspection, nonvisual fallback, and renderer compatibility rules are documented."
      }
    },
    {
      "id": "component.atlas-atlas-story-canvas",
      "name": "AtlasStoryCanvas",
      "kind": "component",
      "maturity": "candidate",
      "description": "Story-led Atlas renderer candidate that pairs workflow graph focus with chapters, readiness, and receipt copy.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/atlas/AtlasStoryCanvas.svelte",
      "importPath": "@create-something/canon/atlas",
      "docsPath": "/canon/components/atlas",
      "tags": [
        "atlas",
        "renderer",
        "story",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "adapter.atlas-graph-artifact",
        "component.atlas-atlas-flow"
      ],
      "contract": {
        "accessibility": "Story chapters must preserve the generated accessibility summary and readable chapter text outside the visual map.",
        "evidence": "Chapter focus, readiness score, proof labels, and receipt ledger copy must derive from the graph/story artifacts.",
        "motion": "Chapter focus and trace-handoff cues must be optional and must not hide map state or proof text.",
        "extension": "Promote to stable only after chapter schema, compact layout, and fallback story contracts are documented."
      }
    },
    {
      "id": "component.forms-form-field",
      "name": "FormField",
      "kind": "component",
      "maturity": "candidate",
      "description": "Advanced form field wrapper candidate for labels, help text, validation, and control composition.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/forms/FormField.svelte",
      "importPath": "@create-something/canon/forms",
      "docsPath": "/canon/components/forms",
      "tags": [
        "forms",
        "field",
        "validation",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.form-text-field"
      ],
      "contract": {
        "accessibility": "Labels, descriptions, errors, and required state must stay programmatically tied to the composed control.",
        "evidence": "Field state should preserve value, validation message, required status, and owner-provided help copy.",
        "motion": "Error and focus transitions must be optional and must not delay validation feedback.",
        "extension": "Promote to stable only after composition, described-by, and validation contracts are documented."
      }
    },
    {
      "id": "component.forms-combobox",
      "name": "Combobox",
      "kind": "component",
      "maturity": "candidate",
      "description": "Advanced searchable option control candidate for mixed text entry and bounded selection workflows.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/forms/Combobox.svelte",
      "importPath": "@create-something/canon/forms",
      "docsPath": "/canon/components/forms",
      "tags": [
        "forms",
        "combobox",
        "selection",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.form-text-field",
        "component.form-select"
      ],
      "contract": {
        "accessibility": "Input, popup, active option, selected value, and empty state must be exposed for keyboard and screen-reader users.",
        "evidence": "Options must preserve stable ids, labels, disabled state, search query, and selected value for adapters.",
        "motion": "Popup, filtering, and active-option movement must remain usable without animation.",
        "extension": "Promote to stable only after keyboard navigation, option schema, and nonvisual fallback contracts are documented."
      }
    },
    {
      "id": "component.forms-date-picker",
      "name": "DatePicker",
      "kind": "component",
      "maturity": "candidate",
      "description": "Advanced date selection candidate for calendar input with typed fallback and validation state.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/forms/DatePicker.svelte",
      "importPath": "@create-something/canon/forms",
      "docsPath": "/canon/components/forms",
      "tags": [
        "forms",
        "date-picker",
        "calendar",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.form-text-field"
      ],
      "contract": {
        "accessibility": "Dates must be reachable through typed input, keyboard calendar navigation, and readable selected-state text.",
        "evidence": "Date values must preserve locale display, canonical value, min/max constraints, and validation copy.",
        "motion": "Calendar opening, month changes, and selection feedback must respect reduced-motion preferences.",
        "extension": "Promote to stable only after date value, locale, keyboard, and typed-input fallback contracts are documented."
      }
    },
    {
      "id": "component.forms-file-upload",
      "name": "FileUpload",
      "kind": "component",
      "maturity": "candidate",
      "description": "Advanced file upload candidate for selected-file state, acceptance constraints, progress, and errors.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/forms/FileUpload.svelte",
      "importPath": "@create-something/canon/forms",
      "docsPath": "/canon/components/forms",
      "tags": [
        "forms",
        "file-upload",
        "attachment",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.form-text-field"
      ],
      "contract": {
        "accessibility": "Upload control, accepted types, selected files, progress, and errors must be available as text and status.",
        "evidence": "File state must preserve name, size, type, acceptance result, progress, and retry or removal action.",
        "motion": "Progress and dropzone feedback must not rely on motion or color alone.",
        "extension": "Promote to stable only after file-state, progress, acceptance, and retry contracts are documented."
      }
    },
    {
      "id": "component.forms-otpinput",
      "name": "OTPInput",
      "kind": "component",
      "maturity": "candidate",
      "description": "Advanced one-time-code input candidate for segmented verification flows with pasted-code handling.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/forms/OTPInput.svelte",
      "importPath": "@create-something/canon/forms",
      "docsPath": "/canon/components/forms",
      "tags": [
        "forms",
        "otp",
        "verification",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.form-text-field"
      ],
      "contract": {
        "accessibility": "Segmented inputs must expose one clear verification-code field purpose, order, errors, and completion state.",
        "evidence": "Code state must preserve length, filled count, validation result, paste handling, and resend or recovery route.",
        "motion": "Focus movement, invalid-state cues, and completion feedback must remain understandable without animation.",
        "extension": "Promote to stable only after segmented-input, paste, autofill, and recovery contracts are documented."
      }
    },
    {
      "id": "component.patterns-form-layout",
      "name": "FormLayout",
      "kind": "component",
      "maturity": "candidate",
      "description": "Form composition pattern candidate for grouped fields, headings, descriptions, and action placement.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/patterns/FormLayout.svelte",
      "importPath": "@create-something/canon/patterns",
      "docsPath": "/canon/components/patterns",
      "tags": [
        "patterns",
        "form",
        "layout",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.form-text-field",
        "component.clear-action-footer"
      ],
      "contract": {
        "accessibility": "Form sections must preserve heading order, labels, descriptions, and final action order across modalities.",
        "evidence": "Pattern state should name section titles, required fields, validation scope, and submission action.",
        "motion": "Section transitions and action feedback must be optional and cannot hide form state.",
        "extension": "Promote to stable only after section schema, action placement, and nonvisual form summary contracts are documented."
      }
    },
    {
      "id": "component.patterns-form-validation",
      "name": "FormValidation",
      "kind": "component",
      "maturity": "candidate",
      "description": "Validation pattern candidate for error summaries, field-level messages, and validation timing.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/patterns/FormValidation.svelte",
      "importPath": "@create-something/canon/patterns",
      "docsPath": "/canon/components/patterns",
      "tags": [
        "patterns",
        "form",
        "validation",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.form-text-field",
        "component.feedback-alert"
      ],
      "contract": {
        "accessibility": "Validation summaries and field messages must be announced, linked to fields, and readable without color.",
        "evidence": "Validation data must preserve field ids, messages, timing, severity, and recovery action.",
        "motion": "Validation reveal motion must be optional and must not delay error availability.",
        "extension": "Promote to stable only after validation timing, summary linking, and field-error contracts are documented."
      }
    },
    {
      "id": "component.patterns-multi-step-form",
      "name": "MultiStepForm",
      "kind": "component",
      "maturity": "candidate",
      "description": "Multi-step form pattern candidate for progress, step navigation, persisted data, and completion actions.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/patterns/MultiStepForm.svelte",
      "importPath": "@create-something/canon/patterns",
      "docsPath": "/canon/components/patterns",
      "tags": [
        "patterns",
        "form",
        "multi-step",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.form-text-field",
        "component.clear-action-footer"
      ],
      "contract": {
        "accessibility": "Step order, current step, completed steps, and progress must be available as structured text.",
        "evidence": "Step state must preserve ids, titles, descriptions, completion state, current index, and submit action.",
        "motion": "Step changes and progress animation must be optional and must not mask data persistence or validation.",
        "extension": "Promote to stable only after step schema, persistence, navigation, and completion contracts are documented."
      }
    },
    {
      "id": "component.patterns-empty-state",
      "name": "EmptyState",
      "kind": "component",
      "maturity": "candidate",
      "description": "Empty state pattern candidate for no-data surfaces with plain-language explanation and next action.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/patterns/EmptyState.svelte",
      "importPath": "@create-something/canon/patterns",
      "docsPath": "/canon/components/patterns",
      "tags": [
        "patterns",
        "empty-state",
        "recovery",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.button"
      ],
      "contract": {
        "accessibility": "Empty states must expose the title, explanation, and available next action as text.",
        "evidence": "State copy should distinguish no data, filtered data, unavailable data, and first-use context.",
        "motion": "Illustration or entrance motion must be optional and cannot replace the state message.",
        "extension": "Promote to stable only after empty reason, action, and modality fallback contracts are documented."
      }
    },
    {
      "id": "component.patterns-first-time-user",
      "name": "FirstTimeUser",
      "kind": "component",
      "maturity": "candidate",
      "description": "Onboarding pattern candidate for first-use progress, steps, completion, and dismiss behavior.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/patterns/FirstTimeUser.svelte",
      "importPath": "@create-something/canon/patterns",
      "docsPath": "/canon/components/patterns",
      "tags": [
        "patterns",
        "onboarding",
        "progress",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.button",
        "component.feedback-alert"
      ],
      "contract": {
        "accessibility": "Onboarding progress, step titles, descriptions, action labels, and dismiss controls must be readable and keyboard reachable.",
        "evidence": "Onboarding state must preserve step ids, completed ids, progress percentage, action labels, and dismiss status.",
        "motion": "Progress and completion motion must be optional and cannot hide skipped or incomplete steps.",
        "extension": "Promote to stable only after onboarding step schema, progress, dismiss, and recovery contracts are documented."
      }
    },
    {
      "id": "component.patterns-loading-skeleton",
      "name": "LoadingSkeleton",
      "kind": "component",
      "maturity": "candidate",
      "description": "Loading skeleton pattern candidate for placeholder content that communicates pending state without fake data.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/patterns/LoadingSkeleton.svelte",
      "importPath": "@create-something/canon/patterns",
      "docsPath": "/canon/components/patterns",
      "tags": [
        "patterns",
        "loading",
        "skeleton",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Loading placeholders must expose busy state and a readable loading label without pretending content exists.",
        "evidence": "Loading state should preserve expected content type, count, label, and timeout or fallback route when available.",
        "motion": "Shimmer or pulse treatment must respect reduced-motion preferences.",
        "extension": "Promote to stable only after placeholder semantics, reduced-motion, and timeout fallback contracts are documented."
      }
    },
    {
      "id": "component.patterns-loading-overlay",
      "name": "LoadingOverlay",
      "kind": "component",
      "maturity": "candidate",
      "description": "Loading overlay pattern candidate for scoped blocking progress with message and busy state.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/patterns/LoadingOverlay.svelte",
      "importPath": "@create-something/canon/patterns",
      "docsPath": "/canon/components/patterns",
      "tags": [
        "patterns",
        "loading",
        "overlay",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.feedback-alert"
      ],
      "contract": {
        "accessibility": "Blocking loading state must expose scope, message, and busy state without trapping users unexpectedly.",
        "evidence": "Loading state should preserve operation label, scope, blocking reason, and recovery or timeout route.",
        "motion": "Spinner and blur treatment must be optional and reduced-motion safe.",
        "extension": "Promote to stable only after blocking scope, busy-state, timeout, and fallback contracts are documented."
      }
    },
    {
      "id": "component.patterns-inline-error",
      "name": "InlineError",
      "kind": "component",
      "maturity": "candidate",
      "description": "Inline error pattern candidate for contextual error, warning, or info messages near affected content.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/patterns/InlineError.svelte",
      "importPath": "@create-something/canon/patterns",
      "docsPath": "/canon/components/patterns",
      "tags": [
        "patterns",
        "error",
        "inline",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.feedback-alert",
        "component.form-text-field"
      ],
      "contract": {
        "accessibility": "Inline messages must expose severity, message, related field or object, and dismiss action when present.",
        "evidence": "Error state must preserve message, code, severity, affected id, recovery action, and dismissal status.",
        "motion": "Error reveal and dismiss motion must be optional and must not remove critical recovery copy.",
        "extension": "Promote to stable only after severity, field-linking, dismissal, and recovery contracts are documented."
      }
    },
    {
      "id": "component.patterns-error-boundary",
      "name": "ErrorBoundary",
      "kind": "component",
      "maturity": "candidate",
      "description": "Error boundary pattern candidate for contained failure state, reset action, and diagnostic disclosure.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/patterns/ErrorBoundary.svelte",
      "importPath": "@create-something/canon/patterns",
      "docsPath": "/canon/components/patterns",
      "tags": [
        "patterns",
        "error",
        "boundary",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.clear-error-page",
        "component.button"
      ],
      "contract": {
        "accessibility": "Boundary fallback must announce failure, preserve the reset route, and keep diagnostic details optional.",
        "evidence": "Failure state must preserve title, message, error code or stack policy, reset action, and report route.",
        "motion": "Fallback entry and reset feedback must be optional and must not obscure the failure message.",
        "extension": "Promote to stable only after failure disclosure, reset, reporting, and diagnostic redaction contracts are documented."
      }
    },
    {
      "id": "component.navigation-sticky-header",
      "name": "StickyHeader",
      "kind": "component",
      "maturity": "candidate",
      "description": "Sticky header candidate for persistent site wayfinding with scroll-aware treatment and slots.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/navigation/StickyHeader.svelte",
      "importPath": "@create-something/canon/navigation",
      "docsPath": "/canon/components/navigation",
      "tags": [
        "navigation",
        "header",
        "sticky",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.navigation"
      ],
      "contract": {
        "accessibility": "Persistent headers must expose primary wayfinding, current context, and skip/focus behavior without relying on scroll position.",
        "evidence": "Header state should preserve logo route, primary links, scroll state, active location, and mobile fallback.",
        "motion": "Scroll treatment and sticky transitions must be optional and reduced-motion safe.",
        "extension": "Promote to stable only after sticky behavior, active-route, slot, and mobile fallback contracts are documented."
      }
    },
    {
      "id": "component.navigation-mobile-drawer",
      "name": "MobileDrawer",
      "kind": "component",
      "maturity": "candidate",
      "description": "Mobile drawer candidate for responsive navigation panels, sheets, and secondary route groups.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/navigation/MobileDrawer.svelte",
      "importPath": "@create-something/canon/navigation",
      "docsPath": "/canon/components/navigation",
      "tags": [
        "navigation",
        "drawer",
        "mobile",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.navigation",
        "component.navigation-drawer"
      ],
      "contract": {
        "accessibility": "Drawers must preserve close controls, modal context, focus management, and menu labels for nonvisual paths.",
        "evidence": "Drawer state should preserve open state, position, trigger label, contained links, and close reason.",
        "motion": "Slide and overlay transitions must respect reduced-motion preferences and never block the close route.",
        "extension": "Promote to stable only after focus trap, close behavior, position, and responsive fallback contracts are documented."
      }
    },
    {
      "id": "component.navigation-command-palette",
      "name": "CommandPalette",
      "kind": "component",
      "maturity": "candidate",
      "description": "Command palette candidate for keyboard-first command and route search over provided items.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/navigation/CommandPalette.svelte",
      "importPath": "@create-something/canon/navigation",
      "docsPath": "/canon/components/navigation",
      "tags": [
        "navigation",
        "command-palette",
        "keyboard",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.navigation-dropdown-menu",
        "component.form-text-field",
        "component.button"
      ],
      "contract": {
        "accessibility": "Command palettes must expose dialog state, search label, selected result, keyboard navigation, and close behavior.",
        "evidence": "Command data must preserve item ids, labels, descriptions, shortcuts, hrefs, selection index, and query.",
        "motion": "Palette entry, result highlighting, and close transitions must be optional and reduced-motion safe.",
        "extension": "Promote to stable only after command schema, keyboard model, shortcut, and nonvisual fallback contracts are documented."
      }
    },
    {
      "id": "component.navigation-unified-search",
      "name": "UnifiedSearch",
      "kind": "component",
      "maturity": "candidate",
      "description": "Unified search candidate for cross-property query, grouped results, local fallback, and analytics events.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/navigation/UnifiedSearch.svelte",
      "importPath": "@create-something/canon/navigation",
      "docsPath": "/canon/components/navigation",
      "tags": [
        "navigation",
        "search",
        "cross-property",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.navigation-dropdown-menu",
        "component.form-text-field",
        "component.feedback-alert"
      ],
      "contract": {
        "accessibility": "Search must expose query, grouped results, empty/loading/error states, selected result, and close behavior.",
        "evidence": "Search state must preserve query, source API, result ids, property groups, selected result, and emitted event names.",
        "motion": "Palette, mobile button, result focus, and loading treatment must respect reduced-motion preferences.",
        "extension": "Promote to stable only after result schema, API boundaries, analytics, grouping, and fallback contracts are documented."
      }
    },
    {
      "id": "component.navigation-related-content",
      "name": "RelatedContent",
      "kind": "component",
      "maturity": "candidate",
      "description": "Related content candidate for cross-property recommendations grouped by source and relationship.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/navigation/RelatedContent.svelte",
      "importPath": "@create-something/canon/navigation",
      "docsPath": "/canon/components/navigation",
      "tags": [
        "navigation",
        "related-content",
        "recommendation",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.navigation",
        "component.card",
        "component.feedback-alert"
      ],
      "contract": {
        "accessibility": "Related content must expose section title, grouped links, relationship labels, and loading/error states as text.",
        "evidence": "Related state must preserve content id, property, relationship, item ids, URLs, grouping, and fetch status.",
        "motion": "Loading and grouping transitions must be optional and cannot hide link text or relationship labels.",
        "extension": "Promote to stable only after related-item schema, grouping, fetch status, and source boundary contracts are documented."
      }
    },
    {
      "id": "component.navigation-concept-journey",
      "name": "ConceptJourney",
      "kind": "component",
      "maturity": "candidate",
      "description": "Concept journey candidate for tracing a topic across property stages, related artifacts, and source links.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/navigation/ConceptJourney.svelte",
      "importPath": "@create-something/canon/navigation",
      "docsPath": "/canon/components/navigation",
      "tags": [
        "navigation",
        "journey",
        "cross-property",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.navigation",
        "component.card",
        "component.feedback-alert"
      ],
      "contract": {
        "accessibility": "Journey stages must expose concept, stage order, item links, empty stages, loading, and error states structurally.",
        "evidence": "Journey data must preserve concept, stage keys, item ids, titles, URLs, property source, and active stage count.",
        "motion": "Timeline and stage transitions must be optional and cannot replace the ordered text path.",
        "extension": "Promote to stable only after journey schema, stage ordering, empty-state, and API boundary contracts are documented."
      }
    },
    {
      "id": "component.navigation-menu-button",
      "name": "MenuButton",
      "kind": "component",
      "maturity": "candidate",
      "description": "Menu button candidate for accessible responsive navigation toggles with open and close state.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/navigation/MenuButton.svelte",
      "importPath": "@create-something/canon/navigation",
      "docsPath": "/canon/components/navigation",
      "tags": [
        "navigation",
        "menu-button",
        "toggle",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.button",
        "component.navigation"
      ],
      "contract": {
        "accessibility": "Menu toggles must expose open/closed state, target label, focus treatment, and an equivalent text command.",
        "evidence": "Toggle state must preserve label, expanded state, target drawer/menu id, and activation source.",
        "motion": "Hamburger-to-close animation must be optional and must not be the only state indicator.",
        "extension": "Promote to stable only after target relationship, expanded-state, and reduced-motion contracts are documented."
      }
    },
    {
      "id": "component.navigation-mega-menu",
      "name": "MegaMenu",
      "kind": "component",
      "maturity": "candidate",
      "description": "Mega menu candidate for grouped route panels, featured links, and keyboard navigable menu structures.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/navigation/MegaMenu.svelte",
      "importPath": "@create-something/canon/navigation",
      "docsPath": "/canon/components/navigation",
      "tags": [
        "navigation",
        "mega-menu",
        "menu",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.navigation",
        "component.navigation-dropdown-menu",
        "component.navigation-drawer"
      ],
      "contract": {
        "accessibility": "Mega menus must preserve trigger labels, expanded state, menu roles, link groups, and keyboard navigation.",
        "evidence": "Menu data must preserve item ids, labels, hrefs, sections, featured links, active panel, and close reason.",
        "motion": "Panel reveal, hover delay, and chevron motion must be optional and reduced-motion safe.",
        "extension": "Promote to stable only after menu schema, keyboard model, responsive drawer, and active-panel contracts are documented."
      }
    },
    {
      "id": "component.filtering-filter-toggle-panel",
      "name": "FilterTogglePanel",
      "kind": "component",
      "maturity": "candidate",
      "description": "Filter control panel candidate for material, category, status, and price-range facets.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/filtering/FilterTogglePanel.svelte",
      "importPath": "@create-something/canon/filtering",
      "docsPath": "/canon/components/filtering",
      "tags": [
        "filtering",
        "facets",
        "toggle-panel",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.form-checkbox",
        "component.form-switch"
      ],
      "contract": {
        "accessibility": "Facet groups must expose labels, selected state, range values, clear action, and expanded state without visual-only toggles.",
        "evidence": "Filter state must preserve materials, categories, statuses, price min/max, and the configuration that produced each option.",
        "motion": "Panel collapse, toggle feedback, and range updates must remain usable without animation.",
        "extension": "Promote to stable only after facet schema, grouped option labels, range behavior, and clear/reset contracts are documented."
      }
    },
    {
      "id": "component.filtering-product-grid",
      "name": "ProductGrid",
      "kind": "component",
      "maturity": "candidate",
      "description": "Filtered product grid candidate for responsive catalog cards, empty state, and product metadata.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/filtering/ProductGrid.svelte",
      "importPath": "@create-something/canon/filtering",
      "docsPath": "/canon/components/filtering",
      "tags": [
        "filtering",
        "product-grid",
        "catalog",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.card",
        "component.patterns-empty-state"
      ],
      "contract": {
        "accessibility": "Product cards must preserve product name, image alt text, status, material, dimensions, price, and empty state text.",
        "evidence": "Product data must preserve stable ids, category, materials, dimensions, price in cents, status, and image source.",
        "motion": "Card hover elevation and grid transitions must be optional and reduced-motion safe.",
        "extension": "Promote to stable only after product schema, empty-action slot, image fallback, and formatting contracts are documented."
      }
    },
    {
      "id": "component.filtering-agent-panel",
      "name": "AgentPanel",
      "kind": "component",
      "maturity": "candidate",
      "description": "Agent-assisted filtering panel candidate for natural-language queries, reasoning trace, and applied filter summary.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/filtering/AgentPanel.svelte",
      "importPath": "@create-something/canon/filtering",
      "docsPath": "/canon/components/filtering",
      "tags": [
        "filtering",
        "agent-panel",
        "reasoning",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.form-text-field",
        "component.button",
        "component.filtering-filter-toggle-panel"
      ],
      "contract": {
        "accessibility": "Agent panels must expose query input, loading state, example queries, reasoning visibility, and applied filters as readable text.",
        "evidence": "Agent steps must preserve type, content, optional tool metadata, timestamp, explanation, and resulting filter state.",
        "motion": "Reasoning reveal, example-chip feedback, and loading treatment must not delay query submission or applied-filter summary.",
        "extension": "Promote to stable only after query schema, tool-trace disclosure, loading behavior, and filter summary contracts are documented."
      }
    },
    {
      "id": "component.insights-key-insight",
      "name": "KeyInsight",
      "kind": "component",
      "maturity": "candidate",
      "description": "Shareable key insight visual candidate for full-screen, inline, card, and exportable proof statements.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/insights/KeyInsight.svelte",
      "importPath": "@create-something/canon/insights",
      "docsPath": "/canon/components/insights",
      "tags": [
        "insights",
        "proof",
        "shareable",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.insights-statement-text",
        "component.clear-proof-strip"
      ],
      "contract": {
        "accessibility": "Insight visuals must expose the principle, source, comparison rows, interaction trigger, and final revealed text outside animation.",
        "evidence": "Insight data must preserve id, principle, optional statement words, comparison rows, source URL, property, paper id, and category.",
        "motion": "Click, scroll, and auto revelation must be optional and must respect reduced-motion and static export contexts.",
        "extension": "Promote to stable only after export formats, source attribution, statement fallback, and interaction-trigger contracts are documented."
      }
    },
    {
      "id": "component.insights-key-insight-card",
      "name": "KeyInsightCard",
      "kind": "component",
      "maturity": "candidate",
      "description": "Compact insight card candidate for embedding proof statements and before/after comparisons in papers and articles.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/insights/KeyInsightCard.svelte",
      "importPath": "@create-something/canon/insights",
      "docsPath": "/canon/components/insights",
      "tags": [
        "insights",
        "card",
        "comparison",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.card",
        "component.insights-key-insight"
      ],
      "contract": {
        "accessibility": "Insight cards must keep the key insight label, category, principle, comparison rows, link target, and source readable.",
        "evidence": "Card data must preserve the same insight config as the full view plus optional href for full-screen inspection.",
        "motion": "Card hover lift and focus treatment must be optional and cannot replace the link or source text.",
        "extension": "Promote to stable only after inline density, comparison wrapping, source behavior, and full-view linking contracts are documented."
      }
    },
    {
      "id": "component.insights-statement-text",
      "name": "StatementText",
      "kind": "component",
      "maturity": "candidate",
      "description": "Word-level statement revelation candidate for subtractive typography, essence extraction, and reverse reading.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/insights/StatementText.svelte",
      "importPath": "@create-something/canon/insights",
      "docsPath": "/canon/components/insights",
      "tags": [
        "insights",
        "statement",
        "typography",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.heading",
        "component.typography-typography-hero"
      ],
      "contract": {
        "accessibility": "Statement text must preserve full words, kept words, emphasis, phase, direction, and readable essence without animation.",
        "evidence": "Statement data must preserve ordered words, keep/remove metadata, optional emphasis, and derived essence text.",
        "motion": "Striking, fading, coalescing, and reverse expansion must be reduced-motion safe and must not be the only path to the insight.",
        "extension": "Promote to stable only after word schema, phase semantics, essence fallback, and export-safe typography contracts are documented."
      }
    },
    {
      "id": "component.content-video-lightbox",
      "name": "VideoLightbox",
      "kind": "component",
      "maturity": "candidate",
      "description": "Video lightbox candidate for thumbnail-triggered YouTube, Vimeo, or direct-video playback.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/content/VideoLightbox.svelte",
      "importPath": "@create-something/canon/content",
      "docsPath": "/canon/components/content",
      "tags": [
        "content",
        "video",
        "lightbox",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.button"
      ],
      "contract": {
        "accessibility": "Video triggers must expose title, play action, close action, modal state, captions path, and provider fallback.",
        "evidence": "Video data must preserve provider URL, embed URL, thumbnail URL, title, aspect ratio, and playback state.",
        "motion": "Lightbox fade, scale, and play-button hover treatment must be optional and cannot block Escape or close controls.",
        "extension": "Promote to stable only after provider parsing, captions, focus management, thumbnail fallback, and close behavior contracts are documented."
      }
    },
    {
      "id": "component.content-carousel",
      "name": "Carousel",
      "kind": "component",
      "maturity": "candidate",
      "description": "Generic content carousel candidate for indexed slide collections with arrows, dots, looping, and autoplay.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/content/Carousel.svelte",
      "importPath": "@create-something/canon/content",
      "docsPath": "/canon/components/content",
      "tags": [
        "content",
        "carousel",
        "slides",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.button"
      ],
      "contract": {
        "accessibility": "Carousel slides must expose region label, current index, slide count, previous/next actions, dot labels, and hidden state.",
        "evidence": "Carousel state must preserve slide order, current index, loop setting, autoplay interval, pause state, and rendering slot semantics.",
        "motion": "Slide translation and autoplay must be pausable, reduced-motion safe, and never the only way to discover slide content.",
        "extension": "Promote to stable only after keyboard behavior, autoplay policy, slide schema, and nonvisual summary contracts are documented."
      }
    },
    {
      "id": "component.content-testimonial-carousel",
      "name": "TestimonialCarousel",
      "kind": "component",
      "maturity": "candidate",
      "description": "Social proof carousel candidate for testimonials with quote, author, role, avatar, rating, and navigation state.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/content/TestimonialCarousel.svelte",
      "importPath": "@create-something/canon/content",
      "docsPath": "/canon/components/content",
      "tags": [
        "content",
        "testimonial",
        "social-proof",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.content-carousel",
        "component.clear-proof-strip"
      ],
      "contract": {
        "accessibility": "Testimonials must expose quote text, author, role, avatar alt text, rating text, current index, and navigation actions.",
        "evidence": "Testimonial data must preserve quote, author, role, avatar URL, rating, headline, subheadline, and proof ordering.",
        "motion": "Auto-rotation, card fade, and horizontal movement must pause on interaction and remain reduced-motion safe.",
        "extension": "Promote to stable only after quote provenance, rating semantics, autoplay policy, and proof/source attribution contracts are documented."
      }
    },
    {
      "id": "component.conversion-trust-signals",
      "name": "TrustSignals",
      "kind": "component",
      "maturity": "candidate",
      "description": "Trust signal strip candidate for client, certification, association, or press credibility marks.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/conversion/TrustSignals.svelte",
      "importPath": "@create-something/canon/conversion",
      "docsPath": "/canon/components/conversion",
      "tags": [
        "conversion",
        "trust",
        "proof",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.clear-proof-strip"
      ],
      "contract": {
        "accessibility": "Trust marks must expose headline, item names, logo alt text, fallback logo text, variant, and compact state.",
        "evidence": "Trust data must preserve item name, logo URL or logo text, trust category, and ordering source.",
        "motion": "Logo hover opacity and filter changes must be optional and cannot be the only credibility cue.",
        "extension": "Promote to stable only after logo fallback, source attribution, variant naming, and proof-ordering contracts are documented."
      }
    },
    {
      "id": "component.conversion-sticky-cta",
      "name": "StickyCTA",
      "kind": "component",
      "maturity": "candidate",
      "description": "Journey-aware sticky call-to-action candidate that changes message by scroll depth.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/conversion/StickyCTA.svelte",
      "importPath": "@create-something/canon/conversion",
      "docsPath": "/canon/components/conversion",
      "tags": [
        "conversion",
        "cta",
        "journey-depth",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.button",
        "component.clear-cta-band"
      ],
      "contract": {
        "accessibility": "Sticky actions must expose href, current message, journey depth, visible state, and text alternative to the arrow.",
        "evidence": "CTA state must preserve scroll threshold, early/mid/late messages, selected journey depth, and destination.",
        "motion": "Slide-up, hover lift, arrow movement, and late-state emphasis must be optional and reduced-motion safe.",
        "extension": "Promote to stable only after scroll-depth policy, message schema, mobile placement, and dismissal/overlap contracts are documented."
      }
    },
    {
      "id": "component.conversion-process-steps",
      "name": "ProcessSteps",
      "kind": "component",
      "maturity": "candidate",
      "description": "Process disclosure candidate for numbered engagement steps with optional connectors and section copy.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/conversion/ProcessSteps.svelte",
      "importPath": "@create-something/canon/conversion",
      "docsPath": "/canon/components/conversion",
      "tags": [
        "conversion",
        "process",
        "steps",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.patterns-multi-step-form",
        "component.clear-state-rows"
      ],
      "contract": {
        "accessibility": "Process steps must preserve headline, subheadline, ordered number, title, description, and connector semantics as readable text.",
        "evidence": "Process data must preserve step number, title, description, order, and whether connectors are presentation-only.",
        "motion": "Connector and layout treatments must not be required to understand step order or completion state.",
        "extension": "Promote to stable only after step schema, connector policy, responsive order, and nonvisual summary contracts are documented."
      }
    },
    {
      "id": "component.conversion-metric-counters",
      "name": "MetricCounters",
      "kind": "component",
      "maturity": "candidate",
      "description": "Metric counter candidate for proof statistics with prefix, suffix, label, and scroll-triggered count-up.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/conversion/MetricCounters.svelte",
      "importPath": "@create-something/canon/conversion",
      "docsPath": "/canon/components/conversion",
      "tags": [
        "conversion",
        "metrics",
        "proof",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.clear-proof-strip"
      ],
      "contract": {
        "accessibility": "Metric counters must expose final numeric value, prefix, suffix, label, and source context without relying on count-up animation.",
        "evidence": "Metric data must preserve value, label, prefix, suffix, display order, and measurement source when available.",
        "motion": "Count-up and entrance staggering must resolve immediately for reduced-motion users and never hide final values.",
        "extension": "Promote to stable only after metric provenance, formatting, reduced-motion final-state, and responsive divider contracts are documented."
      }
    },
    {
      "id": "component.conversion-exit-intent",
      "name": "ExitIntent",
      "kind": "component",
      "maturity": "candidate",
      "description": "Exit-intent modal candidate for value-preserving retention prompts with storage, delay, and conversion callbacks.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/conversion/ExitIntent.svelte",
      "importPath": "@create-something/canon/conversion",
      "docsPath": "/canon/components/conversion",
      "tags": [
        "conversion",
        "modal",
        "retention",
        "candidate"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "component.feedback-dialog",
        "component.button"
      ],
      "contract": {
        "accessibility": "Exit intent prompts must expose dialog title, description, close action, CTA, dismissal, storage policy, and Escape behavior.",
        "evidence": "Prompt state must preserve activation delay, scroll depth threshold, storage key, session policy, sensitivity, disabled state, and callback events.",
        "motion": "Backdrop fade and dialog slide-up must be optional and must not trap users or delay close behavior.",
        "extension": "Promote to stable only after storage consent, trigger policy, focus management, callback semantics, and value-offer contracts are documented."
      }
    },
    {
      "id": "component.clear-page-section",
      "name": "ClearPageSection",
      "kind": "component",
      "maturity": "stable",
      "description": "Open page section primitive for clear communication layouts with restrained spacing and readable hierarchy.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/clear/ClearPageSection.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/clear",
      "tags": [
        "clear",
        "layout",
        "section",
        "surface"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Sections must preserve heading order, landmarks, and readable spacing.",
        "extension": "Use page sections for full-width layout bands instead of nested card shells."
      }
    },
    {
      "id": "component.clear-error-page",
      "name": "ClearErrorPage",
      "kind": "component",
      "maturity": "stable",
      "description": "Plain-language error state surface that names what happened and the next recovery action.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/clear/ClearErrorPage.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/clear",
      "tags": [
        "clear",
        "error",
        "recovery",
        "state"
      ],
      "modalities": [
        "web",
        "app",
        "chat"
      ],
      "dependencies": [
        "token.canon-core",
        "policy.signal-decision-proof"
      ],
      "contract": {
        "accessibility": "Error surfaces must state the problem and recovery path in text.",
        "evidence": "When possible, include receipt, owner, or support route for the failure.",
        "extension": "Project overlays may provide local support copy without replacing the primitive."
      }
    },
    {
      "id": "component.clear-platform-hero",
      "name": "ClearPlatformHero",
      "kind": "component",
      "maturity": "stable",
      "description": "First-screen platform hero that pairs a plain operational claim with proof metadata.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/clear/ClearPlatformHero.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/clear",
      "tags": [
        "clear",
        "hero",
        "claim",
        "proof"
      ],
      "modalities": [
        "web",
        "app",
        "chat"
      ],
      "dependencies": [
        "token.canon-core",
        "component.clear-proof-strip"
      ],
      "contract": {
        "accessibility": "Hero claims must remain readable as text and not depend on decorative media.",
        "evidence": "Claims need adjacent proof metadata or a route to receipts.",
        "extension": "Project overlays own local offer copy while Canon owns the claim/proof structure."
      }
    },
    {
      "id": "component.clear-logo-strip",
      "name": "ClearLogoStrip",
      "kind": "component",
      "maturity": "stable",
      "description": "Compact trust or partner strip for recognizable proof without crowding the page.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/clear/ClearLogoStrip.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/clear",
      "tags": [
        "clear",
        "proof",
        "logos",
        "trust"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Logo rows need text alternatives and must not be the only proof claim.",
        "evidence": "Use only when the relationship or receipt behind the mark is true.",
        "extension": "Local overlays provide logo assets and labels; Canon owns strip structure."
      }
    },
    {
      "id": "component.clear-proof-strip",
      "name": "ClearProofStrip",
      "kind": "component",
      "maturity": "stable",
      "description": "Compact proof objects for claims, validation gates, receipts, and trust evidence.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/clear/ClearProofStrip.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/clear",
      "tags": [
        "clear",
        "proof",
        "evidence",
        "receipt"
      ],
      "modalities": [
        "web",
        "app",
        "chat"
      ],
      "dependencies": [
        "token.canon-core",
        "policy.signal-decision-proof"
      ],
      "contract": {
        "evidence": "Proof items must connect claims to concrete artifacts, checks, or receipts.",
        "extension": "Prefer this when multiple proof objects need to be scanned together."
      }
    },
    {
      "id": "component.clear-workflow-mini-artifact",
      "name": "ClearWorkflowMiniArtifact",
      "kind": "component",
      "maturity": "stable",
      "description": "Small workflow artifact card for showing object, state, owner, and receipt in compact surfaces.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/clear/ClearWorkflowMiniArtifact.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/clear",
      "tags": [
        "clear",
        "workflow",
        "artifact",
        "receipt"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "policy.signal-decision-proof"
      ],
      "contract": {
        "accessibility": "Mini artifacts must keep object, state, and owner readable without hover.",
        "evidence": "Receipt or source metadata should sit near the workflow state.",
        "extension": "Use for compact workflow previews before inventing local status cards."
      }
    },
    {
      "id": "component.clear-state-rows",
      "name": "ClearStateRows",
      "kind": "component",
      "maturity": "stable",
      "description": "Scannable rows for workflow state, owner, evidence, and next action.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/clear/ClearStateRows.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/clear",
      "tags": [
        "clear",
        "state",
        "workflow",
        "owner"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "policy.signal-decision-proof"
      ],
      "contract": {
        "accessibility": "State must be encoded in text and structure, not color alone.",
        "evidence": "Rows should name owner, evidence, receipt, or next action.",
        "extension": "Use for operational state lists across web, chat summaries, and thin displays."
      }
    },
    {
      "id": "component.clear-artifact-card",
      "name": "ClearArtifactCard",
      "kind": "component",
      "maturity": "stable",
      "description": "Card for a single proof artifact, policy object, receipt, or source-of-truth item.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/clear/ClearArtifactCard.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/clear",
      "tags": [
        "clear",
        "artifact",
        "proof",
        "card"
      ],
      "modalities": [
        "web",
        "app",
        "chat"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Artifact cards need explicit titles and link/action labels.",
        "evidence": "Artifact metadata should identify what is proved and where the source lives.",
        "extension": "Use before creating local proof cards for individual artifacts."
      }
    },
    {
      "id": "component.clear-card-grid",
      "name": "ClearCardGrid",
      "kind": "component",
      "maturity": "stable",
      "description": "Repeated clear cards for comparable work objects, offers, artifacts, or services.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/clear/ClearCardGrid.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/clear",
      "tags": [
        "clear",
        "grid",
        "cards",
        "comparison"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Card grids must preserve readable headings and stable focus order.",
        "extension": "Use for repeated items; avoid nested card-in-card page composition."
      }
    },
    {
      "id": "component.clear-use-case-band",
      "name": "ClearUseCaseBand",
      "kind": "component",
      "maturity": "stable",
      "description": "Use-case band for mapping audience needs to outcomes, proof, and actions.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/clear/ClearUseCaseBand.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/clear",
      "tags": [
        "clear",
        "use-case",
        "outcome",
        "workflow"
      ],
      "modalities": [
        "web",
        "app",
        "chat"
      ],
      "dependencies": [
        "token.canon-core",
        "policy.signal-decision-proof"
      ],
      "contract": {
        "accessibility": "Use cases must be stated as workflow needs and outcomes.",
        "evidence": "Each use case should connect to proof, receipt, or a next action.",
        "extension": "Project overlays provide domain-specific use cases without changing the band."
      }
    },
    {
      "id": "component.clear-quote-metric-panel",
      "name": "ClearQuoteMetricPanel",
      "kind": "component",
      "maturity": "stable",
      "description": "Panel pairing a human quote with metric proof or operational evidence.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/clear/ClearQuoteMetricPanel.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/clear",
      "tags": [
        "clear",
        "quote",
        "metric",
        "proof"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Quotes and metrics must remain readable as text.",
        "evidence": "Metrics need labels and should not imply precision without source proof.",
        "extension": "Local overlays provide quote and metric content; Canon owns the proof layout."
      }
    },
    {
      "id": "component.clear-pillar-grid",
      "name": "ClearPillarGrid",
      "kind": "component",
      "maturity": "stable",
      "description": "Pillar grid for principle, capability, or workflow structure summaries.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/clear/ClearPillarGrid.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/clear",
      "tags": [
        "clear",
        "pillars",
        "principles",
        "structure"
      ],
      "modalities": [
        "web",
        "app",
        "chat"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Pillars need descriptive headings and optional links with clear labels.",
        "extension": "Use for structured explanation before creating local principle grids."
      }
    },
    {
      "id": "component.clear-metadata-rail",
      "name": "ClearMetadataRail",
      "kind": "component",
      "maturity": "stable",
      "description": "Metadata rail for owner, source, receipt, status, and related workflow facts.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/clear/ClearMetadataRail.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/clear",
      "tags": [
        "clear",
        "metadata",
        "owner",
        "receipt"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice"
      ],
      "dependencies": [
        "token.canon-core",
        "policy.signal-decision-proof"
      ],
      "contract": {
        "accessibility": "Metadata labels and values must remain paired in text.",
        "evidence": "Rails should expose owner, source, receipt, or status metadata near decisions.",
        "extension": "Use for supporting facts instead of hiding trust details in prose."
      }
    },
    {
      "id": "component.clear-security-panel",
      "name": "ClearSecurityPanel",
      "kind": "component",
      "maturity": "stable",
      "description": "Security and governance panel for controls, logs, owners, and review state.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/clear/ClearSecurityPanel.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/clear",
      "tags": [
        "clear",
        "security",
        "governance",
        "controls"
      ],
      "modalities": [
        "web",
        "app",
        "chat"
      ],
      "dependencies": [
        "token.canon-core",
        "policy.signal-decision-proof"
      ],
      "contract": {
        "accessibility": "Security state must be visible in text and grouped by control or log.",
        "evidence": "Controls and logs should identify owner, state, and proof.",
        "extension": "Project policy details stay local while Canon owns the security display pattern."
      }
    },
    {
      "id": "component.clear-content-highlights",
      "name": "ClearContentHighlights",
      "kind": "component",
      "maturity": "stable",
      "description": "Highlight list for key claims, lessons, capabilities, or evidence points.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/clear/ClearContentHighlights.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/clear",
      "tags": [
        "clear",
        "content",
        "highlights",
        "claims"
      ],
      "modalities": [
        "web",
        "app",
        "chat"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Highlights must use readable text labels and not only visual emphasis.",
        "extension": "Use for compact content summaries before creating local feature lists."
      }
    },
    {
      "id": "component.clear-receipt-grid",
      "name": "ClearReceiptGrid",
      "kind": "component",
      "maturity": "stable",
      "description": "Grid for receipts, validation proof, artifacts, and completion evidence.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/clear/ClearReceiptGrid.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/clear",
      "tags": [
        "clear",
        "receipt",
        "proof",
        "validation"
      ],
      "modalities": [
        "web",
        "app",
        "chat"
      ],
      "dependencies": [
        "token.canon-core",
        "policy.signal-decision-proof"
      ],
      "contract": {
        "accessibility": "Receipts need labels, status text, and navigable links when interactive.",
        "evidence": "Every receipt should identify what was validated and where proof lives.",
        "extension": "Use before inventing local proof grids or launch evidence panels."
      }
    },
    {
      "id": "component.clear-cta-band",
      "name": "ClearCtaBand",
      "kind": "component",
      "maturity": "stable",
      "description": "Call-to-action band that names the next action and supporting proof.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/clear/ClearCtaBand.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/clear",
      "tags": [
        "clear",
        "cta",
        "action",
        "handoff"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Action labels must describe the outcome and remain keyboard reachable.",
        "evidence": "When trust matters, pair the action with a proof or receipt cue.",
        "extension": "Local overlays provide action copy and destinations; Canon owns band structure."
      }
    },
    {
      "id": "component.clear-action-footer",
      "name": "ClearActionFooter",
      "kind": "component",
      "maturity": "stable",
      "description": "Footer action group for final commands, secondary routes, and handoff state.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/clear/ClearActionFooter.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/clear",
      "tags": [
        "clear",
        "action",
        "footer",
        "handoff"
      ],
      "modalities": [
        "web",
        "app",
        "chat"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Footer actions must be clearly labeled and ordered by expected workflow.",
        "extension": "Use for terminal action groups before creating local footer button clusters."
      }
    },
    {
      "id": "component.clear-decision-panel",
      "name": "ClearDecisionPanel",
      "kind": "component",
      "maturity": "stable",
      "description": "Clear communication surface for allow, review, block, and neutral decision states with evidence and receipts.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/clear/ClearDecisionPanel.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/clear",
      "tags": [
        "clear",
        "decision",
        "run-wait-stop",
        "evidence",
        "receipt"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "policy.signal-decision-proof"
      ],
      "contract": {
        "accessibility": "Decision state must be present in text and structure, not only color or animation.",
        "evidence": "Every decision item should name evidence, receipt, owner, or next action.",
        "motion": "Motion is limited to state, selection, progression, or handoff.",
        "extension": "Use this before inventing local decision cards, approval panels, or status shells."
      }
    },
    {
      "id": "component.form-text-field",
      "name": "TextField",
      "kind": "component",
      "maturity": "stable",
      "description": "Labeled single-line text input with description, error, and size variants.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/form/TextField.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/form",
      "tags": [
        "form",
        "input",
        "text",
        "control"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Text inputs need visible labels, described-by help or error text, and keyboard focus.",
        "extension": "Use form control variants before creating local text input wrappers."
      }
    },
    {
      "id": "component.form-text-area",
      "name": "TextArea",
      "kind": "component",
      "maturity": "stable",
      "description": "Labeled multi-line text input for longer user-entered content.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/form/TextArea.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/form",
      "tags": [
        "form",
        "input",
        "textarea",
        "control"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Text areas need visible labels, described-by help or error text, and keyboard focus.",
        "extension": "Use when the user must provide prose, notes, or longer structured input."
      }
    },
    {
      "id": "component.form-checkbox",
      "name": "Checkbox",
      "kind": "component",
      "maturity": "stable",
      "description": "Binary option control for explicit opt-in, selection, and setting toggles.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/form/Checkbox.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/form",
      "tags": [
        "form",
        "input",
        "selection",
        "binary"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Checkbox state must be programmatically exposed and not depend on color alone.",
        "extension": "Use for independent binary choices before creating local toggle markup."
      }
    },
    {
      "id": "component.form-checkbox-group",
      "name": "CheckboxGroup",
      "kind": "component",
      "maturity": "stable",
      "description": "Grouped checkbox options with shared label, description, and error treatment.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/form/CheckboxGroup.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/form",
      "tags": [
        "form",
        "input",
        "selection",
        "group"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "token.canon-core",
        "component.form-checkbox"
      ],
      "contract": {
        "accessibility": "Grouped checkboxes need a group label and clear relationship between options and errors.",
        "extension": "Use for multi-select option sets before creating local fieldset wrappers."
      }
    },
    {
      "id": "component.form-radio",
      "name": "Radio",
      "kind": "component",
      "maturity": "stable",
      "description": "Single option control for mutually exclusive selections inside a radio group.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/form/Radio.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/form",
      "tags": [
        "form",
        "input",
        "selection",
        "single-choice"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Radio state and label must be programmatically exposed for keyboard users.",
        "extension": "Use inside RadioGroup for mutually exclusive choices."
      }
    },
    {
      "id": "component.form-radio-group",
      "name": "RadioGroup",
      "kind": "component",
      "maturity": "stable",
      "description": "Grouped mutually exclusive options with shared label and validation treatment.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/form/RadioGroup.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/form",
      "tags": [
        "form",
        "input",
        "selection",
        "group"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "token.canon-core",
        "component.form-radio"
      ],
      "contract": {
        "accessibility": "Radio groups need one selected value, keyboard navigation, and a visible group label.",
        "extension": "Use for single-choice option sets before creating local segmented inputs."
      }
    },
    {
      "id": "component.form-select",
      "name": "Select",
      "kind": "component",
      "maturity": "stable",
      "description": "Labeled option menu for compact single-value selection.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/form/Select.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/form",
      "tags": [
        "form",
        "input",
        "menu",
        "selection"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Select controls need a visible label, valid option text, and error messaging.",
        "extension": "Use for known option sets before creating local dropdown form controls."
      }
    },
    {
      "id": "component.form-switch",
      "name": "Switch",
      "kind": "component",
      "maturity": "stable",
      "description": "Immediate on/off setting control with explicit checked state.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/form/Switch.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/form",
      "tags": [
        "form",
        "input",
        "toggle",
        "setting"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Switches need readable labels and state exposed as checked or unchecked.",
        "extension": "Use for settings that take effect as on/off choices."
      }
    },
    {
      "id": "component.feedback-alert",
      "name": "Alert",
      "kind": "component",
      "maturity": "stable",
      "description": "Inline status message for success, warning, error, and informational states.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/feedback/Alert.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/feedback",
      "tags": [
        "feedback",
        "status",
        "message",
        "notice"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "policy.signal-decision-proof"
      ],
      "contract": {
        "accessibility": "Alert severity and message must be available in text, not only color.",
        "evidence": "Operational alerts should name the affected object, owner, or recovery route.",
        "extension": "Use alerts for bounded status messages before creating local notice components."
      }
    },
    {
      "id": "component.feedback-toast",
      "name": "Toast",
      "kind": "component",
      "maturity": "stable",
      "description": "Temporary status notification for completion, recovery, and lightweight feedback.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/feedback/Toast.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/feedback",
      "tags": [
        "feedback",
        "status",
        "notification",
        "message"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Toast content must not be the only place critical information or recovery actions appear.",
        "extension": "Use for transient confirmations; durable decisions need a persistent surface."
      }
    },
    {
      "id": "component.feedback-dialog",
      "name": "Dialog",
      "kind": "component",
      "maturity": "stable",
      "description": "Focused modal surface for confirmation, interruption, and bounded decisions.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/feedback/Dialog.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/feedback",
      "tags": [
        "feedback",
        "modal",
        "decision",
        "focus"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "token.canon-core",
        "policy.signal-decision-proof"
      ],
      "contract": {
        "accessibility": "Dialogs must trap focus, expose a title, and provide keyboard dismissal rules.",
        "evidence": "Decision dialogs should name consequence, owner, or rollback path when relevant.",
        "extension": "Use for focused interruptions before inventing local modal shells."
      }
    },
    {
      "id": "component.feedback-progress",
      "name": "Progress",
      "kind": "component",
      "maturity": "stable",
      "description": "Progress indicator for determinate or indeterminate operation state.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/feedback/Progress.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/feedback",
      "tags": [
        "feedback",
        "status",
        "loading",
        "progress"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Progress state needs text or semantic value when the operation is meaningful.",
        "evidence": "Long-running operations should expose the active step or receipt path.",
        "extension": "Use for operation state before creating local loading bars."
      }
    },
    {
      "id": "component.feedback-spinner",
      "name": "Spinner",
      "kind": "component",
      "maturity": "stable",
      "description": "Compact indeterminate loading indicator for short waits and inline operations.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/feedback/Spinner.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/feedback",
      "tags": [
        "feedback",
        "status",
        "loading",
        "pending"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Spinners need an accessible label when they communicate active work.",
        "extension": "Use only for short waits; provide durable state for longer operations."
      }
    },
    {
      "id": "component.feedback-skeleton",
      "name": "Skeleton",
      "kind": "component",
      "maturity": "stable",
      "description": "Placeholder loading surface that preserves layout while content resolves.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/feedback/Skeleton.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/feedback",
      "tags": [
        "feedback",
        "status",
        "loading",
        "placeholder"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Skeletons must not be announced as real content.",
        "extension": "Use to preserve layout during loading before creating local placeholder blocks."
      }
    },
    {
      "id": "component.navigation-breadcrumbs",
      "name": "Breadcrumbs",
      "kind": "component",
      "maturity": "stable",
      "description": "Hierarchical wayfinding trail for nested routes and content locations.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/navigation/Breadcrumbs.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/navigation",
      "tags": [
        "navigation",
        "wayfinding",
        "route",
        "hierarchy"
      ],
      "modalities": [
        "web",
        "app",
        "chat"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Breadcrumbs need ordered links with a clear current location.",
        "extension": "Use for nested route context before creating local crumb trails."
      }
    },
    {
      "id": "component.navigation-tabs",
      "name": "Tabs",
      "kind": "component",
      "maturity": "stable",
      "description": "Tabbed view switcher for related panels within one workflow context.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/navigation/Tabs.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/navigation",
      "tags": [
        "navigation",
        "wayfinding",
        "views",
        "panels"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Tabs need keyboard navigation, selected state, and associated panels.",
        "extension": "Use for peer views before creating local segmented navigation."
      }
    },
    {
      "id": "component.navigation-pagination",
      "name": "Pagination",
      "kind": "component",
      "maturity": "stable",
      "description": "Paged-list navigation for long result sets and ordered collections.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/navigation/Pagination.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/navigation",
      "tags": [
        "navigation",
        "wayfinding",
        "pages",
        "collection"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Pagination needs descriptive labels and current page state.",
        "extension": "Use for ordered collections before creating local page controls."
      }
    },
    {
      "id": "component.navigation-tooltip",
      "name": "Tooltip",
      "kind": "component",
      "maturity": "stable",
      "description": "Short contextual label or help text for compact controls.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/navigation/Tooltip.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/navigation",
      "tags": [
        "navigation",
        "help",
        "context",
        "label"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Tooltips must not contain critical information unavailable through visible text or labels.",
        "extension": "Use for supplemental hints, not primary instructions."
      }
    },
    {
      "id": "component.navigation-popover",
      "name": "Popover",
      "kind": "component",
      "maturity": "stable",
      "description": "Anchored contextual surface for compact controls, filters, and secondary content.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/navigation/Popover.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/navigation",
      "tags": [
        "navigation",
        "overlay",
        "context",
        "surface"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Popovers need focus management and clear trigger relationships.",
        "extension": "Use for anchored contextual content before creating local floating panels."
      }
    },
    {
      "id": "component.navigation-dropdown-menu",
      "name": "DropdownMenu",
      "kind": "component",
      "maturity": "stable",
      "description": "Menu surface for grouped commands, options, and secondary routes.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/navigation/DropdownMenu.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/navigation",
      "tags": [
        "navigation",
        "menu",
        "commands",
        "options"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Menus need keyboard navigation, roles, and explicit item labels.",
        "extension": "Use for compact command sets before creating local action menus."
      }
    },
    {
      "id": "component.navigation-drawer",
      "name": "Drawer",
      "kind": "component",
      "maturity": "stable",
      "description": "Edge-attached panel for navigation, filters, or secondary workflow content.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/navigation/Drawer.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/navigation",
      "tags": [
        "navigation",
        "overlay",
        "panel",
        "mobile"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Drawers need focus management, close controls, and clear title context.",
        "extension": "Use for secondary workflow surfaces before creating local side panels."
      }
    },
    {
      "id": "adapter.atlas-graph-artifact",
      "name": "Atlas Graph Artifact",
      "kind": "adapter",
      "maturity": "stable",
      "description": "Renderer-independent workflow graph contract for human-readable and agent-readable maps.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/atlas/headless.ts",
      "importPath": "@create-something/canon/atlas/headless",
      "docsPath": "/canon/components/clear",
      "tags": [
        "atlas",
        "graph",
        "workflow-map",
        "agent-contract"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "policy.signal-decision-proof"
      ],
      "contract": {
        "evidence": "Graph nodes must preserve owner, status, products, and source-of-truth role.",
        "extension": "Renderers may change by modality, but the graph/story artifact shape stays Canon-owned."
      }
    },
    {
      "id": "template.atlas-development-handoff",
      "name": "Atlas Development Handoff Template",
      "kind": "template",
      "maturity": "candidate",
      "description": "Agent-readable handoff packet that turns an Atlas workflow map into Database, Automation, Judgment, Linear, verification, and stop-condition sections.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/atlas/handoff.ts",
      "importPath": "@create-something/canon/atlas/handoff",
      "docsPath": "/canon/resources/registry",
      "tags": [
        "atlas",
        "handoff",
        "linear",
        "template",
        "agent-contract",
        "workflow-map"
      ],
      "modalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "adapter.atlas-graph-artifact",
        "policy.signal-decision-proof"
      ],
      "contract": {
        "accessibility": "Handoff packets must preserve readable text sections so chat, voice, and thin displays can summarize without relying on visual-only state.",
        "evidence": "Every packet must name the durable record, run path, approval point, stop condition, proof surface, verification command, and Linear evidence path.",
        "extension": "Project overlays may add local context, but the Atlas-to-development packet structure stays Canon-owned."
      }
    },
    {
      "id": "policy.signal-decision-proof",
      "name": "Signal Decision Proof Contract",
      "kind": "policy",
      "maturity": "stable",
      "description": "Governance product loop: Atlas maps, Signal captures, Decision routes, Proof records back to Atlas.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/governance/products.ts",
      "importPath": "@create-something/canon/governance",
      "docsPath": "/canon/components/clear",
      "tags": [
        "atlas",
        "signal",
        "decision",
        "proof",
        "governance"
      ],
      "modalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "contract": {
        "evidence": "Production surfaces must preserve the loop: Atlas -> Signal -> Decision -> Proof -> Atlas.",
        "extension": "New products attach to this loop instead of inventing parallel IDs."
      }
    },
    {
      "id": "template.canon-extension-intake",
      "name": "Canon Extension Intake Template",
      "kind": "template",
      "maturity": "candidate",
      "description": "Machine-readable packet for project and client overlays to propose Canon extensions, candidate promotion, or deprecated replacement routing.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/registry/schema.ts",
      "importPath": "@create-something/canon/registry",
      "docsPath": "/canon/resources/registry",
      "tags": [
        "template",
        "extension",
        "intake",
        "overlay",
        "promotion",
        "governance"
      ],
      "modalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "policy.signal-decision-proof"
      ],
      "contract": {
        "accessibility": "Extension packets must name modality constraints before a display primitive is promoted.",
        "evidence": "Candidate promotion requires evidence from at least two distinct surfaces or clients.",
        "extension": "Project overlays own project-local evidence; Canon owns stable exports, docs, tests, and compatibility."
      }
    },
    {
      "id": "template.canon-project-overlay-manifest",
      "name": "Canon Project Overlay Manifest",
      "kind": "template",
      "maturity": "candidate",
      "description": "Machine-readable manifest for project and client overlays to declare theme, token, template, copy, policy, and registry artifacts without forking Canon primitives.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/registry/schema.ts",
      "importPath": "@create-something/canon/registry",
      "docsPath": "/canon/resources/registry",
      "tags": [
        "template",
        "overlay",
        "manifest",
        "project",
        "client",
        "governance"
      ],
      "modalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "template.canon-extension-intake",
        "policy.signal-decision-proof"
      ],
      "contract": {
        "accessibility": "Overlay manifests must name target modalities before local copy, visual, or interaction policy is applied.",
        "evidence": "Complete overlays declare theme, tokens, templates, copy rules, surface policy, registry metadata, and any extension-intake evidence.",
        "extension": "Projects extend Canon through named overlay artifacts; primitive changes still route through Canon extension intake and review."
      }
    },
    {
      "id": "template.canon-project-overlay-template-pack",
      "name": "Canon Project Overlay Template Pack",
      "kind": "template",
      "maturity": "candidate",
      "description": "Copyable project/client overlay starter pack with theme, tokens, templates, copy rules, surface policy, registry metadata, and a typed manifest.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/overlays/project-template/index.ts",
      "importPath": "@create-something/canon/overlays/project-template",
      "docsPath": "/canon/resources/registry",
      "tags": [
        "template",
        "overlay",
        "starter",
        "project",
        "client",
        "copyable",
        "governance"
      ],
      "modalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "template.canon-project-overlay-manifest",
        "template.canon-extension-intake",
        "token.canon-core",
        "policy.signal-decision-proof"
      ],
      "contract": {
        "accessibility": "Template packs must include modality policy so thin displays can summarize state without visual-only context.",
        "evidence": "The starter manifest must review as ready and point to every required overlay artifact path.",
        "extension": "Projects copy and fill the overlay files; primitive changes still route through Canon extension intake instead of forks."
      }
    },
    {
      "id": "template.web-governed-workflow",
      "name": "Web Governed Workflow Template",
      "kind": "template",
      "maturity": "candidate",
      "description": "Default web/app composition for a mapped workflow: hero claim, Atlas map, decision panel, proof strip, and action footer.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/registry/data.ts",
      "docsPath": "/canon/components/clear",
      "tags": [
        "template",
        "web",
        "workflow",
        "governance"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "component.navigation",
        "component.clear-decision-panel",
        "component.clear-proof-strip",
        "adapter.atlas-graph-artifact"
      ],
      "contract": {
        "accessibility": "Template must keep headings, landmarks, and next action readable.",
        "evidence": "A claim is incomplete until the adjacent proof object is visible.",
        "extension": "Client overlays provide copy, starter maps, integrations, and receipts."
      }
    },
    {
      "id": "template.chat-decision-brief",
      "name": "Chat Decision Brief Template",
      "kind": "template",
      "maturity": "candidate",
      "description": "Compact chat response structure for decision state, evidence, owner, next action, and stop condition.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/registry/data.ts",
      "tags": [
        "template",
        "chat",
        "decision",
        "brief"
      ],
      "modalities": [
        "chat",
        "voice"
      ],
      "dependencies": [
        "policy.signal-decision-proof"
      ],
      "contract": {
        "evidence": "Chat briefs must cite or name proof, not only summarize confidence.",
        "extension": "Project prompts may adapt language but must preserve state/evidence/owner/action."
      }
    },
    {
      "id": "template.glasses-routing-hud",
      "name": "Glasses Routing HUD Template",
      "kind": "template",
      "maturity": "candidate",
      "description": "Thin heads-up display structure for ranked work, brief detail access, confirmation, and handoff.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/registry/data.ts",
      "tags": [
        "template",
        "glasses",
        "hud",
        "routing"
      ],
      "modalities": [
        "glasses"
      ],
      "dependencies": [
        "policy.signal-decision-proof"
      ],
      "contract": {
        "accessibility": "Main view must stay one-glance and reserve details for explicit selection.",
        "evidence": "Evidence may be available on detail press but must not clutter the home view.",
        "extension": "Reasoning, ranking, secrets, and trust decisions stay on the Worker/server side; glasses display routed state."
      }
    }
  ]
};
