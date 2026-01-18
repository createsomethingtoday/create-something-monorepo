<script lang="ts">
	import { SEO } from '@create-something/components';
	// Footer is provided by layout
</script>

<SEO
	title="About"
	description="155 scripts became 13. 120 hours/week of research became automated. We build AI systems that run businesses—backed by 40+ production deployments."
	keywords="agentic engineering, AI automation, autonomous systems, Cloudflare Workers, Claude Code, AI agents, background automation"
	ogImage="/og-image.svg"
	propertyName="agency"
/>

<!-- Hero Section -->
	<section class="relative pt-32 pb-16 px-6">
		<div class="max-w-4xl mx-auto">
			<div class="space-y-8 animate-reveal">
				<h1 class="hero-title mb-8">
					40+ Production Systems. Real Metrics.
				</h1>

				<div class="space-y-8">
					<!-- Core Identity -->
					<div class="space-y-6 leading-relaxed body-lg">
						<p class="body-xl font-medium">
							155 scripts became 13. 120 hours/week of research became automated. We build AI systems that run businesses—background automation, intelligent agents, and the infrastructure that makes them reliable.
						</p>

						<p>
							Not consulting. Engineering. Every project ships production code, tracks real metrics (time saved, costs reduced, errors prevented), and gets documented as a case study on <a href="https://createsomething.io" class="link">createsomething.io</a>.
						</p>

						<p>
							We start with web development—fast sites on Cloudflare's edge. During the build, we find your workflow bottlenecks. Then we fix them with automation. Eventually, we build systems that make decisions while you sleep.
						</p>
					</div>

					<!-- What You Get -->
					<div class="card-surface space-y-4">
						<h3 class="heading-3">What You Get</h3>
						<p class="body-secondary leading-relaxed">
							Real metrics from your project: time saved, costs reduced, errors prevented. A case study documenting what worked (and what didn't). And ongoing access to insights from our entire client base—patterns that worked for one client often work for others.
						</p>
					</div>

					<!-- Background -->
					<div class="space-y-4 body">
						<p>
							Led by Micah Johnson. 5+ years at Webflow—API integrations, marketplace architecture, enterprise systems. Texas A&M graduate. UI/UX certified (Boulder Digital Arts). Now building AI systems full-time.
						</p>
						<p>
							Based in Texas. <a href="https://www.linkedin.com/in/micahryanjohnson/" class="link" target="_blank" rel="noopener noreferrer">LinkedIn</a> for complex automation projects.
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
					Automation systems processing thousands of records daily. OAuth integrations connecting 10+ services. AI agents that run for hours without human input. All production-grade, all on Cloudflare's edge network, all with monitoring and error handling built in.
				</p>
			</div>
		</div>
	</section>

	<!-- Topics Section -->
	<section class="py-16 px-6 section-border">
		<div class="max-w-4xl mx-auto">
			<div class="space-y-8">
				<h2 class="heading-2">
					What We Do
				</h2>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					{#each [
						{
							title: 'Web Development',
							description: '3 weeks to production. Sub-100ms response times. Edge-deployed sites that ship fast.'
						},
						{
							title: 'Workflow Automation',
							description: '60-70% time savings on manual work. Systems that process data and talk to your tools.'
						},
						{
							title: 'Agentic Systems',
							description: '155 scripts became 13. AI that makes decisions while you sleep.'
						},
						{
							title: 'Ongoing Partnership',
							description: '2-4 new features per month. 4-hour response time. We maintain what we build.'
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
