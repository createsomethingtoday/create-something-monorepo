<script lang="ts">
	import { SEO } from '@create-something/components';
	// Footer is provided by layout
</script>

<SEO
	title="About"
	description="Agentic systems engineering: building AI automation workflows and autonomous systems that run businesses. Research-backed, production-tested methodologies."
	keywords="agentic engineering, AI automation, autonomous systems, Cloudflare Workers, Claude Code, AI agents, background automation"
	ogImage="/og-image.svg"
	propertyName="agency"
/>

<!-- Hero Section -->
	<section class="relative pt-32 pb-16 px-6">
		<div class="max-w-4xl mx-auto">
			<div class="space-y-8 animate-reveal">
				<h1 class="hero-title mb-8">
					Agentic Systems Engineering
				</h1>

				<div class="space-y-8">
					<!-- Core Identity -->
					<div class="space-y-6 leading-relaxed body-lg">
						<p class="body-xl font-medium">
							We build AI systems that run businesses autonomously — from background automation workflows to long-running intelligent agents.
						</p>

						<p>
							This isn't generic "AI consulting." We're systems engineers who build production infrastructure. Every project is backed by research from <a href="https://createsomething.io" class="link">createsomething.io</a>, tracked with real metrics (time, cost, errors), and published as case studies.
						</p>

						<p>
							Web development is our entry point. During builds, we discover workflow inefficiencies in your operations. Then we propose automation systems. Eventually, we build autonomous agents that make decisions and orchestrate complex processes while you sleep.
						</p>
					</div>

					<!-- Philosophy -->
					<div class="card-surface space-y-4">
						<h3 class="heading-3">Our Approach</h3>
						<p class="body-secondary leading-relaxed">
							Every system we build becomes a research experiment. We track precise metrics. We document what works and what doesn't. We publish honest results. Your production systems contribute to the collective knowledge of AI-native engineering — and you benefit from insights across our entire client base.
						</p>
					</div>

					<!-- Background -->
					<div class="space-y-4 body">
						<p>
							Led by Micah Johnson — Texas A&M graduate, UI/UX Design certified (Boulder Digital Arts), systems architect at Webflow. Career spanning Webflow development, API integrations, marketplace architecture, and now full-time agentic systems engineering.
						</p>
						<p>
							Based in Kennedale, Texas. Available on <a href="https://www.linkedin.com/in/micahryanjohnson/" class="link" target="_blank" rel="noopener noreferrer">LinkedIn</a> for collaboration on complex automation challenges.
						</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Mission Section -->
	<section class="py-16 px-6 section-border">
		<div class="max-w-4xl mx-auto">
			<div class="space-y-6 animate-reveal" style="--delay: 2">
				<h2 class="heading-2">
					What We Build
				</h2>

				<p class="body-lg leading-relaxed">
					Production-grade automation systems and autonomous AI agents. Multi-user OAuth integrations. Background processing pipelines. Long-running workflows with durable execution. These aren't experiments — they're business-critical infrastructure running on Cloudflare's global edge network.
				</p>
			</div>
		</div>
	</section>

	<!-- Topics Section -->
	<section class="py-16 px-6 section-border">
		<div class="max-w-4xl mx-auto">
			<div class="space-y-8">
				<h2 class="heading-2">
					Service Categories
				</h2>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					{#each [
						{
							title: 'Web Development',
							description: 'Fast, template-based websites that serve as your entry point to automation discovery'
						},
						{
							title: 'AI Automation Systems',
							description: 'Background workflows with OAuth, API orchestration, and intelligent data processing'
						},
						{
							title: 'Agentic Engineering',
							description: 'Long-running AI agents with autonomous decision-making and workflow orchestration'
						},
						{
							title: 'Systems Partnership',
							description: 'Ongoing optimization and expansion of your AI infrastructure with tracked experiments'
						}
					] as topic, index}
						<div
							class="card-elevated animate-reveal"
							style="--delay: {index + 3}"
						>
							<h3 class="heading-3 mb-2">
								{topic.title}
							</h3>
							<p class="body-tertiary">
								{topic.description}
							</p>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</section>

<style>
	.hero-title {
		font-size: var(--text-h1);
		font-weight: bold;
		color: var(--color-fg-primary);
	}

	.heading-2 {
		font-size: var(--text-h2);
		font-weight: bold;
		color: var(--color-fg-primary);
	}

	.heading-3 {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.body-xl {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}

	.body-lg {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}

	.body {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
	}

	.body-secondary {
		color: var(--color-fg-secondary);
	}

	.body-tertiary {
		color: var(--color-fg-tertiary);
	}

	.link {
		color: var(--color-fg-primary);
	}

	.link:hover {
		text-decoration: underline;
	}

	.card-surface {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.card-elevated {
		padding: var(--space-md);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.section-border {
		border-top: 1px solid var(--color-border-default);
	}

	.animate-reveal {
		opacity: 0;
		transform: translateY(20px);
		animation: reveal 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
		animation-delay: calc(var(--delay, 0) * 100ms);
	}

	@keyframes reveal {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.animate-reveal {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
