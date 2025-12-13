<script lang="ts">
	import { Footer } from '@create-something/components';

	const quickLinks = [
		{ label: 'Home', href: '/' },
		{ label: 'Experiments', href: '/experiments' },
		{ label: 'Methodology', href: '/methodology' }
	];
</script>

<svelte:head>
	<title>About | CREATE SOMETHING SPACE</title>
	<meta name="description" content="CREATE SOMETHING SPACE is a community playground for testing AI-native development ideas. Fork experiments, break things, learn in public." />
	<meta name="keywords" content="AI experiments, community playground, fork experiments, learn in public, Claude Code, experimental development" />
	<!-- Open Graph -->
	<meta property="og:title" content="About CREATE SOMETHING SPACE | The Experimental Layer" />
	<meta property="og:description" content="Community playground for AI-native development experiments. Every experiment feeds back into createsomething.io research." />
	<meta property="og:url" content="https://createsomething.space/about" />
	<!-- Twitter -->
	<meta name="twitter:title" content="About CREATE SOMETHING SPACE" />
	<meta name="twitter:description" content="The experimental layer for testing AI-native development ideas with the community." />
	<link rel="canonical" href="https://createsomething.space/about" />
</svelte:head>

<!-- Hero Section -->
	<section class="relative pt-32 pb-16 px-6">
		<div class="max-w-4xl mx-auto">
			<div class="space-y-8 animate-reveal">
				<h1 class="hero-title mb-8">
					The Experimental Layer
				</h1>

				<div class="space-y-8">
					<!-- Core Identity -->
					<div class="core-identity">
						<p class="lead-text">
							CREATE SOMETHING SPACE is a community playground for testing ideas around AI-native development. Fork experiments, break things, learn in public.
						</p>

						<p>
							This is the experimental layer that sits alongside <a href="https://createsomething.io" class="link">createsomething.io</a> — where the rigorous research happens. While the main site documents tracked experiments with precise metrics, .space is where the community can fork those experiments, try variations, and share learnings.
						</p>

						<p>
							Every experiment here feeds back into the research. Your forks, modifications, and results help inform what works in AI-native development. It's a collaborative space for testing what happens when humans and AI build together.
						</p>
					</div>

					<!-- Philosophy -->
					<div class="philosophy-card">
						<h3 class="card-title">How it works</h3>
						<p class="card-text">
							Browse experiments, fork the ones that interest you, modify them however you want, and share what you learn. Break things. Try crazy ideas. Test edge cases. The goal is to collectively understand what works in AI-native development — not through theory, but through actual experimentation with real systems.
						</p>
					</div>

					<!-- Background -->
					<div class="background-section">
						<p>
							I studied at Texas A&M and earned a UI/UX Design Certification from Boulder Digital Arts. My career has taken me through Webflow development, API integrations, marketplace architecture, and now full-time system design at Webflow — always with a focus on automation and developer experience.
						</p>
						<p>
							Based in Kennedale, Texas. Available on <a href="https://www.linkedin.com/in/micahryanjohnson/" class="link" target="_blank" rel="noopener noreferrer">LinkedIn</a> for collaboration and conversation about systems.
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
				<h2 class="section-title">
					What You'll Find Here
				</h2>

				<p class="section-text">
					Community experiments testing AI-native development patterns. Real implementations you can fork, modify, and learn from. Each experiment documents what was tried, what worked, what didn't, and why. No theory — just practical tests of building production systems with AI.
				</p>
			</div>
		</div>
	</section>

	<!-- Topics Section -->
	<section class="topics-section">
		<div class="max-w-4xl mx-auto">
			<div class="space-y-8">
				<h2 class="section-title">
					Experiment Categories
				</h2>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					{#each [
						{
							title: 'Browser Automation',
							description: 'Testing AI-generated browser automation scripts with Cloudflare Workers and Puppeteer'
						},
						{
							title: 'API Integration',
							description: 'Experiments connecting various APIs and services using AI-assisted development'
						},
						{
							title: 'Database Patterns',
							description: 'Testing different database patterns with D1, KV, and other Cloudflare services'
						},
						{
							title: 'UI Components',
							description: 'Building and testing reusable UI components with AI assistance'
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

	<Footer
		mode="space"
		showNewsletter={false}
		aboutText="Community playground for AI-native development experiments. Fork experiments, break things, learn in public."
		quickLinks={quickLinks}
		showSocial={true}
	/>

<style>
	.hero-title {
		font-size: clamp(2.5rem, 5vw, 3.5rem);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.core-identity {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		font-size: var(--text-body-lg);
		color: var(--color-fg-tertiary);
		line-height: 1.7;
	}

	.lead-text {
		font-size: clamp(1.125rem, 2vw, 1.25rem);
		color: var(--color-fg-secondary);
		font-weight: 500;
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
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.card-text {
		color: var(--color-fg-tertiary);
		line-height: 1.7;
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

	.section-title {
		font-size: clamp(1.5rem, 3vw, 1.875rem);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.section-text {
		font-size: var(--text-body-lg);
		color: var(--color-fg-tertiary);
		line-height: 1.7;
	}

	.topic-card {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.topic-title {
		font-size: var(--text-h3);
		font-weight: 600;
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
