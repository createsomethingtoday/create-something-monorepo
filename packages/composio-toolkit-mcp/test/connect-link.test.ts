import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAuthConfigMap, extractConnectLinkResolution } from '../index.ts';

test('extractConnectLinkResolution reads the standard connectedAccounts.link shape', () => {
  const result = extractConnectLinkResolution({
    id: 'req_123',
    status: 'pending',
    redirectUrl: 'https://example.com/oauth/start',
  });

  assert.deepEqual(result, {
    link: 'https://example.com/oauth/start',
    requestId: 'req_123',
    status: 'PENDING',
  });
});

test('extractConnectLinkResolution reads fallback authorize-style response fields', () => {
  const result = extractConnectLinkResolution({
    result: {
      connection_request_id: 'req_456',
      connection_status: 'connected',
      redirect_url: 'https://example.com/oauth/fallback',
    },
  });

  assert.deepEqual(result, {
    link: 'https://example.com/oauth/fallback',
    requestId: 'req_456',
    status: 'CONNECTED',
  });
});

test('extractConnectLinkResolution reads nested redirect fields', () => {
  const result = extractConnectLinkResolution({
    data: {
      id: 'req_789',
      status: 'active',
      redirect: {
        href: 'https://example.com/oauth/nested',
      },
    },
  });

  assert.deepEqual(result, {
    link: 'https://example.com/oauth/nested',
    requestId: 'req_789',
    status: 'ACTIVE',
  });
});

test('buildAuthConfigMap merges base and patch maps with later entries winning', () => {
  const result = buildAuthConfigMap({
    COMPOSIO_AUTH_CONFIG_MAP: JSON.stringify({
      gmail: 'ac_gmail_base',
      clickup: 'ac_clickup_stale',
    }),
    COMPOSIO_AUTH_CONFIG_MAP_PATCH_JSON: JSON.stringify({
      clickup: 'ac_clickup_live',
      zoom: 'ac_zoom_live',
    }),
  });

  assert.deepEqual(result, {
    gmail: 'ac_gmail_base',
    clickup: 'ac_clickup_live',
    zoom: 'ac_zoom_live',
  });
});

test('buildAuthConfigMap applies explicit env overrides after merged maps', () => {
  const result = buildAuthConfigMap({
    COMPOSIO_AUTH_CONFIG_MAP: JSON.stringify({
      airtable: 'ac_airtable_base',
      metaads: 'ac_meta_base',
      tiktok: 'ac_tiktok_base',
    }),
    COMPOSIO_AIRTABLE_AUTH_CONFIG_ID: 'ac_airtable_override',
    COMPOSIO_METAADS_AUTH_CONFIG_ID: 'ac_meta_override',
    COMPOSIO_TIKTOK_AUTH_CONFIG_ID: 'ac_tiktok_override',
  });

  assert.deepEqual(result, {
    airtable: 'ac_airtable_override',
    metaads: 'ac_meta_override',
    tiktok: 'ac_tiktok_override',
  });
});
