<script lang="ts">
	import type { PageData } from './$types';
	import ImageLightbox from '$lib/components/taste/ImageLightbox.svelte';

	let { data }: { data: PageData } = $props();

	// Lightbox state
	let selectedImageIndex = $state(-1);
	let isLightboxOpen = $derived(selectedImageIndex >= 0);

	function openLightbox(index: number) {
		selectedImageIndex = index;
	}

	function closeLightbox() {
		selectedImageIndex = -1;
	}

	function navigateLightbox(index: number) {
		selectedImageIndex = index;
	}

	// Format date for display
	function formatDate(dateStr: string | null): string {
		if (!dateStr) return 'Never';
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Taste — CREATE SOMETHING.ltd</title>
	<meta
		name="description"
		content="Human-curated visual references that inform Canon design decisions. Less, but better."
	/>
</svelte:head>

<!-- Header -->
<section class="header-section">
	<div class="max-w-7xl mx-auto px-6">
		<p class="eyebrow">Visual Reference</p>
		<h1 class="mb-6">Taste</h1>
		<p class="tagline">
			Human-curated visual references from Are.na that inform Canon design decisions.
			The aesthetic emerges through disciplined selection.
		</p>

		<!-- Stats -->
		<div class="stats-row">
			<span class="stat">{data.stats.examples} examples</span>
			<span class="stat-divider">·</span>
			<span class="stat">{data.stats.resources} resources</span>
			<span class="stat-divider">·</span>
			<span class="stat">Synced {formatDate(data.stats.lastSync)}</span>
			<span class="stat-divider">·</span>
			<a href="/taste/insights" class="stat-link">Your Insights →</a>
		</div>
	</div>
</section>

<!-- Source Channels -->
<section class="channels-section">
	<div class="max-w-7xl mx-auto px-6">
		<h2 class="section-title">Source Channels</h2>

		<div class="channels-grid">
			<!-- Primary Channels -->
			<div class="channel-group">
				<h3 class="group-label">CREATE SOMETHING</h3>
				{#each data.channels.filter(c => c.isPrimary) as channel}
					<a
						href="https://www.are.na/create-something/{channel.slug}"
						target="_blank"
						rel="noopener"
						class="channel-card primary"
					>
						<span class="channel-name">{channel.name}</span>
						<span class="channel-desc">{channel.description}</span>
					</a>
				{/each}
			</div>

			<!-- Secondary Channels -->
			<div class="channel-group">
				<h3 class="group-label">External</h3>
				{#each data.channels.filter(c => !c.isPrimary) as channel}
					<a
						href="https://www.are.na/search/{channel.slug}"
						target="_blank"
						rel="noopener"
						class="channel-card"
					>
						<span class="channel-name">{channel.name}</span>
						<span class="channel-desc">{channel.description}</span>
					</a>
				{/each}
			</div>
		</div>
	</div>
</section>

<!-- Visual Examples Gallery -->
{#if data.examples && data.examples.length > 0}
	<section class="gallery-section">
		<div class="max-w-7xl mx-auto px-6">
			<h2 class="section-title">Visual References</h2>
			<p class="section-subtitle">{data.examples.length} curated images from Are.na</p>

			<div class="masonry-grid">
				{#each data.examples as example, index}
					<button
						class="example-card"
						onclick={() => openLightbox(index)}
						aria-label={example.title ? `View ${example.title}` : 'View image'}
					>
						{#if example.image_url}
							<img
								src={example.image_url}
								alt={example.title || 'Visual reference'}
								class="example-img"
								loading="lazy"
							/>
						{/if}
						<div class="example-overlay">
							<div class="example-info">
								{#if example.title}
									<p class="example-title">{example.title}</p>
								{/if}
								{#if example.year}
									<p class="example-year">{example.year}</p>
								{/if}
							</div>
						</div>
					</button>
				{/each}
			</div>
		</div>
	</section>
{/if}

<!-- Resources -->
{#if data.resources && data.resources.length > 0}
	<section class="resources-section">
		<div class="max-w-4xl mx-auto px-6">
			<h2 class="section-title">Resources</h2>
			<p class="section-subtitle">Links, articles, and references</p>

			<div class="resources-list">
				{#each data.resources as resource}
					<div class="resource-card">
						<div class="resource-content">
							{#if resource.type}
								<span class="resource-type">{resource.type}</span>
							{/if}
							<h4 class="resource-title">{resource.title}</h4>
							{#if resource.description}
								<p class="resource-desc">{resource.description}</p>
							{/if}
						</div>
						{#if resource.url}
							<a
								href={resource.url}
								target="_blank"
								rel="noopener"
								class="resource-link"
							>
								View →
							</a>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	</section>
{/if}

<!-- Principles -->
<section class="principles-section">
	<div class="max-w-4xl mx-auto px-6">
		<h2 class="section-title">Derived Principles</h2>

		<div class="principles-grid">
			<div class="principle-card">
				<h3 class="principle-name">Negative Space</h3>
				<p class="principle-desc">Let elements breathe. Absence is presence.</p>
			</div>
			<div class="principle-card">
				<h3 class="principle-name">Monochrome First</h3>
				<p class="principle-desc">Color as emphasis, not decoration.</p>
			</div>
			<div class="principle-card">
				<h3 class="principle-name">Typography as Structure</h3>
				<p class="principle-desc">Type creates hierarchy without ornament.</p>
			</div>
			<div class="principle-card">
				<h3 class="principle-name">Purposeful Motion</h3>
				<p class="principle-desc">Animation reveals state, guides attention.</p>
			</div>
		</div>
	</div>
</section>

<!-- Footer CTA -->
<section class="cta-section">
	<div class="max-w-4xl mx-auto px-6 text-center">
		<p class="cta-text">
			Taste is not imitation. References reveal the aesthetic; implementations express it.
		</p>
		<a
			href="https://www.are.na/create-something"
			target="_blank"
			rel="noopener"
			class="cta-link"
		>
			Follow @create-something on Are.na →
		</a>
	</div>
</section>

<!-- Image Lightbox -->
{#if data.examples && data.examples.length > 0}
	<ImageLightbox
		images={data.examples}
		currentIndex={selectedImageIndex}
		isOpen={isLightboxOpen}
		onClose={closeLightbox}
		onNavigate={navigateLightbox}
	/>
{/if}

<style>
	/* Header */
	.header-section {
		padding: var(--space-xl) 0 var(--space-lg);
		border-bottom: 1px solid var(--color-border-default);
	}

	.eyebrow {
		font-size: var(--text-body-sm);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-sm);
	}

	.tagline {
		font-size: var(--text-h3);
		color: var(--color-fg-secondary);
		max-width: 48rem;
		line-height: 1.5;
	}

	.stats-row {
		margin-top: var(--space-md);
		display: flex;
		gap: var(--space-sm);
		align-items: center;
	}

	.stat {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.stat-divider {
		color: var(--color-fg-subtle);
	}

	.stat-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		text-decoration: none;
		font-weight: 500;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.stat-link:hover {
		opacity: 0.7;
	}

	/* Channels */
	.channels-section {
		padding: var(--space-lg) 0;
		border-bottom: 1px solid var(--color-border-default);
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: 700;
		margin-bottom: var(--space-md);
	}

	.channels-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-lg);
	}

	@media (max-width: 768px) {
		.channels-grid {
			grid-template-columns: 1fr;
		}
	}

	.channel-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.group-label {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-xs);
	}

	.channel-card {
		display: flex;
		flex-direction: column;
		padding: var(--space-sm);
		border: 1px solid var(--color-border-default);
		background: var(--color-bg-surface);
		transition: all var(--duration-micro) var(--ease-standard);
		text-decoration: none;
	}

	.channel-card:hover {
		border-color: var(--color-border-emphasis);
		background: var(--color-hover);
	}

	.channel-card.primary {
		border-color: var(--color-border-emphasis);
	}

	.channel-name {
		font-size: var(--text-body);
		font-weight: 500;
		color: var(--color-fg-primary);
	}

	.channel-desc {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-top: 0.25rem;
	}

	/* Gallery */
	.gallery-section {
		padding: var(--space-lg) 0;
		border-bottom: 1px solid var(--color-border-default);
	}

	.section-subtitle {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-md);
	}

	.masonry-grid {
		column-count: 2;
		column-gap: 1rem;
	}

	@media (min-width: 768px) {
		.masonry-grid {
			column-count: 3;
		}
	}

	@media (min-width: 1024px) {
		.masonry-grid {
			column-count: 4;
		}
	}

	.example-card {
		position: relative;
		overflow: hidden;
		border: 1px solid var(--color-border-default);
		background: var(--color-bg-surface);
		margin-bottom: 1rem;
		break-inside: avoid;
		/* Reset button styles */
		padding: 0;
		font: inherit;
		color: inherit;
		cursor: pointer;
		text-align: left;
		width: 100%;
		display: block;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.example-card:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.example-img {
		width: 100%;
		height: auto;
		display: block;
		transition: transform var(--duration-standard) var(--ease-standard);
	}

	.example-card:hover .example-img {
		transform: scale(1.05);
	}

	.example-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent, transparent);
		opacity: 0;
		transition: opacity var(--duration-standard) var(--ease-standard);
	}

	.example-card:hover .example-overlay {
		opacity: 1;
	}

	.example-info {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: var(--space-sm);
	}

	.example-title {
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-primary);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.example-year {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
		margin-top: 0.25rem;
	}

	/* Resources */
	.resources-section {
		padding: var(--space-lg) 0;
		border-bottom: 1px solid var(--color-border-default);
	}

	.resources-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.resource-card {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-sm);
		padding: var(--space-sm);
		border: 1px solid var(--color-border-default);
		background: var(--color-bg-surface);
	}

	.resource-content {
		flex: 1;
	}

	.resource-type {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
		display: block;
		margin-bottom: 0.25rem;
	}

	.resource-title {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: 0.25rem;
	}

	.resource-desc {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.resource-link {
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-primary);
		text-decoration: none;
		white-space: nowrap;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.resource-link:hover {
		opacity: 0.7;
	}

	/* Principles */
	.principles-section {
		padding: var(--space-lg) 0;
		border-bottom: 1px solid var(--color-border-default);
	}

	.principles-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-md);
	}

	@media (max-width: 640px) {
		.principles-grid {
			grid-template-columns: 1fr;
		}
	}

	.principle-card {
		padding: var(--space-sm);
		border: 1px solid var(--color-border-default);
		background: var(--color-bg-surface);
	}

	.principle-name {
		font-size: var(--text-body);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: 0.5rem;
	}

	.principle-desc {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* CTA */
	.cta-section {
		padding: var(--space-xl) 0;
	}

	.cta-text {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-md);
	}

	.cta-link {
		font-size: var(--text-body);
		font-weight: 500;
		color: var(--color-fg-primary);
		text-decoration: none;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.cta-link:hover {
		opacity: 0.7;
	}
</style>
