<script lang="ts">
	interface Candidate {
		name: string;
		role: string;
		location: string;
		total: number;
		specialty: number;
		pay: number;
		availability: number;
		note: string;
	}

	const weights = [
		{ label: 'Specialty + credentials', weight: 40 },
		{ label: 'Pay fit', weight: 30 },
		{ label: 'Start / shift availability', weight: 30 }
	];

	const candidates: Candidate[] = [
		{
			name: 'Carmen D.',
			role: 'ICU traveler',
			location: 'Austin, TX',
			total: 91,
			specialty: 37,
			pay: 25,
			availability: 29,
			note: 'Strong clinical fit, nights available, April start aligned.'
		},
		{
			name: 'Maya R.',
			role: 'ICU + stepdown',
			location: 'San Marcos, TX',
			total: 84,
			specialty: 34,
			pay: 24,
			availability: 26,
			note: 'Good fallback option with broader flexibility but slightly weaker timing.'
		},
		{
			name: 'Avery L.',
			role: 'ICU traveler',
			location: 'Temple, TX',
			total: 76,
			specialty: 31,
			pay: 23,
			availability: 22,
			note: 'Profile is promising, but start date is less clean and distance is wider.'
		}
	];
</script>

<div class="matching-visual">
	<section class="weight-card">
		<p class="eyebrow">Explainable score</p>
		<h3>Fit stays legible</h3>

		<div class="weight-list">
			{#each weights as weight}
				<div class="weight-row">
					<div class="weight-copy">
						<span>{weight.label}</span>
						<strong>{weight.weight}%</strong>
					</div>
					<div class="weight-rail">
						<div class="weight-fill" style={`width: ${weight.weight}%`}></div>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<section class="shortlist-card">
		<p class="eyebrow">Shortlist output</p>
		<h3>Top candidates with reasons</h3>

		<div class="candidate-list">
			{#each candidates as candidate}
				<article class="candidate">
					<div class="candidate-header">
						<div>
							<h4>{candidate.name}</h4>
							<p>{candidate.role} · {candidate.location}</p>
						</div>
						<span class="score">{candidate.total}</span>
					</div>

					<div class="segments" aria-label={`Breakdown for ${candidate.name}`}>
						<div class="segment specialty" style={`width: ${candidate.specialty}%`}></div>
						<div class="segment pay" style={`width: ${candidate.pay}%`}></div>
						<div class="segment availability" style={`width: ${candidate.availability}%`}></div>
					</div>

					<div class="legend">
						<span><i class="swatch specialty"></i>{candidate.specialty} specialty</span>
						<span><i class="swatch pay"></i>{candidate.pay} pay</span>
						<span><i class="swatch availability"></i>{candidate.availability} timing</span>
					</div>

					<p class="note">{candidate.note}</p>
				</article>
			{/each}
		</div>
	</section>
</div>

<style>
	.matching-visual {
		width: 100%;
		display: grid;
		grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
		gap: var(--space-performance-lg);
	}

	.weight-card,
	.shortlist-card,
	.candidate {
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-performance-scale-lg);
		background: var(--color-performance-bg-surface);
	}

	.weight-card,
	.shortlist-card {
		padding: var(--space-performance-lg);
	}

	.eyebrow {
		margin: 0 0 0.4rem;
		font-size: var(--text-performance-caption);
		letter-spacing: var(--tracking-performance-widest);
		text-transform: uppercase;
		color: var(--color-performance-fg-muted);
	}

	h3,
	h4 {
		margin: 0;
		color: var(--color-performance-fg-primary);
	}

	h3 {
		font-size: var(--text-performance-h3);
	}

	.weight-list,
	.candidate-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-md);
		margin-top: var(--space-performance-md);
	}

	.weight-row {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.weight-copy {
		display: flex;
		justify-content: space-between;
		gap: var(--space-performance-md);
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
	}

	.weight-copy strong {
		font-family: var(--font-performance-mono);
		color: var(--color-performance-fg-primary);
	}

	.weight-rail,
	.segments {
		height: 0.7rem;
		border-radius: 999px;
		background: rgba(15, 23, 42, 0.08);
		overflow: hidden;
		display: flex;
	}

	.weight-fill {
		border-radius: 999px;
		background: linear-gradient(90deg, rgba(37, 99, 235, 0.55), rgba(37, 99, 235, 0.9));
	}

	.candidate {
		padding: var(--space-performance-md);
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-sm);
	}

	.candidate-header {
		display: flex;
		justify-content: space-between;
		gap: var(--space-performance-md);
		align-items: flex-start;
	}

	.candidate-header p {
		margin: 0.35rem 0 0;
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
	}

	.score {
		padding: 0.35rem 0.6rem;
		border-radius: 999px;
		background: rgba(37, 99, 235, 0.1);
		color: #1d4ed8;
		font-family: var(--font-performance-mono);
		font-size: var(--text-performance-caption);
	}

	.segment.specialty,
	.swatch.specialty {
		background: #2563eb;
	}

	.segment.pay,
	.swatch.pay {
		background: #f59e0b;
	}

	.segment.availability,
	.swatch.availability {
		background: #10b981;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
	}

	.legend span {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	.swatch {
		display: inline-block;
		width: 0.6rem;
		height: 0.6rem;
		border-radius: 999px;
	}

	.note {
		margin: 0;
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
		line-height: var(--leading-performance-relaxed);
	}

	@media (max-width: 768px) {
		.matching-visual {
			grid-template-columns: 1fr;
		}
	}
</style>
