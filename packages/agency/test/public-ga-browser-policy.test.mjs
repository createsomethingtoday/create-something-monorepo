import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyRequestFailure, matchesRequiredText } from '../scripts/public-ga-browser-policy.mjs';

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

test('rendered CSS casing does not weaken the required pricing tokens', () => {
  assert.equal(
    matchesRequiredText('$0 BROWSER-LOCAL STARTER · ACCOUNT WORKSPACE · PRICING AT LAUNCH', '$0 browser-local starter'),
    true
  );
  assert.equal(
    matchesRequiredText('MANAGED AI OPERATIONS · FROM $900/MONTH · INCLUDES MAP', 'From $900/month'),
    true
  );
  assert.equal(matchesRequiredText('From $900 per year', 'From $900/month'), false);
  assert.equal(matchesRequiredText('$0 browser-local starter', '$0 / MIT'), false);
});
