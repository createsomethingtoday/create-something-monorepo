<script lang="ts">
	import { fly } from "svelte/transition";
	import { onMount } from "svelte";

	interface Props {
		spaceUrl: string;
		paperTitle: string;
		isCompleted?: boolean;
		onReset?: () => void;
	}

	let {
		spaceUrl,
		paperTitle,
		isCompleted = false,
		onReset,
	}: Props = $props();

	let isVisible = $state(false);

	onMount(() => {
		const handleScroll = () => {
			isVisible = window.scrollY > 400;
		};

		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	});
</script>

{#if isVisible}
	<div
		class="fixed bottom-6 right-6 z-50 flex items-center gap-2"
		transition:fly={{ y: 20, duration: 300 }}
	>
		{#if isCompleted && onReset}
			<button
				onclick={onReset}
				class="p-3 bg-white/10 text-white/60 hover:text-white hover:bg-white/20 rounded-full transition-colors backdrop-blur-md"
				aria-label="Reset progress"
				title="Reset progress"
			>
				<svg
					class="w-4 h-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
					/>
				</svg>
			</button>
		{/if}

		<a
			href={spaceUrl}
			target="_blank"
			rel="noopener noreferrer"
			class="flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-full transition-colors shadow-lg {isCompleted
				? 'bg-green-500 text-black hover:bg-green-400'
				: 'bg-white text-black hover:bg-white/90'}"
		>
			{#if isCompleted}
				<span>Verification Complete</span>
				<svg
					class="w-4 h-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					stroke-width="2.5"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M5 13l4 4L19 7"
					/>
				</svg>
			{:else}
				<span>Launch Experiment</span>
				<svg
					class="w-3 h-3"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					stroke-width="2.5"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M13 7l5 5m0 0l-5 5m5-5H6"
					/>
				</svg>
			{/if}
		</a>
	</div>
{/if}
