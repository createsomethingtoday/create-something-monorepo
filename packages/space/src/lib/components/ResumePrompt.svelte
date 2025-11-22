<script lang="ts">
	import { fade, fly } from 'svelte/transition';
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
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
	transition:fade={{ duration: 200 }}
>
	<div
		class="bg-black border border-white/10 rounded-lg p-8 max-w-md w-full mx-4"
		transition:fly={{ y: 20, duration: 300 }}
	>
		<!-- Header -->
		<div class="mb-6">
			<h2 class="text-2xl font-bold text-white mb-2">Welcome Back</h2>
			<p class="text-white/60 text-sm">You have progress from {lastVisit}</p>
		</div>

		<!-- Progress Bar -->
		<div class="mb-6">
			<div class="flex items-center justify-between mb-2">
				<span class="text-white/80 text-sm">Progress</span>
				<span class="text-white/60 text-sm">{progressPercent}%</span>
			</div>
			<div class="w-full bg-white/10 rounded-full h-2">
				<div
					class="bg-white/80 h-2 rounded-full transition-all duration-500"
					style="width: {progressPercent}%"
				></div>
			</div>
			<div class="mt-2 text-white/60 text-xs">
				{progress.completedSteps.length} of {totalSteps} steps completed
			</div>
		</div>

		<!-- Actions -->
		<div class="flex flex-col sm:flex-row gap-3">
			<button
				onclick={onResume}
				class="flex-1 px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition-colors"
			>
				Resume
			</button>
			<button
				onclick={onStartOver}
				class="flex-1 px-6 py-3 bg-white/5 border border-white/10 text-white/80 font-semibold rounded-lg hover:bg-white/10 transition-colors"
			>
				Start Over
			</button>
		</div>

		<!-- Note -->
		<p class="mt-4 text-center text-xs text-white/40">
			Progress is saved for 7 days
		</p>
	</div>
</div>
