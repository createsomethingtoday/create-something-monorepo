/**
 * Webflow Site Analyzer Types
 * 
 * Domain types for site analysis including touchpoints, SEO, structure, and metrics.
 */

// =============================================================================
// Touchpoint Types
// =============================================================================

export type TouchpointType = 
  | 'link'           // Anchor elements with href
  | 'button'         // Button elements or role="button"
  | 'input'          // Form inputs (text, email, etc.)
  | 'select'         // Dropdowns
  | 'textarea'       // Multi-line inputs
  | 'form'           // Form containers
  | 'interactive'    // Other clickable elements
  | 'navigation'     // Nav menu items
  | 'cta';           // Call-to-action elements

export interface BoundingRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Touchpoint {
  id: string;
  type: TouchpointType;
  tag: string;
  selector: string;
  text: string;
  href?: string;
  position: BoundingRect;
  attributes: Record<string, string>;
  isVisible: boolean;
  isAboveFold: boolean;
  zIndex: number;
  // Webflow-specific
  webflowClass?: string;
  webflowInteraction?: string;
}

export interface TouchpointAnalysis {
  url: string;
  timestamp: string;
  totalCount: number;
  byType: Record<TouchpointType, number>;
  touchpoints: Touchpoint[];
  warnings: string[];
}

// =============================================================================
// SEO Types
// =============================================================================

export interface MetaTag {
  name?: string;
  property?: string;
  content: string;
}

export interface HeadingStructure {
  tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  text: string;
  level: number;
  order: number;
}

export interface SEOAnalysis {
  url: string;
  timestamp: string;
  title: string;
  description: string;
  canonical?: string;
  
  // Meta tags
  metaTags: MetaTag[];
  openGraph: Record<string, string>;
  twitterCard: Record<string, string>;
  
  // Structure
  headings: HeadingStructure[];
  h1Count: number;
  
  // Links
  internalLinks: number;
  externalLinks: number;
  brokenLinks: string[];
  
  // Images
  imagesWithAlt: number;
  imagesWithoutAlt: number;
  
  // Technical
  hasRobotsMeta: boolean;
  isIndexable: boolean;
  hasStructuredData: boolean;
  structuredDataTypes: string[];
  
  // Scores
  score: number;
  issues: SEOIssue[];
  recommendations: string[];
}

export interface SEOIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  element?: string;
}

// =============================================================================
// Page Structure Types
// =============================================================================

export interface PageSection {
  id: string;
  tag: string;
  className: string;
  position: BoundingRect;
  depth: number;
  children: PageSection[];
  // Webflow-specific
  webflowSymbol?: string;
  isNavbar?: boolean;
  isFooter?: boolean;
  isHero?: boolean;
}

export interface PageStructure {
  url: string;
  timestamp: string;
  viewport: { width: number; height: number };
  documentHeight: number;
  sections: PageSection[];
  navbar?: PageSection;
  footer?: PageSection;
  mainContent?: PageSection;
}

// =============================================================================
// Image Analysis Types
// =============================================================================

export interface ImageInfo {
  src: string;
  alt: string;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
  loading: 'lazy' | 'eager' | 'auto';
  format: string;
  fileSize?: number;
  isOptimized: boolean;
  issues: string[];
}

export interface ImageAnalysis {
  url: string;
  timestamp: string;
  totalImages: number;
  images: ImageInfo[];
  byFormat: Record<string, number>;
  totalEstimatedSize: number;
  optimizationScore: number;
  recommendations: string[];
}

// =============================================================================
// Performance Types
// =============================================================================

export interface PerformanceMetrics {
  url: string;
  timestamp: string;
  
  // Timing
  loadTime: number;
  domContentLoaded: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  
  // Resources
  totalRequests: number;
  totalTransferSize: number;
  resourcesByType: Record<string, { count: number; size: number }>;
  
  // Webflow-specific
  webflowScriptSize: number;
  interactionsScriptSize: number;
  customCodeSize: number;
}

// =============================================================================
// Browser Provider Types
// =============================================================================

export interface BrowserProviderConfig {
  name: string;
  token?: string;
  endpoint?: string;
  timeout?: number;
  retries?: number;
}

export interface AnalyzeOptions {
  waitForSelector?: string;
  waitForNavigation?: boolean;
  timeout?: number;
  viewport?: { width: number; height: number };
  userAgent?: string;
  // Authentication for Webflow previews
  cookies?: Array<{ name: string; value: string; domain: string }>;
  // Screenshot-specific options
  fullPage?: boolean;
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number;
}

export interface BrowserSessionInit {
  url?: string;
  options?: AnalyzeOptions;
}

export interface BrowserSessionEvaluateOptions {
  target?: 'main' | 'preview-frame' | 'auto';
  waitForSelector?: string;
  timeout?: number;
}

export interface BrowserSession {
  id: string;
  provider: string;
  startTime: number;
  pageUrl?: string;
  status: 'active' | 'closed' | 'error';
}

export interface BrowserSessionHandle {
  id: string;
  provider: string;
  goto(url: string, options?: AnalyzeOptions): Promise<void>;
  evaluate<T>(script: string, options?: BrowserSessionEvaluateOptions): Promise<T>;
  getPageUrl(): string | null;
  close(): Promise<void>;
}

export interface BrowserProvider {
  name: string;
  
  // Core operations
  analyze<T>(url: string, script: string, options?: AnalyzeOptions): Promise<T>;
  screenshot(url: string, options?: AnalyzeOptions): Promise<Buffer>;
  extractDesignerMetadata?(
    url: string,
    timeout?: number
  ): Promise<{
    siteName: string;
    sitePlan: string;
    pages: Array<{ name: string; type: string; category?: string }>;
    styleClasses: Array<{ name: string; isGlobal: boolean }>;
    components: Array<{ name: string; instanceCount: number; isUnused: boolean }>;
    interactions: Array<{ trigger: string; targetElement: string; type: string }>;
    cmsCollections: Array<{ name: string; itemCount: number }>;
    assets: Array<{ filename: string; type: string }>;
    breakpoints: string[];
  }>;
  openSession?(input?: BrowserSessionInit): Promise<BrowserSessionHandle>;
  
  // Lifecycle
  healthCheck(): Promise<boolean>;
  getSessionMetrics(): BrowserSessionMetrics;
}

// =============================================================================
// Observability Types
// =============================================================================

export interface BrowserSessionMetrics {
  sessionsCreated: number;
  sessionsClosed: number;
  sessionErrors: number;
  totalDurationMs: number;
  averageDurationMs: number;
  pageLoadsCompleted: number;
  pageLoadErrors: number;
}

export interface AnalysisMetrics {
  tool: string;
  url: string;
  provider: string;
  durationMs: number;
  success: boolean;
  itemsExtracted?: number;
  errorMessage?: string;
  // Cost tracking
  browserMinutes: number;
}

export interface ProviderHealthMetrics {
  provider: string;
  isHealthy: boolean;
  lastCheckTime: number;
  successRate: number;
  averageLatencyMs: number;
  failureCount: number;
}

// =============================================================================
// Tool Input/Output Types
// =============================================================================

export interface AnalyzeTouchpointsInput {
  url: string;
  waitForSelector?: string;
  timeout?: number;
  includeHidden?: boolean;
}

export interface ExtractSEOInput {
  url: string;
  checkLinks?: boolean;
  timeout?: number;
}

export interface GetPageStructureInput {
  url: string;
  depth?: number;
  timeout?: number;
}

export interface AnalyzeImagesInput {
  url: string;
  checkFileSizes?: boolean;
  timeout?: number;
}

export interface CaptureScreenshotInput {
  url: string;
  fullPage?: boolean;
  viewport?: { width: number; height: number };
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number;
}

export interface GetPerformanceInput {
  url: string;
  timeout?: number;
}

// =============================================================================
// Designer Metadata Types (Webflow Preview Mode)
// =============================================================================

export interface PageInfo {
  name: string;
  type: 'static' | 'cms-template' | 'ecommerce' | 'utility' | 'user';
  category?: string;
}

export interface StyleClassInfo {
  name: string;
  isGlobal: boolean;
}

export interface ComponentInfo {
  name: string;
  instanceCount: number;
  isUnused: boolean;
}

export interface InteractionInfo {
  trigger: string;
  targetElement: string;
  type: 'page-load' | 'element-trigger' | 'scroll' | 'other';
}

export interface CMSCollectionInfo {
  name: string;
  itemCount: number;
}

export interface AssetInfo {
  filename: string;
  type: 'image' | 'svg' | 'video' | 'other';
}

export interface DesignerMetadata {
  url: string;
  timestamp: string;
  siteName: string;
  sitePlan: string;
  
  // Pages
  pages: PageInfo[];
  totalPages: number;
  
  // CSS Classes
  styleClasses: StyleClassInfo[];
  totalClasses: number;
  globalClasses: number;
  customClasses: number;
  
  // Components
  components: ComponentInfo[];
  totalComponents: number;
  unusedComponents: number;
  
  // Interactions
  interactions: InteractionInfo[];
  totalInteractions: number;
  
  // CMS
  cmsCollections: CMSCollectionInfo[];
  totalCMSItems: number;
  
  // Assets
  assets: AssetInfo[];
  totalAssets: number;
  
  // Breakpoints
  breakpoints: string[];
}

export interface ExtractDesignerMetadataInput {
  url: string;
  timeout?: number;
}

// =============================================================================
// Designer Checklist Scoring Types
// =============================================================================

export type ChecklistResult = 'pass' | 'fail' | 'manual';

export interface DesignerChecklistCheck {
  id: string;
  section: string;
  requirement: string;
  result: ChecklistResult;
  evidence: string[];
}

export interface DesignerChecklistSummary {
  pass: number;
  fail: number;
  manual: number;
  scored: number;
  passRate: number;
}

export interface DesignerChecklistReport {
  evaluatedAt: string;
  source: 'live-extraction' | 'provided-metadata';
  metadataSummary: {
    siteName: string;
    sitePlan: string;
    totalPages: number;
    totalComponents: number;
    unusedComponents: number;
    totalInteractions: number;
    totalCMSCollections: number;
    totalCMSItems: number;
    totalAssets: number;
    breakpoints: string[];
    pages: Array<{ name: string; type: string }>;
  };
  summary: DesignerChecklistSummary;
  checks: DesignerChecklistCheck[];
}

export interface ScoreDesignerChecklistInput {
  url?: string;
  timeout?: number;
  designerMetadata?: DesignerMetadata;
  includeManual?: boolean;
}

// =============================================================================
// Unified Template Review Types (Designer + Published WebMCP)
// =============================================================================

export type UnifiedReviewStatus = 'pass' | 'fail' | 'partial' | 'manual';

export type UnifiedReviewSeverity = 'critical' | 'major' | 'minor' | 'info';

export interface UnifiedReviewRow {
  id: string;
  section: string;
  requirement: string;
  status: UnifiedReviewStatus;
  severity: UnifiedReviewSeverity;
  confidence: number; // 0..1 heuristic confidence
  source: string[];
  evidence: string[];
  fixHint?: string;
}

export interface PublishedSnippetIssueCounts {
  metaMissing: number;
  missingH1: number;
  multipleH1: number;
  skippedHeadingLevels: number;
  imagesMissingAlt: number;
  linksMissingRel: number;
  linksMissingAccessibleName: number;
  linksEmptyHref: number;
  linksPlaceholderHref: number;
  imagesMissingDimensions: number;
  imagesAboveFoldLazy: number;
  formsMissingLabels: number;
  autoplayWithoutControls: number;
  backgroundVideosMissingControl: number;
}

export type PublishedSnippetEvidenceSource = 'installed' | 'injected' | 'dom-fallback';
export type PublishedSnippetEvidenceExample = Record<string, unknown>;

export interface PublishedSnippetPageSummary {
  failCount: number;
  failReasons: string[];
  metaMissing: string[];
  headings: {
    headings: number;
    h1: number;
    missingH1: boolean;
    multipleH1: boolean;
    skippedHeadingLevels: number;
    emptyHeadings: number;
  } | null;
  links: {
    links: number;
    emptyHref: number;
    placeholderHref: number;
    blankTargetMissingRel: number;
    missingAccessibleName: number;
  } | null;
  images: {
    images: number;
    missingAlt: number;
    missingDimensions: number;
    aboveFoldLazy: number;
    belowFoldNotLazy: number;
  } | null;
  imageFormats: Record<string, number>;
  forms: {
    fields: number;
    missingLabels: number;
  } | null;
  media: {
    videos: number;
    autoplayWithoutControls: number;
    backgroundVideosMissingControl: number;
  } | null;
  ix2: {
    events: number;
    actionLists: number;
    usedActionLists: number;
    unusedActionLists: number;
    missingTargets: number;
    missingActionLists: number;
  } | null;
  ix3: {
    interactions: number;
    timelines: number;
    missingTimelines: number;
    deletedInteractions: number;
    missingTargetSelectors: number;
  } | null;
  comboClassDepth: {
    maxDepth: number;
    maxDepthSelector: string;
    sampled: number;
  } | null;
  transitions: {
    totalInteractive: number;
    withTransition: number;
    withoutTransition: number;
    ratio: number;
  } | null;
  contrast: {
    checked: number;
    pass: number;
    fail: number;
    passRate: number;
    failures?: Array<{
      text: string;
      tag: string;
      ratio: number;
      required: number;
      fg: string;
      bg: string;
    }>;
  } | null;
  examples?: {
    headings?: {
      headings?: PublishedSnippetEvidenceExample[];
      skippedHeadingLevels?: PublishedSnippetEvidenceExample[];
      emptyHeadings?: PublishedSnippetEvidenceExample[];
    };
    images?: {
      missingAlt?: PublishedSnippetEvidenceExample[];
      missingDimensions?: PublishedSnippetEvidenceExample[];
      aboveFoldLazy?: PublishedSnippetEvidenceExample[];
      belowFoldNotLazy?: PublishedSnippetEvidenceExample[];
    };
    links?: {
      emptyHref?: PublishedSnippetEvidenceExample[];
      placeholderHref?: PublishedSnippetEvidenceExample[];
      blankTargetMissingRel?: PublishedSnippetEvidenceExample[];
      missingAccessibleName?: PublishedSnippetEvidenceExample[];
    };
    forms?: {
      missingLabels?: PublishedSnippetEvidenceExample[];
    };
  };
}

export interface PublishedSnippetPageResult {
  url: string;
  depth: number;
  title: string | null;
  statusCode: number | null;
  /** Page classification from the URL classifier. */
  classification?: PageClassification;
  hasSnippet: boolean;
  snippetSource?: PublishedSnippetEvidenceSource;
  snippetVersion: string | null;
  snippetInjectionUrl?: string | null;
  snippetInjectionError?: string | null;
  hasRequiredLicenseText?: boolean | null;
  error?: string | null;
  summary?: PublishedSnippetPageSummary | null;
  policyChecks?: {
    hasPoweredByWebflow?: boolean;
    affiliateLinks?: string[];
    hasGsap?: boolean;
    hasCustomCode?: boolean;
  };
  siteSettings?: {
    hasCustomFavicon?: boolean;
    hasCustomFonts?: boolean;
    customFontSources?: string[];
    detectedApps?: string[];
  };
  contentQuality?: {
    hasLoremIpsum?: boolean;
    hasPlaceholderText?: boolean;
  };
}

export interface PublishedSnippetCrawlResult {
  startUrl: string;
  origin: string;
  maxPages: number;
  maxDepth: number;
  visitedPages: number;
  auditedPages: number;
  pagesWithSnippet: number;
  pagesWithInstalledSnippet?: number;
  pagesWithInjectedSnippet?: number;
  pagesWithDomFallback?: number;
  failingPages: number;
  /** URLs that were discovered but not crawled (e.g. maxPages cap). */
  skippedUrls: string[];
  snippetVersion: string | null;
  snippetTools: string[];
  snippetInjectionUrl?: string | null;
  snippetInjectionErrors?: string[];
  sitemapStatus: { ok: boolean; count?: number; error?: string };
  audit404:
    | {
        ok: boolean;
        status: number;
        title: string | null;
        navCount: number;
        linkCount: number;
        h1Count: number;
      }
    | { ok: false; error: string };
  issueCounts: PublishedSnippetIssueCounts;
  policyChecks: {
    hasPoweredByWebflow: boolean;
    affiliateLinkCount: number;
    affiliateLinks: string[];
    hasGsap: boolean;
    hasCustomCode: boolean;
  };
  siteSettings: {
    hasCustomFavicon: boolean;
    hasCustomFonts: boolean;
    customFontSources: string[];
    detectedApps: string[];
  };
  pages: PublishedSnippetPageResult[];
}

export type PageClassification =
  | 'homepage'
  | 'content'
  | 'utility:license'
  | 'utility:instructions'
  | 'utility:changelog'
  | 'utility:style-guide'
  | 'utility:other'
  | 'cms-listing'
  | 'cms-detail'
  | 'ecommerce'
  | 'error-page'
  | 'other';

export interface ClassifiedUrl {
  url: string;
  classification: PageClassification;
  confidence: number;
  /** Whether this URL should be prioritized in the crawl queue. */
  priority: 'critical' | 'normal' | 'low';
}

export interface PublishedSitePrecheckResult {
  startUrl: string;
  origin: string;
  discoveredUrls: string[];
  /** Agent-classified URLs with page type and crawl priority. */
  classifiedUrls?: ClassifiedUrl[];
  requiredPages: {
    licenses: boolean;
    instructions: boolean;
    changelog: boolean;
  };
  sitemap: {
    ok: boolean;
    count?: number;
    source?: string;
    error?: string;
  };
  errors: string[];
}

export interface UnifiedTemplateReviewSummary {
  pass: number;
  fail: number;
  partial: number;
  manual: number;
  automated: number;
  humanInLoop: number;
  /** Weighted score 0-100 based on check severity and pass rate. */
  overallScore: number;
  /** Qualitative grade derived from overallScore. */
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  /** Page crawl coverage metrics. */
  coverage: {
    /** Total unique pages known (from Designer + sitemap + link discovery). */
    totalKnownPages: number;
    /** Pages actually crawled and audited. */
    crawledPages: number;
    /** Pages discovered but not crawled. */
    skippedPages: number;
    /** Coverage percentage (crawled / known). */
    coveragePercent: number;
  };
}

export interface UnifiedTemplateReviewReport {
  jobId?: string;
  status?: TemplateReviewJobStatus;
  queuedAt?: string;
  startedAt?: string;
  completedAt?: string;
  generatedAt: string;
  provider: string;
  previewUrl?: string | null;
  publishedUrl: string;
  designerMode?: 'live' | 'skip';
  precheck?: PublishedSitePrecheckResult;
  providerMetrics?: {
    sessionsCreated: number;
    sessionsClosed: number;
    sessionErrors: number;
    totalDurationMs: number;
    averageDurationMs: number;
    pageLoadsCompleted: number;
    pageLoadErrors: number;
    browserMinutes: number;
  };
  summary: UnifiedTemplateReviewSummary;
  designer: DesignerChecklistReport;
  published: PublishedSnippetCrawlResult;
  rows: UnifiedReviewRow[];
}

export interface RunTemplateReviewInput {
  previewUrl?: string;
  publishedUrl: string;
  timeout?: number;
  includeManual?: boolean;
  crawlMaxPages?: number;
  crawlMaxDepth?: number;
}

export interface EnqueueTemplateReviewInput extends RunTemplateReviewInput {}

export type TemplateReviewJobStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'canceled';

export interface TemplateReviewJobProgress {
  phase: 'queued' | 'precheck' | 'designer' | 'published' | 'normalizing' | 'completed' | 'failed';
  progress: number;
  total: number;
  message: string;
  updatedAt: string;
}

export interface TemplateReviewJobRecord {
  jobId: string;
  status: TemplateReviewJobStatus;
  input: RunTemplateReviewInput;
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  progress: TemplateReviewJobProgress;
  error?: string;
  result?: UnifiedTemplateReviewReport;
}

export interface GetTemplateReviewJobInput {
  jobId: string;
}

export interface ListTemplateReviewJobsInput {
  status?: TemplateReviewJobStatus;
  limit?: number;
}
