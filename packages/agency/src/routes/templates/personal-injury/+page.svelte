<script lang="ts">
	/**
	 * Personal Injury Template Landing Page
	 *
	 * GTM: PI-specific vertical template landing page
	 * Outcome-focused: "Turn Visitors Into Signed Cases"
	 * Conversion-first architecture with lead qualification
	 */

	import { SEO } from '@create-something/canon';
	import type { PageData } from './$types';
	import {
		Car,
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
		AlertTriangle,
		Phone,
		DollarSign,
		TrendingUp
	} from 'lucide-svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const workflows = [
		{
			name: 'Case Intake',
			description: 'Qualified leads flow directly to your CRM',
			outcome: 'New matters created in Clio automatically',
			icon: FileText
		},
		{
			name: 'Lead Screening',
			description: 'Auto-qualify based on severity, fault, statute',
			outcome: 'Focus on cases worth your time',
			icon: Shield
		},
		{
			name: 'Hot Lead Alerts',
			description: 'Severe cases trigger immediate Slack notification',
			outcome: 'Respond to catastrophic injuries in minutes',
			icon: AlertTriangle
		},
		{
			name: 'Follow-Up Sequences',
			description: 'Nurture leads who aren\'t ready to sign',
			outcome: 'Convert more consultations to retained clients',
			icon: TrendingUp
		}
	];

	const features = [
		'Conversion-optimized hero',
		'Integrated case intake form',
		'Lead qualification automation',
		'Case severity screening',
		'24/7 availability badges',
		'Recovery results showcase',
		'Contingency fee display',
		'Accident type pages',
		'Attorney profiles',
		'Clio/MyCase integration',
		'Hot lead Slack alerts',
		'ADA accessibility (WCAG AA)'
	];

	const faqs = [
		{
			question: 'How do I create a personal injury law firm website?',
			answer:
				'Deploy this template to Cloudflare Pages in minutes. Add your firm details, attorneys, and case types. The template includes conversion-optimized pages for each accident type (car accidents, truck accidents, medical malpractice, etc.), attorney profiles, and recovery results. WORKWAY workflows handle case intake and lead qualification automatically.'
		},
		{
			question: 'Does this template include case intake automation?',
			answer:
				'Yes. The Pro tier includes intelligent case intake that screens leads based on severity, statute of limitations, and fault. Qualified leads are automatically added to your practice management system (Clio, MyCase, PracticePanther). Hot leads (severe/catastrophic injuries) trigger immediate Slack notifications.'
		},
		{
			question: 'What practice management integrations are available?',
			answer:
				'The Pro tier includes webhook integrations for Clio, MyCase, and PracticePanther. Case intake submissions automatically create contacts and matters in your PM system. Enterprise tier supports custom integrations with any legal software via API.'
		},
		{
			question: 'Can I display case results on the website?',
			answer:
				'Yes. The template includes a recovery results section with ethics-compliant display. Client names are never shown without consent, and all results include the required "prior results do not guarantee" disclaimer. Results can be filtered by accident type.'
		},
		{
			question: 'Is the template optimized for personal injury SEO?',
			answer:
				'Yes. The template generates dedicated pages for each accident type with schema markup, local SEO signals, and conversion-optimized content. Each page targets specific injury keywords and includes structured data for rich search results.'
		},
		{
			question: 'How does the lead screening work?',
			answer:
				'The intake form captures key information: accident type, injury severity, fault, and statute of limitations. WORKWAY workflows evaluate each lead against your criteria. Qualified leads are sent to your CRM; hot leads trigger immediate alerts; borderline cases can be routed for manual review.'
		}
	];

	let expandedFaq = $state<number | null>(null);

	function toggleFaq(index: number) {
		expandedFaq = expandedFaq === index ? null : index;
	}
</script>

<svelte:head>
	<title>Personal Injury Website Template - Turn Visitors Into Signed Cases | CREATE SOMETHING</title>
	<meta
		name="description"
		content="High-conversion personal injury law firm website template with integrated case intake, lead qualification, and practice management automation. No fee unless you win."
	/>
	<meta
		name="keywords"
		content="personal injury website template, PI attorney website, injury lawyer website builder, legal intake automation, case intake software, Clio integration, personal injury marketing"
	/>

	<meta property="og:type" content="website" />
	<meta property="og:title" content="Personal Injury Website Template - Turn Visitors Into Signed Cases" />
	<meta
		property="og:description"
		content="High-conversion PI website with automated case intake and lead qualification."
	/>
	<meta property="og:image" content="https://createsomething.agency/og-templates-personal-injury.jpg" />

	{#if data.structuredData}
		{@html `<script type="application/ld+json">${JSON.stringify(data.structuredData.softwareApplication)}</script>`}
		{@html `<script type="application/ld+json">${JSON.stringify(data.structuredData.faqPage)}</script>`}
	{/if}
</svelte:head>

<SEO
	title="Personal Injury Website Template - Turn Visitors Into Signed Cases | CREATE SOMETHING"
	description="High-conversion personal injury law firm website template with integrated case intake, lead qualification, and practice management automation."
	keywords="personal injury website template, PI attorney website, injury lawyer website builder, legal intake automation"
	ogImage="/og-templates-personal-injury.jpg"
	propertyName="agency"
/>

<!-- Hero Section -->
<section class="hero">
	<div class="hero-content">
		<div class="hero-badge">
			<Car size={16} strokeWidth={2} />
			<span>Personal Injury Template</span>
		</div>
		<h1 class="hero-title">Turn Visitors Into Signed Cases</h1>
		<p class="hero-subtitle">
			Conversion-first design with integrated case intake. Qualified leads flow to Clio automatically.
			Hot leads trigger instant Slack alerts. Your website works while you sleep.
		</p>
		<div class="hero-actions">
			<a href="#preview" class="btn btn-primary">
				See Live Preview
				<ArrowRight size={16} strokeWidth={2} />
			</a>
			<a href="/products/vertical-templates/configure?template=personal-injury" class="btn btn-outline">
				Deploy Now
			</a>
		</div>

		<div class="social-proof">
			<div class="stat">
				<Phone size={16} strokeWidth={2} />
				<span>24/7 Availability Display</span>
			</div>
			<div class="stat">
				<Clock size={16} strokeWidth={2} />
				<span>Deploy in &lt;15 minutes</span>
			</div>
			<div class="stat">
				<DollarSign size={16} strokeWidth={2} />
				<span>Contingency Fee Ready</span>
			</div>
		</div>
	</div>
</section>

<!-- Live Preview Section -->
<section id="preview" class="preview-section">
	<div class="preview-header">
		<h2 class="section-title">Live Preview</h2>
		<p class="section-subtitle">
			Conversion-optimized design with integrated intake form front and center.
		</p>
		<a
			href="https://personal-injury-template.pages.dev"
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
				<div class="browser-url">personal-injury-template.pages.dev</div>
			</div>
			<iframe
				src="https://personal-injury-template.pages.dev"
				title="Personal Injury Template Preview"
				class="preview-iframe"
				loading="lazy"
			></iframe>
		</div>
	</div>
</section>

<!-- Workflows Section -->
<section id="workflows" class="workflows-section">
	<div class="section-header">
		<h2 class="section-title">Built-in Lead Conversion Machine</h2>
		<p class="section-subtitle">
			Most PI websites leak leads. This one captures, qualifies, and routes them automatically.
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

	<div class="conversion-notice">
		<TrendingUp size={20} strokeWidth={2} />
		<div class="notice-content">
			<strong>Conversion-First Architecture</strong>
			<p>
				Every element is designed to convert visitors into leads. The intake form is above the fold.
				Trust signals (recovery amounts, success rate) build confidence. Case type selection helps
				you qualify leads before you even speak to them.
			</p>
		</div>
	</div>
</section>

<!-- Features Grid -->
<section class="features-section">
	<div class="section-header">
		<h2 class="section-title">Everything a PI Firm Needs</h2>
		<p class="section-subtitle">
			Not a generic law firm template. Purpose-built for personal injury practices.
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
				<h3 class="comparison-title">Traditional PI Websites</h3>
				<ul class="comparison-list">
					<li>Generic contact forms with no screening</li>
					<li>Staff manually enters every lead</li>
					<li>No way to prioritize hot cases</li>
					<li>Recovery results hidden or hard to find</li>
					<li>Same design as corporate law firms</li>
					<li>No integration with case management</li>
				</ul>
				<div class="comparison-label">Leaks leads</div>
			</div>

			<div class="comparison-card automated">
				<h3 class="comparison-title">This Template (WORKWAY Automated)</h3>
				<ul class="comparison-list">
					<li>Intake form qualifies leads automatically</li>
					<li>Qualified leads flow to Clio/MyCase</li>
					<li>Severe cases trigger instant Slack alerts</li>
					<li>Recovery results showcase builds trust</li>
					<li>Conversion-focused PI-specific design</li>
					<li>Full practice management integration</li>
				</ul>
				<div class="comparison-label highlighted">Captures every qualified lead</div>
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
				<li>Complete PI website</li>
				<li>Conversion-optimized design</li>
				<li>SEO & structured data</li>
				<li>Mobile responsive</li>
				<li>Contact forms</li>
				<li>Ethics disclaimers</li>
			</ul>
			<a href="/products/vertical-templates/configure?template=personal-injury" class="tier-cta">
				Deploy Free
			</a>
		</div>

		<div class="tier featured">
			<div class="tier-badge">Most Popular</div>
			<div class="tier-header">
				<h3 class="tier-name">Pro</h3>
				<div class="tier-price">
					<span class="price-amount">$249</span>
					<span class="price-period">/month</span>
				</div>
			</div>
			<ul class="tier-features">
				<li>Everything in Free</li>
				<li>6 active WORKWAY workflows</li>
				<li>Clio/MyCase integration</li>
				<li>Lead qualification automation</li>
				<li>Hot lead Slack alerts</li>
				<li>Case severity screening</li>
				<li>Follow-up sequences</li>
				<li>Custom domain setup</li>
				<li>Priority support</li>
			</ul>
			<a
				href="/products/vertical-templates/configure?template=personal-injury&tier=pro"
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
				<li>Dedicated account manager</li>
				<li>Done-for-you setup</li>
				<li>Custom lead scoring</li>
			</ul>
			<a href="/contact?subject=Enterprise:PersonalInjury" class="tier-cta">Contact Sales</a>
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
		<h2 class="cta-title">Deploy Your PI Website Today</h2>
		<p class="cta-subtitle">
			Free tier includes everything you need. Upgrade to Pro when you're ready for automation.
		</p>
		<div class="cta-actions">
			<a
				href="/products/vertical-templates/configure?template=personal-injury"
				class="btn btn-primary btn-lg"
			>
				Deploy Free Template
				<ArrowRight size={18} strokeWidth={2} />
			</a>
			<a href="/contact?subject=PersonalInjury:Demo" class="btn btn-outline btn-lg">
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
		background: #1a1a1a;
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

	/* Conversion Notice */
	.conversion-notice {
		display: flex;
		gap: var(--space-md);
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-emphasis);
		border-left: 3px solid #006b68;
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

	/* FAQ Section */
	.faq-section {
		padding: var(--space-2xl) var(--space-lg);
		background: var(--color-bg-pure);
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
