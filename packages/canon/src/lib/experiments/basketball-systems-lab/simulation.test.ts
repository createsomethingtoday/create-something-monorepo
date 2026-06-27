import { describe, expect, it } from 'vitest';
import {
	getDefaultLeagueState,
	getSampleSystemField,
	getSampleSystemMatchup,
	getSampleSystemUpload,
	listEnvironments,
	listManagementPolicies,
	listSeasonEvents,
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
			'Governance pressure',
			'Resource economy'
		]);
		expect(first.ledger.find((entry) => entry.label === 'Resource economy')).toMatchObject({
			value: expect.stringContaining('floor'),
			detail: expect.stringContaining('resource floor')
		});
	});

	it('runs a System through a deterministic multi-year timeline', () => {
		const match = runSystemMatch({ systemKey: 'recovery', years: 5 });

		expect(listSystems().map((system) => system.key)).toEqual(['recovery', 'attention', 'trust']);
		expect(match.mode).toBe('single');
		expect(match.years).toBe(5);
		expect(match.winner.timeline).toHaveLength(5);
		expect(match.winner.timeline.map((entry) => entry.year)).toEqual([1, 2, 3, 4, 5]);
		expect(match.winner.timeline[0]).toMatchObject({
			metrics: expect.arrayContaining([expect.objectContaining({ key: 'leagueHealth' })]),
			resourceMetrics: expect.arrayContaining([
				expect.objectContaining({ key: 'politicalCapital' }),
				expect.objectContaining({ key: 'ownerPatience' })
			]),
			nodes: expect.arrayContaining([expect.objectContaining({ id: 'policy' })]),
			scoreContributions: expect.arrayContaining([expect.objectContaining({ key: 'leagueHealth' })]),
			event: expect.objectContaining({ key: 'broadcast-pressure' }),
			eventReceipt: expect.stringContaining('Broadcast pressure')
		});
		expect(match.winner.timeline[0]?.resourceReceipt).toContain('resource floor');
		expect(match.winner.timeline[0]?.score).not.toBe(match.winner.timeline[4]?.score);
		expect(match.winner.compoundedScoreDelta).toBe(
			Number((match.winner.score - match.winner.startScore).toFixed(1))
		);
	});

	it('lets players choose distinct competitive environments', () => {
		const environments = listEnvironments();
		const defaultMatch = runSystemMatch({ systemKey: 'attention', years: 5 });
		const expansionEnvironment = environments.find(
			(environment) => environment.key === 'expansion-surge'
		);
		expect(expansionEnvironment).toBeDefined();
		if (!expansionEnvironment) throw new Error('Expansion Surge environment missing');

		const expansionMatch = runSystemMatch({
			systemKey: 'attention',
			years: 5,
			environment: expansionEnvironment
		});

		expect(environments.map((environment) => environment.key)).toEqual([
			'national-window',
			'expansion-surge',
			'labor-deadline',
			'parity-reset'
		]);
		expect(expansionMatch.environment.key).toBe('expansion-surge');
		expect(expansionMatch.winner.score).not.toBe(defaultMatch.winner.score);
		expect(expansionMatch.reports[0]?.detail).toContain('Expansion Surge');
		expect(expansionMatch.ledger.find((entry) => entry.label === 'Horizon')?.detail).toContain(
			'Expansion Surge'
		);
	});

	it('draws the same deterministic season event deck for every System in a race', () => {
		const expectedDeck = [
			'broadcast-pressure',
			'star-injury-wave',
			'labor-flare-up',
			'playoff-inventory-shock'
		];
		const match = runSystemMatch({
			mode: 'versus',
			systemKey: 'recovery',
			opponentKey: 'attention',
			years: 4
		});

		expect(listSeasonEvents('national-window').map((event) => event.key)).toEqual(expectedDeck);
		expect(match.systems.map((result) => result.timeline.map((entry) => entry.event.key))).toEqual([
			expectedDeck,
			expectedDeck
		]);
		expect(match.systems[0]?.timeline[0]?.eventReceipt).toContain('Broadcast pressure');
		expect(match.reports.find((report) => report.label === 'Environment Signal')?.title).toContain(
			'same pressure model, event deck, and horizon'
		);
	});

	it('explains the raw score through weighted score contributions', () => {
		const match = runSystemMatch({
			mode: 'versus',
			systemKey: 'recovery',
			opponentKey: 'attention'
		});
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
		expect(Number(contributionTotal.toFixed(1))).toBe(match.winner.rawScore);
		expect(
			match.winner.scoreContributions.every((contribution) => contribution.readout.includes('x'))
		).toBe(true);
	});

	it('applies requirement gate adjustments before final ranking', () => {
		const match = runSystemMatch({
			mode: 'versus',
			systemKey: 'recovery',
			opponentKey: 'attention'
		});

		expect(match.winner.validationImpact).toMatchObject({
			rawScore: 90.2,
			adjustment: -9,
			score: 81.2,
			label: 'Risk-adjusted score'
		});
		expect(match.winner.score).toBe(match.winner.validationImpact.score);
		expect(match.winner.score).toBe(
			Number((match.winner.rawScore + match.winner.validationImpact.adjustment).toFixed(1))
		);
		expect(match.winner.validationImpact.impacts).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					key: 'owner-room',
					status: 'watch',
					adjustment: -6
				}),
				expect.objectContaining({
					key: 'projection-honesty',
					status: 'watch',
					adjustment: -3
				})
			])
		);
		expect(match.systems.map((result) => result.rank)).toEqual([1, 2]);
		expect(match.systems[0]?.score).toBeGreaterThan(match.systems[1]?.score ?? 0);
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

	it('supports multiple steering decisions that compound and can return to the original System', () => {
		const match = runSystemMatch({
			mode: 'versus',
			systemKey: 'recovery',
			opponentKey: 'attention',
			years: 5,
			steeringDecisions: [
				{ year: 2, phaseKey: 'opening', policyKey: 'media' },
				{ year: 4, phaseKey: 'deadline', policyKey: null }
			]
		});
		const steeredSystem = match.systems.find((result) => result.system.key === 'recovery');

		expect(
			match.steering.decisions.map((decision) => ({
				year: decision.year,
				phase: decision.phase.key,
				policy: decision.policy?.key ?? null
			}))
		).toEqual([
			{ year: 2, phase: 'opening', policy: 'media' },
			{ year: 4, phase: 'deadline', policy: null }
		]);
		expect(
			steeredSystem?.timeline.map((entry) => ({
				year: entry.year,
				policy: entry.policy.key,
				decision: entry.decision,
				steered: entry.steered
			}))
		).toEqual([
			{
				year: 1,
				policy: 'schedule',
				decision: 'Recovery System ran Schedule Load',
				steered: false
			},
			{
				year: 2,
				policy: 'media',
				decision: 'Steered into Media Allocation',
				steered: true
			},
			{
				year: 3,
				policy: 'media',
				decision: 'Rippled Media Allocation',
				steered: true
			},
			{
				year: 4,
				policy: 'schedule',
				decision: "Held Recovery System's original System",
				steered: false
			},
			{
				year: 5,
				policy: 'schedule',
				decision: 'Recovery System ran Schedule Load',
				steered: false
			}
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
			'resource-solvency',
			'system-balance'
		]);
		expect(match.validation.requirements.map((requirement) => requirement.status)).toEqual(
			expect.arrayContaining(['pass'])
		);
		expect(['pass', 'watch', 'fail']).toContain(match.validation.status);
	});

	it('tracks a resource economy for steering costs without changing the upload contract', () => {
		const match = runSystemMatch({
			systemKey: 'recovery',
			years: 5,
			steeringYear: 3,
			steeringPhase: 'midseason',
			steeringPolicyKey: 'labor'
		});
		const steeredTurn = match.winner.timeline[2];
		const resourceGate = match.validation.requirements.find(
			(requirement) => requirement.key === 'resource-solvency'
		);

		expect(steeredTurn?.resourceMetrics.map((metric) => metric.key)).toEqual([
			'politicalCapital',
			'budgetFlexibility',
			'trustReserve',
			'mediaAttention',
			'ownerPatience'
		]);
		expect(steeredTurn?.resourceReceipt).toContain('Political capital');
		expect(steeredTurn?.resourceReceipt).toContain('resource floor');
		expect(steeredTurn?.eventReceipt).toContain('Labor flare-up');
		expect(steeredTurn?.resourceFloor).toBeGreaterThan(30);
		expect(resourceGate).toMatchObject({
			status: 'pass',
			summary: 'Resource floor preserved'
		});
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

	it('turns single-player into an explicit challenge with objective targets', () => {
		const match = runSystemMatch({
			systemKey: 'recovery',
			years: 5,
			steeringYear: 3,
			steeringPhase: 'midseason',
			steeringPolicyKey: 'labor'
		});

		expect(match.challenge).toMatchObject({
			label: 'Challenge cleared',
			status: 'cleared',
			summary: expect.stringContaining('score, owner room, and labor trust')
		});
		expect(match.challenge.objectives.map((objective) => objective.key)).toEqual([
			'valid-score',
			'owner-room-floor',
			'labor-trust-floor'
		]);
		expect(match.challenge.objectives).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					key: 'valid-score',
					target: '76.0 valid score',
					value: '83.2',
					status: 'cleared'
				}),
				expect.objectContaining({
					key: 'owner-room-floor',
					target: '35 floor',
					value: '39',
					status: 'cleared'
				}),
				expect.objectContaining({
					key: 'labor-trust-floor',
					target: '65 floor',
					value: '68',
					status: 'cleared'
				})
			])
		);
	});

	it('keeps versus mode focused on race outcome instead of solo challenge targets', () => {
		const match = runSystemMatch({
			mode: 'versus',
			systemKey: 'recovery',
			opponentKey: 'attention'
		});

		expect(match.challenge).toMatchObject({
			label: 'Versus race',
			status: 'versus',
			objectives: []
		});
		expect(match.challenge.summary).toContain(match.winner.system.name);
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
		expect(match.challenge.status).toBe('missed');
		expect(match.challenge.objectives).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					key: 'owner-room-floor',
					status: 'missed'
				}),
				expect.objectContaining({
					key: 'labor-trust-floor',
					status: 'missed'
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
		const upload = parseSystemUpload(JSON.stringify({ systems: getSampleSystemMatchup() }));
		const match = runSystemMatch({
			mode: 'versus',
			systemKey: upload.systems[0]?.key,
			opponentKey: upload.systems[1]?.key,
			years: 3,
			customSystems: upload.systems
		});

		expect(upload.issues).toEqual([]);
		expect(upload.systems).toHaveLength(2);
		expect(upload.systems.map((system) => system.name)).toEqual([
			'Small Market Balance System',
			'Labor Stability System'
		]);
		expect(match.systems.map((result) => result.system.key).sort()).toEqual(
			upload.systems.map((system) => system.key).sort()
		);
		expect(
			match.validation.requirements.find((requirement) => requirement.key === 'system-balance')
		).toMatchObject({
			status: expect.not.stringMatching('deferred')
		});
	});

	it('provides a sample uploaded field with more than two competing Systems', () => {
		const upload = parseSystemUpload(JSON.stringify({ systems: getSampleSystemField() }));
		const match = runSystemMatch({
			mode: 'versus',
			systemKey: upload.systems[0]?.key,
			opponentKey: upload.systems[1]?.key,
			years: 5,
			customSystems: upload.systems
		});

		expect(upload.issues).toEqual([]);
		expect(upload.systems).toHaveLength(4);
		expect(upload.systems.map((system) => system.name)).toEqual([
			'Small Market Balance System',
			'Labor Stability System',
			'Owner Room System',
			'Global Growth System'
		]);
		expect(match.systems).toHaveLength(4);
		expect(match.systems.map((result) => result.system.key).sort()).toEqual(
			upload.systems.map((system) => system.key).sort()
		);
		expect(match.challenge.summary).toContain('4-System field');
	});

	it('runs uploaded entrant fields instead of only the selected pair', () => {
		const systems = [
			...getSampleSystemMatchup(),
			{
				name: 'Owner Room System',
				thesis:
					'Protect owner margin and resilience while keeping enough league health to survive the field.',
				stance: 'Uploaded System',
				constraint: 'Growth has to stay affordable for the board.',
				adaptation:
					'Uses schedule relief as the native operating policy while scoring owner room visibly.',
				policyKey: 'schedule',
				weights: {
					leagueHealth: 0.18,
					mediaValueB: 0.08,
					competitiveBalance: 0.14,
					laborTrust: 0.12,
					ownerMargin: 0.28,
					resilience: 0.2
				}
			}
		];
		const upload = parseSystemUpload(JSON.stringify({ systems }));
		const match = runSystemMatch({
			mode: 'versus',
			systemKey: upload.systems[0]?.key,
			opponentKey: upload.systems[1]?.key,
			years: 5,
			customSystems: upload.systems
		});

		expect(upload.issues).toEqual([]);
		expect(upload.systems).toHaveLength(3);
		expect(match.systems).toHaveLength(3);
		expect(match.systems.map((result) => result.system.key).sort()).toEqual(
			upload.systems.map((system) => system.key).sort()
		);
		expect(match.systems.map((result) => result.rank)).toEqual([1, 2, 3]);
		expect(match.challenge.summary).toContain(match.winner.system.name);
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
