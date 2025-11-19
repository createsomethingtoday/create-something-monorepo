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
	<section class="pt-24 pb-16 px-6 border-b border-white/10">
		<div class="max-w-4xl mx-auto">
			{#if data.master.discipline}
				<p class="text-sm tracking-widest uppercase opacity-60 mb-4">{data.master.discipline}</p>
			{/if}

			<h1 class="mb-4">{data.master.name}</h1>

			{#if data.master.birth_year}
				<p class="text-lg opacity-40 mb-6">
					{data.master.birth_year}{#if data.master.death_year} — {data.master.death_year}{:else} — Present{/if}
				</p>
			{/if}

			{#if data.master.tagline}
				<p class="text-2xl opacity-70 leading-relaxed">{data.master.tagline}</p>
			{/if}
		</div>
	</section>

	<!-- Biography -->
	{#if data.master.biography}
		<section class="py-16 px-6">
			<div class="max-w-3xl mx-auto">
				<h2 class="text-3xl font-bold mb-8">Biography</h2>
				<div class="prose prose-lg max-w-none opacity-80 leading-relaxed">
					{@html data.master.biography}
				</div>
			</div>
		</section>
	{/if}

	<!-- Principles -->
	{#if data.principles && data.principles.length > 0}
		<section class="py-16 px-6 border-t border-white/10">
			<div class="max-w-5xl mx-auto">
				<h2 class="text-3xl font-bold mb-12">
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
		<section class="py-16 px-6 border-t border-white/10">
			<div class="max-w-3xl mx-auto">
				<h2 class="text-3xl font-bold mb-12">Notable Quotes</h2>

				<div class="space-y-8">
					{#each data.quotes as quote}
						<QuoteBlock {quote} />
					{/each}
				</div>
			</div>
		</section>
	{/if}

	<!-- Legacy -->
	{#if data.master.legacy}
		<section class="py-16 px-6 border-t border-white/10">
			<div class="max-w-3xl mx-auto">
				<h2 class="text-3xl font-bold mb-8">Legacy</h2>
				<div class="prose prose-lg max-w-none opacity-80 leading-relaxed">
					{@html data.master.legacy}
				</div>
			</div>
		</section>
	{/if}

	<!-- Resources -->
	{#if data.resources && data.resources.length > 0}
		<section class="py-16 px-6 border-t border-white/10">
			<div class="max-w-3xl mx-auto">
				<h2 class="text-3xl font-bold mb-8">Resources</h2>

				<div class="space-y-4">
					{#each data.resources as resource}
						<div class="border border-white/10 p-6">
							<div class="flex items-start justify-between gap-4">
								<div class="flex-1">
									{#if resource.type}
										<span class="text-xs uppercase tracking-widest opacity-40 mb-2 block"
											>{resource.type}</span
										>
									{/if}
									<h4 class="text-lg font-semibold mb-2">{resource.title}</h4>
									{#if resource.description}
										<p class="text-sm opacity-60">{resource.description}</p>
									{/if}
								</div>
								{#if resource.url}
									<a
										href={resource.url}
										target="_blank"
										rel="noopener"
										class="text-sm font-medium hover:opacity-70 whitespace-nowrap"
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
			<p class="text-xl opacity-60 mb-8">This master hasn't been added to the canon yet.</p>
			<a href="/masters" class="text-sm font-medium hover:opacity-70"> ← Back to Masters </a>
		</div>
	</section>
{/if}
