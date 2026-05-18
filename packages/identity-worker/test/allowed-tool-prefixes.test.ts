import assert from 'node:assert/strict';
import test from 'node:test';

import { getHostBindingFailure, resolveEffectiveAllowedToolPrefixes } from '../src/index.ts';

test('Webflow template reviewer accounts resolve to the current Phase A tool surface', () => {
	const prefixes = resolveEffectiveAllowedToolPrefixes({
		accountId: 'acct_wf_eric',
		tenantId: 'tenant_webflow_marketplace',
		host: 'wf-template-review-eric',
		boundHost: 'wf-template-review-eric',
		toolkitProfile: [],
		allowedToolPrefixes: ['webflow-template-review-mcp__template_review_assign_self'],
	});

	assert.equal(prefixes?.length, 17);
	assert.ok(prefixes?.includes('webflow-template-review-mcp__template_review_get_metrics'));
	assert.ok(prefixes?.includes('webflow-template-review-mcp__template_review_request_changes'));
	assert.ok(prefixes?.includes('webflow-template-review-mcp__template_review_set_review_status'));
	assert.ok(prefixes?.includes('webflow-template-review-mcp__template_review_save_draft_feedback'));
	assert.equal(prefixes?.includes('webflow-template-review-mcp__template_review_assign_reviewer'), false);
});

test('Webflow template reviewer host binding resolves stale empty prefixes to the Phase A surface', () => {
	const prefixes = resolveEffectiveAllowedToolPrefixes({
		accountId: 'acct_external',
		host: null,
		boundHost: 'wf-template-review-mariana.mcp.createsomething.agency',
		allowedToolPrefixes: [],
	});

	assert.equal(prefixes?.length, 17);
	assert.ok(prefixes?.includes('webflow-template-review-mcp__template_review_get_metrics'));
});

test('Webflow template reviewer tokens may resolve against the central review host', () => {
	assert.equal(getHostBindingFailure('wf-template-review-eric', 'wf-template-review'), null);
	assert.equal(
		getHostBindingFailure('wf-template-review-mariana.mcp.createsomething.agency', 'wf-template-review'),
		null,
	);
	assert.equal(getHostBindingFailure('wf-template-review-eric', 'c3denver'), 'host_mismatch');
});

test('non-reviewer lanes keep their stored allowed prefix behavior', () => {
	assert.deepEqual(
		resolveEffectiveAllowedToolPrefixes({
			accountId: 'acct_half_dozen',
			allowedToolPrefixes: ['composio-toolkit-gmail__'],
		}),
		['composio-toolkit-gmail__'],
	);

	assert.equal(
		resolveEffectiveAllowedToolPrefixes({
			accountId: 'acct_half_dozen',
			allowedToolPrefixes: null,
		}),
		null,
	);
});
