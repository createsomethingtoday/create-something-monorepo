<script lang="ts">
	import { normalizeAssetStatus } from '$lib/utils/asset-actions';
	import { getStatusColorTheme } from '$lib/utils/status-presentation';

	interface Props {
		status: string;
		size?: 'sm' | 'default' | 'lg';
	}

	let { status, size = 'default' }: Props = $props();

	const cleanedStatus = $derived(normalizeAssetStatus(status));

	const config = $derived(getStatusColorTheme(cleanedStatus));

	const sizeClasses: Record<string, string> = {
		sm: 'badge-sm',
		default: 'badge-default',
		lg: 'badge-lg'
	};
</script>

<span class="badge {sizeClasses[size]}" style="--badge-bg: {config.bg}; --badge-text: {config.text}; --badge-border: {config.border};">
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

	.badge-sm {
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
