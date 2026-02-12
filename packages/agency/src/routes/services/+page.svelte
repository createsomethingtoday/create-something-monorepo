<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { BlurFade, ShimmerButton } from '@create-something/canon/magicui';

	// Structured data for SEO/AEO
	const services = [
		{
			name: 'Connect',
			description: 'One custom MCP server that connects your tool to your AI agents. Requirements discovery, development, auth setup, testing, deployment, documentation, and source code ownership included. Ongoing maintenance and updates.',
			type: 'MCP Development',
			price: '2500',
			priceDescription: '$2,500 setup + $150/mo'
		},
		{
			name: 'Automate',
			description: 'Full-stack automation bundle: 3–5 custom MCP servers plus a Playbook MCP catalog so your agents discover and use every tool. Workflow mapping, priority sequencing, and unified agent connectivity.',
			type: 'Automation Bundle',
			price: '7500',
			priceDescription: '$7,500 setup + $350/mo'
		},
		{
			name: 'Orchestrate',
			description: 'Domain-specific playbooks that encode your business expertise as MCP Prompts. Decision frameworks, priority rules, workflow sequences, and quality gates — refined monthly from real agent usage data.',
			type: 'Judgment Layer',
			price: '750',
			priceDescription: '$750/month'
		}
	];

	const faqItems = [
		{
			question: "Our team already uses Claude/Cursor/Codex. What do we need you for?",
			answer: "Your agents are ready — your tools aren't. Claude can't read your CRM, Cursor can't query your database, and Codex can't update your project management tool. We build the MCP infrastructure that connects your tools to the agents your team already uses."
		},
		{
			question: "What's the Playbook MCP?",
			answer: "It's a discovery catalog for your agents. Instead of memorizing which MCP does what, your agents query the Playbook and it tells them: here's what's available, here's when to use it, here's the workflow. Think of it as a table of contents for your automation."
		},
		{
			question: "What's a Judgment Layer?",
			answer: "Playbooks that encode your domain expertise as MCP Prompts — decision frameworks, priority rules, workflow sequences, quality gates. It's the difference between your agent having access to tools and your agent knowing how to use them intelligently. Refined monthly from real usage data."
		},
		{
			question: "How is this different from Zapier or Make?",
			answer: "Zapier connects tools to tools with fixed workflows. We connect tools to AI agents with judgment. Your MCP lets Claude read your CRM, draft responses, and make decisions — not just move data between apps on a trigger."
		},
		{
			question: "Do I own the code?",
			answer: "Yes. Every MCP we build, you own the source code, the deployment, and the documentation. No lock-in. The monthly covers maintenance, updates, and monitoring."
		},
		{
			question: "What tools can you connect?",
			answer: "Anything with an API. Salesforce, HubSpot, Notion, Slack, Google Workspace, Procore, QuickBooks, internal databases, custom systems. For commodity integrations we use bridge tooling. For deep or client-specific work, we build custom."
		},
		{
			question: "Can I start with just one MCP?",
			answer: "That's how most clients start. Connect tier: one MCP, $2,500 setup, $150/mo. See the value. Expand when you're ready."
		}
	];
</script>

<SEO
	title="Services | MCP Infrastructure for Your AI Agents"
	description="Your team uses Claude, Cursor, or Codex. We build the MCP infrastructure they connect to. Connect ($2,500 + $150/mo), Automate ($7,500 + $350/mo), or Orchestrate ($750/mo). You own the code."
	keywords="MCP infrastructure, MCP servers for AI agents, connect tools to Claude, Cursor MCP integration, Codex MCP, automation infrastructure, Playbook MCP, Judgment Layer, MCP development agency"
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
			<h1 class="hero-title">MCP Infrastructure for Your Agents</h1>
		</BlurFade>
		<BlurFade delay={0.2}>
			<p class="hero-subtitle">
				Your team uses Claude, Cursor, or Codex. We build the MCP servers they connect to.
				Start with one tool. Scale to full orchestration.
			</p>
		</BlurFade>
	</div>
</section>

<!-- Tier 1: Connect -->
<section class="tier-section">
	<div class="section-container">
		<BlurFade>
			<div class="tier-eyebrow-row">
				<span class="tier-number">01</span>
				<span class="tier-label-text">The Entry Point</span>
			</div>
			<h2 class="section-heading">Connect</h2>
			<p class="section-subhead">
				One custom MCP server. Your agents can reach one more tool.
			</p>
		</BlurFade>

		<BlurFade delay={0.1}>
			<div class="tier-card">
				<div class="tier-header">
					<div class="tier-pricing">
						<div class="tier-price">$2,500</div>
						<div class="tier-duration">setup + $150/mo maintenance</div>
					</div>
					<p class="tier-pricing-note">
						One MCP server connecting one tool to your agents.
						2–3 week delivery. You own the code.
					</p>
				</div>
				<div class="tier-body">
					<div class="tier-columns">
						<div class="tier-detail">
							<h3>What's Included</h3>
							<ul class="tier-list">
								<li>Requirements discovery</li>
								<li>Custom MCP server development</li>
								<li>Authentication setup (OAuth, API key, etc.)</li>
								<li>Testing and deployment</li>
								<li>Documentation</li>
								<li>Source code — you own it</li>
							</ul>
							<h3 class="mt">Monthly ($150/mo)</h3>
							<ul class="tier-list">
								<li>Uptime monitoring</li>
								<li>API version updates</li>
								<li>Bug fixes</li>
								<li>Slack support</li>
							</ul>
						</div>
						<div class="tier-detail">
							<h3>What You Can Connect</h3>
							<p>
								Any tool with an API — CRM, docs, chat, email, project management,
								internal databases, custom systems.
							</p>
							<h3 class="mt">Your Agents</h3>
							<p>
								Claude Desktop, Cursor, Codex, Claude Code — or any MCP-compatible client your team already uses.
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

<!-- Tier 2: Automate (FEATURED) -->
<section class="tier-section tier-section-featured">
	<div class="section-container">
		<BlurFade>
			<div class="tier-eyebrow-row">
				<span class="tier-number featured-number">02</span>
				<span class="tier-label-text">Most Popular</span>
			</div>
			<h2 class="section-heading">Automate</h2>
			<p class="section-subhead">
				See what one MCP does? Now connect your full stack.
			</p>
		</BlurFade>

		<BlurFade delay={0.1}>
			<div class="tier-card featured">
				<span class="tier-badge">Most Popular</span>
				<div class="tier-header">
					<div class="tier-pricing">
						<div class="tier-price">$7,500</div>
						<div class="tier-duration">setup + $350/mo maintenance</div>
					</div>
					<p class="tier-pricing-note">
						3–5 custom MCP servers + Playbook MCP catalog. 4–6 week delivery.
					</p>
				</div>
				<div class="tier-body">
					<div class="tier-columns">
						<div class="tier-detail">
							<h3>What's Included</h3>
							<ul class="tier-list">
								<li>Workflow mapping across your tool stack</li>
								<li>3–5 custom MCP servers built and deployed</li>
								<li>Playbook MCP — agent discovery catalog</li>
								<li>Priority sequencing (what to automate first)</li>
								<li>Unified auth and deployment</li>
								<li>Source code — you own it all</li>
							</ul>
							<h3 class="mt">Monthly ($350/mo)</h3>
							<ul class="tier-list">
								<li>Monitoring across all MCPs</li>
								<li>API updates and version management</li>
								<li>Playbook catalog maintenance</li>
								<li>Priority support</li>
							</ul>
						</div>
						<div class="tier-detail">
							<h3>The Playbook MCP</h3>
							<p>
								Your agents query the Playbook to discover what tools are available,
								when to use them, and in what order. It's the table of contents
								for your automation infrastructure.
							</p>
							<div class="tier-note">
								<p>
									Already bought a Connect MCP from us? Automate builds on what
									we learned. You don't pay for discovery twice.
								</p>
							</div>
							<div class="tier-note">
								<p>
									Commodity integrations (Slack, Calendar, etc.) use bridge tooling
									at near-zero cost. Custom MCPs for deep, client-specific work.
									Both appear identically in the Playbook.
								</p>
							</div>
						</div>
					</div>
					<div class="tier-cta">
						<ShimmerButton href="/contact">Start Automating</ShimmerButton>
					</div>
				</div>
			</div>
		</BlurFade>
	</div>
</section>

<!-- Tier 3: Orchestrate (Judgment Layer) -->
<section class="tier-section">
	<div class="section-container">
		<BlurFade>
			<div class="tier-eyebrow-row">
				<span class="tier-number">03</span>
				<span class="tier-label-text">The Intelligence</span>
			</div>
			<h2 class="section-heading">Orchestrate</h2>
			<p class="section-subhead">
				Connections without judgment are just pipes.
				Playbooks make your agents intelligent.
			</p>
		</BlurFade>

		<BlurFade delay={0.1}>
			<div class="tier-card">
				<div class="tier-header">
					<div class="tier-pricing">
						<div class="tier-price">$750<span class="price-unit">/mo</span></div>
					</div>
					<p class="tier-pricing-note">
						Domain-specific playbooks refined monthly from real agent usage data.
						Available standalone or as an add-on to any tier.
					</p>
				</div>
				<div class="tier-body">
					<div class="tier-columns">
						<div class="tier-detail">
							<h3>What's Included Monthly</h3>
							<ul class="tier-list">
								<li>
									<strong>Decision frameworks</strong> — "When X, do Y because Z" encoded as MCP Prompts
								</li>
								<li>
									<strong>Priority rules</strong> — which contacts, projects, or tasks matter most
								</li>
								<li>
									<strong>Workflow sequences</strong> — "After sync, summarize, then flag"
								</li>
								<li>
									<strong>Quality gates</strong> — "Before creating, verify these criteria"
								</li>
								<li>
									<strong>Domain glossary</strong> — teach your agents your business language
								</li>
								<li>
									<strong>Monthly refinement</strong> — usage data reveals gaps, we write prompts, agents get smarter
								</li>
							</ul>
						</div>
						<div class="tier-detail">
							<h3>The Feedback Loop</h3>
							<p>
								Every agent interaction generates feedback. That feedback reveals
								gaps in judgment. We write prompts to close those gaps. Your agents
								get smarter every month — without you changing anything.
							</p>
							<div class="tier-note">
								<p>
									Clients with existing MCPs (from us or elsewhere) can add
									Orchestrate standalone. Your agents already have hands — now give
									them expertise.
								</p>
							</div>
						</div>
					</div>
					<div class="tier-cta">
						<ShimmerButton href="/contact">Add Intelligence</ShimmerButton>
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
					<p>One MCP server.<br />$2,500 + $150/mo.</p>
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
					<div class="pathway-icon pathway-icon-featured">
						<span class="pathway-num">2</span>
					</div>
					<h3>Automate</h3>
					<p>Full stack + Playbook.<br />$7,500 + $350/mo.</p>
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
					<div class="pathway-icon">
						<span class="pathway-num">3</span>
					</div>
					<h3>Orchestrate</h3>
					<p>Judgment Layer.<br />$750/mo.</p>
				</div>
			</BlurFade>
		</div>

		<BlurFade delay={0.35}>
			<p class="pathway-summary">
				Most clients follow this path. Start with one MCP — see what your agents can do.
				Connect your full stack with a Playbook catalog. Then add the Judgment Layer
				so your agents know what to do, not just how to do it.
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
					<h3>Our team already uses Claude/Cursor/Codex. What do we need you for?</h3>
					<p>
						Your agents are ready — your tools aren't. Claude can't read your CRM,
						Cursor can't query your database, and Codex can't update your project
						management tool. We build the MCP infrastructure that connects your
						tools to the agents your team already uses.
					</p>
				</div>
			</BlurFade>

			<BlurFade delay={0.15}>
				<div class="faq-item">
					<h3>What's the Playbook MCP?</h3>
					<p>
						A discovery catalog for your agents. Instead of memorizing which MCP
						does what, your agents query the Playbook and it tells them: here's
						what's available, here's when to use it, here's the workflow. Think
						of it as a table of contents for your automation.
					</p>
				</div>
			</BlurFade>

			<BlurFade delay={0.2}>
				<div class="faq-item">
					<h3>What's a Judgment Layer?</h3>
					<p>
						Playbooks that encode your domain expertise as MCP Prompts — decision
						frameworks, priority rules, workflow sequences, quality gates. It's
						the difference between your agent having access to tools and your agent
						knowing how to use them intelligently. Refined monthly from real
						usage data.
					</p>
				</div>
			</BlurFade>

			<BlurFade delay={0.25}>
				<div class="faq-item">
					<h3>How is this different from Zapier or Make?</h3>
					<p>
						Zapier connects tools to tools with fixed workflows. We connect tools
						to AI agents with judgment. Your MCP lets Claude read your CRM, draft
						responses, and make decisions — not just move data between apps on
						a trigger.
					</p>
				</div>
			</BlurFade>

			<BlurFade delay={0.3}>
				<div class="faq-item">
					<h3>Do I own the code?</h3>
					<p>
						Yes. Every MCP we build, you own the source code, the deployment,
						and the documentation. No lock-in. The monthly covers maintenance,
						updates, and monitoring.
					</p>
				</div>
			</BlurFade>

			<BlurFade delay={0.35}>
				<div class="faq-item">
					<h3>What tools can you connect?</h3>
					<p>
						Anything with an API. Salesforce, HubSpot, Notion, Slack, Google
						Workspace, Procore, QuickBooks, internal databases, custom systems.
						For commodity integrations we use bridge tooling. For deep or
						client-specific work, we build custom.
					</p>
				</div>
			</BlurFade>

			<BlurFade delay={0.38}>
				<div class="faq-item">
					<h3>Can I start with just one MCP?</h3>
					<p>
						That's how most clients start. Connect tier: one MCP, $2,500 setup,
						$150/mo. See the value. Expand when you're ready.
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
			<h2 class="cta-heading">Your agents are waiting.</h2>
		</BlurFade>
		<BlurFade delay={0.1}>
			<div class="cta-buttons">
				<ShimmerButton href="/contact">Connect Your First Tool</ShimmerButton>
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
