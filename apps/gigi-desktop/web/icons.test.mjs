import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { icon, entityIcon } from './icons.mjs';
import { sections } from './model.mjs';

test('all workspace destinations have decorative offline icons while labels remain text', () => {
  for (const { id } of sections) {
    const svg = icon(entityIcon(id));
    assert.match(svg, /<svg/);
    assert.match(svg, /aria-hidden="true"/);
    assert.match(svg, /focusable="false"/);
    assert.match(svg, /stroke="currentColor"/);
    assert.doesNotMatch(svg, /<title|aria-label|(?:href|src)=|<script|onload=/);
  }
  assert.throws(() => icon('untrusted-icon'), /Unknown icon/);
});

test('bundled icons retain Lucide license and exact Agency-installed SVG geometry', async () => {
  const { ICON_NODES } = await import('./lucide-icons.mjs');
  const packageRoot = new URL('../../../packages/agency/node_modules/lucide-svelte/', import.meta.url);
  assert.equal(JSON.parse(readFileSync(new URL('package.json', packageRoot))).version, '0.562.0');
  for (const [name, nodes] of Object.entries(ICON_NODES)) {
    const component = readFileSync(new URL(`dist/icons/${name}.svelte`, packageRoot), 'utf8');
    const upstream = JSON.parse(component.match(/const iconNode = (.*);/)[1]);
    assert.deepEqual(nodes, upstream, name);
  }
  assert.equal(readFileSync(new URL('./lucide-LICENSE.txt', import.meta.url), 'utf8'), readFileSync(new URL('LICENSE', packageRoot), 'utf8'));
});
