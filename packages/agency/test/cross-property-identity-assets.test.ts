import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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
const v3Hashes = {
  favicon: 'e68987e7dc4dc33e7e8845245d5aa96362a32c60ea4c8f70c9c7c9a820841875',
  mark: 'd50ace76dbeabc2fee672599e81434addfe0e83dc41e35e0865ebc4f69942ff2',
  horizontal: '1f4ff733da74d0a5514988513e659a4eef457c711eb54e135011530a185753bb',
  footer: 'b0e0793f267d1375e6f0dba6f544db668d4c20b13712e9cec001154972bdc630',
  agencyEndorsement: '44a3adcadc32632cc69038c60c7860c1efb01fe13e4f053cbcd89ceb091293d8',
  appleTouch: '1d7a7ae2461836289457c8425102ce5c9117ac4c235dae429e2d78d0b11dd6ea',
  icon192: '80aabf6abbb31d55072f7b77c2c8a6f86ed401c51006d5aa2d24d257feba1f6d',
  icon512: '7a4042eb5e78f16c80e08c3d6d302a42cb47811d28fa42d8ebaba0df5ec0b6ca'
} as const;

function staticPath(property: (typeof properties)[number], asset: string) {
  const packageRoot = property === 'agency' ? agencyRoot : resolve(agencyRoot, `../${property}`);
  return resolve(packageRoot, 'static', asset);
}

function readPngDimensions(path: string) {
  const image = readFileSync(path);
  assert.deepEqual([...image.subarray(1, 4)], [80, 78, 71], `${path} is a PNG`);
  return { width: image.readUInt32BE(16), height: image.readUInt32BE(20) };
}

function sha256(path: string) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

test('every public property owns the complete V3 icon and social-card contract', () => {
  for (const property of properties) {
    const faviconSvg = staticPath(property, 'favicon.svg');
    const maskIcon = staticPath(property, 'mask-icon.svg');
    const manifestPath = staticPath(property, 'manifest.json');
    const faviconIco = staticPath(property, 'favicon.ico');

    for (const asset of [faviconSvg, maskIcon, manifestPath, faviconIco]) {
      assert.ok(existsSync(asset), `${property} serves ${asset.split('/').at(-1)}`);
    }

    assert.equal(sha256(faviconSvg), v3Hashes.favicon, `${property} favicon uses V3 source`);
    assert.equal(sha256(maskIcon), v3Hashes.mark, `${property} mask icon uses the V3 master mark`);
    assert.equal(
      sha256(staticPath(property, 'apple-touch-icon.png')),
      v3Hashes.appleTouch,
      `${property} Apple touch icon uses V3 source`
    );
    assert.equal(
      sha256(staticPath(property, 'icon-192.png')),
      v3Hashes.icon192,
      `${property} 192 icon`
    );
    for (const asset of ['favicon.png', 'icon-512.png', 'icon-512-maskable.png']) {
      assert.equal(sha256(staticPath(property, asset)), v3Hashes.icon512, `${property} ${asset}`);
    }

    for (const [asset, expectedSize] of requiredRasterAssets) {
      const dimensions = readPngDimensions(staticPath(property, asset));
      assert.deepEqual(
        dimensions,
        { width: expectedSize, height: expectedSize },
        `${property} ${asset}`
      );
    }

    assert.deepEqual(readPngDimensions(staticPath(property, 'og-image.png')), {
      width: 1200,
      height: 630
    });
    assert.match(
      readFileSync(staticPath(property, 'og-image.svg'), 'utf8'),
      new RegExp(`\\.${property}`)
    );

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      icons: Array<{ src: string; purpose?: string }>;
    };
    const iconSources = new Set(manifest.icons.map((icon) => icon.src));
    for (const asset of [
      'favicon.svg',
      'favicon.png',
      'icon-192.png',
      'icon-512.png',
      'icon-512-maskable.png'
    ]) {
      assert.ok(iconSources.has(asset), `${property} manifest includes ${asset}`);
    }
    assert.equal(
      manifest.icons.find((icon) => icon.src === 'icon-512-maskable.png')?.purpose,
      'maskable'
    );
  }
});

test('shared chrome and route SEO reference the canonical V3 identity', () => {
  const navigation = readFileSync(
    resolve(agencyRoot, '../canon/src/lib/components/Navigation.svelte'),
    'utf8'
  );
  const footer = readFileSync(
    resolve(agencyRoot, '../canon/src/lib/components/Footer.svelte'),
    'utf8'
  );
  const layoutSeo = readFileSync(
    resolve(agencyRoot, '../canon/src/lib/components/LayoutSEO.svelte'),
    'utf8'
  );
  const agencyLayout = readFileSync(resolve(agencyRoot, 'src/routes/+layout.svelte'), 'utf8');
  const seo = readFileSync(resolve(agencyRoot, '../canon/src/lib/components/SEO.svelte'), 'utf8');

  assert.match(navigation, /import \{ RingMark \}/);
  assert.match(footer, /import \{ RingMark \}/);
  assert.match(layoutSeo, /rel="manifest" href="\/manifest\.json"/);
  assert.match(layoutSeo, /rel="apple-touch-icon" href="\/apple-touch-icon\.png"/);
  assert.match(layoutSeo, /rel="mask-icon" href="\/mask-icon\.svg"/);
  assert.match(agencyLayout, /LayoutSEO/);
  assert.match(agencyLayout, /<LayoutSEO property="agency"\s*\/>/);
  assert.match(seo, /https:\/\/createsomething\.ltd\/#organization/);
  assert.match(seo, /https:\/\/createsomething\.ltd\/icon-512\.png/);
  assert.match(seo, /primaryImageOfPage: socialImage/);
});

test('every public shell consumes its approved V3 header and footer assets', () => {
  for (const property of properties) {
    const layout = readFileSync(
      property === 'agency'
        ? resolve(agencyRoot, 'src/routes/+layout.svelte')
        : resolve(agencyRoot, `../${property}/src/routes/+layout.svelte`),
      'utf8'
    );
    const footerAsset =
      property === 'agency'
        ? 'create-something-agency-white.svg'
        : 'create-something-footer-white.svg';

    assert.match(layout, /src: '\/brand\/create-something-horizontal-black\.svg'/);
    assert.match(layout, /mobileSrc: '\/brand\/create-something-mark-black\.svg'/);
    assert.match(layout, new RegExp(`src: '/brand/${footerAsset.replace('.', '\\.')}'`));
    if (property !== 'agency') {
      assert.doesNotMatch(layout, /enableRouteLogoMotion/);
      assert.equal(
        sha256(staticPath(property, 'brand/create-something-horizontal-black.svg')),
        v3Hashes.horizontal,
        `${property} serves the V3 horizontal source`
      );
      assert.equal(
        sha256(staticPath(property, 'brand/create-something-mark-black.svg')),
        v3Hashes.mark,
        `${property} serves the V3 master mark source`
      );
      assert.equal(
        sha256(staticPath(property, 'brand/create-something-footer-white.svg')),
        v3Hashes.footer,
        `${property} serves the V3 footer source`
      );
    }
  }

  assert.equal(
    sha256(staticPath('agency', 'brand/create-something-agency-white.svg')),
    v3Hashes.agencyEndorsement,
    'Agency retains the supplied property endorsement only where V3 provides it'
  );
});

test('the public LTD brand library serves outlined V3 source files and redirects retired downloads', () => {
  const ltdRoot = resolve(agencyRoot, '../ltd');
  const brandPage = readFileSync(resolve(ltdRoot, 'src/routes/brand/+page.svelte'), 'utf8');
  const legacyEndpoint = readFileSync(
    resolve(ltdRoot, 'src/routes/brand/[asset].svg/+server.ts'),
    'utf8'
  );

  for (const asset of [
    'create-something-mark-black.svg',
    'create-something-mark-white.svg',
    'create-something-wordmark-black.svg',
    'create-something-wordmark-white.svg',
    'create-something-horizontal-black.svg',
    'create-something-horizontal-white.svg',
    'create-something-stacked-black.svg',
    'create-something-stacked-white.svg',
    'create-something-site-icon.svg'
  ]) {
    const path = resolve(ltdRoot, 'static/brand', asset);
    assert.ok(existsSync(path), `LTD publishes ${asset}`);
    assert.doesNotMatch(readFileSync(path, 'utf8'), /<text[\s>]/, `${asset} is outlined`);
    assert.match(brandPage, new RegExp(asset.replace('.', '\\.')));
  }

  assert.match(brandPage, /Official V3 source assets/);
  assert.match(legacyEndpoint, /redirect\(308/);
  assert.doesNotMatch(legacyEndpoint, /WORDMARK_DEFS|<text/);
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
