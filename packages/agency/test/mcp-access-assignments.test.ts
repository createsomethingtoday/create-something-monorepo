import test from 'node:test';
import assert from 'node:assert/strict';

import { listMcpAccessAssignments } from '../src/lib/server/mcp-access-assignments.ts';
import { resolveManagedBearerTokenScopeValues } from '../src/lib/server/mcp-token-issuance.ts';

test('legacy Webflow reviewer lanes carry the current Phase A exact tool surface', async () => {
	const assignments = await listMcpAccessAssignments(undefined, {
		email: 'eric@example.com',
		accountId: 'acct_wf_eric',
		tenantId: 'acct_wf_eric',
		workspaceAccountId: 'acct_wf_eric',
		authSubject: 'auth0|eric',
	});

	assert.equal(assignments.length, 1);
	const assignment = assignments[0]!;
	assert.equal(assignment.laneKey, 'wf_eric');
	assert.deepEqual(assignment.toolkitProfile, []);
	assert.equal(assignment.allowedToolPrefixes.length, 23);
	assert.ok(assignment.allowedToolPrefixes.includes('webflow-template-review-mcp__template_review_get_metrics'));
	assert.ok(
		assignment.allowedToolPrefixes.includes(
			'webflow-template-review-mcp__template_review_run_published_site_validation',
		),
	);
	assert.ok(assignment.allowedToolPrefixes.includes('webflow-template-review-mcp__template_review_request_changes'));
	assert.ok(assignment.allowedToolPrefixes.includes('webflow-template-review-mcp__template_review_set_review_status'));
	assert.ok(
		assignment.allowedToolPrefixes.includes(
			'webflow-template-review-mcp__template_review_get_comprehensive_review_contract',
		),
	);
	assert.ok(
		assignment.allowedToolPrefixes.includes(
			'webflow-template-review-mcp__template_review_format_agent_review_feedback',
		),
	);
	assert.ok(
		assignment.allowedToolPrefixes.includes(
			'webflow-template-review-mcp__template_review_prepare_published_site_sandbox',
		),
	);
	assert.ok(assignment.allowedToolPrefixes.includes('webflow-template-review-mcp__template_review_save_agent_feedback'));
	assert.ok(assignment.allowedToolPrefixes.includes('webflow-template-review-mcp__template_review_save_draft_feedback'));
	assert.ok(assignment.allowedToolPrefixes.includes('webflow-reviewer-exceptions-mcp__reviewer_exceptions_'));
	assert.equal(
		assignment.allowedToolPrefixes.includes('webflow-template-review-mcp__template_review_assign_reviewer'),
		false,
	);
});

test('managed bearer issuance prefers lane prefixes over request body overrides', () => {
	const result = resolveManagedBearerTokenScopeValues({
		assignment: {
			toolkitProfile: [],
			allowedToolPrefixes: [
				'webflow-template-review-mcp__template_review_get_metrics',
				'webflow-template-review-mcp__template_review_assign_self',
			],
		},
		requestedToolkitProfile: ['gmail'],
		requestedAllowedToolPrefixes: ['composio-toolkit-gmail__'],
	});

	assert.deepEqual(result, {
		toolkitProfile: [],
		allowedToolPrefixes: [
			'webflow-template-review-mcp__template_review_get_metrics',
			'webflow-template-review-mcp__template_review_assign_self',
		],
	});
});

test('managed bearer issuance falls back to the request body when no lane assignment exists', () => {
	const result = resolveManagedBearerTokenScopeValues({
		assignment: null,
		requestedToolkitProfile: ['gmail', 'gmail', ' slack '],
		requestedAllowedToolPrefixes: ['composio-toolkit-gmail__', 'composio-toolkit-gmail__', ' composio-toolkit-slack__ '],
	});

	assert.deepEqual(result, {
		toolkitProfile: ['gmail', 'slack'],
		allowedToolPrefixes: ['composio-toolkit-gmail__', 'composio-toolkit-slack__'],
	});
});
