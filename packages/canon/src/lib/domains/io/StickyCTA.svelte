<script lang="ts">
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
		class="fixed bottom-6 right-6 z-50 flex items-center gap-2 animate-slide-up"
	>
		{#if isCompleted && onReset}
			<button
				onclick={onReset}
				class="sticky-reset p-3"
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
			class="sticky-launch {isCompleted ? 'completed' : 'default'} flex items-center gap-2 px-6 py-3"
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

<style>
	.sticky-reset {
		background: var(--color-hover);
		color: var(--color-fg-tertiary);
		border-radius: var(--radius-full);
		backdrop-filter: blur(12px);
		transition: all var(--duration-standard);
	}

	.sticky-reset:hover {
		color: var(--color-fg-primary);
		background: var(--color-active);
	}

	.sticky-launch {
		font-size: var(--text-body-sm);
		font-weight: 600;
		border-radius: var(--radius-full);
		box-shadow: var(--shadow-lg);
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.sticky-launch.default {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	.sticky-launch.default:hover {
		background: var(--color-fg-secondary);
	}

	.sticky-launch.completed {
		background: var(--color-success);
		color: var(--color-bg-pure);
	}

	.sticky-launch.completed:hover {
		filter: brightness(1.15);
	}

	.animate-slide-up {
		opacity: 0;
		transform: translateY(20px);
		animation: slide-up 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
	}

	@keyframes slide-up {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.animate-slide-up {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
