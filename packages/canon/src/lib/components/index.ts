// Component exports
export { default as SEO } from './SEO.svelte';
export { default as LayoutSEO } from './LayoutSEO.svelte';
export { default as Navigation } from './Navigation.svelte';
export { default as Footer } from './Footer.svelte';
export { default as Button } from './Button.svelte';
export { default as Heading } from './Heading.svelte';
export { default as Card } from './Card.svelte';
export { default as CatalogCard } from './CatalogCard.svelte';
export { default as PaperCard } from './PaperCard.svelte';
export { default as PapersGrid } from './PapersGrid.svelte';
export { default as AnimatedAsciiThumbnail } from './AnimatedAsciiThumbnail.svelte';
export { default as CategorySection } from './CategorySection.svelte';
export { default as ShareButtons } from './ShareButtons.svelte';
export { default as QuoteBlock } from './QuoteBlock.svelte';
export { default as Analytics } from './Analytics.svelte';
export { default as RelatedArticles } from './RelatedArticles.svelte';
export { default as TriadHealth } from './TriadHealth.svelte';
export { default as HermeneuticCircle } from './HermeneuticCircle.svelte';
export { default as ModeIndicator } from './ModeIndicator.svelte';
export { default as CrossPropertyLink } from './CrossPropertyLink.svelte';
export { default as PropertyFunnel } from './PropertyFunnel.svelte';
export { default as SkipToContent } from './SkipToContent.svelte';
export { default as PrivacyPolicyContent } from './PrivacyPolicyContent.svelte';
export { default as TermsOfServiceContent } from './TermsOfServiceContent.svelte';
export { default as CookieConsent } from './CookieConsent.svelte';

// Licensed Meridian system: native, owned component translations.
export * from './meridian/index.js';

// Clear communication primitives
export {
  ClearPageSection,
  ClearPlatformHero,
  ClearLogoStrip,
  ClearProofStrip,
  ClearWorkflowMiniArtifact,
  ClearStateRows,
  ClearArtifactCard,
  ClearCardGrid,
  ClearUseCaseBand,
  ClearQuoteMetricPanel,
  ClearPillarGrid,
  ClearMetadataRail,
  ClearSecurityPanel,
  ClearContentHighlights,
  ClearReceiptGrid,
  ClearCtaBand,
  ClearActionFooter,
  ClearDecisionPanel,
  ClearErrorPage,
  type ClearPlatformHeroMeta,
  type ClearPlatformHeroProof,
  type ClearLogoStripItem,
  type ClearProofItem,
  type ClearWorkflowMiniArtifactProps,
  type ClearWorkflowState,
  type ClearCardItem,
  type ClearUseCaseItem,
  type ClearQuoteMetric,
  type ClearPillarItem,
  type ClearPillarLink,
  type ClearMetadataGroup,
  type ClearMetadataItem,
  type ClearSecurityItem,
  type ClearSecurityLog,
  type ClearContentHighlight,
  type ClearReceipt,
  type ClearCtaItem,
  type ClearActionFooterItem,
  type ClearDecisionAction,
  type ClearDecisionItem,
  type ClearDecisionTone
} from './clear/index.js';

// Form components
export {
  TextField,
  TextArea,
  Checkbox,
  CheckboxGroup,
  Radio,
  RadioGroup,
  Select,
  Switch
} from './form/index.js';

// Feedback components
export { Alert, Toast, Dialog, Progress, Spinner, Skeleton } from './feedback/index.js';

// Navigation components
export {
  Breadcrumbs,
  Tabs,
  Pagination,
  Tooltip,
  Popover,
  DropdownMenu,
  Drawer
} from './navigation/index.js';

// Documentation components (live docs - components ARE the documentation)
export { TokenSwatch, TokenGrid } from './docs/index.js';

// Database-layer primitives (docs/CANON_DATABASE_LAYER_DESIGN.md)
export {
  DataTable,
  StatusBadge,
  type DataTableColumn,
  type DataTableSortDirection,
  type StatusBadgeTone,
  type StatusBadgeVariant
} from './data/index.js';

// Performance Lab primitives
export * from './performance/index.js';

// Page action components
export { default as PageActions } from './PageActions.svelte';
export { default as MarkdownPreviewModal } from './MarkdownPreviewModal.svelte';
