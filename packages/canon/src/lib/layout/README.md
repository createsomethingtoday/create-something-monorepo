# Canon Layout Components

Layout components organize repeated project, section, and split-view surfaces while keeping
content hierarchy clear.

## Examples

```svelte
<script lang="ts">
	import { ProjectGridInteractive } from '@create-something/canon/layout';

	const projects = [
		{ title: 'Canon registry', description: 'Machine-readable design-system source.' }
	];
</script>

<ProjectGridInteractive {projects} />
```

## Accessibility Evidence

- Interactive grids must preserve reading order and stable focus states.
- Use layout components to organize content, not to create decorative containers.
