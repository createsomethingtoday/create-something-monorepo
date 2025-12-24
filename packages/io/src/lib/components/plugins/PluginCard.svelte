<script lang="ts">
	import { CatalogCard } from '@create-something/components';
	import type { Plugin } from '$lib/config/plugins';

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
