import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

import { performancePageRegistry } from '../../../config/performance-pages/registry.ts';

const workspaceRoot = resolve(import.meta.dirname, '../../..');
const loginSource = readFileSync(
	resolve(workspaceRoot, 'packages/ltd/src/routes/login/+page.svelte'),
	'utf8'
);
const accountSource = readFileSync(
	resolve(workspaceRoot, 'packages/ltd/src/routes/account/+page.svelte'),
	'utf8'
);
const accountServerSource = readFileSync(
	resolve(workspaceRoot, 'packages/ltd/src/routes/account/+page.server.ts'),
	'utf8'
);
const loginServerSource = readFileSync(
	resolve(workspaceRoot, 'packages/ltd/src/routes/login/+page.server.ts'),
	'utf8'
);

test('migrates the complete Canon account cohort with the tool chapter contract', () => {
	const cohort = performancePageRegistry.find((group) => group.id === 'ltd-account');

	assert.equal(cohort?.status, 'migrated');
	assert.deepEqual(cohort?.contract?.chapters.map((chapter) => chapter.id), [
		'task-state',
		'workspace',
		'decision-receipt'
	]);
});

test('gives login and account exactly three visible operator chapters', () => {
	for (const [name, source] of [
		['login', loginSource],
		['account', accountSource]
	] as const) {
		assert.equal(
			(source.match(/data-performance-chapter=/g) ?? []).length,
			3,
			`${name} should expose exactly three chapters`
		);
		for (const chapter of ['task-state', 'workspace', 'decision-receipt']) {
			assert.match(source, new RegExp(`data-performance-chapter="${chapter}"`));
		}
	}
});

test('fails closed to Canon while preserving valid local return destinations', async () => {
	const returnPathModule = await import(
		pathToFileURL(
			resolve(workspaceRoot, 'packages/ltd/src/routes/login/return-path.ts')
		).href
	);
	const safeCanonReturnPath = returnPathModule.safeCanonReturnPath as (value: string | null) => string;

	assert.equal(safeCanonReturnPath('/canon/less-but-better'), '/canon/less-but-better');
	assert.equal(safeCanonReturnPath('//evil.example'), '/canon');
	assert.equal(safeCanonReturnPath('https://evil.example'), '/canon');
	assert.equal(safeCanonReturnPath(null), '/canon');
	assert.match(loginServerSource, /safeCanonReturnPath/);
	assert.match(loginSource, /labelReturnDestination/);
	assert.match(loginSource, /returnDestinationLabel/);
	assert.match(loginSource, /After (sign-in|account creation|opening the email)/);
});

test('makes all three identity modes and callback recovery plain', () => {
	for (const required of [
		'Sign in to Canon.',
		'Create your Canon account.',
		'Email yourself a Canon sign-in link.',
		'friendlyLoginError',
		'This sign-in link is no longer supported',
		'Check your email, open the link, and return to'
	]) {
		assert.ok(loginSource.includes(required), `login lost ${required}`);
	}
	assert.doesNotMatch(loginSource, /let error: string \| null = \$state\(null\)/);
});

test('preserves first-party modes, account evidence, and an owned Canon handoff', () => {
	for (const required of [
		'LoginForm',
		'SignupForm',
		'MagicLinkForm',
		"fetch('/api/auth/login'",
		"fetch('/api/auth/signup'",
		"fetch('/api/auth/magic-login'",
		"source: 'ltd'"
	]) {
		assert.ok(loginSource.includes(required), `login lost ${required}`);
	}
	assert.match(accountServerSource, /createAccountPageLoader/);
	assert.match(accountSource, /AccountPage/);
	assert.match(accountSource, /UserInteractionsPanel/);
	assert.match(accountSource, /href="\/canon"/);
	assert.match(accountSource, /Open Canon/);
});
