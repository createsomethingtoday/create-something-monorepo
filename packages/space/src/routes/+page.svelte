<script lang="ts">
	import { SEO } from '@create-something/canon';

	const tools = [
		{
			name: 'Code Playground',
			href: '/playground',
			description: 'Execute JavaScript directly in the Cloudflare Workers runtime. Console output, async/await, ES2022.',
			status: 'live',
			icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
		},
		{
			name: 'Praxis',
			href: '/praxis',
			description: 'Learn integration patterns through graded code challenges. Subtractive Triad validation — DRY, Rams, Heidegger.',
			status: 'live',
			icon: 'M13 10V3L4 14h7v7l9-11h-7z'
		},
		{
			name: 'Motion Lab',
			href: '/motion',
			description: 'Analyze CSS animations from any URL. Puppeteer extraction with timing, easing, and property analysis.',
			status: 'live',
			icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664zM21 12a9 9 0 11-18 0 9 9 0 0118 0z'
		},
		{
			name: 'Data Studio',
			href: '/data',
			description: 'Live data dashboards with real-time updates. NBA analytics with caching, rate limiting, and historical snapshots.',
			status: 'live',
			icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
		},
		{
			name: 'Discover',
			href: '/discover',
			description: 'Explore concepts across CREATE SOMETHING properties. Cross-property mapping and hermeneutic spiral visualization.',
			status: 'live',
			icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
		}
	];
</script>

<SEO
	title="The Workbench"
	description="Build, test, and analyze with live tools. Code playground, motion analysis, data dashboards, and pattern learning — all running on Cloudflare Workers."
	keywords="developer tools, code playground, motion analysis, data studio, Cloudflare Workers, live sandbox, workbench"
	ogImage="/og-image.svg"
	propertyName="space"
/>

<!-- Hero -->
<section class="hero">
	<div class="hero-container">
		<div class="hero-eyebrow animate-reveal" style="--delay: 0">
			CREATE SOMETHING SPACE
		</div>

		<h1 class="hero-headline animate-reveal" style="--delay: 1">
			The Workbench
		</h1>

		<p class="hero-description animate-reveal" style="--delay: 2">
			Live tools for building, testing, and analyzing automation infrastructure.
			Every tool runs on Cloudflare Workers. Pick one and start working.
		</p>
	</div>
</section>

<!-- Tool Grid -->
<section class="tools-section">
	<div class="tools-container">
		<div class="tools-grid">
			{#each tools as tool, index}
				<a
					href={tool.href}
					class="tool-card animate-reveal"
					style="--delay: {3 + index}"
				>
					<div class="tool-icon">
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d={tool.icon} />
						</svg>
					</div>

					<div class="tool-content">
						<div class="tool-header">
							<h2 class="tool-name">{tool.name}</h2>
							<span class="tool-status">{tool.status}</span>
						</div>
						<p class="tool-description">{tool.description}</p>
					</div>

					<div class="tool-arrow">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
						</svg>
					</div>
				</a>
			{/each}
		</div>
	</div>
</section>

<!-- Ecosystem -->
<section class="ecosystem">
	<div class="ecosystem-container">
		<p class="ecosystem-label">The Hermeneutic Circle</p>
		<h2 class="ecosystem-heading">.io reads. .space does.</h2>
		<p class="ecosystem-description">
			Research and documentation live on .io. The workbench lives here.
			Patterns validated here become documented patterns there.
		</p>

		<div class="ecosystem-grid">
			<a href="https://createsomething.io" class="ecosystem-card animate-reveal" style="--delay: 0" target="_blank" rel="noopener">
				<span class="property-tag">.io</span>
				<h3 class="property-name">Read</h3>
				<p class="property-desc">Research papers, MCP patterns, reference implementations.</p>
			</a>

			<a href="https://createsomething.agency" class="ecosystem-card animate-reveal" style="--delay: 1" target="_blank" rel="noopener">
				<span class="property-tag">.agency</span>
				<h3 class="property-name">Build</h3>
				<p class="property-desc">Custom MCP development. The creation moat as a service.</p>
			</a>

			<a href="https://createsomething.ltd" class="ecosystem-card animate-reveal" style="--delay: 2" target="_blank" rel="noopener">
				<span class="property-tag">.ltd</span>
				<h3 class="property-name">Philosophy</h3>
				<p class="property-desc">Why creation matters more than consumption.</p>
			</a>
		</div>
	</div>
</section>

<style>
	/* Hero */
	.hero {
		padding: 6rem 1.5rem 3rem;
	}

	.hero-container {
		max-width: 48rem;
		margin: 0 auto;
		text-align: center;
	}

	.hero-eyebrow {
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-muted);
		letter-spacing: 0.05em;
		text-transform: uppercase;
		margin-bottom: var(--space-md);
	}

	.hero-headline {
		font-size: var(--text-display);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		line-height: var(--leading-tight);
		margin-bottom: var(--space-md);
	}

	.hero-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
		max-width: 36rem;
		margin: 0 auto;
	}

	/* Tools */
	.tools-section {
		padding: 0 1.5rem 4rem;
	}

	.tools-container {
		max-width: 64rem;
		margin: 0 auto;
	}

	.tools-grid {
		display: grid;
		grid-template-columns: repeat(1, 1fr);
		gap: var(--space-md);
	}

	@media (min-width: 768px) {
		.tools-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 1024px) {
		.tools-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.tool-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		padding: var(--space-lg);
		background-color: var(--glass-bg-light);
		backdrop-filter: blur(var(--glass-blur-md)) var(--glass-saturate-md);
		border: 1px solid var(--glass-border-light);
		border-radius: var(--radius-lg);
		transition: all var(--duration-standard) var(--ease-standard);
		position: relative;
	}

	.tool-card:hover {
		background-color: var(--glass-bg-medium);
		border-color: var(--glass-border-medium);
		box-shadow: var(--glass-shadow-sm);
		transform: translateY(-2px);
	}

	.tool-card:active {
		transform: translateY(0);
	}

	.tool-icon {
		color: var(--color-fg-muted);
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-elevated);
		border-radius: var(--radius-md);
	}

	.tool-content {
		flex: 1;
	}

	.tool-header {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		margin-bottom: var(--space-xs);
	}

	.tool-name {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.tool-status {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		background: var(--color-bg-elevated);
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-full);
	}

	.tool-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
	}

	.tool-arrow {
		color: var(--color-fg-subtle);
		align-self: flex-end;
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.tool-card:hover .tool-arrow {
		color: var(--color-fg-tertiary);
		transform: translateX(4px);
	}

	/* Ecosystem */
	.ecosystem {
		padding: 4rem 1.5rem;
		border-top: 1px solid var(--color-border-default);
	}

	.ecosystem-container {
		max-width: 64rem;
		margin: 0 auto;
		text-align: center;
	}

	.ecosystem-label {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-sm);
	}

	.ecosystem-heading {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.ecosystem-description {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		max-width: 36rem;
		margin: 0 auto var(--space-xl);
	}

	.ecosystem-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-lg);
	}

	.ecosystem-card {
		display: block;
		padding: var(--space-lg);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		text-align: left;
		transition: all var(--duration-micro) var(--ease-standard);
		opacity: 0;
		animation: cardReveal var(--duration-standard) var(--ease-standard) forwards;
		animation-delay: calc(var(--index, 0) * var(--cascade-step));
	}

	.ecosystem-card:hover {
		transform: scale(var(--scale-micro));
		border-color: var(--color-border-emphasis);
		background: var(--color-bg-surface);
	}

	@keyframes cardReveal {
		from {
			opacity: 0;
			transform: translateY(16px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.ecosystem-card {
			animation: none;
			opacity: 1;
		}
	}

	.property-tag {
		font-size: var(--text-caption);
		font-family: monospace;
		color: var(--color-fg-muted);
	}

	.property-name {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: var(--space-xs) 0;
	}

	.property-desc {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
	}

	@media (max-width: 768px) {
		.ecosystem-grid {
			grid-template-columns: 1fr;
		}
	}

	/* Staggered reveal */
	.animate-reveal {
		opacity: 0;
		transform: translateY(16px);
		animation: reveal var(--duration-complex) var(--ease-standard) forwards;
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
