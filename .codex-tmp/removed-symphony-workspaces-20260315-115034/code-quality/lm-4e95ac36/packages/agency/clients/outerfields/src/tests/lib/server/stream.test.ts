import { describe, expect, it } from 'vitest';
import { buildPublicHlsUrl, buildSignedHlsUrl } from '$lib/server/stream';

describe('stream playback URL builders', () => {
	it('builds signed playback URLs on videodelivery.net', () => {
		const token = 'signed_playback_token';
		expect(buildSignedHlsUrl(token)).toBe(`https://videodelivery.net/${token}/manifest/video.m3u8`);
	});

	it('supports legacy two-argument signed URL calls', () => {
		const token = 'signed_playback_token';
		expect(buildSignedHlsUrl('legacy_customer_code', token)).toBe(
			`https://videodelivery.net/${token}/manifest/video.m3u8`
		);
	});

	it('builds public playback URLs on videodelivery.net', () => {
		const streamUid = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
		expect(buildPublicHlsUrl(streamUid)).toBe(
			`https://videodelivery.net/${streamUid}/manifest/video.m3u8`
		);
	});

	it('supports legacy two-argument public URL calls', () => {
		const streamUid = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
		expect(buildPublicHlsUrl('legacy_customer_code', streamUid)).toBe(
			`https://videodelivery.net/${streamUid}/manifest/video.m3u8`
		);
	});
});
