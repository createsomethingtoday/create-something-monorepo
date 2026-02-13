<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { AnimatedGridPattern, BlurFade, ShimmerButton } from '@create-something/canon/magicui';

	// Structured data for SEO/AEO
	const services = [
		{
			name: 'Monthly Retainer',
			description: 'Your AI architect on retainer. I connect your tools to AI, teach it how your business works, and refine it every month. Limited to 3–5 clients at a time. Direct access, no layers.',
			type: 'Retainer',
			price: '2000',
			priceDescription: '$1,500–$3,000/mo depending on scope'
		}
	];

</script>


<SEO
	title="Your AI Person | CREATE SOMETHING .agency"
	description="I work with 3–5 businesses at a time. I connect your tools to AI, teach it how your business works, and refine it every month. Direct access. No layers. 16+ production integrations built."
	keywords="fractional AI architect, AI automation consultant, AI for business, connect tools to AI, AI retainer, business AI expert"
	ogImage="/og-image.svg"
	propertyName="agency"
	{services}
/>

<!-- Hero -->
<section class="hero">
	<div class="hero-grid-container">
		<AnimatedGridPattern
			numSquares={25}
			maxOpacity={0.08}
			duration={4}
			repeatDelay={2}
			width={60}
			height={60}
			class="hero-animated-grid"
		/>
	</div>
	<div class="hero-container">
		<div class="hero-content">
			<BlurFade delay={0}>
				<p class="hero-eyebrow">Limited to 3–5 clients</p>
			</BlurFade>
			<BlurFade delay={0.1}>
				<h1 class="hero-title">I'm your AI&nbsp;person.</h1>
			</BlurFade>
			<BlurFade delay={0.2}>
				<p class="hero-detail">
					I connect your business tools to AI, build custom workflows for how you actually work, and teach your AI your business — which clients are priority, when to escalate, what quality looks like. Then I refine it every month.
				</p>
			</BlurFade>
			<BlurFade delay={0.25}>
				<p class="hero-detail-secondary">
					Direct access. No account managers. No layers. You work with the person who builds it.
				</p>
			</BlurFade>
			<BlurFade delay={0.3}>
				<p class="hero-proof">16+ production integrations built. Clients recovering 15+ hours per week.</p>
			</BlurFade>
			<BlurFade delay={0.35}>
				<div class="hero-cta">
					<ShimmerButton href="/book">
						Book a Call
					</ShimmerButton>
					<a href="#how" class="hero-link">How it works →</a>
				</div>
			</BlurFade>
		</div>
	</div>
</section>

<!-- How I Work -->
<section id="how" class="process-section">
	<div class="section-container">
		<BlurFade>
			<h2 class="section-heading">How I Work</h2>
		</BlurFade>
		<BlurFade delay={0.1}>
			<p class="section-intro">
				Monthly retainer. Everything included. The simple stuff I'll teach you to do yourself. My time goes to what's actually hard.
			</p>
		</BlurFade>
		
		<div class="funnel-steps">
			<BlurFade delay={0.15}>
				<div class="funnel-step">
					<div class="funnel-step-indicator">
						<div class="funnel-step-num">1</div>
						<div class="funnel-step-line"></div>
					</div>
					<div class="funnel-step-content">
						<span class="funnel-step-label">First call</span>
						<h3>Diagnostic</h3>
						<p>I look at your tools, your workflows, where time leaks. What should your AI be doing that it can't today? Where are the gaps between what you have and what's possible? This shapes everything.</p>
					</div>
				</div>
			</BlurFade>

			<BlurFade delay={0.25}>
				<div class="funnel-step">
					<div class="funnel-step-indicator">
						<div class="funnel-step-num">2</div>
						<div class="funnel-step-line"></div>
					</div>
					<div class="funnel-step-content">
						<span class="funnel-step-label">Month 1</span>
						<h3>Build</h3>
						<p>I connect your tools, build custom workflows, and set up the intelligence layer — the business rules that teach your AI how you actually work. Generic connections? I'll show you how to do those yourself. My time goes to the custom work nobody else can do.</p>
					</div>
				</div>
			</BlurFade>

			<BlurFade delay={0.35}>
				<div class="funnel-step">
					<div class="funnel-step-indicator">
						<div class="funnel-step-num">3</div>
					</div>
					<div class="funnel-step-content">
						<span class="funnel-step-label">Ongoing</span>
						<h3>Refine</h3>
						<p>Every month, your AI generates data about what's working and what isn't. I close the gaps — new business rules, better workflows, new connections as your needs change. It compounds. Your AI gets smarter every month without you doing anything.</p>
					</div>
				</div>
			</BlurFade>
		</div>
	</div>
</section>

<!-- What You Get -->
<section class="offerings-section">
	<div class="section-container">
		<BlurFade>
			<h2 class="section-heading">What's Included</h2>
		</BlurFade>
		<BlurFade delay={0.1}>
			<p class="section-intro">
				One retainer. Everything below. You own all code and infrastructure.
			</p>
		</BlurFade>
		
		<div class="offerings-grid">
			<BlurFade delay={0.15}>
				<div class="offering-card">
					<div class="offering-header">
						<h3 class="offering-name">Connections</h3>
					</div>
					<div class="offering-body">
						<p class="offering-description">
							Your tools connected to your AI. Salesforce, HubSpot, Notion, Procore, QuickBooks, Gmail — anything with an API. Custom-built for how you actually use them.
						</p>
						<div class="offering-deliverables">
							<span class="deliverables-label">Includes</span>
							<ul>
								<li>Custom integrations, deployed and managed</li>
								<li>Secure authentication</li>
								<li>Works with Claude, Cursor, Codex, ChatGPT</li>
								<li>Full source code — you own everything</li>
							</ul>
						</div>
					</div>
				</div>
			</BlurFade>

			<BlurFade delay={0.25}>
				<div class="offering-card offering-featured">
					<span class="offering-badge">The real product</span>
					<div class="offering-header">
						<h3 class="offering-name">Intelligence</h3>
					</div>
					<div class="offering-body">
						<p class="offering-description">
							Business rules that teach your AI how your business works. Which clients are priority. When to escalate vs. handle autonomously. What your quality standards are. Refined monthly from real data.
						</p>
						<div class="offering-deliverables">
							<span class="deliverables-label">Includes</span>
							<ul>
								<li>Custom decision logic for your workflows</li>
								<li>When AI isn't sure, it asks instead of guessing</li>
								<li>Monthly refinement from usage data</li>
								<li>New capabilities as your needs evolve</li>
							</ul>
						</div>
					</div>
				</div>
			</BlurFade>

			<BlurFade delay={0.35}>
				<div class="offering-card">
					<div class="offering-header">
						<h3 class="offering-name">Direct Access</h3>
					</div>
					<div class="offering-body">
						<p class="offering-description">
							When something breaks, when you want to add a tool, when you have a question about what to automate next — you reach me directly. Not a support queue. Not an account manager. The person who built it.
						</p>
						<div class="offering-deliverables">
							<span class="deliverables-label">Includes</span>
							<ul>
								<li>Direct Slack or email access</li>
								<li>Architecture guidance as you grow</li>
								<li>I teach you the commodity stuff</li>
								<li>Maintenance, monitoring, updates</li>
							</ul>
						</div>
					</div>
				</div>
			</BlurFade>
		</div>
	</div>
</section>

<!-- The Model -->
<section class="problem-section">
	<div class="section-container">
		<BlurFade>
			<h2 class="section-heading">The Model</h2>
		</BlurFade>
		<BlurFade delay={0.1}>
			<div class="problem-statements">
				<p class="problem-text">
					I work with 3–5 businesses at a time. That's it. The scarcity isn't artificial — there's one of me, and this work requires understanding your business deeply enough to teach AI how it runs.
				</p>
				<p class="problem-text">
					Monthly retainer, $1,500–$3,000 depending on scope. First month is the heavy build. After that, effort shifts to refinement — closing gaps, adding capabilities, making your AI smarter. The system compounds.
				</p>
				<p class="problem-text">
					Every engagement builds the intelligence layer — the business rules, decision logic, and workflow patterns that teach AI how to work. Those patterns compound across clients. The limited roster today is how the product gets built for tomorrow.
				</p>
				<p class="problem-punchline">
					You own everything. I build it, I maintain it, I refine it.
				</p>
			</div>
		</BlurFade>
	</div>
</section>

<!-- Proof -->
<section class="audience-section">
	<div class="section-container">
		<BlurFade>
			<h2 class="section-heading">Track Record</h2>
		</BlurFade>
		
		<div class="audience-grid">
			<BlurFade delay={0.1}>
				<div class="audience-card">
					<h3>16+ Production Integrations</h3>
					<p>Salesforce, HubSpot, Notion, Slack, Gmail, Procore, QuickBooks, Zoom, YouTube, custom internal systems. Built, deployed, and running in production.</p>
				</div>
			</BlurFade>

			<BlurFade delay={0.2}>
				<div class="audience-card">
					<h3>15+ Hours/Week Recovered</h3>
					<p>A 15-person firm recovered 15+ hours per week and roughly $39,000/year. Less time copying data between tools. More time on actual work.</p>
				</div>
			</BlurFade>

			<BlurFade delay={0.3}>
				<div class="audience-card">
					<h3>System Architect at Webflow</h3>
					<p>Currently a System Architect on the Marketplace Team at Webflow — building internal tools, onboarding systems, and template infrastructure serving millions. Applying that same rigor to AI automation.</p>
				</div>
			</BlurFade>
		</div>
	</div>
</section>

<!-- CTA -->
<section class="cta-section">
	<div class="section-container">
		<BlurFade>
			<h2 class="cta-heading">Limited roster. If there's a fit, let's talk.</h2>
		</BlurFade>
		<BlurFade delay={0.1}>
			<p class="cta-subtext">
				Book a call. I'll look at your tools, your workflows, and where AI can actually help. No pitch — just an honest assessment of whether this makes sense for your business.
			</p>
		</BlurFade>
		<BlurFade delay={0.2}>
			<div class="cta-buttons">
				<ShimmerButton href="/book">
					Book a Call
				</ShimmerButton>
				<a href="/products" class="cta-book-link">
					See what I've built →
				</a>
			</div>
		</BlurFade>
	</div>
</section>

<style>
	/* Section containers */
	.section-container {
		max-width: var(--content-width-lg);
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
		max-width: var(--content-width-sm);
		margin: 0 auto var(--space-8, 3rem);
		line-height: var(--leading-relaxed);
	}
	
	/* Hero — single column, centered */
	.hero {
		position: relative;
		padding: var(--section-padding-lg, 8rem) var(--container-padding, 1.5rem) var(--section-padding, 6rem);
		max-width: 100%;
		overflow: hidden;
	}
	
	.hero-grid-container {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
	}
	
	:global(.hero-animated-grid) {
		mask-image: radial-gradient(600px circle at 50% 35%, white, transparent);
		-webkit-mask-image: radial-gradient(600px circle at 50% 35%, white, transparent);
	}
	
	.hero-container {
		position: relative;
		width: 100%;
		max-width: var(--content-width-lg);
		margin: 0 auto;
	}
	
	.hero-content {
		max-width: 40em;
	}
	
	.hero-eyebrow {
		font-size: var(--text-body-sm);
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: rgba(96, 165, 250, 0.9);
		margin-bottom: var(--space-5, 1.5rem);
		font-weight: var(--font-semibold);
	}
	
	.hero-title {
		font-size: clamp(2.5rem, 5vw + 1.5rem, 4.5rem);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-6, 2rem);
		line-height: 1.1;
		letter-spacing: var(--tracking-tighter, -0.025em);
	}
	
	.hero-detail {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-4, 1rem);
		line-height: var(--leading-relaxed);
		max-width: 36em;
	}

	.hero-detail-secondary {
		font-size: var(--text-body);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-4, 1rem);
		line-height: var(--leading-relaxed);
		font-style: italic;
	}
	
	.hero-proof {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-6, 2rem);
		letter-spacing: 0.01em;
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

	/* How It Works — Funnel Steps */
	.process-section {
		padding: var(--section-padding, 6rem) 0;
		border-top: 1px solid var(--color-border-default);
	}

	.funnel-steps {
		max-width: 640px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.funnel-step {
		display: flex;
		gap: var(--space-5, 1.5rem);
		align-items: flex-start;
	}

	.funnel-step-indicator {
		display: flex;
		flex-direction: column;
		align-items: center;
		flex-shrink: 0;
	}

	.funnel-step-num {
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-full, 9999px);
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-fg-secondary);
		background: var(--color-bg-pure);
		position: relative;
		z-index: 1;
	}

	.funnel-step-line {
		width: 1px;
		height: 100%;
		min-height: 2rem;
		background: var(--color-border-default);
		flex: 1;
	}

	.funnel-step-content {
		padding-bottom: var(--space-8, 3rem);
	}

	.funnel-step-label {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--color-fg-muted);
		display: block;
		margin-bottom: var(--space-1, 0.25rem);
	}

	.funnel-step-content h3 {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-3, 0.75rem);
	}

	.funnel-step-content p {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-3, 0.75rem);
	}

	/* What You Get — Offerings */
	.offerings-section {
		padding: var(--section-padding, 6rem) 0;
		border-top: 1px solid var(--color-border-default);
	}

	.offerings-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-5, 1.5rem);
		align-items: stretch;
		overflow: visible;
	}

	/* BlurFade wrappers must stretch so grid equalizes row height */
	.offerings-grid > :global(*) {
		display: flex;
		flex-direction: column;
		overflow: visible;
	}

	.offering-card {
		position: relative;
		display: flex;
		flex-direction: column;
		border-radius: var(--radius-xl, 16px);
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		box-shadow: var(--glass-shine-soft);
		overflow: visible;
		flex: 1;
		transition:
			border-color var(--duration-standard) var(--ease-standard),
			box-shadow var(--duration-standard) var(--ease-standard),
			transform var(--duration-bounce) var(--ease-bounce);
	}

	.offering-card::before {
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

	.offering-card:hover {
		border-color: var(--color-border-emphasis);
		box-shadow: var(--glass-shine-standard), var(--glass-outer-sm);
		transform: translateY(-3px);
	}

	/* Featured offering — elevated z-index so badge is visible above siblings */
	.offering-card.offering-featured {
		z-index: 1;
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

	.offering-card.offering-featured:hover {
		border-color: rgba(96, 165, 250, 0.5);
		box-shadow:
			var(--glass-shine-strong),
			0 0 0 1px rgba(96, 165, 250, 0.15),
			0 8px 32px rgba(96, 165, 250, 0.1);
		transform: translateY(-4px);
	}

	.offering-card.offering-featured::before {
		background: linear-gradient(
			90deg,
			transparent,
			rgba(96, 165, 250, 0.4),
			transparent
		);
	}

	.offering-badge {
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

	.offering-header {
		padding: var(--space-6, 2rem) var(--space-5, 1.5rem) var(--space-4, 1rem);
		text-align: center;
	}

	.offering-name {
		font-size: var(--text-body-lg);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-top: var(--space-2, 0.5rem);
	}

	.offering-body {
		padding: 0 var(--space-5, 1.5rem) var(--space-6, 2rem);
		flex: 1;
		display: flex;
		flex-direction: column;
		border-top: 1px solid var(--color-border-default);
	}

	.offering-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		padding-top: var(--space-4, 1rem);
		margin-bottom: var(--space-5, 1.5rem);
	}

	.offering-deliverables {
		margin-top: auto;
	}

	.deliverables-label {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
		display: block;
		margin-bottom: var(--space-2, 0.5rem);
	}

	.offering-deliverables ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2, 0.5rem);
	}

	.offering-deliverables li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		padding-left: 1.25rem;
		position: relative;
	}

	.offering-deliverables li::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0.55em;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: rgba(96, 165, 250, 0.6);
	}

	/* Problem Section */
	.problem-section {
		padding: var(--section-padding, 6rem) 0;
		border-top: 1px solid var(--color-border-default);
	}

	.problem-statements {
		max-width: var(--content-width-sm);
		margin: 0 auto;
		text-align: center;
	}

	.problem-text {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-6, 2rem);
	}

	.problem-punchline {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		line-height: 1.2;
		letter-spacing: var(--tracking-tight, -0.015em);
	}
	
	/* Audience / Built For */
	.audience-section {
		padding: var(--section-padding, 6rem) 0;
		border-top: 1px solid var(--color-border-default);
	}
	
	.audience-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-4, 1rem);
		align-items: stretch;
	}

	/* BlurFade wrappers stretch for equal height */
	.audience-grid > :global(*) {
		display: flex;
		flex-direction: column;
	}
	
	.audience-card {
		padding: var(--space-6, 2rem) var(--space-5, 1.5rem);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg, 12px);
		background: var(--color-bg-pure);
		box-shadow: var(--glass-shine-soft);
		transition: 
			border-color var(--duration-standard) var(--ease-standard),
			box-shadow var(--duration-standard) var(--ease-standard),
			transform var(--duration-bounce) var(--ease-bounce);
		display: flex;
		flex-direction: column;
		flex: 1;
	}
	
	.audience-card:hover {
		border-color: var(--color-border-emphasis);
		box-shadow: var(--glass-shine-standard), var(--glass-outer-sm);
		transform: translateY(-2px);
	}
	
	.audience-card h3 {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-3, 0.75rem);
	}
	
	.audience-card p {
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
		font-weight: var(--font-bold);
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

	.cta-book-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		text-decoration: none;
		transition: color var(--duration-micro, 200ms) var(--ease-standard);
	}

	.cta-book-link:hover {
		color: var(--color-fg-primary);
	}
	
	/* Responsive */
	@media (max-width: 768px) {
		.hero {
			padding: var(--layout-3, 4rem) var(--container-padding, 1.5rem);
		}
		
		.hero-title {
			font-size: clamp(2.25rem, 8vw, 4rem);
		}

		.offerings-grid {
			grid-template-columns: 1fr;
			max-width: 480px;
			margin-left: auto;
			margin-right: auto;
		}

		.offering-card.offering-featured {
			order: -1;
		}
		
		.audience-grid {
			grid-template-columns: 1fr;
		}
		
		.process-section,
		.offerings-section,
		.problem-section,
		.audience-section,
		.cta-section {
			padding: var(--layout-3, 4rem) 0;
		}
	}
</style>
