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
  assert.match(html, />Buy \$79 USD</);
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

test('shows the literal human reviewer rationale only when the CMS field has text', () => {
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
  assert.match(withFeedback, /Why our team featured it/);
  assert.match(withFeedback, /Clear hierarchy and unusually strong conversion detail\./);
  assert.doesNotMatch(withFeedback, /Featured template feedback/);

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
  assert.doesNotMatch(withoutFeedback, /Why our team featured it/);
  assert.doesNotMatch(withoutFeedback, /Selected by Marketplace review/);
});

test('surfaces concise decision details and preserves the full template detail path', () => {
  const detailedItem = Object.assign({}, featuredItem, {
    description_short: 'A conversion-focused launch template for growing software teams.',
    template_type: 'Multi Page',
    category_groups: [{ name: 'Business', slug: 'business', url: 'https://webflow.com/templates/category/business' }],
    child_categories: [{ name: 'SaaS', slug: 'saas', url: 'https://webflow.com/templates/subcategory/saas' }],
    styles: [{ name: 'Modern', slug: 'modern' }],
    tags: [{ name: 'Lead generation', slug: 'lead-generation' }],
  });
  const html = renderToStaticMarkup(
    <FeaturedTemplatePreview
      item={detailedItem}
      index={0}
      total={1}
      hasPrevious={false}
      hasNext={false}
      onClose={() => undefined}
      onNavigate={() => undefined}
    />,
  );

  assert.match(html, /Template details/);
  assert.match(html, /A conversion-focused launch template for growing software teams\./);
  assert.match(html, /Multi Page/);
  assert.match(html, /SaaS/);
  assert.match(html, /Modern/);
  assert.doesNotMatch(html, /Lead generation/);
  assert.match(html, /Subcategories/);
  assert.match(html, />View details/);
  assert.match(html, /href="https:\/\/webflow\.com\/templates\/html\/leadcraft-website-template"/);
  assert.match(html, /aria-label="View LeadCraft template details \(opens in a new tab\)"/);
  assert.match(html, /<h1[^>]*>LeadCraft<\/h1>/);
  assert.match(html, /<h2[^>]*>Why our team featured it<\/h2>/);
});

test('keeps View details available when a live preview cannot be framed', () => {
  const html = renderToStaticMarkup(
    <FeaturedTemplatePreview
      item={{ ...featuredItem, website_url: 'https://custom-domain.example/' }}
      index={0}
      total={1}
      hasPrevious={false}
      hasNext={false}
      onClose={() => undefined}
      onNavigate={() => undefined}
    />,
  );

  assert.match(html, /Live preview unavailable/);
  assert.match(html, />View details /);
  assert.match(html, /href="https:\/\/webflow\.com\/templates\/html\/leadcraft-website-template"/);
});

test('rejects unsafe preview and Marketplace URLs before they reach rendered attributes', () => {
  const html = renderToStaticMarkup(
    <FeaturedTemplatePreview
      item={{
        ...featuredItem,
        url: 'javascript:alert("detail")',
        website_url: 'javascript:parent.alert("preview")',
        purchase_url: 'https://checkout.example.com/steal',
      }}
      index={0}
      total={1}
      hasPrevious={false}
      hasNext={false}
      onClose={() => undefined}
      onNavigate={() => undefined}
    />,
  );

  assert.doesNotMatch(html, /javascript:/i);
  assert.doesNotMatch(html, /checkout\.example\.com/);
  assert.doesNotMatch(html, /<iframe/);
  assert.match(html, /Live preview unavailable/);
});

test('keeps the cross-origin preview outside the modal keyboard order', () => {
  const html = renderToStaticMarkup(
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

  assert.match(html, /<iframe[^>]*tabindex="-1"/);
  assert.match(html, /<iframe[^>]*sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"/);
  assert.match(html, /<iframe[^>]*referrerPolicy="no-referrer"/);
});

test('turns a next-page failure into an announced retry action', () => {
  const html = renderToStaticMarkup(
    <FeaturedTemplatePreview
      item={featuredItem}
      index={23}
      total={582}
      hasPrevious
      hasNext
      navigationError="Unable to load more Featured templates."
      onClose={() => undefined}
      onNavigate={() => undefined}
    />,
  );

  assert.match(html, /role="alert"/);
  assert.match(html, /Unable to load more Featured templates\./);
  assert.match(html, />Try again</);
});
