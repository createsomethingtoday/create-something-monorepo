<script lang="ts">
	import { config } from '$lib/config/runtime';
	import SEOHead from '$lib/components/SEOHead.svelte';

	let showInfo = $state(false);
</script>

<SEOHead title="Work" description="Selected work by {$config.name}" canonical="/work" />

<div class="work-list">
	<!-- Work Items -->
	<div class="list-container">
		{#each $config.work as project}
			<a href="/work/{project.slug}" class="list-item">
				<span class="project-title">{project.title}</span>
				<span class="project-year">{project.year}</span>
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

				<div class="info-contact">
					<a href="/" class="contact-link">Home</a>
					<a href="/about" class="contact-link">About</a>
					<a href="/contact" class="contact-link">Contact</a>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.work-list {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-lg);
	}

	.list-container {
		width: 100%;
		max-width: 800px;
	}

	.list-item {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		padding: var(--space-md) 0;
		border-bottom: 1px solid var(--color-border-default);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.list-item:first-child {
		border-top: 1px solid var(--color-border-default);
	}

	.list-item:hover {
		color: var(--color-fg-secondary);
	}

	.project-title {
		font-size: var(--text-h1);
		font-weight: 400;
	}

	.project-year {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		font-variant-numeric: tabular-nums;
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
		text-align: center;
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

	.info-contact {
		display: flex;
		gap: var(--space-md);
		justify-content: center;
	}

	.contact-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.contact-link:hover {
		color: var(--color-fg-primary);
	}

	@media (max-width: 640px) {
		.list-item {
			flex-direction: column;
			gap: var(--space-xs);
			align-items: flex-start;
		}

		.project-title {
			font-size: var(--text-body);
		}

		.project-year {
			font-size: var(--text-caption);
		}
	}
</style>
