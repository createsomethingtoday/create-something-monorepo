import assert from 'node:assert/strict';
import test from 'node:test';

import { reviewPublishedTemplateUrlWithRuntime } from '../dist/tools/runtime-review.js';

function withMockFetch(handler, run) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = handler;
  return Promise.resolve()
    .then(run)
    .finally(() => {
      globalThis.fetch = originalFetch;
    });
}

test('runtime review: provided diagnostics can produce fail_hard', async () => {
  await withMockFetch(async (input) => {
    const rawUrl = typeof input === 'string' ? input : input.url;
    if (rawUrl === 'https://example.webflow.io/') {
      return new Response('<html><head><title>Example</title></head><body></body></html>', {
        status: 200,
      });
    }
    throw new Error(`Unexpected URL: ${rawUrl}`);
  }, async () => {
    const result = await reviewPublishedTemplateUrlWithRuntime({
      url: 'https://example.webflow.io/',
      includeSitemap: false,
      probe404: false,
      snippetDiagnostics: {
        snippet_present: true,
        version: '0.1.0',
        smoke_ok: false,
        ix2_available: false,
        ix3_available: false,
      },
    });

    assert.equal(result.runtime.status, 'fail_hard');
    assert.equal(result.runtime.source, 'input');
    assert.equal(
      result.merged.findings.some((item) => item.code === 'snippet_fail_hard'),
      true,
    );
  });
});

test('runtime review: provided diagnostics can produce fail_soft when interactions likely', async () => {
  const html = `
    <html>
      <head><title>Example</title></head>
      <body>
        <div data-w-id="interaction-123"></div>
      </body>
    </html>
  `;

  await withMockFetch(async (input) => {
    const rawUrl = typeof input === 'string' ? input : input.url;
    if (rawUrl === 'https://example.webflow.io/') {
      return new Response(html, { status: 200 });
    }
    throw new Error(`Unexpected URL: ${rawUrl}`);
  }, async () => {
    const result = await reviewPublishedTemplateUrlWithRuntime({
      url: 'https://example.webflow.io/',
      includeSitemap: false,
      probe404: false,
      snippetDiagnostics: {
        snippet_present: true,
        version: '0.2.1',
        version_ok: true,
        smoke_ok: true,
        ix2_available: false,
        ix3_available: false,
      },
    });

    assert.equal(result.runtime.interactionsLikely, true);
    assert.equal(result.runtime.status, 'fail_soft');
    assert.equal(
      result.merged.findings.some((item) => item.code === 'snippet_fail_soft'),
      true,
    );
  });
});

test('runtime review: probes endpoint when diagnostics are not provided', async () => {
  await withMockFetch(async (input, init) => {
    const rawUrl = typeof input === 'string' ? input : input.url;
    if (rawUrl === 'https://example.webflow.io/') {
      return new Response('<html><head><title>Example</title></head><body></body></html>', {
        status: 200,
      });
    }

    if (rawUrl === 'https://probe.example.com/check') {
      assert.equal(init?.method, 'POST');
      return new Response(
        JSON.stringify({
          diagnostics: {
            snippet_present: true,
            version: '0.2.5',
            smoke_ok: true,
            ix2_available: true,
            ix3_available: false,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    throw new Error(`Unexpected URL: ${rawUrl}`);
  }, async () => {
    const result = await reviewPublishedTemplateUrlWithRuntime({
      url: 'https://example.webflow.io/',
      includeSitemap: false,
      probe404: false,
      runtimeProbeEndpoint: 'https://probe.example.com/check',
      runtimeProbeBearerToken: 'secret',
    });

    assert.equal(result.runtime.source, 'endpoint');
    assert.equal(result.runtime.status, 'pass');
    assert.equal(result.runtime.probe.attempted, true);
    assert.equal(result.runtime.probe.error, null);
  });
});

test('runtime review: warns when runtime evidence is required but unavailable', async () => {
  await withMockFetch(async (input) => {
    const rawUrl = typeof input === 'string' ? input : input.url;
    if (rawUrl === 'https://example.webflow.io/') {
      return new Response('<html><head><title>Example</title></head><body></body></html>', {
        status: 200,
      });
    }
    throw new Error(`Unexpected URL: ${rawUrl}`);
  }, async () => {
    const result = await reviewPublishedTemplateUrlWithRuntime({
      url: 'https://example.webflow.io/',
      includeSitemap: false,
      probe404: false,
      requireRuntimeEvidence: true,
    });

    assert.equal(result.runtime.status, 'unavailable');
    assert.equal(
      result.merged.findings.some(
        (item) => item.code === 'snippet_runtime_unavailable',
      ),
      true,
    );
  });
});
