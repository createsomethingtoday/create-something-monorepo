import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  appendUniqueFeaturedPreviewItems,
  buildTemplateGridDisplayItems,
  resolveFeaturedPreviewNavigation,
  shouldShowTemplateGridCampaign,
  shouldOpenFeaturedTemplatePreview,
  templateGridColumnCount,
} from '../src/components/grid/TemplateGrid';

const detailUrl = 'https://webflow.com/templates/html/leadcraft-website-template';

test('inserts one MCP 2.0 campaign without changing template order or source positions', () => {
  const templates = ['one', 'two', 'three', 'four', 'five'];
  const displayItems = buildTemplateGridDisplayItems(templates, 4, true);

  assert.deepEqual(
    displayItems.map((item) => item.kind),
    ['template', 'template', 'template', 'template', 'campaign', 'template'],
  );
  assert.deepEqual(
    displayItems
      .filter((item) => item.kind === 'template')
      .map((item) => [item.item, item.sourceIndex]),
    templates.map((item, sourceIndex) => [item, sourceIndex]),
  );
  assert.equal(displayItems.filter((item) => item.kind === 'campaign').length, 1);
});

test('shows the MCP 2.0 campaign only on broad, non-search result sets', () => {
  const broadResults = {
    enabled: true,
    query: '',
    scope: 'all' as const,
    categoryGroupSlug: null,
    childCategorySlug: null,
    creatorSlug: null,
    styleSlug: null,
    tagSlug: null,
    styles: [],
    tags: [],
    types: [],
    freeOnly: false,
  };

  assert.equal(shouldShowTemplateGridCampaign(broadResults), true);
  assert.equal(shouldShowTemplateGridCampaign({ ...broadResults, scope: 'featured' }), true);
  assert.equal(shouldShowTemplateGridCampaign({ ...broadResults, query: 'portfolio' }), false);
  assert.equal(shouldShowTemplateGridCampaign({ ...broadResults, creatorSlug: 'studio-north' }), false);
  assert.equal(shouldShowTemplateGridCampaign({ ...broadResults, categoryGroupSlug: 'portfolio' }), false);
  assert.equal(shouldShowTemplateGridCampaign({ ...broadResults, scope: 'free', freeOnly: true }), false);
});

test('inserts after the first complete responsive template row', () => {
  assert.equal(templateGridColumnCount(1440), 4);
  assert.equal(templateGridColumnCount(991), 3);
  assert.equal(templateGridColumnCount(767), 2);
  assert.equal(templateGridColumnCount(479), 1);
});

test('opens only unmodified Featured-scope template-detail clicks', () => {
  assert.equal(
    shouldOpenFeaturedTemplatePreview({
      scope: 'featured',
      anchorHref: detailUrl,
      itemUrl: detailUrl,
      button: 0,
      modified: false,
    }),
    true,
  );
  assert.equal(
    shouldOpenFeaturedTemplatePreview({
      scope: 'all',
      anchorHref: detailUrl,
      itemUrl: detailUrl,
      button: 0,
      modified: false,
    }),
    false,
  );
  assert.equal(
    shouldOpenFeaturedTemplatePreview({
      scope: 'featured',
      anchorHref: 'https://webflow.com/templates/designers/studio-north',
      itemUrl: detailUrl,
      button: 0,
      modified: false,
    }),
    false,
  );
  assert.equal(
    shouldOpenFeaturedTemplatePreview({
      scope: 'featured',
      anchorHref: detailUrl,
      itemUrl: detailUrl,
      button: 0,
      modified: true,
    }),
    false,
  );
});

test('appends the next result page in order without duplicating the frozen snapshot', () => {
  const firstPage = [
    { id: 'one', template_slug: 'one' },
    { id: 'two', template_slug: 'two' },
  ];
  const nextPage = [
    { id: 'two', template_slug: 'two' },
    { id: 'three', template_slug: 'three' },
  ];

  assert.deepEqual(
    appendUniqueFeaturedPreviewItems(firstPage, nextPage).map((item) => item.template_slug),
    ['one', 'two', 'three'],
  );
  assert.deepEqual(firstPage.map((item) => item.template_slug), ['one', 'two']);
});

test('moves within the snapshot, loads at its forward boundary, and stops at the final item', () => {
  assert.deepEqual(resolveFeaturedPreviewNavigation(1, 3, true, -1), { kind: 'move', index: 0 });
  assert.deepEqual(resolveFeaturedPreviewNavigation(1, 3, true, 1), { kind: 'move', index: 2 });
  assert.deepEqual(resolveFeaturedPreviewNavigation(2, 3, true, 1), { kind: 'load-next' });
  assert.deepEqual(resolveFeaturedPreviewNavigation(2, 3, false, 1), { kind: 'none' });
  assert.deepEqual(resolveFeaturedPreviewNavigation(0, 3, true, -1), { kind: 'none' });
});
