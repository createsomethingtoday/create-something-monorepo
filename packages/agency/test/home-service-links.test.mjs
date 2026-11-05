import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const content = readFileSync(new URL('../src/lib/content/agency-story-home.html', import.meta.url), 'utf8');
const links = [...content.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map(([, href, body]) => ({
  href,
  text: body.replace(/<[^>]*>/g, '').trim()
}));

for (const [label, href, arrow] of [
  ['Inspect actual work', '#work', '↘'],
  ['See what you keep', '#together', '↘'],
  ['Fix what keeps breaking.', '/services', '↗'],
  ["Check what you've built.", '/technical-review', '↗'],
  ['Connect your tools.', '/book?source=agency&intent=workflow-mapping&lane=workflow_infrastructure', '↗']
]) {
  test(`homepage routes "${label}" to its intended destination`, () => {
    const matches = links.filter(link => link.text.replace(/[↗↘]/g, '').trim() === label);
    assert.equal(matches.length, 1, 'Each action has one unambiguous native link');
    assert.equal(matches[0].href, href);
    assert.ok(matches[0].text.endsWith(arrow), 'Arrow matches section or page navigation');
    if (href.startsWith('#')) {
      assert.ok(content.includes(`id="${href.slice(1)}"`), 'Section target exists');
    } else {
      const route = new URL(href, 'https://createsomething.agency').pathname;
      assert.ok(readFileSync(new URL(`../src/routes${route}/+page.svelte`, import.meta.url), 'utf8'));
    }
  });
}
