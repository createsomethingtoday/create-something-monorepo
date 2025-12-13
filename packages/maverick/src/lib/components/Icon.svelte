<script lang="ts">
	/**
	 * Icon Component - SVG icons with path definitions
	 * Maverick X Design System
	 */

	interface Props {
		name: string;
		class?: string;
	}

	let { name, class: className = '' }: Props = $props();

	// Path-based icons for core UI
	const icons: Record<string, string> = {
		'arrow-right':
			'M14.877 18.359l5.657-5.657a1 1 0 0 0 0-1.414l-5.657-5.657a1 1 0 0 0-1.402.012 1 1 0 0 0-.012 1.402l3.95 3.95H4.17a1 1 0 0 0-1 1 1 1 0 0 0 1 1h13.243l-3.95 3.95a1 1 0 0 0-.305.711 1 1 0 0 0 .293.716 1 1 0 0 0 .716.293 1 1 0 0 0 .711-.305z',
		'arrow-down':
			'M12.726 15.536a1 1 0 0 1-1.414 0L5.655 9.879a1 1 0 0 1-.305-.711 1 1 0 0 1 .293-.716 1 1 0 0 1 .716-.293 1 1 0 0 1 .711.305l4.95 4.95 4.95-4.95a1 1 0 0 1 1.402.012 1 1 0 0 1 .012 1.402l-5.657 5.657z',
		close:
			'M18.364 5.636a1 1 0 0 1 0 1.414L13.414 12l4.95 4.95a1 1 0 0 1-1.414 1.414L12 13.414l-4.95 4.95a1 1 0 0 1-1.414-1.414L10.586 12 5.636 7.05a1 1 0 0 1 1.414-1.414L12 10.586l4.95-4.95a1 1 0 0 1 1.414 0z'
	};

	const path = $derived(icons[name]);
</script>

{#if path}
	<svg
		class="inline-flex w-6 h-6 {className}"
		width="24"
		height="24"
		viewBox="0 0 24 24"
		aria-hidden="true"
	>
		<path fill="currentColor" d={path}></path>
	</svg>
{/if}
