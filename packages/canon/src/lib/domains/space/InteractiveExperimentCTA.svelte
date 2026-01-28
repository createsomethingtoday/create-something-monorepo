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
<div class="cta-container p-6 mb-8">
	<div class="flex items-center justify-between gap-6 flex-wrap">
		<!-- Left: Simple text -->
		<div class="flex-1 min-w-0">
			<div class="cta-heading mb-1">
				Interactive Version Available
			</div>
			<div class="cta-subheading">
				Run this experiment hands-on in your browser
			</div>
		</div>

		<!-- Right: CTA buttons -->
		<div class="flex items-center gap-2">
			{#if isCompleted && onReset}
				<button
					onclick={onReset}
					class="reset-btn p-2"
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
				class="launch-btn flex items-center gap-2 px-4 py-2 font-semibold {isCompleted
					? 'completed'
					: 'default'}"
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

<style>
	.cta-container {
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.cta-heading {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.cta-subheading {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.reset-btn {
		color: var(--color-fg-muted);
		border-radius: var(--radius-sm);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.reset-btn:hover {
		color: var(--color-fg-primary);
		background: var(--color-hover);
	}

	.launch-btn {
		font-size: var(--text-body-sm);
		border-radius: var(--radius-sm);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.launch-btn.default {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	.launch-btn.default:hover {
		background: var(--color-fg-secondary);
	}

	.launch-btn.completed {
		background: var(--color-success);
		color: var(--color-bg-pure);
	}

	.launch-btn.completed:hover {
		filter: brightness(1.2);
	}
</style>
