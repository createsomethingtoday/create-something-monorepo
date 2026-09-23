import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { buildData, renderHtml } from './build.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const assets = {
  template: readFileSync(join(root, 'src', 'template.html'), 'utf8'),
  styles: readFileSync(join(root, 'src', 'styles.css'), 'utf8'),
  app: readFileSync(join(root, 'src', 'app.js'), 'utf8'),
  mdx: readFileSync(join(here, 'mdx.mjs'), 'utf8'),
};

test('data island covers every page with baseline == working on a fresh build', () => {
  const data = buildData();
  assert.equal(data.baseline.pages.length, 7);
  assert.deepEqual(
    data.working.pages.map((p) => p.slug),
    data.baseline.pages.map((p) => p.slug),
  );
  for (const p of data.working.pages) for (const s of p.sections) assert.ok(data.working.registry[s.id], `registry row for ${s.id}`);
  assert.equal(data.working.changelog.length, 0);
});

test('a previous working copy is carried forward', () => {
  const previous = { working: { pages: [{ slug: 'x', sections: [] }], registry: {}, changelog: [{ summary: 'kept' }] } };
  const data = buildData({ previous });
  assert.equal(data.working.changelog[0].summary, 'kept');
  assert.equal(data.baseline.pages.length, 7, 'baseline still rebuilt from source');
});

test('rendered html is self-contained, under the wrop limit, and parses as a script', () => {
  const data = buildData();
  const html = renderHtml(data, assets);
  assert.ok(html.length < 2 * 1024 * 1024, `html is ${html.length} bytes`);
  assert.ok(!html.includes('__DATA__'));
  assert.ok(!html.includes('/*__APP__*/'));
  assert.ok(!/^export\s/m.test(html.slice(html.indexOf('<script>'))), 'no ESM export keywords left in inline script');
  assert.ok(!/<script src=|https:\/\/cdn|esm\.sh/.test(html), 'no external scripts');
  const island = html.match(/<script id="wfgr-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(island, 'data island present');
  const parsed = JSON.parse(island[1].replace(/<\\\/script/g, '</script'));
  assert.equal(parsed.baseline.pages.length, 7);
  const script = html.match(/<script>\n([\s\S]*)<\/script>\n<\/body>/)[1];
  // Syntax-check only: wrap so top-level statements run nothing.
  assert.doesNotThrow(() => new vm.Script(`(function(){${script.replace(/^\(\(\) => \{/, '').replace(/\}\)\(\);\s*$/, '')}})`));
});

test('data island escapes closing script tags in content', () => {
  const data = buildData();
  data.working.pages[0].sections[0].raw += '\n<script>alert(1)</script>';
  const html = renderHtml(data, assets);
  const island = html.match(/<script id="wfgr-data" type="application\/json">([\s\S]*?)<\/script>/)[1];
  assert.ok(!island.includes('</script>'));
});
