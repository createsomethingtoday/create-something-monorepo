import assert from 'node:assert/strict';
import test from 'node:test';

import {
	resolveEffectiveAllowedToolPrefixes,
	resolveMcpHostBindingFailure,
} from '../src/index.ts';

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

test('Webflow template reviewer accounts resolve on the shared Claude/Gumloop host', () => {
	const prefixes = resolveEffectiveAllowedToolPrefixes({
		accountId: 'acct_wf_eric',
		tenantId: 'tenant_webflow_marketplace',
		host: 'wf-template-review',
		boundHost: 'wf-template-review',
		allowedToolPrefixes: [],
	});

	assert.equal(prefixes?.length, 17);
	assert.ok(prefixes?.includes('webflow-template-review-mcp__template_review_assign_self'));
	assert.ok(prefixes?.includes('webflow-template-review-mcp__template_review_save_draft_feedback'));
	assert.equal(prefixes?.includes('webflow-template-review-mcp__template_review_assign_reviewer'), false);
});

test('Webflow template reviewer-specific tokens can resolve on the shared connector host', () => {
	assert.equal(
		resolveMcpHostBindingFailure({
			boundHost: 'wf-template-review-eric',
			resourceHost: 'wf-template-review',
		}),
		null,
	);
	assert.equal(
		resolveMcpHostBindingFailure({
			boundHost: 'wf-template-review-eric.mcp.createsomething.agency',
			resourceHost: 'https://wf-template-review.mcp.createsomething.agency/mcp',
		}),
		null,
	);
});

test('shared Webflow template review tokens do not resolve on reviewer-specific hosts', () => {
	assert.equal(
		resolveMcpHostBindingFailure({
			boundHost: 'wf-template-review',
			resourceHost: 'wf-template-review-eric',
		}),
		'host_mismatch',
	);
});

test('non-reviewer accounts on the shared Webflow template review host do not inherit reviewer tools', () => {
	assert.deepEqual(
		resolveEffectiveAllowedToolPrefixes({
			accountId: 'acct_external',
			host: 'wf-template-review',
			boundHost: 'wf-template-review',
			allowedToolPrefixes: [],
		}),
		[],
	);
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
