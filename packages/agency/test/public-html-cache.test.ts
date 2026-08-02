import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cacheSearchForRequest,
  isCacheablePublicHtmlResponse,
  shouldAttemptPublicHtmlCache,
  withPublicHtmlCacheHeaders
} from '../src/lib/server/public-html-cache.ts';

test('public HTML cache does not read query state while SvelteKit prerenders', () => {
  const guardedUrl = {
    get search(): string {
      throw new Error('prerender search access is forbidden');
    }
  };

  assert.equal(cacheSearchForRequest(guardedUrl, true), '');
  assert.equal(
    cacheSearchForRequest(new URL('https://example.test/?source=guide'), false),
    '?source=guide'
  );
});

function cacheDecision(
  overrides: Partial<Parameters<typeof shouldAttemptPublicHtmlCache>[0]> = {}
) {
  return shouldAttemptPublicHtmlCache({
    method: 'GET',
    pathname: '/',
    search: '',
    headers: new Headers(),
    ...overrides
  });
}

test('public HTML cache policy allows anonymous canonical public GETs', () => {
  assert.equal(cacheDecision(), true);
  assert.equal(cacheDecision({ pathname: '/services' }), true);
  assert.equal(cacheDecision({ pathname: '/experiments/example-paper' }), true);
});

test('public HTML cache policy skips personalized or high-variance requests', () => {
  assert.equal(cacheDecision({ method: 'POST' }), false);
  assert.equal(cacheDecision({ search: '?utm_source=newsletter' }), false);
  assert.equal(cacheDecision({ headers: new Headers({ cookie: 'session=abc' }) }), false);
  assert.equal(cacheDecision({ headers: new Headers({ authorization: 'Bearer token' }) }), false);
});

test('public HTML cache policy skips protected and API routes', () => {
  assert.equal(cacheDecision({ pathname: '/api/contact' }), false);
  assert.equal(cacheDecision({ pathname: '/admin' }), false);
  assert.equal(cacheDecision({ pathname: '/admin/security' }), false);
  assert.equal(cacheDecision({ pathname: '/dashboard' }), false);
  assert.equal(cacheDecision({ pathname: '/login' }), false);
  assert.equal(cacheDecision({ pathname: '/mcp-access/tools' }), false);
  assert.equal(cacheDecision({ pathname: '/prospects' }), false);
});

test('public HTML cache only stores successful public HTML responses', () => {
  assert.equal(
    isCacheablePublicHtmlResponse(
      new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } })
    ),
    true
  );
  assert.equal(
    isCacheablePublicHtmlResponse(
      new Response('missing', { status: 404, headers: { 'content-type': 'text/html' } })
    ),
    false
  );
  assert.equal(
    isCacheablePublicHtmlResponse(
      new Response('{}', { headers: { 'content-type': 'application/json' } })
    ),
    false
  );
  assert.equal(
    isCacheablePublicHtmlResponse(
      new Response('<!doctype html>', {
        headers: { 'content-type': 'text/html', 'set-cookie': 'session=abc' }
      })
    ),
    false
  );
  assert.equal(
    isCacheablePublicHtmlResponse(
      new Response('<!doctype html>', {
        headers: { 'cache-control': 'private', 'content-type': 'text/html' }
      })
    ),
    false
  );
});

test('public HTML cache headers mark edge cache status and ttl', () => {
  const response = withPublicHtmlCacheHeaders(
    new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } }),
    'MISS'
  );

  assert.equal(response.headers.get('x-agency-edge-cache'), 'MISS');
  assert.equal(
    response.headers.get('cache-control'),
    'public, max-age=60, s-maxage=300, stale-while-revalidate=86400'
  );
});
