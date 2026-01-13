<script lang="ts">
	/**
	 * OUTERFIELDS Pre-Sale Progress Timeline
	 *
	 * Shows the current pre-sale build timeline toward launch.
	 */

	interface Milestone {
		day: number;
		label: string;
		status: 'complete' | 'current' | 'upcoming';
	}

	const milestones: Milestone[] = [
		{ day: 1, label: 'Concept', status: 'complete' },
		{ day: 30, label: 'Core UI', status: 'complete' },
		{ day: 60, label: 'Beta', status: 'current' },
		{ day: 90, label: 'Launch', status: 'upcoming' }
	];

	const currentDay = 60;
	const progress = (currentDay / 90) * 100;
</script>

<section class="progress-section">
	<div class="progress-container">
		<div class="progress-badge">
			<span class="badge-dot"></span>
			<span>Pre-Sale Progress</span>
		</div>

		<h1 class="progress-title">
			Pre-Sale
			<span class="highlight">Launch Timeline</span>
		</h1>

		<p class="progress-description">
			We’re in the pre-sale phase now. Track the major milestones from concept → beta → launch as we
			finish the platform and ship founding member access.
		</p>

		<div class="timeline-wrapper">
			<div class="timeline-track">
				<div class="timeline-progress" style="width: {progress}%"></div>
			</div>

			<div class="timeline-milestones">
				{#each milestones as milestone}
					<div class="milestone" class:complete={milestone.status === 'complete'} class:current={milestone.status === 'current'} class:upcoming={milestone.status === 'upcoming'}>
						<div class="milestone-dot">
							{#if milestone.status === 'current'}
								<span class="dot-ping"></span>
							{/if}
						</div>
						<div class="milestone-info">
							<span class="milestone-day">Day {milestone.day}</span>
							<span class="milestone-label" class:current-label={milestone.status === 'current'}>
								{milestone.status === 'current' ? 'Current' : milestone.label}
							</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
</section>

<style>
	.progress-section {
		padding: 8rem 1.5rem 6rem;
		background: var(--color-bg-pure);
	}

	.progress-container {
		max-width: 56rem;
		margin: 0 auto;
		text-align: center;
	}

	.progress-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-fg-secondary);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: 2rem;
	}

	.badge-dot {
		width: 0.5rem;
		height: 0.5rem;
		background: var(--color-fg-primary);
		border-radius: 50%;
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	.progress-title {
		font-size: clamp(3.5rem, 10vw, 7rem);
		font-weight: 800;
		line-height: 1.15;
		letter-spacing: -0.03em;
		color: var(--color-fg-primary);
		margin: 0 0 2rem;
	}

	.highlight {
		display: block;
		color: var(--color-fg-secondary);
	}

	.progress-description {
		font-size: 1.125rem;
		line-height: 1.7;
		color: var(--color-fg-muted);
		max-width: 40rem;
		margin: 0 auto 4rem;
	}

	.timeline-wrapper {
		position: relative;
		max-width: 48rem;
		margin: 0 auto;
		padding: 0 2rem;
	}

	.timeline-track {
		position: absolute;
		top: 0.5rem;
		left: 2rem;
		right: 2rem;
		height: 2px;
		background: var(--color-border-default);
	}

	.timeline-progress {
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		background: var(--color-fg-primary);
	}

	.timeline-milestones {
		display: flex;
		justify-content: space-between;
		position: relative;
	}

	.milestone {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.milestone-dot {
		position: relative;
		width: 1rem;
		height: 1rem;
		border-radius: 50%;
		background: var(--color-bg-pure);
		border: 2px solid var(--color-border-default);
		z-index: 1;
	}

	.milestone.complete .milestone-dot {
		background: var(--color-fg-primary);
		border-color: var(--color-fg-primary);
	}

	.milestone.current .milestone-dot {
		width: 1.25rem;
		height: 1.25rem;
		background: var(--color-fg-primary);
		border-color: var(--color-fg-primary);
	}

	.dot-ping {
		position: absolute;
		inset: -4px;
		border-radius: 50%;
		background: var(--color-fg-primary);
		opacity: 0.3;
		animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
	}

	@keyframes ping {
		75%, 100% {
			transform: scale(2);
			opacity: 0;
		}
	}

	.milestone-info {
		text-align: center;
	}

	.milestone-day {
		display: block;
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--color-fg-subtle);
		margin-bottom: 0.25rem;
	}

	.milestone.complete .milestone-day,
	.milestone.current .milestone-day {
		color: var(--color-fg-primary);
	}

	.milestone-label {
		display: block;
		font-size: 0.75rem;
		color: var(--color-fg-muted);
	}

	.milestone-label.current-label {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	@media (max-width: 640px) {
		.progress-section {
			padding: 6rem 1rem 4rem;
		}

		.timeline-wrapper {
			padding: 0 1rem;
		}

		.milestone-label {
			display: none;
		}

		.milestone-label.current-label {
			display: block;
		}
	}
</style>
