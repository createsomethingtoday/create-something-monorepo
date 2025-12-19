<script lang="ts">
	import { toast } from '$lib/stores/toast';
	import { fly } from 'svelte/transition';
	import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-svelte';

	const icons = {
		success: CheckCircle,
		error: XCircle,
		warning: AlertTriangle,
		info: Info
	};
</script>

<div class="toast-container" aria-live="polite">
	{#each $toast as t (t.id)}
		<div
			class="toast toast-{t.type}"
			role="alert"
			transition:fly={{ y: 20, duration: 200 }}
		>
			<svelte:component this={icons[t.type]} size={18} />
			<span class="message">{t.message}</span>
			<button
				class="close"
				aria-label="Dismiss"
				onclick={() => toast.remove(t.id)}
			>
				<X size={16} />
			</button>
		</div>
	{/each}
</div>

<style>
	.toast-container {
		position: fixed;
		bottom: 1.5rem;
		right: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		z-index: 9999;
		max-width: 24rem;
	}

	.toast {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1rem;
		font-family: var(--font-sans);
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
		box-shadow: var(--shadow-lg);
	}

	.toast-success {
		border-left: 3px solid var(--color-success);
	}

	.toast-error {
		border-left: 3px solid var(--color-error);
	}

	.toast-warning {
		border-left: 3px solid var(--color-warning);
	}

	.toast-info {
		border-left: 3px solid var(--webflow-blue);
	}

	.toast-success :global(svg:first-child) {
		color: var(--color-success);
	}

	.toast-error :global(svg:first-child) {
		color: var(--color-error);
	}

	.toast-warning :global(svg:first-child) {
		color: var(--color-warning);
	}

	.toast-info :global(svg:first-child) {
		color: var(--webflow-blue);
	}

	.message {
		flex: 1;
	}

	.close {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.25rem;
		color: var(--color-fg-muted);
		background: none;
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.close:hover {
		color: var(--color-fg-primary);
		background: var(--color-hover);
	}
</style>
