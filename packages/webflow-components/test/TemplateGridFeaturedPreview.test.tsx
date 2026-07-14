import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  appendUniqueFeaturedPreviewItems,
  resolveFeaturedPreviewNavigation,
  shouldOpenFeaturedTemplatePreview,
} from '../src/components/grid/TemplateGrid';

const detailUrl = 'https://webflow.com/templates/html/leadcraft-website-template';

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
