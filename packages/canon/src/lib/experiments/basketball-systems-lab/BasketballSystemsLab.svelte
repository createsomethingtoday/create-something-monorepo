<script lang="ts">
	import {
		Activity,
		ArrowUpRight,
		BadgeDollarSign,
		BarChart3,
		Clock3,
		Globe2,
		LineChart,
		Route,
		SlidersHorizontal,
		Users
	} from 'lucide-svelte';
	import {
		listManagementPolicies,
		listSeasonPhases,
		listSystems,
		runSystemMatch,
		type LabMode,
		type PolicyKey,
		type SeasonPhaseKey,
		type SystemKey
	} from './simulation.js';

	const policies = listManagementPolicies();
	const systems = listSystems();
	const seasonPhases = listSeasonPhases();
	const horizonOptions = [3, 5, 8];

	const edges = [
		{ path: 'M 92 106 C 165 78 210 74 278 90', label: 'reduces' },
		{ path: 'M 332 92 C 414 98 456 112 520 138', label: 'protects' },
		{ path: 'M 603 177 C 642 241 652 291 623 357', label: 'constrains' },
		{ path: 'M 574 409 C 500 468 423 475 349 434', label: 'pressures' },
		{ path: 'M 278 410 C 200 398 153 356 127 284', label: 'improves' }
	];

	let mode = $state<LabMode>('single');
	let selectedSystem = $state<SystemKey>('recovery');
	let opponentSystem = $state<SystemKey>('attention');
	let horizonYears = $state(5);
	let steeringYear = $state(3);
	let steeringPhase = $state<SeasonPhaseKey>('midseason');
	let steeringPolicy = $state<PolicyKey | 'none'>('labor');

	$effect(() => {
		if (opponentSystem === selectedSystem) {
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
			steeringPolicyKey: steeringPolicy === 'none' ? undefined : steeringPolicy
		})
	);
	const scenario = $derived(match.winner.scenario);
	const activePolicy = $derived(scenario.policy);
	const activeTimeline = $derived(match.winner.timeline);
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
					Single
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

			<div class="ona-system-policy-list">
				{#each systems as system}
					<button
						type="button"
						aria-pressed={selectedSystem === system.key}
						class:active={selectedSystem === system.key}
						onclick={() => (selectedSystem = system.key)}
					>
						<span>{system.stance}</span>
						<strong>{system.name}</strong>
						<small>{policies.find((policy) => policy.key === system.policyKey)?.score}</small>
					</button>
				{/each}
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

			<div class="ona-system-scoreboard" aria-label="System scores">
				{#each match.systems as result}
					<article class:active={result.system.key === match.winner.system.key}>
						<span>#{result.rank} {result.system.name}</span>
						<strong>{result.score.toFixed(1)}</strong>
						<small>{result.compoundedScoreDelta >= 0 ? '+' : ''}{result.compoundedScoreDelta.toFixed(1)} compounded</small>
					</article>
				{/each}
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
				explain how decisions compound, where the System was steered, and why the winner changed.
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
