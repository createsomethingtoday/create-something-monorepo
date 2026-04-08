import { describe, expect, it } from 'vitest';

import { getClientScript } from '../src/client-script.js';

describe('client takeover script', () => {
  it('preserves the public query parameter shape by default', () => {
    const script = getClientScript('active');

    expect(script).toContain("const defaultQueryParamKey = config.queryParamKey || 'query';");
    expect(script).toContain("if (url.searchParams.has('query')) return 'query';");
    expect(script).toContain("if (nextState.q) url.searchParams.set(nextState.query_param_key || defaultQueryParamKey, nextState.q);");
  });

  it('renders pagination controls in active mode', () => {
    const script = getClientScript('active');

    expect(script).toContain('function renderPagination(payload, state)');
    expect(script).toContain("const root = document.querySelector(selectors.pagination);");
    expect(script).toContain("createPaginationLink('Previous'");
    expect(script).toContain("createPaginationLink('Next'");
    expect(script).toContain("data-template-search-pagination-list");
  });

  it('syncs query heading and no-results chrome in active mode', () => {
    const script = getClientScript('active');

    expect(script).toContain("queryText: '[data-template-search-query-text], #search-term'");
    expect(script).toContain("noResults: '[data-template-search-no-results], #no-results'");
    expect(script).toContain("featuredHeading: '[data-template-search-featured-heading], #featuredHeading'");
    expect(script).toContain('function syncQueryText(state)');
    expect(script).toContain("if (queryText) queryText.textContent = state.q || '';");
    expect(script).toContain("noResults.classList.toggle('featured_templates', isEmpty);");
    expect(script).toContain("heading.className = 'h5';");
  });

  it('prefers real template cards over FAQ-style search cards', () => {
    const script = getClientScript('active');

    expect(script).toContain("function isSearchFaqCard(node)");
    expect(script).toContain("function isTemplateCard(node)");
    expect(script).toContain('function createGenericCardTemplate()');
    expect(script).toContain("wrapper.setAttribute('data-template-search-generated-card', '');");
    expect(script).toContain("const preferred = candidates.find((node) => isTemplateCard(node) && !isSearchFaqCard(node));");
    expect(script).toContain('return createGenericCardTemplate();');
    expect(script).toContain("querySelectorAll('[data-template-card-link], .tm-link, .template-name-link, .template-name.cc-search')");
    expect(script).toContain("function applyCreatorDestination(card, destinationUrl)");
    expect(script).toContain("querySelector('[data-template-card-title], .tm-template-title, .template-name, h3, h4')");
    expect(script).toContain("faqSummary.style.display = 'none';");
  });

  it('owns the live marketplace controls and isolates the native results grid', () => {
    const script = getClientScript('active');

    expect(script).toContain(
      "searchInput:\n        '[data-template-search-input], #query, input[name=\"query\"], input[data-name=\"query\"], input[type=\"search\"]'"
    );
    expect(script).toContain(
      "results: '[data-template-search-results], .template-list_search-results .search-result-items, .search-result-items, .tm-templates_grid'"
    );
    expect(script).toContain('function findNativeResultsContainer()');
    expect(script).toContain("const preferred = candidates.find((node) => node.closest('.template-list_search-results'));");
    expect(script).toContain('function ensureOwnedResultsContainer()');
    expect(script).toContain("ownedContainer.setAttribute('data-template-search-owned-results', '');");
    expect(script).toContain("nativeContainer.style.display = 'none';");
    expect(script).toContain("ownedContainer.classList.remove('w-dyn-items');");
    expect(script).toContain('function detachNodeListeners(node)');
    expect(script).toContain("replacement.setAttribute('data-template-search-owned-control', '');");
  });

  it('supports a configurable 100-result render window', () => {
    const script = getClientScript('active');

    expect(script).toContain('function clampPageSize(value, fallback)');
    expect(script).toContain('const defaultPageSizeValue = clampPageSize(config.pageSize ?? config.defaultPageSize ?? 24, 24);');
    expect(script).toContain('const minimumPageSizeValue = clampPageSize(config.minimumPageSize ?? defaultPageSizeValue, defaultPageSizeValue);');
    expect(script).toContain("const requestedPageSize = Number(url.searchParams.get('page_size') || defaultPageSizeValue) || defaultPageSizeValue;");
    expect(script).toContain('page_size: clampPageSize(Math.max(requestedPageSize, minimumPageSizeValue), defaultPageSizeValue)');
  });

  it('can restrict active takeover to specific query values and hand back to native search', () => {
    const script = getClientScript('active');

    expect(script).toContain('const activeQueryValues = Array.isArray(config.activeQueryValues)');
    expect(script).toContain("requestedMode === 'active' && activeQueryValues.length > 0 && !activeQueryValues.includes(currentQuery)");
    expect(script).toContain("if (mode === 'native') return;");
    expect(script).toContain('activeQueryValues.includes(normalizeSearchQuery(nextQuery))');
    expect(script).toContain('window.location.assign(buildPublicUrl(state).toString());');
  });

  it('submits search immediately when the controlled input receives Enter', () => {
    const script = getClientScript('active');

    expect(script).toContain('function submitSearch(value)');
    expect(script).toContain("searchInput.addEventListener('keydown', (event) => {");
    expect(script).toContain("if (event.isComposing || event.key !== 'Enter') return;");
    expect(script).toContain('event.preventDefault();');
    expect(script).toContain('submitSearch(event.target.value);');
  });

  it('falls back from broken listing links to stable preview destinations', () => {
    const script = getClientScript('active');

    expect(script).toContain('const linkValidationMaxItems = Math.max(0, Math.min(100, Math.floor(Number(config.linkValidationMaxItems ?? 24) || 24)));');
    expect(script).toContain('const templateLinkValidationCache = new Map();');
    expect(script).toContain('let nativeTemplateMetadataIndex = null;');
    expect(script).toContain('function buildNativeTemplateMetadataIndex()');
    expect(script).toContain('function lookupNativeTemplateMetadata(item)');
    expect(script).toContain("return item.url || (nativeMetadata && nativeMetadata.templateUrl) || null;");
    expect(script).toContain("return (nativeMetadata && nativeMetadata.templateUrl) || item.website_url || item.preview_url || item.url || null;");
    expect(script).toContain('function validateTemplateDestination(item)');
    expect(script).toContain("method: 'HEAD'");
    expect(script).toContain("credentials: 'same-origin'");
    expect(script).toContain('function scheduleCardDestinationValidation(card, item)');
    expect(script).toContain('applyCardDestination(card, resolvedUrl);');
  });

  it('rebinds creator profile links and avatars from native template metadata', () => {
    const script = getClientScript('active');

    expect(script).toContain("item.creator_profile_url || (nativeMetadata && nativeMetadata.creatorProfileUrl) || destinationUrl || '#';");
    expect(script).toContain('applyCreatorDestination(card, creatorDestinationUrl);');
    expect(script).toContain("const creatorImage = card.querySelector('.tm-templates-creator-icon, [data-template-card-creator-image]');");
    expect(script).toContain('const creatorImageUrl = item.creator_avatar_url || (nativeMetadata && nativeMetadata.creatorImageUrl);');
    expect(script).toContain('const creatorAlt = item.creator_avatar_alt || item.creator_name');
    expect(script).toContain("creatorImage.src = creatorImageUrl;");
    expect(script).toContain("creatorImage.style.display = 'none';");
  });

  it('emits experiment-safe analytics for search renders and mismatches', () => {
    const script = getClientScript('active');

    expect(script).toContain("const experimentKey = config.experimentKey || 'webflow-template-search';");
    expect(script).toContain("const controlVariant = config.experimentControlVariant || 'control';");
    expect(script).toContain("const treatmentVariant = config.experimentTreatmentVariant || 'treatment';");
    expect(script).toContain("const experimentStorageKey =");
    expect(script).toContain('function resolveExperiment()');
    expect(script).toContain("const experimentVariant = experiment.variant || config.experimentVariant || config.mode || defaultModeValue;");
    expect(script).toContain("const requestedMode = experimentModeByVariant[experimentVariant] || config.mode || defaultModeValue;");
    expect(script).toContain("const mode =");
    expect(script).toContain('function publishExperimentState()');
    expect(script).toContain('window.__WEBFLOW_TEMPLATE_SEARCH_RUNTIME__ = {');
    expect(script).toContain("document.documentElement.setAttribute('data-template-search-variant', String(experimentVariant));");
    expect(script).toContain("document.documentElement.setAttribute('data-template-search-mode', String(mode));");
    expect(script).toContain('function trackEvent(name, payload)');
    expect(script).toContain('function trackExperimentExposure(state)');
    expect(script).toContain("window.amplitude.track(name, event);");
    expect(script).toContain("legacyAmplitude.logEvent(name, event);");
    expect(script).toContain("trackEvent('Template Search Experiment Assigned'");
    expect(script).toContain("trackEvent('Template Search Experiment Exposed'");
    expect(script).toContain("trackEvent('Template Search Performed'");
    expect(script).toContain("trackEvent('Template Search DOM Mismatch'");
    expect(script).toContain("trackEvent('Template Search Result Clicked'");
    expect(script).toContain("trackEvent('Template Search Request Failed'");
  });
});
