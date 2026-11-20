import assert from 'node:assert/strict';
import test from 'node:test';
import { previewLinkForValidation, runPublishedSiteValidation } from '../src/validation.js';

const PREVIEW = 'https://preview.webflow.com/preview/example-template?utm_medium=preview_link&preview=0123456789abcdef0123456789abcdef&workflow=preview';
const SITE = 'https://example-template.webflow.io/';

test('the preview link is used only for the asset of the published site', () => {
  assert.equal(previewLinkForValidation({ websiteUrl: SITE, previewSiteUrl: PREVIEW }, 'https://example-template.webflow.io/about'), PREVIEW);
  assert.equal(previewLinkForValidation({ websiteUrl: 'https://other-template.webflow.io/', previewSiteUrl: PREVIEW }, SITE), undefined);
  assert.equal(previewLinkForValidation({ websiteUrl: SITE }, SITE), undefined);
  assert.equal(previewLinkForValidation(null, SITE), undefined);
});

test('a value that is not a Webflow preview link is not sent', () => {
  for (const previewSiteUrl of [
    'https://example.com/preview/example-template?preview=0123456789abcdef0123456789abcdef',
    'http://preview.webflow.com/preview/example-template?preview=0123456789abcdef0123456789abcdef',
    'https://preview.webflow.com/preview/example-template?preview=short',
    'https://preview.webflow.com/preview/example-template',
  ]) {
    assert.equal(previewLinkForValidation({ websiteUrl: SITE, previewSiteUrl }, SITE), undefined);
  }
});

function workerFetcher(bodies: unknown[]) {
  return (async (_url: unknown, init?: { body?: unknown }) => {
    bodies.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify({}), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;
}

test('the validation worker gets the preview link in its options, and the caveat names the source', async () => {
  const bodies: any[] = [];
  const result = await runPublishedSiteValidation({ published_url: SITE, checks: ['webflow_way'], preview_url: PREVIEW }, { fetcher: workerFetcher(bodies) });
  assert.equal(bodies[0].options.previewUrl, PREVIEW);
  assert.match(result.caveats[0], /Clean up/);
});

test('without a preview link the request and the caveat are as before', async () => {
  const bodies: any[] = [];
  const result = await runPublishedSiteValidation({ published_url: SITE, checks: ['webflow_way'] }, { fetcher: workerFetcher(bodies) });
  assert.equal('previewUrl' in bodies[0].options, false);
  assert.match(result.caveats[0], /Unused styles are not checked/);
});
