<script lang="ts">
	/**
	 * Vertical Templates Marketplace
	 *
	 * GTM-focused showcase of industry-specific templates.
	 * Zuhandenheit: The automation recedes. What remains is the outcome.
	 *
	 * Each template features baked-in WORKWAY workflows:
	 * - Law Firm: Consultation booking → Clio
	 * - Medical Practice: Patient intake → EHR
	 * - Professional Services: Client onboarding → CRM
	 * - Dental: Appointment scheduling → Practice Management
	 */

	import { SEO } from '@create-something/components';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	import {
		Scale,
		Stethoscope,
		Briefcase,
		Building2,
		Palette,
		UtensilsCrossed,
		Zap,
		Workflow,
		Check,
		ArrowRight
	} from 'lucide-svelte';

	interface TemplateWorkflow {
		name: string;
		outcome: string; // What disappears from to-do list
	}

	interface Template {
		id: string;
		slug: string;
		name: string;
		tagline: string;
		description: string;
		status: 'production' | 'development';
		icon: typeof Scale;
		workflows: TemplateWorkflow[];
		features: string[];
		previewUrl: string;
		demoUrl?: string;
	}

	const templates: Template[] = [
		{
			id: 'law-firm',
			slug: 'law-firm',
			name: 'Law Firm',
			tagline: 'Consultations that follow up on themselves',
			description:
				'Purpose-built for legal practices. Automated client intake, consultation booking, and appointment reminders. Ethics-compliant design with case results and attorney credentials.',
			status: 'production',
			icon: Scale,
			workflows: [
				{
					name: 'Consultation Booking',
					outcome: 'New client inquiries automatically create Clio matters'
				},
				{
					name: 'Appointment Reminders',
					outcome: 'Consultation confirmations sent 24 hours before meeting'
				},
				{
					name: 'Follow-up Automation',
					outcome: 'Post-consultation emails with next steps and retainer links'
				}
			],
			features: [
				'Ethics-compliant disclaimers',
				'Anonymous case results showcase',
				'Attorney credential displays',
				'Practice area categorization',
				'Structured data for local SEO',
				'Mobile-responsive intake forms'
			],
			previewUrl: 'https://law-firm-template.pages.dev',
			demoUrl: 'https://law-firm-demo.createsomething.space'
		},
		{
			id: 'medical-practice',
			slug: 'medical-practice',
			name: 'Medical Practice',
			tagline: 'Patient intake without the paperwork',
			description:
				'Healthcare-focused template with HIPAA-aware design. Patient intake forms, appointment scheduling, and automated insurance verification workflows.',
			status: 'production',
			icon: Stethoscope,
			workflows: [
				{
					name: 'Patient Intake',
					outcome: 'New patient forms auto-populate EHR systems'
				},
				{
					name: 'Appointment Scheduling',
					outcome: 'Availability syncs with practice management software'
				},
				{
					name: 'Insurance Verification',
					outcome: 'Coverage checks run automatically on new patient intake'
				}
			],
			features: [
				'HIPAA-aware form handling',
				'Provider credential displays',
				'Service categorization',
				'Insurance partner listings',
				'Accessibility (WCAG AA)',
				'Multi-language support options'
			],
			previewUrl: 'https://medical-practice-template.pages.dev'
		},
		{
			id: 'professional-services',
			slug: 'professional-services',
			name: 'Professional Services',
			tagline: 'Client onboarding that runs itself',
			description:
				'For consultancies, agencies, and B2B service providers. Automated proposal generation, client onboarding sequences, and project kickoff workflows.',
			status: 'production',
			icon: Briefcase,
			workflows: [
				{
					name: 'Lead Qualification',
					outcome: 'Discovery calls auto-scheduled based on budget and scope'
				},
				{
					name: 'Proposal Automation',
					outcome: 'Scoping forms generate customized proposals in minutes'
				},
				{
					name: 'Client Onboarding',
					outcome: 'Signed contracts trigger project setup and kickoff sequences'
				}
			],
			features: [
				'Portfolio case studies',
				'Service tier presentation',
				'Team credential displays',
				'Client testimonials',
				'ROI calculators',
				'White-label options'
			],
			previewUrl: 'https://professional-services-template.pages.dev'
		},
		{
			id: 'architecture-studio',
			slug: 'architecture-studio',
			name: 'Architecture Studio',
			tagline: 'Project inquiries that pre-qualify themselves',
			description:
				'Editorial-style template for architecture and design firms. Portfolio showcases, project inquiry forms, and automated scope assessment workflows.',
			status: 'development',
			icon: Building2,
			workflows: [
				{
					name: 'Project Inquiry',
					outcome: 'Initial consultations scheduled based on project scope'
				},
				{
					name: 'Scope Assessment',
					outcome: 'Budget and timeline questions route to appropriate team member'
				}
			],
			features: [
				'Portfolio grid layouts',
				'Project categorization',
				'Team profiles',
				'Press and awards',
				'Full-screen imagery',
				'Minimal, editorial typography'
			],
			previewUrl: 'https://architecture-studio-template.pages.dev'
		},
		{
			id: 'creative-portfolio',
			slug: 'creative-portfolio',
			name: 'Creative Portfolio',
			tagline: 'Project requests that filter themselves',
			description:
				'Minimal portfolio for photographers, designers, and creative professionals. Work showcase with inquiry forms that pre-qualify project fit.',
			status: 'development',
			icon: Palette,
			workflows: [
				{
					name: 'Project Inquiry',
					outcome: 'Budget and timeline questions route serious inquiries'
				}
			],
			features: [
				'Gallery layouts',
				'Project categorization',
				'About and bio',
				'Client list',
				'Contact forms',
				'Image optimization'
			],
			previewUrl: 'https://creative-portfolio-template.pages.dev'
		},
		{
			id: 'restaurant',
			slug: 'restaurant',
			name: 'Restaurant',
			tagline: 'Reservations without the phone tag',
			description:
				'Hospitality-focused template for restaurants, cafes, and food service. Online reservations, event booking, and catering inquiry automation.',
			status: 'development',
			icon: UtensilsCrossed,
			workflows: [
				{
					name: 'Reservation Booking',
					outcome: 'Table availability syncs with reservation system'
				}
			],
			features: [
				'Menu displays',
				'Reservation forms',
				'Hours and location',
				'Photo galleries',
				'Event booking',
				'Catering inquiries'
			],
			previewUrl: 'https://restaurant-template.pages.dev'
		}
	];

	const productionTemplates = templates.filter((t) => t.status === 'production');
	const developmentTemplates = templates.filter((t) => t.status === 'development');
</script>

<svelte:head>
	<title>Vertical Templates Marketplace - Industry Websites with Built-in Automation</title>
	<meta
		name="description"
		content="Production-ready website templates for law firms, medical practices, professional services, and more. Each template includes automated workflows powered by WORKWAY. Deploy to Cloudflare in minutes."
	/>
	<meta
		name="keywords"
		content="industry website templates, vertical saas templates, law firm website template, medical practice website, professional services website, automated client intake, consultation booking automation, cloudflare templates, workflow automation, workway templates"
	/>
	{#if data.structuredData}
		{@html `<script type="application/ld+json">${JSON.stringify(data.structuredData)}</script>`}
	{/if}
</svelte:head>

<SEO
	title="Vertical Templates Marketplace - Industry Websites with Built-in Automation"
	description="Production-ready website templates for law firms, medical practices, professional services, and more. Each template includes automated workflows powered by WORKWAY. Deploy to Cloudflare in minutes."
	keywords="industry website templates, vertical saas templates, law firm website template, medical practice website, professional services website, automated client intake, consultation booking automation, cloudflare templates, workflow automation, workway templates"
	ogImage="/og-templates.jpg"
	propertyName="agency"
/>

<!-- Hero Section -->
<section class="hero">
	<div class="hero-content">
		<div class="hero-badge">
			<Workflow size={16} strokeWidth={2} />
			<span>Powered by WORKWAY</span>
		</div>
		<h1 class="hero-title">Industry Templates with Automation Baked In</h1>
		<p class="hero-subtitle">
			Not just templates. Complete systems. Deploy a professional website and get automated client
			intake, appointment scheduling, and follow-up workflows on day one.
		</p>
		<div class="hero-stats">
			<div class="stat">
				<span class="stat-value">6</span>
				<span class="stat-label">Industry Templates</span>
			</div>
			<div class="stat">
				<span class="stat-value">15+</span>
				<span class="stat-label">Automation Workflows</span>
			</div>
			<div class="stat">
				<span class="stat-value">&lt;100ms</span>
				<span class="stat-label">Global Response Time</span>
			</div>
		</div>
	</div>
</section>

<!-- Production Templates -->
<section class="templates-section">
	<div class="section-header">
		<h2 class="section-title">Production Ready</h2>
		<p class="section-subtitle">
			Deploy today. These templates are live in production with real businesses.
		</p>
	</div>

	<div class="templates-grid">
		{#each productionTemplates as template}
			<article class="template-card production">
				<div class="template-header">
					<div class="template-icon">
						{@const Icon = template.icon}
						<Icon size={28} strokeWidth={1.5} />
					</div>
					<div class="template-meta">
						<h3 class="template-name">{template.name}</h3>
						<p class="template-tagline">{template.tagline}</p>
					</div>
					<span class="status-badge production">PROD</span>
				</div>

				<p class="template-description">{template.description}</p>

				<!-- WORKWAY Workflows -->
				<div class="workflows-section">
					<div class="workflows-header">
						<Zap size={16} strokeWidth={2} />
						<span>Automated Workflows</span>
					</div>
					<ul class="workflows-list">
						{#each template.workflows as workflow}
							<li class="workflow-item">
								<Check size={14} strokeWidth={2.5} class="workflow-check" />
								<div class="workflow-content">
									<strong>{workflow.name}:</strong>
									{workflow.outcome}
								</div>
							</li>
						{/each}
					</ul>
				</div>

				<!-- Features -->
				<div class="features-section">
					<div class="features-grid">
						{#each template.features as feature}
							<span class="feature-tag">{feature}</span>
						{/each}
					</div>
				</div>

				<!-- Actions -->
				<div class="template-actions">
					<a href={template.previewUrl} class="btn btn-secondary" target="_blank" rel="noopener">
						Preview Template
					</a>
					<a href="/products/vertical-templates/configure?template={template.slug}" class="btn btn-primary">
						Deploy Now
						<ArrowRight size={16} strokeWidth={2} />
					</a>
				</div>
			</article>
		{/each}
	</div>
</section>

<!-- Development Templates -->
<section class="templates-section development">
	<div class="section-header">
		<h2 class="section-title">Coming Soon</h2>
		<p class="section-subtitle">
			In development. Join the waitlist to get early access and shape the features.
		</p>
	</div>

	<div class="templates-grid">
		{#each developmentTemplates as template}
			<article class="template-card development">
				<div class="template-header">
					<div class="template-icon muted">
						{@const Icon = template.icon}
						<Icon size={28} strokeWidth={1.5} />
					</div>
					<div class="template-meta">
						<h3 class="template-name">{template.name}</h3>
						<p class="template-tagline">{template.tagline}</p>
					</div>
					<span class="status-badge development">DEV</span>
				</div>

				<p class="template-description">{template.description}</p>

				<!-- Features -->
				<div class="features-section">
					<div class="features-grid">
						{#each template.features.slice(0, 4) as feature}
							<span class="feature-tag">{feature}</span>
						{/each}
					</div>
				</div>

				<!-- Actions -->
				<div class="template-actions">
					<a href={template.previewUrl} class="btn btn-secondary" target="_blank" rel="noopener">
						Preview
					</a>
					<a href="/contact?subject=Waitlist:{template.name}" class="btn btn-outline">
						Join Waitlist
					</a>
				</div>
			</article>
		{/each}
	</div>
</section>

<!-- What Makes These Different -->
<section class="value-prop">
	<div class="value-content">
		<h2 class="value-title">Not Just Templates. Complete Systems.</h2>
		<p class="value-subtitle">
			Most templates give you a design. These give you outcomes.
		</p>

		<div class="value-grid">
			<div class="value-item">
				<div class="value-icon">
					<Workflow size={24} strokeWidth={1.5} />
				</div>
				<h3 class="value-heading">Automation Included</h3>
				<p class="value-text">
					Every template includes WORKWAY workflows. Client intake forms auto-create records in
					your CRM. Appointments send reminders. Follow-ups happen automatically.
				</p>
			</div>

			<div class="value-item">
				<div class="value-icon">
					<Zap size={24} strokeWidth={1.5} />
				</div>
				<h3 class="value-heading">Cloudflare Edge</h3>
				<p class="value-text">
					Sub-100ms response times globally. No servers to manage. Built on Cloudflare Pages,
					Workers, and D1. Scales automatically. Free SSL and DDoS protection included.
				</p>
			</div>

			<div class="value-item">
				<div class="value-icon">
					<Check size={24} strokeWidth={1.5} />
				</div>
				<h3 class="value-heading">Industry-Specific</h3>
				<p class="value-text">
					Not generic templates adapted for your industry. Purpose-built for law, healthcare,
					consulting. Includes compliance considerations, required disclaimers, and industry best
					practices.
				</p>
			</div>
		</div>
	</div>
</section>

<!-- Pricing CTA -->
<section class="pricing-cta">
	<div class="pricing-content">
		<h2 class="pricing-title">Simple, Transparent Pricing</h2>
		<p class="pricing-subtitle">Free to deploy. Pay only when you're ready to go live.</p>

		<div class="pricing-tiers">
			<div class="tier">
				<div class="tier-header">
					<h3 class="tier-name">Solo</h3>
					<div class="tier-price">
						<span class="price-amount">$29</span>
						<span class="price-period">/month</span>
					</div>
				</div>
				<ul class="tier-features">
					<li>1 site with custom domain</li>
					<li>1,000 leads/month</li>
					<li>Built-in analytics</li>
					<li>All WORKWAY workflows</li>
					<li>Email support</li>
				</ul>
				<a href="/products/vertical-templates/configure" class="tier-cta btn-outline">
					Get Started
				</a>
			</div>

			<div class="tier featured">
				<div class="tier-badge">Most Popular</div>
				<div class="tier-header">
					<h3 class="tier-name">Team</h3>
					<div class="tier-price">
						<span class="price-amount">$79</span>
						<span class="price-period">/month</span>
					</div>
				</div>
				<ul class="tier-features">
					<li>5 sites with custom domains</li>
					<li>Unlimited leads</li>
					<li>White-label branding</li>
					<li>API access</li>
					<li>All WORKWAY workflows</li>
					<li>Priority support</li>
				</ul>
				<a href="/products/vertical-templates/configure" class="tier-cta btn-primary">
					Get Started
				</a>
			</div>
		</div>

		<p class="pricing-note">
			Need custom workflows or enterprise features? <a href="/contact">Talk to us</a> about consulting
			engagements.
		</p>
	</div>
</section>

<style>
	/* Hero */
	.hero {
		padding: var(--space-2xl) var(--space-lg);
		background: #000000;
		border-bottom: 1px solid var(--color-border-default);
	}

	.hero-content {
		max-width: 800px;
		margin: 0 auto;
		text-align: center;
	}

	.hero-badge {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-full);
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-lg);
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
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-xl);
	}

	.hero-stats {
		display: flex;
		justify-content: center;
		gap: var(--space-2xl);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
	}

	.stat-value {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
	}

	.stat-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* Templates Section */
	.templates-section {
		padding: var(--space-2xl) var(--space-lg);
		background: #000000;
	}

	.templates-section.development {
		background: var(--color-bg-subtle);
		border-top: 1px solid var(--color-border-default);
	}

	.section-header {
		max-width: 1200px;
		margin: 0 auto var(--space-xl);
		text-align: center;
	}

	.section-title {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.section-subtitle {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}

	.templates-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
		gap: var(--space-lg);
		max-width: 1200px;
		margin: 0 auto;
	}

	/* Template Card */
	.template-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		transition:
			border-color var(--duration-micro) var(--ease-standard),
			background var(--duration-micro) var(--ease-standard);
	}

	.template-card:hover {
		border-color: var(--color-border-emphasis);
	}

	.template-card.production {
		border-left: 3px solid var(--color-success);
	}

	.template-header {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: var(--space-md);
		align-items: start;
	}

	.template-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
	}

	.template-icon.muted {
		color: var(--color-fg-muted);
	}

	.template-meta {
		min-width: 0;
	}

	.template-name {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.template-tagline {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		font-style: italic;
	}

	.status-badge {
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
		padding: 2px var(--space-xs);
		border-radius: var(--radius-sm);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.status-badge.production {
		background: var(--color-success-muted);
		color: var(--color-success);
	}

	.status-badge.development {
		background: var(--color-bg-subtle);
		color: var(--color-fg-muted);
	}

	.template-description {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
	}

	/* Workflows */
	.workflows-section {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-md);
	}

	.workflows-header {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-sm);
	}

	.workflows-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.workflow-item {
		display: flex;
		gap: var(--space-sm);
		align-items: start;
	}

	.workflow-item :global(.workflow-check) {
		flex-shrink: 0;
		margin-top: 2px;
		color: var(--color-success);
	}

	.workflow-content {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
	}

	.workflow-content strong {
		color: var(--color-fg-secondary);
	}

	/* Features */
	.features-section {
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
	}

	.features-grid {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}

	.feature-tag {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		background: var(--color-bg-subtle);
		padding: 2px var(--space-xs);
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border-default);
	}

	/* Actions */
	.template-actions {
		display: flex;
		gap: var(--space-sm);
		margin-top: auto;
		padding-top: var(--space-sm);
	}

	/* Buttons */
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-xs);
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
		cursor: pointer;
		border: 1px solid transparent;
	}

	.btn-primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-color: var(--color-fg-primary);
	}

	.btn-primary:hover {
		opacity: 0.9;
	}

	.btn-secondary {
		background: var(--color-bg-elevated);
		color: var(--color-fg-secondary);
		border-color: var(--color-border-default);
	}

	.btn-secondary:hover {
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	.btn-outline {
		background: transparent;
		color: var(--color-fg-secondary);
		border-color: var(--color-border-default);
	}

	.btn-outline:hover {
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	/* Value Prop */
	.value-prop {
		padding: var(--space-2xl) var(--space-lg);
		background: #000000;
		border-top: 1px solid var(--color-border-default);
	}

	.value-content {
		max-width: 1000px;
		margin: 0 auto;
		text-align: center;
	}

	.value-title {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.value-subtitle {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xl);
	}

	.value-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-xl);
		text-align: left;
	}

	.value-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.value-icon {
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
	}

	.value-heading {
		font-size: var(--text-h4);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.value-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
	}

	/* Pricing CTA */
	.pricing-cta {
		padding: var(--space-2xl) var(--space-lg);
		background: var(--color-bg-elevated);
		border-top: 1px solid var(--color-border-default);
	}

	.pricing-content {
		max-width: 900px;
		margin: 0 auto;
		text-align: center;
	}

	.pricing-title {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.pricing-subtitle {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xl);
	}

	.pricing-tiers {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-lg);
		margin-bottom: var(--space-lg);
	}

	.tier {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		text-align: left;
		position: relative;
	}

	.tier.featured {
		border-color: var(--color-fg-primary);
		border-width: 2px;
	}

	.tier-badge {
		position: absolute;
		top: -12px;
		left: 50%;
		transform: translateX(-50%);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		padding: 2px var(--space-sm);
		border-radius: var(--radius-full);
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.tier-header {
		padding-bottom: var(--space-md);
		border-bottom: 1px solid var(--color-border-default);
	}

	.tier-name {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.tier-price {
		display: flex;
		align-items: baseline;
		gap: var(--space-xs);
	}

	.price-amount {
		font-size: var(--text-display);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
	}

	.price-period {
		font-size: var(--text-body);
		color: var(--color-fg-muted);
	}

	.tier-features {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		flex: 1;
	}

	.tier-features li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		padding-left: var(--space-md);
		position: relative;
	}

	.tier-features li::before {
		content: '•';
		position: absolute;
		left: 0;
		color: var(--color-fg-muted);
	}

	.tier-cta {
		width: 100%;
		padding: var(--space-sm) var(--space-md);
	}

	.pricing-note {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.pricing-note a {
		color: var(--color-fg-secondary);
		text-decoration: underline;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.pricing-note a:hover {
		color: var(--color-fg-primary);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.hero-title {
			font-size: var(--text-h1);
		}

		.hero-stats {
			flex-direction: column;
			gap: var(--space-md);
		}

		.templates-grid {
			grid-template-columns: 1fr;
		}

		.value-grid {
			grid-template-columns: 1fr;
		}

		.pricing-tiers {
			grid-template-columns: 1fr;
		}

		.template-actions {
			flex-direction: column;
		}

		.btn {
			width: 100%;
		}
	}
</style>
