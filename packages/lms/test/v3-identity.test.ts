import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const lmsRoot = resolve(import.meta.dirname, '..');
const read = (relativePath: string) => readFileSync(resolve(lmsRoot, relativePath), 'utf8');

test('Learn owns one responsive V3 identity treatment without changing Canon defaults', () => {
  const navigation = read('../canon/src/lib/components/Navigation.svelte');
  const footer = read('../canon/src/lib/components/Footer.svelte');
  const layout = read('src/routes/+layout.svelte');
  const app = read('src/app.html');

  assert.match(navigation, /mobileSrc\?: string/);
  assert.match(navigation, /logoAssetSuffix\?: string/);
  assert.match(
    navigation,
    /<source media="\(max-width: 640px\)" srcset=\{logoAsset\.mobileSrc\} \/>/
  );
  assert.match(navigation, /\.nav-logo-asset-suffix/);
  assert.match(footer, /brandAsset\?: FooterBrandAsset/);
  assert.match(layout, /src: '\/brand\/create-something-horizontal-v3\.svg'/);
  assert.match(layout, /mobileSrc: '\/brand\/create-something-mark-v3\.svg'/);
  assert.match(layout, /logoAssetSuffix="\.learn"/);
  assert.match(layout, /src: '\/brand\/create-something-footer-signature-v3\.svg'/);
  assert.match(app, /href="%sveltekit\.assets%\/favicon\.svg"/);
  assert.doesNotMatch(layout, /logoSuffix="\.learn"/);
});

test('Learn serves checksum-verified V3 vectors and the V3 favicon', () => {
  const expectedHashes = new Map([
    ['static/brand/create-something-horizontal-v3.svg', '1f4ff733da74d0a5514988513e659a4eef457c711eb54e135011530a185753bb'],
    ['static/brand/create-something-mark-v3.svg', 'd50ace76dbeabc2fee672599e81434addfe0e83dc41e35e0865ebc4f69942ff2'],
    ['static/brand/create-something-footer-signature-v3.svg', 'aa7b072c78a0f6a10cadf2674cffc4205c74c1b4d9f83fb3ac1ef3b5d558b6e2'],
    ['static/favicon.svg', 'e68987e7dc4dc33e7e8845245d5aa96362a32c60ea4c8f70c9c7c9a820841875']
  ]);

  for (const [relativePath, expectedHash] of expectedHashes) {
    const path = resolve(lmsRoot, relativePath);
    assert.ok(existsSync(path), `${relativePath} must be served by Learn`);
    const actualHash = createHash('sha256').update(readFileSync(path)).digest('hex');
    assert.equal(actualHash, expectedHash, `${relativePath} must preserve its approved V3 source`);
    assert.match(readFileSync(path, 'utf8'), /cs-(mark-v3|micro-mark-v3)|wordmark-glyph-0/);
  }

  const metadata = read('content/assets/brand/create-something-logo-system.v20260812/metadata.md');
  assert.match(metadata, /create-something-brand-candidate-v3/);
  assert.match(metadata, /1f4ff733da74d0a5514988513e659a4eef457c711eb54e135011530a185753bb/);
  assert.match(metadata, /d50ace76dbeabc2fee672599e81434addfe0e83dc41e35e0865ebc4f69942ff2/);
});

test('the public path chooser names the next move, bounded sequence, and proof artifact', () => {
  const paths = read('src/routes/paths/+page.svelte');

  assert.match(paths, /const pathProof/);
  assert.match(paths, /function pathTimeBudget/);
  assert.match(paths, /class="path-record"/);
  assert.match(paths, /Next move/);
  assert.match(paths, /Time budget/);
  assert.match(paths, /Proof artifact/);
  assert.match(paths, /View sequence/);
  assert.doesNotMatch(paths, /Practical operator workflow/);
});
