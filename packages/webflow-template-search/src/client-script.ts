import { WEBFLOW_TEMPLATE_IMAGE_HOSTS } from './webflow.js';

export function getClientScript(defaultMode = 'shadow'): string {
  const safeImageHosts = JSON.stringify(WEBFLOW_TEMPLATE_IMAGE_HOSTS);
  return String.raw`(() => {
  const config = window.__WEBFLOW_TEMPLATE_SEARCH__ || {};
  const mode = config.mode || ${JSON.stringify(defaultMode)};
  const apiBaseUrl = (config.apiBaseUrl || '').replace(/\/$/, '') || new URL(document.currentScript.src).origin;
  const SAFE_IMAGE_HOSTS = new Set(${safeImageHosts});
  const EMPTY_IMAGE_SRC = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
  const listingImageCache = new Map();
  const selectors = Object.assign(
    {
      results:
        '[data-template-search-results], [fs-cmsfilter-element="list"][fs-cmsload-element="list"], .mp-collection-list [role="list"].w-dyn-items, .tm-templates_grid',
      resultItems: '[data-template-search-result-item], .tm-templates_grid_item',
      cardTemplate: '[data-template-search-card-template]',
      pagination: '[data-template-search-pagination]',
      subcategoryPills: '[data-template-search-subcategory-pills], #subcategory-list',
      searchInput: '[data-template-search-input], input[type="search"]',
      sortSelect: '[data-template-search-sort], select[name="sort"]',
      styleSelect: '[data-template-search-style], select[name="styles"]',
      typeSelect: '[data-template-search-type], select[name="types"]',
      freeToggle: '[data-template-search-free], input[name="free_only"], input[fs-cmsfilter-field="free"]',
      emptyState: '[data-template-search-empty], .search-empty-wrap'
    },
    config.selectors || {}
  );

  function toAbsoluteUrl(value, baseUrl) {
    if (!value) return null;
    try {
      return new URL(value, baseUrl || window.location.href).toString();
    } catch {
      return null;
    }
  }

  function isSafeImageHost(hostname) {
    const host = String(hostname || '').toLowerCase();
    if (!host) return false;
    return (
      host === window.location.hostname.toLowerCase() ||
      host === 'webflow.com' ||
      host.endsWith('.webflow.com') ||
      SAFE_IMAGE_HOSTS.has(host)
    );
  }

  function getSafeImageUrl(value, baseUrl) {
    const absoluteUrl = toAbsoluteUrl(value, baseUrl);
    if (!absoluteUrl) return null;
    try {
      const url = new URL(absoluteUrl);
      return url.protocol === 'data:' || isSafeImageHost(url.hostname) ? absoluteUrl : null;
    } catch {
      return null;
    }
  }

  function setImageSource(image, src, alt) {
    if (!image) return;
    image.removeAttribute('srcset');
    image.alt = alt || '';
    image.src = src || EMPTY_IMAGE_SRC;
  }

  function setOptionalImageSource(image, src, alt) {
    if (!image) return;
    image.removeAttribute('srcset');
    image.alt = alt || '';
    if (src) {
      image.src = src;
      return;
    }
    image.removeAttribute('src');
  }

  function canFetchListingImage(url) {
    const absoluteUrl = toAbsoluteUrl(url);
    if (!absoluteUrl) return false;
    try {
      return new URL(absoluteUrl).origin === window.location.origin;
    } catch {
      return false;
    }
  }

  function extractListingImageUrl(html, baseUrl) {
    const documentFragment = new DOMParser().parseFromString(html, 'text/html');
    const footerImage = documentFragment.querySelector('img.footer-image[src], img[class*="footer-image"][src]');
    if (footerImage) {
      const footerImageUrl = getSafeImageUrl(footerImage.getAttribute('src'), baseUrl);
      if (footerImageUrl) return footerImageUrl;
    }

    const metaSelectors = [
      'meta[property="og:image:secure_url"]',
      'meta[property="og:image"]',
      'meta[name="twitter:image"]'
    ];
    for (const selector of metaSelectors) {
      const node = documentFragment.querySelector(selector);
      const safeImageUrl = getSafeImageUrl(node && node.getAttribute('content'), baseUrl);
      if (safeImageUrl) return safeImageUrl;
    }

    return null;
  }

  function getListingImageUrl(listingUrl) {
    const absoluteUrl = toAbsoluteUrl(listingUrl);
    if (!absoluteUrl || !canFetchListingImage(absoluteUrl)) return Promise.resolve(null);
    if (listingImageCache.has(absoluteUrl)) return listingImageCache.get(absoluteUrl);

    const pending = fetch(absoluteUrl, { credentials: 'same-origin' })
      .then((response) => (response.ok ? response.text() : null))
      .then((html) => (html ? extractListingImageUrl(html, absoluteUrl) : null))
      .catch(() => null);

    listingImageCache.set(absoluteUrl, pending);
    return pending;
  }

  function normalizeSort(value) {
    if (value === 'approval-date-desc') return 'newest';
    if (value === 'price-asc') return 'price_asc';
    if (value === 'price-desc') return 'price_desc';
    return value || 'popular';
  }

  function parseRouteState() {
    const url = new URL(window.location.href);
    const state = {
      q: url.searchParams.get('q') || url.searchParams.get('query') || url.searchParams.get('search') || '',
      scope: 'all',
      category_group_slug: null,
      child_category_slug: null,
      styles: url.searchParams.getAll('styles').flatMap((value) => value.split(',')).filter(Boolean),
      types: url.searchParams.getAll('types').flatMap((value) => value.split(',')).filter(Boolean),
      free_only: ['1', 'true', 'yes', 'on'].includes((url.searchParams.get('free_only') || '').toLowerCase()),
      sort: normalizeSort(url.searchParams.get('sort') || 'popular'),
      page: Number(url.searchParams.get('page') || 1) || 1,
      page_size: Number(url.searchParams.get('page_size') || 24) || 24
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
    state.styles.forEach((value) => url.searchParams.append('styles', value));
    state.types.forEach((value) => url.searchParams.append('types', value));
    return url;
  }

  function extractCurrentSlugs() {
    return Array.from(document.querySelectorAll(selectors.resultItems))
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

  function findResultsContainer() {
    const explicit = document.querySelector(selectors.results);
    if (explicit) return explicit;
    const firstItem = document.querySelector(selectors.resultItems);
    return firstItem ? firstItem.parentElement : null;
  }

  function cloneCardTemplate() {
    const template = document.querySelector(selectors.cardTemplate);
    if (template && template.content) return template.content.firstElementChild.cloneNode(true);
    const container = findResultsContainer();
    const existing = container ? container.querySelector(selectors.resultItems) : document.querySelector(selectors.resultItems);
    return existing ? existing.cloneNode(true) : null;
  }

  function bindCard(card, item) {
    card.setAttribute('data-template-slug', item.template_slug);
    const link = card.querySelector('[data-template-card-link], .tm-link, .template-name-link, a[href*="/templates/html/"]') || card.querySelector('a');
    if (link) link.href = item.url || '#';
    const image = card.querySelector('[data-template-card-image], .tm-card_image, img');
    const secondaryImage = card.querySelector('[data-template-card-image-secondary], .tm-card_image_secondary');
    if (image) {
      const initialImageUrl = getSafeImageUrl(item.thumbnail_image_url) || getSafeImageUrl(item.thumbnail_image_secondary_url);
      setImageSource(image, initialImageUrl, item.name);
      setOptionalImageSource(secondaryImage, getSafeImageUrl(item.thumbnail_image_secondary_url), item.name);

      if (!initialImageUrl && item.url) {
        getListingImageUrl(item.url).then((resolvedImageUrl) => {
          if (!resolvedImageUrl || !card.isConnected || card.getAttribute('data-template-slug') !== item.template_slug) return;
          setImageSource(image, resolvedImageUrl, item.name);
        });
      }
    }
    const title = card.querySelector('[data-template-card-title], .template-name, .tm-template-title, h3, h4');
    if (title) title.textContent = item.name;
    const creator = card.querySelector('[data-template-card-creator], .template-creator, .tm-template-creator');
    if (creator) creator.textContent = item.creator_name || '';
    const price = card.querySelector('[data-template-card-price], .template-price-wrap .category-text, .tm-template-price');
    if (price) price.textContent = formatPrice(item);
    const creatorIcon = card.querySelector('.tm-templates-creator-icon, [data-template-card-creator-image]');
    if (creatorIcon) {
      creatorIcon.removeAttribute('src');
      creatorIcon.alt = '';
      creatorIcon.style.display = 'none';
    }
    return card;
  }

  function renderResults(payload) {
    const container = findResultsContainer();
    if (!container) return;
    if (mode === 'shadow') {
      compareShadowResults(payload);
      return;
    }
    container.innerHTML = '';
    payload.items.forEach((item) => {
      const card = cloneCardTemplate();
      if (!card) {
        const fallback = document.createElement('a');
        fallback.href = item.url || '#';
        fallback.textContent = item.name;
        container.appendChild(fallback);
        return;
      }
      container.appendChild(bindCard(card, item));
    });
    const emptyState = document.querySelector(selectors.emptyState);
    if (emptyState) emptyState.style.display = payload.items.length === 0 ? 'block' : 'none';
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
    const url = new URL(window.location.href);
    ['q', 'query', 'search', 'styles', 'types', 'free_only', 'sort', 'page'].forEach((key) => url.searchParams.delete(key));
    if (state.q) url.searchParams.set('q', state.q);
    if (state.sort && state.sort !== 'popular') url.searchParams.set('sort', state.sort);
    if (state.free_only) url.searchParams.set('free_only', 'true');
    if (state.page > 1) url.searchParams.set('page', String(state.page));
    state.styles.forEach((value) => url.searchParams.append('styles', value));
    state.types.forEach((value) => url.searchParams.append('types', value));
    window.history.replaceState({}, '', url.toString());
  }

  async function load() {
    const state = parseRouteState();
    const response = await fetch(buildSearchUrl(state).toString(), { credentials: 'omit' });
    if (!response.ok) return;
    const payload = await response.json();
    renderResults(payload);
    renderPills(payload);
    populateFacetControls(payload);
  }

  function wireControls() {
    const state = parseRouteState();
    const searchInput = document.querySelector(selectors.searchInput);
    const sortSelect = document.querySelector(selectors.sortSelect);
    const styleSelect = document.querySelector(selectors.styleSelect);
    const typeSelect = document.querySelector(selectors.typeSelect);
    const freeToggle = document.querySelector(selectors.freeToggle);
    let debounceId = null;

    if (searchInput) {
      searchInput.value = state.q || '';
      searchInput.addEventListener('input', (event) => {
        const value = event.target.value;
        window.clearTimeout(debounceId);
        debounceId = window.setTimeout(() => {
          state.q = value.trim();
          state.page = 1;
          updateUrl(state);
          load();
        }, 200);
      });
    }

    if (sortSelect) {
      sortSelect.value = state.sort;
      sortSelect.addEventListener('change', (event) => {
        state.sort = normalizeSort(event.target.value || 'popular');
        state.page = 1;
        updateUrl(state);
        load();
      });
    }

    if (styleSelect) {
      styleSelect.addEventListener('change', (event) => {
        state.styles = event.target.value ? [event.target.value] : [];
        state.page = 1;
        updateUrl(state);
        load();
      });
    }

    if (typeSelect) {
      typeSelect.addEventListener('change', (event) => {
        state.types = event.target.value ? [event.target.value] : [];
        state.page = 1;
        updateUrl(state);
        load();
      });
    }

    if (freeToggle) {
      freeToggle.checked = state.free_only;
      freeToggle.addEventListener('change', (event) => {
        state.free_only = Boolean(event.target.checked);
        state.page = 1;
        updateUrl(state);
        load();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      wireControls();
      load();
    });
  } else {
    wireControls();
    load();
  }
})();`;
}
