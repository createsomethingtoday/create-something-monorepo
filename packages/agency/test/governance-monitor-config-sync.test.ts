import assert from 'node:assert/strict';
import test from 'node:test';

import {
	buildSyncPlan,
	isPlaceholderSecretValue,
	parseInfisicalExportJson,
	readSecretRecordsFromEnv,
	redactSyncPlan,
	summarizeSecretRecords,
	validateRequiredSecrets
} from '../scripts/lib/governance-monitor-config-sync.mjs';

const completeRecords = {
	AGENCY_INTERNAL_API_KEY: 'internal-prod-key',
	SLACK_BOT_TOKEN: 'xoxb-real-token',
	GOVERNANCE_SLACK_CHANNELS: 'C123|#api-updates|atlas_canvas|atlas_node',
	GOVERNANCE_SLACK_WORKSPACE_URL: 'https://example.slack.com'
};

test('validateRequiredSecrets rejects missing and placeholder monitor values', () => {
	const summaries = summarizeSecretRecords({
		AGENCY_INTERNAL_API_KEY: 'internal-prod-key',
		SLACK_BOT_TOKEN: '*not found*',
		GOVERNANCE_SLACK_CHANNELS: ''
	});
	const validation = validateRequiredSecrets(summaries);

	assert.equal(validation.ok, false);
	assert.deepEqual(validation.missing, ['GOVERNANCE_SLACK_CHANNELS']);
	assert.deepEqual(validation.placeholder, ['SLACK_BOT_TOKEN']);
});

test('isPlaceholderSecretValue catches common secret-manager placeholders', () => {
	for (const value of ['*not found*', 'replace-me', 'CHANGE_ME', 'your-token-here', '<secret>', 'xoxb-test']) {
		assert.equal(isPlaceholderSecretValue(value), true, value);
	}

	assert.equal(isPlaceholderSecretValue('xoxb-real-token'), false);
	assert.equal(isPlaceholderSecretValue('C123|#api-updates'), false);
});

test('buildSyncPlan routes only the internal key to GitHub and monitor config to Cloudflare', () => {
	const plan = buildSyncPlan(completeRecords, {
		githubRepo: 'owner/repo',
		cloudflareProjectName: 'agency-pages',
		cloudflareAccountId: 'cf-account'
	});

	assert.equal(plan.ok, true);
	assert.deepEqual(
		plan.steps.map((step) => [step.target, step.name]),
		[
			['github_actions', 'AGENCY_INTERNAL_API_KEY'],
			['cloudflare_pages', 'AGENCY_INTERNAL_API_KEY'],
			['cloudflare_pages', 'SLACK_BOT_TOKEN'],
			['cloudflare_pages', 'GOVERNANCE_SLACK_CHANNELS'],
			['cloudflare_pages', 'GOVERNANCE_SLACK_WORKSPACE_URL']
		]
	);
});

test('redactSyncPlan never places secret values in planned argv output', () => {
	const plan = buildSyncPlan(completeRecords, {
		githubRepo: 'owner/repo',
		cloudflareProjectName: 'agency-pages',
		cloudflareAccountId: 'cf-account'
	});
	const redacted = redactSyncPlan(plan);
	const printedPlan = JSON.stringify(redacted);

	for (const secretValue of Object.values(completeRecords)) {
		assert.equal(printedPlan.includes(secretValue), false, secretValue);
	}

	assert.equal(printedPlan.includes('secret-value-from-stdin'), true);
});

test('readSecretRecordsFromEnv and parseInfisicalExportJson normalize source values', () => {
	const envRecords = readSecretRecordsFromEnv(
		{
			AGENCY_INTERNAL_API_KEY: ' internal-prod-key ',
			SLACK_BOT_TOKEN: 'xoxb-real-token',
			GOVERNANCE_SLACK_CHANNELS: 'C123|#api-updates'
		},
		['AGENCY_INTERNAL_API_KEY', 'SLACK_BOT_TOKEN', 'GOVERNANCE_SLACK_CHANNELS']
	);
	assert.deepEqual(envRecords, {
		AGENCY_INTERNAL_API_KEY: 'internal-prod-key',
		SLACK_BOT_TOKEN: 'xoxb-real-token',
		GOVERNANCE_SLACK_CHANNELS: 'C123|#api-updates'
	});

	assert.deepEqual(
		parseInfisicalExportJson(
			JSON.stringify([
				{ key: 'AGENCY_INTERNAL_API_KEY', value: 'internal-prod-key' },
				{ key: 'SLACK_BOT_TOKEN', value: 'xoxb-real-token' }
			])
		),
		{
			AGENCY_INTERNAL_API_KEY: 'internal-prod-key',
			SLACK_BOT_TOKEN: 'xoxb-real-token'
		}
	);
});
