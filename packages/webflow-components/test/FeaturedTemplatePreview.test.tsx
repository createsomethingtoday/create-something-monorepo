import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  FeaturedTemplatePreview,
  shouldResetFeaturedPreviewLoad,
  type FeaturedTemplatePreviewItem,
} from '../src/components/marketplace/FeaturedTemplatePreview';

const featuredItem: FeaturedTemplatePreviewItem = {
  id: 'template-1',
  template_slug: 'leadcraft-website-template',
  name: 'LeadCraft',
  url: 'https://webflow.com/templates/html/leadcraft-website-template',
  website_url: 'https://leadcraft-template.webflow.io/',
  purchase_url: 'https://webflow.com/dashboard/marketplace-checkout/redirect?rtype=Template&rid=template-1',
  creator_name: 'Studio North',
  price: 79,
  is_free: false,
  reviewer_pick_reason: 'Clear hierarchy and unusually strong conversion detail.',
};

test('renders the selected Featured item as an immersive published-site preview', () => {
  const html = renderToStaticMarkup(
    <FeaturedTemplatePreview
      item={featuredItem}
      index={0}
      total={2}
      hasPrevious={false}
      hasNext
      onClose={() => undefined}
      onNavigate={() => undefined}
    />,
  );

  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /LeadCraft/);
  assert.match(html, /src="https:\/\/leadcraft-template\.webflow\.io\/"/);
  assert.doesNotMatch(html, /preview\.webflow\.com/);
});

test('offers device modes and the direct marketplace action', () => {
  const html = renderToStaticMarkup(
    <FeaturedTemplatePreview
      item={featuredItem}
      index={0}
      total={2}
      hasPrevious={false}
      hasNext
      onClose={() => undefined}
      onNavigate={() => undefined}
    />,
  );

  assert.match(html, />Desktop</);
  assert.match(html, />Tablet</);
  assert.match(html, />Mobile</);
  assert.match(html, />Buy — \$79</);
  assert.match(html, /marketplace-checkout\/redirect/);
});

test('keeps the loaded iframe visible while resizing the same template across devices', () => {
  assert.equal(shouldResetFeaturedPreviewLoad('template-1', 'template-1'), false);
  assert.equal(shouldResetFeaturedPreviewLoad('template-1', 'template-2'), true);
});

test('uses the detail fallback and free action label when direct checkout is unavailable', () => {
  const html = renderToStaticMarkup(
    <FeaturedTemplatePreview
      item={{ ...featuredItem, purchase_url: null, is_free: true, price: 0 }}
      index={0}
      total={1}
      hasPrevious={false}
      hasNext={false}
      onClose={() => undefined}
      onNavigate={() => undefined}
    />,
  );

  assert.match(html, />Use for free</);
  assert.match(html, /href="https:\/\/webflow\.com\/templates\/html\/leadcraft-website-template"/);
  assert.doesNotMatch(html, /marketplace-checkout\/redirect/);
});

test('shows literal Featured feedback only when the CMS field has text', () => {
  const withFeedback = renderToStaticMarkup(
    <FeaturedTemplatePreview
      item={featuredItem}
      index={0}
      total={1}
      hasPrevious={false}
      hasNext={false}
      onClose={() => undefined}
      onNavigate={() => undefined}
    />,
  );
  assert.match(withFeedback, /Featured template feedback/);
  assert.match(withFeedback, /Clear hierarchy and unusually strong conversion detail\./);

  const withoutFeedback = renderToStaticMarkup(
    <FeaturedTemplatePreview
      item={{ ...featuredItem, reviewer_pick_reason: '   ' }}
      index={0}
      total={1}
      hasPrevious={false}
      hasNext={false}
      onClose={() => undefined}
      onNavigate={() => undefined}
    />,
  );
  assert.doesNotMatch(withoutFeedback, /Featured template feedback/);
  assert.doesNotMatch(withoutFeedback, /Selected by Marketplace review/);
});
