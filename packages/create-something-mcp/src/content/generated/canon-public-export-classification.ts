/**
 * Generated Canon public export classification content — DO NOT EDIT MANUALLY.
 * Run: npm run build:content
 * Source: packages/canon/src/lib/registry/public-export-classification.ts
 */

import type { CanonPublicExportClassificationRule } from '../types.js';

export const CANON_PUBLIC_EXPORT_CLASSIFICATION_RULES: CanonPublicExportClassificationRule[] = [
  {
    "exportPath": "./components",
    "exportName": "SEO",
    "classification": "platform-surface",
    "registryPolicy": "classified-out",
    "rationale": "Page metadata helper, not a reusable UI primitive."
  },
  {
    "exportPath": "./components",
    "exportName": "LayoutSEO",
    "classification": "platform-surface",
    "registryPolicy": "classified-out",
    "rationale": "Route metadata helper tied to page layout concerns."
  },
  {
    "exportPath": "./components",
    "exportName": "Footer",
    "classification": "stable-foundation-candidate",
    "registryPolicy": "candidate-review",
    "rationale": "Shared site chrome candidate; needs docs and modality contract before registry promotion."
  },
  {
    "exportPath": "./components",
    "exportName": "Heading",
    "classification": "stable-foundation-candidate",
    "registryPolicy": "registry-covered",
    "rationale": "Promoted to component.heading as the stable semantic typography primitive."
  },
  {
    "exportPath": "./components",
    "exportName": "CatalogCard",
    "classification": "content-utility",
    "registryPolicy": "candidate-review",
    "rationale": "Content listing card that may later collapse into ClearArtifactCard or a catalog pattern."
  },
  {
    "exportPath": "./components",
    "exportName": "PaperCard",
    "classification": "content-utility",
    "registryPolicy": "candidate-review",
    "rationale": "Research content card; keep separate from foundation registry until content pattern is unified."
  },
  {
    "exportPath": "./components",
    "exportName": "PapersGrid",
    "classification": "content-utility",
    "registryPolicy": "candidate-review",
    "rationale": "Research content collection layout, not yet a general Canon grid contract."
  },
  {
    "exportPath": "./components",
    "exportName": "AnimatedAsciiThumbnail",
    "classification": "decorative-effect",
    "registryPolicy": "classified-out",
    "rationale": "Visual treatment for ASCII content, not a stable cross-surface primitive."
  },
  {
    "exportPath": "./components",
    "exportName": "CategorySection",
    "classification": "content-utility",
    "registryPolicy": "candidate-review",
    "rationale": "Content taxonomy section; needs a broader content pattern before promotion."
  },
  {
    "exportPath": "./components",
    "exportName": "ShareButtons",
    "classification": "platform-surface",
    "registryPolicy": "candidate-review",
    "rationale": "Platform integration control that needs channel policy before registry promotion."
  },
  {
    "exportPath": "./components",
    "exportName": "QuoteBlock",
    "classification": "content-utility",
    "registryPolicy": "candidate-review",
    "rationale": "Editorial content primitive candidate; overlaps with ClearQuoteMetricPanel."
  },
  {
    "exportPath": "./components",
    "exportName": "Analytics",
    "classification": "analytics-surface",
    "registryPolicy": "classified-out",
    "rationale": "Instrumentation helper; registry should reference analytics contracts, not UI discovery."
  },
  {
    "exportPath": "./components",
    "exportName": "RelatedArticles",
    "classification": "content-utility",
    "registryPolicy": "candidate-review",
    "rationale": "Editorial recommendation section that belongs in content pattern review."
  },
  {
    "exportPath": "./components",
    "exportName": "TriadHealth",
    "classification": "domain-specific",
    "registryPolicy": "candidate-review",
    "rationale": "CREATE SOMETHING framework display; needs governance-pattern contract before promotion."
  },
  {
    "exportPath": "./components",
    "exportName": "HermeneuticCircle",
    "classification": "domain-specific",
    "registryPolicy": "candidate-review",
    "rationale": "Conceptual framework component, not yet a general foundation primitive."
  },
  {
    "exportPath": "./components",
    "exportName": "ModeIndicator",
    "classification": "platform-surface",
    "registryPolicy": "candidate-review",
    "rationale": "Mode/state indicator candidate; should reconcile with Clear state primitives first."
  },
  {
    "exportPath": "./components",
    "exportName": "CrossPropertyLink",
    "classification": "platform-surface",
    "registryPolicy": "candidate-review",
    "rationale": "Property-routing primitive candidate tied to CREATE SOMETHING property topology."
  },
  {
    "exportPath": "./components",
    "exportName": "PropertyFunnel",
    "classification": "platform-surface",
    "registryPolicy": "candidate-review",
    "rationale": "Property conversion surface; needs funnel policy before becoming stable registry UI."
  },
  {
    "exportPath": "./components",
    "exportName": "SkipToContent",
    "classification": "stable-foundation-candidate",
    "registryPolicy": "registry-covered",
    "rationale": "Promoted to component.skip-to-content as the stable keyboard bypass primitive."
  },
  {
    "exportPath": "./components",
    "exportName": "PrivacyPolicyContent",
    "classification": "platform-surface",
    "registryPolicy": "classified-out",
    "rationale": "Legal content surface; keep discoverability in policy/docs rather than UI registry."
  },
  {
    "exportPath": "./components",
    "exportName": "TermsOfServiceContent",
    "classification": "platform-surface",
    "registryPolicy": "classified-out",
    "rationale": "Legal content surface; keep discoverability in policy/docs rather than UI registry."
  },
  {
    "exportPath": "./components",
    "exportName": "CookieConsent",
    "classification": "platform-surface",
    "registryPolicy": "candidate-review",
    "rationale": "Consent surface candidate; needs privacy policy and regional behavior contract."
  },
  {
    "exportPath": "./components",
    "exportName": "PageActions",
    "classification": "platform-surface",
    "registryPolicy": "candidate-review",
    "rationale": "Authoring/action utility; should align with Button and action-footer contracts first."
  },
  {
    "exportPath": "./components",
    "exportName": "MarkdownPreviewModal",
    "classification": "platform-surface",
    "registryPolicy": "candidate-review",
    "rationale": "Authoring modal surface; not a foundation primitive until editor patterns are formalized."
  },
  {
    "exportPath": "./components/docs",
    "classification": "docs-only",
    "registryPolicy": "classified-out",
    "rationale": "Live documentation helpers belong to docs, not the consumer primitive registry."
  },
  {
    "exportPath": "./domains/ltd",
    "classification": "domain-specific",
    "registryPolicy": "classified-out",
    "rationale": ".ltd surfaces are property-specific consumers of Canon, not foundation primitives."
  },
  {
    "exportPath": "./domains/agency",
    "classification": "domain-specific",
    "registryPolicy": "classified-out",
    "rationale": ".agency surfaces are property-specific consumers of Canon, not foundation primitives."
  },
  {
    "exportPath": "./domains/space",
    "classification": "domain-specific",
    "registryPolicy": "classified-out",
    "rationale": ".space surfaces are property-specific consumers of Canon, not foundation primitives."
  },
  {
    "exportPath": "./domains/io",
    "classification": "domain-specific",
    "registryPolicy": "classified-out",
    "rationale": ".io surfaces are property-specific consumers of Canon, not foundation primitives."
  },
  {
    "exportPath": "./experiments/threshold-dwelling",
    "classification": "experiment",
    "registryPolicy": "classified-out",
    "rationale": "Experimental architectural-study components stay out of the stable registry."
  },
  {
    "exportPath": "./experiments/kinetic-typography",
    "classification": "experiment",
    "registryPolicy": "classified-out",
    "rationale": "Kinetic typography experiment stays out of the stable registry."
  },
  {
    "exportPath": "./experiments/render-preview",
    "classification": "experiment",
    "registryPolicy": "classified-out",
    "rationale": "Render-preview experiment stays out of the stable registry."
  },
  {
    "exportPath": "./experiments/render-studio",
    "classification": "experiment",
    "registryPolicy": "classified-out",
    "rationale": "Render-studio experiment stays out of the stable registry."
  },
  {
    "exportPath": "./experiments/basketball-systems-lab",
    "classification": "experiment",
    "registryPolicy": "classified-out",
    "rationale": "Basketball systems lab is an experiment package, not a Canon foundation primitive."
  },
  {
    "exportPath": "./filtering",
    "classification": "composition-pattern",
    "registryPolicy": "candidate-review",
    "rationale": "Filtering surfaces may become templates/patterns after repeated product evidence."
  },
  {
    "exportPath": "./auth/components",
    "classification": "auth-surface",
    "registryPolicy": "classified-out",
    "rationale": "Auth components are product security surfaces; expose policy separately from UI registry."
  },
  {
    "exportPath": "./brand/3d",
    "classification": "brand-surface",
    "registryPolicy": "candidate-review",
    "rationale": "Brand 3D surfaces need brand-contract review before registry promotion."
  },
  {
    "exportPath": "./diagrams",
    "classification": "stable-foundation-candidate",
    "registryPolicy": "candidate-review",
    "rationale": "Diagram primitives are likely shared, but need data and accessibility contracts first."
  },
  {
    "exportPath": "./atlas",
    "classification": "stable-foundation-candidate",
    "registryPolicy": "candidate-review",
    "rationale": "Atlas renderers should align with the existing headless graph adapter before promotion."
  },
  {
    "exportPath": "./icons",
    "classification": "stable-foundation-candidate",
    "registryPolicy": "candidate-review",
    "rationale": "Icon primitive should become registry-covered with naming and accessibility contract."
  },
  {
    "exportPath": "./motion",
    "classification": "decorative-effect",
    "registryPolicy": "classified-out",
    "rationale": "Motion utilities need sparing use and should not be agent-default primitives."
  },
  {
    "exportPath": "./layout",
    "exportName": "Section",
    "classification": "stable-foundation-candidate",
    "registryPolicy": "registry-covered",
    "rationale": "Promoted to component.layout-section as the stable page section primitive."
  },
  {
    "exportPath": "./layout",
    "exportName": "SectionHeader",
    "classification": "stable-foundation-candidate",
    "registryPolicy": "registry-covered",
    "rationale": "Promoted to component.layout-section-header as the stable section heading pattern."
  },
  {
    "exportPath": "./layout",
    "classification": "stable-foundation-candidate",
    "registryPolicy": "candidate-review",
    "rationale": "Layout primitives are likely shared, but need responsive and composition contracts first."
  },
  {
    "exportPath": "./interactive",
    "classification": "decorative-effect",
    "registryPolicy": "candidate-review",
    "rationale": "Interactive effects need evidence and modality constraints before registry promotion."
  },
  {
    "exportPath": "./conversion",
    "classification": "composition-pattern",
    "registryPolicy": "candidate-review",
    "rationale": "Conversion components need proof/receipt and property-policy contracts before promotion."
  },
  {
    "exportPath": "./patterns",
    "classification": "composition-pattern",
    "registryPolicy": "candidate-review",
    "rationale": "Pattern components should graduate through template/pattern registry contracts."
  },
  {
    "exportPath": "./forms",
    "classification": "stable-foundation-candidate",
    "registryPolicy": "candidate-review",
    "rationale": "Advanced form controls may become stable after aligning with foundation form controls."
  },
  {
    "exportPath": "./insights",
    "classification": "content-utility",
    "registryPolicy": "candidate-review",
    "rationale": "Insight visuals need content and proof contracts before registry promotion."
  },
  {
    "exportPath": "./visual",
    "classification": "decorative-effect",
    "registryPolicy": "classified-out",
    "rationale": "Visual effects are brand/expression assets, not agent-default UI primitives."
  },
  {
    "exportPath": "./content",
    "classification": "content-utility",
    "registryPolicy": "candidate-review",
    "rationale": "Content components should graduate only through content-pattern evidence."
  },
  {
    "exportPath": "./typography",
    "classification": "stable-foundation-candidate",
    "registryPolicy": "candidate-review",
    "rationale": "Typography surfaces should align with token and heading contracts before promotion."
  },
  {
    "exportPath": "./navigation",
    "classification": "composition-pattern",
    "registryPolicy": "candidate-review",
    "rationale": "Advanced navigation components need wayfinding and command-policy contracts first."
  },
  {
    "exportPath": "./magicui",
    "classification": "decorative-effect",
    "registryPolicy": "classified-out",
    "rationale": "MagicUI effects are imported expression utilities and should not be agent-default Canon."
  }
];
