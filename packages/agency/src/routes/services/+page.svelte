<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { BlurFade, ShimmerButton } from '@create-something/canon/magicui';

	// Structured data for SEO/AEO
	const services = [
		{
			name: 'Custom MCP Server',
			description: 'We build a custom MCP server that connects your tool to AI agents. Requirements discovery, development, auth setup, testing, deployment, documentation, and source code ownership included.',
			type: 'MCP Development',
			price: '2000',
			priceDescription: 'Starting at $2,000'
		},
		{
			name: 'Subtractive Triad Audit',
			description: 'Complete systems inventory, workflow mapping, and Subtractive Triad analysis. Find duplication, excess, and disconnection across your stack. ROI-scored prioritized roadmap.',
			type: 'Strategic Audit',
			price: '5000',
			priceDescription: 'Starting at $5,000'
		},
		{
			name: 'The Judgment Layer',
			description: 'Managed automation intelligence. Prompt optimization, workflow evolution, policy management, performance monitoring, and quarterly business reviews.',
			type: 'Managed Services',
			price: '1500',
			priceDescription: 'Starting at $1,500/month'
		}
	];

	const faqItems = [
		{
			question: "Can I just buy an MCP without the audit or managed services?",
			answer: "Absolutely. Most clients start with a single MCP. No commitment beyond that. If you want to expand later, we're here."
		},
		{
			question: "What's a Judgment Layer?",
			answer: "It's what makes automation intelligent. Your MCP connects tools to AI. The Judgment Layer decides how that connection is used — what the agent does, when it escalates, how it improves. Think of it as the difference between having a phone line and having someone smart answering it."
		},
		{
			question: "How is this different from Zapier?",
			answer: "Zapier connects tools to tools. We connect tools to AI agents. Your MCP lets Claude or Cursor read your CRM, draft responses, update records, and make decisions — not just move data between apps."
		},
		{
			question: "Do I own the code?",
			answer: "Yes. Every MCP we build, you own the source code, the deployment package, and the documentation. No lock-in."
		},
		{
			question: "What tools can you connect?",
			answer: "Anything with an API. Salesforce, HubSpot, Notion, Slack, Google Workspace, Procore, QuickBooks, internal databases, custom systems. If it has an API, we can connect it."
		},
		{
			question: "How fast can you build an MCP?",
			answer: "Simple integrations: 2 weeks. Complex integrations: 3–4 weeks. We'll give you a timeline before starting."
		}
	];
</script>

<SEO
	title="Services | Custom MCP Servers & Managed Automation"
	description="Custom MCP servers from $2,000. Connect your tools to AI agents — Claude, Cursor, Codex. Managed automation intelligence from $1,500/mo. You own the code."
	keywords="custom MCP server, MCP development, connect tools to AI, AI agent integration, automation consulting, managed MCP, Claude integration, Cursor integration, Codex integration, MCP-compatible"
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
			<h1 class="hero-title">Connect Your Tools to AI</h1>
		</BlurFade>
		<BlurFade delay={0.2}>
			<p class="hero-subtitle">
				We build custom MCP servers that let AI agents work with your existing tools.
				Start with one connection. Expand when you're ready.
			</p>
		</BlurFade>
	</div>
</section>

<!-- Tier 1: Custom MCP Server -->
<section class="tier-section">
	<div class="section-container">
		<BlurFade>
			<div class="tier-eyebrow-row">
				<span class="tier-number">01</span>
				<span class="tier-label-text">The Entry Point</span>
			</div>
			<h2 class="section-heading">Custom MCP Server</h2>
			<p class="section-subhead">
				We build a custom MCP server that connects your tool to AI agents.
			</p>
		</BlurFade>

		<BlurFade delay={0.1}>
			<div class="tier-card">
				<div class="tier-header">
					<div class="tier-pricing">
						<div class="tier-price">$2,000 – $5,000</div>
						<div class="tier-duration">2–4 weeks</div>
					</div>
					<p class="tier-pricing-note">
						Simple integrations (single API, standard auth) start at $2,000.
						Complex integrations (multiple endpoints, OAuth, custom logic) up to $5,000.
					</p>
				</div>
				<div class="tier-body">
					<div class="tier-columns">
						<div class="tier-detail">
							<h3>What's Included</h3>
							<ul class="tier-list">
								<li>Requirements discovery</li>
								<li>MCP server development</li>
								<li>Authentication setup</li>
								<li>Error handling</li>
								<li>Testing</li>
								<li>Deployment</li>
								<li>Documentation</li>
								<li>Source code — you own it</li>
								<li>14 days of bug fixes</li>
							</ul>
						</div>
						<div class="tier-detail">
							<h3>What You Can Connect</h3>
							<p>
								Any tool with an API — CRM, docs, chat, email, project management,
								internal databases, custom systems.
							</p>
							<h3 class="mt">AI Platforms</h3>
							<p>
								Claude, Cursor, Codex — or any MCP-compatible client.
							</p>
						</div>
					</div>
					<div class="tier-cta">
						<ShimmerButton href="/contact">Get Started</ShimmerButton>
					</div>
				</div>
			</div>
		</BlurFade>
	</div>
</section>

<!-- Tier 2: Subtractive Triad Audit -->
<section class="tier-section">
	<div class="section-container">
		<BlurFade>
			<div class="tier-eyebrow-row">
				<span class="tier-number">02</span>
				<span class="tier-label-text">The Expansion</span>
			</div>
			<h2 class="section-heading">Subtractive Triad Audit</h2>
			<p class="section-subhead">
				See what one MCP does? Now let's map the whole picture.
			</p>
		</BlurFade>

		<BlurFade delay={0.1}>
			<div class="tier-card">
				<div class="tier-header">
					<div class="tier-pricing">
						<div class="tier-price">$5,000 – $10,000</div>
						<div class="tier-duration">2–3 weeks</div>
					</div>
				</div>
				<div class="tier-body">
					<div class="tier-columns">
						<div class="tier-detail">
							<h3>What's Included</h3>
							<ul class="tier-list">
								<li>Complete systems inventory</li>
								<li>Workflow mapping</li>
								<li>Subtractive Triad analysis — find duplication, excess, disconnection</li>
								<li>Three-Tier Framework classification (Database / Automation / Judgment)</li>
								<li>ROI scoring for every automation opportunity</li>
								<li>Prioritized roadmap</li>
							</ul>
						</div>
						<div class="tier-detail">
							<h3>Deliverable</h3>
							<p>Strategic report + implementation roadmap.</p>
							<div class="tier-note">
								<p>
									The audit is standalone — no commitment to build. Most clients use it
									to decide what to build next.
								</p>
							</div>
							<div class="tier-note">
								<p>
									Already bought an MCP from us? The audit builds on what we learned.
									You don't pay for discovery twice.
								</p>
							</div>
						</div>
					</div>
					<div class="tier-cta">
						<ShimmerButton href="/book">Book Audit</ShimmerButton>
					</div>
				</div>
			</div>
		</BlurFade>
	</div>
</section>

<!-- Tier 3: The Judgment Layer (FEATURED) -->
<section class="tier-section tier-section-featured">
	<div class="section-container">
		<BlurFade>
			<div class="tier-eyebrow-row">
				<span class="tier-number featured-number">03</span>
				<span class="tier-label-text">The Retained Relationship</span>
			</div>
			<h2 class="section-heading">The Judgment Layer</h2>
			<p class="section-subhead">
				Connections without intelligence are just pipes.
				The Judgment Layer makes your automation smart.
			</p>
		</BlurFade>

		<BlurFade delay={0.1}>
			<div class="tier-card featured">
				<span class="tier-badge">Recommended</span>
				<div class="tier-header">
					<div class="tier-pricing">
						<div class="tier-price">$1,500 – $3,500<span class="price-unit">/mo</span></div>
					</div>
					<div class="pricing-tiers-breakdown">
						<div class="pricing-tier-item">
							<span class="pricing-tier-agents">1–2 agents/MCPs</span>
							<span class="pricing-tier-cost">$1,500/mo</span>
						</div>
						<div class="pricing-tier-item">
							<span class="pricing-tier-agents">3–5 agents/MCPs</span>
							<span class="pricing-tier-cost">$2,500/mo</span>
						</div>
						<div class="pricing-tier-item">
							<span class="pricing-tier-agents">5+ agents/MCPs</span>
							<span class="pricing-tier-cost">$3,500/mo</span>
						</div>
						<p class="pricing-custom">Custom pricing for complex environments.</p>
					</div>
				</div>
				<div class="tier-body">
					<div class="tier-columns">
						<div class="tier-detail">
							<h3>What's Included Monthly</h3>
							<ul class="tier-list">
								<li>
									<strong>Prompt optimization & agent tuning</strong> — weekly review of
									agent performance, systematic prompt refinement
								</li>
								<li>
									<strong>Workflow evolution</strong> — adapt automations as your
									business changes
								</li>
								<li>
									<strong>Policy management</strong> — decision rules, escalation paths,
									edge case handling
								</li>
								<li>
									<strong>Performance monitoring</strong> — uptime, accuracy, cost tracking
								</li>
								<li>
									<strong>Quarterly business review</strong> — expansion opportunities,
									ROI measurement, roadmap update
								</li>
							</ul>
						</div>
						<div class="tier-detail">
							<h3>Why Clients Start Here</h3>
							<div class="tier-note">
								<p>
									Most clients start here after their first MCP is running. You see
									the value of the connection — now make it intelligent.
								</p>
							</div>
						</div>
					</div>
					<div class="tier-cta">
						<ShimmerButton href="/book">Start Managed Services</ShimmerButton>
					</div>
				</div>
			</div>
		</BlurFade>
	</div>
</section>

<!-- The Pathway -->
<section class="pathway-section">
	<div class="section-container">
		<BlurFade>
			<h2 class="section-heading">The Pathway</h2>
		</BlurFade>

		<div class="pathway-visual">
			<BlurFade delay={0.1}>
				<div class="pathway-step">
					<div class="pathway-icon">
						<span class="pathway-num">1</span>
					</div>
					<h3>Connect</h3>
					<p>One MCP server.<br />$2k–$5k.</p>
				</div>
			</BlurFade>

			<BlurFade delay={0.15}>
				<div class="pathway-arrow" aria-hidden="true">
					<svg width="32" height="16" viewBox="0 0 32 16" fill="none">
						<path d="M0 8h28m0 0l-6-6m6 6l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</div>
			</BlurFade>

			<BlurFade delay={0.2}>
				<div class="pathway-step">
					<div class="pathway-icon">
						<span class="pathway-num">2</span>
					</div>
					<h3>Map</h3>
					<p>Audit your full stack.<br />$5k–$10k.</p>
				</div>
			</BlurFade>

			<BlurFade delay={0.25}>
				<div class="pathway-arrow" aria-hidden="true">
					<svg width="32" height="16" viewBox="0 0 32 16" fill="none">
						<path d="M0 8h28m0 0l-6-6m6 6l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</div>
			</BlurFade>

			<BlurFade delay={0.3}>
				<div class="pathway-step">
					<div class="pathway-icon pathway-icon-featured">
						<span class="pathway-num">3</span>
					</div>
					<h3>Operate</h3>
					<p>Intelligence layer.<br />$1.5k–$3.5k/mo.</p>
				</div>
			</BlurFade>
		</div>

		<BlurFade delay={0.35}>
			<p class="pathway-summary">
				Most clients follow this path. Start with one MCP. See the value. Audit your
				full stack. Then let us run the intelligence layer. Each step builds on the last.
			</p>
		</BlurFade>
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
					<h3>Can I just buy an MCP without the audit or managed services?</h3>
					<p>
						Absolutely. Most clients start with a single MCP. No commitment beyond
						that. If you want to expand later, we're here.
					</p>
				</div>
			</BlurFade>

			<BlurFade delay={0.15}>
				<div class="faq-item">
					<h3>What's a Judgment Layer?</h3>
					<p>
						It's what makes automation intelligent. Your MCP connects tools to AI. The
						Judgment Layer decides how that connection is used — what the agent does,
						when it escalates, how it improves. Think of it as the difference between
						having a phone line and having someone smart answering it.
					</p>
				</div>
			</BlurFade>

			<BlurFade delay={0.2}>
				<div class="faq-item">
					<h3>How is this different from Zapier?</h3>
					<p>
						Zapier connects tools to tools. We connect tools to AI agents. Your MCP
						lets Claude or Cursor read your CRM, draft responses, update records, and
						make decisions — not just move data between apps.
					</p>
				</div>
			</BlurFade>

			<BlurFade delay={0.25}>
				<div class="faq-item">
					<h3>Do I own the code?</h3>
					<p>
						Yes. Every MCP we build, you own the source code, the deployment package,
						and the documentation. No lock-in.
					</p>
				</div>
			</BlurFade>

			<BlurFade delay={0.3}>
				<div class="faq-item">
					<h3>What tools can you connect?</h3>
					<p>
						Anything with an API. Salesforce, HubSpot, Notion, Slack, Google Workspace,
						Procore, QuickBooks, internal databases, custom systems. If it has an API,
						we can connect it.
					</p>
				</div>
			</BlurFade>

			<BlurFade delay={0.35}>
				<div class="faq-item">
					<h3>How fast can you build an MCP?</h3>
					<p>
						Simple integrations: 2 weeks. Complex integrations: 3–4 weeks. We'll give
						you a timeline before starting.
					</p>
				</div>
			</BlurFade>
		</div>
	</div>
</section>

<!-- CTA -->
<section class="cta-section">
	<div class="section-container">
		<BlurFade>
			<h2 class="cta-heading">Start with one connection.</h2>
		</BlurFade>
		<BlurFade delay={0.1}>
			<div class="cta-buttons">
				<ShimmerButton href="/contact">Get Your First MCP</ShimmerButton>
				<a href="/book" class="cta-secondary">Have questions? Book a call</a>
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
		margin-bottom: var(--space-3, 0.75rem);
		letter-spacing: var(--tracking-tight, -0.015em);
	}

	.section-subhead {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		text-align: center;
		max-width: 640px;
		margin: 0 auto var(--space-8, 3rem);
		line-height: var(--leading-relaxed);
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
		max-width: 600px;
		margin: 0 auto;
		line-height: var(--leading-relaxed);
	}

	/* Tier Sections */
	.tier-section {
		padding: var(--section-padding, 6rem) var(--container-padding, 1.5rem);
		border-top: 1px solid var(--color-border-default);
	}

	.tier-section-featured {
		background: linear-gradient(
			180deg,
			rgba(96, 165, 250, 0.02) 0%,
			transparent 100%
		);
	}

	.tier-eyebrow-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-3, 0.75rem);
		margin-bottom: var(--space-4, 1rem);
	}

	.tier-number {
		font-size: var(--text-caption);
		font-weight: var(--font-bold);
		color: var(--color-fg-muted);
		width: 1.75rem;
		height: 1.75rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-full, 9999px);
	}

	.tier-number.featured-number {
		border-color: rgba(96, 165, 250, 0.4);
		color: rgba(96, 165, 250, 1);
	}

	.tier-label-text {
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
	}

	/* Tier Cards */
	.tier-card {
		position: relative;
		max-width: 800px;
		margin: 0 auto;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xl, 16px);
		background: var(--color-bg-pure);
		box-shadow: var(--glass-shine-soft);
		overflow: visible;
		transition:
			border-color var(--duration-standard) var(--ease-standard),
			box-shadow var(--duration-standard) var(--ease-standard),
			transform var(--duration-bounce) var(--ease-bounce);
	}

	.tier-card::before {
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

	.tier-card:hover {
		border-color: var(--color-border-emphasis);
		box-shadow: var(--glass-shine-standard), var(--glass-outer-sm);
		transform: translateY(-2px);
	}

	/* Featured tier */
	.tier-card.featured {
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

	.tier-card.featured:hover {
		border-color: rgba(96, 165, 250, 0.5);
		box-shadow:
			var(--glass-shine-strong),
			0 0 0 1px rgba(96, 165, 250, 0.15),
			0 8px 32px rgba(96, 165, 250, 0.1);
		transform: translateY(-3px);
	}

	.tier-card.featured::before {
		background: linear-gradient(
			90deg,
			transparent,
			rgba(96, 165, 250, 0.4),
			transparent
		);
	}

	.tier-badge {
		position: absolute;
		top: -10px;
		left: 50%;
		transform: translateX(-50%);
		font-size: 0.65rem;
		font-weight: var(--font-semibold);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: rgba(96, 165, 250, 1);
		background: rgba(10, 14, 20, 0.95);
		backdrop-filter: blur(12px) saturate(120%);
		-webkit-backdrop-filter: blur(12px) saturate(120%);
		border: 1px solid rgba(96, 165, 250, 0.3);
		border-radius: var(--radius-full, 9999px);
		padding: 0.2rem 0.75rem;
		white-space: nowrap;
		z-index: 10;
	}

	.tier-header {
		padding: var(--space-6, 2rem) var(--space-5, 1.5rem);
		border-bottom: 1px solid var(--color-border-default);
	}

	.tier-pricing {
		text-align: center;
	}

	.tier-price {
		font-size: var(--text-display);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		letter-spacing: var(--tracking-tighter, -0.025em);
		line-height: 1;
	}

	.price-unit {
		font-size: var(--text-h2);
		font-weight: var(--font-normal, 400);
		color: var(--color-fg-tertiary);
	}

	.tier-duration {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-top: var(--space-1, 0.25rem);
		text-align: center;
	}

	.tier-pricing-note {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		text-align: center;
		max-width: 520px;
		margin: var(--space-3, 0.75rem) auto 0;
		line-height: var(--leading-relaxed);
	}

	/* Pricing breakdown for Judgment Layer */
	.pricing-tiers-breakdown {
		margin-top: var(--space-4, 1rem);
		display: flex;
		flex-direction: column;
		gap: var(--space-2, 0.5rem);
		max-width: 320px;
		margin-left: auto;
		margin-right: auto;
	}

	.pricing-tier-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md, 8px);
		background: rgba(255, 255, 255, 0.02);
	}

	.pricing-tier-agents {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.pricing-tier-cost {
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.pricing-custom {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
		text-align: center;
		margin-top: var(--space-1, 0.25rem);
	}

	.tier-body {
		padding: var(--space-5, 1.5rem);
		display: flex;
		flex-direction: column;
		gap: var(--space-5, 1.5rem);
	}

	.tier-columns {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-5, 1.5rem);
	}

	.tier-detail h3 {
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-2, 0.5rem);
	}

	.tier-detail h3.mt {
		margin-top: var(--space-4, 1rem);
	}

	.tier-detail p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	.tier-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2, 0.5rem);
	}

	.tier-list li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		padding-left: 1.25rem;
		position: relative;
	}

	.tier-list li::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0.55em;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--color-border-emphasis);
	}

	.tier-note {
		margin-top: var(--space-3, 0.75rem);
		padding: var(--space-3, 0.75rem);
		border-left: 2px solid var(--color-border-emphasis);
		background: rgba(255, 255, 255, 0.02);
		border-radius: 0 var(--radius-sm, 4px) var(--radius-sm, 4px) 0;
	}

	.tier-note p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
		font-style: italic;
	}

	.tier-cta {
		display: flex;
		justify-content: center;
		padding-top: var(--space-3, 0.75rem);
		border-top: 1px solid var(--color-border-default);
	}

	/* Pathway Section */
	.pathway-section {
		padding: var(--section-padding, 6rem) var(--container-padding, 1.5rem);
		border-top: 1px solid var(--color-border-default);
	}

	.pathway-visual {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-4, 1rem);
		margin: var(--space-6, 2rem) auto;
		max-width: 640px;
	}

	.pathway-step {
		text-align: center;
		flex: 1;
	}

	.pathway-icon {
		width: 3rem;
		height: 3rem;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto var(--space-3, 0.75rem);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-full, 9999px);
		background: var(--color-bg-pure);
		transition:
			border-color var(--duration-standard) var(--ease-standard),
			box-shadow var(--duration-standard) var(--ease-standard);
	}

	.pathway-icon-featured {
		border-color: rgba(96, 165, 250, 0.4);
		box-shadow: 0 0 12px rgba(96, 165, 250, 0.15);
	}

	.pathway-num {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-secondary);
	}

	.pathway-icon-featured .pathway-num {
		color: rgba(96, 165, 250, 1);
	}

	.pathway-step h3 {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-1, 0.25rem);
	}

	.pathway-step p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
	}

	.pathway-arrow {
		color: var(--color-fg-muted);
		flex-shrink: 0;
		margin-bottom: 2rem;
	}

	.pathway-summary {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		text-align: center;
		max-width: 600px;
		margin: 0 auto;
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
		color: var(--color-fg-tertiary);
		text-decoration: none;
		border-bottom: 1px solid var(--color-border-default);
		padding-bottom: 2px;
		transition:
			color var(--duration-standard) var(--ease-standard),
			border-color var(--duration-standard) var(--ease-standard);
	}

	.cta-secondary:hover {
		color: var(--color-fg-secondary);
		border-color: var(--color-fg-secondary);
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.tier-columns {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 768px) {
		.hero {
			padding: var(--layout-3, 4rem) var(--container-padding, 1.5rem);
		}

		.hero-title {
			font-size: var(--text-h1);
		}

		.faq-grid {
			grid-template-columns: 1fr;
		}

		.pathway-visual {
			flex-direction: column;
			gap: var(--space-3, 0.75rem);
		}

		.pathway-arrow {
			transform: rotate(90deg);
			margin-bottom: 0;
		}

		/* Mobile section padding */
		.tier-section,
		.pathway-section,
		.faq-section,
		.cta-section {
			padding: var(--layout-3, 4rem) var(--container-padding, 1.5rem);
		}

		.tier-price {
			font-size: var(--text-h1);
		}
	}
</style>
