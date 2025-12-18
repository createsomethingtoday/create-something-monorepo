<script lang="ts">
	import { SEO } from '@create-something/components';
	import {
		Bot,
		Component,
		Video,
		BookOpen,
		Zap,
		MessageCircle,
		Check,
		Circle,
		ArrowRight
	} from 'lucide-svelte';

	let email = '';
	let submitted = false;
	let error = '';

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';

		try {
			const response = await fetch('/api/newsletter', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to subscribe');
			}

			submitted = true;
			email = '';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong';
		}
	}
</script>

<SEO
	title="Subscribe | CREATE SOMETHING.io"
	description="Get early access to autonomous agents, agentic component libraries, and recorded workshops. Launch January 2025."
	keywords="subscription, autonomous agents, agentic systems, component library, workshops"
	ogImage="/og-image.svg"
	propertyName="io"
/>

<div class="page-container min-h-screen">
	<div class="max-w-4xl mx-auto px-6 py-16">
		<!-- Header -->
		<div class="mb-12">
			<div class="launch-badge inline-block px-4 py-1.5 mb-6 font-mono">
				LAUNCHING JANUARY 2025
			</div>
			<h1 class="page-title mb-6">Build Autonomous Software</h1>
			<p class="page-subtitle max-w-2xl">
				Get access to production-ready agents, agentic component libraries, and recorded workshops.
				Everything you need to build software that encodes expertise.
			</p>
		</div>

		<!-- What's Included -->
		<div class="mb-16">
			<h2 class="section-title mb-8">What's Included</h2>

			<div class="grid md:grid-cols-2 gap-6">
				<!-- Autonomous Agents -->
				<div class="feature-card p-6">
					<Bot class="w-8 h-8 mb-3 icon-secondary" />
					<h3 class="card-title mb-2">Autonomous Agents</h3>
					<p class="card-description mb-4">
						Production-ready agents built from real client projects
					</p>
					<ul class="space-y-2 list-text">
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 icon-success mt-0.5 flex-shrink-0" />
							<span>Gmail to Notion sync agent</span>
						</li>
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 icon-success mt-0.5 flex-shrink-0" />
							<span>Notion deduplication agent</span>
						</li>
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 icon-success mt-0.5 flex-shrink-0" />
							<span>Claude Code skills & patterns</span>
						</li>
						<li class="flex items-start gap-2">
							<Circle class="w-4 h-4 icon-muted mt-0.5 flex-shrink-0" />
							<span>More agents added as projects complete</span>
						</li>
					</ul>
				</div>

				<!-- Component Libraries -->
				<div class="feature-card p-6">
					<Component class="w-8 h-8 mb-3 icon-secondary" />
					<h3 class="card-title mb-2">Agentic Components</h3>
					<p class="card-description mb-4">
						UI components that embody expert knowledge
					</p>
					<ul class="space-y-2 list-text">
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 icon-success mt-0.5 flex-shrink-0" />
							<span>@create-something/tufte (visualization)</span>
						</li>
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 icon-success mt-0.5 flex-shrink-0" />
							<span>@create-something/components (UI primitives)</span>
						</li>
						<li class="flex items-start gap-2">
							<Circle class="w-4 h-4 icon-muted mt-0.5 flex-shrink-0" />
							<span>@create-something/agents (coming soon)</span>
						</li>
						<li class="flex items-start gap-2">
							<Circle class="w-4 h-4 icon-muted mt-0.5 flex-shrink-0" />
							<span>@create-something/claude-patterns (coming soon)</span>
						</li>
					</ul>
				</div>

				<!-- Video Walkthroughs -->
				<div class="feature-card p-6">
					<Video class="w-8 h-8 mb-3 icon-secondary" />
					<h3 class="card-title mb-2">Video Walkthroughs</h3>
					<p class="card-description mb-4">
						Recorded tutorials showing how to use and extend each agent
					</p>
					<ul class="space-y-2 list-text">
						<li class="flex items-start gap-2">
							<Circle class="w-4 h-4 icon-muted mt-0.5 flex-shrink-0" />
							<span>Installation & configuration (15-20 min each)</span>
						</li>
						<li class="flex items-start gap-2">
							<Circle class="w-4 h-4 icon-muted mt-0.5 flex-shrink-0" />
							<span>Extension & customization (20-30 min each)</span>
						</li>
						<li class="flex items-start gap-2">
							<Circle class="w-4 h-4 icon-muted mt-0.5 flex-shrink-0" />
							<span>Real-world deployment examples</span>
						</li>
					</ul>
				</div>

				<!-- Recorded Workshops -->
				<div class="feature-card p-6">
					<BookOpen class="w-8 h-8 mb-3 icon-secondary" />
					<h3 class="card-title mb-2">Recorded Workshops</h3>
					<p class="card-description mb-4">
						Deep-dive workshops on building agentic systems (60-90 min)
					</p>
					<ul class="space-y-2 list-text">
						<li class="flex items-start gap-2">
							<Circle class="w-4 h-4 icon-muted mt-0.5 flex-shrink-0" />
							<span>Building agentic integrations</span>
						</li>
						<li class="flex items-start gap-2">
							<Circle class="w-4 h-4 icon-muted mt-0.5 flex-shrink-0" />
							<span>Cloudflare Workers AI patterns</span>
						</li>
						<li class="flex items-start gap-2">
							<Circle class="w-4 h-4 icon-muted mt-0.5 flex-shrink-0" />
							<span>Claude Code skills development</span>
						</li>
					</ul>
				</div>

				<!-- Templates & Starter Projects -->
				<div class="feature-card p-6">
					<Zap class="w-8 h-8 mb-3 icon-secondary" />
					<h3 class="card-title mb-2">Templates & Starters</h3>
					<p class="card-description mb-4">
						Ready-to-deploy infrastructure and configuration templates
					</p>
					<ul class="space-y-2 list-text">
						<li class="flex items-start gap-2">
							<Circle class="w-4 h-4 icon-muted mt-0.5 flex-shrink-0" />
							<span>Cloudflare Workers deployment templates</span>
						</li>
						<li class="flex items-start gap-2">
							<Circle class="w-4 h-4 icon-muted mt-0.5 flex-shrink-0" />
							<span>SvelteKit + Cloudflare starter</span>
						</li>
						<li class="flex items-start gap-2">
							<Circle class="w-4 h-4 icon-muted mt-0.5 flex-shrink-0" />
							<span>Agent architecture patterns</span>
						</li>
					</ul>
				</div>

				<!-- Support & Community -->
				<div class="feature-card p-6">
					<MessageCircle class="w-8 h-8 mb-3 icon-secondary" />
					<h3 class="card-title mb-2">Async Support</h3>
					<p class="card-description mb-4">
						Email support and asynchronous community resources
					</p>
					<ul class="space-y-2 list-text">
						<li class="flex items-start gap-2">
							<Circle class="w-4 h-4 icon-muted mt-0.5 flex-shrink-0" />
							<span>Priority email support (24-48hr response)</span>
						</li>
						<li class="flex items-start gap-2">
							<Circle class="w-4 h-4 icon-muted mt-0.5 flex-shrink-0" />
							<span>GitHub Discussions access</span>
						</li>
						<li class="flex items-start gap-2">
							<Circle class="w-4 h-4 icon-muted mt-0.5 flex-shrink-0" />
							<span>Quarterly recorded Q&A sessions</span>
						</li>
					</ul>
				</div>
			</div>
		</div>

		<!-- The Philosophy -->
		<div class="philosophy-card mb-16 p-8">
			<h2 class="section-title mb-4">Why This Model?</h2>
			<div class="space-y-4 body-text">
				<p>
					CREATE SOMETHING practices what it preaches. If agentic systems are about encoding
					expertise so humans don't need to be constantly involved, then our business model should
					reflect that.
				</p>
				<p>
					<strong class="text-primary">No forced schedules.</strong> New agents, videos, and workshops
					are released when projects complete—quality over arbitrary deadlines.
				</p>
				<p>
					<strong class="text-primary">No mandatory community.</strong> Everything works asynchronously.
					Recorded videos, documented code, self-service resources. Engage when you want, how you want.
				</p>
				<p>
					<strong class="text-primary">Real client work.</strong> Every agent in the library has been
					battle-tested in production. Not toy examples—actual systems that solve real problems.
				</p>
			</div>
		</div>

		<!-- Pricing Preview -->
		<div class="mb-16">
			<h2 class="section-title mb-8">Pricing (Preview)</h2>

			<div class="grid md:grid-cols-3 gap-6">
				<!-- Free Tier -->
				<div class="pricing-card p-6">
					<div class="tier-label mb-2">EXPLORE</div>
					<div class="tier-price mb-4">Free</div>
					<ul class="space-y-3 list-text mb-6">
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 icon-muted flex-shrink-0" />
							<span>Component documentation</span>
						</li>
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 icon-muted flex-shrink-0" />
							<span>Selected experiments & papers</span>
						</li>
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 icon-muted flex-shrink-0" />
							<span>Sample agent code</span>
						</li>
					</ul>
				</div>

				<!-- Paid Tier -->
				<div class="pricing-card-featured p-6 relative">
					<div class="recommended-badge">
						RECOMMENDED
					</div>
					<div class="tier-label-featured mb-2">BUILD</div>
					<div class="tier-price mb-1">$40</div>
					<div class="tier-period mb-4">/month</div>
					<ul class="space-y-3 list-text mb-6">
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 icon-success flex-shrink-0" />
							<span>Full agent library</span>
						</li>
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 icon-success flex-shrink-0" />
							<span>All video walkthroughs</span>
						</li>
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 icon-success flex-shrink-0" />
							<span>All recorded workshops</span>
						</li>
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 icon-success flex-shrink-0" />
							<span>Template repositories</span>
						</li>
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 icon-success flex-shrink-0" />
							<span>Email support</span>
						</li>
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 icon-success flex-shrink-0" />
							<span>Early access to new releases</span>
						</li>
					</ul>
				</div>

				<!-- Enterprise Tier -->
				<div class="pricing-card p-6">
					<div class="tier-label mb-2">DEPLOY</div>
					<div class="tier-price mb-4">Custom</div>
					<ul class="space-y-3 list-text mb-6">
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 icon-muted flex-shrink-0" />
							<span>Everything in Build</span>
						</li>
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 icon-muted flex-shrink-0" />
							<span>Consultancy hours</span>
						</li>
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 icon-muted flex-shrink-0" />
							<span>Custom agent development</span>
						</li>
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 icon-muted flex-shrink-0" />
							<span>Private repository access</span>
						</li>
					</ul>
				</div>
			</div>
		</div>

		<!-- Early Access Signup -->
		<div class="max-w-xl mx-auto text-center">
			<h2 class="cta-title mb-4">Get Early Access</h2>
			<p class="body-text mb-8">
				Sign up to be notified when subscriptions launch in January 2025. Early subscribers get
				founding member pricing.
			</p>

			{#if submitted}
				<div class="success-banner p-6">
					<div class="success-title mb-2">You're on the list!</div>
					<p class="success-description">
						We'll email you when subscriptions open in January.
					</p>
				</div>
			{:else}
				<form on:submit={handleSubmit} class="space-y-4">
					<div>
						<label for="subscribe-email" class="sr-only">Email address</label>
						<input
							id="subscribe-email"
							type="email"
							bind:value={email}
							placeholder="your@email.com"
							required
							class="email-input w-full px-4 py-3"
						/>
					</div>

					{#if error}
						<div class="error-banner p-3">
							{error}
						</div>
					{/if}

					<button
						type="submit"
						class="submit-button w-full px-6 py-3 font-medium"
					>
						Notify Me at Launch
					</button>
				</form>
			{/if}

			<p class="caption-text mt-4">
				No spam. Just one email when subscriptions open in January 2025.
			</p>
		</div>

		<!-- Footer Links -->
		<div class="footer-section mt-16 pt-8 text-center">
			<p>
				Questions? Email <a href="mailto:micah@createsomething.io" class="footer-link">micah@createsomething.io</a>
				·
				<a href="/" class="footer-link">Back to experiments</a>
			</p>
		</div>
	</div>
</div>

<style>
	/* Page Layout */
	.page-container {
		background: var(--color-bg-pure);
		color: var(--color-fg-primary);
	}

	/* Typography */
	.page-title {
		font-size: clamp(2.5rem, 5vw, 3.5rem);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.page-subtitle {
		font-size: var(--text-h3);
		color: var(--color-fg-tertiary);
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.cta-title {
		font-size: clamp(1.5rem, 3vw, 2rem);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.card-title {
		font-size: var(--text-body-lg);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.card-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.body-text {
		color: var(--color-fg-tertiary);
	}

	.list-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.caption-text {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.text-primary {
		color: var(--color-fg-primary);
	}

	/* Launch Badge */
	.launch-badge {
		font-size: var(--text-body-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-sm);
		color: var(--color-fg-primary);
	}

	/* Feature Cards */
	.feature-card {
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	/* Philosophy Card */
	.philosophy-card {
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	/* Pricing Cards */
	.pricing-card {
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.pricing-card-featured {
		background: var(--color-bg-surface);
		border: 2px solid var(--color-border-strong);
		border-radius: var(--radius-lg);
	}

	.tier-label {
		font-size: var(--text-body-sm);
		font-family: ui-monospace, monospace;
		color: var(--color-fg-muted);
	}

	.tier-label-featured {
		font-size: var(--text-body-sm);
		font-family: ui-monospace, monospace;
		color: var(--color-fg-tertiary);
	}

	.tier-price {
		font-size: clamp(1.5rem, 3vw, 2rem);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.tier-period {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.recommended-badge {
		position: absolute;
		top: -0.75rem;
		left: 50%;
		transform: translateX(-50%);
		padding: 0.25rem 0.75rem;
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-size: var(--text-caption);
		font-weight: 700;
		border-radius: var(--radius-full);
	}

	/* Icons */
	.icon-secondary {
		color: var(--color-fg-secondary);
	}

	.icon-success {
		color: var(--color-success);
	}

	.icon-muted {
		color: var(--color-fg-subtle);
	}

	/* Form Elements */
	.success-banner {
		background: var(--color-success-muted);
		border: 1px solid var(--color-success-border);
		border-radius: var(--radius-lg);
	}

	.success-title {
		color: var(--color-success);
		font-size: var(--text-body-lg);
		font-weight: 500;
	}

	.success-description {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
	}

	.error-banner {
		background: var(--color-error-muted);
		border: 1px solid var(--color-error-border);
		border-radius: var(--radius-sm);
		color: var(--color-error);
		font-size: var(--text-body-sm);
	}

	.email-input {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-lg);
		color: var(--color-fg-primary);
	}

	.email-input::placeholder {
		color: var(--color-fg-muted);
	}

	.email-input:focus {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
		border-color: var(--color-border-strong);
	}

	.submit-button {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-radius: var(--radius-lg);
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.submit-button:hover {
		opacity: 0.9;
	}

	.submit-button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	/* Footer */
	.footer-section {
		border-top: 1px solid var(--color-border-default);
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.footer-link {
		text-decoration: underline;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.footer-link:hover {
		color: var(--color-fg-tertiary);
	}

	/* Screen reader only - visually hidden but accessible */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
