import test from 'node:test';
import assert from 'node:assert/strict';
import { getUrlClassifierOptions, handleUrlClassification } from './url-classifier-runtime.js';

test('canary calls are explicit while ordinary crawl calls keep incumbent routing', () => {
  const bindings = { JEV_URL_CLASSIFIER_MODE: 'canary', TYPESAFE_API_KEY: 'secret' };
  assert.equal(getUrlClassifierOptions(bindings).jev, undefined);
  assert.equal(getUrlClassifierOptions(bindings, undefined, true).jev?.apiKey, 'secret');
  assert.equal(
    getUrlClassifierOptions({ ...bindings, JEV_URL_CLASSIFIER_MODE: 'active' }).jev?.apiKey,
    'secret'
  );
  assert.equal(
    getUrlClassifierOptions({ ...bindings, JEV_URL_CLASSIFIER_MODE: 'off' }, undefined, true).jev,
    undefined
  );
});
test('classification endpoint rejects unauthenticated and invalid requests without inference', async () => {
  let calls = 0;
  const classify = async () => {
    calls++;
    return [];
  };
  const env = { WEBFLOW_SITE_ANALYZER_MCP_API_KEY: 'secret' };
  assert.equal(
    (
      await handleUrlClassification(
        new Request('https://worker/classify-urls', { method: 'POST', body: '{}' }),
        env,
        classify
      )
    ).status,
    401
  );
  const request = new Request('https://worker/classify-urls', {
    method: 'POST',
    headers: { Authorization: 'Bearer secret' },
    body: JSON.stringify({ startUrl: 'https://site.test/', urls: ['https://other.test/x'] })
  });
  assert.equal((await handleUrlClassification(request, env, classify)).status, 400);
  assert.equal(calls, 0);
});
