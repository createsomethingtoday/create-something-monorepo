<script lang="ts">
	/**
	 * Medical Practice Template Landing Page
	 *
	 * GTM: Medical-specific vertical template landing page
	 * Outcome-focused: "Care that starts with a conversation"
	 * HIPAA-ready architecture with honest disclaimers
	 */

	import { SEO } from '@create-something/components';
	import type { PageData } from './$types';
	import {
		Stethoscope,
		Calendar,
		FileText,
		Video,
		Shield,
		Zap,
		Check,
		ArrowRight,
		Clock,
		Users,
		Star,
		ChevronDown,
		Activity,
		Heart
	} from 'lucide-svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const workflows = [
		{
			name: 'Patient Scheduling',
			description: 'Real-time availability with EHR sync',
			outcome: 'Patients book online, records update automatically',
			icon: Calendar
		},
		{
			name: 'Intake Automation',
			description: 'Digital forms pre-populate patient records',
			outcome: 'Medical history captured before the visit',
			icon: FileText
		},
		{
			name: 'Telehealth Ready',
			description: 'Secure video consultations built-in',
			outcome: 'Follow-ups happen without office visits',
			icon: Video
		},
		{
			name: 'Care Coordination',
			description: 'Automated follow-up and referral workflows',
			outcome: 'Nothing falls through the cracks',
			icon: Heart
		}
	];

	const features = [
		'HIPAA-conscious form handling',
		'Physician credentials display',
		'Real-time availability badges',
		'Patient satisfaction metrics',
		'Service descriptions',
		'Insurance information',
		'Multi-specialty support',
		'Clinical outcomes tracking',
		'ADA accessibility (WCAG AA)',
		'Multi-location support',
		'Secure messaging portal',
		'Appointment reminders'
	];

	const faqs = [
		{
			question: 'How do I create a medical practice website?',
			answer:
				'Deploy this template to Cloudflare Pages in minutes. Configure your practice details, add physician profiles with credentials, and connect your scheduling system. The template includes all pages a medical practice needs: services, team, outcomes, and patient contact. WORKWAY workflows handle appointment and follow-up automation from day one.'
		},
		{
			question: 'Is this template HIPAA compliant?',
			answer:
				'This template is designed with HIPAA-conscious architecture: encrypted data transmission (TLS 1.3), encrypted storage (Cloudflare D1/R2), and secure session management. However, HIPAA compliance requires additional configuration, Business Associate Agreements with service providers, Cloudflare Enterprise plan, and ongoing monitoring. See our HIPAA compliance guide for details.'
		},
		{
			question: 'What EHR systems does this integrate with?',
			answer:
				'The Pro tier includes webhook integrations for common EHR systems. Enterprise tier supports custom integrations with Epic, Cerner, Athenahealth, and other systems via FHIR APIs or custom connectors built by our team.'
		},
		{
			question: 'Can patients book appointments online?',
			answer:
				'Yes. The template displays real-time physician availability with status badges (Today, Tomorrow, etc.). Patients select appointment type, choose available time slots, and receive instant confirmation. Appointments automatically sync with your practice management system.'
		},
		{
			question: 'How does the patient satisfaction tracking work?',
			answer:
				'The template includes Tufte-style sparkline visualizations showing rolling satisfaction scores. Data can be pulled from your patient survey system via API or manually updated. The visual display builds trust by showing consistent care quality over time.'
		},
		{
			question: 'What about telehealth consultations?',
			answer:
				'The template includes secure video consultation capability via integration with telehealth platforms. Patients can schedule virtual visits, receive secure links, and complete follow-ups without office visits. All sessions are logged for compliance.'
		}
	];

	let expandedFaq = $state<number | null>(null);

	function toggleFaq(index: number) {
		expandedFaq = expandedFaq === index ? null : index;
	}
</script>

<svelte:head>
	<title>Medical Practice Website Template - Care That Starts with a Conversation | CREATE SOMETHING</title>
	<meta
		name="description"
		content="HIPAA-conscious medical practice website template with Tufte-inspired design, real-time physician availability, patient satisfaction tracking, and automated care coordination."
	/>
	<meta
		name="keywords"
		content="medical practice website template, doctor website builder, clinic website template, healthcare website, physician website template, HIPAA compliant website, patient portal template, medical appointment scheduling, EHR integration, telehealth website"
	/>

	<meta property="og:type" content="website" />
	<meta property="og:title" content="Medical Practice Website Template - Care That Starts with a Conversation" />
	<meta
		property="og:description"
		content="HIPAA-conscious medical practice website with Tufte-inspired design and automated care coordination."
	/>
	<meta property="og:image" content="https://createsomething.agency/og-templates-medical.jpg" />

	{#if data.structuredData}
		{@html `<script type="application/ld+json">${JSON.stringify(data.structuredData.softwareApplication)}</script>`}
		{@html `<script type="application/ld+json">${JSON.stringify(data.structuredData.faqPage)}</script>`}
	{/if}
</svelte:head>

<SEO
	title="Medical Practice Website Template - Care That Starts with a Conversation | CREATE SOMETHING"
	description="HIPAA-conscious medical practice website template with Tufte-inspired design, real-time physician availability, patient satisfaction tracking, and automated care coordination."
	keywords="medical practice website template, doctor website builder, clinic website template, healthcare website, physician website template, HIPAA compliant website"
	ogImage="/og-templates-medical.jpg"
	propertyName="agency"
/>

<!-- Hero Section -->
<section class="hero">
	<div class="hero-content">
		<div class="hero-badge">
			<Stethoscope size={16} strokeWidth={2} />
			<span>Medical Practice Template</span>
		</div>
		<h1 class="hero-title">Care That Starts with a Conversation</h1>
		<p class="hero-subtitle">
			HIPAA-conscious medical practice website with Tufte-inspired design. Real-time physician
			availability, patient satisfaction tracking, and automated care coordination. Your patients
			book online. Your EHR updates automatically.
		</p>
		<div class="hero-actions">
			<a href="#preview" class="btn btn-primary">
				See Live Preview
				<ArrowRight size={16} strokeWidth={2} />
			</a>
			<a href="/products/vertical-templates/configure?template=medical-practice" class="btn btn-outline">
				Deploy Now
			</a>
		</div>

		<div class="social-proof">
			<div class="stat">
				<Shield size={16} strokeWidth={2} />
				<span>HIPAA-Conscious Architecture</span>
			</div>
			<div class="stat">
				<Clock size={16} strokeWidth={2} />
				<span>Deploy in &lt;15 minutes</span>
			</div>
			<div class="stat">
				<Activity size={16} strokeWidth={2} />
				<span>Tufte-Inspired Data Design</span>
			</div>
		</div>
	</div>
</section>

<!-- Live Preview Section -->
<section id="preview" class="preview-section">
	<div class="preview-header">
		<h2 class="section-title">Live Preview</h2>
		<p class="section-subtitle">
			Tufte-inspired design that builds trust through data transparency.
		</p>
		<a
			href="https://medical-practice-template.pages.dev"
			target="_blank"
			rel="noopener"
			class="preview-link"
		>
			Open in new tab
			<ArrowRight size={14} strokeWidth={2} />
		</a>
	</div>
	<div class="preview-container">
		<div class="preview-browser">
			<div class="browser-bar">
				<div class="browser-dots">
					<span class="dot"></span>
					<span class="dot"></span>
					<span class="dot"></span>
				</div>
				<div class="browser-url">medical-practice-template.pages.dev</div>
			</div>
			<iframe
				src="https://medical-practice-template.pages.dev"
				title="Medical Practice Template Preview"
				class="preview-iframe"
				loading="lazy"
			></iframe>
		</div>
	</div>
</section>

<!-- Workflows Section -->
<section id="workflows" class="workflows-section">
	<div class="section-header">
		<h2 class="section-title">Built-in Care Coordination</h2>
		<p class="section-subtitle">
			Most medical websites are brochures. This is a system. Every workflow connects to your EHR.
		</p>
	</div>

	<div class="workflows-grid">
		{#each workflows as workflow}
			{@const Icon = workflow.icon}
			<article class="workflow-card">
				<div class="workflow-icon">
					<Icon size={32} strokeWidth={1.5} />
				</div>
				<h3 class="workflow-name">{workflow.name}</h3>
				<p class="workflow-description">{workflow.description}</p>
				<div class="workflow-outcome">
					<strong><Zap size={14} strokeWidth={2} class="outcome-icon" /> Outcome:</strong>
					<span>{workflow.outcome}</span>
				</div>
			</article>
		{/each}
	</div>

	<div class="hipaa-notice">
		<Shield size={20} strokeWidth={2} />
		<div class="notice-content">
			<strong>HIPAA-Ready Architecture</strong>
			<p>
				This template uses encrypted data transmission (TLS 1.3), encrypted storage (Cloudflare
				D1/R2), and secure session management. Full HIPAA compliance requires additional
				configuration and Business Associate Agreements. See our
				<a href="#hipaa-compliance">HIPAA compliance guide</a> below.
			</p>
		</div>
	</div>
</section>

<!-- Features Grid -->
<section class="features-section">
	<div class="section-header">
		<h2 class="section-title">Everything a Medical Practice Needs</h2>
		<p class="section-subtitle">
			Not a generic website adapted for healthcare. Purpose-built for medical practices.
		</p>
	</div>

	<div class="features-grid">
		{#each features as feature}
			<div class="feature-item">
				<Check size={16} strokeWidth={2.5} class="feature-check" />
				<span>{feature}</span>
			</div>
		{/each}
	</div>
</section>

<!-- Differentiation -->
<section class="differentiation">
	<div class="diff-content">
		<h2 class="diff-title">Why This Template is Different</h2>
		<div class="comparison-grid">
			<div class="comparison-card traditional">
				<h3 class="comparison-title">Traditional Medical Websites</h3>
				<ul class="comparison-list">
					<li>Patients call to schedule appointments</li>
					<li>Staff manually enter patient information</li>
					<li>Paper intake forms in waiting room</li>
					<li>No visibility into physician availability</li>
					<li>Staff coordinate follow-ups manually</li>
					<li>Generic design that doesn't build trust</li>
				</ul>
				<div class="comparison-label">Staff time-intensive</div>
			</div>

			<div class="comparison-card automated">
				<h3 class="comparison-title">This Template (WORKWAY Automated)</h3>
				<ul class="comparison-list">
					<li>Patients book online with real-time availability</li>
					<li>Patient data flows directly to EHR</li>
					<li>Digital intake forms completed before arrival</li>
					<li>Live availability badges show next openings</li>
					<li>Automated follow-up and referral workflows</li>
					<li>Tufte design with satisfaction metrics builds trust</li>
				</ul>
				<div class="comparison-label highlighted">Tool recedes, outcome remains</div>
			</div>
		</div>
	</div>
</section>

<!-- Pricing Tiers -->
<section class="pricing-section">
	<div class="section-header">
		<h2 class="section-title">Simple, Transparent Pricing</h2>
		<p class="section-subtitle">Deploy for free. Upgrade when you're ready for automation.</p>
	</div>

	<div class="pricing-grid">
		<div class="tier">
			<div class="tier-header">
				<h3 class="tier-name">Free</h3>
				<div class="tier-price">
					<span class="price-amount">$0</span>
					<span class="price-period">/month</span>
				</div>
			</div>
			<ul class="tier-features">
				<li>Complete medical website</li>
				<li>Tufte-inspired design</li>
				<li>SEO & structured data</li>
				<li>Mobile responsive</li>
				<li>Contact forms</li>
				<li>HIPAA-conscious architecture</li>
			</ul>
			<a href="/products/vertical-templates/configure?template=medical-practice" class="tier-cta">
				Deploy Free
			</a>
		</div>

		<div class="tier featured">
			<div class="tier-badge">Most Popular</div>
			<div class="tier-header">
				<h3 class="tier-name">Pro</h3>
				<div class="tier-price">
					<span class="price-amount">$149</span>
					<span class="price-period">/month</span>
				</div>
			</div>
			<ul class="tier-features">
				<li>Everything in Free</li>
				<li>4 active WORKWAY workflows</li>
				<li>Calendar integration</li>
				<li>Automated appointment reminders</li>
				<li>Patient intake automation</li>
				<li>Care coordination workflows</li>
				<li>EHR webhook integration</li>
				<li>Custom domain setup</li>
				<li>Email support</li>
			</ul>
			<a
				href="/products/vertical-templates/configure?template=medical-practice&tier=pro"
				class="tier-cta btn-primary"
			>
				Start Pro Trial
			</a>
		</div>

		<div class="tier">
			<div class="tier-header">
				<h3 class="tier-name">Enterprise</h3>
				<div class="tier-price">
					<span class="price-amount">Custom</span>
				</div>
			</div>
			<ul class="tier-features">
				<li>Everything in Pro</li>
				<li>Unlimited WORKWAY workflows</li>
				<li>Custom EHR integrations (Epic, Cerner)</li>
				<li>Multi-location support</li>
				<li>White-label branding</li>
				<li>Priority support</li>
				<li>Done-for-you setup</li>
				<li>HIPAA compliance consultation</li>
			</ul>
			<a href="/contact?subject=Enterprise:Medical" class="tier-cta">Contact Sales</a>
		</div>
	</div>
</section>

<!-- HIPAA Compliance Section -->
<section id="hipaa-compliance" class="hipaa-section">
	<div class="hipaa-content">
		<div class="hipaa-header">
			<Shield size={48} strokeWidth={1.5} />
			<h2 class="section-title">HIPAA Compliance: Honest Answers</h2>
			<p class="section-subtitle">
				We build HIPAA-conscious architecture. You're responsible for full compliance.
			</p>
		</div>

		<div class="hipaa-grid">
			<div class="hipaa-card included">
				<h3 class="hipaa-card-title">What's Included</h3>
				<ul class="hipaa-list">
					<li><Check size={16} strokeWidth={2.5} /> Encrypted data transmission (TLS 1.3)</li>
					<li><Check size={16} strokeWidth={2.5} /> Encrypted data storage (D1, R2)</li>
					<li><Check size={16} strokeWidth={2.5} /> Secure session management</li>
					<li><Check size={16} strokeWidth={2.5} /> Audit logging capabilities</li>
					<li><Check size={16} strokeWidth={2.5} /> HTTPS-only architecture</li>
					<li><Check size={16} strokeWidth={2.5} /> HIPAA compliance documentation</li>
				</ul>
			</div>

			<div class="hipaa-card required">
				<h3 class="hipaa-card-title">Your Responsibilities</h3>
				<ul class="hipaa-list responsibilities">
					<li>Business Associate Agreements with service providers</li>
					<li>Cloudflare Enterprise plan (required for BAA)</li>
					<li>Annual security risk assessment</li>
					<li>Staff HIPAA training</li>
					<li>Incident response plan</li>
					<li>Consulting with healthcare compliance experts</li>
				</ul>
			</div>
		</div>

		<div class="hipaa-footer">
			<p>
				<strong>Disclaimer:</strong> This template is designed with HIPAA-conscious architecture but
				does not guarantee compliance. Deployers are responsible for conducting security assessments,
				obtaining Business Associate Agreements, and consulting with healthcare compliance experts.
			</p>
			<a
				href="https://github.com/createsomething/vertical-templates/blob/main/medical-practice/HIPAA_COMPLIANCE.md"
				class="hipaa-guide-link"
			>
				Read Full HIPAA Compliance Guide
				<ArrowRight size={16} strokeWidth={2} />
			</a>
		</div>
	</div>
</section>

<!-- FAQ Section -->
<section class="faq-section">
	<div class="section-header">
		<h2 class="section-title">Frequently Asked Questions</h2>
	</div>

	<div class="faq-list">
		{#each faqs as faq, index}
			<div class="faq-item" class:expanded={expandedFaq === index}>
				<button class="faq-question" onclick={() => toggleFaq(index)}>
					<span>{faq.question}</span>
					<ChevronDown size={20} strokeWidth={2} class="faq-icon" />
				</button>
				{#if expandedFaq === index}
					<div class="faq-answer">
						<p>{faq.answer}</p>
					</div>
				{/if}
			</div>
		{/each}
	</div>
</section>

<!-- CTA Section -->
<section class="cta-section">
	<div class="cta-content">
		<h2 class="cta-title">Deploy Your Medical Practice Website Today</h2>
		<p class="cta-subtitle">
			Free tier includes everything you need. Upgrade to Pro when you're ready for automation.
		</p>
		<div class="cta-actions">
			<a
				href="/products/vertical-templates/configure?template=medical-practice"
				class="btn btn-primary btn-lg"
			>
				Deploy Free Template
				<ArrowRight size={18} strokeWidth={2} />
			</a>
			<a href="/contact?subject=Medical:Demo" class="btn btn-outline btn-lg">
				Schedule Demo
			</a>
		</div>
	</div>
</section>

<style>
	/* Hero */
	.hero {
		padding: var(--space-2xl) var(--space-lg);
		background: var(--color-bg-pure, #000000);
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
		margin-bottom: var(--space-md);
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

	.hero-actions {
		display: flex;
		justify-content: center;
		gap: var(--space-md);
		margin-bottom: var(--space-xl);
	}

	.social-proof {
		display: flex;
		justify-content: center;
		gap: var(--space-xl);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
		flex-wrap: wrap;
	}

	.stat {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	/* Live Preview Section */
	.preview-section {
		padding: var(--space-2xl) var(--space-lg);
		background: var(--color-bg-subtle);
	}

	.preview-header {
		max-width: 800px;
		margin: 0 auto var(--space-xl);
		text-align: center;
	}

	.preview-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		text-decoration: underline;
		margin-top: var(--space-sm);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.preview-link:hover {
		color: var(--color-fg-primary);
	}

	.preview-container {
		max-width: 1200px;
		margin: 0 auto;
	}

	.preview-browser {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
	}

	.browser-bar {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-elevated);
		border-bottom: 1px solid var(--color-border-default);
	}

	.browser-dots {
		display: flex;
		gap: 6px;
	}

	.dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--color-border-emphasis);
	}

	.dot:first-child {
		background: #ff5f57;
	}

	.dot:nth-child(2) {
		background: #febc2e;
	}

	.dot:nth-child(3) {
		background: #28c840;
	}

	.browser-url {
		flex: 1;
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-family: var(--font-mono);
	}

	.preview-iframe {
		width: 100%;
		height: 700px;
		border: none;
		background: #fdfdfb;
	}

	/* Workflows Section */
	.workflows-section {
		padding: var(--space-2xl) var(--space-lg);
		background: var(--color-bg-pure);
	}

	.section-header {
		max-width: 800px;
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

	.workflows-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-md);
		max-width: 1200px;
		margin: 0 auto var(--space-xl);
	}

	.workflow-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.workflow-icon {
		width: 56px;
		height: 56px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.workflow-name {
		font-size: var(--text-h4);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.workflow-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	.workflow-outcome {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		padding: var(--space-sm);
		background: var(--color-bg-elevated);
		border-radius: var(--radius-sm);
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-top: auto;
	}

	.workflow-outcome :global(.outcome-icon) {
		flex-shrink: 0;
		color: var(--color-success);
	}

	.workflow-outcome strong {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		color: var(--color-fg-secondary);
	}

	/* HIPAA Notice */
	.hipaa-notice {
		display: flex;
		gap: var(--space-md);
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-emphasis);
		border-left: 3px solid var(--color-fg-primary);
		border-radius: var(--radius-md);
		max-width: 1000px;
		margin: 0 auto;
	}

	.notice-content strong {
		display: block;
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.notice-content p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
		margin: 0;
	}

	.notice-content a {
		color: var(--color-fg-secondary);
		text-decoration: underline;
	}

	/* Features Section */
	.features-section {
		padding: var(--space-2xl) var(--space-lg);
		background: var(--color-bg-subtle);
	}

	.features-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--space-md);
		max-width: 1200px;
		margin: 0 auto;
	}

	.feature-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.feature-item :global(.feature-check) {
		flex-shrink: 0;
		color: var(--color-success);
	}

	/* Differentiation Section */
	.differentiation {
		padding: var(--space-2xl) var(--space-lg);
		background: var(--color-bg-pure);
	}

	.diff-content {
		max-width: 1200px;
		margin: 0 auto;
	}

	.diff-title {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		text-align: center;
		margin-bottom: var(--space-xl);
	}

	.comparison-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
		gap: var(--space-xl);
	}

	.comparison-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.comparison-card.automated {
		border-color: var(--color-fg-primary);
		border-width: 2px;
	}

	.comparison-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.comparison-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		flex: 1;
	}

	.comparison-list li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		padding-left: var(--space-md);
		position: relative;
		line-height: var(--leading-relaxed);
	}

	.comparison-list li::before {
		content: '•';
		position: absolute;
		left: 0;
		color: var(--color-fg-muted);
	}

	.comparison-label {
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-align: center;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.comparison-label.highlighted {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	/* Pricing Section */
	.pricing-section {
		padding: var(--space-2xl) var(--space-lg);
		background: var(--color-bg-subtle);
	}

	.pricing-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: var(--space-lg);
		max-width: 1200px;
		margin: 0 auto;
	}

	.tier {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
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
		line-height: var(--leading-relaxed);
	}

	.tier-features li::before {
		content: '✓';
		position: absolute;
		left: 0;
		color: var(--color-success);
		font-weight: var(--font-bold);
	}

	.tier-cta {
		display: block;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-elevated);
		color: var(--color-fg-secondary);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		text-align: center;
		text-decoration: none;
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.tier-cta:hover {
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	.tier-cta.btn-primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-color: var(--color-fg-primary);
	}

	.tier-cta.btn-primary:hover {
		opacity: 0.9;
	}

	/* HIPAA Section */
	.hipaa-section {
		padding: var(--space-2xl) var(--space-lg);
		background: var(--color-bg-pure);
	}

	.hipaa-content {
		max-width: 1000px;
		margin: 0 auto;
	}

	.hipaa-header {
		text-align: center;
		margin-bottom: var(--space-xl);
	}

	.hipaa-header :global(svg) {
		margin: 0 auto var(--space-md);
		color: var(--color-fg-primary);
	}

	.hipaa-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
		gap: var(--space-lg);
		margin-bottom: var(--space-xl);
	}

	.hipaa-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
	}

	.hipaa-card.included {
		border-left: 3px solid var(--color-success);
	}

	.hipaa-card.required {
		border-left: 3px solid var(--color-warning);
	}

	.hipaa-card-title {
		font-size: var(--text-h4);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
	}

	.hipaa-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.hipaa-list li {
		display: flex;
		align-items: start;
		gap: var(--space-sm);
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
	}

	.hipaa-list li :global(svg) {
		flex-shrink: 0;
		margin-top: 2px;
		color: var(--color-success);
	}

	.hipaa-list.responsibilities li {
		padding-left: var(--space-md);
		position: relative;
	}

	.hipaa-list.responsibilities li::before {
		content: '→';
		position: absolute;
		left: 0;
		color: var(--color-warning);
	}

	.hipaa-footer {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		text-align: center;
	}

	.hipaa-footer p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-md);
	}

	.hipaa-guide-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		color: var(--color-fg-secondary);
		text-decoration: underline;
		font-size: var(--text-body-sm);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.hipaa-guide-link:hover {
		color: var(--color-fg-primary);
	}

	/* FAQ Section */
	.faq-section {
		padding: var(--space-2xl) var(--space-lg);
		background: var(--color-bg-subtle);
	}

	.faq-list {
		max-width: 800px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.faq-item {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		overflow: hidden;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.faq-item.expanded {
		border-color: var(--color-border-emphasis);
	}

	.faq-question {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);
		padding: var(--space-md);
		background: transparent;
		border: none;
		text-align: left;
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
		cursor: pointer;
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.faq-question:hover {
		background: var(--color-bg-elevated);
	}

	.faq-question :global(.faq-icon) {
		flex-shrink: 0;
		transition: transform var(--duration-micro) var(--ease-standard);
		color: var(--color-fg-muted);
	}

	.faq-item.expanded .faq-question :global(.faq-icon) {
		transform: rotate(180deg);
	}

	.faq-answer {
		padding: 0 var(--space-md) var(--space-md);
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
	}

	.faq-answer p {
		margin: 0;
	}

	/* CTA Section */
	.cta-section {
		padding: var(--space-2xl) var(--space-lg);
		background: var(--color-bg-elevated);
		border-top: 1px solid var(--color-border-default);
	}

	.cta-content {
		max-width: 800px;
		margin: 0 auto;
		text-align: center;
	}

	.cta-title {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.cta-subtitle {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xl);
	}

	.cta-actions {
		display: flex;
		justify-content: center;
		gap: var(--space-md);
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

	.btn-lg {
		padding: var(--space-md) var(--space-lg);
		font-size: var(--text-body);
	}

	.btn-primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-color: var(--color-fg-primary);
	}

	.btn-primary:hover {
		opacity: 0.9;
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

	/* Responsive - Tablet */
	@media (max-width: 1024px) {
		.workflows-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	/* Responsive - Mobile */
	@media (max-width: 768px) {
		.hero-title {
			font-size: var(--text-h1);
		}

		.hero-actions {
			flex-direction: column;
			width: 100%;
		}

		.btn {
			width: 100%;
		}

		.social-proof {
			flex-direction: column;
			gap: var(--space-md);
		}

		.preview-iframe {
			height: 500px;
		}

		.browser-url {
			display: none;
		}

		.features-grid {
			grid-template-columns: 1fr;
		}

		.comparison-grid {
			grid-template-columns: 1fr;
		}

		.pricing-grid {
			grid-template-columns: 1fr;
		}

		.hipaa-grid {
			grid-template-columns: 1fr;
		}

		.cta-actions {
			flex-direction: column;
			width: 100%;
		}
	}

	/* Responsive - Small Mobile */
	@media (max-width: 480px) {
		.workflows-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
