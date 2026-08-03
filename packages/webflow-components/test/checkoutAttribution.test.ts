import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  appendAttributionToCheckoutHref,
  CHECKOUT_ATTRIBUTION_PARAM_PREFIX,
} from '../src/components/marketplace/checkoutAttribution';
import type { TemplateMarketplaceAttribution } from '../src/components/marketplace/templateAttribution';

function attribution(
  overrides: Partial<TemplateMarketplaceAttribution> = {},
): TemplateMarketplaceAttribution {
  return {
    version: 1,
    source_component: 'TemplateGrid',
    source_pathname: '/templates',
    source_scope: 'all',
    source_sort: 'recommended',
    source_category_group_slug: 'technology-websites',
    source_child_category_slug: null,
    source_style_slug: null,
    source_tag_slug: null,
    source_free_only: false,
    source_q_present: false,
    source_styles_count: 0,
    source_tags_count: 0,
    source_types_count: 0,
    source_page: 2,
    source_position: 7,
    template_slug: 'vaboulus',
    signal_bucket: 'top_seller',
    signal_metric: 'purchases',
    signal_window: 'rolling_30d',
    signal_density: 'default',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

const CHECKOUT_HREF = 'https://webflow.com/dashboard/marketplace-checkout/redirect?templateId=abc123';

test('appends wf_attr_* params to a checkout URL', () => {
  const next = appendAttributionToCheckoutHref(CHECKOUT_HREF, attribution(), 'vaboulus');
  assert.ok(next, 'expected a rewritten URL');

  const url = new URL(next);
  assert.equal(url.searchParams.get('templateId'), 'abc123', 'existing params preserved');
  assert.equal(url.searchParams.get('wf_attr_src'), 'TemplateGrid');
  assert.equal(url.searchParams.get('wf_attr_scope'), 'all');
  assert.equal(url.searchParams.get('wf_attr_sort'), 'recommended');
  assert.equal(url.searchParams.get('wf_attr_page'), '2');
  assert.equal(url.searchParams.get('wf_attr_pos'), '7');
  assert.equal(url.searchParams.get('wf_attr_slug'), 'vaboulus');
  assert.equal(url.searchParams.get('wf_attr_match'), '1');
});

test('marks a slug mismatch instead of dropping attribution', () => {
  const next = appendAttributionToCheckoutHref(CHECKOUT_HREF, attribution(), 'different-template');
  assert.ok(next);
  assert.equal(new URL(next).searchParams.get('wf_attr_match'), '0');
});

test('resolves relative checkout hrefs against webflow.com', () => {
  const next = appendAttributionToCheckoutHref(
    '/dashboard/marketplace-checkout/redirect?templateId=abc123',
    attribution(),
    'vaboulus',
  );
  assert.ok(next);
  assert.equal(new URL(next).hostname, 'webflow.com');
  assert.equal(new URL(next).searchParams.get('wf_attr_src'), 'TemplateGrid');
});

test('returns null for non-checkout and non-webflow destinations', () => {
  assert.equal(
    appendAttributionToCheckoutHref('https://webflow.com/templates/html/vaboulus', attribution(), 'vaboulus'),
    null,
    'non-checkout webflow URL',
  );
  assert.equal(
    appendAttributionToCheckoutHref(
      'https://evil.example.com/dashboard/marketplace-checkout/redirect',
      attribution(),
      'vaboulus',
    ),
    null,
    'non-webflow host',
  );
  assert.equal(
    appendAttributionToCheckoutHref(
      'http://webflow.com.evil.example/dashboard/marketplace-checkout/redirect',
      attribution(),
      'vaboulus',
    ),
    null,
    'suffix-spoofed host',
  );
});

test('returns null without attribution or when params already forwarded', () => {
  assert.equal(appendAttributionToCheckoutHref(CHECKOUT_HREF, null, 'vaboulus'), null);

  const first = appendAttributionToCheckoutHref(CHECKOUT_HREF, attribution(), 'vaboulus');
  assert.ok(first);
  assert.equal(
    appendAttributionToCheckoutHref(first, attribution(), 'vaboulus'),
    null,
    'second click must not duplicate params',
  );
});

test('clips oversized values and skips null fields', () => {
  const next = appendAttributionToCheckoutHref(
    CHECKOUT_HREF,
    attribution({ source_component: 'X'.repeat(500), source_sort: '' }),
    'vaboulus',
  );
  assert.ok(next);
  const url = new URL(next);
  assert.equal(url.searchParams.get(`${CHECKOUT_ATTRIBUTION_PARAM_PREFIX}src`)?.length, 80);
  assert.equal(url.searchParams.has(`${CHECKOUT_ATTRIBUTION_PARAM_PREFIX}sort`), false);
});
