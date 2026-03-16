import assert from 'node:assert/strict';
import test from 'node:test';

import {
	buildManagedBearerLaunchUrl,
	buildManagedBearerLaunchUrlPreview,
	normalizeManagedBearerDeliveryTransport,
	resolvePasswordlessLaneUrlDeliveryApproval,
} from '../src/lib/server/passwordless-lane-delivery.ts';

test('normalizeManagedBearerDeliveryTransport defaults to header for backward compatibility', () => {
	assert.equal(normalizeManagedBearerDeliveryTransport(undefined), 'header');
	assert.equal(normalizeManagedBearerDeliveryTransport('header'), 'header');
	assert.equal(normalizeManagedBearerDeliveryTransport('url_query'), 'url_query');
	assert.equal(normalizeManagedBearerDeliveryTransport('unexpected'), 'header');
});

test('resolvePasswordlessLaneUrlDeliveryApproval requires explicit lane opt-in', () => {
	assert.equal(resolvePasswordlessLaneUrlDeliveryApproval({}, 'viv-blondish'), null);

	const approval = resolvePasswordlessLaneUrlDeliveryApproval(
		{
			passwordless_delivery: {
				enabled: true,
				approved_by: 'mj',
			},
		},
		'viv-blondish',
	);

	assert.equal(approval?.enabled, true);
	assert.equal(approval?.approvedBy, 'mj');
	assert.equal(approval?.allowedScope, 'interactive_named_lane:viv-blondish');
});

test('resolvePasswordlessLaneUrlDeliveryApproval falls back to approved exception metadata', () => {
	const approval = resolvePasswordlessLaneUrlDeliveryApproval(
		{
			passwordless_delivery: {
				enabled: true,
			},
			approved_exception: {
				approved_by: 'mj',
				approved_at: '2026-03-16T00:00:00Z',
				expiration_or_review_date: '2026-04-15T00:00:00Z',
				reason: 'Named lane pilot',
				allowed_scope: 'interactive_named_lane:viv-blondish',
			},
		},
		'viv-blondish',
	);

	assert.equal(approval?.approvedBy, 'mj');
	assert.equal(approval?.approvedAt, '2026-03-16T00:00:00Z');
	assert.equal(approval?.expirationOrReviewDate, '2026-04-15T00:00:00Z');
	assert.equal(approval?.reason, 'Named lane pilot');
});

test('buildManagedBearerLaunchUrl uses mcp_access_token instead of the legacy token query param', () => {
	const launchUrl = buildManagedBearerLaunchUrl(
		'https://viv-blondish.mcp.createsomething.agency/mcp',
		'mcpu_secret_token',
	);
	const previewUrl = buildManagedBearerLaunchUrlPreview(
		'https://viv-blondish.mcp.createsomething.agency/mcp',
		'mcpu_secr...oken',
	);

	const launch = new URL(launchUrl);
	const preview = new URL(previewUrl);
	assert.equal(launch.searchParams.get('mcp_access_token'), 'mcpu_secret_token');
	assert.equal(launch.searchParams.get('token'), null);
	assert.equal(preview.searchParams.get('mcp_access_token'), 'mcpu_secr...oken');
});
