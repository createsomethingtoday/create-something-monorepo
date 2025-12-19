<script lang="ts">
	import { toast } from '$lib/stores/toast';

	function getIcon(type: string) {
		switch (type) {
			case 'success':
				return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
			case 'error':
				return 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
			case 'warning':
				return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z';
			case 'info':
			default:
				return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
		}
	}
</script>

{#if $toast.length > 0}
	<div class="toast-container">
		{#each $toast as item (item.id)}
			<div class="toast {item.type}" role="alert">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d={getIcon(item.type)} />
				</svg>
				<span class="toast-message">{item.message}</span>
				<button class="toast-close" onclick={() => toast.remove(item.id)} aria-label="Dismiss">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M18 6L6 18M6 6l12 12" />
					</svg>
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
		background: var(--color-success-muted);
		border: 1px solid var(--color-success-border);
		color: var(--color-success);
	}

	.toast.error {
		background: var(--color-error-muted);
		border: 1px solid var(--color-error-border);
		color: var(--color-error);
	}

	.toast.warning {
		background: var(--color-warning-muted);
		border: 1px solid var(--color-warning-border);
		color: var(--color-warning);
	}

	.toast.info {
		background: var(--color-info-muted);
		border: 1px solid var(--color-info-border);
		color: var(--color-info);
	}

	.toast svg {
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
