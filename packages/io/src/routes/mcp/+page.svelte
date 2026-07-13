<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let { cards, statuses } = $derived(data);
	let selectedStatus = $state<string | null>(null);

	const filteredCards = $derived.by(() => {
		if (!selectedStatus) return cards;
		return cards.filter((card) => card.status === selectedStatus);
	});

	function formatStatus(value: string): string {
		return value.replace(/_/g, ' ');
	}
</script>

<svelte:head>
	<title>Public MCP Trust Catalog | CREATE SOMETHING</title>
	<meta
		name="description"
		content="Owned public trust cards for CREATE SOMETHING MCP servers, with access model, evidence, observability labels, and install snippets."
	/>
	<link rel="canonical" href="https://createsomething.io/mcp" />

	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://createsomething.io/mcp" />
	<meta property="og:title" content="Public MCP Trust Catalog | CREATE SOMETHING" />
	<meta property="og:description" content="Canonical CREATE SOMETHING MCP trust cards." />
	<meta property="og:image" content="https://createsomething.io/og-image.png" />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Public MCP Trust Catalog" />
	<meta name="twitter:description" content="Canonical CREATE SOMETHING MCP trust cards." />
	<meta name="twitter:image" content="https://createsomething.io/og-image.png" />

	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'ItemList',
		name: 'CREATE SOMETHING Public MCP Trust Catalog',
		description: 'Owned public trust cards for CREATE SOMETHING MCP servers',
		url: 'https://createsomething.io/mcp',
		numberOfItems: cards.length,
		itemListElement: cards.map((card, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			item: {
				'@type': 'SoftwareApplication',
				name: card.name,
				description: card.description,
				applicationCategory: 'DeveloperApplication',
				operatingSystem: 'Any',
				url: `https://createsomething.io/mcp/${card.slug}`
			}
		}))
	})}<\/script>`}
</svelte:head>

<section class="hero">
	<div class="max-w-6xl mx-auto">
		<div class="space-y-6 animate-reveal">
			<div>
				<h1 class="page-title">MCP Trust Catalog</h1>
				<p class="page-description">
					Owned public trust cards for CREATE SOMETHING MCP servers.
				</p>
			</div>

			<div class="catalog-summary">
				<div>
					<span class="summary-label">Access</span>
					<strong>Read-only first</strong>
				</div>
				<div>
					<span class="summary-label">Evidence</span>
					<strong>Sanitized rollups</strong>
				</div>
				<div>
					<span class="summary-label">Canonical</span>
					<strong>createsomething.io</strong>
				</div>
			</div>
		</div>
	</div>
</section>

<section class="filters">
	<div class="max-w-6xl mx-auto">
		<div class="filter-row">
			<button
				class="filter-chip"
				class:active={selectedStatus === null}
				onclick={() => (selectedStatus = null)}
			>
				All ({cards.length})
			</button>
			{#each statuses as status}
				<button
					class="filter-chip"
					class:active={selectedStatus === status}
					onclick={() => (selectedStatus = status)}
				>
					{formatStatus(status)} ({cards.filter((card) => card.status === status).length})
				</button>
			{/each}
		</div>
	</div>
</section>

<section class="catalog">
	<div class="max-w-6xl mx-auto">
		<div class="grid">
			{#each filteredCards as card, index}
				<a class="trust-card animate-reveal" style="--delay: {index + 1}" href="/mcp/{card.slug}">
					<div class="card-header">
						<span class="status-badge">{formatStatus(card.status)}</span>
						<span class="access-badge">{formatStatus(card.accessModel)}</span>
					</div>
					<h2>{card.name}</h2>
					<p>{card.description}</p>
					<div class="metrics">
						<span>{card.toolCount} tools</span>
						<span>{card.authModel} auth</span>
						<span>Eval {card.evalStatus}</span>
					</div>
					<span class="card-link">View trust card</span>
				</a>
			{/each}
		</div>
	</div>
</section>

<style>
	.hero {
		padding: 6rem 1.5rem 4rem;
	}

	.page-title {
		font-size: var(--text-performance-h1);
		font-weight: var(--font-performance-bold);
		color: var(--color-performance-fg-primary);
	}

	.page-description {
		font-size: var(--text-performance-body-lg);
		color: var(--color-performance-fg-tertiary);
	}

	.catalog-summary {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--space-performance-md);
	}

	.catalog-summary > div {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
		padding: var(--space-performance-md);
	}

	.summary-label {
		display: block;
		color: var(--color-performance-fg-muted);
		font-size: var(--text-performance-body-sm);
		margin-bottom: var(--space-performance-xs);
	}

	.filters {
		padding: var(--space-performance-lg) 1.5rem;
		border-top: 1px solid var(--color-performance-border-default);
		border-bottom: 1px solid var(--color-performance-border-default);
	}

	.filter-row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-performance-sm);
	}

	.filter-chip {
		padding: var(--space-performance-xs) var(--space-performance-sm);
		background: var(--color-performance-bg-subtle);
		border: 1px solid transparent;
		border-radius: var(--radius-performance-scale-full);
		color: var(--color-performance-fg-secondary);
		font-size: var(--text-performance-body-sm);
		cursor: pointer;
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
		text-transform: capitalize;
	}

	.filter-chip:hover,
	.filter-chip.active {
		background: var(--color-performance-bg-surface);
		border-color: var(--color-performance-border-strong);
		color: var(--color-performance-fg-primary);
	}

	.catalog {
		padding: 4rem 1.5rem;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--space-performance-md);
	}

	.trust-card {
		display: flex;
		min-height: 280px;
		flex-direction: column;
		gap: var(--space-performance-sm);
		background: var(--color-performance-bg-surface);
		border: 1px solid var(--color-performance-border-default);
		border-radius: var(--radius-performance-scale-lg);
		padding: var(--space-performance-lg);
		text-decoration: none;
		transition:
			border-color var(--duration-performance-micro) var(--ease-performance-standard),
			transform var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.trust-card:hover {
		border-color: var(--color-performance-border-strong);
		transform: translateY(-2px);
	}

	.card-header {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-performance-xs);
	}

	.status-badge,
	.access-badge {
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-performance-scale-sm);
		font-size: var(--text-performance-caption);
		text-transform: capitalize;
	}

	.status-badge {
		background: var(--color-performance-bg-subtle);
		color: var(--color-performance-fg-primary);
	}

	.access-badge {
		background: var(--color-performance-info-muted);
		color: var(--color-performance-info);
	}

	.trust-card h2 {
		font-size: var(--text-performance-h3);
		color: var(--color-performance-fg-primary);
		margin: 0;
	}

	.trust-card p {
		color: var(--color-performance-fg-secondary);
		line-height: 1.6;
		margin: 0;
	}

	.metrics {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-performance-xs);
		margin-top: auto;
		color: var(--color-performance-fg-muted);
		font-size: var(--text-performance-body-sm);
	}

	.metrics span {
		background: var(--color-performance-bg-subtle);
		border-radius: var(--radius-performance-scale-sm);
		padding: 0.25rem 0.5rem;
	}

	.card-link {
		color: var(--color-performance-fg-primary);
		font-size: var(--text-performance-body-sm);
		font-weight: 600;
	}

	.animate-reveal {
		opacity: 0;
		transform: translateY(20px);
		animation: reveal var(--duration-performance-complex) var(--ease-performance-standard) forwards;
		animation-delay: calc(var(--delay, 0) * 100ms);
	}

	@keyframes reveal {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (max-width: 900px) {
		.grid,
		.catalog-summary {
			grid-template-columns: 1fr;
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
