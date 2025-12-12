<script lang="ts">
	import SEO from '$lib/components/SEO.svelte';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	// Footer is provided by layout

	let { data }: { data: PageData } = $props();

	// Context from assessment
	const hasAssessmentContext = $derived(!!data.recommendedService || !!data.assessmentId);
	const recommendedService = $derived(data.recommendedService);

	const services = [
		{
			id: 'web-development',
			title: 'Web Development',
			triadQuestion: '"Have I built this before?"',
			triadAction: 'Unify',
			triadLevel: 'implementation',

			whatThisRemoves: [
				'Scattered website code across multiple platforms',
				'Manual deployment overhead and version conflicts',
				'Reinventing patterns that already exist'
			],

			howItWorks: [
				'CREATE SOMETHING component library (battle-tested)',
				'Type-safe TypeScript throughout',
				'Cloudflare Pages deployment (global edge)',
				'Automation opportunity assessment included'
			],

			proof: {
				caseStudy: '/work/arc-for-gmail',
				name: 'Arc for Gmail',
				headline: 'Concept to production in 4 days',
				stats: ['Multi-user OAuth', '100% automated', '5-min sync cycle']
			},

			pricing: '$5,000+',
			timeline: '2-4 weeks',
			icon: 'globe'
		},
		{
			id: 'automation',
			title: 'AI Automation Systems',
			triadQuestion: '"Does this earn its existence?"',
			triadAction: 'Remove',
			triadLevel: 'artifact',

			whatThisRemoves: [
				'Manual tasks consuming creative bandwidth',
				'Human bottlenecks in data transfer between systems',
				'Decision fatigue from context-switching between tools'
			],

			howItWorks: [
				'Claude Code for intelligent automation design',
				'Cloudflare Workers for serverless execution',
				'OAuth integrations for multi-user access',
				'Tracked metrics (time saved, cost, errors)'
			],

			proof: {
				caseStudy: '/work/viralytics',
				name: 'Viralytics',
				headline: '120 hours/week of research → automated daily',
				stats: ['4+ chart sources', 'Daily automation', '20 signal queries']
			},

			pricing: '$15,000+',
			timeline: '4-8 weeks',
			icon: 'automation'
		},
		{
			id: 'agentic-systems',
			title: 'Agentic Systems Engineering',
			triadQuestion: '"Does this serve the whole?"',
			triadAction: 'Reconnect',
			triadLevel: 'system',

			whatThisRemoves: [
				'Disconnected systems that don\'t talk to each other',
				'Decision paralysis from incomplete information',
				'Human coordination overhead across workflows'
			],

			howItWorks: [
				'Long-running workflows (hours to days)',
				'Cloudflare Workflows for durable execution',
				'Claude Code for intelligent decision-making',
				'Production monitoring and cost control'
			],

			proof: {
				caseStudy: '/work/kickstand',
				name: 'Kickstand',
				headline: '155 scripts → 13 (92% reduction)',
				stats: ['Health 6.2 → 9.2', '0 TypeScript errors', '92% cost reduction']
			},

			pricing: '$35,000+',
			timeline: '8-16 weeks',
			icon: 'robot'
		},
		{
			id: 'partnership',
			title: 'Ongoing Systems Partnership',
			triadQuestion: '"Does this serve the whole?"',
			triadAction: 'Reconnect',
			triadLevel: 'system',

			whatThisRemoves: [
				'Accumulating technical debt in production systems',
				'Reactive firefighting instead of proactive optimization',
				'Missed opportunities for automation in daily operations'
			],

			howItWorks: [
				'System maintenance and monitoring',
				'Performance optimization (speed + cost)',
				'New automation development (2-4 features/month)',
				'Research collaboration (your systems → .io papers)'
			],

			proof: {
				caseStudy: '/work/kickstand',
				name: 'Kickstand',
				headline: 'Bugs become sustainability experiments',
				stats: ['Monthly reports', 'Quarterly experiments', '4-hour response']
			},

			pricing: '$5,000/month',
			timeline: 'Ongoing',
			icon: 'partnership'
		},
		{
			id: 'transformation',
			title: 'AI-Native Transformation',
			triadQuestion: '"Does this serve the whole?"',
			triadAction: 'Reconnect',
			triadLevel: 'system',

			whatThisRemoves: [
				'Organizational resistance to AI adoption',
				'Knowledge silos between teams',
				'Dependency on external vendors for AI capability'
			],

			howItWorks: [
				'Current state assessment and workflow audit',
				'Hands-on Claude Code training for your team',
				'Guided first automation project',
				'Internal playbook development'
			],

			proof: {
				caseStudy: '/work/kickstand',
				name: 'Kickstand',
				headline: 'Team capability → internal AI infrastructure',
				stats: ['90-day roadmap', 'Certified team', 'Internal playbook']
			},

			pricing: '$50,000+',
			timeline: '12-16 weeks',
			icon: 'academy'
		},
		{
			id: 'advisory',
			title: 'Strategic Advisory',
			triadQuestion: '"Does this serve the whole?"',
			triadAction: 'Reconnect',
			triadLevel: 'system',

			whatThisRemoves: [
				'Uncertainty about AI infrastructure direction',
				'Misaligned investments in disconnected tools',
				'Strategic blind spots in AI maturity'
			],

			howItWorks: [
				'Quarterly strategic planning sessions',
				'Architecture review of your systems',
				'Performance optimization guidance',
				'Pre-publication access to .io research'
			],

			proof: {
				caseStudy: '/work/kickstand',
				name: 'Kickstand',
				headline: 'Philosophy eliminates decision paralysis',
				stats: ['Quarterly reports', 'Monthly office hours', 'Priority support']
			},

			pricing: '$10,000/month',
			timeline: '6-month minimum',
			icon: 'advisor'
		}
	];

	// Service schema data for SEO
	const serviceSchemaData = services.map((service) => ({
		name: service.title,
		description: service.whatThisRemoves.join('. '),
		type: 'ProfessionalService',
		price: service.pricing.replace(/[\$,+\/mo]/g, ''),
		priceDescription: service.pricing
	}));

	// Track which service is highlighted (from hash or assessment)
	let highlightedService = $state<string | null>(null);

	// Scroll to service on mount (from URL hash or assessment recommendation)
	onMount(() => {
		// Check URL hash first, then fall back to assessment recommendation
		const hash = window.location.hash.slice(1); // Remove the '#'
		const targetService = hash || recommendedService;

		if (targetService) {
			// Small delay to ensure DOM is ready
			setTimeout(() => {
				const element = document.getElementById(targetService);
				if (element) {
					element.scrollIntoView({ behavior: 'smooth', block: 'center' });
					highlightedService = targetService;

					// Clear highlight after animation completes
					setTimeout(() => {
						highlightedService = null;
					}, 2000);
				}
			}, 100);
		}

		// Listen for hash changes (e.g., user clicks another anchor link)
		function handleHashChange() {
			const newHash = window.location.hash.slice(1);
			if (newHash) {
				const element = document.getElementById(newHash);
				if (element) {
					element.scrollIntoView({ behavior: 'smooth', block: 'center' });
					highlightedService = newHash;
					setTimeout(() => {
						highlightedService = null;
					}, 2000);
				}
			}
		}

		window.addEventListener('hashchange', handleHashChange);
		return () => window.removeEventListener('hashchange', handleHashChange);
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
				We recommend <strong>{recommended?.title || 'exploring your options'}</strong> as your entry point.
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
			{#each services as service, index}
				{@const isRecommended = recommendedService === service.id}
				{@const isHighlighted = highlightedService === service.id}
				<div
					id={service.id}
					class="service-card animate-reveal"
					class:recommended={isRecommended}
					class:highlighted={isHighlighted}
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
									<path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
								</svg>
							{:else if service.icon === 'automation'}
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
								</svg>
							{:else if service.icon === 'robot'}
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
								</svg>
							{:else if service.icon === 'partnership'}
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
								</svg>
							{:else if service.icon === 'academy'}
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
								</svg>
							{:else if service.icon === 'advisor'}
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
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

					<!-- How It Works -->
					<div class="service-section">
						<h3 class="section-label">How it works</h3>
						<ul class="feature-list">
							{#each service.howItWorks as item}
								<li>{item}</li>
							{/each}
						</ul>
					</div>

					<!-- Proof Block -->
					<a href={service.proof.caseStudy} class="proof-block">
						<div class="proof-header">
							<span class="proof-label">Proof</span>
							<span class="proof-name">{service.proof.name}</span>
						</div>
						<p class="proof-headline">{service.proof.headline}</p>
						<div class="proof-stats">
							{#each service.proof.stats as stat}
								<span class="proof-stat">{stat}</span>
							{/each}
						</div>
						<span class="proof-link">See proof →</span>
					</a>

					<!-- Pricing + CTA -->
					<div class="service-footer">
						<div class="pricing-row">
							<span class="pricing">{service.pricing}</span>
							<span class="timeline">{service.timeline}</span>
						</div>
						<a href="/contact?service={service.id}" class="service-cta">
							Start a conversation
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
							</svg>
						</a>
					</div>
				</div>
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
				Engagements typically range from $5,000 to $50,000+ depending on scope and complexity.
				We'd rather understand your situation before discussing numbers.
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

	/* Service Card */
	.service-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		position: relative;
		transition: border-color var(--duration-standard) var(--ease-standard);
	}

	.service-card:hover {
		border-color: var(--color-border-emphasis);
	}

	.service-card.recommended {
		border-color: var(--color-border-strong);
		background: var(--color-bg-elevated);
		animation: pulse-highlight 600ms var(--ease-standard);
	}

	.service-card.highlighted {
		border-color: var(--color-border-strong);
		background: var(--color-bg-elevated);
		animation: target-highlight 2s var(--ease-standard);
	}

	@keyframes pulse-highlight {
		0%, 100% { box-shadow: 0 0 0 0 var(--color-border-emphasis); }
		50% { box-shadow: 0 0 0 4px var(--color-border-emphasis); }
	}

	@keyframes target-highlight {
		0% {
			box-shadow: 0 0 0 0 var(--color-border-emphasis);
			border-color: var(--color-border-default);
		}
		15% {
			box-shadow: 0 0 0 6px var(--color-border-emphasis);
			border-color: var(--color-border-strong);
		}
		30% {
			box-shadow: 0 0 0 3px var(--color-border-emphasis);
		}
		100% {
			box-shadow: 0 0 0 0 transparent;
			border-color: var(--color-border-default);
		}
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

	.removal-list,
	.feature-list {
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

	.feature-list li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		padding-left: 1rem;
		position: relative;
	}

	.feature-list li::before {
		content: '•';
		position: absolute;
		left: 0;
		color: var(--color-fg-muted);
	}

	/* Proof Block - reduced visual weight */
	.proof-block {
		display: block;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
		padding: var(--space-sm) var(--space-md);
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.proof-block:hover {
		background: var(--color-hover);
	}

	.proof-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.25rem;
	}

	.proof-label {
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-fg-muted);
	}

	.proof-name {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
	}

	.proof-headline {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
		margin-bottom: 0.25rem;
	}

	.proof-stats {
		display: flex;
		gap: var(--space-sm);
		flex-wrap: wrap;
		margin-bottom: var(--space-xs);
	}

	.proof-stat {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
		padding: 0.125rem 0.5rem;
		background: var(--color-bg-surface);
		border-radius: var(--radius-sm);
	}

	.proof-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.proof-block:hover .proof-link {
		color: var(--color-fg-primary);
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

	.service-cta {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-xs);
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		background: transparent;
		color: var(--color-fg-primary);
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-full);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.service-cta:hover {
		background: var(--color-hover);
		border-color: var(--color-fg-tertiary);
	}

	.service-cta svg {
		width: 1rem;
		height: 1rem;
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.service-cta:hover svg {
		transform: translateX(2px);
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
		.animate-reveal,
		.service-card.highlighted,
		.service-card.recommended {
			animation: none;
			opacity: 1;
			transform: none;
		}

		.service-card.highlighted {
			border-color: var(--color-border-strong);
			background: var(--color-bg-elevated);
		}
	}
</style>
