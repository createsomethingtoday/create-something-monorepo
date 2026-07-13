<script lang="ts">
	import CopyButton from './CopyButton.svelte';

	interface Props {
		/** CSS variable name (e.g., '--space-performance-md') */
		token: string;
		/** Resolved value (e.g., '1.618rem') */
		value: string;
		/** Optional description */
		description?: string;
		/** Visual preview type */
		preview?: 'spacing' | 'radius' | 'shadow' | 'duration' | 'none';
	}

	let {
		token,
		value,
		description,
		preview = 'none'
	}: Props = $props();

	// Copy format: var(--token-name)
	let copyText = $derived(`var(${token})`);
</script>

<div class="token-value">
	{#if preview !== 'none'}
		<div class="token-preview">
			{#if preview === 'spacing'}
				<div class="preview-spacing" style="width: {value}; height: {value}"></div>
			{:else if preview === 'radius'}
				<div class="preview-radius" style="border-radius: {value}"></div>
			{:else if preview === 'shadow'}
				<div class="preview-shadow" style="box-shadow: {value}"></div>
			{:else if preview === 'duration'}
				<div class="preview-duration">
					<div class="duration-bar" style="animation-duration: {value}"></div>
				</div>
			{/if}
		</div>
	{/if}

	<div class="token-info">
		<div class="token-header">
			<code class="token-name">{token}</code>
			<CopyButton text={copyText} size="sm" />
		</div>
		<code class="token-resolved">{value}</code>
		{#if description}
			<p class="token-description">{description}</p>
		{/if}
	</div>
</div>

<style>
	.token-value {
		display: flex;
		align-items: center;
		gap: var(--space-performance-sm);
		padding: var(--space-performance-sm);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-md);
		transition: border-color var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.token-value:hover {
		border-color: var(--color-performance-border-emphasis);
	}

	/* Preview boxes */
	.token-preview {
		width: 64px;
		height: 64px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-performance-bg-subtle);
		border-radius: var(--radius-performance-scale-md);
		overflow: hidden;
	}

	.preview-spacing {
		background: var(--color-performance-fg-muted);
		max-width: 100%;
		max-height: 100%;
	}

	.preview-radius {
		width: 48px;
		height: 48px;
		background: var(--color-performance-fg-muted);
	}

	.preview-shadow {
		width: 40px;
		height: 40px;
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-md);
	}

	.preview-duration {
		width: 100%;
		height: 4px;
		background: var(--color-performance-bg-pure);
		border-radius: 2px;
		overflow: hidden;
	}

	.duration-bar {
		width: 100%;
		height: 100%;
		background: var(--color-performance-fg-primary);
		transform: translateX(-100%);
		animation: slide-right infinite ease-in-out;
	}

	@keyframes slide-right {
		0%, 100% { transform: translateX(-100%); }
		50% { transform: translateX(0); }
	}

	/* Info section */
	.token-info {
		flex: 1;
		min-width: 0;
	}

	.token-header {
		display: flex;
		align-items: center;
		gap: var(--space-performance-xs);
		margin-bottom: 2px;
	}

	.token-name {
		font-family: var(--font-performance-mono);
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-primary);
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.token-resolved {
		display: block;
		font-family: var(--font-performance-mono);
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		margin-bottom: 4px;
	}

	.token-description {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-secondary);
		margin: 0;
		line-height: var(--leading-performance-snug);
	}
</style>
