<script lang="ts">
	const quickLinks = [
		{ label: 'Home', href: '/' },
		{ label: 'All Experiments', href: '/experiments' },
		{ label: 'Methodology', href: '/methodology' },
		{ label: 'About', href: '/about' }
	];
</script>

<svelte:head>
	<title>About | CREATE SOMETHING</title>
	<meta name="description" content="CREATE SOMETHING is a space for systems thinking — exploring how complex systems work, evolve, and scale through real-world technology implementations." />
	<meta name="keywords" content="systems thinking, system architecture, mental models, complexity, design patterns, automation, resilient systems, Micah Johnson" />
	<!-- Open Graph -->
	<meta property="og:title" content="About CREATE SOMETHING | Systems Thinking" />
	<meta property="og:description" content="A space for exploring how complex systems work, evolve, and scale through architecture, automation, and design patterns." />
	<meta property="og:url" content="https://createsomething.io/about" />
	<!-- Twitter -->
	<meta name="twitter:title" content="About CREATE SOMETHING" />
	<meta name="twitter:description" content="Exploring systems thinking through real-world technology — architecture, automation, and mental models for complexity." />
	<link rel="canonical" href="https://createsomething.io/about" />
</svelte:head>

<!-- Hero Section -->
	<section class="hero-section">
		<div class="max-w-4xl mx-auto">
			<div class="space-y-8 animate-reveal">
				<h1>
					Hi, I'm Micah Johnson
				</h1>

				<div class="space-y-8">
					<!-- Lead with outcomes -->
					<div class="space-y-6 leading-relaxed intro-text">
						<p class="intro-highlight">
							10 years building systems. 47 tracked experiments. 155 scripts reduced to 13.
							I document what works in AI-native development—with real data.
						</p>

					<p>
						By day, I architect systems on the <a href="https://webflow.com" class="text-link">Webflow</a> Marketplace team, building developer experiences that serve thousands of creators. By night, I'm building <a href="https://workway.co" class="text-link" target="_blank" rel="noopener noreferrer">WORKWAY</a>—the automation layer. An open marketplace for TypeScript workflows, running on Cloudflare's edge. Automation infrastructure is my life's work.
					</p>

						<p>
							I'm also co-founder of <a href="https://halfdozen.co" class="text-link" target="_blank" rel="noopener noreferrer">Half Dozen</a>, where we build operating systems for the live events industry—venues, promoters, and agencies running on clean system design.
						</p>
					</div>

					<!-- What I'm testing -->
					<div class="philosophy-card">
						<h3 class="card-title">What I'm testing</h3>
						<p class="card-text">
							Can you build production automation infrastructure with AI as a development partner? CREATE SOMETHING tracks the experiments: 6-hour builds vs 20-hour estimates, $18.50 API costs for full features, 92% script reduction through systematic methodology. The research feeds directly into <a href="https://workway.co" class="text-link">WORKWAY</a> and <a href="https://createsomething.agency" class="text-link">.agency</a>—where theory becomes the automation layer.
						</p>
					</div>

					<!-- Background -->
					<div class="space-y-4 background-text">
						<p>
							Texas A&M. UI/UX Certification from Boulder Digital Arts. Career path at Webflow: customer support (500+ forum posts) → official Webflow University educator → marketplace operations → system architecture. I've touched every layer of the product—from user frustration to system design. The thread: automation and developer experience.
						</p>
						<p>
							Based in Kennedale, Texas. Available on <a href="https://www.linkedin.com/in/micahryanjohnson/" class="text-link" target="_blank" rel="noopener noreferrer">LinkedIn</a> for collaboration.
						</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Mission Section -->
	<section class="section-border">
		<div class="max-w-4xl mx-auto">
			<div class="space-y-6 animate-reveal" style="--delay: 2">
				<h2>
					What You'll Find Here
				</h2>

				<p class="section-text">
					Experiments you can replicate. Papers with methodology and data. Each piece shows what was built, how long it took, what it cost, and whether it worked. No theory without testing. No claims without evidence.
				</p>
			</div>
		</div>
	</section>

	<!-- Topics Section -->
	<section class="section-border">
		<div class="max-w-4xl mx-auto">
			<div class="space-y-8">
				<h2>
					Research Areas
				</h2>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					{#each [
						{
							title: 'Automation Infrastructure',
							description: 'Building the layer between intention and execution. What makes automation recede into transparent use—and what makes it intrusive.'
						},
						{
							title: 'AI-Native Development',
							description: 'Building with Claude Code, Cursor, and agentic workflows. Tracking what actually speeds up development—and what doesn\'t.'
						},
						{
							title: 'System Architecture',
							description: 'Cloudflare Workers, edge computing, multi-tenant platforms. The infrastructure that powers WORKWAY and .agency.'
						},
						{
							title: 'Methodology',
							description: 'How we track experiments. How we write papers. How we know when something actually works.'
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
	.hero-section {
		position: relative;
		padding: var(--space-2xl) var(--space-md) var(--space-xl);
	}

	.intro-text {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}

	.intro-highlight {
		font-size: var(--text-h3);
		color: var(--color-fg-primary);
		font-weight: var(--font-medium);
	}

	.text-link {
		color: var(--color-fg-primary);
		transition: opacity var(--duration-standard) var(--ease-standard);
	}

	.text-link:hover {
		text-decoration: underline;
	}

	.philosophy-card {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
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
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	.background-text {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body);
	}

	.section-border {
		padding: var(--space-xl) var(--space-md);
		border-top: 1px solid var(--color-border-default);
	}


	.section-text {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	.topic-card {
		padding: var(--space-md);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.topic-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.topic-description {
		color: var(--color-fg-tertiary);
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

<!-- Footer -->
