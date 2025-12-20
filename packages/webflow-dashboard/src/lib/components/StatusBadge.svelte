<script lang="ts">
	interface Props {
		status: string;
		size?: 'sm' | 'default' | 'lg';
	}

	let { status, size = 'default' }: Props = $props();

	// Clean emoji prefixes from status
	const cleanedStatus = status
		.replace(/^\d*️⃣/u, '')
		.replace(/🆕/u, '')
		.replace(/📅/u, '')
		.replace(/🚀/u, '')
		.replace(/☠️/u, '')
		.replace(/❌/u, '')
		.trim();

	const statusConfig: Record<string, { bg: string; text: string; border: string }> = {
		Scheduled: {
			bg: 'var(--color-info-muted)',
			text: 'var(--color-info)',
			border: 'var(--color-info-border)'
		},
		Published: {
			bg: 'var(--color-success-muted)',
			text: 'var(--color-success)',
			border: 'var(--color-success-border)'
		},
		Upcoming: {
			bg: 'var(--color-data-3-muted)',
			text: 'var(--color-data-3)',
			border: 'var(--color-data-3-border)'
		},
		Delisted: {
			bg: 'var(--color-warning-muted)',
			text: 'var(--color-warning)',
			border: 'var(--color-warning-border)'
		},
		Rejected: {
			bg: 'var(--color-error-muted)',
			text: 'var(--color-error)',
			border: 'var(--color-error-border)'
		}
	};

	const config = statusConfig[cleanedStatus] || {
		bg: 'var(--color-bg-subtle)',
		text: 'var(--color-fg-secondary)',
		border: 'var(--color-border-default)'
	};

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
