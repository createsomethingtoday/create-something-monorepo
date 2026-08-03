import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import {
	buildFirstPartySchedulerUrl,
	normalizeSchedulerLifecycleMessage,
	normalizeSchedulerResizeMessage,
	normalizeSchedulerAccessUrl,
	schedulerHandoffContext,
	schedulerHandoffSheet
} from '../src/lib/scheduling/first-party.ts';

const bookRoute = readFileSync(new URL('../src/routes/book/+page.svelte', import.meta.url), 'utf8');
const mapRoute = readFileSync(new URL('../src/routes/map/+page.svelte', import.meta.url), 'utf8');
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

test('owned /book route embeds the first-party scheduler and remains the Map destination', () => {
	assert.ok(mapRoute.includes('bookingHref="/book"'));
	assert.ok(bookRoute.includes('buildFirstPartySchedulerUrl'));
	assert.ok(bookRoute.includes('<iframe'));
	assert.ok(bookRoute.includes('title="Schedule a CREATE SOMETHING mapping session"'));
	assert.equal(bookRoute.toLowerCase().includes('savvycal'), false);
});

test('owned /book route uses the Canon product-mode handoff with the scheduler as its proof artifact', () => {
	assert.ok(bookRoute.includes('PerformanceConversionHandoff'));
	assert.ok(bookRoute.includes('artifactPlacement="full-width"'));
	assert.ok(bookRoute.includes('{#snippet aside()}'));
	assert.ok(bookRoute.includes('id="first-party-scheduler"'));
	assert.equal(bookRoute.includes('PerformanceCampaignOpening'), false);
	assert.equal(bookRoute.includes('pressure-boundary-natural.webp'), false);
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

test('the parent turns only the bounded scheduler context into a readable incoming handoff', () => {
	const context = schedulerHandoffContext(
		'?source=atlas-canvas&intent=workflow-map&lane=fit-review&readiness=ready&score=84&agent_messages=7',
		'Map the approval handoff.'
	);

	assert.deepEqual(schedulerHandoffSheet(context), {
		state: 'ready',
		summary: 'Review this bounded handoff before you choose a time.',
		fields: [
			{ label: 'Source', value: 'Atlas Canvas' },
			{ label: 'Intent', value: 'Workflow Map' },
			{ label: 'Operating lane', value: 'Fit Review' },
			{ label: 'Draft readiness', value: 'Ready' },
			{ label: 'Readiness score', value: '84 / 100' },
			{ label: 'Draft messages', value: '7 messages' }
		],
		warmupNotes: 'Map the approval handoff.'
	});
	assert.deepEqual(schedulerHandoffSheet({}), {
		state: 'empty',
		summary: 'No private draft is attached yet. You can still book a mapping session, or start a draft first.',
		fields: []
	});
	assert.ok(bookRoute.includes('schedulerHandoffSheet'));
	assert.ok(bookRoute.includes('Incoming handoff'));
	assert.ok(bookRoute.includes('What will travel into booking'));
	assert.ok(bookRoute.includes('booking_handoff_viewed'));
	assert.ok(bookRoute.indexOf('booking-handoff') < bookRoute.indexOf('id="first-party-scheduler"'));
});

test('emailed management access crosses the owned page only through a stripped fragment', () => {
	const publicUrl =
		'https://createsomething.agency/book?booking=booking_controlled#access=controlled.action-token';
	assert.deepEqual(normalizeSchedulerAccessUrl(publicUrl), {
		bookingId: 'booking_controlled',
		actionToken: 'controlled.action-token',
		cleanPath: '/book?booking=booking_controlled'
	});
	const iframe = new URL(buildFirstPartySchedulerUrl('?booking=booking_controlled&access=drop-me'));
	assert.equal(iframe.searchParams.get('booking'), 'booking_controlled');
	assert.equal(iframe.searchParams.has('access'), false);
	assert.equal(normalizeSchedulerAccessUrl(
		'https://createsomething.agency/book?booking=booking_controlled&access=must-not-be-query'
	), null);
	assert.equal(normalizeSchedulerAccessUrl(
		'https://createsomething.agency/book?booking=../booking#access=controlled.action-token'
	), null);
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

test('scheduler and parent wire a bounded resize bridge across the exact owned origin', () => {
	assert.equal(
		normalizeSchedulerResizeMessage({
			type: 'create-something:scheduler-resize',
			height: 1383.2
		}),
		1384
	);
	assert.equal(
		normalizeSchedulerResizeMessage({
			type: 'create-something:scheduler-resize',
			height: 12_000
		}),
		null
	);
	assert.equal(
		normalizeSchedulerResizeMessage({
			type: 'create-something:scheduler-resize',
			height: '1384'
		}),
		null
	);
	assert.equal(normalizeSchedulerResizeMessage({ type: 'unexpected', height: 1384 }), null);
	assert.ok(bookRoute.includes('normalizeSchedulerResizeMessage'));
	assert.ok(bookRoute.includes('schedulerFrame.style.height'));
	assert.ok(bookRoute.includes('schedulerFrame.offsetHeight - schedulerFrame.clientHeight'));
	assert.ok(schedulerPage.includes("type:'create-something:scheduler-resize'"));
	assert.ok(schedulerPage.includes('new ResizeObserver'));
	assert.ok(schedulerPage.includes('new MutationObserver'));
	assert.ok(schedulerPage.includes('function queueParentHeight()'));
	assert.ok((schedulerPage.match(/queueParentHeight\(\)/g) ?? []).length >= 5);
});

test('the parent strips emailed access before handing it to the exact scheduler frame', () => {
	assert.ok(bookRoute.includes('normalizeSchedulerAccessUrl(window.location.href)'));
	assert.ok(bookRoute.includes('window.history.replaceState'));
	assert.ok(bookRoute.includes("type: 'create-something:scheduler-access'"));
	assert.ok(bookRoute.includes('schedulerFrame?.contentWindow?.postMessage'));
	assert.ok(schedulerPage.includes("event.data?.type === 'create-something:scheduler-access'"));
	assert.ok(schedulerPage.includes("event.source !== parent"));
	assert.ok(schedulerPage.includes("event.origin !== 'https://createsomething.agency'"));
	assert.ok(schedulerPage.includes('sessionStorage.setItem(tokenKey(access.bookingId),access.actionToken)'));
	assert.equal(bookRoute.includes('location.hash.slice'), false);
});

test('the client updates iframe attribution only after hydration', () => {
	assert.equal(bookRoute.includes("from '$app/environment'"), false);
	assert.equal(bookRoute.includes('if (browser)'), false);
	assert.ok(bookRoute.includes('onMount(() =>'));
	assert.ok(bookRoute.includes('schedulerHref = buildFirstPartySchedulerUrl(window.location.search)'));
});
