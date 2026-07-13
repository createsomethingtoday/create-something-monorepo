<script lang="ts">
	import CopyButton from './CopyButton.svelte';

	interface Props {
		/** CSS variable name (e.g., '--color-performance-bg-pure') */
		token: string;
		/** Resolved value (e.g., '#000000') */
		value: string;
		/** Optional description */
		description?: string;
		/** Whether this is a foreground/text color */
		isForeground?: boolean;
		/** Optional contrast ratio */
		contrastRatio?: number;
		/** Size of the swatch */
		size?: 'sm' | 'md' | 'lg';
	}

	let {
		token,
		value,
		description,
		isForeground = false,
		contrastRatio,
		size = 'md'
	}: Props = $props();

	// Copy format: var(--color-name)
	let copyText = $derived(`var(${token})`);

	// Check if value is rgba or transparent
	let isTransparent = $derived(value.includes('rgba') || value === 'transparent');
</script>

<div class="token-swatch" class:swatch-sm={size === 'sm'} class:swatch-lg={size === 'lg'}>
	<div
		class="swatch-preview"
		class:swatch-foreground={isForeground}
		class:swatch-transparent={isTransparent}
		style="--swatch-color: {value}"
	>
		{#if isForeground}
			<span class="swatch-text" style="color: {value}">Aa</span>
		{/if}
	</div>

	<div class="swatch-info">
		<div class="swatch-header">
			<code class="swatch-token">{token}</code>
			<CopyButton text={copyText} size="sm" />
		</div>

		<div class="swatch-value">
			<code>{value}</code>
		</div>

		{#if description}
			<p class="swatch-description">{description}</p>
		{/if}

		{#if contrastRatio}
			<div class="swatch-contrast" class:contrast-pass={contrastRatio >= 4.5} class:contrast-aaa={contrastRatio >= 7}>
				<span class="contrast-label">Contrast:</span>
				<span class="contrast-value">{contrastRatio.toFixed(2)}:1</span>
				{#if contrastRatio >= 7}
					<span class="contrast-badge">AAA</span>
				{:else if contrastRatio >= 4.5}
					<span class="contrast-badge">AA</span>
				{:else}
					<span class="contrast-badge contrast-fail">Fail</span>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.token-swatch {
		display: flex;
		gap: var(--space-performance-sm);
		padding: var(--space-performance-sm);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
		transition: border-color var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.token-swatch:hover {
		border-color: var(--color-performance-border-emphasis);
	}

	/* Swatch preview box */
	.swatch-preview {
		width: 64px;
		height: 64px;
		flex-shrink: 0;
		background: var(--swatch-color);
		border-radius: var(--radius-performance-scale-md);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.swatch-sm .swatch-preview {
		width: 48px;
		height: 48px;
	}

	.swatch-lg .swatch-preview {
		width: 80px;
		height: 80px;
	}

	/* Foreground swatches show text on dark background */
	.swatch-foreground {
		background: var(--color-performance-bg-pure);
	}

	.swatch-text {
		font-size: var(--text-performance-h2);
		font-weight: var(--font-performance-semibold);
	}

	/* Transparent swatches get a checkerboard */
	.swatch-transparent {
		background-image:
			linear-gradient(45deg, var(--color-performance-bg-subtle) 25%, transparent 25%),
			linear-gradient(-45deg, var(--color-performance-bg-subtle) 25%, transparent 25%),
			linear-gradient(45deg, transparent 75%, var(--color-performance-bg-subtle) 75%),
			linear-gradient(-45deg, transparent 75%, var(--color-performance-bg-subtle) 75%);
		background-size: 8px 8px;
		background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
	}

	.swatch-transparent::after {
		content: '';
		position: absolute;
		inset: 0;
		background: var(--swatch-color);
		border-radius: inherit;
	}

	/* Info section */
	.swatch-info {
		flex: 1;
		min-width: 0;
	}

	.swatch-header {
		display: flex;
		align-items: center;
		gap: var(--space-performance-xs);
		margin-bottom: 4px;
	}

	.swatch-token {
		font-family: var(--font-performance-mono);
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-primary);
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.swatch-value {
		margin-bottom: 4px;
	}

	.swatch-value code {
		font-family: var(--font-performance-mono);
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
	}

	.swatch-description {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-secondary);
		margin: 0 0 4px 0;
		line-height: var(--leading-performance-snug);
	}

	/* Contrast ratio display */
	.swatch-contrast {
		display: flex;
		align-items: center;
		gap: var(--space-performance-xs);
		font-size: var(--text-performance-caption);
	}

	.contrast-label {
		color: var(--color-performance-fg-muted);
	}

	.contrast-value {
		font-family: var(--font-performance-mono);
		color: var(--color-performance-fg-secondary);
	}

	.contrast-badge {
		padding: 1px 6px;
		border-radius: var(--radius-performance-scale-sm);
		font-size: 10px;
		font-weight: var(--font-performance-semibold);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.contrast-pass .contrast-badge {
		background: var(--color-performance-success-muted);
		color: var(--color-performance-success);
	}

	.contrast-aaa .contrast-badge {
		background: var(--color-performance-info-muted);
		color: var(--color-performance-info);
	}

	.contrast-fail {
		background: var(--color-performance-error-muted);
		color: var(--color-performance-error);
	}
</style>
