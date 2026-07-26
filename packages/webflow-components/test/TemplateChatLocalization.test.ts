import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_TEMPLATE_CHAT_STRINGS,
  formatTemplatePrice,
  resolveTemplateChatStrings,
} from '../src/components/chat/templateChatStrings';
import {
  buildFilterChangeDetail,
  buildPageActionUrl,
  pageActionChangesFilters,
} from '../src/components/chat/templateChatPageAction';
import {
  createAgentProgressState,
  getAgentOutcomeReceipt,
  getAgentProgressView,
  reduceAgentProgress,
  summarizePageAction,
} from '../src/components/chat/templateChatProgress';

// ── copy ─────────────────────────────────────────────────────────────────────

test('overrides replace copy without losing the untouched defaults', () => {
  const strings = resolveTemplateChatStrings({
    tryAgain: 'Nochmal versuchen',
    progressPhases: { searching: { title: 'Katalog durchsuchen', detail: 'Suche läuft.' } },
  });

  assert.equal(strings.tryAgain, 'Nochmal versuchen');
  assert.equal(strings.progressPhases.searching.title, 'Katalog durchsuchen');
  assert.equal(
    strings.progressPhases.curating.title,
    DEFAULT_TEMPLATE_CHAT_STRINGS.progressPhases.curating.title,
    'phases not overridden keep their default',
  );
  assert.equal(strings.backToChat, DEFAULT_TEMPLATE_CHAT_STRINGS.backToChat);
});

test('no override returns the defaults without copying them', () => {
  assert.equal(resolveTemplateChatStrings(), DEFAULT_TEMPLATE_CHAT_STRINGS);
});

test('progress narration and receipts follow the supplied copy', () => {
  const strings = resolveTemplateChatStrings({
    receiptStopped: 'Suche angehalten',
    receiptRecommendations: (count) => `${count} Vorschläge`,
    progressSlowDetail: 'Dauert länger.',
  });

  let state = reduceAgentProgress(createAgentProgressState(), { type: 'slow' });
  assert.equal(getAgentProgressView(state, strings).detail, 'Dauert länger.');

  assert.equal(
    getAgentOutcomeReceipt(reduceAgentProgress(state, { type: 'stop' }), strings),
    'Suche angehalten',
  );

  state = reduceAgentProgress(createAgentProgressState(), { type: 'display', resultCount: 3 });
  assert.equal(getAgentOutcomeReceipt(reduceAgentProgress(state, { type: 'done' }), strings), '3 Vorschläge');
});

test('page-action receipts are localizable', () => {
  const strings = resolveTemplateChatStrings({
    receiptFreeOnly: 'Nur kostenlos',
    receiptPageUpdate: (details) => `Seite aktualisiert · ${details}`,
  });

  assert.equal(
    summarizePageAction({ free_only: true }, strings),
    'Seite aktualisiert · Nur kostenlos',
  );
});

// ── price formatting ─────────────────────────────────────────────────────────

test('prices are formatted for the locale rather than hardcoded to dollars', () => {
  assert.equal(formatTemplatePrice(49, 'en-US'), '$49');
  assert.match(formatTemplatePrice(49, 'de-DE', 'EUR'), /49\s*€/);
  assert.match(formatTemplatePrice(1299, 'en-US'), /\$1,299/, 'grouping is applied');
});

test('fractional prices keep their cents and whole prices do not gain .00', () => {
  assert.equal(formatTemplatePrice(49, 'en-US'), '$49');
  assert.equal(formatTemplatePrice(49.5, 'en-US'), '$49.50');
});

test('an unusable locale falls back instead of throwing during render', () => {
  assert.equal(formatTemplatePrice(49, 'not a locale'), '49 USD');
  assert.equal(formatTemplatePrice(49, 'en-US', 'not a currency'), '49 not a currency');
});

// ── page action URL mapping ──────────────────────────────────────────────────

const LISTING = 'https://webflow.com/templates?category=portfolio-websites&page=3';

test('a search action replaces the legacy query aliases', () => {
  const href = buildPageActionUrl('https://webflow.com/templates?query=old&search=older', { q: 'bakery' });
  const params = new URL(href).searchParams;

  assert.equal(params.get('q'), 'bakery');
  assert.equal(params.has('query'), false);
  assert.equal(params.has('search'), false);
});

test('an empty search clears the term rather than searching for nothing', () => {
  const params = new URL(buildPageActionUrl('https://webflow.com/templates?q=old', { q: '' })).searchParams;
  assert.equal(params.has('q'), false);
});

test('a category action clears the narrower category params it supersedes', () => {
  const href = buildPageActionUrl(
    'https://webflow.com/templates?subcategory=photo&child_category_slug=photo',
    { category_group_slug: 'portfolio-websites' },
  );
  const params = new URL(href).searchParams;

  assert.equal(params.get('category'), 'portfolio-websites');
  assert.equal(params.has('subcategory'), false);
  assert.equal(params.has('child_category_slug'), false);
});

test('list filters are rewritten as a set, not appended to the previous set', () => {
  const href = buildPageActionUrl('https://webflow.com/templates?styles=old&types=old', {
    styles: ['dark-websites', 'minimal-websites'],
    types: ['cms'],
  });
  const params = new URL(href).searchParams;

  assert.deepEqual(params.getAll('styles'), ['dark-websites', 'minimal-websites']);
  assert.deepEqual(params.getAll('types'), ['cms']);
});

test('free_only is set when true and removed when false', () => {
  assert.equal(
    new URL(buildPageActionUrl(LISTING, { free_only: true })).searchParams.get('free_only'),
    'true',
  );
  assert.equal(
    new URL(buildPageActionUrl('https://webflow.com/templates?free_only=true', { free_only: false }))
      .searchParams.has('free_only'),
    false,
  );
});

test('any filter change drops the page offset', () => {
  assert.equal(new URL(buildPageActionUrl(LISTING, { sort: 'newest' })).searchParams.has('page'), false);
});

test('clearing filters removes the whole contract, including legacy aliases', () => {
  const href = buildPageActionUrl(
    'https://webflow.com/templates?q=a&query=b&search=c&category=d&subcategory=e&styles=f&tags=g&types=h&free_only=true&sort=newest&page=2&utm_source=keep',
    { clear_filters: true },
  );
  const params = new URL(href).searchParams;

  for (const key of ['q', 'query', 'search', 'category', 'subcategory', 'styles', 'tags', 'types', 'free_only', 'sort', 'page']) {
    assert.equal(params.has(key), false, `${key} cleared`);
  }
  assert.equal(params.get('utm_source'), 'keep', 'params the grid does not own are left alone');
});

test('a highlight-only action is not treated as a filter change', () => {
  assert.equal(pageActionChangesFilters({ highlight_slugs: ['a', 'b'] }), false);
  assert.equal(pageActionChangesFilters({ sort: 'newest' }), true);
  assert.equal(pageActionChangesFilters({ clear_filters: true }), true);
  assert.equal(pageActionChangesFilters({ q: '' }), true, 'clearing the term is still a change');
});

test('the dispatched detail matches what the grid reads back', () => {
  const href = buildPageActionUrl('https://webflow.com/templates', {
    q: 'bakery',
    styles: ['dark-websites'],
    types: ['cms', 'ecommerce'],
    free_only: true,
    sort: 'newest',
  });
  const detail = buildFilterChangeDetail(href, 1_700_000_000_000);

  assert.deepEqual(detail, {
    q: 'bakery',
    categoryGroupSlug: null,
    childCategorySlug: null,
    styles: ['dark-websites'],
    tags: [],
    types: ['cms', 'ecommerce'],
    freeOnly: true,
    sort: 'newest',
    href,
    source: 'TemplateChat',
    updatedAt: 1_700_000_000_000,
  });
});

test('comma-packed list params are split back out for the grid', () => {
  const detail = buildFilterChangeDetail('https://webflow.com/templates?styles=a,b&types=c', 0);
  assert.deepEqual(detail.styles, ['a', 'b']);
  assert.deepEqual(detail.types, ['c']);
});

test('sort defaults to popular when the URL does not pin one', () => {
  assert.equal(buildFilterChangeDetail('https://webflow.com/templates', 0).sort, 'popular');
});

test('undo rebuilds the pre-action URL exactly', () => {
  const before = 'https://webflow.com/templates?category=portfolio-websites&sort=popular';
  const after = buildPageActionUrl(before, { free_only: true, sort: 'newest' });

  assert.notEqual(after, before);
  // The captured href is what undo replays, so it must round-trip untouched.
  assert.equal(buildFilterChangeDetail(before, 0).href, before);
});
