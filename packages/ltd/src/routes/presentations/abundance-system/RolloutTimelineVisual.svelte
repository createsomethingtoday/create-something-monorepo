<script lang="ts">
	const phases = [
		{
			label: 'Month 1',
			title: 'Validate the intake story',
			points: [
				'Test nurse-side messaging by specialty and market',
				'Confirm which missing facts are worth asking for early',
				'Measure click-to-apply and apply-to-conversation rates'
			]
		},
		{
			label: 'Month 2',
			title: 'Reallocate around nurse quality',
			points: [
				'Shift budget into the best nurse channels',
				'Tighten specialty, geography, and shift targeting',
				'Add retargeting for resume, consent, and recruiter follow-up'
			]
		},
		{
			label: 'Month 3',
			title: 'Scale the winning lanes',
			points: [
				'Expand the best specialty and geography combinations',
				'Improve apply-to-shortlist speed for recruiters',
				'Cut low-signal channels instead of broadening too early'
			]
		}
	];
</script>

<div class="timeline-visual">
	<div class="timeline-line" aria-hidden="true"></div>

	<div class="phase-grid">
		{#each phases as phase}
			<article class="phase-card">
				<span class="phase-tag">{phase.label}</span>
				<h3>{phase.title}</h3>
				<ul>
					{#each phase.points as point}
						<li>{point}</li>
					{/each}
				</ul>
			</article>
		{/each}
	</div>
</div>

<style>
	.timeline-visual {
		position: relative;
		width: 100%;
		padding-top: var(--space-performance-xs);
	}

	.timeline-line {
		position: absolute;
		top: 1rem;
		left: 12%;
		right: 12%;
		height: 2px;
		background: linear-gradient(90deg, rgba(37, 99, 235, 0.4), rgba(16, 185, 129, 0.5));
	}

	.phase-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--space-performance-lg);
	}

	.phase-card {
		position: relative;
		padding: var(--space-performance-lg);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-performance-scale-lg);
		background: var(--color-performance-bg-surface);
	}

	.phase-card::before {
		content: '';
		position: absolute;
		top: -0.9rem;
		left: var(--space-performance-lg);
		width: 0.9rem;
		height: 0.9rem;
		border-radius: 999px;
		background: #2563eb;
		box-shadow: 0 0 0 0.35rem rgba(37, 99, 235, 0.12);
	}

	.phase-tag {
		display: inline-flex;
		margin-bottom: var(--space-performance-sm);
		padding: 0.35rem 0.6rem;
		border-radius: 999px;
		background: rgba(37, 99, 235, 0.08);
		color: #1d4ed8;
		font-size: var(--text-performance-caption);
		font-family: var(--font-performance-mono);
	}

	h3 {
		margin: 0 0 var(--space-performance-sm);
		font-size: var(--text-performance-h4);
		color: var(--color-performance-fg-primary);
	}

	ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	li {
		position: relative;
		padding-left: 0.9rem;
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
		line-height: 1.5;
	}

	li::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0.55rem;
		width: 0.35rem;
		height: 0.35rem;
		border-radius: 999px;
		background: rgba(16, 185, 129, 0.85);
	}

	@media (max-width: 768px) {
		.timeline-line {
			display: none;
		}

		.phase-grid {
			grid-template-columns: 1fr;
			gap: var(--space-performance-md);
		}

		.phase-card::before {
			top: auto;
			bottom: calc(100% + 0.35rem);
		}
	}
</style>
