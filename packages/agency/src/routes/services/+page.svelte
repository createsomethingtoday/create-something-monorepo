<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { BlurFade, ShimmerButton } from '@create-something/canon/magicui';

	// Structured data for SEO/AEO
	const services = [
		{
			name: 'Monthly Retainer',
			description: 'Your AI architect on retainer. Agent Outcome Stack by default: custom MCP servers, brokered gateway discovery, Codex setup, policy artifacts, and monthly refinement. Direct access to the person who builds it. Limited to 3–5 clients.',
			type: 'Retainer',
			price: '2000',
			priceDescription: '$1,500–$3,000/mo depending on scope'
		}
	];

	const faqItems = [
		{
			question: "Why a retainer instead of project pricing?",
			answer: "AI isn't a one-time build. Your tools change, your workflows evolve, your AI generates data that reveals new gaps. A retainer means I'm always improving your system — not waiting for you to file a ticket."
		},
		{
			question: "What does $1,500–$3,000/mo actually get me?",
			answer: "Everything in the Agent Outcome Stack: custom MCP servers, brokered gateway + managed policy controls, Codex setup + policy + runbook, approval and escalation rules, monthly refinement, and direct access to me. The range depends on number of systems and workflow complexity. We scope it on the first call."
		},
		{
			question: "Can I connect tools myself?",
			answer: "Yes — and I'll teach you. Generic connections are commodity work. There are free marketplaces and tutorials for that. My time goes to the custom work: the integrations that are specific to how your business runs, the intelligence layer that teaches your AI your priorities and rules."
		},
		{
			question: "What if I just need one quick connection?",
			answer: "If it's truly simple, I'll point you to the right free tool or show you how to do it yourself. I don't charge for commodity work. But most 'simple' connections need custom auth, specific data mapping, or business logic generic tools can't handle."
		},
		{
			question: "Do you offer MCP-only delivery?",
			answer: "Yes, for discovery and compliance-constrained cases. MCP-only is the entry wedge: read-first brokered connectivity with policy guardrails. The default paid package is Agent Outcome Stack, because outcomes require both MCP connectivity and agent policy operations."
		},
		{
			question: "How is this different from hiring a developer?",
			answer: "A developer builds what you spec. I figure out what to build. I understand both the AI ecosystem and how to translate business workflows into automation. You're not managing a developer — you're getting an architect who owns the outcome."
		},
		{
			question: "Do I own the code?",
			answer: "Yes. Everything I build — integrations, workflows, business rules — you own the source code, the deployment, and the documentation. No lock-in. If you leave, you keep everything."
		},
		{
			question: "Why only 3–5 clients?",
			answer: "Because this work requires understanding your business deeply enough to teach AI how it runs. I can't do that at scale — yet. Every engagement builds the intelligence patterns and tooling that will eventually let me scale this with agents. The limited roster today is how the product gets built for tomorrow."
		},
		{
			question: "What tools can you connect?",
			answer: "Anything with an API. Salesforce, HubSpot, Notion, Slack, Google Workspace, Procore, QuickBooks, Zoom, internal databases, custom systems. I've built 16+ production integrations across dozens of platforms."
		}
	];
</script>

<SEO
	title="How I Work | Your AI Person on Retainer"
	description="Monthly retainer. Direct access. Agent Outcome Stack by default: custom MCP servers, brokered gateway discovery, Codex setup + policy + runbook, and monthly refinement. $1,500–$3,000/mo depending on scope."
	keywords="AI retainer, fractional AI architect, AI automation consultant, connect tools to AI, business AI expert"
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
			<p class="hero-eyebrow">How I Work</p>
		</BlurFade>
		<BlurFade delay={0.1}>
			<h1 class="hero-title">One retainer. Outcome Stack included.</h1>
		</BlurFade>
		<BlurFade delay={0.2}>
			<p class="hero-subtitle">
				I don't sell tiers. I work with you directly to deliver agents + MCPs by default: brokered connectivity, Codex setup, policy artifacts, and monthly refinement. MCP-only is reserved for discovery and compliance-constrained cases.
			</p>
		</BlurFade>
	</div>
</section>

<!-- The Retainer -->
<section class="retainer-section">
	<div class="section-container">
		<BlurFade>
			<div class="retainer-card">
				<div class="retainer-header">
					<div class="retainer-pricing">
						<div class="retainer-price">$1,500–$3,000</div>
						<div class="retainer-period">per month</div>
					</div>
					<p class="retainer-note">
						Scope depends on number of tools and workflow complexity.<br />
						We figure out the right number on the first call.
					</p>
				</div>
				<div class="retainer-body">
					<div class="retainer-columns">
						<div class="retainer-detail">
							<h3>What's Included</h3>
							<ul class="retainer-list">
								<li>Custom MCP server(s) for your workflows</li>
								<li>Brokered gateway discovery (`search -> describe -> invoke`)</li>
								<li>Agent Outcome Stack delivery (agents + MCPs)</li>
								<li>Codex setup + policy + runbook included</li>
								<li>Approval rules and escalation triggers</li>
								<li>Budget and latency guardrails</li>
								<li>Monthly refinement from usage data</li>
								<li>Direct access — Slack or email</li>
								<li>Architecture guidance as you grow</li>
								<li>Monitoring and maintenance</li>
								<li>Source code ownership — no lock-in</li>
							</ul>
						</div>
						<div class="retainer-detail">
							<h3>What I Teach You for Free</h3>
							<ul class="retainer-list">
								<li>Generic tool connections</li>
								<li>Basic MCP setup</li>
								<li>MCP-only discovery setup (read-only/compliance)</li>
								<li>Marketplace integrations</li>
								<li>Standard configurations</li>
							</ul>
							<div class="retainer-callout">
								<p>
									Connecting tools is commodity. The hard part is outcome quality: policy, escalation, approvals, and adapting the system as your business changes. That's why the default package is agents + MCPs.
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</BlurFade>
	</div>
</section>

<!-- What a Month Looks Like -->
<section class="timeline-section">
	<div class="section-container">
		<BlurFade>
			<h2 class="section-heading">What a Month Looks Like</h2>
		</BlurFade>

		<div class="timeline-grid">
			<BlurFade delay={0.1}>
				<div class="timeline-card">
					<span class="timeline-label">Month 1</span>
					<h3>The Build</h3>
					<p>Diagnostic call. I map tools, workflows, and risk boundaries. Then I deliver the initial Outcome Stack: custom MCP, Codex setup, and policy runbook. By month end, your AI can act inside safe boundaries.</p>
				</div>
			</BlurFade>

			<BlurFade delay={0.2}>
				<div class="timeline-card">
					<span class="timeline-label">Month 2–3</span>
					<h3>The Expansion</h3>
					<p>More connections as needed. Deeper business rules: priorities, escalation logic, quality checks, and golden tasks. I use usage data to find where the system is guessing and close those gaps.</p>
				</div>
			</BlurFade>

			<BlurFade delay={0.3}>
				<div class="timeline-card">
					<span class="timeline-label">Month 4+</span>
					<h3>The Compound</h3>
					<p>The system compounds. My work shifts to tuning and expansion: new capabilities, tighter policies, and better reliability. Your runbook and contracts stay current as your business changes.</p>
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
			{#each faqItems as faq, i}
				<BlurFade delay={0.1 + i * 0.05}>
					<div class="faq-item">
						<h3>{faq.question}</h3>
						<p>{faq.answer}</p>
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
			<h2 class="cta-heading">Limited roster. Let's see if there's a fit.</h2>
		</BlurFade>
		<BlurFade delay={0.1}>
			<p class="cta-subtext">
				Book a call. I'll look at your tools and workflows and give you an honest assessment — including what you can do yourself for free.
			</p>
		</BlurFade>
		<BlurFade delay={0.2}>
			<div class="cta-buttons">
				<ShimmerButton href="/book">Book a Call</ShimmerButton>
				<a href="/products" class="cta-secondary">See what I've built →</a>
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
		margin-bottom: var(--space-8, 3rem);
		letter-spacing: var(--tracking-tight, -0.015em);
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

	/* Retainer Card */
	.retainer-section {
		padding: var(--section-padding, 6rem) var(--container-padding, 1.5rem);
		border-top: 1px solid var(--color-border-default);
	}

	.retainer-card {
		max-width: 800px;
		margin: 0 auto;
		border: 1px solid rgba(96, 165, 250, 0.3);
		border-radius: var(--radius-xl, 16px);
		background: linear-gradient(
			180deg,
			rgba(96, 165, 250, 0.04) 0%,
			var(--color-bg-pure) 100%
		);
		box-shadow:
			var(--glass-shine-standard),
			0 0 0 1px rgba(96, 165, 250, 0.08);
		overflow: visible;
		position: relative;
	}

	.retainer-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 10%;
		right: 10%;
		height: 1px;
		background: linear-gradient(
			90deg,
			transparent,
			rgba(96, 165, 250, 0.4),
			transparent
		);
	}

	.retainer-header {
		padding: var(--space-8, 3rem) var(--space-5, 1.5rem);
		border-bottom: 1px solid var(--color-border-default);
		text-align: center;
	}

	.retainer-pricing {
		margin-bottom: var(--space-3, 0.75rem);
	}

	.retainer-price {
		font-size: var(--text-display);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		letter-spacing: var(--tracking-tighter, -0.025em);
		line-height: 1;
	}

	.retainer-period {
		font-size: var(--text-body-lg);
		color: var(--color-fg-tertiary);
		margin-top: var(--space-2, 0.5rem);
	}

	.retainer-note {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		max-width: 480px;
		margin: 0 auto;
		line-height: var(--leading-relaxed);
	}

	.retainer-body {
		padding: var(--space-6, 2rem) var(--space-5, 1.5rem);
	}

	.retainer-columns {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-6, 2rem);
	}

	.retainer-detail h3 {
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-3, 0.75rem);
	}

	.retainer-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2, 0.5rem);
	}

	.retainer-list li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		padding-left: 1.25rem;
		position: relative;
	}

	.retainer-list li::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0.55em;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: rgba(96, 165, 250, 0.6);
	}

	.retainer-callout {
		margin-top: var(--space-4, 1rem);
		padding: var(--space-4, 1rem);
		border-left: 2px solid rgba(96, 165, 250, 0.3);
		background: rgba(96, 165, 250, 0.03);
		border-radius: 0 var(--radius-sm, 4px) var(--radius-sm, 4px) 0;
	}

	.retainer-callout p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
		font-style: italic;
	}

	/* Timeline */
	.timeline-section {
		padding: var(--section-padding, 6rem) var(--container-padding, 1.5rem);
		border-top: 1px solid var(--color-border-default);
	}

	.timeline-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-4, 1rem);
		max-width: 900px;
		margin: 0 auto;
	}

	.timeline-grid > :global(*) {
		display: flex;
		flex-direction: column;
	}

	.timeline-card {
		padding: var(--space-6, 2rem) var(--space-5, 1.5rem);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg, 12px);
		background: var(--color-bg-pure);
		box-shadow: var(--glass-shine-soft);
		flex: 1;
		transition:
			border-color var(--duration-standard) var(--ease-standard),
			box-shadow var(--duration-standard) var(--ease-standard),
			transform var(--duration-bounce) var(--ease-bounce);
	}

	.timeline-card:hover {
		border-color: var(--color-border-emphasis);
		box-shadow: var(--glass-shine-standard), var(--glass-outer-sm);
		transform: translateY(-2px);
	}

	.timeline-label {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: rgba(96, 165, 250, 0.9);
		font-weight: var(--font-semibold);
		display: block;
		margin-bottom: var(--space-2, 0.5rem);
	}

	.timeline-card h3 {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-3, 0.75rem);
	}

	.timeline-card p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	/* FAQ */
	.faq-section {
		padding: var(--section-padding, 6rem) 0;
		border-top: 1px solid var(--color-border-default);
	}

	.faq-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-4, 1rem);
	}

	.faq-grid > :global(*) {
		display: flex;
		flex-direction: column;
	}

	.faq-item {
		padding: var(--space-5, 1.5rem);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg, 12px);
		background: var(--color-bg-pure);
		box-shadow: var(--glass-shine-soft);
		flex: 1;
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
		max-width: var(--content-width-sm);
		margin-left: auto;
		margin-right: auto;
		line-height: var(--leading-relaxed);
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
		transition: color var(--duration-standard) var(--ease-standard);
	}

	.cta-secondary:hover {
		color: var(--color-fg-secondary);
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.retainer-columns {
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

		.timeline-grid {
			grid-template-columns: 1fr;
			max-width: 480px;
			margin-left: auto;
			margin-right: auto;
		}

		.faq-grid {
			grid-template-columns: 1fr;
		}

		.retainer-section,
		.timeline-section,
		.faq-section,
		.cta-section {
			padding: var(--layout-3, 4rem) var(--container-padding, 1.5rem);
		}

		.retainer-price {
			font-size: var(--text-h1);
		}
	}
</style>
