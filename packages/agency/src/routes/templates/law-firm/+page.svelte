<script lang="ts">
	/**
	 * Law Firm Template Landing Page
	 *
	 * GTM: Law firm vertical template landing page
	 * Outcome-focused: "Redefine your legal presence"
	 * Ethics-compliant architecture with proper disclaimers
	 */

	import { SEO } from '@create-something/canon';
	import type { PageData } from './$types';
	import {
		Scale,
		Calendar,
		FileText,
		Users,
		Shield,
		Zap,
		Check,
		ArrowRight,
		Clock,
		Star,
		ChevronDown,
		Briefcase,
		Gavel
	} from 'lucide-svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const workflows = [
		{
			name: 'Client Intake',
			description: 'Digital intake flows to your practice management',
			outcome: 'New matters created automatically in Clio',
			icon: FileText
		},
		{
			name: 'Consultation Booking',
			description: 'Real-time availability with conflict checking',
			outcome: 'Clients book online, you stay in control',
			icon: Calendar
		},
		{
			name: 'Lead Qualification',
			description: 'Pre-screen inquiries before committing time',
			outcome: 'Focus on cases that fit your practice',
			icon: Users
		},
		{
			name: 'Follow-Up Automation',
			description: 'Nurture prospects who aren\'t ready yet',
			outcome: 'Convert more consultations to retained clients',
			icon: Briefcase
		}
	];

	const features = [
		'Bold editorial design',
		'Attorney credentials display',
		'Bar number verification',
		'Case results showcase',
		'Practice area pages',
		'Ethics disclaimers built-in',
		'Clio integration ready',
		'Multi-attorney support',
		'ADA accessibility (WCAG AA)',
		'Multi-location support',
		'Contact form automation',
		'Consultation booking'
	];

	const faqs = [
		{
			question: 'How do I create a law firm website?',
			answer:
				'Deploy this template to Cloudflare Pages in minutes. Add your firm details, attorney profiles with bar numbers, and practice areas. The template includes all pages a law firm needs: about, attorneys, practice areas, results, and contact. WORKWAY workflows handle client intake automation from day one.'
		},
		{
			question: 'Does this template comply with bar association ethics rules?',
			answer:
				'The template includes built-in ethics disclaimers, proper handling of case results (anonymized by default), and attorney bar number display. However, bar rules vary by jurisdiction. We recommend reviewing your state bar\'s advertising rules and consulting with your ethics counsel before launch.'
		},
		{
			question: 'What practice management integrations are available?',
			answer:
				'The Pro tier includes webhook integrations for Clio, MyCase, and PracticePanther. Contact form submissions automatically create matters/contacts in your practice management system. Enterprise tier supports custom integrations with any legal software via API.'
		},
		{
			question: 'Can clients book consultations online?',
			answer:
				'Yes. The template integrates with calendar systems to display availability. Clients select consultation type, choose available time slots, and receive instant confirmation. Appointments can automatically create intake records in your practice management system.'
		},
		{
			question: 'How are case results displayed?',
			answer:
				'Case results are displayed with ethics compliance in mind—client names are never shown unless you have explicit written consent. The template includes disclaimer text that prior results do not guarantee similar outcomes, as required by most bar associations.'
		},
		{
			question: 'Can I showcase multiple practice areas?',
			answer:
				'Yes. The template supports unlimited practice areas, each with its own dedicated page. Practice areas can be linked to specific attorneys, allowing potential clients to find the right expertise for their legal matter.'
		}
	];

	let expandedFaq = $state<number | null>(null);

	function toggleFaq(index: number) {
		expandedFaq = expandedFaq === index ? null : index;
	}
</script>

<svelte:head>
	<title>Law Firm Website Template - Redefine Your Legal Presence | CREATE SOMETHING</title>
	<meta
		name="description"
		content="Modern law firm website template with bold editorial design, client intake automation, practice management integration, and ethics-compliant architecture."
	/>
	<meta
		name="keywords"
		content="law firm website template, attorney website builder, legal website template, lawyer website design, law practice website, Clio integration, legal intake automation, bar compliant website"
	/>

	<meta property="og:type" content="website" />
	<meta property="og:title" content="Law Firm Website Template - Redefine Your Legal Presence" />
	<meta
		property="og:description"
		content="Modern law firm website with bold editorial design and automated client intake."
	/>
	<meta property="og:image" content="https://createsomething.agency/og-templates-law-firm.jpg" />

	{#if data.structuredData}
		{@html `<script type="application/ld+json">${JSON.stringify(data.structuredData.softwareApplication)}</script>`}
		{@html `<script type="application/ld+json">${JSON.stringify(data.structuredData.faqPage)}</script>`}
	{/if}
</svelte:head>

<SEO
	title="Law Firm Website Template - Redefine Your Legal Presence | CREATE SOMETHING"
	description="Modern law firm website template with bold editorial design, client intake automation, practice management integration, and ethics-compliant architecture."
	keywords="law firm website template, attorney website builder, legal website template, lawyer website design, law practice website"
	ogImage="/og-templates-law-firm.jpg"
	propertyName="agency"
/>

<!-- Hero Section -->
<section class="hero">
	<div class="hero-content">
		<div class="hero-badge">
			<Scale size={16} strokeWidth={2} />
			<span>Law Firm Template</span>
		</div>
		<h1 class="hero-title">Redefine Your Legal Presence</h1>
		<p class="hero-subtitle">
			Bold editorial design meets practice automation. Client intake flows directly to Clio.
			Case results showcase your wins. Ethics disclaimers built in. Your website works as hard as you do.
		</p>
		<div class="hero-actions">
			<a href="#preview" class="btn btn-primary">
				See Live Preview
				<ArrowRight size={16} strokeWidth={2} />
			</a>
			<a href="/products/vertical-templates/configure?template=law-firm" class="btn btn-outline">
				Deploy Now
			</a>
		</div>

		<div class="social-proof">
			<div class="stat">
				<Gavel size={16} strokeWidth={2} />
				<span>Ethics-Compliant Design</span>
			</div>
			<div class="stat">
				<Clock size={16} strokeWidth={2} />
				<span>Deploy in &lt;15 minutes</span>
			</div>
			<div class="stat">
				<Briefcase size={16} strokeWidth={2} />
				<span>Clio Integration Ready</span>
			</div>
		</div>
	</div>
</section>

<!-- Live Preview Section -->
<section id="preview" class="preview-section">
	<div class="preview-header">
		<h2 class="section-title">Live Preview</h2>
		<p class="section-subtitle">
			Bold, confident design that commands attention and converts visitors to clients.
		</p>
		<a
			href="https://law-firm-template.pages.dev"
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
				<div class="browser-url">law-firm-template.pages.dev</div>
			</div>
			<iframe
				src="https://law-firm-template.pages.dev"
				title="Law Firm Template Preview"
				class="preview-iframe"
				loading="lazy"
			></iframe>
		</div>
	</div>
</section>

<!-- Workflows Section -->
<section id="workflows" class="workflows-section">
	<div class="section-header">
		<h2 class="section-title">Built-in Practice Automation</h2>
		<p class="section-subtitle">
			Most law firm websites are digital brochures. This is a client acquisition system.
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

	<div class="ethics-notice">
		<Shield size={20} strokeWidth={2} />
		<div class="notice-content">
			<strong>Ethics-Compliant Architecture</strong>
			<p>
				This template includes built-in disclaimers, anonymized case results, and proper attorney
				credential display. Bar rules vary by jurisdiction—we recommend reviewing your state bar's
				advertising rules before launch. See our
				<a href="#ethics-compliance">ethics compliance guide</a> below.
			</p>
		</div>
	</div>
</section>

<!-- Features Grid -->
<section class="features-section">
	<div class="section-header">
		<h2 class="section-title">Everything a Law Firm Needs</h2>
		<p class="section-subtitle">
			Not a generic business template adapted for law. Purpose-built for legal practice.
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
				<h3 class="comparison-title">Traditional Law Firm Websites</h3>
				<ul class="comparison-list">
					<li>Prospects call to schedule consultations</li>
					<li>Staff manually enter client information</li>
					<li>Generic contact forms with no follow-up</li>
					<li>Case results hidden or poorly displayed</li>
					<li>Practice areas are static text pages</li>
					<li>No integration with practice management</li>
				</ul>
				<div class="comparison-label">Missed opportunities</div>
			</div>

			<div class="comparison-card automated">
				<h3 class="comparison-title">This Template (WORKWAY Automated)</h3>
				<ul class="comparison-list">
					<li>Clients book consultations directly online</li>
					<li>Intake data flows to Clio automatically</li>
					<li>Qualified leads get immediate follow-up</li>
					<li>Case results showcase wins with proper disclaimers</li>
					<li>Practice areas link to relevant attorneys</li>
					<li>Every touchpoint is a conversion opportunity</li>
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
				<li>Complete law firm website</li>
				<li>Bold editorial design</li>
				<li>SEO & structured data</li>
				<li>Mobile responsive</li>
				<li>Contact forms</li>
				<li>Ethics disclaimers</li>
			</ul>
			<a href="/products/vertical-templates/configure?template=law-firm" class="tier-cta">
				Deploy Free
			</a>
		</div>

		<div class="tier featured">
			<div class="tier-badge">Most Popular</div>
			<div class="tier-header">
				<h3 class="tier-name">Pro</h3>
				<div class="tier-price">
					<span class="price-amount">$199</span>
					<span class="price-period">/month</span>
				</div>
			</div>
			<ul class="tier-features">
				<li>Everything in Free</li>
				<li>4 active WORKWAY workflows</li>
				<li>Clio integration</li>
				<li>Consultation booking</li>
				<li>Client intake automation</li>
				<li>Lead qualification</li>
				<li>Follow-up sequences</li>
				<li>Custom domain setup</li>
				<li>Email support</li>
			</ul>
			<a
				href="/products/vertical-templates/configure?template=law-firm&tier=pro"
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
				<li>Custom PM integrations</li>
				<li>Multi-location support</li>
				<li>White-label branding</li>
				<li>Priority support</li>
				<li>Done-for-you setup</li>
				<li>Ethics compliance review</li>
			</ul>
			<a href="/contact?subject=Enterprise:LawFirm" class="tier-cta">Contact Sales</a>
		</div>
	</div>
</section>

<!-- Ethics Compliance Section -->
<section id="ethics-compliance" class="ethics-section">
	<div class="ethics-content">
		<div class="ethics-header">
			<Gavel size={48} strokeWidth={1.5} />
			<h2 class="section-title">Ethics Compliance: Built-In, Not Bolted On</h2>
			<p class="section-subtitle">
				We've designed this template with bar association rules in mind. You're responsible for jurisdiction-specific compliance.
			</p>
		</div>

		<div class="ethics-grid">
			<div class="ethics-card included">
				<h3 class="ethics-card-title">What's Included</h3>
				<ul class="ethics-list">
					<li><Check size={16} strokeWidth={2.5} /> "Prior results do not guarantee" disclaimers</li>
					<li><Check size={16} strokeWidth={2.5} /> Attorney bar number display</li>
					<li><Check size={16} strokeWidth={2.5} /> Anonymized case results by default</li>
					<li><Check size={16} strokeWidth={2.5} /> "No attorney-client relationship" notices</li>
					<li><Check size={16} strokeWidth={2.5} /> Jurisdiction-specific disclaimer fields</li>
					<li><Check size={16} strokeWidth={2.5} /> ADA-compliant design (WCAG AA)</li>
				</ul>
			</div>

			<div class="ethics-card required">
				<h3 class="ethics-card-title">Your Responsibilities</h3>
				<ul class="ethics-list responsibilities">
					<li>Review your state bar's advertising rules</li>
					<li>Verify all attorney credentials are current</li>
					<li>Obtain client consent for named testimonials</li>
					<li>Update disclaimers for your jurisdiction</li>
					<li>Consult with ethics counsel before launch</li>
					<li>Maintain accurate practice area descriptions</li>
				</ul>
			</div>
		</div>

		<div class="ethics-footer">
			<p>
				<strong>Disclaimer:</strong> This template includes features designed to help with bar
				association compliance, but does not guarantee compliance in your jurisdiction. Bar rules
				vary significantly by state. Deployers are responsible for reviewing applicable rules and
				consulting with ethics counsel.
			</p>
			<a
				href="https://github.com/createsomething/vertical-templates/blob/main/law-firm/ETHICS_COMPLIANCE.md"
				class="ethics-guide-link"
			>
				Read Full Ethics Compliance Guide
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
		<h2 class="cta-title">Deploy Your Law Firm Website Today</h2>
		<p class="cta-subtitle">
			Free tier includes everything you need. Upgrade to Pro when you're ready for automation.
		</p>
		<div class="cta-actions">
			<a
				href="/products/vertical-templates/configure?template=law-firm"
				class="btn btn-primary btn-lg"
			>
				Deploy Free Template
				<ArrowRight size={18} strokeWidth={2} />
			</a>
			<a href="/contact?subject=LawFirm:Demo" class="btn btn-outline btn-lg">
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
		background: #fafafa;
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

	/* Ethics Notice */
	.ethics-notice {
		display: flex;
		gap: var(--space-md);
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-emphasis);
		border-left: 3px solid #1c4a3e;
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

	/* Ethics Section */
	.ethics-section {
		padding: var(--space-2xl) var(--space-lg);
		background: var(--color-bg-pure);
	}

	.ethics-content {
		max-width: 1000px;
		margin: 0 auto;
	}

	.ethics-header {
		text-align: center;
		margin-bottom: var(--space-xl);
	}

	.ethics-header :global(svg) {
		margin: 0 auto var(--space-md);
		color: #1c4a3e;
	}

	.ethics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
		gap: var(--space-lg);
		margin-bottom: var(--space-xl);
	}

	.ethics-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
	}

	.ethics-card.included {
		border-left: 3px solid var(--color-success);
	}

	.ethics-card.required {
		border-left: 3px solid #A59C87;
	}

	.ethics-card-title {
		font-size: var(--text-h4);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
	}

	.ethics-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.ethics-list li {
		display: flex;
		align-items: start;
		gap: var(--space-sm);
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
	}

	.ethics-list li :global(svg) {
		flex-shrink: 0;
		margin-top: 2px;
		color: var(--color-success);
	}

	.ethics-list.responsibilities li {
		padding-left: var(--space-md);
		position: relative;
	}

	.ethics-list.responsibilities li::before {
		content: '→';
		position: absolute;
		left: 0;
		color: #A59C87;
	}

	.ethics-footer {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		text-align: center;
	}

	.ethics-footer p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-md);
	}

	.ethics-guide-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		color: var(--color-fg-secondary);
		text-decoration: underline;
		font-size: var(--text-body-sm);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.ethics-guide-link:hover {
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

		.ethics-grid {
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
