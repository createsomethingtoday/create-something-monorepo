import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const agencyRoot = resolve(import.meta.dirname, '..');
const packageRoot = resolve(agencyRoot, '..');
const properties = ['agency', 'space', 'io', 'ltd'] as const;
const requiredAssets = [
  'favicon.svg',
  'favicon.ico',
  'favicon.png',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
  'icon-512-maskable.png',
  'mask-icon.svg',
  'manifest.json',
  'og-image.png'
];

function pngSize(path: string): [number, number] {
  const data = readFileSync(path);
  assert.equal(data.toString('ascii', 1, 4), 'PNG', `${path} must be a PNG`);
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
}

test('all public properties ship one ring-mark browser, web-clip, and social-image contract', () => {
  const canonicalSvg = readFileSync(resolve(packageRoot, 'ltd/static/favicon.svg'), 'utf8');

  for (const property of properties) {
    const staticRoot = resolve(packageRoot, property, 'static');
    for (const asset of requiredAssets) {
      assert.ok(existsSync(resolve(staticRoot, asset)), `${property} must serve ${asset}`);
    }

    const favicon = readFileSync(resolve(staticRoot, 'favicon.svg'), 'utf8');
    assert.equal(favicon, canonicalSvg, `${property} must use the shared ring source`);
    assert.match(favicon, /<circle cx="53" cy="50" r="41\.5"\s*\/>/);
    assert.doesNotMatch(favicon, /Isometric Cube Mark|M 16 4 L 26\.39 10/);
    assert.deepEqual(pngSize(resolve(staticRoot, 'favicon.png')), [512, 512]);
    assert.deepEqual(pngSize(resolve(staticRoot, 'apple-touch-icon.png')), [180, 180]);
    assert.deepEqual(pngSize(resolve(staticRoot, 'icon-192.png')), [192, 192]);
    assert.deepEqual(pngSize(resolve(staticRoot, 'icon-512.png')), [512, 512]);
    assert.deepEqual(pngSize(resolve(staticRoot, 'icon-512-maskable.png')), [512, 512]);
    assert.deepEqual(pngSize(resolve(staticRoot, 'og-image.png')), [1200, 630]);

    const manifest = JSON.parse(readFileSync(resolve(staticRoot, 'manifest.json'), 'utf8'));
    assert.match(manifest.name, new RegExp(`\\.${property}`));
    assert.deepEqual(
      new Set(manifest.icons.map((icon: { src: string }) => icon.src)),
      new Set(['favicon.svg', 'favicon.png', 'icon-192.png', 'icon-512.png', 'icon-512-maskable.png'])
    );
    assert.equal(
      manifest.icons.find((icon: { src: string }) => icon.src === 'icon-512-maskable.png')?.purpose,
      'maskable'
    );
  }
});

test('the layout owns identity links and the route-level SEO component owns page metadata', () => {
  const layoutSeo = readFileSync(resolve(packageRoot, 'canon/src/lib/components/LayoutSEO.svelte'), 'utf8');
  const routeSeo = readFileSync(resolve(packageRoot, 'canon/src/lib/components/SEO.svelte'), 'utf8');
  const agencyLayout = readFileSync(resolve(agencyRoot, 'src/routes/+layout.svelte'), 'utf8');

  for (const asset of ['favicon.svg', 'favicon.ico', 'favicon.png', 'apple-touch-icon.png', 'mask-icon.svg', 'manifest.json']) {
    assert.match(layoutSeo, new RegExp(`/` + asset.replace('.', '\\.')));
  }
  assert.match(agencyLayout, /<LayoutSEO property="agency" \/>/);
  assert.doesNotMatch(routeSeo, /rel="(?:icon|apple-touch-icon|manifest|mask-icon)"/);
});

test('the canonical Organization image is a served .ltd brand asset', () => {
  const canonicalAsset = resolve(
    packageRoot,
    'ltd/static/brand/create-something-ring-mark-512.png'
  );
  assert.ok(existsSync(canonicalAsset));
  assert.deepEqual(pngSize(canonicalAsset), [512, 512]);
});
