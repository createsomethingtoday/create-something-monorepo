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

	type PolicyKey = 'schedule' | 'media' | 'labor';

	type Policy = {
		key: PolicyKey;
		label: string;
		arena: string;
		change: string;
		pressure: string;
		score: string;
	};

	const policies: Policy[] = [
		{
			key: 'schedule',
			label: 'Schedule Load',
			arena: 'State Lab',
			change: 'Cut back-to-backs by 30%',
			pressure: 'Less star fatigue, tighter national inventory',
			score: '+12 health'
		},
		{
			key: 'media',
			label: 'Media Allocation',
			arena: 'League Office',
			change: 'Shift 18 marquee games to rising markets',
			pressure: 'Better parity story, lower short-term certainty',
			score: '+9 attention'
		},
		{
			key: 'labor',
			label: 'Labor Trust',
			arena: 'Board Report',
			change: 'Guarantee recovery windows after travel spikes',
			pressure: 'Player trust rises, owner margin tightens',
			score: '+15 trust'
		}
	];

	const metrics = [
		{ label: 'League Health', value: '82', delta: '+6', tone: 'green' },
		{ label: 'Media Value', value: '$8.7B', delta: '+4%', tone: 'blue' },
		{ label: 'Competitive Balance', value: '71', delta: '+11', tone: 'neutral' },
		{ label: 'Labor Trust', value: '64', delta: '-2', tone: 'red' }
	];

	const nodes = [
		{ id: 'policy', label: 'Policy', detail: 'Schedule load', x: 9, y: 18, mx: 4, my: 12, tone: 'black' },
		{ id: 'fatigue', label: 'Fatigue', detail: 'Lower', x: 35, y: 13, mx: 36, my: 12, tone: 'green' },
		{ id: 'stars', label: 'Star Availability', detail: 'More reliable', x: 64, y: 20, mx: 61, my: 25, tone: 'blue' },
		{ id: 'media', label: 'Media Value', detail: 'Tighter windows', x: 78, y: 49, mx: 61, my: 47, tone: 'neutral' },
		{ id: 'owners', label: 'Owner Pressure', detail: 'Margin concern', x: 51, y: 70, mx: 36, my: 72, tone: 'red' },
		{ id: 'trust', label: 'Player Trust', detail: 'Higher', x: 22, y: 66, mx: 5, my: 55, tone: 'green' }
	];

	const edges = [
		{ path: 'M 92 106 C 165 78 210 74 278 90', label: 'reduces' },
		{ path: 'M 332 92 C 414 98 456 112 520 138', label: 'protects' },
		{ path: 'M 603 177 C 642 241 652 291 623 357', label: 'constrains' },
		{ path: 'M 574 409 C 500 468 423 475 349 434', label: 'pressures' },
		{ path: 'M 278 410 C 200 398 153 356 127 284', label: 'improves' }
	];

	const reports = [
		{
			label: 'Commissioner Brief',
			title: 'The rule improved the product, but narrowed the media calendar.',
			detail: 'Players are fresher in national games. Broadcast partners now want more flexible windows.'
		},
		{
			label: 'Union Signal',
			title: 'Trust moved because the policy is visible and enforceable.',
			detail: 'The system can show recovery windows, travel clusters, and exceptions before disputes form.'
		},
		{
			label: 'Owner Room',
			title: 'Small markets gained attention, but premium teams want compensation.',
			detail: 'Revenue sharing becomes the next policy question, not a spreadsheet footnote.'
		}
	];

	let selectedPolicy = $state<PolicyKey>('schedule');
	const activePolicy = $derived(policies.find((policy) => policy.key === selectedPolicy) ?? policies[0]);
</script>

<section class="ona-system-shell" aria-labelledby="ona-system-title">
	<div class="ona-system-hero ona-system-container">
		<div class="ona-system-copy">
			<p class="ona-system-eyebrow">Basketball Systems Lab</p>
			<h1 id="ona-system-title">Run the league like a living system.</h1>
			<p class="ona-system-lede">
				A commissioner-mode strategy lab for schedule policy, labor trust, media value, fan
				attention, and competitive balance. Built with Ona clarity: visible state, compact
				controls, and receipts for every decision.
			</p>
			<div class="ona-system-actions" aria-label="Prototype modes">
				<a href="#lab" class="ona-system-action ona-system-action--primary">Open lab</a>
				<a href="#board-report" class="ona-system-action ona-system-action--secondary">Read board report</a>
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
				{#each metrics as metric}
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
				<svg viewBox="0 0 720 480" role="img" aria-label="Policy effects move through league systems">
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
						<path d={edge.path} class="ona-system-effect-edge" marker-end="url(#ona-system-arrow)" />
					{/each}
				</svg>

				{#each nodes as node}
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

		<div class="ona-system-report-grid">
			{#each reports as report}
				<article class="ona-system-report ona-system-panel">
					<span>{report.label}</span>
					<h3>{report.title}</h3>
					<p>{report.detail}</p>
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
