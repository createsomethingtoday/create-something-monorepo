/**
 * CREATE SOMETHING Canon Webflow Components
 *
 * React components for Webflow with Canon-first positioning. Some existing
 * exports remain compatibility surfaces while Canon parity work is in progress.
 */

// Tokens
export * from './styles/tokens';
export * from './components/primitives';

// Core Components
export { Button } from './components/core/Button';
export type { ButtonProps } from './components/core/Button';

// Typography Components
export { Heading } from './components/typography/Heading';
export type {
  HeadingAlign,
  HeadingLevel,
  HeadingProps,
  HeadingScale,
} from './components/typography/Heading';

// Canon Surfaces
export { Card } from './components/surfaces/Card';
export type { CardPadding, CardProps, CardRadius, CardVariant } from './components/surfaces/Card';

// Legacy compatibility card components
export { GlassCard } from './components/cards/GlassCard';
export type { GlassCardProps, GlassVariant } from './components/cards/GlassCard';

export { IconCard } from './components/cards/IconCard';
export type { IconCardProps, IconCardVariant } from './components/cards/IconCard';

export { TemplateCard } from './components/cards/TemplateCard';
export type { TemplateCardProps, TemplateCardBadge, TemplateCardImage, TemplateCardLink } from './components/cards/TemplateCard';

export { FeaturedCreatorCard } from './components/cards/FeaturedCreatorCard';
export type {
  FeaturedCreatorAccent,
  FeaturedCreatorCardImage,
  FeaturedCreatorCardLink,
  FeaturedCreatorCardProps,
} from './components/cards/FeaturedCreatorCard';

export { TemplateGrid } from './components/grid/TemplateGrid';
export type { TemplateGridProps } from './components/grid/TemplateGrid';

export { TemplateFilterBar } from './components/filter/TemplateFilterBar';
export type { TemplateFilterBarProps } from './components/filter/TemplateFilterBar';

export { TemplateSearch } from './components/search/TemplateSearch';
export type { SuggestItem, TemplateSearchProps } from './components/search/TemplateSearch';

export { TemplateSearchPage } from './components/marketplace/TemplateSearchPage';
export type { TemplateSearchPageProps } from './components/marketplace/TemplateSearchPage';

export { TemplateSearchBox } from './components/marketplace/TemplateSearchBox';
export type { TemplateSearchBoxMode, TemplateSearchBoxProps, TemplateSearchBoxVariant } from './components/marketplace/TemplateSearchBox';

export { TemplateSearchResults } from './components/marketplace/TemplateSearchResults';
export type { TemplateSearchResultsProps } from './components/marketplace/TemplateSearchResults';

export { TemplateSearchSidebar } from './components/marketplace/TemplateSearchSidebar';
export type { TemplateSearchSidebarProps } from './components/marketplace/TemplateSearchSidebar';

export { TemplateMarketplaceHeading } from './components/marketplace/TemplateMarketplaceHeading';
export type { TemplateMarketplaceHeadingProps } from './components/marketplace/TemplateMarketplaceHeading';

export { TemplateCarouselSection } from './components/marketplace/TemplateCarouselSection';
export type {
  TemplateCarouselPreset,
  TemplateCarouselSectionProps,
} from './components/marketplace/TemplateCarouselSection';

export { TemplateDetailConversionTracker } from './components/marketplace/TemplateDetailConversionTracker';
export type {
  TemplateDetailConversionTrackerProps,
} from './components/marketplace/TemplateDetailConversionTracker';

export { TemplateDetailHero } from './components/marketplace/TemplateDetailHero';
export type { TemplateDetailHeroProps } from './components/marketplace/TemplateDetailHero';

export { TemplateDetailOfferPanel } from './components/marketplace/TemplateDetailOfferPanel';
export type { TemplateDetailOfferPanelProps } from './components/marketplace/TemplateDetailOfferPanel';

export { TemplateDetailHighlights } from './components/marketplace/TemplateDetailHighlights';
export type {
  TemplateDetailHighlightItem,
  TemplateDetailHighlightsProps,
} from './components/marketplace/TemplateDetailHighlights';

export { TemplateDetailStickyBar } from './components/marketplace/TemplateDetailStickyBar';
export type { TemplateDetailStickyBarProps } from './components/marketplace/TemplateDetailStickyBar';

export { TemplateDetailAppExtensions } from './components/marketplace/TemplateDetailAppExtensions';
export type {
  TemplateDetailAppExtensionsProps,
  TemplateDetailAppRecommendation,
} from './components/marketplace/TemplateDetailAppExtensions';

export { MarketplaceLandingHero } from './components/marketplace/MarketplaceLandingHero';
export type {
  MarketplaceLandingHeroProps,
  MarketplaceLandingHeroSearchExperience,
  MarketplaceLandingHeroSuggestion,
} from './components/marketplace/MarketplaceLandingHero';

export { PopularCategoryGrid } from './components/marketplace/PopularCategoryGrid';
export type {
  PopularCategoryGridCategory,
  PopularCategoryGridProps,
} from './components/marketplace/PopularCategoryGrid';

export { MarketplaceFaq } from './components/marketplace/MarketplaceFaq';
export type {
  MarketplaceFaqItem,
  MarketplaceFaqProps,
} from './components/marketplace/MarketplaceFaq';

export { MarketplaceLandingExperimentGate } from './components/marketplace/MarketplaceLandingExperimentGate';
export type {
  MarketplaceLandingExperimentGateProps,
} from './components/marketplace/MarketplaceLandingExperimentGate';

export type {
  MarketplaceAnalyticsData,
  MarketplaceExperimentRole,
  MarketplaceExperimentState,
  MarketplaceExperimentVariant,
} from './components/marketplace/analytics';

// Canon Form Components
export { TextField } from './components/form/TextField';
export type { TextFieldProps, TextFieldSize, TextFieldType } from './components/form/TextField';

export { TextArea } from './components/form/TextArea';
export type { TextAreaProps } from './components/form/TextArea';

// Legacy compatibility form components
export { Field } from './components/forms/Field';
export type { FieldProps } from './components/forms/Field';

export { Select } from './components/forms/Select';
export type { SelectProps, SelectItem } from './components/forms/Select';

export { ResiliencyAlertSignup } from './components/forms/ResiliencyAlertSignup';
export type { ResiliencyAlertSignupProps } from './components/forms/ResiliencyAlertSignup';

// Canon Navigation + Feedback Components
export { Tabs } from './components/navigation/Tabs';
export type { TabItem, TabsProps, TabsSize, TabsVariant } from './components/navigation/Tabs';

export { Navigation } from './components/navigation/Navigation';
export type { NavigationLink, NavigationProps } from './components/navigation/Navigation';

export { Dialog } from './components/feedback/Dialog';
export type { DialogProps, DialogSize } from './components/feedback/Dialog';

// Canon Control Plane Components
export {
  ActionPreview,
  ActionExecutionQueue,
  AgentDock,
  ApprovalGate,
  ApprovalQueue,
  ArtifactGrid,
  BusinessContextSwitcher,
  CanonControlPanel,
  DecisionQueue,
  EvidenceManager,
  EvidenceTrail,
  OperatingLayerCards,
  OperatorActivityLog,
  RuntimeStatus,
  SourceTruthStatus,
  WorkflowMetricsStrip,
  canonControlDefaults,
} from './components/control/ControlComponents';
export type {
  ActionExecutionItem,
  ActionExecutionQueueProps,
  ActionPreviewItem,
  ActionPreviewProps,
  ActionStatus,
  ActivityEventItem,
  AgentDockProps,
  AgentMessage,
  ApprovalRequestCredentials,
  ApprovalQueueItem,
  ApprovalQueueProps,
  ApprovalGateProps,
  ApprovalState,
  ArtifactGridProps,
  ArtifactItem,
  BusinessContextItem,
  BusinessContextSwitcherProps,
  CanonControlPanelProps,
  CheckStatus,
  DecisionItem,
  DecisionQueueProps,
  EvidenceManagerProps,
  EvidenceItem,
  EvidenceTrailProps,
  OperatingLayer,
  OperatingLayerCardsProps,
  OperatorActivityLogProps,
  RiskLevel,
  RuntimeCheck,
  RuntimeStatusProps,
  SourceStatusItem,
  SourceTruthStatusProps,
  StatusTone,
  SuggestedPrompt,
  TriadTier,
  WorkflowMetricItem,
  WorkflowMetricsStripProps,
} from './components/control/ControlComponents';

// Data Components
export { StatsDisplay } from './components/data/StatsDisplay';
export type { StatsDisplayProps, StatItem, StatsVariant } from './components/data/StatsDisplay';

// Section Components
export { HeroSection } from './components/sections/HeroSection';
export type { HeroSectionProps } from './components/sections/HeroSection';

export { KineticHero } from './components/sections/KineticHero';
export type { KineticHeroProps } from './components/sections/KineticHero';

export { ProductShowcase } from './components/sections/ProductShowcase';
export type { ProductShowcaseProps, ProductItem } from './components/sections/ProductShowcase';

export { Solutions } from './components/sections/Solutions';
export type { SolutionsProps, SolutionTab } from './components/sections/Solutions';

export { ProcessSteps } from './components/sections/ProcessSteps';
export type { ProcessStepsProps, ProcessStep } from './components/sections/ProcessSteps';

export { IconCardGrid } from './components/sections/IconCardGrid';
export type { IconCardGridProps, IconCardGridItem } from './components/sections/IconCardGrid';

// Cato Supply delivery components
export {
  CatoInsightCmsCard,
  CatoInsightDetail,
  CatoInsightsArchive,
  CatoInsightsArchiveShell,
  CatoInsightsHub,
  CatoInsightsMegaMenu,
  catoInsightsDefaults,
} from './components/cato/CatoInsights';
export type {
  CatoInsightBodySection,
  CatoInsightCategory,
  CatoInsightCmsCardProps,
  CatoInsightDetailProps,
  CatoInsightLinkProp,
  CatoInsightItem,
  CatoInsightsArchiveProps,
  CatoInsightsArchiveShellProps,
  CatoInsightsDataProps,
  CatoInsightsHubProps,
  CatoInsightsMegaMenuProps,
} from './components/cato/CatoInsights';

export {
  CatoProductSearchForm,
  CatoRiskRadarCatalog,
  CatoSupplySearchHero,
} from './components/cato/CatoProductSearch';
export type {
  CatoProductSearchFormProps,
  CatoRiskRadarCatalogProps,
  CatoRiskRadarRow,
  CatoSupplySearchHeroProps,
} from './components/cato/CatoProductSearch';

export {
  CatoAboutPage,
  CatoCaseStudiesLanding,
  CatoCaseStudyDetail,
} from './components/cato/CatoCompanyPages';
export type {
  CatoAboutPageProps,
  CatoCaseStudiesLandingProps,
  CatoCaseStudyDetailProps,
  CatoCaseStudyItem,
  CatoCaseStudyResult,
  CatoCompanyLinkMode,
  CatoImpactMetric,
  CatoTeamMember,
  CatoValueItem,
} from './components/cato/CatoCompanyPages';

// Legacy compatibility layout components
export { Header } from './components/layout/Header';
export type { HeaderProps, NavItem } from './components/layout/Header';

// Canon parity component with implementation cleanup still pending
export { Footer } from './components/layout/Footer';
export type { FooterProps, FooterColumn, SocialLink } from './components/layout/Footer';
