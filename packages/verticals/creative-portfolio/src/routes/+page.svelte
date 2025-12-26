<script lang="ts">
	/**
	 * Creative Portfolio Home
	 *
	 * Philosophy: The work speaks. Everything else is secondary.
	 * A pure gallery—images reveal in sequence, info panel slides gracefully.
	 * No navigation chrome until requested.
	 *
	 * Zuhandenheit: The interface disappears; the portfolio emerges.
	 */

	import { config } from '$lib/config/runtime';
	import SEOHead from '$lib/components/SEOHead.svelte';
	import { onMount } from 'svelte';

	let showInfo = $state(false);
	let gridRevealed = $state(false);
	let infoAnimating = $state(false);

	function toggleInfo() {
		if (showInfo) {
			// Close animation
			infoAnimating = true;
			setTimeout(() => {
				showInfo = false;
				infoAnimating = false;
			}, 300);
		} else {
			showInfo = true;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && showInfo) {
			toggleInfo();
		}
	}

	onMount(() => {
		// Staggered grid reveal
		requestAnimationFrame(() => {
			gridRevealed = true;
		});

		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});
</script>

<SEOHead />

<div class="portfolio-home">
	<!-- Work Grid -->
	<div class="work-grid" class:revealed={gridRevealed}>
		{#each $config.work as project, i}
			<a
				href="/work/{project.slug}"
				class="work-item"
				style="--delay: {i * 60}ms"
			>
				<img src={project.coverImage} alt={project.title} loading="lazy" />
				<span class="work-title">{project.title}</span>
			</a>
		{/each}
	</div>

	<!-- Info Toggle -->
	<button
		class="info-toggle"
		class:active={showInfo}
		onclick={toggleInfo}
		aria-expanded={showInfo}
		aria-controls="info-panel"
	>
		<span class="toggle-text">{showInfo ? 'Close' : 'Info'}</span>
	</button>

	<!-- Info Panel -->
	{#if showInfo || infoAnimating}
		<div
			id="info-panel"
			class="info-panel"
			class:closing={infoAnimating && !showInfo}
			onclick={toggleInfo}
			role="dialog"
			aria-modal="true"
			aria-label="About {$config.name}"
		>
			<div class="info-content" onclick={(e) => e.stopPropagation()}>
				<header class="info-header">
					<h1 class="info-name">{$config.name}</h1>
					<p class="info-role">{$config.role}</p>
					<p class="info-location">{$config.location}</p>
				</header>

				<p class="info-bio">{$config.bio}</p>

				{#if $config.availability?.accepting}
					<div class="info-availability">
						<span class="availability-dot"></span>
						<span class="availability-text">{$config.availability.message}</span>
					</div>
				{/if}

				<div class="info-contact">
					<a href="mailto:{$config.email}" class="contact-link">{$config.email}</a>
					{#if $config.social?.instagram}
						<a
							href={$config.social.instagram}
							target="_blank"
							rel="noopener"
							class="contact-link"
						>
							Instagram
						</a>
					{/if}
				</div>

				{#if $config.clients && $config.clients.length > 0}
					<footer class="info-clients">
						<span class="clients-label">Selected clients</span>
						<p class="clients-list">{$config.clients.join(', ')}</p>
					</footer>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.portfolio-home {
		min-height: 100vh;
		min-height: 100dvh;
		padding: var(--space-sm);
		background: var(--color-bg-pure);
	}

	/* Work Grid */
	.work-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
		gap: var(--space-sm);
	}

	.work-item {
		position: relative;
		aspect-ratio: 4/3;
		overflow: hidden;
		display: block;
		background: var(--color-bg-surface);
		opacity: 0;
		transform: translateY(20px);
		transition:
			opacity var(--duration-standard) var(--ease-standard),
			transform var(--duration-standard) var(--ease-standard);
		transition-delay: var(--delay);
	}

	.work-grid.revealed .work-item {
		opacity: 1;
		transform: translateY(0);
	}

	.work-item img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform var(--duration-complex) var(--ease-decelerate);
	}

	.work-item:hover img {
		transform: scale(1.03);
	}

	.work-title {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: var(--space-md);
		background: linear-gradient(to top, rgba(0, 0, 0, 0.6) 0%, transparent 100%);
		color: var(--color-fg-primary);
		font-size: var(--text-body-sm);
		font-weight: 400;
		opacity: 0;
		transform: translateY(10px);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.work-item:hover .work-title {
		opacity: 1;
		transform: translateY(0);
	}

	/* Info Toggle */
	.info-toggle {
		position: fixed;
		bottom: var(--space-lg);
		right: var(--space-lg);
		z-index: 100;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-full);
		padding: var(--space-sm) var(--space-md);
		cursor: pointer;
		font-family: inherit;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.info-toggle:hover {
		background: var(--color-bg-subtle);
		border-color: var(--color-border-emphasis);
	}

	.info-toggle.active {
		background: var(--color-fg-primary);
		border-color: var(--color-fg-primary);
	}

	.toggle-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.info-toggle.active .toggle-text {
		color: var(--color-bg-pure);
	}

	/* Info Panel */
	.info-panel {
		position: fixed;
		inset: 0;
		z-index: 200;
		background: var(--color-bg-pure);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-lg);
		opacity: 0;
		animation: panel-in 0.3s var(--ease-decelerate) forwards;
	}

	.info-panel.closing {
		animation: panel-out 0.3s var(--ease-standard) forwards;
	}

	@keyframes panel-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes panel-out {
		from {
			opacity: 1;
		}
		to {
			opacity: 0;
		}
	}

	.info-content {
		max-width: 500px;
		width: 100%;
		opacity: 0;
		transform: translateY(20px);
		animation: content-in 0.4s var(--ease-decelerate) 0.1s forwards;
	}

	.info-panel.closing .info-content {
		animation: content-out 0.2s var(--ease-standard) forwards;
	}

	@keyframes content-in {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes content-out {
		from {
			opacity: 1;
			transform: translateY(0);
		}
		to {
			opacity: 0;
			transform: translateY(-10px);
		}
	}

	.info-header {
		margin-bottom: var(--space-lg);
	}

	.info-name {
		font-size: var(--text-display);
		font-weight: 400;
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs);
		line-height: 1.1;
	}

	.info-role {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.info-location {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin: var(--space-xs) 0 0;
	}

	.info-bio {
		font-size: var(--text-body);
		line-height: 1.7;
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-lg);
	}

	.info-availability {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-lg);
	}

	.availability-dot {
		width: 8px;
		height: 8px;
		border-radius: var(--radius-full);
		background: var(--color-success);
		animation: pulse 2s var(--ease-standard) infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.availability-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
	}

	.info-contact {
		display: flex;
		gap: var(--space-md);
		margin-bottom: var(--space-lg);
	}

	.contact-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.contact-link:hover {
		color: var(--color-fg-primary);
	}

	.info-clients {
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
	}

	.clients-label {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--color-fg-muted);
		display: block;
		margin-bottom: var(--space-sm);
	}

	.clients-list {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0;
		line-height: 1.6;
	}

	/* Responsive */
	@media (max-width: 640px) {
		.work-grid {
			grid-template-columns: 1fr;
		}

		.info-toggle {
			bottom: var(--space-md);
			right: var(--space-md);
		}

		.info-name {
			font-size: var(--text-h1);
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.work-item {
			opacity: 1;
			transform: none;
			transition: none;
		}

		.work-item img,
		.work-title {
			transition: none;
		}

		.info-panel,
		.info-content {
			animation: none;
			opacity: 1;
			transform: none;
		}

		.availability-dot {
			animation: none;
		}
	}
</style>
