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
					<!-- Core Identity -->
					<div class="space-y-6 leading-relaxed intro-text">
						<p class="intro-highlight">
							I'm a System Architect, automation builder, and proponent of "less, but better" — focused on how systems work, evolve, and scale.
						</p>

						<p>
							By day, I architect systems on the <a href="https://webflow.com" class="text-link">Webflow</a> Marketplace team, building developer experiences that serve thousands of creators. By night, I'm building the future of workflow automation with <a href="https://workway.co" class="text-link" target="_blank" rel="noopener noreferrer">WORKWAY</a> — the first open-source marketplace for TypeScript workflows, running entirely on Cloudflare's edge infrastructure.
						</p>

						<p>
							I'm also co-founder of <a href="https://halfdozen.co" class="text-link" target="_blank" rel="noopener noreferrer">Half Dozen</a>, where we build business operating systems for the live events industry — helping venues, promoters, and agencies orchestrate complex operations through clean system design.
						</p>
					</div>

					<!-- Philosophy -->
					<div class="philosophy-card">
						<h3 class="card-title">The experiment</h3>
						<p class="card-text">
							I'm building production systems agentically — working with LLMs as actual development partners, not just code generators. CREATE SOMETHING documents what I'm learning through rigorous testing: running experiments, writing papers to prove or disprove approaches, and sharing honest results. Not blog posts about AI, but real data from building real systems with AI agents. What works, what doesn't, and why.
						</p>
					</div>

					<!-- Background -->
					<div class="space-y-4 background-text">
						<p>
							I studied at Texas A&M and earned a UI/UX Design Certification from Boulder Digital Arts. My career has taken me through Webflow development, API integrations, marketplace architecture, and now full-time system design at Webflow — always with a focus on automation and developer experience.
						</p>
						<p>
							Based in Kennedale, Texas. Available on <a href="https://www.linkedin.com/in/micahryanjohnson/" class="text-link" target="_blank" rel="noopener noreferrer">LinkedIn</a> for collaboration and conversation about systems.
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
					Systems thinking applied to real-world challenges — exploring architecture patterns, automation design, mental models for complexity, and the principles that make systems resilient. Each piece examines how systems work through the lens of production implementations, drawing insights that transcend specific technologies.
				</p>
			</div>
		</div>
	</section>

	<!-- Topics Section -->
	<section class="section-border">
		<div class="max-w-4xl mx-auto">
			<div class="space-y-8">
				<h2>
					Systems Thinking Themes
				</h2>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					{#each [
						{
							title: 'System Architecture',
							description: 'How systems are designed, structured, and composed — patterns for building resilient, scalable architectures'
						},
						{
							title: 'Automation & Workflow',
							description: 'Mental models for automation design, orchestration patterns, and building self-healing systems'
						},
						{
							title: 'Complexity & Scale',
							description: 'Understanding emergent behavior, managing complexity, and designing systems that evolve gracefully'
						},
						{
							title: 'Mental Models',
							description: 'Frameworks for thinking about systems — from feedback loops to constraint theory to design patterns'
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
