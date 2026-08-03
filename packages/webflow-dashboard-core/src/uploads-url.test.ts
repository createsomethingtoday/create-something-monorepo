import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isAirtableAttachmentUrl,
  isAllowedAssetImageUrl,
  isAllowedUploadUrl
} from './uploads-url.js';

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

const AIRTABLE_URL =
  'https://v5.airtableusercontent.com/v3/u/55/55/1785794400000/r0LsDcUS2BxWEbdvhyDbmQ/UE_Z01UA21N2lBRnYNMUD/mmHcRUPc7IsvzLfXQEI6G0vV6yC';

test('isAirtableAttachmentUrl accepts Airtable-hosted attachments', () => {
  assert.equal(isAirtableAttachmentUrl(AIRTABLE_URL), true);
  assert.equal(isAirtableAttachmentUrl('https://airtableusercontent.com/v3/u/55/x'), true);
});

test('isAirtableAttachmentUrl rejects look-alike and insecure hosts', () => {
  // Suffix matching must not be fooled by a host that merely ends in the name.
  assert.equal(isAirtableAttachmentUrl('https://evil-airtableusercontent.com/x.webp'), false);
  assert.equal(isAirtableAttachmentUrl('https://airtableusercontent.com.evil.example/x.webp'), false);
  assert.equal(isAirtableAttachmentUrl('http://v5.airtableusercontent.com/x.webp'), false);
  assert.equal(isAirtableAttachmentUrl('https://evil.example/x.webp'), false);
  assert.equal(isAirtableAttachmentUrl('/api/uploads/x.webp'), false);
});

test('isAllowedAssetImageUrl accepts fresh uploads and unchanged Airtable images', () => {
  assert.equal(isAllowedAssetImageUrl(`${ORIGIN}/api/uploads/abc/thumb.webp`, ORIGIN), true);
  assert.equal(isAllowedAssetImageUrl('/api/uploads/abc/thumb.webp', ORIGIN), true);
  assert.equal(isAllowedAssetImageUrl(AIRTABLE_URL, ORIGIN), true);
});

test('isAllowedAssetImageUrl rejects arbitrary remote images', () => {
  assert.equal(isAllowedAssetImageUrl('https://evil.example/payload.webp', ORIGIN), false);
  assert.equal(isAllowedAssetImageUrl('https://evil.example/api/uploads/x.webp', ORIGIN), false);
  assert.equal(isAllowedAssetImageUrl('data:image/webp;base64,AAAA', ORIGIN), false);
});
