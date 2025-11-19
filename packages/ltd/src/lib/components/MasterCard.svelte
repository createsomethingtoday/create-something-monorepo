<script lang="ts">
	import type { Master } from '$lib/types';

	let { master }: { master: Master } = $props();
</script>

<a
	href="/masters/{master.slug}"
	class="block border border-white/10 hover:border-white transition-colors group"
>
	<div class="p-8">
		<div class="mb-6">
			{#if master.discipline}
				<p class="text-xs uppercase tracking-widest opacity-40 mb-2">{master.discipline}</p>
			{/if}
			<h3 class="text-2xl font-bold group-hover:opacity-70 transition-opacity">{master.name}</h3>
			{#if master.birth_year}
				<p class="text-sm opacity-40 mt-1">
					{master.birth_year}{#if master.death_year} — {master.death_year}{:else} — Present{/if}
				</p>
			{/if}
		</div>

		{#if master.tagline}
			<p class="text-sm opacity-60 leading-relaxed">{master.tagline}</p>
		{/if}
	</div>
</a>
