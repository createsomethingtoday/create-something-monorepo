<script lang="ts">
	/**
	 * Tracked Pattern Wrapper
	 *
	 * Automatically tracks canon reviews when patterns are viewed.
	 *
	 * Canon: The tracking infrastructure disappears; only the learning remains.
	 */

	import { onMount } from 'svelte';
	import { trackCanonReview } from '$lib/utils/tracking';

	interface Props {
		patternId: string;
		children?: any;
	}

	let { patternId, children }: Props = $props();

	onMount(() => {
		trackCanonReview(patternId);
	});
</script>

{@render children?.()}
