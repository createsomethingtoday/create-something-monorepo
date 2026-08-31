import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import {
  buildAgentSearchUrl,
  createAgentToolsWindowHandle,
  createMarketplaceAgentTools,
  demandTier,
  registerMarketplaceAgentTools,
  resolveAgentToolsApiBase,
  summarizeSearchItem,
  toWebMcpTool,
  DEFAULT_TEMPLATE_API_BASE,
  type MarketplaceAgentTool,
} from '../src/components/marketplace/agentTools';

type GlobalWithDom = typeof globalThis & { window?: Window; document?: Document };

function removeDom(): void {
  const g = globalThis as GlobalWithDom;
  delete g.window;
  delete g.document;
}

function installWindow(overrides: Record<string, unknown>): void {
  (globalThis as GlobalWithDom).window = overrides as unknown as Window;
}

beforeEach(() => {
  removeDom();
});

function stubFetch(
  body: unknown,
  calls: string[] = [],
  status = 200,
): typeof fetch {
  return (async (input: unknown) => {
    calls.push(String(input));
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    };
  }) as unknown as typeof fetch;
}

// ── API base resolution ──────────────────────────────────────────────────────

test('resolveAgentToolsApiBase falls back to the production proxy', () => {
  assert.equal(resolveAgentToolsApiBase(''), DEFAULT_TEMPLATE_API_BASE);
  assert.equal(resolveAgentToolsApiBase(undefined), DEFAULT_TEMPLATE_API_BASE);
  assert.equal(
    resolveAgentToolsApiBase('https://webflow-template-search.createsomething.workers.dev'),
    DEFAULT_TEMPLATE_API_BASE,
  );
  assert.equal(
    resolveAgentToolsApiBase('https://webflow-template-marketplace.webflow.io/api'),
    DEFAULT_TEMPLATE_API_BASE,
  );
  assert.equal(
    resolveAgentToolsApiBase('https://templates.webflow.com/templates-api/'),
    'https://templates.webflow.com/templates-api',
  );
});

// ── Search URL mapping ───────────────────────────────────────────────────────

test('buildAgentSearchUrl maps every supported parameter', () => {
  const url = new URL(
    buildAgentSearchUrl(DEFAULT_TEMPLATE_API_BASE, {
      q: ' portfolio ',
      scope: 'free',
      category_group_slug: 'business',
      child_category_slug: 'consulting',
      styles: ['minimal', 'dark'],
      tags: ['saas'],
      types: ['One Page'],
      free_only: true,
      sort: 'best-selling',
      page: 2,
      page_size: 12,
    }),
  );
  assert.equal(url.origin + url.pathname, `${DEFAULT_TEMPLATE_API_BASE}/api/templates/search`);
  assert.equal(url.searchParams.get('q'), 'portfolio');
  assert.equal(url.searchParams.get('scope'), 'free');
  assert.equal(url.searchParams.get('category_group_slug'), 'business');
  assert.equal(url.searchParams.get('child_category_slug'), 'consulting');
  assert.deepEqual(url.searchParams.getAll('styles'), ['minimal', 'dark']);
  assert.deepEqual(url.searchParams.getAll('tags'), ['saas']);
  assert.deepEqual(url.searchParams.getAll('types'), ['One Page']);
  assert.equal(url.searchParams.get('free_only'), 'true');
  assert.equal(url.searchParams.get('sort'), 'best_selling');
  assert.equal(url.searchParams.get('page'), '2');
  assert.equal(url.searchParams.get('page_size'), '12');
  assert.equal(url.searchParams.get('include'), 'items');
  assert.equal(url.searchParams.get('view'), 'full');
});

test('buildAgentSearchUrl clamps pagination and defaults sparse input', () => {
  const url = new URL(
    buildAgentSearchUrl(DEFAULT_TEMPLATE_API_BASE, { page: 9999, page_size: 100 }),
  );
  assert.equal(url.searchParams.get('page'), '500');
  assert.equal(url.searchParams.get('page_size'), '24');
  const sparse = new URL(buildAgentSearchUrl(DEFAULT_TEMPLATE_API_BASE, {}));
  assert.equal(sparse.searchParams.get('page'), '1');
  assert.equal(sparse.searchParams.get('page_size'), '12');
  assert.equal(sparse.searchParams.get('q'), null);
});

// ── Deployed-contract discipline ─────────────────────────────────────────────

test('search_templates schema advertises only parameters the deployed worker supports', () => {
  const tools = createMarketplaceAgentTools({ fetchImpl: stubFetch({}) });
  const search = tools.find((tool) => tool.name === 'search_templates');
  assert.ok(search);
  const schema = search.inputSchema as {
    additionalProperties: boolean;
    properties: Record<string, unknown>;
  };
  assert.equal(schema.additionalProperties, false);
  // Capability filters are silent no-ops on the deployed worker (verified
  // 2026-08-31); the schema must not advertise them until the worker gains them.
  for (const forbidden of ['features', 'has_ecommerce', 'has_membership', 'has_cms']) {
    assert.equal(forbidden in schema.properties, false, `schema must not advertise ${forbidden}`);
  }
});

// ── Output shaping ───────────────────────────────────────────────────────────

test('demandTier mirrors the chat agent thresholds', () => {
  assert.equal(demandTier(null), null);
  assert.equal(demandTier(undefined), null);
  assert.equal(demandTier(0), 'new');
  assert.equal(demandTier(1), 'emerging');
  assert.equal(demandTier(25), 'steady demand');
  assert.equal(demandTier(100), 'strong demand');
  assert.equal(demandTier(500), 'top seller');
});

test('summarizeSearchItem shapes output and withholds raw sales counts', () => {
  const summary = summarizeSearchItem({
    template_slug: 'zenith',
    name: 'Zenith',
    creator_name: 'Studio A',
    price: 79,
    is_free: false,
    template_type: 'Multi Page',
    cumulative_purchases: 640,
    category_groups: [{ name: 'Business', slug: 'business' }],
    child_categories: [{ name: 'Consulting', slug: 'consulting' }],
    styles: ['Minimal', { name: 'Dark', slug: 'dark' }],
    tags: [{ slug: 'saas' }],
    url: 'https://webflow.com/templates/html/zenith-website-template',
    preview_url: 'https://zenith-template.webflow.io',
  });
  assert.equal(summary.price, '$79');
  assert.equal(summary.demand, 'top seller');
  assert.deepEqual(summary.categories, ['Business']);
  assert.deepEqual(summary.styles, ['Minimal', 'Dark']);
  assert.deepEqual(summary.tags, ['saas']);
  assert.equal('cumulative_purchases' in summary, false);
  const free = summarizeSearchItem({ is_free: true });
  assert.equal(free.price, 'Free');
});

// ── Tool execution ───────────────────────────────────────────────────────────

const SEARCH_BODY = {
  items: [
    { template_slug: 'zenith', name: 'Zenith', creator_name: 'Studio A', price: 79 },
    { template_slug: 'apex-studio', name: 'Apex Studio', creator_name: 'Studio B', is_free: true },
  ],
  pagination: { page: 1, page_size: 12, total_items: 2, has_next_page: false },
  applied_filters: { relaxed: true },
};

async function runTool(tools: MarketplaceAgentTool[], name: string, input = {}) {
  const tool = tools.find((entry) => entry.name === name);
  assert.ok(tool, `missing tool ${name}`);
  return tool.execute(input);
}

test('search_templates summarizes results and surfaces the relaxed flag', async () => {
  const tools = createMarketplaceAgentTools({ fetchImpl: stubFetch(SEARCH_BODY) });
  const result = (await runTool(tools, 'search_templates', { q: 'zenith' })) as Record<
    string,
    unknown
  >;
  assert.equal(result.total_items, 2);
  assert.equal(result.relaxed, true);
  assert.ok(String(result.note).includes('related results'));
  assert.equal((result.items as unknown[]).length, 2);
});

test('search responses are cached per URL for repeat calls', async () => {
  const calls: string[] = [];
  const tools = createMarketplaceAgentTools({ fetchImpl: stubFetch(SEARCH_BODY, calls) });
  await runTool(tools, 'search_templates', { q: 'zenith' });
  await runTool(tools, 'search_templates', { q: 'zenith' });
  assert.equal(calls.length, 1);
  await runTool(tools, 'search_templates', { q: 'apex' });
  assert.equal(calls.length, 2);
});

test('get_template matches exact slug and suggests on miss', async () => {
  const tools = createMarketplaceAgentTools({ fetchImpl: stubFetch(SEARCH_BODY) });
  const hit = (await runTool(tools, 'get_template', { template_slug: 'Apex-Studio' })) as {
    ok: boolean;
    template: Record<string, unknown>;
  };
  assert.equal(hit.ok, true);
  assert.equal(hit.template.name, 'Apex Studio');
  const miss = (await runTool(tools, 'get_template', { template_slug: 'nope' })) as {
    ok: boolean;
    suggestions: unknown[];
  };
  assert.equal(miss.ok, false);
  assert.equal(miss.suggestions.length, 2);
});

test('list_categories_and_styles maps pills and facets', async () => {
  const body = {
    category_pills: [{ name: 'Business', slug: 'business', count: 900, active: false }],
    subcategory_pills: [{ name: 'Consulting', slug: 'consulting', count: 120 }],
    available_facets: {
      styles: [{ name: 'Minimal', slug: 'minimal', count: 400 }],
      types: [{ value: 'One Page', count: 800 }],
    },
  };
  const tools = createMarketplaceAgentTools({ fetchImpl: stubFetch(body) });
  const result = (await runTool(tools, 'list_categories_and_styles')) as Record<string, unknown>;
  assert.deepEqual(result.categories, [{ name: 'Business', slug: 'business', count: 900 }]);
  assert.deepEqual(result.subcategories, [{ name: 'Consulting', slug: 'consulting', count: 120 }]);
  assert.equal((result.styles as unknown[]).length, 1);
  assert.deepEqual(result.scopes, ['all', 'featured', 'free', 'landing_pages']);
});

test('update_page_filters degrades gracefully without a page context', async () => {
  const tools = createMarketplaceAgentTools({ fetchImpl: stubFetch({}) });
  const result = (await runTool(tools, 'update_page_filters', { q: 'portfolio' })) as {
    ok: boolean;
    message: string;
  };
  assert.equal(result.ok, false);
  assert.match(result.message, /Page context unavailable/);
});

test('enablePageActions=false omits the write tool', () => {
  const tools = createMarketplaceAgentTools({ fetchImpl: stubFetch({}), enablePageActions: false });
  assert.equal(tools.some((tool) => tool.name === 'update_page_filters'), false);
  assert.equal(tools.length, 4);
  for (const tool of tools) assert.equal(tool.annotations.readOnlyHint, true);
});

test('onToolCall reports success and converts thrown errors into results', async () => {
  const events: Array<{ tool: string; ok: boolean }> = [];
  const failingFetch = (async () => {
    throw new Error('network down');
  }) as unknown as typeof fetch;
  const tools = createMarketplaceAgentTools({
    fetchImpl: failingFetch,
    onToolCall: ({ tool, ok }) => events.push({ tool, ok }),
  });
  const result = (await runTool(tools, 'search_templates', { q: 'x' })) as {
    ok: boolean;
    error: string;
  };
  assert.equal(result.ok, false);
  assert.match(result.error, /network down/);
  assert.deepEqual(events, [{ tool: 'search_templates', ok: false }]);
});

// ── WebMCP registration ──────────────────────────────────────────────────────

test('registerMarketplaceAgentTools prefers registerTool', () => {
  const registered: unknown[] = [];
  installWindow({
    navigator: { modelContext: { registerTool: (tool: unknown) => registered.push(tool) } },
  });
  const tools = createMarketplaceAgentTools({ fetchImpl: stubFetch({}) });
  const result = registerMarketplaceAgentTools(tools);
  assert.equal(result.api, 'registerTool');
  assert.equal(result.registered, 5);
  assert.equal(registered.length, 5);
  const names = registered.map((tool) => (tool as { name: string }).name);
  assert.deepEqual(names, [
    'search_templates',
    'list_categories_and_styles',
    'get_template',
    'update_page_filters',
    'get_page_state',
  ]);
});

test('registerMarketplaceAgentTools falls back to provideContext, then none', () => {
  let provided: { tools: unknown[] } | null = null;
  installWindow({
    navigator: {
      modelContext: {
        provideContext: (context: { tools: unknown[] }) => {
          provided = context;
        },
      },
    },
  });
  const tools = createMarketplaceAgentTools({ fetchImpl: stubFetch({}) });
  assert.equal(registerMarketplaceAgentTools(tools).api, 'provideContext');
  assert.equal(provided!.tools.length, 5);

  installWindow({ navigator: {} });
  assert.deepEqual(registerMarketplaceAgentTools(tools), { api: 'none', registered: 0 });
  removeDom();
  assert.deepEqual(registerMarketplaceAgentTools(tools), { api: 'none', registered: 0 });
});

test('toWebMcpTool wraps plain results in a content array and passes annotations through', async () => {
  const wrapped = toWebMcpTool({
    name: 'demo',
    description: 'demo',
    inputSchema: { type: 'object' },
    annotations: { readOnlyHint: true },
    execute: async () => ({ hello: 'world' }),
  }) as {
    annotations: { readOnlyHint: boolean };
    execute: (input: Record<string, unknown>) => Promise<{ content: Array<{ text: string }> }>;
  };
  assert.equal(wrapped.annotations.readOnlyHint, true);
  const result = await wrapped.execute({});
  assert.match(result.content[0].text, /"hello": "world"/);

  const passthrough = toWebMcpTool({
    name: 'demo2',
    description: 'demo2',
    inputSchema: { type: 'object' },
    annotations: { readOnlyHint: true },
    execute: async () => ({ content: [{ type: 'text', text: 'already shaped' }] }),
  }) as { execute: (input: Record<string, unknown>) => Promise<{ content: Array<{ text: string }> }> };
  const shaped = await passthrough.execute({});
  assert.equal(shaped.content[0].text, 'already shaped');
});

test('window handle lists and routes tool calls', async () => {
  const tools = createMarketplaceAgentTools({ fetchImpl: stubFetch(SEARCH_BODY) });
  const handle = createAgentToolsWindowHandle(tools);
  assert.equal(handle.listTools().length, 5);
  assert.equal(handle.listTools()[0].readOnly, true);
  const result = (await handle.callTool('search_templates', { q: 'zenith' })) as {
    total_items: number;
  };
  assert.equal(result.total_items, 2);
  await assert.rejects(() => handle.callTool('unknown_tool'), /Unknown marketplace agent tool/);
});

// ── Codex review regressions (PR #1556) ──────────────────────────────────────

test('get_page_state ignores a stale filters snapshot after history navigation', async () => {
  const stubDoc = { querySelectorAll: () => [] } as unknown as Document;
  const tools = createMarketplaceAgentTools({ fetchImpl: stubFetch({}) });

  (globalThis as GlobalWithDom).document = stubDoc;
  installWindow({
    location: { href: 'https://webflow.com/templates?q=new' },
    __templateMarketplaceFilters: { q: 'old', href: 'https://webflow.com/templates?q=old' },
  });
  const stale = (await runTool(tools, 'get_page_state')) as { filters: { q: string } };
  assert.equal(stale.filters.q, 'new');

  (globalThis as GlobalWithDom).document = stubDoc;
  installWindow({
    location: { href: 'https://webflow.com/templates?q=current' },
    __templateMarketplaceFilters: {
      q: 'snapshot-q',
      href: 'https://webflow.com/templates?q=current',
    },
  });
  const fresh = (await runTool(tools, 'get_page_state')) as { filters: { q: string } };
  assert.equal(fresh.filters.q, 'snapshot-q');
});

test('onToolCall counts semantic failures ({ok:false}) as failures', async () => {
  const events: Array<{ tool: string; ok: boolean }> = [];
  const tools = createMarketplaceAgentTools({
    fetchImpl: stubFetch(SEARCH_BODY),
    onToolCall: ({ tool, ok }) => events.push({ tool, ok }),
  });
  await runTool(tools, 'get_template', { template_slug: 'nope' });
  await runTool(tools, 'get_template', { template_slug: 'zenith' });
  assert.deepEqual(events, [
    { tool: 'get_template', ok: false },
    { tool: 'get_template', ok: true },
  ]);
});
