# Canon Atlas Components

Atlas components render workflow maps and narrative canvases while the headless Atlas contract
keeps graph data portable across properties and agents.

## Examples

```svelte
<script lang="ts">
	import { AtlasFlow, AtlasStoryCanvas } from '@create-something/canon/atlas';

	const nodes = [
		{ id: 'policy', type: 'artifact', position: { x: 0, y: 0 }, data: { label: 'Policy' } },
		{ id: 'tool', type: 'artifact', position: { x: 240, y: 0 }, data: { label: 'Tool' } }
	];

	const edges = [{ id: 'policy-tool', source: 'policy', target: 'tool', label: 'governs' }];
</script>

<AtlasFlow {nodes} {edges} />
<AtlasStoryCanvas title="Workflow map" chapters={[]} />
```

## Accessibility Evidence

- Pair visual maps with story, node, or receipt summaries that can be read outside the canvas.
- Keep graph labels short and use adjacent copy for dense policy detail.
