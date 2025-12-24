<script lang="ts">
	import PluginCard from '$lib/components/plugins/PluginCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let { plugins, categories } = $derived(data);

	let selectedCategory = $state<string | null>(null);
	let copied = $state(false);

	const filteredPlugins = $derived.by(() => {
		if (!selectedCategory) return plugins;
		return plugins.filter((p) => p.category === selectedCategory);
	});

	const marketplaceCommand = '/plugin marketplace add createsomethingtoday/claude-plugins';

	async function copyCommand() {
		try {
			await navigator.clipboard.writeText(marketplaceCommand);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}
</script>

<svelte:head>
	<title>Plugins | CREATE SOMETHING</title>
	<meta
		name="description"
		content="Claude Code plugins for subtractive design methodology: DRY → Rams → Heidegger"
	/>
	<link rel="canonical" href="https://createsomething.io/plugins" />
</svelte:head>

<!-- Hero Section -->
<section class="pt-24 pb-16 px-6">
	<div class="max-w-6xl mx-auto">
		<div class="space-y-6 animate-reveal">
			<div>
				<h1 class="page-title">Plugins</h1>
				<p class="page-description">
					Claude Code plugins for subtractive design methodology
				</p>
			</div>

			<!-- Quick Start -->
			<div class="quick-start">
				<h2 class="quick-start-title">Quick Start</h2>
				<p class="quick-start-desc">Add the marketplace to Claude Code:</p>
				<div class="command-box">
					<code class="command-text">{marketplaceCommand}</code>
					<button class="copy-button" onclick={copyCommand} aria-label="Copy command">
						{#if copied}
							<span class="copy-success">✓</span>
						{:else}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
								<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
							</svg>
						{/if}
					</button>
				</div>
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
					{category} ({plugins.filter((p) => p.category === category).length})
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
						<PluginCard {plugin} />
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

	.quick-start {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
	}

	.quick-start-title {
		font-size: var(--text-body);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs) 0;
	}

	.quick-start-desc {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-sm) 0;
	}

	.command-box {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-sm) var(--space-md);
	}

	.command-text {
		flex: 1;
		font-family: 'Monaco', 'Menlo', monospace;
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		background: none;
		padding: 0;
	}

	.copy-button {
		background: none;
		border: none;
		color: var(--color-fg-secondary);
		cursor: pointer;
		padding: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.copy-button:hover {
		color: var(--color-fg-primary);
	}

	.copy-success {
		color: var(--color-success);
		font-weight: 600;
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

	@media (prefers-reduced-motion: reduce) {
		.animate-reveal {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
