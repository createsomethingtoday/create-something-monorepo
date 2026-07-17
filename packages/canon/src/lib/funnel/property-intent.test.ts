import { describe, expect, it } from 'vitest';
import {
	PROPERTY_FUNNEL_STEPS,
	getPropertyFunnelActions,
	getJourneyIdFromUrl,
	isJourneyId,
	withJourneyContext,
	type FunnelProperty
} from './property-intent.js';

describe('property intent funnel contract', () => {
	it('gives every public property one explicit job', () => {
		expect(PROPERTY_FUNNEL_STEPS.map((step) => [step.id, step.role])).toEqual([
			['ltd', 'Canon'],
			['io', 'Research'],
			['lms', 'School'],
			['space', 'Workbench'],
			['agency', 'Build']
		]);
	});

	it('keeps cold-property actions out of the direct booking path', () => {
		const coldProperties: FunnelProperty[] = ['ltd', 'io', 'lms', 'space'];

		for (const property of coldProperties) {
			const actions = getPropertyFunnelActions(property);
			for (const action of actions) {
				const url = new URL(action.href, 'https://createsomething.agency');
				expect(url.pathname, `${property}:${action.label}`).not.toBe('/book');
			}
		}
	});

	it('always offers a warm workflow-practice handoff before booking', () => {
		for (const property of ['ltd', 'io', 'lms', 'space'] satisfies FunnelProperty[]) {
			const actions = getPropertyFunnelActions(property);
			expect(actions.some((action) => new URL(action.href).pathname === '/practice')).toBe(true);
		}
	});

	it('accepts only opaque analytics journey identifiers', () => {
		expect(isJourneyId('s_mabc123_xyz789')).toBe(true);
		expect(isJourneyId('user@example.com')).toBe(false);
		expect(isJourneyId('acct_123')).toBe(false);
		expect(isJourneyId('')).toBe(false);
		expect(getJourneyIdFromUrl('https://createsomething.io/?journey=s_mabc123_xyz789')).toBe(
			's_mabc123_xyz789'
		);
		expect(getJourneyIdFromUrl('https://createsomething.io/?journey=acct_123')).toBeNull();
	});

	it('carries bounded source, intent, stage, and lane context across properties', () => {
		const href = withJourneyContext('https://createsomething.agency/practice', {
			journeyId: 's_mabc123_xyz789',
			source: 'ltd',
			intent: 'canon-to-practice',
			stage: 'qualify',
			lane: 'policy_os'
		});
		const url = new URL(href);

		expect(Object.fromEntries(url.searchParams)).toEqual({
			journey: 's_mabc123_xyz789',
			source: 'ltd',
			intent: 'canon-to-practice',
			stage: 'qualify',
			lane: 'policy_os'
		});
		expect(href).not.toContain('@');
	});
});
