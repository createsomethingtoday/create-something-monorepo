<script lang="ts">
	import type { ProgressState } from '$lib/utils/progress';
	import { calculateProgress, formatTimestamp } from '$lib/utils/progress';

	interface Props {
		progress: ProgressState;
		totalSteps: number;
		onResume: () => void;
		onStartOver: () => void;
	}

	let { progress, totalSteps, onResume, onStartOver }: Props = $props();

	let progressPercent = $derived(calculateProgress(progress.completedSteps, totalSteps));
	let lastVisit = $derived(formatTimestamp(progress.timestamp));
</script>

<div
	class="modal-overlay fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
>
	<div
		class="modal max-w-md w-full mx-4 p-8 animate-slide-up"
	>
		<!-- Header -->
		<div class="mb-6">
			<h2 class="modal-title mb-2">Welcome Back</h2>
			<p class="modal-subtitle">You have progress from {lastVisit}</p>
		</div>

		<!-- Progress Bar -->
		<div class="mb-6">
			<div class="flex items-center justify-between mb-2">
				<span class="progress-label">Progress</span>
				<span class="progress-value">{progressPercent}%</span>
			</div>
			<div class="progress-track">
				<div
					class="progress-fill"
					style="width: {progressPercent}%"
				></div>
			</div>
			<div class="progress-details mt-2">
				{progress.completedSteps.length} of {totalSteps} steps completed
			</div>
		</div>

		<!-- Actions -->
		<div class="flex flex-col sm:flex-row gap-3">
			<button
				onclick={onResume}
				class="btn-primary flex-1 px-6 py-3"
			>
				Resume
			</button>
			<button
				onclick={onStartOver}
				class="btn-secondary flex-1 px-6 py-3"
			>
				Start Over
			</button>
		</div>

		<!-- Note -->
		<p class="note mt-4 text-center">
			Progress is saved for 7 days
		</p>
	</div>
</div>

<style>
	.modal-overlay {
		background: var(--color-performance-overlay-heavy);
		backdrop-filter: blur(4px);
	}

	.modal {
		background: var(--color-performance-bg-pure);
		border-radius: var(--radius-performance-scale-lg);
	}

	.modal-title {
		font-size: var(--text-performance-h3);
		font-weight: bold;
		color: var(--color-performance-fg-primary);
	}

	.modal-subtitle {
		color: var(--color-performance-fg-tertiary);
		font-size: var(--text-performance-body-sm);
	}

	.progress-label {
		color: var(--color-performance-fg-secondary);
		font-size: var(--text-performance-body-sm);
	}

	.progress-value {
		color: var(--color-performance-fg-tertiary);
		font-size: var(--text-performance-body-sm);
	}

	.progress-track {
		width: 100%;
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-full);
		height: 0.5rem;
	}

	.progress-fill {
		background: var(--color-performance-fg-secondary);
		height: 0.5rem;
		border-radius: var(--radius-performance-scale-full);
		transition: width 500ms var(--ease-performance-standard);
	}

	.progress-details {
		color: var(--color-performance-fg-tertiary);
		font-size: var(--text-performance-caption);
	}

	.btn-primary {
		background: var(--color-performance-fg-primary);
		color: var(--color-performance-bg-pure);
		font-weight: 600;
		border-radius: var(--radius-performance-scale-lg);
		transition: background var(--duration-performance-standard) var(--ease-performance-standard);
	}

	.btn-primary:hover {
		background: var(--color-performance-fg-secondary);
	}

	.btn-secondary {
		background: var(--color-performance-hover);
		color: var(--color-performance-fg-secondary);
		font-weight: 600;
		border-radius: var(--radius-performance-scale-lg);
		transition: background var(--duration-performance-standard) var(--ease-performance-standard);
	}

	.btn-secondary:hover {
		background: var(--color-performance-hover);
	}

	.note {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
	}

	.animate-fade-in {
		opacity: 0;
		animation: fade-in 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
	}

	.animate-slide-up {
		opacity: 0;
		transform: translateY(20px);
		animation: slide-up 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
	}

	@keyframes fade-in {
		to {
			opacity: 1;
		}
	}

	@keyframes slide-up {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.animate-fade-in,
		.animate-slide-up {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
