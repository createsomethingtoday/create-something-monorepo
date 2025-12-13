<script lang="ts">
	import SEO from '$lib/components/SEO.svelte';
	import type { PageData } from './$types';
	import { services, getServiceSchemaData } from '$lib/data/services';

	let { data }: { data: PageData } = $props();

	// Context from assessment (if user came from assessment flow)
	const hasAssessmentContext = $derived(!!data.recommendedService || !!data.assessmentId);
	const recommendedService = $derived(data.recommendedService);

	// Service schema data for SEO
	const serviceSchemaData = getServiceSchemaData();

	// Display services with recommended first if applicable
	let displayServices = $derived.by(() => {
		if (!recommendedService) return services;

		const targetIndex = services.findIndex((s) => s.id === recommendedService);
		if (targetIndex === -1) return services;

		// Move recommended to front
		const reordered = [...services];
		const [target] = reordered.splice(targetIndex, 1);
		return [target, ...reordered];
	});

	// Triad level display names
	const triadLevelNames: Record<string, string> = {
		implementation: 'implementation level',
		artifact: 'artifact level',
		system: 'system level'
	};
</script>

<SEO
	title="Services"
	description="We remove what obscures your business. AI automation, agentic systems, and transformation consulting—each service applies the Subtractive Triad."
	keywords="agentic systems, AI automation, autonomous systems, web development, transformation consulting, strategic advisory"
	ogImage="/og-image.svg"
	propertyName="agency"
	services={serviceSchemaData}
/>

<!-- Hero Section -->
<section class="hero-section">
	<div class="max-w-4xl mx-auto px-6 text-center">
		{#if hasAssessmentContext && recommendedService}
			{@const recommended = services.find((s) => s.id === recommendedService)}
			<p class="eyebrow">Based on your assessment</p>
			<h1 class="hero-title">Here's where we'd start.</h1>
			<p class="hero-subtitle">
				{#if data.triadLevel}
					You identified accumulation at the {triadLevelNames[data.triadLevel] || data.triadLevel}.
				{/if}
				We recommend <strong>{recommended?.title || 'exploring your options'}</strong> as your entry
				point.
			</p>
		{:else}
			<p class="eyebrow">Weniger, aber besser</p>
			<h1 class="hero-title">Ship faster. Eliminate manual work.</h1>
			<p class="hero-subtitle">
				Every service applies the same discipline: identify what's accumulating, question whether it
				earns its existence, and remove what doesn't serve the whole.
			</p>
		{/if}
	</div>
</section>

<!-- Services Section -->
<section class="services-section">
	<div class="max-w-5xl mx-auto px-6">
		<div class="services-grid">
			{#each displayServices as service, index}
				{@const isRecommended = recommendedService === service.id}
				<a
					href="/services/{service.id}"
					class="service-card animate-reveal"
					class:recommended={isRecommended}
					style="--delay: {index}"
				>
					{#if isRecommended}
						<div class="recommended-badge">Recommended for you</div>
					{/if}

					<!-- Header -->
					<div class="service-header">
						<div class="service-icon">
							{#if service.icon === 'globe'}
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
									/>
								</svg>
							{:else if service.icon === 'automation'}
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M13 10V3L4 14h7v7l9-11h-7z"
									/>
								</svg>
							{:else if service.icon === 'robot'}
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
									/>
								</svg>
							{:else if service.icon === 'partnership'}
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
									/>
								</svg>
							{:else if service.icon === 'academy'}
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
									/>
								</svg>
							{:else if service.icon === 'advisor'}
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
									/>
								</svg>
							{/if}
						</div>
						<div class="service-title-block">
							<h2 class="service-title">{service.title}</h2>
							<p class="service-triad">
								<span class="triad-action">{service.triadAction}</span>
								<span class="triad-question">{service.triadQuestion}</span>
							</p>
						</div>
					</div>

					<!-- What This Removes -->
					<div class="service-section">
						<h3 class="section-label">What this removes</h3>
						<ul class="removal-list">
							{#each service.whatThisRemoves as item}
								<li>{item}</li>
							{/each}
						</ul>
					</div>

					<!-- Footer Preview -->
					<div class="service-footer">
						<div class="pricing-row">
							<span class="pricing">{service.pricing}</span>
							<span class="timeline">{service.timeline}</span>
						</div>
						<span class="view-details">
							View details
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
							</svg>
						</span>
					</div>
				</a>
			{/each}
		</div>
	</div>
</section>

<!-- Pricing Philosophy -->
<section class="pricing-section">
	<div class="max-w-3xl mx-auto px-6 text-center">
		<div class="pricing-qualifier">
			<h3 class="qualifier-title">On pricing</h3>
			<p class="qualifier-text">
				Engagements typically range from $5,000 to $50,000+ depending on scope and complexity. We'd
				rather understand your situation before discussing numbers.
			</p>
			<p class="qualifier-note">
				The first conversation is always free. We'll tell you honestly if we're the right fit.
			</p>
		</div>
	</div>
</section>

<style>
	/* Hero Section */
	.hero-section {
		padding: var(--space-2xl) 0;
		min-height: 40vh;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.eyebrow {
		font-size: var(--text-body-sm);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
		font-style: italic;
		margin-bottom: var(--space-sm);
	}

	.hero-title {
		font-size: var(--text-display);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		line-height: var(--leading-tight);
		margin-bottom: var(--space-md);
	}

	.hero-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-tertiary);
		line-height: 1.7;
		max-width: 42rem;
		margin: 0 auto;
	}

	.hero-subtitle strong {
		color: var(--color-fg-primary);
	}

	/* Services Section */
	.services-section {
		padding: var(--space-xl) 0 var(--space-2xl);
		border-top: 1px solid var(--color-border-default);
	}

	.services-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
		gap: var(--space-lg);
	}

	/* Service Card - now a link */
	.service-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		position: relative;
		transition:
			border-color var(--duration-standard) var(--ease-standard),
			background var(--duration-standard) var(--ease-standard);
	}

	.service-card:hover {
		border-color: var(--color-border-emphasis);
		background: var(--color-bg-elevated);
	}

	.service-card.recommended {
		border-color: var(--color-border-strong);
		background: var(--color-bg-elevated);
	}

	.recommended-badge {
		position: absolute;
		top: calc(-1 * var(--space-xs));
		left: var(--space-md);
		padding: 0.25rem 0.75rem;
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
		border-radius: var(--radius-sm);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* Service Header */
	.service-header {
		display: flex;
		gap: var(--space-md);
		align-items: flex-start;
	}

	.service-icon {
		width: 3rem;
		height: 3rem;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
	}

	.service-icon svg {
		width: 1.5rem;
		height: 1.5rem;
		color: var(--color-fg-secondary);
	}

	.service-title-block {
		flex: 1;
	}

	.service-title {
		font-size: var(--text-h3);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: 0.25rem;
	}

	.service-triad {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		flex-wrap: wrap;
	}

	.triad-action {
		font-family: monospace;
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-fg-secondary);
	}

	.triad-question {
		font-size: var(--text-body-sm);
		font-style: italic;
		color: var(--color-fg-muted);
	}

	/* Service Sections */
	.service-section {
		padding-top: var(--space-sm);
	}

	.section-label {
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-xs);
	}

	.removal-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.removal-list li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		padding-left: 1rem;
		position: relative;
	}

	.removal-list li::before {
		content: '−';
		position: absolute;
		left: 0;
		color: var(--color-fg-muted);
	}

	/* Service Footer */
	.service-footer {
		margin-top: auto;
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border-default);
	}

	.pricing-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-sm);
	}

	.pricing {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.timeline {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.view-details {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-xs);
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-fg-secondary);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-full);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.service-card:hover .view-details {
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	.view-details svg {
		width: 1rem;
		height: 1rem;
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.service-card:hover .view-details svg {
		transform: translateX(4px);
	}

	/* Pricing Section */
	.pricing-section {
		padding: var(--space-xl) 0 var(--space-2xl);
	}

	.pricing-qualifier {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.qualifier-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.qualifier-text {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-sm);
	}

	.qualifier-note {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.hero-title {
			font-size: var(--text-h1);
		}

		.services-grid {
			grid-template-columns: 1fr;
		}

		.service-header {
			flex-direction: column;
			gap: var(--space-sm);
		}
	}

	/* Animation */
	.animate-reveal {
		opacity: 0;
		transform: translateY(20px);
		animation: reveal 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
		animation-delay: calc(var(--delay, 0) * 80ms);
	}

	@keyframes reveal {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.animate-reveal {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
