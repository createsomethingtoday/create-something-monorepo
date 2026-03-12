<script lang="ts">
	const scenarios = [
		{
			label: 'Minimum viable test',
			total: '$8k-$12k / month',
			nurse: 65,
			facility: 35
		},
		{
			label: 'Better signal range',
			total: '$12k-$20k / month',
			nurse: 65,
			facility: 35
		}
	];

	const nurseBenchmarks = ['Indeed / job media: lower-cost clicks', 'Healthcare applies: about $35 average', 'Harder-to-fill roles: $58+ applies'];
	const facilityBenchmarks = ['LinkedIn B2B lead gen: about $75-$200+ CPL', 'Search is useful for staffing-intent terms', 'Demand side is more inferred than nurse side'];
</script>

<div class="budget-visual">
	<section class="scenario-list">
		{#each scenarios as scenario}
			<article class="scenario-card">
				<p class="eyebrow">{scenario.label}</p>
				<h3>{scenario.total}</h3>

				<div class="split-bar" aria-label={`${scenario.label} budget split`}>
					<div class="bar nurse" style={`width: ${scenario.nurse}%`}>
						<span>{scenario.nurse}% nurse side</span>
					</div>
					<div class="bar facility" style={`width: ${scenario.facility}%`}>
						<span>{scenario.facility}% facility side</span>
					</div>
				</div>
			</article>
		{/each}
	</section>

	<section class="benchmark-card">
		<p class="eyebrow">Directional benchmarks</p>
		<h3>Why the split starts nurse-heavy</h3>

		<div class="benchmark-columns">
			<div>
				<p class="column-title">Nurse acquisition</p>
				<ul>
					{#each nurseBenchmarks as item}
						<li>{item}</li>
					{/each}
				</ul>
			</div>

			<div>
				<p class="column-title">Facility demand</p>
				<ul>
					{#each facilityBenchmarks as item}
						<li>{item}</li>
					{/each}
				</ul>
			</div>
		</div>
	</section>
</div>

<style>
	.budget-visual {
		width: 100%;
		display: grid;
		grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
		gap: var(--space-lg);
	}

	.scenario-list,
	.benchmark-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.scenario-card,
	.benchmark-card {
		padding: var(--space-lg);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-lg);
		background: var(--color-bg-surface);
	}

	.eyebrow {
		margin: 0 0 0.4rem;
		font-size: var(--text-caption);
		letter-spacing: var(--tracking-widest);
		text-transform: uppercase;
		color: var(--color-fg-muted);
	}

	h3,
	.column-title {
		margin: 0;
		color: var(--color-fg-primary);
	}

	h3 {
		font-size: var(--text-h3);
	}

	.split-bar {
		margin-top: var(--space-md);
		height: 2.9rem;
		display: flex;
		border-radius: 999px;
		overflow: hidden;
		background: rgba(15, 23, 42, 0.06);
	}

	.bar {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 var(--space-sm);
		font-size: var(--text-caption);
		font-family: var(--font-mono);
	}

	.bar.nurse {
		background: rgba(37, 99, 235, 0.88);
		color: white;
	}

	.bar.facility {
		background: rgba(245, 158, 11, 0.85);
		color: #111827;
	}

	.benchmark-columns {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-lg);
	}

	.column-title {
		font-size: var(--text-body);
		margin-bottom: var(--space-sm);
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
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
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
		.budget-visual,
		.benchmark-columns {
			grid-template-columns: 1fr;
		}

		.bar span {
			font-size: 0.7rem;
		}
	}
</style>
