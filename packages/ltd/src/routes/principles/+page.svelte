<script lang="ts">
	import PrincipleCard from '$lib/components/PrincipleCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Group principles by master
	const principlesByMaster = $derived.by(() => {
		const grouped: Record<string, { name: string; slug: string; principles: any[] }> = {};

		data.principles.forEach((principle: any) => {
			if (!grouped[principle.master_id]) {
				grouped[principle.master_id] = {
					name: principle.master_name,
					slug: principle.master_slug,
					principles: []
				};
			}
			grouped[principle.master_id].principles.push(principle);
		});

		return Object.values(grouped);
	});
</script>

<svelte:head>
	<title>Principles — CREATE SOMETHING.ltd</title>
	<meta
		name="description"
		content="All principles from the masters who define 'less, but better.' Design standards that have stood the test of time."
	/>
</svelte:head>

<!-- Header -->
<section class="pt-24 pb-16 px-6 border-b border-canon">
	<div class="max-w-7xl mx-auto">
		<p class="text-sm-canon tracking-widest uppercase opacity-60-canon mb-4">The Canon</p>
		<h1 class="mb-6">Principles</h1>
		<p class="text-xl-canon opacity-70-canon max-w-3xl leading-relaxed">
			Aggregated wisdom from the masters. These principles guide everything we build at Create
			Something.
		</p>
	</div>
</section>

<!-- Principles by Master -->
<section class="py-16 px-6">
	<div class="max-w-7xl mx-auto">
		{#if principlesByMaster.length > 0}
			{#each principlesByMaster as master, index}
				<div class="mb-16 {index > 0 ? 'pt-16 border-t border-canon' : ''}">
					<div class="mb-8">
						<a
							href="/masters/{master.slug}"
							class="inline-block group hover:opacity-70-canon transition-opacity"
						>
							<h2 class="text-3xl-canon font-bold mb-2">{master.name}</h2>
							<p class="text-sm-canon opacity-60-canon">
								{master.principles.length}
								{master.principles.length === 1 ? 'Principle' : 'Principles'} →
							</p>
						</a>
					</div>

					<div class="space-y-6">
						{#each master.principles as principle}
							<PrincipleCard {principle} />
						{/each}
					</div>
				</div>
			{/each}
		{:else}
			<div class="text-center py-24">
				<p class="text-lg-canon opacity-60-canon">Principles coming soon...</p>
				<p class="text-sm-canon opacity-40-canon mt-2">Database seeding in progress.</p>
			</div>
		{/if}
	</div>
</section>

<style>
	/* Typography */
	.text-xs-canon {
		font-size: var(--text-caption);
	}

	.text-sm-canon {
		font-size: var(--text-body-sm);
	}

	.text-base-canon {
		font-size: var(--text-body);
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

	.opacity-50-canon {
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

	.border-emphasis {
		border-color: var(--color-border-emphasis);
	}

	.border-hover {
		border-color: var(--color-border-emphasis);
	}

	.divide-canon > * + * {
		border-color: var(--color-border-default);
	}

	/* Backgrounds */
	.bg-surface-subtle {
		background: var(--color-bg-subtle);
	}

	.bg-surface {
		background: var(--color-bg-surface);
	}

	/* Semantic colors */
	.text-success {
		color: #4ade80;
	}

	.text-error {
		color: #f87171;
	}

	.text-warning {
		color: #fbbf24;
	}

	.bg-success-subtle {
		background: rgba(74, 222, 128, 0.05);
	}

	.bg-success-muted {
		background: rgba(74, 222, 128, 0.1);
	}

	.bg-error-subtle {
		background: rgba(248, 113, 113, 0.05);
	}

	.bg-error-muted {
		background: rgba(248, 113, 113, 0.1);
	}

	.bg-warning-subtle {
		background: rgba(251, 191, 36, 0.05);
	}

	.bg-warning-muted {
		background: rgba(251, 191, 36, 0.1);
	}

	.border-success {
		border-color: rgba(74, 222, 128, 0.2);
	}

	.border-error {
		border-color: rgba(248, 113, 113, 0.2);
	}

	.border-warning {
		border-color: rgba(251, 191, 36, 0.2);
	}

	/* Universal element styles */
	section {
		border-color: var(--color-border-default);
	}

	table {
		border-color: var(--color-border-default);
	}

	thead {
		border-color: var(--color-border-default);
	}
</style>
