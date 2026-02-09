<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { BlurFade, ShimmerButton } from '@create-something/canon/magicui';
	
	// Structured data for SEO/AEO
	const services = [
		{
			name: 'Tool Connection',
			description: 'Connect any tool with an API to AI agents. Salesforce, HubSpot, Notion, Slack, or your internal systems.',
			type: 'Integration Development',
			price: '250',
			priceDescription: 'Per tool connected'
		},
		{
			name: 'AI Platform Setup',
			description: 'Configure Claude, Cursor, Codex, or other AI platforms to work with your connected tools.',
			type: 'Platform Configuration',
			price: '250',
			priceDescription: 'Per AI platform'
		}
	];
	
	const faqItems = [
		{
			question: "What are you actually building?",
			answer: "A secure connection between your tools and AI agents. When it's done, Claude, Cursor, or Codex can access your systems—read data, take actions, run workflows—with the permissions you set."
		},
		{
			question: "What tools can you connect?",
			answer: "Anything with an API. Salesforce, HubSpot, Notion, Slack, Procore, Google Workspace, internal databases—if it has an API, we can connect it."
		},
		{
			question: "How does pricing work?",
			answer: "You pay per tool connected ($250) and per AI platform configured ($250). Add-ons like secure team login or automation are one-time fees. No hourly billing."
		},
		{
			question: "Can you keep it running after launch?",
			answer: "Yes. Our managed runtime includes hosting, monitoring, and updates starting at $99/mo. Or we hand off a deployment package for self-hosting."
		},
		{
			question: "What if I'm not sure what I need?",
			answer: "That's what the discovery call is for. Tell us your tools and goals—we'll map out the connections and give you a total before starting."
		}
	];
</script>

<SEO
	title="Pricing | Connect Your Tools to AI Agents"
	description="Predictable pricing to connect your tools to AI agents. $250 per tool, $250 per AI platform. No hourly billing. Managed runtime from $99/mo."
	keywords="MCP development, custom MCP server, Model Context Protocol, agent integration, automation infrastructure, MCP pricing, connect tools to AI"
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
			<p class="hero-eyebrow">Pricing</p>
		</BlurFade>
		<BlurFade delay={0.1}>
			<h1 class="hero-title">What does it cost?</h1>
		</BlurFade>
		<BlurFade delay={0.2}>
			<p class="hero-subtitle">
				You pick the tools. We connect them to AI. You know the price before we start.
			</p>
		</BlurFade>
	</div>
</section>

<!-- Scenario-Based Examples (FIRST) -->
<section class="scenarios-section">
	<div class="section-container">
		<BlurFade delay={0.1}>
			<h2 class="section-heading">Example projects</h2>
		</BlurFade>
		<BlurFade delay={0.15}>
			<p class="section-subhead">Real tool combinations. Fixed prices. No surprises.</p>
		</BlurFade>
		<div class="examples-grid">
			<BlurFade delay={0.15}>
				<div class="example-card">
					<div class="example-name">CRM + Docs</div>
					<p class="example-scenario">HubSpot deals auto-create project docs in Notion via Claude.</p>
					<div class="example-calc">2 tools + 1 AI platform</div>
					<div class="example-price">$750</div>
				</div>
			</BlurFade>
			<BlurFade delay={0.25}>
				<div class="example-card popular">
					<span class="example-badge">Most common</span>
					<div class="example-name">Team workflows</div>
					<p class="example-scenario">Salesforce, Slack, and Google connected with secure team login.</p>
					<div class="example-calc">3 tools + 2 AI platforms + login</div>
					<div class="example-price">$1,500</div>
				</div>
			</BlurFade>
			<BlurFade delay={0.35}>
				<div class="example-card">
					<div class="example-name">Full automation</div>
					<p class="example-scenario">8 tools connected with scheduled tasks and automated workflows.</p>
					<div class="example-calc">8 tools + 3 platforms + automation</div>
					<div class="example-price">$3,500</div>
				</div>
			</BlurFade>
		</div>
		<BlurFade delay={0.3}>
			<p class="value-anchor">Custom development typically costs $15k–$50k. Our per-tool model makes it predictable.</p>
		</BlurFade>
	</div>
</section>

<!-- How We Price It (SECOND) -->
<section class="pricing-section">
	<div class="section-container">
		<BlurFade delay={0.1}>
			<h2 class="section-heading">How we price it</h2>
		</BlurFade>
		<BlurFade delay={0.15}>
			<p class="section-subhead">Count your tools, pick your AI platforms, add what you need. That's your total.</p>
		</BlurFade>

		<BlurFade delay={0.2}>
			<div class="pricing-group">
				<h3 class="pricing-group-label">Core</h3>
				<div class="pricing-row">
					<div class="pricing-card featured">
						<div class="pricing-label">Tool</div>
						<div class="pricing-amount">$250</div>
						<div class="pricing-unit">per tool connected</div>
						<p class="pricing-description">
							Any tool with an API — CRM, docs, chat, email, internal systems.
						</p>
					</div>
					
					<div class="pricing-card featured">
						<div class="pricing-label">AI Platform</div>
						<div class="pricing-amount">$250</div>
						<div class="pricing-unit">per platform configured</div>
						<p class="pricing-description">
							We set up Claude, Cursor, or Codex to work with your tools.
						</p>
					</div>
				</div>
			</div>
		</BlurFade>
		
		<BlurFade delay={0.3}>
			<div class="pricing-group">
				<h3 class="pricing-group-label">Add-ons</h3>
				<div class="pricing-row">
					<div class="pricing-card">
						<div class="pricing-label">Secure Team Login</div>
						<div class="pricing-amount">$250</div>
						<div class="pricing-unit">one-time</div>
						<p class="pricing-description">
							Multi-user access with enterprise-grade authentication.
						</p>
					</div>
					
					<div class="pricing-card">
						<div class="pricing-label">Automation</div>
						<div class="pricing-amount">$500</div>
						<div class="pricing-unit">one-time</div>
						<p class="pricing-description">
							Scheduled tasks, alerts, and automated workflows.
						</p>
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
				Build is step one. We can also host and operate your connections—monitoring, updates,
				and support so everything keeps running. Starts at $99/mo.
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
					<h3>What are you actually building?</h3>
					<p>A secure connection between your tools and AI agents. When it's done, Claude, Cursor, or Codex can access your systems—read data, take actions, run workflows—with the permissions you set.</p>
				</div>
			</BlurFade>
			
			<BlurFade delay={0.15}>
				<div class="faq-item">
					<h3>What tools can you connect?</h3>
					<p>Anything with an API. Salesforce, HubSpot, Notion, Slack, Procore, Google Workspace, internal databases—if it has an API, we can connect it.</p>
				</div>
			</BlurFade>
			
			<BlurFade delay={0.2}>
				<div class="faq-item">
					<h3>How does pricing work?</h3>
					<p>You pay per tool connected ($250) and per AI platform configured ($250). Add-ons like secure team login or automation are one-time fees. No hourly billing.</p>
				</div>
			</BlurFade>
			
			<BlurFade delay={0.25}>
				<div class="faq-item">
					<h3>Can you keep it running after launch?</h3>
					<p>Yes. Our managed runtime includes hosting, monitoring, and updates starting at $99/mo. Or we hand off a deployment package for self-hosting.</p>
				</div>
			</BlurFade>
			
			<BlurFade delay={0.3}>
				<div class="faq-item">
					<h3>What if I'm not sure what I need?</h3>
					<p>That's what the discovery call is for. Tell us your tools and goals—we'll map out the connections and give you a total before starting.</p>
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
			<ShimmerButton href="https://savvycal.com/createsomething/together">
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
	
	/* Scenarios Section */
	.scenarios-section {
		padding: var(--section-padding, 6rem) var(--container-padding, 1.5rem);
		border-top: 1px solid var(--color-border-default);
	}

	.section-subhead {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		text-align: center;
		margin-bottom: var(--space-8, 3rem);
	}

	.example-scenario {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-2, 0.5rem);
	}

	.value-anchor {
		text-align: center;
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-top: var(--space-6, 2rem);
		font-style: italic;
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
	
	.examples-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-5, 1.5rem);
		max-width: var(--content-width-xl);
		margin: 0 auto;
		align-items: stretch;
	}

	/* BlurFade wrappers must stretch so grid equalizes row height */
	.examples-grid > :global(*) {
		display: flex;
		flex-direction: column;
	}
	
	.example-card {
		position: relative;
		padding: var(--space-7, 2.5rem) var(--space-5, 1.5rem);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xl, 16px);
		text-align: center;
		background: var(--color-bg-pure);
		box-shadow: var(--glass-shine-soft);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-3, 0.75rem);
		flex: 1;
		transition:
			border-color var(--duration-standard) var(--ease-standard),
			box-shadow var(--duration-standard) var(--ease-standard),
			transform var(--duration-bounce) var(--ease-bounce);
	}

	.example-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 10%;
		right: 10%;
		height: 1px;
		background: linear-gradient(
			90deg,
			transparent,
			rgba(255, 255, 255, 0.15),
			transparent
		);
	}

	.example-card:hover {
		border-color: var(--color-border-emphasis);
		box-shadow: var(--glass-shine-standard), var(--glass-outer-sm);
		transform: translateY(-3px);
	}

	/* Popular / recommended card */
	.example-card.popular {
		border-color: rgba(96, 165, 250, 0.3);
		background: linear-gradient(
			180deg,
			rgba(96, 165, 250, 0.04) 0%,
			var(--color-bg-pure) 100%
		);
		box-shadow:
			var(--glass-shine-standard),
			0 0 0 1px rgba(96, 165, 250, 0.08);
	}

	.example-card.popular:hover {
		border-color: rgba(96, 165, 250, 0.5);
		box-shadow:
			var(--glass-shine-strong),
			0 0 0 1px rgba(96, 165, 250, 0.15),
			0 8px 32px rgba(96, 165, 250, 0.1);
		transform: translateY(-4px);
	}

	.example-card.popular::before {
		background: linear-gradient(
			90deg,
			transparent,
			rgba(96, 165, 250, 0.4),
			transparent
		);
	}

	.example-badge {
		position: absolute;
		top: -10px;
		left: 50%;
		transform: translateX(-50%);
		font-size: 0.65rem;
		font-weight: var(--font-semibold);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: rgba(96, 165, 250, 1);
		background: rgba(10, 14, 20, 0.85);
		backdrop-filter: blur(12px) saturate(120%);
		-webkit-backdrop-filter: blur(12px) saturate(120%);
		border: 1px solid rgba(96, 165, 250, 0.3);
		border-radius: var(--radius-full, 9999px);
		padding: 0.2rem 0.75rem;
		white-space: nowrap;
		z-index: 1;
	}
	
	.example-name {
		display: block;
		font-size: var(--text-body);
		font-weight: var(--font-bold);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-fg-primary);
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
		padding: 0.25rem 0.75rem;
		font-family: var(--font-mono, monospace);
	}
	
	.example-price {
		display: block;
		font-size: var(--text-display);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		font-family: var(--font-display);
		letter-spacing: var(--tracking-tighter, -0.025em);
		margin-top: auto;
		line-height: 1;
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
			max-width: 400px;
			margin: 0 auto;
		}

		.example-card.popular {
			order: -1;
		}

		.example-price {
			font-size: var(--text-h1);
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
		.scenarios-section,
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
