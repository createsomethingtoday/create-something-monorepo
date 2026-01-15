<script lang="ts">
	/**
	 * Fashion Boutique Layout - The Collection
	 * Minimal layout wrapper for the standalone template
	 */
	import '../app.css';

	interface Props {
		children: import('svelte').Snippet;
	}

	let { children }: Props = $props();
</script>

<div class="bg-background-light text-[#141514] min-h-screen font-display">
	{@render children()}
</div>
