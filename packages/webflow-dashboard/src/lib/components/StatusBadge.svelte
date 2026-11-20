<script lang="ts">
	import { normalizeAssetStatus } from '$lib/utils/asset-actions';
	import { getStatusColorTheme } from '$lib/utils/status-presentation';

	interface Props {
		status: string;
		size?: 'sm' | 'default' | 'lg';
		/** `dot` is the quiet form for dense tables: a colored dot and plain text. */
		variant?: 'solid' | 'dot';
	}

	let { status, size = 'default', variant = 'solid' }: Props = $props();

	const cleanedStatus = $derived(normalizeAssetStatus(status));

	const config = $derived(getStatusColorTheme(cleanedStatus));

	const sizeClasses: Record<string, string> = {
		sm: 'badge-sm',
		default: 'badge-default',
		lg: 'badge-lg'
	};
</script>

<span
	class="badge {sizeClasses[size]}"
	class:badge-dot={variant === 'dot'}
	style="--badge-bg: {config.bg}; --badge-text: {config.text}; --badge-border: {config.border}; --badge-accent: {config.accent};"
>
	{cleanedStatus}
</span>

<style>
	.badge {
		display: inline-flex;
		align-items: center;
		border-radius: var(--radius-md);
		font-weight: var(--font-semibold);
		background: var(--badge-bg);
		color: var(--badge-text);
		border: 1px solid var(--badge-border);
	}

	.badge-dot {
		gap: 0.45rem;
		padding: 0;
		background: transparent;
		border-color: transparent;
		color: var(--color-fg-secondary);
		font-weight: var(--font-medium);
		font-size: 0.84rem;
	}

	.badge-dot::before {
		content: '';
		width: 0.45rem;
		height: 0.45rem;
		border-radius: 999px;
		background: var(--badge-accent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--badge-accent) 18%, transparent);
	}

	.badge-sm:not(.badge-dot) {
		padding: 0.125rem 0.5rem;
		font-size: var(--text-caption);
	}

	.badge-default {
		padding: 0.25rem 0.625rem;
		font-size: var(--text-caption);
	}

	.badge-lg {
		padding: 0.375rem 0.75rem;
		font-size: var(--text-body-sm);
	}
</style>
