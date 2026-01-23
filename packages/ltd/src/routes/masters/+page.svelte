<script lang="ts">
	import MasterCard from '$lib/components/MasterCard.svelte';
	import { SEO } from '@create-something/components';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<SEO
	title="Masters"
	description="Explore the masters who define 'less, but better' — from Dieter Rams to Mies van der Rohe."
	propertyName="ltd"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.ltd' },
		{ name: 'Masters', url: 'https://createsomething.ltd/masters' }
	]}
/>

<!-- Header -->
<section class="pt-24 pb-16 px-6 border-b border-canon">
	<div class="max-w-7xl mx-auto">
		<p class="text-sm-canon tracking-widest uppercase opacity-60-canon mb-4">The Canon</p>
		<h1 class="mb-6">Masters</h1>
		<p class="text-xl-canon opacity-70-canon max-w-3xl leading-relaxed">
			Curated creators who proved that simplicity is the ultimate sophistication. Their principles
			guide everything we build.
		</p>
	</div>
</section>

<!-- Masters Grid -->
<section class="py-16 px-6">
	<div class="max-w-7xl mx-auto">
		{#if data.masters && data.masters.length > 0}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 highlight-grid">
				{#each data.masters as master, index}
					<div class="highlight-item" style="--index: {index}">
						<MasterCard {master} />
					</div>
				{/each}
			</div>
		{:else}
			<div class="text-center py-24">
				<p class="text-lg-canon opacity-60-canon">Masters coming soon...</p>
				<p class="text-sm-canon opacity-40-canon mt-2">Database migration pending.</p>
			</div>
		{/if}
	</div>
</section>

<style>
	/* Typography */
	.text-sm-canon {
		font-size: var(--text-body-sm);
	}

	.text-lg-canon {
		font-size: var(--text-body-lg);
	}

	.text-xl-canon {
		font-size: var(--text-h3);
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

	/* Borders */
	.border-canon {
		border-color: var(--color-border-default);
	}

	/* Universal element styles */
	section {
		border-color: var(--color-border-default);
	}
</style>
