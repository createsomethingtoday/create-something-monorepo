import { TEMPLATE_SORT_ALIASES } from './utils.js';

export function getClientScript(defaultMode = 'shadow'): string {
  return String.raw`(() => {
  const config = window.__WEBFLOW_TEMPLATE_SEARCH__ || {};
  const mode = config.mode || ${JSON.stringify(defaultMode)};
  const sortAliases = ${JSON.stringify(TEMPLATE_SORT_ALIASES)};
  const apiBaseUrl = (config.apiBaseUrl || '').replace(/\/$/, '') || new URL(document.currentScript.src).origin;
  const selectors = Object.assign(
    {
      results: '[data-template-search-results], .tm-templates_grid',
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

  function normalizeSort(value) {
    return sortAliases[value] || value || 'popular';
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
    if (typeof item.price === 'number' && item.price > 0) return '$' + item.price + ' USD';
    if (item.price === 0 || item.is_free) return 'Free';
    return '';
  }

  function cloneCardTemplate() {
    const template = document.querySelector(selectors.cardTemplate);
    if (template && template.content) return template.content.firstElementChild.cloneNode(true);
    const existing = document.querySelector(selectors.resultItems);
    return existing ? existing.cloneNode(true) : null;
  }

  function bindCard(card, item) {
    card.setAttribute('data-template-slug', item.template_slug);
    const link = card.querySelector('[data-template-card-link]') || card.querySelector('a');
    if (link) link.href = item.url || '#';
    const image = card.querySelector('[data-template-card-image]') || card.querySelector('img');
    if (image && item.thumbnail_image_url) {
      image.src = item.thumbnail_image_url;
      image.alt = item.name;
    }
    const title = card.querySelector('[data-template-card-title], .tm-template-title, h3, h4');
    if (title) title.textContent = item.name;
    const creator = card.querySelector('[data-template-card-creator], .tm-template-creator');
    if (creator) creator.textContent = item.creator_name || '';
    const price = card.querySelector('[data-template-card-price], .tm-template-price');
    if (price) price.textContent = formatPrice(item);
    return card;
  }

  function renderResults(payload) {
    const container = document.querySelector(selectors.results);
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
