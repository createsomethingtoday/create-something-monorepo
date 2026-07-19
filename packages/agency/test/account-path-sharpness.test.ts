import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { performancePageRegistry } from '../../../config/performance-pages/registry.ts';
import { load as loadLogin } from '../src/routes/login/+page.server.ts';

const workspaceRoot = resolve(import.meta.dirname, '../../..');
const loginSource = readFileSync(
	resolve(workspaceRoot, 'packages/agency/src/routes/login/+page.svelte'),
	'utf8'
);
const accountSource = readFileSync(
	resolve(workspaceRoot, 'packages/agency/src/routes/account/+page.svelte'),
	'utf8'
);
const accountServerSource = readFileSync(
	resolve(workspaceRoot, 'packages/agency/src/routes/account/+page.server.ts'),
	'utf8'
);

test('migrates the complete Agency account cohort with the tool chapter contract', () => {
	const cohort = performancePageRegistry.find((group) => group.id === 'agency-account');

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

test('makes the selected identity task and safe return destination plain', () => {
	assert.match(loginSource, /returnDestinationLabel/);
	assert.match(loginSource, /After (sign-in|account creation)/);
	assert.match(loginSource, /Create your Agency account/);
	assert.match(loginSource, /source="agency"/);
	assert.doesNotMatch(loginSource, /HttpOnly|fail closed|tenant|entitlement boundaries|Controlled/);
});

test('turns callback machine codes into a recovery instruction', () => {
	assert.match(loginSource, /friendlyLoginError/);
	assert.match(loginSource, /This sign-in link is no longer supported/);
	assert.doesNotMatch(loginSource, /let error = \$state<string \| null>\(data\.error \|\| null\)/);
});

test('preserves safe redirects, first-party forms, protected account state, and owned handoffs', async () => {
	const safe = await loadLogin({
		url: new URL('https://createsomething.agency/login?redirect=/mcp-access'),
		locals: { user: null }
	} as never);
	const unsafe = await loadLogin({
		url: new URL('https://createsomething.agency/login?redirect=//evil.example'),
		locals: { user: null }
	} as never);

	assert.equal((safe as { redirectTo: string }).redirectTo, '/mcp-access');
	assert.equal((unsafe as { redirectTo: string }).redirectTo, '/dashboard');
	for (const required of [
		'CREATE SOMETHING Identity',
		'LoginForm',
		'SignupForm',
		"fetch('/api/auth/login'",
		"fetch('/api/auth/signup'"
	]) {
		assert.ok(loginSource.includes(required), `login lost ${required}`);
	}
	assert.match(accountServerSource, /createAccountPageLoader/);
	assert.match(accountSource, /AccountPage/);
	assert.match(accountSource, /href="\/mcp-access"/);
	assert.match(accountSource, /href="\/dashboard"/);
});
