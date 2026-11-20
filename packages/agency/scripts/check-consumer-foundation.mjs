import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const require = createRequire(new URL('../package.json', import.meta.url));
const postcss = require('postcss');
const adapters = ['agency/src/lib/styles/operator-palette.css', 'io/src/lib/styles/operator.css', 'ltd/src/lib/operator-public.css', 'space/src/lib/workshop/workshop.css'];
test('public adapters consume Canon roles without redefining the foundation or operator palette', () => {
  for (const file of adapters) {
    const css = postcss.parse(read(`packages/${file}`));
    css.walkDecls((decl) => {
      assert(!/^--(?:color|glass|font|radius|space|text|height)-performance-/.test(decl.prop), `${file}: duplicated ${decl.prop}`);
      assert(!/var\(--(?:color|radius)-operator-/.test(decl.value), `${file}: operator dependency`);
    });
  }
});
test('property roots inherit Canon role values and preserve full-contrast link hover', () => {
  for (const name of ['agency', 'io', 'ltd', 'space']) {
    const css = postcss.parse(read(`packages/${name}/src/app.css`));
    css.walkRules(':root', rule => rule.walkDecls(decl => assert(!/^--(?:color|glass|font)-performance-/.test(decl.prop), `${name}: ${decl.prop}`)));
    assert(!read(`packages/${name}/src/app.css`).includes('opacity: 0.7;'));
  }
});
test('public appearances are explicit while existing route classifiers remain authoritative', () => {
  assert.match(read('packages/agency/src/routes/+layout.svelte'), /data-theme=\{usesOperatorPalette \? "dark" : "light"\}/);
  assert.match(read('packages/agency/src/routes/+layout.svelte'), /usesAgencyOperatorPalette\(\$page.url.pathname\)/);
  assert.match(read('packages/io/src/routes/+layout.svelte'), /data-theme=\{isResearchSurface \? 'dark' : undefined\}/);
  assert.match(read('packages/ltd/src/routes/+layout.svelte'), /data-theme=\{isPublicLibraryRoute \? 'dark' : undefined\}/);
  assert.match(read('packages/ltd/src/routes/+layout.svelte'), /isPublicLibraryRoute && !isCanonRoute \? 'dark' : undefined/);
  assert.match(read('packages/space/src/routes/+layout.svelte'), /data-theme="dark"/);
  assert.match(read('packages/agency/src/routes/map/subscribe/+page.svelte'), /<main data-theme="dark">/);
});
test('actual Agency homepage binds the canonical font, geometry and palette', () => {
  const css = read('packages/agency/static/styles/agency/story-home.css');
  assert.match(css, /--background:var\(--color-performance-paper\)/);
  assert.match(css, /--font-sans:var\(--font-performance-sans\)/);
  assert.match(css, /--radius:var\(--radius-performance-sm\)/);
  assert(!css.includes('#101112'));
});
test('standalone Arena surfaces retain explicit dark scopes', () => {
  for (const route of ['visualizations/arena-scale', 'experiments/living-arena', 'experiments/living-arena-gpu']) {
    assert.match(read(`packages/io/src/routes/${route}/+page.svelte`), /data-theme="dark"/);
  }
});
test('reading and workshop guards survive visual migration', () => {
  assert.match(read('packages/io/src/lib/styles/operator.css'), /min-height: 44px/);
  assert.match(read('packages/io/src/lib/styles/operator.css'), /minmax\(0, 1fr\)/);
  assert.match(read('packages/agency/src/lib/styles/operator-palette.css'), /prefers-reduced-motion/);
  assert(!read('packages/space/src/lib/workshop/workshop.css').includes('--radius-performance-md: 2px'));
  assert.match(read('packages/ltd/src/routes/+layout.svelte'), /src: '\/brand\/create-something-horizontal-white.svg'/);
});

test('black public chrome preserves readable owned identity assets', () => {
  const io = read('packages/io/src/lib/styles/operator.css');
  const ltd = read('packages/ltd/src/lib/operator-public.css');
  assert.match(io, /color-scheme: dark/);
  assert.match(ltd, /color-scheme: dark/);
  assert.match(io, /\.nav-logo-asset \{\s+filter: invert\(1\);\s+\}/);
  assert(!io.includes('[data-theme=\'light\']'));
  assert(!io.includes('.footer-editorial-identity__asset { filter: invert(1)'));
});
