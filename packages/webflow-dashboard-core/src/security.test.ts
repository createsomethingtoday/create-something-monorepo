import assert from 'node:assert/strict';
import test from 'node:test';
import { hasAdminAccess, isAuthorizedCronRequest, isTrustedRequestOrigin } from './security.js';

test('hasAdminAccess respects configured allowlist', () => {
  assert.equal(
    hasAdminAccess('creator@example.com', {
      adminEmailsCsv: 'admin@example.com,creator@example.com',
      environment: 'production'
    }),
    true
  );
  assert.equal(
    hasAdminAccess('other@example.com', {
      adminEmailsCsv: 'admin@example.com,creator@example.com',
      environment: 'production'
    }),
    false
  );
});

test('isAuthorizedCronRequest fails closed without a secret in production', () => {
  const request = new Request('https://dashboard.example.com/api/cron/cleanup');
  assert.equal(isAuthorizedCronRequest(request, undefined, 'production'), false);
});

test('isAuthorizedCronRequest accepts matching bearer token', () => {
  const request = new Request('https://dashboard.example.com/api/cron/cleanup', {
    headers: {
      authorization: 'Bearer secret-token'
    }
  });

  assert.equal(isAuthorizedCronRequest(request, 'secret-token', 'production'), true);
});

test('isTrustedRequestOrigin accepts same origin and trusted webflow domains', () => {
  const sameOriginRequest = new Request('https://dashboard.example.com/api/profile', {
    method: 'POST',
    headers: {
      origin: 'https://dashboard.example.com'
    }
  });
  assert.equal(
    isTrustedRequestOrigin(sameOriginRequest, 'https://dashboard.example.com', undefined, 'production'),
    true
  );

  const webflowRequest = new Request('https://dashboard.example.com/api/profile', {
    method: 'POST',
    headers: {
      origin: 'https://workspace.webflow.com'
    }
  });
  assert.equal(
    isTrustedRequestOrigin(webflowRequest, 'https://dashboard.example.com', undefined, 'production'),
    true
  );
});
