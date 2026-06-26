export type PolicyKey = 'schedule' | 'media' | 'labor';

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

export function runManagementScenario(
	policyKey: PolicyKey,
	baseline: LeagueState = baselineLeagueState
): ManagementScenario {
	const policy =
		managementPolicies.find((candidate) => candidate.key === policyKey) ?? managementPolicies[0];
	const state = applyPolicyEffects(baseline, policy);

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

function applyPolicyEffects(baseline: LeagueState, policy: ManagementPolicy): LeagueState {
	const direct = { ...baseline };

	for (const [key, delta] of Object.entries(policy.effects) as [keyof LeagueState, number][]) {
		direct[key] =
			key === 'mediaValueB' ? roundTo(direct[key] + delta, 2) : clampScore(direct[key] + delta);
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
