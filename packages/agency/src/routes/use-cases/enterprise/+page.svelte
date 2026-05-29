<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { IntegrationFlow } from '@create-something/canon/interactive';
	import { BlurFade, ShimmerButton } from '@create-something/canon/magicui';

	const deliveryVector = {
		canonicalPhrase: 'Skills on MCP',
		clientFacingLabel: 'Skills + MCP',
		technicalLabel: 'MCP + Skills'
	};

	// Integration flow — judgment layer architecture
	const integrations = [
		{ label: 'DB', name: 'Database Layer' },
		{ label: 'AT', name: 'Automation Layer' },
		{ label: 'JG', name: 'Judgment Layer' },
		{ label: 'OC', name: 'Orchestrator' }
	];

	const failureModes = [
		{
			title: 'Prompt Drift',
			description: 'Agent performance degrades as the business changes, edge cases accumulate, and prompts go untuned. What worked at launch stops holding up in month three.',
			icon: '01'
		},
		{
			title: 'Policy Gaps',
			description: 'No clear rules for escalation, ambiguity, or refusal. The agent makes one bad call, and trust in the system collapses.',
			icon: '02'
		},
		{
			title: 'Orphaned Connections',
			description: 'Connections get deployed and forgotten. APIs change, tokens expire, workflows evolve, and the automation quietly stops doing the right thing.',
			icon: '03'
		}
	];

	const services = [
		{
			name: 'Prompt Optimization',
			cadence: 'Weekly',
			description: 'Systematic review of agent outputs, prompt revisions, and behavior tuning to improve accuracy, tone, and consistency.',
			result: 'Your agents improve instead of drifting.'
		},
		{
			name: 'Agent Orchestration',
			cadence: 'Ongoing',
			description: 'Coordination across agents and systems so they do not conflict, duplicate work, or miss handoffs.',
			result: 'Clear handoffs instead of hidden collisions.'
		},
		{
			name: 'Policy Management',
			cadence: 'Ongoing',
			description: 'Decision rules, escalation paths, and boundary conditions for what the agent can do, cannot do, and when to involve a human.',
			result: 'Guardrails that protect the operation.'
		},
		{
			name: 'Performance Monitoring',
			cadence: 'Continuous',
			description: 'Uptime, accuracy, cost per operation, response times, and alerts when behavior starts degrading.',
			result: 'You know what is working, and what needs attention.'
		},
		{
			name: 'Quarterly Business Review',
			cadence: 'Quarterly',
			description: 'ROI measurement, expansion opportunities, and roadmap updates tied to actual operating results.',
			result: 'Every quarter, you get the numbers and the next move.'
		}
	];

	const tiers = [
		{
			name: 'Database',
			label: 'What your systems know',
			description: 'Data, records, content — the information layer. This is what exists.',
			accent: 'tier-database',
			active: false
		},
		{
			name: 'Automation',
			label: 'What your MCPs do',
			description: 'Connect, execute, transform — the action layer. This is what happens.',
			accent: 'tier-automation',
			active: false
		},
		{
			name: 'Judgment',
			label: 'What should happen',
			description: 'Policies, oversight, intelligence — the decision layer. This is where we operate.',
			accent: 'tier-judgment',
			active: true
		}
	];

	const plans = [
		{
			name: 'Workflow Control Core',
			price: '$1,500–$2,000',
			period: '/mo',
			scope: '1–2 workflows in operation',
			features: [
				'Custom MCP operating baseline',
				'Weekly prompt and policy tuning',
				'Monthly performance reporting',
				'Drift detection and correction'
			],
			featured: false
		},
		{
			name: 'Workflow Control Growth',
			price: '$2,000–$3,000',
			period: '/mo',
			scope: '3–5 workflows in operation',
			features: [
				'Everything in Core',
				'Cross-agent orchestration',
				'Approval and escalation policy operations',
				'Golden-task regression checks',
				'Bi-weekly optimization calls'
			],
			featured: true
		},
		{
			name: 'Regulated / Multi-Team',
			price: 'Custom',
			period: '',
			scope: 'Complex environments and governance-heavy operations',
			features: [
				'Everything in Growth',
				'Advanced governance and audit-ready controls',
				'Custom reporting dashboards',
				'Quarterly business review',
				'Expansion roadmapping',
				'Direct architect access (no account layers)'
			],
			featured: false
		}
	];

	const audiences = [
		'Organizations with 1+ MCP connections already running or being built',
		'Teams that deployed AI automation and need ongoing tuning',
		'Regulated industries needing governance and audit trails',
		'Anyone who\'s seen automation break silently and wants to prevent it'
	];
</script>

<SEO
	title="Policy OS for Enterprise Judgment | CREATE SOMETHING .agency"
	description="Policy OS for teams already running automation. Add policy operations, orchestration, and ongoing safeguards once the first workflow wedge is live."
	keywords="enterprise automation reliability, workflow controls, policy operations, ai governance, mcp wedge"
	ogImage="/og-image.svg"
	propertyName="agency"
/>

<!-- Hero -->
<section class="hero">
	<div class="hero-grid"></div>
	<div class="hero-container">
		<div class="hero-content">
			<BlurFade delay={0}>
				<p class="hero-eyebrow">The Judgment Layer</p>
			</BlurFade>
			<BlurFade delay={0.1}>
				<h1 class="hero-title">Reliability is what turns automation into operations.</h1>
			</BlurFade>
			<BlurFade delay={0.2}>
				<p class="hero-detail">
					For teams already running MCPs or cross-system workflows, this is Policy OS: the
					governed execution layer that keeps outcomes reliable after launch. We add prompt
					optimization, policy controls, approval and escalation logic, and ongoing operational
					oversight.
				</p>
			</BlurFade>
			<BlurFade delay={0.3}>
					<div class="hero-cta">
						<ShimmerButton href="https://createsomething.agency/book">
							Book Mapping Session
						</ShimmerButton>
						<a href="/services" class="hero-link">View all services →</a>
					</div>
			</BlurFade>
		</div>
		<BlurFade delay={0.4} class="hero-visual-wrapper">
			<div class="hero-visual">
				<IntegrationFlow 
					{integrations}
					description="Database → Automation → Judgment → Outcomes"
					intensity="medium"
					tint="none"
				/>
			</div>
		</BlurFade>
	</div>
</section>

<!-- The Problem -->
<section class="problem-section">
	<div class="section-container">
		<BlurFade>
			<p class="problem-stat">Most AI automation fails after deployment, not&nbsp;during&nbsp;it.</p>
		</BlurFade>

		<div class="failure-grid">
			{#each failureModes as mode, i}
				<BlurFade delay={i * 0.08 + 0.15}>
					<div class="failure-card">
						<div class="failure-num">{mode.icon}</div>
						<h3 class="failure-title">{mode.title}</h3>
						<p class="failure-desc">{mode.description}</p>
					</div>
				</BlurFade>
			{/each}
		</div>

		<BlurFade delay={0.5}>
			<p class="problem-conclusion">
				These are not connection problems. They are judgment problems.
			</p>
		</BlurFade>
	</div>
</section>

<!-- What the Judgment Layer Includes -->
<section class="services-section">
	<div class="section-container">
		<BlurFade>
			<h2 class="section-heading">What the Judgment Layer Includes</h2>
		</BlurFade>
			<BlurFade delay={0.1}>
				<p class="section-intro">
					Operational controls for every stage of the workflow lifecycle.
				</p>
		</BlurFade>

		<div class="services-grid">
			{#each services as service, i}
				<BlurFade delay={i * 0.08 + 0.2}>
					<div class="service-card">
						<div class="service-header">
							<h3 class="service-name">{service.name}</h3>
							<span class="service-cadence">{service.cadence}</span>
						</div>
						<p class="service-desc">{service.description}</p>
						<p class="service-result">{service.result}</p>
					</div>
				</BlurFade>
			{/each}
		</div>
	</div>
</section>

<!-- The Three-Tier Framework -->
<section class="framework-section">
	<div class="section-container">
		<BlurFade>
			<h2 class="section-heading">The Three-Tier Framework</h2>
		</BlurFade>
		<BlurFade delay={0.1}>
			<p class="section-intro">
				Every automation system has three layers. Most fail because the third is an afterthought.
			</p>
		</BlurFade>

		<div class="tier-grid">
			{#each tiers as tier, i}
				<BlurFade delay={i * 0.1 + 0.2}>
					<div class="tier-card {tier.accent}" class:tier-active={tier.active}>
						<div class="tier-header">
							<h3 class="tier-name">{tier.name}</h3>
							<span class="tier-label">{tier.label}</span>
						</div>
						<p class="tier-desc">{tier.description}</p>
						{#if tier.active}
							<p class="tier-badge">← This is where we operate.</p>
						{/if}
					</div>
				</BlurFade>
			{/each}
		</div>

		<BlurFade delay={0.6}>
			<p class="framework-conclusion">
				Most automation fails because Judgment is an afterthought. We make it the focus.
			</p>
		</BlurFade>
	</div>
</section>

<!-- Pricing -->
	<section class="pricing-section">
		<div class="section-container">
			<BlurFade>
				<h2 class="section-heading">Operating Plans</h2>
			</BlurFade>
			<BlurFade delay={0.1}>
				<p class="section-intro">
					Operating envelopes for teams with automation already in motion. MCP remains the entry wedge for constrained starts and compliance-sensitive rollouts.
				</p>
			</BlurFade>

		<div class="pricing-grid">
			{#each plans as plan, i}
				<BlurFade delay={i * 0.1 + 0.2}>
					<div class="pricing-card" class:featured={plan.featured}>
						<div class="pricing-card-inner">
							<div class="pricing-name">{plan.name}</div>
							<div class="pricing-price">
								{plan.price}<span class="pricing-period">{plan.period}</span>
							</div>
							<p class="pricing-scope">{plan.scope}</p>
							<ul class="pricing-features">
								{#each plan.features as feature}
									<li>{feature}</li>
								{/each}
								</ul>
									<div class="pricing-cta">
										<ShimmerButton href="https://createsomething.agency/book">
											Book Mapping Session
										</ShimmerButton>
									</div>
							</div>
					</div>
				</BlurFade>
			{/each}
		</div>

			<BlurFade delay={0.6}>
				<p class="pricing-footer">
					Need help picking the right path? <a href="https://createsomething.agency/book" class="pricing-link">Let's talk.</a>
				</p>
			</BlurFade>
		</div>
</section>

<!-- Who This Is For -->
<section class="audience-section">
	<div class="section-container">
		<BlurFade>
			<h2 class="section-heading">Who This Is For</h2>
		</BlurFade>

		<div class="audience-grid">
			{#each audiences as audience, i}
				<BlurFade delay={i * 0.08 + 0.15}>
					<div class="audience-card">
						<p class="audience-text">{audience}</p>
					</div>
				</BlurFade>
			{/each}
		</div>
	</div>
</section>

<!-- CTA -->
<section class="cta-section">
	<div class="section-container">
		<BlurFade>
			<h2 class="cta-heading">Your workflows need Policy OS.</h2>
		</BlurFade>
		<BlurFade delay={0.1}>
			<p class="cta-subtext">
				Run governed automation with clear policies, direct operational ownership, and reliability controls that hold up in production.
			</p>
		</BlurFade>
		<BlurFade delay={0.2}>
			<div class="cta-buttons">
				<ShimmerButton href="https://createsomething.agency/book">
					Book Mapping Session
				</ShimmerButton>
				<a href="/services" class="cta-secondary">Need a constrained start? Use an MCP Wedge →</a>
			</div>
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
		margin-bottom: var(--space-4, 1rem);
		letter-spacing: var(--tracking-tight, -0.015em);
	}
	
	.section-intro {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		text-align: center;
		max-width: var(--content-width-xl);
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
		max-width: var(--content-width-xl);
		margin: 0 auto;
	}
	
	.hero-content {
		text-align: left;
	}
	
	.hero-eyebrow {
		font-size: var(--text-body-sm);
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: rgba(251, 191, 36, 0.8);
		margin-bottom: var(--space-4, 1rem);
		font-weight: var(--font-semibold);
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
		max-width: var(--content-width-xl);
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
	
	/* The Problem */
	.problem-section {
		padding: var(--section-padding, 6rem) 0;
		text-align: center;
	}
	
	.problem-stat {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		max-width: 720px;
		margin: 0 auto var(--space-8, 3rem);
		line-height: 1.2;
		letter-spacing: var(--tracking-tight, -0.015em);
	}
	
	.failure-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-4, 1rem);
		margin-bottom: var(--space-8, 3rem);
	}
	
	.failure-card {
		padding: var(--space-5, 1.5rem);
		border-radius: var(--radius-lg, 12px);
		background: var(--color-bg-pure);
		box-shadow: var(--glass-shine-soft);
		text-align: left;
		transition: 
			border-color var(--duration-standard) var(--ease-standard),
			box-shadow var(--duration-standard) var(--ease-standard),
			transform var(--duration-bounce) var(--ease-bounce);
	}
	
	.failure-card:hover {
		border-color: var(--color-border-emphasis);
		box-shadow: var(--glass-shine-standard), var(--glass-outer-sm);
		transform: translateY(-2px);
	}
	
	.failure-num {
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-3, 0.75rem);
		font-variant-numeric: tabular-nums;
	}
	
	.failure-title {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-2, 0.5rem);
	}
	
	.failure-desc {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}
	
	.problem-conclusion {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		font-style: italic;
	}
	
	/* Services — What the Judgment Layer Includes */
	.services-section {
		padding: var(--section-padding, 6rem) 0;
	}
	
	.services-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-4, 1rem);
	}
	
	.service-card {
		padding: var(--space-5, 1.5rem);
		border-radius: var(--radius-lg, 12px);
		background: var(--color-bg-pure);
		box-shadow: var(--glass-shine-soft);
		display: flex;
		flex-direction: column;
		transition: 
			border-color var(--duration-standard) var(--ease-standard),
			box-shadow var(--duration-standard) var(--ease-standard),
			transform var(--duration-bounce) var(--ease-bounce);
	}
	
	.service-card:hover {
		border-color: var(--color-border-emphasis);
		box-shadow: var(--glass-shine-standard), var(--glass-outer-sm);
		transform: translateY(-2px);
	}
	
	.service-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: var(--space-3, 0.75rem);
	}
	
	.service-name {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}
	
	.service-cadence {
		font-size: var(--text-body-xs, 0.75rem);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	
	.service-desc {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-3, 0.75rem);
		flex: 1;
	}
	
	.service-result {
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		font-style: italic;
		padding-top: var(--space-3, 0.75rem);
		margin: 0;
	}
	
	/* Three-Tier Framework */
	.framework-section {
		padding: var(--section-padding, 6rem) 0;
	}
	
	.tier-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-4, 1rem);
		margin-bottom: var(--space-8, 3rem);
	}
	
	.tier-card {
		padding: var(--space-5, 1.5rem);
		border-radius: var(--radius-lg, 12px);
		background: var(--color-bg-pure);
		box-shadow: var(--glass-shine-soft);
		transition: 
			border-color var(--duration-standard) var(--ease-standard),
			box-shadow var(--duration-standard) var(--ease-standard),
			transform var(--duration-bounce) var(--ease-bounce);
	}
	
	.tier-card:hover {
		border-color: var(--color-border-emphasis);
		box-shadow: var(--glass-shine-standard), var(--glass-outer-sm);
		transform: translateY(-2px);
	}
	
	.tier-card.tier-database {
		border-top: 2px solid rgba(96, 165, 250, 0.5);
	}
	
	.tier-card.tier-automation {
		border-top: 2px solid rgba(167, 139, 250, 0.5);
	}
	
	.tier-card.tier-judgment {
		border-top: 2px solid rgba(251, 191, 36, 0.5);
	}
	
	.tier-card.tier-active {
		border-color: rgba(251, 191, 36, 0.3);
		background: linear-gradient(
			135deg,
			rgba(251, 191, 36, 0.04) 0%,
			rgba(251, 191, 36, 0.01) 100%
		);
		box-shadow: 
			var(--glass-shine-standard),
			0 0 0 1px rgba(251, 191, 36, 0.1);
	}
	
	.tier-card.tier-active:hover {
		border-color: rgba(251, 191, 36, 0.5);
		box-shadow: 
			var(--glass-shine-strong),
			0 0 0 1px rgba(251, 191, 36, 0.2),
			0 8px 32px rgba(251, 191, 36, 0.1);
		transform: translateY(-3px);
	}
	
	.tier-header {
		display: flex;
		align-items: baseline;
		gap: var(--space-3, 0.75rem);
		margin-bottom: var(--space-3, 0.75rem);
	}
	
	.tier-name {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}
	
	.tier-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		font-style: italic;
	}
	
	.tier-desc {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}
	
	.tier-badge {
		font-size: var(--text-body-xs, 0.75rem);
		color: rgba(251, 191, 36, 0.8);
		font-weight: var(--font-semibold);
		margin-top: var(--space-3, 0.75rem);
		margin-bottom: 0;
	}
	
	.framework-conclusion {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		text-align: center;
		font-style: italic;
	}
	
	/* Pricing */
	.pricing-section {
		padding: var(--section-padding, 6rem) 0;
	}
	
	.pricing-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-5, 1.5rem);
		margin-bottom: var(--space-6, 2rem);
	}
	
	.pricing-card {
		position: relative;
		border-radius: var(--radius-lg, 12px);
		background: var(--color-bg-pure);
		box-shadow: var(--glass-shine-soft);
		overflow: hidden;
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
		border-color: rgba(251, 191, 36, 0.3);
		background: linear-gradient(
			135deg,
			rgba(251, 191, 36, 0.03) 0%,
			rgba(251, 191, 36, 0.01) 100%
		);
		box-shadow: 
			var(--glass-shine-standard),
			0 0 0 1px rgba(251, 191, 36, 0.1);
	}
	
	.pricing-card.featured:hover {
		border-color: rgba(251, 191, 36, 0.5);
		box-shadow: 
			var(--glass-shine-strong),
			0 0 0 1px rgba(251, 191, 36, 0.2),
			0 8px 32px rgba(251, 191, 36, 0.15),
			0 0 60px rgba(251, 191, 36, 0.08);
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
			rgba(251, 191, 36, 0.4) 0%,
			rgba(251, 191, 36, 0.15) 50%,
			rgba(251, 191, 36, 0.4) 100%
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
	
	.pricing-card-inner {
		padding: var(--space-6, 2rem);
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
		margin-bottom: var(--space-1, 0.25rem);
	}
	
	.pricing-period {
		font-size: var(--text-h3);
		font-weight: var(--font-normal);
		color: var(--color-fg-muted);
	}
	
	.pricing-scope {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-5, 1.5rem);
		padding-bottom: var(--space-4, 1rem);
	}
	
	.pricing-features {
		list-style: none;
		padding: 0;
		margin: 0 0 var(--space-5, 1.5rem);
	}
	
	.pricing-features li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		padding: var(--space-1, 0.25rem) 0;
		display: flex;
		align-items: center;
		gap: var(--space-3, 0.75rem);
	}
	
	.pricing-features li::before {
		content: '✓';
		color: var(--color-success, #22c55e);
		flex-shrink: 0;
	}
	
	.pricing-footer {
		text-align: center;
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}
	
	.pricing-link {
		color: var(--color-fg-secondary);
		text-decoration: underline;
		text-underline-offset: 2px;
		transition: color var(--duration-micro, 200ms) var(--ease-standard);
	}
	
	.pricing-link:hover {
		color: var(--color-fg-primary);
	}
	
	/* Who This Is For */
	.audience-section {
		padding: var(--section-padding, 6rem) 0;
	}
	
	.audience-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-4, 1rem);
		max-width: 800px;
		margin: var(--space-8, 3rem) auto 0;
	}
	
	.audience-card {
		padding: var(--space-5, 1.5rem);
		border-radius: var(--radius-lg, 12px);
		transition: border-color var(--duration-micro, 200ms) var(--ease-standard);
	}
	
	.audience-card:hover {
		border-color: var(--color-border-emphasis);
	}
	
	.audience-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin: 0;
	}
	
	/* CTA */
	.cta-section {
		padding: var(--section-padding, 6rem) 0;
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
	
	.cta-buttons {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-4, 1rem);
	}
	
	.cta-secondary {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		text-decoration: none;
		transition: color var(--duration-micro, 200ms) var(--ease-standard);
	}
	
	.cta-secondary:hover {
		color: var(--color-fg-primary);
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
		
		.pricing-grid {
			grid-template-columns: 1fr;
			max-width: 480px;
			margin-left: auto;
			margin-right: auto;
		}
		
		.services-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	
	@media (max-width: 768px) {
		.failure-grid {
			grid-template-columns: 1fr;
		}
		
		.tier-grid {
			grid-template-columns: 1fr;
		}
		
		.services-grid {
			grid-template-columns: 1fr;
		}
		
		.audience-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
