// Webflow Way Validator Extension - TypeScript Implementation
// Enhanced validation with detailed, collapsible reporting

// API Configuration
const API_BASE = 'https://webflow-way-validator.vercel.app';
const WORKER_API_BASE = 'https://validation-worker.createsomething.workers.dev';
const APP_VALIDATOR_BASE = 'https://validation-worker.createsomething.workers.dev';
const REVIEW_START_URL = `${APP_VALIDATOR_BASE}/app-validator/review/start`;
const LEGACY_VALIDATE_URL = `${WORKER_API_BASE}/validate`;
const NETWORK_TIMEOUT_MS = 30000;
const STATUS_TIMEOUT_MS = 15000;
const MAX_NETWORK_RETRIES = 3;
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504, 522, 524]);

// Global state
let isValidating = false;
let extensionInitialized = false;
let bridgeContext: { siteId: string; siteName?: string; siteUrl?: string } | null = null;
let bridgeStatus: SnippetStatusResponse | null = null;

// Types for validation data
interface ValidationIssue {
  id: string;
  category: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  howToFix?: string;
  location?: string;
  details?: {
    howToFix?: string;
    location?: string;
    sample?: string[] | string;
    violations?: Array<string | Record<string, any>>;
    locations?: string[];
    issues?: string[];
    images?: string[];
    samples?: string[];
    [key: string]: any;
  };
}

interface CategoryResult {
  category: string;
  passed: boolean;
  issues: ValidationIssue[];
  stats?: Record<string, any>;
}

interface ValidationResponse {
  url: string;
  success: boolean;
  categories: CategoryResult[];
  summary: {
    errors: number;
    warnings: number;
    infos: number;
    passedCategories: number;
    failedCategories: number;
    totalErrors?: number;
    totalWarnings?: number;
    totalInfo?: number;
  };
  collectedData?: any[];
}

interface ReviewStartResponse {
  jobId: string;
  statusUrl: string;
  eventsUrl: string;
  startedAt: string;
}

interface ReviewStatusResponse {
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  message: string;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  result?: any;
  error?: string;
  fallbackUsed?: boolean;
  correlationId?: string;
}

interface SnippetStatusResponse {
  siteId: string;
  siteName?: string | null;
  installed: boolean;
  bridgeToken: string;
  snippetVersion: string;
  installMethod: 'webflow-api' | 'manual-fallback';
  status: 'active' | 'pending_manual' | 'failed';
  message?: string;
  updatedAt: string;
  snippet?: string;
}

interface ValidationSubmitResponse {
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
}

interface ProjectData {
  variables?: {
    collections: Array<{
      id: string;
      name: string;
      variables: Array<{
        id: string;
        name: string;
        type?: string;
        value?: any;
      }>;
    }>;
  };
  components?: Array<{
    id: string;
    name: string;
    type: string;
    instances?: number;
    isNested?: boolean;
  }>;
  styles?: Array<{
    id: string;
    name: string;
    type: string;
    properties?: Record<string, any>;
    isHtmlTag?: boolean;
    hasVariables?: boolean;
  }>;
  pages?: Array<{
    id: string;
    name: string;
    slug: string;
    path?: string;
    publishPath?: string | null;
    collectionId?: string | null;
    collectionName?: string | null;
    isCmsTemplate?: boolean;
    type: string;
    isHomePage?: boolean;
    hasValidNaming?: boolean;
    seo?: {
      title?: string;
      description?: string;
      openGraphTitle?: string;
      openGraphDescription?: string;
      openGraphImage?: string;
    };
  }>;
  currentPage?: {
    id: string;
    name: string;
    slug: string;
    publishPath?: string | null;
    seo: {
      title?: string;
      description?: string;
      openGraphTitle?: string;
      openGraphDescription?: string;
      openGraphImage?: string;
      titleLength?: number;
      descriptionLength?: number;
      hasValidTitle?: boolean;
      hasValidDescription?: boolean;
      usesTitleAsOpenGraphTitle?: boolean;
      usesDescriptionAsOpenGraphDescription?: boolean;
      hasCustomOpenGraphTitle?: boolean;
      hasCustomOpenGraphDescription?: boolean;
    };
  };
  siteInfo?: {
    name?: string;
    id?: string;
  };
  collectionMetadata?: Record<string, any>;
  enhancedValidation?: {
    variableOrganization: {
      hasColorVariables: boolean;
      hasTypographyVariables: boolean;
      hasSpacingVariables: boolean;
      hasOrderedCollections: boolean;
    };
    componentArchitecture: {
      hasNavbarComponent: boolean;
      hasFooterComponent: boolean;
      hasCTAComponents: boolean;
      hasNestedComponents: boolean;
    };
    styleSystem: {
      hasHtmlTagStyles: boolean;
      hasConsistentNaming: boolean;
      usesVariablesInStyles: boolean;
      hasPercentageLineHeights: boolean;
    };
    pageStructure: {
      hasStyleGuidePage: boolean;
      hasInstructionsPage: boolean;
      hasLicensePage: boolean;
      hasTitleCaseNaming: boolean;
      hasMatchingSlugs: boolean;
    };
    seoCompliance: {
      currentPageHasValidTitle: boolean;
      currentPageHasValidDescription: boolean;
      hasOpenGraphData: boolean;
      titleWithinLimits: boolean;
      descriptionWithinLimits: boolean;
    };
  };
  collectionWarnings?: Array<{
    source: string;
    message: string;
    error: string;
  }>;
}

// Initialize once whether the extension is loaded with the document or injected after DOMContentLoaded.
function initializeExtension(): void {
  if (extensionInitialized) return;
  extensionInitialized = true;

  const validateBtn = document.getElementById('validate-btn');
  if (validateBtn) {
    validateBtn.addEventListener('click', () => void validateProject());
  }

  const optionsBtn = document.getElementById('options-btn');
  const optionsPanel = document.getElementById('options-panel');
  optionsBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleOptionsPanel();
  });
  optionsPanel?.addEventListener('click', (event) => {
    event.stopPropagation();
  });
  document.addEventListener('click', () => {
    setOptionsPanelOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setOptionsPanelOpen(false);
    }
  });

  const installBtn = document.getElementById('bridge-install-btn');
  const rotateBtn = document.getElementById('bridge-rotate-btn');
  const recheckBtn = document.getElementById('bridge-recheck-btn');
  installBtn?.addEventListener('click', () => installBridge());
  rotateBtn?.addEventListener('click', () => rotateBridgeToken());
  recheckBtn?.addEventListener('click', () => refreshBridgeStatus());

  void bootstrapBridgePanel();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension, { once: true });
} else {
  initializeExtension();
}

// Main validation function
async function validateProject(): Promise<void> {
  if (isValidating) return;
  isValidating = true;
  setOptionsPanelOpen(false);

  // Only reset to overview if this is NOT an explicit refresh
  if (!isExplicitRefresh) {
    saveActiveTab('overview');
  }

  const btn = document.getElementById('validate-btn') as HTMLButtonElement;
  const btnLabel = btn?.querySelector('.btn-label') as HTMLElement;
  
  if (btn) {
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
  }
  if (btnLabel) btnLabel.textContent = 'Running...';
  
  showLoading();
  hideError();
  hideResults();
  setValidationProgress({ status: 'queued', progress: 2, message: 'Preparing validation run...' });

  try {
    // Get Webflow Designer API
    const webflow = (window as any).webflow;
    if (!webflow) {
      throw new Error('Webflow Designer API not available. Please ensure this extension is running in Webflow Designer.');
    }

    // Collect project data via Designer API
    const projectData = await collectProjectData(webflow);
    if (!bridgeContext?.siteId) {
      const fallbackSiteId = projectData.siteInfo?.id || null;
      if (fallbackSiteId) {
        bridgeContext = {
          siteId: fallbackSiteId,
          siteName: projectData.siteInfo?.name || undefined,
          siteUrl: bridgeContext?.siteUrl,
        };
      }
    }

    // Update meta display
    const projectLabel = projectData?.siteInfo?.name || 'Designer Project';
    updateMetaDisplay(projectLabel, projectData);

    // Get site URL for Worker validation
    const siteUrl = await getSiteUrl(webflow);
    if (bridgeContext) {
      bridgeContext = {
        ...bridgeContext,
        siteUrl: siteUrl || bridgeContext.siteUrl,
      };
    }
    console.log('🌐 Final site URL for Worker:', siteUrl);

    if (siteUrl) {
      console.log('🚀 Will call Worker with URL:', siteUrl);
      console.log('📄 Page slugs to analyze:', extractPageSlugs(projectData));
    } else {
      console.warn('⚠️ No site URL available - Worker validation will be skipped');
    }

    const correlationId = createCorrelationId();
    const bridgeActive = bridgeStatus && bridgeStatus.status === 'active';

    if (!bridgeActive) {
      setValidationProgress({
        status: 'running',
        progress: 20,
        message: 'Running Designer checks. Add the Validator script for full published-site checks...',
      });
      showBridgeDrawer();
      setBridgeMessage(
        'Add the Validator script, publish the site, then re-check. Full submission validation needs this script on the published site.'
      );
      setBridgeSetupStep('install');
      setToolbarStatus('Validator script required for submission checks', 'warning');

      const designerResults = await runDesignerValidation(projectData, siteUrl, correlationId);
      designerResults.collectedData = [projectData];
      enhanceValidationResults(designerResults, projectData);

      if (!designerResults.categories) designerResults.categories = [];
      designerResults.categories.push({
        category: 'Published Site Checks (Requires Validator Script)',
        passed: false,
        issues: [{
          id: 'validator-script-required',
          category: 'Published Site Checks',
          severity: 'warning',
          message: 'Additional published-site checks require the Validator script to be added and published.',
          details: {
            howToFix:
              'Click "Add Validator script", publish your site, then click "Re-check script". The script enables submitted-result evidence for the marketplace form plus published-site checks such as image loading, contrast, broken links, custom 404, SEO formula, license text, favicon, connected apps, and placeholder content.',
          }
        }],
        stats: { checked: 0, available: 22, status: 'validator_script_required' }
      });
      if (!designerResults.summary) {
        designerResults.summary = {
          errors: 0,
          warnings: 0,
          infos: 0,
          passedCategories: 0,
          failedCategories: 0,
        };
      }
      designerResults.summary.warnings = (designerResults.summary.warnings || 0) + 1;
      designerResults.summary.failedCategories = (designerResults.summary.failedCategories || 0) + 1;

      setValidationProgress({
        status: 'completed',
        progress: 100,
        message: 'Designer validation complete. Add and publish the Validator script for full coverage.',
      });
      showResults(designerResults);
      void submitValidationResults({
        siteId: bridgeContext?.siteId || projectData.siteInfo?.id || null,
        siteName: bridgeContext?.siteName || projectData.siteInfo?.name || undefined,
        siteUrl,
        validationResults: designerResults,
        correlationId,
      });
      return;
    }

    hideBridgeDrawer();
    setBridgeSetupStep('run');
    setToolbarStatus('Running full Validator checks...', 'active');
    const validationResults = await runUnifiedValidation({
      siteUrl,
      projectData,
      pageSlugs: extractPageSlugs(projectData),
      correlationId,
    });

    // Add collected data for detailed display
    validationResults.collectedData = [projectData];

    // Enhance results with client-side validation
    enhanceValidationResults(validationResults, projectData);

    showResults(validationResults);
    void submitValidationResults({
      siteId: bridgeContext?.siteId || projectData.siteInfo?.id || null,
      siteName: bridgeContext?.siteName || projectData.siteInfo?.name || undefined,
      siteUrl,
      validationResults,
      correlationId,
    });

  } catch (error) {
    console.error('Validation error:', error);
    const message = error instanceof Error ? error.message : 'Unexpected error';
    setValidationProgress({ status: 'failed', progress: 100, message });
    showError(message);
  } finally {
    isValidating = false;
    hideLoading();
    if (btn) {
      btn.disabled = false;
      btn.setAttribute('aria-busy', 'false');
    }
    if (btnLabel) btnLabel.textContent = 'Run Validator';
  }
}

// Extract page slugs from project data for comprehensive validation
function extractPageSlugs(projectData: ProjectData): string[] {
  const slugs: string[] = [];
  const seen = new Set<string>();
  const skippedCmsTemplateSlugs: string[] = [];

  if (projectData.pages && projectData.pages.length > 0) {
    projectData.pages.forEach((page: any) => {
      const primaryPath = getFirstUsablePagePath(page);
      if (!primaryPath) return;

      const pathname = getSlugPathname(primaryPath);
      if (isInternalCmsTemplateSlug(pathname)) {
        skippedCmsTemplateSlugs.push(pathname);
        return;
      }

      if (!seen.has(pathname)) {
        seen.add(pathname);
        slugs.push(pathname);
      }
    });
  }

  if (skippedCmsTemplateSlugs.length > 0) {
    console.log(
      `Skipped ${skippedCmsTemplateSlugs.length} internal CMS template slugs for published-site validation:`,
      skippedCmsTemplateSlugs
    );
  }
  console.log(`Extracted ${slugs.length} page slugs for enhanced validation:`, slugs);
  return slugs;
}

function getFirstUsablePagePath(page: {
  publishPath?: string | null;
  path?: string | null;
  slug?: string | null;
  isHomePage?: boolean;
}): string | null {
  const candidates = [
    page.publishPath,
    page.isHomePage ? '/' : null,
    page.path,
    page.slug,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim() !== '') {
      return candidate;
    }
  }

  return null;
}

function isInternalCmsTemplateSlug(value: string): boolean {
  const pathname = getSlugPathname(value);
  return /^\/detail_[^/]+\/?$/i.test(pathname);
}

function getSlugPathname(value: string): string {
  const trimmed = value.trim();
  if (trimmed === '') return '';

  try {
    const path = trimmed.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `/${trimmed}`;
    return new URL(path, 'https://example.com').pathname;
  } catch {
    const withoutQuery = trimmed.split(/[?#]/, 1)[0] || '';
    return withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
  }
}

// Ensure URL has HTTPS protocol
function ensureHttps(url: string): string {
  if (url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  if (!url.startsWith('https://') && !url.startsWith('http://')) {
    return `https://${url}`;
  }
  return url;
}

// Get site URL for Worker validation
async function getSiteUrl(webflow: any): Promise<string | null> {
  try {
    console.log('🔍 Getting site URL for enhanced validation...');

    // Use the correct getSiteInfo API
    if (webflow.getSiteInfo) {
      const siteInfo = await webflow.getSiteInfo();
      console.log('📋 Site info received:', {
        siteId: siteInfo.siteId,
        siteName: siteInfo.siteName,
        shortName: siteInfo.shortName,
        domainsCount: siteInfo.domains?.length || 0
      });

      if (siteInfo.domains && siteInfo.domains.length > 0) {
        // Priority 1: Find production domain that was published
        const productionDomain = siteInfo.domains.find((domain: any) =>
          domain.stage === 'production' && domain.lastPublished !== null
        );

        if (productionDomain) {
          console.log('✅ Using production domain:', productionDomain.url);
          return ensureHttps(productionDomain.url);
        }

        // Priority 2: Find any production domain (even if not recently published)
        const anyProductionDomain = siteInfo.domains.find((domain: any) =>
          domain.stage === 'production'
        );

        if (anyProductionDomain) {
          console.log('⚠️ Using production domain (may not be recently published):', anyProductionDomain.url);
          return ensureHttps(anyProductionDomain.url);
        }

        // Priority 3: Use staging domain
        const stagingDomain = siteInfo.domains.find((domain: any) =>
          domain.stage === 'staging'
        );

        if (stagingDomain) {
          console.log('🔧 Using staging domain:', stagingDomain.url);
          return ensureHttps(stagingDomain.url);
        }

        // Priority 4: Use any available domain
        const firstDomain = siteInfo.domains[0];
        console.log('📌 Using first available domain:', firstDomain.url);
        return ensureHttps(firstDomain.url);
      }

      // Fallback: construct URL from shortName
      if (siteInfo.shortName) {
        const constructedUrl = `https://${siteInfo.shortName}.webflow.io`;
        console.log('🔗 Constructed URL from shortName:', constructedUrl);
        return constructedUrl;
      }
    }

    console.warn('❌ Could not determine site URL for enhanced validation');
    return null;
  } catch (error) {
    console.error('💥 Error getting site URL:', error);
    return null;
  }
}

function createCorrelationId(): string {
  return `wfv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof TypeError) return true;
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status?: unknown }).status === 'number'
  ) {
    return RETRYABLE_STATUS.has((error as { status: number }).status);
  }
  return false;
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function fetchJsonWithRetry<T>(
  input: RequestInfo | URL,
  init: RequestInit,
  options?: {
    timeoutMs?: number;
    retries?: number;
  }
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? NETWORK_TIMEOUT_MS;
  const retries = options?.retries ?? MAX_NETWORK_RETRIES;
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(input, init, timeoutMs);
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        const error = new Error(text || `Request failed with status ${response.status}`) as Error & {
          status?: number;
        };
        error.status = response.status;
        throw error;
      }
      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
      if (attempt === retries || !isRetryableError(error)) {
        throw error;
      }
      await new Promise((resolve) => window.setTimeout(resolve, attempt * 1000));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Request failed');
}

function buildValidationSubmitPayload(validationResults: ValidationResponse): Record<string, any> {
  return {
    url: validationResults.url,
    summary: validationResults.summary,
    categories: Array.isArray(validationResults.categories)
      ? validationResults.categories.map((category) => ({
          category: category.category,
          passed: category.passed,
          issues: Array.isArray(category.issues)
            ? category.issues.map((issue) => ({
                severity: issue.severity,
                message: issue.message,
              }))
            : [],
        }))
      : [],
  };
}

async function submitValidationResults({
  siteId,
  siteName,
  siteUrl,
  validationResults,
  correlationId,
}: {
  siteId: string | null;
  siteName?: string;
  siteUrl: string | null;
  validationResults: ValidationResponse;
  correlationId: string;
}): Promise<void> {
  if (!siteId) {
    console.info('Skipping validation submission because no siteId is available.');
    return;
  }

  try {
    const response = await fetchWithTimeout(
      `${APP_VALIDATOR_BASE}/app-validator/submit`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-Id': correlationId,
        },
        body: JSON.stringify({
          siteId,
          siteName,
          siteUrl: siteUrl || validationResults.url || undefined,
          validationResults: buildValidationSubmitPayload(validationResults),
        }),
      },
      NETWORK_TIMEOUT_MS
    );

    let payload: ValidationSubmitResponse | null = null;
    try {
      payload = (await response.json()) as ValidationSubmitResponse;
    } catch (parseError) {
      console.warn('Validation submission response was not valid JSON:', parseError);
    }

    if (response.status === 429) {
      console.warn('Validation submission rate-limited for this site:', payload);
      return;
    }

    if (!response.ok) {
      console.warn('Validation submission failed:', response.status, payload);
      return;
    }

    if (!payload) {
      console.warn('Validation submission succeeded without a response body.');
      return;
    }

    if (!payload.persisted) {
      console.info('Validation submission accepted without Airtable persistence:', payload);
      return;
    }

    console.info('Validation results submitted successfully:', payload);
  } catch (error) {
    console.warn('Validation submission request failed:', error);
  }
}

function initializeOptionDefaults(): void {
  const defaults: Array<{ id: string; checked: boolean }> = [
    { id: 'opt-run-designer', checked: true },
    { id: 'opt-run-assets', checked: true },
    { id: 'opt-run-content', checked: true },
    { id: 'opt-content-lorem', checked: true },
    { id: 'opt-content-headings', checked: true },
    { id: 'opt-content-altText', checked: true },
    { id: 'opt-content-seo', checked: true },
    { id: 'opt-content-links', checked: true },
    { id: 'opt-content-contentQuality', checked: true },
    { id: 'opt-exclude-style-guide', checked: true },
    { id: 'opt-page-scope-all', checked: true },
    { id: 'opt-page-scope-current', checked: false },
  ];

  for (const item of defaults) {
    const input = document.getElementById(item.id) as HTMLInputElement | null;
    if (input) input.checked = item.checked;
  }

  syncContentOptionsState();

  const runContentInput = document.getElementById('opt-run-content') as HTMLInputElement | null;
  runContentInput?.addEventListener('change', syncContentOptionsState);
}

function isOptionEnabled(id: string, fallback: boolean): boolean {
  const input = document.getElementById(id) as HTMLInputElement | null;
  if (!input) return fallback;
  return input.checked;
}

function setOptionsPanelOpen(open: boolean): void {
  const optionsBtn = document.getElementById('options-btn') as HTMLButtonElement | null;
  const optionsPanel = document.getElementById('options-panel') as HTMLDivElement | null;
  if (!optionsBtn || !optionsPanel) return;

  optionsBtn.setAttribute('aria-expanded', String(open));
  optionsPanel.hidden = !open;
}

function toggleOptionsPanel(): void {
  const optionsPanel = document.getElementById('options-panel') as HTMLDivElement | null;
  if (!optionsPanel) return;

  setOptionsPanelOpen(optionsPanel.hidden);
}

function syncContentOptionsState(): void {
  const runContentInput = document.getElementById('opt-run-content') as HTMLInputElement | null;
  const contentOptions = document.getElementById('content-options') as HTMLDivElement | null;
  if (!runContentInput || !contentOptions) return;

  const contentInputs = contentOptions.querySelectorAll('input[id^="opt-content-"]');
  contentOptions.classList.toggle('is-disabled', !runContentInput.checked);

  contentInputs.forEach((input) => {
    (input as HTMLInputElement).disabled = !runContentInput.checked;
  });
}

function getSelectedChecks(): string[] {
  const checks: string[] = [];
  const runDesigner = isOptionEnabled('opt-run-designer', true);
  const runAssets = isOptionEnabled('opt-run-assets', true);
  const runContent = isOptionEnabled('opt-run-content', true);

  if (runDesigner) checks.push('designer');
  if (runAssets) checks.push('assets');
  if (runContent) {
    checks.push('content');
    checks.push('accessibility');
  }

  if (checks.length === 0) {
    // Keep non-blocking behavior. If everything is unchecked, run the baseline designer pass.
    checks.push('designer');
  }
  return checks;
}

function getWorkerOptions(projectData: ProjectData): Record<string, any> {
  const runAssets = isOptionEnabled('opt-run-assets', true);
  const runContent = isOptionEnabled('opt-run-content', true);
  const includeStyleGuide = !isOptionEnabled('opt-exclude-style-guide', true);
  const pageScopeCurrent = isOptionEnabled('opt-page-scope-current', false);

  const excludePageSlugs = includeStyleGuide ? [] : getStyleGuideExclusionSlugs(projectData);

  return {
    skipAssets: !runAssets,
    skipContent: !runContent,
    skipAccessibility: !runContent,
    excludePageSlugs,
    pageScope: pageScopeCurrent ? 'current' : 'all',
    currentPageSlug: projectData.currentPage?.publishPath || projectData.currentPage?.slug || '/',
    contentChecks: {
      lorem: isOptionEnabled('opt-content-lorem', true),
      headings: isOptionEnabled('opt-content-headings', true),
      altText: isOptionEnabled('opt-content-altText', true),
      seo: isOptionEnabled('opt-content-seo', true),
      links: isOptionEnabled('opt-content-links', true),
      contentQuality: isOptionEnabled('opt-content-contentQuality', true),
    },
  };
}

function getStyleGuideExclusionSlugs(projectData: ProjectData): string[] {
  const excluded = new Set<string>(['/style-guide', '/styleguide']);

  for (const page of projectData.pages || []) {
    const name = (page.name || '').toLowerCase();
    const path = getFirstUsablePagePath(page);
    const pathname = path ? getSlugPathname(path).toLowerCase() : '';
    const isStyleGuide =
      name.includes('style guide') ||
      name.includes('styleguide') ||
      pathname.endsWith('/style-guide') ||
      pathname.endsWith('/styleguide');

    if (isStyleGuide && pathname) {
      excluded.add(pathname);
    }
  }

  return Array.from(excluded);
}

async function runUnifiedValidation({
  siteUrl,
  projectData,
  pageSlugs,
  correlationId,
}: {
  siteUrl: string | null;
  projectData: ProjectData;
  pageSlugs: string[];
  correlationId: string;
}): Promise<ValidationResponse> {
  if (!siteUrl) {
    setValidationProgress({ status: 'running', progress: 40, message: 'No site URL found. Running Designer checks only.' });
    const designerOnly = await runDesignerValidation(projectData, siteUrl, correlationId);
    setValidationProgress({ status: 'completed', progress: 100, message: 'Designer validation complete.' });
    return designerOnly;
  }

  const checks = getSelectedChecks();
  const workerOptions = getWorkerOptions(projectData);
  const startPayload = {
    siteUrl,
    pageSlugs,
    designerData: projectData,
    checks,
    options: workerOptions,
    correlationId,
  };

  try {
    setValidationProgress({ status: 'queued', progress: 8, message: 'Starting async review job...' });

    const startData = await fetchJsonWithRetry<ReviewStartResponse>(
      REVIEW_START_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-Id': correlationId,
        },
        body: JSON.stringify(startPayload),
      },
      { timeoutMs: NETWORK_TIMEOUT_MS, retries: MAX_NETWORK_RETRIES }
    );
    const finalStatus = await waitForReviewCompletion(startData, correlationId);

    if (finalStatus.status !== 'completed' || !finalStatus.result) {
      throw new Error(finalStatus.error || 'Review completed without result payload');
    }

    setValidationProgress({
      status: 'completed',
      progress: 100,
      message: finalStatus.message || 'Validation complete.',
    });

    return finalStatus.result as ValidationResponse;
  } catch (error) {
    console.warn('Async review pipeline failed, using legacy fallback:', error);
    setValidationProgress({
      status: 'running',
      progress: 18,
      message: 'Async endpoint unavailable. Falling back to legacy validation.',
    });
    const legacy = await runLegacyValidation(siteUrl, projectData, pageSlugs, correlationId, workerOptions);
    setValidationProgress({
      status: 'completed',
      progress: 100,
      message: 'Legacy validation complete.',
    });
    return legacy;
  }
}

async function waitForReviewCompletion(
  startData: ReviewStartResponse,
  correlationId: string
): Promise<ReviewStatusResponse> {
  return await new Promise<ReviewStatusResponse>((resolve, reject) => {
    let settled = false;
    let eventSource: EventSource | null = null;
    let pollTimer: number | null = null;
    let timeoutTimer: number | null = null;

    const cleanup = () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      if (pollTimer !== null) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
      if (timeoutTimer !== null) {
        window.clearTimeout(timeoutTimer);
        timeoutTimer = null;
      }
    };

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn();
    };

    const handleStatus = (status: ReviewStatusResponse) => {
      setValidationProgress({
        status: status.status,
        progress: status.progress,
        message: status.message || 'Running validation...',
      });

      if (status.status === 'completed') {
        finish(() => resolve(status));
      } else if (status.status === 'failed' || status.status === 'cancelled') {
        finish(() => reject(new Error(status.error || status.message || 'Validation job failed')));
      }
    };

    const safePoll = async () => {
      try {
        const status = await fetchReviewStatus(startData.statusUrl, correlationId);
        handleStatus(status);
      } catch (error) {
        console.warn('Status poll failed:', error);
      }
    };

    pollTimer = window.setInterval(() => {
      void safePoll();
    }, 2500);
    void safePoll();

    if (typeof EventSource !== 'undefined') {
      try {
        eventSource = new EventSource(startData.eventsUrl);
        const consume = (event: MessageEvent<string>) => {
          try {
            const payload = JSON.parse(event.data) as Partial<ReviewStatusResponse>;
            if (
              typeof payload.status === 'string' &&
              typeof payload.progress === 'number'
            ) {
              handleStatus(payload as ReviewStatusResponse);
            }
          } catch (parseError) {
            console.warn('Failed to parse SSE payload:', parseError);
          }
        };

        eventSource.addEventListener('status', consume as EventListener);
        eventSource.addEventListener('progress', consume as EventListener);
        eventSource.addEventListener('complete', () => {
          void safePoll();
        });
        eventSource.addEventListener('error', () => {
          // Keep polling when SSE disconnects.
        });

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
        };
      } catch (error) {
        console.warn('EventSource init failed, continuing with polling only:', error);
      }
    }

    timeoutTimer = window.setTimeout(() => {
      finish(() => reject(new Error('Validation job timed out after 8 minutes')));
    }, 8 * 60 * 1000);
  });
}

async function fetchReviewStatus(statusUrl: string, correlationId: string): Promise<ReviewStatusResponse> {
  const statusUrlWithCorrelation = new URL(statusUrl);
  statusUrlWithCorrelation.searchParams.set('correlationId', correlationId);
  return await fetchJsonWithRetry<ReviewStatusResponse>(
    statusUrlWithCorrelation.toString(),
    {
      method: 'GET',
    },
    { timeoutMs: STATUS_TIMEOUT_MS, retries: MAX_NETWORK_RETRIES }
  );
}

async function runLegacyValidation(
  siteUrl: string,
  projectData: ProjectData,
  pageSlugs: string[],
  correlationId: string,
  workerOptions: Record<string, any>
): Promise<ValidationResponse> {
  const [designerValidation, enhancedValidation] = await Promise.all([
    runDesignerValidation(projectData, siteUrl, correlationId),
    runLegacyEnhancedValidation(siteUrl, projectData, pageSlugs, correlationId, workerOptions),
  ]);

  const validationResults: ValidationResponse = designerValidation;
  if (enhancedValidation) {
    mergeEnhancedValidation(validationResults, enhancedValidation);
  }
  return validationResults;
}

async function runDesignerValidation(
  projectData: ProjectData,
  siteUrl: string | null,
  correlationId: string
): Promise<ValidationResponse> {
  const body = JSON.stringify({ designerData: projectData, siteUrl });
  const endpoints = [`${APP_VALIDATOR_BASE}/api/validate`, `${API_BASE}/api/validate`];

  for (const endpoint of endpoints) {
    try {
      const result = await fetchJsonWithRetry<ValidationResponse>(
        endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Correlation-Id': correlationId,
          },
          body,
        },
        { timeoutMs: NETWORK_TIMEOUT_MS, retries: MAX_NETWORK_RETRIES }
      );
      if (!result.url) result.url = siteUrl || '';
      if (typeof result.success !== 'boolean') result.success = true;
      return result;
    } catch (error) {
      console.warn(`Designer validation failed via ${endpoint}:`, error);
    }
  }

  throw new Error('Designer validation failed on all configured backends.');
}

async function runLegacyEnhancedValidation(
  siteUrl: string,
  projectData: ProjectData,
  pageSlugs: string[],
  correlationId: string,
  workerOptions: Record<string, any>
): Promise<any | null> {
  try {
    return await fetchJsonWithRetry<any>(
      LEGACY_VALIDATE_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-Id': correlationId,
        },
        body: JSON.stringify({
          siteUrl,
          designerData: projectData,
          pageSlugs,
          options: workerOptions,
        }),
      },
      { timeoutMs: NETWORK_TIMEOUT_MS, retries: MAX_NETWORK_RETRIES }
    );
  } catch (error) {
    console.warn('Legacy enhanced validation failed:', error);
    return null;
  }
}

function setValidationProgress({
  status,
  progress,
  message,
}: {
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  message: string;
}): void {
  const progressWrap = document.getElementById('bridge-progress');
  const stateEl = document.getElementById('bridge-progress-state');
  const percentEl = document.getElementById('bridge-progress-percent');
  const fillEl = document.getElementById('bridge-progress-fill') as HTMLElement | null;
  const messageEl = document.getElementById('bridge-progress-message');

  if (progressWrap) progressWrap.style.display = 'flex';
  if (stateEl) stateEl.textContent = status;
  if (percentEl) percentEl.textContent = `${Math.max(0, Math.min(100, Math.round(progress)))}%`;
  if (fillEl) fillEl.style.width = `${Math.max(0, Math.min(100, progress))}%`;
  if (messageEl) messageEl.textContent = message;
}

async function bootstrapBridgePanel(): Promise<void> {
  initializeOptionDefaults();

  const webflow = (window as any).webflow;
  if (!webflow) {
    setBridgeBadge('neutral');
    setBridgeMessage('Webflow Designer API unavailable. Validator script setup is disabled.');
    setBridgeActionsDisabled(true);
    return;
  }

  try {
    const siteInfo = await webflow.getSiteInfo?.();
    const siteId = siteInfo?.siteId || siteInfo?.id || null;
    const siteName = siteInfo?.siteName || siteInfo?.name || 'Webflow Site';
    const siteUrl = await getSiteUrl(webflow);
    if (!siteId) {
      setBridgeBadge('failed');
      setBridgeMessage('Could not determine site ID. Validator script setup unavailable.');
      setBridgeActionsDisabled(true);
      return;
    }

    bridgeContext = { siteId, siteName, siteUrl: siteUrl || undefined };
    setBridgeActionsDisabled(false);
    await refreshBridgeStatus();
  } catch (error) {
    console.warn('Bridge bootstrap failed:', error);
    setBridgeBadge('failed');
    setBridgeMessage('Failed to initialize Validator script setup.');
    setBridgeActionsDisabled(true);
  }
}

async function refreshBridgeStatus(): Promise<void> {
  if (!bridgeContext?.siteId) return;
  setBridgeSetupStep('recheck');
  setBridgeMessage('Checking the published site for the Validator script...');
  setToolbarStatus('Checking Validator script...', 'neutral');
  try {
    const correlationId = createCorrelationId();
    const statusUrl = new URL(`${APP_VALIDATOR_BASE}/app-validator/snippet/status`);
    statusUrl.searchParams.set('siteId', bridgeContext.siteId);
    statusUrl.searchParams.set('correlationId', correlationId);
    if (bridgeContext.siteUrl) {
      statusUrl.searchParams.set('siteUrl', bridgeContext.siteUrl);
    }
    bridgeStatus = await fetchJsonWithRetry<SnippetStatusResponse>(
      statusUrl.toString(),
      {
        method: 'GET',
      },
      { timeoutMs: STATUS_TIMEOUT_MS, retries: MAX_NETWORK_RETRIES }
    );
    renderBridgeStatus(bridgeStatus);
  } catch (error) {
    console.warn('Failed to refresh bridge status:', error);
    setBridgeBadge('failed');
    setBridgeMessage('Validator script status check failed. Publish the site, then try again.');
    setBridgeSetupStep('recheck');
    setToolbarStatus('Validator script check failed', 'failed');
  }
}

async function installBridge(): Promise<void> {
  if (!bridgeContext?.siteId) return;
  setBridgeActionsDisabled(true);
  setBridgeMessage('Adding the Validator script to this site...');
  setBridgeSetupStep('install');
  setToolbarStatus('Adding Validator script...', 'neutral');
  try {
    const correlationId = createCorrelationId();
    const webflow = (window as any).webflow;
    let idToken: string | null = null;
    try {
      idToken = await webflow?.getIdToken?.();
    } catch (error) {
      console.warn('getIdToken failed:', error);
    }

    const installStatus = await fetchJsonWithRetry<SnippetStatusResponse>(
      `${APP_VALIDATOR_BASE}/app-validator/snippet/install`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-Id': correlationId,
        },
        body: JSON.stringify({
          siteId: bridgeContext.siteId,
          siteName: bridgeContext.siteName,
          installTarget: 'head',
          mode: idToken ? 'webflow-api' : 'programmatic',
          idToken: idToken || undefined,
        }),
      },
      { timeoutMs: NETWORK_TIMEOUT_MS, retries: MAX_NETWORK_RETRIES }
    );

    bridgeStatus =
      installStatus.status === 'active'
        ? {
            ...installStatus,
            status: 'pending_manual',
            message: 'Validator script added. Publish your site, then click Re-check script.',
          }
        : installStatus;
    renderBridgeStatus(bridgeStatus);
  } catch (error) {
    console.warn('Bridge install failed:', error);
    setBridgeBadge('failed');
    setBridgeMessage(
      'Automatic script install failed. Use the manual fallback snippet, publish, then re-check.'
    );
    setBridgeSetupStep('install');
    setToolbarStatus('Validator script install failed', 'failed');
  } finally {
    setBridgeActionsDisabled(false);
  }
}

async function rotateBridgeToken(): Promise<void> {
  if (!bridgeContext?.siteId) return;
  setBridgeActionsDisabled(true);
  setBridgeMessage('Rotating the Validator script token...');
  setBridgeSetupStep('publish');
  try {
    const correlationId = createCorrelationId();
    bridgeStatus = await fetchJsonWithRetry<SnippetStatusResponse>(
      `${APP_VALIDATOR_BASE}/app-validator/snippet/rotate-token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-Id': correlationId,
        },
        body: JSON.stringify({
          siteId: bridgeContext.siteId,
          siteName: bridgeContext.siteName,
        }),
      },
      { timeoutMs: NETWORK_TIMEOUT_MS, retries: MAX_NETWORK_RETRIES }
    );
    renderBridgeStatus(bridgeStatus);
  } catch (error) {
    console.warn('Token rotation failed:', error);
    setBridgeBadge('failed');
    setBridgeMessage('Token rotation failed. Keep the existing script or try again.');
    setBridgeSetupStep('publish');
  } finally {
    setBridgeActionsDisabled(false);
  }
}

function renderBridgeStatus(status: SnippetStatusResponse): void {
  setBridgeBadge(status.status);

  setBridgeMessage(getValidatorScriptStatusMessage(status));

  if (status.status === 'active') {
    setBridgeSetupStep('run');
    setToolbarStatus('Validator script detected. Run Validator.', 'active');
    hideBridgeDrawer();
  } else {
    const snippet = (status as any).snippet;
    const hasGeneratedToken = Boolean(status.bridgeToken);
    setBridgeSetupStep(status.status === 'pending_manual' && snippet && hasGeneratedToken ? 'publish' : 'install');
    setToolbarStatus('Validator script required for submission checks', 'warning');
    showBridgeDrawer();
  }

  const tokenRow = document.getElementById('bridge-token-row');
  const tokenValue = document.getElementById('bridge-token-value');
  const snippetWrap = document.getElementById('bridge-snippet-wrap') as HTMLDetailsElement | null;
  const snippetCode = document.getElementById('bridge-snippet-code');
  if (tokenRow && tokenValue) {
    if (status.bridgeToken) {
      tokenRow.style.display = 'flex';
      tokenValue.textContent = status.bridgeToken;
    } else {
      tokenRow.style.display = 'none';
      tokenValue.textContent = '';
    }
  }

  if (snippetWrap && snippetCode) {
    const snippet = (status as any).snippet;
    if (status.status === 'pending_manual' && typeof snippet === 'string' && snippet.trim()) {
      snippetWrap.style.display = 'block';
      snippetCode.textContent = snippet;
    } else {
      snippetWrap.style.display = 'none';
      snippetCode.textContent = '';
      snippetWrap.open = false;
    }
  }
}

function setBridgeActionsDisabled(disabled: boolean): void {
  const ids = ['bridge-install-btn', 'bridge-rotate-btn', 'bridge-recheck-btn'];
  for (const id of ids) {
    const btn = document.getElementById(id) as HTMLButtonElement | null;
    if (btn) btn.disabled = disabled;
  }
}

function setBridgeBadge(status: 'active' | 'pending_manual' | 'failed' | 'neutral'): void {
  const badge = document.getElementById('bridge-status-badge');
  if (!badge) return;
  badge.classList.remove('active', 'pending_manual', 'failed', 'neutral');
  badge.classList.add(status);

  const labels: Record<string, string> = {
    active: 'Ready',
    pending_manual: 'Script Needed',
    failed: 'Error',
    neutral: 'Unknown',
  };
  badge.textContent = '●';
  badge.setAttribute('aria-label', labels[status] || status);
  badge.setAttribute('title', labels[status] || status);
}

function setBridgeMessage(message: string): void {
  const messageEl = document.getElementById('bridge-message');
  if (messageEl) messageEl.textContent = message;
}

function getValidatorScriptStatusMessage(status: SnippetStatusResponse): string {
  const snippet = (status as any).snippet;
  if (status.status === 'active') {
    return 'Validator script detected on the published site. Run Validator to confirm a 100% pass.';
  }
  if (status.status === 'pending_manual' && typeof snippet === 'string' && snippet.trim()) {
    return 'Add the Validator script, publish the site, then re-check. If automatic install did not work, use the manual fallback snippet below.';
  }
  if (status.status === 'pending_manual') {
    return 'Validator script is not detected on the published site yet. Add it, publish, then re-check.';
  }
  return 'Validator script install is unavailable. Try again or use the manual fallback snippet.';
}

function showBridgeDrawer(): void {
  const drawer = document.getElementById('review-bridge');
  if (drawer) drawer.style.display = 'flex';
}

function hideBridgeDrawer(): void {
  const drawer = document.getElementById('review-bridge');
  if (drawer) drawer.style.display = 'none';
}

function setToolbarStatus(
  text: string,
  type: 'active' | 'warning' | 'failed' | 'neutral'
): void {
  const statusText = document.getElementById('toolbar-status-text');
  const badge = document.getElementById('bridge-status-badge');
  if (statusText) {
    statusText.textContent = text;
    statusText.classList.add('updated');
    setTimeout(() => statusText.classList.remove('updated'), 300);
  }
  if (badge) {
    badge.classList.remove('active', 'pending_manual', 'failed', 'neutral');
    badge.classList.add(
      type === 'active'
        ? 'active'
        : type === 'warning'
          ? 'pending_manual'
          : type === 'failed'
            ? 'failed'
            : 'neutral'
    );
    badge.textContent = '●';
  }
}

function setBridgeSetupStep(activeStep: 'install' | 'publish' | 'recheck' | 'run'): void {
  const steps: Array<'install' | 'publish' | 'recheck' | 'run'> = [
    'install',
    'publish',
    'recheck',
    'run',
  ];
  const activeIndex = steps.indexOf(activeStep);
  steps.forEach((step, index) => {
    const element = document.getElementById(`bridge-step-${step}`);
    if (!element) return;
    element.classList.remove('is-active', 'is-complete');
    if (index < activeIndex) {
      element.classList.add('is-complete');
    } else if (index === activeIndex) {
      element.classList.add('is-active');
    }
  });
}

// Merge enhanced validation results from Worker
function mergeEnhancedValidation(designerResults: ValidationResponse, enhancedResults: any): void {
  try {
    console.log('🔄 Merging enhanced validation results...');
    console.log('📊 Enhanced results structure:', Object.keys(enhancedResults.analysis || enhancedResults || {}));
    console.log('📈 Categories before merge:', designerResults.categories.length);

    const analysis = enhancedResults.analysis || enhancedResults;

    // Add new categories from enhanced validation
    if (analysis.assets) {
      console.log('➕ Adding Assets & Images category');
      const hasErrors = analysis.assets.issues.filter((i: any) => i.severity === 'error').length > 0;
      designerResults.categories.push({
        category: 'Assets & Images',
        passed: !hasErrors,
        issues: analysis.assets.issues,
        stats: analysis.assets.stats
      });
    }

    if (analysis.content) {
      console.log('➕ Adding Content & Accessibility category');
      const hasErrors = analysis.content.issues.filter((i: any) => i.severity === 'error').length > 0;
      designerResults.categories.push({
        category: 'Content & Accessibility',
        passed: !hasErrors,
        issues: analysis.content.issues,
        stats: analysis.content.stats
      });
    }

    if (analysis.accessibility) {
      console.log('➕ Adding Accessibility & WCAG category');
      const surfacedAccessibilityIssues = getSurfacedAccessibilityIssues(
        analysis.accessibility,
        Boolean(analysis.content)
      );
      if (surfacedAccessibilityIssues.length > 0) {
        const hasErrors = surfacedAccessibilityIssues.filter((i: any) => i.severity === 'error').length > 0;
        designerResults.categories.push({
          category: 'Accessibility & WCAG',
          passed: !hasErrors,
          issues: surfacedAccessibilityIssues,
          stats: analysis.accessibility.stats
        });
      }
    }

    if (analysis.interactions) {
      console.log('➕ Adding Interactions and GSAP category');
      const hasErrors = analysis.interactions.issues.filter((i: any) => i.severity === 'error').length > 0;
      designerResults.categories.push({
        category: 'Interactions and GSAP',
        passed: !hasErrors,
        issues: analysis.interactions.issues,
        stats: analysis.interactions.stats
      });
    }

    // Performance & Optimization validation removed - it was too estimative and not accurate enough

    // Update summary counts
    const allIssues = designerResults.categories.flatMap(cat => cat.issues || []);
    const totalErrors = allIssues.filter(issue => issue.severity === 'error').length;
    const totalWarnings = allIssues.filter(issue => issue.severity === 'warning').length;
    const totalInfo = allIssues.filter(issue => issue.severity === 'info').length;

    designerResults.summary.totalErrors = totalErrors;
    designerResults.summary.totalWarnings = totalWarnings;
    designerResults.summary.totalInfo = totalInfo;
    designerResults.summary.passedCategories = designerResults.categories.filter(c => c.passed).length;
    designerResults.summary.failedCategories = designerResults.categories.filter(c => !c.passed).length;

    console.log('✅ Enhanced validation results merged successfully!');
    console.log('📊 Total categories after merge:', designerResults.categories.length);
    console.log('🏷️ Final category list:', designerResults.categories.map(c => c.category));
  } catch (error) {
    console.warn('Error merging enhanced validation results:', error);
  }
}

function getSurfacedAccessibilityIssues(
  accessibilityAnalysis: { issues?: ValidationIssue[] } | undefined,
  contentAnalysisIncluded: boolean
) : ValidationIssue[] {
  const issues = Array.isArray(accessibilityAnalysis?.issues) ? accessibilityAnalysis.issues : [];
  if (!contentAnalysisIncluded) {
    return issues;
  }

  const duplicateIssueIds = new Set(['missing-alt-text-critical', 'heading-structure-errors']);
  return issues.filter((issue) => !duplicateIssueIds.has(issue.id));
}

// Collect comprehensive project data from Webflow Designer APIs
async function collectProjectData(webflow: any): Promise<ProjectData> {
  const data: ProjectData = {
    variables: undefined,
    components: [],
    styles: [],
    pages: [],
    siteInfo: undefined,
    collectionMetadata: {
      variableCollections: 0,
      totalVariables: 0,
      totalComponents: 0,
      totalStyles: 0,
      totalPages: 0,
      totalAssets: 0,
      totalFonts: 0,
      totalCollections: 0
    },
    enhancedValidation: {
      variableOrganization: {
        hasColorVariables: false,
        hasTypographyVariables: false,
        hasSpacingVariables: false,
        hasOrderedCollections: false
      },
      componentArchitecture: {
        hasNavbarComponent: false,
        hasFooterComponent: false,
        hasCTAComponents: false,
        hasNestedComponents: false
      },
      styleSystem: {
        hasHtmlTagStyles: false,
        hasConsistentNaming: false,
        usesVariablesInStyles: false,
        hasPercentageLineHeights: false
      },
      pageStructure: {
        hasStyleGuidePage: false,
        hasInstructionsPage: false,
        hasLicensePage: false,
        hasTitleCaseNaming: false,
        hasMatchingSlugs: false
      },
      seoCompliance: {
        currentPageHasValidTitle: false,
        currentPageHasValidDescription: false,
        hasOpenGraphData: false,
        titleWithinLimits: false,
        descriptionWithinLimits: false
      }
    },
    collectionWarnings: []
  };

  console.log('Starting project data collection...');

  // Variables Collection
  try {
    if (webflow.getAllVariableCollections) {
      const collections = await webflow.getAllVariableCollections() || [];
      const variableData: any[] = [];
      let totalVariables = 0;

      for (const collection of collections) {
        try {
          const collectionName = collection.getName ? await collection.getName() : collection.name || 'Unnamed Collection';
          const variables = collection.getAllVariables ? await collection.getAllVariables() : [];
          const variableList: any[] = [];

          for (const variable of variables) {
            try {
              const variableName = variable.getName ? await variable.getName() : variable.name || null;
              const variableType = variable.type || null;
              
              // Enhanced variable analysis
              if (variableName) {
                const lowerName = variableName.toLowerCase();
                if (lowerName.includes('color') || lowerName.includes('bg') || lowerName.includes('text') || lowerName.includes('primary') || lowerName.includes('secondary')) {
                  data.enhancedValidation!.variableOrganization.hasColorVariables = true;
                }
                if (lowerName.includes('font') || lowerName.includes('text') || lowerName.includes('heading') || lowerName.includes('body') || lowerName.includes('size')) {
                  data.enhancedValidation!.variableOrganization.hasTypographyVariables = true;
                }
                if (lowerName.includes('space') || lowerName.includes('margin') || lowerName.includes('padding') || lowerName.includes('gap')) {
                  data.enhancedValidation!.variableOrganization.hasSpacingVariables = true;
                }
              }
              
              variableList.push({
                id: variable.id,
                name: variableName,
                type: variableType,
                value: variable.value || null
              });
            } catch (variableError) {
              console.warn('Error processing variable:', variableError);
              if (variable.name || variable.id) {
                variableList.push({
                  id: variable.id,
                  name: variable.name || null,
                  type: variable.type || null,
                  value: variable.value || null
                });
              }
            }
          }

          variableData.push({
            id: collection.id,
            name: collectionName,
            variables: variableList,
            variableCount: variableList.length
          });

          totalVariables += variableList.length;
          console.log(`Variables in collection "${collectionName}": ${variableList.length}`);

        } catch (collectionError) {
          console.warn('Error processing variable collection:', collectionError);
        }
      }

      if (variableData.length > 0) {
        data.variables = { collections: variableData };
        data.collectionMetadata!.variableCollections = variableData.length;
        data.collectionMetadata!.totalVariables = totalVariables;
        console.log(`Variable collections collected: ${variableData.length}, Total variables: ${totalVariables}`);
      }
    }
  } catch (error) {
    console.warn('Could not fetch variable collections:', error);
    data.collectionWarnings!.push({
      source: 'Variable Collections',
      message: 'Failed to collect variable data',
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Components Collection
  try {
    if (webflow.getAllComponents) {
      const components = await webflow.getAllComponents() || [];
      const componentData: any[] = [];

      for (const component of components) {
        try {
          const name = component.getName ? await component.getName() : component.name || null;
          const id = component.getId ? await component.getId() : component.id;

          if (name) {
            // Enhanced component analysis
            const lowerName = name.toLowerCase();
            let instances = 0;
            let isNested = false;
            
            // Detect component types for Webflow Way requirements
            if (lowerName.includes('nav') || lowerName.includes('header') || lowerName.includes('menu')) {
              data.enhancedValidation!.componentArchitecture.hasNavbarComponent = true;
            }
            if (lowerName.includes('footer')) {
              data.enhancedValidation!.componentArchitecture.hasFooterComponent = true;
            }
            if (lowerName.includes('cta') || lowerName.includes('button') || lowerName.includes('call')) {
              data.enhancedValidation!.componentArchitecture.hasCTAComponents = true;
            }
            
            // Try to get component usage/instances count
            try {
              if (component.getInstances) {
                const componentInstances = await component.getInstances();
                instances = Array.isArray(componentInstances) ? componentInstances.length : 0;
              }
              
              // Check if component contains other components (nested)
              if (component.getChildren) {
                const children = await component.getChildren();
                if (Array.isArray(children) && children.some((child: any) => child.type === 'Component')) {
                  isNested = true;
                  data.enhancedValidation!.componentArchitecture.hasNestedComponents = true;
                }
              }
            } catch (nestedError) {
              console.warn('Error analyzing component nesting:', nestedError);
            }
            
            componentData.push({
              id: id,
              name: name,
              type: component.type || 'component',
              instances: instances,
              isNested: isNested
            });
          }
        } catch (compError) {
          console.warn('Error processing component:', compError);
          try {
            if (component.name) {
              componentData.push({
                id: component.id,
                name: component.name,
                type: component.type || 'component'
              });
            }
          } catch (fallbackError) {
            console.warn('Fallback component processing also failed:', fallbackError);
          }
        }
      }

      data.components = componentData;
      data.collectionMetadata!.totalComponents = componentData.length;
      console.log(`Components collected: ${componentData.length}`);
    }
  } catch (error) {
    console.warn('Could not fetch components:', error);
    data.collectionWarnings!.push({
      source: 'Components',
      message: 'Failed to collect component data',
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Styles Collection
  try {
    if (webflow.getAllStyles) {
      const styles = await webflow.getAllStyles() || [];
      const styleData: any[] = [];

      for (const style of styles) {
        try {
          const name = style.getName ? await style.getName() : style.name || null;
          const id = style.getId ? await style.getId() : style.id;
          const styleType = style.type || 'class';

          if (name && !name.startsWith('_')) {
            let properties: Record<string, any> = {};
            let isHtmlTag = false;
            let hasVariables = false;
            
            // Check if this is an HTML tag style (required by Webflow Way)
            const htmlTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'ul', 'ol', 'blockquote', 'figure', 'figcaption', 'body'];
            if (htmlTags.some(tag => name.toLowerCase() === tag || name.toLowerCase().includes(tag))) {
              isHtmlTag = true;
              data.enhancedValidation!.styleSystem.hasHtmlTagStyles = true;
            }
            
            try {
              // Get style properties for enhanced validation
              if (style.getProperties) {
                properties = await style.getProperties() || {};
                
                // Check for variable usage in styles
                Object.values(properties).forEach((value: any) => {
                  if (typeof value === 'object' && value !== null && (value.type === 'variable' || value.id)) {
                    hasVariables = true;
                    data.enhancedValidation!.styleSystem.usesVariablesInStyles = true;
                  }
                });
                
                // Check for percentage-based line heights (Webflow Way requirement)
                if (properties['line-height']) {
                  const lineHeight = String(properties['line-height']);
                  if (lineHeight.includes('%') || (!lineHeight.includes('px') && !lineHeight.includes('rem') && !isNaN(parseFloat(lineHeight)))) {
                    data.enhancedValidation!.styleSystem.hasPercentageLineHeights = true;
                  }
                }
              }
            } catch (propertyError) {
              console.warn('Error getting style properties:', propertyError);
            }
            
            styleData.push({
              id: id,
              name: name,
              type: styleType,
              properties: properties,
              isHtmlTag: isHtmlTag,
              hasVariables: hasVariables
            });
          }
        } catch (styleError) {
          console.warn('Error processing style:', styleError);
          try {
            if (style.name && !style.name.startsWith('_')) {
              styleData.push({
                id: style.id,
                name: style.name,
                type: style.type || 'class'
              });
            }
          } catch (fallbackError) {
            console.warn('Fallback style processing also failed:', fallbackError);
          }
        }
      }

      data.styles = styleData;
      data.collectionMetadata!.totalStyles = styleData.length;
      console.log(`Styles collected: ${styleData.length}`);
    }
  } catch (error) {
    console.warn('Could not fetch styles:', error);
    data.collectionWarnings!.push({
      source: 'Styles',
      message: 'Failed to collect style data',
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Pages Collection
  try {
    if (webflow.getAllPagesAndFolders) {
      const pagesAndFolders = await webflow.getAllPagesAndFolders() || [];
      const pageData: any[] = [];
      const items = Array.isArray(pagesAndFolders) ? pagesAndFolders : [];

      for (const item of items) {
        try {
          // Filter out folders, only include pages
          if (item.type === 'Page' || item.type === 'page') {
            const name = item.getName ? await item.getName() : 
                        item.name || item.title || item.displayName || 'Unnamed';
            const slug = item.getSlug ? await item.getSlug() : 
                        item.slug || item.path || '';
            const publishPath = item.getPublishPath ? await item.getPublishPath() :
                        item.publishPath || null;
            let collectionId: string | null = null;
            let collectionName: string | null = null;

            try {
              if (item.getCollectionId) {
                collectionId = await item.getCollectionId();
              } else if (item.getCollectionID) {
                collectionId = await item.getCollectionID();
              } else if (item.collectionId || item.collectionID) {
                collectionId = item.collectionId || item.collectionID;
              }
            } catch {
              collectionId = null;
            }

            try {
              if (item.getCollectionName) {
                collectionName = await item.getCollectionName();
              } else if (item.collectionName) {
                collectionName = item.collectionName;
              }
            } catch {
              collectionName = null;
            }
            const isCmsTemplate = Boolean(
              collectionId ||
              collectionName ||
              isInternalCmsTemplateSlug(slug) ||
              (publishPath && isInternalCmsTemplateSlug(publishPath))
            );
            
            // Enhanced page analysis for Webflow Way requirements
            let isHomePage = false;
            let hasValidNaming = false;
            
            // Check for required pages
            const lowerName = name.toLowerCase();
            const lowerSlug = slug.toLowerCase();
            
            if (lowerName.includes('style guide') || lowerSlug.includes('style-guide') || lowerSlug.includes('styleguide')) {
              data.enhancedValidation!.pageStructure.hasStyleGuidePage = true;
            }
            if (lowerName.includes('instructions') || lowerSlug.includes('instructions')) {
              data.enhancedValidation!.pageStructure.hasInstructionsPage = true;
            }
            if (lowerName.includes('license') || lowerSlug.includes('license') || slug === '/licenses') {
              data.enhancedValidation!.pageStructure.hasLicensePage = true;
            }
            
            // Check for home page
            if (slug === '/' || lowerName === 'home' || lowerName === 'homepage' || lowerSlug === 'home') {
              isHomePage = true;
            }
            
            // Validate Title Case naming (Webflow Way requirement)
            const isTitleCase = /^[A-Z][a-z]*(?:\s[A-Z][a-z]*)*$/.test(name) || 
                               name.split(' ').every((word: string) => word.charAt(0) === word.charAt(0).toUpperCase());
            if (isTitleCase) {
              hasValidNaming = true;
              data.enhancedValidation!.pageStructure.hasTitleCaseNaming = true;
            }
            
            // Check if page name matches slug (Webflow Way requirement)
            const expectedSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const actualSlug = slug.replace(/^\//, '').toLowerCase();
            if (expectedSlug === actualSlug || (isHomePage && actualSlug === '')) {
              data.enhancedValidation!.pageStructure.hasMatchingSlugs = true;
            }

            // Collect SEO data for each page
            let seoData = null;
            try {
              // Always try to collect SEO data for pages (not folders)
              if (item.type === 'Page') {
                console.log(`Collecting SEO data for page: ${name}`);

                const title = item.getSearchTitle ? await item.getSearchTitle() : null;
                const description = item.getSearchDescription ? await item.getSearchDescription() : null;
                const openGraphTitle = item.getOpenGraphTitle ? await item.getOpenGraphTitle() : null;
                const openGraphDescription = item.getOpenGraphDescription ? await item.getOpenGraphDescription() : null;
                const openGraphImage = item.getOpenGraphImage ? await item.getOpenGraphImage() : null;
                const usesTitleAsOG = item.usesTitleAsOpenGraphTitle ? await item.usesTitleAsOpenGraphTitle() : false;
                const usesDescAsOG = item.usesDescriptionAsOpenGraphDescription ? await item.usesDescriptionAsOpenGraphDescription() : false;

                seoData = {
                  title: title,
                  titleLength: title ? title.length : 0,
                  description: description,
                  descriptionLength: description ? description.length : 0,
                  openGraphTitle: openGraphTitle,
                  openGraphDescription: openGraphDescription,
                  openGraphImage: openGraphImage,
                  usesTitleAsOpenGraphTitle: usesTitleAsOG,
                  usesDescriptionAsOpenGraphDescription: usesDescAsOG,
                  hasCustomOpenGraphTitle: !usesTitleAsOG && !!openGraphTitle,
                  hasCustomOpenGraphDescription: !usesDescAsOG && !!openGraphDescription
                };

                console.log(`SEO data collected for ${name}:`, {
                  hasTitle: !!title,
                  hasDescription: !!description,
                  titleLength: title?.length || 0,
                  descriptionLength: description?.length || 0
                });
              }
            } catch (seoError) {
              console.warn(`SEO data collection failed for page ${name}:`, seoError);
            }

            pageData.push({
              id: item.id,
              name: name,
              slug: slug,
              path: item.path || slug,
              publishPath: publishPath,
              collectionId: collectionId,
              collectionName: collectionName,
              isCmsTemplate: isCmsTemplate,
              type: item.type,
              isHomePage: isHomePage,
              hasValidNaming: hasValidNaming,
              seo: seoData
            });
          }
        } catch (pageError) {
          console.warn('Error processing page:', pageError);
        }
      }

      data.pages = pageData;
      data.collectionMetadata!.totalPages = pageData.length;
      console.log(`Pages collected: ${pageData.length}`);
    } else {
      // Try alternative methods
      if (webflow.getAllPages) {
        const pages = await webflow.getAllPages() || [];
        data.pages = pages;
        data.collectionMetadata!.totalPages = pages.length;
      } else if (webflow.getPages) {
        const pages = await webflow.getPages() || [];
        data.pages = pages;
        data.collectionMetadata!.totalPages = pages.length;
      }
    }
  } catch (error) {
    console.warn('Could not fetch pages:', error);
    data.collectionWarnings!.push({
      source: 'Pages',
      message: 'Failed to collect page data',
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Current Page SEO Analysis
  try {
    console.log('Collecting current page SEO data...');
    const currentPageData = await collectCurrentPageSEOData(webflow);
    if (currentPageData) {
      data.currentPage = currentPageData;
      
      // Update SEO compliance flags
      // Basic SEO compliance
      data.enhancedValidation!.seoCompliance.currentPageHasValidTitle = currentPageData.seo.hasValidTitle || false;
      data.enhancedValidation!.seoCompliance.currentPageHasValidDescription = currentPageData.seo.hasValidDescription || false;
      data.enhancedValidation!.seoCompliance.titleWithinLimits = (currentPageData.seo.titleLength || 0) <= 60;
      data.enhancedValidation!.seoCompliance.descriptionWithinLimits = 
        (currentPageData.seo.descriptionLength || 0) >= 150 && (currentPageData.seo.descriptionLength || 0) <= 160;
      
      // Enhanced Open Graph compliance
      const hasOpenGraphData = !!(currentPageData.seo.openGraphTitle || currentPageData.seo.openGraphDescription || currentPageData.seo.openGraphImage);
      data.enhancedValidation!.seoCompliance.hasOpenGraphData = hasOpenGraphData;
      
      console.log('SEO compliance analysis:', {
        hasValidTitle: data.enhancedValidation!.seoCompliance.currentPageHasValidTitle,
        hasValidDescription: data.enhancedValidation!.seoCompliance.currentPageHasValidDescription,
        titleWithinLimits: data.enhancedValidation!.seoCompliance.titleWithinLimits,
        descriptionWithinLimits: data.enhancedValidation!.seoCompliance.descriptionWithinLimits,
        hasOpenGraphData: hasOpenGraphData,
        usesCustomOGTitle: currentPageData.seo.hasCustomOpenGraphTitle,
        usesCustomOGDescription: currentPageData.seo.hasCustomOpenGraphDescription
      });
      
      console.log(`Current page SEO collected: ${currentPageData.name}`);
    }
  } catch (error) {
    console.warn('Could not fetch current page SEO data:', error);
    data.collectionWarnings!.push({
      source: 'Current Page SEO',
      message: 'Failed to collect current page SEO data',
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Site Info
  try {
    const site = await webflow.getSiteInfo?.() || {};
    data.siteInfo = {
      name: site.name || null,
      id: site.siteId || site.id || null
    };
  } catch (error) {
    console.warn('Could not fetch site info:', error);
    data.collectionWarnings!.push({
      source: 'Site Info',
      message: 'Failed to collect site information',
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Final analysis for consistent naming conventions
  analyzeNamingConsistency(data);
  
  console.log('Project data collection complete:', data.collectionMetadata);
  console.log('Enhanced validation results:', data.enhancedValidation);
  return data;
}

// Full Coverage Validation: Variables Title Case and Categories
function addVariableValidation(results: ValidationResponse, projectData: ProjectData): void {
  const issues: ValidationIssue[] = [];

  if (projectData.variables?.collections && Array.isArray(projectData.variables.collections)) {
    // Flatten all variables from all collections
    const allVariables: any[] = [];
    projectData.variables.collections.forEach(collection => {
      if (collection.variables && Array.isArray(collection.variables)) {
        allVariables.push(...collection.variables);
      }
    });

    if (allVariables.length > 0) {
      // Check Title Case naming for variables
      const nonTitleCaseVars = allVariables.filter(v => {
        if (!v.name) return false;
        // Title Case with spaces. Allow numbers and acronyms; disallow underscores/dashes.
        // Valid: "Primary Color", "H1", "CTA Primary", "Spacing 200"
        if (/[_-]/.test(v.name)) return true; // Has invalid chars, filter in
        const parts = v.name.trim().split(/\s+/);
        if (parts.length === 0) return true;
        const isTitleCase = parts.every((p: string) => /^[A-Z][A-Za-z0-9]*$/.test(p));
        return !isTitleCase;
      });

      if (nonTitleCaseVars.length > 0) {
        issues.push({
          id: 'variables-title-case',
          category: 'Design System',
          severity: 'error',
          message: `${nonTitleCaseVars.length} variables don't use Title Case naming convention`,
          details: {
            howToFix: 'Rename variables to use Title Case (e.g., "Primary Color", "Body Font Size")',
            samples: nonTitleCaseVars.slice(0, 5).map(v => v.name)
          }
        });
      }

      // Check for proper variable categories
      const hasColorVars = allVariables.some(v =>
        /color|bg|background|primary|secondary|accent|neutral/i.test(v.name || '')
      );
      const hasTypographyVars = allVariables.some(v =>
        /font|text|heading|body|size|weight|line/i.test(v.name || '')
      );
      const hasSpacingVars = allVariables.some(v =>
        /space|spacing|margin|padding|gap|gutter/i.test(v.name || '')
      );

      if (!hasColorVars) {
        issues.push({
          id: 'missing-color-variables',
          category: 'Design System',
          severity: 'error',
          message: 'No color variables defined',
          details: {
            howToFix: 'Create color variables for primary, secondary, background, and text colors'
          }
        });
      }

      if (!hasTypographyVars) {
        issues.push({
          id: 'missing-typography-variables',
          category: 'Design System',
          severity: 'error',
          message: 'No typography variables defined',
          details: {
            howToFix: 'Create typography variables for font sizes, weights, and line heights'
          }
        });
      }

      if (!hasSpacingVars) {
        issues.push({
          id: 'missing-spacing-variables',
          category: 'Design System',
          severity: 'error',
          message: 'No spacing variables defined',
          details: {
            howToFix: 'Create spacing variables for consistent margins, padding, and gaps'
          }
        });
      }
    }
  }

  // Calculate stats for Design System category
  const allVariables: any[] = [];
  if (projectData.variables?.collections) {
    projectData.variables.collections.forEach(collection => {
      if (collection.variables && Array.isArray(collection.variables)) {
        allVariables.push(...collection.variables);
      }
    });
  }

  const totalVariables = allVariables.length;
  const withTitleCase = allVariables.filter(v => {
    const name = v.name || '';
    if (!name || /[_-]/.test(name)) return false;
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return false;
    return parts.every((p: string) => /^[A-Z][A-Za-z0-9]*$/.test(p));
  }).length;
  const hasColorVars = allVariables.some(v =>
    /color|bg|background|primary|secondary|accent|neutral/i.test(v.name || '')
  );
  const hasTypographyVars = allVariables.some(v =>
    /font|text|heading|body|size|weight|line/i.test(v.name || '')
  );
  const hasSpacingVars = allVariables.some(v =>
    /space|spacing|margin|padding|gap|gutter/i.test(v.name || '')
  );

  // Update or create Design System category
  let designSystemCategory = results.categories.find(cat => cat.category === 'Design System');
  if (!designSystemCategory) {
    designSystemCategory = {
      category: 'Design System',
      passed: issues.filter(i => i.severity === 'error').length === 0,
      issues: issues,
      stats: {
        totalVariables,
        withTitleCase,
        hasColorVars,
        hasTypographyVars,
        hasSpacingVars
      }
    };
    results.categories.push(designSystemCategory);
  } else {
    designSystemCategory.issues.push(...issues);
    designSystemCategory.passed = designSystemCategory.issues.filter(i => i.severity === 'error').length === 0;
    designSystemCategory.stats = {
      totalVariables,
      withTitleCase,
      hasColorVars,
      hasTypographyVars,
      hasSpacingVars
    };
  }
}

// Full Coverage Validation: Nav, Footer, CTA Components
function addComponentValidation(results: ValidationResponse, projectData: ProjectData): void {
  const issues: ValidationIssue[] = [];

  // Define required components structure
  const requiredComponents = [
    { name: 'nav', display: 'Navigation', patterns: ['nav', 'navbar', 'navigation', 'header'] },
    { name: 'footer', display: 'Footer', patterns: ['footer'] },
    { name: 'cta', display: 'CTA', patterns: ['cta', 'call to action', 'button'] }
  ];

  if (projectData.components && Array.isArray(projectData.components)) {

    requiredComponents.forEach(req => {
      const found = projectData.components!.find(c =>
        req.patterns.some(pattern => c.name?.toLowerCase().includes(pattern))
      );

      if (!found) {
        issues.push({
          id: `missing-${req.name}-component`,
          category: 'Component Architecture',
          severity: 'error',
          message: `Missing required ${req.display} component`,
          details: {
            howToFix: `Create a ${req.display} component with Title Case naming`
          }
        });
      } else if (found.name) {
        // Check Title Case naming (allow numbers and acronyms)
        const name = found.name;
        const hasInvalidChars = /[_-]/.test(name);
        const parts = name.trim().split(/\s+/);
        const isTitleCase = !hasInvalidChars && parts.length > 0 && parts.every(p => /^[A-Z][A-Za-z0-9]*$/.test(p));
        if (!isTitleCase) {
          issues.push({
            id: `${req.name}-component-naming`,
            category: 'Component Architecture',
            severity: 'error',
            message: `${req.display} component "${found.name}" doesn't use Title Case naming`,
            details: {
              howToFix: `Rename to use Title Case (e.g., "Main Navigation", "Site Footer", "Primary CTA")`
            }
          });
        }

        // Note: Component instance tracking removed as Designer API
        // doesn't reliably provide instance counts across all pages
        // This validation would need to be done via the Worker with full site analysis
      }
    });
  }

  // Calculate stats
  const totalComponents = projectData.components?.length || 0;
  const requiredComponentsFound = requiredComponents.reduce((acc: number, req: any) => {
    const found = projectData.components?.find((comp: any) =>
      req.patterns.some((pattern: string) => comp.name?.toLowerCase().includes(pattern))
    );
    return found ? acc + 1 : acc;
  }, 0);
  const componentsWithTitleCase = projectData.components?.filter((comp: any) => {
    const name = comp.name || '';
    if (!name || /[_-]/.test(name)) return false;
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return false;
    return parts.every((p: string) => /^[A-Z][A-Za-z0-9]*$/.test(p));
  }).length || 0;

  // Update or create Component Architecture category
  let componentCategory = results.categories.find(cat => cat.category === 'Component Architecture');
  if (!componentCategory) {
    componentCategory = {
      category: 'Component Architecture',
      passed: issues.filter(i => i.severity === 'error').length === 0,
      issues: issues,
      stats: {
        totalComponents,
        requiredComponents: {
          found: requiredComponentsFound,
          total: requiredComponents.length
        },
        componentsWithTitleCase
      }
    };
    results.categories.push(componentCategory);
  } else {
    componentCategory.issues.push(...issues);
    componentCategory.passed = componentCategory.issues.filter(i => i.severity === 'error').length === 0;
    componentCategory.stats = {
      totalComponents,
      requiredComponents: {
        found: requiredComponentsFound,
        total: requiredComponents.length
      },
      componentsWithTitleCase
    };
  }
}

// Full Coverage Validation: HTML Tag Styles and Variable Usage
function addStyleSystemValidation(results: ValidationResponse, projectData: ProjectData): void {
  const issues: ValidationIssue[] = [];

  if (projectData.styles && Array.isArray(projectData.styles)) {
    // Check for all required HTML tag styles
    const requiredTags = ['body', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a'];
    const existingTagStyles: string[] = [];
    const tagStylesWithVariables: string[] = [];

    projectData.styles.forEach(style => {
      const styleName = style.name?.toLowerCase() || '';

      // Check if this is an HTML tag style
      requiredTags.forEach(tag => {
        if (styleName === tag || styleName === `all ${tag}`) {
          existingTagStyles.push(tag);

          // Check if it uses variables
          if (style.hasVariables) {
            tagStylesWithVariables.push(tag);
          }
        }
      });
    });

    // Find missing HTML tag styles
    const missingTags = requiredTags.filter(tag => !existingTagStyles.includes(tag));
    if (missingTags.length > 0) {
      issues.push({
        id: 'missing-html-tag-styles',
        category: 'Style System',
        severity: 'error',
        message: `Missing base styles for HTML tags: ${missingTags.join(', ')}`,
        details: {
          howToFix: 'Create base styles for all HTML tags (body, h1-h6, p, a)',
          samples: missingTags
        }
      });
    }

    // Check for variable usage in HTML tag styles
    const tagsWithoutVariables = existingTagStyles.filter(tag => !tagStylesWithVariables.includes(tag));
    if (tagsWithoutVariables.length > 0) {
      issues.push({
        id: 'html-tags-without-variables',
        category: 'Style System',
        severity: 'error',
        message: `HTML tag styles not using variables: ${tagsWithoutVariables.join(', ')}`,
        details: {
          howToFix: 'Update HTML tag styles to use variables for colors, typography, and spacing',
          samples: tagsWithoutVariables
        }
      });
    }

    // Check overall variable usage in styles
    const totalStyles = projectData.styles.length;
    const stylesWithVariables = projectData.styles.filter(s => s.hasVariables).length;
    const variableUsagePercent = totalStyles > 0 ? Math.round((stylesWithVariables / totalStyles) * 100) : 0;

    if (variableUsagePercent < 50) {
      issues.push({
        id: 'low-variable-usage',
        category: 'Style System',
        severity: 'warning',
        message: `Only ${variableUsagePercent}% of styles use variables (${stylesWithVariables}/${totalStyles})`,
        details: {
          howToFix: 'Increase variable usage in styles for better maintainability (aim for 80%+)'
        }
      });
    }
  }

  // Calculate stats
  const totalStyles = projectData.styles?.length || 0;
  const stylesWithVariables = projectData.styles?.filter(s => s.hasVariables).length || 0;
  const variableUsagePercent = totalStyles > 0 ? Math.round((stylesWithVariables / totalStyles) * 100) : 0;
  const requiredTags = ['body', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a'];
  const htmlTagStylesFound = projectData.styles?.filter(s => s.isHtmlTag).length || 0;

  // Update or create Style System category
  let styleSystemCategory = results.categories.find(cat => cat.category === 'Style System');
  if (!styleSystemCategory) {
    styleSystemCategory = {
      category: 'Style System',
      passed: issues.filter(i => i.severity === 'error').length === 0,
      issues: issues,
      stats: {
        totalStyles,
        htmlTagStyles: {
          found: htmlTagStylesFound,
          required: requiredTags.length
        },
        stylesWithVariables,
        variableUsagePercent
      }
    };
    results.categories.push(styleSystemCategory);
  } else {
    styleSystemCategory.issues.push(...issues);
    styleSystemCategory.passed = styleSystemCategory.issues.filter(i => i.severity === 'error').length === 0;
    styleSystemCategory.stats = {
      totalStyles,
      htmlTagStyles: {
        found: htmlTagStylesFound,
        required: requiredTags.length
      },
      stylesWithVariables,
      variableUsagePercent
    };
  }
}

// Enhance validation results with client-side analysis
function enhanceValidationResults(results: ValidationResponse, projectData: ProjectData): void {
  console.log('Enhancing validation results with client-side analysis...');

  // REMOVED: These client-side validations duplicate the server-side "Variables" and "Components" categories
  // addVariableValidation(results, projectData); // Creates duplicate "Design System" category
  // addComponentValidation(results, projectData); // Creates duplicate "Component Architecture" category
  addStyleSystemValidation(results, projectData);
  
  // Find Page Structure category
  const pageStructureCategory = results.categories.find(cat => cat.category === 'Page Structure');
  
  if (pageStructureCategory && projectData.pages && projectData.pages.length > 0) {
    console.log(`Found ${projectData.pages.length} pages, updating Page Structure validation...`);
    
    // Clear existing issues if we have pages
    pageStructureCategory.issues = [];
    pageStructureCategory.passed = true;
    
    // Update category stats
    if (pageStructureCategory.stats) {
      pageStructureCategory.stats.totalPages = projectData.pages.length;
      pageStructureCategory.stats.totalFolders = 0; // We don't track folders yet
      pageStructureCategory.stats.hasHomePage = projectData.pages.some(p => p.slug === '/' || p.isHomePage);
    } else {
      pageStructureCategory.stats = {
        totalPages: projectData.pages.length,
        totalFolders: 0,
        hasHomePage: projectData.pages.some(p => p.slug === '/' || p.isHomePage)
      };
    }
    
    // Check for required pages based on enhanced validation
    const issues: ValidationIssue[] = [];

    if (projectData.enhancedValidation) {
      const pageStructure = projectData.enhancedValidation.pageStructure;

      // Note: Style Guide, Instructions, and License page checks are handled by the
      // server in the "Required Pages" category to avoid duplication

      // Check for Title Case naming
      if (!pageStructure.hasTitleCaseNaming) {
        issues.push({
          id: 'page-naming',
          category: 'Page Structure',
          severity: 'warning',
          message: 'Some pages don\'t use Title Case naming convention.',
          details: {
            howToFix: 'Use Title Case for page names (e.g., "Style Guide", "Contact Us")'
          }
        });
      }
    }
    
    pageStructureCategory.issues = issues;
    pageStructureCategory.passed = issues.filter(i => i.severity === 'error').length === 0;
    
    // Update summary counts
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    
    // Adjust summary counts
    if (pageStructureCategory.passed) {
      results.summary.passedCategories = Math.max(results.summary.passedCategories, 
        results.categories.filter(c => c.passed).length);
      results.summary.failedCategories = Math.max(0, 
        results.categories.filter(c => !c.passed).length);
    }
    
    console.log(`Page Structure validation updated: ${pageStructureCategory.passed ? 'PASSED' : 'FAILED'}, ${errorCount} errors, ${warningCount} warnings`);
  }
  
  // SEO validation is now handled by the Cloudflare Worker
  // This provides accurate validation by checking actual published HTML content
  // rather than relying on Designer API limitations for non-current pages
  console.log('SEO validation now handled by Cloudflare Worker - accurate validation via published content analysis');
  
  // Sort categories: failed ones with errors first, then warnings, then passed ones
  results.categories.sort((a, b) => {
    const aErrors = a.issues?.filter(i => i.severity === 'error').length || 0;
    const bErrors = b.issues?.filter(i => i.severity === 'error').length || 0;
    const aWarnings = a.issues?.filter(i => i.severity === 'warning').length || 0;
    const bWarnings = b.issues?.filter(i => i.severity === 'warning').length || 0;
    
    // Primary sort: Categories with errors first
    if (aErrors > 0 && bErrors === 0) return -1;
    if (aErrors === 0 && bErrors > 0) return 1;
    
    // Secondary sort: Categories with warnings next
    if (aErrors === 0 && bErrors === 0) {
      if (aWarnings > 0 && bWarnings === 0) return -1;
      if (aWarnings === 0 && bWarnings > 0) return 1;
    }
    
    // Tertiary sort: Failed categories before passed ones
    if (!a.passed && b.passed) return -1;
    if (a.passed && !b.passed) return 1;
    
    return 0; // Keep original order if same priority
  });
  
  // Recalculate accurate summary counts from all issues
  const allIssues = results.categories.flatMap(cat => cat.issues || []);
  const totalErrors = allIssues.filter(issue => issue.severity === 'error').length;
  const totalWarnings = allIssues.filter(issue => issue.severity === 'warning').length;
  const totalInfo = allIssues.filter(issue => issue.severity === 'info').length;
  
  // Update summary with accurate counts
  results.summary.totalErrors = totalErrors;
  results.summary.totalWarnings = totalWarnings;
  results.summary.totalInfo = totalInfo;
  results.summary.passedCategories = results.categories.filter(c => c.passed).length;
  results.summary.failedCategories = results.categories.filter(c => !c.passed).length;
  
  console.log(`Enhanced validation complete: ${totalErrors} errors, ${totalWarnings} warnings, ${totalInfo} info across ${results.categories.length} categories`);
}

// Collect current page SEO data using getCurrentPage API
async function collectCurrentPageSEOData(webflow: any): Promise<any> {
  try {
    // Get current page
    const currentPage = await webflow.getCurrentPage();
    if (!currentPage) {
      console.warn('getCurrentPage returned null');
      return null;
    }
    
    const pageName = currentPage.getName ? await currentPage.getName() : 'Current Page';
    const pageSlug = currentPage.getSlug ? await currentPage.getSlug() : '';
    const pagePublishPath = currentPage.getPublishPath ? await currentPage.getPublishPath() : null;
    const pageId = currentPage.getId ? await currentPage.getId() : currentPage.id;
    
    console.log(`Analyzing SEO for current page: ${pageName}`);
    
    const seoData: any = {
      title: null,
      description: null,
      openGraphTitle: null,
      openGraphDescription: null,
      openGraphImage: null,
      titleLength: 0,
      descriptionLength: 0,
      hasValidTitle: false,
      hasValidDescription: false,
      usesTitleAsOpenGraphTitle: null,
      usesDescriptionAsOpenGraphDescription: null,
      hasCustomOpenGraphTitle: false,
      hasCustomOpenGraphDescription: false
    };
    
    // Get search description (meta description)
    try {
      if (currentPage.getSearchDescription) {
        const description = await currentPage.getSearchDescription();
        if (description && description.trim()) {
          seoData.description = description;
          seoData.descriptionLength = description.length;
          seoData.hasValidDescription = description.length >= 150 && description.length <= 160;
          console.log(`Search description found: ${description.length} characters`);
        }
      }
    } catch (descError) {
      console.warn('Error getting search description:', descError);
    }
    
    // Try to get search title (meta title)
    try {
      if (currentPage.getSearchTitle) {
        const title = await currentPage.getSearchTitle();
        if (title && title.trim()) {
          seoData.title = title;
          seoData.titleLength = title.length;
          seoData.hasValidTitle = title.length > 0 && title.length <= 60;
          console.log(`Search title found: ${title.length} characters - "${title}"`);
        }
      } else if (currentPage.getTitle) {
        // Fallback to regular title
        const title = await currentPage.getTitle();
        if (title && title.trim()) {
          seoData.title = title;
          seoData.titleLength = title.length;
          seoData.hasValidTitle = title.length > 0 && title.length <= 60;
          console.log(`Page title found: ${title.length} characters - "${title}"`);
        }
      }
    } catch (titleError) {
      console.warn('Error getting page title:', titleError);
    }
    
    // Try to get Open Graph data with enhanced validation
    try {
      // Get Open Graph title
      if (currentPage.getOpenGraphTitle) {
        const ogTitle = await currentPage.getOpenGraphTitle();
        if (ogTitle && ogTitle.trim()) {
          seoData.openGraphTitle = ogTitle;
          console.log('Open Graph title found:', ogTitle);
        }
      }
      
      // Get Open Graph description
      if (currentPage.getOpenGraphDescription) {
        const ogDescription = await currentPage.getOpenGraphDescription();
        if (ogDescription && ogDescription.trim()) {
          seoData.openGraphDescription = ogDescription;
          console.log('Open Graph description found');
        }
      }
      
      // Get Open Graph image
      if (currentPage.getOpenGraphImage) {
        const ogImage = await currentPage.getOpenGraphImage();
        if (ogImage) {
          seoData.openGraphImage = ogImage;
          console.log('Open Graph image found');
        }
      }
      
      // Check if page uses title as Open Graph title
      if (currentPage.usesTitleAsOpenGraphTitle) {
        const usesTitleAsOG = await currentPage.usesTitleAsOpenGraphTitle();
        seoData.usesTitleAsOpenGraphTitle = usesTitleAsOG;
        seoData.hasCustomOpenGraphTitle = !usesTitleAsOG;
        console.log(`Uses title as OG title: ${usesTitleAsOG}`);
      }
      
      // Check if page uses description as Open Graph description
      if (currentPage.usesDescriptionAsOpenGraphDescription) {
        const usesDescriptionAsOG = await currentPage.usesDescriptionAsOpenGraphDescription();
        seoData.usesDescriptionAsOpenGraphDescription = usesDescriptionAsOG;
        seoData.hasCustomOpenGraphDescription = !usesDescriptionAsOG;
        console.log(`Uses description as OG description: ${usesDescriptionAsOG}`);
      }
      
    } catch (ogError) {
      console.warn('Error getting Open Graph data:', ogError);
    }
    
    return {
      id: pageId,
      name: pageName,
      slug: pageSlug,
      publishPath: pagePublishPath,
      seo: seoData
    };
    
  } catch (error) {
    console.warn('Error collecting current page SEO data:', error);
    return null;
  }
}

// Analyze naming consistency across components, styles, and variables
function analyzeNamingConsistency(data: ProjectData): void {
  const allNames: string[] = [];
  
  // Collect all component names
  if (data.components) {
    allNames.push(...data.components.map(c => c.name));
  }
  
  // Collect all style/class names (excluding HTML tags)
  if (data.styles) {
    allNames.push(...data.styles.filter(s => !s.isHtmlTag).map(s => s.name));
  }
  
  // Collect all variable names
  if (data.variables?.collections) {
    data.variables.collections.forEach(collection => {
      allNames.push(...collection.variables.map(v => v.name));
    });
  }
  
  if (allNames.length === 0) return;
  
  // Analyze naming patterns
  const namingPatterns = {
    titleCase: 0,
    camelCase: 0,
    pascalCase: 0,
    snakeCase: 0,
    kebabCase: 0,
    bem: 0
  };
  
  allNames.forEach(name => {
    if (!name) return;
    
    // Title Case: "Hero Container Element"
    if (/^[A-Z][a-z]*(?:\s[A-Z][a-z]*)*$/.test(name)) {
      namingPatterns.titleCase++;
    }
    // camelCase: "heroContainerElement"
    else if (/^[a-z][a-zA-Z0-9]*$/.test(name)) {
      namingPatterns.camelCase++;
    }
    // PascalCase: "HeroContainerElement"
    else if (/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
      namingPatterns.pascalCase++;
    }
    // snake_case: "hero_container_element"
    else if (/^[a-z][a-z0-9_]*$/.test(name)) {
      namingPatterns.snakeCase++;
    }
    // kebab-case: "hero-container-element"
    else if (/^[a-z][a-z0-9-]*$/.test(name)) {
      namingPatterns.kebabCase++;
    }
    // BEM: "block__element--modifier"
    else if (/^[a-z][a-z0-9-]*(__[a-z][a-z0-9-]*)?(--[a-z][a-z0-9-]*)?$/.test(name)) {
      namingPatterns.bem++;
    }
  });
  
  // Determine if there's consistent naming (80% or more use the same pattern)
  const totalNames = allNames.length;
  const dominantPattern = Object.entries(namingPatterns).find(
    ([, count]) => count / totalNames >= 0.8
  );
  
  if (dominantPattern) {
    data.enhancedValidation!.styleSystem.hasConsistentNaming = true;
  }
  
  console.log('Naming pattern analysis:', namingPatterns, `Total names: ${totalNames}`);
}

// UI Helper Functions
function showLoading(): void {
  const loadingDisplay = document.getElementById('loading-display');
  if (loadingDisplay) {
    loadingDisplay.style.display = 'flex';
    loadingDisplay.classList.add('show');
  }
}

function hideLoading(): void {
  const loadingDisplay = document.getElementById('loading-display');
  if (loadingDisplay) {
    loadingDisplay.style.display = 'none';
    loadingDisplay.classList.remove('show');
  }
}

function showError(message: string): void {
  const errorDisplay = document.getElementById('error-display');
  const errorMessage = document.getElementById('error-message');
  if (errorMessage) errorMessage.textContent = message;
  if (errorDisplay) {
    errorDisplay.style.display = 'block';
    errorDisplay.classList.add('show');
  }
}

function hideError(): void {
  const errorDisplay = document.getElementById('error-display');
  if (errorDisplay) {
    errorDisplay.style.display = 'none';
    errorDisplay.classList.remove('show');
  }
}

function hideResults(): void {
  const resultsDisplay = document.getElementById('results-display');
  if (resultsDisplay) {
    resultsDisplay.style.display = 'none';
    resultsDisplay.classList.remove('show');
  }
}

function updateMetaDisplay(projectLabel: string, projectData: ProjectData): void {
  const metaDisplay = document.getElementById('meta-display');
  if (!metaDisplay || !projectData) return;

  const stats = projectData.collectionMetadata || {};
  const metaHTML = `
    <div class="meta-header">
      <h3 class="meta-title">📊 Project: ${projectLabel}</h3>
    </div>
    <div class="meta-stats">
      <div class="meta-stat">
        <span class="meta-label">Variables:</span>
        <span class="meta-value">${stats.totalVariables || 0} (${stats.variableCollections || 0} collections)</span>
      </div>
      <div class="meta-stat">
        <span class="meta-label">Components:</span>
        <span class="meta-value">${stats.totalComponents || 0}</span>
      </div>
      <div class="meta-stat">
        <span class="meta-label">Styles:</span>
        <span class="meta-value">${stats.totalStyles || 0}</span>
      </div>
      <div class="meta-stat">
        <span class="meta-label">Pages:</span>
        <span class="meta-value">${stats.totalPages || 0}</span>
      </div>
    </div>
  `;

  metaDisplay.innerHTML = metaHTML;
  metaDisplay.style.display = 'block';
}

function showResults(data: ValidationResponse): void {
  const resultsDisplay = document.getElementById('results-display');
  if (!resultsDisplay) return;

  // Create comprehensive results HTML with enhanced reporting
  const resultsHTML = `
    <!-- Tabs Navigation -->
    <div class="validation-tabs">
      <button class="tab-button active" data-tab="overview">Overview</button>
      <button class="tab-button" data-tab="checklist">Error Checklist</button>
    </div>

    <!-- Overview Tab Content -->
    <div id="overview-tab" class="tab-content active">
      <!-- Project Overview -->
      <div class="project-overview">
      <div class="project-header">
        <h2 class="project-title">Validation Report: ${data.url}</h2>
        <div class="validation-timestamp">${new Date().toLocaleString()}</div>
      </div>
    </div>

    ${createMarketplaceOutcomeHTML(data)}

    <!-- Summary Stats -->
    <div class="results-summary">
      <div class="summary-stat">
        <div class="stat-number error">${data.summary.totalErrors || data.summary.errors || 0}</div>
        <div class="stat-label">Errors</div>
      </div>
      <div class="summary-stat">
        <div class="stat-number warning">${data.summary.totalWarnings || data.summary.warnings || 0}</div>
        <div class="stat-label">Warnings</div>
      </div>
      <div class="summary-stat">
        <div class="stat-number info">${data.summary.totalInfo || data.summary.infos || 0}</div>
        <div class="stat-label">Info</div>
      </div>
      <div class="summary-stat">
        <div class="stat-number success">${data.summary.passedCategories} <span style="font-size:12px; color:#6b7280">(${calculateOverallScore(data.summary)}%)</span></div>
        <div class="stat-label">Categories Passed</div>
      </div>
    </div>

    <!-- Overall Score -->
    <div class="overall-score">
      <div class="score-container">
        <div class="score-circle ${getScoreLevel(data.summary)}">
          <div class="score-percentage">${calculateOverallScore(data.summary)}%</div>
        </div>
        <div class="score-label">Webflow Way Compliance</div>
      </div>
    </div>

    <!-- Category Results with Enhanced Details -->
    ${(() => {
      console.log('🎨 Rendering categories in UI. Total categories:', data.categories.length);
      console.log('📋 Category names:', data.categories.map(cat => cat.category));
      return data.categories.map((cat, idx) => createCategoryHTML(cat, idx, data.collectedData)).join('');
    })()}

    <!-- Webflow Way Guidelines Reference -->
    <div class="guidelines-reference">
      <div class="reference-header">
        <h3>📚 Webflow Way Guidelines</h3>
        <p>This validation follows official Webflow Way best practices for template submission and design system consistency.</p>
      </div>
      <div class="reference-links">
        <div class="reference-link">
          <strong>Template Requirements:</strong> Use variables, components, and semantic naming
        </div>
        <div class="reference-link">
          <strong>Design System:</strong> Consistent typography, organized classes, proper hierarchy
        </div>
        <div class="reference-link">
          <strong>Performance:</strong> Optimized assets (≤150KB), modern formats, clean code
        </div>
        <div class="reference-link">
          <strong>SEO & Accessibility:</strong> Semantic HTML, alt text, proper meta tags
        </div>
      </div>
    </div>

      <!-- Action Items Summary -->
      ${createActionItemsHTML(data.summary)}
    </div>

    <!-- Error Checklist Tab Content -->
    <div id="checklist-tab" class="tab-content">
      ${createErrorChecklistHTML(data)}
    </div>
  `;

  resultsDisplay.innerHTML = resultsHTML;
  resultsDisplay.style.display = 'block';
  resultsDisplay.classList.add('show');

  // Initialize tab functionality
  initializeTabs();

  // Reset the explicit refresh flag AFTER rendering
  console.log('Resetting isExplicitRefresh to false after rendering');
  isExplicitRefresh = false;
}

function createCategoryHTML(cat: CategoryResult, idx: number, collectedData?: any[]): string {
  const status = getCategoryStatus(cat);
  return `
    <div class="category-section ${idx === 0 ? 'first' : ''}">
      <div class="category-header">
        <h3 class="category-title">${cat.category}</h3>
        <div class="category-status ${status.className}">
          ${status.label}
        </div>
        ${cat.stats ? `<span class="category-stats">${formatCategoryStats(cat.stats)}</span>` : ''}
      </div>

      ${cat.issues.length > 0 ? createIssuesHTML(cat.issues) : createSuccessHTML()}

      ${cat.stats ? createMetadataHTML(cat.category, cat.stats) : ''}
      ${createDataCollectedSection(cat.category, collectedData)}
    </div>
  `;
}


function createIssuesHTML(issues: ValidationIssue[]): string {
  return `
    <div class="issues-list">
      ${issues.map(issue => createIssueHTML(issue)).join('')}
    </div>
  `;
}

function createIssueHTML(issue: ValidationIssue): string {
  const howToFix = getIssueHowToFix(issue);
  const location = getIssueLocation(issue);
  const policy = getIssuePolicy(issue);
  return `
    <div class="issue-item ${issue.severity}">
      <div class="issue-content">
        <span class="issue-severity ${issue.severity}">
          ${getIssueSeverityLabel(issue)}
        </span>
        <div class="issue-details">
          <div class="issue-message">${issue.message}</div>
          ${policy ? createIssuePolicyHTML(issue) : ''}
          ${howToFix ? `
            <div class="issue-fix">
              <strong>${policy ? 'Required fix:' : issue.severity === 'warning' ? 'Suggestion:' : issue.severity === 'info' ? 'Tip:' : 'How to fix:'}</strong> ${howToFix}
            </div>
          ` : ''}
          ${location ? `
            <div class="issue-location">
              <strong>Location:</strong> ${location}
            </div>
          ` : ''}
          ${createDetailsHTML(issue.details)}
        </div>
      </div>
    </div>
  `;
}

function createMarketplaceOutcomeHTML(data: ValidationResponse): string {
  const outcome = getMarketplaceOutcome(data);

  return `
    <div class="marketplace-outcome ${outcome.className}">
      <div class="marketplace-outcome-main">
        <span class="marketplace-outcome-kicker">Marketplace outcome</span>
        <div class="marketplace-outcome-title">${outcome.title}</div>
        <p class="marketplace-outcome-copy">${outcome.copy}</p>
      </div>
      <div class="marketplace-outcome-meta">
        <span class="marketplace-outcome-badge">${outcome.badge}</span>
        <span class="marketplace-outcome-time">Validated ${new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  `;
}

function getMarketplaceOutcome(data: ValidationResponse): {
  className: string;
  title: string;
  copy: string;
  badge: string;
} {
  const errors = data.summary.totalErrors || data.summary.errors || 0;
  const warnings = data.summary.totalWarnings || data.summary.warnings || 0;
  const hasRejectedPolicy = data.categories.some((category) =>
    category.issues?.some((issue) => getIssuePolicy(issue) === 'ix2-rejected')
  );

  if (hasRejectedPolicy) {
    return {
      className: 'is-rejected',
      title: 'Rejected policy detected',
      copy: 'Legacy IX2 interactions were found. Templates submitted on or after May 1, 2026 should be rejected until interactions are rebuilt with Webflow Interactions powered by GSAP.',
      badge: 'Rejected'
    };
  }

  if (errors > 0) {
    return {
      className: 'is-blocked',
      title: 'Blocked by validation errors',
      copy: 'Resolve every error-level issue, publish the site again, and re-run validation before submitting the template.',
      badge: 'Blocked'
    };
  }

  if (warnings > 0) {
    return {
      className: 'is-review',
      title: 'Needs reviewer attention',
      copy: 'No blocking errors were found, but the warnings below should be reviewed before handoff.',
      badge: 'Needs review'
    };
  }

  return {
    className: 'is-ready',
    title: 'Ready for marketplace review',
    copy: 'No blocking errors or warnings were found. Re-run validation after any Designer changes and after publishing.',
    badge: 'Ready'
  };
}

function getCategoryStatus(cat: CategoryResult): { className: string; label: string } {
  const issues = Array.isArray(cat.issues) ? cat.issues : [];
  if (issues.some((issue) => getIssuePolicy(issue))) {
    return { className: 'rejected', label: 'Rejected policy' };
  }
  if (issues.some((issue) => issue.severity === 'error')) {
    return { className: 'blocked', label: 'Blocked' };
  }
  if (issues.some((issue) => issue.severity === 'warning')) {
    return { className: 'review', label: 'Review' };
  }
  return { className: 'passed', label: 'Pass' };
}

function getIssueSeverityLabel(issue: ValidationIssue): string {
  if (getIssuePolicy(issue)) return 'Rejected policy';
  if (issue.severity === 'warning') return 'Review';
  if (issue.severity === 'info') return 'Tip';
  return 'Blocked';
}

function getIssuePolicy(issue: ValidationIssue): string | undefined {
  const policy = issue.details?.policy;
  return typeof policy === 'string' ? policy : undefined;
}

function createIssuePolicyHTML(issue: ValidationIssue): string {
  const details = issue.details;
  if (!details) return '';

  const policy = getIssuePolicy(issue);
  const effectiveDate = typeof details.effectiveDate === 'string' ? details.effectiveDate : undefined;
  const legacyIx2Count = typeof details.legacyIx2Count === 'number' ? details.legacyIx2Count : undefined;

  return `
    <div class="issue-policy">
      <div class="issue-policy-row">
        <span class="issue-policy-label">Policy</span>
        <span>${policy || 'Marketplace policy'}${effectiveDate ? `, effective ${effectiveDate}` : ''}</span>
      </div>
      ${legacyIx2Count !== undefined ? `
        <div class="issue-policy-row">
          <span class="issue-policy-label">Detected</span>
          <span>${legacyIx2Count} legacy IX2 marker${legacyIx2Count === 1 ? '' : 's'}</span>
        </div>
      ` : ''}
    </div>
  `;
}

function createDetailsHTML(details?: ValidationIssue['details']): string {
  if (!details) return '';

  let html = '';

  if (details.sample) {
    const samples = Array.isArray(details.sample) ? details.sample : [details.sample];
    html += `
      <details class="issue-sample-details">
        <summary class="issue-sample-summary">
          <strong>View ${samples.length} example${samples.length > 1 ? 's' : ''}</strong>
        </summary>
        <div class="issue-sample-list">
          ${samples.map(item => `<div class="sample-item">• ${item}</div>`).join('')}
        </div>
      </details>
    `;
  }

  if (details.violations) {
    const violations = details.violations.map((violation) => formatStructuredItem(violation));
    html += `
      <details class="issue-violations-details">
        <summary class="issue-violations-summary">
          <strong>View ${violations.length} violation${violations.length > 1 ? 's' : ''}</strong>
        </summary>
        <div class="issue-violations-list">
          ${violations.map(v => `<div class="violation-item">• ${v}</div>`).join('')}
        </div>
      </details>
    `;
  }

  if (details.locations) {
    html += `
      <details class="issue-locations-details">
        <summary class="issue-locations-summary">
          <strong>View ${details.locations.length} location${details.locations.length > 1 ? 's' : ''}</strong>
        </summary>
        <div class="issue-locations-list">
          ${details.locations.map(loc => `<div class="location-item">• ${loc}</div>`).join('')}
        </div>
      </details>
    `;
  }

  if (details.issues) {
    html += `
      <details class="issue-subitems-details">
        <summary class="issue-subitems-summary">
          <strong>View ${details.issues.length} specific issue${details.issues.length > 1 ? 's' : ''}</strong>
        </summary>
        <div class="issue-subitems-list">
          ${details.issues.map(subitem => `<div class="subitem">• ${subitem}</div>`).join('')}
        </div>
      </details>
    `;
  }

  if (details.images) {
    html += `
      <details class="issue-images-details">
        <summary class="issue-images-summary">
          <strong>View ${details.images.length} image${details.images.length > 1 ? 's' : ''} without alt text</strong>
        </summary>
        <div class="issue-images-list">
          ${details.images.map(img => `<div class="image-item">• ${img}</div>`).join('')}
        </div>
      </details>
    `;
  }

  if (details.samples) {
    html += `
      <details class="issue-samples-details">
        <summary class="issue-samples-summary">
          <strong>View samples</strong>
        </summary>
        <div class="issue-samples-list">
          ${details.samples.map(s => `<div class="sample-item">• ${s}</div>`).join('')}
        </div>
      </details>
    `;
  }

  html += createStructuredArrayDetails(details, 'pagesWithLorem', 'View affected page', formatPageListItem);
  html += createStructuredArrayDetails(details, 'affectedPages', 'View affected page', formatPageListItem);
  html += createStructuredArrayDetails(details, 'headingIssues', 'View heading issue', formatHeadingIssueItem);
  html += createStructuredArrayDetails(details, 'brokenLinks', 'View broken link', formatBrokenLinkItem);
  html += createStructuredArrayDetails(details, 'unlabeledInputs', 'View unlabeled input', formatUnlabeledInputItem);
  html += createStructuredArrayDetails(details, 'imagesWithoutAlt', 'View image missing alt text', formatImageWithoutAltItem);

  return html;
}

function getIssueHowToFix(issue: ValidationIssue): string | undefined {
  return issue.howToFix || issue.details?.howToFix;
}

function getIssueLocation(issue: ValidationIssue): string | undefined {
  return issue.location || issue.details?.location;
}

function createStructuredArrayDetails(
  details: ValidationIssue['details'],
  key: string,
  singularLabel: string,
  formatter: (item: any) => string
): string {
  const items = details?.[key];
  if (!Array.isArray(items) || items.length === 0) return '';

  return `
    <details class="issue-subitems-details">
      <summary class="issue-subitems-summary">
        <strong>${singularLabel}${items.length > 1 ? 's' : ''} (${items.length})</strong>
      </summary>
      <div class="issue-subitems-list">
        ${items.map(item => `<div class="subitem">• ${formatter(item)}</div>`).join('')}
      </div>
    </details>
  `;
}

function formatPageListItem(item: any): string {
  if (!item || typeof item !== 'object') return String(item);

  const label = item.pageName || item.page || item.title || item.name || 'Page';
  const url = item.pageUrl || item.url;
  const extras: string[] = [];

  if (typeof item.wordCount === 'number') extras.push(`${item.wordCount} words`);
  if (typeof item.contentScore === 'number') extras.push(`score ${item.contentScore}`);
  if (typeof item.totalLinks === 'number') extras.push(`${item.totalLinks} links`);
  if (typeof item.externalLinks === 'number') extras.push(`${item.externalLinks} external links`);

  const extraText = extras.length > 0 ? ` (${extras.join(', ')})` : '';
  return url ? `${label}: ${url}${extraText}` : `${label}${extraText}`;
}

function formatHeadingIssueItem(item: any): string {
  if (!item || typeof item !== 'object') return String(item);
  const page = item.page || item.title || 'Page';
  const issue = item.issue || 'Heading issue';
  return `${page}: ${issue}`;
}

function formatBrokenLinkItem(item: any): string {
  if (!item || typeof item !== 'object') return String(item);
  const page = item.page || 'Page';
  const href = item.href || 'Unknown URL';
  const text = item.text ? ` (${item.text})` : '';
  const status = item.status ? ` [${item.status}]` : '';
  const error = item.error ? ` - ${item.error}` : '';
  return `${page}: ${href}${text}${status}${error}`;
}

function formatUnlabeledInputItem(item: any): string {
  if (!item || typeof item !== 'object') return String(item);
  return [item.type, item.name, item.id, item.selector].filter(Boolean).join(' | ') || 'Unlabeled input';
}

function formatImageWithoutAltItem(item: any): string {
  if (!item || typeof item !== 'object') return String(item);
  return item.src || item.selector || item.alt || 'Image missing alt text';
}

function formatStructuredItem(item: any): string {
  if (item == null) return '';
  if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
    return String(item);
  }

  if (item.selector && item.contrastRatio) {
    return `${item.selector}: contrast ${item.contrastRatio} (required ${item.required})${item.recommendation ? ` - ${item.recommendation}` : ''}`;
  }

  if (item.description && item.element) {
    return `${item.element}: ${item.description}`;
  }

  if (item.element && item.issue) {
    return `${item.element}: ${item.issue}`;
  }

  return Object.entries(item)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
}

function createSuccessHTML(): string {
  return `
    <div class="success-message">
      ✓ All checks passed for this category
    </div>
  `;
}

function createMetadataHTML(category: string, stats: Record<string, any>): string {
  return `
    <div class="category-metadata">
      <div class="metadata-title">Category Details:</div>
      <div class="metadata-content">${formatDetailedStats(category, stats)}</div>
    </div>
  `;
}

function createActionItemsHTML(summary: ValidationResponse['summary']): string {
  const errors = summary.totalErrors || summary.errors || 0;
  const warnings = summary.totalWarnings || summary.warnings || 0;
  
  if (errors === 0 && warnings === 0) return '';

  return `
    <div class="action-items">
      <h3>🎯 Next Steps</h3>
      <div class="action-priorities">
        ${errors > 0 ? `
          <div class="action-priority error">
            <strong>1. Fix ${errors} Critical Error${errors > 1 ? 's' : ''}</strong>
            <p>Address all error-level issues before template submission</p>
          </div>
        ` : ''}
        ${warnings > 0 ? `
          <div class="action-priority warning">
            <strong>${errors > 0 ? '2' : '1'}. Review ${warnings} Warning${warnings > 1 ? 's' : ''}</strong>
            <p>Improve these areas for better Webflow Way compliance</p>
          </div>
        ` : ''}
        <div class="action-priority info">
          <strong>Re-run Validation:</strong> Use this panel again after making changes to track your progress
        </div>
      </div>
    </div>
  `;
}

function createDataCollectedSection(category: string, collectedData?: any[]): string {
  if (!collectedData || collectedData.length === 0) return '';

  const data = collectedData[0];
  if (!data) return '';

  let items: string[] = [];
  let sectionTitle = '';

  switch (category) {
    case 'Variables':
      if (data.variables?.collections) {
        sectionTitle = 'Variables Found';
        data.variables.collections.forEach((collection: any) => {
          if (collection.variables && collection.variables.length > 0) {
            items.push(`${collection.name || 'Unnamed Collection'} (${collection.variables.length} variables)`);
            collection.variables.forEach((variable: any) => {
              items.push(`  • ${variable.name || 'Unnamed'} (${variable.type || 'unknown type'})`);
            });
          }
        });
      }
      break;

    case 'Components':
      if (data.components?.length > 0) {
        sectionTitle = 'Components Found';
        items = data.components.map((comp: any) => `${comp.name || 'Unnamed'} (${comp.type || 'component'})`);
      }
      break;

    case 'Styles':
      if (data.styles?.length > 0) {
        sectionTitle = 'Classes Found';
        const sortedStyles = data.styles
          .filter((style: any) => style.name && !style.name.startsWith('_'))
          .sort((a: any, b: any) => a.name.localeCompare(b.name))
          .slice(0, 50); // Show first 50 for performance
        items = sortedStyles.map((style: any) => style.name);
        if (data.styles.length > 50) {
          items.push(`... and ${data.styles.length - 50} more classes`);
        }
      }
      break;

    case 'Typography':
    case 'Page Structure':
      if (data.pages?.length > 0) {
        sectionTitle = 'Pages Found';
        items = data.pages.map((page: any) => `${page.name || 'Unnamed'} (/${page.slug || ''})`);
      }
      break;
  }

  if (items.length === 0) return '';

  return `
    <details class="data-collected-section">
      <summary class="data-collected-summary">
        <strong>View ${sectionTitle} (${items.length})</strong>
      </summary>
      <div class="data-collected-list">
        ${items.map(item => `<div class="data-item">${item}</div>`).join('')}
      </div>
    </details>
  `;
}

// Helper Functions
function calculateOverallScore(summary: ValidationResponse['summary']): number {
  const totalCategories = summary.passedCategories + summary.failedCategories;
  if (!totalCategories) return 0;
  return Math.round((summary.passedCategories / totalCategories) * 100);
}

// Tab Management Functions
function initializeTabs(): void {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // Restore the previously active tab
  const activeTabId = getActiveTab();
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.getAttribute('data-tab');
      
      // Save the active tab
      if (tabId) {
        saveActiveTab(tabId);
      }
      
      // Remove active class from all tabs and contents
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding content
      button.classList.add('active');
      const targetContent = document.getElementById(`${tabId}-tab`);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  });
  
  // Set the initial active tab
  tabButtons.forEach(btn => btn.classList.remove('active'));
  tabContents.forEach(content => content.classList.remove('active'));
  
  const activeButton = document.querySelector(`[data-tab="${activeTabId}"]`);
  const activeContent = document.getElementById(`${activeTabId}-tab`);
  
  if (activeButton && activeContent) {
    activeButton.classList.add('active');
    activeContent.classList.add('active');
  } else {
    // Fallback to overview tab
    const overviewButton = document.querySelector('[data-tab="overview"]');
    const overviewContent = document.getElementById('overview-tab');
    if (overviewButton && overviewContent) {
      overviewButton.classList.add('active');
      overviewContent.classList.add('active');
    }
  }
}

// Error Checklist Functions
interface ErrorChecklistItem {
  id: string;
  category: string;
  message: string;
  severity: 'error';
  howToFix: string;
  location?: string;
  detailsHtml?: string;
  completed: boolean;
}

function getErrorChecklistKey(): string {
  return 'webflow_validator_errors';
}

function saveErrorChecklist(errors: ErrorChecklistItem[]): void {
  const data = {
    errors,
    timestamp: Date.now()
  };
  localStorage.setItem(getErrorChecklistKey(), JSON.stringify(data));
}

function loadErrorChecklist(): ErrorChecklistItem[] {
  try {
    const saved = localStorage.getItem(getErrorChecklistKey());
    if (saved) {
      const data = JSON.parse(saved);
      return data.errors || [];
    }
  } catch (error) {
    console.warn('Error loading checklist:', error);
  }
  return [];
}

function toggleErrorCompleted(errorId: string): void {
  const savedErrors = loadErrorChecklist();
  const updated = savedErrors.map(error => 
    error.id === errorId ? { ...error, completed: !error.completed } : error
  );
  saveErrorChecklist(updated);
  
  // Immediately update the DOM for visual feedback
  const checklistItem = document.querySelector(`[data-error-id="${errorId}"]`);
  if (checklistItem) {
    const checkbox = checklistItem.querySelector('.wf-checkbox');
    const errorMessage = checklistItem.querySelector('.error-message');
    const updatedError = updated.find(e => e.id === errorId);
    
    if (checkbox && errorMessage && updatedError) {
      if (updatedError.completed) {
        checkbox.classList.remove('unchecked');
        checkbox.classList.add('checked');
        checkbox.innerHTML = '<span class="check-icon">✓</span>';
        errorMessage.classList.add('completed');
        checklistItem.classList.add('completed');
      } else {
        checkbox.classList.remove('checked');
        checkbox.classList.add('unchecked');
        checkbox.innerHTML = '';
        errorMessage.classList.remove('completed');
        checklistItem.classList.remove('completed');
      }
    }
  }
  
  // Update progress bar
  updateProgressDisplay();
}

function createErrorChecklistHTML(data: ValidationResponse): string {
  // Get all error-level issues from categories
  const allErrors: ErrorChecklistItem[] = [];
  
  data.categories.forEach(category => {
    if (category.issues) {
      category.issues.forEach(issue => {
        if (issue.severity === 'error') {
          allErrors.push({
            id: `${category.category}_${issue.id}`,
            category: category.category,
            message: issue.message,
            severity: 'error',
            howToFix: getIssueHowToFix(issue) || 'No fix instructions available',
            location: getIssueLocation(issue),
            detailsHtml: createDetailsHTML(issue.details),
            completed: false
          });
        }
      });
    }
  });

  // Smart merge logic:
  // 1. Preserve checked status for errors user is working on
  // 2. But if user explicitly clicked "Refresh Validation" and error still exists, uncheck it
  // 3. Remove errors that were actually resolved (no longer appear)
  const savedErrors = loadErrorChecklist();
  
  console.log('Creating error checklist, isExplicitRefresh:', isExplicitRefresh);
  console.log('Saved errors:', savedErrors);
  console.log('Current errors:', allErrors.length);

  const mergedErrors = allErrors.map(error => {
    const saved = savedErrors.find(s => s.id === error.id);
    if (saved) {
      // If user explicitly refreshed and error still exists, uncheck it (wasn't actually fixed)
      const shouldUncheck = isExplicitRefresh;
      console.log(`Error ${error.id}: saved.completed=${saved.completed}, isExplicitRefresh=${isExplicitRefresh}, setting to: ${shouldUncheck ? false : saved.completed}`);
      return {
        ...error,
        completed: isExplicitRefresh ? false : saved.completed
      };
    }
    return error;
  });

  // Clean up: remove errors that no longer exist (actually resolved)
  const currentErrorIds = new Set(allErrors.map(e => e.id));
  
  // Save updated checklist
  saveErrorChecklist(mergedErrors);

  const completedCount = mergedErrors.filter(e => e.completed).length;
  const totalCount = mergedErrors.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (totalCount === 0) {
    return `
      <div class="checklist-empty">
        <div class="empty-state">
          <div class="empty-icon">✅</div>
          <h3>No Errors Found!</h3>
          <p>Your project has no critical errors that need to be fixed.</p>
        </div>
      </div>
    `;
  }

  // Group errors by category
  const errorsByCategory: { [key: string]: ErrorChecklistItem[] } = {};
  mergedErrors.forEach(error => {
    if (!errorsByCategory[error.category]) {
      errorsByCategory[error.category] = [];
    }
    errorsByCategory[error.category].push(error);
  });

  return `
    <div class="error-checklist">
      <div class="checklist-header">
        <div class="checklist-title">
          <h3>🎯 Error Resolution Checklist</h3>
          <div class="checklist-progress">
            <span class="progress-text">${completedCount} of ${totalCount} completed (${progressPercent}%)</span>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progressPercent}%"></div>
            </div>
          </div>
        </div>
        <button class="resync-button" onclick="resyncValidation()">
          <span>🔄</span> Refresh Validation
        </button>
      </div>
      
      ${Object.entries(errorsByCategory).map(([categoryName, errors]) => `
        <div class="checklist-category">
          <h4 class="category-name">${categoryName}</h4>
          <div class="checklist-items">
            ${errors.map(error => `
              <div class="checklist-item ${error.completed ? 'completed' : ''}" data-error-id="${error.id}">
                <div class="error-content">
                  <div class="error-message ${error.completed ? 'completed' : ''}">${error.message}</div>
                  <div class="error-fix">💡 ${error.howToFix}</div>
                  ${error.location ? `<div class="error-fix">📍 ${error.location}</div>` : ''}
                  ${error.detailsHtml || ''}
                </div>
                <div class="checkbox-wrapper" onclick="toggleErrorCompleted('${error.id}')">
                  <div class="wf-checkbox ${error.completed ? 'checked' : 'unchecked'}">
                    ${error.completed ? '<span class="check-icon">✓</span>' : ''}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function updateProgressDisplay(): void {
  const savedErrors = loadErrorChecklist();
  const completedCount = savedErrors.filter(e => e.completed).length;
  const totalCount = savedErrors.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  
  // Update progress text
  const progressText = document.querySelector('.progress-text');
  if (progressText) {
    progressText.textContent = `${completedCount} of ${totalCount} completed (${progressPercent}%)`;
  }
  
  // Update progress bar
  const progressFill = document.querySelector('.progress-fill') as HTMLElement;
  if (progressFill) {
    progressFill.style.width = `${progressPercent}%`;
  }
}

function updateChecklistDisplay(): void {
  const checklistTab = document.getElementById('checklist-tab');
  if (checklistTab && checklistTab.classList.contains('active')) {
    // Re-render checklist if currently visible
    const validateBtn = document.getElementById('validate-btn') as HTMLButtonElement;
    if (validateBtn && !validateBtn.disabled) {
      // Trigger a refresh of the current validation data
      console.log('Updating checklist display...');
    }
  }
}

// Tab state management
function saveActiveTab(tabId: string): void {
  localStorage.setItem('webflow_validator_active_tab', tabId);
}

function getActiveTab(): string {
  // Only restore the tab if we're doing an explicit refresh, otherwise default to overview
  if (isExplicitRefresh) {
    return localStorage.getItem('webflow_validator_active_tab') || 'overview';
  }
  return 'overview';
}

// Flag to track when user explicitly triggers refresh
let isExplicitRefresh = false;

// Make functions globally available
(window as any).toggleErrorCompleted = toggleErrorCompleted;
(window as any).resyncValidation = () => {
  console.log('resyncValidation called, setting isExplicitRefresh = true');
  isExplicitRefresh = true;
  const validateBtn = document.getElementById('validate-btn') as HTMLButtonElement;
  if (validateBtn) {
    console.log('Clicking validate button...');
    validateBtn.click();
  }
};

function getScoreLevel(summary: ValidationResponse['summary']): string {
  const score = calculateOverallScore(summary);
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'needs-improvement';
  return 'poor';
}

function getScoreDescription(summary: ValidationResponse['summary']): string {
  const score = calculateOverallScore(summary);
  if (score >= 90) return 'Excellent Webflow Way compliance!';
  if (score >= 75) return 'Good compliance, minor improvements needed';
  if (score >= 60) return 'Improvements needed to meet standards';
  return 'Significant improvements required for compliance';
}

function formatCategoryStats(stats: Record<string, any>): string {
  const statPairs = Object.entries(stats)
    .filter(([key, value]) => typeof value === 'number' && key.startsWith('total'))
    .map(([key, value]) => `${value} ${key.replace('total', '').toLowerCase()}`);

  return statPairs.length > 0 ? `(${statPairs.join(', ')})` : '';
}

function formatDetailedStats(category: string, stats: Record<string, any>): string {
  const details: string[] = [];

  switch (category) {
    case 'Variables':
      if (stats.totalCollections !== undefined) details.push(`${stats.totalCollections} collections`);
      if (stats.totalVariables !== undefined) details.push(`${stats.totalVariables} variables`);
      if (stats.hasOrganizedCollections !== undefined) details.push(`Organized: ${stats.hasOrganizedCollections ? 'Yes' : 'No'}`);
      if (stats.hasOrderedRamps !== undefined) details.push(`Color ramps: ${stats.hasOrderedRamps ? 'Yes' : 'No'}`);
      break;

    case 'Components':
      if (stats.totalComponents !== undefined) details.push(`${stats.totalComponents} components`);
      if (stats.navComponents !== undefined) details.push(`${stats.navComponents} navigation`);
      if (stats.footerComponents !== undefined) details.push(`${stats.footerComponents} footer`);
      if (stats.ctaComponents !== undefined) details.push(`${stats.ctaComponents} CTA`);
      break;

    case 'Styles':
      if (stats.totalClasses !== undefined) details.push(`${stats.totalClasses} classes`);
      if (stats.hasTypographyClasses !== undefined) details.push(`Typography: ${stats.hasTypographyClasses ? 'Yes' : 'No'}`);
      if (stats.hasHtmlTagStyles !== undefined) details.push(`HTML baseline: ${stats.hasHtmlTagStyles ? 'Yes' : 'No'}`);
      break;

    case 'Design System':
      if (stats.totalVariables !== undefined) details.push(`${stats.totalVariables} variables`);
      if (stats.withTitleCase !== undefined) details.push(`${stats.withTitleCase} with Title Case`);
      if (stats.hasColorVars !== undefined) details.push(`Color vars: ${stats.hasColorVars ? 'Yes' : 'No'}`);
      if (stats.hasTypographyVars !== undefined) details.push(`Typography vars: ${stats.hasTypographyVars ? 'Yes' : 'No'}`);
      if (stats.hasSpacingVars !== undefined) details.push(`Spacing vars: ${stats.hasSpacingVars ? 'Yes' : 'No'}`);
      break;

    case 'Component Architecture':
      if (stats.totalComponents !== undefined) details.push(`${stats.totalComponents} components`);
      if (stats.requiredComponents !== undefined) details.push(`${stats.requiredComponents.found}/${stats.requiredComponents.total} required found`);
      if (stats.componentsWithTitleCase !== undefined) details.push(`${stats.componentsWithTitleCase} with Title Case`);
      break;

    case 'Style System':
      if (stats.totalStyles !== undefined) details.push(`${stats.totalStyles} styles`);
      if (stats.htmlTagStyles !== undefined) details.push(`${stats.htmlTagStyles.found}/${stats.htmlTagStyles.required} HTML tag styles`);
      if (stats.stylesWithVariables !== undefined) details.push(`${stats.stylesWithVariables} using variables`);
      if (stats.variableUsagePercent !== undefined) details.push(`${stats.variableUsagePercent}% variable usage`);
      break;

    case 'Interactions and GSAP': {
      const analysisComplete = stats.analysisComplete !== false && stats.analysisStatus !== 'failed';
      const legacyIx2State =
        stats.legacyIx2Detected === true
          ? 'Detected'
          : stats.legacyIx2Detected === false
          ? 'Not detected'
          : 'Not verified';

      details.push(`Analysis: ${analysisComplete ? (stats.analysisStatus === 'partial' ? 'Partially verified' : 'Verified') : 'Not verified'}`);
      details.push(`Legacy IX2: ${legacyIx2State}`);
      if (typeof stats.legacyIx2Count === 'number') details.push(`${stats.legacyIx2Count} legacy IX2 marker${stats.legacyIx2Count === 1 ? '' : 's'}`);
      if (typeof stats.pagesRequested === 'number') details.push(`${stats.pagesRequested} page${stats.pagesRequested === 1 ? '' : 's'} requested`);
      if (typeof stats.pagesAnalyzed === 'number') details.push(`${stats.pagesAnalyzed} page${stats.pagesAnalyzed === 1 ? '' : 's'} analyzed`);
      if (typeof stats.pagesFailed === 'number' && stats.pagesFailed > 0) details.push(`${stats.pagesFailed} page${stats.pagesFailed === 1 ? '' : 's'} not checked`);
      if (typeof stats.pagesSkipped === 'number' && stats.pagesSkipped > 0) details.push(`${stats.pagesSkipped} internal CMS template page${stats.pagesSkipped === 1 ? '' : 's'} skipped`);
      if (typeof stats.pagesWithLegacyIx2 === 'number') details.push(`${stats.pagesWithLegacyIx2} page${stats.pagesWithLegacyIx2 === 1 ? '' : 's'} with IX2`);
      if (typeof stats.errorMessage === 'string') details.push(stats.errorMessage);
      break;
    }

    default:
      // Generic formatting
      Object.entries(stats).forEach(([key, value]) => {
        if (typeof value === 'number') {
          details.push(`${key}: ${value}`);
        } else if (typeof value === 'boolean') {
          details.push(`${key}: ${value ? 'Yes' : 'No'}`);
        }
      });
  }

  return details.length > 0 ? details.join(', ') : 'No detailed stats available';
}
