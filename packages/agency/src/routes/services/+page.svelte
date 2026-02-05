<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { BlurFade, ShimmerButton } from '@create-something/canon/magicui';
	
	// Structured data for SEO/AEO - Per-tool pricing model
	const services = [
		{
			name: 'MCP Integration',
			description: 'Connect any tool with an API to your AI agents. Salesforce, HubSpot, Notion, Slack, or your internal systems.',
			type: 'MCP Server Development',
			price: '250',
			priceDescription: 'Per integration'
		},
		{
			name: 'Agent Configuration',
			description: 'Configure an agent to work with your MCP servers. Claude, Cursor, Codex, Workers AI, or Cloudflare Workflows.',
			type: 'Agent Setup',
			price: '250',
			priceDescription: 'Per agent'
		}
	];
	
	const faqItems = [
		{
			question: "What is an MCP server?",
			answer: "MCP (Model Context Protocol) connects AI agents to external tools. An MCP server lets Claude, Cursor, or Codex access your systems with controlled permissions."
		},
		{
			question: "What tools can you connect?",
			answer: "Anything with an API. Procore, Salesforce, HubSpot, Notion, internal databases, REST APIs, GraphQL."
		},
		{
			question: "How does the pricing work?",
			answer: "You pay per integration ($250/integration) and per agent ($250/agent). Add-ons like complex auth or automation are one-time fees. No hourly billing."
		},
		{
			question: "What is the Managed MCP Runtime?",
			answer: "An optional hosted runtime on Cloudflare that includes monitoring, alerts, and API change handling. We operate the infrastructure so your workflows keep running."
		},
		{
			question: "Do you offer ongoing support?",
			answer: "Yes. Managed runtime and ongoing maintenance are available after the initial build."
		}
	];
</script>

<SEO
	title="Services | Per-Integration MCP Pricing"
	description="Per-integration MCP development pricing. $250 per integration, $250 per agent. Complex auth and automation add-ons available. No hourly billing."
	keywords="MCP development, custom MCP server, Model Context Protocol, agent integration, automation infrastructure, MCP pricing"
	ogImage="/og-image.svg"
	propertyName="agency"
	{services}
	{faqItems}
/>

<!-- Hero -->
<section class="hero">
	<div class="hero-grid"></div>
	<div class="hero-content">
		<BlurFade delay={0}>
			<p class="hero-eyebrow">Services</p>
		</BlurFade>
		<BlurFade delay={0.1}>
			<h1 class="hero-title">Per-Integration Pricing</h1>
		</BlurFade>
		<BlurFade delay={0.2}>
			<p class="hero-subtitle">
				Clear scope. Predictable investment. Delivered for AI agents.
			</p>
		</BlurFade>
	</div>
</section>

<!-- Core Pricing -->
<section class="pricing-section">
	<div class="section-container">
		<BlurFade delay={0.1}>
			<div class="pricing-group">
				<h3 class="pricing-group-label">Core</h3>
				<div class="pricing-row">
					<div class="pricing-card featured">
						<div class="pricing-label">Integration</div>
						<div class="pricing-amount">$250</div>
						<div class="pricing-unit">per integration</div>
						<p class="pricing-description">
							Salesforce, HubSpot, Notion, Slack, or your internal systems.
						</p>
					</div>
					
					<div class="pricing-card featured">
						<div class="pricing-label">Agent</div>
						<div class="pricing-amount">$250</div>
						<div class="pricing-unit">per agent</div>
						<p class="pricing-description">
							Claude, Cursor, Codex, Workers AI, or Cloudflare Workflows.
						</p>
					</div>
				</div>
			</div>
		</BlurFade>
		
		<BlurFade delay={0.2}>
			<div class="pricing-group">
				<h3 class="pricing-group-label">Add-ons</h3>
				<div class="pricing-row">
					<div class="pricing-card">
						<div class="pricing-label">Complex Auth</div>
						<div class="pricing-amount">$250</div>
						<div class="pricing-unit">one-time</div>
						<p class="pricing-description">
							OAuth 2.0, refresh tokens, multi-tenant, or custom auth flows.
						</p>
					</div>
					
					<div class="pricing-card">
						<div class="pricing-label">Automation</div>
						<div class="pricing-amount">$500</div>
						<div class="pricing-unit">one-time</div>
						<p class="pricing-description">
							Triggers, scheduled workflows, observability, orchestration.
						</p>
					</div>
				</div>
			</div>
		</BlurFade>
		
		<BlurFade delay={0.3}>
			<div class="examples-section">
				<h3 class="examples-label">Example Builds</h3>
				<div class="examples-grid">
					<div class="example-card">
						<div class="example-name">Quick start</div>
						<div class="example-calc">2 integrations + 1 agent</div>
						<div class="example-price">$750</div>
					</div>
					<div class="example-card">
						<div class="example-name">Team setup</div>
						<div class="example-calc">5 integrations + 2 agents + auth</div>
						<div class="example-price">$2,000</div>
					</div>
					<div class="example-card">
						<div class="example-name">Full stack</div>
						<div class="example-calc">8 integrations + 3 agents + both</div>
						<div class="example-price">$3,500</div>
					</div>
				</div>
			</div>
		</BlurFade>
	</div>
</section>

<!-- Managed Runtime -->
<section class="runtime-section">
	<div class="section-container">
		<BlurFade>
			<h2 class="section-heading">Managed MCP Runtime</h2>
		</BlurFade>
		<BlurFade delay={0.1}>
			<p class="section-intro">
				Build is step one. We can also host and operate your MCP servers on Cloudflare,
				with monitoring, updates, and operational support.
			</p>
		</BlurFade>
		<div class="runtime-grid">
			<BlurFade delay={0.2}>
				<div class="runtime-card">
					<h3>Managed Hosting</h3>
					<p>Cloudflare-native deployment with secure auth, environments, and access controls.</p>
				</div>
			</BlurFade>
			<BlurFade delay={0.25}>
				<div class="runtime-card">
					<h3>Monitoring & Alerts</h3>
					<p>Run visibility, error tracking, and performance monitoring built into the runtime.</p>
				</div>
			</BlurFade>
			<BlurFade delay={0.3}>
				<div class="runtime-card">
					<h3>API Change Handling</h3>
					<p>We update integrations as APIs evolve so your workflows keep running.</p>
				</div>
			</BlurFade>
		</div>
	</div>
</section>

<!-- What's Included -->
<section class="included-section">
	<div class="section-container">
		<BlurFade>
			<h2 class="section-heading">Every Project Includes</h2>
		</BlurFade>
		
		<div class="included-grid">
			<BlurFade delay={0.1}>
				<div class="included-item">
					<h3>Source code</h3>
					<p>You own everything we build. Full source code, no lock-in.</p>
				</div>
			</BlurFade>
			
			<BlurFade delay={0.15}>
				<div class="included-item">
					<h3>Deployment package</h3>
					<p>.mcpb file for self-hosting or managed deployment in Claude Desktop, Cursor, or Codex.</p>
				</div>
			</BlurFade>
			
			<BlurFade delay={0.2}>
				<div class="included-item">
					<h3>Documentation</h3>
					<p>Setup guide, API reference, and deployment instructions.</p>
				</div>
			</BlurFade>
			
			<BlurFade delay={0.25}>
				<div class="included-item">
					<h3>Bug fixes</h3>
					<p>14 days of bug fixes included. Managed runtime available after launch.</p>
				</div>
			</BlurFade>
		</div>
	</div>
</section>

<!-- How We Work -->
<section class="process-section">
	<div class="section-container">
		<BlurFade>
			<h2 class="section-heading">How We Work</h2>
		</BlurFade>
		
		<div class="process-grid">
			<BlurFade delay={0.1}>
				<div class="process-step">
					<div class="step-number">1</div>
					<h3>Discovery Call</h3>
					<p>30 minutes. We learn about your tools and goals.</p>
				</div>
			</BlurFade>
			
			<BlurFade delay={0.15}>
				<div class="process-step">
					<div class="step-number">2</div>
					<h3>Scope & Quote</h3>
					<p>Count integrations, agents, add-ons. Total = your price.</p>
				</div>
			</BlurFade>
			
			<BlurFade delay={0.2}>
				<div class="process-step">
					<div class="step-number">3</div>
					<h3>Build</h3>
					<p>We build, you review. Async updates as we go.</p>
				</div>
			</BlurFade>
			
			<BlurFade delay={0.25}>
				<div class="process-step">
					<div class="step-number">4</div>
					<h3>Deploy & Operate</h3>
					<p>Deployment package delivered or hosted runtime managed by us.</p>
				</div>
			</BlurFade>
		</div>
	</div>
</section>

<!-- FAQ -->
<section class="faq-section">
	<div class="section-container">
		<BlurFade>
			<h2 class="section-heading">Questions</h2>
		</BlurFade>
		
		<div class="faq-grid">
			<BlurFade delay={0.1}>
				<div class="faq-item">
					<h3>What's an MCP server?</h3>
					<p>MCP (Model Context Protocol) connects AI agents to external tools. An MCP server lets Claude, Cursor, or Codex access your systems with controlled permissions.</p>
				</div>
			</BlurFade>
			
			<BlurFade delay={0.15}>
				<div class="faq-item">
					<h3>What tools can you connect?</h3>
					<p>Anything with an API. Procore, Salesforce, HubSpot, Notion, internal databases, REST APIs, GraphQL.</p>
				</div>
			</BlurFade>
			
			<BlurFade delay={0.2}>
				<div class="faq-item">
					<h3>How does pricing work?</h3>
					<p>You pay per integration ($250/integration) and per agent ($250/agent). Add-ons like complex auth or automation are one-time fees. No hourly billing.</p>
				</div>
			</BlurFade>
			
			<BlurFade delay={0.25}>
				<div class="faq-item">
					<h3>What is the Managed MCP Runtime?</h3>
					<p>An optional hosted runtime on Cloudflare that includes monitoring, alerts, and API change handling.</p>
				</div>
			</BlurFade>
			
			<BlurFade delay={0.3}>
				<div class="faq-item">
					<h3>Do you offer ongoing support?</h3>
					<p>Yes. Managed runtime and ongoing maintenance are available after the initial build.</p>
				</div>
			</BlurFade>
		</div>
	</div>
</section>

<!-- CTA -->
<section class="cta-section">
	<div class="section-container">
		<BlurFade>
			<h2 class="cta-heading">Let's scope your project</h2>
		</BlurFade>
		<BlurFade delay={0.1}>
			<p class="cta-subtext">30-minute discovery call. We'll count your integrations and map build + operate.</p>
		</BlurFade>
		<BlurFade delay={0.2}>
			<ShimmerButton href="https://savvycal.com/create-something/discovery">
				Book Discovery Call
			</ShimmerButton>
		</BlurFade>
	</div>
</section>

<style>
	/* Section containers */
	.section-container {
		max-width: var(--content-width-xl);
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
		max-width: var(--content-width-xl);
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
		max-width: var(--content-width-xl);
		margin: 0 auto;
		line-height: var(--leading-relaxed);
	}
	
	/* Pricing Section */
	.pricing-section {
		padding: var(--section-padding, 6rem) var(--container-padding, 1.5rem);
		border-top: 1px solid var(--color-border-default);
	}
	
	.pricing-group {
		margin-bottom: var(--space-8, 3rem);
	}
	
	.pricing-group-label {
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
		text-align: center;
		margin-bottom: var(--space-5, 1.5rem);
	}
	
	.pricing-row {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-4, 1rem);
		max-width: var(--content-width-xl);
		margin: 0 auto;
	}
	
	.pricing-card {
		position: relative;
		padding: var(--space-6, 2rem);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg, 12px);
		text-align: center;
		background: var(--color-bg-pure);
		box-shadow: var(--glass-shine-soft);
		transition: 
			border-color var(--duration-standard) var(--ease-standard),
			box-shadow var(--duration-standard) var(--ease-standard),
			transform var(--duration-bounce) var(--ease-bounce);
	}
	
	.pricing-card:hover {
		border-color: var(--color-border-emphasis);
		box-shadow: var(--glass-shine-standard), var(--glass-outer-sm);
		transform: translateY(-2px);
	}
	
	.pricing-card.featured {
		border-color: rgba(96, 165, 250, 0.3);
		background: linear-gradient(
			135deg,
			rgba(96, 165, 250, 0.03) 0%,
			rgba(167, 139, 250, 0.03) 100%
		);
		box-shadow: 
			var(--glass-shine-standard),
			0 0 0 1px rgba(96, 165, 250, 0.1);
	}
	
	.pricing-card.featured:hover {
		border-color: rgba(96, 165, 250, 0.5);
		box-shadow: 
			var(--glass-shine-strong),
			0 0 0 1px rgba(96, 165, 250, 0.2),
			0 8px 32px rgba(96, 165, 250, 0.15);
		transform: translateY(-3px);
	}
	
	.pricing-label {
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-3, 0.75rem);
	}
	
	.pricing-amount {
		font-size: var(--text-display);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		letter-spacing: var(--tracking-tighter, -0.025em);
		line-height: 1;
	}
	
	.pricing-unit {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-4, 1rem);
	}
	
	.pricing-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}
	
	/* Examples Section */
	.examples-section {
		margin-top: var(--space-8, 3rem);
	}
	
	.examples-label {
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
		text-align: center;
		margin-bottom: var(--space-5, 1.5rem);
	}
	
	.examples-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: var(--space-4, 1rem);
		max-width: var(--content-width-xl);
		margin: 0 auto;
		align-items: stretch;
	}
	
	.example-card {
		position: relative;
		padding: var(--space-5, 1.5rem);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg, 12px);
		text-align: center;
		background: var(--color-bg-pure);
		box-shadow: var(--glass-shine-soft);
		display: flex;
		flex-direction: column;
		gap: var(--space-2, 0.5rem);
		transition:
			border-color var(--duration-standard) var(--ease-standard),
			box-shadow var(--duration-standard) var(--ease-standard),
			transform var(--duration-bounce) var(--ease-bounce);
	}

	.example-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 12%;
		right: 12%;
		height: 1px;
		background: linear-gradient(
			90deg,
			transparent,
			rgba(255, 255, 255, 0.2),
			transparent
		);
		opacity: 0.6;
	}

	.example-card:hover {
		border-color: var(--color-border-emphasis);
		box-shadow: var(--glass-shine-standard), var(--glass-outer-sm);
		transform: translateY(-2px);
	}
	
	.example-name {
		display: block;
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-fg-muted);
	}
	
	.example-calc {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-full, 9999px);
		padding: 0.25rem 0.6rem;
		font-family: var(--font-mono, monospace);
	}
	
	.example-price {
		display: block;
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		letter-spacing: var(--tracking-tight, -0.015em);
		margin-top: auto;
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
		background: var(--color-bg-pure);
		box-shadow: var(--glass-shine-soft);
		transition: 
			border-color var(--duration-standard) var(--ease-standard),
			box-shadow var(--duration-standard) var(--ease-standard),
			transform var(--duration-bounce) var(--ease-bounce);
	}
	
	.included-item:hover {
		border-color: var(--color-border-emphasis);
		box-shadow: var(--glass-shine-standard), var(--glass-outer-sm);
		transform: translateY(-2px);
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

	/* Managed Runtime */
	.runtime-section {
		padding: var(--section-padding, 6rem) 0;
		border-top: 1px solid var(--color-border-default);
	}

	.runtime-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-4, 1rem);
		align-items: stretch;
	}

	.runtime-card {
		padding: var(--space-5, 1.5rem);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg, 12px);
		background: var(--color-bg-pure);
		box-shadow: var(--glass-shine-soft);
		transition: 
			border-color var(--duration-standard) var(--ease-standard),
			box-shadow var(--duration-standard) var(--ease-standard),
			transform var(--duration-bounce) var(--ease-bounce);
	}

	.runtime-card:hover {
		border-color: var(--color-border-emphasis);
		box-shadow: var(--glass-shine-standard), var(--glass-outer-sm);
		transform: translateY(-2px);
	}

	.runtime-card h3 {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-2, 0.5rem);
	}

	.runtime-card p {
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
		background: var(--color-bg-pure);
		box-shadow: var(--glass-shine-soft);
		transition: 
			border-color var(--duration-standard) var(--ease-standard),
			box-shadow var(--duration-standard) var(--ease-standard),
			transform var(--duration-bounce) var(--ease-bounce);
	}
	
	.faq-item:hover {
		border-color: var(--color-border-emphasis);
		box-shadow: var(--glass-shine-standard), var(--glass-outer-sm);
		transform: translateY(-2px);
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
		.runtime-grid {
			grid-template-columns: 1fr;
		}
		.included-grid {
			grid-template-columns: repeat(2, 1fr);
		}
		
		.process-grid {
			grid-template-columns: repeat(2, 1fr);
		}
		
		.examples-grid {
			grid-template-columns: 1fr;
		max-width: var(--content-width-xl);
		}
	}
	
	@media (max-width: 768px) {
		.hero {
			padding: var(--layout-3, 4rem) var(--container-padding, 1.5rem);
		}
		
		.hero-title {
			font-size: var(--text-h1);
		}
		
		.pricing-row {
			grid-template-columns: 1fr;
		max-width: var(--content-width-xl);
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
		.runtime-section,
		.included-section,
		.process-section,
		.faq-section,
		.cta-section {
			padding: var(--layout-3, 4rem) 0;
		}
	}
</style>
