<script lang="ts">
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
</script>

<!-- Simple, clean CTA matching site aesthetic -->
<div class="bg-black border border-white/10 rounded-lg p-6 mb-8">
	<div class="flex items-center justify-between gap-6 flex-wrap">
		<!-- Left: Simple text -->
		<div class="flex-1 min-w-0">
			<div class="text-white/80 text-sm mb-1">
				Interactive Version Available
			</div>
			<div class="text-white/60 text-xs">
				Run this experiment hands-on in your browser
			</div>
		</div>

		<!-- Right: CTA buttons -->
		<div class="flex items-center gap-2">
			{#if isCompleted && onReset}
				<button
					onclick={onReset}
					class="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors"
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
				class="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded transition-colors {isCompleted
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
	</div>
</div>
