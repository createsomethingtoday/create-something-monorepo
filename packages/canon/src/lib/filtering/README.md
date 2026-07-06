# Canon Filtering Components

Filtering components help operators narrow product, artifact, or workflow collections without
turning filtering state into hidden UI.

## Examples

```svelte
<script lang="ts">
	import { FilterTogglePanel, ProductGrid } from '@create-something/canon/filtering';

	let activeFilters = $state(['ready']);
	const filters = [
		{ id: 'ready', label: 'Ready' },
		{ id: 'review', label: 'Needs review' }
	];
	const products = [];
</script>

<FilterTogglePanel {filters} bind:activeFilters />
<ProductGrid {products} emptyMessage="No matching artifacts." />
```

## Accessibility Evidence

- Filter controls should expose selected state in text and control semantics.
- Empty result states should name what changed and how to recover.
