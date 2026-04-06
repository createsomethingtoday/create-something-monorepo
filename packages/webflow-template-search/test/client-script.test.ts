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
});
