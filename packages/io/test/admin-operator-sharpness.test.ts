import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { performancePageRegistry } from '../../../config/performance-pages/registry.ts';

test('the complete IO admin family is registered under the tool contract', () => {
	const group = performancePageRegistry.find((entry) => entry.id === 'io-admin');

	assert(group);
	assert.equal(group.status, 'migrated');
	assert.equal(group.contract.archetype, 'tool');
	assert.equal(group.sources.length, 9);
});

test('the admin request boundary includes every agent-review operation', () => {
	const hooks = readFileSync(new URL('../src/hooks.server.ts', import.meta.url), 'utf8');

	assert.match(hooks, /isAdminApiRoute\s*=\s*isAdminApiPath\(event\.url\.pathname\)/);
	assert.match(hooks, /pathname === '\/api\/agent'/);
	assert.match(hooks, /pathname === '\/api\/tufte\/dashboard'/);
});

test('every protected admin tool is reachable from the shared navigation', () => {
	const layout = readFileSync(
		new URL('../src/routes/admin/+layout.svelte', import.meta.url),
		'utf8'
	);

	for (const path of [
		'/admin',
		'/admin/agent-drafts',
		'/admin/analytics',
		'/admin/experiments',
		'/admin/observability',
		'/admin/submissions',
		'/admin/subscribers',
		'/admin/tufte-dashboard'
	]) {
		assert.match(layout, new RegExp(`href: '${path.replaceAll('/', '\\/')}'`));
	}

	assert.match(layout, /aria-label="Admin tools"/);
});

test('every protected admin page begins with one semantic page title', () => {
	for (const route of [
		'+page.svelte',
		'agent-drafts/+page.svelte',
		'analytics/+page.svelte',
		'experiments/+page.svelte',
		'observability/+page.svelte',
		'submissions/+page.svelte',
		'subscribers/+page.svelte',
		'tufte-dashboard/+page.svelte'
	]) {
		const source = readFileSync(
			new URL(`../src/routes/admin/${route}`, import.meta.url),
			'utf8'
		);
		assert.equal(source.match(/<h1\b/g)?.length, 1, route);
	}
});

test('the signed-out admin task has a main landmark', () => {
	const login = readFileSync(
		new URL('../src/routes/admin/login/+page.svelte', import.meta.url),
		'utf8'
	);

	assert.equal(login.match(/<main\b/g)?.length, 1);
	assert.equal(login.match(/<h1\b/g)?.length, 1);
	assert.match(login, /<h1[^>]*>Admin sign in<\/h1>/);
	assert.match(login, /role="alert"/);
});

test('each protected page opening names the operator task and the data source plainly', () => {
	for (const route of [
		'+page.svelte',
		'agent-drafts/+page.svelte',
		'analytics/+page.svelte',
		'experiments/+page.svelte',
		'observability/+page.svelte',
		'submissions/+page.svelte',
		'subscribers/+page.svelte',
		'tufte-dashboard/+page.svelte'
	]) {
		const source = readFileSync(
			new URL(`../src/routes/admin/${route}`, import.meta.url),
			'utf8'
		);
		assert.match(source, /(?:Source|Data):/, `${route} needs a visible source cue`);
		assert.doesNotMatch(
			source,
			/Overview of CREATE SOMETHING systems|Experiment #3|Manage your email list|Unified view of agent sessions|AI-powered analytics/,
			route
		);
	}
});

test('the dashboard never presents an unchecked database success state', () => {
	const dashboard = readFileSync(
		new URL('../src/routes/admin/+page.svelte', import.meta.url),
		'utf8'
	);
	const statusSection = dashboard.slice(dashboard.indexOf('Data status'));

	assert.doesNotMatch(statusSection, /system-value-success/);
	assert.match(statusSection, /{#if loading}/);
	assert.match(statusSection, /{:else if loadError}/);
	assert.match(statusSection, /Connected for current counts/);
});

test('draft review describes its real effect and reports outcomes in the page', () => {
	const drafts = readFileSync(
		new URL('../src/routes/admin/agent-drafts/+page.svelte', import.meta.url),
		'utf8'
	);

	assert.doesNotMatch(drafts, /\balert\(/);
	assert.doesNotMatch(drafts, /Approve & Send/);
	assert.match(drafts, /This page never sends email\./);
	assert.match(drafts, /Record sent/);
	assert.match(drafts, /role="status"/);
	assert.match(drafts, /fetchAdminJson/);
	assert.doesNotMatch(drafts, /await fetch\('/);
});

test('rejecting a draft returns the contact to the manual inbox', () => {
	const agent = readFileSync(
		new URL('../src/lib/agents/pm-agent/index.ts', import.meta.url),
		'utf8'
	);
	const decision = agent.slice(agent.indexOf('export async function approveDraft'));

	assert.match(decision, /approved \? 'responded' : 'unread'/);
	assert.match(decision, /SET status = \?/);
});

test('subscriber request failures cannot look like an empty list', () => {
	const subscribers = readFileSync(
		new URL('../src/routes/admin/subscribers/+page.svelte', import.meta.url),
		'utf8'
	);

	assert.match(subscribers, /fetchAdminJson/);
	assert.match(subscribers, /AdminRequestError/);
	assert.match(subscribers, /{:else if requestError}/);
	assert.match(subscribers, /role="alert"/);
	assert.match(subscribers, /{#if !loading && !requestError}/);
});

test('submission request failures cannot render zero-valued totals', () => {
	const submissions = readFileSync(
		new URL('../src/routes/admin/submissions/+page.svelte', import.meta.url),
		'utf8'
	);

	assert.match(submissions, /{#if !loading && !loadError}/);
});

test('permanent record deletion uses an in-page confirm and cancel step', () => {
	for (const route of ['submissions/+page.svelte', 'subscribers/+page.svelte']) {
		const source = readFileSync(
			new URL(`../src/routes/admin/${route}`, import.meta.url),
			'utf8'
		);

		assert.doesNotMatch(source, /\bconfirm\(/, route);
		assert.match(source, /Delete permanently/, route);
		assert.match(source, /Keep (?:submission|subscriber)/, route);
	}
});

test('record updates leave a visible success receipt', () => {
	const submissions = readFileSync(
		new URL('../src/routes/admin/submissions/+page.svelte', import.meta.url),
		'utf8'
	);
	const subscribers = readFileSync(
		new URL('../src/routes/admin/subscribers/+page.svelte', import.meta.url),
		'utf8'
	);

	assert.match(submissions, /Submission marked/);
	assert.match(subscribers, /Subscriber marked/);
	assert.match(submissions, /role="status"/);
	assert.match(subscribers, /role="status"/);
});

test('operational analysis makes one request per initial load or range change', () => {
	const analysis = readFileSync(
		new URL('../src/routes/admin/tufte-dashboard/+page.svelte', import.meta.url),
		'utf8'
	);

	assert.doesNotMatch(analysis, /\$:\s*if \(days\)/);
	assert.match(analysis, /onchange={changeDashboardRange}/);
	assert.match(analysis, /fetchAdminJson/);
});

test('JavaScript-disabled admin pages explain what remains available', () => {
	const layout = readFileSync(
		new URL('../src/routes/admin/+layout.svelte', import.meta.url),
		'utf8'
	);
	const login = readFileSync(
		new URL('../src/routes/admin/login/+page.svelte', import.meta.url),
		'utf8'
	);

	assert.match(layout, /<noscript>/);
	assert.match(layout, /live data and record actions need JavaScript/);
	assert.match(login, /<noscript>/);
	assert.match(login, /sign-in form needs JavaScript/);
	assert.match(login, /<form class="login-form"/);
	assert.match(login, /\.login-form \{ display: none; \}/);
});

test('operational analysis explains its pipeline without internal theory vocabulary', () => {
	const analysis = readFileSync(
		new URL('../src/routes/admin/tufte-dashboard/+page.svelte', import.meta.url),
		'utf8'
	);

	assert.doesNotMatch(analysis, /Hermeneutic|metric semantics|autonomously|data-ink/);
	assert.match(analysis, /Database records → pattern checks → charts → operator decision/);
});
