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
	const displayLabel = label ?? token.replace(/^--color-/, '');
</script>

<div class="swatch" class:sm={size === 'sm'} class:lg={size === 'lg'}>
	<div class="color" style="background-color: var({token});"></div>
	<span class="label">{displayLabel}</span>
</div>

<style>
	.swatch {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.color {
		width: 24px;
		height: 24px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border-default);
		flex-shrink: 0;
	}

	.label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		font-family: var(--font-mono);
	}

	.sm .color {
		width: 16px;
		height: 16px;
	}

	.sm .label {
		font-size: var(--text-caption);
	}

	.lg .color {
		width: 32px;
		height: 32px;
	}
</style>
