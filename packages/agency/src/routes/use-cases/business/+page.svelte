<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { SavvyCalButton } from '@create-something/canon/domains/agency';
	import { IntegrationFlow } from '@create-something/canon/interactive';
	import { BlurFade, ShimmerButton } from '@create-something/canon/magicui';
	
	// Integration flow example
	const integrations = [
		{ label: 'HB', name: 'HubSpot' },
		{ label: 'MCP', name: 'MCP Server' },
		{ label: 'AI', name: 'Claude' },
		{ label: 'No', name: 'Notion' }
	];
	
	const painPoints = [
		{ problem: 'Copy-pasting between tools', solution: 'AI pulls from CRM, updates docs automatically' },
		{ problem: 'Context switching kills focus', solution: 'One interface to access all your systems' },
		{ problem: 'AI can\'t see your data', solution: 'MCP connects AI to your actual tools' },
		{ problem: '"AI integration" sounds expensive', solution: 'Fixed pricing from $500. Know the cost upfront.' }
	];
	
	const workflows = [
		{
			title: 'CRM → Docs Sync',
			tagline: 'Deals that document themselves',
			description: 'New deal closed in HubSpot. Meeting notes, contract terms, and project docs created in Notion automatically.'
		},
		{
			title: 'Support Intelligence',
			tagline: 'Tickets that get smarter',
			description: 'Customer emails analyzed. Priority assigned. Relevant context pulled from your knowledge base. Response drafted.'
		},
		{
			title: 'Report Generator',
			tagline: 'Reports that write themselves',
			description: 'Weekly metrics pulled from your tools. Summary generated. Sent to Slack or email. No manual aggregation.'
		}
	];
	
	const steps = [
		{ num: '1', title: 'Discovery Call', description: 'Map your tools and workflows' },
		{ num: '2', title: 'We Build', description: 'MCP servers + agent configuration' },
		{ num: '3', title: 'You Deploy', description: 'Your infrastructure, your keys' },
		{ num: '4', title: 'AI Works', description: 'Connected to your actual systems' }
	];
</script>

<SEO
	title="MCP for Business | Connect Your SaaS Tools to AI"
	description="Custom MCP development for SMB and mid-market. Connect HubSpot, Salesforce, Notion to AI. Fixed pricing from $500. Fast turnaround."
	keywords="MCP business, SaaS integration AI, HubSpot AI, Salesforce Claude, small business automation"
	ogImage="/og-image.svg"
	propertyName="agency"
/>

<!-- Hero -->
<section class="hero">
	<div class="hero-grid"></div>
	<div class="hero-container">
		<div class="hero-content">
			<BlurFade delay={0}>
				<p class="hero-eyebrow">Use Case</p>
			</BlurFade>
			<BlurFade delay={0.1}>
				<h1 class="hero-title">Tools that talk to AI.</h1>
			</BlurFade>
			<BlurFade delay={0.2}>
				<p class="hero-detail">
					Your CRM, docs, and support tools—connected to Claude, Cursor, or Codex. 
					See AI work across your actual systems.
				</p>
			</BlurFade>
			<BlurFade delay={0.3}>
				<div class="hero-cta">
					<ShimmerButton href="https://savvycal.com/create-something/discovery">
						Book Discovery Call
					</ShimmerButton>
					<a href="/services" class="hero-link">View pricing →</a>
				</div>
			</BlurFade>
		</div>
		<BlurFade delay={0.4} class="hero-visual-wrapper">
			<div class="hero-visual">
				<IntegrationFlow 
					{integrations}
					description="Deal closed → AI notified → Docs created → Team updated"
					intensity="medium"
					tint="none"
				/>
			</div>
		</BlurFade>
	</div>
</section>

<!-- Pain Points -->
<section class="pain-section">
	<div class="section-container">
		<BlurFade>
			<h2 class="section-heading">Problems, solved</h2>
		</BlurFade>
		<div class="pain-grid">
			{#each painPoints as item, i}
				<BlurFade delay={i * 0.1}>
					<div class="pain-card">
						<div class="pain-problem">{item.problem}</div>
						<div class="pain-arrow">→</div>
						<div class="pain-solution">{item.solution}</div>
					</div>
				</BlurFade>
			{/each}
		</div>
	</div>
</section>

<!-- How It Works -->
<section class="steps-section">
	<div class="section-container">
		<h2 class="section-heading reveal">How it works</h2>
		<p class="section-intro reveal">Four steps from discovery to deployment</p>
		<div class="steps-grid">
			{#each steps as step, i}
				<div class="step-card reveal" style="--delay: {i * 0.1}s">
					<div class="step-num">{step.num}</div>
					<h3 class="step-title">{step.title}</h3>
					<p class="step-desc">{step.description}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Workflows -->
<section class="workflows-section">
	<div class="section-container">
		<h2 class="section-heading reveal">Example workflows</h2>
		<p class="section-intro reveal">What becomes possible when your tools talk to AI</p>
		<div class="workflows-grid">
			{#each workflows as wf, i}
				<div class="workflow-card reveal" style="--delay: {i * 0.1}s">
					<h3 class="workflow-title">{wf.title}</h3>
					<p class="workflow-tagline">{wf.tagline}</p>
					<p class="workflow-desc">{wf.description}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Pricing -->
<section class="pricing-section">
	<div class="section-container">
		<div class="pricing-layout">
			<div class="pricing-copy">
				<BlurFade>
					<h2 class="section-heading">Simple pricing</h2>
				</BlurFade>
				<ul class="pricing-benefits">
					<BlurFade delay={0.1}><li>Fixed prices—no hourly billing</li></BlurFade>
					<BlurFade delay={0.15}><li>Source code included</li></BlurFade>
					<BlurFade delay={0.2}><li>Your infrastructure, your keys</li></BlurFade>
					<BlurFade delay={0.25}><li>Fast turnaround (3-5 days to 2 weeks)</li></BlurFade>
				</ul>
			</div>
			<div class="pricing-cards">
				<BlurFade delay={0.2}>
					<div class="pricing-card">
						<div class="pricing-name">Starter</div>
						<div class="pricing-price">$500</div>
						<p class="pricing-desc">2 tools + 1 agent. See the power.</p>
						<a href="/services" class="pricing-link">Learn more →</a>
					</div>
				</BlurFade>
				<BlurFade delay={0.3}>
					<div class="pricing-card featured">
						<div class="pricing-name">Pro</div>
						<div class="pricing-price">$2,500</div>
						<p class="pricing-desc">5+ tools, complex auth, 2 agents.</p>
						<a href="/services" class="pricing-link">Learn more →</a>
					</div>
				</BlurFade>
			</div>
		</div>
	</div>
</section>

<!-- CTA -->
<section class="cta-section">
	<div class="section-container">
		<BlurFade>
			<h2 class="cta-heading">Let's map your integration</h2>
		</BlurFade>
		<BlurFade delay={0.1}>
			<p class="cta-subtext">30-minute call. We'll scope what's possible.</p>
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
		max-width: 900px;
		margin: 0 auto;
		padding: 0 var(--container-padding, 1.5rem);
	}
	
	.section-heading {
		font-size: var(--text-h1);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		text-align: center;
		margin-bottom: var(--space-4, 1rem);
		letter-spacing: var(--tracking-tight, -0.015em);
	}
	
	.section-intro {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		text-align: center;
		max-width: 540px;
		margin: 0 auto var(--space-8, 3rem);
		line-height: var(--leading-relaxed);
	}
	
	/* Hero */
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
	
	.hero-container {
		position: relative;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-8, 3rem);
		align-items: center;
		max-width: 1100px;
		margin: 0 auto;
	}
	
	.hero-content {
		text-align: left;
	}
	
	.hero-eyebrow {
		font-size: var(--text-body-sm);
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-4, 1rem);
	}
	
	.hero-title {
		font-size: var(--text-display-xl);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-5, 1.5rem);
		line-height: 1.0;
		letter-spacing: var(--tracking-tighter, -0.025em);
	}
	
	.hero-detail {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-6, 2rem);
		line-height: var(--leading-relaxed);
		max-width: 420px;
	}
	
	.hero-cta {
		display: flex;
		align-items: center;
		gap: var(--space-4, 1rem);
	}
	
	.hero-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		text-decoration: none;
		transition: color var(--duration-micro, 200ms) var(--ease-standard);
	}
	
	.hero-link:hover {
		color: var(--color-fg-primary);
	}
	
	:global(.hero-visual-wrapper) {
		display: none;
	}
	
	@media (min-width: 901px) {
		:global(.hero-visual-wrapper) {
			display: block;
		}
	}
	
	/* Pain Points */
	.pain-section {
		padding: var(--section-padding, 6rem) 0;
		border-top: 1px solid var(--color-border-default);
	}
	
	.pain-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-4, 1rem);
	}
	
	.pain-card {
		padding: var(--space-5, 1.5rem);
		display: flex;
		align-items: flex-start;
		gap: var(--space-4, 1rem);
		border-radius: var(--radius-lg, 12px);
		border: 1px solid var(--color-border-default);
		background: var(--color-bg-pure);
		box-shadow: var(--glass-shine-soft);
		transition: 
			border-color var(--duration-standard) var(--ease-standard),
			box-shadow var(--duration-standard) var(--ease-standard),
			transform var(--duration-bounce) var(--ease-bounce);
	}
	
	.pain-card:hover {
		border-color: var(--color-border-emphasis);
		box-shadow: var(--glass-shine-standard), var(--glass-outer-sm);
		transform: translateY(-2px);
	}
	
	.pain-problem {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		flex: 1;
	}
	
	.pain-arrow {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
		flex-shrink: 0;
	}
	
	.pain-solution {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		flex: 1;
	}
	
	/* Steps */
	.steps-section {
		padding: var(--section-padding, 6rem) 0;
		border-top: 1px solid var(--color-border-default);
	}
	
	.steps-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-4, 1rem);
	}
	
	.step-card {
		text-align: center;
	}
	
	.step-num {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		border: 1px solid var(--color-border-emphasis);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 auto var(--space-4, 1rem);
	}
	
	.step-title {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-2, 0.5rem);
	}
	
	.step-desc {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}
	
	/* Workflows */
	.workflows-section {
		padding: var(--section-padding, 6rem) 0;
		border-top: 1px solid var(--color-border-default);
	}
	
	.workflows-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-4, 1rem);
	}
	
	.workflow-card {
		padding: var(--space-5, 1.5rem);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg, 12px);
		transition: border-color var(--duration-micro, 200ms) var(--ease-standard);
	}
	
	.workflow-card:hover {
		border-color: var(--color-border-emphasis);
	}
	
	.workflow-title {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-1, 0.25rem);
	}
	
	.workflow-tagline {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-3, 0.75rem);
	}
	
	.workflow-desc {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}
	
	/* Pricing */
	.pricing-section {
		padding: var(--section-padding, 6rem) 0;
		border-top: 1px solid var(--color-border-default);
	}
	
	.pricing-layout {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-8, 3rem);
		align-items: center;
	}
	
	.pricing-copy .section-heading {
		text-align: left;
		margin-bottom: var(--space-6, 2rem);
	}
	
	.pricing-benefits {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	
	.pricing-benefits li {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		padding: var(--space-2, 0.5rem) 0;
		display: flex;
		align-items: center;
		gap: var(--space-3, 0.75rem);
	}
	
	.pricing-benefits li::before {
		content: '✓';
		color: var(--color-success, #22c55e);
	}
	
	.pricing-cards {
		display: flex;
		flex-direction: column;
		gap: var(--space-4, 1rem);
	}
	
	.pricing-card {
		position: relative;
		padding: var(--space-5, 1.5rem);
		border-radius: var(--radius-lg, 12px);
		border: 1px solid var(--color-border-default);
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
			0 8px 32px rgba(96, 165, 250, 0.15),
			0 0 60px rgba(96, 165, 250, 0.08);
		transform: translateY(-3px);
	}
	
	.pricing-card.featured::before {
		content: '';
		position: absolute;
		inset: -1px;
		border-radius: inherit;
		padding: 1px;
		background: linear-gradient(
			135deg,
			rgba(96, 165, 250, 0.4) 0%,
			rgba(167, 139, 250, 0.4) 50%,
			rgba(96, 165, 250, 0.4) 100%
		);
		mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
		mask-composite: exclude;
		-webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
		-webkit-mask-composite: xor;
		animation: border-shimmer 3s ease-in-out infinite;
		pointer-events: none;
	}
	
	@keyframes border-shimmer {
		0%, 100% { opacity: 0.3; }
		50% { opacity: 0.6; }
	}
	
	.pricing-name {
		font-size: var(--text-body-sm);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-2, 0.5rem);
	}
	
	.pricing-price {
		font-size: var(--text-h1);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-2, 0.5rem);
	}
	
	.pricing-desc {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-3, 0.75rem);
	}
	
	.pricing-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		text-decoration: none;
	}
	
	.pricing-link:hover {
		color: var(--color-fg-primary);
	}
	
	/* CTA */
	.cta-section {
		padding: var(--section-padding, 6rem) 0;
		border-top: 1px solid var(--color-border-default);
		text-align: center;
	}
	
	.cta-heading {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-3, 0.75rem);
	}
	
	.cta-subtext {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-6, 2rem);
	}
	
/* Responsive */
	@media (max-width: 900px) {
		.hero-container {
			grid-template-columns: 1fr;
			text-align: center;
		}
		
		.hero-content {
			text-align: center;
		}
		
		.hero-detail {
			margin-left: auto;
			margin-right: auto;
		}
		
		.hero-cta {
			justify-content: center;
		}
		
		.pricing-layout {
			grid-template-columns: 1fr;
		}
		
		.pricing-copy .section-heading {
			text-align: center;
		}
	}
	
	@media (max-width: 768px) {
		.pain-grid {
			grid-template-columns: 1fr;
		}
		
		.steps-grid {
			grid-template-columns: repeat(2, 1fr);
		}
		
		.workflows-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
