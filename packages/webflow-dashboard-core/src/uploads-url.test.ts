import assert from 'node:assert/strict';
import test from 'node:test';
import { isAllowedUploadUrl } from './uploads-url.js';

const ORIGIN = 'https://dashboard.example';

test('isAllowedUploadUrl accepts uploads served by this dashboard', () => {
  assert.equal(isAllowedUploadUrl(`${ORIGIN}/api/uploads/abc/avatar.webp`, ORIGIN), true);
  assert.equal(isAllowedUploadUrl('/api/uploads/abc/avatar.webp', ORIGIN), true);
});

test('isAllowedUploadUrl rejects remote and non-upload URLs', () => {
  assert.equal(isAllowedUploadUrl('https://evil.example/avatar.webp', ORIGIN), false);
  assert.equal(isAllowedUploadUrl('https://evil.example/api/uploads/avatar.webp', ORIGIN), false);
  assert.equal(isAllowedUploadUrl(`${ORIGIN}/api/profile`, ORIGIN), false);
  assert.equal(isAllowedUploadUrl('data:image/webp;base64,AAAA', ORIGIN), false);
  assert.equal(isAllowedUploadUrl('javascript:alert(1)', ORIGIN), false);
});

test('isAllowedUploadUrl honours configured trusted origins', () => {
  assert.equal(
    isAllowedUploadUrl(
      'https://webflow-dashboard.pages.dev/api/uploads/abc/avatar.webp',
      ORIGIN,
      'https://webflow-dashboard.pages.dev'
    ),
    true
  );
  assert.equal(isAllowedUploadUrl('https://evil.example/api/uploads/x.webp', ORIGIN, 'not-a-url'), false);
});
