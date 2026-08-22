import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyRequestFailure } from '../scripts/public-ga-browser-policy.mjs';

const origin = 'https://createsomething.agency';

test('only the Cloudflare-managed RUM abort is excluded from product request failures', () => {
  assert.equal(
    classifyRequestFailure(
      { url: `${origin}/cdn-cgi/rum?`, error: 'net::ERR_ABORTED' },
      origin
    ),
    'cloudflare-rum-aborted'
  );
  assert.equal(
    classifyRequestFailure(
      { url: `${origin}/cdn-cgi/rum?`, error: 'net::ERR_FAILED' },
      origin
    ),
    'required'
  );
  assert.equal(
    classifyRequestFailure(
      { url: `${origin}/cdn-cgi/trace`, error: 'net::ERR_ABORTED' },
      origin
    ),
    'required'
  );
  assert.equal(
    classifyRequestFailure(
      { url: 'https://static.cloudflareinsights.com/beacon.min.js', error: 'net::ERR_ABORTED' },
      origin
    ),
    'required'
  );
});
