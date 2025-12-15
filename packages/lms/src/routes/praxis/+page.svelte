<script lang="ts">
	import { ChevronRight, Clock, BookOpen } from 'lucide-svelte';
	import { PRAXIS_EXERCISES } from '$lib/content/praxis';
	import { PATHS } from '$lib/content/paths';

	// Get path title from ID
	function getPathTitle(pathId: string): string {
		return PATHS.find((p) => p.id === pathId)?.title ?? pathId;
	}

	// Get path color class
	function getPathClass(pathId: string): string {
		return `path-${pathId}`;
	}
</script>

<svelte:head>
	<title>Praxis Exercises - CREATE SOMETHING LMS</title>
</svelte:head>

<div class="container mx-auto max-w-6xl">
	<header class="page-header">
		<h1 class="page-title">Praxis</h1>
		<p class="page-description">
			Hands-on exercises to practice the principles of subtractive creation. Theory becomes
			understanding through disciplined practice.
		</p>
	</header>

	<div class="exercises-grid">
		{#each PRAXIS_EXERCISES as exercise}
			<a href="/praxis/{exercise.id}" class="exercise-card">
				<div class="exercise-meta">
					<span class="exercise-path {getPathClass(exercise.pathId)}">{getPathTitle(exercise.pathId)}</span>
					<span class="exercise-difficulty">{exercise.difficulty}</span>
				</div>
				<h3 class="exercise-title">{exercise.title}</h3>
				<p class="exercise-description">{exercise.description}</p>
				<div class="exercise-footer">
					<div class="exercise-info">
						<span class="exercise-type">{exercise.type}</span>
						<span class="exercise-duration"><Clock size={12} /> {exercise.duration}</span>
					</div>
					<span class="exercise-arrow">
						<ChevronRight size={16} />
					</span>
				</div>
			</a>
		{/each}
	</div>
</div>

<style>
	.page-header {
		padding: var(--space-2xl) 0 var(--space-xl);
		border-bottom: 1px solid var(--color-border-default);
		margin-bottom: var(--space-xl);
	}

	.page-title {
		font-size: var(--text-display);
		margin: 0 0 var(--space-sm) 0;
		color: var(--color-fg-primary);
	}

	.page-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		max-width: 48rem;
		margin: 0;
		line-height: 1.6;
	}

	.exercises-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: var(--space-lg);
		padding-bottom: var(--space-2xl);
	}

	.exercise-card {
		display: flex;
		flex-direction: column;
		padding: var(--space-lg);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.exercise-card:hover {
		border-color: var(--color-border-emphasis);
		background: var(--color-bg-surface);
	}

	.exercise-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-sm);
	}

	.exercise-path {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 600;
	}

	.exercise-path.path-foundations {
		color: var(--color-path-foundations);
	}

	.exercise-path.path-craft {
		color: var(--color-path-craft);
	}

	.exercise-path.path-systems {
		color: var(--color-path-systems);
	}

	.exercise-path.path-partnership {
		color: var(--color-path-partnership);
	}

	.exercise-path.path-advanced {
		color: var(--color-path-advanced);
	}

	.exercise-difficulty {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.exercise-title {
		font-size: var(--text-h3);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm) 0;
	}

	.exercise-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		margin: 0 0 var(--space-md) 0;
		flex: 1;
	}

	.exercise-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
	}

	.exercise-type {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
		text-transform: lowercase;
	}

	.exercise-arrow {
		display: flex;
		align-items: center;
		color: var(--color-fg-muted);
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.exercise-card:hover .exercise-arrow {
		transform: translateX(4px);
	}

	.exercise-info {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.exercise-duration {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	/* Path color classes for additional paths */
	.exercise-path.path-infrastructure {
		color: var(--color-path-infrastructure, var(--color-data-1));
	}

	.exercise-path.path-agents {
		color: var(--color-path-agents, var(--color-data-3));
	}

	.exercise-path.path-method {
		color: var(--color-path-method, var(--color-data-4));
	}
</style>
