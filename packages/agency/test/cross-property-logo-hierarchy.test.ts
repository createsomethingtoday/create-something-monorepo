import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const agencyRoot = resolve(import.meta.dirname, '..');
const read = (relativePath: string) => readFileSync(resolve(agencyRoot, relativePath), 'utf8');

test('editorial footers use one linked masthead identity and no directory-panel mark', () => {
  const footer = read('../canon/src/lib/components/Footer.svelte');

  assert.match(
    footer,
    /\{#if brandAsset\}[\s\S]*?aria-label=\{`\$\{brandAsset\.label\} home`\}/
  );
  assert.match(footer, /aria-label=\{`CREATE SOMETHING \.\$\{mode\} home`\}/);
  assert.match(footer, /\{#if usesPerformanceStyle && !usesEditorialStyle\}/);
  assert.match(footer, /\{#if !brandAsset && !usesEditorialStyle\}/);
  assert.match(footer, /\.footer-editorial-identity--link:focus-visible/);
});

test('all public property layouts retain a compact property-aware navigation identity', () => {
  const agency = read('src/routes/+layout.svelte');
  const space = read('../space/src/routes/+layout.svelte');
  const io = read('../io/src/routes/+layout.svelte');
  const ltd = read('../ltd/src/routes/+layout.svelte');

  assert.match(agency, /logoSuffix="\.agency"/);
  assert.match(agency, /logoAsset=\{\{[\s\S]*?create-something-horizontal-black\.svg/);
  assert.match(space, /logoSuffix="\.space"/);
  assert.match(io, /logoSuffix="\.io"/);
  assert.match(ltd, /logoSuffix="\.ltd"/);
});
