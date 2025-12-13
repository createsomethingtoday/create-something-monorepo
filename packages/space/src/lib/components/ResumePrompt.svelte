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

	const progressPercent = calculateProgress(progress.completedSteps, totalSteps);
	const lastVisit = formatTimestamp(progress.timestamp);
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
		background: rgba(0, 0, 0, 0.8);
		backdrop-filter: blur(4px);
	}

	.modal {
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.modal-title {
		font-size: var(--text-h3);
		font-weight: bold;
		color: var(--color-fg-primary);
	}

	.modal-subtitle {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
	}

	.progress-label {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
	}

	.progress-value {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
	}

	.progress-track {
		width: 100%;
		background: var(--color-bg-surface);
		border-radius: var(--radius-full);
		height: 0.5rem;
	}

	.progress-fill {
		background: var(--color-fg-secondary);
		height: 0.5rem;
		border-radius: var(--radius-full);
		transition: width 500ms var(--ease-standard);
	}

	.progress-details {
		color: var(--color-fg-tertiary);
		font-size: var(--text-caption);
	}

	.btn-primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-weight: 600;
		border-radius: var(--radius-lg);
		transition: background var(--duration-standard) var(--ease-standard);
	}

	.btn-primary:hover {
		background: var(--color-fg-secondary);
	}

	.btn-secondary {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--color-border-default);
		color: var(--color-fg-secondary);
		font-weight: 600;
		border-radius: var(--radius-lg);
		transition: background var(--duration-standard) var(--ease-standard);
	}

	.btn-secondary:hover {
		background: var(--color-hover);
	}

	.note {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
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
