import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const agencyRoot = resolve(import.meta.dirname, '..');
const properties = ['agency', 'space', 'io', 'ltd'] as const;
const requiredRasterAssets = [
  ['favicon.png', 512],
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-512-maskable.png', 512]
] as const;

function staticPath(property: (typeof properties)[number], asset: string) {
  const packageRoot = property === 'agency' ? agencyRoot : resolve(agencyRoot, `../${property}`);
  return resolve(packageRoot, 'static', asset);
}

function readPngDimensions(path: string) {
  const image = readFileSync(path);
  assert.deepEqual([...image.subarray(1, 4)], [80, 78, 71], `${path} is a PNG`);
  return { width: image.readUInt32BE(16), height: image.readUInt32BE(20) };
}

test('every public property owns the complete ring-icon and social-card contract', () => {
  for (const property of properties) {
    const faviconSvg = staticPath(property, 'favicon.svg');
    const maskIcon = staticPath(property, 'mask-icon.svg');
    const manifestPath = staticPath(property, 'manifest.json');
    const faviconIco = staticPath(property, 'favicon.ico');

    for (const asset of [faviconSvg, maskIcon, manifestPath, faviconIco]) {
      assert.ok(existsSync(asset), `${property} serves ${asset.split('/').at(-1)}`);
    }

    const favicon = readFileSync(faviconSvg, 'utf8');
    assert.match(favicon, /<circle cx="53" cy="50" r="41\.5"/);
    assert.match(favicon, /<circle cx="43\.5" cy="50" r="31\.5"/);

    for (const [asset, expectedSize] of requiredRasterAssets) {
      const dimensions = readPngDimensions(staticPath(property, asset));
      assert.deepEqual(dimensions, { width: expectedSize, height: expectedSize }, `${property} ${asset}`);
    }

    assert.deepEqual(readPngDimensions(staticPath(property, 'og-image.png')), {
      width: 1200,
      height: 630
    });
    assert.match(readFileSync(staticPath(property, 'og-image.svg'), 'utf8'), new RegExp(`\\.${property}`));

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      icons: Array<{ src: string; purpose?: string }>;
    };
    const iconSources = new Set(manifest.icons.map((icon) => icon.src));
    for (const asset of ['favicon.svg', 'favicon.png', 'icon-192.png', 'icon-512.png', 'icon-512-maskable.png']) {
      assert.ok(iconSources.has(asset), `${property} manifest includes ${asset}`);
    }
    assert.equal(
      manifest.icons.find((icon) => icon.src === 'icon-512-maskable.png')?.purpose,
      'maskable'
    );
  }
});

test('shared chrome and route SEO reference the canonical ring identity', () => {
  const navigation = readFileSync(resolve(agencyRoot, '../canon/src/lib/components/Navigation.svelte'), 'utf8');
  const footer = readFileSync(resolve(agencyRoot, '../canon/src/lib/components/Footer.svelte'), 'utf8');
  const layoutSeo = readFileSync(resolve(agencyRoot, '../canon/src/lib/components/LayoutSEO.svelte'), 'utf8');
  const seo = readFileSync(resolve(agencyRoot, '../canon/src/lib/components/SEO.svelte'), 'utf8');

  assert.match(navigation, /import \{ RingMark \}/);
  assert.match(footer, /import \{ RingMark \}/);
  assert.match(layoutSeo, /rel="manifest" href="\/manifest\.json"/);
  assert.match(layoutSeo, /rel="apple-touch-icon" href="\/apple-touch-icon\.png"/);
  assert.match(layoutSeo, /rel="mask-icon" href="\/mask-icon\.svg"/);
  assert.match(seo, /https:\/\/createsomething\.ltd\/#organization/);
  assert.match(
    seo,
    /https:\/\/createsomething\.ltd\/brand\/create-something-ring-mark-512\.png/
  );
  assert.match(seo, /primaryImageOfPage: socialImage/);
});

test('property-owned route overrides use the PNG social-card contract', () => {
  for (const path of [
    resolve(agencyRoot, '../space/src/routes/+page.svelte'),
    resolve(agencyRoot, '../io/src/routes/+page.svelte'),
    resolve(agencyRoot, '../io/src/routes/subscribe/+page.svelte')
  ]) {
    assert.match(readFileSync(path, 'utf8'), /ogImage="\/og-image\.png"/);
  }
});
