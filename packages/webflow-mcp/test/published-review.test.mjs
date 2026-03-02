import assert from 'node:assert/strict';
import test from 'node:test';

import { reviewPublishedTemplateUrl } from '../dist/tools/published-review.js';

function withMockFetch(handler, run) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = handler;
  return Promise.resolve()
    .then(run)
    .finally(() => {
      globalThis.fetch = originalFetch;
    });
}

test('template_review_published_url returns consolidated findings for a published page', async () => {
  const pageHtml = `
    <html data-wf-site="site_123" data-wf-page="page_123">
      <head>
        <title>Example Template</title>
      </head>
      <body>
        <a>Missing href</a>
        <a href="#">Placeholder href</a>
        <a href="https://external.example.com" target="_blank">External</a>
        <img src="/hero.webp">
        <form>
          <input id="email" type="text" />
        </form>
        <label for="name">Name</label>
        <video autoplay src="/intro.mp4"></video>
      </body>
    </html>
  `;

  await withMockFetch(async (input) => {
    const rawUrl = typeof input === 'string' ? input : input.url;
    if (rawUrl === 'https://example.webflow.io/') {
      return new Response(pageHtml, { status: 200 });
    }
    if (rawUrl === 'https://example.webflow.io/sitemap.xml') {
      return new Response(
        `<urlset>
          <url><loc>https://example.webflow.io/</loc></url>
          <url><loc>https://example.webflow.io/about</loc></url>
        </urlset>`,
        { status: 200 },
      );
    }
    throw new Error(`Unexpected URL: ${rawUrl}`);
  }, async () => {
    const result = await reviewPublishedTemplateUrl({
      url: 'https://example.webflow.io/',
      probe404: false,
      includeSitemap: true,
    });

    assert.equal(result.environment.isLikelyWebflowHost, true);
    assert.equal(result.checksRun.includes('meta'), true);
    assert.equal(result.checksRun.includes('sitemap'), true);

    assert.ok(result.summary.totalFindings > 0);
    assert.ok(result.summary.byCheck.meta >= 1);
    assert.ok(result.summary.byCheck.links >= 1);
    assert.ok(result.summary.byCheck.images >= 1);
    assert.ok(result.summary.byCheck.forms >= 1);
    assert.ok(result.summary.byCheck.media >= 1);

    const sitemap = result.checks.sitemap;
    assert.equal(typeof sitemap, 'object');
    assert.equal(sitemap.count, 2);
  });
});

test('template_review_published_url rejects invalid URLs', async () => {
  await assert.rejects(
    () =>
      reviewPublishedTemplateUrl({
        url: 'not-a-url',
      }),
    /requires a valid http\(s\) URL/,
  );
});

test('template_review_published_url adds warning when 404 probe does not look like 404', async () => {
  await withMockFetch(async (input) => {
    const rawUrl = typeof input === 'string' ? input : input.url;
    if (rawUrl === 'https://example.webflow.io/') {
      return new Response('<html><head><title>OK</title></head><body><h1>Home</h1></body></html>', { status: 200 });
    }
    if (rawUrl.startsWith('https://example.webflow.io/__wf_mcp_404_probe_')) {
      return new Response('<html><head><title>Home</title></head><body>Welcome back</body></html>', { status: 200 });
    }
    if (rawUrl === 'https://example.webflow.io/sitemap.xml') {
      return new Response('<urlset></urlset>', { status: 200 });
    }
    throw new Error(`Unexpected URL: ${rawUrl}`);
  }, async () => {
    const result = await reviewPublishedTemplateUrl({
      url: 'https://example.webflow.io/',
      probe404: true,
      includeSitemap: false,
    });

    const has404Warning = result.findings.some(
      (finding) => finding.code === 'non_404_probe_response',
    );
    assert.equal(has404Warning, true);
  });
});
