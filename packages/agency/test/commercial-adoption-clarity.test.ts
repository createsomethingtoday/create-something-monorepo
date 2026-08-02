import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

test('every public product carries an honest access state beside its commercial shape', async () => {
  const { getPublicProduct } = await import('../src/lib/data/productFamily.ts');

  assert.equal(getPublicProduct('map').accessLabel, 'Request access after workflow scope');
  assert.equal(getPublicProduct('build').accessLabel, 'Scoped and quoted separately');
  assert.equal(getPublicProduct('control').accessLabel, 'From $900 per month after launch');
});

test('Products uses the registered Paper system and keeps historical tools under technical proof', () => {
  const products = read('../src/routes/products/+page.svelte');
  const mediaPolicy = read('../src/lib/data/performanceMedia.ts');

  assert.match(products, /import \{ paperProductSystemMedia \}/);
  assert.match(products, /media=\{paperProductSystemMedia\}/);
  assert.match(products, /mode="paper"/);
  assert.doesNotMatch(products, /product-system-natural|Aerial black-and-white/);
  assert.match(products, /product\.accessLabel/);
  assert.match(products, /Technical proof/);
  assert.match(
    products,
    /Historical and open tools are evidence, not additional commercial products/
  );
  assert.match(mediaPolicy, /'\/products': 'paperProductSystemMedia'/);
  assert.doesNotMatch(mediaPolicy, /performanceWaterRouteAssignments[\s\S]*?'\/products'/);
});

test('mobile brand and privacy controls read as intentional interface elements', () => {
  const navigation = read('../../canon/src/lib/components/Navigation.svelte');
  const layout = read('../src/routes/+layout.svelte');
  const privacy = read('../src/lib/components/PrivacyAnalytics.svelte');

  assert.match(navigation, /showMobileLogoText\?: boolean/);
  assert.match(navigation, /class:nav-show-mobile-logo-text=\{showMobileLogoText\}/);
  assert.match(navigation, /\.nav-show-mobile-logo-text \.nav-logo-text/);
  assert.match(layout, /showMobileLogoText=\{true\}/);
  assert.match(
    privacy,
    /@media \(max-width: 640px\)[\s\S]*?\.privacy-pill \{[\s\S]*?background: var\(--color-performance-panel/
  );
  assert.match(privacy, /aria-label="Privacy choices"/);
});
