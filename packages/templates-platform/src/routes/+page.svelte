<script lang="ts">
	import { getAllTemplates } from '$lib/services/template-registry';

	const templates = getAllTemplates();
</script>

<svelte:head>
	<title>Website Templates | CREATE SOMETHING</title>
	<meta name="description" content="Beautiful website templates for architects, agencies, and creatives. Deploy in 30 seconds." />
</svelte:head>

<div class="hero">
	<div class="hero-content">
		<h1 class="hero-title">
			Your site.<br />
			<span class="hero-accent">30 seconds.</span>
		</h1>
		<p class="hero-description">
			Beautiful templates built on Canon. Configure, deploy, done.
			No code. No complexity. Just your work, online.
		</p>
		<div class="hero-actions">
			<a href="#templates" class="btn btn-primary btn-lg">Browse Templates</a>
			<a href="/dashboard" class="btn btn-secondary btn-lg">Sign In</a>
		</div>
	</div>
</div>

<section id="templates" class="templates-section">
	<div class="section-header">
		<h2 class="section-title">Choose Your Template</h2>
		<p class="section-description">
			Each template is designed for a specific profession. Start free, upgrade when you need more.
		</p>
	</div>

	<div class="templates-grid">
		{#each templates as template}
			<a href="/templates/{template.slug}" class="template-card">
				<div class="template-thumbnail">
					<!-- Live site embed: the preview IS the site -->
					<div class="template-embed-wrapper">
						<iframe
							src={template.previewUrl}
							title="{template.name} preview"
							class="template-embed"
							loading="lazy"
							sandbox="allow-scripts allow-same-origin"
						></iframe>
						<div class="template-embed-overlay"></div>
					</div>
				</div>
				<div class="template-info">
					<h3 class="template-name">{template.name}</h3>
					<p class="template-description">{template.description}</p>
					<div class="template-meta">
						<span class="template-price">
							<span class="free">Free</span>
							{#if template.pricing.proPrice}
								<span class="pro">· Pro ${template.pricing.proPrice}</span>
							{/if}
						</span>
						<span class="template-cta">Preview →</span>
					</div>
				</div>
			</a>
		{/each}
	</div>
</section>

<section class="features-section">
	<div class="section-header">
		<h2 class="section-title">How It Works</h2>
	</div>

	<div class="features-grid">
		<div class="feature">
			<div class="feature-number">1</div>
			<h3 class="feature-title">Choose</h3>
			<p class="feature-description">
				Pick a template designed for your profession
			</p>
		</div>
		<div class="feature">
			<div class="feature-number">2</div>
			<h3 class="feature-title">Configure</h3>
			<p class="feature-description">
				Fill in your details - name, work, contact info
			</p>
		</div>
		<div class="feature">
			<div class="feature-number">3</div>
			<h3 class="feature-title">Deploy</h3>
			<p class="feature-description">
				One click. Your site is live instantly.
			</p>
		</div>
	</div>
</section>

<!-- One-Click Deploy Section -->
<section class="deploy-section">
	<div class="deploy-content">
		<div class="deploy-info">
			<h2 class="deploy-title">Deploy with GitHub</h2>
			<p class="deploy-description">
				Fork the template, connect to Cloudflare Pages, and your site is live.
				Zero configuration required.
			</p>
			<div class="deploy-steps">
				<div class="deploy-step">
					<span class="step-icon">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
						</svg>
					</span>
					<span>Fork template repo</span>
				</div>
				<div class="deploy-step">
					<span class="step-icon">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M12 2L2 7l10 5 10-5-10-5z"/>
							<path d="M2 17l10 5 10-5"/>
							<path d="M2 12l10 5 10-5"/>
						</svg>
					</span>
					<span>Connect to Cloudflare</span>
				</div>
				<div class="deploy-step">
					<span class="step-icon">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="20 6 9 17 4 12"/>
						</svg>
					</span>
					<span>Site is live</span>
				</div>
			</div>
		</div>
		<div class="deploy-action">
			<a
				href="https://github.com/create-something/template-professional-services"
				target="_blank"
				rel="noopener noreferrer"
				class="btn btn-github btn-lg"
			>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
					<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
				</svg>
				View on GitHub
			</a>
			<p class="deploy-hint">
				Or use the deploy wizard: <a href="/deploy">Start Here →</a>
			</p>
		</div>
	</div>
</section>

<!-- .agency Upgrade Section -->
<section class="agency-section">
	<div class="agency-content">
		<div class="agency-badge">CREATE SOMETHING .agency</div>
		<h2 class="agency-title">Need more than a template?</h2>
		<p class="agency-description">
			Custom workflows. Automated client follow-ups. CRM integrations.
			Our agency builds on top of your template to create systems that work while you sleep.
		</p>
		<div class="agency-services">
			<div class="agency-service">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
				</svg>
				<div>
					<h4>Booking Automation</h4>
					<p>Calendly → CRM → Follow-up sequences</p>
				</div>
			</div>
			<div class="agency-service">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
				</svg>
				<div>
					<h4>Client Communication</h4>
					<p>Automated reminders, updates, reviews</p>
				</div>
			</div>
			<div class="agency-service">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
					<line x1="3" y1="9" x2="21" y2="9"/>
					<line x1="9" y1="21" x2="9" y2="9"/>
				</svg>
				<div>
					<h4>Custom Integrations</h4>
					<p>Connect to your existing tools</p>
				</div>
			</div>
		</div>
		<a
			href="https://createsomething.agency/contact"
			target="_blank"
			rel="noopener noreferrer"
			class="btn btn-accent btn-lg"
		>
			Talk to .agency
		</a>
	</div>
</section>

<section class="cta-section">
	<div class="cta-content">
		<h2 class="cta-title">Ready to launch?</h2>
		<p class="cta-description">
			Free templates. No credit card. Live in 30 seconds.
		</p>
		<a href="#templates" class="btn btn-primary btn-lg">Get Started</a>
	</div>
</section>

<style>
	/* Hero */
	.hero {
		padding: var(--space-2xl) var(--gutter);
		text-align: center;
		border-bottom: 1px solid var(--color-border-default);
	}

	.hero-content {
		max-width: var(--content-narrow);
		margin: 0 auto;
	}

	.hero-title {
		font-size: var(--text-display);
		font-weight: 700;
		letter-spacing: -0.03em;
		line-height: 1.1;
		margin-bottom: var(--space-md);
	}

	.hero-accent {
		color: var(--color-fg-primary);
	}

	.hero-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-lg);
	}

	.hero-actions {
		display: flex;
		justify-content: center;
		gap: var(--space-sm);
	}

	/* Templates Section */
	.templates-section {
		padding: var(--space-2xl) var(--gutter);
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.section-header {
		text-align: center;
		margin-bottom: var(--space-xl);
	}

	.section-title {
		font-size: var(--text-h1);
		margin-bottom: var(--space-sm);
	}

	.section-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}

	.templates-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: var(--space-lg);
	}

	.template-card {
		display: flex;
		flex-direction: column;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
		text-decoration: none;
		color: inherit;
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.template-card:hover {
		border-color: var(--color-border-emphasis);
		transform: translateY(-4px);
		box-shadow: var(--shadow-lg);
	}

	.template-card:active {
		transform: translateY(-2px);
	}

	@media (prefers-reduced-motion: reduce) {
		.template-card {
			transition: border-color var(--duration-standard) var(--ease-standard),
			            box-shadow var(--duration-standard) var(--ease-standard);
		}

		.template-card:hover,
		.template-card:active {
			transform: none;
		}
	}

	/* Template Embed - Live Site Preview */
	.template-embed-wrapper {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
		background: var(--color-bg-subtle);
	}

	.template-embed {
		position: absolute;
		top: 0;
		left: 0;
		width: 1440px;
		height: 900px;
		border: none;
		transform: scale(0.25);
		transform-origin: top left;
		pointer-events: none;
	}

	/* Overlay to capture clicks and prevent iframe interaction */
	.template-embed-overlay {
		position: absolute;
		inset: 0;
		background: transparent;
		cursor: pointer;
	}

	/* Adjust container to match scaled iframe dimensions */
	.template-thumbnail {
		aspect-ratio: 16/10;
		overflow: hidden;
		background: var(--color-bg-subtle);
		position: relative;
	}

	.template-info {
		padding: var(--space-md);
		flex: 1;
	}

	.template-name {
		font-size: var(--text-h3);
		font-weight: 600;
		margin: 0 0 var(--space-xs);
	}

	.template-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-sm);
	}

	.template-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
		font-size: var(--text-body-sm);
	}

	.template-price {
		display: flex;
		gap: var(--space-xs);
	}

	.template-price .free {
		color: var(--color-success);
		font-weight: 500;
	}

	.template-price .pro {
		color: var(--color-fg-muted);
	}

	.template-cta {
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		font-weight: 500;
	}

	/* Features Section */
	.features-section {
		padding: var(--space-2xl) var(--gutter);
		background: var(--color-bg-surface);
	}

	.features-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-xl);
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.feature {
		text-align: center;
	}

	.feature-number {
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto var(--space-md);
		font-size: var(--text-h3);
		font-weight: 700;
		color: var(--color-fg-primary);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-full);
	}

	.feature-title {
		font-size: var(--text-h3);
		margin-bottom: var(--space-xs);
	}

	.feature-description {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}

	/* CTA Section */
	.cta-section {
		padding: var(--space-2xl) var(--gutter);
		text-align: center;
	}

	.cta-content {
		max-width: var(--content-narrow);
		margin: 0 auto;
	}

	.cta-title {
		font-size: var(--text-h1);
		margin-bottom: var(--space-sm);
	}

	.cta-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-lg);
	}

	/* Deploy Section */
	.deploy-section {
		padding: var(--space-2xl) var(--gutter);
		background: var(--color-bg-surface);
		border-top: 1px solid var(--color-border-default);
		border-bottom: 1px solid var(--color-border-default);
	}

	.deploy-content {
		max-width: var(--content-width);
		margin: 0 auto;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-xl);
		align-items: center;
	}

	.deploy-title {
		font-size: var(--text-h2);
		margin-bottom: var(--space-sm);
	}

	.deploy-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-lg);
	}

	.deploy-steps {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.deploy-step {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}

	.step-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-full);
		color: var(--color-fg-primary);
	}

	.deploy-action {
		text-align: center;
		padding: var(--space-xl);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.btn-github {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		background: #24292e;
		color: var(--color-fg-primary);
		border: none;
	}

	.btn-github:hover {
		background: #2f363d;
	}

	.deploy-hint {
		margin-top: var(--space-md);
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.deploy-hint a {
		color: var(--color-fg-primary);
	}

	/* Agency Section */
	.agency-section {
		padding: var(--space-2xl) var(--gutter);
		background: linear-gradient(135deg, var(--color-bg-elevated), var(--color-bg-pure));
	}

	.agency-content {
		max-width: var(--content-narrow);
		margin: 0 auto;
		text-align: center;
	}

	.agency-badge {
		display: inline-block;
		padding: var(--space-xs) var(--space-sm);
		font-size: var(--text-caption);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-primary);
		background: var(--color-hover);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-full);
		margin-bottom: var(--space-md);
	}

	.agency-title {
		font-size: var(--text-h1);
		margin-bottom: var(--space-sm);
	}

	.agency-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xl);
		line-height: var(--leading-relaxed);
	}

	.agency-services {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-lg);
		margin-bottom: var(--space-xl);
		text-align: left;
	}

	.agency-service {
		display: flex;
		gap: var(--space-md);
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.agency-service svg {
		flex-shrink: 0;
		color: var(--color-fg-primary);
	}

	.agency-service h4 {
		font-size: var(--text-body);
		font-weight: 600;
		margin-bottom: 4px;
	}

	.agency-service p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin: 0;
	}

	.btn-accent {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border: none;
	}

	.btn-accent:hover {
		background: var(--color-fg-secondary);
	}

	@media (max-width: 768px) {
		.features-grid {
			grid-template-columns: 1fr;
		}

		.hero-actions {
			flex-direction: column;
		}

		.deploy-content {
			grid-template-columns: 1fr;
		}

		.agency-services {
			grid-template-columns: 1fr;
		}
	}
</style>
