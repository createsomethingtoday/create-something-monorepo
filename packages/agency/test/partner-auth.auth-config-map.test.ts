import test from 'node:test';
import assert from 'node:assert/strict';

import { getAuthConfigMap, resolveAuthConfigId } from '../src/lib/server/partner-auth.ts';

test('getAuthConfigMap merges the patch map over the base map', () => {
	const env = {
		COMPOSIO_AUTH_CONFIG_MAP_JSON: JSON.stringify({
			notion: 'ac_base_notion',
			gmail: 'ac_base_gmail',
		}),
		COMPOSIO_AUTH_CONFIG_MAP_PATCH_JSON: JSON.stringify({
			tiktok: 'ac_patch_tiktok',
			gmail: 'ac_patch_gmail',
		}),
	} as any;

	assert.deepEqual(getAuthConfigMap(env), {
		notion: 'ac_base_notion',
		gmail: 'ac_patch_gmail',
		tiktok: 'ac_patch_tiktok',
	});
});

test('resolveAuthConfigId normalizes toolkit slugs before lookup', () => {
	const env = {
		COMPOSIO_AUTH_CONFIG_MAP_JSON: JSON.stringify({
			tiktok: 'ac_patch_tiktok',
		}),
		COMPOSIO_AUTH_CONFIG_MAP_PATCH_JSON: JSON.stringify({
			video_upload: 'ac_patch_video_upload',
		}),
	} as any;

	assert.equal(resolveAuthConfigId(env, 'TikTok'), 'ac_patch_tiktok');
	assert.equal(resolveAuthConfigId(env, ' video-upload '), 'ac_patch_video_upload');
	assert.equal(resolveAuthConfigId(env, 'notion'), null);
});
