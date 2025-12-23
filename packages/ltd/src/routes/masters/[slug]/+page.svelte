<script lang="ts">
	import PrincipleCard from '$lib/components/PrincipleCard.svelte';
	import { QuoteBlock } from '@create-something/components';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.master ? `${data.master.name} — CREATE SOMETHING.ltd` : 'Master Not Found — CREATE SOMETHING.ltd'}</title>
	<meta
		name="description"
		content={data.master?.tagline || data.master ? `Learn about ${data.master.name} and their principles.` : 'Master not found in the canon.'}
	/>
</svelte:head>

{#if data.master}

	<!-- Master Header -->
	<section class="pt-24 pb-16 px-6 border-b border-canon">
		<div class="max-w-4xl mx-auto">
			{#if data.master.discipline}
				<p class="text-sm-canon tracking-widest uppercase opacity-60-canon mb-4">{data.master.discipline}</p>
			{/if}

			<h1 class="mb-4">{data.master.name}</h1>

			{#if data.master.birth_year}
				<p class="text-lg-canon opacity-40-canon mb-6">
					{data.master.birth_year}{#if data.master.death_year} — {data.master.death_year}{:else} — Present{/if}
				</p>
			{/if}

			{#if data.master.tagline}
				<p class="text-2xl-canon opacity-70-canon leading-relaxed">{data.master.tagline}</p>
			{/if}
		</div>
	</section>

	<!-- Biography -->
	{#if data.master.biography}
		<section class="py-16 px-6">
			<div class="max-w-3xl mx-auto">
				<h2 class="text-3xl-canon font-bold mb-8">Biography</h2>
				<div class="prose prose-lg max-w-none opacity-80-canon leading-relaxed">
					{@html data.master.biography}
				</div>
			</div>
		</section>
	{/if}

	<!-- Principles -->
	{#if data.principles && data.principles.length > 0}
		<section class="py-16 px-6 border-t border-canon">
			<div class="max-w-5xl mx-auto">
				<h2 class="text-3xl-canon font-bold mb-12">
					{data.principles.length === 10 ? 'The 10 Principles' : 'Principles'}
				</h2>

				<div class="space-y-6">
					{#each data.principles as principle}
						<PrincipleCard {principle} />
					{/each}
				</div>
			</div>
		</section>
	{/if}

	<!-- Quotes -->
	{#if data.quotes && data.quotes.length > 0}
		<section class="py-16 px-6 border-t border-canon">
			<div class="max-w-3xl mx-auto">
				<h2 class="text-3xl-canon font-bold mb-12">Notable Quotes</h2>

				<div class="space-y-8">
					{#each data.quotes as quote}
						<QuoteBlock {quote} />
					{/each}
				</div>
			</div>
		</section>
	{/if}

	<!-- Visual Examples -->
	{#if data.examples && data.examples.length > 0}
		<section class="py-16 px-6 border-t border-canon">
			<div class="max-w-6xl mx-auto">
				<h2 class="section-heading">Visual References</h2>
				<p class="section-subheading">
					{data.examples.length} curated examples from Are.na
				</p>

				<div class="masonry-grid">
					{#each data.examples as example}
						<div class="example-card group relative overflow-hidden border border-canon mb-4">
							{#if example.image_url}
								<img
									src={example.image_url}
									alt={example.title || 'Visual reference'}
									class="example-img w-full h-auto"
									loading="lazy"
								/>
							{/if}
							<div class="example-overlay absolute inset-0">
								<div class="absolute bottom-0 left-0 right-0 p-4">
									{#if example.title}
										<p class="example-title">{example.title}</p>
									{/if}
									{#if example.year}
										<p class="example-year">{example.year}</p>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</section>
	{/if}

	<!-- Legacy -->
	{#if data.master.legacy}
		<section class="py-16 px-6 border-t border-canon">
			<div class="max-w-3xl mx-auto">
				<h2 class="text-3xl-canon font-bold mb-8">Legacy</h2>
				<div class="prose prose-lg max-w-none opacity-80-canon leading-relaxed">
					{@html data.master.legacy}
				</div>
			</div>
		</section>
	{/if}

	<!-- Resources -->
	{#if data.resources && data.resources.length > 0}
		<section class="py-16 px-6 border-t border-canon">
			<div class="max-w-3xl mx-auto">
				<h2 class="text-3xl-canon font-bold mb-8">Resources</h2>

				<div class="space-y-4">
					{#each data.resources as resource}
						<div class="border border-canon p-6">
							<div class="flex items-start justify-between gap-4">
								<div class="flex-1">
									{#if resource.type}
										<span class="text-xs-canon uppercase tracking-widest opacity-40-canon mb-2 block"
											>{resource.type}</span
										>
									{/if}
									<h4 class="text-lg-canon font-semibold mb-2">{resource.title}</h4>
									{#if resource.description}
										<p class="text-sm-canon opacity-60-canon">{resource.description}</p>
									{/if}
								</div>
								{#if resource.url}
									<a
										href={resource.url}
										target="_blank"
										rel="noopener"
										class="text-sm-canon font-medium hover:opacity-70-canon whitespace-nowrap"
									>
										View →
									</a>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</section>
	{/if}
{:else}
	<!-- Not Found -->
	<section class="py-24 px-6">
		<div class="max-w-4xl mx-auto text-center">
			<h1 class="mb-6">Master Not Found</h1>
			<p class="text-xl-canon opacity-60-canon mb-8">This master hasn't been added to the canon yet.</p>
			<a href="/masters" class="text-sm-canon font-medium hover:opacity-70-canon"> ← Back to Masters </a>
		</div>
	</section>
{/if}

<style>
	/* Typography */
	.text-xs-canon {
		font-size: var(--text-caption);
	}

	.text-sm-canon {
		font-size: var(--text-body-sm);
	}

	.text-lg-canon {
		font-size: var(--text-body-lg);
	}

	.text-xl-canon {
		font-size: var(--text-h3);
	}

	.text-2xl-canon {
		font-size: var(--text-h2);
	}

	.text-3xl-canon {
		font-size: var(--text-h1);
	}

	/* Opacity as color tokens */
	.opacity-40-canon {
		color: var(--color-fg-muted);
	}

	.opacity-60-canon {
		color: var(--color-fg-tertiary);
	}

	.opacity-70-canon {
		color: var(--color-fg-secondary);
	}

	.opacity-80-canon {
		color: var(--color-fg-secondary);
	}

	/* Borders */
	.border-canon {
		border-color: var(--color-border-default);
	}

	/* Masonry grid using CSS columns */
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

	/* Section headings for examples */
	.section-heading {
		font-size: var(--text-h1);
		font-weight: 700;
		margin-bottom: 2rem;
	}

	.section-subheading {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-bottom: 3rem;
	}

	/* Example gallery */
	.example-card {
		background: var(--color-bg-surface);
		break-inside: avoid;
	}

	.example-img {
		transition: transform var(--duration-standard) var(--ease-standard);
	}

	.example-card:hover .example-img {
		transform: scale(1.05);
	}

	.example-overlay {
		background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent, transparent);
		opacity: 0;
		transition: opacity var(--duration-standard) var(--ease-standard);
	}

	.example-card:hover .example-overlay {
		opacity: 1;
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

	/* Universal element styles */
	section {
		border-color: var(--color-border-default);
	}
</style>
