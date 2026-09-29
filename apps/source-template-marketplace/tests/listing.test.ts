import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanRichHtml, extractListingContent, fetchListingContent } from '../lib/listingContent';
const source = 'https://webflow.com/templates/html/fleet-website-template';
test('original Fleet hierarchy and lists survive while hidden alternative license is excluded', () => {
  const html = readFileSync(new URL('./fixtures/fleet-listing.html', import.meta.url), 'utf8');
  const content = extractListingContent(
    '<div class="w-richtext">Unrelated promotion</div>' + html,
    source
  );
  assert.match(content.overview, /<h3>Design &amp; Layout<\/h3>/);
  assert.equal((content.overview.match(/<li>/g) || []).length, 8);
  assert.doesNotMatch(content.overview, /Unrelated promotion|<h3><br/);
  assert.match(content.license, /Single Use License/);
  assert.doesNotMatch(content.license, /Free License/);
});
test('rich rendering preserves author content and safe media while removing executable attributes and tags', () => {
  const html = cleanRichHtml(
    '<h2>Pages</h2><ul><li><a href="/templates">Browse</a></li></ul><img src="https://cdn.example.com/site.webp" alt="Site" onerror="alert(1)"><a href="javascript:alert(1)">Bad</a><script>alert(1)</script><iframe src="https://evil.example"></iframe><div style="position:fixed" onclick="go()">Text</div>',
    source
  );
  assert.match(html, /<h2>Pages/);
  assert.match(html, /https:\/\/webflow.com\/templates/);
  assert.match(html, /alt="Site"/);
  assert.doesNotMatch(html, /javascript:|onerror|onclick|<script|<iframe|position:fixed/);
});
test('missing description fails rather than substituting unrelated rich text', () => {
  assert.throws(
    () => extractListingContent('<div class="w-richtext">Promotion</div>', source),
    /not found/
  );
});
test('adapter refuses arbitrary URLs and path traversal before performing a request', async () => {
  await assert.rejects(fetchListingContent('../../admin'), /Invalid template slug/);
  await assert.rejects(fetchListingContent('https://example.com'), /Invalid template slug/);
});
