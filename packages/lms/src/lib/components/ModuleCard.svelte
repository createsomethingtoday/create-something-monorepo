<script lang="ts">
	import { CatalogCard } from '@create-something/components';
	import type { Module } from '$lib/types/modules';

	interface Props {
		module: Module;
		enabled?: boolean;
		onToggle?: (enabled: boolean) => void;
	}

	let { module, enabled = false, onToggle }: Props = $props();

	function handleToggle() {
		if (onToggle) {
			onToggle(!enabled);
		}
	}
</script>

<CatalogCard
	slug={module.slug}
	basePath="/modules"
	name={module.name}
	description={module.description}
	category={module.category}
	tags={module.tags}
	difficulty={module.difficulty}
	metadata={module.duration}
/>
