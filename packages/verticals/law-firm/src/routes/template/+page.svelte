<script lang="ts">
	/**
	 * Template Landing Page - Marketing/GTM Page
	 *
	 * This page markets the law-firm template itself.
	 * Zuhandenheit: "Consultations that book themselves"
	 * Target audience: Law firms looking for automated website solutions
	 */

	import { SEO } from '@create-something/canon';
	import StructuredData from '$lib/components/StructuredData.svelte';
	import { ExternalLink, CheckCircle2, Zap, Shield, Calendar, Mail } from 'lucide-svelte';

	const features = [
		{
			icon: Calendar,
			title: 'Automated Consultation Booking',
			description: 'Calendly integration syncs with your calendar. Consultations book themselves.',
			outcome: 'No more phone tag with prospective clients'
		},
		{
			icon: Mail,
			title: 'Smart Appointment Reminders',
			description: '24-hour email and SMS reminders reduce no-shows automatically.',
			outcome: 'Fewer missed consultations, better attendance rates'
		},
		{
			icon: Zap,
			title: 'Post-Meeting Follow-Up',
			description: 'Automatic thank you emails, proposal delivery, and review requests.',
			outcome: 'Turn consultations into clients with zero manual work'
		},
		{
			icon: Shield,
			title: 'Bar Compliance Built-In',
			description: 'Ethics disclaimers, HTTPS encryption, attorney-client privilege protection.',
			outcome: 'Launch confidently without compliance concerns'
		}
	];

	const tiers = [
		{
			name: 'Free',
			price: '$0',
			period: 'forever',
			description: 'Perfect for solo practitioners getting started',
			features: [
				'5 core pages (Home, About, Services, Team, Contact)',
				'Canon design system (professional, accessible)',
				'SEO optimized with Schema.org markup',
				'Mobile responsive design',
				'Consultation form (basic)',
				'Cloudflare Pages hosting'
			],
			cta: 'Deploy Free',
			ctaUrl: 'https://github.com/createsomething/vertical-professional-services',
			highlight: false
		},
		{
			name: 'Pro',
			price: '$99',
			period: '/month',
			description: 'For firms ready to automate client workflows',
			features: [
				'Everything in Free',
				'3 active WORKWAY workflows',
				'Automated appointment reminders',
				'Post-meeting follow-up automation',
				'HubSpot or Clio CRM integration',
				'Calendly calendar integration',
				'Guided custom domain setup',
				'Email support'
			],
			cta: 'Start Pro Trial',
			ctaUrl: 'https://workway.co/templates/law-firm?tier=pro',
			highlight: true
		},
		{
			name: 'Enterprise',
			price: 'Custom',
			period: '',
			description: 'For firms with complex integration needs',
			features: [
				'Everything in Pro',
				'Unlimited WORKWAY workflows',
				'Any CRM integration (custom)',
				'Any calendar integration',
				'Done-for-you domain setup',
				'Priority support (SLA)',
				'Direct CREATE SOMETHING consultation'
			],
			cta: 'Contact Sales',
			ctaUrl: 'https://createsomething.agency/contact',
			highlight: false
		}
	];

	const integrations = [
		{ name: 'Calendly', category: 'Scheduling' },
		{ name: 'HubSpot', category: 'CRM' },
		{ name: 'Clio', category: 'Legal CRM' },
		{ name: 'SendGrid', category: 'Email' },
		{ name: 'Twilio', category: 'SMS' },
		{ name: 'Cloudflare', category: 'Infrastructure' }
	];

	const faqs = [
		{
			question: 'How is this different from Wix or Squarespace law firm templates?',
			answer:
				'Those platforms lock you into their ecosystem and charge monthly fees forever. This template is open source—you own it. Deploy to Cloudflare Pages for free hosting. The WORKWAY workflows automate tasks that would require expensive Zapier plans or custom development.'
		},
		{
			question: 'Do I need to know how to code?',
			answer:
				'Not for the Free tier—it is a one-click deploy to Cloudflare Pages. For Pro and Enterprise tiers, we handle the setup for you. If you want to customize beyond the provided options, basic HTML/CSS knowledge helps, but is not required.'
		},
		{
			question: 'Is this bar-compliant?',
			answer:
				'The template includes ethics disclaimers, HTTPS encryption, and respects attorney-client privilege guidelines. However, you are responsible for ensuring compliance with your specific jurisdiction. We recommend consulting your state bar association.'
		},
		{
			question: 'Can I use this for my existing firm website?',
			answer:
				'Yes. The Free tier is available on GitHub for you to customize and deploy. The Pro tier includes migration assistance to help you move from your current site.'
		},
		{
			question: 'What is WORKWAY?',
			answer:
				'WORKWAY is a workflow automation platform built on Cloudflare Workers. It connects your calendar, CRM, email, and SMS providers to automate routine client interactions—like appointment reminders and follow-ups—without monthly per-zap fees.'
		}
	];
</script>

<SEO
	title="Law Firm Website Template - Free & Open Source"
	description="Production-ready law firm website template with automated workflows. Free tier available. Deploy to Cloudflare Pages in minutes. Consultations that book themselves."
	keywords="law firm website template free, attorney website builder, legal website template open source, cloudflare law firm, automated legal intake, law office website free, sveltekit law firm, workway legal automation"
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'Template', url: '/template' }
	]}
/>
<StructuredData page="home" includeFAQ={false} includeTemplate={true} />

<main class="template-landing">
	<!-- Hero Section -->
	<section class="hero">
		<div class="hero-container">
			<div class="hero-content">
				<h1 class="hero-title">Consultations That Book Themselves</h1>
				<p class="hero-subtitle">
					Production-ready law firm website template with automated client workflows. Free tier
					available. Deploy in minutes, not months.
				</p>
				<div class="hero-actions">
					<a href="https://github.com/createsomething/vertical-professional-services" class="btn btn-primary">
						Deploy Free <ExternalLink size={16} />
					</a>
					<a href="#pricing" class="btn btn-secondary">View Pricing</a>
				</div>
				<p class="hero-note">
					<CheckCircle2 size={16} /> Open source • No vendor lock-in • Own your code
				</p>
			</div>
			<div class="hero-visual">
				<img
					src="/og-image.jpg"
					alt="Law firm website template screenshot"
					class="hero-screenshot"
				/>
			</div>
		</div>
	</section>

	<!-- Features Section (Outcome-Focused) -->
	<section class="features" id="features">
		<div class="features-container">
			<div class="section-header">
				<h2 class="section-title">Stop Chasing Clients. Start Converting Them.</h2>
				<p class="section-subtitle">
					The invisible workflows that turn website visitors into paying clients
				</p>
			</div>

			<div class="features-grid">
				{#each features as feature}
					<div class="feature-card">
						<div class="feature-icon">
							<svelte:component this={feature.icon} size={24} strokeWidth={2} />
						</div>
						<h3 class="feature-title">{feature.title}</h3>
						<p class="feature-description">{feature.description}</p>
						<p class="feature-outcome">
							<CheckCircle2 size={16} />
							{feature.outcome}
						</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Integrations -->
	<section class="integrations">
		<div class="integrations-container">
			<h2 class="section-title">Connects With Your Existing Tools</h2>
			<p class="section-subtitle">
				No need to switch CRMs or calendars. WORKWAY connects to what you already use.
			</p>
			<div class="integrations-grid">
				{#each integrations as integration}
					<div class="integration-card">
						<span class="integration-name">{integration.name}</span>
						<span class="integration-category">{integration.category}</span>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Pricing -->
	<section class="pricing" id="pricing">
		<div class="pricing-container">
			<div class="section-header">
				<h2 class="section-title">Choose Your Tier</h2>
				<p class="section-subtitle">Start free. Upgrade when automation pays for itself.</p>
			</div>

			<div class="pricing-grid">
				{#each tiers as tier}
					<div class="pricing-card" class:highlight={tier.highlight}>
						{#if tier.highlight}
							<span class="pricing-badge">Most Popular</span>
						{/if}
						<h3 class="pricing-name">{tier.name}</h3>
						<div class="pricing-price">
							<span class="price">{tier.price}</span>
							{#if tier.period}
								<span class="period">{tier.period}</span>
							{/if}
						</div>
						<p class="pricing-description">{tier.description}</p>
						<ul class="pricing-features">
							{#each tier.features as feature}
								<li>
									<CheckCircle2 size={16} />
									<span>{feature}</span>
								</li>
							{/each}
						</ul>
						<a href={tier.ctaUrl} class="pricing-cta" class:primary={tier.highlight}>
							{tier.cta}
						</a>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- FAQ Section -->
	<section class="faq-section" id="faq">
		<div class="faq-container">
			<div class="section-header">
				<h2 class="section-title">Frequently Asked Questions</h2>
			</div>

			<div class="faq-list">
				{#each faqs as faq}
					<details class="faq-item">
						<summary class="faq-question">{faq.question}</summary>
						<p class="faq-answer">{faq.answer}</p>
					</details>
				{/each}
			</div>
		</div>
	</section>

	<!-- CTA Section -->
	<section class="cta-section">
		<div class="cta-container">
			<h2 class="cta-title">Ready to automate your client intake?</h2>
			<p class="cta-subtitle">Deploy the free tier in 5 minutes. Upgrade when you are ready.</p>
			<div class="cta-actions">
				<a href="https://github.com/createsomething/vertical-professional-services" class="btn btn-primary">
					Deploy Free Template
				</a>
				<a href="https://createsomething.agency/contact" class="btn btn-secondary">
					Talk to CREATE SOMETHING
				</a>
			</div>
		</div>
	</section>
</main>

<style>
	/* Layout */
	.template-landing {
		background: var(--color-bg-pure);
	}

	/* Hero Section */
	.hero {
		padding: var(--space-3xl) var(--space-lg);
		background: linear-gradient(135deg, var(--color-bg-surface) 0%, var(--color-bg-elevated) 100%);
		border-bottom: 1px solid var(--color-border-default);
	}

	.hero-container {
		max-width: 1200px;
		margin: 0 auto;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-2xl);
		align-items: center;
	}

	.hero-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.hero-title {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		line-height: var(--leading-tight);
		margin: 0;
	}

	.hero-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin: 0;
	}

	.hero-actions {
		display: flex;
		gap: var(--space-md);
		flex-wrap: wrap;
	}

	.hero-note {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin: 0;
	}

	.hero-visual {
		border-radius: var(--radius-lg);
		overflow: hidden;
		box-shadow: var(--shadow-lg);
	}

	.hero-screenshot {
		width: 100%;
		height: auto;
		display: block;
	}

	/* Buttons */
	.btn {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm) var(--space-lg);
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		border-radius: var(--radius-md);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.btn-primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	.btn-primary:hover {
		background: var(--color-fg-secondary);
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}

	.btn-secondary {
		background: transparent;
		color: var(--color-fg-primary);
		border: 1px solid var(--color-border-emphasis);
	}

	.btn-secondary:hover {
		background: var(--color-bg-elevated);
		border-color: var(--color-fg-primary);
	}

	/* Features Section */
	.features {
		padding: var(--space-3xl) var(--space-lg);
	}

	.features-container {
		max-width: 1200px;
		margin: 0 auto;
	}

	.section-header {
		text-align: center;
		margin-bottom: var(--space-2xl);
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm);
	}

	.section-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.features-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-lg);
	}

	.feature-card {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.feature-icon {
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-elevated);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
	}

	.feature-title {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0;
	}

	.feature-description {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0;
		line-height: var(--leading-relaxed);
	}

	.feature-outcome {
		display: flex;
		align-items: flex-start;
		gap: var(--space-xs);
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin: 0;
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
	}

	/* Integrations Section */
	.integrations {
		padding: var(--space-3xl) var(--space-lg);
		background: var(--color-bg-elevated);
	}

	.integrations-container {
		max-width: 1000px;
		margin: 0 auto;
	}

	.integrations-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: var(--space-md);
	}

	.integration-card {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.integration-name {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.integration-category {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* Pricing Section */
	.pricing {
		padding: var(--space-3xl) var(--space-lg);
	}

	.pricing-container {
		max-width: 1200px;
		margin: 0 auto;
	}

	.pricing-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: var(--space-lg);
	}

	.pricing-card {
		padding: var(--space-xl);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		position: relative;
	}

	.pricing-card.highlight {
		border-color: var(--color-fg-primary);
		border-width: 2px;
		box-shadow: var(--shadow-lg);
	}

	.pricing-badge {
		position: absolute;
		top: var(--space-md);
		right: var(--space-md);
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		border-radius: var(--radius-sm);
	}

	.pricing-name {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0;
	}

	.pricing-price {
		display: flex;
		align-items: baseline;
		gap: var(--space-xs);
	}

	.price {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
	}

	.period {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}

	.pricing-description {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.pricing-features {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		flex-grow: 1;
	}

	.pricing-features li {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	.pricing-cta {
		display: block;
		text-align: center;
		padding: var(--space-sm) var(--space-lg);
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		border-radius: var(--radius-md);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
		background: transparent;
		color: var(--color-fg-primary);
		border: 1px solid var(--color-border-emphasis);
	}

	.pricing-cta.primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-color: var(--color-fg-primary);
	}

	.pricing-cta:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}

	/* FAQ Section */
	.faq-section {
		padding: var(--space-3xl) var(--space-lg);
		background: var(--color-bg-elevated);
	}

	.faq-container {
		max-width: 800px;
		margin: 0 auto;
	}

	.faq-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.faq-item {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.faq-question {
		padding: var(--space-md) var(--space-lg);
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		cursor: pointer;
	}

	.faq-answer {
		padding: 0 var(--space-lg) var(--space-lg);
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin: 0;
	}

	/* CTA Section */
	.cta-section {
		padding: var(--space-3xl) var(--space-lg);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	.cta-container {
		max-width: 800px;
		margin: 0 auto;
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.cta-title {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		margin: 0;
	}

	.cta-subtitle {
		font-size: var(--text-body-lg);
		opacity: 0.9;
		margin: 0;
	}

	.cta-actions {
		display: flex;
		gap: var(--space-md);
		justify-content: center;
		flex-wrap: wrap;
	}

	.cta-section .btn-primary {
		background: var(--color-bg-pure);
		color: var(--color-fg-primary);
	}

	.cta-section .btn-primary:hover {
		background: var(--color-bg-elevated);
	}

	.cta-section .btn-secondary {
		background: transparent;
		color: var(--color-bg-pure);
		border-color: var(--color-bg-pure);
	}

	.cta-section .btn-secondary:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.hero-container {
			grid-template-columns: 1fr;
		}

		.hero-visual {
			order: -1;
		}

		.features-grid {
			grid-template-columns: 1fr;
		}

		.pricing-grid {
			grid-template-columns: 1fr;
		}

		.integrations-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
