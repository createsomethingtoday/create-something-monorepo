<script lang="ts">
	/**
	 * Restaurant Layout - Bold Flavors
	 * Minimal layout wrapper for the standalone template
	 */
	import '../app.css';

	interface Props {
		children: import('svelte').Snippet;
	}

	let { children }: Props = $props();
</script>

<div class="bg-background-dark text-white min-h-screen font-display">
	{@render children()}
</div>
