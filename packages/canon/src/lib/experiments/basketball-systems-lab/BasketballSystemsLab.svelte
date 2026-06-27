<script lang="ts">
	import {
		Activity,
		ArrowUpRight,
		BadgeDollarSign,
		BarChart3,
		Clock3,
		FileJson,
		Globe2,
		LineChart,
		Pause,
		Play,
		RotateCcw,
		Route,
		ShieldCheck,
		SlidersHorizontal,
		Trophy,
		Users
	} from 'lucide-svelte';
	import {
		getDefaultEnvironment,
		getSampleSystemMatchup,
		getSampleSystemUpload,
		listEnvironments,
		listManagementPolicies,
		listSeasonPhases,
		listSystems,
		parseSystemUpload,
		runSystemMatch,
		type GameRequirementSeverity,
		type LabMode,
		type PolicyKey,
		type SeasonPhaseKey,
		type System,
		type SystemChallengeStatus,
		type SystemChallengeObjectiveStatus,
		type SystemId,
		type SystemResult,
		type SystemScoreWeights,
		type SystemTimelineEntry,
		type SystemUploadDefinition,
		type SystemUploadIssue
	} from './simulation.js';

	const policies = listManagementPolicies();
	const environments = listEnvironments();
	const defaultEnvironment = environments[0] ?? getDefaultEnvironment();
	const seasonPhases = listSeasonPhases();
	const horizonOptions = [3, 5, 8];
	const sampleSystemDefinition = JSON.stringify(getSampleSystemUpload(), null, 2);
	const scoutingRequirementKeys = new Set(['owner-room', 'labor-plausibility', 'system-balance']);
	const builderWeightFields = [
		{ key: 'leagueHealth', label: 'League health' },
		{ key: 'mediaValueB', label: 'Media value' },
		{ key: 'competitiveBalance', label: 'Competitive balance' },
		{ key: 'laborTrust', label: 'Labor trust' },
		{ key: 'ownerMargin', label: 'Owner margin' },
		{ key: 'resilience', label: 'Resilience' }
	] as const satisfies { key: keyof SystemScoreWeights; label: string }[];
	const builderMinimumWeights = {
		leagueHealth: 0,
		mediaValueB: 0,
		competitiveBalance: 0,
		laborTrust: 0,
		ownerMargin: 4,
		resilience: 8
	} as const satisfies Record<keyof SystemScoreWeights, number>;
	const builderMaximumWeight = 45;

	type SteeringCandidate = {
		policyKey: PolicyKey | 'none';
		phaseKey: SeasonPhaseKey;
		label: string;
		value: string;
		score: number;
		swing: number;
		gateSwing: number;
		gateLabel: string;
		gateDetail: string;
		detail: string;
		actionLabel: string;
	};
	type NextTurnPrompt = {
		status: 'applied' | 'steer' | 'hold';
		label: string;
		title: string;
		detail: string;
		gateLabel: string;
		gateDetail: string;
		primaryLabel: string;
		primaryValue: string;
	};
	type SteeringPreview = {
		policyKey: PolicyKey;
		label: string;
		score: number;
		scoreLabel: string;
		swing: number;
		gateSwing: number;
		detail: string;
		active: boolean;
		recommended: boolean;
	};
	type TurnRecapLane = {
		label: string;
		value: string;
		detail: string;
	};
	type CompoundingTrailItem = {
		year: number;
		label: string;
		value: string;
		detail: string;
		active: boolean;
		steered: boolean;
	};
	type FinalOutcomeLane = {
		label: string;
		value: string;
		detail: string;
	};
	type RaceHistoryItem = {
		years: number;
		winner: string;
		score: string;
		margin: string;
		detail: string;
		active: boolean;
		customCount: number;
	};
	type RaceMomentumItem = {
		key: SystemId;
		name: string;
		rank: number;
		score: number;
		delta: number;
		finalScore: number;
		gateAdjustment: number;
		detail: string;
		active: boolean;
	};
	type RaceYearSnapshot = {
		year: number;
		leader: string;
		score: number;
		margin: number;
		changed: boolean;
		detail: string;
		active: boolean;
	};
	type DecisionMoment = {
		year: number;
		label: string;
		value: string;
		detail: string;
		action: string;
		tone: 'changed' | 'coach' | 'held';
		active: boolean;
	};
	type EntrantReadiness = {
		key: SystemId;
		name: string;
		policyLabel: string;
		score: string;
		topWeights: string;
		readinessLabel: string;
		readinessTone: 'ready' | 'watch' | 'break';
		detail: string;
		active: boolean;
	};
	type VersusControlMode = 'autonomous' | 'coach';

	const edges = [
		{ path: 'M 92 106 C 165 78 210 74 278 90', label: 'reduces' },
		{ path: 'M 332 92 C 414 98 456 112 520 138', label: 'protects' },
		{ path: 'M 603 177 C 642 241 652 291 623 357', label: 'constrains' },
		{ path: 'M 574 409 C 500 468 423 475 349 434', label: 'pressures' },
		{ path: 'M 278 410 C 200 398 153 356 127 284', label: 'improves' }
	];

	let mode = $state<LabMode>('single');
	let versusControl = $state<VersusControlMode>('autonomous');
	let selectedSystem = $state<SystemId>('recovery');
	let opponentSystem = $state<SystemId>('attention');
	let selectedEnvironmentKey = $state(defaultEnvironment.key);
	let horizonYears = $state(5);
	let viewedYear = $state(1);
	let playbackRunning = $state(false);
	let steeringYear = $state(3);
	let steeringPhase = $state<SeasonPhaseKey>('midseason');
	let steeringPolicy = $state<PolicyKey | 'none'>('labor');
	let uploadedSystems = $state<System[]>([]);
	let uploadText = $state(sampleSystemDefinition);
	let uploadIssues = $state<SystemUploadIssue[]>([]);
	let uploadMessage = $state('Sample entrant ready');
	let draftText = $state(
		'Small Market Defense System\nProtect parity and small-market visibility while keeping owner room credible. Lean into media allocation without letting labor trust or resilience collapse.'
	);
	let draftMessage = $state('Paste notes, then draft a valid entrant.');
	let systemWorkbenchOpen = $state(false);
	let builderName = $state('Expansion Balance System');
	let builderThesis = $state(
		'Grow national attention without letting labor trust, owner margin, or competitive balance break.'
	);
	let builderPolicy = $state<PolicyKey>('media');
	let builderWeights = $state<Record<keyof SystemScoreWeights, number>>({
		leagueHealth: 14,
		mediaValueB: 18,
		competitiveBalance: 28,
		laborTrust: 12,
		ownerMargin: 10,
		resilience: 18
	});
	let builderMessage = $state('Builder weights are valid');

	const systems = $derived(listSystems(uploadedSystems));
	const selectedEnvironment = $derived(
		environments.find((environment) => environment.key === selectedEnvironmentKey) ??
			defaultEnvironment
	);
	const uploadedSystemKeys = $derived(new Set(uploadedSystems.map((system) => system.key)));
	const hasUploadedField = $derived(uploadedSystems.length > 2);
	const uploadedCompetitionLabel = $derived(
		uploadedSystems.length === 0
			? 'Sample field'
			: uploadedSystems.length === 1
				? 'One entrant entered'
				: `${uploadedSystems.length} entrants ready`
	);
	const uploadedCompetitionDetail = $derived(
		uploadedSystems.length === 0
			? 'Load the sample field or enter Systems to start a same-environment run.'
		: uploadedSystems.length === 1
				? `${uploadedSystems[0]?.name ?? 'Custom System'} can run solo. Add a second entrant to unlock versus.`
			: hasUploadedField
				? `All ${uploadedSystems.length} uploaded Systems will run in the same environment field.`
				: `${uploadedSystems[0]?.name ?? 'Custom System'} and ${uploadedSystems[1]?.name ?? 'opponent'} are ready for a same-environment race.`
	);
	const builderTotal = $derived(
		builderWeightFields.reduce((total, field) => total + builderWeights[field.key], 0)
	);
	const isSolo = $derived(mode === 'single');
	const canSteer = $derived(isSolo || (mode === 'versus' && versusControl === 'coach'));
	const effectiveSteeringPolicy = $derived(
		canSteer && steeringPolicy !== 'none' ? steeringPolicy : undefined
	);
	const modeRule = $derived(
		isSolo
			? 'Clear a challenge against the environment. Choose a System, steer once, then replay the years to see whether the targets survive.'
		: canSteer
			? hasUploadedField
				? 'Coach one System inside the uploaded field. Steering can change that System, but the winner is still decided by final valid score after gates.'
				: 'Coach one System inside the race. Steering can change that System, but the winner is still decided by final valid score after gates.'
			: hasUploadedField
				? 'Run every uploaded System in the same environment. No steering; the winner is the highest valid score after requirement gates.'
				: 'Race two Systems in the same environment. No steering; the winner is the highest valid score after requirement gates.'
	);
	const versusModeLabel = $derived(hasUploadedField ? 'Versus field' : 'Versus race');

	$effect(() => {
		if (!systems.some((system) => system.key === selectedSystem)) {
			selectedSystem = systems[0]?.key ?? 'recovery';
		}

		if (
			opponentSystem === selectedSystem ||
			!systems.some((system) => system.key === opponentSystem)
		) {
			opponentSystem = systems.find((system) => system.key !== selectedSystem)?.key ?? 'attention';
		}

		if (steeringYear > horizonYears) {
			steeringYear = horizonYears;
		}

		if (viewedYear > horizonYears) {
			viewedYear = horizonYears;
		}
	});

	$effect(() => {
		if (!playbackRunning) return;

		if (viewedYear >= match.years) {
			playbackRunning = false;
			return;
		}

		const timer = window.setTimeout(() => {
			viewedYear = Math.min(viewedYear + 1, match.years);
		}, 900);

		return () => window.clearTimeout(timer);
	});

	const match = $derived(
		runSystemMatch({
			mode,
			systemKey: selectedSystem,
			opponentKey: opponentSystem,
			environment: selectedEnvironment,
			years: horizonYears,
			steeringYear,
			steeringPhase,
			steeringPolicyKey: effectiveSteeringPolicy,
			customSystems: uploadedSystems
		})
	);
	const unsteeredMatch = $derived(
		runSystemMatch({
			mode,
			systemKey: selectedSystem,
			opponentKey: opponentSystem,
			environment: selectedEnvironment,
			years: horizonYears,
			steeringYear,
			steeringPhase,
			customSystems: uploadedSystems
		})
	);
	const customEntrantsInRun = $derived(
		match.systems.filter((result) => uploadedSystemKeys.has(result.system.key))
	);
	const entrantReadiness = $derived<EntrantReadiness[]>(
		uploadedSystems.map((system) => {
			const result =
				match.systems.find((candidate) => candidate.system.key === system.key) ??
				unsteeredMatch.systems.find((candidate) => candidate.system.key === system.key) ??
				null;
			const gateAdjustment = result?.validationImpact.adjustment ?? 0;
			const readinessTone: EntrantReadiness['readinessTone'] =
				gateAdjustment <= -12 ? 'break' : gateAdjustment < 0 ? 'watch' : 'ready';
			const policyLabel = policies.find((policy) => policy.key === system.policyKey)?.label ?? 'Native policy';

			return {
				key: system.key,
				name: system.name,
				policyLabel,
				score: result ? result.score.toFixed(1) : 'Not run',
				topWeights: formatTopWeights(system),
				readinessLabel:
					readinessTone === 'break'
						? 'Gate risk'
						: readinessTone === 'watch'
							? 'Watch gates'
							: 'Ready',
				readinessTone,
				detail: trimToWordBoundary(system.thesis, 104),
				active: system.key === selectedSystem || system.key === opponentSystem
			};
		})
	);
	const viewedStandings = $derived(
		match.systems
			.map((result) => ({
				result,
				entry: timelineEntryFor(result, viewedYear)
			}))
			.sort((left, right) => right.entry.score - left.entry.score)
	);
	const viewedLeader = $derived(
		viewedStandings[0] ?? {
			result: match.winner,
			entry: timelineEntryFor(match.winner, viewedYear)
		}
	);
	const activeEntry = $derived(viewedLeader.entry);
	const activeTimeline = $derived(viewedLeader.result.timeline);
	const activeGateImpacts = $derived(
		viewedLeader.result.validationImpact.impacts.filter((impact) => impact.status !== 'pass')
	);
	const runScoreLanes = $derived([
		{
			label: 'Current year',
			value: activeEntry.score.toFixed(1),
			detail: `${activeEntry.decision}; ${formatDelta(activeEntry.delta)} from last year.`
		},
		{
			label: 'Projected finish',
			value: viewedLeader.result.rawScore.toFixed(1),
			detail: `Raw ${match.years}-year System score before gates.`
		},
		{
			label: 'Valid final',
			value: viewedLeader.result.score.toFixed(1),
			detail: `${formatDelta(viewedLeader.result.validationImpact.adjustment)} gate adjustment.`
		}
	]);
	const activeGateRiskLabel = $derived(
		activeGateImpacts.length > 0
			? `${activeGateImpacts.length} active gate${activeGateImpacts.length === 1 ? '' : 's'}`
			: 'Clean run'
	);
	const activeSteeringPolicy = $derived(
		steeringPolicy === 'none'
			? null
			: (policies.find((policy) => policy.key === steeringPolicy) ?? null)
	);
	const selectedSteeringPhase = $derived(
		seasonPhases.find((phase) => phase.key === steeringPhase) ?? seasonPhases[1]
	);
	const steeringPlanLabel = $derived(
		canSteer
			? activeSteeringPolicy
				? `Year ${steeringYear}, ${selectedSteeringPhase.label}`
				: 'Original System'
			: hasUploadedField
				? 'Autonomous field'
				: 'Autonomous race'
	);
	const steeringReceipt = $derived(
		canSteer
			? activeSteeringPolicy
				? `${activeSteeringPolicy.label} starts in year ${steeringYear}; first-season force ${Math.round(
						selectedSteeringPhase.impact * 100
					)}%.`
				: `${viewedLeader.result.system.name} keeps its native policy.`
			: hasUploadedField
				? 'The field keeps every System autonomous after setup.'
				: 'The race keeps both Systems autonomous after setup.'
	);
	const unsteeredPrimary = $derived(
		unsteeredMatch.systems.find((result) => result.system.key === selectedSystem) ??
			unsteeredMatch.winner
	);
	const steeredPrimary = $derived(
		match.systems.find((result) => result.system.key === selectedSystem) ?? match.winner
	);
	const steeringScoreSwing = $derived(
		Number((steeredPrimary.score - unsteeredPrimary.score).toFixed(1))
	);
	const steeringGateSwing = $derived(
		Number(
			(
				steeredPrimary.validationImpact.adjustment -
				unsteeredPrimary.validationImpact.adjustment
			).toFixed(1)
		)
	);
	const steeringComparison = $derived([
		{
			label: 'Original hold',
			value: unsteeredPrimary.score.toFixed(1),
			detail: `${unsteeredPrimary.system.name} keeps ${unsteeredPrimary.timeline[0]?.policy.label ?? 'native policy'}.`
		},
		{
			label: activeSteeringPolicy ? 'Steered finish' : 'Current finish',
			value: steeredPrimary.score.toFixed(1),
			detail: activeSteeringPolicy
				? `${activeSteeringPolicy.label} from year ${steeringYear}.`
				: 'No active steering policy.'
		},
		{
			label: 'Net swing',
			value: formatDelta(steeringScoreSwing),
			detail: `${formatDelta(steeringGateSwing)} gate movement included.`
		}
	]);
	const steeringRecommendation = $derived(getSteeringRecommendation());
	const steeringPreviews = $derived<SteeringPreview[]>(getSteeringPreviews());
	const canAdvanceTurn = $derived(viewedYear < match.years);
	const nextTurnPrompt = $derived.by<NextTurnPrompt>(() =>
		getNextTurnPrompt(canSteer && steeringYear === viewedYear)
	);
	const viewedRunnerUp = $derived(
		viewedStandings.find(
			(standing) => standing.result.system.key !== viewedLeader.result.system.key
		) ?? null
	);
	const viewedLeaderGap = $derived(
		viewedRunnerUp
			? Number((activeEntry.score - viewedRunnerUp.entry.score).toFixed(1))
			: 0
	);
	const raceMomentum = $derived<RaceMomentumItem[]>(
		viewedStandings.map((standing, index) => {
			const previousEntry = timelineEntryFor(standing.result, Math.max(1, viewedYear - 1));
			const delta = Number((standing.entry.score - previousEntry.score).toFixed(1));

			return {
				key: standing.result.system.key,
				name: standing.result.system.name,
				rank: index + 1,
				score: standing.entry.score,
				delta,
				finalScore: standing.result.score,
				gateAdjustment: standing.result.validationImpact.adjustment,
				detail: standing.entry.decision,
				active: standing.result.system.key === viewedLeader.result.system.key
			};
		})
	);
	const momentumLeader = $derived(
		[...raceMomentum].sort((left, right) => right.delta - left.delta)[0] ?? raceMomentum[0]
	);
	const raceYearSnapshots = $derived<RaceYearSnapshot[]>(
		Array.from({ length: match.years }, (_, index) => {
			const year = index + 1;
			const yearStandings = match.systems
				.map((result) => ({
					result,
					entry: timelineEntryFor(result, year)
				}))
				.sort((left, right) => right.entry.score - left.entry.score);
			const leader = yearStandings[0];
			const runnerUp = yearStandings[1] ?? null;
			const previousLeader =
				year > 1
					? match.systems
							.map((result) => ({
								result,
								entry: timelineEntryFor(result, year - 1)
							}))
							.sort((left, right) => right.entry.score - left.entry.score)[0]
					: null;
			const margin = leader && runnerUp ? Number((leader.entry.score - runnerUp.entry.score).toFixed(1)) : 0;

			return {
				year,
				leader: leader?.result.system.name ?? 'No leader',
				score: leader?.entry.score ?? 0,
				margin,
				changed:
					Boolean(previousLeader && leader) &&
					previousLeader?.result.system.key !== leader?.result.system.key,
				detail: runnerUp
					? `${runnerUp.result.system.name} trails by ${margin.toFixed(1)}.`
					: 'No challenger is loaded.',
				active: year === viewedYear
			};
		})
	);
	const activeYearSnapshot = $derived(
		raceYearSnapshots.find((snapshot) => snapshot.year === viewedYear) ?? raceYearSnapshots[0]
	);
	const previousYearStandings = $derived(viewedYear > 1 ? standingsForYear(viewedYear - 1) : []);
	const previousLeaderName = $derived(previousYearStandings[0]?.result.system.name ?? null);
	const leadChangedThisYear = $derived(Boolean(activeYearSnapshot?.changed));
	const raceMomentumSummary = $derived(
		viewedRunnerUp
			? `${viewedLeader.result.system.name} leads ${viewedRunnerUp.result.system.name} by ${viewedLeaderGap.toFixed(1)} in year ${viewedYear}.`
			: `${viewedLeader.result.system.name} is alone in this run.`
	);
	const raceMomentumDetail = $derived(
		momentumLeader
			? `${momentumLeader.name} has the strongest current-year movement at ${formatDelta(momentumLeader.delta)}.`
			: 'Advance the run to see which System is gaining.'
	);
	const activeDecisionMoment = $derived<DecisionMoment>({
		year: viewedYear,
		label: leadChangedThisYear ? 'Lead changed' : canSteer ? 'Steering window' : 'Leader held',
		value:
			leadChangedThisYear && previousLeaderName
				? `${previousLeaderName} -> ${viewedLeader.result.system.name}`
				: canSteer
					? steeringRecommendation.actionLabel
					: `${viewedLeader.result.system.name} holds`,
		detail:
			leadChangedThisYear && momentumLeader
				? `${momentumLeader.name} made the strongest year move at ${formatDelta(momentumLeader.delta)}.`
				: viewedYear === 1
					? `${viewedLeader.result.system.name} opened the run with ${viewedRunnerUp ? `${viewedRunnerUp.result.system.name} close behind` : 'no runner-up loaded'}.`
				: canSteer
					? `${steeringRecommendation.label} projects ${formatDelta(steeringRecommendation.swing)} from this point.`
					: raceMomentumDetail,
		action: canSteer ? `Coach from year ${viewedYear}` : viewedRunnerUp ? `Protect ${viewedLeaderGap.toFixed(1)} lead` : 'Advance the run',
		tone: leadChangedThisYear ? 'changed' : canSteer ? 'coach' : 'held',
		active: true
	});
	const decisionMoments = $derived<DecisionMoment[]>(
		raceYearSnapshots.map((snapshot) => {
			const standings = standingsForYear(snapshot.year);
			const previousStandings = snapshot.year > 1 ? standingsForYear(snapshot.year - 1) : [];
			const leader = standings[0];
			const runnerUp = standings[1] ?? null;
			const previousLeader = previousStandings[0] ?? null;
			const strongestMove =
				standings
					.map((standing) => {
						const previousEntry =
							previousStandings.find(
								(candidate) => candidate.result.system.key === standing.result.system.key
							)?.entry ?? standing.entry;

						return {
							standing,
							delta: Number((standing.entry.score - previousEntry.score).toFixed(1))
						};
					})
					.sort((left, right) => right.delta - left.delta)[0] ?? null;
			const isOpeningYear = snapshot.year === 1;
			const isCoachWindow = canSteer && snapshot.year === steeringYear;
			const label = isOpeningYear
				? 'Opening state'
				: snapshot.changed
					? 'Lead changed'
					: isCoachWindow
						? 'Coach window'
						: 'Compounded';
			const value =
				snapshot.changed && previousLeader && leader
					? `${previousLeader.result.system.name} -> ${leader.result.system.name}`
					: leader?.result.system.name ?? snapshot.leader;
			const detail = strongestMove
				? `${strongestMove.standing.result.system.name} moved ${formatDelta(strongestMove.delta)}; ${runnerUp ? `${runnerUp.result.system.name} trails by ${snapshot.margin.toFixed(1)}.` : 'no runner-up is loaded.'}`
				: snapshot.detail;

			return {
				year: snapshot.year,
				label,
				value,
				detail,
				action: isCoachWindow ? 'Active steer year' : `View year ${snapshot.year}`,
				tone: snapshot.changed ? 'changed' : isCoachWindow ? 'coach' : 'held',
				active: snapshot.active
			};
		})
	);
	const gameTurnLabel = $derived(
		isSolo
			? 'Solo turn'
			: canSteer
				? hasUploadedField
					? 'Coach field'
					: 'Coach race'
				: hasUploadedField
					? 'Autonomous field'
					: 'Autonomous race'
	);
	const gameTurnTitle = $derived(
		isSolo
			? `${selectedEnvironment.name}: ${match.challenge.label}`
		: canSteer
				? `Coach ${match.steering.targetSystem.name} against ${viewedRunnerUp?.result.system.name ?? 'the field'}`
			: hasUploadedField
				? `${match.winner.system.name} leads ${match.systems.length} Systems`
				: `${match.winner.system.name} leads the race`
	);
	const primaryRunActionLabel = $derived(
		playbackRunning
			? 'Pause run'
			: viewedYear === match.years
				? mode === 'versus'
					? hasUploadedField
						? 'Replay field'
						: 'Replay race'
					: 'Replay season'
				: mode === 'versus'
					? hasUploadedField
						? 'Watch field'
						: 'Watch race'
					: 'Run season'
	);
	const gameTurnLanes = $derived([
		{
			label: 'System',
			value: match.steering.targetSystem.name,
			detail: match.steering.targetSystem.thesis
		},
		{
			label: 'Pressure',
			value: selectedEnvironment.name,
			detail: selectedEnvironment.pressure
		},
		{
			label: isSolo ? 'Objective' : 'Stakes',
			value: isSolo
				? match.challenge.label
				: hasUploadedField
					? `${match.systems.length}-System field`
					: `${match.years}-year race`,
			detail: isSolo ? match.challenge.summary : selectedEnvironment.winCondition
		}
	]);
	const turnRecapStatus = $derived(isSolo ? match.challenge.status : 'versus');
	const turnRecap = $derived<TurnRecapLane[]>([
		{
			label: 'Turn state',
			value: isSolo ? formatChallengeStatus(match.challenge.status) : `Lead ${viewedLeaderGap.toFixed(1)}`,
			detail: isSolo
				? `${viewedLeader.result.system.name} is at ${activeEntry.score.toFixed(1)} in year ${viewedYear}.`
				: `${viewedLeader.result.system.name} leads ${viewedRunnerUp?.result.system.name ?? 'the field'} in year ${viewedYear}.`
		},
		{
			label: 'Pressure',
			value: activeGateRiskLabel,
			detail: activeGateImpacts[0]?.detail ?? match.validation.summary
		},
		{
			label: 'Next action',
			value: canSteer
				? steeringYear === viewedYear
					? 'Turn applied'
					: steeringRecommendation.actionLabel
				: 'Let Systems run',
			detail: canSteer
				? `${steeringRecommendation.label}; ${formatDelta(steeringRecommendation.swing)} projected swing.`
				: viewedRunnerUp
					? `${viewedRunnerUp.result.system.name} trails by ${viewedLeaderGap.toFixed(1)} entering the next year.`
					: 'No challenger is loaded for this run.'
		}
	]);
	const compoundingStartScore = $derived(activeTimeline[0]?.score ?? activeEntry.score);
	const compoundingDelta = $derived(Number((activeEntry.score - compoundingStartScore).toFixed(1)));
	const compoundingTrail = $derived<CompoundingTrailItem[]>(
		activeTimeline
			.filter((entry) => entry.year <= viewedYear)
			.map((entry) => ({
				year: entry.year,
				label: entry.steered ? 'Steered' : entry.policy.label,
				value: formatDelta(entry.delta),
				detail: entry.decision,
				active: entry.year === viewedYear,
				steered: entry.steered
			}))
	);
	const finalOutcomeVisible = $derived(viewedYear === match.years);
	const finalRunnerUp = $derived(
		match.systems.find((result) => result.system.key !== match.winner.system.key) ?? null
	);
	const finalScoreGap = $derived(
		finalRunnerUp ? Number((match.winner.score - finalRunnerUp.score).toFixed(1)) : 0
	);
	const finalOutcomeStatus = $derived(isSolo ? match.challenge.status : 'versus');
	const finalOutcomeTitle = $derived(
		isSolo
			? match.challenge.status === 'cleared'
				? 'Final whistle: challenge cleared'
				: match.challenge.status === 'close'
					? 'Final whistle: one steer away'
					: 'Final whistle: challenge missed'
			: `Final whistle: ${match.winner.system.name} wins`
	);
	const finalOutcomeSummary = $derived(
		isSolo
			? match.challenge.summary
			: finalRunnerUp
				? `${match.winner.system.name} beat ${finalRunnerUp.system.name} by ${finalScoreGap.toFixed(1)} after requirement gates.`
				: `${match.winner.system.name} finished as the valid leader after requirement gates.`
	);
	const finalOutcomeLanes = $derived<FinalOutcomeLane[]>([
		{
			label: 'Final valid score',
			value: isSolo ? steeredPrimary.score.toFixed(1) : match.winner.score.toFixed(1),
			detail: isSolo ? steeredPrimary.system.name : match.winner.system.name
		},
		{
			label: 'Gate adjustment',
			value: formatDelta(
				isSolo
					? steeredPrimary.validationImpact.adjustment
					: match.winner.validationImpact.adjustment
			),
			detail: isSolo
				? steeredPrimary.validationImpact.label
				: match.winner.validationImpact.label
		},
		{
			label: isSolo ? 'Run swing' : canSteer ? 'Coached swing' : 'Winning margin',
			value: canSteer ? formatDelta(steeringScoreSwing) : finalScoreGap.toFixed(1),
			detail: canSteer
				? activeSteeringPolicy
					? `${activeSteeringPolicy.label} from year ${steeringYear}.`
					: 'Original System held through the run.'
				: finalRunnerUp
					? `${finalRunnerUp.system.name} finished second.`
					: 'No runner-up loaded.'
		}
	]);
	const raceHistory = $derived<RaceHistoryItem[]>(
		horizonOptions.map((years) => {
			const horizonMatch = runSystemMatch({
				mode: 'versus',
				systemKey: selectedSystem,
				opponentKey: opponentSystem,
				environment: selectedEnvironment,
				years,
				customSystems: uploadedSystems
			});
			const runnerUp =
				horizonMatch.systems.find(
					(result) => result.system.key !== horizonMatch.winner.system.key
				) ?? null;
			const margin = runnerUp
				? Number((horizonMatch.winner.score - runnerUp.score).toFixed(1))
				: 0;
			const customCount = horizonMatch.systems.filter((result) =>
				uploadedSystemKeys.has(result.system.key)
			).length;

			return {
				years,
				winner: horizonMatch.winner.system.name,
				score: horizonMatch.winner.score.toFixed(1),
				margin: margin.toFixed(1),
				detail: runnerUp
					? `${runnerUp.system.name} trailed after gates.`
					: 'No second System is loaded.',
				active: years === horizonYears,
				customCount
			};
		})
	);
	const scoutingRequirements = $derived(
		match.validation.requirements.filter((requirement) =>
			scoutingRequirementKeys.has(requirement.key)
		)
	);
	const scoutingLabel = $derived(
		match.validation.status === 'fail'
			? 'High-risk setup'
			: match.validation.status === 'watch'
				? 'Playable with pressure'
				: 'Clean setup'
	);
	const scoutingSummary = $derived(
		match.validation.status === 'fail'
			? 'This setup is likely to take a major gate penalty unless the System or environment changes.'
			: match.validation.status === 'watch'
				? 'The run is playable, but the scout already sees gate pressure in the selected setup.'
				: 'No major owner, labor, or balance risk is forecast for the current setup.'
	);
	const validationCounts = $derived(
		match.validation.requirements.reduce(
			(counts, requirement) => ({
				...counts,
				[requirement.status]: counts[requirement.status] + 1
			}),
			{ pass: 0, watch: 0, fail: 0, deferred: 0 } satisfies Record<GameRequirementSeverity, number>
		)
	);
	const surfacedRequirements = $derived([
		...match.validation.requirements.filter((requirement) => requirement.status !== 'pass'),
		...match.validation.requirements.filter((requirement) => requirement.status === 'pass')
	]);
	const validationCountLabel = $derived(
		[
			validationCounts.fail ? `${validationCounts.fail} break` : '',
			validationCounts.watch ? `${validationCounts.watch} watch` : '',
			validationCounts.deferred ? `${validationCounts.deferred} deferred` : '',
			validationCounts.pass ? `${validationCounts.pass} passed` : ''
		]
			.filter(Boolean)
			.join(' / ')
	);

	function formatRequirementStatus(status: GameRequirementSeverity): string {
		if (status === 'fail') return 'Break';
		if (status === 'watch') return 'Watch';
		if (status === 'deferred') return 'Deferred';
		return 'Pass';
	}

	function formatChallengeObjectiveStatus(status: SystemChallengeObjectiveStatus): string {
		if (status === 'missed') return 'Missed';
		if (status === 'close') return 'Needs steering';
		return 'Cleared';
	}

	function formatChallengeStatus(status: SystemChallengeStatus): string {
		if (status === 'missed') return 'Missed';
		if (status === 'close') return 'Needs steering';
		if (status === 'versus') return 'Versus race';
		return 'Cleared';
	}

	function setViewedYear(year: number): void {
		viewedYear = Math.min(Math.max(Math.round(year), 1), horizonYears);
	}

	function togglePlayback(): void {
		if (playbackRunning) {
			playbackRunning = false;
			return;
		}

		if (viewedYear >= match.years) {
			viewedYear = 1;
		}

		playbackRunning = true;
	}

	function resetPlayback(): void {
		playbackRunning = false;
		viewedYear = 1;
	}

	function runPrimaryAction(): void {
		togglePlayback();
	}

	function steerFromViewedYear(policyKey = steeringPolicy): void {
		if (!canSteer) return;

		steeringYear = viewedYear;
		if (policyKey === 'none') {
			steeringPolicy = 'none';
			return;
		}

		steeringPolicy = policyKey;
	}

	function setSteeringPhase(phaseKey: SeasonPhaseKey): void {
		steeringPhase = phaseKey;
		if (canSteer) {
			steeringYear = viewedYear;
		}
	}

	function applySteeringRecommendation(): void {
		if (!canSteer) return;

		steeringYear = viewedYear;
		steeringPhase = steeringRecommendation.phaseKey;
		steeringPolicy = steeringRecommendation.policyKey;
	}

	function holdOriginalFromViewedYear(): void {
		if (!canSteer) return;

		steeringYear = viewedYear;
		steeringPolicy = 'none';
	}

	function applySteeringPreview(preview: SteeringPreview): void {
		if (!canSteer) return;

		steeringYear = viewedYear;
		steeringPolicy = preview.policyKey;
	}

	function watchNextTurn(): void {
		if (!canAdvanceTurn) return;

		setViewedYear(viewedYear + 1);
	}

	function formatDelta(delta: number): string {
		return `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}`;
	}

	function getNextTurnPrompt(turnApplied: boolean): NextTurnPrompt {
		if (turnApplied) {
			return {
				status: 'applied',
				label: 'Turn applied',
				title: activeSteeringPolicy
					? `${activeSteeringPolicy.label} is active`
					: 'Original System held',
				detail: `Year ${viewedYear} now projects ${steeredPrimary.score.toFixed(1)} with ${formatDelta(steeringScoreSwing)} score and ${formatDelta(steeringGateSwing)} gate movement.`,
				gateLabel: describeGateRisk(steeredPrimary).label,
				gateDetail: describeGateRisk(steeredPrimary).detail,
				primaryLabel: canAdvanceTurn ? 'Watch next year' : 'Final year',
				primaryValue: canAdvanceTurn ? `Year ${viewedYear + 1}` : steeredPrimary.score.toFixed(1)
			};
		}

		if (steeringRecommendation.policyKey === 'none') {
			return {
				status: 'hold',
				label: 'Next turn',
				title: 'Hold original System',
				detail: `Original projects ${steeringRecommendation.value}; ${formatDelta(steeringRecommendation.gateSwing)} gate movement versus the current hold.`,
				gateLabel: steeringRecommendation.gateLabel,
				gateDetail: steeringRecommendation.gateDetail,
				primaryLabel: 'Hold original',
				primaryValue: formatDelta(steeringRecommendation.swing)
			};
		}

		return {
			status: 'steer',
			label: 'Next turn',
			title: `Apply ${steeringRecommendation.label}`,
			detail: `Best available move projects ${steeringRecommendation.value}; ${formatDelta(steeringRecommendation.swing)} score and ${formatDelta(steeringRecommendation.gateSwing)} gate movement from year ${viewedYear}.`,
			gateLabel: steeringRecommendation.gateLabel,
			gateDetail: steeringRecommendation.gateDetail,
			primaryLabel: steeringRecommendation.actionLabel,
			primaryValue: formatDelta(steeringRecommendation.swing)
		};
	}

	function describeGateRisk(result: SystemResult): { label: string; detail: string } {
		const activeImpact =
			result.validationImpact.impacts
				.filter((impact) => impact.status !== 'pass')
				.sort((left, right) => Math.abs(right.adjustment) - Math.abs(left.adjustment))[0] ?? null;

		if (!activeImpact) {
			return {
				label: 'Gate clear',
				detail: 'No active requirement gate is changing this projected score.'
			};
		}

		return {
			label: `Gate: ${activeImpact.label} ${formatDelta(activeImpact.adjustment)}`,
			detail: activeImpact.detail
		};
	}

	function getSteeringRecommendation(): SteeringCandidate {
		const originalGateRisk = describeGateRisk(unsteeredPrimary);
		const original: SteeringCandidate = {
			policyKey: 'none',
			phaseKey: steeringPhase,
			label: 'Hold original System',
			value: unsteeredPrimary.score.toFixed(1),
			score: unsteeredPrimary.score,
			swing: 0,
			gateSwing: 0,
			gateLabel: originalGateRisk.label,
			gateDetail: originalGateRisk.detail,
			detail: `${unsteeredPrimary.system.name} is strongest without a steering change from year ${viewedYear}.`,
			actionLabel: 'Keep original'
		};

		const candidates = policies.flatMap((policy) =>
			seasonPhases.map((phase) => {
				const candidateMatch = runSystemMatch({
					mode: 'single',
					systemKey: selectedSystem,
					environment: selectedEnvironment,
					years: horizonYears,
					steeringYear: viewedYear,
					steeringPhase: phase.key,
					steeringPolicyKey: policy.key,
					customSystems: uploadedSystems
				});
				const result =
					candidateMatch.systems.find((candidate) => candidate.system.key === selectedSystem) ??
					candidateMatch.winner;
				const swing = Number((result.score - unsteeredPrimary.score).toFixed(1));
				const gateSwing = Number(
					(result.validationImpact.adjustment - unsteeredPrimary.validationImpact.adjustment).toFixed(1)
				);
				const gateRisk = describeGateRisk(result);

				return {
					policyKey: policy.key,
					phaseKey: phase.key,
					label: `${policy.label}, ${phase.label}`,
					value: result.score.toFixed(1),
					score: result.score,
					swing,
					gateSwing,
					gateLabel: gateRisk.label,
					gateDetail: gateRisk.detail,
					detail: `${formatDelta(swing)} versus original hold from year ${viewedYear}.`,
					actionLabel: `Apply ${policy.label}`
				} satisfies SteeringCandidate;
			})
		);

		return [original, ...candidates].sort((left, right) => right.score - left.score)[0] ?? original;
	}

	function getSteeringPreviews(): SteeringPreview[] {
		const previews = policies.map((policy) => {
			const previewMatch = runSystemMatch({
				mode,
				systemKey: selectedSystem,
				opponentKey: opponentSystem,
				environment: selectedEnvironment,
				years: horizonYears,
				steeringYear: viewedYear,
				steeringPhase,
				steeringPolicyKey: policy.key,
				customSystems: uploadedSystems
			});
			const result =
				previewMatch.systems.find((candidate) => candidate.system.key === selectedSystem) ??
				previewMatch.winner;
			const swing = Number((result.score - unsteeredPrimary.score).toFixed(1));
			const gateSwing = Number(
				(result.validationImpact.adjustment - unsteeredPrimary.validationImpact.adjustment).toFixed(1)
			);

			return {
				policyKey: policy.key,
				label: policy.label,
				score: result.score,
				scoreLabel: result.score.toFixed(1),
				swing,
				gateSwing,
				detail: `${formatDelta(swing)} score; ${formatDelta(gateSwing)} gate movement from year ${viewedYear}.`,
				active: steeringPolicy === policy.key && steeringYear === viewedYear,
				recommended: false
			} satisfies SteeringPreview;
		});
		const bestScore = Math.max(...previews.map((preview) => preview.score));

		return previews.map((preview) => ({
			...preview,
			recommended: preview.score === bestScore
		}));
	}

	function timelineEntryFor(result: SystemResult, year: number): SystemTimelineEntry {
		return (
			result.timeline.find((entry) => entry.year === year) ??
			result.timeline.at(-1) ??
			result.timeline[0]
		);
	}

	function formatTopWeights(system: System): string {
		return [...builderWeightFields]
			.map((field) => ({
				label: field.label,
				value: system.weights[field.key]
			}))
			.sort((left, right) => right.value - left.value)
			.slice(0, 2)
			.map((weight) => `${weight.label} ${Math.round(weight.value * 100)}%`)
			.join(' / ');
	}

	function standingsForYear(year: number): { result: SystemResult; entry: SystemTimelineEntry }[] {
		return match.systems
			.map((result) => ({
				result,
				entry: timelineEntryFor(result, year)
			}))
			.sort((left, right) => right.entry.score - left.entry.score);
	}

	function importSystems(): void {
		const result = parseSystemUpload(uploadText);
		uploadedSystems = result.systems;
		uploadIssues = result.issues;

		if (result.systems.length === 0) {
			uploadMessage = 'No entrants accepted';
			return;
		}

		selectedSystem = result.systems[0].key;
		opponentSystem = result.systems[1]?.key ?? 'recovery';
		mode = result.systems.length > 1 ? 'versus' : mode;
		uploadMessage = `${result.systems.length} entrant${result.systems.length === 1 ? '' : 's'} entered`;
	}

	function loadSampleMatchup(): void {
		uploadText = JSON.stringify({ systems: getSampleSystemMatchup() }, null, 2);
		importSystems();
		systemWorkbenchOpen = false;
	}

	function openSystemWorkbench(): void {
		systemWorkbenchOpen = true;
	}

	function raceUploadedSystems(): void {
		if (uploadedSystems.length === 0) {
			loadSampleMatchup();
			return;
		}

		selectedSystem = uploadedSystems[0]?.key ?? selectedSystem;
		opponentSystem =
			uploadedSystems.find((system) => system.key !== selectedSystem)?.key ?? opponentSystem;
		mode = uploadedSystems.length > 1 ? 'versus' : 'single';
	}

	function setRaceHistoryHorizon(years: number): void {
		horizonYears = years;
		viewedYear = Math.min(viewedYear, years);
		playbackRunning = false;
		mode = 'versus';
	}

	function setRaceMomentumYear(year: number): void {
		playbackRunning = false;
		setViewedYear(year);
	}

	function addBuiltSystem(): void {
		const definitions = [...uploadedSystems.map(systemToUploadDefinition), buildSystemDefinition()];
		const result = parseSystemUpload(JSON.stringify({ systems: definitions }));
		uploadedSystems = result.systems;
		uploadIssues = result.issues;
		uploadText = JSON.stringify({ systems: definitions }, null, 2);

		if (result.systems.length === 0) {
			builderMessage = 'Builder System needs valid fields';
			uploadMessage = 'No entrants accepted';
			return;
		}

		const builtSystem = result.systems.at(-1);
		if (builtSystem) {
			selectedSystem = builtSystem.key;
			opponentSystem =
				result.systems.find((system) => system.key !== builtSystem.key)?.key ?? 'recovery';
		}

		mode = result.systems.length > 1 ? 'versus' : mode;
		builderMessage = `${builderName.trim()} entered the run`;
		uploadMessage = `${result.systems.length} entrant${result.systems.length === 1 ? '' : 's'} entered`;
	}

	function previewBuiltSystemJson(): void {
		uploadText = JSON.stringify(buildSystemDefinition(), null, 2);
		uploadIssues = [];
		uploadMessage = 'Builder entrant staged as JSON';
		builderMessage = 'Entrant JSON ready';
	}

	function draftEntrantFromNotes(): void {
		const notes = draftText.trim();

		if (notes.length < 12) {
			draftMessage = 'Add a little more about what the System optimizes.';
			return;
		}

		const definition = buildDraftSystemDefinition(notes);
		uploadText = JSON.stringify(definition, null, 2);
		uploadIssues = [];
		uploadMessage = 'Draft entrant ready for validation';
		draftMessage = `${definition.name} drafted with ${formatPolicyLabel(definition.policyKey)} bias.`;
	}

	function resetBuilder(): void {
		const sample = getSampleSystemUpload();
		builderName = 'Expansion Balance System';
		builderThesis =
			'Grow national attention without letting labor trust, owner margin, or competitive balance break.';
		builderPolicy = sample.policyKey;
		builderWeights = percentWeights(sample.weights);
		builderMessage = 'Builder weights are valid';
	}

	function loadSampleSystem(): void {
		uploadText = sampleSystemDefinition;
		uploadIssues = [];
		uploadMessage = 'Sample entrant ready';
	}

	async function readSystemFile(event: Event): Promise<void> {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		uploadText = await file.text();
		importSystems();
		input.value = '';
	}

	function setBuilderWeight(key: keyof SystemScoreWeights, event: Event): void {
		const input = event.currentTarget as HTMLInputElement;
		const next = { ...builderWeights };
		const current = next[key];
		const target = clampBuilderWeight(key, Number(input.value), next);
		const delta = target - current;
		next[key] = target;

		if (delta > 0) {
			shiftBuilderWeight(next, key, delta, 'down');
		} else if (delta < 0) {
			shiftBuilderWeight(next, key, Math.abs(delta), 'up');
		}

		builderWeights = next;
		builderMessage = 'Builder weights are valid';
	}

	function clampBuilderWeight(
		key: keyof SystemScoreWeights,
		value: number,
		weights: Record<keyof SystemScoreWeights, number>
	): number {
		const otherKeys = builderWeightFields
			.map((field) => field.key)
			.filter((fieldKey) => fieldKey !== key);
		const otherMinimum = otherKeys.reduce(
			(total, fieldKey) => total + builderMinimumWeights[fieldKey],
			0
		);
		const otherMaximum = otherKeys.length * builderMaximumWeight;
		const feasibleMinimum = Math.max(builderMinimumWeights[key], 100 - otherMaximum);
		const feasibleMaximum = Math.min(builderMaximumWeight, 100 - otherMinimum);
		const rounded = Number.isFinite(value) ? Math.round(value) : weights[key];

		return Math.min(feasibleMaximum, Math.max(feasibleMinimum, rounded));
	}

	function shiftBuilderWeight(
		weights: Record<keyof SystemScoreWeights, number>,
		activeKey: keyof SystemScoreWeights,
		amount: number,
		direction: 'up' | 'down'
	): void {
		let remaining = amount;
		const orderedKeys = builderWeightFields
			.map((field) => field.key)
			.filter((key) => key !== activeKey)
			.sort((left, right) =>
				direction === 'down' ? weights[right] - weights[left] : weights[left] - weights[right]
			);

		for (const key of orderedKeys) {
			const room =
				direction === 'down'
					? weights[key] - builderMinimumWeights[key]
					: builderMaximumWeight - weights[key];
			const shift = Math.min(room, remaining);
			weights[key] += direction === 'down' ? -shift : shift;
			remaining -= shift;
			if (remaining <= 0) return;
		}
	}

	function buildSystemDefinition(): SystemUploadDefinition {
		const policy = policies.find((candidate) => candidate.key === builderPolicy) ?? policies[0];

		return {
			name: builderName.trim(),
			thesis: builderThesis.trim(),
			stance: 'Built System',
			constraint:
				'The System must keep owner margin and resilience visible while pursuing its priority.',
			adaptation: `Runs ${policy.label} as its native policy and lets the requirement gates expose the tradeoffs.`,
			policyKey: builderPolicy,
			weights: decimalWeights(builderWeights)
		};
	}

	function buildDraftSystemDefinition(notes: string): SystemUploadDefinition {
		const policyKey = inferDraftPolicy(notes);
		const name = normalizeDraftName(notes);
		const thesis = normalizeDraftThesis(notes, policyKey);
		const weights = inferDraftWeights(notes, policyKey);

		return {
			name,
			thesis,
			stance: 'Drafted entrant',
			constraint:
				'The System must survive owner room, labor trust, and resilience gates after the race.',
			adaptation: `Drafted from notes; runs ${formatPolicyLabel(policyKey)} as its native policy and lets the gates test the tradeoffs.`,
			policyKey,
			weights
		};
	}

	function normalizeDraftName(notes: string): string {
		const firstLine =
			notes
				.split(/\r?\n/)
				.map((line) => line.trim())
				.find(Boolean) ?? 'Drafted System';
		const cleaned = firstLine
			.replace(/^(name|system|entrant)\s*[:=-]\s*/i, '')
			.replace(/[^a-zA-Z0-9 &'-]+/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();
		const base = cleaned.length >= 3 ? cleaned : 'Drafted System';
		const withSystem = /system$/i.test(base) ? base : `${base} System`;

		return trimToWordBoundary(withSystem, 44);
	}

	function normalizeDraftThesis(notes: string, policyKey: PolicyKey): string {
		const compact = notes
			.replace(/\s+/g, ' ')
			.replace(/^(name|system|entrant)\s*[:=-]\s*/i, '')
			.trim();
		const fallback = `Optimize ${formatPolicyLabel(policyKey).toLowerCase()} while keeping owner, labor, and resilience gates visible.`;
		const thesis = compact.length >= 12 ? compact : fallback;

		return trimToWordBoundary(thesis, 180);
	}

	function inferDraftPolicy(notes: string): PolicyKey {
		const lower = notes.toLowerCase();
		const scores: Record<PolicyKey, number> = {
			schedule: keywordScore(lower, [
				'schedule',
				'rest',
				'recovery',
				'travel',
				'fatigue',
				'back-to-back',
				'star availability'
			]),
			media: keywordScore(lower, [
				'media',
				'attention',
				'market',
				'fan',
				'visibility',
				'growth',
				'national',
				'small-market'
			]),
			labor: keywordScore(lower, ['labor', 'trust', 'union', 'player', 'peace', 'enforcement'])
		};

		return (Object.entries(scores).sort(
			([, left], [, right]) => right - left
		)[0]?.[0] ?? 'media') as PolicyKey;
	}

	function inferDraftWeights(notes: string, policyKey: PolicyKey): SystemScoreWeights {
		const lower = notes.toLowerCase();
		const weights: Record<keyof SystemScoreWeights, number> =
			policyKey === 'schedule'
				? {
						leagueHealth: 24,
						mediaValueB: 10,
						competitiveBalance: 16,
						laborTrust: 16,
						ownerMargin: 10,
						resilience: 24
					}
				: policyKey === 'labor'
					? {
							leagueHealth: 18,
							mediaValueB: 10,
							competitiveBalance: 14,
							laborTrust: 28,
							ownerMargin: 10,
							resilience: 20
						}
					: {
							leagueHealth: 14,
							mediaValueB: 24,
							competitiveBalance: 22,
							laborTrust: 10,
							ownerMargin: 12,
							resilience: 18
						};

		if (hasAnyKeyword(lower, ['health', 'recovery', 'availability'])) {
			shiftDraftWeight(weights, 'leagueHealth', 4);
		}
		if (hasAnyKeyword(lower, ['media', 'attention', 'market', 'growth', 'fan'])) {
			shiftDraftWeight(weights, 'mediaValueB', 4);
		}
		if (hasAnyKeyword(lower, ['balance', 'parity', 'small-market', 'small market'])) {
			shiftDraftWeight(weights, 'competitiveBalance', 4);
		}
		if (hasAnyKeyword(lower, ['labor', 'trust', 'union', 'player'])) {
			shiftDraftWeight(weights, 'laborTrust', 4);
		}
		if (hasAnyKeyword(lower, ['owner', 'margin', 'board', 'credible'])) {
			shiftDraftWeight(weights, 'ownerMargin', 4);
		}
		if (hasAnyKeyword(lower, ['resilience', 'durable', 'survive', 'long-run', 'long run'])) {
			shiftDraftWeight(weights, 'resilience', 4);
		}

		const nativePriority =
			policyKey === 'labor'
				? 'laborTrust'
				: policyKey === 'schedule'
					? 'leagueHealth'
					: 'mediaValueB';
		if (weights[nativePriority] < 24) {
			shiftDraftWeight(weights, nativePriority, 24 - weights[nativePriority]);
		}

		return decimalWeights(weights);
	}

	function shiftDraftWeight(
		weights: Record<keyof SystemScoreWeights, number>,
		target: keyof SystemScoreWeights,
		amount: number
	): void {
		const room = builderMaximumWeight - weights[target];
		let remaining = Math.min(amount, room);
		if (remaining <= 0) return;

		for (const key of [...builderWeightFields]
			.map((field) => field.key)
			.filter((key) => key !== target)
			.sort((left, right) => weights[right] - weights[left])) {
			const available = weights[key] - builderMinimumWeights[key];
			const shift = Math.min(available, remaining);
			weights[key] -= shift;
			weights[target] += shift;
			remaining -= shift;
			if (remaining <= 0) return;
		}
	}

	function keywordScore(value: string, keywords: string[]): number {
		return keywords.reduce((score, keyword) => {
			const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			return score + (value.match(new RegExp(escaped, 'g'))?.length ?? 0);
		}, 0);
	}

	function hasAnyKeyword(value: string, keywords: string[]): boolean {
		return keywords.some((keyword) => value.includes(keyword));
	}

	function trimToWordBoundary(value: string, maxLength: number): string {
		if (value.length <= maxLength) return value;
		const sliced = value.slice(0, maxLength).trim();
		const lastSpace = sliced.lastIndexOf(' ');
		return (lastSpace > 12 ? sliced.slice(0, lastSpace) : sliced).trim();
	}

	function formatPolicyLabel(policyKey: PolicyKey): string {
		return policies.find((policy) => policy.key === policyKey)?.label ?? policyKey;
	}

	function systemToUploadDefinition(system: System): SystemUploadDefinition {
		return {
			name: system.name,
			thesis: system.thesis,
			stance: system.stance,
			constraint: system.constraint,
			adaptation: system.adaptation,
			policyKey: system.policyKey,
			weights: { ...system.weights }
		};
	}

	function decimalWeights(weights: Record<keyof SystemScoreWeights, number>): SystemScoreWeights {
		return {
			leagueHealth: weights.leagueHealth / 100,
			mediaValueB: weights.mediaValueB / 100,
			competitiveBalance: weights.competitiveBalance / 100,
			laborTrust: weights.laborTrust / 100,
			ownerMargin: weights.ownerMargin / 100,
			resilience: weights.resilience / 100
		};
	}

	function percentWeights(weights: SystemScoreWeights): Record<keyof SystemScoreWeights, number> {
		return {
			leagueHealth: Math.round(weights.leagueHealth * 100),
			mediaValueB: Math.round(weights.mediaValueB * 100),
			competitiveBalance: Math.round(weights.competitiveBalance * 100),
			laborTrust: Math.round(weights.laborTrust * 100),
			ownerMargin: Math.round(weights.ownerMargin * 100),
			resilience: Math.round(weights.resilience * 100)
		};
	}
</script>

<section class="ona-system-shell" aria-labelledby="ona-system-title">
	<div class="ona-system-hero ona-system-container">
		<div class="ona-system-copy">
			<p class="ona-system-eyebrow">Basketball Systems Lab</p>
			<h1 id="ona-system-title">Run the league like a living system.</h1>
			<p class="ona-system-lede">
				A commissioner-mode strategy lab where each System runs through years of schedule policy,
				labor trust, media value, fan attention, and competitive balance. Steer the model mid-season
				and watch the receipts ripple forward.
			</p>
			<div class="ona-system-actions" aria-label="Prototype modes">
				<a href="#lab" class="ona-system-action ona-system-action--primary">Open lab</a>
				<a href="#board-report" class="ona-system-action ona-system-action--secondary"
					>Read board report</a
				>
			</div>
		</div>

		<div class="ona-system-league-panel ona-system-panel" aria-label="League operating state">
			<div class="ona-system-panel-header">
				<span>Year {viewedYear}</span>
				<strong>Policy Window</strong>
			</div>
			<div class="ona-system-court">
				<div class="ona-system-court-lines" aria-hidden="true">
					<div class="ona-system-court-half"></div>
					<div class="ona-system-court-key"></div>
					<div class="ona-system-court-arc"></div>
					<div class="ona-system-court-dot"></div>
				</div>
				<div class="ona-system-court-readout">
					<span>Current leader</span>
					<strong>{viewedLeader.result.system.name}</strong>
					<small>{activeEntry.decision}. {activeEntry.receipt}</small>
				</div>
			</div>
			<div class="ona-system-metric-grid">
				{#each activeEntry.metrics as metric}
					<div class="ona-system-metric" data-tone={metric.tone}>
						<span>{metric.label}</span>
						<strong>{metric.value}</strong>
						<small>{metric.delta}</small>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<div id="lab" class="ona-system-lab-grid ona-system-container">
		<aside class="ona-system-policy-rail ona-system-panel" aria-label="Policy controls">
			<div class="ona-system-kicker">
				<SlidersHorizontal size={18} strokeWidth={1.8} />
				<span>System Console</span>
			</div>
			<h2>Choose the Systems and league pressure.</h2>

			<div class="ona-system-mode-control" aria-label="Lab mode">
				<button
					type="button"
					class:active={mode === 'single'}
					aria-pressed={mode === 'single'}
					onclick={() => (mode = 'single')}
				>
					Solo
				</button>
				<button
					type="button"
					class:active={mode === 'versus'}
					aria-pressed={mode === 'versus'}
					onclick={() => (mode = 'versus')}
				>
					Versus
				</button>
			</div>
			<div class="ona-system-mode-note">
				<strong>{isSolo ? 'Solo challenge' : canSteer ? 'Coach run' : versusModeLabel}</strong>
				<p>{modeRule}</p>
			</div>

			{#if mode === 'versus'}
				<div class="ona-system-versus-control" aria-label="Versus control">
					<button
						type="button"
						class:active={versusControl === 'autonomous'}
						aria-pressed={versusControl === 'autonomous'}
						onclick={() => (versusControl = 'autonomous')}
					>
						<span>Autonomous</span>
						<small>Systems run clean</small>
					</button>
					<button
						type="button"
						class:active={versusControl === 'coach'}
						aria-pressed={versusControl === 'coach'}
						onclick={() => (versusControl = 'coach')}
					>
						<span>Coach System</span>
						<small>Steer one side</small>
					</button>
				</div>
			{/if}

			<div class="ona-system-game-turn" aria-label="Game turn">
				<div class="ona-system-game-turn-header">
					<div>
						<span>{gameTurnLabel}</span>
						<strong>{gameTurnTitle}</strong>
					</div>
					<button type="button" class:active={playbackRunning} onclick={runPrimaryAction}>
						{#if playbackRunning}
							<Pause size={15} strokeWidth={2} />
						{:else}
							<Play size={15} strokeWidth={2} />
						{/if}
						<span>{primaryRunActionLabel}</span>
					</button>
				</div>
				<div class="ona-system-game-turn-lanes">
					{#each gameTurnLanes as lane}
						<article>
							<span>{lane.label}</span>
							<strong>{lane.value}</strong>
							<p>{lane.detail}</p>
						</article>
					{/each}
				</div>
			</div>

			<div
				class="ona-system-competition-setup"
				data-state={uploadedSystems.length > 0 ? 'custom' : 'stock'}
			>
				<div class="ona-system-timeline-header">
					<Users size={17} strokeWidth={1.8} />
					<span>Field setup</span>
				</div>
				<strong>{uploadedCompetitionLabel}</strong>
				<p>{uploadedCompetitionDetail}</p>

				{#if uploadedSystems.length > 0}
					<div class="ona-system-competition-roster" aria-label="Field entrants">
						{#each entrantReadiness as entrant}
							<article
								class:active={entrant.active}
								data-readiness={entrant.readinessTone}
							>
								<div>
									<span>{entrant.policyLabel}</span>
									<small>{entrant.readinessLabel}</small>
								</div>
								<strong>{entrant.name}</strong>
								<p>{entrant.detail}</p>
								<div class="ona-system-competition-roster-meta">
									<small>{entrant.topWeights}</small>
									<strong>{entrant.score}</strong>
								</div>
							</article>
						{/each}
					</div>
				{/if}

				{#if mode === 'versus' && customEntrantsInRun.length > 0}
					<div class="ona-system-competition-proof">
						<span>{hasUploadedField ? 'In this field' : 'In this race'}</span>
						<strong
							>{customEntrantsInRun.length} {hasUploadedField ? 'field' : 'race'} entrant{customEntrantsInRun.length === 1
								? ''
								: 's'}</strong
						>
						<p>
							Final winner after gates: {match.winner.system.name} at {match.winner.score.toFixed(
								1
							)}.
						</p>
					</div>
				{/if}

				<div class="ona-system-competition-actions">
					<button type="button" onclick={raceUploadedSystems}>
						<Play size={15} strokeWidth={2} />
						<span
							>{uploadedSystems.length > 0
								? hasUploadedField
									? 'Start entrant field'
									: 'Start entrant race'
								: 'Load sample field'}</span
						>
					</button>
					<button type="button" onclick={openSystemWorkbench}>Add Systems</button>
				</div>
			</div>

			<div
				class="ona-system-objective-brief"
				data-status={match.challenge.status}
				aria-label="Current objective"
			>
				<div>
					<span>{isSolo ? 'Objective' : 'Race rule'}</span>
					<strong>{match.challenge.label}</strong>
					<p>
						{isSolo
							? 'Clear the target score and keep both floor metrics alive through the final year.'
							: match.challenge.summary}
					</p>
				</div>

				{#if match.challenge.objectives.length > 0}
					<div class="ona-system-objective-brief-list">
						{#each match.challenge.objectives as objective}
							<article data-status={objective.status}>
								<span>{objective.label}</span>
								<strong>{objective.value}</strong>
								<small>{formatChallengeObjectiveStatus(objective.status)}</small>
								<p>Target {objective.target}</p>
							</article>
						{/each}
					</div>
				{/if}
			</div>

			<div class="ona-system-run-summary" aria-label="Season run summary">
				<div>
					<span>Season run</span>
					<strong>{viewedLeader.result.system.name}</strong>
					<p>
						{selectedEnvironment.name}; {horizonYears} years; {activeGateRiskLabel}; {match
							.challenge.label}.
					</p>
				</div>
				<div class="ona-system-run-lanes">
					{#each runScoreLanes as lane}
						<article>
							<span>{lane.label}</span>
							<strong>{lane.value}</strong>
							<small>{lane.detail}</small>
						</article>
					{/each}
				</div>
			</div>

			<div class="ona-system-control-group">
				<span>Environment</span>
				<select bind:value={selectedEnvironmentKey} aria-label="Environment">
					{#each environments as environment}
						<option value={environment.key}>{environment.name}</option>
					{/each}
				</select>
				<div class="ona-system-environment-note">
					<strong>{selectedEnvironment.pressure}</strong>
					<p>{selectedEnvironment.winCondition}</p>
				</div>
			</div>

			<div class="ona-system-policy-list">
				{#each systems as system}
					<button
						type="button"
						aria-pressed={selectedSystem === system.key}
						class:active={selectedSystem === system.key}
						onclick={() => (selectedSystem = system.key)}
					>
						<span>{uploadedSystemKeys.has(system.key) ? 'Field entrant' : system.stance}</span>
						<strong>{system.name}</strong>
						<small>{policies.find((policy) => policy.key === system.policyKey)?.score}</small>
					</button>
				{/each}
			</div>

			{#if mode === 'versus'}
				{#if hasUploadedField}
					<div class="ona-system-control-group">
						<span>Uploaded Field</span>
						<div class="ona-system-environment-note">
							<strong>{uploadedSystems.length} Systems are in this field.</strong>
							<p>
								All uploaded entrants run together. The selected System is the coach target
								when coach mode is active.
							</p>
						</div>
					</div>
				{:else}
					<div class="ona-system-control-group">
						<span>Opponent System</span>
						<select bind:value={opponentSystem} aria-label="Opponent System">
							{#each systems.filter((system) => system.key !== selectedSystem) as system}
								<option value={system.key}>{system.name}</option>
							{/each}
						</select>
					</div>
				{/if}
			{/if}

			<div
				class="ona-system-scouting-report"
				data-status={match.validation.status}
				aria-label="Pre-run scouting report"
			>
				<div class="ona-system-scouting-header">
					<span>Pre-run scout</span>
					<strong>{scoutingLabel}</strong>
					<p>{scoutingSummary}</p>
				</div>
				<div class="ona-system-scouting-list">
					{#each scoutingRequirements as requirement}
						<article data-status={requirement.status}>
							<div>
								<span>{requirement.label}</span>
								<small>{formatRequirementStatus(requirement.status)}</small>
							</div>
							<strong>{requirement.summary}</strong>
							<p>{requirement.detail}</p>
						</article>
					{/each}
				</div>
			</div>

			<div class="ona-system-control-group">
				<span>Comparison Horizon</span>
				<div class="ona-system-option-row">
					{#each horizonOptions as option}
						<button
							type="button"
							class:active={horizonYears === option}
							aria-pressed={horizonYears === option}
							onclick={() => (horizonYears = option)}
						>
							{option} years
						</button>
					{/each}
				</div>
			</div>

			{#if canSteer}
				<div class="ona-system-steering-handoff" aria-label="Steering turn status">
					<span>Steering turn</span>
					<strong>Live cockpit</strong>
					<p>
						Year {viewedYear}; {selectedSteeringPhase.label}; {activeSteeringPolicy
							? `${activeSteeringPolicy.label} preview`
							: 'original System preview'}.
					</p>
				</div>
			{/if}

			<details class="ona-system-advanced" bind:open={systemWorkbenchOpen}>
				<summary>
					<span>Enter a System</span>
					<strong
						>{uploadedSystems.length > 0
							? `${uploadedSystems.length} entered`
							: 'Builder or JSON'}</strong
					>
				</summary>

				<div class="ona-system-builder">
					<div class="ona-system-kicker">
						<SlidersHorizontal size={17} strokeWidth={1.8} />
						<span>System Builder</span>
					</div>
					<label>
						<span>System name</span>
						<input bind:value={builderName} aria-label="Builder System name" maxlength="44" />
					</label>
					<label>
						<span>Native policy</span>
						<select bind:value={builderPolicy} aria-label="Builder native policy">
							{#each policies as policy}
								<option value={policy.key}>{policy.label}</option>
							{/each}
						</select>
					</label>
					<label>
						<span>Thesis</span>
						<textarea bind:value={builderThesis} aria-label="Builder System thesis" maxlength="180"
						></textarea>
					</label>
					<div class="ona-system-builder-weights" aria-label="Builder scoring weights">
						{#each builderWeightFields as field}
							<article>
								<label for={`builder-weight-${field.key}`}>
									<span>{field.label}</span>
									<strong>{builderWeights[field.key]}%</strong>
								</label>
								<input
									id={`builder-weight-${field.key}`}
									type="range"
									min={builderMinimumWeights[field.key]}
									max={builderMaximumWeight}
									step="1"
									value={builderWeights[field.key]}
									aria-label={`${field.label} weight`}
									oninput={(event) => setBuilderWeight(field.key, event)}
								/>
							</article>
						{/each}
					</div>
					<div class="ona-system-builder-status">
						<strong>{builderTotal}% allocated</strong>
						<span>{builderMessage}</span>
					</div>
					<div class="ona-system-upload-actions">
						<button type="button" onclick={addBuiltSystem}>Add built System</button>
						<button type="button" onclick={previewBuiltSystemJson}>Preview JSON</button>
						<button type="button" onclick={resetBuilder}>Reset builder</button>
					</div>
				</div>

				<div class="ona-system-upload">
					<div class="ona-system-kicker">
						<FileJson size={17} strokeWidth={1.8} />
						<span>Entrant Import</span>
					</div>
					<div class="ona-system-draft-import" aria-label="Draft entrant from notes">
						<label>
							<span>Paste rough System notes</span>
							<textarea
								bind:value={draftText}
								aria-label="Rough System notes"
								maxlength="420"
							></textarea>
						</label>
						<div class="ona-system-draft-actions">
							<button type="button" onclick={draftEntrantFromNotes}>Draft entrant JSON</button>
							<span>{draftMessage}</span>
						</div>
					</div>
					<textarea bind:value={uploadText} aria-label="System JSON definition"></textarea>
					<div class="ona-system-upload-actions">
						<label>
							<input type="file" accept="application/json,.json" onchange={readSystemFile} />
							<span>Import JSON file</span>
						</label>
						<button type="button" onclick={importSystems}>Enter Systems</button>
						<button type="button" onclick={loadSampleSystem}>Sample System</button>
					</div>
					<div
						class="ona-system-upload-status"
						data-state={uploadedSystems.length > 0 ? 'accepted' : 'idle'}
					>
						<strong>{uploadMessage}</strong>
						{#if uploadIssues.length > 0}
							<ul>
								{#each uploadIssues.slice(0, 4) as issue}
									<li>{issue.path}: {issue.message}</li>
								{/each}
							</ul>
						{/if}
					</div>
				</div>
			</details>
		</aside>

		<div class="ona-system-map ona-system-panel" aria-label="Causal systems map">
			<div class="ona-system-map-header">
				<div>
					<p class="ona-system-eyebrow">Causal Map</p>
					<h2>{viewedLeader.result.system.name}</h2>
				</div>
				<div class="ona-system-map-badge">
					<LineChart size={17} strokeWidth={1.8} />
					<span>Year {viewedYear} of {match.years}</span>
				</div>
			</div>

			<div class="ona-system-rulebook" aria-label="Run rules">
				<article>
					<span>Win condition</span>
					<strong>{isSolo ? 'Clear challenge objectives' : 'Highest valid system score'}</strong>
					<p>
						{isSolo
							? 'Single-player runs are judged by score, owner room, and labor trust targets.'
							: `${match.environment.winCondition}. Requirement gates adjust unrealistic wins.`}
					</p>
				</article>
				<article>
					<span>Play model</span>
					<strong
						>{isSolo
							? 'Coach vs environment'
							: canSteer
								? hasUploadedField
									? 'Coach within field'
									: 'Coach within race'
								: hasUploadedField
									? 'System field'
									: 'System vs System'}</strong
					>
					<p>{modeRule}</p>
				</article>
			</div>

			<div
				class="ona-system-challenge"
				data-status={match.challenge.status}
				aria-label="Run challenge"
			>
				<div class="ona-system-challenge-header">
					<div>
						<div class="ona-system-timeline-header">
							<ShieldCheck size={17} strokeWidth={1.8} />
							<span>{isSolo ? 'Single challenge' : 'Versus objective'}</span>
						</div>
						<strong>{match.challenge.label}</strong>
					</div>
					<p>{match.challenge.summary}</p>
				</div>

				{#if match.challenge.objectives.length > 0}
					<div class="ona-system-challenge-list">
						{#each match.challenge.objectives as objective}
							<article data-status={objective.status}>
								<div>
									<span>{objective.label}</span>
									<small>{formatChallengeObjectiveStatus(objective.status)}</small>
								</div>
								<strong>{objective.value}</strong>
								<small>Target {objective.target}</small>
								<p>{objective.detail}</p>
							</article>
						{/each}
					</div>
				{/if}
			</div>

			<div class="ona-system-playback" aria-label="Run playback">
				<div>
					<span>Run playback</span>
					<strong>Year {viewedYear} of {match.years}</strong>
					<p>{activeEntry.receipt}</p>
				</div>
				<div class="ona-system-playback-panel">
					<div class="ona-system-playback-controls">
						<button
							type="button"
							disabled={viewedYear === 1}
							onclick={() => setViewedYear(viewedYear - 1)}
						>
							Previous
						</button>
						<input
							type="range"
							min="1"
							max={match.years}
							step="1"
							value={viewedYear}
							aria-label="Run year"
							oninput={(event) => setViewedYear(Number(event.currentTarget.value))}
						/>
						<button
							type="button"
							disabled={viewedYear === match.years}
							onclick={() => setViewedYear(viewedYear + 1)}
						>
							Next
						</button>
					</div>
					<div class="ona-system-playback-actions" aria-label="Watch run controls">
						<button type="button" class:active={playbackRunning} onclick={togglePlayback}>
							{#if playbackRunning}
								<Pause size={15} strokeWidth={2} />
								<span>Pause</span>
							{:else}
								<Play size={15} strokeWidth={2} />
								<span>{viewedYear === match.years ? 'Replay run' : 'Watch run'}</span>
							{/if}
						</button>
						<button type="button" onclick={resetPlayback} disabled={viewedYear === 1 && !playbackRunning}>
							<RotateCcw size={15} strokeWidth={2} />
							<span>Reset</span>
						</button>
					</div>
				</div>
			</div>

			<div class="ona-system-turn-recap" data-status={turnRecapStatus} aria-label="Turn recap">
				{#each turnRecap as lane}
					<article>
						<span>{lane.label}</span>
						<strong>{lane.value}</strong>
						<p>{lane.detail}</p>
					</article>
				{/each}
			</div>

			<div class="ona-system-compounding-trail" aria-label="Compounding trail">
				<div class="ona-system-compounding-trail-header">
					<div>
						<span>Compounding trail</span>
						<strong>{formatDelta(compoundingDelta)} through year {viewedYear}</strong>
					</div>
					<p>
						{viewedLeader.result.system.name} has accumulated {compoundingTrail.length}
						turn{compoundingTrail.length === 1 ? '' : 's'} in this run.
					</p>
				</div>
				<div class="ona-system-compounding-trail-list">
					{#each compoundingTrail as trail}
						<article class:active={trail.active} class:steered={trail.steered}>
							<span>Year {trail.year}</span>
							<strong>{trail.value}</strong>
							<small>{trail.label}</small>
							<p>{trail.detail}</p>
						</article>
					{/each}
				</div>
			</div>

			{#if finalOutcomeVisible}
				<div
					class="ona-system-final-outcome"
					data-status={finalOutcomeStatus}
					aria-label="Final outcome"
				>
					<div class="ona-system-final-outcome-header">
							<div>
								<div class="ona-system-timeline-header">
									<Trophy size={17} strokeWidth={1.8} />
									<span>{isSolo ? 'Single result' : 'Versus result'}</span>
								</div>
								<strong>{finalOutcomeTitle}</strong>
							</div>
						<p>{finalOutcomeSummary}</p>
						<button type="button" onclick={resetPlayback}>
							<RotateCcw size={15} strokeWidth={2} />
							<span>Replay from year 1</span>
						</button>
					</div>
					<div class="ona-system-final-outcome-lanes">
						{#each finalOutcomeLanes as lane}
							<article>
								<span>{lane.label}</span>
								<strong>{lane.value}</strong>
								<p>{lane.detail}</p>
							</article>
						{/each}
					</div>
				</div>
			{/if}

			<div class="ona-system-steering-cockpit" aria-label="Live steering cockpit">
				<div class="ona-system-steering-cockpit-header">
					<div>
						<div class="ona-system-timeline-header">
							<SlidersHorizontal size={17} strokeWidth={1.8} />
							<span>{canSteer ? 'Live steering' : 'Autonomous run'}</span>
						</div>
						<strong
							>{canSteer
								? `Steer ${match.steering.targetSystem.name} from year ${viewedYear}`
								: hasUploadedField
									? 'Versus field is autonomous'
									: 'Versus race is autonomous'}</strong
						>
					</div>
					<p>{steeringReceipt}</p>
				</div>

				{#if canSteer}
					<div
						class="ona-system-next-turn"
						data-status={nextTurnPrompt.status}
						aria-label="Next turn action"
					>
						<div>
							<span>{nextTurnPrompt.label}</span>
							<strong>{nextTurnPrompt.title}</strong>
							<p>{nextTurnPrompt.detail}</p>
							<div class="ona-system-next-turn-gate">
								<span>{nextTurnPrompt.gateLabel}</span>
								<small>{nextTurnPrompt.gateDetail}</small>
							</div>
						</div>
						<div class="ona-system-next-turn-actions">
							<button
								type="button"
								class="primary"
								disabled={nextTurnPrompt.status === 'applied' && !canAdvanceTurn}
								onclick={nextTurnPrompt.status === 'applied'
									? watchNextTurn
									: applySteeringRecommendation}
							>
								<span>{nextTurnPrompt.primaryLabel}</span>
								<strong>{nextTurnPrompt.primaryValue}</strong>
							</button>
							<button
								type="button"
								disabled={steeringPolicy === 'none' && steeringYear === viewedYear}
								onclick={holdOriginalFromViewedYear}
							>
								<span>Hold</span>
								<strong>Original</strong>
							</button>
							<button type="button" disabled={!canAdvanceTurn} onclick={watchNextTurn}>
								<span>Watch</span>
								<strong>{canAdvanceTurn ? `Year ${viewedYear + 1}` : 'Done'}</strong>
							</button>
						</div>
					</div>

					<details class="ona-system-turn-disclosure">
						<summary>
							<span>Tune this turn</span>
							<strong>{steeringPlanLabel}</strong>
						</summary>
						<div class="ona-system-turn-disclosure-body">
							<div class="ona-system-steering-actions" aria-label="Steering policy choices">
								<button
									type="button"
									class:active={steeringYear === viewedYear}
									onclick={() => steerFromViewedYear()}
								>
									<span>Use year {viewedYear}</span>
									<small>{steeringPlanLabel}</small>
								</button>
								<button
									type="button"
									class:active={steeringPolicy === 'none'}
									aria-pressed={steeringPolicy === 'none'}
									onclick={() => {
										steeringYear = viewedYear;
										steeringPolicy = 'none';
									}}
								>
									<span>Original</span>
									<small>No steer</small>
								</button>
								{#each policies as policy}
									<button
										type="button"
										class:active={steeringPolicy === policy.key && steeringYear === viewedYear}
										aria-pressed={steeringPolicy === policy.key && steeringYear === viewedYear}
										onclick={() => steerFromViewedYear(policy.key)}
									>
										<span>{policy.label}</span>
										<small>{policy.score}</small>
									</button>
								{/each}
							</div>

							<div class="ona-system-steering-season" aria-label="Steering season window">
								{#each seasonPhases as phase}
									<button
										type="button"
										class:active={steeringPhase === phase.key}
										aria-pressed={steeringPhase === phase.key}
										onclick={() => setSteeringPhase(phase.key)}
									>
										<span>{phase.label}</span>
										<small>{Math.round(phase.impact * 100)}%</small>
									</button>
								{/each}
							</div>
						</div>
					</details>

					<details class="ona-system-turn-disclosure ona-system-turn-disclosure--compare">
						<summary>
							<span>Compare moves</span>
							<strong>{selectedSteeringPhase.label} from year {viewedYear}</strong>
						</summary>
						<div class="ona-system-turn-disclosure-body">
							<div class="ona-system-steering-previews" aria-label="Steering previews">
								<div class="ona-system-steering-preview-grid">
									{#each steeringPreviews as preview}
										<button
											type="button"
											class:active={preview.active}
											data-recommended={preview.recommended}
											aria-pressed={preview.active}
											onclick={() => applySteeringPreview(preview)}
										>
											<div>
												<span>{preview.label}</span>
												<small>{preview.recommended ? 'Best preview' : 'Projected'}</small>
											</div>
											<strong>{preview.scoreLabel}</strong>
											<p>{preview.detail}</p>
										</button>
									{/each}
								</div>
							</div>

							<div class="ona-system-steering-comparison" aria-label="Steering comparison">
								{#each steeringComparison as comparison}
									<article>
										<span>{comparison.label}</span>
										<strong>{comparison.value}</strong>
										<small>{comparison.detail}</small>
									</article>
								{/each}
							</div>
						</div>
					</details>

				{:else}
					<div class="ona-system-steering-locked">
						<strong>{match.winner.system.name}</strong>
						<span>Winner is decided by final valid score after requirement gates.</span>
					</div>
				{/if}
			</div>

			{#if mode === 'versus'}
				<div class="ona-system-race-history" aria-label="Race history">
					<div class="ona-system-race-history-header">
						<div>
							<div class="ona-system-timeline-header">
								<Trophy size={17} strokeWidth={1.8} />
								<span>Race history</span>
							</div>
							<strong>Best-of-horizons record</strong>
						</div>
						<p>
							{hasUploadedField
								? 'Compare the uploaded field across short, standard, and long horizons before choosing which run to watch.'
								: 'Compare the same two Systems across short, standard, and long horizons before choosing which run to watch.'}
						</p>
					</div>
					<div class="ona-system-race-history-list">
						{#each raceHistory as race}
							<button
								type="button"
								class:active={race.active}
								aria-pressed={race.active}
								onclick={() => setRaceHistoryHorizon(race.years)}
							>
								<span>{race.years}-year race</span>
								<strong>{race.winner}</strong>
								<small>Score {race.score}; margin {race.margin}</small>
								<p>
									{race.detail}
									{#if race.customCount > 0}
										{race.customCount} entrant{race.customCount === 1 ? '' : 's'} in this {hasUploadedField ? 'field' : 'matchup'}.
									{/if}
								</p>
							</button>
						{/each}
					</div>
				</div>

				<div class="ona-system-race-momentum" aria-label="Race momentum">
					<div class="ona-system-race-momentum-header">
						<div>
							<div class="ona-system-timeline-header">
								<LineChart size={17} strokeWidth={1.8} />
								<span>Race momentum</span>
							</div>
							<strong>{raceMomentumSummary}</strong>
						</div>
						<p>{raceMomentumDetail}</p>
					</div>
					<div class="ona-system-decision-moments" aria-label="Decision swing moments">
						<article class="ona-system-decision-moment-feature" data-tone={activeDecisionMoment.tone}>
							<span>Year {activeDecisionMoment.year} swing / {activeDecisionMoment.label}</span>
							<strong>{activeDecisionMoment.value}</strong>
							<p>{activeDecisionMoment.detail}</p>
							<small>{activeDecisionMoment.action}</small>
						</article>
						<div class="ona-system-decision-moment-list">
							{#each decisionMoments as moment}
								<button
									type="button"
									class:active={moment.active}
									data-tone={moment.tone}
									aria-pressed={moment.active}
									onclick={() => setRaceMomentumYear(moment.year)}
								>
									<span>Year {moment.year}</span>
									<strong>{moment.label}</strong>
									<p>{moment.value}</p>
									<small>{moment.action}</small>
								</button>
							{/each}
						</div>
					</div>
					<div class="ona-system-race-momentum-grid">
						{#each raceMomentum as item}
							<article class:active={item.active}>
								<div>
									<span>#{item.rank} {item.name}</span>
									<strong>{item.score.toFixed(1)}</strong>
								</div>
								<div>
									<small>Year move {formatDelta(item.delta)}</small>
									<small>Final {item.finalScore.toFixed(1)}; gate {formatDelta(item.gateAdjustment)}</small>
								</div>
								<p>{item.detail}</p>
							</article>
						{/each}
					</div>
					<div class="ona-system-race-year-strip" aria-label="Race years">
						{#each raceYearSnapshots as snapshot}
							<button
								type="button"
								class:active={snapshot.active}
								class:changed={snapshot.changed}
								aria-pressed={snapshot.active}
								onclick={() => setRaceMomentumYear(snapshot.year)}
							>
								<span>Year {snapshot.year}</span>
								<strong>{snapshot.leader}</strong>
								<small>Lead {snapshot.margin.toFixed(1)}</small>
								<p>{snapshot.changed ? 'Lead changed. ' : ''}{snapshot.detail}</p>
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<div class="ona-system-scoreboard" aria-label="System scores">
				{#each viewedStandings as standing, index}
					<article class:active={standing.result.system.key === viewedLeader.result.system.key}>
						<span>#{index + 1} in year {viewedYear} {standing.result.system.name}</span>
						<strong>{standing.entry.score.toFixed(1)}</strong>
						<small
							>Final {standing.result.score.toFixed(1)} after gates; raw {standing.result.rawScore.toFixed(
								1
							)}</small
						>
					</article>
				{/each}
			</div>

			<div class="ona-system-gate-impact" aria-label="Gate-adjusted result">
				<div>
					<span>{viewedLeader.result.validationImpact.label}</span>
					<strong>{viewedLeader.result.validationImpact.score.toFixed(1)}</strong>
					<p>{viewedLeader.result.validationImpact.summary}</p>
				</div>
				<div>
					<article>
						<span>Raw score</span>
						<strong>{viewedLeader.result.validationImpact.rawScore.toFixed(1)}</strong>
						<small>Before requirement gates</small>
					</article>
					<article>
						<span>Gate adjustment</span>
						<strong>{viewedLeader.result.validationImpact.adjustment.toFixed(1)}</strong>
						<small>Applied before final ranking</small>
					</article>
				</div>
				<div class="ona-system-gate-impact-list">
					{#each viewedLeader.result.validationImpact.impacts.filter((impact) => impact.status !== 'pass') as impact}
						<article data-status={impact.status}>
							<span>{impact.label}</span>
							<strong>{impact.adjustment.toFixed(1)}</strong>
							<p>{impact.detail}</p>
						</article>
					{:else}
						<article data-status="pass">
							<span>All gates</span>
							<strong>Clean</strong>
							<p>No requirement gate changed the final score.</p>
						</article>
					{/each}
				</div>
			</div>

			<div class="ona-system-score-explain" aria-label="Winning score explanation">
				<div class="ona-system-timeline-header">
					<BarChart3 size={17} strokeWidth={1.8} />
					<span>Raw year {viewedYear} score drivers for {viewedLeader.result.system.name}</span>
				</div>
				<div>
					{#each activeEntry.scoreContributions as contribution}
						<article>
							<span>{contribution.label}</span>
							<strong>{contribution.value.toFixed(1)}</strong>
							<small>{contribution.readout}</small>
						</article>
					{/each}
				</div>
			</div>

			<div class="ona-system-map-stage">
				<svg
					viewBox="0 0 720 480"
					role="img"
					aria-label="Policy effects move through league systems"
				>
					<defs>
						<marker
							id="ona-system-arrow"
							viewBox="0 0 10 10"
							refX="9"
							refY="5"
							markerWidth="6"
							markerHeight="6"
							orient="auto-start-reverse"
						>
							<path d="M 0 0 L 10 5 L 0 10 z" />
						</marker>
					</defs>
					<rect x="22" y="22" width="676" height="436" rx="8" class="ona-system-court-boundary" />
					<line x1="360" y1="22" x2="360" y2="458" class="ona-system-court-line" />
					<circle cx="360" cy="240" r="74" class="ona-system-court-line" />
					<path d="M 22 138 Q 156 240 22 342" class="ona-system-court-line" />
					<path d="M 698 138 Q 564 240 698 342" class="ona-system-court-line" />
					{#each edges as edge}
						<path
							d={edge.path}
							class="ona-system-effect-edge"
							marker-end="url(#ona-system-arrow)"
						/>
					{/each}
				</svg>

				{#each activeEntry.nodes as node}
					<div
						class="ona-system-node"
						data-tone={node.tone}
						style={`--desktop-x: ${node.x}%; --desktop-y: ${node.y}%; --mobile-x: ${node.mx}%; --mobile-y: ${node.my}%;`}
					>
						<span>{node.label}</span>
						<strong>{node.detail}</strong>
					</div>
				{/each}
			</div>

			<div class="ona-system-projection-grid" aria-label="System projections">
				{#each match.projections as projection}
					<article>
						<span>{projection.label}</span>
						<strong>{projection.value}</strong>
						<p>{projection.detail}</p>
					</article>
				{/each}
			</div>

			<div
				class="ona-system-validation"
				data-status={match.validation.status}
				aria-label="Game requirement validation"
			>
				<div class="ona-system-validation-header">
					<div>
						<div class="ona-system-timeline-header">
							<ShieldCheck size={17} strokeWidth={1.8} />
							<span>Requirement gate</span>
						</div>
						<strong>{match.validation.label}</strong>
						<small>{validationCountLabel}</small>
					</div>
					<p>{match.validation.summary}</p>
				</div>

				<div class="ona-system-validation-list">
					{#each surfacedRequirements as requirement}
						<article data-status={requirement.status}>
							<div>
								<div class="ona-system-validation-card-header">
									<span>{requirement.label}</span>
									<small>{formatRequirementStatus(requirement.status)}</small>
								</div>
								<strong>{requirement.summary}</strong>
							</div>
							<p>{requirement.detail}</p>
						</article>
					{/each}
				</div>
			</div>

			<div class="ona-system-timeline" aria-label="Compounding timeline">
				<div class="ona-system-timeline-header">
					<Route size={17} strokeWidth={1.8} />
					<span>Compounding receipts</span>
				</div>
				{#each activeTimeline as entry}
					<article class:active={entry.year === viewedYear}>
						<div>
							<span>Year {entry.year}</span>
							<strong>{entry.decision}</strong>
							<p>{entry.receipt}</p>
						</div>
						<div>
							<span>{entry.phase.label}</span>
							<strong>{entry.score.toFixed(1)}</strong>
						</div>
					</article>
				{/each}
			</div>
		</div>
	</div>

	<div id="board-report" class="ona-system-report-band ona-system-container">
		<div class="ona-system-report-intro">
			<div class="ona-system-kicker">
				<BarChart3 size={18} strokeWidth={1.8} />
				<span>Board Report</span>
			</div>
			<h2>Every move leaves a receipt.</h2>
			<p>
				The design direction keeps the interface quiet, legible, and inspectable. The game should
				explain how decisions compound, where the System was steered, why the winner changed, and
				which realism gates still need attention.
			</p>
		</div>

		<div class="ona-system-report-grid ona-system-report-grid--briefs">
			{#each match.reports as report}
				<article class="ona-system-report">
					<span>{report.label}</span>
					<h3>{report.title}</h3>
					<p>{report.detail}</p>
				</article>
			{/each}
		</div>
		<div class="ona-system-receipt-ledger" aria-label="Simulation receipts">
			{#each match.ledger as entry}
				<article class="ona-system-receipt">
					<div>
						<span>{entry.label}</span>
						<p>{entry.detail}</p>
					</div>
					<strong>{entry.value}</strong>
				</article>
			{/each}
		</div>
	</div>

	<div class="ona-system-strip ona-system-container" aria-label="System pillars">
		<div>
			<Activity size={20} strokeWidth={1.8} />
			<span>System state</span>
		</div>
		<div>
			<Clock3 size={20} strokeWidth={1.8} />
			<span>Season rhythm</span>
		</div>
		<div>
			<Users size={20} strokeWidth={1.8} />
			<span>Labor trust</span>
		</div>
		<div>
			<BadgeDollarSign size={20} strokeWidth={1.8} />
			<span>Business pressure</span>
		</div>
		<div>
			<Globe2 size={20} strokeWidth={1.8} />
			<span>Global growth</span>
		</div>
		<a href="#lab">
			<span>Return to lab</span>
			<ArrowUpRight size={18} strokeWidth={1.8} />
		</a>
	</div>
</section>
