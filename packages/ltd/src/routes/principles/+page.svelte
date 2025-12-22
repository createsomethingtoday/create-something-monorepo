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
		<p class="type-sm tracking-widest uppercase opacity-60-canon mb-4">The Canon</p>
		<h1 class="mb-6">Principles</h1>
		<p class="type-xl opacity-70-canon max-w-3xl leading-relaxed">
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
							<h2 class="type-3xl font-bold mb-2">{master.name}</h2>
							<p class="type-sm opacity-60-canon">
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
				<p class="type-lg opacity-60-canon">Principles coming soon...</p>
				<p class="type-sm opacity-40-canon mt-2">Database seeding in progress.</p>
			</div>
		{/if}
	</div>
</section>

<style>
	/* Typography */
	.type-caption {
		font-size: var(--text-caption);
	}

	.type-sm {
		font-size: var(--text-body-sm);
	}

	.type-base {
		font-size: var(--text-body);
	}

	.type-lg {
		font-size: var(--text-body-lg);
	}

	.type-xl {
		font-size: var(--text-h3);
	}

	.type-2xl {
		font-size: var(--text-h2);
	}

	.type-3xl {
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
		color: var(--color-success);
	}

	.text-error {
		color: var(--color-error);
	}

	.text-warning {
		color: var(--color-warning);
	}

	.bg-success-subtle {
		background: var(--color-success-muted);
	}

	.bg-success-muted {
		background: var(--color-success-muted);
	}

	.bg-error-subtle {
		background: var(--color-error-muted);
	}

	.bg-error-muted {
		background: var(--color-error-muted);
	}

	.bg-warning-subtle {
		background: var(--color-warning-muted);
	}

	.bg-warning-muted {
		background: var(--color-warning-muted);
	}

	.border-success {
		border-color: var(--color-success-border);
	}

	.border-error {
		border-color: var(--color-error-border);
	}

	.border-warning {
		border-color: var(--color-warning-border);
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
