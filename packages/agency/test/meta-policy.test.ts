import assert from 'node:assert/strict';
import test from 'node:test';
import { isMetaPublicPath, sanitizeMetaPageUrl } from '../src/lib/analytics/meta-policy.ts';

test('allows only explicitly public marketing pages and drops query and fragment data', () => {
  assert.equal(sanitizeMetaPageUrl(new URL('https://createsomething.agency/services?utm_campaign=example&fbclid=private#section')), 'https://createsomething.agency/services');
  assert.equal(sanitizeMetaPageUrl(new URL('http://localhost:3003/contact?utm_source=instagram')), 'https://createsomething.agency/contact');
  assert.equal(isMetaPublicPath('/'), true);
  assert.equal(isMetaPublicPath('/contact'), true);
});

test('excludes private, encoded, unrecognized and credential-bearing routes', () => {
  for (const path of ['/map/share/private', '/map/workspace/123', '/map/subscribe', '/admin', '/account', '/login', '/auth/callback', '/api/contact', '/delivery/abundance', '/support-brief', '/services%2fprivate', '/%63ontact', '//contact', '/case-studies/private-client']) {
    assert.equal(isMetaPublicPath(path), false, path);
    assert.equal(sanitizeMetaPageUrl(new URL(`https://createsomething.agency${path}`)), undefined, path);
  }
  for (const value of ['https://example.com/contact', 'http://createsomething.agency/contact', 'https://createsomething.agency/book?token=private', 'https://createsomething.agency/book?bookingId=private', 'https://createsomething.agency/contact?email=private', 'https://createsomething.agency/contact?unknown=private', 'https://user:private@createsomething.agency/contact']) {
    assert.equal(sanitizeMetaPageUrl(new URL(value)), undefined, value);
  }
});
