import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  PUBLIC_PRODUCT_FAMILY,
  PUBLIC_PRODUCT_SEQUENCE,
  SUBSCRIPTION_CADENCES,
  getPublicProduct
} from '../src/lib/data/productFamily.ts';
import { getStripePrice, hasStripePricing } from '../src/lib/services/stripe.ts';

test('public product family separates Map, Build, and Control on one commercial path', () => {
  assert.deepEqual(PUBLIC_PRODUCT_SEQUENCE, ['map', 'build', 'control']);

  const map = getPublicProduct('map');
  const build = getPublicProduct('build');
  const control = getPublicProduct('control');

  assert.equal(map.name, 'CREATE SOMETHING Map');
  assert.equal(map.kind, 'subscription');
  assert.equal(map.route, '/map');
  assert.equal(map.purchasableStandalone, true);

  assert.equal(build.name, 'CREATE SOMETHING Build');
  assert.equal(build.kind, 'service');
  assert.equal(build.purchasableStandalone, false);

  assert.equal(control.name, 'CREATE SOMETHING Control');
  assert.equal(control.kind, 'subscription');
  assert.equal(control.route, '/control');
  assert.equal(control.purchasableStandalone, true);
  assert.deepEqual(control.includes, ['map']);

  assert.equal(Object.keys(PUBLIC_PRODUCT_FAMILY).length, 3);
});

test('standalone software supports monthly and yearly subscription shapes without fake prices', () => {
  assert.deepEqual(SUBSCRIPTION_CADENCES, ['monthly', 'yearly']);

  for (const id of ['map', 'control'] as const) {
    const product = getPublicProduct(id);
    assert.deepEqual(product.subscriptionCadences, SUBSCRIPTION_CADENCES);
    assert.equal(product.pricingState, 'configuration-required');
  }

  assert.deepEqual(getPublicProduct('build').subscriptionCadences, []);
});

test('public names are projections over stable internal compatibility contracts', () => {
  assert.deepEqual(getPublicProduct('map').internalCompatibilityNames, ['Atlas']);
  assert.deepEqual(getPublicProduct('control').internalCompatibilityNames, [
    'Policy OS',
    'policy_os_trial',
    'policy_os_core'
  ]);
});

test('canonical product documentation preserves the public and internal naming boundary', () => {
  const familyDoc = readFileSync(
    new URL('../../../docs/CREATE_SOMETHING_PRODUCT_FAMILY.md', import.meta.url),
    'utf8'
  );
  const controlDoc = readFileSync(
    new URL('../../../docs/POLICY_OS_PRODUCT_DEFINITION.md', import.meta.url),
    'utf8'
  );

  assert.match(familyDoc, /Map -> Build -> Control/);
  assert.match(familyDoc, /Control includes Map/);
  assert.match(familyDoc, /monthly and yearly/);
  assert.match(familyDoc, /Atlas.*internal implementation name/s);
  assert.match(familyDoc, /Policy OS.*compatibility name/s);

  assert.match(controlDoc, /CREATE SOMETHING Control/);
  assert.match(controlDoc, /public product name/);
  assert.match(controlDoc, /policy_os_trial/);
  assert.match(controlDoc, /policy_os_core/);
});

test('Canon overlay projects Map publicly while keeping stable Atlas contracts', () => {
  const manifest = readFileSync(
    new URL('../canon-overlay/manifest.ts', import.meta.url),
    'utf8'
  );
  const surfacePolicy = readFileSync(
    new URL('../canon-overlay/surface-policy.md', import.meta.url),
    'utf8'
  );

  assert.match(manifest, /"id": "overlay\.agency-atlas-public"/);
  assert.match(manifest, /"name": "Agency Map Public Overlay"/);
  assert.match(manifest, /"sourcePath": "src\/routes\/map\/\+page\.svelte"/);
  assert.match(manifest, /"name": "Public Map route"/);
  assert.doesNotMatch(manifest, /src\/routes\/atlas\/\+page\.svelte/);

  assert.match(surfacePolicy, /`\/map`/);
  assert.doesNotMatch(surfacePolicy, /`\/atlas`/);
});

test('Map is the canonical public canvas route and Atlas redirects for compatibility', async () => {
  const mapRoute = readFileSync(
    new URL('../src/routes/map/+page.svelte', import.meta.url),
    'utf8'
  );

  assert.match(mapRoute, /CREATE SOMETHING Map/);
  assert.match(mapRoute, /<SystemContextRail/);
  assert.doesNotMatch(mapRoute, /<PublicAtlasStoryCanvas/);
  assert.match(mapRoute, /<PublicAtlasCanvas bookingHref="\/book"/);
  assert.doesNotMatch(mapRoute, /Public Atlas Canvas|eyebrow="Atlas/);

  const { load } = await import('../src/routes/atlas/+page.server.ts');
  assert.throws(
    () => load(),
    (error: unknown) => {
      assert.ok(error && typeof error === 'object');
      assert.equal('status' in error ? error.status : undefined, 308);
      assert.equal('location' in error ? error.location : undefined, '/map');
      return true;
    }
  );
});

test('primary public entry points route visitors through Map -> Build -> Control', () => {
  const messaging = readFileSync(
    new URL('../src/lib/data/marketingCopy.ts', import.meta.url),
    'utf8'
  );
  const services = readFileSync(
    new URL('../src/routes/services/+page.svelte', import.meta.url),
    'utf8'
  );
  const products = readFileSync(
    new URL('../src/routes/products/+page.svelte', import.meta.url),
    'utf8'
  );
  const practice = readFileSync(
    new URL('../src/routes/practice/+page.svelte', import.meta.url),
    'utf8'
  );
  const searchRoutes = JSON.parse(
    readFileSync(new URL('../src/lib/data/searchRoutes.json', import.meta.url), 'utf8')
  ) as Array<{ path: string }>;

  assert.match(messaging, /selfMapHref: '\/map'/);
  assert.match(services, /CREATE SOMETHING Map/);
  assert.match(services, /CREATE SOMETHING Build/);
  assert.match(services, /CREATE SOMETHING Control/);
  assert.match(services, /Control includes Map/);
  assert.match(products, /Map -> Build -> Control/);
  assert.match(products, /Control includes Map/);
  assert.match(practice, /href: '\/map'/);
  assert.ok(searchRoutes.some((route) => route.path === '/map'));
  assert.ok(!searchRoutes.some((route) => route.path === '/atlas'));
});

test('Control is a standalone public product that includes Map and its operator surfaces', () => {
  const controlRoute = readFileSync(
    new URL('../src/routes/control/+page.svelte', import.meta.url),
    'utf8'
  );
  const enterpriseRoute = readFileSync(
    new URL('../src/routes/use-cases/enterprise/+page.svelte', import.meta.url),
    'utf8'
  );

  assert.match(controlRoute, /CREATE SOMETHING Control/);
  assert.match(controlRoute, /Standalone subscription/);
  assert.match(controlRoute, /Control includes Map/);
  assert.match(controlRoute, /Signal/);
  assert.match(controlRoute, /Decision/);
  assert.match(controlRoute, /Proof/);
  assert.match(controlRoute, /Monthly/);
  assert.match(controlRoute, /Yearly/);
  assert.doesNotMatch(controlRoute, /\bPolicy OS\b/);

  assert.match(enterpriseRoute, /CREATE SOMETHING Control/);
  assert.doesNotMatch(enterpriseRoute, /\bPolicy OS\b/);
});

test('Map and Control checkout shapes stay inactive until approved Stripe prices exist', () => {
  for (const planId of ['map-monthly', 'map-yearly', 'control-monthly', 'control-yearly']) {
    assert.equal(getStripePrice(planId)?.mode, 'subscription');
    assert.equal(hasStripePricing(planId), false);
  }
});

test('public manifest exposes Map, Build, and Control while retaining Policy OS as an alias', async () => {
  const { GET } = await import('../src/routes/api/manifest/+server.ts');
  const response = await GET({} as never);
  const manifest = (await response.json()) as {
    services: Array<{ slug: string; title: string; description: string }>;
  };

  assert.equal(manifest.services.find((item) => item.slug === 'map')?.title, 'CREATE SOMETHING Map');
  assert.equal(manifest.services.find((item) => item.slug === 'build')?.title, 'CREATE SOMETHING Build');
  assert.equal(
    manifest.services.find((item) => item.slug === 'control')?.title,
    'CREATE SOMETHING Control'
  );
  assert.match(
    manifest.services.find((item) => item.slug === 'policy-os')?.description ?? '',
    /compatibility alias/i
  );
});

test('active public journey does not leak compatibility names as commercial copy or links', () => {
  const routePaths = [
    '../src/routes/+page.svelte',
    '../src/routes/+layout.svelte',
    '../src/routes/book/+page.svelte',
    '../src/routes/map/+page.svelte',
    '../src/routes/control/+page.svelte',
    '../src/routes/products/+page.svelte',
    '../src/routes/services/+page.svelte',
    '../src/routes/proof/marketplace-workflow/+page.svelte',
    '../src/routes/use-cases/enterprise/+page.svelte'
  ];

  for (const routePath of routePaths) {
    const source = readFileSync(new URL(routePath, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /href=["']\/atlas["']/, routePath);
    assert.doesNotMatch(source, /\bPolicy OS\b/, routePath);
  }
});
