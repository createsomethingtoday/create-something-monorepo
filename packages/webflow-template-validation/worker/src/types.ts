/**
 * TypeScript type definitions for the Webflow Way Validator Worker
 */

export type ReviewJobStatus =
	| 'queued'
	| 'running'
	| 'completed'
	| 'failed'
	| 'cancelled';

// Request/Response Types
export interface ValidationRequest {
	siteUrl: string;
	designerData: DesignerData;
	pageSlugs?: string[]; // Additional page slugs to validate beyond auto-discovery
	options?: ValidationOptions;
}

// Batched asset validation for 100% coverage
export interface AssetBatchRequest {
	siteUrl: string;
	assets: AssetData[]; // Assets to validate in this batch
	batchIndex: number;
	totalAssets: number;
}

export interface AssetBatchResponse {
	results: AnalyzedAsset[];
	issues: ValidationIssue[];
	processedCount: number;
	totalAssets: number;
	isComplete: boolean;
	remainingAssets?: AssetData[]; // Assets still to process
}

export interface ValidationResponse {
	siteUrl: string;
	workerVersion?: string;
	timestamp: string;
	analysis: {
		assets: AssetAnalysisResult;
		content: ContentAnalysisResult;
		accessibility: AccessibilityAnalysisResult;
		interactions: InteractionsAnalysisResult;
		customCode: CustomCodeAnalysisResult;
		// performance removed: too estimative without real browser metrics
	};
	summary: {
		totalIssues: number;
		criticalErrors: number;
		coverageImprovement: string;
	};
}

export interface ReviewStartRequest {
	siteUrl: string;
	pageSlugs: string[];
	designerData: unknown;
	checks?: string[];
	options?: ValidationOptions;
	correlationId?: string;
}

export interface ReviewStartResponse {
	jobId: string;
	statusUrl: string;
	eventsUrl: string;
	startedAt: string;
}

export interface ReviewStatusResponse {
	jobId: string;
	status: ReviewJobStatus;
	progress: number;
	message: string;
	startedAt: string;
	updatedAt: string;
	completedAt: string | null;
	correlationId?: string;
	fallbackUsed?: boolean;
	result?: unknown;
	error?: string;
}

export interface SnippetInstallRequest {
	siteId: string;
	siteName?: string;
	installTarget: 'head';
	mode: 'programmatic' | 'webflow-api' | 'manual-fallback';
	/** Designer identity token passed for future app-auth lookup; not a Data API access token. */
	idToken?: string;
}

export interface SnippetInstallResponse {
	installed: boolean;
	bridgeToken: string;
	snippetVersion: string;
	installMethod: 'webflow-api' | 'manual-fallback';
	status: 'active' | 'pending_manual' | 'failed';
	message?: string;
}

export interface SnippetStatusResponse extends SnippetInstallResponse {
	siteId: string;
	siteName?: string | null;
	updatedAt: string;
}

export interface SnippetRotateTokenRequest {
	siteId: string;
	siteName?: string;
}

export interface ValidationSubmitRequest {
	siteId: string;
	siteName?: string;
	siteUrl?: string;
	validationResults: {
		url?: string;
		summary?: Record<string, unknown>;
		categories?: Array<{
			category?: string;
			passed?: boolean;
			issues?: Array<{
				severity?: string;
				message?: string;
			}>;
		}>;
	};
}

export interface ValidationSubmitResponse {
	success: boolean;
	accepted: boolean;
	persisted: boolean;
	siteId: string;
	siteName?: string | null;
	message: string;
	submittedAt: string;
	recordId?: string;
	reason?: 'record_not_found' | 'airtable_not_configured' | 'rate_limited';
	limit: {
		windowMs: number;
		maxSubmissions: number;
		remaining: number;
		resetAt: string;
		retryAfterSeconds?: number;
	};
	anomaly: {
		flagged: boolean;
		reasons: string[];
	};
	artifact?: {
		persisted: boolean;
		key?: string;
		sha256?: string;
		byteSize?: number;
		reason?: 'r2_not_configured' | 'r2_write_failed';
	};
}

export interface ValidationOptions {
	skipAssets?: boolean;
	skipContent?: boolean;
	skipPerformance?: boolean;
	skipAccessibility?: boolean;
	maxPages?: number;
	/**
	 * Page slugs/paths to exclude from content analysis (leading "/" optional).
	 * This is primarily used to skip intentional demo pages like Style Guide.
	 */
	excludePageSlugs?: string[];
	/**
	 * Controls how many pages the content validator analyzes.
	 * - 'all' (default): analyze homepage + additional pages (from slugs or discovery)
	 * - 'current': analyze only the current page slug (or homepage fallback)
	 */
	pageScope?: 'all' | 'current';
	/**
	 * The current page slug from the Designer (e.g., "/about").
	 * Used when pageScope is 'current'.
	 */
	currentPageSlug?: string;
	/**
	 * Fine-grained toggles for Content & Accessibility subchecks.
	 * Any key left undefined is treated as enabled.
	 */
	contentChecks?: {
		lorem?: boolean;
		headings?: boolean;
		altText?: boolean;
		seo?: boolean;
		links?: boolean;
		contentQuality?: boolean;
	};
}

// Designer Data (from Webflow Extension)
export interface DesignerData {
	variables?: VariableData;
	components: ComponentData[];
	styles: StyleData[];
	pages: PageData[];
	assets: AssetData[];
	siteInfo?: SiteInfo;
}

export interface VariableData {
	collections: VariableCollection[];
}

export interface VariableCollection {
	id: string;
	name: string;
	variables: Variable[];
	modes?: VariableMode[];
}

export interface VariableMode {
	id: string;
	name: string;
}

export interface Variable {
	id: string;
	name: string;
	type: string;
	value: any;
}

export interface ComponentData {
	id: string;
	name: string;
	type: string;
	instances?: number;
	isNested?: boolean;
}

export interface StyleData {
	id: string;
	name: string;
	type: string;
	isHtmlTag?: boolean;
	hasVariables?: boolean;
	properties?: Record<string, any>;
}

export interface PageData {
	id: string;
	name: string;
	slug: string;
	type: string;
	path?: string;
	publishPath?: string | null;
	collectionId?: string | null;
	collectionName?: string | null;
	isCmsTemplate?: boolean;
	isHomePage?: boolean;
	seo?: {
		title?: string;
		description?: string;
		openGraphTitle?: string;
		openGraphDescription?: string;
		openGraphImage?: string;
	};
}

export interface AssetData {
	id: string;
	name: string;
	url: string;
	mimeType: string;
	altText?: string;
}

export interface SiteInfo {
	name: string;
	id: string;
}

// Analysis Results
export interface AssetAnalysisResult {
	issues: ValidationIssue[];
	stats: {
		totalAssets: number;
		oversizedAssets: number;
		unoptimizedAssets: number;
		unusedAssets: number;
		licensingIssues: number;
		totalPageWeight: number;
	};
	assets: AnalyzedAsset[];
}

export interface ContentAnalysisResult {
	issues: ValidationIssue[];
	stats: {
		totalPages: number;
		pagesWithLoremIpsum: number;
		headingHierarchyErrors: number;
		altTextCoverage: number;
		seoComplianceScore: number;
		pagesWithSEOIssues: number;
		averageContentScore: number;
		pagesWithContentIssues: number;
		totalLinks: number;
		totalBrokenLinks: number;
		averageLinksPerPage: number;
	};
	pages: AnalyzedPage[];
}

export interface PerformanceAnalysisResult {
	issues: ValidationIssue[];
	stats: {
		totalPageWeight: number;
		renderBlockingResources: number;
		lazyLoadingImplemented: boolean;
		averageLoadTime: number;
	};
	metrics: PerformanceMetrics;
}

export interface AccessibilityAnalysisResult {
	issues: ValidationIssue[];
	stats: {
		missingAltText: number;
		headingStructureErrors: number;
		wcagComplianceScore: number;
	};
	audit: AccessibilityAudit;
}

export interface InteractionsAnalysisResult {
	issues: ValidationIssue[];
	stats: {
		legacyIx2Detected: boolean | null;
		legacyIx2Count: number;
		pagesRequested: number;
		pagesAnalyzed: number;
		pagesFailed: number;
		pagesSkipped?: number;
		pagesWithLegacyIx2: number;
		analysisComplete: boolean;
			analysisStatus: 'completed' | 'partial' | 'failed';
			errorMessage?: string;
			skippedCmsTemplateSlugs?: string[];
			cmsItemUrlsDiscovered?: number;
			cmsItemUrlsValidated?: number;
			cmsTemplateCoverageStatus?: 'none' | 'covered' | 'partial' | 'uncovered';
			cmsTemplateCoverage?: CmsTemplateCoverage[];
		};
		pages: Array<{
			url: string;
			legacyIx2Detected: boolean;
			legacyIx2Count: number;
			source?: 'page' | 'cms-item';
			cmsTemplateSlug?: string;
			discoverySource?: 'sitemap' | 'link';
			matches: Array<{
				label: string;
				count: number;
			}>;
		}>;
	}

export interface CmsTemplateCoverage {
	templateSlug: string;
	collectionId?: string;
	collectionName?: string;
	candidateSlugs: string[];
	discoveredUrls: string[];
	validatedUrls: string[];
	status: 'covered' | 'uncovered';
		source?: 'sitemap' | 'link';
	}

// Detailed Analysis Types
export interface AnalyzedAsset {
	url: string;
	name: string;
	size: number;
	format: string;
	isOptimized: boolean;
	usageCount: number;
	hasLicensingIssues: boolean;
	recommendedAction?: string;
}

export interface CustomCodeAnalysisResult {
	issues: ValidationIssue[];
	stats: {
		fontCustomCodeFindings: number;
		analysisComplete: boolean;
	};
}

export interface AnalyzedPage {
	url: string;
	title: string;
	hasLoremIpsum: boolean;
	headingHierarchy: HeadingHierarchy;
	imageCount: number;
	imagesWithoutAlt: number;
	imagesWithoutAltDetails?: Array<{
		src: string;
		context: string;
		selector?: string;
	}>;
	seo: PageSEOData;
	links: LinkAnalysis;
	contentQuality: ContentQualityAnalysis;
}

export interface PageSEOData {
	title: string | null;
	titleLength: number;
	metaDescription: string | null;
	metaDescriptionLength: number;
	hasValidTitle: boolean;
	hasValidDescription: boolean;
	openGraph: {
		title: string | null;
		description: string | null;
		image: string | null;
		url: string | null;
	};
	twitterCard: {
		title: string | null;
		description: string | null;
		image: string | null;
	};
	canonical: string | null;
	robots: string | null;
}

export interface LinkAnalysis {
	totalLinks: number;
	internalLinks: number;
	externalLinks: number;
	brokenLinks: Array<{
		href: string;
		text: string;
		status: 'broken' | 'suspicious' | 'redirect';
		statusCode?: number;
		error?: string;
	}>;
	emailLinks: number;
	phoneLinks: number;
	anchorLinks: number;
	downloadLinks: number;
	socialMediaLinks: number;
}

export interface ContentQualityAnalysis {
	hasPlaceholderContent: boolean;
	hasLoremIpsum: boolean;
	hasWebflowDefaults: boolean;
	hasGenericContent: boolean;
	contentScore: number; // 0-100
	issues: Array<{
		type: 'placeholder' | 'lorem' | 'generic' | 'webflow-default' | 'short-content' | 'duplicate-content';
		text: string;
		location: string;
		severity: 'error' | 'warning' | 'info';
		matches?: Array<{
			pattern: string;
			sample: string;
		}>;
	}>;
	wordCount: number;
	readabilityScore?: number;
	duplicateContent: Array<{
		text: string;
		occurrences: number;
		pages: string[];
	}>;
}

export interface HeadingHierarchy {
	h1Count: number;
	hasSkippedLevels: boolean;
	structure: Array<{
		level: number;
		text: string;
		position: number;
	}>;
	skippedLevelTransitions?: Array<{
		fromLevel: number;
		toLevel: number;
		fromPosition: number;
		toPosition: number;
		fromText: string;
		toText: string;
		missingLevel: number;
	}>;
}

export interface PerformanceMetrics {
	firstContentfulPaint: number;
	largestContentfulPaint: number;
	cumulativeLayoutShift: number;
	totalBlockingTime: number;
	pageWeight: number;
	resourceCounts: {
		images: number;
		scripts: number;
		stylesheets: number;
		fonts: number;
	};
}

export interface AccessibilityAudit {
	altTextCoverage: AltTextAudit;
	headingStructure: HeadingStructureAudit;
	formLabels: FormLabelAudit;
	focusManagement: FocusAudit;
}

export interface AltTextAudit {
	totalImages: number;
	imagesWithAlt: number;
	imagesWithoutAlt: Array<{
		src: string;
		context: string;
		isDecorative: boolean;
		selector?: string;
	}>;
	coveragePercentage: number;
}

export interface HeadingStructureAudit {
	isValid: boolean;
	errors: Array<{
		type: 'multiple_h1' | 'skipped_level' | 'empty_heading';
		description: string;
		element: string;
	}>;
}

export interface FormLabelAudit {
	totalInputs: number;
	inputsWithLabels: number;
	unlabeledInputs: Array<{
		type: string;
		id?: string;
		placeholder?: string;
	}>;
}

export interface FocusAudit {
	focusableElements: number;
	elementsWithoutFocusStyles: number;
	tabOrderIssues: Array<{
		element: string;
		issue: string;
	}>;
}

// Core Validation Types
export interface ValidationIssue {
	id: string;
	category: string;
	severity: 'error' | 'warning' | 'info';
	message: string;
	description?: string;
	howToFix?: string;
	location?: string;
	element?: string;
	details?: Record<string, any>;
}

// HTML Analysis Types
export interface ParsedHTML {
	rawHtml: string;
	document: Document;
	images: HTMLImageElement[];
	links: HTMLAnchorElement[];
	forms: HTMLFormElement[];
	headings: HTMLHeadingElement[];
	scripts: HTMLScriptElement[];
	stylesheets: HTMLLinkElement[];
}

// Utility Types
export interface FetchResult {
	html: string;
	status: number;
	headers: Record<string, string>;
	size: number;
	loadTime: number;
}

export interface AssetFetchResult {
	buffer: ArrayBuffer;
	size: number;
	mimeType: string;
	headers: Record<string, string>;
}
