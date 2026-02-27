import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateBayesianConfidence } from '../dist/tools/plagiarism.js';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function withMockFetch(handler, run) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = handler;
  return Promise.resolve()
    .then(run)
    .finally(() => {
      globalThis.fetch = originalFetch;
    });
}

test('URL-vs-URL uses vector compare primary and skips compute/confidence', async () => {
  const calls = [];

  await withMockFetch(async (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    calls.push({ url, method: init?.method ?? 'GET' });

    if (url.endsWith('/api/compare')) {
      return jsonResponse({
        originalUrl: 'https://a.example.com/',
        allegedCopyUrl: 'https://b.example.com/',
        vectorSimilarity: {
          html_similarity: 0.91,
          css_similarity: 0.93,
          js_similarity: 0.88,
          webflow_similarity: 0.7,
          dom_similarity: 0.89,
          overall: 0.9,
          verdict: 'high_similarity',
        },
      });
    }

    if (url.endsWith('/compute/confidence')) {
      return jsonResponse({
        confidence: { probability: 0, verdict: 'no_plagiarism', factors: [] },
        evidence: {
          cssSimilarity: 0,
          jsSimilarity: 0,
          frameworkMatch: 0,
          structuralSimilarity: 0,
        },
      });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  }, async () => {
    const result = await calculateBayesianConfidence(
      'https://a.example.com/',
      'https://b.example.com/'
    );

    assert.equal(result.source, 'vector_fallback');
  });

  assert.equal(calls.some((call) => call.url.endsWith('/compute/confidence')), false);
  assert.equal(calls.filter((call) => call.url.endsWith('/api/compare')).length, 1);
});

test('ID/slug path keeps compute/confidence as primary when signal is sufficient', async () => {
  const calls = [];

  await withMockFetch(async (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    calls.push({ url, method: init?.method ?? 'GET' });

    if (url.endsWith('/compute/confidence')) {
      return jsonResponse({
        confidence: {
          probability: 0.72,
          prior: 0.15,
          likelihood: 0.85,
          verdict: 'likely',
          factors: [{ name: 'cssSimilarity', weight: 0.25, value: 0.8, contribution: 0.2 }],
        },
        evidence: {
          cssSimilarity: 0.8,
          jsSimilarity: 0.7,
          frameworkMatch: 0.6,
          structuralSimilarity: 0.75,
        },
      });
    }

    if (url.endsWith('/api/compare')) {
      throw new Error('vector compare should not be called for strong compute confidence');
    }

    throw new Error(`Unexpected fetch: ${url}`);
  }, async () => {
    const result = await calculateBayesianConfidence('slug-a', 'slug-b');
    assert.equal(result.source, 'compute_confidence');
    assert.equal(result.confidence.verdict, 'likely');
  });

  assert.equal(calls.filter((call) => call.url.endsWith('/compute/confidence')).length, 1);
  assert.equal(calls.some((call) => call.url.endsWith('/api/compare')), false);
});

test('ID/slug low-signal compute path still falls back to vector compare', async () => {
  const calls = [];

  await withMockFetch(async (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    calls.push({ url, method: init?.method ?? 'GET' });

    if (url.endsWith('/compute/confidence')) {
      return jsonResponse({
        confidence: {
          probability: 0.05,
          prior: 0.15,
          likelihood: 0.01,
          verdict: 'no_plagiarism',
          factors: [],
        },
        evidence: {
          cssSimilarity: 0.01,
          jsSimilarity: 0.01,
          frameworkMatch: 0.01,
          structuralSimilarity: 0.01,
        },
      });
    }

    if (url.endsWith('/api/compare')) {
      return jsonResponse({
        originalUrl: 'https://slug-a.webflow.io/',
        allegedCopyUrl: 'https://slug-b.webflow.io/',
        vectorSimilarity: {
          html_similarity: 0.95,
          css_similarity: 0.94,
          js_similarity: 0.9,
          webflow_similarity: 0.96,
          dom_similarity: 0.91,
          overall: 0.93,
          verdict: 'high_similarity',
        },
      });
    }

    if (url === 'https://slug-a.webflow.io/' || url === 'https://slug-b.webflow.io/') {
      return new Response('<html><body class="w-nav custom-hero"></body></html>', { status: 200 });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  }, async () => {
    const result = await calculateBayesianConfidence('slug-a', 'slug-b');
    assert.equal(result.source, 'vector_fallback');
  });

  assert.equal(calls.some((call) => call.url.endsWith('/compute/confidence')), true);
  assert.equal(calls.some((call) => call.url.endsWith('/api/compare')), true);
});

test('URL-vs-URL throws when vector compare is unavailable and does not call compute', async () => {
  const calls = [];

  await withMockFetch(async (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    calls.push({ url, method: init?.method ?? 'GET' });

    if (url.endsWith('/api/compare')) {
      return jsonResponse({
        originalUrl: 'https://a.example.com/',
        allegedCopyUrl: 'https://b.example.com/',
      });
    }

    if (url.endsWith('/compute/confidence')) {
      throw new Error('compute/confidence should not be called for URL-vs-URL');
    }

    throw new Error(`Unexpected fetch: ${url}`);
  }, async () => {
    await assert.rejects(
      () => calculateBayesianConfidence('https://a.example.com/', 'https://b.example.com/'),
      /Vector fallback returned no similarity data for URL pair/
    );
  });

  assert.equal(calls.some((call) => call.url.endsWith('/compute/confidence')), false);
  assert.equal(calls.some((call) => call.url.endsWith('/api/compare')), true);
});
