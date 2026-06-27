export type PolicyKey = 'schedule' | 'media' | 'labor';
export type SystemKey = 'recovery' | 'attention' | 'trust';
export type SystemId = string;
export type LabMode = 'single' | 'versus';
export type SeasonPhaseKey = 'opening' | 'midseason' | 'deadline';

export type Tone = 'black' | 'green' | 'blue' | 'neutral' | 'red';

export type LeagueState = {
	leagueHealth: number;
	mediaValueB: number;
	competitiveBalance: number;
	laborTrust: number;
	starAvailability: number;
	ownerMargin: number;
	globalAttention: number;
	scheduleLoad: number;
	travelWear: number;
	smallMarketVisibility: number;
};

export type ManagementPolicy = {
	key: PolicyKey;
	label: string;
	arena: string;
	change: string;
	pressure: string;
	score: string;
	effects: Partial<LeagueState>;
};

export type MetricOutput = {
	key: keyof Pick<
		LeagueState,
		'leagueHealth' | 'mediaValueB' | 'competitiveBalance' | 'laborTrust'
	>;
	label: string;
	value: string;
	delta: string;
	tone: Tone;
};

export type MapNode = {
	id: string;
	label: string;
	detail: string;
	x: number;
	y: number;
	mx: number;
	my: number;
	tone: Tone;
};

export type BoardReport = {
	label: string;
	title: string;
	detail: string;
};

export type SeasonLedgerEntry = {
	label: string;
	value: string;
	detail: string;
};

export type ManagementScenario = {
	policy: ManagementPolicy;
	baseline: LeagueState;
	state: LeagueState;
	metrics: MetricOutput[];
	nodes: MapNode[];
	reports: BoardReport[];
	ledger: SeasonLedgerEntry[];
};

export type SystemScoreWeights = {
	leagueHealth: number;
	mediaValueB: number;
	competitiveBalance: number;
	laborTrust: number;
	ownerMargin: number;
	resilience: number;
};

export type SystemScoreContribution = {
	key: keyof SystemScoreWeights;
	label: string;
	rawValue: number;
	weight: number;
	value: number;
	readout: string;
};

export type System = {
	key: SystemId;
	name: string;
	thesis: string;
	stance: string;
	constraint: string;
	adaptation: string;
	policyKey: PolicyKey;
	weights: SystemScoreWeights;
};

export type SystemUploadDefinition = {
	key?: string;
	name: string;
	thesis: string;
	stance?: string;
	constraint?: string;
	adaptation?: string;
	policyKey: PolicyKey;
	weights: SystemScoreWeights;
};

export type SystemUploadIssue = {
	path: string;
	message: string;
};

export type SystemUploadResult = {
	systems: System[];
	issues: SystemUploadIssue[];
};

export type SeasonPhase = {
	key: SeasonPhaseKey;
	label: string;
	impact: number;
	readout: string;
};

export type Environment = {
	key: string;
	name: string;
	pressure: string;
	winCondition: string;
	effects: Partial<LeagueState>;
};

export type GameRequirementSeverity = 'pass' | 'watch' | 'fail' | 'deferred';

export type GameRequirementKey =
	| 'state-bounds'
	| 'tradeoff-integrity'
	| 'owner-room'
	| 'labor-plausibility'
	| 'projection-honesty'
	| 'system-balance';

export type SystemValidationImpact = {
	rawScore: number;
	adjustment: number;
	score: number;
	label: string;
	summary: string;
	impacts: SystemGateImpact[];
};

export type SystemGateImpact = {
	key: Exclude<GameRequirementKey, 'system-balance'>;
	label: string;
	status: Exclude<GameRequirementSeverity, 'deferred'>;
	adjustment: number;
	detail: string;
};

export type SystemResult = {
	system: System;
	scenario: ManagementScenario;
	timeline: SystemTimelineEntry[];
	scoreContributions: SystemScoreContribution[];
	score: number;
	rawScore: number;
	validationImpact: SystemValidationImpact;
	startScore: number;
	compoundedScoreDelta: number;
	rank: number;
	outcome: string;
	failureMode: string;
};

export type SystemProjection = {
	label: string;
	value: string;
	detail: string;
};

export type SystemChallengeStatus = 'cleared' | 'close' | 'missed' | 'versus';

export type SystemChallengeObjectiveStatus = Exclude<SystemChallengeStatus, 'versus'>;

export type SystemChallengeObjective = {
	key: 'valid-score' | 'owner-room-floor' | 'labor-trust-floor';
	label: string;
	status: SystemChallengeObjectiveStatus;
	target: string;
	value: string;
	detail: string;
};

export type SystemChallenge = {
	label: string;
	status: SystemChallengeStatus;
	summary: string;
	objectives: SystemChallengeObjective[];
};

export type GameRequirement = {
	key: GameRequirementKey;
	label: string;
	status: GameRequirementSeverity;
	summary: string;
	detail: string;
};

export type ValidationSummary = {
	status: GameRequirementSeverity;
	label: string;
	summary: string;
	requirements: GameRequirement[];
};

export type SystemTimelineEntry = {
	year: number;
	phase: SeasonPhase;
	policy: ManagementPolicy;
	policyIntensity: number;
	state: LeagueState;
	metrics: MetricOutput[];
	nodes: MapNode[];
	scoreContributions: SystemScoreContribution[];
	score: number;
	delta: number;
	decision: string;
	receipt: string;
	steered: boolean;
};

export type SystemMatchInput = {
	mode?: LabMode;
	systemKey?: SystemId;
	opponentKey?: SystemId;
	years?: number;
	steeringYear?: number;
	steeringPhase?: SeasonPhaseKey;
	steeringPolicyKey?: PolicyKey;
	environment?: Environment;
	customSystems?: System[];
};

export type SystemMatch = {
	mode: LabMode;
	environment: Environment;
	years: number;
	steering: {
		year: number;
		phase: SeasonPhase;
		policy: ManagementPolicy | null;
		targetSystem: System;
	};
	systems: SystemResult[];
	winner: SystemResult;
	challenge: SystemChallenge;
	projections: SystemProjection[];
	validation: ValidationSummary;
	reports: BoardReport[];
	ledger: SeasonLedgerEntry[];
};

const baselineLeagueState: LeagueState = {
	leagueHealth: 76,
	mediaValueB: 8.35,
	competitiveBalance: 60,
	laborTrust: 66,
	starAvailability: 72,
	ownerMargin: 74,
	globalAttention: 58,
	scheduleLoad: 70,
	travelWear: 62,
	smallMarketVisibility: 54
};

const managementPolicies: ManagementPolicy[] = [
	{
		key: 'schedule',
		label: 'Schedule Load',
		arena: 'State Lab',
		change: 'Cut back-to-backs by 30%',
		pressure: 'Less star fatigue, tighter national inventory',
		score: '+12 health',
		effects: {
			scheduleLoad: -18,
			travelWear: -14,
			starAvailability: 10,
			laborTrust: 4,
			competitiveBalance: 6,
			ownerMargin: -4,
			globalAttention: 2
		}
	},
	{
		key: 'media',
		label: 'Media Allocation',
		arena: 'League Office',
		change: 'Shift 18 marquee games to rising markets',
		pressure: 'Better parity story, lower short-term certainty',
		score: '+9 attention',
		effects: {
			mediaValueB: 0.42,
			competitiveBalance: 8,
			globalAttention: 9,
			smallMarketVisibility: 16,
			ownerMargin: -6,
			scheduleLoad: 3,
			starAvailability: -2
		}
	},
	{
		key: 'labor',
		label: 'Labor Trust',
		arena: 'Board Report',
		change: 'Guarantee recovery windows after travel spikes',
		pressure: 'Player trust rises, owner margin tightens',
		score: '+15 trust',
		effects: {
			laborTrust: 14,
			travelWear: -8,
			starAvailability: 6,
			leagueHealth: 8,
			competitiveBalance: 5,
			mediaValueB: 0.18,
			ownerMargin: -10
		}
	}
];

const environments: Environment[] = [
	{
		key: 'national-window',
		name: 'National TV Labor Crunch',
		pressure: 'Same schedule, same media demand, same labor scrutiny',
		winCondition: 'Highest resilient league score after pressure is applied',
		effects: {
			scheduleLoad: 6,
			travelWear: 5,
			globalAttention: 5,
			ownerMargin: -3,
			laborTrust: -2
		}
	},
	{
		key: 'expansion-surge',
		name: 'Expansion Surge',
		pressure: 'New markets create attention upside while travel and parity stress rise',
		winCondition: 'Highest growth score that preserves balance and resilience',
		effects: {
			mediaValueB: 0.35,
			globalAttention: 13,
			smallMarketVisibility: 9,
			scheduleLoad: 4,
			travelWear: 3,
			competitiveBalance: -4,
			ownerMargin: -2,
			laborTrust: -1
		}
	},
	{
		key: 'labor-deadline',
		name: 'Labor Deadline',
		pressure: 'Trust, owner room, and star availability are all under negotiation stress',
		winCondition: 'Highest durable score without breaking labor or owner-room gates',
		effects: {
			leagueHealth: -3,
			laborTrust: -8,
			ownerMargin: -6,
			travelWear: 6,
			scheduleLoad: 3,
			starAvailability: -4,
			competitiveBalance: 2
		}
	},
	{
		key: 'parity-reset',
		name: 'Parity Reset',
		pressure: 'Competitive balance is protected while national upside is less automatic',
		winCondition: 'Highest balanced score after small-market visibility is weighted up',
		effects: {
			leagueHealth: 2,
			competitiveBalance: 10,
			smallMarketVisibility: 8,
			scheduleLoad: -2,
			globalAttention: -2,
			mediaValueB: -0.1,
			ownerMargin: -1
		}
	}
];

const defaultEnvironment: Environment = environments[0];

const defaultHorizonYears = 5;
const minHorizonYears = 1;
const maxHorizonYears = 12;

const seasonPhases: SeasonPhase[] = [
	{
		key: 'opening',
		label: 'Opening window',
		impact: 1,
		readout: 'Full-season steering; the decision has the whole year to compound.'
	},
	{
		key: 'midseason',
		label: 'Midseason window',
		impact: 0.62,
		readout: 'Partial-season steering; the decision ripples through the remaining schedule.'
	},
	{
		key: 'deadline',
		label: 'Deadline window',
		impact: 0.34,
		readout: 'Late steering; near-term impact is limited but projections still change.'
	}
];

const systems: System[] = [
	{
		key: 'recovery',
		name: 'Recovery System',
		thesis: 'Protect star availability first, then let media value follow healthier inventory.',
		stance: 'System vs environment',
		constraint: 'Owner room tightens when rest windows reduce flexible inventory.',
		adaptation: 'Cuts back-to-backs and accepts lower short-term margin flexibility.',
		policyKey: 'schedule',
		weights: {
			leagueHealth: 0.26,
			mediaValueB: 0.14,
			competitiveBalance: 0.18,
			laborTrust: 0.18,
			ownerMargin: 0.08,
			resilience: 0.16
		}
	},
	{
		key: 'attention',
		name: 'Attention System',
		thesis: 'Move attention into rising markets so the league grows without only leaning on incumbents.',
		stance: 'System vs system',
		constraint: 'Short-term certainty drops when marquee inventory spreads out.',
		adaptation: 'Shifts showcase games toward high-upside markets and accepts more volatility.',
		policyKey: 'media',
		weights: {
			leagueHealth: 0.12,
			mediaValueB: 0.3,
			competitiveBalance: 0.16,
			laborTrust: 0.08,
			ownerMargin: 0.16,
			resilience: 0.18
		}
	},
	{
		key: 'trust',
		name: 'Trust System',
		thesis: 'Build around player trust because durable labor peace protects the whole product.',
		stance: 'System vs pressure',
		constraint: 'Guarantees create board pressure before the upside fully compounds.',
		adaptation: 'Locks recovery enforcement into the operating model and makes tradeoffs visible.',
		policyKey: 'labor',
		weights: {
			leagueHealth: 0.2,
			mediaValueB: 0.1,
			competitiveBalance: 0.16,
			laborTrust: 0.3,
			ownerMargin: 0.08,
			resilience: 0.16
		}
	}
];

const systemWeightKeys = [
	'leagueHealth',
	'mediaValueB',
	'competitiveBalance',
	'laborTrust',
	'ownerMargin',
	'resilience'
] as const satisfies (keyof SystemScoreWeights)[];

const systemWeightLabels = {
	leagueHealth: 'League health',
	mediaValueB: 'Media value',
	competitiveBalance: 'Competitive balance',
	laborTrust: 'Labor trust',
	ownerMargin: 'Owner margin',
	resilience: 'Resilience'
} as const satisfies Record<keyof SystemScoreWeights, string>;

const sampleSystemUpload: SystemUploadDefinition = {
	name: 'Small Market Balance System',
	thesis: 'Protect competitive balance and small-market visibility before chasing short-term media certainty.',
	stance: 'Uploaded System',
	constraint: 'Owner margin must stay visible while attention shifts away from incumbent markets.',
	adaptation: 'Moves showcase inventory into rising markets but keeps enough resilience in the score.',
	policyKey: 'media',
	weights: {
		leagueHealth: 0.14,
		mediaValueB: 0.18,
		competitiveBalance: 0.28,
		laborTrust: 0.12,
		ownerMargin: 0.1,
		resilience: 0.18
	}
};

const sampleSystemMatchup: SystemUploadDefinition[] = [
	sampleSystemUpload,
	{
		name: 'Labor Stability System',
		thesis: 'Protect labor trust and long-run resilience even when the media window gets noisy.',
		stance: 'Uploaded System',
		constraint: 'Owner margin has to stay credible while labor trust compounds.',
		adaptation: 'Uses labor enforcement as its native policy and lets the gates test whether trust was affordable.',
		policyKey: 'labor',
		weights: {
			leagueHealth: 0.18,
			mediaValueB: 0.1,
			competitiveBalance: 0.14,
			laborTrust: 0.3,
			ownerMargin: 0.1,
			resilience: 0.18
		}
	}
];

const nodePositions: Record<string, Pick<MapNode, 'x' | 'y' | 'mx' | 'my'>> = {
	policy: { x: 9, y: 18, mx: 4, my: 12 },
	fatigue: { x: 35, y: 13, mx: 36, my: 12 },
	stars: { x: 64, y: 20, mx: 61, my: 25 },
	media: { x: 78, y: 49, mx: 61, my: 47 },
	owners: { x: 51, y: 70, mx: 36, my: 72 },
	trust: { x: 22, y: 66, mx: 5, my: 55 }
};

export function getDefaultLeagueState(): LeagueState {
	return { ...baselineLeagueState };
}

export function listManagementPolicies(): ManagementPolicy[] {
	return managementPolicies.map((policy) => ({ ...policy, effects: { ...policy.effects } }));
}

export function listSystems(customSystems: System[] = []): System[] {
	return buildSystemPool(customSystems);
}

export function getSampleSystemUpload(): SystemUploadDefinition {
	return cloneUploadDefinition(sampleSystemUpload);
}

export function getSampleSystemMatchup(): SystemUploadDefinition[] {
	return sampleSystemMatchup.map(cloneUploadDefinition);
}

export function parseSystemUpload(input: string): SystemUploadResult {
	const issues: SystemUploadIssue[] = [];
	let parsed: unknown;

	try {
		parsed = JSON.parse(input);
	} catch {
		return {
			systems: [],
			issues: [{ path: 'json', message: 'Upload must be valid JSON.' }]
		};
	}

	const definitions = extractUploadDefinitions(parsed, issues);
	const usedKeys = new Set(systems.map((system) => system.key));
	const accepted: System[] = [];

	for (const [index, definition] of definitions.entries()) {
		const system = normalizeUploadedSystem(definition, index, usedKeys, issues);
		if (system) {
			usedKeys.add(system.key);
			accepted.push(system);
		}
	}

	if (accepted.length > 6) {
		issues.push({ path: 'systems', message: 'Only the first 6 uploaded Systems can enter a run.' });
	}

	return {
		systems: accepted.slice(0, 6),
		issues
	};
}

export function listSeasonPhases(): SeasonPhase[] {
	return seasonPhases.map(cloneSeasonPhase);
}

export function listEnvironments(): Environment[] {
	return environments.map(cloneEnvironment);
}

export function getDefaultEnvironment(): Environment {
	return cloneEnvironment(defaultEnvironment);
}

export function runSystemMatch(input: SystemMatchInput = {}): SystemMatch {
	const mode = input.mode ?? 'single';
	const years = clampHorizon(input.years);
	const steeringYear = clampSteeringYear(input.steeringYear, years);
	const steeringPhase = findSeasonPhase(input.steeringPhase ?? 'midseason');
	const steeringPolicy = input.steeringPolicyKey ? findPolicy(input.steeringPolicyKey) : null;
	const environment = cloneEnvironment(input.environment ?? defaultEnvironment);
	const systemPool = buildSystemPool(input.customSystems);
	const primary = findSystem(input.systemKey ?? 'recovery', systemPool);
	const opponent = findOpponent(systemPool, primary.key, input.opponentKey);
	const entrants = mode === 'versus' ? [primary, opponent] : [primary];
	const environmentBaseline = applyEnvironmentEffects(baselineLeagueState, environment);
	const unsteeredPrimary = buildSystemResult(primary, environmentBaseline, environment, {
		years,
		steeringYear,
		steeringPhase,
		steeringPolicy: null,
		targetSystemKey: primary.key
	});
	const rawResults = entrants.map((system) =>
			buildSystemResult(system, environmentBaseline, environment, {
				years,
				steeringYear,
				steeringPhase,
				steeringPolicy,
				targetSystemKey: primary.key
			})
	);
	const ranked = applyValidationImpacts(rawResults, environmentBaseline)
		.sort((left, right) => right.score - left.score)
		.map((result, index) => ({ ...result, rank: index + 1 }));
	const winner = ranked[0];

	return {
		mode,
		environment,
		years,
		steering: {
			year: steeringYear,
			phase: cloneSeasonPhase(steeringPhase),
			policy: steeringPolicy ? clonePolicy(steeringPolicy) : null,
			targetSystem: cloneSystem(primary)
		},
		systems: ranked,
		winner,
		challenge: buildSystemChallenge(mode, environment, ranked),
		projections: buildSystemProjections(ranked, unsteeredPrimary, years, steeringYear, steeringPhase),
		validation: buildValidationSummary(mode, environmentBaseline, ranked, years),
		reports: buildSystemReports(mode, environment, years, ranked),
		ledger: buildSystemLedger(
			mode,
			environment,
			years,
			ranked,
			steeringYear,
			steeringPhase,
			steeringPolicy
		)
	};
}

export function runManagementScenario(
	policyKey: PolicyKey,
	baseline: LeagueState = baselineLeagueState,
	policyIntensity = 1
): ManagementScenario {
	const policy =
		managementPolicies.find((candidate) => candidate.key === policyKey) ?? managementPolicies[0];
	const state = applyPolicyEffects(baseline, policy, policyIntensity);

	return {
		policy: { ...policy, effects: { ...policy.effects } },
		baseline: { ...baseline },
		state,
		metrics: buildMetrics(baseline, state),
		nodes: buildNodes(policy, baseline, state),
		reports: buildReports(policy, baseline, state),
		ledger: buildLedger(policy, baseline, state)
	};
}

function buildSystemResult(
	system: System,
	baseline: LeagueState,
	environment: Environment,
	options: {
		years: number;
		steeringYear: number;
		steeringPhase: SeasonPhase;
		steeringPolicy: ManagementPolicy | null;
		targetSystemKey: SystemId;
	}
): SystemResult {
	let seasonBaseline = { ...baseline };
	let scenario = runManagementScenario(system.policyKey, seasonBaseline);
	const timeline: SystemTimelineEntry[] = [];
	const startScore = scoreSystem(system, baseline);
	let previousScore = startScore;

	for (let year = 1; year <= options.years; year += 1) {
		const isSteered =
			system.key === options.targetSystemKey &&
			options.steeringPolicy !== null &&
			year >= options.steeringYear;
		const policyKey = isSteered ? options.steeringPolicy.key : system.policyKey;
		const policyIntensity =
			isSteered && year === options.steeringYear ? options.steeringPhase.impact : 1;
		scenario = runManagementScenario(policyKey, seasonBaseline, policyIntensity);
		const scoreContributions = buildScoreContributions(system, scenario.state);
		const score = scoreSystem(system, scenario.state);
		const delta = roundTo(score - previousScore, 1);

		timeline.push({
			year,
			phase: cloneSeasonPhase(isSteered && year === options.steeringYear ? options.steeringPhase : seasonPhases[0]),
			policy: clonePolicy(scenario.policy),
			policyIntensity,
			state: { ...scenario.state },
			metrics: scenario.metrics.map((metric) => ({ ...metric })),
			nodes: scenario.nodes.map((node) => ({ ...node })),
			scoreContributions,
			score,
			delta,
			decision: isSteered
				? `Steered into ${scenario.policy.label}`
				: `${system.name} ran ${scenario.policy.label}`,
			receipt: `${formatDelta(delta)} score; health ${formatScore(scenario.state.leagueHealth)}, trust ${formatScore(scenario.state.laborTrust)}, media $${scenario.state.mediaValueB.toFixed(2)}B.`,
			steered: isSteered
		});

		previousScore = score;
		seasonBaseline = advanceEnvironmentYear(scenario.state, environment, year);
	}

	const score = timeline.at(-1)?.score ?? startScore;
	const compoundedScoreDelta = roundTo(score - startScore, 1);
	const scoreContributions = buildScoreContributions(system, scenario.state);
	const validationImpact = buildCleanValidationImpact(score);

	return {
		system: cloneSystem(system),
		scenario,
		timeline,
		scoreContributions,
		score,
		rawScore: score,
		validationImpact,
		startScore,
		compoundedScoreDelta,
		rank: 1,
		outcome: `${system.name} scored ${score.toFixed(1)} after ${options.years} years.`,
		failureMode: buildFailureMode(system, scenario.state)
	};
}

function applyValidationImpacts(results: SystemResult[], baseline: LeagueState): SystemResult[] {
	return results.map((result) => {
		const validationImpact = buildSystemValidationImpact(result, baseline);
		const score = validationImpact.score;

		return {
			...result,
			score,
			rawScore: validationImpact.rawScore,
			validationImpact,
			compoundedScoreDelta: roundTo(score - result.startScore, 1),
			outcome: `${result.system.name} scored ${score.toFixed(1)} after gate adjustments.`
		};
	});
}

function buildCleanValidationImpact(rawScore: number): SystemValidationImpact {
	return {
		rawScore,
		adjustment: 0,
		score: rawScore,
		label: 'Clean score',
		summary: 'No requirement gate changed the System score.',
		impacts: []
	};
}

function buildSystemValidationImpact(
	result: SystemResult,
	baseline: LeagueState
): SystemValidationImpact {
	const impacts = [
		buildStateBoundsImpact(result),
		buildTradeoffImpact(result, baseline),
		buildOwnerRoomImpact(result),
		buildLaborImpact(result),
		buildProjectionHonestyImpact(result)
	];
	const adjustment = roundTo(
		impacts.reduce((total, impact) => total + impact.adjustment, 0),
		1
	);
	const score = roundTo(Math.max(0, result.rawScore + adjustment), 1);
	const activeImpacts = impacts.filter((impact) => impact.status !== 'pass');
	const hasFail = impacts.some((impact) => impact.status === 'fail');

	return {
		rawScore: result.rawScore,
		adjustment,
		score,
		label: hasFail ? 'Gate penalty applied' : activeImpacts.length > 0 ? 'Risk-adjusted score' : 'Clean score',
		summary:
			activeImpacts.length > 0
				? `${result.system.name} moved from ${result.rawScore.toFixed(1)} to ${score.toFixed(1)} after ${activeImpacts.length} requirement gate${activeImpacts.length === 1 ? '' : 's'}.`
				: 'No requirement gate changed the System score.',
		impacts
	};
}

function buildSystemChallenge(
	mode: LabMode,
	environment: Environment,
	results: SystemResult[]
): SystemChallenge {
	const winner = results[0];

	if (mode === 'versus') {
		return {
			label: 'Versus race',
			status: 'versus',
			summary: `${winner.system.name} is judged against the other System by final valid score.`,
			objectives: []
		};
	}

	const scoreTarget = getChallengeScoreTarget(environment.key);
	const finalState = winner.timeline.at(-1)?.state ?? winner.scenario.state;
	const objectives: SystemChallengeObjective[] = [
		{
			key: 'valid-score',
			label: 'Beat the pressure model',
			status: scoreStatus(winner.score, scoreTarget, 6),
			target: `${scoreTarget.toFixed(1)} valid score`,
			value: winner.score.toFixed(1),
			detail: `${winner.system.name} must clear the environment after requirement gates, not just post a high raw score.`
		},
		{
			key: 'owner-room-floor',
			label: 'Keep owner room credible',
			status: scoreStatus(minTimelineMetric([winner], 'ownerMargin'), 35, 5),
			target: '35 floor',
			value: formatScore(minTimelineMetric([winner], 'ownerMargin')),
			detail: 'Below 35 breaks the business side of the model; a narrow clear still leaves negotiating pressure.'
		},
		{
			key: 'labor-trust-floor',
			label: 'Protect labor trust',
			status: scoreStatus(minTimelineMetric([winner], 'laborTrust'), 65, 10),
			target: '65 floor',
			value: formatScore(minTimelineMetric([winner], 'laborTrust')),
			detail: `Final labor trust was ${formatScore(finalState.laborTrust)} after the steering path compounded.`
		}
	];
	const status = objectives.some((objective) => objective.status === 'missed')
		? 'missed'
		: objectives.some((objective) => objective.status === 'close')
			? 'close'
			: 'cleared';

	return {
		label:
			status === 'cleared'
				? 'Challenge cleared'
				: status === 'close'
					? 'Needs steering'
					: 'Challenge missed',
		status,
		summary:
			status === 'cleared'
				? `${winner.system.name} cleared the single-player challenge across score, owner room, and labor trust.`
				: status === 'close'
					? `${winner.system.name} stayed playable, but one objective is close enough to need steering attention.`
					: `${winner.system.name} missed at least one core objective; steer earlier or choose a different System.`,
		objectives
	};
}

function getChallengeScoreTarget(environmentKey: string): number {
	const targets: Record<string, number> = {
		'national-window': 76,
		'expansion-surge': 78,
		'labor-deadline': 72,
		'parity-reset': 76
	};

	return targets[environmentKey] ?? 76;
}

function scoreStatus(
	value: number,
	target: number,
	closeWindow: number
): SystemChallengeObjectiveStatus {
	if (value >= target) return 'cleared';
	if (value >= target - closeWindow) return 'close';
	return 'missed';
}

function buildStateBoundsImpact(result: SystemResult): SystemGateImpact {
	const invalidStates = result.timeline.filter((entry) => !isValidLeagueState(entry.state));

	return {
		key: 'state-bounds',
		label: 'State bounds',
		status: invalidStates.length > 0 ? 'fail' : 'pass',
		adjustment: invalidStates.length > 0 ? -24 : 0,
		detail:
			invalidStates.length > 0
				? `${invalidStates.length} state snapshot${invalidStates.length === 1 ? '' : 's'} left the playable model range.`
				: 'All state snapshots stayed inside the playable model range.'
	};
}

function buildTradeoffImpact(result: SystemResult, baseline: LeagueState): SystemGateImpact {
	const finalState = result.timeline.at(-1)?.state ?? result.scenario.state;
	const improved = result.rawScore - result.startScore > 8;
	const tradeoffs = countVisibleTradeoffs(baseline, finalState);

	if (improved && tradeoffs === 0) {
		return {
			key: 'tradeoff-integrity',
			label: 'Tradeoff integrity',
			status: 'fail',
			adjustment: -16,
			detail: 'Large upside without a visible counter-pressure is treated as an invalid free lunch.'
		};
	}

	if (tradeoffs === 0) {
		return {
			key: 'tradeoff-integrity',
			label: 'Tradeoff integrity',
			status: 'watch',
			adjustment: -4,
			detail: 'The System stayed too stable, so the game applies a small optimism haircut.'
		};
	}

	return {
		key: 'tradeoff-integrity',
		label: 'Tradeoff integrity',
		status: 'pass',
		adjustment: 0,
		detail: `${tradeoffs} visible tradeoff${tradeoffs === 1 ? '' : 's'} kept the upside credible.`
	};
}

function buildOwnerRoomImpact(result: SystemResult): SystemGateImpact {
	const minimumOwnerMargin = minTimelineMetric([result], 'ownerMargin');
	const status = minimumOwnerMargin < 35 ? 'fail' : minimumOwnerMargin < 60 ? 'watch' : 'pass';

	return {
		key: 'owner-room',
		label: 'Owner room',
		status,
		adjustment: status === 'fail' ? -18 : status === 'watch' ? -6 : 0,
		detail: `Minimum owner margin was ${formatScore(minimumOwnerMargin)}. Below 60 costs flexibility; below 35 breaks credibility.`
	};
}

function buildLaborImpact(result: SystemResult): SystemGateImpact {
	const minimumLaborTrust = minTimelineMetric([result], 'laborTrust');
	const maximumLaborTrust = maxTimelineMetric([result], 'laborTrust');
	const minimumOwnerMargin = minTimelineMetric([result], 'ownerMargin');
	const cappedLaborPeace = maximumLaborTrust >= 100 && minimumOwnerMargin < 55;
	const status = minimumLaborTrust < 50 ? 'fail' : minimumLaborTrust < 65 || cappedLaborPeace ? 'watch' : 'pass';

	return {
		key: 'labor-plausibility',
		label: 'Labor plausibility',
		status,
		adjustment: status === 'fail' ? -18 : status === 'watch' ? -6 : 0,
		detail: cappedLaborPeace
			? 'Maximum labor trust with tight owner room creates political cost.'
			: `Labor trust stayed between ${formatScore(minimumLaborTrust)} and ${formatScore(maximumLaborTrust)}.`
	};
}

function buildProjectionHonestyImpact(result: SystemResult): SystemGateImpact {
	const saturated = getSaturatedMetrics([result]);

	return {
		key: 'projection-honesty',
		label: 'Projection honesty',
		status: saturated.length > 0 ? 'watch' : 'pass',
		adjustment: saturated.length > 0 ? -3 : 0,
		detail:
			saturated.length > 0
				? `The ${formatList(saturated)} cap${saturated.length === 1 ? '' : 's'} ${saturated.length === 1 ? 'makes' : 'make'} the later-year projection directional.`
				: 'No major state metric hit a model cap.'
	};
}

function scoreSystem(system: System, state: LeagueState): number {
	return roundTo(
		buildScoreContributions(system, state).reduce(
			(total, contribution) => total + contribution.value,
			0
		),
		1
	);
}

function buildScoreContributions(system: System, state: LeagueState): SystemScoreContribution[] {
	const values: Record<keyof SystemScoreWeights, number> = {
		leagueHealth: state.leagueHealth,
		mediaValueB: clampScore(state.mediaValueB * 10),
		competitiveBalance: state.competitiveBalance,
		laborTrust: state.laborTrust,
		ownerMargin: state.ownerMargin,
		resilience: getResilienceScore(state)
	};

	return systemWeightKeys.map((key) => {
		const rawValue = roundTo(values[key], 1);
		const weight = system.weights[key];
		const value = roundTo(rawValue * weight, 1);

		return {
			key,
			label: systemWeightLabels[key],
			rawValue,
			weight,
			value,
			readout: `${formatScore(rawValue)} x ${Math.round(weight * 100)}%`
		};
	});
}

function getResilienceScore(state: LeagueState): number {
	const resilience = clampScore(
		(state.leagueHealth +
			state.laborTrust +
			state.competitiveBalance +
			state.starAvailability +
			(100 - state.travelWear)) /
			5
	);

	return roundTo(resilience, 1);
}

function buildFailureMode(system: System, state: LeagueState): string {
	if (state.ownerMargin < 64) return `${system.name} wins trust but leaves the owner room tight.`;
	if (state.laborTrust < 68) return `${system.name} grows value before labor trust catches up.`;
	if (state.competitiveBalance < 66) return `${system.name} needs a stronger parity backstop.`;
	return system.constraint;
}

function buildSystemReports(
	mode: LabMode,
	environment: Environment,
	years: number,
	results: SystemResult[]
): BoardReport[] {
	const winner = results[0];
	const challenger = results[1];

	return [
		{
			label: mode === 'versus' ? 'Winning System' : 'Single System',
			title:
				mode === 'versus' && challenger
					? `${winner.system.name} beat ${challenger.system.name} by ${roundTo(winner.score - challenger.score, 1).toFixed(1)} points after ${years} years.`
					: `${winner.system.name} survived ${years} years with a ${winner.score.toFixed(1)} valid score.`,
			detail: `${winner.system.thesis} Raw score ${winner.rawScore.toFixed(1)} became ${winner.score.toFixed(1)} after requirement gates inside ${environment.name}: ${environment.pressure.toLowerCase()}.`
		},
		{
			label: 'Environment Signal',
			title: `The algorithm judged every System against the same pressure model and horizon.`,
			detail: `${environment.winCondition}. Scores update each year from health, media value, competitive balance, labor trust, margin, and resilience.`
		},
		{
			label: 'Failure Mode',
			title: winner.failureMode,
			detail: `The compounding ledger keeps the System steerable: a decision can change from any year without hiding the tradeoff or gate cost.`
		}
	];
}

function buildSystemProjections(
	results: SystemResult[],
	unsteeredPrimary: SystemResult,
	years: number,
	steeringYear: number,
	steeringPhase: SeasonPhase
): SystemProjection[] {
	const winner = results[0];
	const primary = results.find((result) => result.system.key === unsteeredPrimary.system.key) ?? winner;
	const steeringDelta = roundTo(
		sumTimelineScores(primary.timeline) - sumTimelineScores(unsteeredPrimary.timeline),
		1
	);
	const remainingYears = Math.max(0, years - steeringYear);

	return [
		{
			label: 'Projected finish',
			value: `${winner.score.toFixed(1)}`,
			detail: `${winner.system.name} projects as the final leader after ${years} years. Raw ${winner.rawScore.toFixed(1)}, gate adjustment ${formatDelta(winner.validationImpact.adjustment)}.`
		},
		{
			label: 'Steering impact',
			value: formatDelta(steeringDelta),
			detail: `${steeringPhase.label} cumulative movement compared with the same System holding its original policy.`
		},
		{
			label: 'Ripple window',
			value: remainingYears === 0 ? 'This year' : `${remainingYears + 1} seasons`,
			detail: `${steeringPhase.readout} Subsequent years use the new policy at full strength.`
		}
	];
}

function buildValidationSummary(
	mode: LabMode,
	baseline: LeagueState,
	results: SystemResult[],
	years: number
): ValidationSummary {
	const requirements = [
		validateStateBounds(results),
		validateTradeoffs(baseline, results),
		validateOwnerRoom(results),
		validateLaborPlausibility(results),
		validateProjectionHonesty(results),
		validateSystemBalance(mode, results, years)
	];
	const status = requirements.reduce<GameRequirementSeverity>(
		(current, requirement) =>
			severityRank(requirement.status) > severityRank(current) ? requirement.status : current,
		'pass'
	);

	return {
		status,
		label:
			status === 'fail'
				? 'Validation break'
				: status === 'watch'
					? 'Prototype watch'
					: 'Validated run',
		summary:
			status === 'fail'
				? 'At least one baked-in realism gate applied a major score penalty.'
				: status === 'watch'
					? 'The run is playable, with requirement-watch penalties already reflected in final scores.'
					: 'Core bounds, tradeoffs, and balance checks passed for this run.',
		requirements
	};
}

function validateStateBounds(results: SystemResult[]): GameRequirement {
	const states = results.flatMap((result) => result.timeline.map((entry) => entry.state));
	const invalidStates = states.filter((state) => !isValidLeagueState(state));

	return {
		key: 'state-bounds',
		label: 'State bounds',
		status: invalidStates.length > 0 ? 'fail' : 'pass',
		summary: invalidStates.length > 0 ? 'Broken state values' : 'Bounded league state',
		detail:
			invalidStates.length > 0
				? `${invalidStates.length} state snapshot${invalidStates.length === 1 ? '' : 's'} left the supported score or media range.`
				: 'All score metrics stayed inside 0-100 and media value stayed inside the prototype range.'
	};
}

function validateTradeoffs(baseline: LeagueState, results: SystemResult[]): GameRequirement {
	const winner = results[0];
	const finalState = winner.timeline.at(-1)?.state ?? winner.scenario.state;
	const improved = winner.rawScore - winner.startScore > 8;
	const tradeoffs = countVisibleTradeoffs(baseline, finalState);

	if (improved && tradeoffs === 0) {
		return {
			key: 'tradeoff-integrity',
			label: 'Tradeoff integrity',
			status: 'fail',
			summary: 'Free upside detected',
			detail: `${winner.system.name} gained ${winner.compoundedScoreDelta.toFixed(1)} points without a visible operational downside.`
		};
	}

	return {
		key: 'tradeoff-integrity',
		label: 'Tradeoff integrity',
		status: tradeoffs === 0 ? 'watch' : 'pass',
		summary: tradeoffs === 0 ? 'Tradeoff is thin' : `${tradeoffs} visible tradeoff${tradeoffs === 1 ? '' : 's'}`,
		detail:
			tradeoffs === 0
				? 'This run stayed stable, so the next rules pass should pressure at least one counter-metric.'
				: 'Winning upside is paired with board, schedule, availability, trust, or parity pressure.'
	};
}

function validateOwnerRoom(results: SystemResult[]): GameRequirement {
	const minimumOwnerMargin = minTimelineMetric(results, 'ownerMargin');

	return {
		key: 'owner-room',
		label: 'Owner room',
		status: minimumOwnerMargin < 35 ? 'fail' : minimumOwnerMargin < 60 ? 'watch' : 'pass',
		summary:
			minimumOwnerMargin < 35
				? 'Owner room broke'
				: minimumOwnerMargin < 60
					? 'Owner room is tight'
					: 'Owner room preserved',
		detail: `Minimum owner margin across the run was ${formatScore(minimumOwnerMargin)}. Below 60 needs governance pressure; below 35 is not credible.`
	};
}

function validateLaborPlausibility(results: SystemResult[]): GameRequirement {
	const minimumLaborTrust = minTimelineMetric(results, 'laborTrust');
	const maximumLaborTrust = maxTimelineMetric(results, 'laborTrust');
	const minimumOwnerMargin = minTimelineMetric(results, 'ownerMargin');
	const cappedLaborPeace = maximumLaborTrust >= 100 && minimumOwnerMargin < 55;

	return {
		key: 'labor-plausibility',
		label: 'Labor plausibility',
		status: minimumLaborTrust < 50 ? 'fail' : minimumLaborTrust < 65 || cappedLaborPeace ? 'watch' : 'pass',
		summary:
			minimumLaborTrust < 50
				? 'Trust collapsed'
				: cappedLaborPeace
					? 'Labor peace is expensive'
					: minimumLaborTrust < 65
						? 'Trust is fragile'
						: 'Labor path is plausible',
		detail: cappedLaborPeace
			? 'The model reached maximum labor trust while owner margin was below 55, so the projection should be treated as politically expensive.'
			: `Labor trust stayed between ${formatScore(minimumLaborTrust)} and ${formatScore(maximumLaborTrust)} across the run.`
	};
}

function validateProjectionHonesty(results: SystemResult[]): GameRequirement {
	const saturated = getSaturatedMetrics(results);

	return {
		key: 'projection-honesty',
		label: 'Projection honesty',
		status: saturated.length > 0 ? 'watch' : 'pass',
		summary: saturated.length > 0 ? 'Capped projection' : 'Uncapped projection',
		detail:
			saturated.length > 0
				? `The run hit the ${formatList(saturated)} cap${saturated.length === 1 ? '' : 's'}, so later-year projections are directional rather than exact.`
				: 'No major state metric hit a model cap during the selected horizon.'
	};
}

function validateSystemBalance(
	mode: LabMode,
	results: SystemResult[],
	years: number
): GameRequirement {
	if (results.length < 2) {
		return {
			key: 'system-balance',
			label: 'System balance',
			status: 'deferred',
			summary: 'Versus not run',
			detail: 'Switch to versus mode to evaluate balance between two Systems under the same horizon.'
		};
	}

	const margin = roundTo(results[0].score - results[1].score, 1);
	const normalizedMargin = roundTo(margin / Math.max(years, 1), 1);

	return {
		key: 'system-balance',
		label: 'System balance',
		status: margin > 32 ? 'fail' : margin > 18 ? 'watch' : 'pass',
		summary:
			margin > 32
				? 'Dominant System'
				: margin > 18
					? 'Large winner margin'
					: `${mode === 'versus' ? 'Versus' : 'System'} balance held`,
		detail: `${results[0].system.name} led by ${margin.toFixed(1)} total points, or ${normalizedMargin.toFixed(1)} per season.`
	};
}

function sumTimelineScores(timeline: SystemTimelineEntry[]): number {
	return roundTo(
		timeline.reduce((total, entry) => total + entry.score, 0),
		1
	);
}

function buildSystemLedger(
	mode: LabMode,
	environment: Environment,
	years: number,
	results: SystemResult[],
	steeringYear: number,
	steeringPhase: SeasonPhase,
	steeringPolicy: ManagementPolicy | null
): SeasonLedgerEntry[] {
	const winner = results[0];
	const challenger = results[1];

	return [
		{
			label: 'Mode',
			value: mode === 'versus' ? 'System vs System' : 'System vs Environment',
			detail:
				mode === 'versus'
					? 'Two Systems ran against the same seeded league pressure.'
					: 'One System ran against the environment as the opponent.'
		},
		{
			label: 'Horizon',
			value: `${years} years`,
			detail: `${environment.name}: ${environment.pressure}.`
		},
		{
			label: 'Winning System',
			value: winner.system.name,
			detail:
				mode === 'versus' && challenger
					? `${winner.score.toFixed(1)} valid score versus ${challenger.score.toFixed(1)}. Raw ${winner.rawScore.toFixed(1)}.`
					: `${winner.score.toFixed(1)} valid score from ${winner.rawScore.toFixed(1)} raw. Compounded ${formatDelta(winner.compoundedScoreDelta)}.`
		},
		{
			label: 'Steering',
			value: steeringPolicy ? `Year ${steeringYear}, ${steeringPhase.label}` : 'Original system',
			detail: steeringPolicy
				? `Active System switches to ${steeringPolicy.label}; first-season impact is ${Math.round(steeringPhase.impact * 100)}%, then ripples forward.`
				: 'No mid-run steering applied; the System keeps its native operating policy.'
		}
	];
}

function advanceEnvironmentYear(
	state: LeagueState,
	environment: Environment,
	year: number
): LeagueState {
	const next = { ...state };
	const pressureFactor = 0.12 + Math.min(year, 8) * 0.01;

	for (const [key, delta] of Object.entries(environment.effects) as [keyof LeagueState, number][]) {
		next[key] =
			key === 'mediaValueB'
				? roundTo(next[key] + delta * pressureFactor, 2)
				: clampScore(next[key] + delta * pressureFactor);
	}

	const wearDrag = Math.max(0, next.travelWear - 58);
	const trustDrag = Math.max(0, 70 - next.laborTrust);
	const visibilityLift = Math.max(0, next.smallMarketVisibility - 58);

	return {
		...next,
		leagueHealth: clampScore(next.leagueHealth - wearDrag * 0.04 - trustDrag * 0.03),
		mediaValueB: roundTo(next.mediaValueB + next.globalAttention * 0.002 + visibilityLift * 0.006, 2),
		competitiveBalance: clampScore(next.competitiveBalance + visibilityLift * 0.025 - wearDrag * 0.015)
	};
}

function applyEnvironmentEffects(baseline: LeagueState, environment: Environment): LeagueState {
	const state = { ...baseline };

	for (const [key, delta] of Object.entries(environment.effects) as [keyof LeagueState, number][]) {
		state[key] =
			key === 'mediaValueB' ? roundTo(state[key] + delta, 2) : clampScore(state[key] + delta);
	}

	return state;
}

function buildSystemPool(customSystems: System[] | undefined): System[] {
	const pool = systems.map(cloneSystem);
	const usedKeys = new Set(pool.map((system) => system.key));

	for (const system of customSystems ?? []) {
		if (usedKeys.has(system.key)) continue;
		usedKeys.add(system.key);
		pool.push(cloneSystem(system));
	}

	return pool;
}

function findSystem(key: SystemId, systemPool = systems): System {
	return systemPool.find((system) => system.key === key) ?? systemPool[0] ?? systems[0];
}

function findPolicy(key: PolicyKey): ManagementPolicy {
	return managementPolicies.find((policy) => policy.key === key) ?? managementPolicies[0];
}

function findSeasonPhase(key: SeasonPhaseKey): SeasonPhase {
	return seasonPhases.find((phase) => phase.key === key) ?? seasonPhases[1];
}

function findOpponent(systemPool: System[], primaryKey: SystemId, opponentKey?: SystemId): System {
	const requested = opponentKey ? findSystem(opponentKey, systemPool) : undefined;
	if (requested && requested.key !== primaryKey) return requested;
	return systemPool.find((system) => system.key !== primaryKey) ?? systemPool[1] ?? systems[1];
}

function clampHorizon(years: number | undefined): number {
	if (typeof years !== 'number' || Number.isNaN(years)) return defaultHorizonYears;
	return Math.min(maxHorizonYears, Math.max(minHorizonYears, Math.round(years)));
}

function clampSteeringYear(year: number | undefined, years: number): number {
	if (typeof year !== 'number' || Number.isNaN(year)) return Math.min(3, years);
	return Math.min(years, Math.max(1, Math.round(year)));
}

function cloneSystem(system: System): System {
	return { ...system, weights: { ...system.weights } };
}

function cloneUploadDefinition(definition: SystemUploadDefinition): SystemUploadDefinition {
	return { ...definition, weights: { ...definition.weights } };
}

function extractUploadDefinitions(
	parsed: unknown,
	issues: SystemUploadIssue[]
): unknown[] {
	if (Array.isArray(parsed)) return parsed;

	if (isRecord(parsed)) {
		if (Array.isArray(parsed.systems)) return parsed.systems;
		return [parsed];
	}

	issues.push({ path: 'json', message: 'Upload must be a System object or a systems array.' });
	return [];
}

function normalizeUploadedSystem(
	definition: unknown,
	index: number,
	usedKeys: Set<string>,
	issues: SystemUploadIssue[]
): System | null {
	const path = `systems[${index}]`;

	if (!isRecord(definition)) {
		issues.push({ path, message: 'System definition must be an object.' });
		return null;
	}

	const name = readBoundedString(definition.name, `${path}.name`, issues, {
		min: 3,
		max: 44,
		label: 'System name'
	});
	const thesis = readBoundedString(definition.thesis, `${path}.thesis`, issues, {
		min: 12,
		max: 180,
		label: 'Thesis'
	});
	const policyKey = readPolicyKey(definition.policyKey, `${path}.policyKey`, issues);
	const weights = readSystemWeights(definition.weights, `${path}.weights`, issues);

	if (!name || !thesis || !policyKey || !weights) return null;

	return {
		key: uniqueCustomKey(definition.key, name, usedKeys),
		name,
		thesis,
		stance: readOptionalString(definition.stance, 'Uploaded System', 48),
		constraint: readOptionalString(
			definition.constraint,
			'Custom System must survive the same owner, labor, and market pressure as the built-ins.',
			180
		),
		adaptation: readOptionalString(
			definition.adaptation,
			'Runs its declared policy bias and lets the validation gates expose the tradeoffs.',
			180
		),
		policyKey,
		weights
	};
}

function readSystemWeights(
	value: unknown,
	path: string,
	issues: SystemUploadIssue[]
): SystemScoreWeights | null {
	if (!isRecord(value)) {
		issues.push({ path, message: 'Weights must be an object with all scoring keys.' });
		return null;
	}

	const weights: Partial<SystemScoreWeights> = {};

	for (const key of systemWeightKeys) {
		const weight = value[key];
		if (typeof weight !== 'number' || !Number.isFinite(weight)) {
			issues.push({ path: `${path}.${key}`, message: 'Weight must be a finite number.' });
			continue;
		}

		if (weight < 0 || weight > 0.45) {
			issues.push({ path: `${path}.${key}`, message: 'Weight must be between 0 and 0.45.' });
			continue;
		}

		weights[key] = roundTo(weight, 3);
	}

	let policyIssue = false;

	if (typeof weights.ownerMargin === 'number' && weights.ownerMargin < 0.04) {
		issues.push({ path: `${path}.ownerMargin`, message: 'Owner margin weight must be at least 0.04.' });
		policyIssue = true;
	}

	if (typeof weights.resilience === 'number' && weights.resilience < 0.08) {
		issues.push({ path: `${path}.resilience`, message: 'Resilience weight must be at least 0.08.' });
		policyIssue = true;
	}

	if (systemWeightKeys.some((key) => typeof weights[key] !== 'number')) return null;

	const normalized = weights as SystemScoreWeights;
	const sum = roundTo(
		systemWeightKeys.reduce((total, key) => total + normalized[key], 0),
		3
	);

	if (Math.abs(sum - 1) > 0.01) {
		issues.push({ path, message: `Weights must sum to 1. Current sum is ${sum.toFixed(3)}.` });
		return null;
	}

	if (policyIssue) {
		return null;
	}

	return normalized;
}

function readBoundedString(
	value: unknown,
	path: string,
	issues: SystemUploadIssue[],
	options: { min: number; max: number; label: string }
): string | null {
	if (typeof value !== 'string') {
		issues.push({ path, message: `${options.label} is required.` });
		return null;
	}

	const trimmed = value.trim();
	if (trimmed.length < options.min || trimmed.length > options.max) {
		issues.push({
			path,
			message: `${options.label} must be ${options.min}-${options.max} characters.`
		});
		return null;
	}

	return trimmed;
}

function readOptionalString(value: unknown, fallback: string, max: number): string {
	if (typeof value !== 'string') return fallback;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed.slice(0, max) : fallback;
}

function readPolicyKey(
	value: unknown,
	path: string,
	issues: SystemUploadIssue[]
): PolicyKey | null {
	if (value === 'schedule' || value === 'media' || value === 'labor') return value;
	issues.push({ path, message: 'Policy key must be schedule, media, or labor.' });
	return null;
}

function uniqueCustomKey(value: unknown, name: string, usedKeys: Set<string>): string {
	const base = slugify(typeof value === 'string' && value.trim() ? value : name);
	let candidate = `custom-${base || 'system'}`;
	let index = 2;

	while (usedKeys.has(candidate)) {
		candidate = `custom-${base || 'system'}-${index}`;
		index += 1;
	}

	return candidate;
}

function slugify(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 36);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneEnvironment(environment: Environment): Environment {
	return { ...environment, effects: { ...environment.effects } };
}

function clonePolicy(policy: ManagementPolicy): ManagementPolicy {
	return { ...policy, effects: { ...policy.effects } };
}

function cloneSeasonPhase(phase: SeasonPhase): SeasonPhase {
	return { ...phase };
}

function applyPolicyEffects(
	baseline: LeagueState,
	policy: ManagementPolicy,
	policyIntensity = 1
): LeagueState {
	const direct = { ...baseline };

	for (const [key, delta] of Object.entries(policy.effects) as [keyof LeagueState, number][]) {
		const scaledDelta = delta * policyIntensity;
		direct[key] =
			key === 'mediaValueB'
				? roundTo(direct[key] + scaledDelta, 2)
				: clampScore(direct[key] + scaledDelta);
	}

	const travelRelief = baseline.travelWear - direct.travelWear;
	const starLift = direct.starAvailability - baseline.starAvailability;
	const trustLift = direct.laborTrust - baseline.laborTrust;
	const visibilityLift = direct.smallMarketVisibility - baseline.smallMarketVisibility;
	const ownerDrag = baseline.ownerMargin - direct.ownerMargin;

	return {
		...direct,
		leagueHealth: clampScore(
			direct.leagueHealth +
				starLift * 0.35 +
				travelRelief * 0.25 +
				trustLift * 0.2 -
				ownerDrag * 0.08
		),
		mediaValueB: roundTo(
			direct.mediaValueB +
				direct.globalAttention * 0.006 +
				starLift * 0.012 +
				visibilityLift * 0.01,
			2
		),
		competitiveBalance: clampScore(
			direct.competitiveBalance + visibilityLift * 0.18 + travelRelief * 0.1 + trustLift * 0.08
		)
	};
}

function buildMetrics(baseline: LeagueState, state: LeagueState): MetricOutput[] {
	return [
		{
			key: 'leagueHealth',
			label: 'League Health',
			value: formatScore(state.leagueHealth),
			delta: formatDelta(state.leagueHealth - baseline.leagueHealth),
			tone: toneForDelta(state.leagueHealth - baseline.leagueHealth, 'green')
		},
		{
			key: 'mediaValueB',
			label: 'Media Value',
			value: `$${state.mediaValueB.toFixed(2)}B`,
			delta: formatPercentDelta(baseline.mediaValueB, state.mediaValueB),
			tone: toneForDelta(state.mediaValueB - baseline.mediaValueB, 'blue')
		},
		{
			key: 'competitiveBalance',
			label: 'Competitive Balance',
			value: formatScore(state.competitiveBalance),
			delta: formatDelta(state.competitiveBalance - baseline.competitiveBalance),
			tone: toneForDelta(state.competitiveBalance - baseline.competitiveBalance, 'neutral')
		},
		{
			key: 'laborTrust',
			label: 'Labor Trust',
			value: formatScore(state.laborTrust),
			delta: formatDelta(state.laborTrust - baseline.laborTrust),
			tone: toneForDelta(state.laborTrust - baseline.laborTrust, 'green')
		}
	];
}

function buildNodes(
	policy: ManagementPolicy,
	baseline: LeagueState,
	state: LeagueState
): MapNode[] {
	return [
		createNode('policy', 'Policy', policy.label, 'black'),
		createNode(
			'fatigue',
			'Fatigue',
			compareLowerIsBetter(baseline.travelWear, state.travelWear),
			'green'
		),
		createNode(
			'stars',
			'Star Availability',
			compareHigherIsBetter(baseline.starAvailability, state.starAvailability),
			'blue'
		),
		createNode('media', 'Media Value', `$${state.mediaValueB.toFixed(2)}B`, 'neutral'),
		createNode(
			'owners',
			'Owner Pressure',
			compareLowerIsBetter(state.ownerMargin, baseline.ownerMargin),
			'red'
		),
		createNode(
			'trust',
			'Player Trust',
			compareHigherIsBetter(baseline.laborTrust, state.laborTrust),
			'green'
		)
	];
}

function createNode(id: string, label: string, detail: string, tone: Tone): MapNode {
	return {
		id,
		label,
		detail,
		tone,
		...nodePositions[id]
	};
}

function buildReports(
	policy: ManagementPolicy,
	baseline: LeagueState,
	state: LeagueState
): BoardReport[] {
	const healthDelta = state.leagueHealth - baseline.leagueHealth;
	const trustDelta = state.laborTrust - baseline.laborTrust;
	const marginDelta = state.ownerMargin - baseline.ownerMargin;
	const mediaDelta = state.mediaValueB - baseline.mediaValueB;

	return [
		{
			label: 'Commissioner Brief',
			title: `${policy.label} moved league health ${formatDelta(healthDelta).toLowerCase()} while media value changed ${formatMoneyDelta(mediaDelta)}.`,
			detail: `The policy now runs through star availability, travel wear, and attention instead of a static readout. ${policy.pressure}.`
		},
		{
			label: 'Union Signal',
			title: `Trust ${trustDelta >= 0 ? 'rose' : 'fell'} because recovery and enforcement changed visibly.`,
			detail: `Labor trust is ${formatScore(state.laborTrust)} after the decision, with star availability at ${formatScore(state.starAvailability)}.`
		},
		{
			label: 'Owner Room',
			title: `Owner margin ${marginDelta >= 0 ? 'expanded' : 'tightened'} ${formatDelta(marginDelta).toLowerCase()}.`,
			detail: `The next negotiation pressure is whether the business upside offsets lower margin flexibility in the same season window.`
		}
	];
}

function buildLedger(
	policy: ManagementPolicy,
	baseline: LeagueState,
	state: LeagueState
): SeasonLedgerEntry[] {
	return [
		{
			label: 'Policy action',
			value: policy.change,
			detail: `${policy.arena} intervention applied to the current season baseline.`
		},
		{
			label: 'Health model',
			value: formatDelta(state.leagueHealth - baseline.leagueHealth),
			detail: 'Weighted from travel relief, star availability, labor trust, and owner pressure.'
		},
		{
			label: 'Market model',
			value: formatMoneyDelta(state.mediaValueB - baseline.mediaValueB),
			detail: 'Weighted from global attention, star availability, and small-market visibility.'
		},
		{
			label: 'Governance pressure',
			value: formatDelta(state.ownerMargin - baseline.ownerMargin),
			detail: 'Margin change becomes the next board-room constraint.'
		}
	];
}

function compareHigherIsBetter(previous: number, next: number): string {
	const delta = next - previous;
	if (delta > 4) return 'Higher';
	if (delta < -4) return 'Lower';
	return 'Stable';
}

function compareLowerIsBetter(previous: number, next: number): string {
	const delta = next - previous;
	if (delta < -4) return 'Lower';
	if (delta > 4) return 'Higher';
	return 'Stable';
}

function boundedPercentMetric(value: number): boolean {
	return Number.isFinite(value) && value >= 0 && value <= 100;
}

function isValidLeagueState(state: LeagueState): boolean {
	return (
		Number.isFinite(state.mediaValueB) &&
		state.mediaValueB >= 0 &&
		state.mediaValueB <= 30 &&
		boundedPercentMetric(state.leagueHealth) &&
		boundedPercentMetric(state.competitiveBalance) &&
		boundedPercentMetric(state.laborTrust) &&
		boundedPercentMetric(state.starAvailability) &&
		boundedPercentMetric(state.ownerMargin) &&
		boundedPercentMetric(state.globalAttention) &&
		boundedPercentMetric(state.scheduleLoad) &&
		boundedPercentMetric(state.travelWear) &&
		boundedPercentMetric(state.smallMarketVisibility)
	);
}

function countVisibleTradeoffs(baseline: LeagueState, finalState: LeagueState): number {
	return [
		finalState.ownerMargin < baseline.ownerMargin,
		finalState.scheduleLoad > baseline.scheduleLoad,
		finalState.travelWear > baseline.travelWear,
		finalState.competitiveBalance < baseline.competitiveBalance,
		finalState.laborTrust < baseline.laborTrust,
		finalState.starAvailability < baseline.starAvailability
	].filter(Boolean).length;
}

function getSaturatedMetrics(results: SystemResult[]): string[] {
	const saturatedMetrics = new Set<string>();

	for (const result of results) {
		for (const entry of result.timeline) {
			if (entry.state.leagueHealth >= 100) saturatedMetrics.add('health');
			if (entry.state.laborTrust >= 100) saturatedMetrics.add('trust');
			if (entry.state.competitiveBalance >= 100) saturatedMetrics.add('balance');
			if (entry.state.starAvailability >= 100) saturatedMetrics.add('availability');
			if (entry.state.ownerMargin <= 0) saturatedMetrics.add('owner margin');
		}
	}

	return [...saturatedMetrics];
}

function minTimelineMetric(results: SystemResult[], key: keyof LeagueState): number {
	return Math.min(...results.flatMap((result) => result.timeline.map((entry) => entry.state[key])));
}

function maxTimelineMetric(results: SystemResult[], key: keyof LeagueState): number {
	return Math.max(...results.flatMap((result) => result.timeline.map((entry) => entry.state[key])));
}

function severityRank(status: GameRequirementSeverity): number {
	if (status === 'fail') return 2;
	if (status === 'watch') return 1;
	return 0;
}

function formatList(items: string[]): string {
	if (items.length <= 1) return items[0] ?? '';
	if (items.length === 2) return `${items[0]} and ${items[1]}`;
	return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
}

function toneForDelta(delta: number, positiveTone: Tone): Tone {
	if (delta > 0) return positiveTone;
	if (delta < 0) return 'red';
	return 'neutral';
}

function formatScore(value: number): string {
	return String(Math.round(value));
}

function formatDelta(delta: number): string {
	const rounded = Math.round(delta);
	return `${rounded >= 0 ? '+' : ''}${rounded}`;
}

function formatPercentDelta(previous: number, next: number): string {
	const delta = ((next - previous) / previous) * 100;
	const rounded = Math.round(delta);
	return `${rounded >= 0 ? '+' : ''}${rounded}%`;
}

function formatMoneyDelta(delta: number): string {
	return `${delta >= 0 ? '+' : '-'}$${Math.abs(delta).toFixed(2)}B`;
}

function clampScore(value: number): number {
	return Math.max(0, Math.min(100, Math.round(value)));
}

function roundTo(value: number, places: number): number {
	const multiplier = 10 ** places;
	return Math.round(value * multiplier) / multiplier;
}
