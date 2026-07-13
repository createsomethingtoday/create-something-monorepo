import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import {
	buildFirstPartySchedulerUrl,
	normalizeSchedulerLifecycleMessage,
	schedulerHandoffContext
} from '../src/lib/scheduling/first-party.ts';

const bookRoute = readFileSync(new URL('../src/routes/book/+page.svelte', import.meta.url), 'utf8');
const atlasRoute = readFileSync(new URL('../src/routes/atlas/+page.svelte', import.meta.url), 'utf8');
const contactRoute = readFileSync(new URL('../src/routes/contact/+page.svelte', import.meta.url), 'utf8');
const textRevelation = readFileSync(
	new URL('../../canon/src/lib/domains/agency/TextRevelation.svelte', import.meta.url),
	'utf8'
);
const agencyDomainIndex = readFileSync(
	new URL('../../canon/src/lib/domains/agency/index.ts', import.meta.url),
	'utf8'
);
const schedulerPage = readFileSync(
	new URL('../../../apps/create-something-scheduler/src/ui/page.ts', import.meta.url),
	'utf8'
);

test('owned /book route embeds the first-party scheduler and remains the Atlas destination', () => {
	assert.ok(atlasRoute.includes('bookingHref="/book"'));
	assert.ok(bookRoute.includes('buildFirstPartySchedulerUrl'));
	assert.ok(bookRoute.includes('<iframe'));
	assert.ok(bookRoute.includes('title="Schedule a CREATE SOMETHING mapping session"'));
	assert.equal(bookRoute.toLowerCase().includes('savvycal'), false);
});

test('shared scheduling CTA is provider-neutral and preserves the owned route', () => {
	assert.ok(existsSync(new URL('../../canon/src/lib/domains/agency/ScheduleButton.svelte', import.meta.url)));
	assert.equal(existsSync(new URL('../../canon/src/lib/domains/agency/SavvyCalButton.svelte', import.meta.url)), false);
	assert.ok(agencyDomainIndex.includes("export { default as ScheduleButton } from './ScheduleButton.svelte'"));
	assert.equal(agencyDomainIndex.includes('SavvyCalButton'), false);
	assert.ok(contactRoute.includes('ScheduleButton'));
	assert.ok(textRevelation.includes('ScheduleButton'));
});

test('obsolete provider-specific agency booking adapters are removed', () => {
	assert.equal(existsSync(new URL('../src/lib/utils/savvycal.ts', import.meta.url)), false);
	assert.equal(existsSync(new URL('../src/routes/api/booking/slots/+server.ts', import.meta.url)), false);
	assert.equal(existsSync(new URL('../src/routes/api/booking/create/+server.ts', import.meta.url)), false);
});

test('Atlas attribution reaches the owned iframe while unknown query data is dropped', () => {
	const search = '?source=atlas-canvas&intent=workflow-map&lane=fit&warmup=atlas_canvas&readiness=ready&score=84&atlas_session_id=session_123&agent_messages=7&secret=do-not-forward';
	const iframe = new URL(buildFirstPartySchedulerUrl(search));
	assert.equal(iframe.pathname, '/createsomething/together');
	assert.equal(iframe.searchParams.get('source'), 'atlas-canvas');
	assert.equal(iframe.searchParams.get('atlas_session_id'), 'session_123');
	assert.equal(iframe.searchParams.get('agent_messages'), '7');
	assert.equal(iframe.searchParams.has('secret'), false);
	assert.deepEqual(schedulerHandoffContext(search, 'Map the approval handoff.'), {
		source: 'atlas-canvas',
		intent: 'workflow-map',
		lane: 'fit',
		warmup: 'atlas_canvas',
		readiness: 'ready',
		score: 84,
		atlasSessionId: 'session_123',
		agentMessages: 7,
		warmupNotes: 'Map the approval handoff.'
	});
});

test('Atlas attribution is normalized and bounded before it crosses the origin', () => {
	const oversized = 'A'.repeat(140);
	const search = `?source=Atlas Canvas!!!&intent=${oversized}&lane=Fit / Review&score=101&atlas_session_id=${oversized}&agent_messages=-1`;
	const iframe = new URL(buildFirstPartySchedulerUrl(search));
	assert.equal(iframe.searchParams.get('source'), 'atlas-canvas');
	assert.equal(iframe.searchParams.get('lane'), 'fit-review');
	assert.equal(iframe.searchParams.get('intent')?.length, 90);
	assert.equal(iframe.searchParams.get('atlas_session_id')?.length, 100);
	assert.equal(iframe.searchParams.has('score'), false);
	assert.equal(iframe.searchParams.has('agent_messages'), false);
	assert.deepEqual(schedulerHandoffContext(search), {
		source: 'atlas-canvas',
		intent: 'a'.repeat(90),
		lane: 'fit-review',
		atlasSessionId: 'a'.repeat(100)
	});
});

test('direct booking does not invent zero-valued Atlas attribution', () => {
	const iframe = new URL(buildFirstPartySchedulerUrl());
	assert.equal(iframe.search, '');
	assert.deepEqual(schedulerHandoffContext(), {});
});

test('explicit test traffic survives the owned scheduler handoff without forwarding arbitrary query data', () => {
	const iframe = new URL(
		buildFirstPartySchedulerUrl('?traffic_class=test&source=homepage&secret=do-not-forward')
	);
	assert.equal(iframe.searchParams.get('traffic_class'), 'test');
	assert.equal(iframe.searchParams.get('source'), 'homepage');
	assert.equal(iframe.searchParams.has('secret'), false);
	assert.deepEqual(schedulerHandoffContext('?traffic_class=test'), { trafficClass: 'test' });
	assert.deepEqual(schedulerHandoffContext('?traffic_class=customer'), {});
});

test('scheduler lifecycle messages are allowlisted and stripped to privacy-safe booking lineage', () => {
	assert.deepEqual(
		normalizeSchedulerLifecycleMessage({
			type: 'create-something:scheduler-lifecycle',
			action: 'booking_completed',
			schedulerSessionId: 'scheduler_session_123',
			trafficClass: 'test',
			bookingId: 'booking_123',
			receiptId: 'receipt_123',
			durationMinutes: 30,
			email: 'must-not-cross@example.com'
		}),
		{
			action: 'booking_completed',
			metadata: {
				surface: 'first-party-scheduler',
				schedulerSessionId: 'scheduler_session_123',
				trafficClass: 'test',
				bookingId: 'booking_123',
				receiptId: 'receipt_123',
				durationMinutes: 30
			}
		}
	);
	assert.equal(
		normalizeSchedulerLifecycleMessage({
			type: 'create-something:scheduler-lifecycle',
			action: 'booking_refunded'
		}),
		null
	);
});

test('scheduler and parent wire the allowlisted lifecycle bridge across the exact owned origin', () => {
	assert.ok(bookRoute.includes("from '@create-something/canon/analytics'"));
	assert.ok(bookRoute.includes('normalizeSchedulerLifecycleMessage'));
	assert.ok(bookRoute.includes('event.origin !== FIRST_PARTY_SCHEDULER_ORIGIN'));
	assert.ok(bookRoute.includes('event.source !== schedulerFrame?.contentWindow'));
	assert.ok(bookRoute.includes('getAnalytics()?.conversion(lifecycle.action'));
	assert.ok(schedulerPage.includes("notifyParent('booking_form_started'"));
	assert.ok(schedulerPage.includes("notifyParent('booking_initiated'"));
	assert.ok(schedulerPage.includes("notifyParent('booking_completed'"));
	assert.ok(schedulerPage.includes("'create-something:scheduler-lifecycle'"));
});

test('the client updates iframe attribution only after hydration', () => {
	assert.equal(bookRoute.includes("from '$app/environment'"), false);
	assert.equal(bookRoute.includes('if (browser)'), false);
	assert.ok(bookRoute.includes('onMount(() =>'));
	assert.ok(bookRoute.includes('schedulerHref = buildFirstPartySchedulerUrl(window.location.search)'));
});
