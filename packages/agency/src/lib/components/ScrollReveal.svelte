<script lang="ts">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		threshold?: number;
		rootMargin?: string;
	}

	let { children, threshold = 0.1, rootMargin = '0px 0px -50px 0px' }: Props = $props();

	let container: HTMLDivElement;

	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						entry.target.classList.add('visible');
					}
				});
			},
			{ threshold, rootMargin }
		);

		container.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

		return () => observer.disconnect();
	});
</script>

<div bind:this={container}>
	{@render children()}
</div>
