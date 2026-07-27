import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyLoopbackBootstrapSecurityHeaders,
  applyLoopbackSecurityHeaders,
  decideLoopbackRequest,
  loopbackBootstrapDocument,
  loopbackCapabilityCookie
} from '../src/lib/server/loopback-capability.js';

const token = 'a'.repeat(64);
const expectedOrigin = 'http://127.0.0.1:5290';

test('loopback capability denies unauthenticated and cross-origin callers', () => {
  assert.equal(
    decideLoopbackRequest({
      configuredToken: token,
      expectedOrigin,
      requestMethod: 'GET',
      requestUrl: new URL(`${expectedOrigin}/`)
    }),
    'deny'
  );
  assert.equal(
    decideLoopbackRequest({
      configuredToken: token,
      expectedOrigin,
      requestMethod: 'POST',
      requestUrl: new URL(`${expectedOrigin}/api/runtime/codex`),
      requestOrigin: 'http://attacker.invalid',
      cookieToken: token
    }),
    'deny'
  );
  assert.equal(
    decideLoopbackRequest({
      configuredToken: token,
      expectedOrigin,
      requestMethod: 'GET',
      requestUrl: new URL('http://localhost:5290/'),
      cookieToken: token
    }),
    'deny'
  );
});

test('loopback capability bootstraps once and then authorizes the HttpOnly cookie', () => {
  assert.equal(
    decideLoopbackRequest({
      configuredToken: token,
      expectedOrigin,
      requestMethod: 'GET',
      requestUrl: new URL(`${expectedOrigin}/?cap=${token}`),
      presentedToken: token
    }),
    'bootstrap'
  );
  assert.equal(
    decideLoopbackRequest({
      configuredToken: token,
      expectedOrigin,
      requestMethod: 'POST',
      requestUrl: new URL(`${expectedOrigin}/api/deliveries`),
      requestOrigin: 'tauri://localhost',
      cookieToken: token
    }),
    'allow'
  );
  assert.equal(
    decideLoopbackRequest({
      configuredToken: token,
      expectedOrigin,
      requestMethod: 'POST',
      requestUrl: new URL(`${expectedOrigin}/api/deliveries`),
      requestOrigin: 'http://tauri.localhost',
      cookieToken: token
    }),
    'allow'
  );
  assert.equal(
    decideLoopbackRequest({
      configuredToken: token,
      expectedOrigin,
      requestMethod: 'GET',
      requestUrl: new URL(`${expectedOrigin}/`),
      cookieToken: token
    }),
    'allow'
  );
});

test('loopback capability bootstrap is limited to the root GET and uses a same-site document hop', () => {
  assert.equal(
    decideLoopbackRequest({
      configuredToken: token,
      expectedOrigin,
      requestMethod: 'POST',
      requestUrl: new URL(`${expectedOrigin}/?cap=${token}`),
      presentedToken: token
    }),
    'deny'
  );
  assert.equal(
    decideLoopbackRequest({
      configuredToken: token,
      expectedOrigin,
      requestMethod: 'GET',
      requestUrl: new URL(`${expectedOrigin}/api/runtime/codex?cap=${token}`),
      presentedToken: token
    }),
    'deny'
  );
  assert.match(loopbackBootstrapDocument(), /http-equiv="refresh" content="0;url=\/"/);
  assert.match(loopbackBootstrapDocument(), /location\.replace\('\/'\)/);
  assert.doesNotMatch(loopbackBootstrapDocument(), new RegExp(token));
});

test('loopback responses receive restrictive local-app security headers', () => {
  const headers = new Headers();
  applyLoopbackSecurityHeaders(headers);
  assert.match(headers.get('content-security-policy') ?? '', /object-src 'none'/);
  assert.equal(headers.get('referrer-policy'), 'no-referrer');
  assert.equal(headers.get('x-frame-options'), 'DENY');
  assert.match(headers.get('permissions-policy') ?? '', /camera=\(\)/);

  const generated = new Headers({ 'content-security-policy': "script-src 'nonce-generated'" });
  applyLoopbackSecurityHeaders(generated);
  assert.equal(generated.get('content-security-policy'), "script-src 'nonce-generated'");

  const desktop = new Headers({
    'content-security-policy': "script-src 'nonce-generated'; connect-src 'self'; object-src 'none'"
  });
  applyLoopbackSecurityHeaders(desktop, expectedOrigin);
  assert.match(
    desktop.get('content-security-policy') ?? '',
    /connect-src 'self' http:\/\/127\.0\.0\.1:5290/
  );

  const preview = new Headers();
  applyLoopbackSecurityHeaders(preview, expectedOrigin, true);
  assert.match(preview.get('content-security-policy') ?? '', /frame-ancestors 'self'/);
  assert.equal(preview.get('x-frame-options'), 'SAMEORIGIN');
  assert.equal(preview.get('cross-origin-resource-policy'), 'same-origin');

  const generatedPreview = new Headers({
    'content-security-policy': "default-src 'self'; object-src 'none'"
  });
  applyLoopbackSecurityHeaders(generatedPreview, expectedOrigin, true);
  assert.match(generatedPreview.get('content-security-policy') ?? '', /frame-ancestors 'self'/);
  assert.match(generatedPreview.get('content-security-policy') ?? '', /default-src 'self'/);
  assert.doesNotMatch(generatedPreview.get('content-security-policy') ?? '', /connect-src/);

  const noConnect = new Headers({ 'content-security-policy': "connect-src 'none'" });
  applyLoopbackSecurityHeaders(noConnect, expectedOrigin);
  assert.equal(noConnect.get('content-security-policy'), `connect-src ${expectedOrigin}`);
});

test('bootstrap security permits only the fixed clean-URL transition script', () => {
  const headers = new Headers();
  applyLoopbackBootstrapSecurityHeaders(headers);
  const policy = headers.get('content-security-policy') ?? '';
  assert.match(policy, /script-src 'sha256-qBjLReXPsRLHPao6\+8nICoVlbEWZcc\/Os2pcXx5BCa0='/);
  assert.doesNotMatch(policy, /unsafe-inline/);
});

test('bootstrap cookie is HttpOnly, host-only, and usable for a top-level loopback handoff', () => {
  assert.equal(
    loopbackCapabilityCookie(token),
    `cs_workspace_capability=${token}; Path=/; HttpOnly; SameSite=Lax`
  );
  assert.doesNotMatch(loopbackCapabilityCookie(token), /Domain=|Secure/);
});
