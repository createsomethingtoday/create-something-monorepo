<script lang="ts">
	import PluginCard from '$lib/components/plugins/PluginCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let { plugins, categories } = $derived(data);

	let selectedCategory = $state<string | null>(null);
	let copiedMarketplace = $state(false);
	let copiedInstallAll = $state(false);

	const filteredPlugins = $derived.by(() => {
		if (!selectedCategory) return plugins;
		return plugins.filter((p) => p.category === selectedCategory);
	});

	const marketplaceCommand = '/plugin marketplace add createsomethingtoday/claude-plugins';
	const installAllCommand = plugins.map((p) => `/plugin install ${p.slug}@create-something`).join(' && ');

	async function copyMarketplace() {
		try {
			await navigator.clipboard.writeText(marketplaceCommand);
			copiedMarketplace = true;
			setTimeout(() => (copiedMarketplace = false), 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}

	async function copyInstallAll() {
		try {
			await navigator.clipboard.writeText(installAllCommand);
			copiedInstallAll = true;
			setTimeout(() => (copiedInstallAll = false), 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}
</script>

<svelte:head>
	<title>Claude Code Plugins | CREATE SOMETHING</title>
	<meta
		name="description"
		content="Free Claude Code plugins for subtractive design methodology. Implement DRY, Dieter Rams, and Heideggerian principles in your AI-native development workflow."
	/>
	<meta name="keywords" content="Claude Code plugins, AI development tools, subtractive design, DRY principle, Dieter Rams, code quality, Claude AI" />
	<link rel="canonical" href="https://createsomething.io/plugins" />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://createsomething.io/plugins" />
	<meta property="og:title" content="Claude Code Plugins | CREATE SOMETHING" />
	<meta property="og:description" content="Free Claude Code plugins for subtractive design methodology. DRY → Rams → Heidegger." />
	<meta property="og:image" content="https://createsomething.io/og-image.png" />
	<meta property="og:site_name" content="CREATE SOMETHING" />

	<!-- Twitter -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:url" content="https://createsomething.io/plugins" />
	<meta name="twitter:title" content="Claude Code Plugins | CREATE SOMETHING" />
	<meta name="twitter:description" content="Free Claude Code plugins for subtractive design methodology." />
	<meta name="twitter:image" content="https://createsomething.io/og-image.png" />

	<!-- JSON-LD: ItemList for AEO (helps AI assistants list plugins) -->
	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'ItemList',
		name: 'Claude Code Plugins by CREATE SOMETHING',
		description: 'Free plugins for Claude Code implementing subtractive design methodology',
		url: 'https://createsomething.io/plugins',
		numberOfItems: plugins.length,
		itemListElement: plugins.map((p, i) => ({
			'@type': 'ListItem',
			position: i + 1,
			item: {
				'@type': 'SoftwareApplication',
				name: p.name,
				description: p.description,
				applicationCategory: 'DeveloperApplication',
				operatingSystem: 'Any',
				url: 'https://createsomething.io/plugins/' + p.slug,
				offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
			}
		}))
	})}<\/script>`}

	<!-- JSON-LD: BreadcrumbList -->
	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://createsomething.io' },
			{ '@type': 'ListItem', position: 2, name: 'Plugins', item: 'https://createsomething.io/plugins' }
		]
	})}<\/script>`}

	<!-- JSON-LD: FAQPage for AEO -->
	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: [
			{
				'@type': 'Question',
				name: 'How do I install Claude Code plugins from CREATE SOMETHING?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: 'First, add the marketplace with: /plugin marketplace add createsomethingtoday/claude-plugins. Then install any plugin with: /plugin install [plugin-name]@create-something'
				}
			},
			{
				'@type': 'Question',
				name: 'What is the Subtractive Triad methodology?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: 'The Subtractive Triad is a design philosophy with three levels: DRY (eliminate duplication), Rams (eliminate excess following Dieter Rams\' principle of less but better), and Heidegger (eliminate disconnection through hermeneutic understanding).'
				}
			},
			{
				'@type': 'Question',
				name: 'Are these Claude Code plugins free?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: 'Yes, all CREATE SOMETHING Claude Code plugins are free and open source.'
				}
			}
		]
	})}<\/script>`}
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
				<div class="quick-start-steps">
					<div class="quick-start-step">
						<span class="step-label">1. Add marketplace</span>
						<div class="command-box">
							<code class="command-text">{marketplaceCommand}</code>
							<button class="copy-button" onclick={copyMarketplace} aria-label="Copy command">
								{#if copiedMarketplace}
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
					<div class="quick-start-step">
						<span class="step-label">2. Install all plugins</span>
						<div class="command-box install-all">
							<code class="command-text">{installAllCommand}</code>
							<button class="copy-button" onclick={copyInstallAll} aria-label="Copy install all command">
								{#if copiedInstallAll}
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
		margin: 0 0 var(--space-sm) 0;
	}

	.quick-start-steps {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.quick-start-step {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.step-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		font-weight: 500;
	}

	.install-all .command-text {
		font-size: var(--text-caption);
		word-break: break-all;
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
