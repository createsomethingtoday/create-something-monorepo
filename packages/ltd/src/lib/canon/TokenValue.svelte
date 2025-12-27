<script lang="ts">
	import CopyButton from './CopyButton.svelte';

	interface Props {
		/** CSS variable name (e.g., '--space-md') */
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
	const copyText = `var(${token})`;
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
		gap: var(--space-sm);
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.token-value:hover {
		border-color: var(--color-border-emphasis);
	}

	/* Preview boxes */
	.token-preview {
		width: 64px;
		height: 64px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.preview-spacing {
		background: var(--color-fg-muted);
		max-width: 100%;
		max-height: 100%;
	}

	.preview-radius {
		width: 48px;
		height: 48px;
		background: var(--color-fg-muted);
	}

	.preview-shadow {
		width: 40px;
		height: 40px;
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
	}

	.preview-duration {
		width: 100%;
		height: 4px;
		background: var(--color-bg-pure);
		border-radius: 2px;
		overflow: hidden;
	}

	.duration-bar {
		width: 100%;
		height: 100%;
		background: var(--color-fg-primary);
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
		gap: var(--space-xs);
		margin-bottom: 2px;
	}

	.token-name {
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.token-resolved {
		display: block;
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-bottom: 4px;
	}

	.token-description {
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
		margin: 0;
		line-height: var(--leading-snug);
	}
</style>
