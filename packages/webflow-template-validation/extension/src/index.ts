// Webflow Way Validator Extension - TypeScript Implementation
// Enhanced validation with detailed, collapsible reporting

import {
  EXTENSION_VERSION,
  buildValidationSubmitPayload,
  escapeHtml,
  decodeCommonHtmlEntities,
  ensureHttps,
  filterRetiredAccessibilityIssues,
  getSlugPathname,
  isInternalCmsTemplateSlug,
  isHtmlTagStyleName,
  normalizeSiteInfo,
  selectValidationDomain,
  type SiteDomainInfo,
  type NormalizedSiteInfo,
} from './utils';
import { buildReportMarkdown as buildReportMarkdownPure, type ReportInput } from './report';

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

// Last completed run, kept for the copy-report action and restored-run display
let lastValidationReport: {
  data: ValidationResponse;
  correlationId: string | null;
  generatedAt: string;
  restored: boolean;
} | null = null;

// Canvas elements referenced by rendered issues, so "Select on canvas"
// buttons can call webflow.setSelectedElement with the original object
const canvasElementRegistry = new Map<string, AnyElement>();

const LAST_RUN_STORAGE_KEY = 'webflow_validator_last_run';

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
  policyVersion?: string;
  homepageSurfaceHash?: string;
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
      modes?: Array<{
        id: string;
        name: string;
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
  canvasChecks?: CanvasAccessibilityResult;
  siteInfo?: NormalizedSiteInfo;
  designerContext?: DesignerContext;
  validationScope?: ValidationScope;
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
      pagesNotTitleCase: string[];
      pagesWithMismatchedSlugs: string[];
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

interface DesignerContext {
  mode: string | null;
  capabilities: Record<string, boolean>;
  canAccessCanvas?: boolean;
  canDesign?: boolean;
  canEdit?: boolean;
  message?: string;
}

interface ValidationScope {
  siteUrl: string | null;
  domainSource: string;
  domainStage?: string;
  domainLastPublished?: string | null;
  domainDefault?: boolean;
  isPasswordProtected?: boolean;
  isPrivateStaging?: boolean;
  pageScope: 'all' | 'current';
  pageSlugsCount: number;
  skippedCmsTemplateSlugs: string[];
  selectedChecks: string[];
  publishedChecks: 'full' | 'designer-only';
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
  const copyBtn = document.getElementById('bridge-copy-btn');
  installBtn?.addEventListener('click', () => installBridge());
  rotateBtn?.addEventListener('click', () => rotateBridgeToken());
  recheckBtn?.addEventListener('click', () => refreshBridgeStatus());
  copyBtn?.addEventListener('click', () => void copyBridgeSnippetFromCurrentStatus());

  void bootstrapBridgePanel();
  void fetchWorkerVersion();
  restoreLastValidationReport();
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
    const webflow = (window as unknown as { webflow?: WebflowApi }).webflow;
    if (!webflow) {
      throw new Error('Webflow Designer API not available. Please ensure this extension is running in Webflow Designer.');
    }

    // Collect project data via Designer API
    const projectData = await collectProjectData(webflow);
    const designerContext = await collectDesignerContext(webflow);
    projectData.designerContext = designerContext;
    projectData.canvasChecks = await collectCanvasAccessibility(webflow, designerContext.canAccessCanvas);
    if (designerContext.message) {
      setToolbarStatus(designerContext.message, designerContext.canAccessCanvas === false ? 'warning' : 'neutral');
    }
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

    // Get site URL for Worker validation
    const siteUrl = await getSiteUrl(webflow);
    const pageSlugScope = getPageSlugScope(projectData);
    const selectedChecks = getSelectedChecks();
    if (bridgeContext) {
      bridgeContext = {
        ...bridgeContext,
        siteUrl: siteUrl || bridgeContext.siteUrl,
      };
    }
    projectData.validationScope = buildValidationScope({
      projectData,
      siteUrl,
      pageSlugScope,
      selectedChecks,
      publishedChecks: bridgeStatus && bridgeStatus.status === 'active' ? 'full' : 'designer-only',
    });

    // Update meta display
    const projectLabel = projectData?.siteInfo?.name || 'Designer Project';
    updateMetaDisplay(projectLabel, projectData);

    console.log('Final site URL for Worker:', siteUrl);

    if (siteUrl) {
      console.log('Will call Worker with URL:', siteUrl);
      console.log('Page slugs to analyze:', pageSlugScope.pageSlugs);
    } else {
      console.warn('No site URL available - Worker validation will be skipped');
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
      registerValidationReport(designerResults, correlationId);
      showResults(designerResults);
      void notifyDesigner(webflow, 'Info', 'Designer checks complete. Add and publish the Validator script for full submission validation.');
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
      pageSlugs: pageSlugScope.pageSlugs,
      correlationId,
    });

    // Add collected data for detailed display
    validationResults.collectedData = [projectData];

    // Enhance results with client-side validation
    enhanceValidationResults(validationResults, projectData);

    registerValidationReport(validationResults, correlationId);
    showResults(validationResults);
    void notifyValidationOutcome(webflow, validationResults);
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
    void notifyDesigner((window as unknown as { webflow?: WebflowApi }).webflow, 'Error', message);
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
  return getPageSlugScope(projectData).pageSlugs;
}

function getPageSlugScope(projectData: ProjectData): {
  pageSlugs: string[];
  skippedCmsTemplateSlugs: string[];
} {
  const slugs: string[] = [];
  const seen = new Set<string>();
  const skippedCmsTemplateSlugs: string[] = [];
  const skippedDraftSlugs: string[] = [];

  if (projectData.pages && projectData.pages.length > 0) {
    projectData.pages.forEach((page: any) => {
      const primaryPath = getFirstUsablePagePath(page);
      if (!primaryPath) return;

      const pathname = getSlugPathname(primaryPath);
      if (isCollectionTemplatePage(page, pathname)) {
        skippedCmsTemplateSlugs.push(pathname);
        return;
      }

      // Draft pages are not published — fetching them would validate 404s
      if (page.isDraft) {
        skippedDraftSlugs.push(pathname);
        return;
      }

      if (!seen.has(pathname)) {
        seen.add(pathname);
        slugs.push(pathname);
      }
    });
  }

  if (skippedDraftSlugs.length > 0) {
    console.log(
      `Skipped ${skippedDraftSlugs.length} draft pages for published-site validation:`,
      skippedDraftSlugs
    );
  }

  if (skippedCmsTemplateSlugs.length > 0) {
    console.log(
      `Skipped ${skippedCmsTemplateSlugs.length} internal CMS template slugs for published-site validation:`,
      skippedCmsTemplateSlugs
    );
  }
  console.log(`Extracted ${slugs.length} page slugs for enhanced validation:`, slugs);
  return {
    pageSlugs: slugs,
    skippedCmsTemplateSlugs,
  };
}

async function collectDesignerContext(webflow: WebflowApi): Promise<DesignerContext> {
  const context: DesignerContext = {
    mode: null,
    capabilities: {},
  };

  try {
    if (typeof webflow.getCurrentMode === 'function') {
      context.mode = await webflow.getCurrentMode();
    }
  } catch (error) {
    console.warn('Could not get Designer mode:', error);
  }

  try {
    const appModes = webflow.appModes || {};
    const capabilityKeys: Array<keyof typeof appModes> = [
      'canAccessCanvas',
      'canDesign',
      'canEdit',
      'canAccessAssets',
      'canManageAssets',
    ];
    const requestedCapabilities = capabilityKeys
      .map((key) => appModes[key])
      .filter(Boolean);

    if (typeof webflow.canForAppMode === 'function' && requestedCapabilities.length > 0) {
      context.capabilities = await webflow.canForAppMode(requestedCapabilities);
      context.canAccessCanvas = readCapability(context.capabilities, 'canAccessCanvas');
      context.canDesign = readCapability(context.capabilities, 'canDesign');
      context.canEdit = readCapability(context.capabilities, 'canEdit');
    }
  } catch (error) {
    console.warn('Could not get Designer capabilities:', error);
  }

  if (context.canAccessCanvas === false) {
    context.message = 'Limited Designer access in this mode';
  } else if (context.mode) {
    context.message = `Designer mode: ${formatModeName(context.mode)}`;
  }

  return context;
}

function readCapability(capabilities: Record<string, boolean>, key: string): boolean | undefined {
  if (typeof capabilities[key] === 'boolean') return capabilities[key];
  const matchingEntry = Object.entries(capabilities).find(([capabilityKey]) => capabilityKey.endsWith(key));
  return typeof matchingEntry?.[1] === 'boolean' ? matchingEntry[1] : undefined;
}

function formatModeName(value: string): string {
  return value
    .replace(/^can/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function buildValidationScope({
  projectData,
  siteUrl,
  pageSlugScope,
  selectedChecks,
  publishedChecks,
}: {
  projectData: ProjectData;
  siteUrl: string | null;
  pageSlugScope: { pageSlugs: string[]; skippedCmsTemplateSlugs: string[] };
  selectedChecks: string[];
  publishedChecks: 'full' | 'designer-only';
}): ValidationScope {
  const domainSelection = selectValidationDomain(projectData.siteInfo);

  return {
    siteUrl,
    domainSource: domainSelection.source,
    domainStage: domainSelection.domain?.stage,
    domainLastPublished: domainSelection.domain?.lastPublished || null,
    domainDefault: domainSelection.domain?.default,
    isPasswordProtected: projectData.siteInfo?.isPasswordProtected,
    isPrivateStaging: projectData.siteInfo?.isPrivateStaging,
    pageScope: isOptionEnabled('opt-page-scope-current', false) ? 'current' : 'all',
    pageSlugsCount: pageSlugScope.pageSlugs.length,
    skippedCmsTemplateSlugs: pageSlugScope.skippedCmsTemplateSlugs,
    selectedChecks,
    publishedChecks,
  };
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

function isCollectionTemplatePage(page: {
  publishPath?: string | null;
  path?: string | null;
  slug?: string | null;
  isCmsTemplate?: boolean;
  collectionId?: string | null;
  collectionName?: string | null;
}, pathname: string): boolean {
  return Boolean(
    page.isCmsTemplate ||
    page.collectionId ||
    page.collectionName ||
    isInternalCmsTemplateSlug(pathname) ||
    (page.publishPath && isInternalCmsTemplateSlug(page.publishPath)) ||
    (page.path && isInternalCmsTemplateSlug(page.path)) ||
    (page.slug && isInternalCmsTemplateSlug(page.slug))
  );
}




// Ensure URL has HTTPS protocol

// Get site URL for Worker validation
async function getSiteUrl(webflow: WebflowApi): Promise<string | null> {
  try {
    console.log('Getting site URL for enhanced validation...');

    // Use the correct getSiteInfo API
    if (webflow.getSiteInfo) {
      const siteInfo = await webflow.getSiteInfo();
      console.log('Site info received:', {
        siteId: siteInfo.siteId,
        siteName: siteInfo.siteName,
        shortName: siteInfo.shortName,
        domainsCount: siteInfo.domains?.length || 0
      });

      const selection = selectValidationDomain(normalizeSiteInfo(siteInfo));
      if (selection.url) {
        console.log(`Using ${selection.source}:`, selection.url);
        return ensureHttps(selection.url);
      }
    }

    console.warn('Could not determine site URL for enhanced validation');
    return null;
  } catch (error) {
    console.error('Error getting site URL:', error);
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

  const webflow = (window as unknown as { webflow?: WebflowApi }).webflow;
  if (!webflow) {
    setBridgeBadge('neutral');
    setBridgeMessage('Webflow Designer API unavailable. Validator script setup is disabled.');
    setBridgeActionsDisabled(true);
    return;
  }

  try {
    const siteInfo = await webflow.getSiteInfo?.();
    const siteId = siteInfo?.siteId || null;
    const siteName = siteInfo?.siteName || 'Webflow Site';
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
  setToolbarStatus('Checking script...', 'neutral');
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
  setBridgeMessage('Preparing the Validator script for this site...');
  setBridgeSetupStep('install');
  setToolbarStatus('Preparing Validator script...', 'neutral');
  try {
    const correlationId = createCorrelationId();

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
          mode: 'manual-fallback',
        }),
      },
      { timeoutMs: NETWORK_TIMEOUT_MS, retries: MAX_NETWORK_RETRIES }
    );

    bridgeStatus = {
      ...installStatus,
      status: installStatus.status === 'active' ? 'pending_manual' : installStatus.status,
      installed: false,
      message: 'Validator script ready. Paste it in site Head code, publish, then re-check.',
    };
    renderBridgeStatus(bridgeStatus);
    openBridgeSnippet();
    const copied = await copyBridgeSnippet(bridgeStatus);
    if (copied) {
      setBridgeMessage('Validator script copied. Paste it in site Head code, publish, then re-check.');
      setToolbarStatus('Validator script copied; publish then re-check', 'warning');
      void notifyDesigner(
        (window as unknown as { webflow?: WebflowApi }).webflow,
        'Info',
        'Validator script copied. Paste it in Site Settings > Custom Code > Head code, publish, then re-check.'
      );
    } else {
      setBridgeMessage('Validator script ready below. Copy it, paste it in site Head code, publish, then re-check.');
      setToolbarStatus('Validator script ready to copy', 'warning');
      void notifyDesigner(
        (window as unknown as { webflow?: WebflowApi }).webflow,
        'Info',
        'Validator script is ready below. Copy it into Site Settings > Custom Code > Head code, publish, then re-check.'
      );
    }
  } catch (error) {
    console.warn('Bridge install failed:', error);
    setBridgeBadge('failed');
    setBridgeMessage(
      'Could not prepare the Validator script. Try again, then publish and re-check.'
    );
    setBridgeSetupStep('install');
    setToolbarStatus('Validator script setup failed', 'failed');
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
  const copyBtn = document.getElementById('bridge-copy-btn') as HTMLButtonElement | null;
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
      if (status.bridgeToken) snippetWrap.open = true;
      if (copyBtn) copyBtn.disabled = false;
    } else {
      snippetWrap.style.display = 'none';
      snippetCode.textContent = '';
      snippetWrap.open = false;
      if (copyBtn) copyBtn.disabled = true;
    }
  }
}

function setBridgeActionsDisabled(disabled: boolean): void {
  const ids = ['bridge-install-btn', 'bridge-rotate-btn', 'bridge-recheck-btn', 'bridge-copy-btn'];
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
    return 'Copy the Validator script, paste it in Site Settings > Custom Code > Head code, publish, then re-check.';
  }
  if (status.status === 'pending_manual') {
    return 'Validator script is not detected on the published site yet. Copy it, publish, then re-check.';
  }
  return 'Validator script setup is unavailable. Try again, then publish and re-check.';
}

function openBridgeSnippet(): void {
  const snippetWrap = document.getElementById('bridge-snippet-wrap') as HTMLDetailsElement | null;
  if (snippetWrap) snippetWrap.open = true;
}

async function copyBridgeSnippetFromCurrentStatus(): Promise<void> {
  const copied = await copyBridgeSnippet(bridgeStatus);
  if (copied) {
    setBridgeMessage('Validator script copied. Paste it in site Head code, publish, then re-check.');
    setToolbarStatus('Validator script copied; publish then re-check', 'warning');
    void notifyDesigner((window as unknown as { webflow?: WebflowApi }).webflow, 'Info', 'Validator script copied.');
  } else {
    setBridgeMessage('Copy failed. Select the Validator script below and copy it manually.');
    setToolbarStatus('Copy failed; manual selection needed', 'warning');
  }
}

async function copyBridgeSnippet(status: SnippetStatusResponse | null): Promise<boolean> {
  const snippet =
    typeof status?.snippet === 'string' && status.snippet.trim() ? status.snippet.trim() : '';
  if (!snippet) return false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(snippet);
      return true;
    }
  } catch (error) {
    console.warn('Clipboard API copy failed:', error);
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = snippet;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch (error) {
    console.warn('Fallback copy failed:', error);
    return false;
  }
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

async function notifyDesigner(
  webflow: WebflowApi | undefined,
  type: 'Error' | 'Info' | 'Success',
  message: string
): Promise<void> {
  try {
    if (typeof webflow?.notify === 'function') {
      await webflow.notify({ type, message });
    }
  } catch (error) {
    console.warn('Designer notification failed:', error);
  }
}

async function notifyValidationOutcome(webflow: WebflowApi | undefined, data: ValidationResponse): Promise<void> {
  const outcome = getMarketplaceOutcome(data);
  if (outcome.className === 'is-ready') {
    await notifyDesigner(webflow, 'Success', 'Validator passed. The latest result is ready for template submission.');
    return;
  }

  if (outcome.className === 'is-review') {
    await notifyDesigner(webflow, 'Info', 'Validator is ready with non-blocking warnings. Review the Overview before handoff.');
    return;
  }

  await notifyDesigner(webflow, 'Error', 'Validator is not submission-ready. Open the Fix List to resolve blocking items.');
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
    console.log('Merging enhanced validation results...');
    console.log('Enhanced results structure:', Object.keys(enhancedResults.analysis || enhancedResults || {}));
    console.log('Categories before merge:', designerResults.categories.length);

    const analysis = enhancedResults.analysis || enhancedResults;

    // Add new categories from enhanced validation
    if (analysis.assets) {
      console.log('Adding Assets & Images category');
      const hasErrors = analysis.assets.issues.filter((i: any) => i.severity === 'error').length > 0;
      designerResults.categories.push({
        category: 'Assets & Images',
        passed: !hasErrors,
        issues: analysis.assets.issues,
        stats: analysis.assets.stats
      });
    }

    if (analysis.content) {
      console.log('Adding Content & Accessibility category');
      const hasErrors = analysis.content.issues.filter((i: any) => i.severity === 'error').length > 0;
      designerResults.categories.push({
        category: 'Content & Accessibility',
        passed: !hasErrors,
        issues: analysis.content.issues,
        stats: analysis.content.stats
      });
    }

    if (analysis.accessibility) {
      console.log('Adding Accessibility & WCAG category');
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
      console.log('Adding Interactions and GSAP category');
      const hasErrors = analysis.interactions.issues.filter((i: any) => i.severity === 'error').length > 0;
      designerResults.categories.push({
        category: 'Interactions and GSAP',
        passed: !hasErrors,
        issues: analysis.interactions.issues,
        stats: analysis.interactions.stats
      });
    }

    if (analysis.customCode) {
      console.log('Adding Custom Code & Site Settings category');
      const hasErrors = analysis.customCode.issues.filter((i: any) => i.severity === 'error').length > 0;
      designerResults.categories.push({
        category: 'Custom Code & Site Settings',
        passed: !hasErrors,
        issues: analysis.customCode.issues,
        stats: analysis.customCode.stats,
        policyVersion: analysis.customCode.policyVersion,
        homepageSurfaceHash: analysis.customCode.homepageSurfaceHash
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

    console.log('Enhanced validation results merged successfully!');
    console.log('Total categories after merge:', designerResults.categories.length);
    console.log('Final category list:', designerResults.categories.map(c => c.category));
  } catch (error) {
    console.warn('Error merging enhanced validation results:', error);
  }
}

function getSurfacedAccessibilityIssues(
  accessibilityAnalysis: { issues?: ValidationIssue[] } | undefined,
  contentAnalysisIncluded: boolean
) : ValidationIssue[] {
  const issues = filterRetiredAccessibilityIssues(
    Array.isArray(accessibilityAnalysis?.issues) ? accessibilityAnalysis.issues : []
  );
  if (!contentAnalysisIncluded) {
    return issues;
  }

  const duplicateIssueIds = new Set(['missing-alt-text-critical', 'heading-structure-errors']);
  return issues.filter((issue) => !duplicateIssueIds.has(issue.id));
}

// Collect comprehensive project data from Webflow Designer APIs
interface CanvasAccessibilityResult {
  available: boolean;
  reason?: string;
  pageName?: string;
  headingsChecked: number;
  headingIssues: Array<{ issue: string; position: number; level: number; elementKey?: string }>;
  imagesChecked: number;
  imagesMissingAlt: number;
  missingAltElementKeys: string[];
}

// Canvas-accurate checks for the current page via the Designer element API.
// Unlike the published-site checks, these reflect unpublished edits — closing
// the gap where a creator fixes an issue but the published HTML still shows it.
async function collectCanvasAccessibility(
  webflow: WebflowApi,
  canAccessCanvas: boolean | undefined
): Promise<CanvasAccessibilityResult> {
  const unavailable = (reason: string): CanvasAccessibilityResult => ({
    available: false,
    reason,
    headingsChecked: 0,
    headingIssues: [],
    imagesChecked: 0,
    imagesMissingAlt: 0,
    missingAltElementKeys: [],
  });

  canvasElementRegistry.clear();

  if (canAccessCanvas === false) {
    return unavailable('Canvas access is unavailable in the current Designer mode');
  }
  if (typeof webflow.getAllElements !== 'function') {
    return unavailable('Element API unavailable in this Designer version');
  }

  try {
    const [elements, currentPage] = await Promise.all([
      webflow.getAllElements(),
      webflow.getCurrentPage(),
    ]);
    const pageName = (await currentPage?.getName?.()) || 'Current Page';

    const headingIssues: CanvasAccessibilityResult['headingIssues'] = [];
    let headingsChecked = 0;
    let lastLevel = 0;

    for (const element of elements) {
      if (element.type !== 'Heading') continue;
      let level: number | null = null;
      try {
        level = await element.getHeadingLevel();
        if (level === null) {
          const tag = await element.getTag();
          if (tag) level = parseInt(tag.substring(1), 10);
        }
      } catch {
        level = null;
      }
      if (!level) continue;

      headingsChecked++;
      if (headingsChecked === 1 && level !== 1) {
        const elementKey = `canvas-heading-${headingsChecked}`;
        canvasElementRegistry.set(elementKey, element);
        headingIssues.push({
          issue: `First heading on the canvas is H${level} — it should be H1`,
          position: headingsChecked,
          level,
          elementKey,
        });
      } else if (headingsChecked > 1 && level > lastLevel + 1) {
        const elementKey = `canvas-heading-${headingsChecked}`;
        canvasElementRegistry.set(elementKey, element);
        headingIssues.push({
          issue: `H${level} follows H${lastLevel}, skipping H${lastLevel + 1}`,
          position: headingsChecked,
          level,
          elementKey,
        });
      }
      lastLevel = level;
    }

    let imagesChecked = 0;
    let imagesMissingAlt = 0;
    const missingAltElementKeys: string[] = [];
    for (const element of elements) {
      if (element.type !== 'Image') continue;
      imagesChecked++;
      try {
        const altText = await element.getAltText();
        if (!altText || !altText.trim()) {
          imagesMissingAlt++;
          if (missingAltElementKeys.length < 10) {
            const elementKey = `canvas-image-${imagesMissingAlt}`;
            canvasElementRegistry.set(elementKey, element);
            missingAltElementKeys.push(elementKey);
          }
        }
      } catch {
        // Ignore unreadable images rather than miscounting them
        imagesChecked--;
      }
    }

    return {
      available: true,
      pageName,
      headingsChecked,
      headingIssues,
      imagesChecked,
      imagesMissingAlt,
      missingAltElementKeys,
    };
  } catch (error) {
    console.warn('Canvas accessibility collection failed:', error);
    return unavailable(error instanceof Error ? error.message : 'Canvas analysis failed');
  }
}


// Webflow displays tag selectors as e.g. "All H1 Headings", "All Paragraphs",
// "All Links", "Body (All Pages)"


// Breadth-first walk of a component's element tree looking for a nested
// component instance. Depth-capped: nesting evidence is always near the root,
// and unbounded canvas traversal is expensive in the Designer.
async function componentContainsComponentInstance(
  component: Component,
  maxDepth = 4
): Promise<boolean> {
  const root = await component.getRootElement();
  if (!root) return false;

  let frontier: AnyElement[] = [root];
  for (let depth = 0; depth < maxDepth && frontier.length > 0; depth++) {
    const next: AnyElement[] = [];
    for (const element of frontier) {
      if (element.type === 'ComponentInstance') return true;
      if ('children' in element && element.children) {
        next.push(...(await element.getChildren()));
      }
    }
    frontier = next;
  }
  return false;
}

async function collectProjectData(webflow: WebflowApi): Promise<ProjectData> {
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
        hasMatchingSlugs: false,
        pagesNotTitleCase: [],
        pagesWithMismatchedSlugs: []
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
      let totalVariableModes = 0;

      for (const collection of collections) {
        try {
          const collectionName = (await collection.getName()) || 'Unnamed Collection';
          const variables = await collection.getAllVariables();
          const variableList: any[] = [];
          const modeList: Array<{ id: string; name: string }> = [];
          let modeDataAvailable = false;

          for (const variable of variables) {
            try {
              const variableName = (await variable.getName()) || null;
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
              
              // Variables expose values via get(), not a .value property
              let variableValue: unknown = null;
              try {
                variableValue = await variable.get();
              } catch {
                variableValue = null;
              }

              variableList.push({
                id: variable.id,
                name: variableName,
                type: variableType,
                value: variableValue ?? null
              });
            } catch (variableError) {
              console.warn('Error processing variable:', variableError);
              if (variable.id) {
                variableList.push({
                  id: variable.id,
                  name: null,
                  type: variable.type || null,
                  value: null
                });
              }
            }
          }

          try {
            // getAllVariableModes may be absent on older Designer runtimes
            const modes = typeof collection.getAllVariableModes === 'function'
              ? await collection.getAllVariableModes()
              : undefined;

            if (Array.isArray(modes)) {
              modeDataAvailable = true;

              for (const mode of modes) {
                try {
                  const modeName = (await mode.getName()) || mode.id || 'Unnamed Mode';

                  modeList.push({
                    id: String(mode.id),
                    name: String(modeName)
                  });
                } catch (modeError) {
                  console.warn('Error processing variable mode:', modeError);
                }
              }
            }
          } catch (modeCollectionError) {
            console.warn(`Error processing variable modes for collection "${collectionName}":`, modeCollectionError);
            data.collectionWarnings!.push({
              source: 'Variable Modes',
              message: `Failed to collect variable modes for ${collectionName}`,
              error: modeCollectionError instanceof Error ? modeCollectionError.message : String(modeCollectionError)
            });
          }

          const collectionPayload: any = {
            id: collection.id,
            name: collectionName,
            variables: variableList,
            variableCount: variableList.length
          };

          if (modeDataAvailable) {
            collectionPayload.modes = modeList;
            totalVariableModes += modeList.length;
          }

          variableData.push(collectionPayload);

          totalVariables += variableList.length;
          console.log(`Variables in collection "${collectionName}": ${variableList.length}, Modes: ${modeDataAvailable ? modeList.length : 'unavailable'}`);

        } catch (collectionError) {
          console.warn('Error processing variable collection:', collectionError);
        }
      }

      if (variableData.length > 0) {
        data.variables = { collections: variableData };
        data.collectionMetadata!.variableCollections = variableData.length;
        data.collectionMetadata!.totalVariables = totalVariables;
        data.collectionMetadata!.totalVariableModes = totalVariableModes;
        console.log(`Variable collections collected: ${variableData.length}, Total variables: ${totalVariables}, Total modes: ${totalVariableModes}`);
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
          const name = (await component.getName()) || null;
          const id = component.id;

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

            try {
              // getInstanceCount may be absent on older Designer runtimes
              if (typeof component.getInstanceCount === 'function') {
                instances = await component.getInstanceCount();
              }

              // A component is "nested" when its tree contains another component instance
              isNested = await componentContainsComponentInstance(component);
              if (isNested) {
                data.enhancedValidation!.componentArchitecture.hasNestedComponents = true;
              }
            } catch (nestedError) {
              console.warn('Error analyzing component nesting:', nestedError);
            }

            componentData.push({
              id: id,
              name: name,
              type: 'component',
              instances: instances,
              isNested: isNested
            });
          }
        } catch (compError) {
          console.warn('Error processing component:', compError);
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
          const name = (await style.getName()) || null;
          const id = style.id;
          const styleType = 'class';

          if (name && !name.startsWith('_')) {
            let properties: Record<string, any> = {};
            let isHtmlTag = false;
            let hasVariables = false;

            // Check if this is an HTML tag style (required by Webflow Way).
            // Exact tag names or Webflow's tag-selector display names only —
            // substring matching ("a", "p") would match nearly every class.
            if (isHtmlTagStyleName(name)) {
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
          if (item.type === 'Page') {
            const name = (await item.getName()) || 'Unnamed';
            const slug = (await item.getSlug()) || '';
            const publishPath = await item.getPublishPath();
            let collectionId: string | null = null;
            let collectionName: string | null = null;
            let pageKind: string | null = null;
            let isDraftPage = false;

            try {
              collectionId = await item.getCollectionId();
            } catch {
              collectionId = null;
            }

            try {
              collectionName = await item.getCollectionName();
            } catch {
              collectionName = null;
            }

            // getKind/isDraft may be absent on older Designer runtimes
            try {
              if (typeof item.getKind === 'function') {
                pageKind = await item.getKind();
              }
            } catch {
              pageKind = null;
            }

            try {
              if (typeof item.isDraft === 'function') {
                isDraftPage = await item.isDraft();
              }
            } catch {
              isDraftPage = false;
            }

            // CMS-bound template pages (collection pages, ecommerce product/SKU/
            // category templates) can't be fetched as static published URLs.
            // Prefer the API's collection binding and page kind; fall back to
            // slug heuristics only when kind is unavailable.
            const isCmsTemplate = Boolean(
              collectionId ||
              collectionName ||
              pageKind === 'cms' ||
              (pageKind === null && (
                isInternalCmsTemplateSlug(slug) ||
                (publishPath && isInternalCmsTemplateSlug(publishPath))
              ))
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

            // Prefer the API's homepage flag; fall back to name/slug heuristics
            try {
              if (typeof item.isHomepage === 'function') {
                isHomePage = await item.isHomepage();
              }
            } catch {
              isHomePage = false;
            }
            if (!isHomePage && (slug === '/' || lowerName === 'home' || lowerName === 'homepage' || lowerSlug === 'home')) {
              isHomePage = true;
            }

            // Validate Title Case naming (Webflow Way requirement) per page
            const isTitleCase = /^[A-Z][a-z]*(?:\s[A-Z][a-z]*)*$/.test(name) ||
                               name.split(' ').every((word: string) => word.charAt(0) === word.charAt(0).toUpperCase());
            if (isTitleCase) {
              hasValidNaming = true;
            } else {
              data.enhancedValidation!.pageStructure.pagesNotTitleCase.push(name);
            }

            // Check if page name matches slug (Webflow Way requirement) per page.
            // CMS template pages have fixed collection slugs; skip them.
            const expectedSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const actualSlug = slug.replace(/^\//, '').toLowerCase();
            if (!isCmsTemplate && expectedSlug !== actualSlug && !(isHomePage && actualSlug === '')) {
              data.enhancedValidation!.pageStructure.pagesWithMismatchedSlugs.push(`${name} (/${actualSlug})`);
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
              path: slug,
              publishPath: publishPath,
              collectionId: collectionId,
              collectionName: collectionName,
              isCmsTemplate: isCmsTemplate,
              kind: pageKind,
              isDraft: isDraftPage,
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

      // "All collected pages pass" semantics: one well-named page must not
      // mask badly-named ones.
      data.enhancedValidation!.pageStructure.hasTitleCaseNaming =
        pageData.length > 0 && data.enhancedValidation!.pageStructure.pagesNotTitleCase.length === 0;
      data.enhancedValidation!.pageStructure.hasMatchingSlugs =
        pageData.length > 0 && data.enhancedValidation!.pageStructure.pagesWithMismatchedSlugs.length === 0;

      data.pages = pageData;
      data.collectionMetadata!.totalPages = pageData.length;
      console.log(`Pages collected: ${pageData.length}`);
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
    data.siteInfo = normalizeSiteInfo(site);
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

function normalizeVariableModesCategory(results: ValidationResponse): void {
  const variableModesCategory = results.categories.find(cat => cat.category === 'Variable Modes');
  if (!variableModesCategory?.stats) return;

  const totalModes = typeof variableModesCategory.stats.totalModes === 'number'
    ? variableModesCategory.stats.totalModes
    : 0;
  if (totalModes <= 0) return;

  let convertedWarning = false;
  variableModesCategory.issues = (variableModesCategory.issues || []).map((issue) => {
    const isNameOnlyModeWarning =
      issue.id === 'modes.no-responsive' ||
      /modes found, but none appear to be for responsive breakpoints/i.test(issue.message || '');

    if (!isNameOnlyModeWarning) return issue;
    convertedWarning = true;

    return {
      ...issue,
      id: 'modes.good',
      severity: 'info',
      message: `${totalModes} modes configured across ${variableModesCategory.stats?.collectionsWithModes || 1} collections.`,
      howToFix: undefined
    };
  });

  if (convertedWarning) {
    variableModesCategory.passed = true;
    variableModesCategory.stats.modeDataAvailable = true;
  }
}

// Enhance validation results with client-side analysis
// Canvas checks reflect the current Designer state (including unpublished
// edits), complementing the published-site checks which lag behind edits.
function addCanvasChecksCategory(results: ValidationResponse, projectData: ProjectData): void {
  const canvas = projectData.canvasChecks;
  if (!canvas || !canvas.available) return;

  const issues: ValidationIssue[] = [];

  for (const headingIssue of canvas.headingIssues) {
    issues.push({
      id: `canvas-heading-${headingIssue.position}`,
      category: 'Canvas Checks (Current Page)',
      severity: 'warning',
      message: headingIssue.issue,
      details: {
        howToFix: 'Adjust the heading level in the element settings so levels increase one step at a time.',
        location: `${canvas.pageName} — heading ${headingIssue.position} of ${canvas.headingsChecked}`,
        canvasElementKeys: headingIssue.elementKey ? [headingIssue.elementKey] : undefined
      }
    });
  }

  if (canvas.imagesMissingAlt > 0) {
    issues.push({
      id: 'canvas-images-missing-alt',
      category: 'Canvas Checks (Current Page)',
      severity: 'info',
      message: `${canvas.imagesMissingAlt} of ${canvas.imagesChecked} image(s) on this page have no alt text in the Designer.`,
      details: {
        howToFix: 'Add descriptive alt text in each image\'s settings, or mark purely decorative images as decorative.',
        canvasElementKeys: canvas.missingAltElementKeys.length > 0 ? canvas.missingAltElementKeys : undefined
      }
    });
  }

  results.categories.push({
    category: 'Canvas Checks (Current Page)',
    passed: issues.filter(issue => issue.severity === 'error' || issue.severity === 'warning').length === 0,
    issues,
    stats: {
      page: canvas.pageName,
      headingsChecked: canvas.headingsChecked,
      imagesChecked: canvas.imagesChecked,
      note: 'Reflects current Designer state, including unpublished changes'
    }
  });
}

// Published-site checks lag behind Designer edits. When the canvas passes a
// dimension the published site fails, the creator has almost certainly fixed
// it without republishing — say so on the published issue instead of letting
// them re-fix or reinstall the app.
function addRepublishHints(results: ValidationResponse, projectData: ProjectData): void {
  const canvas = projectData.canvasChecks;
  if (!canvas || !canvas.available) return;

  const hint = (dimension: string) =>
    `The current page's canvas passes the ${dimension} check — if you've already fixed this in the Designer, republish the site and re-run validation to update this result.`;

  const headingIssueIds = new Set(['heading-hierarchy-errors', 'heading-structure-errors']);
  const altIssueIds = new Set(['missing-alt-text-critical', 'missing-alt-text', 'images-missing-alt']);

  for (const category of results.categories) {
    for (const issue of category.issues || []) {
      if (issue.id.startsWith('canvas-')) continue;
      if (canvas.headingsChecked > 0 && canvas.headingIssues.length === 0 && headingIssueIds.has(issue.id)) {
        issue.details = { ...issue.details, republishHint: hint('heading hierarchy') };
      }
      if (canvas.imagesChecked > 0 && canvas.imagesMissingAlt === 0 && altIssueIds.has(issue.id)) {
        issue.details = { ...issue.details, republishHint: hint('image alt text') };
      }
    }
  }
}

function enhanceValidationResults(results: ValidationResponse, projectData: ProjectData): void {
  console.log('Enhancing validation results with client-side analysis...');

  // REMOVED: These client-side validations duplicate the server-side "Variables" and "Components" categories
  // addVariableValidation(results, projectData); // Creates duplicate "Design System" category
  // addComponentValidation(results, projectData); // Creates duplicate "Component Architecture" category
  addStyleSystemValidation(results, projectData);
  normalizeVariableModesCategory(results);
  addCanvasChecksCategory(results, projectData);
  addRepublishHints(results, projectData);
  
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

      // Check for Title Case naming — report the specific offending pages
      const pagesNotTitleCase = pageStructure.pagesNotTitleCase || [];
      if (pagesNotTitleCase.length > 0) {
        issues.push({
          id: 'page-naming',
          category: 'Page Structure',
          severity: 'warning',
          message: `${pagesNotTitleCase.length} page(s) don't use Title Case naming convention.`,
          details: {
            howToFix: 'Use Title Case for page names (e.g., "Style Guide", "Contact Us")',
            samples: pagesNotTitleCase.slice(0, 10)
          }
        });
      }

      // Check page-name/slug agreement — report the specific offending pages
      const pagesWithMismatchedSlugs = pageStructure.pagesWithMismatchedSlugs || [];
      if (pagesWithMismatchedSlugs.length > 0) {
        issues.push({
          id: 'page-slug-mismatch',
          category: 'Page Structure',
          severity: 'warning',
          message: `${pagesWithMismatchedSlugs.length} page(s) have slugs that don't match their names.`,
          details: {
            howToFix: 'Keep page slugs aligned with page names (e.g., "Style Guide" → /style-guide)',
            samples: pagesWithMismatchedSlugs.slice(0, 10)
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
async function collectCurrentPageSEOData(webflow: WebflowApi): Promise<any> {
  try {
    // Get current page
    const currentPage = await webflow.getCurrentPage();
    if (!currentPage) {
      console.warn('getCurrentPage returned null');
      return null;
    }
    
    const pageName = (await currentPage.getName()) || 'Current Page';
    const pageSlug = (await currentPage.getSlug()) || '';
    const pagePublishPath = await currentPage.getPublishPath();
    const pageId = currentPage.id;
    
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

  // Published-site checks run against the last publish, not the canvas —
  // surface which publish is being validated so creators republish after fixes.
  const scope = projectData.validationScope;
  const lastPublished = scope?.domainLastPublished;
  const publishNote = lastPublished
    ? `<div class="meta-stat">
        <span class="meta-label">Validating publish from:</span>
        <span class="meta-value">${formatDateTime(lastPublished)} — republish to validate newer changes</span>
      </div>`
    : scope?.siteUrl
      ? `<div class="meta-stat">
          <span class="meta-label">Published checks:</span>
          <span class="meta-value">Run against the last published site — republish to validate newer changes</span>
        </div>`
      : '';

  const metaHTML = `
    <div class="meta-header">
      <h3 class="meta-title">Project: ${escapeHtml(projectLabel)}</h3>
      <span class="meta-version">Validator v${EXTENSION_VERSION}${knownWorkerVersion ? ` · Worker v${knownWorkerVersion}` : ''}</span>
    </div>
    <div class="meta-stats">
      ${publishNote}
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

// Register the completed run for copy-report and persist it so reopening the
// panel restores the last report instead of forcing a 30-60s re-run.
function registerValidationReport(data: ValidationResponse, correlationId: string | null): void {
  lastValidationReport = {
    data,
    correlationId,
    generatedAt: new Date().toISOString(),
    restored: false,
  };

  try {
    localStorage.setItem(LAST_RUN_STORAGE_KEY, JSON.stringify(lastValidationReport));
  } catch {
    // Quota exceeded on large sites — retry without the bulky collected data
    try {
      localStorage.setItem(LAST_RUN_STORAGE_KEY, JSON.stringify({
        ...lastValidationReport,
        data: { ...data, collectedData: undefined },
      }));
    } catch (storageError) {
      console.warn('Could not persist validation results:', storageError);
    }
  }
}

function restoreLastValidationReport(): boolean {
  try {
    const saved = localStorage.getItem(LAST_RUN_STORAGE_KEY);
    if (!saved) return false;
    const parsed = JSON.parse(saved);
    if (!parsed?.data?.categories) return false;

    lastValidationReport = { ...parsed, restored: true };
    showResults(parsed.data);
    return true;
  } catch (error) {
    console.warn('Could not restore last validation results:', error);
    return false;
  }
}

function selectCanvasElement(elementKey: string): void {
  const element = canvasElementRegistry.get(elementKey);
  const webflow = (window as unknown as { webflow?: WebflowApi }).webflow;
  if (!element || !webflow) {
    void notifyDesigner(webflow, 'Info', 'Element reference expired — re-run the validator to refresh canvas checks.');
    return;
  }
  void webflow.setSelectedElement(element).catch((error: unknown) => {
    console.warn('Could not select element:', error);
    void notifyDesigner(webflow, 'Error', 'Could not select the element. It may have been deleted or be on another page.');
  });
}

function buildReportMarkdown(): string {
  const report = lastValidationReport;
  if (!report) return '';
  const { data } = report;
  const projectData = Array.isArray(data.collectedData) ? data.collectedData[0] as ProjectData | undefined : undefined;
  const scope = projectData?.validationScope;
  const outcome = getMarketplaceOutcome(data);

  const input: ReportInput = {
    url: data.url || scope?.siteUrl || null,
    generatedAt: report.generatedAt,
    correlationId: report.correlationId,
    outcomeBadge: outcome.badge,
    outcomeTitle: outcome.title,
    errors: data.summary.totalErrors || data.summary.errors || 0,
    warnings: data.summary.totalWarnings || data.summary.warnings || 0,
    infos: data.summary.totalInfo || data.summary.infos || 0,
    categories: data.categories,
    domainLastPublished: scope?.domainLastPublished || null,
    extensionVersion: EXTENSION_VERSION,
    workerVersion: knownWorkerVersion,
  };

  return buildReportMarkdownPure(input);
}

// Reported by the worker's /health endpoint during bootstrap, used to
// diagnose extension/worker version skew from a copied report.
let knownWorkerVersion: string | null = null;

async function fetchWorkerVersion(): Promise<void> {
  try {
    const response = await fetch(`${WORKER_API_BASE}/health`);
    if (!response.ok) return;
    const payload = (await response.json()) as { version?: string };
    if (payload?.version) knownWorkerVersion = payload.version;
  } catch {
    // Version display is best-effort
  }
}

async function submitIssueFeedback(issueId: string, category: string): Promise<void> {
  const webflow = (window as unknown as { webflow?: WebflowApi }).webflow;
  try {
    const response = await fetch(`${APP_VALIDATOR_BASE}/app-validator/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        issueId,
        category,
        siteId: bridgeContext?.siteId,
        siteUrl: bridgeContext?.siteUrl || lastValidationReport?.data?.url,
        runCorrelationId: lastValidationReport?.correlationId,
        note: `extension v${EXTENSION_VERSION}${knownWorkerVersion ? ` / worker v${knownWorkerVersion}` : ''}`
      })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    void notifyDesigner(webflow, 'Success', 'Thanks — this issue was flagged for review by the validator team.');
  } catch (error) {
    console.warn('Issue feedback failed:', error);
    void notifyDesigner(webflow, 'Error', 'Could not send feedback. Please try again later.');
  }
}

async function copyValidationReport(): Promise<void> {
  const markdown = buildReportMarkdown();
  const webflow = (window as unknown as { webflow?: WebflowApi }).webflow;
  if (!markdown) {
    void notifyDesigner(webflow, 'Info', 'Run the validator first to generate a report.');
    return;
  }
  try {
    await navigator.clipboard.writeText(markdown);
    void notifyDesigner(webflow, 'Success', 'Validation report copied — paste it into a support ticket or document.');
  } catch (error) {
    console.warn('Copy report failed:', error);
    void notifyDesigner(webflow, 'Error', 'Could not copy the report to the clipboard.');
  }
}

function showResults(data: ValidationResponse): void {
  const resultsDisplay = document.getElementById('results-display');
  if (!resultsDisplay) return;

  const blockingCount = getSubmissionBlockingIssues(data).length;
  const outcome = getMarketplaceOutcome(data);
  const generatedAt = lastValidationReport?.generatedAt ? new Date(lastValidationReport.generatedAt) : new Date();
  const isRestored = lastValidationReport?.restored === true;

  // Create comprehensive results HTML with enhanced reporting
  const resultsHTML = `
    <!-- Tabs Navigation -->
    <div class="validation-tabs" role="tablist" aria-label="Validation report sections">
      <button id="overview-tab-button" class="tab-button active" data-tab="overview" type="button" role="tab" aria-selected="true" aria-controls="overview-tab" tabindex="0">Overview</button>
      <button id="checklist-tab-button" class="tab-button" data-tab="checklist" type="button" role="tab" aria-selected="false" aria-controls="checklist-tab" tabindex="-1">Fix List${blockingCount > 0 ? ` (${blockingCount})` : ''}</button>
    </div>

    <!-- Overview Tab Content -->
    <div id="overview-tab" class="tab-content active" role="tabpanel" aria-labelledby="overview-tab-button" tabindex="0">
      ${isRestored ? `
        <div class="restored-banner" role="status">
          Restored from last run (${generatedAt.toLocaleString()}) — results may be stale. Run Validator to refresh.
        </div>
      ` : ''}
      <!-- Project Overview -->
      <div class="project-overview">
      <div class="project-header">
        <h2 class="project-title">Validation Report: ${escapeHtml(data.url || '')}</h2>
        <div class="validation-timestamp">${generatedAt.toLocaleString()}</div>
        <button type="button" id="copy-report-btn" class="secondary-btn copy-report-btn">Copy report</button>
      </div>
    </div>

    ${createMarketplaceOutcomeHTML(data)}
    ${createValidationScopeHTML(data)}

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

    <!-- Submission State -->
    <div class="submission-state ${blockingCount > 0 ? 'is-blocked' : 'is-ready'}">
      <div class="submission-state-headline">
        ${blockingCount > 0
          ? `${blockingCount} blocker${blockingCount === 1 ? '' : 's'} remaining before submission`
          : 'Submission gate clear'}
      </div>
      <div class="submission-state-sub">
        Categories passed: ${data.summary.passedCategories}/${data.categories.length} · Score ${calculateOverallScore(data.summary)}%
      </div>
    </div>

    <!-- Category Results with Enhanced Details -->
    ${(() => {
      console.log('Rendering categories in UI. Total categories:', data.categories.length);
      console.log('Category names:', data.categories.map(cat => cat.category));
      return data.categories.map((cat, idx) => createCategoryHTML(cat, idx, data.collectedData)).join('');
    })()}

    <!-- Webflow Way Guidelines Reference -->
    <div class="guidelines-reference">
      <div class="reference-header">
        <h3>Webflow Way Guidelines</h3>
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
          <strong>Performance:</strong> Optimized assets (150KB target where possible, 4MB maximum), modern formats, clean code
        </div>
        <div class="reference-link">
          <strong>SEO & Accessibility:</strong> Semantic HTML, alt text, proper meta tags
        </div>
      </div>
    </div>

      <!-- Action Items Summary -->
      ${createActionItemsHTML(data)}
    </div>

    <!-- Submission Fix List Tab Content -->
    <div id="checklist-tab" class="tab-content" role="tabpanel" aria-labelledby="checklist-tab-button" tabindex="0" hidden>
      ${createSubmissionFixListHTML(data)}
    </div>
  `;

  resultsDisplay.innerHTML = resultsHTML;
  resultsDisplay.style.display = 'block';
  resultsDisplay.classList.add('show');

  // Initialize tab functionality
  initializeTabs();

  // "Select on canvas" buttons for canvas-check issues
  resultsDisplay.querySelectorAll<HTMLButtonElement>('[data-canvas-element]').forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.getAttribute('data-canvas-element');
      if (key) selectCanvasElement(key);
    });
  });

  // "Flag as incorrect" false-positive reports
  resultsDisplay.querySelectorAll<HTMLButtonElement>('[data-flag-issue]').forEach((button) => {
    button.addEventListener('click', () => {
      const issueId = button.getAttribute('data-flag-issue');
      const category = button.getAttribute('data-flag-category') || '';
      if (issueId) {
        button.disabled = true;
        button.textContent = 'Flagged';
        void submitIssueFeedback(issueId, category);
      }
    });
  });

  document.getElementById('copy-report-btn')?.addEventListener('click', () => void copyValidationReport());

  // A blocked run lands the creator on the work list, not the summary
  if (!isRestored && outcome.showFixListAction) {
    activateValidationTab('checklist');
  }

  // Reset the explicit refresh flag AFTER rendering
  console.log('Resetting isExplicitRefresh to false after rendering');
  isExplicitRefresh = false;
}

function createCategoryHTML(cat: CategoryResult, idx: number, collectedData?: any[]): string {
  const status = getCategoryStatus(cat);
  const categoryAnchorId = getCategoryAnchorId(cat.category);

  // Clean categories collapse to one line so report length tracks the work
  // remaining, not the number of checks that ran.
  if (cat.passed && cat.issues.length === 0) {
    return `
      <details id="${categoryAnchorId}" class="category-section category-collapsed ${idx === 0 ? 'first' : ''}">
        <summary class="category-header category-summary">
          <h3 class="category-title">${cat.category}</h3>
          <div class="category-status ${status.className}">
            ${status.label}
          </div>
          ${cat.stats ? `<span class="category-stats">${formatCategoryStats(cat.stats)}</span>` : ''}
        </summary>
        ${createSuccessHTML()}
        ${cat.stats ? createMetadataHTML(cat.category, cat.stats) : ''}
        ${createDataCollectedSection(cat.category, collectedData)}
      </details>
    `;
  }

  return `
    <div id="${categoryAnchorId}" class="category-section ${idx === 0 ? 'first' : ''}">
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
  const republishHint = issue.details?.republishHint;
  const canvasElementKeys: string[] = Array.isArray(issue.details?.canvasElementKeys)
    ? issue.details.canvasElementKeys
    : [];
  return `
    <div class="issue-item ${issue.severity}">
      <div class="issue-content">
        <span class="issue-severity ${issue.severity}">
          ${getIssueSeverityLabel(issue)}
        </span>
        <div class="issue-details">
          <div class="issue-message">${escapeHtml(issue.message)}</div>
          ${policy ? createIssuePolicyHTML(issue) : ''}
          ${republishHint ? `
            <div class="issue-republish-hint">${escapeHtml(republishHint)}</div>
          ` : ''}
          ${howToFix ? `
            <div class="issue-fix">
              <strong>${policy ? 'Required fix:' : issue.severity === 'warning' ? 'Suggestion:' : issue.severity === 'info' ? 'Recommendation:' : 'How to fix:'}</strong> ${escapeHtml(howToFix)}
            </div>
          ` : ''}
          ${location ? `
            <div class="issue-location">
              <strong>Location:</strong> ${escapeHtml(location)}
            </div>
          ` : ''}
          ${canvasElementKeys.length > 0 ? `
            <div class="canvas-select-actions">
              ${canvasElementKeys.map((key, index) => `
                <button type="button" class="canvas-select-btn" data-canvas-element="${escapeHtml(key)}">
                  ${canvasElementKeys.length > 1 ? `Select element ${index + 1}` : 'Select on canvas'}
                </button>
              `).join('')}
            </div>
          ` : ''}
          ${createDetailsHTML(issue.details)}
          <button type="button" class="issue-flag-btn" data-flag-issue="${escapeHtml(issue.id)}" data-flag-category="${escapeHtml(issue.category)}" title="Report this as a validator false positive">
            Flag as incorrect
          </button>
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
        <span class="marketplace-outcome-time">Validated ${(lastValidationReport?.generatedAt ? new Date(lastValidationReport.generatedAt) : new Date()).toLocaleTimeString()}</span>
        ${outcome.showFixListAction ? '<button type="button" class="marketplace-outcome-action" onclick="openFixList()">Open Fix List</button>' : ''}
      </div>
    </div>
  `;
}

function getMarketplaceOutcome(data: ValidationResponse): {
  className: string;
  title: string;
  copy: string;
  badge: string;
  showFixListAction: boolean;
} {
  const errors = data.summary.totalErrors || data.summary.errors || 0;
  const warnings = data.summary.totalWarnings || data.summary.warnings || 0;
  const failedCategories = data.summary.failedCategories || 0;
  const score = calculateOverallScore(data.summary);
  const blockingIssues = getSubmissionBlockingIssues(data);
  const hasRejectedPolicy = data.categories.some((category) =>
    category.issues?.some((issue) => getIssuePolicy(issue) === 'ix2-rejected')
  );

  if (hasRejectedPolicy) {
    return {
      className: 'is-rejected',
      title: 'Rejected policy detected',
      copy: 'Legacy IX2 interactions were found. Templates submitted on or after May 1, 2026 should be rejected until interactions are rebuilt with Webflow Interactions powered by GSAP.',
      badge: 'Rejected',
      showFixListAction: true
    };
  }

  if (blockingIssues.length > 0) {
    const hasSetupBlocker = blockingIssues.some(({ issue }) => issue.id === 'validator-script-required');
    return {
      className: 'is-blocked',
      title: hasSetupBlocker && errors === 0 ? 'Published-site checks required' : 'Blocked by validation errors',
      copy: hasSetupBlocker && errors === 0
        ? 'Add and publish the Validator script so the marketplace form has a complete validation result.'
        : 'Resolve every error-level issue, publish the site again, and re-run validation before submitting the template.',
      badge: 'Blocked',
      showFixListAction: true
    };
  }

  if (failedCategories > 0 || score < 100) {
    return {
      className: 'is-review',
      title: 'Review items remain',
      copy: 'No error-level blockers were returned, but the score is below 100%. Review the categories below and re-run validation after publishing.',
      badge: 'Review',
      showFixListAction: false
    };
  }

  if (warnings > 0) {
    return {
      className: 'is-review',
      title: 'Ready with non-blocking warnings',
      copy: 'The submission gate is clear, but the warnings below should be reviewed before handoff.',
      badge: 'Ready',
      showFixListAction: false
    };
  }

  return {
    className: 'is-ready',
    title: 'Ready for marketplace review',
    copy: 'No blocking errors or warnings were found. Re-run validation after any Designer changes and after publishing.',
    badge: 'Ready',
    showFixListAction: false
  };
}

function createValidationScopeHTML(data: ValidationResponse): string {
  const projectData = Array.isArray(data.collectedData) ? data.collectedData[0] as ProjectData | undefined : undefined;
  const scope = projectData?.validationScope;
  const designerContext = projectData?.designerContext;

  if (!scope && !designerContext) return '';

  const scopeRows: Array<{ label: string; value: string; title?: string }> = [];
  if (scope) {
    scopeRows.push({
      label: 'Published URL',
      value: scope.siteUrl || 'Not available',
      title: scope.siteUrl || undefined,
    });
    scopeRows.push({
      label: 'Domain source',
      value: [
        scope.domainSource,
        scope.domainStage ? formatModeName(scope.domainStage) : '',
        scope.domainDefault ? 'default' : '',
      ].filter(Boolean).join(' - '),
    });
    scopeRows.push({
      label: 'Last published',
      value: scope.domainLastPublished ? formatDateTime(scope.domainLastPublished) : 'Not reported',
    });
    scopeRows.push({
      label: 'Page scope',
      value: `${scope.pageScope === 'current' ? 'Current page' : 'All published pages'} (${scope.pageSlugsCount} URL${scope.pageSlugsCount === 1 ? '' : 's'})`,
    });
    scopeRows.push({
      label: 'Checks',
      value: `${scope.selectedChecks.map(formatModeName).join(', ')} - ${scope.publishedChecks === 'full' ? 'published-site checks enabled' : 'Designer-only until script is published'}`,
    });
    if (scope.skippedCmsTemplateSlugs.length > 0) {
      scopeRows.push({
        label: 'Skipped',
        value: `${scope.skippedCmsTemplateSlugs.length} internal CMS template URL${scope.skippedCmsTemplateSlugs.length === 1 ? '' : 's'}`,
        title: scope.skippedCmsTemplateSlugs.join(', '),
      });
    }
    if (scope.isPasswordProtected || scope.isPrivateStaging) {
      scopeRows.push({
        label: 'Site access',
        value: [
          scope.isPasswordProtected ? 'Password protected' : '',
          scope.isPrivateStaging ? 'Private staging' : '',
        ].filter(Boolean).join(' - '),
      });
    }
  }

  if (designerContext) {
    scopeRows.push({
      label: 'Designer mode',
      value: [
        designerContext.mode ? formatModeName(designerContext.mode) : 'Unknown',
        designerContext.canAccessCanvas === false ? 'limited canvas access' : '',
      ].filter(Boolean).join(' - '),
    });
  }

  return `
    <div class="validation-scope">
      <div class="validation-scope-header">
        <h3>Validation Scope</h3>
        <span>${scope?.publishedChecks === 'full' ? 'Full coverage' : 'Partial coverage'}</span>
      </div>
      <div class="validation-scope-grid">
        ${scopeRows.map(row => `
          <div class="validation-scope-row">
            <span class="validation-scope-label">${row.label}</span>
            <span class="validation-scope-value" ${row.title ? `title="${row.title}"` : ''}>${row.value}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function getCategoryStatus(cat: CategoryResult): { className: string; label: string } {
  const issues = Array.isArray(cat.issues) ? cat.issues : [];
  if (issues.some((issue) => issue.id === 'validator-script-required')) {
    return { className: 'blocked', label: 'Setup required' };
  }
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
  if (issue.id === 'validator-script-required') return 'Setup required';
  if (getIssuePolicy(issue)) return 'Rejected policy';
  if (issue.severity === 'warning') return 'Review';
  if (issue.severity === 'info') return 'Advisory';
  return 'Blocked';
}

function getIssuePolicy(issue: ValidationIssue): string | undefined {
  const policy = issue.details?.policy;
  return typeof policy === 'string' ? policy : undefined;
}

function isSubmissionBlockingIssue(issue: ValidationIssue): boolean {
  return Boolean(getIssuePolicy(issue)) || issue.severity === 'error' || issue.id === 'validator-script-required';
}

function getSubmissionBlockingIssues(data: ValidationResponse): Array<{ category: string; issue: ValidationIssue }> {
  return data.categories.flatMap((category) =>
    (Array.isArray(category.issues) ? category.issues : [])
      .filter(isSubmissionBlockingIssue)
      .map((issue) => ({ category: category.category, issue }))
  );
}

function getSubmissionBlockingCategoryCount(data: ValidationResponse): number {
  return new Set(getSubmissionBlockingIssues(data).map(({ category }) => category)).size;
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
          ${samples.map(item => `<div class="sample-item">• ${escapeHtml(String(item))}</div>`).join('')}
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
          ${violations.map(v => `<div class="violation-item">• ${escapeHtml(v)}</div>`).join('')}
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
          ${details.locations.map(loc => `<div class="location-item">• ${escapeHtml(String(loc))}</div>`).join('')}
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
          ${details.samples.map(s => `<div class="sample-item">• ${escapeHtml(String(s))}</div>`).join('')}
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
  html += createStructuredArrayDetails(details, 'missingImages', 'View image missing alt text', formatImageWithoutAltItem);
  html += createStructuredArrayDetails(details, 'pagesWithIssues', 'View affected page', formatPageListItem);
  html += createStructuredArrayDetails(details, 'oversizedAssets', 'View oversized asset', formatAssetItem);
  html += createStructuredArrayDetails(details, 'extremeAssets', 'View large asset', formatAssetItem);
  html += createStructuredArrayDetails(details, 'unoptimizedAssets', 'View asset to optimize', formatAssetItem);
  html += createStructuredArrayDetails(details, 'unusedAssets', 'View unused asset', formatAssetItem);
  html += createStructuredArrayDetails(details, 'missingTags', 'View missing tag', formatStructuredItem);
  html += createSeoDetailHTML(details);

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
        ${items.map(item => `<div class="subitem">• ${escapeHtml(formatter(item))}</div>`).join('')}
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
  const pageUrl = item.pageUrl || item.url;
  const position = item.fromPosition && item.toPosition
    ? ` positions ${item.fromPosition} → ${item.toPosition}`
    : '';
  const sequence = item.headingSequence ? ` Sequence: ${item.headingSequence}` : '';

  if (
    item.issueType === 'skipped_level' &&
    typeof item.fromLevel === 'number' &&
    typeof item.toLevel === 'number'
  ) {
    const missingLevel = typeof item.missingLevel === 'number'
      ? `, skipping H${item.missingLevel}`
      : '';
    const issue = `${formatHeadingReference(item.fromLevel, item.fromText)} is followed by ${formatHeadingReference(item.toLevel, item.toText)}${missingLevel}${position}.${sequence}`;
    return `${page}${pageUrl ? ` (${pageUrl})` : ''}: ${issue}`;
  }

  const issue = item.issue || 'Heading issue';
  return `${page}${pageUrl ? ` (${pageUrl})` : ''}: ${issue}${sequence}`;
}

function formatHeadingReference(level: number, text: unknown): string {
  const normalizedText = typeof text === 'string' ? decodeCommonHtmlEntities(text).replace(/\s+/g, ' ').trim() : '';
  if (!normalizedText) return `H${level}`;
  const preview = normalizedText.length > 80 ? `${normalizedText.slice(0, 77)}...` : normalizedText;
  return `H${level} "${preview}"`;
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
  const target = item.selector || item.src || item.alt || 'Image missing alt text';
  const context = item.context ? ` (${item.context})` : '';
  const page = item.page || item.pageName || item.title;
  const pageUrl = item.pageUrl || item.url;
  const location = pageUrl ? `${page || 'Page'}: ${pageUrl}` : page;
  return location ? `${target}${context} on ${location}` : `${target}${context}`;
}

function formatAssetItem(item: any): string {
  if (!item || typeof item !== 'object') return String(item);
  const name = item.name || item.url || 'Asset';
  const details = [
    item.size,
    item.currentFormat,
    item.recommendedAction
  ].filter(Boolean).join(' - ');
  return details ? `${name}: ${details}` : name;
}

function createSeoDetailHTML(details?: ValidationIssue['details']): string {
  if (!details) return '';

  const rows: string[] = [];
  if (details.currentTitle) rows.push(`Current title: ${details.currentTitle}`);
  if (details.currentDescription) rows.push(`Current description: ${details.currentDescription}`);
  if (typeof details.currentLength === 'number') rows.push(`Current length: ${details.currentLength}`);
  if (details.recommendedLength) rows.push(`Recommended length: ${details.recommendedLength}`);

  if (rows.length === 0) return '';

  return `
    <details class="issue-subitems-details">
      <summary class="issue-subitems-summary">
        <strong>View current metadata</strong>
      </summary>
      <div class="issue-subitems-list">
        ${rows.map(row => `<div class="subitem">• ${row}</div>`).join('')}
      </div>
    </details>
  `;
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
      All checks passed for this category
    </div>
  `;
}

function createMetadataHTML(category: string, stats: Record<string, any>): string {
  const statItems = getDetailedStatItems(category, stats);
  if (statItems.length === 0) return '';

  return `
    <div class="category-metadata">
      <div class="metadata-title">Category Details</div>
      <div class="metadata-grid">
        ${statItems.map(item => `
          <div class="metadata-stat ${item.tone ? `is-${item.tone}` : ''}">
            <span class="metadata-label">${escapeHtml(item.label)}</span>
            <span class="metadata-value">${escapeHtml(item.value)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function createActionItemsHTML(data: ValidationResponse): string {
  const summary = data.summary;
  const errors = summary.totalErrors || summary.errors || 0;
  const warnings = summary.totalWarnings || summary.warnings || 0;
  const failedCategories = summary.failedCategories || 0;
  const score = calculateOverallScore(summary);
  const blockingIssues = getSubmissionBlockingIssues(data);
  const blockingCategoryCount = getSubmissionBlockingCategoryCount(data);
  const hasScoreReview = blockingIssues.length === 0 && (failedCategories > 0 || score < 100);
  const warningStepNumber = blockingIssues.length > 0 || hasScoreReview ? '2' : '1';
  
  if (blockingIssues.length === 0 && errors === 0 && warnings === 0 && failedCategories === 0) return '';

  return `
    <div class="action-items">
      <h3>Next Steps</h3>
      <div class="action-priorities">
        ${blockingIssues.length > 0 ? `
          <div class="action-priority error">
            <strong>1. Fix ${blockingIssues.length} Blocking Item${blockingIssues.length === 1 ? '' : 's'}</strong>
            <p>Open the Fix List for the ${blockingCategoryCount} categor${blockingCategoryCount === 1 ? 'y' : 'ies'} preventing template submission.</p>
          </div>
        ` : ''}
        ${hasScoreReview ? `
          <div class="action-priority warning">
            <strong>1. Review Score Details</strong>
            <p>No error-level blockers were returned, but the run is below 100%. Review warning categories and re-run validation after publishing.</p>
          </div>
        ` : ''}
        ${errors > 0 && blockingIssues.length === 0 ? `
          <div class="action-priority error">
            <strong>1. Fix ${errors} Critical Error${errors > 1 ? 's' : ''}</strong>
            <p>Address all error-level issues before template submission</p>
          </div>
        ` : ''}
        ${warnings > 0 ? `
          <div class="action-priority warning">
            <strong>${warningStepNumber}. Review ${warnings} Warning${warnings > 1 ? 's' : ''}</strong>
            <p>Warnings are review targets. They should be cleaned up, but they are not added to the blocking Fix List unless paired with an error-level issue.</p>
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

function getCategoryAnchorId(categoryName: string): string {
  const slug = categoryName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `overview-category-${slug || 'unknown'}`;
}

// Tab Management Functions
function initializeTabs(): void {
  const tabButtons = document.querySelectorAll('.tab-button');
  
  // Restore the previously active tab
  const activeTabId = getActiveTab();
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.getAttribute('data-tab');
      if (tabId) {
        activateValidationTab(tabId);
      }
    });

    button.addEventListener('keydown', (event) => {
      const keyboardEvent = event as KeyboardEvent;
      const orderedTabs = Array.from(document.querySelectorAll('.tab-button')) as HTMLButtonElement[];
      const currentIndex = orderedTabs.indexOf(button as HTMLButtonElement);
      let nextIndex = currentIndex;

      if (keyboardEvent.key === 'ArrowRight' || keyboardEvent.key === 'ArrowDown') {
        nextIndex = (currentIndex + 1) % orderedTabs.length;
      } else if (keyboardEvent.key === 'ArrowLeft' || keyboardEvent.key === 'ArrowUp') {
        nextIndex = (currentIndex - 1 + orderedTabs.length) % orderedTabs.length;
      } else if (keyboardEvent.key === 'Home') {
        nextIndex = 0;
      } else if (keyboardEvent.key === 'End') {
        nextIndex = orderedTabs.length - 1;
      } else {
        return;
      }

      keyboardEvent.preventDefault();
      const nextTabId = orderedTabs[nextIndex]?.getAttribute('data-tab');
      if (nextTabId && activateValidationTab(nextTabId)) {
        orderedTabs[nextIndex]?.focus();
      }
    });
  });
  
  if (!activateValidationTab(activeTabId)) {
    activateValidationTab('overview');
  }
}

function activateValidationTab(tabId: string): boolean {
  const tabButtons = document.querySelectorAll('.tab-button') as NodeListOf<HTMLButtonElement>;
  const tabContents = document.querySelectorAll('.tab-content') as NodeListOf<HTMLElement>;
  const activeButton = document.querySelector(`[data-tab="${tabId}"]`) as HTMLButtonElement | null;
  const activeContent = document.getElementById(`${tabId}-tab`);

  if (!activeButton || !activeContent) {
    return false;
  }

  saveActiveTab(tabId);
  tabButtons.forEach(btn => {
    btn.classList.remove('active');
    btn.setAttribute('aria-selected', 'false');
    btn.tabIndex = -1;
  });
  tabContents.forEach(content => {
    content.classList.remove('active');
    content.hidden = true;
  });

  activeButton.classList.add('active');
  activeButton.setAttribute('aria-selected', 'true');
  activeButton.tabIndex = 0;
  activeContent.classList.add('active');
  activeContent.hidden = false;
  return true;
}

function openFixList(): void {
  if (activateValidationTab('checklist')) {
    document.getElementById('checklist-tab')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
}

function openOverviewCategory(categoryAnchorId: string): void {
  if (!activateValidationTab('overview')) return;

  const categorySection = document.getElementById(categoryAnchorId);
  if (categorySection) {
    if (categorySection instanceof HTMLDetailsElement) {
      categorySection.open = true;
    }
    categorySection.scrollIntoView({ block: 'start', behavior: 'smooth' });
    categorySection.classList.add('is-targeted');
    window.setTimeout(() => categorySection.classList.remove('is-targeted'), 1400);
  }
}

// Submission Fix List Functions
interface SubmissionFixListItem {
  id: string;
  category: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  howToFix: string;
  location?: string;
  detailsHtml?: string;
  blockingReason: string;
  categoryAnchorId: string;
  completed: boolean;
}

function getFixListStorageKey(): string {
  return 'webflow_validator_submission_fix_list';
}

function saveFixList(fixItems: SubmissionFixListItem[]): void {
  const data = {
    fixItems,
    timestamp: Date.now()
  };
  localStorage.setItem(getFixListStorageKey(), JSON.stringify(data));
}

function loadFixList(): SubmissionFixListItem[] {
  try {
    const saved = localStorage.getItem(getFixListStorageKey());
    if (saved) {
      const data = JSON.parse(saved);
      return data.fixItems || data.errors || [];
    }
  } catch (error) {
    console.warn('Error loading fix list:', error);
  }
  return [];
}

function toggleFixItemCompleted(fixItemId: string): void {
  const savedFixItems = loadFixList();
  const updated = savedFixItems.map(fixItem =>
    fixItem.id === fixItemId ? { ...fixItem, completed: !fixItem.completed } : fixItem
  );
  saveFixList(updated);
  
  // Immediately update the DOM for visual feedback
  const fixListItem = document.querySelector(`[data-fix-item-id="${fixItemId}"]`);
  if (fixListItem) {
    const checkbox = fixListItem.querySelector('.fix-item-checkbox');
    const fixItemMessage = fixListItem.querySelector('.fix-item-message');
    const updatedFixItem = updated.find(item => item.id === fixItemId);
    
    if (checkbox && fixItemMessage && updatedFixItem) {
      if (updatedFixItem.completed) {
        checkbox.classList.remove('unchecked');
        checkbox.classList.add('checked');
        checkbox.innerHTML = '';
        fixItemMessage.classList.add('completed');
        fixListItem.classList.add('completed');
      } else {
        checkbox.classList.remove('checked');
        checkbox.classList.add('unchecked');
        checkbox.innerHTML = '';
        fixItemMessage.classList.remove('completed');
        fixListItem.classList.remove('completed');
      }
    }
  }
  
  // Update progress bar
  updateProgressDisplay();
}

function getCategorySubmissionBlockers(category: CategoryResult): ValidationIssue[] {
  const issues = Array.isArray(category.issues) ? category.issues : [];
  return issues.filter(isSubmissionBlockingIssue);
}

function createSubmissionFixListHTML(data: ValidationResponse): string {
  const allFixItems: SubmissionFixListItem[] = [];
  
  data.categories.forEach(category => {
    getCategorySubmissionBlockers(category).forEach(issue => {
      const isFailedCategory = category.passed !== true;
      allFixItems.push({
        id: `${category.category}_${issue.id}`,
        category: category.category,
        message: issue.message,
        severity: issue.severity,
        howToFix: getIssueHowToFix(issue) || (
          isFailedCategory
            ? 'Resolve this failed category, publish the site, and re-run validation until the category passes.'
            : 'Resolve this issue, publish the site, and re-run validation.'
        ),
        location: getIssueLocation(issue),
        detailsHtml: createDetailsHTML(issue.details),
        blockingReason: getFixItemBadgeLabel(issue),
        categoryAnchorId: getCategoryAnchorId(category.category),
        completed: false
      });
    });
  });

  // Smart merge logic:
  // 1. Preserve checked status for fix items the user is working on
  // 2. But if the user explicitly clicked "Refresh Validation" and an item still exists, uncheck it
  // 3. Remove items that were actually resolved (no longer appear)
  const savedFixItems = loadFixList();
  
  console.log('Creating submission fix list, isExplicitRefresh:', isExplicitRefresh);
  console.log('Saved fix items:', savedFixItems);
  console.log('Current fix items:', allFixItems.length);

  const mergedFixItems = allFixItems.map(fixItem => {
    const saved = savedFixItems.find(savedItem => savedItem.id === fixItem.id);
    if (saved) {
      // If the user explicitly refreshed and the item still exists, uncheck it (wasn't actually fixed)
      const shouldUncheck = isExplicitRefresh;
      console.log(`Fix item ${fixItem.id}: saved.completed=${saved.completed}, isExplicitRefresh=${isExplicitRefresh}, setting to: ${shouldUncheck ? false : saved.completed}`);
      return {
        ...fixItem,
        completed: isExplicitRefresh ? false : saved.completed
      };
    }
    return fixItem;
  });

  // Save updated fix list
  saveFixList(mergedFixItems);

  const completedCount = mergedFixItems.filter(item => item.completed).length;
  const totalCount = mergedFixItems.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const failedCategories = data.summary.failedCategories || 0;
  const errors = data.summary.totalErrors || data.summary.errors || 0;
  const score = calculateOverallScore(data.summary);

  if (totalCount === 0) {
    const warnings = data.summary.totalWarnings || data.summary.warnings || 0;
    const hasReviewItems = failedCategories > 0 || score < 100 || warnings > 0;
    const isFullyReady = score === 100 && failedCategories === 0 && errors === 0 && warnings === 0;
    return `
      <div class="checklist-empty">
        <div class="empty-state">
          <h3>${isFullyReady ? 'Ready for Submission' : 'No Blocking Fixes'}</h3>
          <p>${isFullyReady
            ? 'The latest run reached 100%. Publish after any changes and submit with this result.'
            : hasReviewItems
              ? 'Only review-level items were returned. Use the Overview tab to review recommendations, then re-run validation after publishing.'
              : 'No issue details were returned. Re-run validation and review the Overview tab if the score is still below 100%.'}</p>
        </div>
      </div>
    `;
  }

  const fixItemsByCategory: { [key: string]: SubmissionFixListItem[] } = {};
  mergedFixItems.forEach(fixItem => {
    if (!fixItemsByCategory[fixItem.category]) {
      fixItemsByCategory[fixItem.category] = [];
    }
    fixItemsByCategory[fixItem.category].push(fixItem);
  });

  return `
    <div class="submission-fix-list">
      <div class="checklist-header">
        <div class="checklist-title">
          <h3>Submission Fix List</h3>
          <p class="checklist-description">
            Fix these items to reach the confirmed 100% Validator pass required by the submission form.
            Checkboxes are local planning only; Refresh Validation confirms real fixes.
          </p>
          <div class="checklist-progress">
            <span class="progress-text">${completedCount} of ${totalCount} completed (${progressPercent}%)</span>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progressPercent}%"></div>
            </div>
          </div>
        </div>
        <button class="resync-button" onclick="resyncValidation()">Refresh Validation</button>
      </div>
      
      ${Object.entries(fixItemsByCategory).map(([categoryName, fixItems]) => `
        <div class="checklist-category">
          <h4 class="category-name">
            <span>${categoryName}</span>
            <span class="category-name-meta">${fixItems.length} item${fixItems.length === 1 ? '' : 's'}</span>
          </h4>
          <div class="checklist-items">
            ${fixItems.map(fixItem => `
              <div class="checklist-item ${fixItem.severity} ${fixItem.completed ? 'completed' : ''}" data-fix-item-id="${fixItem.id}">
                <div class="fix-item-content">
                  <div class="fix-item-meta">
                    <span class="fix-item-badge ${fixItem.severity}">${fixItem.blockingReason}</span>
                  </div>
                  <div class="fix-item-message ${fixItem.completed ? 'completed' : ''}">${fixItem.message}</div>
                  <div class="fix-item-guidance">Fix: ${fixItem.howToFix}</div>
                  ${fixItem.location ? `<div class="fix-item-guidance">Location: ${fixItem.location}</div>` : ''}
                  <button type="button" class="fix-item-detail-button" onclick="openOverviewCategory('${fixItem.categoryAnchorId}')">View details</button>
                  ${fixItem.detailsHtml || ''}
                </div>
                <div class="checkbox-wrapper" onclick="toggleFixItemCompleted('${fixItem.id}')">
                  <div class="fix-item-checkbox ${fixItem.completed ? 'checked' : 'unchecked'}"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function getFixItemBadgeLabel(issue: ValidationIssue): string {
  if (issue.id === 'validator-script-required') {
    return 'Setup';
  }

  if (getIssuePolicy(issue)) {
    return 'Policy';
  }

  if (issue.severity === 'error') {
    return 'Error';
  }

  if (issue.severity === 'warning') {
    return 'Review';
  }

  return 'Advisory';
}

function updateProgressDisplay(): void {
  const savedFixItems = loadFixList();
  const completedCount = savedFixItems.filter(item => item.completed).length;
  const totalCount = savedFixItems.length;
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
(window as any).toggleFixItemCompleted = toggleFixItemCompleted;
(window as any).openFixList = openFixList;
(window as any).openOverviewCategory = openOverviewCategory;
(window as any).resyncValidation = () => {
  console.log('resyncValidation called, setting isExplicitRefresh = true');
  isExplicitRefresh = true;
  const validateBtn = document.getElementById('validate-btn') as HTMLButtonElement;
  if (validateBtn) {
    console.log('Clicking validate button...');
    validateBtn.click();
  }
};

function formatCategoryStats(stats: Record<string, any>): string {
  const preferredStats: Array<[string, string]> = [
    ['totalPages', 'pages'],
    ['totalAssets', 'assets'],
    ['totalImages', 'images'],
    ['totalComponents', 'components'],
    ['totalStyles', 'styles'],
    ['totalClasses', 'classes'],
    ['totalVariables', 'variables'],
    ['totalLinks', 'links'],
    ['totalBrokenLinks', 'broken links'],
  ];

  const statPairs = preferredStats
    .filter(([key]) => typeof stats[key] === 'number')
    .slice(0, 2)
    .map(([key, label]) => `${stats[key]} ${label}`);

  return statPairs.length > 0 ? `(${statPairs.join(', ')})` : '';
}

type MetadataTone = 'good' | 'warning' | 'muted';

type MetadataStatItem = {
  label: string;
  value: string;
  tone?: MetadataTone;
};

function getDetailedStatItems(category: string, stats: Record<string, any>): MetadataStatItem[] {
  const details: MetadataStatItem[] = [];

  switch (category) {
    case 'Variables':
      addMetadataStat(details, 'Collections', stats.totalCollections);
      addMetadataStat(details, 'Variables', stats.totalVariables);
      addMetadataStat(details, 'Organized', formatBooleanStat(stats.hasOrganizedCollections), { tone: booleanTone(stats.hasOrganizedCollections) });
      addMetadataStat(details, 'Color ramps', formatBooleanStat(stats.hasOrderedRamps), { tone: booleanTone(stats.hasOrderedRamps) });
      break;

    case 'Variable Modes':
      addMetadataStat(details, 'Modes', stats.totalModes);
      addMetadataStat(details, 'Collections with modes', stats.collectionsWithModes);
      if (stats.responsiveModeNamesDetected !== undefined) {
        addMetadataStat(details, 'Responsive names', formatBooleanStat(stats.responsiveModeNamesDetected), { tone: booleanTone(stats.responsiveModeNamesDetected) });
      } else if (stats.hasResponsiveModes !== undefined) {
        addMetadataStat(details, 'Responsive names', formatBooleanStat(stats.hasResponsiveModes), { tone: booleanTone(stats.hasResponsiveModes) });
      }
      addMetadataStat(details, 'Mode data', stats.modeDataAvailable === undefined ? undefined : stats.modeDataAvailable ? 'Available' : 'Unavailable', { tone: booleanTone(stats.modeDataAvailable) });
      addMetadataStat(details, 'Collections checked', stats.collectionsCheckedForModes);
      if (Array.isArray(stats.modeNames) && stats.modeNames.length > 0) {
        addMetadataStat(details, 'Mode names', stats.modeNames.slice(0, 5).join(', '));
      }
      break;

    case 'Components':
      addMetadataStat(details, 'Components', stats.totalComponents);
      addMetadataStat(details, 'Navigation', stats.navComponents);
      addMetadataStat(details, 'Footer', stats.footerComponents);
      addMetadataStat(details, 'CTA', stats.ctaComponents);
      break;

    case 'Styles':
      addMetadataStat(details, 'Classes', stats.totalClasses);
      addMetadataStat(details, 'Typography', formatBooleanStat(stats.hasTypographyClasses), { tone: booleanTone(stats.hasTypographyClasses) });
      addMetadataStat(details, 'HTML baseline', formatBooleanStat(stats.hasHtmlTagStyles), { tone: booleanTone(stats.hasHtmlTagStyles) });
      break;

    case 'Design System':
      addMetadataStat(details, 'Variables', stats.totalVariables);
      addMetadataStat(details, 'Title Case', stats.withTitleCase);
      addMetadataStat(details, 'Color vars', formatBooleanStat(stats.hasColorVars), { tone: booleanTone(stats.hasColorVars) });
      addMetadataStat(details, 'Typography vars', formatBooleanStat(stats.hasTypographyVars), { tone: booleanTone(stats.hasTypographyVars) });
      addMetadataStat(details, 'Spacing vars', formatBooleanStat(stats.hasSpacingVars), { tone: booleanTone(stats.hasSpacingVars) });
      break;

    case 'Component Architecture':
      addMetadataStat(details, 'Components', stats.totalComponents);
      if (stats.requiredComponents !== undefined) addMetadataStat(details, 'Required found', `${stats.requiredComponents.found}/${stats.requiredComponents.total}`);
      addMetadataStat(details, 'Title Case', stats.componentsWithTitleCase);
      break;

    case 'Style System':
      addMetadataStat(details, 'Styles', stats.totalStyles);
      if (stats.htmlTagStyles !== undefined) addMetadataStat(details, 'HTML tag styles', `${stats.htmlTagStyles.found}/${stats.htmlTagStyles.required}`);
      addMetadataStat(details, 'Using variables', stats.stylesWithVariables);
      addMetadataStat(details, 'Variable usage', formatPercentStat(stats.variableUsagePercent), { tone: percentageTone(stats.variableUsagePercent, 90) });
      break;

    case 'Content & Accessibility':
      addMetadataStat(details, 'Pages', stats.totalPages);
      addMetadataStat(details, 'Lorem pages', stats.pagesWithLoremIpsum, { tone: zeroIsGoodTone(stats.pagesWithLoremIpsum) });
      addMetadataStat(details, 'Heading issues', stats.headingHierarchyErrors, { tone: zeroIsGoodTone(stats.headingHierarchyErrors) });
      addMetadataStat(details, 'Alt coverage', formatPercentStat(stats.altTextCoverage), { tone: percentageTone(stats.altTextCoverage, 100) });
      addMetadataStat(details, 'SEO score', formatPercentStat(stats.seoComplianceScore), { tone: percentageTone(stats.seoComplianceScore, 90) });
      addMetadataStat(details, 'SEO issue pages', stats.pagesWithSEOIssues, { tone: zeroIsGoodTone(stats.pagesWithSEOIssues) });
      addMetadataStat(details, 'Content score', formatPercentStat(stats.averageContentScore), { tone: percentageTone(stats.averageContentScore, 90) });
      addMetadataStat(details, 'Content issue pages', stats.pagesWithContentIssues, { tone: zeroIsGoodTone(stats.pagesWithContentIssues) });
      addMetadataStat(details, 'Links', stats.totalLinks);
      addMetadataStat(details, 'Broken links', stats.totalBrokenLinks, { tone: zeroIsGoodTone(stats.totalBrokenLinks) });
      addMetadataStat(details, 'Links per page', stats.averageLinksPerPage);
      break;

    case 'Interactions and GSAP': {
      const analysisComplete = stats.analysisComplete !== false && stats.analysisStatus !== 'failed';
      const legacyIx2State =
        stats.legacyIx2Detected === true
          ? 'Detected'
          : stats.legacyIx2Detected === false
          ? 'Not detected'
          : 'Not verified';

      addMetadataStat(details, 'Analysis', analysisComplete ? (stats.analysisStatus === 'partial' ? 'Partially verified' : 'Verified') : 'Not verified', { tone: analysisComplete ? 'good' : 'warning' });
      addMetadataStat(details, 'Legacy IX2', legacyIx2State, { tone: stats.legacyIx2Detected === true ? 'warning' : stats.legacyIx2Detected === false ? 'good' : 'muted' });
      addMetadataStat(details, 'IX2 markers', stats.legacyIx2Count, { tone: zeroIsGoodTone(stats.legacyIx2Count) });
      addMetadataStat(details, 'Pages requested', stats.pagesRequested);
      addMetadataStat(details, 'Pages analyzed', stats.pagesAnalyzed);
      addMetadataStat(details, 'Pages not checked', stats.pagesFailed, { tone: zeroIsGoodTone(stats.pagesFailed) });
      addMetadataStat(details, 'Template routes skipped', stats.pagesSkipped);
      addMetadataStat(details, 'Pages with IX2', stats.pagesWithLegacyIx2, { tone: zeroIsGoodTone(stats.pagesWithLegacyIx2) });
      addMetadataStat(details, 'CMS item URLs', stats.cmsItemUrlsValidated);
      addMetadataStat(details, 'Coverage', stats.cmsTemplateCoverageStatus, { tone: cmsTemplateCoverageTone(stats.cmsTemplateCoverageStatus) });
      if (typeof stats.errorMessage === 'string') addMetadataStat(details, 'Note', stats.errorMessage, { tone: 'warning' });
      break;
    }

    default:
      details.push(...formatGenericMetadataStats(stats));
  }

  return details;
}

function addMetadataStat(
  items: MetadataStatItem[],
  label: string,
  value: unknown,
  options: { tone?: MetadataTone } = {}
): void {
  if (value === undefined || value === null || value === '') return;
  items.push({
    label,
    value: String(value),
    tone: options.tone
  });
}

function formatGenericMetadataStats(stats: Record<string, any>): MetadataStatItem[] {
  const items: MetadataStatItem[] = [];

  Object.entries(stats).forEach(([key, value]) => {
    if (Array.isArray(value) || (value && typeof value === 'object')) return;
    if (typeof value === 'number') {
      addMetadataStat(items, humanizeStatKey(key), value);
    } else if (typeof value === 'boolean') {
      addMetadataStat(items, humanizeStatKey(key), formatBooleanStat(value), { tone: booleanTone(value) });
    } else if (typeof value === 'string' && value.trim() !== '') {
      addMetadataStat(items, humanizeStatKey(key), value);
    }
  });

  return items;
}

function humanizeStatKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^total\s+/i, '')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function formatBooleanStat(value: unknown): string | undefined {
  if (typeof value !== 'boolean') return undefined;
  return value ? 'Yes' : 'No';
}

function formatPercentStat(value: unknown): string | undefined {
  if (typeof value !== 'number') return undefined;
  return `${value}%`;
}

function booleanTone(value: unknown): MetadataTone | undefined {
  if (typeof value !== 'boolean') return undefined;
  return value ? 'good' : 'warning';
}

function zeroIsGoodTone(value: unknown): MetadataTone | undefined {
  if (typeof value !== 'number') return undefined;
  return value === 0 ? 'good' : 'warning';
}

function percentageTone(value: unknown, target: number): MetadataTone | undefined {
  if (typeof value !== 'number') return undefined;
  return value >= target ? 'good' : 'warning';
}

function cmsTemplateCoverageTone(value: unknown): MetadataTone | undefined {
  if (typeof value !== 'string') return undefined;
  if (value === 'complete' || value === 'not-applicable') return 'good';
  return 'warning';
}
