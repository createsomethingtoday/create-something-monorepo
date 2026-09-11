import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

import { performancePageRegistry } from '../../../config/performance-pages/registry.ts';

const workspaceRoot = resolve(import.meta.dirname, '../../..');
const loginSource = readFileSync(
	resolve(workspaceRoot, 'packages/io/src/routes/login/+page.svelte'),
	'utf8'
);
const accountSource = readFileSync(
	resolve(workspaceRoot, 'packages/io/src/routes/account/+page.svelte'),
	'utf8'
);
const accountServerSource = readFileSync(
	resolve(workspaceRoot, 'packages/io/src/routes/account/+page.server.ts'),
	'utf8'
);
const loginServerSource = readFileSync(
	resolve(workspaceRoot, 'packages/io/src/routes/login/+page.server.ts'),
	'utf8'
);

test('migrates the complete IO account cohort with the tool chapter contract', () => {
	const cohort = performancePageRegistry.find((group) => group.id === 'io-account');

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

test('fails closed to IO research while preserving valid local return destinations', async () => {
	const returnPathModule = await import(
		pathToFileURL(
			resolve(workspaceRoot, 'packages/io/src/routes/login/return-path.ts')
		).href
	);
	const safeIoReturnPath = returnPathModule.safeIoReturnPath as (value: string | null) => string;

	assert.equal(safeIoReturnPath('/papers/three-tier-framework'), '/papers/three-tier-framework');
	assert.equal(safeIoReturnPath('//evil.example'), '/');
	assert.equal(safeIoReturnPath('https://evil.example'), '/');
	assert.equal(safeIoReturnPath(null), '/');
	assert.match(loginServerSource, /safeIoReturnPath/);
	assert.match(loginSource, /labelReturnDestination/);
	assert.match(loginSource, /returnDestinationLabel/);
	assert.match(loginSource, /After (sign-in|account creation|opening the email)/);
});

test('makes all three IO identity modes and callback recovery plain', () => {
	for (const required of [
		'Sign in to IO research.',
		'Create your IO research account.',
		'Email yourself an IO sign-in link.',
		'friendlyLoginError',
		'This sign-in link is invalid or has expired',
		'Check your email, open the link, and return to'
	]) {
		assert.ok(loginSource.includes(required), `login lost ${required}`);
	}
	assert.doesNotMatch(loginSource, /let error: string \| null = \$state\(null\)/);
});

test('preserves public identity endpoints, research evidence, and an owned paper handoff', () => {
	for (const required of [
		'LoginForm',
		'SignupForm',
		'MagicLinkForm',
		"fetch('/api/public/auth/login'",
		"fetch('/api/public/auth/signup'",
		"fetch('/api/public/auth/magic-login'",
		"source: 'io'",
		'source="io"'
	]) {
		assert.ok(loginSource.includes(required), `login lost ${required}`);
	}
	assert.match(accountServerSource, /\/api\/user\/analytics\/aggregate\?days=30/);
	assert.match(accountSource, /AccountPage/);
	assert.match(accountSource, /UserInteractionsPanel/);
	assert.match(accountSource, /logoutEndpoint="\/api\/public\/auth\/logout"/);
	assert.match(accountSource, /href="\/papers"/);
	assert.match(accountSource, /Browse papers/);
});
