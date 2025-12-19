<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';

	type Orientation = 'horizontal' | 'vertical';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		orientation?: Orientation;
	}

	let {
		orientation = 'horizontal',
		class: className = '',
		...restProps
	}: Props = $props();
</script>

<div
	class="separator separator-{orientation} {className}"
	role="separator"
	aria-orientation={orientation}
	{...restProps}
></div>

<style>
	.separator {
		flex-shrink: 0;
		background: var(--color-border-default);
	}

	.separator-horizontal {
		height: 1px;
		width: 100%;
	}

	.separator-vertical {
		width: 1px;
		height: 100%;
	}
</style>
