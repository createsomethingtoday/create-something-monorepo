import { describe, expect, it } from 'vitest';
import {
	getDefaultLeagueState,
	listManagementPolicies,
	runManagementScenario
} from './simulation.js';

describe('basketball systems management simulation', () => {
	it('exposes the three commissioner policy levers used by the lab UI', () => {
		expect(listManagementPolicies().map((policy) => policy.key)).toEqual([
			'schedule',
			'media',
			'labor'
		]);
	});

	it('runs schedule policy through health, availability, and owner-pressure tradeoffs', () => {
		const baseline = getDefaultLeagueState();
		const scenario = runManagementScenario('schedule', baseline);

		expect(scenario.state.leagueHealth).toBeGreaterThan(baseline.leagueHealth);
		expect(scenario.state.starAvailability).toBeGreaterThan(baseline.starAvailability);
		expect(scenario.state.travelWear).toBeLessThan(baseline.travelWear);
		expect(scenario.state.ownerMargin).toBeLessThan(baseline.ownerMargin);
		expect(scenario.metrics.find((metric) => metric.key === 'leagueHealth')).toMatchObject({
			label: 'League Health',
			tone: 'green'
		});
	});

	it('makes media allocation a different strategic outcome than schedule relief', () => {
		const baseline = getDefaultLeagueState();
		const media = runManagementScenario('media', baseline);
		const schedule = runManagementScenario('schedule', baseline);

		expect(media.state.smallMarketVisibility).toBeGreaterThan(schedule.state.smallMarketVisibility);
		expect(media.state.globalAttention).toBeGreaterThan(schedule.state.globalAttention);
		expect(media.state.leagueHealth).toBeLessThan(schedule.state.leagueHealth);
	});

	it('produces deterministic reports and receipts for the same policy input', () => {
		const first = runManagementScenario('labor');
		const second = runManagementScenario('labor');

		expect(first).toEqual(second);
		expect(first.reports).toHaveLength(3);
		expect(first.ledger.map((entry) => entry.label)).toEqual([
			'Policy action',
			'Health model',
			'Market model',
			'Governance pressure'
		]);
	});
});
