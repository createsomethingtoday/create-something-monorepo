<script lang="ts">
	import {
		Activity,
		ArrowUpRight,
		BadgeDollarSign,
		BarChart3,
		Clock3,
		Globe2,
		LineChart,
		ShieldCheck,
		Users
	} from 'lucide-svelte';
	import { listManagementPolicies, runManagementScenario, type PolicyKey } from './simulation.js';

	const policies = listManagementPolicies();

	const edges = [
		{ path: 'M 92 106 C 165 78 210 74 278 90', label: 'reduces' },
		{ path: 'M 332 92 C 414 98 456 112 520 138', label: 'protects' },
		{ path: 'M 603 177 C 642 241 652 291 623 357', label: 'constrains' },
		{ path: 'M 574 409 C 500 468 423 475 349 434', label: 'pressures' },
		{ path: 'M 278 410 C 200 398 153 356 127 284', label: 'improves' }
	];

	let selectedPolicy = $state<PolicyKey>('schedule');
	const scenario = $derived(runManagementScenario(selectedPolicy));
	const activePolicy = $derived(scenario.policy);
</script>

<section class="ona-system-shell" aria-labelledby="ona-system-title">
	<div class="ona-system-hero ona-system-container">
		<div class="ona-system-copy">
			<p class="ona-system-eyebrow">Basketball Systems Lab</p>
			<h1 id="ona-system-title">Run the league like a living system.</h1>
			<p class="ona-system-lede">
				A commissioner-mode strategy lab for schedule policy, labor trust, media value, fan
				attention, and competitive balance. Built with Ona clarity: visible state, compact controls,
				and receipts for every decision.
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
					<span>Current intervention</span>
					<strong>{activePolicy.change}</strong>
					<small>{activePolicy.pressure}</small>
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
				<ShieldCheck size={18} strokeWidth={1.8} />
				<span>League Office</span>
			</div>
			<h2>Choose the system pressure.</h2>
			<div class="ona-system-policy-list">
				{#each policies as policy}
					<button
						type="button"
						aria-pressed={selectedPolicy === policy.key}
						class:active={selectedPolicy === policy.key}
						onclick={() => (selectedPolicy = policy.key)}
					>
						<span>{policy.arena}</span>
						<strong>{policy.label}</strong>
						<small>{policy.score}</small>
					</button>
				{/each}
			</div>
		</aside>

		<div class="ona-system-map ona-system-panel" aria-label="Causal systems map">
			<div class="ona-system-map-header">
				<div>
					<p class="ona-system-eyebrow">Causal Map</p>
					<h2>{activePolicy.label}</h2>
				</div>
				<div class="ona-system-map-badge">
					<LineChart size={17} strokeWidth={1.8} />
					<span>Seeded simulation</span>
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
				explain why the league changed, not just display that it changed.
			</p>
		</div>

		<div class="ona-system-report-grid ona-system-report-grid--briefs">
			{#each scenario.reports as report}
				<article class="ona-system-report">
					<span>{report.label}</span>
					<h3>{report.title}</h3>
					<p>{report.detail}</p>
				</article>
			{/each}
		</div>
		<div class="ona-system-receipt-ledger" aria-label="Simulation receipts">
			{#each scenario.ledger as entry}
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
