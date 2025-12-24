<script lang="ts">
	import PluginCard from '$lib/components/plugins/PluginCard.svelte';
	import PluginExportModal from '$lib/components/plugins/PluginExportModal.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let { plugins, categories, isAuthenticated, enabledPlugins } = $derived(data);

	let selectedCategory = $state<string | null>(null);
	let showExportModal = $state(false);

	const filteredPlugins = $derived.by(() => {
		if (!selectedCategory) return plugins;
		return plugins.filter(p => p.category === selectedCategory);
	});
</script>

<svelte:head>
	<title>Plugins | CREATE SOMETHING</title>
	<meta name="description" content="Discover and enable CREATE SOMETHING plugins to enhance your workflow" />
	<link rel="canonical" href="https://createsomething.io/plugins" />
</svelte:head>

<!-- Hero Section -->
<section class="pt-24 pb-16 px-6">
	<div class="max-w-6xl mx-auto">
		<div class="space-y-6 animate-reveal">
			<div>
				<h1 class="page-title">Plugins</h1>
				<p class="page-description">
					Discover and enable plugins to enhance your Claude Code workflow
				</p>
			</div>

			<div class="flex items-center gap-4">
				{#if isAuthenticated}
					<button
						class="export-button"
						onclick={() => (showExportModal = true)}
						aria-label="Export enabled plugins as JSON"
					>
						<span>Export Settings</span>
					</button>
				{/if}
			</div>
		</div>
	</div>
</section>

<!-- Category Filter -->
<section class="py-12 px-6 border-b border-border-default">
	<div class="max-w-6xl mx-auto">
		<div class="flex flex-wrap gap-3">
			<button
				class="category-chip"
				class:active={selectedCategory === null}
				onclick={() => (selectedCategory = null)}
			>
				All ({plugins.length})
			</button>
			{#each categories as category}
				<button
					class="category-chip"
					class:active={selectedCategory === category}
					onclick={() => (selectedCategory = category)}
				>
					{category} ({plugins.filter(p => p.category === category).length})
				</button>
			{/each}
		</div>
	</div>
</section>

<!-- Plugins Grid -->
<section class="py-16 px-6">
	<div class="max-w-6xl mx-auto">
		{#if filteredPlugins.length > 0}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each filteredPlugins as plugin, index}
					<div class="animate-reveal" style="--delay: {index + 1}">
						<PluginCard
							{plugin}
							isEnabled={enabledPlugins.includes(plugin.slug)}
							{isAuthenticated}
						/>
					</div>
				{/each}
			</div>
		{:else}
			<div class="text-center py-16">
				<p class="text-fg-secondary text-body-lg">
					No plugins found in {selectedCategory} category.
				</p>
			</div>
		{/if}
	</div>
</section>

<!-- Export Modal -->
<PluginExportModal
	isOpen={showExportModal}
	onClose={() => (showExportModal = false)}
/>

<style>
	.page-title {
		font-size: var(--text-display);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.page-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-tertiary);
	}

	.export-button {
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		color: var(--color-fg-primary);
		font-size: var(--text-body);
		font-weight: 500;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.export-button:hover {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
	}

	.category-chip {
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-full);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.category-chip:hover {
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	.category-chip.active {
		background: var(--color-bg-surface);
		border-color: var(--color-border-strong);
		color: var(--color-fg-primary);
	}

	.border-border-default {
		border-color: var(--color-border-default);
	}

	.text-fg-secondary {
		color: var(--color-fg-secondary);
	}

	.text-body-lg {
		font-size: var(--text-body-lg);
	}

	.animate-reveal {
		opacity: 0;
		transform: translateY(20px);
		animation: reveal var(--duration-complex) var(--ease-standard) forwards;
		animation-delay: calc(var(--delay, 0) * 100ms);
	}

	@keyframes reveal {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.modal-overlay,
		.modal-content,
		.animate-reveal {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
