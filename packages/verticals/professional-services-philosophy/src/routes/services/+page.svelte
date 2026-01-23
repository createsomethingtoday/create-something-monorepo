<script lang="ts">
	import { SEO } from '@create-something/components';
	import ConsultationCTA from '$lib/components/ConsultationCTA.svelte';
	import StructuredData from '$lib/components/StructuredData.svelte';
	import { siteConfig } from '$lib/config/context';

	// FAQ data
	const faqs = [
		{
			question: 'How do you structure your pricing?',
			answer:
				'We offer both project-based pricing and retainer models. For defined scopes like system builds, we provide fixed quotes based on complexity and timeline. For ongoing support like technical advisory, we work on monthly retainers scaled to your needs.'
		},
		{
			question: 'What makes your AI-native approach different?',
			answer:
				"We don't use AI to replace human judgment—we use it to amplify it. Claude Code handles component generation and routine implementation while our team focuses on architecture, security review, and strategic decisions. The result: 78% faster delivery with human oversight at every decision point."
		},
		{
			question: 'How long does a typical project take?',
			answer:
				'Our AI-native methodology dramatically compresses timelines. A typical authentication system that would take 2-3 weeks traditionally is delivered in 6-26 hours. Complex multi-tenant platforms that would take 3-4 months are completed in 2-4 weeks.'
		},
		{
			question: 'Do you offer post-launch support?',
			answer:
				'Absolutely. Relationships deepen after launch, not end. We offer maintenance packages for security updates, performance optimization, and feature iteration. Our partnership model means we remain invested in your long-term success.'
		},
		{
			question: 'What technologies do you work with?',
			answer:
				'Our stack centers on modern edge-first architecture: SvelteKit, Cloudflare Workers, D1, R2, and TypeScript. We select tools based on your specific needs, not framework dogma. The architecture serves the domain, not the other way around.'
		}
	];

	// Process steps
	const processSteps = [
		{
			icon: 'search',
			title: 'Discovery',
			description: 'Deep dive into your domain, constraints, and objectives. We understand before we build.'
		},
		{
			icon: 'architecture',
			title: 'Architecture',
			description: 'Design systems that scale. Domain-driven patterns, edge-first thinking.'
		},
		{
			icon: 'code',
			title: 'Implementation',
			description: 'Claude Code generates, humans review. Bounded tasks with quality gates.'
		},
		{
			icon: 'verified',
			title: 'Verification',
			description: 'Security audit, performance testing, architectural review. No shortcuts.'
		},
		{
			icon: 'rocket_launch',
			title: 'Launch',
			description: 'Deploy to edge. Monitor, optimize, iterate. Partnership continues.'
		}
	];

	// Services data with philosophy-aligned content
	const services = [
		{
			number: '01',
			title: 'AI-Native Development',
			description:
				'Claude Code for component generation. Human review for architecture. Bounded tasks with quality gates at every decision point. Production in hours, not weeks.',
			image: '/projects/casa-moderna.jpg',
			capabilities: [
				'Claude Code Integration',
				'Component Generation',
				'Quality Gate Systems',
				'Rapid Prototyping',
				'Test-Driven Development',
				'Edge Deployment'
			]
		},
		{
			number: '02',
			title: 'System Architecture',
			description:
				'Domain-driven design. Event-sourced patterns. Edge-first thinking. Architecture emerges from domain understanding, not framework assumptions.',
			image: '/projects/horizon-tower.jpg',
			capabilities: [
				'Domain Modeling',
				'Event Sourcing',
				'Microservices Design',
				'Database Architecture',
				'API Design',
				'Scalability Planning'
			]
		},
		{
			number: '03',
			title: 'Process Automation',
			description:
				'Workflow orchestration. Integration patterns. Data pipelines. WORKWAY SDK for composable workflows. 155 scripts → 13. Same functionality.',
			image: '/projects/urban-loft.jpg',
			capabilities: [
				'Workflow Orchestration',
				'Integration Patterns',
				'Data Pipelines',
				'CI/CD Automation',
				'Background Processing',
				'Queue Management'
			]
		},
		{
			number: '04',
			title: 'Technical Advisory',
			description:
				'Architecture review. Technology selection. Team capability building. Strategic guidance grounded in production experience. Partnership, not delegation.',
			image: '/projects/zen-retreat.jpg',
			capabilities: [
				'Architecture Review',
				'Tech Stack Selection',
				'Team Mentoring',
				'Code Audit',
				'Performance Analysis',
				'Security Assessment'
			]
		}
	];

	// Track which FAQ is open
	let openFaqIndex: number | null = null;

	function toggleFaq(index: number) {
		openFaqIndex = openFaqIndex === index ? null : index;
	}
</script>

<SEO
	title="Our Services"
	description="AI-native development, system architecture, process automation, and technical advisory. Tools recede. Partnership remains."
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'Services', url: '/services' }
	]}
/>
<StructuredData page="services" />

<div class="services-page">
	<!-- Hero Section -->
	<section class="hero">
		<div class="container">
			<div class="hero-content">
				<h1>Our Expertise</h1>
				<p class="hero-lead">
					Tools recede into transparent use. We combine AI-native methodology with deep technical
					expertise to deliver outcomes that matter—faster, with human judgment where it counts.
				</p>
			</div>
		</div>
	</section>

	<!-- Service Sections (Alternating Layout) -->
	{#each services as service, index}
		<section class="service-section" class:alternate={index % 2 === 0}>
			<div class="container">
				<div class="service-grid" class:reverse={index % 2 === 0}>
					<div class="service-image">
						<img src={service.image} alt={service.title} />
					</div>
					<div class="service-content">
						<span class="service-number">{service.number}</span>
						<h2>{service.title}</h2>
						<p class="service-description">{service.description}</p>
						<div class="capabilities">
							<h3>Capabilities</h3>
							<div class="capabilities-grid">
								{#each service.capabilities as capability}
									<div class="capability-item">
										<span class="capability-dot"></span>
										<span>{capability}</span>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	{/each}

	<!-- Process Section -->
	<section class="process-section">
		<div class="container">
			<div class="process-header">
				<h2>Our Way of Working</h2>
				<p>A methodology validated by 32 completed projects. Partnership at every step.</p>
			</div>
			<div class="process-steps">
				<div class="process-line"></div>
				{#each processSteps as step, index}
					<div class="process-step">
						<div class="step-icon">
							<span class="material-icon">{step.icon}</span>
						</div>
						<div class="step-content">
							<span class="step-number">Step {String(index + 1).padStart(2, '0')}</span>
							<h3>{step.title}</h3>
							<p>{step.description}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- FAQ Section -->
	<section class="faq-section">
		<div class="container">
			<h2>Frequently Asked Questions</h2>
			<div class="faq-list">
				{#each faqs as faq, index}
					<div class="faq-item" class:open={openFaqIndex === index}>
						<button class="faq-question" on:click={() => toggleFaq(index)}>
							<span>{faq.question}</span>
							<span class="faq-icon">{openFaqIndex === index ? '−' : '+'}</span>
						</button>
						{#if openFaqIndex === index}
							<div class="faq-answer">
								<p>{faq.answer}</p>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- CTA Section -->
	<section class="cta-section">
		<div class="container">
			<h2>Let's build<br />something together</h2>
			<a href="/contact" class="cta-button">
				Start a Project
				<span class="arrow">→</span>
			</a>
		</div>
	</section>
</div>

<style>
	.services-page {
		background: var(--color-bg-pure);
	}

	.container {
		max-width: 1400px;
		margin: 0 auto;
		padding: 0 1.5rem;
	}

	/* Hero Section */
	.hero {
		padding: 10rem 0 5rem;
		background: #fff;
	}

	.hero-content {
		max-width: 900px;
	}

	.hero h1 {
		font-size: clamp(3rem, 8vw, 6rem);
		font-weight: 700;
		letter-spacing: -0.03em;
		color: #111;
		margin-bottom: 2rem;
		line-height: 1;
	}

	.hero-lead {
		font-size: clamp(1.125rem, 2vw, 1.375rem);
		color: #666;
		line-height: 1.6;
		font-weight: 300;
	}

	/* Service Sections */
	.service-section {
		padding: 5rem 0;
		border-top: 1px solid #e5e7eb;
	}

	.service-section.alternate {
		background: #f9fafb;
	}

	.service-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 4rem;
		align-items: center;
	}

	.service-grid.reverse .service-image {
		order: 1;
	}

	.service-grid.reverse .service-content {
		order: 2;
	}

	@media (max-width: 1024px) {
		.service-grid {
			grid-template-columns: 1fr;
			gap: 2rem;
		}

		.service-grid.reverse .service-image,
		.service-grid.reverse .service-content {
			order: unset;
		}
	}

	.service-image {
		position: relative;
		overflow: hidden;
		border-radius: 1rem;
		aspect-ratio: 4/3;
	}

	.service-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.7s ease;
	}

	.service-image:hover img {
		transform: scale(1.05);
	}

	.service-number {
		display: block;
		font-size: 0.875rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: #9ca3af;
		margin-bottom: 0.5rem;
		text-transform: uppercase;
	}

	.service-content h2 {
		font-size: clamp(2rem, 4vw, 3rem);
		font-weight: 700;
		color: #111;
		margin-bottom: 1.5rem;
		line-height: 1.1;
	}

	.service-description {
		font-size: 1.125rem;
		color: #4b5563;
		line-height: 1.7;
		margin-bottom: 2.5rem;
	}

	.capabilities h3 {
		font-size: 0.875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #9ca3af;
		margin-bottom: 1rem;
	}

	.capabilities-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem 2rem;
	}

	.capability-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.capability-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #111;
		flex-shrink: 0;
	}

	.capability-item span:last-child {
		font-size: 0.875rem;
		font-weight: 500;
		color: #111;
	}

	/* Process Section */
	.process-section {
		padding: 6rem 0;
		background: #000;
		color: #fff;
	}

	.process-header {
		margin-bottom: 4rem;
	}

	.process-header h2 {
		font-size: clamp(2rem, 4vw, 3rem);
		font-weight: 700;
		margin-bottom: 1rem;
	}

	.process-header p {
		color: #9ca3af;
		font-size: 1.125rem;
	}

	.process-steps {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 2rem;
		position: relative;
	}

	.process-line {
		display: none;
		position: absolute;
		top: 3rem;
		left: 0;
		right: 0;
		height: 1px;
		background: #333;
	}

	@media (min-width: 1024px) {
		.process-line {
			display: block;
		}
	}

	@media (max-width: 1024px) {
		.process-steps {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 640px) {
		.process-steps {
			grid-template-columns: 1fr;
		}
	}

	.process-step {
		position: relative;
		z-index: 1;
		background: #000;
	}

	.step-icon {
		width: 6rem;
		height: 6rem;
		border-radius: 50%;
		border: 1px solid #333;
		background: #000;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 1.5rem;
	}

	.material-icon {
		font-family: 'Material Symbols Outlined';
		font-size: 2rem;
		color: #fff;
	}

	.step-number {
		display: block;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #666;
		margin-bottom: 0.5rem;
	}

	.step-content h3 {
		font-size: 1.25rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
	}

	.step-content p {
		font-size: 0.875rem;
		color: #9ca3af;
		line-height: 1.6;
	}

	/* FAQ Section */
	.faq-section {
		padding: 6rem 0;
		background: #fff;
	}

	.faq-section h2 {
		font-size: clamp(1.75rem, 4vw, 3rem);
		font-weight: 700;
		text-align: center;
		margin-bottom: 4rem;
		color: #111;
	}

	.faq-list {
		max-width: 800px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.faq-item {
		background: #fff;
		border: 1px solid #e5e7eb;
		border-radius: 0.75rem;
		overflow: hidden;
		transition: all 0.3s ease;
	}

	.faq-item.open {
		border-color: #d1d5db;
	}

	.faq-question {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem 2rem;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		font-size: 1.125rem;
		font-weight: 600;
		color: #111;
		transition: background 0.2s ease;
	}

	.faq-question:hover {
		background: #f9fafb;
	}

	.faq-icon {
		font-size: 1.5rem;
		color: #9ca3af;
		transition: transform 0.3s ease;
	}

	.faq-answer {
		padding: 0 2rem 1.5rem;
	}

	.faq-answer p {
		color: #4b5563;
		line-height: 1.7;
	}

	/* CTA Section */
	.cta-section {
		padding: 8rem 0;
		background: #fff;
		border-top: 1px solid #e5e7eb;
		text-align: center;
	}

	.cta-section h2 {
		font-size: clamp(2.5rem, 6vw, 5rem);
		font-weight: 700;
		letter-spacing: -0.03em;
		color: #111;
		margin-bottom: 3rem;
		line-height: 1.1;
	}

	.cta-button {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		background: #000;
		color: #fff;
		padding: 1.25rem 3rem;
		border-radius: 9999px;
		font-size: 1.25rem;
		font-weight: 700;
		text-decoration: none;
		transition: opacity 0.2s ease;
	}

	.cta-button:hover {
		opacity: 0.8;
	}

	.cta-button .arrow {
		font-size: 1.5rem;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.hero {
			padding: 8rem 0 4rem;
		}

		.service-section {
			padding: 3rem 0;
		}

		.process-section,
		.faq-section,
		.cta-section {
			padding: 4rem 0;
		}

		.faq-question {
			padding: 1.25rem 1.5rem;
			font-size: 1rem;
		}

		.faq-answer {
			padding: 0 1.5rem 1.25rem;
		}

		.capabilities-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
