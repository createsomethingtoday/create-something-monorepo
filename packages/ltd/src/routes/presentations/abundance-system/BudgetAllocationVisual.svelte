<script lang="ts">
	const scenarios = [
		{
			label: 'Focused working range',
			total: '$6k-$12k / month',
			note: 'Enough to test one market or specialty with recruiter feedback in the loop.'
		},
		{
			label: 'Broader signal range',
			total: '$12k-$20k / month',
			note: 'Enough to compare creative, geography, and specialty lanes without guessing from one campaign.'
		}
	];

	const nurseBenchmarks = [
		'Indeed and recruitment media: lower-cost healthcare clicks',
		'Healthcare completed applies: about $35 average',
		'Harder-to-fill roles: $58+ completed applies'
	];

	const channelMix = [
		'40-50% job media for active nurse demand capture',
		'15-20% search for specialty and location intent',
		'15-20% Meta retargeting for resume and consent completion',
		'5-10% LinkedIn for specialized or senior clinical roles'
	];
</script>

<div class="budget-visual">
	<section class="scenario-list">
		{#each scenarios as scenario}
			<article class="scenario-card">
				<p class="eyebrow">{scenario.label}</p>
				<h3>{scenario.total}</h3>
				<p class="scenario-note">{scenario.note}</p>
				<span class="scope-pill">Nurse acquisition only</span>
			</article>
		{/each}
	</section>

	<section class="benchmark-card">
		<p class="eyebrow">Scope</p>
		<h3>Demand already exists</h3>
		<p class="scope-copy">
			The paid question is how to acquire more nurses, not how to create facility demand.
		</p>

		<div class="benchmark-block">
			<p class="column-title">Directional benchmarks</p>
			<ul>
				{#each nurseBenchmarks as item}
					<li>{item}</li>
				{/each}
			</ul>
		</div>

		<div class="benchmark-block">
			<p class="column-title">Recommended channel mix</p>
			<ul>
				{#each channelMix as item}
					<li>{item}</li>
				{/each}
			</ul>
		</div>
	</section>
</div>

<style>
	.budget-visual {
		width: 100%;
		display: grid;
		grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
		gap: var(--space-performance-lg);
	}

	.scenario-list,
	.benchmark-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-md);
	}

	.scenario-card,
	.benchmark-card {
		padding: var(--space-performance-lg);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-performance-scale-lg);
		background: var(--color-performance-bg-surface);
	}

	.eyebrow {
		margin: 0 0 0.4rem;
		font-size: var(--text-performance-caption);
		letter-spacing: var(--tracking-performance-widest);
		text-transform: uppercase;
		color: var(--color-performance-fg-muted);
	}

	h3,
	.column-title {
		margin: 0;
		color: var(--color-performance-fg-primary);
	}

	h3 {
		font-size: var(--text-performance-h3);
	}

	.scenario-note,
	.scope-copy {
		margin: var(--space-performance-sm) 0 0;
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
		line-height: 1.5;
	}

	.scope-pill {
		display: inline-flex;
		align-self: flex-start;
		margin-top: var(--space-performance-md);
		padding: 0.4rem 0.7rem;
		border-radius: 999px;
		background: rgba(37, 99, 235, 0.08);
		color: #1d4ed8;
		font-size: var(--text-performance-caption);
		font-family: var(--font-performance-mono);
	}

	.column-title {
		font-size: var(--text-performance-body);
		margin-bottom: var(--space-performance-sm);
	}

	.benchmark-block + .benchmark-block {
		margin-top: var(--space-performance-lg);
	}

	.benchmark-card ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}

	.benchmark-card li {
		position: relative;
		padding-left: 0.9rem;
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
		line-height: 1.45;
	}

	.benchmark-card li::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0.5rem;
		width: 0.35rem;
		height: 0.35rem;
		border-radius: 999px;
		background: rgba(37, 99, 235, 0.8);
	}

	@media (max-width: 768px) {
		.budget-visual {
			grid-template-columns: 1fr;
		}
	}
</style>
