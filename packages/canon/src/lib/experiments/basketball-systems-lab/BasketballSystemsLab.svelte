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
		{ label: 'Competitive Balance', value: '71', delta: '+11', tone: 'orange' },
		{ label: 'Labor Trust', value: '64', delta: '-2', tone: 'red' }
	];

	const nodes = [
		{ id: 'policy', label: 'Policy', detail: 'Schedule load', x: 9, y: 18, mx: 4, my: 12, tone: 'black' },
		{ id: 'fatigue', label: 'Fatigue', detail: 'Lower', x: 35, y: 13, mx: 36, my: 12, tone: 'green' },
		{ id: 'stars', label: 'Star Availability', detail: 'More reliable', x: 64, y: 20, mx: 61, my: 25, tone: 'blue' },
		{ id: 'media', label: 'Media Value', detail: 'Tighter windows', x: 78, y: 49, mx: 61, my: 47, tone: 'orange' },
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

<section class="bsl-shell performance-shell" aria-labelledby="bsl-title">
	<div class="bsl-hero performance-container">
		<div class="hero-copy">
			<p class="eyebrow performance-eyebrow">Basketball Systems Lab</p>
			<h1 id="bsl-title">Run the league like a living system.</h1>
			<p class="lede">
				A commissioner-mode strategy lab for schedule policy, labor trust, media value, fan
				attention, and competitive balance. Built with Ona clarity: visible state, compact
				controls, and receipts for every decision.
			</p>
			<div class="hero-actions" aria-label="Prototype modes">
				<a href="#lab" class="primary-action performance-action" data-variant="primary">Open lab</a>
				<a href="#board-report" class="secondary-action performance-action">Read board report</a>
			</div>
		</div>

		<div class="league-panel performance-panel" aria-label="League operating state">
			<div class="panel-header">
				<span>Season 07</span>
				<strong>Policy Window</strong>
			</div>
			<div class="court-card">
				<div class="court-lines" aria-hidden="true">
					<div class="court-half"></div>
					<div class="court-key"></div>
					<div class="court-arc"></div>
					<div class="court-dot"></div>
				</div>
				<div class="court-readout">
					<span>Current intervention</span>
					<strong>{activePolicy.change}</strong>
					<small>{activePolicy.pressure}</small>
				</div>
			</div>
			<div class="signal-grid">
				{#each metrics as metric}
					<div class="signal performance-metric" data-tone={metric.tone}>
						<span>{metric.label}</span>
						<strong>{metric.value}</strong>
						<small>{metric.delta}</small>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<div id="lab" class="lab-grid performance-container">
		<aside class="policy-rail performance-panel" aria-label="Policy controls">
			<div class="section-kicker">
				<ShieldCheck size={18} strokeWidth={1.8} />
				<span>League Office</span>
			</div>
			<h2>Choose the system pressure.</h2>
			<div class="policy-list">
				{#each policies as policy}
					<button
						type="button"
						aria-pressed={selectedPolicy === policy.key}
						class:active={selectedPolicy === policy.key}
						class:performance-pressure-rail={selectedPolicy === policy.key}
						onclick={() => (selectedPolicy = policy.key)}
					>
						<span>{policy.arena}</span>
						<strong>{policy.label}</strong>
						<small>{policy.score}</small>
					</button>
				{/each}
			</div>
		</aside>

		<div class="systems-map performance-panel" aria-label="Causal systems map">
			<div class="map-header">
				<div>
					<p class="eyebrow performance-eyebrow">Causal Map</p>
					<h2>{activePolicy.label}</h2>
				</div>
				<div class="map-badge">
					<LineChart size={17} strokeWidth={1.8} />
					<span>Seeded simulation</span>
				</div>
			</div>

			<div class="map-stage performance-court-grid">
				<svg viewBox="0 0 720 480" role="img" aria-label="Policy effects move through league systems">
					<defs>
						<marker
							id="bsl-arrow"
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
					<rect x="22" y="22" width="676" height="436" rx="8" class="court-boundary" />
					<line x1="360" y1="22" x2="360" y2="458" class="court-line" />
					<circle cx="360" cy="240" r="74" class="court-line" />
					<path d="M 22 138 Q 156 240 22 342" class="court-line" />
					<path d="M 698 138 Q 564 240 698 342" class="court-line" />
					{#each edges as edge}
						<path d={edge.path} class="effect-edge" marker-end="url(#bsl-arrow)" />
					{/each}
				</svg>

				{#each nodes as node}
					<div
						class="map-node"
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

	<div id="board-report" class="report-band performance-container">
		<div class="report-intro">
			<div class="section-kicker">
				<BarChart3 size={18} strokeWidth={1.8} />
				<span>Board Report</span>
			</div>
			<h2>Every move leaves a receipt.</h2>
			<p>
				The design direction keeps the interface quiet, legible, and inspectable. The game should
				explain why the league changed, not just display that it changed.
			</p>
		</div>

		<div class="report-grid">
			{#each reports as report}
				<article class="report performance-panel">
					<span>{report.label}</span>
					<h3>{report.title}</h3>
					<p>{report.detail}</p>
				</article>
			{/each}
		</div>
	</div>

	<div class="discipline-strip performance-container" aria-label="System pillars">
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

<style>
	.bsl-shell {
		--bsl-ink: var(--color-performance-ink);
		--bsl-muted: var(--color-performance-muted);
		--bsl-line: var(--color-performance-line);
		--bsl-paper: var(--color-performance-paper);
		--bsl-surface: var(--color-performance-panel);
		--bsl-blue: var(--color-performance-signal);
		--bsl-green: var(--color-performance-growth);
		--bsl-orange: var(--color-performance-muted);
		--bsl-red: var(--color-performance-risk);
		--bsl-gold: var(--color-performance-gold);
		font-family:
			ABC Diatype,
			Inter,
			ui-sans-serif,
			system-ui,
			sans-serif;
		letter-spacing: 0;
		text-rendering: geometricPrecision;
	}

	.bsl-hero {
		min-height: 82vh;
		display: grid;
		grid-template-columns: minmax(0, 0.95fr) minmax(360px, 1.05fr);
		gap: 56px;
		align-items: center;
		padding: 58px 0 34px;
	}

	.hero-copy {
		display: grid;
		gap: 22px;
		align-content: center;
	}

	.eyebrow,
	.section-kicker {
		margin: 0;
		color: var(--bsl-orange);
		font-size: 0.76rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0;
	}

	h1,
	h2,
	h3,
	p {
		margin: 0;
	}

		h1 {
		max-width: 12ch;
		font-size: clamp(3.7rem, 6vw, 5.9rem);
		line-height: 0.98;
		font-weight: 700;
		letter-spacing: 0;
		text-wrap: balance;
	}

	.lede {
		max-width: 660px;
		color: #34373d;
		font-size: clamp(1.04rem, 1.6vw, 1.32rem);
		line-height: 1.55;
	}

	.hero-actions,
	.discipline-strip,
	.section-kicker,
	.map-badge {
		display: flex;
		align-items: center;
	}

	.hero-actions {
		gap: 10px;
		flex-wrap: wrap;
	}

	.primary-action,
	.secondary-action,
	.discipline-strip a {
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--bsl-ink);
		border-radius: 4px;
		padding: 0 18px;
		color: var(--bsl-ink);
		font-size: 0.88rem;
		font-weight: 700;
		text-decoration: none;
	}

	.primary-action {
		background: var(--bsl-ink);
		color: white;
	}

	.secondary-action {
		background: transparent;
	}

	.league-panel {
		padding: 16px;
		display: grid;
		gap: 14px;
		contain: layout paint style;
	}

	.panel-header,
	.map-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}

	.panel-header {
		border-bottom: 1px solid var(--bsl-line);
		padding-bottom: 12px;
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0;
	}

	.panel-header span {
		color: var(--bsl-muted);
	}

	.court-card {
		position: relative;
		min-height: 336px;
		overflow: hidden;
		border: 1px solid var(--bsl-line);
		border-radius: 8px;
		background:
			linear-gradient(90deg, rgba(10, 14, 25, 0.035) 1px, transparent 1px) 0 0 / 44px 44px,
			color-mix(in srgb, var(--color-clear-pastel-blue) 14%, white);
	}

	.court-card::before {
		content: '';
		position: absolute;
		inset: 0;
		background:
			linear-gradient(90deg, rgba(10, 14, 25, 0.035) 1px, transparent 1px) 0 0 / 44px 44px,
			linear-gradient(0deg, rgba(10, 14, 25, 0.035) 1px, transparent 1px) 0 0 / 100% 28px;
	}

	.court-lines {
		position: absolute;
		inset: 22px;
		border: 2px solid rgba(10, 14, 25, 0.12);
		border-radius: 6px;
	}

	.court-half,
	.court-key,
	.court-arc,
	.court-dot {
		position: absolute;
		border-color: rgba(10, 14, 25, 0.12);
	}

	.court-half {
		left: 50%;
		top: 0;
		bottom: 0;
		border-left: 2px solid rgba(10, 14, 25, 0.12);
	}

	.court-key {
		left: 0;
		top: 31%;
		width: 31%;
		height: 38%;
		border: 2px solid rgba(10, 14, 25, 0.12);
		border-left: 0;
	}

	.court-arc {
		left: -17%;
		top: 23%;
		width: 43%;
		height: 54%;
		border: 2px solid rgba(10, 14, 25, 0.12);
		border-left: 0;
		border-radius: 0 999px 999px 0;
	}

	.court-dot {
		left: calc(50% - 6px);
		top: calc(50% - 6px);
		width: 12px;
		height: 12px;
		border-radius: 999px;
		background: rgba(10, 14, 25, 0.16);
		border: 0;
	}

	.court-readout {
		position: absolute;
		left: 18px;
		right: 18px;
		bottom: 18px;
		display: grid;
		gap: 8px;
		padding: 16px;
		background: rgba(10, 14, 25, 0.9);
		color: white;
		border-radius: 6px;
		backdrop-filter: blur(10px);
	}

	.court-readout span,
	.court-readout small,
	.signal span,
	.signal small,
	.report span,
	.map-node span {
		color: inherit;
		opacity: 0.74;
		font-size: 0.76rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0;
	}

	.court-readout strong {
		font-size: 1.2rem;
		line-height: 1.2;
	}

	.signal-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 8px;
	}

	.signal strong {
		font-size: clamp(1.35rem, 2.2vw, 2rem);
		line-height: 1;
	}

	.lab-grid {
		display: grid;
		grid-template-columns: 310px minmax(0, 1fr);
		gap: 18px;
		padding: 30px 0;
	}

	.policy-rail {
		padding: 18px;
		align-self: stretch;
	}

	.section-kicker {
		gap: 8px;
	}

	.policy-rail h2,
	.map-header h2,
	.report-intro h2 {
		margin-top: 14px;
		font-size: clamp(1.8rem, 3vw, 3rem);
		line-height: 1.04;
		font-weight: 700;
		letter-spacing: 0;
	}

	.policy-list {
		display: grid;
		gap: 10px;
		margin-top: 22px;
	}

	.policy-list button {
		width: 100%;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 6px 12px;
		border: 1px solid var(--bsl-line);
		border-radius: 6px;
		padding: 14px;
		background: white;
		color: var(--bsl-ink);
		text-align: left;
		cursor: pointer;
		transition:
			transform var(--motion-performance-snap) var(--ease-performance-press),
			border-color var(--motion-performance-snap) var(--ease-performance-snap),
			opacity var(--motion-performance-drive) var(--ease-performance-snap);
	}

	.policy-list button.active,
	.policy-list button:hover {
		border-color: var(--bsl-ink);
	}

	.policy-list button:hover {
		opacity: 0.86;
	}

	.policy-list button:active {
		opacity: 1;
		transform: scale(0.99);
	}

	.policy-list button:focus-visible {
		outline: 2px solid var(--bsl-ink);
		outline-offset: 3px;
	}

	.policy-list span,
	.policy-list small {
		color: var(--bsl-muted);
		font-size: 0.73rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0;
	}

	.policy-list strong {
		font-size: 1.02rem;
	}

	.policy-list small {
		justify-self: end;
		color: var(--bsl-green);
	}

	.systems-map {
		min-width: 0;
		padding: 18px;
		contain: layout paint style;
	}

	.map-header {
		margin-bottom: 14px;
	}

	.map-badge {
		gap: 8px;
		border: 1px solid var(--bsl-line);
		border-radius: 999px;
		padding: 8px 12px;
		background: white;
		color: var(--bsl-muted);
		font-size: 0.82rem;
		font-weight: 700;
		white-space: nowrap;
	}

	.map-stage {
		position: relative;
		min-height: 520px;
		overflow: hidden;
		border: 1px solid var(--bsl-line);
		border-radius: 8px;
	}

	.map-stage svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.court-boundary,
	.court-line {
		fill: none;
		stroke: #d9c9ad;
		stroke-width: 2;
	}

	.effect-edge {
		fill: none;
		stroke: var(--bsl-ink);
		stroke-width: 2.4;
		stroke-dasharray: 8 8;
		opacity: 0.72;
	}

	marker path {
		fill: var(--bsl-ink);
	}

	.map-node {
		position: absolute;
		left: var(--desktop-x);
		top: var(--desktop-y);
		width: clamp(140px, 18vw, 176px);
		display: grid;
		gap: 6px;
		transform: translate(-50%, -50%);
		border: 1px solid var(--bsl-ink);
		border-radius: 6px;
		padding: 12px;
		background: white;
		box-shadow: var(--shadow-clear-restraint);
	}

	.map-node strong {
		font-size: 1rem;
		line-height: 1.1;
	}

	.map-node[data-tone='green'] {
		border-color: var(--bsl-green);
	}

	.map-node[data-tone='blue'] {
		border-color: var(--bsl-blue);
	}

	.map-node[data-tone='orange'] {
		border-color: var(--bsl-orange);
	}

	.map-node[data-tone='red'] {
		border-color: var(--bsl-red);
	}

	.report-band {
		display: grid;
		grid-template-columns: 0.78fr 1.22fr;
		gap: 28px;
		padding: 52px 0 34px;
	}

	.report-intro p {
		margin-top: 16px;
		color: #44484f;
		font-size: 1.04rem;
		line-height: 1.6;
	}

	.report-grid {
		display: grid;
		gap: 12px;
	}

	.report {
		display: grid;
		gap: 10px;
		padding: 18px;
		contain: layout paint;
	}

	.report h3 {
		max-width: 48ch;
		font-size: 1.28rem;
		line-height: 1.18;
	}

	.report p {
		color: var(--bsl-muted);
		line-height: 1.55;
	}

	.discipline-strip {
		justify-content: space-between;
		gap: 10px;
		border-top: 1px solid var(--bsl-line);
		padding: 22px 0 44px;
	}

	.discipline-strip div,
	.discipline-strip a {
		gap: 8px;
		color: var(--bsl-muted);
		font-size: 0.82rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0;
	}

	.discipline-strip a {
		min-height: 38px;
		color: var(--bsl-ink);
		text-transform: none;
		letter-spacing: 0;
	}

	@media (max-width: 960px) {
		.bsl-hero,
		.lab-grid,
		.report-band {
			grid-template-columns: 1fr;
		}

		.bsl-hero {
			gap: 28px;
			padding-top: 38px;
		}

		h1 {
			max-width: 10ch;
		}

		.policy-rail {
			align-self: auto;
		}

		.map-stage {
			min-height: 470px;
		}

		.discipline-strip {
			flex-wrap: wrap;
			justify-content: flex-start;
		}
	}

	@media (max-width: 640px) {
		.signal-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.hero-actions {
			display: grid;
			grid-template-columns: 1fr;
		}

		.primary-action,
		.secondary-action {
			width: 100%;
		}

		.map-header,
		.panel-header {
			align-items: flex-start;
			flex-direction: column;
		}

		.map-node {
			left: var(--mobile-x);
			top: var(--mobile-y);
			width: 104px;
			padding: 10px;
			transform: none;
		}

		.map-node span {
			font-size: 0.62rem;
		}

		.map-node strong {
			font-size: 0.82rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.policy-list button {
			transition: none;
		}

		.policy-list button:hover,
		.policy-list button:active {
			transform: none;
		}
	}
</style>
