<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { SavvyCalButton } from '@create-something/canon/domains/agency';
	import { IntegrationFlow } from '@create-something/canon/interactive';
	import { BlurFade, ShimmerButton } from '@create-something/canon/magicui';
	
	// Integration flow example - enterprise scale
	const integrations = [
		{ label: 'PC', name: 'Procore' },
		{ label: 'SF', name: 'Salesforce' },
		{ label: 'MCP', name: 'MCP Orchestrator' },
		{ label: 'AI', name: 'Claude' }
	];
	
	const capabilities = [
		{
			title: 'Automated Triggers',
			description: 'Schedule, webhook, and event-based triggers. Your agents run on schedules or react to system events.',
			icon: '⚡'
		},
		{
			title: 'Observability Dashboard',
			description: 'Track runs, costs, success rates, and latency. See what your agents are doing and what they cost.',
			icon: '📊'
		},
		{
			title: 'Workflow Orchestration',
			description: 'Agents that call other agents. Chain complex operations across multiple systems.',
			icon: '🔄'
		},
		{
			title: 'Multi-System Integration',
			description: 'Connect 5, 10, 20+ tools. Complex auth, data transforms, webhook handlers.',
			icon: '🔗'
		},
		{
			title: 'Error Handling & Recovery',
			description: 'Automatic retries, fallback paths, and alerting. Production-grade reliability.',
			icon: '🛡️'
		},
		{
			title: '30-Day Support',
			description: 'Optimization, troubleshooting, and iteration included. We stay until it works.',
			icon: '🤝'
		}
	];
	
	const useCases = [
		{
			industry: 'Construction',
			workflow: 'RFI → AI Analysis → Stakeholder Notification',
			tools: 'Procore, Slack, Email',
			outcome: 'RFIs processed in minutes, not days'
		},
		{
			industry: 'Financial Services',
			workflow: 'Report Generation → Compliance Check → Distribution',
			tools: 'Internal systems, Slack, Email',
			outcome: 'Weekly reports generated automatically'
		},
		{
			industry: 'Operations',
			workflow: 'System Monitoring → Issue Detection → Ticket Creation',
			tools: 'APIs, Jira, PagerDuty',
			outcome: 'Issues triaged before humans wake up'
		}
	];
	
	const steps = [
		{ num: '1', title: 'Architecture Review', description: 'Map your systems and requirements' },
		{ num: '2', title: 'Infrastructure Build', description: 'MCP servers, auth, data pipelines' },
		{ num: '3', title: 'Agent Configuration', description: 'Triggers, orchestration, observability' },
		{ num: '4', title: 'Production Deployment', description: 'Your infrastructure, monitored and optimized' }
	];
</script>

<SEO
	title="Enterprise MCP | AI Automation That Runs While You Sleep"
	description="Enterprise-grade MCP infrastructure. Automated triggers, observability, workflow orchestration. Production AI that operates 24/7. Starting at $5,000."
	keywords="enterprise MCP, AI automation enterprise, production AI agents, workflow orchestration, Claude enterprise"
	ogImage="/og-image.svg"
	propertyName="agency"
/>

<!-- Hero -->
<section class="hero">
	<div class="hero-grid"></div>
	<div class="hero-container">
		<div class="hero-content">
			<BlurFade delay={0}>
				<p class="hero-eyebrow">Enterprise</p>
			</BlurFade>
			<BlurFade delay={0.1}>
				<h1 class="hero-title">AI that runs while you sleep.</h1>
			</BlurFade>
			<BlurFade delay={0.2}>
				<p class="hero-detail">
					Automated triggers. Observability. Workflow orchestration. 
					Production-grade AI infrastructure that operates 24/7.
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
					description="Event triggers → Agents process → Systems update → Teams notified"
					intensity="medium"
					tint="none"
				/>
			</div>
		</BlurFade>
	</div>
</section>

<!-- Capabilities -->
<section class="capabilities-section">
	<div class="section-container">
		<BlurFade>
			<h2 class="section-heading">Intelligence Layer</h2>
		</BlurFade>
		<BlurFade delay={0.1}>
			<p class="section-intro">
				Beyond connectivity—automation that thinks, acts, and reports.
			</p>
		</BlurFade>
		<div class="capabilities-grid">
			{#each capabilities as cap, i}
				<BlurFade delay={i * 0.05 + 0.2}>
					<div class="capability-card">
						<div class="capability-icon">{cap.icon}</div>
						<h3 class="capability-title">{cap.title}</h3>
						<p class="capability-desc">{cap.description}</p>
					</div>
				</BlurFade>
			{/each}
		</div>
	</div>
</section>

<!-- How It Works -->
<section class="steps-section">
	<div class="section-container">
		<h2 class="section-heading reveal">Implementation</h2>
		<p class="section-intro reveal">From architecture to production</p>
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

<!-- Use Cases -->
<section class="usecases-section">
	<div class="section-container">
		<h2 class="section-heading reveal">Example deployments</h2>
		<p class="section-intro reveal">Production automation across industries</p>
		<div class="usecases-grid">
			{#each useCases as uc, i}
				<div class="usecase-card reveal" style="--delay: {i * 0.1}s">
					<div class="usecase-industry">{uc.industry}</div>
					<div class="usecase-workflow">{uc.workflow}</div>
					<div class="usecase-tools">
						<span class="tools-label">Tools:</span> {uc.tools}
					</div>
					<div class="usecase-outcome">{uc.outcome}</div>
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
					<h2 class="section-heading">Intelligence tier</h2>
				</BlurFade>
				<BlurFade delay={0.1}>
					<p class="pricing-lead">
						Full production deployment with ongoing support and optimization.
					</p>
				</BlurFade>
				<ul class="pricing-includes">
					<BlurFade delay={0.15}><li>3+ configured agents</li></BlurFade>
					<BlurFade delay={0.2}><li>Automated triggers (schedule, webhook, event)</li></BlurFade>
					<BlurFade delay={0.25}><li>Observability dashboard</li></BlurFade>
					<BlurFade delay={0.3}><li>Workflow orchestration</li></BlurFade>
					<BlurFade delay={0.35}><li>30 days support included</li></BlurFade>
				</ul>
			</div>
			<BlurFade delay={0.3}>
				<div class="pricing-card-outer">
					<div class="pricing-card featured">
						<div class="pricing-name">Intelligence</div>
						<div class="pricing-price">$5,000<span class="pricing-plus">+</span></div>
						<p class="pricing-desc">Scales with complexity. Custom scoping on discovery call.</p>
						<div class="pricing-cta">
							<ShimmerButton href="https://savvycal.com/create-something/discovery">
								Book Discovery Call
							</ShimmerButton>
						</div>
					</div>
				</div>
			</BlurFade>
		</div>
	</div>
</section>

<!-- Comparison -->
<section class="comparison-section">
	<div class="section-container">
		<h2 class="section-heading reveal">Not ready for Intelligence?</h2>
		<p class="section-intro reveal">Start smaller and scale up</p>
		<div class="comparison-grid">
			<a href="/use-cases/business" class="comparison-card reveal">
				<div class="comparison-tier">Starter / Pro</div>
				<div class="comparison-price">$500 – $2,500</div>
				<p class="comparison-desc">Connect tools to AI. See the power. Scale when ready.</p>
				<span class="comparison-link">Learn more →</span>
			</a>
		</div>
	</div>
</section>

<!-- CTA -->
<section class="cta-section">
	<div class="section-container">
		<BlurFade>
			<h2 class="cta-heading">Outcomes while you sleep.</h2>
		</BlurFade>
		<BlurFade delay={0.1}>
			<p class="cta-subtext">Architecture review. Custom scoping. Let's build your automation layer.</p>
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
	
	/* Capabilities */
	.capabilities-section {
		padding: var(--section-padding, 6rem) 0;
		border-top: 1px solid var(--color-border-default);
	}
	
	.capabilities-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-4, 1rem);
	}
	
	.capability-card {
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
	
	.capability-card:hover {
		border-color: var(--color-border-emphasis);
		box-shadow: var(--glass-shine-standard), var(--glass-outer-sm);
		transform: translateY(-2px);
	}
	
	.capability-icon {
		font-size: 1.5rem;
		margin-bottom: var(--space-3, 0.75rem);
	}
	
	.capability-title {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-2, 0.5rem);
	}
	
	.capability-desc {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
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
	
	/* Use Cases */
	.usecases-section {
		padding: var(--section-padding, 6rem) 0;
		border-top: 1px solid var(--color-border-default);
	}
	
	.usecases-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-4, 1rem);
	}
	
	.usecase-card {
		padding: var(--space-5, 1.5rem);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg, 12px);
		transition: border-color var(--duration-micro, 200ms) var(--ease-standard);
	}
	
	.usecase-card:hover {
		border-color: var(--color-border-emphasis);
	}
	
	.usecase-industry {
		font-size: var(--text-body-sm);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-3, 0.75rem);
	}
	
	.usecase-workflow {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-3, 0.75rem);
	}
	
	.usecase-tools {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-3, 0.75rem);
	}
	
	.tools-label {
		color: var(--color-fg-muted);
	}
	
	.usecase-outcome {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		padding-top: var(--space-3, 0.75rem);
		border-top: 1px solid var(--color-border-default);
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
		margin-bottom: var(--space-4, 1rem);
	}
	
	.pricing-lead {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-6, 2rem);
	}
	
	.pricing-includes {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	
	.pricing-includes li {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		padding: var(--space-2, 0.5rem) 0;
		display: flex;
		align-items: center;
		gap: var(--space-3, 0.75rem);
	}
	
	.pricing-includes li::before {
		content: '✓';
		color: var(--color-success, #22c55e);
	}
	
	.pricing-card-outer {
		display: flex;
		justify-content: center;
	}
	
	.pricing-card {
		position: relative;
		padding: var(--space-6, 2rem);
		text-align: center;
		border-radius: var(--radius-lg, 12px);
		border: 1px solid var(--color-border-default);
		background: var(--color-bg-pure);
		max-width: 320px;
		width: 100%;
		box-shadow: var(--glass-shine-soft);
		transition: 
			border-color var(--duration-standard) var(--ease-standard),
			box-shadow var(--duration-standard) var(--ease-standard),
			transform var(--duration-bounce) var(--ease-bounce);
	}
	
	.pricing-card.featured {
		border-color: rgba(167, 139, 250, 0.3);
		background: linear-gradient(
			135deg,
			rgba(167, 139, 250, 0.03) 0%,
			rgba(96, 165, 250, 0.03) 100%
		);
		box-shadow: 
			var(--glass-shine-standard),
			0 0 0 1px rgba(167, 139, 250, 0.1);
	}
	
	.pricing-card.featured:hover {
		border-color: rgba(167, 139, 250, 0.5);
		box-shadow: 
			var(--glass-shine-strong),
			0 0 0 1px rgba(167, 139, 250, 0.2),
			0 8px 32px rgba(167, 139, 250, 0.15),
			0 0 60px rgba(167, 139, 250, 0.08);
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
			rgba(167, 139, 250, 0.4) 0%,
			rgba(96, 165, 250, 0.4) 50%,
			rgba(167, 139, 250, 0.4) 100%
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
		font-size: var(--text-display);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-3, 0.75rem);
	}
	
	.pricing-plus {
		font-size: var(--text-h2);
		color: var(--color-fg-muted);
	}
	
	.pricing-desc {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-5, 1.5rem);
	}
	
	/* Comparison */
	.comparison-section {
		padding: var(--section-padding, 6rem) 0;
		border-top: 1px solid var(--color-border-default);
	}
	
	.comparison-grid {
		display: flex;
		justify-content: center;
	}
	
	.comparison-card {
		padding: var(--space-5, 1.5rem);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg, 12px);
		text-decoration: none;
		max-width: 400px;
		text-align: center;
		transition: border-color var(--duration-micro, 200ms) var(--ease-standard);
	}
	
	.comparison-card:hover {
		border-color: var(--color-border-emphasis);
	}
	
	.comparison-tier {
		font-size: var(--text-body-sm);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-2, 0.5rem);
	}
	
	.comparison-price {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-3, 0.75rem);
	}
	
	.comparison-desc {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-3, 0.75rem);
	}
	
	.comparison-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
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
		
		.pricing-lead {
			text-align: center;
		}
	}
	
	@media (max-width: 768px) {
		.capabilities-grid {
			grid-template-columns: 1fr;
		}
		
		.steps-grid {
			grid-template-columns: repeat(2, 1fr);
		}
		
		.usecases-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
