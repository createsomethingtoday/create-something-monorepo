<script lang="ts">
	import { config } from '$lib/config/runtime';
	import SEOHead from '$lib/components/SEOHead.svelte';

	let showInfo = $state(false);
</script>

<SEOHead />

<div class="portfolio-home">
	<!-- Work Grid -->
	<div class="work-grid">
		{#each $config.work as project}
			<a href="/work/{project.slug}" class="work-item">
				<img src={project.coverImage} alt={project.title} loading="lazy" />
			</a>
		{/each}
	</div>

	<!-- Info Toggle -->
	<button class="info-toggle" onclick={() => (showInfo = !showInfo)}>
		{showInfo ? 'Close' : 'Info'}
	</button>

	<!-- Info Panel -->
	{#if showInfo}
		<div class="info-panel" onclick={() => (showInfo = false)} role="dialog" aria-modal="true">
			<div class="info-content" onclick={(e) => e.stopPropagation()}>
				<h1 class="info-name">{$config.name}</h1>
				<p class="info-role">{$config.role}</p>
				<p class="info-location">{$config.location}</p>

				<p class="info-bio">{$config.bio}</p>

				{#if $config.availability?.accepting}
					<p class="info-availability">{$config.availability.message}</p>
				{/if}

				<div class="info-contact">
					<a href="mailto:{$config.email}" class="contact-link">{$config.email}</a>
					{#if $config.social.instagram}
						<a href={$config.social.instagram} target="_blank" rel="noopener" class="contact-link"
							>Instagram</a
						>
					{/if}
				</div>

				{#if $config.clients && $config.clients.length > 0}
					<div class="info-clients">
						<span class="clients-label">Selected clients</span>
						<p class="clients-list">{$config.clients.join(', ')}</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.portfolio-home {
		padding: var(--space-sm);
	}

	.work-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
		gap: var(--space-sm);
	}

	.work-item {
		aspect-ratio: 4/3;
		overflow: hidden;
		display: block;
	}

	.work-item img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform var(--duration-standard) var(--ease-standard);
	}

	.work-item:hover img {
		transform: scale(1.02);
	}

	/* Info */
	.info-toggle {
		position: fixed;
		bottom: var(--space-md);
		right: var(--space-md);
		z-index: 100;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		cursor: pointer;
		background: none;
		border: none;
		font-family: inherit;
		padding: var(--space-xs);
	}

	.info-toggle:hover {
		color: var(--color-fg-primary);
	}

	.info-panel {
		position: fixed;
		inset: 0;
		z-index: 200;
		background: rgba(250, 250, 250, 0.98);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-lg);
	}

	.info-content {
		max-width: 500px;
	}

	.info-name {
		font-size: var(--text-display);
		font-weight: 400;
		margin-bottom: var(--space-xs);
	}

	.info-role {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}

	.info-location {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-lg);
	}

	.info-bio {
		font-size: var(--text-body);
		line-height: var(--leading-relaxed);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-md);
	}

	.info-availability {
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		margin-bottom: var(--space-lg);
	}

	.info-contact {
		display: flex;
		gap: var(--space-md);
		margin-bottom: var(--space-lg);
	}

	.contact-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.contact-link:hover {
		color: var(--color-fg-primary);
	}

	.info-clients {
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border-default);
	}

	.clients-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		display: block;
		margin-bottom: var(--space-xs);
	}

	.clients-list {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	@media (max-width: 640px) {
		.work-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
