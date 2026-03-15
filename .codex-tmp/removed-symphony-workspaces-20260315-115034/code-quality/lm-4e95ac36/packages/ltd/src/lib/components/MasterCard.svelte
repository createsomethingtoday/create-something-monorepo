<script lang="ts">
	import type { Master } from '$lib/types';

	let { master }: { master: Master } = $props();
</script>

<a href="/masters/{master.slug}" class="card block group">
	<div class="p-8">
		<div class="mb-6">
			{#if master.discipline}
				<p class="discipline uppercase tracking-widest mb-2">{master.discipline}</p>
			{/if}
			<h3 class="title font-bold transition-opacity">{master.name}</h3>
			{#if master.birth_year}
				<p class="dates mt-1">
					{master.birth_year}{#if master.death_year} — {master.death_year}{:else} — Present{/if}
				</p>
			{/if}
		</div>

		{#if master.tagline}
			<p class="tagline leading-relaxed">{master.tagline}</p>
		{/if}
	</div>
</a>

<style>
	.card {
		transition: border-color var(--duration-micro) var(--ease-standard);
		height: 100%;
	}

	.card:hover {
		border-color: var(--color-fg-primary);
	}

	.discipline {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.title {
		font-size: var(--text-h3);
		line-height: var(--leading-tight);
		/* Keep card heights consistent even when a name wraps (e.g., "Ludwig Mies van der Rohe"). */
		min-height: calc(2em * var(--leading-tight));
		text-wrap: balance;
	}

	.card:hover .title {
		opacity: 0.7;
	}

	.dates {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.tagline {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}
</style>
