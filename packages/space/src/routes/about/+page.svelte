<script lang="ts">
	import { SEO } from '@create-something/canon';
</script>

<SEO
	title="About"
	description="The experimental layer for automation infrastructure. Fork experiments, break things, learn how to build the layer that works while you sleep."
	keywords="automation infrastructure, AI experiments, WORKWAY, the automation layer, fork experiments, learn in public, Claude Code"
	propertyName="space"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.space' },
		{ name: 'About', url: 'https://createsomething.space/about' }
	]}
/>

<!-- Hero Section -->
	<section class="relative pt-32 pb-16 px-6">
		<div class="max-w-4xl mx-auto">
			<div class="space-y-8 animate-reveal">
				<h1 class="mb-8">
					The Experimental Layer
				</h1>

				<div class="space-y-8">
					<!-- Core Identity -->
					<div class="core-identity">
						<p class="lead-text">
							<strong>What to try:</strong> Pick an experiment. Fork it. Break it. Learn how to build the automation layer.
						</p>

						<p>
							This is where you test ideas before they're ready for <a href="https://createsomething.io" class="link">createsomething.io</a>. The experiments here explore the same infrastructure that powers <a href="https://workway.co" class="link">WORKWAY</a>—automation that recedes into transparent use. The layer that works while you sleep.
						</p>

						<p>
							Everything you build here feeds back into the research. When you find something interesting—or break something in a useful way—that becomes part of what we collectively know about automation infrastructure.
						</p>
					</div>

					<!-- Philosophy -->
					<div class="philosophy-card">
						<h3 class="card-title">How to use this space</h3>
						<p class="card-text">
							Browse experiments. Fork one that interests you. Modify it however you want. Share what you learn. There's no pressure to get things right—this is where you test edge cases and try ideas that might not work. The goal is to learn together what actually works when humans and AI build together.
						</p>
					</div>

					<!-- Background -->
					<div class="background-section">
						<p>
							My Webflow career spans every layer: customer support (500+ forum posts, video walkthroughs), official Webflow University educator (Micro Lessons with 10K+ views), marketplace operations, now full-time system architecture. Texas A&M, UI/UX certification from Boulder Digital Arts. The common thread: understanding products from the user's frustration to the system's design.
						</p>
						<p>
							Based in Kennedale, Texas. Find me on <a href="https://www.linkedin.com/in/micahryanjohnson/" class="link" target="_blank" rel="noopener noreferrer">LinkedIn</a> if you want to talk about systems.
						</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Mission Section -->
	<section class="mission-section">
		<div class="max-w-4xl mx-auto">
			<div class="space-y-6 animate-reveal" style="--delay: 2">
				<h2>
					What You'll Find Here
				</h2>

				<p class="section-text">
					Real experiments you can fork and modify. Each one documents what was tried, what worked, what didn't, and why. No theory—just practical tests of building production systems with AI.
				</p>

				<p class="section-text">
					<strong>Notice what's different:</strong> Most AI content shows the finished result. Here, you see the process—including the parts that didn't work.
				</p>
			</div>
		</div>
	</section>

	<!-- Topics Section -->
	<section class="topics-section">
		<div class="max-w-4xl mx-auto">
			<div class="space-y-8">
				<h2>
					Where to Start
				</h2>

				<p class="section-text mb-4">
					Pick a category that matches what you're working on. Each experiment includes setup instructions and expected outcomes.
				</p>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					{#each [
						{
							title: 'Automation Infrastructure',
							description: 'Build workflows with WORKWAY patterns. The layer that handles tasks while you sleep—edge-deployed, type-safe, production-ready.'
						},
						{
							title: 'API Integration',
							description: 'Connect APIs and services using AI-assisted development. The infrastructure that makes multi-service automations reliable.'
						},
						{
							title: 'Edge Patterns',
							description: 'Test approaches with D1, KV, Workers AI, and Cloudflare services. The infrastructure that powers both WORKWAY and .agency.'
						},
						{
							title: 'AI-Native Development',
							description: 'Build with Claude Code and agentic workflows. Learn how AI and automation infrastructure work together.'
						}
					] as topic, index}
						<div
							class="topic-card animate-reveal"
							style="--delay: {index + 3}"
						>
							<h3 class="topic-title">
								{topic.title}
							</h3>
							<p class="topic-description">
								{topic.description}
							</p>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</section>

<style>
	.core-identity {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		font-size: var(--text-body-lg);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
	}

	.lead-text {
		font-size: var(--text-h3);
		color: var(--color-fg-secondary);
		font-weight: var(--font-medium);
	}

	.link {
		color: var(--color-fg-primary);
	}

	.link:hover {
		text-decoration: underline;
	}

	.philosophy-card {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.card-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.card-text {
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
	}

	.background-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		font-size: var(--text-body);
		color: var(--color-fg-muted);
	}

	.mission-section,
	.topics-section {
		padding: var(--space-xl) var(--space-lg);
		border-top: 1px solid var(--color-border-default);
	}

	.section-text {
		font-size: var(--text-body-lg);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
	}

	.topic-card {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.topic-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.topic-description {
		color: var(--color-fg-muted);
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
