<script lang="ts">
	/**
	 * TokenSwatch - Display a single Canon design token
	 *
	 * Shows the actual color value from the CSS custom property.
	 * "Components can BE the documentation"
	 */
	interface Props {
		token: string;
		label?: string;
		size?: 'sm' | 'md' | 'lg';
	}

	let { token, label, size = 'md' }: Props = $props();
	const displayLabel = $derived(label ?? token.replace(/^--color-/, ''));
</script>

<div class="swatch" class:sm={size === 'sm'} class:lg={size === 'lg'}>
	<div class="color" style="background-color: var({token});"></div>
	<span class="label">{displayLabel}</span>
</div>

<style>
	.swatch {
		display: flex;
		align-items: center;
		gap: var(--space-performance-xs);
	}

	.color {
		width: 24px;
		height: 24px;
		border-radius: var(--radius-performance-scale-sm);
		flex-shrink: 0;
	}

	.label {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
		font-family: var(--font-performance-mono);
	}

	.sm .color {
		width: 16px;
		height: 16px;
	}

	.sm .label {
		font-size: var(--text-performance-caption);
	}

	.lg .color {
		width: 32px;
		height: 32px;
	}
</style>
