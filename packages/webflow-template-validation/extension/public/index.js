"use strict";
(() => {
  // src/utils.ts
  var EXTENSION_VERSION = "1.3.5";
  function filterRetiredAccessibilityIssues(issues) {
    return issues.filter((issue) => issue.id !== "color-contrast-violations");
  }
  function escapeHtml(value) {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function decodeCommonHtmlEntities(value) {
    return value.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&#x27;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
  }
  function ensureHttps(url) {
    const trimmed = url.trim();
    if (/^https:\/\//i.test(trimmed)) return trimmed;
    if (/^http:\/\//i.test(trimmed)) return `https:${trimmed.slice(trimmed.indexOf(":") + 1)}`;
    return `https://${trimmed.replace(/^\/\//, "")}`;
  }
  function getSlugPathname(value) {
    const trimmed = value.trim();
    if (trimmed === "") return "";
    try {
      const path = trimmed.startsWith("/") || /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `/${trimmed}`;
      return new URL(path, "https://example.com").pathname;
    } catch {
      const withoutQuery = trimmed.split(/[?#]/, 1)[0] || "";
      return withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
    }
  }
  var WEBFLOW_ECOMMERCE_TEMPLATE_ROOTS = /* @__PURE__ */ new Set(["/product", "/sku", "/category"]);
  function isInternalCmsTemplateSlug(value) {
    const pathname = getSlugPathname(value);
    const normalizedPathname = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
    return /^\/detail_[^/]+\/?$/i.test(pathname) || WEBFLOW_ECOMMERCE_TEMPLATE_ROOTS.has(normalizedPathname.toLowerCase());
  }
  var HTML_TAG_STYLE_NAMES = /* @__PURE__ */ new Set([
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "a",
    "ul",
    "ol",
    "li",
    "blockquote",
    "figure",
    "figcaption",
    "body",
    "html"
  ]);
  var HTML_TAG_STYLE_DISPLAY_PATTERN = /^(all\s+(h[1-6]\s+headings?|paragraphs?|links?|lists?|list items?|images?|buttons?)|body\s*\(all pages\))$/i;
  function isHtmlTagStyleName(name) {
    const normalized = name.trim().toLowerCase();
    return HTML_TAG_STYLE_NAMES.has(normalized) || HTML_TAG_STYLE_DISPLAY_PATTERN.test(normalized);
  }
  function normalizeSiteInfo(site) {
    return {
      name: site?.siteName || site?.name || null,
      id: site?.siteId || site?.id || null,
      shortName: site?.shortName || void 0,
      isPasswordProtected: site?.isPasswordProtected,
      isPrivateStaging: site?.isPrivateStaging,
      workspaceId: site?.workspaceId,
      workspaceSlug: site?.workspaceSlug,
      domains: Array.isArray(site?.domains) ? site.domains.map((domain) => ({
        url: domain.url,
        lastPublished: domain.lastPublished ?? null,
        default: domain.default,
        stage: domain.stage
      })) : []
    };
  }
  function selectValidationDomain(siteInfo) {
    const domains = Array.isArray(siteInfo?.domains) ? siteInfo.domains.filter((domain) => domain.url) : [];
    const productionPublished = domains.find((domain) => domain.stage === "production" && domain.lastPublished);
    if (productionPublished) {
      return { url: productionPublished.url, source: "published production domain", domain: productionPublished };
    }
    const defaultProduction = domains.find((domain) => domain.stage === "production" && domain.default);
    if (defaultProduction) {
      return { url: defaultProduction.url, source: "default production domain", domain: defaultProduction };
    }
    const anyProduction = domains.find((domain) => domain.stage === "production");
    if (anyProduction) {
      return { url: anyProduction.url, source: "production domain", domain: anyProduction };
    }
    const publishedStaging = domains.find((domain) => domain.stage === "staging" && domain.lastPublished);
    if (publishedStaging) {
      return { url: publishedStaging.url, source: "published staging domain", domain: publishedStaging };
    }
    const anyStaging = domains.find((domain) => domain.stage === "staging");
    if (anyStaging) {
      return { url: anyStaging.url, source: "staging domain", domain: anyStaging };
    }
    const firstDomain = domains[0];
    if (firstDomain) {
      return { url: firstDomain.url, source: "available domain", domain: firstDomain };
    }
    if (siteInfo?.shortName) {
      return {
        url: `https://${siteInfo.shortName}.webflow.io`,
        source: "Webflow staging short name"
      };
    }
    return { url: null, source: "no published domain found" };
  }

  // src/report.ts
  function buildReportMarkdown(input) {
    const lines = [
      "# Webflow Way Validator Report",
      "",
      `- Site: ${input.url || "Unknown"}`,
      `- Generated: ${input.generatedAt}`,
      input.domainLastPublished ? `- Validated publish from: ${input.domainLastPublished}` : null,
      input.correlationId ? `- Correlation ID: ${input.correlationId}` : null,
      input.extensionVersion ? `- Validator: extension v${input.extensionVersion}${input.workerVersion ? ` \xB7 worker v${input.workerVersion}` : ""}` : null,
      input.outcomeBadge ? `- Outcome: ${input.outcomeBadge}${input.outcomeTitle ? ` \u2014 ${input.outcomeTitle}` : ""}` : null,
      `- Errors: ${input.errors} \xB7 Warnings: ${input.warnings} \xB7 Info: ${input.infos}`,
      ""
    ];
    for (const category of input.categories) {
      const issues = category.issues || [];
      lines.push(`## ${category.category} \u2014 ${issues.length === 0 ? "passed" : `${issues.length} issue(s)`}`);
      for (const issue of issues) {
        lines.push(`- [${issue.severity.toUpperCase()}] ${issue.message}`);
        const location = issue.location || issue.details?.location;
        if (location) lines.push(`  - Location: ${location}`);
        const howToFix = issue.howToFix || issue.details?.howToFix;
        if (howToFix) lines.push(`  - Fix: ${howToFix}`);
        for (const page of issue.details?.pages || []) {
          lines.push(`  - Affected page: ${formatDetailLabel(page)}`);
        }
        for (const group of issue.details?.duplicates || []) {
          const labels = group.map(formatDetailLabel).filter(Boolean);
          if (labels.length > 0) lines.push(`  - Duplicate group: ${labels.join(" \xB7 ")}`);
        }
      }
      lines.push("");
    }
    return lines.filter((line) => line !== null).join("\n");
  }
  function formatDetailLabel(value) {
    return String(value).replace(/\s+/g, " ").trim();
  }

  // src/page-seo.ts
  async function collectPageSeoData(page) {
    if (!page.getTitle && !page.getDescription) {
      return null;
    }
    const title = page.getTitle ? await page.getTitle() : null;
    const description = page.getDescription ? await page.getDescription() : null;
    const openGraphTitle = page.getOpenGraphTitle ? await page.getOpenGraphTitle() : null;
    const openGraphDescription = page.getOpenGraphDescription ? await page.getOpenGraphDescription() : null;
    const openGraphImage = page.getOpenGraphImage ? await page.getOpenGraphImage() : null;
    const usesTitleAsOG = page.usesTitleAsOpenGraphTitle ? await page.usesTitleAsOpenGraphTitle() : false;
    const usesDescAsOG = page.usesDescriptionAsOpenGraphDescription ? await page.usesDescriptionAsOpenGraphDescription() : false;
    return {
      title,
      titleLength: title ? title.length : 0,
      description,
      descriptionLength: description ? description.length : 0,
      openGraphTitle,
      openGraphDescription,
      openGraphImage,
      usesTitleAsOpenGraphTitle: usesTitleAsOG,
      usesDescriptionAsOpenGraphDescription: usesDescAsOG,
      hasCustomOpenGraphTitle: !usesTitleAsOG && !!openGraphTitle,
      hasCustomOpenGraphDescription: !usesDescAsOG && !!openGraphDescription
    };
  }

  // src/page-metadata-details.ts
  function renderDetails(label, items) {
    if (items.length === 0) return "";
    return `
    <details class="issue-subitems-details">
      <summary class="issue-subitems-summary">
        <strong>${label} (${items.length})</strong>
      </summary>
      <div class="issue-subitems-list">
        ${items.map((item) => `<div class="subitem">\u2022 ${escapeHtml(item)}</div>`).join("")}
      </div>
    </details>
  `;
  }
  function createPageMetadataDetailsHTML(details) {
    if (!details) return "";
    const pages = Array.isArray(details.pages) ? details.pages.filter((page) => typeof page === "string" && page.trim() !== "") : [];
    const duplicates = Array.isArray(details.duplicates) ? details.duplicates.filter((group) => Array.isArray(group)).map(
      (group) => group.filter((page) => typeof page === "string" && page.trim() !== "").join(" \xB7 ")
    ).filter(Boolean) : [];
    return [
      renderDetails(`View affected page${pages.length === 1 ? "" : "s"}`, pages),
      renderDetails(`View duplicate group${duplicates.length === 1 ? "" : "s"}`, duplicates)
    ].join("");
  }

  // src/validation-submit-payload.ts
  function buildValidationSubmitIssue(issue) {
    const pages = Array.isArray(issue.details?.pages) ? issue.details.pages : void 0;
    const duplicates = Array.isArray(issue.details?.duplicates) ? issue.details.duplicates : void 0;
    return {
      id: issue.id,
      severity: issue.severity,
      message: issue.message,
      howToFix: issue.howToFix,
      location: issue.location,
      details: pages || duplicates ? { pages, duplicates } : void 0
    };
  }

  // src/index.ts
  var WORKER_API_BASE = "https://validation-worker.createsomething.workers.dev";
  var APP_VALIDATOR_BASE = "https://validation-worker.createsomething.workers.dev";
  var REVIEW_START_URL = `${APP_VALIDATOR_BASE}/app-validator/review/start`;
  var LEGACY_VALIDATE_URL = `${WORKER_API_BASE}/validate`;
  var NETWORK_TIMEOUT_MS = 3e4;
  var STATUS_TIMEOUT_MS = 15e3;
  var MAX_NETWORK_RETRIES = 3;
  var RETRYABLE_STATUS = /* @__PURE__ */ new Set([408, 425, 429, 500, 502, 503, 504, 522, 524]);
  var isValidating = false;
  var extensionInitialized = false;
  var bridgeContext = null;
  var bridgeStatus = null;
  var lastValidationReport = null;
  var canvasElementRegistry = /* @__PURE__ */ new Map();
  var LAST_RUN_STORAGE_KEY = "webflow_validator_last_run";
  function initializeExtension() {
    if (extensionInitialized) return;
    extensionInitialized = true;
    const validateBtn = document.getElementById("validate-btn");
    if (validateBtn) {
      validateBtn.addEventListener("click", () => void validateProject());
    }
    const optionsBtn = document.getElementById("options-btn");
    const optionsPanel = document.getElementById("options-panel");
    optionsBtn?.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleOptionsPanel();
    });
    optionsPanel?.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    document.addEventListener("click", () => {
      setOptionsPanelOpen(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setOptionsPanelOpen(false);
      }
    });
    const installBtn = document.getElementById("bridge-install-btn");
    const rotateBtn = document.getElementById("bridge-rotate-btn");
    const recheckBtn = document.getElementById("bridge-recheck-btn");
    const copyBtn = document.getElementById("bridge-copy-btn");
    installBtn?.addEventListener("click", () => installBridge());
    rotateBtn?.addEventListener("click", () => rotateBridgeToken());
    recheckBtn?.addEventListener("click", () => refreshBridgeStatus());
    copyBtn?.addEventListener("click", () => void copyBridgeSnippetFromCurrentStatus());
    void bootstrapBridgePanel();
    void fetchWorkerVersion();
    restoreLastValidationReport();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeExtension, { once: true });
  } else {
    initializeExtension();
  }
  async function validateProject() {
    if (isValidating) return;
    isValidating = true;
    setOptionsPanelOpen(false);
    if (!isExplicitRefresh) {
      saveActiveTab("overview");
    }
    const btn = document.getElementById("validate-btn");
    const btnLabel = btn?.querySelector(".btn-label");
    if (btn) {
      btn.disabled = true;
      btn.setAttribute("aria-busy", "true");
    }
    if (btnLabel) btnLabel.textContent = "Running...";
    showLoading();
    hideError();
    hideResults();
    setValidationProgress({ status: "queued", progress: 2, message: "Preparing validation run..." });
    try {
      const webflow = window.webflow;
      if (!webflow) {
        throw new Error("Webflow Designer API not available. Please ensure this extension is running in Webflow Designer.");
      }
      const projectData = await collectProjectData(webflow);
      const designerContext = await collectDesignerContext(webflow);
      projectData.designerContext = designerContext;
      projectData.canvasChecks = await collectCanvasAccessibility(webflow, designerContext.canAccessCanvas);
      if (designerContext.message) {
        setToolbarStatus(designerContext.message, designerContext.canAccessCanvas === false ? "warning" : "neutral");
      }
      if (!bridgeContext?.siteId) {
        const fallbackSiteId = projectData.siteInfo?.id || null;
        if (fallbackSiteId) {
          bridgeContext = {
            siteId: fallbackSiteId,
            siteName: projectData.siteInfo?.name || void 0,
            siteUrl: bridgeContext?.siteUrl
          };
        }
      }
      const siteUrl = await getSiteUrl(webflow);
      const pageSlugScope = getPageSlugScope(projectData);
      const selectedChecks = getSelectedChecks();
      if (bridgeContext) {
        bridgeContext = {
          ...bridgeContext,
          siteUrl: siteUrl || bridgeContext.siteUrl
        };
      }
      projectData.validationScope = buildValidationScope({
        projectData,
        siteUrl,
        pageSlugScope,
        selectedChecks,
        publishedChecks: bridgeStatus && bridgeStatus.status === "active" ? "full" : "designer-only"
      });
      const projectLabel = projectData?.siteInfo?.name || "Designer Project";
      updateMetaDisplay(projectLabel, projectData);
      console.log("Final site URL for Worker:", siteUrl);
      if (siteUrl) {
        console.log("Will call Worker with URL:", siteUrl);
        console.log("Page slugs to analyze:", pageSlugScope.pageSlugs);
      } else {
        console.warn("No site URL available - Worker validation will be skipped");
      }
      const correlationId = createCorrelationId();
      const bridgeActive = bridgeStatus && bridgeStatus.status === "active";
      if (!bridgeActive) {
        setValidationProgress({
          status: "running",
          progress: 20,
          message: "Running Designer checks. Add the Validator script for full published-site checks..."
        });
        showBridgeDrawer();
        setBridgeMessage(
          "Add the Validator script, publish the site, then re-check. Full submission validation needs this script on the published site."
        );
        setBridgeSetupStep("install");
        setToolbarStatus("Validator script required for submission checks", "warning");
        const designerResults = await runDesignerValidation(projectData, siteUrl, correlationId);
        designerResults.collectedData = [projectData];
        enhanceValidationResults(designerResults, projectData);
        if (!designerResults.categories) designerResults.categories = [];
        designerResults.categories.push({
          category: "Published Site Checks (Requires Validator Script)",
          passed: false,
          issues: [{
            id: "validator-script-required",
            category: "Published Site Checks",
            severity: "warning",
            message: "Additional published-site checks require the Validator script to be added and published.",
            details: {
              howToFix: 'Click "Add Validator script", publish your site, then click "Re-check script". The script enables submitted-result evidence for the marketplace form plus published-site checks such as image loading, contrast, broken links, custom 404, SEO formula, license text, favicon, connected apps, and placeholder content.'
            }
          }],
          stats: { checked: 0, available: 22, status: "validator_script_required" }
        });
        if (!designerResults.summary) {
          designerResults.summary = {
            errors: 0,
            warnings: 0,
            infos: 0,
            passedCategories: 0,
            failedCategories: 0
          };
        }
        designerResults.summary.warnings = (designerResults.summary.warnings || 0) + 1;
        designerResults.summary.failedCategories = (designerResults.summary.failedCategories || 0) + 1;
        setValidationProgress({
          status: "completed",
          progress: 100,
          message: "Designer validation complete. Add and publish the Validator script for full coverage."
        });
        registerValidationReport(designerResults, correlationId);
        showResults(designerResults);
        void notifyDesigner(webflow, "Info", "Designer checks complete. Add and publish the Validator script for full submission validation.");
        void submitValidationResults({
          siteId: bridgeContext?.siteId || projectData.siteInfo?.id || null,
          siteName: bridgeContext?.siteName || projectData.siteInfo?.name || void 0,
          siteUrl,
          validationResults: designerResults,
          correlationId
        });
        return;
      }
      hideBridgeDrawer();
      setBridgeSetupStep("run");
      setToolbarStatus("Running full Validator checks...", "active");
      const validationResults = await runUnifiedValidation({
        siteUrl,
        projectData,
        pageSlugs: pageSlugScope.pageSlugs,
        correlationId
      });
      validationResults.collectedData = [projectData];
      enhanceValidationResults(validationResults, projectData);
      registerValidationReport(validationResults, correlationId);
      showResults(validationResults);
      void notifyValidationOutcome(webflow, validationResults);
      void submitValidationResults({
        siteId: bridgeContext?.siteId || projectData.siteInfo?.id || null,
        siteName: bridgeContext?.siteName || projectData.siteInfo?.name || void 0,
        siteUrl,
        validationResults,
        correlationId
      });
    } catch (error) {
      console.error("Validation error:", error);
      const message = error instanceof Error ? error.message : "Unexpected error";
      setValidationProgress({ status: "failed", progress: 100, message });
      showError(message);
      void notifyDesigner(window.webflow, "Error", message);
    } finally {
      isValidating = false;
      hideLoading();
      if (btn) {
        btn.disabled = false;
        btn.setAttribute("aria-busy", "false");
      }
      if (btnLabel) btnLabel.textContent = "Run Validator";
    }
  }
  function getPageSlugScope(projectData) {
    const slugs = [];
    const seen = /* @__PURE__ */ new Set();
    const skippedCmsTemplateSlugs = [];
    const skippedDraftSlugs = [];
    if (projectData.pages && projectData.pages.length > 0) {
      projectData.pages.forEach((page) => {
        const primaryPath = getFirstUsablePagePath(page);
        if (!primaryPath) return;
        const pathname = getSlugPathname(primaryPath);
        if (isCollectionTemplatePage(page, pathname)) {
          skippedCmsTemplateSlugs.push(pathname);
          return;
        }
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
      skippedCmsTemplateSlugs
    };
  }
  async function collectDesignerContext(webflow) {
    const context = {
      mode: null,
      capabilities: {}
    };
    try {
      if (typeof webflow.getCurrentMode === "function") {
        context.mode = await webflow.getCurrentMode();
      }
    } catch (error) {
      console.warn("Could not get Designer mode:", error);
    }
    try {
      const appModes = webflow.appModes || {};
      const capabilityKeys = [
        "canAccessCanvas",
        "canDesign",
        "canEdit",
        "canAccessAssets",
        "canManageAssets"
      ];
      const requestedCapabilities = capabilityKeys.map((key) => appModes[key]).filter(Boolean);
      if (typeof webflow.canForAppMode === "function" && requestedCapabilities.length > 0) {
        context.capabilities = await webflow.canForAppMode(requestedCapabilities);
        context.canAccessCanvas = readCapability(context.capabilities, "canAccessCanvas");
        context.canDesign = readCapability(context.capabilities, "canDesign");
        context.canEdit = readCapability(context.capabilities, "canEdit");
      }
    } catch (error) {
      console.warn("Could not get Designer capabilities:", error);
    }
    if (context.canAccessCanvas === false) {
      context.message = "Limited Designer access in this mode";
    } else if (context.mode) {
      context.message = `Designer mode: ${formatModeName(context.mode)}`;
    }
    return context;
  }
  function readCapability(capabilities, key) {
    if (typeof capabilities[key] === "boolean") return capabilities[key];
    const matchingEntry = Object.entries(capabilities).find(([capabilityKey]) => capabilityKey.endsWith(key));
    return typeof matchingEntry?.[1] === "boolean" ? matchingEntry[1] : void 0;
  }
  function formatModeName(value) {
    return value.replace(/^can/, "").replace(/[-_]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim().split(/\s+/).map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(" ");
  }
  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  }
  function buildValidationScope({
    projectData,
    siteUrl,
    pageSlugScope,
    selectedChecks,
    publishedChecks
  }) {
    const domainSelection = selectValidationDomain(projectData.siteInfo);
    return {
      siteUrl,
      domainSource: domainSelection.source,
      domainStage: domainSelection.domain?.stage,
      domainLastPublished: domainSelection.domain?.lastPublished || null,
      domainDefault: domainSelection.domain?.default,
      isPasswordProtected: projectData.siteInfo?.isPasswordProtected,
      isPrivateStaging: projectData.siteInfo?.isPrivateStaging,
      pageScope: isOptionEnabled("opt-page-scope-current", false) ? "current" : "all",
      pageSlugsCount: pageSlugScope.pageSlugs.length,
      skippedCmsTemplateSlugs: pageSlugScope.skippedCmsTemplateSlugs,
      selectedChecks,
      publishedChecks
    };
  }
  function getFirstUsablePagePath(page) {
    const candidates = [
      page.publishPath,
      page.isHomePage ? "/" : null,
      page.path,
      page.slug
    ];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim() !== "") {
        return candidate;
      }
    }
    return null;
  }
  function isCollectionTemplatePage(page, pathname) {
    return Boolean(
      page.isCmsTemplate || page.collectionId || page.collectionName || isInternalCmsTemplateSlug(pathname) || page.publishPath && isInternalCmsTemplateSlug(page.publishPath) || page.path && isInternalCmsTemplateSlug(page.path) || page.slug && isInternalCmsTemplateSlug(page.slug)
    );
  }
  async function getSiteUrl(webflow) {
    try {
      console.log("Getting site URL for enhanced validation...");
      if (webflow.getSiteInfo) {
        const siteInfo = await webflow.getSiteInfo();
        console.log("Site info received:", {
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
      console.warn("Could not determine site URL for enhanced validation");
      return null;
    } catch (error) {
      console.error("Error getting site URL:", error);
      return null;
    }
  }
  function createCorrelationId() {
    return `wfv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
  function isRetryableError(error) {
    if (error instanceof DOMException && error.name === "AbortError") return true;
    if (error instanceof TypeError) return true;
    if (typeof error === "object" && error !== null && "status" in error && typeof error.status === "number") {
      return RETRYABLE_STATUS.has(error.status);
    }
    return false;
  }
  async function fetchWithTimeout(input, init, timeoutMs) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      window.clearTimeout(timeoutId);
    }
  }
  async function fetchJsonWithRetry(input, init, options) {
    const timeoutMs = options?.timeoutMs ?? NETWORK_TIMEOUT_MS;
    const retries = options?.retries ?? MAX_NETWORK_RETRIES;
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt += 1) {
      try {
        const response = await fetchWithTimeout(input, init, timeoutMs);
        if (!response.ok) {
          const text = await response.text().catch(() => "");
          const error = new Error(text || `Request failed with status ${response.status}`);
          error.status = response.status;
          throw error;
        }
        return await response.json();
      } catch (error) {
        lastError = error;
        if (attempt === retries || !isRetryableError(error)) {
          throw error;
        }
        await new Promise((resolve) => window.setTimeout(resolve, attempt * 1e3));
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Request failed");
  }
  function buildValidationSubmitPayload(validationResults) {
    const projectData = Array.isArray(validationResults.collectedData) ? validationResults.collectedData[0] : void 0;
    const scope = projectData?.validationScope;
    return {
      url: validationResults.url,
      summary: validationResults.summary,
      categories: Array.isArray(validationResults.categories) ? validationResults.categories.map((category) => ({
        category: category.category,
        passed: category.passed,
        issues: Array.isArray(category.issues) ? category.issues.map(buildValidationSubmitIssue) : []
      })) : [],
      // The marketplace form uses this to reject partial runs (skipped checks or
      // current-page scope) — a 100% pass only counts when the full suite ran.
      scope: scope ? {
        selectedChecks: scope.selectedChecks,
        pageScope: scope.pageScope,
        publishedChecks: scope.publishedChecks,
        pageSlugsCount: scope.pageSlugsCount
      } : void 0
    };
  }
  async function submitValidationResults({
    siteId,
    siteName,
    siteUrl,
    validationResults,
    correlationId
  }) {
    if (!siteId) {
      console.info("Skipping validation submission because no siteId is available.");
      return;
    }
    try {
      const response = await fetchWithTimeout(
        `${APP_VALIDATOR_BASE}/app-validator/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Correlation-Id": correlationId
          },
          body: JSON.stringify({
            siteId,
            siteName,
            siteUrl: siteUrl || validationResults.url || void 0,
            validationResults: buildValidationSubmitPayload(validationResults)
          })
        },
        NETWORK_TIMEOUT_MS
      );
      let payload = null;
      try {
        payload = await response.json();
      } catch (parseError) {
        console.warn("Validation submission response was not valid JSON:", parseError);
      }
      if (response.status === 429) {
        console.warn("Validation submission rate-limited for this site:", payload);
        return;
      }
      if (!response.ok) {
        console.warn("Validation submission failed:", response.status, payload);
        return;
      }
      if (!payload) {
        console.warn("Validation submission succeeded without a response body.");
        return;
      }
      if (!payload.persisted) {
        console.info("Validation submission accepted without Airtable persistence:", payload);
        return;
      }
      console.info("Validation results submitted successfully:", payload);
    } catch (error) {
      console.warn("Validation submission request failed:", error);
    }
  }
  function initializeOptionDefaults() {
    const defaults = [
      { id: "opt-run-designer", checked: true },
      { id: "opt-run-assets", checked: true },
      { id: "opt-run-content", checked: true },
      { id: "opt-content-lorem", checked: true },
      { id: "opt-content-headings", checked: true },
      { id: "opt-content-altText", checked: true },
      { id: "opt-content-seo", checked: true },
      { id: "opt-content-links", checked: true },
      { id: "opt-content-contentQuality", checked: true },
      { id: "opt-exclude-style-guide", checked: true },
      { id: "opt-page-scope-all", checked: true },
      { id: "opt-page-scope-current", checked: false }
    ];
    for (const item of defaults) {
      const input = document.getElementById(item.id);
      if (input) input.checked = item.checked;
    }
    syncContentOptionsState();
    const runContentInput = document.getElementById("opt-run-content");
    runContentInput?.addEventListener("change", syncContentOptionsState);
  }
  function isOptionEnabled(id, fallback) {
    const input = document.getElementById(id);
    if (!input) return fallback;
    return input.checked;
  }
  function setOptionsPanelOpen(open) {
    const optionsBtn = document.getElementById("options-btn");
    const optionsPanel = document.getElementById("options-panel");
    if (!optionsBtn || !optionsPanel) return;
    optionsBtn.setAttribute("aria-expanded", String(open));
    optionsPanel.hidden = !open;
  }
  function toggleOptionsPanel() {
    const optionsPanel = document.getElementById("options-panel");
    if (!optionsPanel) return;
    setOptionsPanelOpen(optionsPanel.hidden);
  }
  function syncContentOptionsState() {
    const runContentInput = document.getElementById("opt-run-content");
    const contentOptions = document.getElementById("content-options");
    if (!runContentInput || !contentOptions) return;
    const contentInputs = contentOptions.querySelectorAll('input[id^="opt-content-"]');
    contentOptions.classList.toggle("is-disabled", !runContentInput.checked);
    contentInputs.forEach((input) => {
      input.disabled = !runContentInput.checked;
    });
  }
  function getSelectedChecks() {
    const checks = [];
    const runDesigner = isOptionEnabled("opt-run-designer", true);
    const runAssets = isOptionEnabled("opt-run-assets", true);
    const runContent = isOptionEnabled("opt-run-content", true);
    if (runDesigner) checks.push("designer");
    if (runAssets) checks.push("assets");
    if (runContent) {
      checks.push("content");
      checks.push("accessibility");
    }
    if (checks.length === 0) {
      checks.push("designer");
    }
    return checks;
  }
  function getWorkerOptions(projectData) {
    const runAssets = isOptionEnabled("opt-run-assets", true);
    const runContent = isOptionEnabled("opt-run-content", true);
    const includeStyleGuide = !isOptionEnabled("opt-exclude-style-guide", true);
    const pageScopeCurrent = isOptionEnabled("opt-page-scope-current", false);
    const excludePageSlugs = includeStyleGuide ? [] : getStyleGuideExclusionSlugs(projectData);
    return {
      skipAssets: !runAssets,
      skipContent: !runContent,
      skipAccessibility: !runContent,
      excludePageSlugs,
      pageScope: pageScopeCurrent ? "current" : "all",
      currentPageSlug: projectData.currentPage?.publishPath || projectData.currentPage?.slug || "/",
      contentChecks: {
        lorem: isOptionEnabled("opt-content-lorem", true),
        headings: isOptionEnabled("opt-content-headings", true),
        altText: isOptionEnabled("opt-content-altText", true),
        seo: isOptionEnabled("opt-content-seo", true),
        links: isOptionEnabled("opt-content-links", true),
        contentQuality: isOptionEnabled("opt-content-contentQuality", true)
      }
    };
  }
  function getStyleGuideExclusionSlugs(projectData) {
    const excluded = /* @__PURE__ */ new Set(["/style-guide", "/styleguide"]);
    for (const page of projectData.pages || []) {
      const name = (page.name || "").toLowerCase();
      const path = getFirstUsablePagePath(page);
      const pathname = path ? getSlugPathname(path).toLowerCase() : "";
      const isStyleGuide = name.includes("style guide") || name.includes("styleguide") || pathname.endsWith("/style-guide") || pathname.endsWith("/styleguide");
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
    correlationId
  }) {
    if (!siteUrl) {
      setValidationProgress({ status: "running", progress: 40, message: "No site URL found. Running Designer checks only." });
      const designerOnly = await runDesignerValidation(projectData, siteUrl, correlationId);
      setValidationProgress({ status: "completed", progress: 100, message: "Designer validation complete." });
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
      correlationId
    };
    try {
      setValidationProgress({ status: "queued", progress: 8, message: "Starting async review job..." });
      const startData = await fetchJsonWithRetry(
        REVIEW_START_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Correlation-Id": correlationId
          },
          body: JSON.stringify(startPayload)
        },
        { timeoutMs: NETWORK_TIMEOUT_MS, retries: MAX_NETWORK_RETRIES }
      );
      const finalStatus = await waitForReviewCompletion(startData, correlationId);
      if (finalStatus.status !== "completed" || !finalStatus.result) {
        throw new Error(finalStatus.error || "Review completed without result payload");
      }
      setValidationProgress({
        status: "completed",
        progress: 100,
        message: finalStatus.message || "Validation complete."
      });
      return finalStatus.result;
    } catch (error) {
      console.warn("Async review pipeline failed, using legacy fallback:", error);
      setValidationProgress({
        status: "running",
        progress: 18,
        message: "Async endpoint unavailable. Falling back to legacy validation."
      });
      const legacy = await runLegacyValidation(siteUrl, projectData, pageSlugs, correlationId, workerOptions);
      setValidationProgress({
        status: "completed",
        progress: 100,
        message: "Legacy validation complete."
      });
      return legacy;
    }
  }
  async function waitForReviewCompletion(startData, correlationId) {
    return await new Promise((resolve, reject) => {
      let settled = false;
      let eventSource = null;
      let pollTimer = null;
      let timeoutTimer = null;
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
      const finish = (fn) => {
        if (settled) return;
        settled = true;
        cleanup();
        fn();
      };
      const handleStatus = (status) => {
        setValidationProgress({
          status: status.status,
          progress: status.progress,
          message: status.message || "Running validation..."
        });
        if (status.status === "completed") {
          finish(() => resolve(status));
        } else if (status.status === "failed" || status.status === "cancelled") {
          finish(() => reject(new Error(status.error || status.message || "Validation job failed")));
        }
      };
      const safePoll = async () => {
        try {
          const status = await fetchReviewStatus(startData.statusUrl, correlationId);
          handleStatus(status);
        } catch (error) {
          console.warn("Status poll failed:", error);
        }
      };
      pollTimer = window.setInterval(() => {
        void safePoll();
      }, 2500);
      void safePoll();
      if (typeof EventSource !== "undefined") {
        try {
          eventSource = new EventSource(startData.eventsUrl);
          const consume = (event) => {
            try {
              const payload = JSON.parse(event.data);
              if (typeof payload.status === "string" && typeof payload.progress === "number") {
                handleStatus(payload);
              }
            } catch (parseError) {
              console.warn("Failed to parse SSE payload:", parseError);
            }
          };
          eventSource.addEventListener("status", consume);
          eventSource.addEventListener("progress", consume);
          eventSource.addEventListener("complete", () => {
            void safePoll();
          });
          eventSource.addEventListener("error", () => {
          });
          eventSource.onerror = () => {
            if (eventSource) {
              eventSource.close();
              eventSource = null;
            }
          };
        } catch (error) {
          console.warn("EventSource init failed, continuing with polling only:", error);
        }
      }
      timeoutTimer = window.setTimeout(() => {
        finish(() => reject(new Error("Validation job timed out after 8 minutes")));
      }, 8 * 60 * 1e3);
    });
  }
  async function fetchReviewStatus(statusUrl, correlationId) {
    const statusUrlWithCorrelation = new URL(statusUrl);
    statusUrlWithCorrelation.searchParams.set("correlationId", correlationId);
    return await fetchJsonWithRetry(
      statusUrlWithCorrelation.toString(),
      {
        method: "GET"
      },
      { timeoutMs: STATUS_TIMEOUT_MS, retries: MAX_NETWORK_RETRIES }
    );
  }
  async function runLegacyValidation(siteUrl, projectData, pageSlugs, correlationId, workerOptions) {
    const [designerValidation, enhancedValidation] = await Promise.all([
      runDesignerValidation(projectData, siteUrl, correlationId),
      runLegacyEnhancedValidation(siteUrl, projectData, pageSlugs, correlationId, workerOptions)
    ]);
    const validationResults = designerValidation;
    if (enhancedValidation) {
      mergeEnhancedValidation(validationResults, enhancedValidation);
    }
    return validationResults;
  }
  async function runDesignerValidation(projectData, siteUrl, correlationId) {
    const body = JSON.stringify({ designerData: projectData, siteUrl });
    const endpoints = [`${APP_VALIDATOR_BASE}/api/validate`];
    for (const endpoint of endpoints) {
      try {
        const result = await fetchJsonWithRetry(
          endpoint,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Correlation-Id": correlationId
            },
            body
          },
          { timeoutMs: NETWORK_TIMEOUT_MS, retries: MAX_NETWORK_RETRIES }
        );
        if (!result.url) result.url = siteUrl || "";
        if (typeof result.success !== "boolean") result.success = true;
        return result;
      } catch (error) {
        console.warn(`Designer validation failed via ${endpoint}:`, error);
      }
    }
    throw new Error("Designer validation failed on all configured backends.");
  }
  async function runLegacyEnhancedValidation(siteUrl, projectData, pageSlugs, correlationId, workerOptions) {
    try {
      return await fetchJsonWithRetry(
        LEGACY_VALIDATE_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Correlation-Id": correlationId
          },
          body: JSON.stringify({
            siteUrl,
            designerData: projectData,
            pageSlugs,
            options: workerOptions
          })
        },
        { timeoutMs: NETWORK_TIMEOUT_MS, retries: MAX_NETWORK_RETRIES }
      );
    } catch (error) {
      console.warn("Legacy enhanced validation failed:", error);
      return null;
    }
  }
  function setValidationProgress({
    status,
    progress,
    message
  }) {
    const progressWrap = document.getElementById("bridge-progress");
    const stateEl = document.getElementById("bridge-progress-state");
    const percentEl = document.getElementById("bridge-progress-percent");
    const fillEl = document.getElementById("bridge-progress-fill");
    const messageEl = document.getElementById("bridge-progress-message");
    if (progressWrap) progressWrap.style.display = "flex";
    if (stateEl) stateEl.textContent = status;
    if (percentEl) percentEl.textContent = `${Math.max(0, Math.min(100, Math.round(progress)))}%`;
    if (fillEl) fillEl.style.width = `${Math.max(0, Math.min(100, progress))}%`;
    if (messageEl) messageEl.textContent = message;
  }
  async function bootstrapBridgePanel() {
    initializeOptionDefaults();
    const webflow = window.webflow;
    if (!webflow) {
      setBridgeBadge("neutral");
      setBridgeMessage("Webflow Designer API unavailable. Validator script setup is disabled.");
      setBridgeActionsDisabled(true);
      return;
    }
    try {
      const siteInfo = await webflow.getSiteInfo?.();
      const siteId = siteInfo?.siteId || null;
      const siteName = siteInfo?.siteName || "Webflow Site";
      const siteUrl = await getSiteUrl(webflow);
      if (!siteId) {
        setBridgeBadge("failed");
        setBridgeMessage("Could not determine site ID. Validator script setup unavailable.");
        setBridgeActionsDisabled(true);
        return;
      }
      bridgeContext = { siteId, siteName, siteUrl: siteUrl || void 0 };
      setBridgeActionsDisabled(false);
      await refreshBridgeStatus();
    } catch (error) {
      console.warn("Bridge bootstrap failed:", error);
      setBridgeBadge("failed");
      setBridgeMessage("Failed to initialize Validator script setup.");
      setBridgeActionsDisabled(true);
    }
  }
  async function refreshBridgeStatus() {
    if (!bridgeContext?.siteId) return;
    setBridgeSetupStep("recheck");
    setBridgeMessage("Checking the published site for the Validator script...");
    setToolbarStatus("Checking script...", "neutral");
    try {
      const correlationId = createCorrelationId();
      const statusUrl = new URL(`${APP_VALIDATOR_BASE}/app-validator/snippet/status`);
      statusUrl.searchParams.set("siteId", bridgeContext.siteId);
      statusUrl.searchParams.set("correlationId", correlationId);
      if (bridgeContext.siteUrl) {
        statusUrl.searchParams.set("siteUrl", bridgeContext.siteUrl);
      }
      bridgeStatus = await fetchJsonWithRetry(
        statusUrl.toString(),
        {
          method: "GET"
        },
        { timeoutMs: STATUS_TIMEOUT_MS, retries: MAX_NETWORK_RETRIES }
      );
      renderBridgeStatus(bridgeStatus);
    } catch (error) {
      console.warn("Failed to refresh bridge status:", error);
      setBridgeBadge("failed");
      setBridgeMessage("Validator script status check failed. Publish the site, then try again.");
      setBridgeSetupStep("recheck");
      setToolbarStatus("Validator script check failed", "failed");
    }
  }
  async function installBridge() {
    if (!bridgeContext?.siteId) return;
    setBridgeActionsDisabled(true);
    setBridgeMessage("Preparing the Validator script for this site...");
    setBridgeSetupStep("install");
    setToolbarStatus("Preparing Validator script...", "neutral");
    try {
      const correlationId = createCorrelationId();
      const installStatus = await fetchJsonWithRetry(
        `${APP_VALIDATOR_BASE}/app-validator/snippet/install`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Correlation-Id": correlationId
          },
          body: JSON.stringify({
            siteId: bridgeContext.siteId,
            siteName: bridgeContext.siteName,
            installTarget: "head",
            mode: "manual-fallback"
          })
        },
        { timeoutMs: NETWORK_TIMEOUT_MS, retries: MAX_NETWORK_RETRIES }
      );
      bridgeStatus = {
        ...installStatus,
        status: installStatus.status === "active" ? "pending_manual" : installStatus.status,
        installed: false,
        message: "Validator script ready. Paste it in site Head code, publish, then re-check."
      };
      renderBridgeStatus(bridgeStatus);
      openBridgeSnippet();
      const copied = await copyBridgeSnippet(bridgeStatus);
      if (copied) {
        setBridgeMessage("Validator script copied. Paste it in site Head code, publish, then re-check.");
        setToolbarStatus("Validator script copied; publish then re-check", "warning");
        void notifyDesigner(
          window.webflow,
          "Info",
          "Validator script copied. Paste it in Site Settings > Custom Code > Head code, publish, then re-check."
        );
      } else {
        setBridgeMessage("Validator script ready below. Copy it, paste it in site Head code, publish, then re-check.");
        setToolbarStatus("Validator script ready to copy", "warning");
        void notifyDesigner(
          window.webflow,
          "Info",
          "Validator script is ready below. Copy it into Site Settings > Custom Code > Head code, publish, then re-check."
        );
      }
    } catch (error) {
      console.warn("Bridge install failed:", error);
      setBridgeBadge("failed");
      setBridgeMessage(
        "Could not prepare the Validator script. Try again, then publish and re-check."
      );
      setBridgeSetupStep("install");
      setToolbarStatus("Validator script setup failed", "failed");
    } finally {
      setBridgeActionsDisabled(false);
    }
  }
  async function rotateBridgeToken() {
    if (!bridgeContext?.siteId) return;
    setBridgeActionsDisabled(true);
    setBridgeMessage("Rotating the Validator script token...");
    setBridgeSetupStep("publish");
    try {
      const correlationId = createCorrelationId();
      bridgeStatus = await fetchJsonWithRetry(
        `${APP_VALIDATOR_BASE}/app-validator/snippet/rotate-token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Correlation-Id": correlationId
          },
          body: JSON.stringify({
            siteId: bridgeContext.siteId,
            siteName: bridgeContext.siteName
          })
        },
        { timeoutMs: NETWORK_TIMEOUT_MS, retries: MAX_NETWORK_RETRIES }
      );
      renderBridgeStatus(bridgeStatus);
    } catch (error) {
      console.warn("Token rotation failed:", error);
      setBridgeBadge("failed");
      setBridgeMessage("Token rotation failed. Keep the existing script or try again.");
      setBridgeSetupStep("publish");
    } finally {
      setBridgeActionsDisabled(false);
    }
  }
  function renderBridgeStatus(status) {
    setBridgeBadge(status.status);
    setBridgeMessage(getValidatorScriptStatusMessage(status));
    if (status.status === "active") {
      setBridgeSetupStep("run");
      setToolbarStatus("Validator script detected. Run Validator.", "active");
      hideBridgeDrawer();
    } else {
      const snippet = status.snippet;
      const hasGeneratedToken = Boolean(status.bridgeToken);
      setBridgeSetupStep(status.status === "pending_manual" && snippet && hasGeneratedToken ? "publish" : "install");
      setToolbarStatus("Validator script required for submission checks", "warning");
      showBridgeDrawer();
    }
    const tokenRow = document.getElementById("bridge-token-row");
    const tokenValue = document.getElementById("bridge-token-value");
    const snippetWrap = document.getElementById("bridge-snippet-wrap");
    const snippetCode = document.getElementById("bridge-snippet-code");
    const copyBtn = document.getElementById("bridge-copy-btn");
    if (tokenRow && tokenValue) {
      if (status.bridgeToken) {
        tokenRow.style.display = "flex";
        tokenValue.textContent = status.bridgeToken;
      } else {
        tokenRow.style.display = "none";
        tokenValue.textContent = "";
      }
    }
    if (snippetWrap && snippetCode) {
      const snippet = status.snippet;
      if (status.status === "pending_manual" && typeof snippet === "string" && snippet.trim()) {
        snippetWrap.style.display = "block";
        snippetCode.textContent = snippet;
        if (status.bridgeToken) snippetWrap.open = true;
        if (copyBtn) copyBtn.disabled = false;
      } else {
        snippetWrap.style.display = "none";
        snippetCode.textContent = "";
        snippetWrap.open = false;
        if (copyBtn) copyBtn.disabled = true;
      }
    }
  }
  function setBridgeActionsDisabled(disabled) {
    const ids = ["bridge-install-btn", "bridge-rotate-btn", "bridge-recheck-btn", "bridge-copy-btn"];
    for (const id of ids) {
      const btn = document.getElementById(id);
      if (btn) btn.disabled = disabled;
    }
  }
  function setBridgeBadge(status) {
    const badge = document.getElementById("bridge-status-badge");
    if (!badge) return;
    badge.classList.remove("active", "pending_manual", "failed", "neutral");
    badge.classList.add(status);
    const labels = {
      active: "Ready",
      pending_manual: "Script Needed",
      failed: "Error",
      neutral: "Unknown"
    };
    badge.textContent = "\u25CF";
    badge.setAttribute("aria-label", labels[status] || status);
    badge.setAttribute("title", labels[status] || status);
  }
  function setBridgeMessage(message) {
    const messageEl = document.getElementById("bridge-message");
    if (messageEl) messageEl.textContent = message;
  }
  function getValidatorScriptStatusMessage(status) {
    const snippet = status.snippet;
    if (status.status === "active") {
      return "Validator script detected on the published site. Run Validator to confirm a 100% pass.";
    }
    if (status.status === "pending_manual" && typeof snippet === "string" && snippet.trim()) {
      return "Copy the Validator script, paste it in Site Settings > Custom Code > Head code, publish, then re-check.";
    }
    if (status.status === "pending_manual") {
      return "Validator script is not detected on the published site yet. Copy it, publish, then re-check.";
    }
    return "Validator script setup is unavailable. Try again, then publish and re-check.";
  }
  function openBridgeSnippet() {
    const snippetWrap = document.getElementById("bridge-snippet-wrap");
    if (snippetWrap) snippetWrap.open = true;
  }
  async function copyBridgeSnippetFromCurrentStatus() {
    const copied = await copyBridgeSnippet(bridgeStatus);
    if (copied) {
      setBridgeMessage("Validator script copied. Paste it in site Head code, publish, then re-check.");
      setToolbarStatus("Validator script copied; publish then re-check", "warning");
      void notifyDesigner(window.webflow, "Info", "Validator script copied.");
    } else {
      setBridgeMessage("Copy failed. Select the Validator script below and copy it manually.");
      setToolbarStatus("Copy failed; manual selection needed", "warning");
    }
  }
  async function copyBridgeSnippet(status) {
    const snippet = typeof status?.snippet === "string" && status.snippet.trim() ? status.snippet.trim() : "";
    if (!snippet) return false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(snippet);
        return true;
      }
    } catch (error) {
      console.warn("Clipboard API copy failed:", error);
    }
    try {
      const textarea = document.createElement("textarea");
      textarea.value = snippet;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(textarea);
      return copied;
    } catch (error) {
      console.warn("Fallback copy failed:", error);
      return false;
    }
  }
  function showBridgeDrawer() {
    const drawer = document.getElementById("review-bridge");
    if (drawer) drawer.style.display = "flex";
  }
  function hideBridgeDrawer() {
    const drawer = document.getElementById("review-bridge");
    if (drawer) drawer.style.display = "none";
  }
  function setToolbarStatus(text, type) {
    const statusText = document.getElementById("toolbar-status-text");
    const badge = document.getElementById("bridge-status-badge");
    if (statusText) {
      statusText.textContent = text;
      statusText.classList.add("updated");
      setTimeout(() => statusText.classList.remove("updated"), 300);
    }
    if (badge) {
      badge.classList.remove("active", "pending_manual", "failed", "neutral");
      badge.classList.add(
        type === "active" ? "active" : type === "warning" ? "pending_manual" : type === "failed" ? "failed" : "neutral"
      );
      badge.textContent = "\u25CF";
    }
  }
  async function notifyDesigner(webflow, type, message) {
    try {
      if (typeof webflow?.notify === "function") {
        await webflow.notify({ type, message });
      }
    } catch (error) {
      console.warn("Designer notification failed:", error);
    }
  }
  async function notifyValidationOutcome(webflow, data) {
    const outcome = getMarketplaceOutcome(data);
    if (outcome.className === "is-ready") {
      await notifyDesigner(webflow, "Success", "Validator passed. The latest result is ready for template submission.");
      return;
    }
    if (outcome.className === "is-review") {
      await notifyDesigner(webflow, "Info", "Validator is ready with non-blocking warnings. Review the Overview before handoff.");
      return;
    }
    await notifyDesigner(webflow, "Error", "Validator is not submission-ready. Open the Fix List to resolve blocking items.");
  }
  function setBridgeSetupStep(activeStep) {
    const steps = [
      "install",
      "publish",
      "recheck",
      "run"
    ];
    const activeIndex = steps.indexOf(activeStep);
    steps.forEach((step, index) => {
      const element = document.getElementById(`bridge-step-${step}`);
      if (!element) return;
      element.classList.remove("is-active", "is-complete");
      if (index < activeIndex) {
        element.classList.add("is-complete");
      } else if (index === activeIndex) {
        element.classList.add("is-active");
      }
    });
  }
  function mergeEnhancedValidation(designerResults, enhancedResults) {
    try {
      console.log("Merging enhanced validation results...");
      console.log("Enhanced results structure:", Object.keys(enhancedResults.analysis || enhancedResults || {}));
      console.log("Categories before merge:", designerResults.categories.length);
      const analysis = enhancedResults.analysis || enhancedResults;
      if (analysis.assets) {
        console.log("Adding Assets & Images category");
        const hasErrors = analysis.assets.issues.filter((i) => i.severity === "error").length > 0;
        designerResults.categories.push({
          category: "Assets & Images",
          passed: !hasErrors,
          issues: analysis.assets.issues,
          stats: analysis.assets.stats
        });
      }
      if (analysis.content) {
        console.log("Adding Content & Accessibility category");
        const hasErrors = analysis.content.issues.filter((i) => i.severity === "error").length > 0;
        designerResults.categories.push({
          category: "Content & Accessibility",
          passed: !hasErrors,
          issues: analysis.content.issues,
          stats: analysis.content.stats
        });
      }
      if (analysis.accessibility) {
        console.log("Adding Accessibility & WCAG category");
        const surfacedAccessibilityIssues = getSurfacedAccessibilityIssues(
          analysis.accessibility,
          Boolean(analysis.content)
        );
        if (surfacedAccessibilityIssues.length > 0) {
          const hasErrors = surfacedAccessibilityIssues.filter((i) => i.severity === "error").length > 0;
          designerResults.categories.push({
            category: "Accessibility & WCAG",
            passed: !hasErrors,
            issues: surfacedAccessibilityIssues,
            stats: analysis.accessibility.stats
          });
        }
      }
      if (analysis.interactions) {
        console.log("Adding Interactions and GSAP category");
        const hasErrors = analysis.interactions.issues.filter((i) => i.severity === "error").length > 0;
        designerResults.categories.push({
          category: "Interactions and GSAP",
          passed: !hasErrors,
          issues: analysis.interactions.issues,
          stats: analysis.interactions.stats
        });
      }
      const allIssues = designerResults.categories.flatMap((cat) => cat.issues || []);
      const totalErrors = allIssues.filter((issue) => issue.severity === "error").length;
      const totalWarnings = allIssues.filter((issue) => issue.severity === "warning").length;
      const totalInfo = allIssues.filter((issue) => issue.severity === "info").length;
      designerResults.summary.totalErrors = totalErrors;
      designerResults.summary.totalWarnings = totalWarnings;
      designerResults.summary.totalInfo = totalInfo;
      designerResults.summary.passedCategories = designerResults.categories.filter((c) => c.passed).length;
      designerResults.summary.failedCategories = designerResults.categories.filter((c) => !c.passed).length;
      console.log("Enhanced validation results merged successfully!");
      console.log("Total categories after merge:", designerResults.categories.length);
      console.log("Final category list:", designerResults.categories.map((c) => c.category));
    } catch (error) {
      console.warn("Error merging enhanced validation results:", error);
    }
  }
  function getSurfacedAccessibilityIssues(accessibilityAnalysis, contentAnalysisIncluded) {
    const issues = filterRetiredAccessibilityIssues(
      Array.isArray(accessibilityAnalysis?.issues) ? accessibilityAnalysis.issues : []
    );
    if (!contentAnalysisIncluded) {
      return issues;
    }
    const duplicateIssueIds = /* @__PURE__ */ new Set(["missing-alt-text-critical", "heading-structure-errors"]);
    return issues.filter((issue) => !duplicateIssueIds.has(issue.id));
  }
  async function collectCanvasAccessibility(webflow, canAccessCanvas) {
    const unavailable = (reason) => ({
      available: false,
      reason,
      headingsChecked: 0,
      headingIssues: [],
      imagesChecked: 0,
      imagesMissingAlt: 0,
      missingAltElementKeys: []
    });
    canvasElementRegistry.clear();
    if (canAccessCanvas === false) {
      return unavailable("Canvas access is unavailable in the current Designer mode");
    }
    if (typeof webflow.getAllElements !== "function") {
      return unavailable("Element API unavailable in this Designer version");
    }
    try {
      const [elements, currentPage] = await Promise.all([
        webflow.getAllElements(),
        webflow.getCurrentPage()
      ]);
      const pageName = await currentPage?.getName?.() || "Current Page";
      const headingIssues = [];
      let headingsChecked = 0;
      let lastLevel = 0;
      for (const element of elements) {
        if (element.type !== "Heading") continue;
        let level = null;
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
            issue: `First heading on the canvas is H${level} \u2014 it should be H1`,
            position: headingsChecked,
            level,
            elementKey
          });
        } else if (headingsChecked > 1 && level > lastLevel + 1) {
          const elementKey = `canvas-heading-${headingsChecked}`;
          canvasElementRegistry.set(elementKey, element);
          headingIssues.push({
            issue: `H${level} follows H${lastLevel}, skipping H${lastLevel + 1}`,
            position: headingsChecked,
            level,
            elementKey
          });
        }
        lastLevel = level;
      }
      let imagesChecked = 0;
      let imagesMissingAlt = 0;
      const missingAltElementKeys = [];
      for (const element of elements) {
        if (element.type !== "Image") continue;
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
        missingAltElementKeys
      };
    } catch (error) {
      console.warn("Canvas accessibility collection failed:", error);
      return unavailable(error instanceof Error ? error.message : "Canvas analysis failed");
    }
  }
  async function componentContainsComponentInstance(component, maxDepth = 4) {
    const root = await component.getRootElement();
    if (!root) return false;
    let frontier = [root];
    for (let depth = 0; depth < maxDepth && frontier.length > 0; depth++) {
      const next = [];
      for (const element of frontier) {
        if (element.type === "ComponentInstance") return true;
        if ("children" in element && element.children) {
          next.push(...await element.getChildren());
        }
      }
      frontier = next;
    }
    return false;
  }
  async function collectProjectData(webflow) {
    const data = {
      variables: void 0,
      components: [],
      styles: [],
      pages: [],
      siteInfo: void 0,
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
    console.log("Starting project data collection...");
    try {
      if (webflow.getAllVariableCollections) {
        const collections = await webflow.getAllVariableCollections() || [];
        const variableData = [];
        let totalVariables = 0;
        let totalVariableModes = 0;
        for (const collection of collections) {
          try {
            const collectionName = await collection.getName() || "Unnamed Collection";
            const variables = await collection.getAllVariables();
            const variableList = [];
            const modeList = [];
            let modeDataAvailable = false;
            for (const variable of variables) {
              try {
                const variableName = await variable.getName() || null;
                const variableType = variable.type || null;
                if (variableName) {
                  const lowerName = variableName.toLowerCase();
                  if (lowerName.includes("color") || lowerName.includes("bg") || lowerName.includes("text") || lowerName.includes("primary") || lowerName.includes("secondary")) {
                    data.enhancedValidation.variableOrganization.hasColorVariables = true;
                  }
                  if (lowerName.includes("font") || lowerName.includes("text") || lowerName.includes("heading") || lowerName.includes("body") || lowerName.includes("size")) {
                    data.enhancedValidation.variableOrganization.hasTypographyVariables = true;
                  }
                  if (lowerName.includes("space") || lowerName.includes("margin") || lowerName.includes("padding") || lowerName.includes("gap")) {
                    data.enhancedValidation.variableOrganization.hasSpacingVariables = true;
                  }
                }
                let variableValue = null;
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
                console.warn("Error processing variable:", variableError);
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
              const modes = typeof collection.getAllVariableModes === "function" ? await collection.getAllVariableModes() : void 0;
              if (Array.isArray(modes)) {
                modeDataAvailable = true;
                for (const mode of modes) {
                  try {
                    const modeName = await mode.getName() || mode.id || "Unnamed Mode";
                    modeList.push({
                      id: String(mode.id),
                      name: String(modeName)
                    });
                  } catch (modeError) {
                    console.warn("Error processing variable mode:", modeError);
                  }
                }
              }
            } catch (modeCollectionError) {
              console.warn(`Error processing variable modes for collection "${collectionName}":`, modeCollectionError);
              data.collectionWarnings.push({
                source: "Variable Modes",
                message: `Failed to collect variable modes for ${collectionName}`,
                error: modeCollectionError instanceof Error ? modeCollectionError.message : String(modeCollectionError)
              });
            }
            const collectionPayload = {
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
            console.log(`Variables in collection "${collectionName}": ${variableList.length}, Modes: ${modeDataAvailable ? modeList.length : "unavailable"}`);
          } catch (collectionError) {
            console.warn("Error processing variable collection:", collectionError);
          }
        }
        if (variableData.length > 0) {
          data.variables = { collections: variableData };
          data.collectionMetadata.variableCollections = variableData.length;
          data.collectionMetadata.totalVariables = totalVariables;
          data.collectionMetadata.totalVariableModes = totalVariableModes;
          console.log(`Variable collections collected: ${variableData.length}, Total variables: ${totalVariables}, Total modes: ${totalVariableModes}`);
        }
      }
    } catch (error) {
      console.warn("Could not fetch variable collections:", error);
      data.collectionWarnings.push({
        source: "Variable Collections",
        message: "Failed to collect variable data",
        error: error instanceof Error ? error.message : String(error)
      });
    }
    try {
      if (webflow.getAllComponents) {
        const components = await webflow.getAllComponents() || [];
        const componentData = [];
        for (const component of components) {
          try {
            const name = await component.getName() || null;
            const id = component.id;
            if (name) {
              const lowerName = name.toLowerCase();
              let instances = 0;
              let isNested = false;
              if (lowerName.includes("nav") || lowerName.includes("header") || lowerName.includes("menu")) {
                data.enhancedValidation.componentArchitecture.hasNavbarComponent = true;
              }
              if (lowerName.includes("footer")) {
                data.enhancedValidation.componentArchitecture.hasFooterComponent = true;
              }
              if (lowerName.includes("cta") || lowerName.includes("button") || lowerName.includes("call")) {
                data.enhancedValidation.componentArchitecture.hasCTAComponents = true;
              }
              try {
                if (typeof component.getInstanceCount === "function") {
                  instances = await component.getInstanceCount();
                }
                isNested = await componentContainsComponentInstance(component);
                if (isNested) {
                  data.enhancedValidation.componentArchitecture.hasNestedComponents = true;
                }
              } catch (nestedError) {
                console.warn("Error analyzing component nesting:", nestedError);
              }
              componentData.push({
                id,
                name,
                type: "component",
                instances,
                isNested
              });
            }
          } catch (compError) {
            console.warn("Error processing component:", compError);
          }
        }
        data.components = componentData;
        data.collectionMetadata.totalComponents = componentData.length;
        console.log(`Components collected: ${componentData.length}`);
      }
    } catch (error) {
      console.warn("Could not fetch components:", error);
      data.collectionWarnings.push({
        source: "Components",
        message: "Failed to collect component data",
        error: error instanceof Error ? error.message : String(error)
      });
    }
    try {
      if (webflow.getAllStyles) {
        const styles = await webflow.getAllStyles() || [];
        const styleData = [];
        for (const style of styles) {
          try {
            const name = await style.getName() || null;
            const id = style.id;
            const styleType = "class";
            if (name && !name.startsWith("_")) {
              let properties = {};
              let isHtmlTag = false;
              let hasVariables = false;
              if (isHtmlTagStyleName(name)) {
                isHtmlTag = true;
                data.enhancedValidation.styleSystem.hasHtmlTagStyles = true;
              }
              try {
                if (style.getProperties) {
                  properties = await style.getProperties() || {};
                  Object.values(properties).forEach((value) => {
                    if (typeof value === "object" && value !== null && (value.type === "variable" || value.id)) {
                      hasVariables = true;
                      data.enhancedValidation.styleSystem.usesVariablesInStyles = true;
                    }
                  });
                  if (properties["line-height"]) {
                    const lineHeight = String(properties["line-height"]);
                    if (lineHeight.includes("%") || !lineHeight.includes("px") && !lineHeight.includes("rem") && !isNaN(parseFloat(lineHeight))) {
                      data.enhancedValidation.styleSystem.hasPercentageLineHeights = true;
                    }
                  }
                }
              } catch (propertyError) {
                console.warn("Error getting style properties:", propertyError);
              }
              styleData.push({
                id,
                name,
                type: styleType,
                properties,
                isHtmlTag,
                hasVariables
              });
            }
          } catch (styleError) {
            console.warn("Error processing style:", styleError);
          }
        }
        data.styles = styleData;
        data.collectionMetadata.totalStyles = styleData.length;
        console.log(`Styles collected: ${styleData.length}`);
      }
    } catch (error) {
      console.warn("Could not fetch styles:", error);
      data.collectionWarnings.push({
        source: "Styles",
        message: "Failed to collect style data",
        error: error instanceof Error ? error.message : String(error)
      });
    }
    try {
      if (webflow.getAllPagesAndFolders) {
        const pagesAndFolders = await webflow.getAllPagesAndFolders() || [];
        const pageData = [];
        const items = Array.isArray(pagesAndFolders) ? pagesAndFolders : [];
        for (const item of items) {
          try {
            if (item.type === "Page") {
              const name = await item.getName() || "Unnamed";
              const slug = await item.getSlug() || "";
              const publishPath = await item.getPublishPath();
              let collectionId = null;
              let collectionName = null;
              let pageKind = null;
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
              try {
                if (typeof item.getKind === "function") {
                  pageKind = await item.getKind();
                }
              } catch {
                pageKind = null;
              }
              try {
                if (typeof item.isDraft === "function") {
                  isDraftPage = await item.isDraft();
                }
              } catch {
                isDraftPage = false;
              }
              const isCmsTemplate = Boolean(
                collectionId || collectionName || pageKind === "cms" || pageKind === null && (isInternalCmsTemplateSlug(slug) || publishPath && isInternalCmsTemplateSlug(publishPath))
              );
              let isHomePage = false;
              let hasValidNaming = false;
              const lowerName = name.toLowerCase();
              const lowerSlug = slug.toLowerCase();
              if (lowerName.includes("style guide") || lowerSlug.includes("style-guide") || lowerSlug.includes("styleguide")) {
                data.enhancedValidation.pageStructure.hasStyleGuidePage = true;
              }
              if (lowerName.includes("instructions") || lowerSlug.includes("instructions")) {
                data.enhancedValidation.pageStructure.hasInstructionsPage = true;
              }
              if (lowerName.includes("license") || lowerSlug.includes("license") || slug === "/licenses") {
                data.enhancedValidation.pageStructure.hasLicensePage = true;
              }
              try {
                if (typeof item.isHomepage === "function") {
                  isHomePage = await item.isHomepage();
                }
              } catch {
                isHomePage = false;
              }
              if (!isHomePage && (slug === "/" || lowerName === "home" || lowerName === "homepage" || lowerSlug === "home")) {
                isHomePage = true;
              }
              const isTitleCase = /^[A-Z][a-z]*(?:\s[A-Z][a-z]*)*$/.test(name) || name.split(" ").every((word) => word.charAt(0) === word.charAt(0).toUpperCase());
              if (isTitleCase) {
                hasValidNaming = true;
              } else {
                data.enhancedValidation.pageStructure.pagesNotTitleCase.push(name);
              }
              const expectedSlug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
              const actualSlug = slug.replace(/^\//, "").toLowerCase();
              if (!isCmsTemplate && expectedSlug !== actualSlug && !(isHomePage && actualSlug === "")) {
                data.enhancedValidation.pageStructure.pagesWithMismatchedSlugs.push(`${name} (/${actualSlug})`);
              }
              let seoData = null;
              try {
                seoData = await collectPageSeoData(item);
                if (seoData) {
                  console.log(`SEO data collected for ${name}:`, {
                    hasTitle: !!seoData.title,
                    hasDescription: !!seoData.description,
                    titleLength: seoData.titleLength,
                    descriptionLength: seoData.descriptionLength
                  });
                }
              } catch (seoError) {
                console.warn(`SEO data collection failed for page ${name}:`, seoError);
              }
              pageData.push({
                id: item.id,
                name,
                slug,
                path: slug,
                publishPath,
                collectionId,
                collectionName,
                isCmsTemplate,
                kind: pageKind,
                isDraft: isDraftPage,
                type: item.type,
                isHomePage,
                hasValidNaming,
                seo: seoData
              });
            }
          } catch (pageError) {
            console.warn("Error processing page:", pageError);
          }
        }
        data.enhancedValidation.pageStructure.hasTitleCaseNaming = pageData.length > 0 && data.enhancedValidation.pageStructure.pagesNotTitleCase.length === 0;
        data.enhancedValidation.pageStructure.hasMatchingSlugs = pageData.length > 0 && data.enhancedValidation.pageStructure.pagesWithMismatchedSlugs.length === 0;
        data.pages = pageData;
        data.collectionMetadata.totalPages = pageData.length;
        console.log(`Pages collected: ${pageData.length}`);
      }
    } catch (error) {
      console.warn("Could not fetch pages:", error);
      data.collectionWarnings.push({
        source: "Pages",
        message: "Failed to collect page data",
        error: error instanceof Error ? error.message : String(error)
      });
    }
    try {
      console.log("Collecting current page SEO data...");
      const currentPageData = await collectCurrentPageSEOData(webflow);
      if (currentPageData) {
        data.currentPage = currentPageData;
        data.enhancedValidation.seoCompliance.currentPageHasValidTitle = currentPageData.seo.hasValidTitle || false;
        data.enhancedValidation.seoCompliance.currentPageHasValidDescription = currentPageData.seo.hasValidDescription || false;
        data.enhancedValidation.seoCompliance.titleWithinLimits = (currentPageData.seo.titleLength || 0) <= 60;
        data.enhancedValidation.seoCompliance.descriptionWithinLimits = (currentPageData.seo.descriptionLength || 0) >= 150 && (currentPageData.seo.descriptionLength || 0) <= 160;
        const hasOpenGraphData = !!(currentPageData.seo.openGraphTitle || currentPageData.seo.openGraphDescription || currentPageData.seo.openGraphImage);
        data.enhancedValidation.seoCompliance.hasOpenGraphData = hasOpenGraphData;
        console.log("SEO compliance analysis:", {
          hasValidTitle: data.enhancedValidation.seoCompliance.currentPageHasValidTitle,
          hasValidDescription: data.enhancedValidation.seoCompliance.currentPageHasValidDescription,
          titleWithinLimits: data.enhancedValidation.seoCompliance.titleWithinLimits,
          descriptionWithinLimits: data.enhancedValidation.seoCompliance.descriptionWithinLimits,
          hasOpenGraphData,
          usesCustomOGTitle: currentPageData.seo.hasCustomOpenGraphTitle,
          usesCustomOGDescription: currentPageData.seo.hasCustomOpenGraphDescription
        });
        console.log(`Current page SEO collected: ${currentPageData.name}`);
      }
    } catch (error) {
      console.warn("Could not fetch current page SEO data:", error);
      data.collectionWarnings.push({
        source: "Current Page SEO",
        message: "Failed to collect current page SEO data",
        error: error instanceof Error ? error.message : String(error)
      });
    }
    try {
      const site = await webflow.getSiteInfo?.() || {};
      data.siteInfo = normalizeSiteInfo(site);
    } catch (error) {
      console.warn("Could not fetch site info:", error);
      data.collectionWarnings.push({
        source: "Site Info",
        message: "Failed to collect site information",
        error: error instanceof Error ? error.message : String(error)
      });
    }
    analyzeNamingConsistency(data);
    console.log("Project data collection complete:", data.collectionMetadata);
    console.log("Enhanced validation results:", data.enhancedValidation);
    return data;
  }
  function addStyleSystemValidation(results, projectData) {
    const issues = [];
    if (projectData.styles && Array.isArray(projectData.styles)) {
      const requiredTags2 = ["body", "h1", "h2", "h3", "h4", "h5", "h6", "p", "a"];
      const existingTagStyles = [];
      const tagStylesWithVariables = [];
      projectData.styles.forEach((style) => {
        const styleName = style.name?.toLowerCase() || "";
        requiredTags2.forEach((tag) => {
          if (styleName === tag || styleName === `all ${tag}`) {
            existingTagStyles.push(tag);
            if (style.hasVariables) {
              tagStylesWithVariables.push(tag);
            }
          }
        });
      });
      const missingTags = requiredTags2.filter((tag) => !existingTagStyles.includes(tag));
      if (missingTags.length > 0) {
        issues.push({
          id: "missing-html-tag-styles",
          category: "Style System",
          severity: "error",
          message: `Missing base styles for HTML tags: ${missingTags.join(", ")}`,
          details: {
            howToFix: "Create base styles for all HTML tags (body, h1-h6, p, a)",
            samples: missingTags
          }
        });
      }
      const tagsWithoutVariables = existingTagStyles.filter((tag) => !tagStylesWithVariables.includes(tag));
      if (tagsWithoutVariables.length > 0) {
        issues.push({
          id: "html-tags-without-variables",
          category: "Style System",
          severity: "error",
          message: `HTML tag styles not using variables: ${tagsWithoutVariables.join(", ")}`,
          details: {
            howToFix: "Update HTML tag styles to use variables for colors, typography, and spacing",
            samples: tagsWithoutVariables
          }
        });
      }
      const totalStyles2 = projectData.styles.length;
      const stylesWithVariables2 = projectData.styles.filter((s) => s.hasVariables).length;
      const variableUsagePercent2 = totalStyles2 > 0 ? Math.round(stylesWithVariables2 / totalStyles2 * 100) : 0;
      if (variableUsagePercent2 < 50) {
        issues.push({
          id: "low-variable-usage",
          category: "Style System",
          severity: "warning",
          message: `Only ${variableUsagePercent2}% of styles use variables (${stylesWithVariables2}/${totalStyles2})`,
          details: {
            howToFix: "Increase variable usage in styles for better maintainability (aim for 80%+)"
          }
        });
      }
    }
    const totalStyles = projectData.styles?.length || 0;
    const stylesWithVariables = projectData.styles?.filter((s) => s.hasVariables).length || 0;
    const variableUsagePercent = totalStyles > 0 ? Math.round(stylesWithVariables / totalStyles * 100) : 0;
    const requiredTags = ["body", "h1", "h2", "h3", "h4", "h5", "h6", "p", "a"];
    const htmlTagStylesFound = projectData.styles?.filter((s) => s.isHtmlTag).length || 0;
    let styleSystemCategory = results.categories.find((cat) => cat.category === "Style System");
    if (!styleSystemCategory) {
      styleSystemCategory = {
        category: "Style System",
        passed: issues.filter((i) => i.severity === "error").length === 0,
        issues,
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
      styleSystemCategory.passed = styleSystemCategory.issues.filter((i) => i.severity === "error").length === 0;
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
  function normalizeVariableModesCategory(results) {
    const variableModesCategory = results.categories.find((cat) => cat.category === "Variable Modes");
    if (!variableModesCategory?.stats) return;
    const totalModes = typeof variableModesCategory.stats.totalModes === "number" ? variableModesCategory.stats.totalModes : 0;
    if (totalModes <= 0) return;
    let convertedWarning = false;
    variableModesCategory.issues = (variableModesCategory.issues || []).map((issue) => {
      const isNameOnlyModeWarning = issue.id === "modes.no-responsive" || /modes found, but none appear to be for responsive breakpoints/i.test(issue.message || "");
      if (!isNameOnlyModeWarning) return issue;
      convertedWarning = true;
      return {
        ...issue,
        id: "modes.good",
        severity: "info",
        message: `${totalModes} modes configured across ${variableModesCategory.stats?.collectionsWithModes || 1} collections.`,
        howToFix: void 0
      };
    });
    if (convertedWarning) {
      variableModesCategory.passed = true;
      variableModesCategory.stats.modeDataAvailable = true;
    }
  }
  function addCanvasChecksCategory(results, projectData) {
    const canvas = projectData.canvasChecks;
    if (!canvas || !canvas.available) return;
    const issues = [];
    for (const headingIssue of canvas.headingIssues) {
      issues.push({
        id: `canvas-heading-${headingIssue.position}`,
        category: "Canvas Checks (Current Page)",
        severity: "warning",
        message: headingIssue.issue,
        details: {
          howToFix: "Adjust the heading level in the element settings so levels increase one step at a time.",
          location: `${canvas.pageName} \u2014 heading ${headingIssue.position} of ${canvas.headingsChecked}`,
          canvasElementKeys: headingIssue.elementKey ? [headingIssue.elementKey] : void 0
        }
      });
    }
    if (canvas.imagesMissingAlt > 0) {
      issues.push({
        id: "canvas-images-missing-alt",
        category: "Canvas Checks (Current Page)",
        severity: "info",
        message: `${canvas.imagesMissingAlt} of ${canvas.imagesChecked} image(s) on this page have no alt text in the Designer.`,
        details: {
          howToFix: "Add descriptive alt text in each image's settings, or mark purely decorative images as decorative.",
          canvasElementKeys: canvas.missingAltElementKeys.length > 0 ? canvas.missingAltElementKeys : void 0
        }
      });
    }
    results.categories.push({
      category: "Canvas Checks (Current Page)",
      passed: issues.filter((issue) => issue.severity === "error" || issue.severity === "warning").length === 0,
      issues,
      stats: {
        page: canvas.pageName,
        headingsChecked: canvas.headingsChecked,
        imagesChecked: canvas.imagesChecked,
        note: "Reflects current Designer state, including unpublished changes"
      }
    });
  }
  function addRepublishHints(results, projectData) {
    const canvas = projectData.canvasChecks;
    if (!canvas || !canvas.available) return;
    const hint = (dimension) => `The current page's canvas passes the ${dimension} check \u2014 if you've already fixed this in the Designer, republish the site and re-run validation to update this result.`;
    const headingIssueIds = /* @__PURE__ */ new Set(["heading-hierarchy-errors", "heading-structure-errors"]);
    const altIssueIds = /* @__PURE__ */ new Set(["missing-alt-text-critical", "missing-alt-text", "images-missing-alt"]);
    for (const category of results.categories) {
      for (const issue of category.issues || []) {
        if (issue.id.startsWith("canvas-")) continue;
        if (canvas.headingsChecked > 0 && canvas.headingIssues.length === 0 && headingIssueIds.has(issue.id)) {
          issue.details = { ...issue.details, republishHint: hint("heading hierarchy") };
        }
        if (canvas.imagesChecked > 0 && canvas.imagesMissingAlt === 0 && altIssueIds.has(issue.id)) {
          issue.details = { ...issue.details, republishHint: hint("image alt text") };
        }
      }
    }
  }
  function enhanceValidationResults(results, projectData) {
    console.log("Enhancing validation results with client-side analysis...");
    addStyleSystemValidation(results, projectData);
    normalizeVariableModesCategory(results);
    addCanvasChecksCategory(results, projectData);
    addRepublishHints(results, projectData);
    const pageStructureCategory = results.categories.find((cat) => cat.category === "Page Structure");
    if (pageStructureCategory && projectData.pages && projectData.pages.length > 0) {
      console.log(`Found ${projectData.pages.length} pages, updating Page Structure validation...`);
      pageStructureCategory.issues = [];
      pageStructureCategory.passed = true;
      if (pageStructureCategory.stats) {
        pageStructureCategory.stats.totalPages = projectData.pages.length;
        pageStructureCategory.stats.totalFolders = 0;
        pageStructureCategory.stats.hasHomePage = projectData.pages.some((p) => p.slug === "/" || p.isHomePage);
      } else {
        pageStructureCategory.stats = {
          totalPages: projectData.pages.length,
          totalFolders: 0,
          hasHomePage: projectData.pages.some((p) => p.slug === "/" || p.isHomePage)
        };
      }
      const issues = [];
      if (projectData.enhancedValidation) {
        const pageStructure = projectData.enhancedValidation.pageStructure;
        const pagesNotTitleCase = pageStructure.pagesNotTitleCase || [];
        if (pagesNotTitleCase.length > 0) {
          issues.push({
            id: "page-naming",
            category: "Page Structure",
            severity: "warning",
            message: `${pagesNotTitleCase.length} page(s) don't use Title Case naming convention.`,
            details: {
              howToFix: 'Use Title Case for page names (e.g., "Style Guide", "Contact Us")',
              samples: pagesNotTitleCase.slice(0, 10)
            }
          });
        }
        const pagesWithMismatchedSlugs = pageStructure.pagesWithMismatchedSlugs || [];
        if (pagesWithMismatchedSlugs.length > 0) {
          issues.push({
            id: "page-slug-mismatch",
            category: "Page Structure",
            severity: "warning",
            message: `${pagesWithMismatchedSlugs.length} page(s) have slugs that don't match their names.`,
            details: {
              howToFix: 'Keep page slugs aligned with page names (e.g., "Style Guide" \u2192 /style-guide)',
              samples: pagesWithMismatchedSlugs.slice(0, 10)
            }
          });
        }
      }
      pageStructureCategory.issues = issues;
      pageStructureCategory.passed = issues.filter((i) => i.severity === "error").length === 0;
      const errorCount = issues.filter((i) => i.severity === "error").length;
      const warningCount = issues.filter((i) => i.severity === "warning").length;
      if (pageStructureCategory.passed) {
        results.summary.passedCategories = Math.max(
          results.summary.passedCategories,
          results.categories.filter((c) => c.passed).length
        );
        results.summary.failedCategories = Math.max(
          0,
          results.categories.filter((c) => !c.passed).length
        );
      }
      console.log(`Page Structure validation updated: ${pageStructureCategory.passed ? "PASSED" : "FAILED"}, ${errorCount} errors, ${warningCount} warnings`);
    }
    console.log("SEO validation now handled by Cloudflare Worker - accurate validation via published content analysis");
    results.categories.sort((a, b) => {
      const aErrors = a.issues?.filter((i) => i.severity === "error").length || 0;
      const bErrors = b.issues?.filter((i) => i.severity === "error").length || 0;
      const aWarnings = a.issues?.filter((i) => i.severity === "warning").length || 0;
      const bWarnings = b.issues?.filter((i) => i.severity === "warning").length || 0;
      if (aErrors > 0 && bErrors === 0) return -1;
      if (aErrors === 0 && bErrors > 0) return 1;
      if (aErrors === 0 && bErrors === 0) {
        if (aWarnings > 0 && bWarnings === 0) return -1;
        if (aWarnings === 0 && bWarnings > 0) return 1;
      }
      if (!a.passed && b.passed) return -1;
      if (a.passed && !b.passed) return 1;
      return 0;
    });
    const allIssues = results.categories.flatMap((cat) => cat.issues || []);
    const totalErrors = allIssues.filter((issue) => issue.severity === "error").length;
    const totalWarnings = allIssues.filter((issue) => issue.severity === "warning").length;
    const totalInfo = allIssues.filter((issue) => issue.severity === "info").length;
    results.summary.totalErrors = totalErrors;
    results.summary.totalWarnings = totalWarnings;
    results.summary.totalInfo = totalInfo;
    results.summary.passedCategories = results.categories.filter((c) => c.passed).length;
    results.summary.failedCategories = results.categories.filter((c) => !c.passed).length;
    console.log(`Enhanced validation complete: ${totalErrors} errors, ${totalWarnings} warnings, ${totalInfo} info across ${results.categories.length} categories`);
  }
  async function collectCurrentPageSEOData(webflow) {
    try {
      const currentPage = await webflow.getCurrentPage();
      if (!currentPage) {
        console.warn("getCurrentPage returned null");
        return null;
      }
      const pageName = await currentPage.getName() || "Current Page";
      const pageSlug = await currentPage.getSlug() || "";
      const pagePublishPath = await currentPage.getPublishPath();
      const pageId = currentPage.id;
      console.log(`Analyzing SEO for current page: ${pageName}`);
      const seoData = {
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
      try {
        if (currentPage.getDescription) {
          const description = await currentPage.getDescription();
          if (description && description.trim()) {
            seoData.description = description;
            seoData.descriptionLength = description.length;
            seoData.hasValidDescription = description.length >= 150 && description.length <= 160;
            console.log(`Meta description found: ${description.length} characters`);
          }
        }
      } catch (descError) {
        console.warn("Error getting meta description:", descError);
      }
      try {
        if (currentPage.getTitle) {
          const title = await currentPage.getTitle();
          if (title && title.trim()) {
            seoData.title = title;
            seoData.titleLength = title.length;
            seoData.hasValidTitle = title.length > 0 && title.length <= 60;
            console.log(`SEO title found: ${title.length} characters - "${title}"`);
          }
        }
      } catch (titleError) {
        console.warn("Error getting page title:", titleError);
      }
      try {
        if (currentPage.getOpenGraphTitle) {
          const ogTitle = await currentPage.getOpenGraphTitle();
          if (ogTitle && ogTitle.trim()) {
            seoData.openGraphTitle = ogTitle;
            console.log("Open Graph title found:", ogTitle);
          }
        }
        if (currentPage.getOpenGraphDescription) {
          const ogDescription = await currentPage.getOpenGraphDescription();
          if (ogDescription && ogDescription.trim()) {
            seoData.openGraphDescription = ogDescription;
            console.log("Open Graph description found");
          }
        }
        if (currentPage.getOpenGraphImage) {
          const ogImage = await currentPage.getOpenGraphImage();
          if (ogImage) {
            seoData.openGraphImage = ogImage;
            console.log("Open Graph image found");
          }
        }
        if (currentPage.usesTitleAsOpenGraphTitle) {
          const usesTitleAsOG = await currentPage.usesTitleAsOpenGraphTitle();
          seoData.usesTitleAsOpenGraphTitle = usesTitleAsOG;
          seoData.hasCustomOpenGraphTitle = !usesTitleAsOG;
          console.log(`Uses title as OG title: ${usesTitleAsOG}`);
        }
        if (currentPage.usesDescriptionAsOpenGraphDescription) {
          const usesDescriptionAsOG = await currentPage.usesDescriptionAsOpenGraphDescription();
          seoData.usesDescriptionAsOpenGraphDescription = usesDescriptionAsOG;
          seoData.hasCustomOpenGraphDescription = !usesDescriptionAsOG;
          console.log(`Uses description as OG description: ${usesDescriptionAsOG}`);
        }
      } catch (ogError) {
        console.warn("Error getting Open Graph data:", ogError);
      }
      return {
        id: pageId,
        name: pageName,
        slug: pageSlug,
        publishPath: pagePublishPath,
        seo: seoData
      };
    } catch (error) {
      console.warn("Error collecting current page SEO data:", error);
      return null;
    }
  }
  function analyzeNamingConsistency(data) {
    const allNames = [];
    if (data.components) {
      allNames.push(...data.components.map((c) => c.name));
    }
    if (data.styles) {
      allNames.push(...data.styles.filter((s) => !s.isHtmlTag).map((s) => s.name));
    }
    if (data.variables?.collections) {
      data.variables.collections.forEach((collection) => {
        allNames.push(...collection.variables.map((v) => v.name));
      });
    }
    if (allNames.length === 0) return;
    const namingPatterns = {
      titleCase: 0,
      camelCase: 0,
      pascalCase: 0,
      snakeCase: 0,
      kebabCase: 0,
      bem: 0
    };
    allNames.forEach((name) => {
      if (!name) return;
      if (/^[A-Z][a-z]*(?:\s[A-Z][a-z]*)*$/.test(name)) {
        namingPatterns.titleCase++;
      } else if (/^[a-z][a-zA-Z0-9]*$/.test(name)) {
        namingPatterns.camelCase++;
      } else if (/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
        namingPatterns.pascalCase++;
      } else if (/^[a-z][a-z0-9_]*$/.test(name)) {
        namingPatterns.snakeCase++;
      } else if (/^[a-z][a-z0-9-]*$/.test(name)) {
        namingPatterns.kebabCase++;
      } else if (/^[a-z][a-z0-9-]*(__[a-z][a-z0-9-]*)?(--[a-z][a-z0-9-]*)?$/.test(name)) {
        namingPatterns.bem++;
      }
    });
    const totalNames = allNames.length;
    const dominantPattern = Object.entries(namingPatterns).find(
      ([, count]) => count / totalNames >= 0.8
    );
    if (dominantPattern) {
      data.enhancedValidation.styleSystem.hasConsistentNaming = true;
    }
    console.log("Naming pattern analysis:", namingPatterns, `Total names: ${totalNames}`);
  }
  function showLoading() {
    const loadingDisplay = document.getElementById("loading-display");
    if (loadingDisplay) {
      loadingDisplay.style.display = "flex";
      loadingDisplay.classList.add("show");
    }
  }
  function hideLoading() {
    const loadingDisplay = document.getElementById("loading-display");
    if (loadingDisplay) {
      loadingDisplay.style.display = "none";
      loadingDisplay.classList.remove("show");
    }
  }
  function showError(message) {
    const errorDisplay = document.getElementById("error-display");
    const errorMessage = document.getElementById("error-message");
    if (errorMessage) errorMessage.textContent = message;
    if (errorDisplay) {
      errorDisplay.style.display = "block";
      errorDisplay.classList.add("show");
    }
  }
  function hideError() {
    const errorDisplay = document.getElementById("error-display");
    if (errorDisplay) {
      errorDisplay.style.display = "none";
      errorDisplay.classList.remove("show");
    }
  }
  function hideResults() {
    const resultsDisplay = document.getElementById("results-display");
    if (resultsDisplay) {
      resultsDisplay.style.display = "none";
      resultsDisplay.classList.remove("show");
    }
  }
  function updateMetaDisplay(projectLabel, projectData) {
    const metaDisplay = document.getElementById("meta-display");
    if (!metaDisplay || !projectData) return;
    const stats = projectData.collectionMetadata || {};
    const scope = projectData.validationScope;
    const lastPublished = scope?.domainLastPublished;
    const publishNote = lastPublished ? `<div class="meta-stat">
        <span class="meta-label">Validating publish from:</span>
        <span class="meta-value">${formatDateTime(lastPublished)} \u2014 republish to validate newer changes</span>
      </div>` : scope?.siteUrl ? `<div class="meta-stat">
          <span class="meta-label">Published checks:</span>
          <span class="meta-value">Run against the last published site \u2014 republish to validate newer changes</span>
        </div>` : "";
    const metaHTML = `
    <div class="meta-header">
      <h3 class="meta-title">Project: ${escapeHtml(projectLabel)}</h3>
      <span class="meta-version">Validator v${EXTENSION_VERSION}${knownWorkerVersion ? ` \xB7 Worker v${knownWorkerVersion}` : ""}</span>
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
    metaDisplay.style.display = "block";
  }
  function registerValidationReport(data, correlationId) {
    lastValidationReport = {
      data,
      correlationId,
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      restored: false
    };
    try {
      localStorage.setItem(LAST_RUN_STORAGE_KEY, JSON.stringify(lastValidationReport));
    } catch {
      try {
        localStorage.setItem(LAST_RUN_STORAGE_KEY, JSON.stringify({
          ...lastValidationReport,
          data: { ...data, collectedData: void 0 }
        }));
      } catch (storageError) {
        console.warn("Could not persist validation results:", storageError);
      }
    }
  }
  function restoreLastValidationReport() {
    try {
      const saved = localStorage.getItem(LAST_RUN_STORAGE_KEY);
      if (!saved) return false;
      const parsed = JSON.parse(saved);
      if (!parsed?.data?.categories) return false;
      lastValidationReport = { ...parsed, restored: true };
      showResults(parsed.data);
      return true;
    } catch (error) {
      console.warn("Could not restore last validation results:", error);
      return false;
    }
  }
  function selectCanvasElement(elementKey) {
    const element = canvasElementRegistry.get(elementKey);
    const webflow = window.webflow;
    if (!element || !webflow) {
      void notifyDesigner(webflow, "Info", "Element reference expired \u2014 re-run the validator to refresh canvas checks.");
      return;
    }
    void webflow.setSelectedElement(element).catch((error) => {
      console.warn("Could not select element:", error);
      void notifyDesigner(webflow, "Error", "Could not select the element. It may have been deleted or be on another page.");
    });
  }
  function buildReportMarkdown2() {
    const report = lastValidationReport;
    if (!report) return "";
    const { data } = report;
    const projectData = Array.isArray(data.collectedData) ? data.collectedData[0] : void 0;
    const scope = projectData?.validationScope;
    const outcome = getMarketplaceOutcome(data);
    const input = {
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
      workerVersion: knownWorkerVersion
    };
    return buildReportMarkdown(input);
  }
  var knownWorkerVersion = null;
  async function fetchWorkerVersion() {
    try {
      const response = await fetch(`${WORKER_API_BASE}/health`);
      if (!response.ok) return;
      const payload = await response.json();
      if (payload?.version) knownWorkerVersion = payload.version;
    } catch {
    }
  }
  async function submitIssueFeedback(issueId, category) {
    const webflow = window.webflow;
    try {
      const response = await fetch(`${APP_VALIDATOR_BASE}/app-validator/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueId,
          category,
          siteId: bridgeContext?.siteId,
          siteUrl: bridgeContext?.siteUrl || lastValidationReport?.data?.url,
          runCorrelationId: lastValidationReport?.correlationId,
          note: `extension v${EXTENSION_VERSION}${knownWorkerVersion ? ` / worker v${knownWorkerVersion}` : ""}`
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      void notifyDesigner(webflow, "Success", "Thanks \u2014 this issue was flagged for review by the validator team.");
    } catch (error) {
      console.warn("Issue feedback failed:", error);
      void notifyDesigner(webflow, "Error", "Could not send feedback. Please try again later.");
    }
  }
  async function copyValidationReport() {
    const markdown = buildReportMarkdown2();
    const webflow = window.webflow;
    if (!markdown) {
      void notifyDesigner(webflow, "Info", "Run the validator first to generate a report.");
      return;
    }
    try {
      await navigator.clipboard.writeText(markdown);
      void notifyDesigner(webflow, "Success", "Validation report copied \u2014 paste it into a support ticket or document.");
    } catch (error) {
      console.warn("Copy report failed:", error);
      void notifyDesigner(webflow, "Error", "Could not copy the report to the clipboard.");
    }
  }
  function showResults(data) {
    const resultsDisplay = document.getElementById("results-display");
    if (!resultsDisplay) return;
    const blockingCount = getSubmissionBlockingIssues(data).length;
    const outcome = getMarketplaceOutcome(data);
    const generatedAt = lastValidationReport?.generatedAt ? new Date(lastValidationReport.generatedAt) : /* @__PURE__ */ new Date();
    const isRestored = lastValidationReport?.restored === true;
    const resultsHTML = `
    <!-- Tabs Navigation -->
    <div class="validation-tabs" role="tablist" aria-label="Validation report sections">
      <button id="overview-tab-button" class="tab-button active" data-tab="overview" type="button" role="tab" aria-selected="true" aria-controls="overview-tab" tabindex="0">Overview</button>
      <button id="checklist-tab-button" class="tab-button" data-tab="checklist" type="button" role="tab" aria-selected="false" aria-controls="checklist-tab" tabindex="-1">Fix List${blockingCount > 0 ? ` (${blockingCount})` : ""}</button>
    </div>

    <!-- Overview Tab Content -->
    <div id="overview-tab" class="tab-content active" role="tabpanel" aria-labelledby="overview-tab-button" tabindex="0">
      ${isRestored ? `
        <div class="restored-banner" role="status">
          Restored from last run (${generatedAt.toLocaleString()}) \u2014 results may be stale. Run Validator to refresh.
        </div>
      ` : ""}
      <!-- Project Overview -->
      <div class="project-overview">
      <div class="project-header">
        <h2 class="project-title">Validation Report: ${escapeHtml(data.url || "")}</h2>
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
    <div class="submission-state ${blockingCount > 0 ? "is-blocked" : "is-ready"}">
      <div class="submission-state-headline">
        ${blockingCount > 0 ? `${blockingCount} blocker${blockingCount === 1 ? "" : "s"} remaining before submission` : "Submission gate clear"}
      </div>
      <div class="submission-state-sub">
        Categories passed: ${data.summary.passedCategories}/${data.categories.length} \xB7 Score ${calculateOverallScore(data.summary)}%
      </div>
    </div>

    <!-- Category Results with Enhanced Details -->
    ${(() => {
      console.log("Rendering categories in UI. Total categories:", data.categories.length);
      console.log("Category names:", data.categories.map((cat) => cat.category));
      return data.categories.map((cat, idx) => createCategoryHTML(cat, idx, data.collectedData)).join("");
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
    resultsDisplay.style.display = "block";
    resultsDisplay.classList.add("show");
    initializeTabs();
    resultsDisplay.querySelectorAll("[data-canvas-element]").forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.getAttribute("data-canvas-element");
        if (key) selectCanvasElement(key);
      });
    });
    resultsDisplay.querySelectorAll("[data-flag-issue]").forEach((button) => {
      button.addEventListener("click", () => {
        const issueId = button.getAttribute("data-flag-issue");
        const category = button.getAttribute("data-flag-category") || "";
        if (issueId) {
          button.disabled = true;
          button.textContent = "Flagged";
          void submitIssueFeedback(issueId, category);
        }
      });
    });
    document.getElementById("copy-report-btn")?.addEventListener("click", () => void copyValidationReport());
    if (!isRestored && outcome.showFixListAction) {
      activateValidationTab("checklist");
    }
    console.log("Resetting isExplicitRefresh to false after rendering");
    isExplicitRefresh = false;
  }
  function createCategoryHTML(cat, idx, collectedData) {
    const status = getCategoryStatus(cat);
    const categoryAnchorId = getCategoryAnchorId(cat.category);
    if (cat.passed && cat.issues.length === 0) {
      return `
      <details id="${categoryAnchorId}" class="category-section category-collapsed ${idx === 0 ? "first" : ""}">
        <summary class="category-header category-summary">
          <h3 class="category-title">${cat.category}</h3>
          <div class="category-status ${status.className}">
            ${status.label}
          </div>
          ${cat.stats ? `<span class="category-stats">${formatCategoryStats(cat.stats)}</span>` : ""}
        </summary>
        ${createSuccessHTML()}
        ${cat.stats ? createMetadataHTML(cat.category, cat.stats) : ""}
        ${createDataCollectedSection(cat.category, collectedData)}
      </details>
    `;
    }
    return `
    <div id="${categoryAnchorId}" class="category-section ${idx === 0 ? "first" : ""}">
      <div class="category-header">
        <h3 class="category-title">${cat.category}</h3>
        <div class="category-status ${status.className}">
          ${status.label}
        </div>
        ${cat.stats ? `<span class="category-stats">${formatCategoryStats(cat.stats)}</span>` : ""}
      </div>

      ${cat.issues.length > 0 ? createIssuesHTML(cat.issues) : createSuccessHTML()}

      ${cat.stats ? createMetadataHTML(cat.category, cat.stats) : ""}
      ${createDataCollectedSection(cat.category, collectedData)}
    </div>
  `;
  }
  function createIssuesHTML(issues) {
    return `
    <div class="issues-list">
      ${issues.map((issue) => createIssueHTML(issue)).join("")}
    </div>
  `;
  }
  function createIssueHTML(issue) {
    const howToFix = getIssueHowToFix(issue);
    const location = getIssueLocation(issue);
    const policy = getIssuePolicy(issue);
    const republishHint = issue.details?.republishHint;
    const canvasElementKeys = Array.isArray(issue.details?.canvasElementKeys) ? issue.details.canvasElementKeys : [];
    return `
    <div class="issue-item ${issue.severity}">
      <div class="issue-content">
        <span class="issue-severity ${issue.severity}">
          ${getIssueSeverityLabel(issue)}
        </span>
        <div class="issue-details">
          <div class="issue-message">${escapeHtml(issue.message)}</div>
          ${policy ? createIssuePolicyHTML(issue) : ""}
          ${republishHint ? `
            <div class="issue-republish-hint">${escapeHtml(republishHint)}</div>
          ` : ""}
          ${howToFix ? `
            <div class="issue-fix">
              <strong>${policy ? "Required fix:" : issue.severity === "warning" ? "Suggestion:" : issue.severity === "info" ? "Recommendation:" : "How to fix:"}</strong> ${escapeHtml(howToFix)}
            </div>
          ` : ""}
          ${location ? `
            <div class="issue-location">
              <strong>Location:</strong> ${escapeHtml(location)}
            </div>
          ` : ""}
          ${canvasElementKeys.length > 0 ? `
            <div class="canvas-select-actions">
              ${canvasElementKeys.map((key, index) => `
                <button type="button" class="canvas-select-btn" data-canvas-element="${escapeHtml(key)}">
                  ${canvasElementKeys.length > 1 ? `Select element ${index + 1}` : "Select on canvas"}
                </button>
              `).join("")}
            </div>
          ` : ""}
          ${createDetailsHTML(issue.details)}
          <button type="button" class="issue-flag-btn" data-flag-issue="${escapeHtml(issue.id)}" data-flag-category="${escapeHtml(issue.category)}" title="Report this as a validator false positive">
            Flag as incorrect
          </button>
        </div>
      </div>
    </div>
  `;
  }
  function createMarketplaceOutcomeHTML(data) {
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
        <span class="marketplace-outcome-time">Validated ${(lastValidationReport?.generatedAt ? new Date(lastValidationReport.generatedAt) : /* @__PURE__ */ new Date()).toLocaleTimeString()}</span>
        ${outcome.showFixListAction ? '<button type="button" class="marketplace-outcome-action" onclick="openFixList()">Open Fix List</button>' : ""}
      </div>
    </div>
  `;
  }
  function getMarketplaceOutcome(data) {
    const errors = data.summary.totalErrors || data.summary.errors || 0;
    const warnings = data.summary.totalWarnings || data.summary.warnings || 0;
    const failedCategories = data.summary.failedCategories || 0;
    const score = calculateOverallScore(data.summary);
    const blockingIssues = getSubmissionBlockingIssues(data);
    const hasRejectedPolicy = data.categories.some(
      (category) => category.issues?.some((issue) => getIssuePolicy(issue) === "ix2-rejected")
    );
    if (hasRejectedPolicy) {
      return {
        className: "is-rejected",
        title: "Rejected policy detected",
        copy: "Legacy IX2 interactions were found. Templates submitted on or after May 1, 2026 should be rejected until interactions are rebuilt with Webflow Interactions powered by GSAP.",
        badge: "Rejected",
        showFixListAction: true
      };
    }
    if (blockingIssues.length > 0) {
      const hasSetupBlocker = blockingIssues.some(({ issue }) => issue.id === "validator-script-required");
      return {
        className: "is-blocked",
        title: hasSetupBlocker && errors === 0 ? "Published-site checks required" : "Blocked by validation errors",
        copy: hasSetupBlocker && errors === 0 ? "Add and publish the Validator script so the marketplace form has a complete validation result." : "Resolve every error-level issue, publish the site again, and re-run validation before submitting the template.",
        badge: "Blocked",
        showFixListAction: true
      };
    }
    if (failedCategories > 0 || score < 100) {
      return {
        className: "is-review",
        title: "Review items remain",
        copy: "No error-level blockers were returned, but the score is below 100%. Review the categories below and re-run validation after publishing.",
        badge: "Review",
        showFixListAction: false
      };
    }
    if (warnings > 0) {
      return {
        className: "is-review",
        title: "Ready with non-blocking warnings",
        copy: "The submission gate is clear, but the warnings below should be reviewed before handoff.",
        badge: "Ready",
        showFixListAction: false
      };
    }
    return {
      className: "is-ready",
      title: "Ready for marketplace review",
      copy: "No blocking errors or warnings were found. Re-run validation after any Designer changes and after publishing.",
      badge: "Ready",
      showFixListAction: false
    };
  }
  function createValidationScopeHTML(data) {
    const projectData = Array.isArray(data.collectedData) ? data.collectedData[0] : void 0;
    const scope = projectData?.validationScope;
    const designerContext = projectData?.designerContext;
    if (!scope && !designerContext) return "";
    const scopeRows = [];
    if (scope) {
      scopeRows.push({
        label: "Published URL",
        value: scope.siteUrl || "Not available",
        title: scope.siteUrl || void 0
      });
      scopeRows.push({
        label: "Domain source",
        value: [
          scope.domainSource,
          scope.domainStage ? formatModeName(scope.domainStage) : "",
          scope.domainDefault ? "default" : ""
        ].filter(Boolean).join(" - ")
      });
      scopeRows.push({
        label: "Last published",
        value: scope.domainLastPublished ? formatDateTime(scope.domainLastPublished) : "Not reported"
      });
      scopeRows.push({
        label: "Page scope",
        value: `${scope.pageScope === "current" ? "Current page" : "All published pages"} (${scope.pageSlugsCount} URL${scope.pageSlugsCount === 1 ? "" : "s"})`
      });
      scopeRows.push({
        label: "Checks",
        value: `${scope.selectedChecks.map(formatModeName).join(", ")} - ${scope.publishedChecks === "full" ? "published-site checks enabled" : "Designer-only until script is published"}`
      });
      if (scope.skippedCmsTemplateSlugs.length > 0) {
        scopeRows.push({
          label: "Skipped",
          value: `${scope.skippedCmsTemplateSlugs.length} internal CMS template URL${scope.skippedCmsTemplateSlugs.length === 1 ? "" : "s"}`,
          title: scope.skippedCmsTemplateSlugs.join(", ")
        });
      }
      if (scope.isPasswordProtected || scope.isPrivateStaging) {
        scopeRows.push({
          label: "Site access",
          value: [
            scope.isPasswordProtected ? "Password protected" : "",
            scope.isPrivateStaging ? "Private staging" : ""
          ].filter(Boolean).join(" - ")
        });
      }
    }
    if (designerContext) {
      scopeRows.push({
        label: "Designer mode",
        value: [
          designerContext.mode ? formatModeName(designerContext.mode) : "Unknown",
          designerContext.canAccessCanvas === false ? "limited canvas access" : ""
        ].filter(Boolean).join(" - ")
      });
    }
    return `
    <div class="validation-scope">
      <div class="validation-scope-header">
        <h3>Validation Scope</h3>
        <span>${scope?.publishedChecks === "full" ? "Full coverage" : "Partial coverage"}</span>
      </div>
      <div class="validation-scope-grid">
        ${scopeRows.map((row) => `
          <div class="validation-scope-row">
            <span class="validation-scope-label">${row.label}</span>
            <span class="validation-scope-value" ${row.title ? `title="${row.title}"` : ""}>${row.value}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
  }
  function getCategoryStatus(cat) {
    const issues = Array.isArray(cat.issues) ? cat.issues : [];
    if (issues.some((issue) => issue.id === "validator-script-required")) {
      return { className: "blocked", label: "Setup required" };
    }
    if (issues.some((issue) => getIssuePolicy(issue))) {
      return { className: "rejected", label: "Rejected policy" };
    }
    if (issues.some((issue) => issue.severity === "error")) {
      return { className: "blocked", label: "Blocked" };
    }
    if (issues.some((issue) => issue.severity === "warning")) {
      return { className: "review", label: "Review" };
    }
    return { className: "passed", label: "Pass" };
  }
  function getIssueSeverityLabel(issue) {
    if (issue.id === "validator-script-required") return "Setup required";
    if (getIssuePolicy(issue)) return "Rejected policy";
    if (issue.severity === "warning") return "Review";
    if (issue.severity === "info") return "Advisory";
    return "Blocked";
  }
  function getIssuePolicy(issue) {
    const policy = issue.details?.policy;
    return typeof policy === "string" ? policy : void 0;
  }
  function isSubmissionBlockingIssue(issue) {
    return Boolean(getIssuePolicy(issue)) || issue.severity === "error" || issue.id === "validator-script-required";
  }
  function getSubmissionBlockingIssues(data) {
    return data.categories.flatMap(
      (category) => (Array.isArray(category.issues) ? category.issues : []).filter(isSubmissionBlockingIssue).map((issue) => ({ category: category.category, issue }))
    );
  }
  function getSubmissionBlockingCategoryCount(data) {
    return new Set(getSubmissionBlockingIssues(data).map(({ category }) => category)).size;
  }
  function createIssuePolicyHTML(issue) {
    const details = issue.details;
    if (!details) return "";
    const policy = getIssuePolicy(issue);
    const effectiveDate = typeof details.effectiveDate === "string" ? details.effectiveDate : void 0;
    const legacyIx2Count = typeof details.legacyIx2Count === "number" ? details.legacyIx2Count : void 0;
    return `
    <div class="issue-policy">
      <div class="issue-policy-row">
        <span class="issue-policy-label">Policy</span>
        <span>${policy || "Marketplace policy"}${effectiveDate ? `, effective ${effectiveDate}` : ""}</span>
      </div>
      ${legacyIx2Count !== void 0 ? `
        <div class="issue-policy-row">
          <span class="issue-policy-label">Detected</span>
          <span>${legacyIx2Count} legacy IX2 marker${legacyIx2Count === 1 ? "" : "s"}</span>
        </div>
      ` : ""}
    </div>
  `;
  }
  function createDetailsHTML(details) {
    if (!details) return "";
    let html = "";
    if (details.sample) {
      const samples = Array.isArray(details.sample) ? details.sample : [details.sample];
      html += `
      <details class="issue-sample-details">
        <summary class="issue-sample-summary">
          <strong>View ${samples.length} example${samples.length > 1 ? "s" : ""}</strong>
        </summary>
        <div class="issue-sample-list">
          ${samples.map((item) => `<div class="sample-item">\u2022 ${escapeHtml(String(item))}</div>`).join("")}
        </div>
      </details>
    `;
    }
    if (details.violations) {
      const violations = details.violations.map((violation) => formatStructuredItem(violation));
      html += `
      <details class="issue-violations-details">
        <summary class="issue-violations-summary">
          <strong>View ${violations.length} violation${violations.length > 1 ? "s" : ""}</strong>
        </summary>
        <div class="issue-violations-list">
          ${violations.map((v) => `<div class="violation-item">\u2022 ${escapeHtml(v)}</div>`).join("")}
        </div>
      </details>
    `;
    }
    if (details.locations) {
      html += `
      <details class="issue-locations-details">
        <summary class="issue-locations-summary">
          <strong>View ${details.locations.length} location${details.locations.length > 1 ? "s" : ""}</strong>
        </summary>
        <div class="issue-locations-list">
          ${details.locations.map((loc) => `<div class="location-item">\u2022 ${escapeHtml(String(loc))}</div>`).join("")}
        </div>
      </details>
    `;
    }
    if (details.issues) {
      html += `
      <details class="issue-subitems-details">
        <summary class="issue-subitems-summary">
          <strong>View ${details.issues.length} specific issue${details.issues.length > 1 ? "s" : ""}</strong>
        </summary>
        <div class="issue-subitems-list">
          ${details.issues.map((subitem) => `<div class="subitem">\u2022 ${subitem}</div>`).join("")}
        </div>
      </details>
    `;
    }
    if (details.images) {
      html += `
      <details class="issue-images-details">
        <summary class="issue-images-summary">
          <strong>View ${details.images.length} image${details.images.length > 1 ? "s" : ""} without alt text</strong>
        </summary>
        <div class="issue-images-list">
          ${details.images.map((img) => `<div class="image-item">\u2022 ${img}</div>`).join("")}
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
          ${details.samples.map((s) => `<div class="sample-item">\u2022 ${escapeHtml(String(s))}</div>`).join("")}
        </div>
      </details>
    `;
    }
    html += createStructuredArrayDetails(details, "pagesWithLorem", "View affected page", formatPageListItem);
    html += createStructuredArrayDetails(details, "affectedPages", "View affected page", formatPageListItem);
    html += createStructuredArrayDetails(details, "headingIssues", "View heading issue", formatHeadingIssueItem);
    html += createStructuredArrayDetails(details, "brokenLinks", "View broken link", formatBrokenLinkItem);
    html += createStructuredArrayDetails(details, "unlabeledInputs", "View unlabeled input", formatUnlabeledInputItem);
    html += createStructuredArrayDetails(details, "imagesWithoutAlt", "View image missing alt text", formatImageWithoutAltItem);
    html += createStructuredArrayDetails(details, "missingImages", "View image missing alt text", formatImageWithoutAltItem);
    html += createStructuredArrayDetails(details, "pagesWithIssues", "View affected page", formatPageListItem);
    html += createStructuredArrayDetails(details, "oversizedAssets", "View oversized asset", formatAssetItem);
    html += createStructuredArrayDetails(details, "extremeAssets", "View large asset", formatAssetItem);
    html += createStructuredArrayDetails(details, "unoptimizedAssets", "View asset to optimize", formatAssetItem);
    html += createStructuredArrayDetails(details, "unusedAssets", "View unused asset", formatAssetItem);
    html += createStructuredArrayDetails(details, "missingTags", "View missing tag", formatStructuredItem);
    html += createPageMetadataDetailsHTML(details);
    html += createSeoDetailHTML(details);
    return html;
  }
  function getIssueHowToFix(issue) {
    return issue.howToFix || issue.details?.howToFix;
  }
  function getIssueLocation(issue) {
    return issue.location || issue.details?.location;
  }
  function createStructuredArrayDetails(details, key, singularLabel, formatter) {
    const items = details?.[key];
    if (!Array.isArray(items) || items.length === 0) return "";
    return `
    <details class="issue-subitems-details">
      <summary class="issue-subitems-summary">
        <strong>${singularLabel}${items.length > 1 ? "s" : ""} (${items.length})</strong>
      </summary>
      <div class="issue-subitems-list">
        ${items.map((item) => `<div class="subitem">\u2022 ${escapeHtml(formatter(item))}</div>`).join("")}
      </div>
    </details>
  `;
  }
  function formatPageListItem(item) {
    if (!item || typeof item !== "object") return String(item);
    const label = item.pageName || item.page || item.title || item.name || "Page";
    const url = item.pageUrl || item.url;
    const extras = [];
    if (typeof item.wordCount === "number") extras.push(`${item.wordCount} words`);
    if (typeof item.contentScore === "number") extras.push(`score ${item.contentScore}`);
    if (typeof item.totalLinks === "number") extras.push(`${item.totalLinks} links`);
    if (typeof item.externalLinks === "number") extras.push(`${item.externalLinks} external links`);
    const extraText = extras.length > 0 ? ` (${extras.join(", ")})` : "";
    return url ? `${label}: ${url}${extraText}` : `${label}${extraText}`;
  }
  function formatHeadingIssueItem(item) {
    if (!item || typeof item !== "object") return String(item);
    const page = item.page || item.title || "Page";
    const pageUrl = item.pageUrl || item.url;
    const position = item.fromPosition && item.toPosition ? ` positions ${item.fromPosition} \u2192 ${item.toPosition}` : "";
    const sequence = item.headingSequence ? ` Sequence: ${item.headingSequence}` : "";
    if (item.issueType === "skipped_level" && typeof item.fromLevel === "number" && typeof item.toLevel === "number") {
      const missingLevel = typeof item.missingLevel === "number" ? `, skipping H${item.missingLevel}` : "";
      const issue2 = `${formatHeadingReference(item.fromLevel, item.fromText)} is followed by ${formatHeadingReference(item.toLevel, item.toText)}${missingLevel}${position}.${sequence}`;
      return `${page}${pageUrl ? ` (${pageUrl})` : ""}: ${issue2}`;
    }
    const issue = item.issue || "Heading issue";
    return `${page}${pageUrl ? ` (${pageUrl})` : ""}: ${issue}${sequence}`;
  }
  function formatHeadingReference(level, text) {
    const normalizedText = typeof text === "string" ? decodeCommonHtmlEntities(text).replace(/\s+/g, " ").trim() : "";
    if (!normalizedText) return `H${level}`;
    const preview = normalizedText.length > 80 ? `${normalizedText.slice(0, 77)}...` : normalizedText;
    return `H${level} "${preview}"`;
  }
  function formatBrokenLinkItem(item) {
    if (!item || typeof item !== "object") return String(item);
    const page = item.page || "Page";
    const href = item.href || "Unknown URL";
    const text = item.text ? ` (${item.text})` : "";
    const status = item.status ? ` [${item.status}]` : "";
    const error = item.error ? ` - ${item.error}` : "";
    return `${page}: ${href}${text}${status}${error}`;
  }
  function formatUnlabeledInputItem(item) {
    if (!item || typeof item !== "object") return String(item);
    return [item.type, item.name, item.id, item.selector].filter(Boolean).join(" | ") || "Unlabeled input";
  }
  function formatImageWithoutAltItem(item) {
    if (!item || typeof item !== "object") return String(item);
    const target = item.selector || item.src || item.alt || "Image missing alt text";
    const context = item.context ? ` (${item.context})` : "";
    const page = item.page || item.pageName || item.title;
    const pageUrl = item.pageUrl || item.url;
    const location = pageUrl ? `${page || "Page"}: ${pageUrl}` : page;
    return location ? `${target}${context} on ${location}` : `${target}${context}`;
  }
  function formatAssetItem(item) {
    if (!item || typeof item !== "object") return String(item);
    const name = item.name || item.url || "Asset";
    const details = [
      item.size,
      item.currentFormat,
      item.recommendedAction
    ].filter(Boolean).join(" - ");
    return details ? `${name}: ${details}` : name;
  }
  function createSeoDetailHTML(details) {
    if (!details) return "";
    const rows = [];
    if (details.currentTitle) rows.push(`Current title: ${details.currentTitle}`);
    if (details.currentDescription) rows.push(`Current description: ${details.currentDescription}`);
    if (typeof details.currentLength === "number") rows.push(`Current length: ${details.currentLength}`);
    if (details.recommendedLength) rows.push(`Recommended length: ${details.recommendedLength}`);
    if (rows.length === 0) return "";
    return `
    <details class="issue-subitems-details">
      <summary class="issue-subitems-summary">
        <strong>View current metadata</strong>
      </summary>
      <div class="issue-subitems-list">
        ${rows.map((row) => `<div class="subitem">\u2022 ${row}</div>`).join("")}
      </div>
    </details>
  `;
  }
  function formatStructuredItem(item) {
    if (item == null) return "";
    if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
      return String(item);
    }
    if (item.selector && item.contrastRatio) {
      return `${item.selector}: contrast ${item.contrastRatio} (required ${item.required})${item.recommendation ? ` - ${item.recommendation}` : ""}`;
    }
    if (item.description && item.element) {
      return `${item.element}: ${item.description}`;
    }
    if (item.element && item.issue) {
      return `${item.element}: ${item.issue}`;
    }
    return Object.entries(item).filter(([, value]) => value !== void 0 && value !== null && value !== "").map(([key, value]) => `${key}: ${value}`).join(", ");
  }
  function createSuccessHTML() {
    return `
    <div class="success-message">
      All checks passed for this category
    </div>
  `;
  }
  function createMetadataHTML(category, stats) {
    const statItems = getDetailedStatItems(category, stats);
    if (statItems.length === 0) return "";
    return `
    <div class="category-metadata">
      <div class="metadata-title">Category Details</div>
      <div class="metadata-grid">
        ${statItems.map((item) => `
          <div class="metadata-stat ${item.tone ? `is-${item.tone}` : ""}">
            <span class="metadata-label">${escapeHtml(item.label)}</span>
            <span class="metadata-value">${escapeHtml(item.value)}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
  }
  function createActionItemsHTML(data) {
    const summary = data.summary;
    const errors = summary.totalErrors || summary.errors || 0;
    const warnings = summary.totalWarnings || summary.warnings || 0;
    const failedCategories = summary.failedCategories || 0;
    const score = calculateOverallScore(summary);
    const blockingIssues = getSubmissionBlockingIssues(data);
    const blockingCategoryCount = getSubmissionBlockingCategoryCount(data);
    const hasScoreReview = blockingIssues.length === 0 && (failedCategories > 0 || score < 100);
    const warningStepNumber = blockingIssues.length > 0 || hasScoreReview ? "2" : "1";
    if (blockingIssues.length === 0 && errors === 0 && warnings === 0 && failedCategories === 0) return "";
    return `
    <div class="action-items">
      <h3>Next Steps</h3>
      <div class="action-priorities">
        ${blockingIssues.length > 0 ? `
          <div class="action-priority error">
            <strong>1. Fix ${blockingIssues.length} Blocking Item${blockingIssues.length === 1 ? "" : "s"}</strong>
            <p>Open the Fix List for the ${blockingCategoryCount} categor${blockingCategoryCount === 1 ? "y" : "ies"} preventing template submission.</p>
          </div>
        ` : ""}
        ${hasScoreReview ? `
          <div class="action-priority warning">
            <strong>1. Review Score Details</strong>
            <p>No error-level blockers were returned, but the run is below 100%. Review warning categories and re-run validation after publishing.</p>
          </div>
        ` : ""}
        ${errors > 0 && blockingIssues.length === 0 ? `
          <div class="action-priority error">
            <strong>1. Fix ${errors} Critical Error${errors > 1 ? "s" : ""}</strong>
            <p>Address all error-level issues before template submission</p>
          </div>
        ` : ""}
        ${warnings > 0 ? `
          <div class="action-priority warning">
            <strong>${warningStepNumber}. Review ${warnings} Warning${warnings > 1 ? "s" : ""}</strong>
            <p>Warnings are review targets. They should be cleaned up, but they are not added to the blocking Fix List unless paired with an error-level issue.</p>
          </div>
        ` : ""}
        <div class="action-priority info">
          <strong>Re-run Validation:</strong> Use this panel again after making changes to track your progress
        </div>
      </div>
    </div>
  `;
  }
  function createDataCollectedSection(category, collectedData) {
    if (!collectedData || collectedData.length === 0) return "";
    const data = collectedData[0];
    if (!data) return "";
    let items = [];
    let sectionTitle = "";
    switch (category) {
      case "Variables":
        if (data.variables?.collections) {
          sectionTitle = "Variables Found";
          data.variables.collections.forEach((collection) => {
            if (collection.variables && collection.variables.length > 0) {
              items.push(`${collection.name || "Unnamed Collection"} (${collection.variables.length} variables)`);
              collection.variables.forEach((variable) => {
                items.push(`  \u2022 ${variable.name || "Unnamed"} (${variable.type || "unknown type"})`);
              });
            }
          });
        }
        break;
      case "Components":
        if (data.components?.length > 0) {
          sectionTitle = "Components Found";
          items = data.components.map((comp) => `${comp.name || "Unnamed"} (${comp.type || "component"})`);
        }
        break;
      case "Styles":
        if (data.styles?.length > 0) {
          sectionTitle = "Classes Found";
          const sortedStyles = data.styles.filter((style) => style.name && !style.name.startsWith("_")).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 50);
          items = sortedStyles.map((style) => style.name);
          if (data.styles.length > 50) {
            items.push(`... and ${data.styles.length - 50} more classes`);
          }
        }
        break;
      case "Typography":
      case "Page Structure":
        if (data.pages?.length > 0) {
          sectionTitle = "Pages Found";
          items = data.pages.map((page) => `${page.name || "Unnamed"} (/${page.slug || ""})`);
        }
        break;
    }
    if (items.length === 0) return "";
    return `
    <details class="data-collected-section">
      <summary class="data-collected-summary">
        <strong>View ${sectionTitle} (${items.length})</strong>
      </summary>
      <div class="data-collected-list">
        ${items.map((item) => `<div class="data-item">${item}</div>`).join("")}
      </div>
    </details>
  `;
  }
  function calculateOverallScore(summary) {
    const totalCategories = summary.passedCategories + summary.failedCategories;
    if (!totalCategories) return 0;
    return Math.round(summary.passedCategories / totalCategories * 100);
  }
  function getCategoryAnchorId(categoryName) {
    const slug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return `overview-category-${slug || "unknown"}`;
  }
  function initializeTabs() {
    const tabButtons = document.querySelectorAll(".tab-button");
    const activeTabId = getActiveTab();
    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const tabId = button.getAttribute("data-tab");
        if (tabId) {
          activateValidationTab(tabId);
        }
      });
      button.addEventListener("keydown", (event) => {
        const keyboardEvent = event;
        const orderedTabs = Array.from(document.querySelectorAll(".tab-button"));
        const currentIndex = orderedTabs.indexOf(button);
        let nextIndex = currentIndex;
        if (keyboardEvent.key === "ArrowRight" || keyboardEvent.key === "ArrowDown") {
          nextIndex = (currentIndex + 1) % orderedTabs.length;
        } else if (keyboardEvent.key === "ArrowLeft" || keyboardEvent.key === "ArrowUp") {
          nextIndex = (currentIndex - 1 + orderedTabs.length) % orderedTabs.length;
        } else if (keyboardEvent.key === "Home") {
          nextIndex = 0;
        } else if (keyboardEvent.key === "End") {
          nextIndex = orderedTabs.length - 1;
        } else {
          return;
        }
        keyboardEvent.preventDefault();
        const nextTabId = orderedTabs[nextIndex]?.getAttribute("data-tab");
        if (nextTabId && activateValidationTab(nextTabId)) {
          orderedTabs[nextIndex]?.focus();
        }
      });
    });
    if (!activateValidationTab(activeTabId)) {
      activateValidationTab("overview");
    }
  }
  function activateValidationTab(tabId) {
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabContents = document.querySelectorAll(".tab-content");
    const activeButton = document.querySelector(`[data-tab="${tabId}"]`);
    const activeContent = document.getElementById(`${tabId}-tab`);
    if (!activeButton || !activeContent) {
      return false;
    }
    saveActiveTab(tabId);
    tabButtons.forEach((btn) => {
      btn.classList.remove("active");
      btn.setAttribute("aria-selected", "false");
      btn.tabIndex = -1;
    });
    tabContents.forEach((content) => {
      content.classList.remove("active");
      content.hidden = true;
    });
    activeButton.classList.add("active");
    activeButton.setAttribute("aria-selected", "true");
    activeButton.tabIndex = 0;
    activeContent.classList.add("active");
    activeContent.hidden = false;
    return true;
  }
  function openFixList() {
    if (activateValidationTab("checklist")) {
      document.getElementById("checklist-tab")?.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }
  function openOverviewCategory(categoryAnchorId) {
    if (!activateValidationTab("overview")) return;
    const categorySection = document.getElementById(categoryAnchorId);
    if (categorySection) {
      if (categorySection instanceof HTMLDetailsElement) {
        categorySection.open = true;
      }
      categorySection.scrollIntoView({ block: "start", behavior: "smooth" });
      categorySection.classList.add("is-targeted");
      window.setTimeout(() => categorySection.classList.remove("is-targeted"), 1400);
    }
  }
  function getFixListStorageKey() {
    return "webflow_validator_submission_fix_list";
  }
  function saveFixList(fixItems) {
    const data = {
      fixItems,
      timestamp: Date.now()
    };
    localStorage.setItem(getFixListStorageKey(), JSON.stringify(data));
  }
  function loadFixList() {
    try {
      const saved = localStorage.getItem(getFixListStorageKey());
      if (saved) {
        const data = JSON.parse(saved);
        return data.fixItems || data.errors || [];
      }
    } catch (error) {
      console.warn("Error loading fix list:", error);
    }
    return [];
  }
  function toggleFixItemCompleted(fixItemId) {
    const savedFixItems = loadFixList();
    const updated = savedFixItems.map(
      (fixItem) => fixItem.id === fixItemId ? { ...fixItem, completed: !fixItem.completed } : fixItem
    );
    saveFixList(updated);
    const fixListItem = document.querySelector(`[data-fix-item-id="${fixItemId}"]`);
    if (fixListItem) {
      const checkbox = fixListItem.querySelector(".fix-item-checkbox");
      const fixItemMessage = fixListItem.querySelector(".fix-item-message");
      const updatedFixItem = updated.find((item) => item.id === fixItemId);
      if (checkbox && fixItemMessage && updatedFixItem) {
        if (updatedFixItem.completed) {
          checkbox.classList.remove("unchecked");
          checkbox.classList.add("checked");
          checkbox.innerHTML = "";
          fixItemMessage.classList.add("completed");
          fixListItem.classList.add("completed");
        } else {
          checkbox.classList.remove("checked");
          checkbox.classList.add("unchecked");
          checkbox.innerHTML = "";
          fixItemMessage.classList.remove("completed");
          fixListItem.classList.remove("completed");
        }
      }
    }
    updateProgressDisplay();
  }
  function getCategorySubmissionBlockers(category) {
    const issues = Array.isArray(category.issues) ? category.issues : [];
    return issues.filter(isSubmissionBlockingIssue);
  }
  function createSubmissionFixListHTML(data) {
    const allFixItems = [];
    data.categories.forEach((category) => {
      getCategorySubmissionBlockers(category).forEach((issue) => {
        const isFailedCategory = category.passed !== true;
        allFixItems.push({
          id: `${category.category}_${issue.id}`,
          category: category.category,
          message: issue.message,
          severity: issue.severity,
          howToFix: getIssueHowToFix(issue) || (isFailedCategory ? "Resolve this failed category, publish the site, and re-run validation until the category passes." : "Resolve this issue, publish the site, and re-run validation."),
          location: getIssueLocation(issue),
          detailsHtml: createDetailsHTML(issue.details),
          blockingReason: getFixItemBadgeLabel(issue),
          categoryAnchorId: getCategoryAnchorId(category.category),
          completed: false
        });
      });
    });
    const savedFixItems = loadFixList();
    console.log("Creating submission fix list, isExplicitRefresh:", isExplicitRefresh);
    console.log("Saved fix items:", savedFixItems);
    console.log("Current fix items:", allFixItems.length);
    const mergedFixItems = allFixItems.map((fixItem) => {
      const saved = savedFixItems.find((savedItem) => savedItem.id === fixItem.id);
      if (saved) {
        const shouldUncheck = isExplicitRefresh;
        console.log(`Fix item ${fixItem.id}: saved.completed=${saved.completed}, isExplicitRefresh=${isExplicitRefresh}, setting to: ${shouldUncheck ? false : saved.completed}`);
        return {
          ...fixItem,
          completed: isExplicitRefresh ? false : saved.completed
        };
      }
      return fixItem;
    });
    saveFixList(mergedFixItems);
    const completedCount = mergedFixItems.filter((item) => item.completed).length;
    const totalCount = mergedFixItems.length;
    const progressPercent = totalCount > 0 ? Math.round(completedCount / totalCount * 100) : 0;
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
          <h3>${isFullyReady ? "Ready for Submission" : "No Blocking Fixes"}</h3>
          <p>${isFullyReady ? "The latest run reached 100%. Publish after any changes and submit with this result." : hasReviewItems ? "Only review-level items were returned. Use the Overview tab to review recommendations, then re-run validation after publishing." : "No issue details were returned. Re-run validation and review the Overview tab if the score is still below 100%."}</p>
        </div>
      </div>
    `;
    }
    const fixItemsByCategory = {};
    mergedFixItems.forEach((fixItem) => {
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
            <span class="category-name-meta">${fixItems.length} item${fixItems.length === 1 ? "" : "s"}</span>
          </h4>
          <div class="checklist-items">
            ${fixItems.map((fixItem) => `
              <div class="checklist-item ${fixItem.severity} ${fixItem.completed ? "completed" : ""}" data-fix-item-id="${fixItem.id}">
                <div class="fix-item-content">
                  <div class="fix-item-meta">
                    <span class="fix-item-badge ${fixItem.severity}">${fixItem.blockingReason}</span>
                  </div>
                  <div class="fix-item-message ${fixItem.completed ? "completed" : ""}">${fixItem.message}</div>
                  <div class="fix-item-guidance">Fix: ${fixItem.howToFix}</div>
                  ${fixItem.location ? `<div class="fix-item-guidance">Location: ${fixItem.location}</div>` : ""}
                  <button type="button" class="fix-item-detail-button" onclick="openOverviewCategory('${fixItem.categoryAnchorId}')">View details</button>
                  ${fixItem.detailsHtml || ""}
                </div>
                <div class="checkbox-wrapper" onclick="toggleFixItemCompleted('${fixItem.id}')">
                  <div class="fix-item-checkbox ${fixItem.completed ? "checked" : "unchecked"}"></div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `).join("")}
    </div>
  `;
  }
  function getFixItemBadgeLabel(issue) {
    if (issue.id === "validator-script-required") {
      return "Setup";
    }
    if (getIssuePolicy(issue)) {
      return "Policy";
    }
    if (issue.severity === "error") {
      return "Error";
    }
    if (issue.severity === "warning") {
      return "Review";
    }
    return "Advisory";
  }
  function updateProgressDisplay() {
    const savedFixItems = loadFixList();
    const completedCount = savedFixItems.filter((item) => item.completed).length;
    const totalCount = savedFixItems.length;
    const progressPercent = totalCount > 0 ? Math.round(completedCount / totalCount * 100) : 0;
    const progressText = document.querySelector(".progress-text");
    if (progressText) {
      progressText.textContent = `${completedCount} of ${totalCount} completed (${progressPercent}%)`;
    }
    const progressFill = document.querySelector(".progress-fill");
    if (progressFill) {
      progressFill.style.width = `${progressPercent}%`;
    }
  }
  function saveActiveTab(tabId) {
    localStorage.setItem("webflow_validator_active_tab", tabId);
  }
  function getActiveTab() {
    if (isExplicitRefresh) {
      return localStorage.getItem("webflow_validator_active_tab") || "overview";
    }
    return "overview";
  }
  var isExplicitRefresh = false;
  window.toggleFixItemCompleted = toggleFixItemCompleted;
  window.openFixList = openFixList;
  window.openOverviewCategory = openOverviewCategory;
  window.resyncValidation = () => {
    console.log("resyncValidation called, setting isExplicitRefresh = true");
    isExplicitRefresh = true;
    const validateBtn = document.getElementById("validate-btn");
    if (validateBtn) {
      console.log("Clicking validate button...");
      validateBtn.click();
    }
  };
  function formatCategoryStats(stats) {
    const preferredStats = [
      ["totalPages", "pages"],
      ["totalAssets", "assets"],
      ["totalImages", "images"],
      ["totalComponents", "components"],
      ["totalStyles", "styles"],
      ["totalClasses", "classes"],
      ["totalVariables", "variables"],
      ["totalLinks", "links"],
      ["totalBrokenLinks", "broken links"]
    ];
    const statPairs = preferredStats.filter(([key]) => typeof stats[key] === "number").slice(0, 2).map(([key, label]) => `${stats[key]} ${label}`);
    return statPairs.length > 0 ? `(${statPairs.join(", ")})` : "";
  }
  function getDetailedStatItems(category, stats) {
    const details = [];
    switch (category) {
      case "Variables":
        addMetadataStat(details, "Collections", stats.totalCollections);
        addMetadataStat(details, "Variables", stats.totalVariables);
        addMetadataStat(details, "Organized", formatBooleanStat(stats.hasOrganizedCollections), { tone: booleanTone(stats.hasOrganizedCollections) });
        addMetadataStat(details, "Color ramps", formatBooleanStat(stats.hasOrderedRamps), { tone: booleanTone(stats.hasOrderedRamps) });
        break;
      case "Variable Modes":
        addMetadataStat(details, "Modes", stats.totalModes);
        addMetadataStat(details, "Collections with modes", stats.collectionsWithModes);
        if (stats.responsiveModeNamesDetected !== void 0) {
          addMetadataStat(details, "Responsive names", formatBooleanStat(stats.responsiveModeNamesDetected), { tone: booleanTone(stats.responsiveModeNamesDetected) });
        } else if (stats.hasResponsiveModes !== void 0) {
          addMetadataStat(details, "Responsive names", formatBooleanStat(stats.hasResponsiveModes), { tone: booleanTone(stats.hasResponsiveModes) });
        }
        addMetadataStat(details, "Mode data", stats.modeDataAvailable === void 0 ? void 0 : stats.modeDataAvailable ? "Available" : "Unavailable", { tone: booleanTone(stats.modeDataAvailable) });
        addMetadataStat(details, "Collections checked", stats.collectionsCheckedForModes);
        if (Array.isArray(stats.modeNames) && stats.modeNames.length > 0) {
          addMetadataStat(details, "Mode names", stats.modeNames.slice(0, 5).join(", "));
        }
        break;
      case "Components":
        addMetadataStat(details, "Components", stats.totalComponents);
        addMetadataStat(details, "Navigation", stats.navComponents);
        addMetadataStat(details, "Footer", stats.footerComponents);
        addMetadataStat(details, "CTA", stats.ctaComponents);
        break;
      case "Styles":
        addMetadataStat(details, "Classes", stats.totalClasses);
        addMetadataStat(details, "Typography", formatBooleanStat(stats.hasTypographyClasses), { tone: booleanTone(stats.hasTypographyClasses) });
        addMetadataStat(details, "HTML baseline", formatBooleanStat(stats.hasHtmlTagStyles), { tone: booleanTone(stats.hasHtmlTagStyles) });
        break;
      case "Design System":
        addMetadataStat(details, "Variables", stats.totalVariables);
        addMetadataStat(details, "Title Case", stats.withTitleCase);
        addMetadataStat(details, "Color vars", formatBooleanStat(stats.hasColorVars), { tone: booleanTone(stats.hasColorVars) });
        addMetadataStat(details, "Typography vars", formatBooleanStat(stats.hasTypographyVars), { tone: booleanTone(stats.hasTypographyVars) });
        addMetadataStat(details, "Spacing vars", formatBooleanStat(stats.hasSpacingVars), { tone: booleanTone(stats.hasSpacingVars) });
        break;
      case "Component Architecture":
        addMetadataStat(details, "Components", stats.totalComponents);
        if (stats.requiredComponents !== void 0) addMetadataStat(details, "Required found", `${stats.requiredComponents.found}/${stats.requiredComponents.total}`);
        addMetadataStat(details, "Title Case", stats.componentsWithTitleCase);
        break;
      case "Style System":
        addMetadataStat(details, "Styles", stats.totalStyles);
        if (stats.htmlTagStyles !== void 0) addMetadataStat(details, "HTML tag styles", `${stats.htmlTagStyles.found}/${stats.htmlTagStyles.required}`);
        addMetadataStat(details, "Using variables", stats.stylesWithVariables);
        addMetadataStat(details, "Variable usage", formatPercentStat(stats.variableUsagePercent), { tone: percentageTone(stats.variableUsagePercent, 90) });
        break;
      case "Content & Accessibility":
        addMetadataStat(details, "Pages", stats.totalPages);
        addMetadataStat(details, "Lorem pages", stats.pagesWithLoremIpsum, { tone: zeroIsGoodTone(stats.pagesWithLoremIpsum) });
        addMetadataStat(details, "Heading issues", stats.headingHierarchyErrors, { tone: zeroIsGoodTone(stats.headingHierarchyErrors) });
        addMetadataStat(details, "Alt coverage", formatPercentStat(stats.altTextCoverage), { tone: percentageTone(stats.altTextCoverage, 100) });
        addMetadataStat(details, "SEO score", formatPercentStat(stats.seoComplianceScore), { tone: percentageTone(stats.seoComplianceScore, 90) });
        addMetadataStat(details, "SEO issue pages", stats.pagesWithSEOIssues, { tone: zeroIsGoodTone(stats.pagesWithSEOIssues) });
        addMetadataStat(details, "Content score", formatPercentStat(stats.averageContentScore), { tone: percentageTone(stats.averageContentScore, 90) });
        addMetadataStat(details, "Content issue pages", stats.pagesWithContentIssues, { tone: zeroIsGoodTone(stats.pagesWithContentIssues) });
        addMetadataStat(details, "Links", stats.totalLinks);
        addMetadataStat(details, "Broken links", stats.totalBrokenLinks, { tone: zeroIsGoodTone(stats.totalBrokenLinks) });
        addMetadataStat(details, "Links per page", stats.averageLinksPerPage);
        break;
      case "Interactions and GSAP": {
        const analysisComplete = stats.analysisComplete !== false && stats.analysisStatus !== "failed";
        const legacyIx2State = stats.legacyIx2Detected === true ? "Detected" : stats.legacyIx2Detected === false ? "Not detected" : "Not verified";
        addMetadataStat(details, "Analysis", analysisComplete ? stats.analysisStatus === "partial" ? "Partially verified" : "Verified" : "Not verified", { tone: analysisComplete ? "good" : "warning" });
        addMetadataStat(details, "Legacy IX2", legacyIx2State, { tone: stats.legacyIx2Detected === true ? "warning" : stats.legacyIx2Detected === false ? "good" : "muted" });
        addMetadataStat(details, "IX2 markers", stats.legacyIx2Count, { tone: zeroIsGoodTone(stats.legacyIx2Count) });
        addMetadataStat(details, "Pages requested", stats.pagesRequested);
        addMetadataStat(details, "Pages analyzed", stats.pagesAnalyzed);
        addMetadataStat(details, "Pages not checked", stats.pagesFailed, { tone: zeroIsGoodTone(stats.pagesFailed) });
        addMetadataStat(details, "Template routes skipped", stats.pagesSkipped);
        addMetadataStat(details, "Pages with IX2", stats.pagesWithLegacyIx2, { tone: zeroIsGoodTone(stats.pagesWithLegacyIx2) });
        addMetadataStat(details, "CMS item URLs", stats.cmsItemUrlsValidated);
        addMetadataStat(details, "Coverage", stats.cmsTemplateCoverageStatus, { tone: cmsTemplateCoverageTone(stats.cmsTemplateCoverageStatus) });
        if (typeof stats.errorMessage === "string") addMetadataStat(details, "Note", stats.errorMessage, { tone: "warning" });
        break;
      }
      default:
        details.push(...formatGenericMetadataStats(stats));
    }
    return details;
  }
  function addMetadataStat(items, label, value, options = {}) {
    if (value === void 0 || value === null || value === "") return;
    items.push({
      label,
      value: String(value),
      tone: options.tone
    });
  }
  function formatGenericMetadataStats(stats) {
    const items = [];
    Object.entries(stats).forEach(([key, value]) => {
      if (Array.isArray(value) || value && typeof value === "object") return;
      if (typeof value === "number") {
        addMetadataStat(items, humanizeStatKey(key), value);
      } else if (typeof value === "boolean") {
        addMetadataStat(items, humanizeStatKey(key), formatBooleanStat(value), { tone: booleanTone(value) });
      } else if (typeof value === "string" && value.trim() !== "") {
        addMetadataStat(items, humanizeStatKey(key), value);
      }
    });
    return items;
  }
  function humanizeStatKey(key) {
    return key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^total\s+/i, "").replace(/\b\w/g, (char) => char.toUpperCase());
  }
  function formatBooleanStat(value) {
    if (typeof value !== "boolean") return void 0;
    return value ? "Yes" : "No";
  }
  function formatPercentStat(value) {
    if (typeof value !== "number") return void 0;
    return `${value}%`;
  }
  function booleanTone(value) {
    if (typeof value !== "boolean") return void 0;
    return value ? "good" : "warning";
  }
  function zeroIsGoodTone(value) {
    if (typeof value !== "number") return void 0;
    return value === 0 ? "good" : "warning";
  }
  function percentageTone(value, target) {
    if (typeof value !== "number") return void 0;
    return value >= target ? "good" : "warning";
  }
  function cmsTemplateCoverageTone(value) {
    if (typeof value !== "string") return void 0;
    if (value === "complete" || value === "not-applicable") return "good";
    return "warning";
  }
})();
