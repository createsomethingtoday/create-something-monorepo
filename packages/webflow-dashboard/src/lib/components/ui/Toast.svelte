<script lang="ts">
	import { toast } from '$lib/stores/toast';
	import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-svelte';

	const iconComponents = {
		success: CheckCircle2,
		error: AlertCircle,
		warning: AlertTriangle,
		info: Info
	} as const;
</script>

{#if $toast.length > 0}
	<div class="toast-container">
		{#each $toast as item (item.id)}
			{@const IconComponent = iconComponents[item.type as keyof typeof iconComponents] || Info}
			<div class="toast {item.type}" role="alert">
				<IconComponent size={20} />
				<span class="toast-message">{item.message}</span>
				<button class="toast-close" onclick={() => toast.remove(item.id)} aria-label="Dismiss">
					<X size={16} />
				</button>
			</div>
		{/each}
	</div>
{/if}

<style>
	.toast-container {
		position: fixed;
		bottom: var(--space-md);
		right: var(--space-md);
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		z-index: 1100;
		max-width: 24rem;
	}

	.toast {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-lg);
		animation: slideIn var(--duration-standard) var(--ease-standard);
		box-shadow: var(--shadow-lg);
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateX(100%);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	.toast.success {
		background: var(--glass-bg-strong);
		border: 1px solid var(--color-success-border);
		color: var(--color-success);
	}

	.toast.error {
		background: var(--glass-bg-strong);
		border: 1px solid var(--color-error-border);
		color: var(--color-error);
	}

	.toast.warning {
		background: var(--glass-bg-strong);
		border: 1px solid var(--color-warning-border);
		color: var(--color-warning);
	}

	.toast.info {
		background: var(--glass-bg-strong);
		border: 1px solid var(--color-info-border);
		color: var(--color-info);
	}

	.toast :global(svg) {
		flex-shrink: 0;
		margin-top: 2px;
	}

	.toast-message {
		flex: 1;
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
	}

	.toast-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border: none;
		background: transparent;
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
		cursor: pointer;
		flex-shrink: 0;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.toast-close:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}

	@media (max-width: 640px) {
		.toast-container {
			left: var(--space-md);
			right: var(--space-md);
			max-width: none;
		}
	}
</style>
