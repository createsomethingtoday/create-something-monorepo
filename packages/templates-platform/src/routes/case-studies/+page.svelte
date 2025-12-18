<!--
  Case Studies

  Showcase successful template deployments.
  Each case study demonstrates the template → .agency pipeline.

  Heideggerian: Stories that reveal possibility.
-->
<script lang="ts">
	// In production, these would come from a database or CMS
	const caseStudies = [
		{
			id: 'meridian-law',
			title: 'Meridian Law Group',
			industry: 'Legal Services',
			template: 'professional-services',
			description: 'A boutique law firm that increased consultation bookings by 45% after deploying our Professional Services template.',
			metrics: {
				bookingsIncrease: '+45%',
				noShowReduction: '-30%',
				responseTime: '< 2 hours'
			},
			testimonial: {
				quote: 'The automated follow-ups alone have saved us 10+ hours per week.',
				author: 'Sarah Chen',
				title: 'Managing Partner'
			},
			image: null, // Placeholder
			featured: true
		},
		{
			id: 'greenfield-accounting',
			title: 'Greenfield Accounting',
			industry: 'Accounting',
			template: 'professional-services',
			description: 'A CPA firm that streamlined their tax season intake process, handling 2x more clients with the same staff.',
			metrics: {
				clientCapacity: '+100%',
				intakeTime: '-60%',
				clientSatisfaction: '4.9/5'
			},
			testimonial: {
				quote: 'Tax season used to mean chaos. Now our clients book themselves and get automatic reminders.',
				author: 'Michael Torres',
				title: 'Founder'
			},
			image: null,
			featured: false
		}
	];

	const featured = caseStudies.find(c => c.featured);
	const others = caseStudies.filter(c => !c.featured);
</script>

<svelte:head>
	<title>Case Studies | CREATE SOMETHING Templates</title>
	<meta name="description" content="See how professionals are using our templates to grow their practices." />
</svelte:head>

<div class="case-studies-page">
	<header class="page-header">
		<h1>Case Studies</h1>
		<p>Real results from real deployments</p>
	</header>

	{#if featured}
		<section class="featured-case">
			<div class="featured-content">
				<span class="case-badge">Featured</span>
				<h2>{featured.title}</h2>
				<p class="case-industry">{featured.industry}</p>
				<p class="case-description">{featured.description}</p>

				<div class="metrics-row">
					{#each Object.entries(featured.metrics) as [key, value]}
						<div class="metric">
							<span class="metric-value">{value}</span>
							<span class="metric-label">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
						</div>
					{/each}
				</div>

				<blockquote class="testimonial">
					<p>"{featured.testimonial.quote}"</p>
					<cite>— {featured.testimonial.author}, {featured.testimonial.title}</cite>
				</blockquote>

				<a href="/case-studies/{featured.id}" class="btn btn-primary">Read Full Case Study</a>
			</div>
			<div class="featured-image">
				{#if featured.image}
					<img src={featured.image} alt={featured.title} />
				{:else}
					<div class="image-placeholder">
						<span>{featured.title.charAt(0)}</span>
					</div>
				{/if}
			</div>
		</section>
	{/if}

	<section class="case-grid-section">
		<h2>More Success Stories</h2>
		<div class="case-grid">
			{#each others as study}
				<article class="case-card">
					<div class="case-card-image">
						{#if study.image}
							<img src={study.image} alt={study.title} />
						{:else}
							<div class="image-placeholder small">
								<span>{study.title.charAt(0)}</span>
							</div>
						{/if}
					</div>
					<div class="case-card-content">
						<span class="case-industry-tag">{study.industry}</span>
						<h3>{study.title}</h3>
						<p>{study.description}</p>
						<div class="metrics-row compact">
							{#each Object.entries(study.metrics).slice(0, 2) as [key, value]}
								<div class="metric">
									<span class="metric-value">{value}</span>
									<span class="metric-label">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
								</div>
							{/each}
						</div>
						<a href="/case-studies/{study.id}" class="case-link" aria-label="Read more about {study.title}">Read more <span aria-hidden="true">→</span></a>
					</div>
				</article>
			{/each}
		</div>
	</section>

	<section class="cta-section">
		<div class="cta-content">
			<h2>Ready to be our next success story?</h2>
			<p>Deploy your template in 30 seconds and start seeing results.</p>
			<div class="cta-actions">
				<a href="/#templates" class="btn btn-primary btn-lg">Browse Templates</a>
				<a href="https://createsomething.agency/contact" class="btn btn-secondary btn-lg">Talk to .agency</a>
			</div>
		</div>
	</section>
</div>

<style>
	.case-studies-page {
		min-height: 100vh;
	}

	.page-header {
		text-align: center;
		padding: var(--space-2xl) var(--gutter);
		border-bottom: 1px solid var(--color-border-default);
	}

	.page-header h1 {
		font-size: var(--text-display);
		margin: 0 0 var(--space-sm);
	}

	.page-header p {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	/* Featured Case */
	.featured-case {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-xl);
		max-width: var(--content-width);
		margin: 0 auto;
		padding: var(--space-2xl) var(--gutter);
	}

	.featured-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.case-badge {
		display: inline-block;
		padding: 4px 12px;
		font-size: var(--text-caption);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-primary);
		background: rgba(96, 165, 250, 0.1);
		border-radius: var(--radius-full);
		width: fit-content;
	}

	.featured-content h2 {
		font-size: var(--text-h1);
		margin: 0;
	}

	.case-industry {
		font-size: var(--text-body);
		color: var(--color-fg-muted);
		margin: 0;
	}

	.case-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	.metrics-row {
		display: flex;
		gap: var(--space-lg);
	}

	.metrics-row.compact {
		gap: var(--space-md);
	}

	.metric {
		text-align: center;
	}

	.metric-value {
		display: block;
		font-size: var(--text-h2);
		font-weight: 700;
		color: var(--color-success);
	}

	.compact .metric-value {
		font-size: var(--text-h3);
	}

	.metric-label {
		display: block;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: capitalize;
	}

	.testimonial {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border-left: 3px solid var(--color-fg-muted);
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
		margin: 0;
	}

	.testimonial p {
		font-size: var(--text-body-lg);
		font-style: italic;
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-sm);
	}

	.testimonial cite {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		font-style: normal;
	}

	.featured-image {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.image-placeholder {
		width: 100%;
		max-width: 400px;
		aspect-ratio: 4/3;
		background: linear-gradient(135deg, var(--color-bg-subtle), var(--color-bg-surface));
		border-radius: var(--radius-lg);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.image-placeholder span {
		font-size: 4rem;
		font-weight: 700;
		color: var(--color-fg-subtle);
	}

	.image-placeholder.small {
		aspect-ratio: 16/9;
	}

	.image-placeholder.small span {
		font-size: 2rem;
	}

	/* Case Grid */
	.case-grid-section {
		padding: var(--space-2xl) var(--gutter);
		background: var(--color-bg-surface);
	}

	.case-grid-section h2 {
		text-align: center;
		font-size: var(--text-h2);
		margin: 0 0 var(--space-xl);
	}

	.case-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
		gap: var(--space-lg);
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.case-card {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
		transition: transform var(--duration-micro) var(--ease-standard),
			box-shadow var(--duration-micro) var(--ease-standard);
	}

	.case-card:hover {
		transform: translateY(-4px);
		box-shadow: var(--shadow-lg);
	}

	.case-card-image {
		aspect-ratio: 16/9;
		overflow: hidden;
	}

	.case-card-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.case-card-content {
		padding: var(--space-lg);
	}

	.case-industry-tag {
		display: inline-block;
		padding: 2px 8px;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
		margin-bottom: var(--space-sm);
	}

	.case-card h3 {
		font-size: var(--text-h3);
		margin: 0 0 var(--space-sm);
	}

	.case-card p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-md);
	}

	.case-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		font-weight: 500;
	}

	/* CTA */
	.cta-section {
		padding: var(--space-2xl) var(--gutter);
		text-align: center;
	}

	.cta-content {
		max-width: var(--content-narrow);
		margin: 0 auto;
	}

	.cta-content h2 {
		font-size: var(--text-h1);
		margin: 0 0 var(--space-sm);
	}

	.cta-content p {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-lg);
	}

	.cta-actions {
		display: flex;
		justify-content: center;
		gap: var(--space-sm);
	}

	@media (max-width: 768px) {
		.featured-case {
			grid-template-columns: 1fr;
		}

		.featured-image {
			order: -1;
		}

		.metrics-row {
			flex-wrap: wrap;
		}

		.cta-actions {
			flex-direction: column;
		}
	}
</style>
