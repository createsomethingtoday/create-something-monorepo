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
		Route,
		ShieldCheck,
		SlidersHorizontal,
		Users
	} from 'lucide-svelte';
	import {
		getSampleSystemUpload,
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
		type SystemId,
		type SystemUploadIssue
	} from './simulation.js';

	const policies = listManagementPolicies();
	const seasonPhases = listSeasonPhases();
	const horizonOptions = [3, 5, 8];
	const sampleSystemDefinition = JSON.stringify(getSampleSystemUpload(), null, 2);

	const edges = [
		{ path: 'M 92 106 C 165 78 210 74 278 90', label: 'reduces' },
		{ path: 'M 332 92 C 414 98 456 112 520 138', label: 'protects' },
		{ path: 'M 603 177 C 642 241 652 291 623 357', label: 'constrains' },
		{ path: 'M 574 409 C 500 468 423 475 349 434', label: 'pressures' },
		{ path: 'M 278 410 C 200 398 153 356 127 284', label: 'improves' }
	];

	let mode = $state<LabMode>('single');
	let selectedSystem = $state<SystemId>('recovery');
	let opponentSystem = $state<SystemId>('attention');
	let horizonYears = $state(5);
	let steeringYear = $state(3);
	let steeringPhase = $state<SeasonPhaseKey>('midseason');
	let steeringPolicy = $state<PolicyKey | 'none'>('labor');
	let uploadedSystems = $state<System[]>([]);
	let uploadText = $state(sampleSystemDefinition);
	let uploadIssues = $state<SystemUploadIssue[]>([]);
	let uploadMessage = $state('Sample System ready');

	const systems = $derived(listSystems(uploadedSystems));
	const uploadedSystemKeys = $derived(new Set(uploadedSystems.map((system) => system.key)));
	const canSteer = $derived(mode === 'single');
	const effectiveSteeringPolicy = $derived(
		canSteer && steeringPolicy !== 'none' ? steeringPolicy : undefined
	);
	const modeRule = $derived(
		canSteer
			? 'Coach one System against the environment. Steering can change policy from the chosen year forward.'
			: 'Run two Systems under the same environment. Both Systems stay autonomous so the design wins or loses on its own.'
	);

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
	});

	const match = $derived(
		runSystemMatch({
			mode,
			systemKey: selectedSystem,
			opponentKey: opponentSystem,
			years: horizonYears,
			steeringYear,
			steeringPhase,
			steeringPolicyKey: effectiveSteeringPolicy,
			customSystems: uploadedSystems
		})
	);
	const scenario = $derived(match.winner.scenario);
	const activePolicy = $derived(scenario.policy);
	const activeTimeline = $derived(match.winner.timeline);
	const validationCounts = $derived(
		match.validation.requirements.reduce(
			(counts, requirement) => ({
				...counts,
				[requirement.status]: counts[requirement.status] + 1
			}),
			{ pass: 0, watch: 0, fail: 0, deferred: 0 } satisfies Record<
				GameRequirementSeverity,
				number
			>
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

	function importSystems(): void {
		const result = parseSystemUpload(uploadText);
		uploadedSystems = result.systems;
		uploadIssues = result.issues;

		if (result.systems.length === 0) {
			uploadMessage = 'No Systems accepted';
			return;
		}

		selectedSystem = result.systems[0].key;
		opponentSystem = result.systems[1]?.key ?? 'recovery';
		mode = result.systems.length > 1 ? 'versus' : mode;
		uploadMessage = `${result.systems.length} System${result.systems.length === 1 ? '' : 's'} accepted`;
	}

	function loadSampleSystem(): void {
		uploadText = sampleSystemDefinition;
		uploadIssues = [];
		uploadMessage = 'Sample System ready';
	}

	async function readSystemFile(event: Event): Promise<void> {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		uploadText = await file.text();
		importSystems();
		input.value = '';
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
				<span>Season 07</span>
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
					<span>Projected leader</span>
					<strong>{match.winner.system.name}</strong>
					<small>{match.winner.outcome} Current intervention: {activePolicy.label}.</small>
				</div>
			</div>
			<div class="ona-system-metric-grid">
				{#each scenario.metrics as metric}
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
			<h2>Choose the System and steering window.</h2>

			<div class="ona-system-mode-control" aria-label="Lab mode">
				<button
					type="button"
					class:active={mode === 'single'}
					aria-pressed={mode === 'single'}
					onclick={() => (mode = 'single')}
				>
					Coach
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
				<strong>{canSteer ? 'Steerable run' : 'Autonomous race'}</strong>
				<p>{modeRule}</p>
			</div>

			<div class="ona-system-policy-list">
				{#each systems as system}
					<button
						type="button"
						aria-pressed={selectedSystem === system.key}
						class:active={selectedSystem === system.key}
						onclick={() => (selectedSystem = system.key)}
					>
						<span>{uploadedSystemKeys.has(system.key) ? 'Uploaded System' : system.stance}</span>
						<strong>{system.name}</strong>
						<small>{policies.find((policy) => policy.key === system.policyKey)?.score}</small>
					</button>
				{/each}
			</div>

			<div class="ona-system-upload">
				<div class="ona-system-kicker">
					<FileJson size={17} strokeWidth={1.8} />
					<span>System Upload</span>
				</div>
				<textarea bind:value={uploadText} aria-label="System JSON definition"></textarea>
				<div class="ona-system-upload-actions">
					<label>
						<input type="file" accept="application/json,.json" onchange={readSystemFile} />
						<span>Upload JSON</span>
					</label>
					<button type="button" onclick={importSystems}>Import Systems</button>
					<button type="button" onclick={loadSampleSystem}>Load sample</button>
				</div>
				<div class="ona-system-upload-status" data-state={uploadedSystems.length > 0 ? 'accepted' : 'idle'}>
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

			{#if mode === 'versus'}
				<div class="ona-system-control-group">
					<span>Opponent System</span>
					<select bind:value={opponentSystem} aria-label="Opponent System">
						{#each systems.filter((system) => system.key !== selectedSystem) as system}
							<option value={system.key}>{system.name}</option>
						{/each}
					</select>
				</div>
			{/if}

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
				<div class="ona-system-control-group">
					<span>Steer In Year</span>
					<select bind:value={steeringYear} aria-label="Steering year">
						{#each Array.from({ length: horizonYears }, (_, index) => index + 1) as year}
							<option value={year}>Year {year}</option>
						{/each}
					</select>
				</div>

				<div class="ona-system-control-group">
					<span>Season Window</span>
					<div class="ona-system-option-row ona-system-option-row--wrap">
						{#each seasonPhases as phase}
							<button
								type="button"
								class:active={steeringPhase === phase.key}
								aria-pressed={steeringPhase === phase.key}
								onclick={() => (steeringPhase = phase.key)}
							>
								{phase.label}
							</button>
						{/each}
					</div>
				</div>

				<div class="ona-system-control-group">
					<span>Steering Policy</span>
					<select bind:value={steeringPolicy} aria-label="Steering policy">
						<option value="none">Keep original System</option>
						{#each policies as policy}
							<option value={policy.key}>{policy.label}</option>
						{/each}
					</select>
				</div>
			{/if}
		</aside>

		<div class="ona-system-map ona-system-panel" aria-label="Causal systems map">
			<div class="ona-system-map-header">
				<div>
					<p class="ona-system-eyebrow">Causal Map</p>
					<h2>{match.winner.system.name}</h2>
				</div>
				<div class="ona-system-map-badge">
					<LineChart size={17} strokeWidth={1.8} />
					<span>{match.years}-year projection</span>
				</div>
			</div>

			<div class="ona-system-rulebook" aria-label="Run rules">
				<article>
					<span>Win condition</span>
					<strong>Highest valid system score</strong>
					<p>{match.environment.winCondition}. Validation gates can downgrade unrealistic wins.</p>
				</article>
				<article>
					<span>Play model</span>
					<strong>{canSteer ? 'Coach vs environment' : 'System vs System'}</strong>
					<p>{modeRule}</p>
				</article>
			</div>

			<div class="ona-system-scoreboard" aria-label="System scores">
				{#each match.systems as result}
					<article class:active={result.system.key === match.winner.system.key}>
						<span>#{result.rank} {result.system.name}</span>
						<strong>{result.score.toFixed(1)}</strong>
						<small>{result.compoundedScoreDelta >= 0 ? '+' : ''}{result.compoundedScoreDelta.toFixed(1)} compounded</small>
					</article>
				{/each}
			</div>

			<div class="ona-system-score-explain" aria-label="Winning score explanation">
				<div class="ona-system-timeline-header">
					<BarChart3 size={17} strokeWidth={1.8} />
					<span>Why {match.winner.system.name} leads</span>
				</div>
				<div>
					{#each match.winner.scoreContributions as contribution}
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

				{#each scenario.nodes as node}
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
					<article class:active={entry.steered}>
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
