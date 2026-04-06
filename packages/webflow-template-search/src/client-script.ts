export function getClientScript(defaultMode = 'shadow'): string {
  return String.raw`(() => {
  const config = window.__WEBFLOW_TEMPLATE_SEARCH__ || {};
  const mode = config.mode || ${JSON.stringify(defaultMode)};
  const apiBaseUrl = (config.apiBaseUrl || '').replace(/\/$/, '') || new URL(document.currentScript.src).origin;
  const defaultQueryParamKey = config.queryParamKey || 'query';
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

  function parseRouteState() {
    const url = new URL(window.location.href);
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
    if (nextState.page_size && nextState.page_size !== 24) url.searchParams.set('page_size', String(nextState.page_size));
    nextState.styles.forEach((value) => url.searchParams.append('styles', value));
    nextState.types.forEach((value) => url.searchParams.append('types', value));
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
    const cardTemplate = cloneCardTemplate();
    container.innerHTML = '';
    payload.items.forEach((item) => {
      const card = cardTemplate ? cardTemplate.cloneNode(true) : null;
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

  async function load(state) {
    const nextState = state || parseRouteState();
    const response = await fetch(buildSearchUrl(nextState).toString(), { credentials: 'omit' });
    if (!response.ok) return;
    const payload = await response.json();
    renderResults(payload);
    renderPills(payload);
    populateFacetControls(payload);
    renderPagination(payload, nextState);
  }

  function wireControls(state) {
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
          load(state);
        }, 200);
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
