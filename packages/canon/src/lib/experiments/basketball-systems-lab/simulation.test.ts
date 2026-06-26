import { describe, expect, it } from 'vitest';
import {
	getDefaultLeagueState,
	listManagementPolicies,
	listSeasonPhases,
	listSystems,
	runManagementScenario,
	runSystemMatch
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

	it('runs a System through a deterministic multi-year timeline', () => {
		const match = runSystemMatch({ systemKey: 'recovery', years: 5 });

		expect(listSystems().map((system) => system.key)).toEqual(['recovery', 'attention', 'trust']);
		expect(match.mode).toBe('single');
		expect(match.years).toBe(5);
		expect(match.winner.timeline).toHaveLength(5);
		expect(match.winner.timeline.map((entry) => entry.year)).toEqual([1, 2, 3, 4, 5]);
		expect(match.winner.compoundedScoreDelta).toBe(
			Number((match.winner.score - match.winner.startScore).toFixed(1))
		);
	});

	it('applies mid-season steering from the chosen year and exposes projections', () => {
		const match = runSystemMatch({
			mode: 'versus',
			systemKey: 'recovery',
			opponentKey: 'attention',
			years: 5,
			steeringYear: 3,
			steeringPhase: 'midseason',
			steeringPolicyKey: 'labor'
		});
		const steeredSystem = match.systems.find((result) => result.system.key === 'recovery');

		expect(listSeasonPhases().map((phase) => phase.key)).toEqual([
			'opening',
			'midseason',
			'deadline'
		]);
		expect(match.systems).toHaveLength(2);
		expect(match.steering.phase.key).toBe('midseason');
		expect(steeredSystem?.timeline.map((entry) => entry.steered)).toEqual([
			false,
			false,
			true,
			true,
			true
		]);
		expect(steeredSystem?.timeline[2]).toMatchObject({
			year: 3,
			policyIntensity: 0.62,
			policy: expect.objectContaining({ key: 'labor' })
		});
		expect(steeredSystem?.timeline[3]).toMatchObject({
			year: 4,
			policyIntensity: 1,
			policy: expect.objectContaining({ key: 'labor' })
		});
		expect(match.projections.map((projection) => projection.label)).toEqual([
			'Projected finish',
			'Steering impact',
			'Ripple window'
		]);
	});
});
