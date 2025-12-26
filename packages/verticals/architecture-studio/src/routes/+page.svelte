<script lang="ts">
	/**
	 * Architecture Studio Home
	 *
	 * Philosophy: Architecture speaks through presence, not proclamation.
	 * The hero image dominates—a single project that anchors the studio's identity.
	 * Sections reveal through scroll, each earning its moment.
	 *
	 * Zuhandenheit: The interface recedes; the work remains.
	 */

	import { config } from '$lib/config/runtime';
	import SEOHead from '$lib/components/SEOHead.svelte';
	import StructuredData from '$lib/components/StructuredData.svelte';
	import { onMount } from 'svelte';

	let heroVisible = $state(false);
	let projectsRevealed = $state(false);
	let philosophyRevealed = $state(false);
	let approachRevealed = $state(false);
	let recognitionRevealed = $state(false);

	onMount(() => {
		// Hero entrance
		requestAnimationFrame(() => {
			heroVisible = true;
		});

		// Section observers
		const createObserver = (
			id: string,
			callback: () => void,
			threshold = 0.2
		) => {
			const observer = new IntersectionObserver(
				(entries) => {
					if (entries[0].isIntersecting) {
						callback();
						observer.disconnect();
					}
				},
				{ threshold }
			);
			const el = document.getElementById(id);
			if (el) observer.observe(el);
			return observer;
		};

		const observers = [
			createObserver('projects', () => (projectsRevealed = true)),
			createObserver('philosophy', () => (philosophyRevealed = true)),
			createObserver('approach', () => (approachRevealed = true)),
			createObserver('recognition', () => (recognitionRevealed = true))
		];

		return () => observers.forEach((o) => o.disconnect());
	});
</script>

<SEOHead />
<StructuredData page="home" />

<!-- Hero - Full bleed image with minimal text -->
<section class="hero" class:visible={heroVisible}>
	<div class="hero-image-wrapper">
		<img src={$config.hero.image} alt={$config.hero.alt} class="hero-img" />
	</div>
	<div class="hero-content">
		<p class="hero-caption">{$config.hero.caption}</p>
	</div>
	<div class="scroll-indicator" aria-hidden="true">
		<span class="scroll-line"></span>
	</div>
</section>

<!-- Selected Projects -->
<section class="projects section" id="projects" class:revealed={projectsRevealed}>
	<div class="projects-header">
		<h2 class="section-title">Selected Projects</h2>
		<a href="/projects" class="view-all">View All →</a>
	</div>

	<div class="projects-grid">
		{#each $config.projects.slice(0, 3) as project, i}
			<a
				href="/projects/{project.slug}"
				class="project-card"
				class:large={i === 0}
				style="--delay: {i * 100}ms"
			>
				<div class="project-image-wrapper">
					<img src={project.heroImage} alt={project.title} class="project-img" loading="lazy" />
				</div>
				<div class="project-info">
					<h3 class="project-title">{project.title}</h3>
					<p class="project-meta">
						{project.location} · {project.year}
					</p>
				</div>
			</a>
		{/each}
	</div>
</section>

<!-- Studio Philosophy -->
<section class="philosophy section" id="philosophy" class:revealed={philosophyRevealed}>
	<div class="philosophy-content">
		<span class="philosophy-mark" aria-hidden="true">"</span>
		<p class="philosophy-text">{$config.studio.philosophy}</p>
	</div>
</section>

<!-- Approach -->
<section class="approach section" id="approach" class:revealed={approachRevealed}>
	<h2 class="approach-title">Approach</h2>
	<div class="approach-grid">
		{#each $config.studio.approach as principle, i}
			<div class="approach-item" style="--delay: {i * 80}ms">
				<span class="approach-number">{String(i + 1).padStart(2, '0')}</span>
				<p class="approach-text">{principle}</p>
			</div>
		{/each}
	</div>
</section>

<!-- Recognition -->
{#if $config.recognition.length > 0}
	<section class="recognition section" id="recognition" class:revealed={recognitionRevealed}>
		<span class="recognition-label">Recognition</span>
		<div class="recognition-list">
			{#each $config.recognition as item, i}
				<span class="recognition-item" style="--delay: {i * 50}ms">
					{item.publication}, {item.year}
				</span>
			{/each}
		</div>
	</section>
{/if}

<style>
	/* Hero */
	.hero {
		position: relative;
		height: 100vh;
		height: 100dvh;
		width: 100%;
		overflow: hidden;
		background: var(--color-bg-pure);
	}

	.hero-image-wrapper {
		position: absolute;
		inset: 0;
	}

	.hero-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0;
		transform: scale(1.02);
		transition:
			opacity 1.2s var(--ease-decelerate),
			transform 1.2s var(--ease-decelerate);
	}

	.hero.visible .hero-img {
		opacity: 1;
		transform: scale(1);
	}

	.hero-content {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: var(--space-xl) var(--space-lg);
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.hero-caption {
		color: var(--color-fg-primary);
		font-size: var(--text-body-sm);
		font-weight: 300;
		letter-spacing: 0.05em;
		opacity: 0;
		transform: translateY(10px);
		transition: all 0.8s var(--ease-decelerate) 0.8s;
	}

	.hero.visible .hero-caption {
		opacity: 0.8;
		transform: translateY(0);
	}

	/* Scroll indicator */
	.scroll-indicator {
		position: absolute;
		bottom: var(--space-xl);
		left: 50%;
		transform: translateX(-50%);
		opacity: 0;
		transition: opacity 0.8s var(--ease-decelerate) 1.5s;
	}

	.hero.visible .scroll-indicator {
		opacity: 0.5;
	}

	.scroll-line {
		display: block;
		width: 1px;
		height: var(--space-lg);
		background: linear-gradient(to bottom, var(--color-fg-primary), transparent);
		animation: scroll-pulse 2.5s var(--ease-standard) infinite;
	}

	@keyframes scroll-pulse {
		0%,
		100% {
			opacity: 0.3;
			transform: scaleY(1);
		}
		50% {
			opacity: 0.8;
			transform: scaleY(1.3);
		}
	}

	/* Section base */
	.section {
		padding: var(--space-2xl) var(--space-lg);
	}

	/* Projects */
	.projects-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: var(--space-xl);
		max-width: var(--content-width);
		margin-left: auto;
		margin-right: auto;
		opacity: 0;
		transform: translateY(20px);
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.projects.revealed .projects-header {
		opacity: 1;
		transform: translateY(0);
	}

	.section-title {
		font-size: var(--text-h3);
		font-weight: 300;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.view-all {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.view-all:hover {
		color: var(--color-fg-primary);
	}

	.projects-grid {
		display: grid;
		grid-template-columns: repeat(12, 1fr);
		gap: var(--space-sm);
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.project-card {
		display: block;
		grid-column: span 4;
		overflow: hidden;
		text-decoration: none;
		opacity: 0;
		transform: translateY(30px);
		transition: all var(--duration-standard) var(--ease-standard);
		transition-delay: var(--delay);
	}

	.projects.revealed .project-card {
		opacity: 1;
		transform: translateY(0);
	}

	.project-card.large {
		grid-column: span 8;
	}

	.project-image-wrapper {
		aspect-ratio: 4/3;
		overflow: hidden;
		margin-bottom: var(--space-md);
		background: var(--color-bg-surface);
	}

	.project-card.large .project-image-wrapper {
		aspect-ratio: 16/10;
	}

	.project-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform var(--duration-complex) var(--ease-decelerate);
	}

	.project-card:hover .project-img {
		transform: scale(1.03);
	}

	.project-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.project-title {
		font-size: var(--text-body-lg);
		font-weight: 400;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.project-meta {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin: 0;
	}

	/* Philosophy */
	.philosophy {
		background: var(--color-bg-surface);
		padding: var(--space-3xl) var(--space-lg);
	}

	.philosophy-content {
		max-width: 800px;
		margin: 0 auto;
		text-align: center;
		position: relative;
	}

	.philosophy-mark {
		display: block;
		font-size: clamp(4rem, 10vw, 8rem);
		font-weight: 300;
		color: var(--color-fg-subtle);
		line-height: 0.5;
		margin-bottom: var(--space-md);
		opacity: 0;
		transform: translateY(20px);
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.philosophy.revealed .philosophy-mark {
		opacity: 1;
		transform: translateY(0);
	}

	.philosophy-text {
		font-size: var(--text-h2);
		font-weight: 300;
		line-height: 1.4;
		color: var(--color-fg-secondary);
		font-style: italic;
		margin: 0;
		opacity: 0;
		transform: translateY(20px);
		transition: all var(--duration-standard) var(--ease-standard) 0.1s;
	}

	.philosophy.revealed .philosophy-text {
		opacity: 1;
		transform: translateY(0);
	}

	/* Approach */
	.approach {
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.approach-title {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--color-fg-muted);
		margin: 0 0 var(--space-xl);
		opacity: 0;
		transition: opacity var(--duration-standard) var(--ease-standard);
	}

	.approach.revealed .approach-title {
		opacity: 1;
	}

	.approach-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-lg);
	}

	.approach-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		opacity: 0;
		transform: translateY(20px);
		transition: all var(--duration-standard) var(--ease-standard);
		transition-delay: var(--delay);
	}

	.approach.revealed .approach-item {
		opacity: 1;
		transform: translateY(0);
	}

	.approach-number {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-variant-numeric: tabular-nums;
	}

	.approach-text {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		margin: 0;
	}

	/* Recognition */
	.recognition {
		border-top: 1px solid var(--color-border-default);
		text-align: center;
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.recognition-label {
		display: block;
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-lg);
		opacity: 0;
		transition: opacity var(--duration-standard) var(--ease-standard);
	}

	.recognition.revealed .recognition-label {
		opacity: 1;
	}

	.recognition-list {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--space-md);
	}

	.recognition-item {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		opacity: 0;
		transition: opacity var(--duration-standard) var(--ease-standard);
		transition-delay: var(--delay);
	}

	.recognition.revealed .recognition-item {
		opacity: 1;
	}

	.recognition-item:not(:last-child)::after {
		content: '·';
		margin-left: var(--space-md);
		color: var(--color-fg-muted);
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.projects-grid {
			grid-template-columns: 1fr;
		}

		.project-card,
		.project-card.large {
			grid-column: span 1;
		}

		.project-card.large .project-image-wrapper {
			aspect-ratio: 4/3;
		}

		.approach-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 640px) {
		.approach-grid {
			grid-template-columns: 1fr;
		}

		.philosophy-text {
			font-size: var(--text-h3);
		}

		.section {
			padding: var(--space-xl) var(--space-md);
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.hero-img {
			opacity: 1;
			transform: none;
			transition: none;
		}

		.hero-caption,
		.scroll-indicator,
		.projects-header,
		.project-card,
		.philosophy-mark,
		.philosophy-text,
		.approach-title,
		.approach-item,
		.recognition-label,
		.recognition-item {
			opacity: 1;
			transform: none;
			transition: none;
		}

		.scroll-line {
			animation: none;
		}

		.project-img {
			transition: none;
		}
	}
</style>
