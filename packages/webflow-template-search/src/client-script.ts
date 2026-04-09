export function getClientScript(defaultMode = 'shadow'): string {
  return String.raw`(() => {
  const config = window.__WEBFLOW_TEMPLATE_SEARCH__ || {};
  const apiBaseUrl = (config.apiBaseUrl || '').replace(/\/$/, '') || new URL(document.currentScript.src).origin;
  const defaultQueryParamKey = config.queryParamKey || 'query';
  function normalizeSearchQuery(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }
  const activeQueryValues = Array.isArray(config.activeQueryValues)
    ? Array.from(new Set(config.activeQueryValues.map((value) => normalizeSearchQuery(value)).filter(Boolean)))
    : [];
  const experimentKey = config.experimentKey || 'webflow-template-search';
  const controlVariant = config.experimentControlVariant || 'control';
  const treatmentVariant = config.experimentTreatmentVariant || 'treatment';
  const experimentModeByVariant = Object.assign(
    {
      [controlVariant]: 'shadow',
      [treatmentVariant]: 'active'
    },
    config.experimentModeByVariant || {}
  );
  const experimentStorageKey =
    config.experimentStorageKey || ['webflow-template-search', experimentKey, 'variant'].join(':');
  const selectors = Object.assign(
    {
      results: '[data-template-search-results], .template-list_search-results .search-result-items, .search-result-items, .tm-templates_grid',
      resultItems: '[data-template-search-result-item], .tm-templates_grid_item',
      cardTemplate: '[data-template-search-card-template]',
      pagination: '[data-template-search-pagination]',
      subcategoryPills: '[data-template-search-subcategory-pills], #subcategory-list',
      searchInput:
        '[data-template-search-input], #query, input[name="query"], input[data-name="query"], input[type="search"]',
      queryText: '[data-template-search-query-text], #search-term',
      sortSelect: '[data-template-search-sort], select[name="sort"]',
      styleSelect: '[data-template-search-style], select[name="styles"]',
      typeSelect: '[data-template-search-type], select[name="types"]',
      freeToggle: '[data-template-search-free], input[name="free_only"], input[fs-cmsfilter-field="free"]',
      emptyState: '[data-template-search-empty], .search-empty-wrap',
      noResults: '[data-template-search-no-results], #no-results',
      featuredHeading: '[data-template-search-featured-heading], #featuredHeading'
    },
    config.selectors || {}
  );
  const defaultModeValue = ${JSON.stringify(defaultMode)};
  const linkValidationMaxItems = Math.max(0, Math.min(100, Math.floor(Number(config.linkValidationMaxItems ?? 24) || 24)));
  const templateLinkValidationCache = new Map();
  let nativeTemplateMetadataIndex = null;

  function clampPageSize(value, fallback) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(1, Math.min(100, Math.floor(numeric)));
  }

  const defaultPageSizeValue = clampPageSize(config.pageSize ?? config.defaultPageSize ?? 24, 24);
  const minimumPageSizeValue = clampPageSize(config.minimumPageSize ?? defaultPageSizeValue, defaultPageSizeValue);

  function scheduleBackgroundWork(callback) {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => callback(), { timeout: 1500 });
      return;
    }
    window.setTimeout(callback, 0);
  }

  function sanitizeSplit(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    if (numeric <= 0 || numeric >= 1) return null;
    return numeric;
  }

  function readStoredExperimentVariant() {
    try {
      return window.localStorage ? window.localStorage.getItem(experimentStorageKey) : null;
    } catch {
      return null;
    }
  }

  function persistExperimentVariant(value) {
    try {
      if (window.localStorage) window.localStorage.setItem(experimentStorageKey, value);
    } catch {}
  }

  function resolveExperiment() {
    const explicitVariant = config.experimentVariant || null;
    if (explicitVariant) {
      return { variant: explicitVariant, assigned: false, source: 'config' };
    }

    const split = sanitizeSplit(config.experimentSplit);
    if (split === null) {
      return { variant: null, assigned: false, source: 'mode' };
    }

    const storedVariant = readStoredExperimentVariant();
    if (storedVariant) {
      return { variant: storedVariant, assigned: false, source: 'storage' };
    }

    const variant = Math.random() < split ? treatmentVariant : controlVariant;
    persistExperimentVariant(variant);
    return { variant, assigned: true, source: 'split' };
  }

  const experiment = resolveExperiment();
  const experimentVariant = experiment.variant || config.experimentVariant || config.mode || defaultModeValue;
  const requestedMode = experimentModeByVariant[experimentVariant] || config.mode || defaultModeValue;
  const currentUrl = new URL(window.location.href);
  const currentQuery = normalizeSearchQuery(
    currentUrl.searchParams.get('q') || currentUrl.searchParams.get('query') || currentUrl.searchParams.get('search') || ''
  );
  const mode =
    requestedMode === 'active' && activeQueryValues.length > 0 && !activeQueryValues.includes(currentQuery)
      ? 'native'
      : requestedMode;
  let experimentExposureTracked = false;

  function publishExperimentState() {
    try {
      window.__WEBFLOW_TEMPLATE_SEARCH_RUNTIME__ = {
        experimentKey,
        variant: experimentVariant,
        mode,
        requestedMode,
        assignmentSource: experiment.source,
        activeQueryValues
      };
      document.documentElement.setAttribute('data-template-search-variant', String(experimentVariant));
      document.documentElement.setAttribute('data-template-search-mode', String(mode));
    } catch {}
  }

  publishExperimentState();
  if (mode === 'native') return;

  function normalizeSort(value) {
    if (value === 'approval-date-desc') return 'newest';
    if (value === 'price-asc') return 'price_asc';
    if (value === 'price-desc') return 'price_desc';
    return value || 'popular';
  }

  function inferQueryParamKey(url) {
    if (url.searchParams.has('query')) return 'query';
    if (url.searchParams.has('q')) return 'q';
    if (url.searchParams.has('search')) return 'search';
    return defaultQueryParamKey;
  }

  function normalizeQueryForAnalytics(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  function trackEvent(name, payload) {
    const query = payload && typeof payload.query === 'string' ? payload.query : '';
    const event = Object.assign(
      {
        experiment_key: experimentKey,
        variant: experimentVariant,
        assignment_source: experiment.source,
        pathname: window.location.pathname,
        query,
        normalized_query: normalizeQueryForAnalytics(query)
      },
      payload || {}
    );

    try {
      if (window.amplitude && typeof window.amplitude.track === 'function') {
        window.amplitude.track(name, event);
        return;
      }

      const legacyAmplitude =
        window.amplitude && typeof window.amplitude.getInstance === 'function' ? window.amplitude.getInstance() : null;
      if (legacyAmplitude && typeof legacyAmplitude.logEvent === 'function') {
        legacyAmplitude.logEvent(name, event);
        return;
      }

      if (window.analytics && typeof window.analytics.track === 'function') {
        window.analytics.track(name, event);
      }
    } catch (error) {
      console.warn('[webflow-template-search/track]', error);
    }
  }

  function trackExperimentExposure(state) {
    if (experimentExposureTracked) return;
    experimentExposureTracked = true;

    if (experiment.assigned) {
      trackEvent('Template Search Experiment Assigned', {
        query: state.q || '',
        mode
      });
    }

    trackEvent('Template Search Experiment Exposed', {
      query: state.q || '',
      mode
    });
  }

  function parseRouteState() {
    const url = new URL(window.location.href);
    const requestedPageSize = Number(url.searchParams.get('page_size') || defaultPageSizeValue) || defaultPageSizeValue;
    const state = {
      q: url.searchParams.get('q') || url.searchParams.get('query') || url.searchParams.get('search') || '',
      query_param_key: inferQueryParamKey(url),
      scope: 'all',
      category_group_slug: null,
      child_category_slug: null,
      styles: url.searchParams.getAll('styles').flatMap((value) => value.split(',')).filter(Boolean),
      types: url.searchParams.getAll('types').flatMap((value) => value.split(',')).filter(Boolean),
      free_only: ['1', 'true', 'yes', 'on'].includes((url.searchParams.get('free_only') || '').toLowerCase()),
      sort: normalizeSort(url.searchParams.get('sort') || 'popular'),
      page: Number(url.searchParams.get('page') || 1) || 1,
      page_size: clampPageSize(Math.max(requestedPageSize, minimumPageSizeValue), defaultPageSizeValue)
    };

    const pathname = url.pathname.replace(/\/+$/, '');
    if (pathname === '/templates/featured') state.scope = 'featured';
    if (pathname === '/templates/free' || url.searchParams.get('pricing') === 'free') {
      state.scope = 'free';
      state.free_only = true;
    }
    if (/\/templates\/landing-page/.test(pathname) || /\/templates\/landing-pages/.test(pathname)) {
      state.scope = 'landing_pages';
    }

    const categoryMatch = pathname.match(/\/templates\/category\/([^/?#]+)/);
    const subcategoryMatch = pathname.match(/\/templates\/subcategory\/([^/?#]+)/);
    if (categoryMatch) state.category_group_slug = categoryMatch[1];
    if (subcategoryMatch) state.child_category_slug = subcategoryMatch[1];

    return state;
  }

  function buildSearchUrl(state) {
    const url = new URL('/api/templates/search', apiBaseUrl);
    if (state.q) url.searchParams.set('q', state.q);
    if (state.scope && state.scope !== 'all') url.searchParams.set('scope', state.scope);
    if (state.category_group_slug) url.searchParams.set('category_group_slug', state.category_group_slug);
    if (state.child_category_slug) url.searchParams.set('child_category_slug', state.child_category_slug);
    if (state.free_only) url.searchParams.set('free_only', 'true');
    if (state.sort) url.searchParams.set('sort', state.sort);
    if (state.page > 1) url.searchParams.set('page', String(state.page));
    if (state.page_size) url.searchParams.set('page_size', String(state.page_size));
    if (!shouldIncludeFacets()) url.searchParams.set('include_facets', 'false');
    state.styles.forEach((value) => url.searchParams.append('styles', value));
    state.types.forEach((value) => url.searchParams.append('types', value));
    return url;
  }

  function shouldIncludeFacets() {
    return Boolean(
      document.querySelector(selectors.styleSelect) ||
      document.querySelector(selectors.typeSelect) ||
      document.querySelector(selectors.subcategoryPills)
    );
  }

  function buildPublicUrl(state, page) {
    const url = new URL(window.location.href);
    const nextState = Object.assign({}, state);
    if (typeof page === 'number') nextState.page = page;

    ['q', 'query', 'search', 'styles', 'types', 'free_only', 'sort', 'page', 'page_size'].forEach((key) =>
      url.searchParams.delete(key)
    );

    if (nextState.q) url.searchParams.set(nextState.query_param_key || defaultQueryParamKey, nextState.q);
    if (nextState.sort && nextState.sort !== 'popular') url.searchParams.set('sort', nextState.sort);
    if (nextState.free_only) url.searchParams.set('free_only', 'true');
    if (nextState.page > 1) url.searchParams.set('page', String(nextState.page));
    if (nextState.page_size && nextState.page_size !== defaultPageSizeValue) {
      url.searchParams.set('page_size', String(nextState.page_size));
    }
    nextState.styles.forEach((value) => url.searchParams.append('styles', value));
    nextState.types.forEach((value) => url.searchParams.append('types', value));
    return url;
  }

  function extractCurrentSlugs() {
    const container = findNativeResultsContainer();
    if (!container) return [];

    return Array.from(container.querySelectorAll(selectors.resultItems))
      .map((node) => node.getAttribute('data-template-slug') || (node.querySelector('a[href*="/templates/html/"]') || {}).href || '')
      .map((value) => {
        const match = String(value).match(/\/templates\/html\/([^/?#]+)/);
        return match ? match[1] : '';
      })
      .filter(Boolean);
  }

  function compareShadowResults(payload) {
    const current = extractCurrentSlugs();
    const incoming = payload.items.map((item) => item.template_slug);
    if (current.join('|') !== incoming.join('|')) {
      console.info('[webflow-template-search/shadow]', {
        current,
        incoming,
        currentCount: current.length,
        incomingCount: incoming.length
      });
    }
  }

  function formatPrice(item) {
    if (item.is_free || item.price === 0) return 'Free';
    if (typeof item.price !== 'number') return '';
    return '$' + item.price + ' USD';
  }

  function normalizeLookupValue(value) {
    return String(value || '')
      .replace(/\s+\|\s+\$.*$/, '')
      .trim()
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function toAbsoluteUrl(value) {
    if (!value) return null;
    try {
      return new URL(value, window.location.origin).href;
    } catch {
      return null;
    }
  }

  function extractTemplateSlugFromValue(value) {
    const match = String(value || '').match(/\/templates\/html\/([^/?#]+)/);
    return match ? match[1] : '';
  }

  function extractNativeTemplateTitle(card) {
    const title =
      card.querySelector('[data-template-card-title], .tm-template-title, .template-name, .template-name.cc-search, h3, h4');
    return String((title && title.textContent) || '')
      .replace(/\s+\|\s+\$.*$/, '')
      .trim();
  }

  function extractNativeCreatorName(card) {
    const creator = card.querySelector('[data-template-card-creator], .tm-template-creator, .template-creator, .template-name_search');
    return String((creator && creator.textContent) || '').trim();
  }

  function buildTemplateLookupKey(name, creatorName) {
    const nameKey = normalizeLookupValue(name);
    const creatorKey = normalizeLookupValue(creatorName);
    if (!nameKey || !creatorKey) return null;
    return nameKey + '::' + creatorKey;
  }

  function buildNativeTemplateMetadataIndex() {
    const bySlug = new Map();
    const byNameCreator = new Map();
    const byName = new Map();
    const nameCounts = new Map();

    Array.from(document.querySelectorAll(selectors.resultItems))
      .filter((node) => isTemplateCard(node) && !isSearchFaqCard(node) && !node.closest('[data-template-search-owned-results]'))
      .forEach((node) => {
        const creatorLink = node.querySelector('.template-creator-link');
        const creatorImage = node.querySelector('.tm-templates-creator-icon, [data-template-card-creator-image]');
        const templateUrl = Array.from(
          node.querySelectorAll('.tm-link, [data-template-card-link], .template-name-link, .template-name.cc-search')
        )
          .map((link) => toAbsoluteUrl(link.getAttribute('href') || link.href || ''))
          .find((value) => extractTemplateSlugFromValue(value));
        const templateSlug = extractTemplateSlugFromValue(templateUrl || node.getAttribute('data-template-slug') || '');
        const templateName = extractNativeTemplateTitle(node);
        const creatorName = extractNativeCreatorName(node);
        const creatorProfileUrl = toAbsoluteUrl((creatorLink && creatorLink.getAttribute('href')) || '');
        const creatorImageUrl = toAbsoluteUrl((creatorImage && creatorImage.getAttribute('src')) || '');

        if (!templateSlug && !templateName) return;

        const metadata = {
          templateSlug,
          templateName,
          templateUrl: templateUrl || null,
          creatorName,
          creatorProfileUrl: creatorProfileUrl || null,
          creatorImageUrl: creatorImageUrl || null
        };

        const nameKey = normalizeLookupValue(templateName);
        const nameCreatorKey = buildTemplateLookupKey(templateName, creatorName);
        if (nameKey) {
          nameCounts.set(nameKey, (nameCounts.get(nameKey) || 0) + 1);
        }

        if (templateSlug && !bySlug.has(templateSlug)) bySlug.set(templateSlug, metadata);
        if (nameCreatorKey && !byNameCreator.has(nameCreatorKey)) byNameCreator.set(nameCreatorKey, metadata);
        if (nameKey && !byName.has(nameKey)) byName.set(nameKey, metadata);
      });

    Array.from(byName.keys()).forEach((nameKey) => {
      if ((nameCounts.get(nameKey) || 0) > 1) {
        byName.delete(nameKey);
      }
    });

    return { bySlug, byNameCreator, byName };
  }

  function getNativeTemplateMetadataIndex() {
    if (!nativeTemplateMetadataIndex) {
      nativeTemplateMetadataIndex = buildNativeTemplateMetadataIndex();
    }
    return nativeTemplateMetadataIndex;
  }

  function lookupNativeTemplateMetadata(item) {
    const index = getNativeTemplateMetadataIndex();

    if (item.template_slug && index.bySlug.has(item.template_slug)) {
      return index.bySlug.get(item.template_slug);
    }

    const nameCreatorKey = buildTemplateLookupKey(item.name, item.creator_name);
    if (nameCreatorKey && index.byNameCreator.has(nameCreatorKey)) {
      return index.byNameCreator.get(nameCreatorKey);
    }

    const nameKey = normalizeLookupValue(item.name);
    if (nameKey && index.byName.has(nameKey)) {
      return index.byName.get(nameKey);
    }

    return null;
  }

  function getPrimaryTemplateUrl(item) {
    const nativeMetadata = lookupNativeTemplateMetadata(item);
    return item.url || (nativeMetadata && nativeMetadata.templateUrl) || null;
  }

  function getFallbackTemplateUrl(item) {
    const nativeMetadata = lookupNativeTemplateMetadata(item);
    return (nativeMetadata && nativeMetadata.templateUrl) || item.website_url || item.preview_url || item.url || null;
  }

  function applyCardDestination(card, destinationUrl) {
    card
      .querySelectorAll('[data-template-card-link], .tm-link, .template-name-link, .template-name.cc-search')
      .forEach((link) => {
        link.href = destinationUrl || '#';
      });
  }

  function applyCreatorDestination(card, destinationUrl) {
    card.querySelectorAll('.template-creator-link').forEach((link) => {
      link.href = destinationUrl || '#';
    });
  }

  function validateTemplateDestination(item) {
    const primaryUrl = getPrimaryTemplateUrl(item);
    const fallbackUrl = getFallbackTemplateUrl(item);
    if (!primaryUrl || !fallbackUrl || primaryUrl === fallbackUrl) {
      return Promise.resolve(primaryUrl || fallbackUrl || '#');
    }

    if (templateLinkValidationCache.has(primaryUrl)) {
      return templateLinkValidationCache.get(primaryUrl);
    }

    const validation = fetch(primaryUrl, {
      method: 'HEAD',
      credentials: 'same-origin',
      redirect: 'follow'
    })
      .then((response) => (response.ok ? primaryUrl : fallbackUrl))
      .catch(() => fallbackUrl);

    templateLinkValidationCache.set(primaryUrl, validation);
    return validation;
  }

  function scheduleCardDestinationValidation(card, item) {
    if (mode === 'shadow') return;
    const primaryUrl = getPrimaryTemplateUrl(item);
    const fallbackUrl = getFallbackTemplateUrl(item);
    if (!primaryUrl || !fallbackUrl || primaryUrl === fallbackUrl) return;

    validateTemplateDestination(item).then((resolvedUrl) => {
      if (!resolvedUrl || resolvedUrl === primaryUrl) return;
      applyCardDestination(card, resolvedUrl);
    });
  }

  function isSearchFaqCard(node) {
    return Boolean(node.querySelector('.tm-link.cc-search-results, .template-name.cc-search, .template-name_search'));
  }

  function isTemplateCard(node) {
    return Boolean(node.querySelector('.template-name, .template-name-link, .template-creator, .category-text'));
  }

  function stripNodeAttributes(node, attributeNames) {
    attributeNames.forEach((name) => node.removeAttribute(name));
  }

  function sanitizeOwnedCard(card) {
    if (!card) return card;

    card.removeAttribute('role');
    card.removeAttribute('aria-hidden');
    card.setAttribute('data-template-search-owned-item', '');
    card.classList.remove('w-dyn-item');

    card
      .querySelectorAll(
        '.tm-approval-date, .tm-type, .tm-price, .tm-popularity-score, link[rel="prefetch"], [fs-cmsfilter-field], [fs-cmssort-field], [fs-cmssort-type]'
      )
      .forEach((node) => node.remove());

    card
      .querySelectorAll('[data-wf-cms-context], [data-wf-component-context], [data-wf-element-id], [data-wf-native-id-path], [data-w-id]')
      .forEach((node) =>
        stripNodeAttributes(node, [
          'data-wf-cms-context',
          'data-wf-component-context',
          'data-wf-element-id',
          'data-wf-native-id-path',
          'data-w-id'
        ])
      );

    return card;
  }

  function ensureOwnedResultsContainer() {
    const nativeContainer = findNativeResultsContainer();
    if (!nativeContainer) return null;
    if (mode === 'shadow') return nativeContainer;

    let ownedContainer = document.querySelector('[data-template-search-owned-results]');
    if (!ownedContainer) {
      ownedContainer = nativeContainer.cloneNode(false);
      ownedContainer.innerHTML = '';
      ownedContainer.removeAttribute('id');
      ownedContainer.removeAttribute('data-template-search-results');
      ownedContainer.removeAttribute('fs-cmsfilter-element');
      ownedContainer.removeAttribute('fs-cmssort-element');
      ownedContainer.removeAttribute('data-wf-element-id');
      ownedContainer.removeAttribute('data-w-id');
      ownedContainer.classList.remove('w-dyn-items');
      ownedContainer.setAttribute('data-template-search-owned-results', '');
      nativeContainer.insertAdjacentElement('afterend', ownedContainer);
    }

    nativeContainer.style.display = 'none';
    nativeContainer.setAttribute('aria-hidden', 'true');
    ownedContainer.style.removeProperty('display');
    ownedContainer.removeAttribute('aria-hidden');
    return ownedContainer;
  }

  function countVisibleResultItems(container) {
    if (!container) return 0;
    return Array.from(container.children).filter((node) => node.style.display !== 'none').length;
  }

  function findNativeResultsContainer() {
    const candidates = Array.from(document.querySelectorAll(selectors.results));
    if (!candidates.length) return null;

    const preferred = candidates.find((node) => node.closest('.template-list_search-results'));
    return preferred || candidates[0] || null;
  }

  function detachNodeListeners(node) {
    if (!node || mode === 'shadow' || node.hasAttribute('data-template-search-owned-control')) return node;

    const replacement = node.cloneNode(true);
    if ('value' in node) replacement.value = node.value;
    if ('checked' in node) replacement.checked = node.checked;
    replacement.setAttribute('data-template-search-owned-control', '');
    node.replaceWith(replacement);
    return replacement;
  }

  function createGenericCardTemplate() {
    const wrapper = document.createElement('div');
    wrapper.className = 'tm-templates_grid_item';
    wrapper.setAttribute('data-template-search-generated-card', '');
    wrapper.innerHTML =
      '<div class="mp-template-item">' +
      '  <a class="tm-link w-inline-block" href="#">' +
      '    <img alt="" src="" class="tm-card_image" />' +
      '    <img alt="" src="" class="tm-card_image_secondary" />' +
      '    <div class="mp-card_hover">' +
      '      <div class="mp-card_hover-content">' +
      '        <div class="paragraph-l u-text-semibold">View details</div>' +
      '      </div>' +
      '    </div>' +
      '  </a>' +
      '  <div class="mp-template-content">' +
      '    <div class="mp-template-details">' +
      '      <div class="template-details-wrap">' +
      '        <div class="template-name-wrap">' +
      '          <a class="template-name-link w-inline-block" href="#"><h4 class="template-name"></h4></a>' +
      '        </div>' +
      '        <div class="template-price-wrap"><h4 class="category-text"></h4></div>' +
      '      </div>' +
      '      <div class="template-creator-wrap"><h4 class="template-creator"></h4></div>' +
      '    </div>' +
      '  </div>' +
      '</div>';
    return wrapper;
  }

  function cloneCardTemplate() {
    const template = document.querySelector(selectors.cardTemplate);
    if (template && template.content) {
      const templateNode = template.content.firstElementChild;
      if (templateNode && isTemplateCard(templateNode) && !isSearchFaqCard(templateNode)) {
        return templateNode.cloneNode(true);
      }
    }

    const candidates = Array.from(document.querySelectorAll(selectors.resultItems));
    const preferred = candidates.find((node) => isTemplateCard(node) && !isSearchFaqCard(node));

    if (preferred) return preferred.cloneNode(true);
    return createGenericCardTemplate();
  }

  function bindCard(card, item, tracking) {
    card.setAttribute('data-template-slug', item.template_slug);
    card.setAttribute('data-template-search-rank', String(tracking.rank));
    card = sanitizeOwnedCard(card);
    const nativeMetadata = lookupNativeTemplateMetadata(item);
    const destinationUrl = item.url || (nativeMetadata && nativeMetadata.templateUrl) || getFallbackTemplateUrl(item) || '#';
    const creatorDestinationUrl =
      item.creator_profile_url || (nativeMetadata && nativeMetadata.creatorProfileUrl) || destinationUrl || '#';
    applyCardDestination(card, destinationUrl);
    applyCreatorDestination(card, creatorDestinationUrl);

    card
      .querySelectorAll('.template-creator-link, [data-template-card-link], .tm-link, .template-name-link, .template-name.cc-search')
      .forEach((link) => {
        link.addEventListener('click', (event) => {
          const currentLink = event.currentTarget;
          trackEvent('Template Search Result Clicked', {
            query: tracking.query,
            page: tracking.page,
            rank: tracking.rank,
            template_slug: item.template_slug,
            template_name: item.name,
            destination_url: currentLink && 'href' in currentLink ? currentLink.href : destinationUrl
          });
        });
      });

    const image = card.querySelector('[data-template-card-image], .tm-card_image, img');
    if (image) {
      image.loading = 'lazy';
      image.decoding = 'async';
    }
    if (image && item.thumbnail_image_url) {
      image.src = item.thumbnail_image_url;
      image.alt = item.name;
      image.classList.remove('w-dyn-bind-empty');
    }
    const secondaryImage = card.querySelector('.tm-card_image_secondary');
    if (secondaryImage) {
      secondaryImage.loading = 'lazy';
      secondaryImage.decoding = 'async';
    }
    if (secondaryImage && item.thumbnail_image_secondary_url) {
      secondaryImage.src = item.thumbnail_image_secondary_url;
      secondaryImage.alt = item.name;
      secondaryImage.classList.remove('w-dyn-bind-empty');
    }

    const title = card.querySelector('[data-template-card-title], .tm-template-title, .template-name, h3, h4');
    if (title) title.textContent = item.name;
    const creator = card.querySelector('[data-template-card-creator], .tm-template-creator, .template-creator');
    if (creator) creator.textContent = item.creator_name || (nativeMetadata && nativeMetadata.creatorName) || '';
    const creatorImage = card.querySelector('.tm-templates-creator-icon, [data-template-card-creator-image]');
    if (creatorImage) {
      creatorImage.loading = 'lazy';
      creatorImage.decoding = 'async';
      const creatorImageUrl = item.creator_avatar_url || (nativeMetadata && nativeMetadata.creatorImageUrl);
      const creatorAlt = item.creator_avatar_alt || item.creator_name || (nativeMetadata && nativeMetadata.creatorName) || '';

      creatorImage.alt = creatorAlt;
      if (creatorImageUrl) {
        creatorImage.src = creatorImageUrl;
        creatorImage.style.removeProperty('display');
        creatorImage.classList.remove('w-dyn-bind-empty');
      } else {
        creatorImage.removeAttribute('src');
        creatorImage.classList.add('w-dyn-bind-empty');
        creatorImage.style.display = 'none';
      }
    }
    const price = card.querySelector('[data-template-card-price], .tm-template-price, .category-text');
    if (price) price.textContent = formatPrice(item);
    const faqSummary = card.querySelector('.template-name_search');
    if (faqSummary) faqSummary.style.display = 'none';
    return card;
  }

  function setVisible(node, visible) {
    if (!node) return;
    if (visible) {
      node.style.removeProperty('display');
      return;
    }
    node.style.display = 'none';
  }

  function syncQueryText(state) {
    const queryText = document.querySelector(selectors.queryText);
    if (queryText) queryText.textContent = state.q || '';
  }

  function syncFeaturedHeading(isEmpty) {
    const heading = document.querySelector(selectors.featuredHeading);
    if (!heading) return;
    if (!heading.hasAttribute('data-template-search-original-class')) {
      heading.setAttribute('data-template-search-original-class', heading.className || '');
    }
    if (isEmpty) {
      heading.className = 'h5';
      return;
    }
    heading.className = heading.getAttribute('data-template-search-original-class') || '';
  }

  function syncEmptyState(payload) {
    const isEmpty = payload.items.length === 0;
    const emptyState = document.querySelector(selectors.emptyState);
    const noResults = document.querySelector(selectors.noResults);

    setVisible(emptyState, isEmpty);
    if (noResults && noResults !== emptyState) setVisible(noResults, isEmpty);
    if (noResults) noResults.classList.toggle('featured_templates', isEmpty);
    syncFeaturedHeading(isEmpty);
  }

  function renderPageChrome(state, payload) {
    if (mode === 'shadow') return;
    syncQueryText(state);
    syncEmptyState(payload);
  }

  function renderResults(payload) {
    const container = mode === 'shadow' ? findNativeResultsContainer() : ensureOwnedResultsContainer();
    if (!container) return;
    if (mode === 'shadow') {
      compareShadowResults(payload);
      return payload.items.length;
    }
    const cardTemplate = cloneCardTemplate();
    const fragment = document.createDocumentFragment();
    payload.items.forEach((item, index) => {
      const card = cardTemplate ? cardTemplate.cloneNode(true) : null;
      if (!card) {
        const fallback = document.createElement('a');
        fallback.href = item.url || '#';
        fallback.textContent = item.name;
        fragment.appendChild(fallback);
        return;
      }
      const rank = ((payload.pagination && payload.pagination.page ? payload.pagination.page : 1) - 1) *
        (payload.pagination && payload.pagination.page_size ? payload.pagination.page_size : payload.items.length || 1) +
        index +
        1;
      const boundCard = bindCard(card, item, {
        query: payload.query || '',
        page: payload.pagination && payload.pagination.page ? payload.pagination.page : 1,
        rank
      });
      fragment.appendChild(boundCard);
      if (index < linkValidationMaxItems) {
        scheduleBackgroundWork(() => scheduleCardDestinationValidation(boundCard, item));
      }
    });
    container.replaceChildren(fragment);
    return countVisibleResultItems(container);
  }

  function buildPaginationPages(pagination) {
    const totalPages = pagination.total_pages || 0;
    const currentPage = pagination.page || 1;
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

    const pages = [1];
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    if (start > 2) pages.push(null);
    for (let page = start; page <= end; page += 1) pages.push(page);
    if (end < totalPages - 1) pages.push(null);
    pages.push(totalPages);

    return pages;
  }

  function createPaginationLink(label, state, page, current, disabled) {
    if (disabled) {
      const disabledNode = document.createElement('span');
      disabledNode.textContent = label;
      disabledNode.setAttribute('aria-disabled', 'true');
      disabledNode.setAttribute('data-template-search-page-link', 'disabled');
      return disabledNode;
    }

    const link = document.createElement('a');
    link.href = buildPublicUrl(state, page).toString();
    link.textContent = label;
    link.setAttribute('data-template-search-page-link', String(page));
    if (current) link.setAttribute('aria-current', 'page');
    link.addEventListener('click', (event) => {
      event.preventDefault();
      if (page === state.page) return;
      state.page = page;
      updateUrl(state);
      load(state);
    });
    return link;
  }

  function renderPagination(payload, state) {
    const root = document.querySelector(selectors.pagination);
    if (!root || mode === 'shadow') return;

    root.innerHTML = '';
    const pagination = payload.pagination;
    if (!pagination || pagination.total_pages <= 1) {
      root.style.display = 'none';
      return;
    }

    root.style.display = '';
    const nav = document.createElement('nav');
    nav.setAttribute('aria-label', 'Template search pagination');
    const list = document.createElement('div');
    list.setAttribute('data-template-search-pagination-list', '');

    list.appendChild(
      createPaginationLink('Previous', state, Math.max(1, pagination.page - 1), false, !pagination.has_previous_page)
    );

    buildPaginationPages(pagination).forEach((page) => {
      if (page === null) {
        const ellipsis = document.createElement('span');
        ellipsis.textContent = '...';
        ellipsis.setAttribute('aria-hidden', 'true');
        ellipsis.setAttribute('data-template-search-page-ellipsis', '');
        list.appendChild(ellipsis);
        return;
      }

      list.appendChild(createPaginationLink(String(page), state, page, page === pagination.page, false));
    });

    list.appendChild(
      createPaginationLink('Next', state, pagination.page + 1, false, !pagination.has_next_page)
    );

    nav.appendChild(list);
    root.appendChild(nav);
  }

  function renderPills(payload) {
    const root = document.querySelector(selectors.subcategoryPills);
    if (!root) return;
    root.innerHTML = '';
    payload.subcategory_pills.forEach((pill) => {
      const link = document.createElement('a');
      link.href = pill.url;
      link.textContent = pill.name;
      if (pill.active) link.setAttribute('aria-current', 'page');
      root.appendChild(link);
    });
  }

  function syncSelectOptions(select, items, valueKey, labelKey) {
    if (!select) return;
    const currentValue = select.value;
    const placeholder = select.getAttribute('data-placeholder') || '';
    select.innerHTML = '';
    const blank = document.createElement('option');
    blank.value = '';
    blank.textContent = placeholder;
    select.appendChild(blank);
    items.forEach((item) => {
      const option = document.createElement('option');
      option.value = item[valueKey];
      option.textContent = item[labelKey] + ('count' in item ? ' (' + item.count + ')' : '');
      select.appendChild(option);
    });
    if (currentValue) select.value = currentValue;
  }

  function populateFacetControls(payload) {
    syncSelectOptions(document.querySelector(selectors.styleSelect), payload.available_facets.styles, 'slug', 'name');
    syncSelectOptions(document.querySelector(selectors.typeSelect), payload.available_facets.types, 'value', 'value');
  }

  function updateUrl(state) {
    window.history.replaceState({}, '', buildPublicUrl(state).toString());
  }

  function nowMs() {
    return typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
  }

  function roundTiming(value) {
    return Math.round(Number(value || 0) * 10) / 10;
  }

  function parseServerTimingHeader(value) {
    const timing = {};
    String(value || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .forEach((entry) => {
        const [name, ...params] = entry.split(';').map((part) => part.trim());
        if (!name) return;
        const durationParam = params.find((part) => part.startsWith('dur='));
        const durationValue = durationParam ? Number(durationParam.slice(4)) : NaN;
        if (Number.isFinite(durationValue)) {
          timing[name] = roundTiming(durationValue);
        }
      });
    return timing;
  }

  async function load(state) {
    const nextState = state || parseRouteState();
    if (mode !== 'shadow') syncQueryText(nextState);
    const startedAt = nowMs();
    trackExperimentExposure(nextState);

    try {
      const fetchStartedAt = nowMs();
      const response = await fetch(buildSearchUrl(nextState).toString(), { credentials: 'omit' });
      const fetchCompletedAt = nowMs();
      if (!response.ok) {
        trackEvent('Template Search Request Failed', {
          query: nextState.q,
          page: nextState.page,
          sort: nextState.sort,
          status: response.status
        });
        return;
      }

      const workerTiming = parseServerTimingHeader(response.headers.get('server-timing'));
      const parseStartedAt = nowMs();
      const payload = await response.json();
      const parseCompletedAt = nowMs();
      payload.query = nextState.q || '';
      const renderStartedAt = nowMs();
      const visibleDomResultCount = renderResults(payload);
      renderPills(payload);
      populateFacetControls(payload);
      renderPagination(payload, nextState);
      renderPageChrome(nextState, payload);
      const renderCompletedAt = nowMs();

      trackEvent('Template Search Performed', {
        query: nextState.q,
        page: nextState.page,
        sort: nextState.sort,
        scope: nextState.scope,
        api_result_count: payload.items.length,
        api_total_items: payload.pagination ? payload.pagination.total_items : payload.items.length,
        visible_dom_result_count: visibleDomResultCount,
        zero_results: payload.items.length === 0,
        duration_ms: roundTiming(nowMs() - startedAt),
        fetch_ms: roundTiming(fetchCompletedAt - fetchStartedAt),
        json_parse_ms: roundTiming(parseCompletedAt - parseStartedAt),
        render_ms: roundTiming(renderCompletedAt - renderStartedAt),
        worker_total_ms: workerTiming.total || null,
        worker_count_ms: workerTiming.count || null,
        worker_db_ms: workerTiming.db || null,
        worker_rerank_ms: workerTiming.rerank || null,
        worker_asset_refresh_ms: workerTiming.assets || null,
        worker_creator_refresh_ms: workerTiming.creators || null,
        worker_build_ms: workerTiming.build || null,
        category_group_slug: nextState.category_group_slug || '',
        child_category_slug: nextState.child_category_slug || ''
      });

      if (mode !== 'shadow' && visibleDomResultCount !== payload.items.length) {
        trackEvent('Template Search DOM Mismatch', {
          query: nextState.q,
          page: nextState.page,
          api_result_count: payload.items.length,
          visible_dom_result_count: visibleDomResultCount
        });
      }
    } catch (error) {
      console.error('[webflow-template-search/load]', error);
      trackEvent('Template Search Request Failed', {
        query: nextState.q,
        page: nextState.page,
        sort: nextState.sort,
        error_message: String(error)
      });
    }
  }

  function wireControls(state) {
    const searchInput = detachNodeListeners(document.querySelector(selectors.searchInput));
    const sortSelect = detachNodeListeners(document.querySelector(selectors.sortSelect));
    const styleSelect = detachNodeListeners(document.querySelector(selectors.styleSelect));
    const typeSelect = detachNodeListeners(document.querySelector(selectors.typeSelect));
    const freeToggle = detachNodeListeners(document.querySelector(selectors.freeToggle));
    let debounceId = null;

    function submitSearch(value) {
      window.clearTimeout(debounceId);
      const nextQuery = String(value || '').trim();
      if (
        requestedMode === 'active' &&
        activeQueryValues.length > 0 &&
        !activeQueryValues.includes(normalizeSearchQuery(nextQuery))
      ) {
        state.q = nextQuery;
        state.page = 1;
        window.location.assign(buildPublicUrl(state).toString());
        return;
      }
      state.q = nextQuery;
      state.page = 1;
      updateUrl(state);
      load(state);
    }

    if (searchInput) {
      searchInput.value = state.q || '';
      searchInput.addEventListener('input', (event) => {
        const value = event.target.value;
        window.clearTimeout(debounceId);
        debounceId = window.setTimeout(() => {
          submitSearch(value);
        }, 200);
      });
      searchInput.addEventListener('keydown', (event) => {
        if (event.isComposing || event.key !== 'Enter') return;
        event.preventDefault();
        submitSearch(event.target.value);
      });
    }

    if (sortSelect) {
      sortSelect.value = state.sort;
      sortSelect.addEventListener('change', (event) => {
        state.sort = normalizeSort(event.target.value || 'popular');
        state.page = 1;
        updateUrl(state);
        load(state);
      });
    }

    if (styleSelect) {
      styleSelect.addEventListener('change', (event) => {
        state.styles = event.target.value ? [event.target.value] : [];
        state.page = 1;
        updateUrl(state);
        load(state);
      });
    }

    if (typeSelect) {
      typeSelect.addEventListener('change', (event) => {
        state.types = event.target.value ? [event.target.value] : [];
        state.page = 1;
        updateUrl(state);
        load(state);
      });
    }

    if (freeToggle) {
      freeToggle.checked = state.free_only;
      freeToggle.addEventListener('change', (event) => {
        state.free_only = Boolean(event.target.checked);
        state.page = 1;
        updateUrl(state);
        load(state);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const state = parseRouteState();
      wireControls(state);
      load(state);
    });
  } else {
    const state = parseRouteState();
    wireControls(state);
    load(state);
  }
})();`;
}
