<script lang="ts">
	/**
	 * Restaurant Template Landing Page
	 *
	 * GTM: Restaurant vertical template landing page
	 * Outcome-focused: "Bold Flavors, Bold Design"
	 * Avant-garde aesthetic for modern dining experiences
	 */

	import { SEO } from '@create-something/canon';
	import type { PageData } from './$types';
	import {
		Utensils,
		Calendar,
		FileText,
		Users,
		Wine,
		Zap,
		Check,
		ArrowRight,
		Clock,
		Star,
		ChevronDown,
		MapPin,
		Music
	} from 'lucide-svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const workflows = [
		{
			name: 'Reservations',
			description: 'OpenTable/Resy integration with instant confirmation',
			outcome: 'Guests book online, you fill more seats',
			icon: Calendar
		},
		{
			name: 'Menu Updates',
			description: 'Real-time menu management with dietary tags',
			outcome: 'Seasonal changes reflected instantly',
			icon: FileText
		},
		{
			name: 'Private Events',
			description: 'Event inquiry forms with automated routing',
			outcome: 'Capture every catering opportunity',
			icon: Users
		},
		{
			name: 'Wine Program',
			description: 'Showcase your cellar with sommelier notes',
			outcome: 'Elevate the dining experience',
			icon: Wine
		}
	];

	const features = [
		'Bold editorial design',
		'Split-screen hero',
		'Chef\'s choice showcase',
		'Online reservations',
		'Menu management',
		'Private events section',
		'Hours & location',
		'Social integration',
		'OpenTable/Resy ready',
		'Dark theme optimized',
		'Mobile responsive',
		'Multi-location support'
	];

	const faqs = [
		{
			question: 'How do I create a restaurant website?',
			answer:
				'Deploy this template to Cloudflare Pages in minutes. Add your restaurant details, menu items, and connect your reservation system. The template includes pages for menu, reservations, private events, and contact. WORKWAY workflows handle reservation confirmations and event inquiries automatically.'
		},
		{
			question: 'What reservation systems does this integrate with?',
			answer:
				'The Pro tier includes integrations with OpenTable, Resy, and Yelp Reservations. Guests can see real-time availability and book directly. Enterprise tier supports custom integrations with any reservation system via API.'
		},
		{
			question: 'Can I manage my menu through the website?',
			answer:
				'Yes. The template includes a menu management system where you can add, edit, and organize menu items by category. You can mark items as featured, add dietary tags (vegetarian, vegan, gluten-free), and update prices in real-time.'
		},
		{
			question: 'Does this template support private events?',
			answer:
				'Yes. The template includes a private events section where you can showcase your event spaces, capacities, and features. Inquiry forms are automated with WORKWAY to notify your events team immediately.'
		},
		{
			question: 'Can I customize the design for my brand?',
			answer:
				'Absolutely. The template uses a configurable color system. You can adjust the primary color, accent color, and typography to match your restaurant\'s brand. The dark theme can be toggled or replaced with a light theme.'
		},
		{
			question: 'How do I display my hours and location?',
			answer:
				'The template includes dedicated sections for hours of operation and location. Hours are displayed in a clean, scannable format. Location includes your address with optional Google Maps integration and parking/transit information.'
		}
	];

	let expandedFaq = $state<number | null>(null);

	function toggleFaq(index: number) {
		expandedFaq = expandedFaq === index ? null : index;
	}
</script>

<svelte:head>
	<title>Restaurant Website Template - Bold Flavors, Bold Design | CREATE SOMETHING</title>
	<meta
		name="description"
		content="Avant-garde restaurant website template with bold editorial design, online reservations, menu management, and private events coordination."
	/>
	<meta
		name="keywords"
		content="restaurant website template, fine dining website, menu website builder, OpenTable integration, restaurant reservations, chef website, hospitality template"
	/>

	<meta property="og:type" content="website" />
	<meta property="og:title" content="Restaurant Website Template - Bold Flavors, Bold Design" />
	<meta
		property="og:description"
		content="Avant-garde restaurant website with bold design and automated reservations."
	/>
	<meta property="og:image" content="https://createsomething.agency/og-templates-restaurant.jpg" />

	{#if data.structuredData}
		{@html `<script type="application/ld+json">${JSON.stringify(data.structuredData.softwareApplication)}</script>`}
		{@html `<script type="application/ld+json">${JSON.stringify(data.structuredData.faqPage)}</script>`}
	{/if}
</svelte:head>

<SEO
	title="Restaurant Website Template - Bold Flavors, Bold Design | CREATE SOMETHING"
	description="Avant-garde restaurant website template with bold editorial design, online reservations, menu management, and private events coordination."
	keywords="restaurant website template, fine dining website, menu website builder, OpenTable integration"
	ogImage="/og-templates-restaurant.jpg"
	propertyName="agency"
/>

<!-- Hero Section -->
<section class="hero">
	<div class="hero-content">
		<div class="hero-badge">
			<Utensils size={16} strokeWidth={2} />
			<span>Restaurant Template</span>
		</div>
		<h1 class="hero-title">Bold Flavors, Bold Design</h1>
		<p class="hero-subtitle">
			Avant-garde restaurant website with split-screen hero, chef's choice showcase, and seamless
			reservation integration. Your culinary vision deserves a website that matches.
		</p>
		<div class="hero-actions">
			<a href="#preview" class="btn btn-primary">
				See Live Preview
				<ArrowRight size={16} strokeWidth={2} />
			</a>
			<a href="/products/vertical-templates/configure?template=restaurant" class="btn btn-outline">
				Deploy Now
			</a>
		</div>

		<div class="social-proof">
			<div class="stat">
				<Wine size={16} strokeWidth={2} />
				<span>Editorial Dark Theme</span>
			</div>
			<div class="stat">
				<Clock size={16} strokeWidth={2} />
				<span>Deploy in &lt;15 minutes</span>
			</div>
			<div class="stat">
				<MapPin size={16} strokeWidth={2} />
				<span>OpenTable/Resy Ready</span>
			</div>
		</div>
	</div>
</section>

<!-- Live Preview Section -->
<section id="preview" class="preview-section">
	<div class="preview-header">
		<h2 class="section-title">Live Preview</h2>
		<p class="section-subtitle">
			Bold editorial design that creates an immersive dining experience before guests arrive.
		</p>
		<a
			href="https://restaurant-template-1ve.pages.dev"
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
				<div class="browser-url">restaurant-template-1ve.pages.dev</div>
			</div>
			<iframe
				src="https://restaurant-template-1ve.pages.dev"
				title="Restaurant Template Preview"
				class="preview-iframe"
				loading="lazy"
			></iframe>
		</div>
	</div>
</section>

<!-- Workflows Section -->
<section id="workflows" class="workflows-section">
	<div class="section-header">
		<h2 class="section-title">Built-in Hospitality Automation</h2>
		<p class="section-subtitle">
			Most restaurant websites are static menus. This is a guest acquisition system.
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

	<div class="ambiance-notice">
		<Music size={20} strokeWidth={2} />
		<div class="notice-content">
			<strong>The Art of Ambiance</strong>
			<p>
				Every element is designed to heighten senses—from the dark editorial aesthetic to the
				typographic address in the footer. Your website becomes an extension of your dining room.
			</p>
		</div>
	</div>
</section>

<!-- Features Grid -->
<section class="features-section">
	<div class="section-header">
		<h2 class="section-title">Everything a Restaurant Needs</h2>
		<p class="section-subtitle">
			Not a generic business template. Purpose-built for modern dining experiences.
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
				<li>Complete restaurant website</li>
				<li>Bold editorial design</li>
				<li>Menu pages</li>
				<li>Mobile responsive</li>
				<li>Contact forms</li>
				<li>Hours & location</li>
			</ul>
			<a href="/products/vertical-templates/configure?template=restaurant" class="tier-cta">
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
				<li>OpenTable/Resy integration</li>
				<li>Reservation confirmations</li>
				<li>Private event inquiries</li>
				<li>Menu management</li>
				<li>Email notifications</li>
				<li>Custom domain setup</li>
				<li>Email support</li>
			</ul>
			<a
				href="/products/vertical-templates/configure?template=restaurant&tier=pro"
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
				<li>Custom POS integration</li>
				<li>Multi-location support</li>
				<li>White-label branding</li>
				<li>Priority support</li>
				<li>Done-for-you setup</li>
				<li>Loyalty program integration</li>
			</ul>
			<a href="/contact?subject=Enterprise:Restaurant" class="tier-cta">Contact Sales</a>
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
		<h2 class="cta-title">Deploy Your Restaurant Website Today</h2>
		<p class="cta-subtitle">
			Free tier includes everything you need. Upgrade to Pro when you're ready for automation.
		</p>
		<div class="cta-actions">
			<a
				href="/products/vertical-templates/configure?template=restaurant"
				class="btn btn-primary btn-lg"
			>
				Deploy Free Template
				<ArrowRight size={18} strokeWidth={2} />
			</a>
			<a href="/contact?subject=Restaurant:Demo" class="btn btn-outline btn-lg">
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
		background: #191f1d;
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

	/* Ambiance Notice */
	.ambiance-notice {
		display: flex;
		gap: var(--space-md);
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-emphasis);
		border-left: 3px solid #E9C46A;
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

	/* Pricing Section */
	.pricing-section {
		padding: var(--space-2xl) var(--space-lg);
		background: var(--color-bg-pure);
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
