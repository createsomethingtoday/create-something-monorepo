export type CanonPublicExportClassification =
  | 'analytics-surface'
  | 'auth-surface'
  | 'brand-surface'
  | 'composition-pattern'
  | 'content-utility'
  | 'decorative-effect'
  | 'docs-only'
  | 'domain-specific'
  | 'experiment'
  | 'governance-contract'
  | 'headless-contract'
  | 'platform-surface'
  | 'registry-artifact'
  | 'stable-foundation-candidate'
  | 'style-artifact'
  | 'supporting-api'
  | 'token-artifact';

export type CanonPublicExportRegistryPolicy =
  | 'candidate-review'
  | 'classified-out'
  | 'registry-covered';

export type CanonPublicExportClassificationRule = {
  exportPath: string;
  exportName?: string;
  classification: CanonPublicExportClassification;
  registryPolicy: CanonPublicExportRegistryPolicy;
  registryItemIds?: string[];
  rationale: string;
};

export type CanonPublicExportClassificationSearchOptions = {
  query?: string;
  classification?: CanonPublicExportClassification;
  registryPolicy?: CanonPublicExportRegistryPolicy;
  exportPath?: string;
  limit?: number;
};

const ROOT_COMPONENT_EXPORT_POLICIES: CanonPublicExportClassificationRule[] = [
  {
    exportPath: './components',
    exportName: 'SEO',
    classification: 'platform-surface',
    registryPolicy: 'classified-out',
    rationale: 'Page metadata helper, not a reusable UI primitive.'
  },
  {
    exportPath: './components',
    exportName: 'LayoutSEO',
    classification: 'platform-surface',
    registryPolicy: 'classified-out',
    rationale: 'Route metadata helper tied to page layout concerns.'
  },
  {
    exportPath: './components',
    exportName: 'Footer',
    classification: 'stable-foundation-candidate',
    registryPolicy: 'candidate-review',
    rationale:
      'Shared site chrome candidate; needs docs and modality contract before registry promotion.'
  },
  {
    exportPath: './components',
    exportName: 'Heading',
    classification: 'stable-foundation-candidate',
    registryPolicy: 'registry-covered',
    registryItemIds: ['component.heading'],
    rationale: 'Promoted to component.heading as the stable semantic typography primitive.'
  },
  {
    exportPath: './components',
    exportName: 'CatalogCard',
    classification: 'content-utility',
    registryPolicy: 'candidate-review',
    rationale:
      'Content listing card that may later collapse into ClearArtifactCard or a catalog pattern.'
  },
  {
    exportPath: './components',
    exportName: 'PaperCard',
    classification: 'content-utility',
    registryPolicy: 'candidate-review',
    rationale:
      'Research content card; keep separate from foundation registry until content pattern is unified.'
  },
  {
    exportPath: './components',
    exportName: 'PapersGrid',
    classification: 'content-utility',
    registryPolicy: 'candidate-review',
    rationale: 'Research content collection layout, not yet a general Canon grid contract.'
  },
  {
    exportPath: './components',
    exportName: 'AnimatedAsciiThumbnail',
    classification: 'decorative-effect',
    registryPolicy: 'classified-out',
    rationale: 'Visual treatment for ASCII content, not a stable cross-surface primitive.'
  },
  {
    exportPath: './components',
    exportName: 'CategorySection',
    classification: 'content-utility',
    registryPolicy: 'candidate-review',
    rationale: 'Content taxonomy section; needs a broader content pattern before promotion.'
  },
  {
    exportPath: './components',
    exportName: 'ShareButtons',
    classification: 'platform-surface',
    registryPolicy: 'candidate-review',
    rationale: 'Platform integration control that needs channel policy before registry promotion.'
  },
  {
    exportPath: './components',
    exportName: 'QuoteBlock',
    classification: 'content-utility',
    registryPolicy: 'candidate-review',
    rationale: 'Editorial content primitive candidate; overlaps with ClearQuoteMetricPanel.'
  },
  {
    exportPath: './components',
    exportName: 'Analytics',
    classification: 'analytics-surface',
    registryPolicy: 'classified-out',
    rationale:
      'Instrumentation helper; registry should reference analytics contracts, not UI discovery.'
  },
  {
    exportPath: './components',
    exportName: 'RelatedArticles',
    classification: 'content-utility',
    registryPolicy: 'candidate-review',
    rationale: 'Editorial recommendation section that belongs in content pattern review.'
  },
  {
    exportPath: './components',
    exportName: 'TriadHealth',
    classification: 'domain-specific',
    registryPolicy: 'candidate-review',
    rationale:
      'CREATE SOMETHING framework display; needs governance-pattern contract before promotion.'
  },
  {
    exportPath: './components',
    exportName: 'HermeneuticCircle',
    classification: 'domain-specific',
    registryPolicy: 'candidate-review',
    rationale: 'Conceptual framework component, not yet a general foundation primitive.'
  },
  {
    exportPath: './components',
    exportName: 'ModeIndicator',
    classification: 'platform-surface',
    registryPolicy: 'candidate-review',
    rationale: 'Mode/state indicator candidate; should reconcile with Clear state primitives first.'
  },
  {
    exportPath: './components',
    exportName: 'CrossPropertyLink',
    classification: 'platform-surface',
    registryPolicy: 'candidate-review',
    rationale: 'Property-routing primitive candidate tied to CREATE SOMETHING property topology.'
  },
  {
    exportPath: './components',
    exportName: 'PropertyFunnel',
    classification: 'platform-surface',
    registryPolicy: 'candidate-review',
    rationale:
      'Property conversion surface; needs funnel policy before becoming stable registry UI.'
  },
  {
    exportPath: './components',
    exportName: 'SkipToContent',
    classification: 'stable-foundation-candidate',
    registryPolicy: 'registry-covered',
    registryItemIds: ['component.skip-to-content'],
    rationale: 'Promoted to component.skip-to-content as the stable keyboard bypass primitive.'
  },
  {
    exportPath: './components',
    exportName: 'PrivacyPolicyContent',
    classification: 'platform-surface',
    registryPolicy: 'classified-out',
    rationale: 'Legal content surface; keep discoverability in policy/docs rather than UI registry.'
  },
  {
    exportPath: './components',
    exportName: 'TermsOfServiceContent',
    classification: 'platform-surface',
    registryPolicy: 'classified-out',
    rationale: 'Legal content surface; keep discoverability in policy/docs rather than UI registry.'
  },
  {
    exportPath: './components',
    exportName: 'CookieConsent',
    classification: 'platform-surface',
    registryPolicy: 'candidate-review',
    rationale: 'Consent surface candidate; needs privacy policy and regional behavior contract.'
  },
  {
    exportPath: './components',
    exportName: 'PageActions',
    classification: 'platform-surface',
    registryPolicy: 'candidate-review',
    rationale:
      'Authoring/action utility; should align with Button and action-footer contracts first.'
  },
  {
    exportPath: './components',
    exportName: 'MarkdownPreviewModal',
    classification: 'platform-surface',
    registryPolicy: 'candidate-review',
    rationale:
      'Authoring modal surface; not a foundation primitive until editor patterns are formalized.'
  }
];

const PACKAGE_EXPORT_PATH_POLICIES: CanonPublicExportClassificationRule[] = [
  {
    exportPath: '.',
    classification: 'supporting-api',
    registryPolicy: 'candidate-review',
    rationale:
      'Root package barrel is a mixed convenience API; individual component exports still need symbol-level policy or registry coverage.'
  },
  {
    exportPath: './styles/tokens.css',
    classification: 'token-artifact',
    registryPolicy: 'registry-covered',
    registryItemIds: ['token.canon-core'],
    rationale: 'Canonical CSS token source is covered by token.canon-core.'
  },
  {
    exportPath: './styles/canon.css',
    classification: 'style-artifact',
    registryPolicy: 'classified-out',
    rationale:
      'Full stylesheet bundle is a consumption artifact, not a separate registry primitive.'
  },
  {
    exportPath: './styles/components.css',
    classification: 'style-artifact',
    registryPolicy: 'classified-out',
    rationale: 'Component stylesheet bundle is governed by component sources and tokens.'
  },
  {
    exportPath: './styles/editorial.css',
    classification: 'style-artifact',
    registryPolicy: 'classified-out',
    rationale:
      'Editorial stylesheet bundle supports content rendering without becoming a UI primitive.'
  },
  {
    exportPath: './styles/animations.css',
    classification: 'style-artifact',
    registryPolicy: 'classified-out',
    rationale: 'Animation CSS is a support artifact governed by motion contracts.'
  },
  {
    exportPath: './styles/performance.css',
    classification: 'style-artifact',
    registryPolicy: 'classified-out',
    rationale:
      'Performance stylesheet bundle supports product surfaces without separate registry discovery.'
  },
  {
    exportPath: './styles/glass.css',
    classification: 'style-artifact',
    registryPolicy: 'classified-out',
    rationale:
      'Glass stylesheet bundle is an expressive support artifact, not an agent-default primitive.'
  },
  {
    exportPath: './styles/prose.css',
    classification: 'style-artifact',
    registryPolicy: 'classified-out',
    rationale:
      'Prose stylesheet bundle supports document rendering and is governed by content contracts.'
  },
  {
    exportPath: './styles/spacing.css',
    classification: 'style-artifact',
    registryPolicy: 'classified-out',
    rationale: 'Spacing stylesheet bundle is a token-derived support artifact.'
  },
  {
    exportPath: './styles/buttons.css',
    classification: 'style-artifact',
    registryPolicy: 'classified-out',
    rationale: 'Button stylesheet bundle is governed by the Button component and token contracts.'
  },
  {
    exportPath: './styles/cards.css',
    classification: 'style-artifact',
    registryPolicy: 'classified-out',
    rationale: 'Card stylesheet bundle is governed by the Card component and token contracts.'
  },
  {
    exportPath: './styles/grid-patterns.css',
    classification: 'style-artifact',
    registryPolicy: 'classified-out',
    rationale:
      'Grid pattern stylesheet bundle supports layout primitives without separate registry entry.'
  },
  {
    exportPath: './styles/typography.css',
    classification: 'style-artifact',
    registryPolicy: 'classified-out',
    rationale: 'Typography stylesheet bundle is governed by token and heading contracts.'
  },
  {
    exportPath: './styles/interactions.css',
    classification: 'style-artifact',
    registryPolicy: 'classified-out',
    rationale:
      'Interaction stylesheet bundle supports component behavior without separate registry discovery.'
  },
  {
    exportPath: './styles/vertical-base.css',
    classification: 'style-artifact',
    registryPolicy: 'classified-out',
    rationale: 'Vertical base stylesheet bundle is a support artifact for property surfaces.'
  },
  {
    exportPath: './styles/tokens.scss',
    classification: 'token-artifact',
    registryPolicy: 'registry-covered',
    registryItemIds: ['token.canon-core'],
    rationale: 'SCSS token export is an alternate consumer format for token.canon-core.'
  },
  {
    exportPath: './styles/tokens.dtcg.json',
    classification: 'token-artifact',
    registryPolicy: 'registry-covered',
    registryItemIds: ['token.canon-core'],
    rationale: 'DTCG token export is an alternate machine-readable format for token.canon-core.'
  },
  {
    exportPath: './styles/tokens.figma.json',
    classification: 'token-artifact',
    registryPolicy: 'registry-covered',
    registryItemIds: ['token.canon-core'],
    rationale: 'Figma token export is an alternate design-tool format for token.canon-core.'
  },
  {
    exportPath: './styles/canon.json',
    classification: 'token-artifact',
    registryPolicy: 'registry-covered',
    registryItemIds: ['token.canon-core'],
    rationale:
      'Canon JSON export is a machine-readable token artifact governed by token.canon-core.'
  },
  {
    exportPath: './components',
    classification: 'stable-foundation-candidate',
    registryPolicy: 'candidate-review',
    rationale:
      'Root components barrel mixes stable primitives and review candidates; individual symbols keep explicit policy.'
  },
  {
    exportPath: './components/form',
    classification: 'stable-foundation-candidate',
    registryPolicy: 'registry-covered',
    registryItemIds: [
      'component.form-text-field',
      'component.form-text-area',
      'component.form-checkbox',
      'component.form-checkbox-group',
      'component.form-radio',
      'component.form-radio-group',
      'component.form-select',
      'component.form-switch'
    ],
    rationale:
      'Form barrel exposes stable foundation controls already covered by registry item tests.'
  },
  {
    exportPath: './components/navigation',
    classification: 'stable-foundation-candidate',
    registryPolicy: 'registry-covered',
    registryItemIds: [
      'component.navigation-breadcrumbs',
      'component.navigation-tabs',
      'component.navigation-pagination',
      'component.navigation-tooltip',
      'component.navigation-popover',
      'component.navigation-dropdown-menu',
      'component.navigation-drawer'
    ],
    rationale:
      'Navigation barrel exposes stable foundation controls already covered by registry item tests.'
  },
  {
    exportPath: './components/feedback',
    classification: 'stable-foundation-candidate',
    registryPolicy: 'registry-covered',
    registryItemIds: [
      'component.feedback-alert',
      'component.feedback-toast',
      'component.feedback-dialog',
      'component.feedback-progress',
      'component.feedback-spinner',
      'component.feedback-skeleton'
    ],
    rationale:
      'Feedback barrel exposes stable foundation controls already covered by registry item tests.'
  },
  {
    exportPath: './experiments',
    classification: 'experiment',
    registryPolicy: 'classified-out',
    rationale:
      'Experiment root barrel is a staging area and should not become stable registry surface.'
  },
  {
    exportPath: './experiments/living-arena',
    classification: 'experiment',
    registryPolicy: 'classified-out',
    rationale: 'Living arena experiment stays outside the stable registry.'
  },
  {
    exportPath: './experiments/living-arena-gpu',
    classification: 'experiment',
    registryPolicy: 'classified-out',
    rationale: 'GPU living arena experiment stays outside the stable registry.'
  },
  {
    exportPath: './utils',
    classification: 'supporting-api',
    registryPolicy: 'classified-out',
    rationale: 'Utility functions support Canon consumers but are not registry UI primitives.'
  },
  {
    exportPath: './types',
    classification: 'supporting-api',
    registryPolicy: 'classified-out',
    rationale: 'Shared types support Canon consumers without becoming discoverable UI artifacts.'
  },
  {
    exportPath: './tokens',
    classification: 'token-artifact',
    registryPolicy: 'registry-covered',
    registryItemIds: ['token.canon-core'],
    rationale: 'Typed token API is governed by token.canon-core.'
  },
  {
    exportPath: './tokens/*',
    classification: 'token-artifact',
    registryPolicy: 'registry-covered',
    registryItemIds: ['token.canon-core'],
    rationale: 'Wildcard token module exports are governed by token.canon-core.'
  },
  {
    exportPath: './actions',
    classification: 'supporting-api',
    registryPolicy: 'classified-out',
    rationale:
      'Svelte actions support interaction behavior but are not standalone registry primitives.'
  },
  {
    exportPath: './transitions',
    classification: 'supporting-api',
    registryPolicy: 'classified-out',
    rationale:
      'Transition helpers support motion contracts without becoming agent-default primitives.'
  },
  {
    exportPath: './analytics',
    classification: 'analytics-surface',
    registryPolicy: 'classified-out',
    rationale: 'Analytics helpers are instrumentation surfaces, not UI registry artifacts.'
  },
  {
    exportPath: './api',
    classification: 'supporting-api',
    registryPolicy: 'classified-out',
    rationale:
      'API helpers support applications and should be governed outside UI registry discovery.'
  },
  {
    exportPath: './auth',
    classification: 'auth-surface',
    registryPolicy: 'classified-out',
    rationale: 'Auth API surface is security-sensitive platform code, not a UI registry primitive.'
  },
  {
    exportPath: './auth/server',
    classification: 'auth-surface',
    registryPolicy: 'classified-out',
    rationale:
      'Server auth surface is security-sensitive platform code, not a UI registry primitive.'
  },
  {
    exportPath: './gdpr',
    classification: 'platform-surface',
    registryPolicy: 'classified-out',
    rationale:
      'GDPR helpers are legal/platform support, governed by policy rather than UI registry.'
  },
  {
    exportPath: './newsletter',
    classification: 'platform-surface',
    registryPolicy: 'classified-out',
    rationale: 'Newsletter helpers are product integration support, not foundation UI primitives.'
  },
  {
    exportPath: './platform',
    classification: 'platform-surface',
    registryPolicy: 'classified-out',
    rationale:
      'Platform helpers support property routing and integration without registry promotion.'
  },
  {
    exportPath: './brand',
    classification: 'brand-surface',
    registryPolicy: 'candidate-review',
    rationale:
      'Brand support exports need brand-contract review before any stable registry promotion.'
  },
  {
    exportPath: './brand/icons.css',
    classification: 'brand-surface',
    registryPolicy: 'classified-out',
    rationale:
      'Brand icon CSS is an asset stylesheet governed by brand contracts, not UI discovery.'
  },
  {
    exportPath: './atlas/headless',
    classification: 'headless-contract',
    registryPolicy: 'registry-covered',
    registryItemIds: ['adapter.atlas-graph-artifact'],
    rationale: 'Headless Atlas graph artifact is covered by adapter.atlas-graph-artifact.'
  },
  {
    exportPath: './atlas/handoff',
    classification: 'headless-contract',
    registryPolicy: 'registry-covered',
    registryItemIds: ['template.atlas-development-handoff'],
    rationale: 'Atlas handoff API is covered by template.atlas-development-handoff.'
  },
  {
    exportPath: './governance',
    classification: 'governance-contract',
    registryPolicy: 'registry-covered',
    registryItemIds: ['policy.signal-decision-proof'],
    rationale: 'Governance product loop is covered by policy.signal-decision-proof.'
  },
  {
    exportPath: './governance/products',
    classification: 'governance-contract',
    registryPolicy: 'registry-covered',
    registryItemIds: ['policy.signal-decision-proof'],
    rationale: 'Governance products export is covered by policy.signal-decision-proof.'
  },
  {
    exportPath: './registry',
    classification: 'registry-artifact',
    registryPolicy: 'registry-covered',
    registryItemIds: ['template.canon-extension-intake', 'template.canon-project-overlay-manifest'],
    rationale:
      'Registry API is the Canon source of truth for discoverable artifacts and lifecycle rules.'
  },
  {
    exportPath: './design-audit',
    classification: 'registry-artifact',
    registryPolicy: 'registry-covered',
    registryItemIds: ['policy.signal-decision-proof'],
    rationale:
      'Design audit checks operationalize Canon token, layout, motion, and accessibility policy for agent and human review.'
  },
  {
    exportPath: './mcp-snapshot',
    classification: 'registry-artifact',
    registryPolicy: 'registry-covered',
    registryItemIds: [
      'template.canon-project-overlay-template-pack',
      'template.canon-project-overlay-manifest',
      'template.canon-extension-intake'
    ],
    rationale:
      'MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.'
  },
  {
    exportPath: './lint-contract',
    classification: 'registry-artifact',
    registryPolicy: 'registry-covered',
    registryItemIds: ['token.canon-core'],
    rationale:
      'Lint contract maps consumer utility usage back to Canon token artifacts without duplicating design-system policy.'
  },
  {
    exportPath: './modality-readiness',
    classification: 'registry-artifact',
    registryPolicy: 'registry-covered',
    registryItemIds: ['template.canon-project-overlay-manifest', 'template.canon-extension-intake'],
    rationale:
      'Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.'
  },
  {
    exportPath: './codification',
    classification: 'registry-artifact',
    registryPolicy: 'registry-covered',
    registryItemIds: ['template.canon-project-overlay-manifest', 'template.canon-extension-intake'],
    rationale:
      'Codification audit classifies repo UI files by Canon ownership, direct import, overlay governance, or explicit local exemption.'
  },
  {
    exportPath: './library-health',
    classification: 'registry-artifact',
    registryPolicy: 'candidate-review',
    rationale:
      'Library health aggregates registry, export policy, overlays, modalities, and codification; add a dedicated registry item before calling it stable.'
  },
  {
    exportPath: './overlays/project-template',
    classification: 'registry-artifact',
    registryPolicy: 'registry-covered',
    registryItemIds: ['template.canon-project-overlay-template-pack'],
    rationale:
      'Project overlay template pack is covered by template.canon-project-overlay-template-pack.'
  },
  {
    exportPath: './overlays',
    classification: 'registry-artifact',
    registryPolicy: 'registry-covered',
    registryItemIds: [
      'template.canon-project-overlay-template-pack',
      'template.canon-project-overlay-manifest',
      'template.canon-extension-intake'
    ],
    rationale:
      'Overlay catalog export is covered by the Canon project overlay template pack, manifest, and extension intake registry items.'
  },
  {
    exportPath: './overlays/intake',
    classification: 'registry-artifact',
    registryPolicy: 'registry-covered',
    registryItemIds: ['template.canon-extension-intake'],
    rationale:
      'Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.'
  },
  {
    exportPath: './ascii',
    classification: 'brand-surface',
    registryPolicy: 'classified-out',
    rationale: 'ASCII identity helpers are brand expression support, not stable UI primitives.'
  },
  {
    exportPath: './validation',
    classification: 'supporting-api',
    registryPolicy: 'classified-out',
    rationale: 'Validation helpers support product code without becoming registry UI artifacts.'
  }
];

const SUBPATH_EXPORT_POLICIES: CanonPublicExportClassificationRule[] = [
  {
    exportPath: './components/docs',
    classification: 'docs-only',
    registryPolicy: 'classified-out',
    rationale: 'Live documentation helpers belong to docs, not the consumer primitive registry.'
  },
  {
    exportPath: './domains/ltd',
    classification: 'domain-specific',
    registryPolicy: 'classified-out',
    rationale: '.ltd surfaces are property-specific consumers of Canon, not foundation primitives.'
  },
  {
    exportPath: './domains/agency',
    classification: 'domain-specific',
    registryPolicy: 'classified-out',
    rationale:
      '.agency surfaces are property-specific consumers of Canon, not foundation primitives.'
  },
  {
    exportPath: './domains/space',
    classification: 'domain-specific',
    registryPolicy: 'classified-out',
    rationale:
      '.space surfaces are property-specific consumers of Canon, not foundation primitives.'
  },
  {
    exportPath: './domains/io',
    classification: 'domain-specific',
    registryPolicy: 'classified-out',
    rationale: '.io surfaces are property-specific consumers of Canon, not foundation primitives.'
  },
  {
    exportPath: './experiments/threshold-dwelling',
    classification: 'experiment',
    registryPolicy: 'classified-out',
    rationale: 'Experimental architectural-study components stay out of the stable registry.'
  },
  {
    exportPath: './experiments/kinetic-typography',
    classification: 'experiment',
    registryPolicy: 'classified-out',
    rationale: 'Kinetic typography experiment stays out of the stable registry.'
  },
  {
    exportPath: './experiments/render-preview',
    classification: 'experiment',
    registryPolicy: 'classified-out',
    rationale: 'Render-preview experiment stays out of the stable registry.'
  },
  {
    exportPath: './experiments/render-studio',
    classification: 'experiment',
    registryPolicy: 'classified-out',
    rationale: 'Render-studio experiment stays out of the stable registry.'
  },
  {
    exportPath: './experiments/basketball-systems-lab',
    classification: 'experiment',
    registryPolicy: 'classified-out',
    rationale: 'Basketball systems lab is an experiment package, not a Canon foundation primitive.'
  },
  {
    exportPath: './filtering',
    classification: 'composition-pattern',
    registryPolicy: 'candidate-review',
    rationale: 'Filtering surfaces may become templates/patterns after repeated product evidence.'
  },
  {
    exportPath: './auth/components',
    classification: 'auth-surface',
    registryPolicy: 'classified-out',
    rationale:
      'Auth components are product security surfaces; expose policy separately from UI registry.'
  },
  {
    exportPath: './brand/3d',
    classification: 'brand-surface',
    registryPolicy: 'candidate-review',
    rationale: 'Brand 3D surfaces need brand-contract review before registry promotion.'
  },
  {
    exportPath: './diagrams',
    classification: 'stable-foundation-candidate',
    registryPolicy: 'candidate-review',
    rationale:
      'Diagram primitives are likely shared, but need data and accessibility contracts first.'
  },
  {
    exportPath: './atlas',
    classification: 'stable-foundation-candidate',
    registryPolicy: 'candidate-review',
    rationale:
      'Atlas renderers should align with the existing headless graph adapter before promotion.'
  },
  {
    exportPath: './icons',
    exportName: 'Icon',
    classification: 'stable-foundation-candidate',
    registryPolicy: 'registry-covered',
    registryItemIds: ['component.icon'],
    rationale: 'Promoted to component.icon as the stable accessible icon primitive.'
  },
  {
    exportPath: './icons',
    classification: 'stable-foundation-candidate',
    registryPolicy: 'candidate-review',
    rationale:
      'Icon support exports remain under review while naming and advanced accessibility contracts settle.'
  },
  {
    exportPath: './motion',
    classification: 'decorative-effect',
    registryPolicy: 'classified-out',
    rationale: 'Motion utilities need sparing use and should not be agent-default primitives.'
  },
  {
    exportPath: './layout',
    exportName: 'Section',
    classification: 'stable-foundation-candidate',
    registryPolicy: 'registry-covered',
    registryItemIds: ['component.layout-section'],
    rationale: 'Promoted to component.layout-section as the stable page section primitive.'
  },
  {
    exportPath: './layout',
    exportName: 'SectionHeader',
    classification: 'stable-foundation-candidate',
    registryPolicy: 'registry-covered',
    registryItemIds: ['component.layout-section-header'],
    rationale: 'Promoted to component.layout-section-header as the stable section heading pattern.'
  },
  {
    exportPath: './layout',
    exportName: 'BentoGrid',
    classification: 'stable-foundation-candidate',
    registryPolicy: 'registry-covered',
    registryItemIds: ['component.layout-bento-grid'],
    rationale: 'Promoted to component.layout-bento-grid as the stable asymmetric grid primitive.'
  },
  {
    exportPath: './layout',
    exportName: 'BentoItem',
    classification: 'stable-foundation-candidate',
    registryPolicy: 'registry-covered',
    registryItemIds: ['component.layout-bento-item'],
    rationale: 'Promoted to component.layout-bento-item as the stable bento grid child primitive.'
  },
  {
    exportPath: './layout',
    exportName: 'SplitSection',
    classification: 'stable-foundation-candidate',
    registryPolicy: 'registry-covered',
    registryItemIds: ['component.layout-split-section'],
    rationale:
      'Promoted to component.layout-split-section as the stable two-column layout primitive.'
  },
  {
    exportPath: './layout',
    classification: 'stable-foundation-candidate',
    registryPolicy: 'candidate-review',
    rationale:
      'Layout primitives are likely shared, but need responsive and composition contracts first.'
  },
  {
    exportPath: './interactive',
    exportName: 'GlassCard',
    classification: 'decorative-effect',
    registryPolicy: 'classified-out',
    rationale:
      'GlassCard is a glass visual treatment over the stable Card primitive, not a new foundation contract.'
  },
  {
    exportPath: './interactive',
    exportName: 'HoverCard',
    classification: 'composition-pattern',
    registryPolicy: 'candidate-review',
    rationale:
      'HoverCard is a contextual disclosure pattern that needs focus, positioning, and fallback contracts before promotion.'
  },
  {
    exportPath: './interactive',
    exportName: 'LiquidGlass',
    classification: 'decorative-effect',
    registryPolicy: 'classified-out',
    rationale:
      'LiquidGlass is a refraction/backdrop visual effect and should not become an agent-default UI primitive.'
  },
  {
    exportPath: './interactive',
    exportName: 'LiquidGlassIcon',
    classification: 'decorative-effect',
    registryPolicy: 'classified-out',
    rationale:
      'LiquidGlassIcon is a nested-glass icon treatment; Canon should route icon contracts through component.icon.'
  },
  {
    exportPath: './interactive',
    exportName: 'IntegrationFlow',
    classification: 'composition-pattern',
    registryPolicy: 'candidate-review',
    rationale:
      'IntegrationFlow can become a shared workflow/integration disclosure pattern after data and nonvisual contracts settle.'
  },
  {
    exportPath: './interactive',
    exportName: 'TimelineEditor',
    classification: 'platform-surface',
    registryPolicy: 'candidate-review',
    rationale:
      'TimelineEditor is an authoring surface candidate that needs keyboard, canvas, and data-model contracts before promotion.'
  },
  {
    exportPath: './interactive',
    exportName: 'InteractiveExperimentCTA',
    classification: 'experiment',
    registryPolicy: 'classified-out',
    rationale:
      'InteractiveExperimentCTA is tied to paper experiment launch state, not a general Canon action primitive.'
  },
  {
    exportPath: './interactive',
    exportName: 'TrackedExperimentBadge',
    classification: 'experiment',
    registryPolicy: 'classified-out',
    rationale:
      'TrackedExperimentBadge renders experiment-specific paper metrics and should stay outside foundation UI discovery.'
  },
  {
    exportPath: './interactive',
    classification: 'decorative-effect',
    registryPolicy: 'candidate-review',
    rationale:
      'Any new interactive export needs explicit review before it can become registry-covered or classified out.'
  },
  {
    exportPath: './conversion',
    classification: 'composition-pattern',
    registryPolicy: 'candidate-review',
    rationale:
      'Conversion components need proof/receipt and property-policy contracts before promotion.'
  },
  {
    exportPath: './patterns',
    classification: 'composition-pattern',
    registryPolicy: 'candidate-review',
    rationale: 'Pattern components should graduate through template/pattern registry contracts.'
  },
  {
    exportPath: './forms',
    classification: 'stable-foundation-candidate',
    registryPolicy: 'candidate-review',
    rationale:
      'Advanced form controls may become stable after aligning with foundation form controls.'
  },
  {
    exportPath: './insights',
    classification: 'content-utility',
    registryPolicy: 'candidate-review',
    rationale: 'Insight visuals need content and proof contracts before registry promotion.'
  },
  {
    exportPath: './visual',
    classification: 'decorative-effect',
    registryPolicy: 'classified-out',
    rationale: 'Visual effects are brand/expression assets, not agent-default UI primitives.'
  },
  {
    exportPath: './content',
    classification: 'content-utility',
    registryPolicy: 'candidate-review',
    rationale: 'Content components should graduate only through content-pattern evidence.'
  },
  {
    exportPath: './typography',
    classification: 'stable-foundation-candidate',
    registryPolicy: 'candidate-review',
    rationale: 'Typography surfaces should align with token and heading contracts before promotion.'
  },
  {
    exportPath: './navigation',
    exportName: 'Tabs',
    classification: 'stable-foundation-candidate',
    registryPolicy: 'registry-covered',
    registryItemIds: ['component.navigation-tabs'],
    rationale: 'Covered by component.navigation-tabs as the stable tabbed view switcher primitive.'
  },
  {
    exportPath: './navigation',
    classification: 'composition-pattern',
    registryPolicy: 'candidate-review',
    rationale: 'Advanced navigation components need wayfinding and command-policy contracts first.'
  },
  {
    exportPath: './magicui',
    classification: 'decorative-effect',
    registryPolicy: 'classified-out',
    rationale:
      'MagicUI effects are imported expression utilities and should not be agent-default Canon.'
  }
];

export const CANON_PUBLIC_EXPORT_CLASSIFICATION_RULES: CanonPublicExportClassificationRule[] = [
  ...ROOT_COMPONENT_EXPORT_POLICIES,
  ...PACKAGE_EXPORT_PATH_POLICIES,
  ...SUBPATH_EXPORT_POLICIES
];

export function getCanonPublicExportPathClassification(
  exportPath: string
): CanonPublicExportClassificationRule | undefined {
  return CANON_PUBLIC_EXPORT_CLASSIFICATION_RULES.find(
    (rule) => rule.exportPath === exportPath && !rule.exportName
  );
}

export function getCanonPublicExportClassification(
  exportPath: string,
  exportName?: string
): CanonPublicExportClassificationRule | undefined {
  return (
    CANON_PUBLIC_EXPORT_CLASSIFICATION_RULES.find(
      (rule) => rule.exportPath === exportPath && rule.exportName === exportName
    ) ?? getCanonPublicExportPathClassification(exportPath)
  );
}

export function searchCanonPublicExportClassifications(
  options: CanonPublicExportClassificationSearchOptions = {}
): CanonPublicExportClassificationRule[] {
  const query = options.query?.trim().toLowerCase() ?? '';
  const limit = options.limit ?? 10;

  return CANON_PUBLIC_EXPORT_CLASSIFICATION_RULES.filter(
    (rule) => !options.classification || rule.classification === options.classification
  )
    .filter((rule) => !options.registryPolicy || rule.registryPolicy === options.registryPolicy)
    .filter((rule) => !options.exportPath || rule.exportPath === options.exportPath)
    .map((rule) => ({ rule, score: scoreCanonPublicExportClassificationRule(rule, query) }))
    .filter((result) => !query || result.score > 0)
    .sort((a, b) => b.score - a.score || a.rule.exportPath.localeCompare(b.rule.exportPath))
    .slice(0, limit)
    .map((result) => result.rule);
}

export function renderCanonPublicExportClassification(
  rule: CanonPublicExportClassificationRule
): string {
  const exportLabel = rule.exportName
    ? `${rule.exportPath}#${rule.exportName}`
    : `${rule.exportPath}#*`;
  const lines = [
    `## ${exportLabel}`,
    '',
    `- Export path: \`${rule.exportPath}\``,
    `- Classification: \`${rule.classification}\``,
    `- Registry policy: \`${rule.registryPolicy}\``
  ];

  if (rule.exportName) lines.push(`- Export name: \`${rule.exportName}\``);
  if (rule.registryItemIds?.length) {
    lines.push(`- Registry items: ${rule.registryItemIds.map((id) => `\`${id}\``).join(', ')}`);
  }

  lines.push('', rule.rationale);

  return lines.join('\n');
}

function scoreCanonPublicExportClassificationRule(
  rule: CanonPublicExportClassificationRule,
  query: string
): number {
  if (!query) return 1;

  const haystacks = [
    rule.exportPath,
    rule.exportName ?? '',
    rule.classification,
    rule.registryPolicy,
    ...(rule.registryItemIds ?? []),
    rule.rationale
  ].map((value) => value.toLowerCase());

  return query
    .split(/\s+/)
    .filter(Boolean)
    .reduce((score, token) => {
      if (rule.exportName?.toLowerCase() === token || rule.exportPath.toLowerCase() === token) {
        return score + 8;
      }
      if (haystacks.some((value) => value.includes(token))) return score + 1;
      return score;
    }, 0);
}
