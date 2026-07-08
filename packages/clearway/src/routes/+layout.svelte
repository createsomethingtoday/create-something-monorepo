<script lang="ts">
	import '../app.css';

	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();
</script>

<svelte:head>
	<!-- Canon typography is loaded by @create-something/canon styles. -->
</svelte:head>

{@render children?.()}
