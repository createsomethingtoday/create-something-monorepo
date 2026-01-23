<script lang="ts">
	/**
	 * OUTERFIELDS Documentation
	 *
	 * Client-facing docs about PCN services, process, and onboarding
	 */
	import {
		BookOpen, Rocket, Users, Calendar, Check, ArrowRight,
		Code, Film, Wrench, TrendingUp, HelpCircle, FileText,
		CreditCard, MessageSquare, BarChart3, Globe, Shield, Zap
	} from 'lucide-svelte';

	function bookDiscoveryCall() {
		window.open('https://calendly.com/outerfields/discovery-call', '_blank');
	}

	interface ProcessStep {
		number: string;
		title: string;
		description: string;
		duration: string;
	}

	const processSteps: ProcessStep[] = [
		{
			number: '01',
			title: 'Discovery Call',
			description: 'We learn about your brand, audience, and content goals. You share your vision, we assess the fit.',
			duration: '30 min'
		},
		{
			number: '02',
			title: 'Strategy & Planning',
			description: 'Custom proposal with content strategy, platform features, and production timeline. Clear scope, no surprises.',
			duration: '1-2 weeks'
		},
		{
			number: '03',
			title: 'Content Production',
			description: 'Professional video production. We handle filming, editing, and post-production. You focus on being on camera.',
			duration: '4-8 weeks'
		},
		{
			number: '04',
			title: 'Platform Build',
			description: 'Custom PCN development with your branding, subscription tiers, and analytics. Full white-label experience.',
			duration: '2-4 weeks'
		},
		{
			number: '05',
			title: 'Launch & Growth',
			description: 'Go live with marketing support. Ongoing analytics, content updates, and platform improvements.',
			duration: 'Ongoing'
		}
	];

	interface FAQ {
		question: string;
		answer: string;
	}

	const faqs: FAQ[] = [
		{
			question: 'What is a Private Content Network?',
			answer: 'A PCN is your own branded streaming platform—like Netflix, but for your content and your audience. You own the platform, the subscribers, and the revenue. No algorithms, no middlemen.'
		},
		{
			question: 'What\'s included in the $19,999 starting price?',
			answer: 'Full-service PCN creation: custom platform development, professional video production, content strategy, subscription/payment integration, analytics dashboard, AI chatbot assistant, and ongoing support. Final pricing depends on content scope and features.'
		},
		{
			question: 'Do I need technical skills?',
			answer: 'No. We handle everything—platform development, hosting, integrations, and maintenance. You focus on your content and audience.'
		},
		{
			question: 'How long does it take to launch?',
			answer: 'Typical timeline is 8-12 weeks from discovery call to launch. This includes content production, platform development, and testing.'
		},
		{
			question: 'Can I use my existing content?',
			answer: 'Yes. We can integrate your existing video library and help organize it for the best subscriber experience. We also produce new content as part of your package.'
		},
		{
			question: 'What platforms do you integrate with?',
			answer: 'Stripe for payments, Calendly for scheduling, plus analytics connections to YouTube, Instagram, and more. Custom integrations available.'
		},
		{
			question: 'Who owns the platform and content?',
			answer: 'You do. Full ownership of your PCN, subscriber data, and content. No lock-in, no platform dependency.'
		},
		{
			question: 'What ongoing support is included?',
			answer: 'Platform hosting, maintenance, security updates, and technical support. Content updates and new features available as add-ons.'
		}
	];

	interface Inclusion {
		icon: typeof Code;
		title: string;
		items: string[];
	}

	const inclusions: Inclusion[] = [
		{
			icon: Code,
			title: 'Platform',
			items: [
				'Custom branded streaming site',
				'Mobile-responsive design',
				'Subscription management',
				'Member authentication',
				'Content gating & access control'
			]
		},
		{
			icon: Film,
			title: 'Production',
			items: [
				'Professional video production',
				'Editing & post-production',
				'Thumbnail & asset creation',
				'Content organization',
				'Series & category structure'
			]
		},
		{
			icon: BarChart3,
			title: 'Analytics',
			items: [
				'Real-time viewer metrics',
				'Engagement heatmaps',
				'Subscriber analytics',
				'Revenue tracking',
				'AI-powered insights'
			]
		},
		{
			icon: TrendingUp,
			title: 'Growth',
			items: [
				'Marketing strategy',
				'Launch support',
				'SEO optimization',
				'Social integration',
				'Ongoing consultation'
			]
		}
	];

	let openFaqIndex = $state<number | null>(null);

	function toggleFaq(index: number) {
		openFaqIndex = openFaqIndex === index ? null : index;
	}
</script>

<svelte:head>
	<title>How It Works | OUTERFIELDS</title>
	<meta name="description" content="Learn how OUTERFIELDS builds Private Content Networks. Our process, what's included, and frequently asked questions." />
</svelte:head>

<main class="docs-page">
	<!-- Hero -->
	<section class="hero">
		<div class="container">
			<span class="hero-badge">
				<BookOpen size={14} />
				Documentation
			</span>
			<h1 class="hero-title">How We Build Your PCN</h1>
			<p class="hero-description">
				From discovery call to launch, here's everything you need to know about creating your Private Content Network.
			</p>
		</div>
	</section>

	<!-- Process -->
	<section class="process-section">
		<div class="container">
			<h2 class="section-title">The Process</h2>
			<p class="section-description">Five steps from idea to live platform</p>

			<div class="process-timeline">
				{#each processSteps as step, index}
					<div class="process-step">
						<div class="step-number">{step.number}</div>
						<div class="step-content">
							<div class="step-header">
								<h3 class="step-title">{step.title}</h3>
								<span class="step-duration">{step.duration}</span>
							</div>
							<p class="step-description">{step.description}</p>
						</div>
						{#if index < processSteps.length - 1}
							<div class="step-connector"></div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- What's Included -->
	<section class="inclusions-section">
		<div class="container">
			<h2 class="section-title">What's Included</h2>
			<p class="section-description">Everything you need to launch and grow your PCN</p>

			<div class="inclusions-grid">
				{#each inclusions as inclusion}
					{@const Icon = inclusion.icon}
					<div class="inclusion-card">
						<div class="inclusion-header">
							<div class="inclusion-icon">
								<Icon size={24} />
							</div>
							<h3 class="inclusion-title">{inclusion.title}</h3>
						</div>
						<ul class="inclusion-list">
							{#each inclusion.items as item}
								<li>
									<Check size={14} />
									<span>{item}</span>
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- FAQ -->
	<section class="faq-section">
		<div class="container">
			<h2 class="section-title">Frequently Asked Questions</h2>
			<p class="section-description">Common questions about PCN creation</p>

			<div class="faq-list">
				{#each faqs as faq, index}
					<button
						class="faq-item"
						class:open={openFaqIndex === index}
						onclick={() => toggleFaq(index)}
					>
						<div class="faq-question">
							<HelpCircle size={18} />
							<span>{faq.question}</span>
							<span class="faq-toggle">{openFaqIndex === index ? '−' : '+'}</span>
						</div>
						{#if openFaqIndex === index}
							<div class="faq-answer">
								<p>{faq.answer}</p>
							</div>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	</section>

	<!-- CTA -->
	<section class="cta-section">
		<div class="container">
			<div class="cta-card">
				<Rocket size={32} />
				<h2 class="cta-title">Ready to Build Your PCN?</h2>
				<p class="cta-description">
					Book a free discovery call. We'll discuss your vision, answer questions, and see if we're a good fit.
				</p>
				<button class="cta-button" onclick={bookDiscoveryCall}>
					<Calendar size={20} />
					Book a Discovery Call
				</button>
				<p class="cta-note">Free consultation · No commitment required</p>
			</div>
		</div>
	</section>
</main>

<style>
	.docs-page {
		min-height: 100vh;
		background: var(--color-bg-pure);
	}

	.container {
		max-width: var(--container-max-width);
		margin: 0 auto;
		padding: 0 1.5rem;
	}

	/* Hero */
	.hero {
		padding: 8rem 0 4rem;
		text-align: center;
	}

	.hero-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		background: var(--color-primary-muted);
		border: 1px solid rgba(244, 81, 38, 0.3);
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-sun);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 1.5rem;
	}

	.hero-title {
		font-size: clamp(2.5rem, 6vw, 4rem);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 1.5rem;
		line-height: 1.1;
	}

	.hero-description {
		font-size: 1.25rem;
		color: var(--color-fg-muted);
		max-width: 40rem;
		margin: 0 auto;
		line-height: 1.7;
	}

	/* Section Styling */
	.section-title {
		font-size: clamp(2rem, 4vw, 2.5rem);
		font-weight: 700;
		color: var(--color-fg-primary);
		text-align: center;
		margin: 0 0 0.5rem;
	}

	.section-description {
		font-size: 1.125rem;
		color: var(--color-fg-muted);
		text-align: center;
		margin: 0 0 3rem;
	}

	/* Process */
	.process-section {
		padding: 6rem 0;
		background: var(--color-bg-surface);
	}

	.process-timeline {
		max-width: 48rem;
		margin: 0 auto;
	}

	.process-step {
		position: relative;
		display: flex;
		gap: 1.5rem;
		padding-bottom: 2.5rem;
	}

	.step-number {
		flex-shrink: 0;
		width: 3rem;
		height: 3rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-sun);
		border-radius: 50%;
		font-size: 0.875rem;
		font-weight: 700;
		color: white;
	}

	.step-content {
		flex: 1;
		padding-top: 0.25rem;
	}

	.step-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}

	.step-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.step-duration {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-sun);
		background: var(--color-primary-muted);
		padding: 0.25rem 0.5rem;
		border-radius: 9999px;
	}

	.step-description {
		font-size: 1rem;
		color: var(--color-fg-muted);
		line-height: 1.6;
		margin: 0;
	}

	.step-connector {
		position: absolute;
		left: 1.5rem;
		top: 3rem;
		bottom: 0;
		width: 1px;
		background: var(--color-border-default);
		transform: translateX(-50%);
	}

	/* Inclusions */
	.inclusions-section {
		padding: 6rem 0;
	}

	.inclusions-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1.5rem;
	}

	.inclusion-card {
		padding: 1.5rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.inclusion-card:hover {
		border-color: var(--color-sun);
	}

	.inclusion-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.inclusion-icon {
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-primary-muted);
		border-radius: 0.5rem;
		color: var(--color-sun);
	}

	.inclusion-title {
		font-size: 1rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.inclusion-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.inclusion-list li {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--color-fg-secondary);
		line-height: 1.4;
	}

	.inclusion-list li :global(svg) {
		color: var(--color-sun);
		flex-shrink: 0;
		margin-top: 0.125rem;
	}

	/* FAQ */
	.faq-section {
		padding: 6rem 0;
		background: var(--color-bg-surface);
	}

	.faq-list {
		max-width: 48rem;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.faq-item {
		width: 100%;
		text-align: left;
		padding: 1.25rem;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: 0.75rem;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.faq-item:hover {
		border-color: var(--color-sun);
	}

	.faq-item.open {
		border-color: var(--color-sun);
	}

	.faq-question {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.faq-question :global(svg) {
		color: var(--color-sun);
		flex-shrink: 0;
	}

	.faq-question span:first-of-type {
		flex: 1;
	}

	.faq-toggle {
		font-size: 1.25rem;
		color: var(--color-fg-muted);
		width: 1.5rem;
		text-align: center;
	}

	.faq-answer {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--color-border-default);
	}

	.faq-answer p {
		font-size: 0.9375rem;
		color: var(--color-fg-muted);
		line-height: 1.7;
		margin: 0;
		padding-left: 2rem;
	}

	/* CTA */
	.cta-section {
		padding: 6rem 0;
	}

	.cta-card {
		max-width: 32rem;
		margin: 0 auto;
		text-align: center;
		padding: 3rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
	}

	.cta-card :global(svg:first-child) {
		color: var(--color-sun);
		margin-bottom: 1rem;
	}

	.cta-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 0.75rem;
	}

	.cta-description {
		font-size: 1rem;
		color: var(--color-fg-muted);
		margin: 0 0 1.5rem;
		line-height: 1.6;
	}

	.cta-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem 2rem;
		background: var(--color-sun);
		border: none;
		border-radius: 0.5rem;
		font-size: 1rem;
		font-weight: 700;
		color: white;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.cta-button:hover {
		background: var(--color-primary-hover);
		transform: scale(1.02);
	}

	.cta-note {
		font-size: 0.8125rem;
		color: var(--color-fg-muted);
		margin: 1rem 0 0;
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.inclusions-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 768px) {
		.hero {
			padding: 6rem 0 3rem;
		}

		.process-section,
		.inclusions-section,
		.faq-section,
		.cta-section {
			padding: 4rem 0;
		}

		.inclusions-grid {
			grid-template-columns: 1fr;
		}

		.process-step {
			gap: 1rem;
		}

		.step-number {
			width: 2.5rem;
			height: 2.5rem;
			font-size: 0.75rem;
		}

		.step-connector {
			left: 1.25rem;
			top: 2.5rem;
		}

		.step-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.faq-answer p {
			padding-left: 0;
		}

		.cta-card {
			padding: 2rem;
		}
	}
</style>
