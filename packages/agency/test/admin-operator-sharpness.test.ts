import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const packageRoot = resolve(import.meta.dirname, '..');

test('the complete Agency admin family is registered as migrated', () => {
	const registry = readFileSync(
		resolve(packageRoot, '../../config/performance-pages/registry.ts'),
		'utf8'
	);
	const agencyAdminStart = registry.indexOf("'agency-admin'");
	const agencyAdminEnd = registry.indexOf('\n  group(', agencyAdminStart);
	const agencyAdmin = registry.slice(agencyAdminStart, agencyAdminEnd);

	assert.match(agencyAdmin, /'migrated'/);
	assert.doesNotMatch(agencyAdmin, /'pending'/);
});

const taskOpenings: Record<string, string> = {
	'capture': 'Review captured signals',
	'community': 'Review community signals',
	'funnel': 'Find the funnel step that needs attention',
	'funnel/leads/new': 'Add one lead',
	'funnel/record': 'Record funnel metrics',
	'governance': 'Turn signals into decisions and proof',
	'map': 'Review Map handoffs before Build begins',
	'security': 'Find the access state that needs review',
	'security/audit': 'Trace an access decision',
	'security/bearer-tokens': 'Review managed bearer access',
	'security/commercial': 'Check commercial readiness',
	'security/contracts': 'Record the contract state used for access',
	'security/partners': 'Check partner workspace bindings',
	'security/seeds': 'Prepare a user for first-party access',
	'social': 'Review the publishing schedule'
};

const openingGuidance: Record<string, string> = {
	'capture': 'Decide which captured records need action. Source rows stay unchanged; only the review decision is stored.',
	'community': 'Review new signals and draft responses. These decisions do not publish anything.',
	'funnel': 'Compare this period with the previous one, then update the pipeline where the work is stale.',
	'funnel/leads/new': 'This creates a pipeline record. It does not contact the person.',
	'funnel/record': 'Choose a date and save its manual counts. Website fields may later be refreshed from analytics.',
	'governance': 'Start with the source record. Add a decision only when authority is clear, then attach proof and a receipt.',
	'map': 'Check the commercial gate and entitlement state before accepting a prepared payload. Acceptance records Build intake; it does not begin delivery.',
	'security': 'Start with denials and missing bindings. Open the matching record before changing access state.',
	'security/audit': 'Use delivery, identity, and policy records to explain who acted, what was decided, and why.',
	'security/bearer-tokens': 'Confirm contract, billing, policy, and organization state before changing access. Saving records the entitlement decision; it does not issue a token.',
	'security/commercial': 'Use these Stripe-backed records to verify billing and contract state. These records are read-only.',
	'security/contracts': 'Save the contract evidence used by entitlement checks. This does not activate billing or issue access.',
	'security/partners': 'Verify that each partner is bound to the expected workspace and first-party identity. Bindings are read-only.',
	'security/seeds': 'Create or import the identity record that first-party provisioning will reconcile. A seed does not grant access by itself.',
	'social': 'Read-only schedule. Check the connection and gaps, then use the named MCP tool to schedule or cancel a post.'
};

test('the Agency admin family enters through the existing operator allowlist', () => {
	const layoutServerPath = resolve(packageRoot, 'src/routes/admin/+layout.server.ts');
	assert.ok(existsSync(layoutServerPath), 'the admin family needs a shared server authority boundary');

	const source = readFileSync(layoutServerPath, 'utf8');
	assert.match(source, /requireAgencyOperator/);
});

test('admin data transports enforce the same operator allowlist', () => {
	const transports: Record<string, number> = {
		'src/routes/admin/community/+page.server.ts': 5,
		'src/routes/admin/funnel/+page.server.ts': 1,
		'src/routes/admin/social/+page.server.ts': 1,
		'src/routes/api/funnel/+server.ts': 2,
		'src/routes/api/funnel/leads/+server.ts': 2,
		'src/routes/api/funnel/leads/[id]/+server.ts': 3,
		'src/routes/api/social/cancel/+server.ts': 1,
		'src/routes/api/social/gaps/+server.ts': 1,
		'src/routes/api/social/intelligence/+server.ts': 2,
		'src/routes/api/social/rhythm/+server.ts': 1,
		'src/routes/api/social/schedule/+server.ts': 1,
		'src/routes/api/social/status/+server.ts': 1,
		'src/routes/api/social/suggest/+server.ts': 1
	};

	for (const [sourcePath, handlerCount] of Object.entries(transports)) {
		const source = readFileSync(resolve(packageRoot, sourcePath), 'utf8');
		const authorityCalls = source.match(/await requireAgencyOperator\(/g) ?? [];
		assert.equal(
			authorityCalls.length,
			handlerCount,
			`${sourcePath} must authorize each data handler before reading or writing operator state`
		);
	}
});

test('every admin page opens with its immediate operator task', () => {
	for (const [route, task] of Object.entries(taskOpenings)) {
		const source = readFileSync(resolve(packageRoot, `src/routes/admin/${route}/+page.svelte`), 'utf8');
		assert.ok(source.includes(`<h1>${task}</h1>`), `${route} must open with: ${task}`);
	}
});

test('every opening states the source or consequence needed to act safely', () => {
	for (const [route, guidance] of Object.entries(openingGuidance)) {
		const source = readFileSync(resolve(packageRoot, `src/routes/admin/${route}/+page.svelte`), 'utf8');
		assert.ok(source.includes(guidance), `${route} must explain: ${guidance}`);
	}
});

test('every security screen preserves the complete operator navigation', () => {
	const componentPath = resolve(packageRoot, 'src/lib/components/access/SecurityAdminNav.svelte');
	assert.ok(existsSync(componentPath), 'security navigation must have one shared owner');
	const navigation = readFileSync(componentPath, 'utf8');

	for (const href of [
		'/admin/security',
		'/admin/security/bearer-tokens',
		'/admin/security/contracts',
		'/admin/security/commercial',
		'/admin/security/partners',
		'/admin/security/seeds',
		'/admin/security/audit'
	]) {
		assert.ok(navigation.includes(`href: '${href}'`), `security navigation is missing ${href}`);
	}

	for (const route of Object.keys(taskOpenings).filter((route) => route.startsWith('security'))) {
		const source = readFileSync(resolve(packageRoot, `src/routes/admin/${route}/+page.svelte`), 'utf8');
		assert.match(source, /<SecurityAdminNav current="[^"]+" \/>/, `${route} must use the shared navigation`);
	}
});

test('admin prose names the work instead of narrating the interface', () => {
	for (const route of Object.keys(taskOpenings)) {
		const source = readFileSync(resolve(packageRoot, `src/routes/admin/${route}/+page.svelte`), 'utf8');
		assert.doesNotMatch(source, /\b(?:this|the) page\b/i, `${route} contains self-referential page copy`);
		assert.doesNotMatch(source, />Operator Surface</i, `${route} uses a generic interface label`);
	}
});

test('data dashboards keep unavailable state distinct from valid zero state', () => {
	const dashboards: Record<string, string> = {
		community: 'Community data is unavailable. Stop: do not review or approve responses until it loads.',
		funnel: 'Funnel data is unavailable. Do not use these numbers to make a pipeline decision yet.',
		social: 'The publishing schedule is unavailable. Stop: do not schedule or cancel posts until it loads.'
	};

	for (const [route, message] of Object.entries(dashboards)) {
		const serverSource = readFileSync(
			resolve(packageRoot, `src/routes/admin/${route}/+page.server.ts`),
			'utf8'
		);
		const pageSource = readFileSync(
			resolve(packageRoot, `src/routes/admin/${route}/+page.svelte`),
			'utf8'
		);
		assert.match(serverSource, /available:\s*false/, `${route} needs an unavailable payload`);
		assert.match(serverSource, /available:\s*true/, `${route} needs an available payload`);
		assert.match(pageSource, /\{#if !data\.available\}/, `${route} must stop before rendering false state`);
		assert.ok(pageSource.includes(message), `${route} needs a plain-language unavailable message`);
	}
});

test('community decisions submit the reviewed draft and return truthful receipts', () => {
	const source = readFileSync(
		resolve(packageRoot, 'src/routes/admin/community/+page.svelte'),
		'utf8'
	);

	assert.doesNotMatch(source, /(processedQueue|dismissedSignals)\.add\(/);
	assert.match(source, /name="edited_content"/);
	assert.ok(source.includes('Draft approved for the response queue. Nothing was published.'));
	assert.ok(source.includes('Draft rejected and its source signal dismissed.'));
	assert.ok(source.includes('Signal dismissed from the review queue.'));
	assert.ok(source.includes('Signal marked reviewed for manual follow-up.'));
	assert.ok(source.includes('The record remains in the queue. Try again.'));
});

test('funnel mutations remain usable without JavaScript and return verifiable receipts', () => {
	const routes: Record<string, string> = {
		'funnel/leads/new': 'No contact was sent.',
		'funnel/record': 'Open the funnel dashboard to verify the updated period.'
	};

	for (const [route, receipt] of Object.entries(routes)) {
		const pageSource = readFileSync(
			resolve(packageRoot, `src/routes/admin/${route}/+page.svelte`),
			'utf8'
		);
		const serverPath = resolve(packageRoot, `src/routes/admin/${route}/+page.server.ts`);
		assert.ok(existsSync(serverPath), `${route} needs a server action`);
		const serverSource = readFileSync(serverPath, 'utf8');

		assert.match(pageSource, /<form method="POST" use:enhance/);
		assert.doesNotMatch(pageSource, /preventDefault\(/);
		assert.ok(pageSource.includes(receipt), `${route} needs the receipt: ${receipt}`);
		assert.match(serverSource, /await requireAgencyOperator\(/);
		assert.match(serverSource, /export const actions/);
	}
});
