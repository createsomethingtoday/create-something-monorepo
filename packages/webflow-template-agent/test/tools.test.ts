import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildSearchUrl, TemplateToolExecutor, TEMPLATE_FEATURES } from '../src/tools.js';
import type { Env, TemplateSearchItem } from '../src/types.js';

const ENV: Env = {
  ANTHROPIC_API_KEY: 'test-key',
  SEARCH_API_BASE: 'https://search.test',
};

function searchItem(slug: string, overrides: Partial<TemplateSearchItem> = {}): TemplateSearchItem {
  return {
    id: `id-${slug}`,
    template_slug: slug,
    name: slug,
    url: `https://webflow.com/templates/html/${slug}`,
    preview_url: null,
    creator_name: 'Test Studio',
    thumbnail_image_url: null,
    price: 79,
    is_free: false,
    features: ['Ecommerce', 'Forms'],
    has_cms: true,
    has_ecommerce: true,
    has_membership: false,
    has_multiple_layouts: null,
    is_ui_kit: null,
    template_type: null,
    popularity_score: 100,
    cumulative_purchases: 42,
    published_date: '2026-01-01',
    category_groups: [{ name: 'Technology', slug: 'technology', url: '' }],
    ...overrides,
  };
}

function mockSearchResponse(items: TemplateSearchItem[]) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    Response.json({
      items,
      pagination: { total_items: items.length },
      applied_filters: {},
    }),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildSearchUrl', () => {
  it('maps intent filters onto search API params', () => {
    const url = new URL(
      buildSearchUrl('https://search.test', {
        q: 'yoga studio',
        category_group_slug: 'medical',
        styles: ['dark-websites'],
        features: ['Ecommerce', 'Memberships'],
        has_membership: true,
        has_cms: true,
        sort: 'best_selling',
        page_size: 6,
      }),
    );

    expect(url.pathname).toBe('/api/templates/search');
    expect(url.searchParams.get('q')).toBe('yoga studio');
    expect(url.searchParams.get('category_group_slug')).toBe('medical');
    expect(url.searchParams.getAll('features')).toEqual(['Ecommerce', 'Memberships']);
    expect(url.searchParams.get('has_membership')).toBe('true');
    expect(url.searchParams.get('has_cms')).toBe('true');
    expect(url.searchParams.get('has_ecommerce')).toBeNull();
    expect(url.searchParams.get('sort')).toBe('best_selling');
    expect(url.searchParams.get('page_size')).toBe('6');
    expect(url.searchParams.get('view')).toBe('grid');
  });

  it('clamps page_size and omits falsy filters', () => {
    const url = new URL(buildSearchUrl('https://search.test', { page_size: 999, free_only: false, q: null }));
    expect(url.searchParams.get('page_size')).toBe('24');
    expect(url.searchParams.get('free_only')).toBeNull();
    expect(url.searchParams.get('q')).toBeNull();
  });
});

describe('TemplateToolExecutor display validation', () => {
  it('only renders slugs previously returned by search (anti-hallucination)', async () => {
    mockSearchResponse([searchItem('real-template')]);
    const executor = new TemplateToolExecutor(ENV);
    await executor.searchTemplates({ q: 'test' });

    const { payload, dropped } = executor.buildDisplayPayload({
      layout: 'shortlist',
      title: 'Picks',
      items: [
        { template_slug: 'real-template', reason: 'Fits the brief' },
        { template_slug: 'hallucinated-template', reason: 'Sounds nice' },
      ],
      followups: ['Show cheaper options'],
    });

    expect(dropped).toEqual(['hallucinated-template']);
    expect(payload?.items.map((entry) => entry.template_slug)).toEqual(['real-template']);
    expect(payload?.items[0]?.item.creator_name).toBe('Test Studio');
    expect(payload?.items[0]?.reason).toBe('Fits the brief');
  });

  it('returns null when nothing valid remains', () => {
    const executor = new TemplateToolExecutor(ENV);
    const { payload, dropped } = executor.buildDisplayPayload({
      layout: 'gallery',
      title: null,
      items: [{ template_slug: 'unknown', reason: null }],
      followups: null,
    });
    expect(payload).toBeNull();
    expect(dropped).toEqual(['unknown']);
  });

  it('caps followups at 4 and falls back to gallery for unknown layouts', async () => {
    mockSearchResponse([searchItem('a')]);
    const executor = new TemplateToolExecutor(ENV);
    await executor.searchTemplates({});

    const { payload } = executor.buildDisplayPayload({
      layout: 'hologram' as never,
      title: null,
      items: [{ template_slug: 'a', reason: null }],
      followups: ['1', '2', '3', '4', '5'],
    });

    expect(payload?.layout).toBe('gallery');
    expect(payload?.followups).toHaveLength(4);
  });
});

describe('feature vocabulary', () => {
  it('matches the CMS closed vocabulary shape', () => {
    expect(TEMPLATE_FEATURES).toContain('Ecommerce');
    expect(TEMPLATE_FEATURES).toContain('Memberships');
    expect(TEMPLATE_FEATURES.length).toBeGreaterThanOrEqual(19);
  });
});
