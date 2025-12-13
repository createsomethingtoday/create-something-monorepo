<script lang="ts">
	/**
	 * ModeIndicator - Hermeneutic Circle Position
	 *
	 * Shows the user's current position in the CREATE Something ecosystem.
	 * Visualizes the Modes of Being: .ltd → .io → .space → .agency
	 *
	 * Position: Bottom-left corner, subtle but persistent
	 */

	interface Props {
		current: 'ltd' | 'io' | 'space' | 'agency' | 'learn';
		showLabels?: boolean;
		size?: 'sm' | 'md';
	}

	let { current, showLabels = false, size = 'sm' }: Props = $props();

	const modes = [
		{ id: 'space', label: 'Explore', url: 'https://createsomething.space' },
		{ id: 'learn', label: 'Learn', url: 'https://learn.createsomething.space' },
		{ id: 'io', label: 'Research', url: 'https://createsomething.io' },
		{ id: 'agency', label: 'Build', url: 'https://createsomething.agency' },
		{ id: 'ltd', label: 'Canon', url: 'https://createsomething.ltd' }
	] as const;

	function handleModeClick(e: MouseEvent, mode: (typeof modes)[number]) {
		if (mode.id === current) {
			e.preventDefault();
			return;
		}

		// Set transition origin for cross-property animation
		if (typeof sessionStorage !== 'undefined') {
			sessionStorage.setItem('cs-transition-from', current);
			sessionStorage.setItem('cs-transition-to', mode.id);
			sessionStorage.setItem('cs-transition-time', Date.now().toString());
		}

		// Add exit animation
		document.body.classList.add('transitioning-out');
	}
</script>

<nav class="mode-indicator" class:size-sm={size === 'sm'} class:size-md={size === 'md'}>
	{#each modes as mode}
		<a
			href={mode.url}
			class="mode-item"
			class:active={mode.id === current}
			onclick={(e) => handleModeClick(e, mode)}
			title={mode.label}
		>
			<span class="mode-dot"></span>
			{#if showLabels}
				<span class="mode-label">.{mode.id}</span>
			{/if}
		</a>
	{/each}
</nav>

<style>
	.mode-indicator {
		position: fixed;
		bottom: var(--space-md);
		left: var(--space-md);
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-full);
		z-index: var(--z-fixed);
		opacity: 0.6;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.mode-indicator:hover {
		opacity: 1;
	}

	.mode-item {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem;
		border-radius: var(--radius-full);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.mode-item:hover:not(.active) {
		background: var(--color-hover);
	}

	.mode-item.active {
		cursor: default;
	}

	.mode-dot {
		width: 8px;
		height: 8px;
		border-radius: var(--radius-full);
		background: var(--color-fg-muted);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.mode-item:hover:not(.active) .mode-dot {
		background: var(--color-fg-tertiary);
	}

	.mode-item.active .mode-dot {
		background: var(--color-fg-primary);
		box-shadow: 0 0 8px var(--color-fg-primary);
	}

	.mode-label {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.mode-item:hover:not(.active) .mode-label {
		color: var(--color-fg-tertiary);
	}

	.mode-item.active .mode-label {
		color: var(--color-fg-primary);
	}

	/* Size variants */
	.size-sm {
		padding: 0.375rem;
	}

	.size-sm .mode-dot {
		width: 6px;
		height: 6px;
	}

	.size-md .mode-dot {
		width: 10px;
		height: 10px;
	}

	/* Hide on mobile for cleaner experience */
	@media (max-width: 640px) {
		.mode-indicator {
			bottom: auto;
			top: var(--space-md);
			left: 50%;
			transform: translateX(-50%);
		}

		.mode-label {
			display: none;
		}
	}
</style>
