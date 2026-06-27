import { describe, expect, it } from 'vitest';
import {
	getDefaultLeagueState,
	getSampleSystemUpload,
	listManagementPolicies,
	listSeasonPhases,
	listSystems,
	parseSystemUpload,
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

	it('explains the winning score through weighted score contributions', () => {
		const match = runSystemMatch({ mode: 'versus', systemKey: 'recovery', opponentKey: 'attention' });
		const contributionTotal = match.winner.scoreContributions.reduce(
			(total, contribution) => total + contribution.value,
			0
		);

		expect(match.winner.scoreContributions.map((contribution) => contribution.key)).toEqual([
			'leagueHealth',
			'mediaValueB',
			'competitiveBalance',
			'laborTrust',
			'ownerMargin',
			'resilience'
		]);
		expect(Number(contributionTotal.toFixed(1))).toBe(match.winner.score);
		expect(match.winner.scoreContributions.every((contribution) => contribution.readout.includes('x'))).toBe(
			true
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

	it('bakes requirement validation into every System match', () => {
		const match = runSystemMatch({
			mode: 'versus',
			systemKey: 'recovery',
			opponentKey: 'attention',
			years: 5,
			steeringYear: 3,
			steeringPhase: 'midseason',
			steeringPolicyKey: 'labor'
		});

		expect(match.validation.requirements.map((requirement) => requirement.key)).toEqual([
			'state-bounds',
			'tradeoff-integrity',
			'owner-room',
			'labor-plausibility',
			'projection-honesty',
			'system-balance'
		]);
		expect(match.validation.requirements.map((requirement) => requirement.status)).toEqual(
			expect.arrayContaining(['pass'])
		);
		expect(['pass', 'watch', 'fail']).toContain(match.validation.status);
	});

	it('keeps the default single-player validation playable while deferring versus balance', () => {
		const match = runSystemMatch({
			systemKey: 'recovery',
			years: 5,
			steeringYear: 3,
			steeringPhase: 'midseason',
			steeringPolicyKey: 'labor'
		});

		expect(match.validation).toMatchObject({
			status: 'watch',
			label: 'Prototype watch'
		});
		expect(match.validation.requirements).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					key: 'system-balance',
					status: 'deferred',
					summary: 'Versus not run'
				})
			])
		);
	});

	it('flags unrealistic stress environments through validation gates', () => {
		const match = runSystemMatch({
			systemKey: 'trust',
			years: 4,
			environment: {
				key: 'stress-test',
				name: 'Stress Test',
				pressure: 'Owner economics and labor trust begin below the credible range',
				winCondition: 'Expose validation gates before scoring optics',
				effects: {
					ownerMargin: -40,
					laborTrust: -55,
					travelWear: 18
				}
			}
		});

		expect(match.validation.status).toBe('fail');
		expect(match.validation.requirements).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					key: 'owner-room',
					status: 'fail'
				}),
				expect.objectContaining({
					key: 'labor-plausibility',
					status: 'fail'
				})
			])
		);
	});

	it('keeps validation deterministic for repeated runs', () => {
		const first = runSystemMatch({ systemKey: 'recovery', years: 8, steeringPolicyKey: 'media' });
		const second = runSystemMatch({ systemKey: 'recovery', years: 8, steeringPolicyKey: 'media' });

		expect(first.validation).toEqual(second.validation);
	});

	it('accepts a structured uploaded System and runs it through the algorithm', () => {
		const upload = parseSystemUpload(JSON.stringify(getSampleSystemUpload()));
		const custom = upload.systems[0];
		const match = runSystemMatch({
			mode: 'versus',
			systemKey: custom?.key,
			opponentKey: 'recovery',
			years: 5,
			customSystems: upload.systems
		});

		expect(upload.issues).toEqual([]);
		expect(custom).toMatchObject({
			key: expect.stringMatching(/^custom-/),
			name: 'Small Market Balance System',
			policyKey: 'media'
		});
		expect(listSystems(upload.systems).map((system) => system.key)).toContain(custom?.key);
		expect(match.systems.map((result) => result.system.key)).toContain(custom?.key);
		expect(match.systems).toHaveLength(2);
		expect(match.winner.timeline).toHaveLength(5);
	});

	it('accepts multiple uploaded Systems for custom versus custom matches', () => {
		const first = getSampleSystemUpload();
		const second = {
			...first,
			name: 'Labor Stability System',
			policyKey: 'labor',
			weights: {
				leagueHealth: 0.18,
				mediaValueB: 0.1,
				competitiveBalance: 0.14,
				laborTrust: 0.3,
				ownerMargin: 0.1,
				resilience: 0.18
			}
		};
		const upload = parseSystemUpload(JSON.stringify({ systems: [first, second] }));
		const match = runSystemMatch({
			mode: 'versus',
			systemKey: upload.systems[0]?.key,
			opponentKey: upload.systems[1]?.key,
			years: 3,
			customSystems: upload.systems
		});

		expect(upload.issues).toEqual([]);
		expect(upload.systems).toHaveLength(2);
		expect(match.systems.map((result) => result.system.key).sort()).toEqual(
			upload.systems.map((system) => system.key).sort()
		);
		expect(match.validation.requirements.find((requirement) => requirement.key === 'system-balance'))
			.toMatchObject({
				status: expect.not.stringMatching('deferred')
			});
	});

	it('rejects uploaded Systems that try to avoid tradeoff policy', () => {
		const upload = parseSystemUpload(
			JSON.stringify({
				name: 'All Upside System',
				thesis: 'Only optimize one metric and ignore operating constraints.',
				policyKey: 'media',
				weights: {
					leagueHealth: 0,
					mediaValueB: 0.9,
					competitiveBalance: 0,
					laborTrust: 0,
					ownerMargin: 0,
					resilience: 0.1
				}
			})
		);

		expect(upload.systems).toHaveLength(0);
		expect(upload.issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					path: 'systems[0].weights.mediaValueB',
					message: 'Weight must be between 0 and 0.45.'
				}),
				expect.objectContaining({
					path: 'systems[0].weights.ownerMargin',
					message: 'Owner margin weight must be at least 0.04.'
				})
			])
		);
	});
});
