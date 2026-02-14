<script lang="ts">
	import CatalogCard from '$lib/components/CatalogCard.svelte';

	interface Plugin {
		slug: string;
		name: string;
		description: string;
		category: string;
		tags?: string[];
	}

	interface Props {
		plugin: Plugin;
	}

	let { plugin }: Props = $props();
</script>

<CatalogCard
	slug={plugin.slug}
	basePath="/plugins"
	name={plugin.name}
	description={plugin.description}
	category={plugin.category}
	tags={plugin.tags}
/>
