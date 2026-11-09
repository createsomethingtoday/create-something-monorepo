import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../ui/app.css', import.meta.url), 'utf8');
const surfaces = ['work', 'quest', 'navigation'];
test('reconciled surfaces retain the required Astryx component foundation', () => {
  for (const name of surfaces) {
    const source = readFileSync(new URL(`../ui/dev-${name}.jsx`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /<(?:div|span)\b/, `${name}: raw layout/text containers bypass Astryx`);
    assert.doesNotMatch(source, /import\s+["'][^"']+\.css["']/, `${name}: product style rules belong to the shared stylesheet`);
  }
});
test('reconciled product styles do not recreate ordinary Astryx layout or spacing', () => {
  for (const name of surfaces) {
    const marker = `GIGI_RECONCILED_${name.toUpperCase()}_STATES`;
    const section = css.split(`/* ${marker}_START */`)[1]?.split(`/* ${marker}_END */`)[0];
    assert.ok(section, `${name}: scoped product states must be reviewable`);
    assert.doesNotMatch(section, /\b(?:display\s*:\s*(?:flex|grid)|grid-template[^:]*\s*:|(?:row-|column-)?gap\s*:|padding(?:-[\w-]+)?\s*:|(?:align-items|justify-content|flex-direction|flex-wrap)\s*:)/,
      `${name}: ordinary layout and spacing belong to component props`);
    assert.doesNotMatch(section, /#[\da-fA-F]{3,8}\b|\b\d+(?:\.\d+)?px\b/, `${name}: use theme tokens`);
  }
});
