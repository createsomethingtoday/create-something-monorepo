import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/routes/scopefield/+page.svelte', import.meta.url), 'utf8');

test('Scopefield parent navigation names the Products destination', () => {
  const link = source.match(/<a\s+href="\/products"[^>]*>([\s\S]*?)<\/a>/);
  assert.ok(link, 'Product detail must offer a link to the product index');
  assert.equal(link[1].trim(), 'Products', 'The link must name its destination, not the current product');
});

// Scroll pinning was removed. Rendered keyboard, touch, no-JavaScript, print
// and reduced-motion acceptance is documented in anatomy-provenance.md.
