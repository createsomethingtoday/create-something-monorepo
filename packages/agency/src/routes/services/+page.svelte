<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { SavvyCalButton } from '@create-something/canon/domains/agency';
	import { onMount } from 'svelte';
	
	// Scroll reveal observer
	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						entry.target.classList.add('visible');
					}
				});
			},
			{ threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
		);
		
		document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
		
		return () => observer.disconnect();
	});
	
	// Structured data for SEO/AEO
	const services = [
		{
			name: 'Starter MCP Development',
			description: 'Connect two tools to AI plus one agent. See AI work across your systems. Standard auth, deployment package included. 3-5 day turnaround.',
			type: 'MCP Server Development',
			price: '500',
			priceDescription: 'Fixed price, no hourly billing'
		},
		{
			name: 'Pro MCP Development',
			description: 'Scale your MCP infrastructure. 5+ API integrations, OAuth 2.0, data mapping, 2 configured agents. 1-2 week turnaround.',
			type: 'MCP Server Development',
			price: '2500',
			priceDescription: 'Fixed price, no hourly billing'
		},
		{
			name: 'Intelligence Layer',
			description: 'Automation that runs while you sleep. 3+ agents, automated triggers, observability dashboard, workflow orchestration.',
			type: 'AI Automation',
			price: '5000',
			priceDescription: 'Starting price, scales with complexity'
		}
	];
	
	const faqItems = [
		{
			question: "What is an MCP server?",
			answer: "MCP (Model Context Protocol) connects AI to external tools. An MCP server lets Claude, Cursor, or Codex access your systems with controlled permissions."
		},
		{
			question: "What tools can you connect to AI?",
			answer: "Anything with an API. Procore, Salesforce, HubSpot, Notion, internal databases, REST APIs, GraphQL."
		},
		{
			question: "What if my project is more complex?",
			answer: "We'll scope it on the discovery call. Complex integrations (multiple systems, custom auth, webhooks) get a custom quote."
		},
		{
			question: "Do you offer ongoing support?",
			answer: "Yes. After the initial build, retainer options are available for updates and maintenance."
		}
	];
</script>

<SEO
	title="Services | Custom MCP Development"
	description="Fixed pricing for MCP development. Starter $500, Pro $2,500, Intelligence $5,000+. Fast turnaround, no hourly billing."
	keywords="MCP development, custom MCP server, Model Context Protocol, AI integration, automation infrastructure, MCP pricing"
	ogImage="/og-image.svg"
	propertyName="agency"
	{services}
	{faqItems}
/>

<!-- Hero -->
<section class="hero">
	<div class="hero-grid"></div>
	<div class="hero-content">
		<p class="hero-eyebrow reveal">Services</p>
		<h1 class="hero-title reveal">Custom MCP Development</h1>
		<p class="hero-subtitle reveal">
			Fixed pricing. Fast turnaround. You know what you're paying before we start.
		</p>
	</div>
</section>

<!-- Pricing -->
<section class="pricing-section">
	<div class="pricing-container">
		
		<!-- Starter -->
		<div class="pricing-card reveal">
			<div class="pricing-header">
				<h2 class="pricing-name">Starter</h2>
				<div class="pricing-price">$500</div>
				<p class="pricing-tagline">See AI work across your systems</p>
			</div>
			
			<div class="pricing-body">
				<ul class="pricing-features">
					<li>Two API integrations</li>
					<li>One configured agent</li>
					<li>Standard auth (API keys, basic OAuth)</li>
					<li>Deployment package</li>
					<li>Source code included</li>
				</ul>
			</div>
			
			<div class="pricing-footer">
				<div class="pricing-timeline">3–5 day turnaround</div>
			</div>
		</div>
		
		<!-- Pro -->
		<div class="pricing-card featured reveal">
			<div class="pricing-header">
				<h2 class="pricing-name">Pro</h2>
				<div class="pricing-price">$2,500</div>
				<p class="pricing-tagline">Scale your MCP infrastructure</p>
			</div>
			
			<div class="pricing-body">
				<ul class="pricing-features">
					<li>5+ API integrations</li>
					<li>OAuth 2.0 / complex auth</li>
					<li>Data mapping & transforms</li>
					<li>Two configured agents</li>
					<li>Deployment package + docs</li>
					<li>14 days support included</li>
				</ul>
			</div>
			
			<div class="pricing-footer">
				<div class="pricing-timeline">1–2 week turnaround</div>
			</div>
		</div>
		
		<!-- Intelligence -->
		<div class="pricing-card reveal">
			<div class="pricing-header">
				<h2 class="pricing-name">Intelligence</h2>
				<div class="pricing-price">$5,000<span class="price-modifier">+</span></div>
				<p class="pricing-tagline">Runs while you sleep</p>
			</div>
			
			<div class="pricing-body">
				<ul class="pricing-features">
					<li>3+ configured agents</li>
					<li>Automated triggers (schedule, webhook)</li>
					<li>Observability dashboard</li>
					<li>Workflow orchestration</li>
					<li>30 days support included</li>
				</ul>
			</div>
			
			<div class="pricing-footer">
				<div class="pricing-timeline">Scales with complexity</div>
			</div>
		</div>
		
	</div>
</section>

<!-- What's Included -->
<section class="included-section">
	<div class="section-container">
		<h2 class="section-heading reveal">Every Project Includes</h2>
		
		<div class="included-grid">
			<div class="included-item reveal">
				<h3>Source code</h3>
				<p>You own everything we build. Full source code, no lock-in.</p>
			</div>
			
			<div class="included-item reveal">
				<h3>Deployment package</h3>
				<p>.mcpb file for easy installation in Claude Desktop, Cursor, or Codex.</p>
			</div>
			
			<div class="included-item reveal">
				<h3>Documentation</h3>
				<p>Setup guide, API reference, and deployment instructions.</p>
			</div>
			
			<div class="included-item reveal">
				<h3>Bug fixes</h3>
				<p>14 days of bug fixes included. Optional ongoing support available.</p>
			</div>
		</div>
	</div>
</section>

<!-- How We Work -->
<section class="process-section">
	<div class="section-container">
		<h2 class="section-heading reveal">How We Work</h2>
		
		<div class="process-grid">
			<div class="process-step reveal">
				<div class="step-number">1</div>
				<h3>Discovery Call</h3>
				<p>30 minutes. We learn about your tools and goals.</p>
			</div>
			
			<div class="process-step reveal">
				<div class="step-number">2</div>
				<h3>Scope & Quote</h3>
				<p>Fixed price based on complexity. No hourly billing.</p>
			</div>
			
			<div class="process-step reveal">
				<div class="step-number">3</div>
				<h3>Build</h3>
				<p>We build, you review. Async updates as we go.</p>
			</div>
			
			<div class="process-step reveal">
				<div class="step-number">4</div>
				<h3>Ship</h3>
				<p>Deployment package delivered. You're live.</p>
			</div>
		</div>
	</div>
</section>

<!-- FAQ -->
<section class="faq-section">
	<div class="section-container">
		<h2 class="section-heading reveal">Questions</h2>
		
		<div class="faq-grid">
			<div class="faq-item reveal">
				<h3>What's an MCP server?</h3>
				<p>MCP (Model Context Protocol) connects AI to external tools. An MCP server lets Claude, Cursor, or Codex access your systems with controlled permissions.</p>
			</div>
			
			<div class="faq-item reveal">
				<h3>What tools can you connect?</h3>
				<p>Anything with an API. Procore, Salesforce, HubSpot, Notion, internal databases, REST APIs, GraphQL.</p>
			</div>
			
			<div class="faq-item reveal">
				<h3>What if my project is more complex?</h3>
				<p>We'll scope it on the discovery call. Complex integrations (multiple systems, custom auth, webhooks) get a custom quote.</p>
			</div>
			
			<div class="faq-item reveal">
				<h3>Do you offer ongoing support?</h3>
				<p>Yes. After the initial build, retainer options are available for updates and maintenance.</p>
			</div>
		</div>
	</div>
</section>

<!-- CTA -->
<section class="cta-section">
	<div class="section-container">
		<h2 class="cta-heading reveal">Let's talk about your integration</h2>
		<p class="cta-subtext reveal">30-minute discovery call. We'll scope your project and quote a fixed price.</p>
		<div class="reveal">
			<SavvyCalButton variant="primary" size="lg" />
		</div>
	</div>
</section>

<style>
	/* Section containers */
	.section-container {
		max-width: 900px;
		margin: 0 auto;
		padding: 0 var(--container-padding, 1.5rem);
	}
	
	.section-heading {
		font-size: var(--text-h1);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		text-align: center;
		margin-bottom: var(--space-8, 3rem);
		letter-spacing: var(--tracking-tight, -0.015em);
	}
	
	/* Hero with grid background */
	.hero {
		position: relative;
		padding: var(--section-padding-lg, 8rem) var(--container-padding, 1.5rem) var(--section-padding, 6rem);
		overflow: hidden;
	}
	
	.hero-grid {
		position: absolute;
		inset: 0;
		background-image: 
			linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
		background-size: 60px 60px;
		mask-image: linear-gradient(to bottom, black 0%, transparent 80%);
		-webkit-mask-image: linear-gradient(to bottom, black 0%, transparent 80%);
		pointer-events: none;
	}
	
	.hero-content {
		position: relative;
		text-align: center;
		max-width: 700px;
		margin: 0 auto;
	}
	
	.hero-eyebrow {
		font-size: var(--text-body-sm);
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-5, 1.5rem);
	}
	
	.hero-title {
		font-size: var(--text-display);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-5, 1.5rem);
		line-height: 1.1;
		letter-spacing: var(--tracking-tighter, -0.025em);
	}
	
	.hero-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		max-width: 480px;
		margin: 0 auto;
		line-height: var(--leading-relaxed);
	}
	
	/* Pricing Section */
	.pricing-section {
		padding: var(--section-padding, 6rem) var(--container-padding, 1.5rem);
		border-top: 1px solid var(--color-border-default);
	}
	
	.pricing-container {
		max-width: 1000px;
		margin: 0 auto;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-4, 1rem);
	}
	
	.pricing-card {
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg, 12px);
		display: flex;
		flex-direction: column;
		transition: 
			border-color var(--duration-micro, 200ms) var(--ease-standard),
			transform var(--duration-micro, 200ms) var(--ease-standard);
	}
	
	.pricing-card:hover {
		border-color: var(--color-border-emphasis);
		transform: translateY(-2px);
	}
	
	.pricing-card.featured {
		border-color: var(--color-border-emphasis);
		background: var(--color-bg-surface);
	}
	
	.pricing-header {
		padding: var(--space-6, 2rem);
		text-align: center;
		border-bottom: 1px solid var(--color-border-default);
	}
	
	.pricing-name {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-2, 0.5rem);
	}
	
	.pricing-price {
		font-size: var(--text-display);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		letter-spacing: var(--tracking-tight, -0.015em);
		margin-bottom: var(--space-3, 0.75rem);
	}
	
	.price-modifier {
		font-size: var(--text-h2);
		color: var(--color-fg-muted);
	}
	
	.pricing-tagline {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}
	
	.pricing-body {
		padding: var(--space-5, 1.5rem);
		flex: 1;
	}
	
	.pricing-features {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	
	.pricing-features li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		padding: var(--space-2, 0.5rem) 0;
		border-bottom: 1px solid var(--color-border-default);
	}
	
	.pricing-features li:last-child {
		border-bottom: none;
	}
	
	.pricing-footer {
		padding: var(--space-4, 1rem) var(--space-5, 1.5rem);
		background: var(--color-bg-surface);
		border-top: 1px solid var(--color-border-default);
		border-radius: 0 0 var(--radius-lg, 12px) var(--radius-lg, 12px);
	}
	
	.pricing-card.featured .pricing-footer {
		background: var(--color-bg-elevated);
	}
	
	.pricing-timeline {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-family: var(--font-mono, monospace);
		text-align: center;
	}
	
	/* What's Included */
	.included-section {
		padding: var(--section-padding, 6rem) 0;
		border-top: 1px solid var(--color-border-default);
	}
	
	.included-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-4, 1rem);
	}
	
	.included-item {
		padding: var(--space-5, 1.5rem);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg, 12px);
	}
	
	.included-item h3 {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-2, 0.5rem);
	}
	
	.included-item p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}
	
	/* Process Section */
	.process-section {
		padding: var(--section-padding, 6rem) 0;
		border-top: 1px solid var(--color-border-default);
	}
	
	.process-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-5, 1.5rem);
	}
	
	.process-step {
		text-align: center;
	}
	
	.step-number {
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto var(--space-4, 1rem);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-full, 9999px);
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-fg-secondary);
	}
	
	.process-step h3 {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-2, 0.5rem);
	}
	
	.process-step p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
	}
	
	/* FAQ Section */
	.faq-section {
		padding: var(--section-padding, 6rem) 0;
		border-top: 1px solid var(--color-border-default);
	}
	
	.faq-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-4, 1rem);
	}
	
	.faq-item {
		padding: var(--space-5, 1.5rem);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg, 12px);
	}
	
	.faq-item h3 {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-3, 0.75rem);
	}
	
	.faq-item p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}
	
	/* CTA */
	.cta-section {
		padding: var(--section-padding, 6rem) 0;
		border-top: 1px solid var(--color-border-default);
		text-align: center;
	}
	
	.cta-heading {
		font-size: var(--text-h1);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-3, 0.75rem);
	}
	
	.cta-subtext {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-6, 2rem);
	}
	
	/* Responsive */
	@media (max-width: 1024px) {
		.pricing-container {
			grid-template-columns: 1fr;
			max-width: 400px;
		}
		
		.included-grid {
			grid-template-columns: repeat(2, 1fr);
		}
		
		.process-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	
	@media (max-width: 768px) {
		.hero {
			padding: var(--layout-3, 4rem) var(--container-padding, 1.5rem);
		}
		
		.hero-title {
			font-size: var(--text-h1);
		}
		
		.included-grid {
			grid-template-columns: 1fr;
		}
		
		.process-grid {
			grid-template-columns: 1fr;
		}
		
		.faq-grid {
			grid-template-columns: 1fr;
		}
		
		/* Mobile section padding */
		.pricing-section,
		.included-section,
		.process-section,
		.faq-section,
		.cta-section {
			padding: var(--layout-3, 4rem) 0;
		}
	}
</style>
