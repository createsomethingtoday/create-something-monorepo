<script lang="ts">
	interface Props {
		/** The text to copy to clipboard */
		text: string;
		/** Optional label for accessibility */
		label?: string;
		/** Size variant */
		size?: 'sm' | 'md';
	}

	let { text, label = 'Copy to clipboard', size = 'md' }: Props = $props();

	let copied = $state(false);
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(text);
			copied = true;

			// Clear any existing timeout
			if (timeoutId) clearTimeout(timeoutId);

			// Reset after 2 seconds
			timeoutId = setTimeout(() => {
				copied = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}
</script>

<button
	class="copy-button"
	class:copy-button-sm={size === 'sm'}
	class:copied
	onclick={handleCopy}
	aria-label={copied ? 'Copied!' : label}
	title={copied ? 'Copied!' : label}
>
	{#if copied}
		<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<polyline points="20 6 9 17 4 12" />
		</svg>
	{:else}
		<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<rect x="9" y="9" width="13" height="13" rx="2" />
			<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
		</svg>
	{/if}
</button>

<style>
	.copy-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		background: transparent;
		border-radius: var(--radius-performance-scale-md);
		color: var(--color-performance-fg-muted);
		cursor: pointer;
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.copy-button:hover {
		background: var(--color-performance-hover);
		border-color: var(--color-performance-border-emphasis);
		color: var(--color-performance-fg-secondary);
	}

	.copy-button:active {
		background: var(--color-performance-active);
	}

	.copy-button.copied {
		color: var(--color-performance-success);
		border-color: var(--color-performance-success-border);
	}

	.copy-button-sm {
		width: 24px;
		height: 24px;
	}

	.icon {
		width: 16px;
		height: 16px;
	}

	.copy-button-sm .icon {
		width: 14px;
		height: 14px;
	}
</style>
